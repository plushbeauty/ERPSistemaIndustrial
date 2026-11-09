-- 20261103112000_erp_moldes_manutencao_historico_v1.sql
-- A tela Moldes & Ferramentaria (src/pages/MoldesFerramentaria.tsx) registra ordem de serviço de
-- manutenção pela rotina erp_registrar_manutencao_molde e mostra o histórico de
-- erp_moldes_manutencao_historico. A migration 20260925170000 já faz revoke/grant execute da função (logo
-- ela existe no banco em produção) e 20260928184500/20260928193000 listam a tabela no RLS, mas nenhum
-- CREATE entrou no repo. Em um banco novo o botão "Salvar revisão" falhava.
-- Guarda intencional: função existente não é substituída; tabela existente não é alterada.

begin;

create table if not exists public.erp_moldes_manutencao_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  molde_id uuid not null references public.erp_moldes(id) on delete cascade,
  revisao integer not null default 1,
  tipo text not null default 'Preventiva' check (tipo in ('Preventiva','Corretiva')),
  data_intervencao date not null default current_date,
  descricao text not null,
  pecas_trocadas text,
  tecnico_responsavel text,
  ciclos_zerados boolean not null default false,
  registrado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (molde_id, revisao)
);

create index if not exists ix_erp_moldes_manutencao_data on public.erp_moldes_manutencao_historico(empresa_id, data_intervencao desc);

alter table public.erp_moldes_manutencao_historico enable row level security;

drop policy if exists erp_moldes_manutencao_historico_tenant on public.erp_moldes_manutencao_historico;
create policy erp_moldes_manutencao_historico_tenant on public.erp_moldes_manutencao_historico
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

grant select, insert on public.erp_moldes_manutencao_historico to authenticated;

do $mig$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'erp_registrar_manutencao_molde'
  ) then
    raise notice 'erp_registrar_manutencao_molde ja existe neste banco; corpo preservado.';
  else
    execute $fn$
      create or replace function public.erp_registrar_manutencao_molde(
        p_molde_id uuid,
        p_tipo text,
        p_data date,
        p_descricao text,
        p_pecas text,
        p_tecnico text,
        p_reset_ciclos boolean
      )
      returns jsonb
      language plpgsql
      security invoker
      set search_path = public
      as $body$
      declare
        v_empresa_id uuid := public.erp_current_empresa_id();
        v_uid uuid := (select auth.uid());
        v_molde public.erp_moldes%rowtype;
        v_revisao integer;
      begin
        if v_empresa_id is null then raise exception 'Sessão não autenticada com empresa vinculada'; end if;
        if p_molde_id is null then raise exception 'Molde não informado'; end if;
        if nullif(trim(coalesce(p_descricao,'')), '') is null then raise exception 'Descrição da intervenção é obrigatória'; end if;
        if nullif(trim(coalesce(p_tecnico,'')), '') is null then raise exception 'Técnico responsável é obrigatório'; end if;

        select * into v_molde
        from public.erp_moldes
        where id = p_molde_id and empresa_id = v_empresa_id
        for update;

        if not found then raise exception 'Molde não encontrado para esta empresa'; end if;

        select coalesce(max(h.revisao), 0)::integer + 1 into v_revisao
        from public.erp_moldes_manutencao_historico h
        where h.molde_id = p_molde_id;

        insert into public.erp_moldes_manutencao_historico(
          empresa_id, molde_id, revisao, tipo, data_intervencao, descricao, pecas_trocadas, tecnico_responsavel,
          ciclos_zerados, registrado_por
        ) values (
          v_empresa_id, p_molde_id, v_revisao,
          case when trim(coalesce(p_tipo,'')) = 'Corretiva' then 'Corretiva' else 'Preventiva' end,
          coalesce(p_data, current_date),
          trim(p_descricao),
          nullif(trim(coalesce(p_pecas,'')), ''),
          trim(p_tecnico),
          coalesce(p_reset_ciclos, false),
          v_uid
        );

        if coalesce(p_reset_ciclos, false) then
          update public.erp_moldes
          set ciclos_atuais = 0,
              status = case when trim(coalesce(p_tipo,'')) = 'Corretiva' then status else 'DISPONIVEL' end,
              updated_at = now()
          where id = p_molde_id and empresa_id = v_empresa_id;
        end if;

        return jsonb_build_object('molde_id', p_molde_id, 'revisao', v_revisao, 'registrado_em', now());
      end;
      $body$;
    $fn$;
  end if;
end
$mig$;

revoke execute on function public.erp_registrar_manutencao_molde(uuid, text, date, text, text, text, boolean) from public, anon;
grant execute on function public.erp_registrar_manutencao_molde(uuid, text, date, text, text, text, boolean) to authenticated;

commit;
