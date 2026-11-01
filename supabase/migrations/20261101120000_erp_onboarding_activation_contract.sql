-- ============================================================================
-- SYSNQRA ERP & SGQ INDUSTRIAL — contrato de onboarding/ativação
-- @AUTOR: Fernando Schuinsekel
-- @DATA: 2026-11-01
-- Escopo: cadastro público de empresa (teste grátis de 15 dias ou contratação),
-- escolha real de infraestrutura (nuvem x servidor local), estrutura lógica de
-- armazenamento por tenant, upload de logotipo e controle de duplicidade.
-- Nenhum dado é inventado aqui: as datas do teste continuam sendo calculadas
-- pelo trigger erp_initialize_trial() com o relógio do servidor.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Dados cadastrais e de implantação da empresa
-- ---------------------------------------------------------------------------
alter table public.erp_empresas
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists whatsapp text,
  add column if not exists responsavel_nome text,
  add column if not exists responsavel_email text,
  add column if not exists responsavel_telefone text,
  add column if not exists plano_codigo text,
  add column if not exists modo_ativacao text,
  add column if not exists origem_cadastro text,
  add column if not exists infraestrutura text,
  add column if not exists infra_hostname text,
  add column if not exists infra_diretorio text,
  add column if not exists infra_status text,
  add column if not exists storage_provider text,
  add column if not exists atualizado_em timestamptz;

comment on column public.erp_empresas.plano_codigo is 'Código do plano em erp_planos_catalogo.codigo (essencial/profissional/diamante/enterprise_gold)';
comment on column public.erp_empresas.modo_ativacao is 'trial (15 dias) ou pago; pago só vira ativo após webhook de pagamento real';
comment on column public.erp_empresas.infraestrutura is 'nuvem | local — determina onde o sistema roda e onde os arquivos são gravados';
comment on column public.erp_empresas.infra_status is 'provisionado (nuvem) | pendente_agente (local: exige agente/instalador, o navegador não cria pasta)';

-- ---------------------------------------------------------------------------
-- 2. Unicidade de CNPJ no banco (o controle anterior era só na aplicação)
--    Criado condicionalmente: se já houver duplicidades históricas, o índice
--    não é criado e a mensagem orienta a limpeza antes de reexecutar.
-- ---------------------------------------------------------------------------
do $$
declare
  v_duplicados int;
begin
  select count(*) into v_duplicados
  from (
    select lower(cnpj)
    from public.erp_empresas
    where cnpj is not null and cnpj <> ''
    group by lower(cnpj)
    having count(*) > 1
  ) d;

  if v_duplicados = 0 then
    create unique index if not exists erp_empresas_cnpj_unico_idx
      on public.erp_empresas (lower(cnpj))
      where cnpj is not null and cnpj <> '';
    raise notice 'ERP_ONBOARDING: índice de unicidade de CNPJ criado.';
  else
    raise notice 'ERP_ONBOARDING: % CNPJ(s) duplicado(s) em erp_empresas. Índice de unicidade NÃO criado. Corrija os duplicados e reexecute este bloco.', v_duplicados;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Solicitações de onboarding — idempotência e trilha de auditoria
--    Só a service role escreve (Edge Function). Sem políticas: RLS nega tudo.
-- ---------------------------------------------------------------------------
create table if not exists public.erp_onboarding_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  chave_idempotencia text not null unique,
  modo text not null default 'trial',
  plano_codigo text,
  documento text,
  tipo_documento text,
  email text,
  ip_origem text,
  user_agent text,
  empresa_id uuid references public.erp_empresas(id) on delete set null,
  auth_user_id uuid,
  status text not null default 'processando',
  payload jsonb not null default '{}'::jsonb,
  resultado jsonb,
  erro text,
  criado_em timestamptz not null default now(),
  concluido_em timestamptz,
  constraint erp_onboarding_modo_chk check (modo in ('trial','pago')),
  constraint erp_onboarding_status_chk check (status in ('processando','concluido','falha'))
);

create index if not exists erp_onboarding_documento_idx on public.erp_onboarding_solicitacoes (documento);
create index if not exists erp_onboarding_criado_em_idx on public.erp_onboarding_solicitacoes (criado_em desc);

alter table public.erp_onboarding_solicitacoes enable row level security;
alter table public.erp_onboarding_solicitacoes force row level security;
revoke all on table public.erp_onboarding_solicitacoes from public, anon, authenticated;

comment on table public.erp_onboarding_solicitacoes is 'Trilha de auditoria e chave de idempotência do cadastro público de empresas';

-- ---------------------------------------------------------------------------
-- 4. Estrutura lógica de armazenamento por empresa
--    Nuvem: pastas lógicas dentro do Storage do Supabase (prefixo {empresa_id}).
--    Local: as mesmas pastas, marcadas como pendentes de um agente/instalador —
--    o navegador não cria diretório em disco, e o sistema não finge que criou.
-- ---------------------------------------------------------------------------
create table if not exists public.erp_empresa_pastas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  caminho text not null,
  finalidade text not null,
  storage_provider text not null default 'supabase',
  status text not null default 'provisionado',
  criado_em timestamptz not null default now(),
  constraint erp_empresa_pastas_unicas unique (empresa_id, caminho),
  constraint erp_empresa_pastas_status_chk check (status in ('provisionado','pendente_agente'))
);

alter table public.erp_empresa_pastas enable row level security;
drop policy if exists erp_empresa_pastas_tenant_select on public.erp_empresa_pastas;
create policy erp_empresa_pastas_tenant_select on public.erp_empresa_pastas
  for select to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());

revoke all on table public.erp_empresa_pastas from public, anon;

comment on table public.erp_empresa_pastas is 'Mapa lógico das pastas de documentos de cada empresa (fotos, desenhos, anexos, backup)';

-- ---------------------------------------------------------------------------
-- 5. Bucket de logotipo das empresas (o cadastro público precisa anexar logo)
--    Público em leitura porque o logo aparece no login, em relatórios e na
--    nota fiscal; escrita restrita ao próprio tenant ou ao Master.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('empresas-logos', 'empresas-logos', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists empresas_logos_publico_read on storage.objects;
create policy empresas_logos_publico_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'empresas-logos');

drop policy if exists empresas_logos_tenant_insert on storage.objects;
create policy empresas_logos_tenant_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'empresas-logos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );

drop policy if exists empresas_logos_tenant_write on storage.objects;
create policy empresas_logos_tenant_write on storage.objects
  for update to authenticated
  using (
    bucket_id = 'empresas-logos'
    and (public.erp_is_master() or (storage.foldername(name))[1] = public.erp_current_empresa_id()::text)
  )
  with check (bucket_id = 'empresas-logos');

drop policy if exists empresas_logos_tenant_delete on storage.objects;
create policy empresas_logos_tenant_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'empresas-logos'
    and (public.erp_is_master() or (storage.foldername(name))[1] = public.erp_current_empresa_id()::text)
  );

-- ---------------------------------------------------------------------------
-- 6. Catálogo de planos legível por visitante anônimo
--    /planos e o assistente de ativação são páginas públicas: sem esta
--    política o catálogo devolve vazio para quem ainda não autenticou.
--    Preços já são informação de marketing exposta na home.
-- ---------------------------------------------------------------------------
drop policy if exists erp_planos_catalogo_publico_select on public.erp_planos_catalogo;
create policy erp_planos_catalogo_publico_select on public.erp_planos_catalogo
  for select to anon, authenticated
  using (ativo = true);

drop policy if exists erp_plano_modulos_publico_select on public.erp_plano_modulos;
create policy erp_plano_modulos_publico_select on public.erp_plano_modulos
  for select to anon, authenticated
  using (plano_codigo in (select codigo from public.erp_planos_catalogo where ativo = true));

-- ---------------------------------------------------------------------------
-- 7. Provisionamento da estrutura de armazenamento (service role apenas)
-- ---------------------------------------------------------------------------
create or replace function public.erp_provisionar_estrutura_armazenamento(
  p_empresa_id uuid,
  p_infraestrutura text default 'nuvem',
  p_diretorio_raiz text default null
)
returns table (caminho text, finalidade text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_provider text;
  v_prefixo text;
begin
  if p_empresa_id is null then
    raise exception 'ERP_ONBOARDING: empresa_id obrigatório.';
  end if;

  if coalesce(p_infraestrutura,'nuvem') not in ('nuvem','local') then
    raise exception 'ERP_ONBOARDING: infraestrutura deve ser nuvem ou local.';
  end if;

  if not exists (select 1 from public.erp_empresas e where e.id = p_empresa_id) then
    raise exception 'ERP_ONBOARDING: empresa inexistente.';
  end if;

  v_provider := case when p_infraestrutura = 'local' then 'local' else 'supabase' end;
  v_status := case when p_infraestrutura = 'local' then 'pendente_agente' else 'provisionado' end;
  v_prefixo := 'EMPRESAS/' || p_empresa_id::text;

  insert into public.erp_empresa_pastas (empresa_id, caminho, finalidade, storage_provider, status)
  select p_empresa_id,
         v_prefixo || '/' || f.pasta,
         f.finalidade,
         v_provider,
         v_status
  from (values
    ('LOGO','Identidade visual da empresa'),
    ('PRODUTOS','Fichas e imagens de produtos'),
    ('ENGENHARIA','Fichas técnicas, BOM e roteiros'),
    ('DESENHOS_TECNICOS','Desenhos controlados por revisão'),
    ('FOTOS','Registro fotográfico da operação'),
    ('QUALIDADE','Documentos controlados do SGQ'),
    ('RNC','Não conformidades e evidências'),
    ('INSPECOES','Resultados de inspeção e medições'),
    ('COMPRAS','Cotações, pedidos e certificados de fornecedores'),
    ('VENDAS','Propostas, pedidos e contratos'),
    ('ESTOQUE','Movimentações, inventários e laudos'),
    ('PCP','Programação, capacidades e ordens'),
    ('PRODUCAO','Apontamentos, OPs e refugo'),
    ('MANUTENCAO','Ordens, planos e laudos de máquinas'),
    ('RH','Admissionais, treinamentos e competências'),
    ('FINANCEIRO','Boletos, notas e comprovantes'),
    ('DOCUMENTOS','Documentação corporativa e fiscal'),
    ('ANEXOS','Anexos gerais dos módulos'),
    ('BACKUP','Cópias de segurança da empresa')
  ) as f(pasta, finalidade)
  on conflict (empresa_id, caminho) do nothing;

  update public.erp_empresas
  set infraestrutura = p_infraestrutura,
      infra_status = v_status,
      infra_diretorio = case when p_infraestrutura = 'local' then p_diretorio_raiz else null end,
      storage_provider = v_provider,
      atualizado_em = now()
  where id = p_empresa_id;

  return query
  select ep.caminho, ep.finalidade, ep.status
  from public.erp_empresa_pastas ep
  where ep.empresa_id = p_empresa_id
  order by ep.caminho;
end;
$$;

revoke all on function public.erp_provisionar_estrutura_armazenamento(uuid, text, text) from public, anon, authenticated;
grant execute on function public.erp_provisionar_estrutura_armazenamento(uuid, text, text) to service_role;

comment on function public.erp_provisionar_estrutura_armazenamento is 'Registra a estrutura lógica de pastas da empresa; em instalação local marca pendente_agente em vez de fingir que criou diretório';

-- ---------------------------------------------------------------------------
-- 8. Situação do plano/teste calculada pelo relógio do servidor
-- ---------------------------------------------------------------------------
create or replace function public.erp_empresa_situacao_plano(p_empresa_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'empresa_id', e.id,
    'plano', e.plano,
    'plano_codigo', e.plano_codigo,
    'plano_status', e.plano_status,
    'modo_ativacao', e.modo_ativacao,
    'infraestrutura', e.infraestrutura,
    'infra_status', e.infra_status,
    'trial_started_at', e.trial_started_at,
    'trial_ends_at', e.trial_ends_at,
    'dias_restantes', greatest(0, ceiling(extract(epoch from (e.trial_ends_at - now())) / 86400))::int,
    'expirado', coalesce(e.trial_ends_at < now(), false),
    'agora', now()
  )
  from public.erp_empresas e
  where e.id = p_empresa_id;
$$;

revoke all on function public.erp_empresa_situacao_plano(uuid) from public;
grant execute on function public.erp_empresa_situacao_plano(uuid) to authenticated, service_role;

comment on function public.erp_empresa_situacao_plano is 'Dias restantes do teste e status do plano — sempre calculados por now() do Postgres';

commit;
