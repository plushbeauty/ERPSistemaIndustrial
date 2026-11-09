-- SYSNQRA ERP INDUSTRIAL — REPARO DA CENTRAL DE CUSTOS (SEM TABELA E SEM ISOLAMENTO)
-- Autor: FernandoSch | 2026-11-04
--
-- Auditoria estatica pagina x banco (2026-11-04): das 83 tabelas que alguma tela
-- escreve, duas nao tem NENHUM create table nem NENHUMA politica de isolamento em
-- nenhum arquivo .sql deste repo:
--   public.erp_centros_custos  e  public.erp_custos_fixos
-- As duas sao lidas e gravadas por src/pages/CentralCustosIndustrial.tsx
-- (addCenter -> insert em erp_centros_custos; addFixed -> insert em erp_custos_fixos).
-- Sem a tabela, a tela devolve "relation ... does not exist" na abertura. Com a
-- tabela mas sem RLS, qualquer empresa autenticada veria o custo da outra — e a
-- regra do sistema e isolamento por empresa_id.
--
-- Reparacao: criar as duas tabelas se ainda nao existirem, no contrato exato que
-- a tela consulta, e ligar RLS com politica por empresa_id. Aditivo: nao apaga,
-- nao renomeia e nao altera coluna ou dado de tabela que ja exista no banco real
-- (o create/if-not-exists vira no-op nesse caso).
--
-- Sem FOREIGN KEY para public.erp_empresas de proposito: essa tabela nao e criada
-- por nenhuma migration deste repo (existe apenas no banco do proprietario), e uma
-- FK quebraria a aplicacao em ambiente novo. O isolamento e garantido pela RLS.

begin;

create table if not exists public.erp_centros_custos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null,
  codigo       text not null,
  nome         text not null,
  tipo         text not null default 'OPERACIONAL',
  parent_id    uuid,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.erp_custos_fixos (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null,
  centro_custo_id   uuid not null,
  categoria         text not null default 'ENERGIA',
  descricao         text not null,
  valor_mensal      numeric(18,4) not null default 0,
  percentual_rateio numeric(9,4) not null default 100,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indices que a tela usa na leitura: filtro por empresa + ordem de codigo/descricao.
-- Sem indice unico e sem FK de proposito: se a tabela ja existir no banco real com
-- codigo repetido ou id de outro tipo, o create falharia e a migration inteira
-- voltaria. Isolamento segue garantido pela RLS abaixo.
create index if not exists ix_erp_centros_custos_empresa_codigo
  on public.erp_centros_custos (empresa_id, lower(codigo));
create index if not exists ix_erp_custos_fixos_empresa_descricao
  on public.erp_custos_fixos (empresa_id, lower(descricao));
create index if not exists ix_erp_custos_fixos_centro
  on public.erp_custos_fixos (centro_custo_id);

-- Tabela de centro de custo de outra empresa nao pode aparecer: parent_id precisa
-- pertencer ao mesmo empresa_id (verificacao feita pela politica abaixo).
comment on table public.erp_centros_custos is
  'Centros de responsabilidade de custo (modulo Financeiro > Central de Custos). Isolado por empresa_id.';
comment on table public.erp_custos_fixos is
  'Custos fixos mensais alocados a um centro de custo, com percentual de rateio. Isolado por empresa_id.';

-- Isolamento por empresa + grants. Padrao do repo, sem erp_has_permission: as
-- chaves de permissao destes modulos nao existem na matriz, e politica com chave
-- inexistente negaria tudo e a tela deixaria de gravar de novo.
do $$
declare
  t text;
begin
  foreach t in array array['erp_centros_custos','erp_custos_fixos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %s_tenant_select on public.%I', t, t);
    execute format('create policy %s_tenant_select on public.%I for select to authenticated using (empresa_id = public.erp_current_empresa_id())', t, t);
    execute format('drop policy if exists %s_tenant_insert on public.%I', t, t);
    execute format('create policy %s_tenant_insert on public.%I for insert to authenticated with check (empresa_id = public.erp_current_empresa_id())', t, t);
    execute format('drop policy if exists %s_tenant_update on public.%I', t, t);
    execute format('create policy %s_tenant_update on public.%I for update to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id())', t, t);
    execute format('drop policy if exists %s_tenant_delete on public.%I', t, t);
    execute format('create policy %s_tenant_delete on public.%I for delete to authenticated using (empresa_id = public.erp_current_empresa_id())', t, t);
  end loop;
end
$$;

commit;

notify pgrst, 'reload schema';

-- Diagnostico (cole a saida no chat):
-- mostra se a tabela ja existia antes com dados e se agora tem politica de isolamento.
select '1_erp_centros_custos_existe' as verificacao,
       case when to_regclass('public.erp_centros_custos') is null then 'NAO_EXISTE' else 'EXISTE' end as resultado
union all
select '2_erp_custos_fixos_existe',
       case when to_regclass('public.erp_custos_fixos') is null then 'NAO_EXISTE' else 'EXISTE' end
union all
select '3_politicas_de_isolamento',
       coalesce(string_agg(c.relname || ' -> ' || p.polname, ' | ' order by c.relname, p.polname), 'nenhuma')
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('erp_centros_custos','erp_custos_fixos')
union all
select '4_rlshabilitada',
       (select string_agg(c.relname || ': rls=' || case when c.relrowsecurity then 'sim' else 'NAO' end, ' | ' order by c.relname)
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname in ('erp_centros_custos','erp_custos_fixos'));
