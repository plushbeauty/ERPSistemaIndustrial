-- Campos mestres de especificação conforme Projeto Executivo ERP Industrial (PDF).
-- Mantém os critérios existentes e acrescenta metadados para recebimento, processo e inspeção final.
alter table public.erp_planos_inspecao
  add column if not exists grupo_material text,
  add column if not exists tipo_inspecao text not null default 'RECEBIMENTO',
  add column if not exists metodo_inspecao text not null default 'DIMENSIONAL',
  add column if not exists condicao_armazenamento text,
  add column if not exists instrumento_id uuid null references public.erp_equipamentos_medicao(id) on delete set null,
  add column if not exists revisao integer not null default 1,
  add column if not exists vigencia_inicio date,
  add column if not exists vigencia_fim date,
  add column if not exists responsavel_id uuid null references auth.users(id) on delete set null,
  add column if not exists aprovador_id uuid null references auth.users(id) on delete set null,
  add column if not exists aprovado_em timestamptz;

alter table public.erp_planos_inspecao
  drop constraint if exists erp_planos_inspecao_tipo_inspecao_check,
  add constraint erp_planos_inspecao_tipo_inspecao_check
    check (tipo_inspecao in ('RECEBIMENTO','PROCESSO','FINAL','EXPEDICAO')),
  drop constraint if exists erp_planos_inspecao_metodo_inspecao_check,
  add constraint erp_planos_inspecao_metodo_inspecao_check
    check (metodo_inspecao in ('VISUAL','DIMENSIONAL','FUNCIONAL','DOCUMENTAL')),
  drop constraint if exists erp_planos_inspecao_revisao_check,
  add constraint erp_planos_inspecao_revisao_check check (revisao > 0),
  drop constraint if exists erp_planos_inspecao_vigencia_check,
  add constraint erp_planos_inspecao_vigencia_check check (vigencia_fim is null or vigencia_inicio is null or vigencia_fim >= vigencia_inicio);

create index if not exists idx_erp_planos_inspecao_tipo_status
  on public.erp_planos_inspecao(empresa_id, tipo_inspecao, status, codigo);

-- Impede vínculos cruzados entre empresas mesmo em chamadas diretas à Data API.
create or replace function public.erp_validar_plano_inspecao_referencias()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.instrumento_id is not null and not exists (
    select 1 from public.erp_equipamentos_medicao i
    where i.id = new.instrumento_id and i.empresa_id = new.empresa_id
  ) then
    raise exception 'Instrumento de medição deve pertencer à mesma empresa da especificação.';
  end if;

  if new.responsavel_id is not null and not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = new.responsavel_id and u.empresa_id = new.empresa_id and u.ativo = true
  ) then
    raise exception 'Responsável deve ser usuário ativo da mesma empresa.';
  end if;

  if new.aprovador_id is not null
     and not (new.aprovador_id = auth.uid() and public.erp_is_master())
     and not exists (
       select 1 from public.erp_usuarios u
       where u.auth_user_id = new.aprovador_id and u.empresa_id = new.empresa_id and u.ativo = true
     ) then
    raise exception 'Aprovador deve ser usuário ativo da mesma empresa ou Master autorizado.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_erp_validar_plano_inspecao_referencias on public.erp_planos_inspecao;
create trigger trg_erp_validar_plano_inspecao_referencias
before insert or update of empresa_id, instrumento_id, responsavel_id, aprovador_id
on public.erp_planos_inspecao
for each row execute function public.erp_validar_plano_inspecao_referencias();

revoke all on function public.erp_validar_plano_inspecao_referencias() from public, anon, authenticated;

-- Nominal values and dimensional samples must reference the same product specification.
-- Quality specifications need a controlled nominal and an explicit link from each dimensional sample.
alter table public.erp_planos_inspecao
  add column if not exists nominal numeric(14,5);

do $$
begin
  alter table public.erp_planos_inspecao
    add constraint erp_planos_inspecao_nominal_bounds_check
    check (
      nominal is null
      or (
        (limite_inferior is null or nominal >= limite_inferior)
        and (limite_superior is null or nominal <= limite_superior)
      )
    );
exception when duplicate_object then null;
end;
$$;

alter table public.erp_qualidade_inspecoes_dimensionais
  add column if not exists plano_inspecao_id uuid
  references public.erp_planos_inspecao(id) on delete restrict;

create index if not exists idx_qms_dimensional_plan
  on public.erp_qualidade_inspecoes_dimensionais(empresa_id, inspecao_recebimento_id, plano_inspecao_id);

CREATE OR REPLACE FUNCTION public.erp_qms_validar_vinculo_dimensional()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_spec_empresa uuid;
  v_spec_produto uuid;
  v_spec_status text;
  v_spec_tipo text;
  v_spec_metodo text;
  v_spec_inicio date;
  v_spec_fim date;
  v_spec_aprovador uuid;
  v_spec_instrumento uuid;
  v_lote_produto uuid;
  v_inst_codigo text;
  v_inst_status text;
  v_inst_calibracao date;
BEGIN
  IF NEW.plano_inspecao_id IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'A medição dimensional exige vínculo com a especificação técnica vigente.';
    END IF;
    IF OLD.plano_inspecao_id IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Não é permitido remover o vínculo da medição com sua especificação técnica.';
  END IF;

  SELECT p.empresa_id, p.produto_id, p.status, p.tipo_inspecao, p.metodo_inspecao,
         p.vigencia_inicio, p.vigencia_fim, p.aprovador_id, p.instrumento_id
    INTO v_spec_empresa, v_spec_produto, v_spec_status, v_spec_tipo, v_spec_metodo,
         v_spec_inicio, v_spec_fim, v_spec_aprovador, v_spec_instrumento
  FROM public.erp_planos_inspecao p
  WHERE p.id = NEW.plano_inspecao_id;

  IF NOT FOUND OR v_spec_empresa IS DISTINCT FROM NEW.empresa_id THEN
    RAISE EXCEPTION 'Especificação técnica inexistente ou pertencente a outra empresa.';
  END IF;

  IF upper(coalesce(v_spec_status, '')) <> 'ATIVO'
     OR v_spec_aprovador IS NULL
     OR (v_spec_inicio IS NOT NULL AND v_spec_inicio > current_date)
     OR (v_spec_fim IS NOT NULL AND v_spec_fim < current_date) THEN
    RAISE EXCEPTION 'A medição exige uma especificação ativa, aprovada e dentro da vigência.';
  END IF;

  IF NEW.inspecao_recebimento_id IS NOT NULL AND upper(coalesce(v_spec_tipo, '')) <> 'RECEBIMENTO' THEN
    RAISE EXCEPTION 'A inspeção de recebimento exige especificação do tipo RECEBIMENTO.';
  END IF;

  IF upper(coalesce(v_spec_metodo, '')) IN ('DIMENSIONAL', 'FUNCIONAL') THEN
    IF v_spec_instrumento IS NULL THEN
      RAISE EXCEPTION 'A especificação exige instrumento de medição vinculado.';
    END IF;

    SELECT i.codigo, i.status, i.proxima_calibracao
      INTO v_inst_codigo, v_inst_status, v_inst_calibracao
    FROM public.erp_equipamentos_medicao i
    WHERE i.id = v_spec_instrumento
      AND i.empresa_id = NEW.empresa_id;

    IF NOT FOUND OR upper(coalesce(v_inst_status, '')) <> 'APROVADO'
       OR v_inst_calibracao IS NULL OR v_inst_calibracao < current_date THEN
      RAISE EXCEPTION 'O instrumento vinculado não está aprovado ou está com calibração vencida.';
    END IF;

    IF btrim(coalesce(NEW.instrumento, '')) IS DISTINCT FROM btrim(coalesce(v_inst_codigo, '')) THEN
      RAISE EXCEPTION 'O instrumento registrado não corresponde ao instrumento da especificação vigente.';
    END IF;
  END IF;

  IF NEW.inspecao_recebimento_id IS NOT NULL THEN
    SELECT l.produto_id INTO v_lote_produto
    FROM public.erp_qualidade_inspecoes_recebimento r
    JOIN public.erp_estoque_lotes l
      ON l.id = r.lote_id AND l.empresa_id = r.empresa_id
    WHERE r.id = NEW.inspecao_recebimento_id
      AND r.empresa_id = NEW.empresa_id;

    IF NOT FOUND OR v_lote_produto IS DISTINCT FROM v_spec_produto THEN
      RAISE EXCEPTION 'A especificação técnica não pertence ao produto do lote inspecionado.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

drop trigger if exists trg_erp_qms_validar_vinculo_dimensional on public.erp_qualidade_inspecoes_dimensionais;
create trigger trg_erp_qms_validar_vinculo_dimensional
before insert or update
on public.erp_qualidade_inspecoes_dimensionais
for each row execute function public.erp_qms_validar_vinculo_dimensional();

revoke all on function public.erp_qms_validar_vinculo_dimensional() from public, anon, authenticated;

-- Preserve immutable snapshots when technical acceptance criteria change.
CREATE TABLE IF NOT EXISTS public.erp_planos_inspecao_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.erp_empresas(id),
  plano_inspecao_id uuid NOT NULL REFERENCES public.erp_planos_inspecao(id) ON DELETE RESTRICT,
  revisao integer NOT NULL CHECK (revisao > 0),
  dados jsonb NOT NULL,
  alterado_por uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  alterado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, plano_inspecao_id, revisao)
);

ALTER TABLE public.erp_planos_inspecao_revisoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS erp_planos_inspecao_revisoes_tenant_read ON public.erp_planos_inspecao_revisoes;
CREATE POLICY erp_planos_inspecao_revisoes_tenant_read
  ON public.erp_planos_inspecao_revisoes
  FOR SELECT TO authenticated
  USING (empresa_id = public.erp_current_empresa_id());
REVOKE ALL ON TABLE public.erp_planos_inspecao_revisoes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.erp_planos_inspecao_revisoes FROM authenticated;
GRANT SELECT ON TABLE public.erp_planos_inspecao_revisoes TO authenticated;

CREATE OR REPLACE FUNCTION public.erp_qms_preservar_revisao_plano_inspecao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_dados_tecnicos_alterados boolean;
BEGIN
  IF lower(coalesce(OLD.status, '')) = 'rascunho'
     AND lower(coalesce(NEW.status, '')) = 'rascunho'
     AND NEW.revisao = OLD.revisao THEN
    RETURN NEW;
  END IF;

  IF NEW.revisao < OLD.revisao THEN
    RAISE EXCEPTION 'A revisão da especificação não pode retroceder.';
  END IF;

  v_dados_tecnicos_alterados :=
    (to_jsonb(NEW) - ARRAY['id','created_at','updated_at','status','revisao','aprovador_id','aprovado_em'])
    IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['id','created_at','updated_at','status','revisao','aprovador_id','aprovado_em']);

  IF v_dados_tecnicos_alterados AND NEW.revisao <= OLD.revisao THEN
    RAISE EXCEPTION 'Ao alterar critérios técnicos, incremente a revisão da especificação.';
  END IF;

  IF v_dados_tecnicos_alterados OR NEW.revisao > OLD.revisao THEN
    INSERT INTO public.erp_planos_inspecao_revisoes (
      empresa_id, plano_inspecao_id, revisao, dados, alterado_por
    )
    VALUES (
      OLD.empresa_id, OLD.id, OLD.revisao, to_jsonb(OLD), auth.uid()
    )
    ON CONFLICT (empresa_id, plano_inspecao_id, revisao) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_qms_preservar_revisao_plano ON public.erp_planos_inspecao;
CREATE TRIGGER trg_erp_qms_preservar_revisao_plano
BEFORE UPDATE ON public.erp_planos_inspecao
FOR EACH ROW EXECUTE FUNCTION public.erp_qms_preservar_revisao_plano_inspecao();

REVOKE ALL ON FUNCTION public.erp_qms_preservar_revisao_plano_inspecao() FROM PUBLIC, anon, authenticated;
