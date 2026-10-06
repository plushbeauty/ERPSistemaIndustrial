-- QMS industrial: receiving inspection, dimensional metrology and Ishikawa/5W2H extensions.
-- All operational rows are tenant-bound through erp_current_empresa_id().
create table if not exists public.erp_qualidade_inspecoes_recebimento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  lote_id uuid not null references public.erp_estoque_lotes(id) on delete restrict,
  lote_rastreabilidade_id uuid references public.erp_estoque_lotes_rastreabilidade(id) on delete restrict,
  fornecedor_id uuid references public.erp_fornecedores(id) on delete restrict,
  tamanho_lote numeric(14,3) not null check (tamanho_lote > 0),
  nivel_inspecao text not null check (nivel_inspecao in ('G-II','G-III')),
  aql numeric(6,3) not null check (aql > 0),
  tamanho_amostra integer not null check (tamanho_amostra > 0),
  defeitos_encontrados integer not null default 0 check (defeitos_encontrados >= 0),
  criterio_ac integer not null check (criterio_ac >= 0),
  criterio_re integer not null check (criterio_re > criterio_ac),
  status text not null default 'PENDENTE' check (status in ('PENDENTE','APROVADO','BLOQUEADO')),
  observacao text,
  criado_por uuid references public.erp_usuarios(id) on delete set null,
  decidido_por uuid references public.erp_usuarios(id) on delete set null,
  decidido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_qualidade_inspecoes_dimensionais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  inspecao_recebimento_id uuid references public.erp_qualidade_inspecoes_recebimento(id) on delete cascade,
  numero_peca_amostrada integer not null check (numero_peca_amostrada > 0),
  cavidade_molde text,
  cota_nominal_mm numeric(14,5) not null,
  tolerancia_superior_mm numeric(14,5) not null check (tolerancia_superior_mm >= 0),
  tolerancia_inferior_mm numeric(14,5) not null check (tolerancia_inferior_mm >= 0),
  valor_medido_mm numeric(14,5),
  desvio_mm numeric(14,5) generated always as (
    case when valor_medido_mm is null then null else valor_medido_mm - cota_nominal_mm end
  ) stored,
  status text generated always as (
    case
      when valor_medido_mm is null then 'PENDENTE'
      when valor_medido_mm >= cota_nominal_mm - tolerancia_inferior_mm
       and valor_medido_mm <= cota_nominal_mm + tolerancia_superior_mm then 'OK'
      else 'NOK'
    end
  ) stored,
  instrumento text,
  created_at timestamptz not null default now()
);

alter table public.erp_sgq_capa_acoes add column if not exists acao_o_que text;
alter table public.erp_sgq_capa_acoes add column if not exists acao_por_que text;
alter table public.erp_sgq_capa_acoes add column if not exists acao_onde text;
alter table public.erp_sgq_capa_acoes add column if not exists acao_quem text;
alter table public.erp_sgq_capa_acoes add column if not exists acao_quando date;
alter table public.erp_sgq_capa_acoes add column if not exists acao_como text;
alter table public.erp_sgq_capa_acoes add column if not exists acao_quanto numeric(14,2);

create table if not exists public.erp_sgq_rpnc_ishikawa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  rpnc_id uuid not null references public.erp_rpnc(id) on delete cascade,
  metodo text,
  mao_de_obra text,
  material text,
  maquina text,
  meio_ambiente text,
  medicao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id,rpnc_id)
);

alter table public.erp_documentos_qualidade add column if not exists pdf_storage_path text;

alter table public.erp_qualidade_inspecoes_recebimento enable row level security;
alter table public.erp_qualidade_inspecoes_dimensionais enable row level security;
alter table public.erp_sgq_rpnc_ishikawa enable row level security;

drop policy if exists qms_receb_select on public.erp_qualidade_inspecoes_recebimento;
drop policy if exists qms_receb_insert on public.erp_qualidade_inspecoes_recebimento;
drop policy if exists qms_receb_update on public.erp_qualidade_inspecoes_recebimento;
create policy qms_receb_select on public.erp_qualidade_inspecoes_recebimento for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());
create policy qms_receb_insert on public.erp_qualidade_inspecoes_recebimento for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id());
create policy qms_receb_update on public.erp_qualidade_inspecoes_recebimento for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists qms_dim_select on public.erp_qualidade_inspecoes_dimensionais;
drop policy if exists qms_dim_insert on public.erp_qualidade_inspecoes_dimensionais;
drop policy if exists qms_dim_update on public.erp_qualidade_inspecoes_dimensionais;
create policy qms_dim_select on public.erp_qualidade_inspecoes_dimensionais for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());
create policy qms_dim_insert on public.erp_qualidade_inspecoes_dimensionais for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id());
create policy qms_dim_update on public.erp_qualidade_inspecoes_dimensionais for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists qms_ish_select on public.erp_sgq_rpnc_ishikawa;
drop policy if exists qms_ish_insert on public.erp_sgq_rpnc_ishikawa;
drop policy if exists qms_ish_update on public.erp_sgq_rpnc_ishikawa;
create policy qms_ish_select on public.erp_sgq_rpnc_ishikawa for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());
create policy qms_ish_insert on public.erp_sgq_rpnc_ishikawa for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id());
create policy qms_ish_update on public.erp_sgq_rpnc_ishikawa for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

grant select,insert,update on public.erp_qualidade_inspecoes_recebimento to authenticated;
grant select,insert,update on public.erp_qualidade_inspecoes_dimensionais to authenticated;
grant select,insert,update on public.erp_sgq_rpnc_ishikawa to authenticated;
grant update on public.erp_documentos_qualidade to authenticated;

create or replace function public.erp_qms_decidir_inspecao_recebimento(p_inspecao_id uuid,p_decisao text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_inspecao public.erp_qualidade_inspecoes_recebimento;
  v_user uuid;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  select * into v_inspecao from public.erp_qualidade_inspecoes_recebimento
    where id=p_inspecao_id and empresa_id=v_empresa for update;
  if not found then raise exception 'Inspeção de recebimento não encontrada.'; end if;
  select usuario_id into v_user from public.erp_qms_current_user() limit 1;
  if p_decisao='APROVAR' then
    update public.erp_estoque_lotes set status_inspecao='APROVADO' where id=v_inspecao.lote_id and empresa_id=v_empresa;
    if v_inspecao.lote_rastreabilidade_id is not null then
      update public.erp_estoque_lotes_rastreabilidade set status_qualidade='APROVADO'
        where id=v_inspecao.lote_rastreabilidade_id and empresa_id=v_empresa;
    end if;
    update public.erp_qualidade_inspecoes_recebimento
      set status='APROVADO',decidido_por=v_user,decidido_em=now(),updated_at=now() where id=v_inspecao.id;
  elsif p_decisao='BLOQUEAR' then
    perform public.erp_reter_lote(v_inspecao.lote_id,'Lote bloqueado pela inspeção de recebimento QMS.');
    update public.erp_qualidade_inspecoes_recebimento
      set status='BLOQUEADO',decidido_por=v_user,decidido_em=now(),updated_at=now() where id=v_inspecao.id;
  else
    raise exception 'Decisão de inspeção inválida.';
  end if;
end
$$;

revoke all on function public.erp_qms_decidir_inspecao_recebimento(uuid,text) from public,anon;
grant execute on function public.erp_qms_decidir_inspecao_recebimento(uuid,text) to authenticated;
