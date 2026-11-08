-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — APLICAR AS MIGRATIONS QUE O BANCO AINDA NAO TEM
-- Gerado em 2026-11-08T12:12:57 por scripts/gerar-pacote-migrations-pendentes.mjs
-- Origem da lista: contrato medido no banco vivo (scripts/auditar-contrato-banco-vivo.mjs)
--
-- Medida no banco de agora: 148 das 176 tabelas que as telas usam existem.
-- Faltam 28, e todas elas ja tem migration escrita neste repo — o codigo esta na
-- frente do banco. O pacote abaixo contem 28 arquivo(s), copiados sem alteracao,
-- em ordem de timestamp e fechadas por dependencia.

--
-- Como aplicar (uma vez so): SQL Editor do Supabase > New query > colar tudo > Run.
-- As migrations do repo usam create table if not exists / create or replace function /
-- drop policy if exists + create policy, entao rodar de novo nao muda o resultado.
--
-- ----------------------------------------------------------------------------
-- AVISO DE RISCO (medido neste arquivo, nao chutado): o que apaga dado ou objeto
-- ----------------------------------------------------------------------------
-- Create/drop de policy nao esta aqui: cada drop policy if exists e seguido do create
-- da mesma policy no mesmo arquivo, entao a politica nunca fica ausente.
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_maquinas  —  20260927124000_erp_quality_finance_tpm_hardening.sql:33
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_maquinas  —  20260927124000_erp_quality_finance_tpm_hardening.sql:37
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_sgq_contadores  —  20261004100000_sgq_integrated_erp_v1.sql:285
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_rpnc  —  20261004100000_sgq_integrated_erp_v1.sql:315
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_sgq_capa_acoes  —  20261004100000_sgq_integrated_erp_v1.sql:497
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_documentos_qualidade  —  20261004100000_sgq_integrated_erp_v1.sql:546
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_documentos_qualidade_revisoes  —  20261004100000_sgq_integrated_erp_v1.sql:597
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_documentos_qualidade_revisoes  —  20261004100000_sgq_integrated_erp_v1.sql:631
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_documentos_qualidade_revisoes  —  20261004100000_sgq_integrated_erp_v1.sql:633
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_documentos_qualidade  —  20261004100000_sgq_integrated_erp_v1.sql:636
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_documentos_qualidade_revisoes  —  20261004100000_sgq_integrated_erp_v1.sql:642
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_documentos_qualidade_revisoes  —  20261004100000_sgq_integrated_erp_v1.sql:645
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_documentos_qualidade_leituras  —  20261004100000_sgq_integrated_erp_v1.sql:697
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET estoque_lotes  —  20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql:344
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET estoque_saldos  —  20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql:357
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET estoque_lotes  —  20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql:425
--   [SO RODA SE CHAMAR A RPC] DELETE erp_engenharia_bom_itens  —  20261021180000_engenharia_bom_mestre.sql:141
--   [SO RODA SE CHAMAR A RPC] DELETE erp_ficha_itens  —  20261021180000_engenharia_bom_mestre.sql:169
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_engenharia_bom  —  20261021180000_engenharia_bom_mestre.sql:211
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_engenharia_bom  —  20261021180000_engenharia_bom_mestre.sql:215
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_fichas_tecnicas  —  20261021180000_engenharia_bom_mestre.sql:219
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_fichas_tecnicas  —  20261021180000_engenharia_bom_mestre.sql:223
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_sgq_contadores  —  20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql:224
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_rpnc  —  20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql:332
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_sgq_capa_acoes  —  20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql:518
--   [SO RODA SE CHAMAR A RPC] DELETE erp_sgq_capa_acoes  —  20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql:533
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_rpnc  —  20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql:592
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_qualidade_certificados  —  20261101120000_erp_qualidade_certificados_dimensional.sql:232
--   [SO RODA SE CHAMAR A RPC] UPDATE...SET erp_central_evolucao_item  —  20261106150000_erp_central_evolucao_v1.sql:208
--
-- NADA aqui apaga tabela, coluna ou migration existente. Se os itens de cima nao
-- forem aceitaveis agora, apague apenas os blocos marcados antes de colar: o pacote
-- nao precisa dos DELETE para criar as tabelas que faltam.

-- ============================================================================

-- >>>>>>>>>>>>>>>>>>>> 20260912160000_qms_controlled_documents_workflow_v1.sql  (tabela ausente no banco: erp_documentos_qualidade_aprovacoes) >>>>>>>>>>>>>>>>>>>>
create table if not exists public.erp_documentos_qualidade_revisoes (
  id uuid primary key default gen_random_uuid(), documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade, empresa_id uuid not null,
  revisao integer not null, status text not null default 'rascunho' check (status in ('rascunho','solicitada_alteracao','em_revisao','aprovada','liberada','vigente','substituida','obsoleta')),
  titulo text not null, conteudo text, motivo_alteracao text, criado_por uuid references public.erp_usuarios(id), revisado_por uuid references public.erp_usuarios(id), aprovado_por uuid references public.erp_usuarios(id), liberado_por uuid references public.erp_usuarios(id),
  criado_em timestamptz not null default now(), revisado_em timestamptz, aprovado_em timestamptz, liberado_em timestamptz, data_efetiva timestamptz, proxima_revisao date, unique(documento_id,revisao)
);
create table if not exists public.erp_documentos_qualidade_solicitacoes (
  id uuid primary key default gen_random_uuid(), documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade, empresa_id uuid not null,
  solicitante_id uuid not null references public.erp_usuarios(id), setor_solicitante_id uuid references public.erp_setores(id), motivo text not null,
  prioridade text not null default 'normal' check (prioridade in ('baixa','normal','alta','critica')), status text not null default 'aberta' check (status in ('aberta','em_revisao','aprovada','rejeitada','cancelada','concluida')), criada_em timestamptz not null default now(), concluida_em timestamptz
);
create table if not exists public.erp_documentos_qualidade_ciencia (
  id uuid primary key default gen_random_uuid(), documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade, revisao_id uuid not null references public.erp_documentos_qualidade_revisoes(id) on delete cascade,
  empresa_id uuid not null, usuario_id uuid not null references public.erp_usuarios(id), reconhecido_em timestamptz not null default now(), unique(revisao_id,usuario_id)
);
create table if not exists public.erp_documentos_qualidade_aprovacoes (
  id uuid primary key default gen_random_uuid(), documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade, revisao_id uuid not null references public.erp_documentos_qualidade_revisoes(id) on delete cascade,
  empresa_id uuid not null, aprovador_id uuid not null references public.erp_usuarios(id), etapa text not null check (etapa in ('revisao','aprovacao','liberacao')), decisao text not null check (decisao in ('aprovado','rejeitado','devolvido')), comentario text, decidido_em timestamptz not null default now()
);
create table if not exists public.erp_permissoes_modulos (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null, usuario_id uuid references public.erp_usuarios(id) on delete cascade, setor_id uuid references public.erp_setores(id) on delete cascade,
  modulo text not null, visualizar boolean not null default false, criar boolean not null default false, editar boolean not null default false, excluir boolean not null default false, solicitar_alteracao boolean not null default false, revisar boolean not null default false, aprovar boolean not null default false, liberar boolean not null default false, bloquear boolean not null default false,
  unique(empresa_id,usuario_id,setor_id,modulo)
);
alter table public.erp_documentos_qualidade add column if not exists revisao_atual_id uuid references public.erp_documentos_qualidade_revisoes(id);
alter table public.erp_documentos_qualidade add column if not exists preparado_por uuid references public.erp_usuarios(id);
alter table public.erp_documentos_qualidade add column if not exists revisado_por uuid references public.erp_usuarios(id);
alter table public.erp_documentos_qualidade add column if not exists data_revisao timestamptz;
alter table public.erp_documentos_qualidade add column if not exists motivo_alteracao text;
alter table public.erp_documentos_qualidade add column if not exists distribuicao_controlada boolean not null default true;
create index if not exists idx_erp_docq_rev_empresa_doc on public.erp_documentos_qualidade_revisoes(empresa_id,documento_id,revisao desc);
create index if not exists idx_erp_docq_req_empresa_status on public.erp_documentos_qualidade_solicitacoes(empresa_id,status,criada_em desc);
create index if not exists idx_erp_docq_ciencia_empresa on public.erp_documentos_qualidade_ciencia(empresa_id,reconhecido_em desc);
create index if not exists idx_erp_docq_aprov_empresa on public.erp_documentos_qualidade_aprovacoes(empresa_id,decidido_em desc);
create index if not exists idx_erp_perm_mod_empresa_mod on public.erp_permissoes_modulos(empresa_id,modulo);
alter table public.erp_documentos_qualidade_revisoes enable row level security;
alter table public.erp_documentos_qualidade_solicitacoes enable row level security;
alter table public.erp_documentos_qualidade_ciencia enable row level security;
alter table public.erp_documentos_qualidade_aprovacoes enable row level security;
alter table public.erp_permissoes_modulos enable row level security;
create or replace function public.erp_qms_current_user() returns table(usuario_id uuid,empresa_id uuid,setor_id uuid,nivel_admin integer) language sql stable security definer set search_path=pg_catalog,public as $$ select u.id,u.empresa_id,u.setor_id,u.nivel_admin from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.ativo=true limit 1 $$;
create or replace function public.erp_qms_can(p_modulo text,p_acao text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select exists(select 1 from public.erp_qms_current_user() cu left join public.erp_permissoes_modulos pm on pm.empresa_id=cu.empresa_id and (pm.usuario_id=cu.usuario_id or (pm.usuario_id is null and pm.setor_id=cu.setor_id)) and pm.modulo=p_modulo where case p_acao when 'visualizar' then coalesce(pm.visualizar,false) when 'criar' then coalesce(pm.criar,false) when 'editar' then coalesce(pm.editar,false) when 'excluir' then coalesce(pm.excluir,false) when 'solicitar_alteracao' then coalesce(pm.solicitar_alteracao,false) when 'revisar' then coalesce(pm.revisar,false) when 'aprovar' then coalesce(pm.aprovar,false) when 'liberar' then coalesce(pm.liberar,false) when 'bloquear' then coalesce(pm.bloquear,false) else false end) or exists(select 1 from public.erp_qms_current_user() cu where cu.nivel_admin>=9 and p_acao in ('visualizar','criar','editar','solicitar_alteracao','revisar','aprovar','liberar','bloquear')) $$;
create policy qms_rev_select on public.erp_documentos_qualidade_revisoes for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','visualizar'));
create policy qms_rev_insert on public.erp_documentos_qualidade_revisoes for insert to authenticated with check (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','criar'));
create policy qms_rev_update on public.erp_documentos_qualidade_revisoes for update to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','editar')) with check (empresa_id=(select empresa_id from public.erp_qms_current_user()));
create policy qms_req_select on public.erp_documentos_qualidade_solicitacoes for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','visualizar'));
create policy qms_req_insert on public.erp_documentos_qualidade_solicitacoes for insert to authenticated with check (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','solicitar_alteracao'));
create policy qms_req_update on public.erp_documentos_qualidade_solicitacoes for update to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and (solicitante_id=(select usuario_id from public.erp_qms_current_user()) or public.erp_qms_can('qualidade_documentos','revisar'))) with check (empresa_id=(select empresa_id from public.erp_qms_current_user()));
create policy qms_ciencia_select on public.erp_documentos_qualidade_ciencia for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','visualizar'));
create policy qms_ciencia_insert on public.erp_documentos_qualidade_ciencia for insert to authenticated with check (empresa_id=(select empresa_id from public.erp_qms_current_user()) and usuario_id=(select usuario_id from public.erp_qms_current_user()));
create policy qms_aprov_select on public.erp_documentos_qualidade_aprovacoes for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','visualizar'));
create policy qms_aprov_insert on public.erp_documentos_qualidade_aprovacoes for insert to authenticated with check (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','aprovar'));
create policy qms_perm_select on public.erp_permissoes_modulos for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and (usuario_id=(select usuario_id from public.erp_qms_current_user()) or (select nivel_admin from public.erp_qms_current_user())>=9));
-- <<<<<<<<<<<<<< <<<< 20260912160000_qms_controlled_documents_workflow_v1.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20260921130000_erp_fornecedores_iso_precos_clientes.sql  (dependencia: erp_fornecedores exigida por 20260926_industrial_quality_supplyshopfloor_submodules.sql) >>>>>>>>>>>>>>>>>>>>
/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: supabase/migrations/20260921130000_erp_fornecedores_iso_precos_clientes.sql
- Status Atual: Revisão 3 (Schema de Compras e Comercial)
- Total de Linhas Gerado: 96
- Assinatura de Entrada (Primeiros 3 Imports): SQL migration — não aplicável
- Regra de Negócio Incorporada: Fornecedores, ISO 9001 em Storage privado, tabelas de preços, desconto por cliente e função central de resolução de preço.
*/
create table if not exists public.erp_fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo text,
  razao_social text not null,
  nome_fantasia text,
  documento text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  contato text,
  ativo boolean not null default true,
  iso_9001_certificado boolean not null default false,
  iso_certificado_nome text,
  iso_certificado_path text,
  iso_certificado_validade date,
  iso_certificado_numero text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_erp_fornecedores_empresa on public.erp_fornecedores(empresa_id);
alter table public.erp_fornecedores enable row level security;
drop policy if exists erp_fornecedores_select on public.erp_fornecedores;
drop policy if exists erp_fornecedores_insert on public.erp_fornecedores;
drop policy if exists erp_fornecedores_update on public.erp_fornecedores;
drop policy if exists erp_fornecedores_delete on public.erp_fornecedores;
create policy erp_fornecedores_select on public.erp_fornecedores for select to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_fornecedores_insert on public.erp_fornecedores for insert to authenticated with check (empresa_id=public.erp_current_empresa_id());
create policy erp_fornecedores_update on public.erp_fornecedores for update to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
create policy erp_fornecedores_delete on public.erp_fornecedores for delete to authenticated using (empresa_id=public.erp_current_empresa_id());

create table if not exists public.erp_tabelas_preco (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id,codigo)
);
create table if not exists public.erp_tabelas_preco_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  tabela_preco_id uuid not null references public.erp_tabelas_preco(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete cascade,
  preco numeric(18,4) not null check(preco>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tabela_preco_id,produto_id)
);
alter table public.erp_clientes add column if not exists tabela_preco_id uuid references public.erp_tabelas_preco(id) on delete set null;
alter table public.erp_clientes add column if not exists desconto_padrao_percentual numeric(7,4) not null default 0 check(desconto_padrao_percentual between 0 and 100);
alter table public.erp_clientes add column if not exists tipo_cliente text;
alter table public.erp_tabelas_preco enable row level security;
alter table public.erp_tabelas_preco_itens enable row level security;
create policy erp_tabelas_preco_select on public.erp_tabelas_preco for select to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_insert on public.erp_tabelas_preco for insert to authenticated with check (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_update on public.erp_tabelas_preco for update to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_delete on public.erp_tabelas_preco for delete to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_itens_select on public.erp_tabelas_preco_itens for select to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_itens_insert on public.erp_tabelas_preco_itens for insert to authenticated with check (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_itens_update on public.erp_tabelas_preco_itens for update to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_itens_delete on public.erp_tabelas_preco_itens for delete to authenticated using (empresa_id=public.erp_current_empresa_id());
insert into storage.buckets(id,name,public) values('erp-fornecedor-certificados','erp-fornecedor-certificados',false) on conflict(id) do nothing;
drop policy if exists erp_supplier_cert_select on storage.objects;
drop policy if exists erp_supplier_cert_insert on storage.objects;
drop policy if exists erp_supplier_cert_update on storage.objects;
drop policy if exists erp_supplier_cert_delete on storage.objects;
create policy erp_supplier_cert_select on storage.objects for select to authenticated using (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text);
create policy erp_supplier_cert_insert on storage.objects for insert to authenticated with check (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text);
create policy erp_supplier_cert_update on storage.objects for update to authenticated using (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text) with check (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text);
create policy erp_supplier_cert_delete on storage.objects for delete to authenticated using (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text);
create or replace function public.erp_preco_cliente_produto(p_cliente_id uuid,p_produto_id uuid)
returns numeric language sql stable security invoker set search_path=public
as $$
  select round(coalesce(i.preco,p.preco_venda,0)*(1-coalesce(c.desconto_padrao_percentual,0)/100),4)
  from public.erp_clientes c
  join public.erp_produtos p on p.id=p_produto_id and (p.empresa_id=c.empresa_id or p.empresa_id is null)
  left join public.erp_tabelas_preco_itens i on i.tabela_preco_id=c.tabela_preco_id and i.produto_id=p.id and i.empresa_id=c.empresa_id
  where c.id=p_cliente_id and c.empresa_id=public.erp_current_empresa_id();
$$;
revoke all on function public.erp_preco_cliente_produto(uuid,uuid) from public,anon;
grant execute on function public.erp_preco_cliente_produto(uuid,uuid) to authenticated;
/* Revisão 3 registrada após validação estrutural do arquivo. */
-- <<<<<<<<<<<<<< <<<< 20260921130000_erp_fornecedores_iso_precos_clientes.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20260925134500_manutencao_ordens_v1.sql  (dependencia: erp_manutencao_ordens exigida por 20260927124000_erp_quality_finance_tpm_hardening.sql) >>>>>>>>>>>>>>>>>>>>
create table if not exists public.erp_manutencao_ordens (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ativo_id uuid not null references public.erp_maquinas(id),
 tipo text not null check(tipo in ('PREVENTIVA','CORRETIVA','PREDITIVA')),
 descricao text not null,
 prioridade text not null default 'MEDIA',
 status text not null default 'ABERTA',
 data_prevista date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_erp_manut_ordens_empresa_status on public.erp_manutencao_ordens(empresa_id,status,data_prevista);
alter table public.erp_manutencao_ordens enable row level security;
drop policy if exists erp_manut_ordens_tenant on public.erp_manutencao_ordens;
create policy erp_manut_ordens_tenant on public.erp_manutencao_ordens for all to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
-- <<<<<<<<<<<<<< <<<< 20260925134500_manutencao_ordens_v1.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20260926190000_erp_fiscal_regras_v1.sql  (tabela ausente no banco: erp_regras_fiscais) >>>>>>>>>>>>>>>>>>>>
create table if not exists public.erp_regras_fiscais (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ncm text,
 cfop text,
 regime_empresa text,
 uf_destino text,
 icms_aliquota numeric(7,4) not null default 0,
 cst_csosn_icms text,
 ipi_aliquota numeric(7,4) not null default 0,
 cst_ipi text,
 pis_aliquota numeric(7,4) not null default 0,
 cofins_aliquota numeric(7,4) not null default 0,
 ativo boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.erp_regras_fiscais enable row level security;
drop policy if exists "erp_regras_fiscais_tenant" on public.erp_regras_fiscais;
create policy "erp_regras_fiscais_tenant" on public.erp_regras_fiscais
for all to authenticated
using ((empresa_id=public.erp_current_empresa_id()) or public.erp_is_master())
with check ((empresa_id=public.erp_current_empresa_id()) or public.erp_is_master());
grant select,insert,update,delete on public.erp_regras_fiscais to authenticated;
create index if not exists idx_erp_regras_fiscais_busca on public.erp_regras_fiscais(empresa_id,ncm,cfop,uf_destino,ativo);
-- <<<<<<<<<<<<<< <<<< 20260926190000_erp_fiscal_regras_v1.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20260926_industrial_quality_supplyshopfloor_submodules.sql  (tabela ausente no banco: erp_estoque_separacoes) >>>>>>>>>>>>>>>>>>>>
-- Industrial submodules: quality calibration, 8D/5S, purchasing requisitions, lot traceability, downtime, finishing and separation.
-- Histórico de aplicação preservado; o projeto Supabase canônico atual é zsklkydlawgvwgnvxwwx.
create table if not exists public.erp_requisicoes_compra (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,codigo text not null,ordem_producao_id uuid references public.erp_ordens_producao(id),data_limite date,comprador_nome text,status text not null default 'AGUARDANDO_COTACAO',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(empresa_id,codigo));
create table if not exists public.erp_requisicoes_compra_itens (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,requisicao_id uuid not null references public.erp_requisicoes_compra(id) on delete cascade,produto_id uuid not null references public.erp_produtos(id),quantidade numeric(14,3) not null default 0,fornecedor_id uuid references public.erp_fornecedores(id),status text not null default 'AGUARDANDO_COTACAO',created_at timestamptz not null default now());
create table if not exists public.erp_estoque_lotes (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,produto_id uuid not null references public.erp_produtos(id),fornecedor_id uuid references public.erp_fornecedores(id),nf_numero text,lote_interno text not null,lote_fornecedor text,quantidade_recebida numeric(14,3) not null default 0,quantidade_disponivel numeric(14,3) not null default 0,quantidade_reservada numeric(14,3) not null default 0,localizacao text,status_inspecao text not null default 'AGUARDANDO',data_entrada date not null default current_date,created_at timestamptz not null default now(),unique(empresa_id,lote_interno));
create table if not exists public.erp_producao_paradas (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,maquina_id uuid not null references public.erp_maquinas(id),ordem_producao_id uuid references public.erp_ordens_producao(id),motivo text not null,inicio timestamptz not null default now(),fim timestamptz,observacao text,status text not null default 'ABERTA',created_at timestamptz not null default now());
create table if not exists public.erp_acabamentos (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,ordem_producao_id uuid not null references public.erp_ordens_producao(id),lote_id uuid references public.erp_estoque_lotes(id),posto_trabalho text not null,quantidade_recebida numeric(14,3) not null default 0,quantidade_acabada numeric(14,3) not null default 0,quantidade_refugo numeric(14,3) not null default 0,status text not null default 'ABERTO',created_at timestamptz not null default now());
create table if not exists public.erp_estoque_separacoes (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,ordem_producao_id uuid not null references public.erp_ordens_producao(id),produto_id uuid not null references public.erp_produtos(id),lote_id uuid references public.erp_estoque_lotes(id),quantidade numeric(14,3) not null default 0,status text not null default 'PENDENTE',codigo_barras text,created_at timestamptz not null default now());
create table if not exists public.erp_rastreabilidade_cartoes (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,separacao_id uuid not null references public.erp_estoque_separacoes(id) on delete cascade,codigo text not null,impresso_em timestamptz,created_at timestamptz not null default now(),unique(empresa_id,codigo));
create table if not exists public.erp_qualidade_8d (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,codigo text not null,rpnc_id uuid references public.erp_rpnc(id),etapa_atual text not null default 'D1',d1_equipe text,d2_problema text,d3_contencao text,d4_causa_raiz text,d5_acoes text,d6_validacao text,d7_preventivas text,d8_encerramento text,status text not null default 'EM_ANALISE',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(empresa_id,codigo));
create table if not exists public.erp_qualidade_5s_auditorias (id uuid primary key default gen_random_uuid(),empresa_id uuid not null,setor text not null,data_auditoria date not null default current_date,auditor text,acompanhante text,seiri smallint not null default 1 check(seiri between 1 and 5),seiton smallint not null default 1 check(seiton between 1 and 5),seiso smallint not null default 1 check(seiso between 1 and 5),seiketsu smallint not null default 1 check(seiketsu between 1 and 5),shitsuke smallint not null default 1 check(shitsuke between 1 and 5),observacoes jsonb not null default '{}'::jsonb,media numeric(4,2) generated always as ((seiri+seiton+seiso+seiketsu+shitsuke)/5.0) stored,status text not null default 'ABERTA',created_at timestamptz not null default now());
do $$ declare t text; begin foreach t in array array['erp_requisicoes_compra','erp_requisicoes_compra_itens','erp_estoque_lotes','erp_producao_paradas','erp_acabamentos','erp_estoque_separacoes','erp_rastreabilidade_cartoes','erp_qualidade_8d','erp_qualidade_5s_auditorias'] loop execute format('alter table public.%I enable row level security',t); execute format('grant select,insert,update,delete on public.%I to authenticated',t); execute format('drop policy if exists %I on public.%I',t||'_select',t); execute format('drop policy if exists %I on public.%I',t||'_insert',t); execute format('drop policy if exists %I on public.%I',t||'_update',t); execute format('drop policy if exists %I on public.%I',t||'_delete',t); execute format('create policy %I on public.%I for select to authenticated using (empresa_id=erp_current_empresa_id())',t||'_select',t); execute format('create policy %I on public.%I for insert to authenticated with check (empresa_id=erp_current_empresa_id())',t||'_insert',t); execute format('create policy %I on public.%I for update to authenticated using (empresa_id=erp_current_empresa_id()) with check (empresa_id=erp_current_empresa_id())',t||'_update',t); execute format('create policy %I on public.%I for delete to authenticated using (empresa_id=erp_current_empresa_id())',t||'_delete',t); end loop; end $$;
create index if not exists idx_erp_req_compra_op on public.erp_requisicoes_compra(empresa_id,ordem_producao_id);
create index if not exists idx_erp_lotes_produto on public.erp_estoque_lotes(empresa_id,produto_id);
create index if not exists idx_erp_paradas_abertas on public.erp_producao_paradas(empresa_id,status,maquina_id);
create index if not exists idx_erp_separacoes_op on public.erp_estoque_separacoes(empresa_id,ordem_producao_id);
-- <<<<<<<<<<<<<< <<<< 20260926_industrial_quality_supplyshopfloor_submodules.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20260927124000_erp_quality_finance_tpm_hardening.sql  (tabela ausente no banco: erp_financeiro_apuracao_custos) >>>>>>>>>>>>>>>>>>>>
-- ERP Industrial: apuração real de custos + reforço TPM
-- Compatível com o modelo de manutenção já existente no projeto.
create table if not exists public.erp_financeiro_apuracao_custos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo_produto text not null,
  custo_padrao_total numeric(12,4) not null default 0,
  custo_real_total numeric(12,4) not null default 0,
  data_apuracao timestamptz not null default now()
);
create index if not exists idx_erp_fin_apuracao_empresa_data
  on public.erp_financeiro_apuracao_custos(empresa_id,data_apuracao desc);
alter table public.erp_financeiro_apuracao_custos enable row level security;
drop policy if exists erp_fin_apuracao_tenant on public.erp_financeiro_apuracao_custos;
create policy erp_fin_apuracao_tenant on public.erp_financeiro_apuracao_custos
for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

alter table public.erp_manutencao_ordens add column if not exists numero_os text;
alter table public.erp_manutencao_ordens add column if not exists inicio_atendimento timestamptz;
alter table public.erp_manutencao_ordens add column if not exists data_fechamento timestamptz;
alter table public.erp_manutencao_ordens add column if not exists laudo_tecnico text;

create or replace function public.erp_tpm_sync_machine_status()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if new.status in ('ABERTA','EM_EXECUCAO') then
    update public.erp_maquinas
       set status='BLOQUEADA_MANUTENCAO'
     where id=new.ativo_id and empresa_id=new.empresa_id;
  elsif new.status='CONCLUIDA' then
    update public.erp_maquinas
       set status='ATIVO'
     where id=new.ativo_id and empresa_id=new.empresa_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_tpm_sync_machine_status on public.erp_manutencao_ordens;
create trigger trg_erp_tpm_sync_machine_status
after insert or update of status on public.erp_manutencao_ordens
for each row execute function public.erp_tpm_sync_machine_status();

revoke all on function public.erp_tpm_sync_machine_status() from public;
grant execute on function public.erp_tpm_sync_machine_status() to authenticated;
-- <<<<<<<<<<<<<< <<<< 20260927124000_erp_quality_finance_tpm_hardening.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20260927183000_pedidos_compra.sql  (dependencia: erp_pedidos_compra exigida por 20261027120000_repair_production_rest_schema.sql) >>>>>>>>>>>>>>>>>>>>
create table if not exists public.erp_pedidos_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  numero bigint generated by default as identity,
  fornecedor_id uuid not null,
  requisicao_id uuid null,
  comprador_id uuid null,
  comprador_nome text null,
  condicao_pagamento text null,
  prazo_entrega date null,
  observacoes text null,
  status text not null default 'RASCUNHO',
  data_pedido timestamptz not null default now(),
  total numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_pedidos_compra_status_chk check (status in ('RASCUNHO','PENDENTE_APROVACAO','APROVADO','REJEITADO','CANCELADO','RECEBIMENTO_PARCIAL','RECEBIDO')),
  constraint erp_pedidos_compra_empresa_numero_uk unique (empresa_id, numero),
  constraint erp_pedidos_compra_fornecedor_fk foreign key (fornecedor_id) references public.erp_fornecedores(id),
  constraint erp_pedidos_compra_requisicao_fk foreign key (requisicao_id) references public.erp_requisicoes_compra(id),
  constraint erp_pedidos_compra_comprador_fk foreign key (comprador_id) references public.erp_usuarios(id)
);

create table if not exists public.erp_pedidos_compra_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  pedido_id uuid not null references public.erp_pedidos_compra(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  codigo_produto text not null,
  descricao_produto text not null,
  quantidade numeric(18,3) not null,
  unidade text not null default 'UN',
  preco_unitario numeric(18,4) not null default 0,
  total numeric(18,2) generated always as (round(quantidade * preco_unitario, 2)) stored,
  created_at timestamptz not null default now(),
  constraint erp_pedidos_compra_itens_quantidade_chk check (quantidade > 0),
  constraint erp_pedidos_compra_itens_preco_chk check (preco_unitario >= 0)
);

create index if not exists idx_erp_pedidos_compra_empresa_status on public.erp_pedidos_compra(empresa_id,status);
create index if not exists idx_erp_pedidos_compra_empresa_data on public.erp_pedidos_compra(empresa_id,data_pedido desc);
create index if not exists idx_erp_pedidos_compra_itens_pedido on public.erp_pedidos_compra_itens(empresa_id,pedido_id);

alter table public.erp_pedidos_compra enable row level security;
alter table public.erp_pedidos_compra_itens enable row level security;

drop policy if exists erp_pedidos_compra_select on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_insert on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_update on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_delete on public.erp_pedidos_compra;
create policy erp_pedidos_compra_select on public.erp_pedidos_compra for select using (empresa_id = erp_current_empresa_id());
create policy erp_pedidos_compra_insert on public.erp_pedidos_compra for insert with check (empresa_id = erp_current_empresa_id());
create policy erp_pedidos_compra_update on public.erp_pedidos_compra for update using (empresa_id = erp_current_empresa_id()) with check (empresa_id = erp_current_empresa_id());
create policy erp_pedidos_compra_delete on public.erp_pedidos_compra for delete using (empresa_id = erp_current_empresa_id());

drop policy if exists erp_pedidos_compra_itens_select on public.erp_pedidos_compra_itens;
drop policy if exists erp_pedidos_compra_itens_insert on public.erp_pedidos_compra_itens;
drop policy if exists erp_pedidos_compra_itens_update on public.erp_pedidos_compra_itens;
drop policy if exists erp_pedidos_compra_itens_delete on public.erp_pedidos_compra_itens;
create policy erp_pedidos_compra_itens_select on public.erp_pedidos_compra_itens for select using (empresa_id = erp_current_empresa_id());
create policy erp_pedidos_compra_itens_insert on public.erp_pedidos_compra_itens for insert with check (empresa_id = erp_current_empresa_id());
create policy erp_pedidos_compra_itens_update on public.erp_pedidos_compra_itens for update using (empresa_id = erp_current_empresa_id()) with check (empresa_id = erp_current_empresa_id());
create policy erp_pedidos_compra_itens_delete on public.erp_pedidos_compra_itens for delete using (empresa_id = erp_current_empresa_id());

create or replace function public.erp_atualizar_total_pedido_compra()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.erp_pedidos_compra p
     set total = coalesce((select sum(i.total) from public.erp_pedidos_compra_itens i where i.pedido_id = p.id),0),
         updated_at = now()
   where p.id = coalesce(new.pedido_id, old.pedido_id)
     and p.empresa_id = coalesce(new.empresa_id, old.empresa_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_erp_pedidos_compra_total on public.erp_pedidos_compra_itens;
create trigger trg_erp_pedidos_compra_total
after insert or update or delete on public.erp_pedidos_compra_itens
for each row execute function public.erp_atualizar_total_pedido_compra();

create or replace function public.erp_numero_pedido_compra_formatado(p_numero bigint)
returns text
language sql
immutable
as $$ select 'PC-' || lpad(p_numero::text, 4, '0') $$;

grant select, insert, update, delete on public.erp_pedidos_compra to authenticated;
grant select, insert, update, delete on public.erp_pedidos_compra_itens to authenticated;
-- <<<<<<<<<<<<<< <<<< 20260927183000_pedidos_compra.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261001120000_pos_rfq_operacao_comercial.sql  (dependencia: erp_rfq exigida por 20261027120000_repair_production_rest_schema.sql) >>>>>>>>>>>>>>>>>>>>
create sequence if not exists public.erp_pdv_vendas_numero_seq;

create table if not exists public.erp_caixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  codigo text not null,
  descricao text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique(empresa_id,codigo)
);

create table if not exists public.erp_caixas_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  caixa_id uuid not null references public.erp_caixas(id),
  numero bigint not null default nextval('public.erp_pdv_vendas_numero_seq'),
  operador_id uuid null references public.erp_usuarios(id),
  cliente_id uuid null references public.erp_clientes(id),
  subtotal numeric(18,2) not null default 0,
  desconto numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  forma_pagamento text not null,
  status text not null default 'FINALIZADA',
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_caixas_movimentos_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  movimento_id uuid not null references public.erp_caixas_movimentos(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  descricao text not null,
  quantidade numeric(18,4) not null check (quantidade > 0),
  valor_unitario numeric(18,4) not null default 0,
  desconto numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0
);

create table if not exists public.erp_rfq (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  numero bigint not null default nextval('public.erp_pdv_vendas_numero_seq'),
  status text not null default 'RASCUNHO',
  data_emissao date not null default current_date,
  data_necessidade date,
  condicao_pagamento text,
  prazo_resposta date,
  observacoes text,
  created_by uuid null references public.erp_usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_rfq_fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  rfq_id uuid not null references public.erp_rfq(id) on delete cascade,
  fornecedor_id uuid not null references public.erp_fornecedores(id),
  status text not null default 'SELECIONADO',
  resposta_recebida_em timestamptz
);

create table if not exists public.erp_rfq_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  rfq_id uuid not null references public.erp_rfq(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  descricao text not null,
  codigo text not null,
  quantidade numeric(18,4) not null check (quantidade > 0),
  unidade text not null default 'UN',
  data_necessidade date,
  observacoes text
);

create index if not exists idx_erp_caixas_empresa on public.erp_caixas(empresa_id);
create index if not exists idx_erp_caixas_mov_empresa on public.erp_caixas_movimentos(empresa_id,created_at desc);
create index if not exists idx_erp_caixas_itens_mov on public.erp_caixas_movimentos_itens(movimento_id);
create index if not exists idx_erp_rfq_empresa on public.erp_rfq(empresa_id,created_at desc);
create index if not exists idx_erp_rfq_fornecedores_rfq on public.erp_rfq_fornecedores(rfq_id);
create index if not exists idx_erp_rfq_itens_rfq on public.erp_rfq_itens(rfq_id);

alter table public.erp_caixas enable row level security;
alter table public.erp_caixas_movimentos enable row level security;
alter table public.erp_caixas_movimentos_itens enable row level security;
alter table public.erp_rfq enable row level security;
alter table public.erp_rfq_fornecedores enable row level security;
alter table public.erp_rfq_itens enable row level security;

drop policy if exists erp_caixas_tenant on public.erp_caixas;
create policy erp_caixas_tenant on public.erp_caixas for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_caixas_mov_tenant on public.erp_caixas_movimentos;
create policy erp_caixas_mov_tenant on public.erp_caixas_movimentos for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_caixas_itens_tenant on public.erp_caixas_movimentos_itens;
create policy erp_caixas_itens_tenant on public.erp_caixas_movimentos_itens for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_rfq_tenant on public.erp_rfq;
create policy erp_rfq_tenant on public.erp_rfq for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_rfq_fornecedores_tenant on public.erp_rfq_fornecedores;
create policy erp_rfq_fornecedores_tenant on public.erp_rfq_fornecedores for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_rfq_itens_tenant on public.erp_rfq_itens;
create policy erp_rfq_itens_tenant on public.erp_rfq_itens for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select,insert,update,delete on public.erp_caixas,public.erp_caixas_movimentos,public.erp_caixas_movimentos_itens,public.erp_rfq,public.erp_rfq_fornecedores,public.erp_rfq_itens to authenticated;
-- <<<<<<<<<<<<<< <<<< 20261001120000_pos_rfq_operacao_comercial.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261004100000_sgq_integrated_erp_v1.sql  (tabela ausente no banco: erp_documentos_qualidade_distribuicoes) >>>>>>>>>>>>>>>>>>>>
create table if not exists public.erp_sgq_contadores (
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  chave text not null,
  proximo_valor bigint not null default 1 check (proximo_valor > 0),
  primary key (empresa_id, chave)
);

alter table public.erp_rpnc add column if not exists sgq_origem text;
alter table public.erp_rpnc add column if not exists sgq_severidade text
  check (sgq_severidade in ('Critica', 'Maior', 'Menor'));
alter table public.erp_rpnc add column if not exists setor_id uuid references public.erp_setores(id) on delete set null;
alter table public.erp_rpnc add column if not exists sgq_vinculo_tipo text;
alter table public.erp_rpnc add column if not exists sgq_vinculo_id uuid;
alter table public.erp_rpnc add column if not exists sgq_aberto_por uuid references public.erp_usuarios(id) on delete set null;
alter table public.erp_rpnc add column if not exists sgq_encerrado_por uuid references public.erp_usuarios(id) on delete set null;
alter table public.erp_rpnc add column if not exists sgq_encerrado_em timestamptz;

create table if not exists public.erp_sgq_capa_acoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  rpnc_id uuid not null references public.erp_rpnc(id) on delete cascade,
  tipo text not null check (tipo in ('Contencao', 'Corretiva', 'Preventiva')),
  descricao text not null,
  causa_raiz text,
  responsavel_id uuid not null references public.erp_usuarios(id) on delete restrict,
  prazo date not null,
  status text not null default 'Planejada'
    check (status in ('Planejada', 'Em execucao', 'Concluida', 'Aguardando aprovacao', 'Aprovada', 'Reprovada', 'Verificada')),
  evidencia text,
  comentario_aprovacao text,
  resultado_eficacia text check (resultado_eficacia in ('Eficaz', 'Ineficaz')),
  verificado_por uuid references public.erp_usuarios(id) on delete set null,
  verificado_em timestamptz,
  created_by uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_sgq_auditoria (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  entidade text not null,
  entidade_id uuid not null,
  operacao text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  ator_id uuid references public.erp_usuarios(id) on delete restrict,
  ocorrido_em timestamptz not null default now(),
  antes jsonb,
  depois jsonb
);

create table if not exists public.erp_documentos_qualidade_distribuicoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade,
  revisao_id uuid not null references public.erp_documentos_qualidade_revisoes(id) on delete cascade,
  setor_id uuid not null references public.erp_setores(id) on delete cascade,
  distribuido_por uuid references public.erp_usuarios(id) on delete set null,
  distribuido_em timestamptz not null default now(),
  unique (revisao_id, setor_id)
);

alter table public.erp_documentos_qualidade_revisoes add column if not exists area text;
alter table public.erp_documentos_qualidade_revisoes add column if not exists setor text;
alter table public.erp_documentos_qualidade_revisoes add column if not exists tipo text;
alter table public.erp_documentos_qualidade_revisoes add column if not exists validade_ate date;

create table if not exists public.erp_documentos_qualidade_leituras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade,
  revisao_id uuid not null references public.erp_documentos_qualidade_revisoes(id) on delete cascade,
  distribuicao_id uuid not null references public.erp_documentos_qualidade_distribuicoes(id) on delete cascade,
  usuario_id uuid not null references public.erp_usuarios(id) on delete cascade,
  leitura_obrigatoria boolean not null default true,
  lido_em timestamptz,
  unique (revisao_id, usuario_id)
);

create index if not exists idx_sgq_rpncs_empresa_status on public.erp_rpnc (empresa_id, status, criado_em desc) where sgq_origem is not null;
create index if not exists idx_sgq_rpncs_empresa_setor on public.erp_rpnc (empresa_id, setor_id, status) where sgq_origem is not null;
create unique index if not exists uq_sgq_rpncs_numero_empresa on public.erp_rpnc (empresa_id, numero_rpnc) where sgq_origem is not null;
create index if not exists idx_sgq_capa_rpnc_status on public.erp_sgq_capa_acoes (empresa_id, rpnc_id, status, prazo);
create index if not exists idx_sgq_auditoria_empresa_entidade on public.erp_sgq_auditoria (empresa_id, entidade, entidade_id, ocorrido_em desc);
create index if not exists idx_sgq_distribuicoes_revision on public.erp_documentos_qualidade_distribuicoes (empresa_id, revisao_id);
create index if not exists idx_sgq_leituras_usuario_pendente on public.erp_documentos_qualidade_leituras (empresa_id, usuario_id, lido_em);

alter table public.erp_sgq_capa_acoes enable row level security;
alter table public.erp_sgq_auditoria enable row level security;
alter table public.erp_sgq_contadores enable row level security;
alter table public.erp_documentos_qualidade_distribuicoes enable row level security;
alter table public.erp_documentos_qualidade_leituras enable row level security;

drop policy if exists sgq_capa_select on public.erp_sgq_capa_acoes;
drop policy if exists sgq_capa_insert on public.erp_sgq_capa_acoes;
drop policy if exists sgq_capa_update on public.erp_sgq_capa_acoes;
drop policy if exists sgq_auditoria_select on public.erp_sgq_auditoria;
drop policy if exists sgq_distribuicoes_select on public.erp_documentos_qualidade_distribuicoes;
drop policy if exists sgq_leituras_select on public.erp_documentos_qualidade_leituras;

create policy sgq_capa_select on public.erp_sgq_capa_acoes for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));
create policy sgq_capa_insert on public.erp_sgq_capa_acoes for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'criar'));
create policy sgq_capa_update on public.erp_sgq_capa_acoes for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'));
create policy sgq_auditoria_select on public.erp_sgq_auditoria for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));
create policy sgq_distribuicoes_select on public.erp_documentos_qualidade_distribuicoes for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_qms_can('qualidade_documentos', 'visualizar'));
create policy sgq_leituras_select on public.erp_documentos_qualidade_leituras for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (usuario_id = (select usuario_id from public.erp_qms_current_user())
      or public.erp_qms_can('qualidade_documentos', 'visualizar'))
  );

create or replace function public.erp_qms_protect_revision()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Revisões documentais não podem ser excluídas.'; end if;
  if new.id is distinct from old.id or new.documento_id is distinct from old.documento_id
    or new.empresa_id is distinct from old.empresa_id or new.revisao is distinct from old.revisao
    or new.criado_por is distinct from old.criado_por or new.criado_em is distinct from old.criado_em then
    raise exception 'A identidade da revisão é imutável.';
  end if;
  if new.status is distinct from old.status then
    if current_setting('app.qms_revision_workflow', true) is distinct from 'workflow'
      or not (
        (old.status = 'rascunho' and new.status = 'em_revisao')
        or (old.status = 'em_revisao' and new.status = 'aprovada')
        or (old.status = 'aprovada' and new.status = 'vigente')
        or (old.status in ('vigente','liberada') and new.status = 'substituida')
      ) then raise exception 'A transição de revisão deve ocorrer pelo workflow autorizado.'; end if;
  end if;
  if old.status <> 'rascunho' and (
    new.titulo is distinct from old.titulo or new.conteudo is distinct from old.conteudo
    or new.motivo_alteracao is distinct from old.motivo_alteracao
    or new.area is distinct from old.area or new.setor is distinct from old.setor
    or new.tipo is distinct from old.tipo or new.validade_ate is distinct from old.validade_ate
  ) then raise exception 'Conteúdo de revisão enviada ou aprovada é imutável.'; end if;
  if old.status = 'rascunho' and nullif(btrim(new.motivo_alteracao),'') is null then
    raise exception 'O motivo da revisão é obrigatório.';
  end if;
  return new;
end
$$;

drop trigger if exists trg_erp_qms_protect_revision on public.erp_documentos_qualidade_revisoes;
create trigger trg_erp_qms_protect_revision before update or delete on public.erp_documentos_qualidade_revisoes
  for each row execute function public.erp_qms_protect_revision();

create or replace function public.erp_qms_protect_document()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Documentos controlados não podem ser excluídos; registre sua obsolescência.'; end if;
  if coalesce(current_setting('app.qms_document_workflow', true),'') not in ('create','workflow') then
    raise exception 'Documentos controlados só podem ser alterados pelo fluxo de revisão aprovado.';
  end if;
  return new;
end
$$;

drop trigger if exists trg_erp_qms_protect_document on public.erp_documentos_qualidade;
create trigger trg_erp_qms_protect_document before update or delete on public.erp_documentos_qualidade
  for each row execute function public.erp_qms_protect_document();

create or replace function public.erp_sgq_auditar_mutacao()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid;
  v_actor uuid;
begin
  if tg_table_name = 'erp_rpnc' and coalesce(to_jsonb(new)->>'sgq_origem', to_jsonb(old)->>'sgq_origem') is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  v_empresa := coalesce((to_jsonb(new)->>'empresa_id')::uuid, (to_jsonb(old)->>'empresa_id')::uuid);
  select u.id into v_actor from public.erp_usuarios u
    where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null limit 1;
  insert into public.erp_sgq_auditoria (empresa_id, entidade, entidade_id, operacao, ator_id, antes, depois)
  values (
    v_empresa,
    tg_table_name,
    coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid),
    tg_op,
    v_actor,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create or replace function public.erp_sgq_proteger_auditoria()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  raise exception 'O registro de auditoria é imutável.';
end
$$;

create or replace function public.erp_sgq_validar_capa_tenant()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare
  v_actor uuid;
begin
  if not exists (
    select 1 from public.erp_rpnc r
    where r.id=new.rpnc_id and r.empresa_id=new.empresa_id
  ) then raise exception 'A RPNC da ação CAPA não pertence à empresa informada.'; end if;
  if not exists (
    select 1 from public.erp_usuarios u
    where u.id=new.responsavel_id and u.empresa_id=new.empresa_id and u.ativo=true and u.deleted_at is null
  ) then raise exception 'O responsável CAPA não pertence à empresa ou está inativo.'; end if;
  if tg_op='UPDATE' and (new.empresa_id is distinct from old.empresa_id or new.rpnc_id is distinct from old.rpnc_id) then
    raise exception 'A ação CAPA não pode ser movida entre empresas ou RPNCs.';
  end if;
  if tg_op='INSERT' and new.created_by is null then
    select u.id into v_actor from public.erp_usuarios u
      where u.auth_user_id=auth.uid() and u.empresa_id=new.empresa_id and u.ativo=true and u.deleted_at is null limit 1;
    if v_actor is null then raise exception 'Usuário ERP ativo não identificado para a ação CAPA.'; end if;
    new.created_by := v_actor;
  end if;
  return new;
end
$$;

drop trigger if exists trg_sgq_capa_tenant on public.erp_sgq_capa_acoes;
create trigger trg_sgq_capa_tenant before insert or update on public.erp_sgq_capa_acoes
  for each row execute function public.erp_sgq_validar_capa_tenant();

drop trigger if exists trg_sgq_auditoria_immutable on public.erp_sgq_auditoria;
create trigger trg_sgq_auditoria_immutable before update or delete on public.erp_sgq_auditoria
  for each row execute function public.erp_sgq_proteger_auditoria();
drop trigger if exists trg_sgq_rpncs_audit on public.erp_rpnc;
create trigger trg_sgq_rpncs_audit after insert or update or delete on public.erp_rpnc
  for each row execute function public.erp_sgq_auditar_mutacao();
drop trigger if exists trg_sgq_capa_audit on public.erp_sgq_capa_acoes;
create trigger trg_sgq_capa_audit after insert or update or delete on public.erp_sgq_capa_acoes
  for each row execute function public.erp_sgq_auditar_mutacao();
drop trigger if exists trg_sgq_documentos_audit on public.erp_documentos_qualidade;
create trigger trg_sgq_documentos_audit after insert or update or delete on public.erp_documentos_qualidade
  for each row execute function public.erp_sgq_auditar_mutacao();
drop trigger if exists trg_sgq_documentos_revisoes_audit on public.erp_documentos_qualidade_revisoes;
create trigger trg_sgq_documentos_revisoes_audit after insert or update or delete on public.erp_documentos_qualidade_revisoes
  for each row execute function public.erp_sgq_auditar_mutacao();

create or replace function public.erp_sgq_abrir_rpnc(
  p_descricao text,
  p_origem text,
  p_severidade text,
  p_setor_id uuid default null,
  p_linked_entity_type text default null,
  p_linked_entity_id uuid default null
) returns public.erp_rpnc
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_numero bigint;
  v_result public.erp_rpnc;
begin
  if v_empresa is null then raise exception 'Empresa não identificada.'; end if;
  if not public.erp_has_permission('qualidade', 'criar') then raise exception 'Sem permissão para abrir RPNC.'; end if;
  if nullif(btrim(p_descricao), '') is null or nullif(btrim(p_origem), '') is null then
    raise exception 'Descrição e origem são obrigatórias.';
  end if;
  if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then raise exception 'Gravidade inválida.'; end if;
  if p_setor_id is null or not exists (
    select 1 from public.erp_setores s where s.id = p_setor_id and s.empresa_id = v_empresa and s.ativo = true
  ) then raise exception 'Setor inválido para a empresa.'; end if;
  select u.id into v_usuario from public.erp_usuarios u
    where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null limit 1;
  if v_usuario is null then raise exception 'Usuário ERP ativo não identificado.'; end if;
  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
    values (v_empresa, 'RPNC-' || to_char(current_date, 'YYYY'), 1)
    on conflict (empresa_id, chave) do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
    returning proximo_valor into v_numero;
  while exists (
    select 1 from public.erp_rpnc
    where empresa_id=v_empresa
      and numero_rpnc='RPNC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_numero::text, 6, '0')
  ) loop
    update public.erp_sgq_contadores set proximo_valor=proximo_valor+1
      where empresa_id=v_empresa and chave='RPNC-' || to_char(current_date, 'YYYY')
      returning proximo_valor-1 into v_numero;
  end loop;
  perform set_config('app.sgq_rpnc_open','open',true);
  insert into public.erp_rpnc (
    empresa_id, numero_rpnc, descricao_nao_conformidade, status, acao_corretiva,
    sgq_origem, sgq_severidade, setor_id, sgq_vinculo_tipo, sgq_vinculo_id, sgq_aberto_por
  ) values (
    v_empresa, 'RPNC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_numero::text, 6, '0'),
    btrim(p_descricao), 'aberta', btrim(p_descricao), btrim(p_origem), p_severidade, p_setor_id,
    nullif(btrim(p_linked_entity_type), ''), p_linked_entity_id, v_usuario
  ) returning * into v_result;
  return v_result;
end
$$;

create or replace function public.erp_sgq_transicionar_rpnc(p_rpnc_id uuid, p_status text)
returns public.erp_rpnc
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_row public.erp_rpnc;
begin
  if not public.erp_has_permission('qualidade', 'editar') then raise exception 'Sem permissão para atualizar RPNC.'; end if;
  if p_status is null or p_status not in ('aberta','em análise','em tratamento','aguardando eficácia','encerrada') then
    raise exception 'Status de RPNC inválido.';
  end if;
  select u.id into v_user from public.erp_usuarios u where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true limit 1;
  update public.erp_rpnc set
    status = p_status,
    sgq_encerrado_por = case when p_status = 'encerrada' then v_user else sgq_encerrado_por end,
    sgq_encerrado_em = case when p_status = 'encerrada' then now() else sgq_encerrado_em end
  where id = p_rpnc_id and empresa_id = v_empresa and sgq_origem is not null
  returning * into v_row;
  if not found then raise exception 'RPNC não encontrada.'; end if;
  return v_row;
end
$$;

create or replace function public.erp_sgq_validar_transicao_capa()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.id is distinct from old.id or new.empresa_id is distinct from old.empresa_id
    or new.rpnc_id is distinct from old.rpnc_id or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'A identidade da ação CAPA é imutável.';
  end if;
  if old.status in ('Aprovada','Verificada') and (
    new.tipo is distinct from old.tipo or new.descricao is distinct from old.descricao
    or new.causa_raiz is distinct from old.causa_raiz or new.responsavel_id is distinct from old.responsavel_id
    or new.prazo is distinct from old.prazo
  ) then raise exception 'A ação aprovada é imutável; registre uma nova ação para alterar o plano.'; end if;
  if (new.comentario_aprovacao is distinct from old.comentario_aprovacao
      or new.resultado_eficacia is distinct from old.resultado_eficacia
      or new.verificado_por is distinct from old.verificado_por
      or new.verificado_em is distinct from old.verificado_em)
    and coalesce(current_setting('app.sgq_capa_decision',true),'') <> 'decision' then
    raise exception 'Decisões e resultado da eficácia só podem ser registrados pelo workflow autorizado.';
  end if;
  if new.evidencia is distinct from old.evidencia
    and new.status is not distinct from old.status
    and coalesce(current_setting('app.sgq_capa_decision',true),'') <> 'decision' then
    raise exception 'A evidência só pode ser registrada na submissão ou decisão da ação.';
  end if;
  if new.status is distinct from old.status then
    if new.status in ('Aprovada','Reprovada') then
      if old.status <> 'Aguardando aprovacao' or not public.erp_has_permission('qualidade','aprovar')
        or coalesce(current_setting('app.sgq_capa_decision',true),'') <> 'decision' then
        raise exception 'Aprovação CAPA não autorizada ou fora da etapa de aprovação.';
      end if;
    elsif new.status = 'Verificada' then
      if old.status <> 'Aprovada'
        or not public.erp_has_permission('qualidade','verificar')
        or coalesce(current_setting('app.sgq_capa_decision',true),'') <> 'decision'
        or nullif(btrim(new.evidencia),'') is null
        or new.resultado_eficacia is null then
        raise exception 'Verificação requer ação aprovada, evidência e permissão de verificação.';
      end if;
    elsif new.status = 'Aguardando aprovacao' then
      if old.status <> 'Concluida' or nullif(btrim(new.evidencia),'') is null
        or nullif(btrim(new.causa_raiz),'') is null
        or not public.erp_has_permission('qualidade','editar') then
        raise exception 'Ações concluídas exigem causa raiz e evidência para aprovação.';
      end if;
    elsif new.status = 'Em execucao' then
      if old.status not in ('Planejada','Reprovada') or not public.erp_has_permission('qualidade','editar') then
        raise exception 'Transição de ação CAPA não permitida.';
      end if;
    elsif new.status = 'Concluida' then
      if old.status <> 'Em execucao' or not public.erp_has_permission('qualidade','editar') then
        raise exception 'Transição de ação CAPA não permitida.';
      end if;
    elsif not public.erp_has_permission('qualidade','editar') then
      raise exception 'Sem permissão para atualizar ação CAPA.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_sgq_capa_transition on public.erp_sgq_capa_acoes;
create trigger trg_sgq_capa_transition before update on public.erp_sgq_capa_acoes
  for each row execute function public.erp_sgq_validar_transicao_capa();

create or replace function public.erp_sgq_validar_transicao_rpnc()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare
  v_actor uuid;
begin
  if old.sgq_origem is null and new.sgq_origem is null then return new; end if;
  if new.id is distinct from old.id or new.criado_em is distinct from old.criado_em
    or new.numero_rpnc is distinct from old.numero_rpnc
    or new.descricao_nao_conformidade is distinct from old.descricao_nao_conformidade
    or new.acao_corretiva is distinct from old.acao_corretiva
    or new.sgq_origem is distinct from old.sgq_origem
    or new.sgq_severidade is distinct from old.sgq_severidade
    or new.setor_id is distinct from old.setor_id
    or new.sgq_vinculo_tipo is distinct from old.sgq_vinculo_tipo
    or new.sgq_vinculo_id is distinct from old.sgq_vinculo_id
    or new.sgq_aberto_por is distinct from old.sgq_aberto_por
    or new.empresa_id is distinct from old.empresa_id then
    raise exception 'Os dados de abertura da RPNC são imutáveis; registre a alteração em uma tratativa.';
  end if;
  if (new.status is not distinct from old.status or new.status not in ('encerrada','Encerrada'))
    and (new.sgq_encerrado_por is distinct from old.sgq_encerrado_por
      or new.sgq_encerrado_em is distinct from old.sgq_encerrado_em) then
    raise exception 'Os dados de encerramento só podem ser definidos ao encerrar a RPNC.';
  end if;
  if new.status is distinct from old.status then
    if not public.erp_has_permission('qualidade','editar') then raise exception 'Sem permissão para atualizar RPNC.'; end if;
    if not (
      (old.status in ('aberta','Aberta') and new.status in ('em análise','Investigacao'))
      or (old.status in ('em análise','Investigacao') and new.status in ('em tratamento','Acao corretiva'))
      or (old.status in ('em tratamento','Acao corretiva') and new.status in ('aguardando eficácia','Aguardando aprovacao'))
      or (old.status in ('aguardando eficácia','Aguardando aprovacao') and new.status in ('encerrada','Encerrada'))
    ) then raise exception 'Transição de RPNC não permitida.'; end if;
    if new.status in ('encerrada','Encerrada') and (
      not exists (
        select 1 from public.erp_sgq_capa_acoes a
        where a.rpnc_id=new.id and a.empresa_id=new.empresa_id
          and a.status='Verificada' and a.resultado_eficacia='Eficaz'
          and nullif(btrim(a.causa_raiz),'') is not null
      )
      or exists (
        select 1 from public.erp_sgq_capa_acoes a
        where a.rpnc_id=new.id and a.empresa_id=new.empresa_id
          and (a.status <> 'Verificada' or a.resultado_eficacia is distinct from 'Eficaz'
            or nullif(btrim(a.causa_raiz),'') is null)
      )
    ) then
      raise exception 'A RPNC exige ação aprovada, causa raiz e eficácia verificada como eficaz.';
    end if;
    if new.status in ('encerrada','Encerrada') then
      select u.id into v_actor from public.erp_usuarios u
        where u.auth_user_id=auth.uid() and u.empresa_id=new.empresa_id and u.ativo=true and u.deleted_at is null limit 1;
      if v_actor is null then raise exception 'Usuário ERP ativo não identificado para o encerramento.'; end if;
      new.sgq_encerrado_por := v_actor;
      new.sgq_encerrado_em := now();
    end if;
  end if;
  return new;
end
$$;

create or replace function public.erp_sgq_proteger_rpnc()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then
    if old.sgq_origem is not null then raise exception 'RPNCs do SGQ não podem ser excluídas.'; end if;
    return old;
  end if;
  if new.sgq_origem is not null then
    if coalesce(current_setting('app.sgq_rpnc_open', true),'') <> 'open'
      or new.empresa_id is distinct from public.erp_current_empresa_id()
      or nullif(btrim(new.sgq_origem),'') is null
      or new.sgq_severidade is null or new.sgq_severidade not in ('Critica','Maior','Menor')
      or new.setor_id is null or new.sgq_aberto_por is null then
      raise exception 'A abertura de RPNC deve ocorrer pelo fluxo autorizado do SGQ.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_sgq_rpnc_guard on public.erp_rpnc;
create trigger trg_sgq_rpnc_guard before insert or delete on public.erp_rpnc
  for each row execute function public.erp_sgq_proteger_rpnc();

drop trigger if exists trg_sgq_rpncs_transition on public.erp_rpnc;
create trigger trg_sgq_rpncs_transition before update on public.erp_rpnc
  for each row execute function public.erp_sgq_validar_transicao_rpnc();

create or replace function public.erp_sgq_capa_decidir(p_acao_id uuid, p_decisao text, p_evidencia text default null)
returns public.erp_sgq_capa_acoes
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_row public.erp_sgq_capa_acoes;
begin
  if p_decisao is null or p_decisao not in ('aprovar','reprovar','verificar_eficaz','verificar_ineficaz') then raise exception 'Decisão inválida.'; end if;
  if p_decisao like 'verificar_%' and nullif(btrim(p_evidencia),'') is null then
    raise exception 'A evidência da verificação de eficácia é obrigatória.';
  end if;
  if p_decisao in ('aprovar','reprovar') and not public.erp_has_permission('qualidade', 'aprovar') then raise exception 'Sem permissão para aprovar CAPA.'; end if;
  if p_decisao in ('verificar_eficaz','verificar_ineficaz') and not public.erp_has_permission('qualidade', 'verificar') then raise exception 'Sem permissão para verificar eficácia.'; end if;
  select u.id into v_user from public.erp_usuarios u where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null limit 1;
  if v_user is null then raise exception 'Usuário ERP ativo não identificado.'; end if;
  perform set_config('app.sgq_capa_decision','decision',true);
  update public.erp_sgq_capa_acoes set
    status = case p_decisao when 'aprovar' then 'Aprovada' when 'reprovar' then 'Reprovada' else 'Verificada' end,
    resultado_eficacia = case p_decisao when 'verificar_eficaz' then 'Eficaz' when 'verificar_ineficaz' then 'Ineficaz' else resultado_eficacia end,
    evidencia = case when p_decisao like 'verificar_%' then coalesce(nullif(btrim(p_evidencia), ''), evidencia) else evidencia end,
    comentario_aprovacao = case when p_decisao in ('aprovar','reprovar') then nullif(btrim(p_evidencia), '') else comentario_aprovacao end,
    verificado_por = case when p_decisao like 'verificar_%' then v_user else verificado_por end,
    verificado_em = case when p_decisao like 'verificar_%' then now() else verificado_em end,
    updated_at = now()
  where id = p_acao_id and empresa_id = v_empresa
  returning * into v_row;
  if not found then raise exception 'Ação CAPA não encontrada.'; end if;
  return v_row;
end
$$;

create or replace function public.erp_qms_criar_documento(
  p_codigo text, p_titulo text, p_departamento text, p_tipo text, p_conteudo text, p_motivo text
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_doc uuid;
  v_rev uuid;
begin
  if v_empresa is null then raise exception 'Empresa não identificada.'; end if;
  if not public.erp_qms_can('qualidade_documentos','criar') then raise exception 'Sem permissão para criar documentos.'; end if;
  if nullif(btrim(p_codigo),'') is null or nullif(btrim(p_titulo),'') is null or nullif(btrim(p_motivo),'') is null then
    raise exception 'Código, título e motivo são obrigatórios.';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_empresa::text), hashtext(upper(btrim(p_codigo))));
  if exists (select 1 from public.erp_documentos_qualidade where empresa_id=v_empresa and upper(codigo)=upper(btrim(p_codigo))) then
    raise exception 'Já existe um documento com este código nesta empresa.';
  end if;
  select usuario_id into v_usuario from public.erp_qms_current_user() limit 1;
  insert into public.erp_documentos_qualidade (
    empresa_id, codigo, titulo, area, tipo, revisao, status, conteudo, motivo_alteracao,
    distribuicao_controlada, preparado_por, data_criacao, updated_at
  ) values (
    v_empresa, btrim(p_codigo), btrim(p_titulo), nullif(btrim(p_departamento), ''),
    coalesce(nullif(btrim(p_tipo), ''), 'Procedimento'), 1, 'rascunho',
    coalesce(p_conteudo, ''), btrim(p_motivo), true, v_usuario, current_date, now()
  ) returning id into v_doc;
  insert into public.erp_documentos_qualidade_revisoes (
    documento_id, empresa_id, revisao, status, titulo, conteudo, motivo_alteracao, criado_por,
    area, tipo
  ) values (v_doc, v_empresa, 1, 'rascunho', btrim(p_titulo), coalesce(p_conteudo, ''), btrim(p_motivo), v_usuario,
    nullif(btrim(p_departamento), ''), coalesce(nullif(btrim(p_tipo), ''), 'Procedimento'))
  returning id into v_rev;
  perform set_config('app.qms_document_workflow','create',true);
  update public.erp_documentos_qualidade set revisao_atual_id = v_rev where id = v_doc;
  return jsonb_build_object('documento_id',v_doc,'revisao_id',v_rev,'revisao',1);
end
$$;

create or replace function public.erp_qms_criar_revisao(p_documento_id uuid, p_motivo text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_doc public.erp_documentos_qualidade;
  v_rev integer;
  v_rev_id uuid;
begin
  if not public.erp_qms_can('qualidade_documentos','editar') then raise exception 'Sem permissão para criar revisão.'; end if;
  if nullif(btrim(p_motivo),'') is null then raise exception 'Motivo da revisão é obrigatório.'; end if;
  select * into v_doc from public.erp_documentos_qualidade
    where id = p_documento_id and empresa_id = v_empresa for update;
  if not found then raise exception 'Documento não encontrado.'; end if;
  if exists (select 1 from public.erp_documentos_qualidade_revisoes where documento_id=p_documento_id and status='rascunho') then
    raise exception 'Já existe uma revisão em rascunho para este documento.';
  end if;
  select usuario_id into v_usuario from public.erp_qms_current_user() limit 1;
  select coalesce(max(revisao),0)+1 into v_rev from public.erp_documentos_qualidade_revisoes where documento_id=p_documento_id;
  insert into public.erp_documentos_qualidade_revisoes (
    documento_id, empresa_id, revisao, status, titulo, conteudo, motivo_alteracao, criado_por,
    area, setor, tipo, validade_ate
  ) values (p_documento_id, v_empresa, v_rev, 'rascunho', v_doc.titulo, coalesce(v_doc.conteudo,''), btrim(p_motivo), v_usuario,
    v_doc.area, v_doc.setor, v_doc.tipo, v_doc.validade_ate)
  returning id into v_rev_id;
  return jsonb_build_object('revisao_id',v_rev_id,'revisao',v_rev);
end
$$;

create or replace function public.erp_qms_salvar_revisao(
  p_documento_id uuid, p_titulo text, p_departamento text, p_setor text, p_tipo text,
  p_conteudo text, p_motivo text, p_validade date default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_doc public.erp_documentos_qualidade;
  v_revision public.erp_documentos_qualidade_revisoes;
begin
  if not public.erp_qms_can('qualidade_documentos','editar') then raise exception 'Sem permissão para editar documentos.'; end if;
  if nullif(btrim(p_titulo),'') is null or nullif(btrim(p_motivo),'') is null then raise exception 'Título e motivo são obrigatórios.'; end if;
  select * into v_doc from public.erp_documentos_qualidade where id=p_documento_id and empresa_id=v_empresa for update;
  if not found then raise exception 'Documento não encontrado.'; end if;
  select * into v_revision from public.erp_documentos_qualidade_revisoes
    where documento_id=p_documento_id and empresa_id=v_empresa and status='rascunho'
    order by revisao desc limit 1 for update;
  if not found or v_revision.status <> 'rascunho' then raise exception 'O conteúdo somente pode mudar na revisão em rascunho.'; end if;
  update public.erp_documentos_qualidade_revisoes set
    titulo=btrim(p_titulo), conteudo=coalesce(p_conteudo,''), motivo_alteracao=btrim(p_motivo),
    area=nullif(btrim(p_departamento),''), setor=nullif(btrim(p_setor), ''),
    tipo=coalesce(nullif(btrim(p_tipo),''),'Procedimento'), validade_ate=p_validade
  where id=v_revision.id;
  return jsonb_build_object('revisao_id',v_revision.id,'revisao',v_revision.revisao);
end
$$;

create or replace function public.erp_qms_transicionar_revisao(p_revision_id uuid, p_acao text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_revision public.erp_documentos_qualidade_revisoes;
  v_next text;
  v_permission text;
begin
  select * into v_revision from public.erp_documentos_qualidade_revisoes
    where id=p_revision_id and empresa_id=v_empresa for update;
  if not found then raise exception 'Revisão não encontrada.'; end if;
  select usuario_id into v_user from public.erp_qms_current_user() limit 1;
  if p_acao='enviar_revisao' then v_next:='em_revisao'; v_permission:='revisar';
  elsif p_acao='aprovar' then v_next:='aprovada'; v_permission:='aprovar';
  elsif p_acao='liberar' then v_next:='vigente'; v_permission:='liberar';
  else raise exception 'Ação de workflow inválida.'; end if;
  if not public.erp_qms_can('qualidade_documentos',v_permission) then raise exception 'Sem permissão para esta etapa.'; end if;
  if (p_acao='enviar_revisao' and v_revision.status<>'rascunho')
    or (p_acao='aprovar' and v_revision.status<>'em_revisao')
    or (p_acao='liberar' and v_revision.status<>'aprovada') then
    raise exception 'Transição não permitida para o estado atual.';
  end if;
  perform set_config('app.qms_revision_workflow','workflow',true);
  if p_acao='liberar' then
    update public.erp_documentos_qualidade_revisoes set status='substituida'
      where documento_id=v_revision.documento_id and id<>v_revision.id and status in ('vigente','liberada');
    update public.erp_documentos_qualidade_revisoes set status='vigente', liberado_por=v_user,
      liberado_em=now(), data_efetiva=now() where id=v_revision.id;
    perform set_config('app.qms_document_workflow','workflow',true);
    update public.erp_documentos_qualidade set status='vigente', revisao=v_revision.revisao,
      revisao_atual_id=v_revision.id, titulo=v_revision.titulo, conteudo=v_revision.conteudo,
      area=v_revision.area, setor=v_revision.setor, tipo=v_revision.tipo, validade_ate=v_revision.validade_ate,
      data_emissao=current_date, data_revisao=now(), updated_at=now()
      where id=v_revision.documento_id;
  elsif p_acao='aprovar' then
    update public.erp_documentos_qualidade_revisoes set status=v_next, aprovado_por=v_user, aprovado_em=now()
      where id=v_revision.id;
  else
    update public.erp_documentos_qualidade_revisoes set status=v_next, revisado_por=v_user, revisado_em=now()
      where id=v_revision.id;
  end if;
  if p_acao='aprovar' then
    insert into public.erp_documentos_qualidade_aprovacoes (
      documento_id, revisao_id, empresa_id, aprovador_id, etapa, decisao
    ) values (v_revision.documento_id, v_revision.id, v_empresa, v_user, 'aprovacao', 'aprovado');
  end if;
  return jsonb_build_object('status',v_next,'revisao_id',v_revision.id);
end
$$;

create or replace function public.erp_qms_distribuir_revisao(p_revision_id uuid, p_setores uuid[])
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_documento uuid;
  v_user uuid;
  v_count integer;
begin
  if not public.erp_qms_can('qualidade_documentos','liberar') then raise exception 'Sem permissão para distribuir documentos.'; end if;
  select documento_id into v_documento from public.erp_documentos_qualidade_revisoes
    where id=p_revision_id and empresa_id=v_empresa and status='vigente' and nullif(btrim(conteudo),'') is not null;
  if v_documento is null then raise exception 'Somente revisões vigentes com conteúdo podem ser distribuídas.'; end if;
  if coalesce(cardinality(p_setores),0)=0 then raise exception 'Selecione ao menos um setor.'; end if;
  select usuario_id into v_user from public.erp_qms_current_user() limit 1;
  if exists (select 1 from unnest(p_setores) x where not exists (
    select 1 from public.erp_setores s where s.id=x and s.empresa_id=v_empresa and s.ativo=true
  )) then raise exception 'Um ou mais setores não pertencem à empresa ativa.'; end if;
  insert into public.erp_documentos_qualidade_distribuicoes (empresa_id,documento_id,revisao_id,setor_id,distribuido_por)
    select v_empresa,v_documento,p_revision_id,x,v_user from unnest(p_setores) x
    on conflict (revisao_id,setor_id) do nothing;
  insert into public.erp_documentos_qualidade_leituras (empresa_id,documento_id,revisao_id,distribuicao_id,usuario_id)
    select v_empresa,v_documento,p_revision_id,d.id,u.id
    from public.erp_documentos_qualidade_distribuicoes d
    join public.erp_usuarios u on u.empresa_id=v_empresa and u.setor_id=d.setor_id
      and u.ativo=true and u.deleted_at is null
    where d.revisao_id=p_revision_id and d.setor_id=any(p_setores)
    on conflict (revisao_id,usuario_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

create or replace function public.erp_qms_confirmar_leitura(p_leitura_id uuid)
returns timestamptz language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_read public.erp_documentos_qualidade_leituras;
begin
  select usuario_id into v_user from public.erp_qms_current_user() limit 1;
  update public.erp_documentos_qualidade_leituras set lido_em=coalesce(lido_em,now())
    where id=p_leitura_id and empresa_id=v_empresa and usuario_id=v_user returning * into v_read;
  if not found then raise exception 'Atribuição de leitura não encontrada para este usuário.'; end if;
  insert into public.erp_documentos_qualidade_ciencia (documento_id,revisao_id,empresa_id,usuario_id)
    values (v_read.documento_id,v_read.revisao_id,v_empresa,v_user)
    on conflict (revisao_id,usuario_id) do nothing;
  return v_read.lido_em;
end
$$;

revoke all on function public.erp_sgq_abrir_rpnc(text,text,text,uuid,text,uuid) from public;
revoke all on function public.erp_sgq_transicionar_rpnc(uuid,text) from public;
revoke all on function public.erp_sgq_capa_decidir(uuid,text,text) from public;
revoke all on function public.erp_qms_criar_documento(text,text,text,text,text,text) from public;
revoke all on function public.erp_qms_criar_revisao(uuid,text) from public;
revoke all on function public.erp_qms_salvar_revisao(uuid,text,text,text,text,text,text,date) from public;
revoke all on function public.erp_qms_transicionar_revisao(uuid,text) from public;
revoke all on function public.erp_qms_distribuir_revisao(uuid,uuid[]) from public;
revoke all on function public.erp_qms_confirmar_leitura(uuid) from public;
grant execute on function public.erp_sgq_abrir_rpnc(text,text,text,uuid,text,uuid) to authenticated;
grant execute on function public.erp_sgq_transicionar_rpnc(uuid,text) to authenticated;
grant execute on function public.erp_sgq_capa_decidir(uuid,text,text) to authenticated;
grant execute on function public.erp_qms_criar_documento(text,text,text,text,text,text) to authenticated;
grant execute on function public.erp_qms_criar_revisao(uuid,text) to authenticated;
grant execute on function public.erp_qms_salvar_revisao(uuid,text,text,text,text,text,text,date) to authenticated;
grant execute on function public.erp_qms_transicionar_revisao(uuid,text) to authenticated;
grant execute on function public.erp_qms_distribuir_revisao(uuid,uuid[]) to authenticated;
grant execute on function public.erp_qms_confirmar_leitura(uuid) to authenticated;
revoke all on public.erp_sgq_contadores, public.erp_sgq_capa_acoes, public.erp_sgq_auditoria,
  public.erp_documentos_qualidade_distribuicoes, public.erp_documentos_qualidade_leituras from public, anon, authenticated;
grant select on public.erp_sgq_capa_acoes, public.erp_sgq_auditoria,
  public.erp_documentos_qualidade_distribuicoes, public.erp_documentos_qualidade_leituras to authenticated;
grant insert, update on public.erp_sgq_capa_acoes to authenticated;
-- <<<<<<<<<<<<<< <<<< 20261004100000_sgq_integrated_erp_v1.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql  (dependencia: qualidade_fmea exigida por 20261106120000_erp_fmea_plano_controle_aiag_v1.sql) >>>>>>>>>>>>>>>>>>>>
-- ERP Industrial: engineering, WMS, SGQ, PCP, fiscal costing and HR foundation.
-- Tenant isolation uses the ERP's established erp_current_empresa_id() contract.
begin;

create extension if not exists pgcrypto;

create table if not exists public.engenharia_produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  descricao_tecnica text not null,
  unidade_medida text not null,
  tipo_item text not null check (tipo_item in ('materia_prima','componente','subconjunto','produto_acabado','insumo_consumivel')),
  peso_liquido numeric(18,6) not null default 0 check (peso_liquido >= 0),
  peso_bruto numeric(18,6) not null default 0 check (peso_bruto >= 0),
  ncm varchar(8),
  desenho_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.engenharia_bom (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo_bom text not null,
  produto_pai_id uuid not null references public.engenharia_produtos(id),
  versao text not null default '1',
  status text not null default 'em_revisao' check (status in ('ativo','em_revisao','obsoleto')),
  vigente_desde date not null default current_date,
  vigente_ate date,
  observacoes text,
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo_bom, versao),
  check (vigente_ate is null or vigente_ate >= vigente_desde)
);

create table if not exists public.engenharia_bom_componentes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  bom_id uuid not null references public.engenharia_bom(id) on delete cascade,
  componente_id uuid not null references public.engenharia_produtos(id),
  quantidade_liquida numeric(18,6) not null check (quantidade_liquida > 0),
  perda_percentual numeric(9,4) not null default 0 check (perda_percentual >= 0 and perda_percentual < 100),
  tipo_perda text not null default 'mecanica' check (tipo_perda in ('mecanica','quimica','galvanica')),
  operacao_consumo text,
  quantidade_bruta numeric(18,6) generated always as (quantidade_liquida / (1 - perda_percentual / 100)) stored,
  created_at timestamptz not null default now(),
  unique (bom_id, componente_id)
);

create table if not exists public.estoque_enderecos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  descricao text,
  tipo text not null check (tipo in ('materia_prima','insumos','quarentena','produto_acabado','refugo')),
  rua text not null,
  prateleira text not null,
  nivel text not null,
  capacidade_peso numeric(18,3),
  capacidade_volume numeric(18,3),
  ativo boolean not null default true,
  unique (empresa_id, codigo),
  unique (empresa_id, rua, prateleira, nivel)
);

create table if not exists public.estoque_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  numero_lote text not null,
  fabricado_em date,
  validade_em date,
  certificado_qualidade text,
  status text not null default 'quarentena' check (status in ('liberado','bloqueado','quarentena')),
  custo_unitario numeric(18,6) not null default 0 check (custo_unitario >= 0),
  created_at timestamptz not null default now(),
  unique (empresa_id, produto_id, numero_lote)
);

create table if not exists public.estoque_saldos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  lote_id uuid not null references public.estoque_lotes(id),
  endereco_id uuid not null references public.estoque_enderecos(id),
  quantidade numeric(18,6) not null default 0 check (quantidade >= 0),
  custo_medio numeric(18,6) not null default 0 check (custo_medio >= 0),
  updated_at timestamptz not null default now(),
  unique (empresa_id, produto_id, lote_id, endereco_id)
);

create table if not exists public.qualidade_especificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  revisao text not null,
  status text not null default 'rascunho' check (status in ('rascunho','ativa','obsoleta')),
  aprovada_em timestamptz,
  aprovador_id uuid,
  vigente_desde date not null default current_date,
  vigente_ate date,
  parametros jsonb not null default '[]'::jsonb check (jsonb_typeof(parametros) = 'array'),
  created_at timestamptz not null default now(),
  unique (empresa_id, produto_id, revisao),
  check (vigente_ate is null or vigente_ate >= vigente_desde)
);

create table if not exists public.qualidade_motivos_falha (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  descricao text not null,
  categoria text not null default 'processo',
  ativo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists public.qualidade_inspecoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  tipo text not null check (tipo in ('recebimento','processo','produto_final')),
  produto_id uuid not null references public.engenharia_produtos(id),
  lote_id uuid not null references public.estoque_lotes(id),
  ordem_producao_id uuid,
  ordem_compra_id uuid,
  quantidade_total numeric(18,6) not null check (quantidade_total >= 0),
  tamanho_amostra integer not null check (tamanho_amostra >= 0),
  medicoes jsonb not null default '[]'::jsonb check (jsonb_typeof(medicoes) = 'array'),
  resultado text not null check (resultado in ('aprovado','reprovado','aprovado_com_restricao')),
  inspetor_id uuid,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.qualidade_rnc_capa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  lote_id uuid references public.estoque_lotes(id),
  inspecao_id uuid references public.qualidade_inspecoes(id),
  origem text not null check (origem in ('fornecedor','interna','cliente')),
  descricao text not null,
  evidencia_urls text[] not null default '{}',
  disposicao text check (disposicao in ('refugar','devolver','retrabalhar','concessao')),
  cinco_porques jsonb not null default '[]'::jsonb,
  ishikawa jsonb not null default '{}'::jsonb,
  plano_5w2h jsonb not null default '[]'::jsonb,
  status text not null default 'aberto' check (status in ('aberto','em_execucao','concluido','eficacia_validada')),
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.qualidade_fmea (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo_item_processo text not null,
  funcao text not null,
  modo_falha text not null,
  efeito text not null,
  severidade integer not null check (severidade between 1 and 10),
  causa text not null,
  ocorrencia integer not null check (ocorrencia between 1 and 10),
  controles text,
  deteccao integer not null check (deteccao between 1 and 10),
  npr integer generated always as (severidade * ocorrencia * deteccao) stored,
  acoes_recomendadas jsonb not null default '[]'::jsonb,
  status_acao text not null default 'aberta',
  created_at timestamptz not null default now()
);

create table if not exists public.pcp_roteiros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  codigo text not null,
  versao text not null default '1',
  etapas jsonb not null default '[]'::jsonb check (jsonb_typeof(etapas) = 'array'),
  ativo boolean not null default true,
  unique (empresa_id, codigo, versao)
);

create table if not exists public.pcp_ordens_producao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  numero text not null,
  produto_id uuid not null references public.engenharia_produtos(id),
  roteiro_id uuid references public.pcp_roteiros(id),
  quantidade_planejada numeric(18,6) not null check (quantidade_planejada > 0),
  aberta_em timestamptz not null default now(),
  entrega_prevista date,
  status text not null default 'planejada' check (status in ('planejada','liberada','em_andamento','suspensa','encerrada','cancelada')),
  created_at timestamptz not null default now(),
  unique (empresa_id, numero)
);

create table if not exists public.pcp_apontamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  ordem_producao_id uuid not null references public.pcp_ordens_producao(id),
  operacao_codigo text not null,
  operador_id uuid,
  centro_trabalho text not null,
  setup_inicio timestamptz,
  setup_fim timestamptz,
  producao_inicio timestamptz,
  producao_fim timestamptz,
  pecas_boas numeric(18,6) not null default 0 check (pecas_boas >= 0),
  pecas_refugadas numeric(18,6) not null default 0 check (pecas_refugadas >= 0),
  motivo_refugo_id uuid references public.qualidade_motivos_falha(id),
  motivo_parada text,
  observacoes text,
  created_at timestamptz not null default now(),
  check (setup_fim is null or setup_inicio is null or setup_fim >= setup_inicio),
  check (producao_fim is null or producao_inicio is null or producao_fim >= producao_inicio)
);

create table if not exists public.fiscal_parametros_tributarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  cfop varchar(4) not null,
  ncm_sufixo text,
  uf_origem char(2),
  uf_destino char(2),
  aliquota_icms numeric(7,4) not null default 0 check (aliquota_icms between 0 and 100),
  aliquota_ipi numeric(7,4) not null default 0 check (aliquota_ipi between 0 and 100),
  aliquota_pis numeric(7,4) not null default 0 check (aliquota_pis between 0 and 100),
  aliquota_cofins numeric(7,4) not null default 0 check (aliquota_cofins between 0 and 100),
  cst_csosn text,
  tipo_operacao text not null check (tipo_operacao in ('entrada_compra','entrada_devolucao','saida_venda','saida_remessa')),
  ativo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists public.fiscal_nfe_entradas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  chave_acesso varchar(44) not null check (chave_acesso ~ '^[0-9]{44}$'),
  numero text not null,
  serie text not null,
  cnpj_emitente varchar(14) not null,
  razao_social_emitente text not null,
  valor_total numeric(18,2) not null check (valor_total >= 0),
  itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) > 0),
  status text not null default 'rascunho' check (status in ('rascunho','escriturada','cancelada')),
  escriturada_em timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, chave_acesso)
);

create table if not exists public.fiscal_historico_custos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  lote_id uuid references public.estoque_lotes(id),
  documento_origem text not null,
  quantidade numeric(18,6) not null check (quantidade > 0),
  valor_liquido_unitario numeric(18,6) not null check (valor_liquido_unitario >= 0),
  saldo_anterior numeric(18,6) not null,
  custo_medio_anterior numeric(18,6) not null,
  custo_medio_novo numeric(18,6) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rh_funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  matricula text not null,
  nome_completo text not null,
  cpf varchar(11),
  rg text,
  data_admissao date not null,
  cargo text not null,
  departamento text not null check (departamento in ('engenharia','pcp','producao','qualidade','almoxarifado','administrativo')),
  taxa_horaria numeric(18,4) not null default 0 check (taxa_horaria >= 0),
  status text not null default 'ativo' check (status in ('ativo','afastado','desligado')),
  created_at timestamptz not null default now(),
  unique (empresa_id, matricula)
);

create table if not exists public.rh_turnos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  nome text not null,
  inicio time not null,
  termino time not null,
  intervalo_inicio time,
  intervalo_fim time,
  escala text not null check (escala in ('5x2','6x2','12x36')),
  carga_horaria_mensal numeric(8,2) not null check (carga_horaria_mensal > 0),
  ativo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists public.rh_funcionario_turnos (
  empresa_id uuid not null default public.erp_current_empresa_id(),
  funcionario_id uuid not null references public.rh_funcionarios(id) on delete cascade,
  turno_id uuid not null references public.rh_turnos(id) on delete cascade,
  vigente_desde date not null default current_date,
  vigente_ate date,
  primary key (empresa_id, funcionario_id, turno_id, vigente_desde),
  check (vigente_ate is null or vigente_ate >= vigente_desde)
);

create table if not exists public.rh_epis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  nome text not null,
  numero_ca text not null,
  ca_valido_ate date not null,
  periodicidade_troca_dias integer not null check (periodicidade_troca_dias > 0),
  ativo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists public.rh_entregas_epis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  epi_id uuid not null references public.rh_epis(id),
  funcionario_id uuid not null references public.rh_funcionarios(id),
  quantidade integer not null check (quantidade > 0),
  entregue_em date not null default current_date,
  confirmado_em timestamptz,
  proxima_troca_em date generated always as (entregue_em + periodicidade_troca_dias) stored,
  periodicidade_troca_dias integer not null check (periodicidade_troca_dias > 0)
);

create or replace function public.erp_quality_quarantine_lot()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quarantine_id uuid;
  v_rnc_code text;
begin
  if new.resultado = 'reprovado' then
    update public.estoque_lotes
       set status = 'bloqueado'
     where id = new.lote_id and empresa_id = new.empresa_id;

    select id into v_quarantine_id
      from public.estoque_enderecos
     where empresa_id = new.empresa_id and tipo = 'quarentena' and ativo
     order by codigo limit 1;

    if v_quarantine_id is null then
      raise exception 'QUARENTENA_ENDERECO_NAO_CONFIGURADO: cadastre um endereço ativo do tipo quarentena antes de reprovar lotes';
    end if;

    update public.estoque_saldos
       set endereco_id = v_quarantine_id, updated_at = now()
     where lote_id = new.lote_id and empresa_id = new.empresa_id;

    v_rnc_code := 'RNC-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    insert into public.qualidade_rnc_capa
      (empresa_id, codigo, lote_id, inspecao_id, origem, descricao, status)
    values
      (new.empresa_id, v_rnc_code, new.lote_id, new.id, 'interna',
       coalesce(nullif(new.observacoes, ''), 'Lote reprovado em inspeção de qualidade.'), 'aberto');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qualidade_inspecao_quarentena on public.qualidade_inspecoes;
create trigger trg_qualidade_inspecao_quarentena
after insert or update of resultado on public.qualidade_inspecoes
for each row when (new.resultado = 'reprovado')
execute function public.erp_quality_quarantine_lot();

create or replace function public.erp_registrar_custo_medio_nfe(
  p_produto_id uuid,
  p_lote_id uuid,
  p_endereco_id uuid,
  p_quantidade numeric,
  p_valor_liquido_unitario numeric,
  p_documento_origem text
) returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_saldo numeric(18,6);
  v_custo numeric(18,6);
  v_novo_custo numeric(18,6);
begin
  if p_quantidade <= 0 or p_valor_liquido_unitario < 0 then
    raise exception 'QUANTIDADE_OU_CUSTO_INVALIDO';
  end if;

  perform 1 from public.estoque_lotes
   where id = p_lote_id and produto_id = p_produto_id and empresa_id = v_empresa_id
   for update;
  if not found then raise exception 'LOTE_NAO_ENCONTRADO_NO_TENANT'; end if;

  select coalesce(sum(quantidade), 0), coalesce(
    sum(quantidade * custo_medio) / nullif(sum(quantidade), 0), 0
  )
  into v_saldo, v_custo
  from public.estoque_saldos
  where produto_id = p_produto_id and empresa_id = v_empresa_id
  for update;

  v_novo_custo := case when v_saldo + p_quantidade = 0 then 0
    else ((v_saldo * v_custo) + (p_quantidade * p_valor_liquido_unitario)) / (v_saldo + p_quantidade)
  end;

  insert into public.estoque_saldos
    (empresa_id, produto_id, lote_id, endereco_id, quantidade, custo_medio, updated_at)
  values (v_empresa_id, p_produto_id, p_lote_id, p_endereco_id, p_quantidade, v_novo_custo, now())
  on conflict (empresa_id, produto_id, lote_id, endereco_id)
  do update set quantidade = public.estoque_saldos.quantidade + excluded.quantidade,
                custo_medio = v_novo_custo,
                updated_at = now();

  update public.estoque_lotes set custo_unitario = p_valor_liquido_unitario
   where id = p_lote_id and empresa_id = v_empresa_id;

  insert into public.fiscal_historico_custos
    (empresa_id, produto_id, lote_id, documento_origem, quantidade, valor_liquido_unitario,
     saldo_anterior, custo_medio_anterior, custo_medio_novo)
  values (v_empresa_id, p_produto_id, p_lote_id, p_documento_origem, p_quantidade,
          p_valor_liquido_unitario, v_saldo, v_custo, v_novo_custo);
  return v_novo_custo;
end;
$$;

create index if not exists idx_estoque_saldos_empresa_produto on public.estoque_saldos (empresa_id, produto_id);
create index if not exists idx_estoque_saldos_lote on public.estoque_saldos (empresa_id, lote_id);
create index if not exists idx_qualidade_inspecoes_lote on public.qualidade_inspecoes (empresa_id, lote_id, created_at desc);
create index if not exists idx_qualidade_rnc_status on public.qualidade_rnc_capa (empresa_id, status, created_at desc);
create index if not exists idx_pcp_op_status on public.pcp_ordens_producao (empresa_id, status, entrega_prevista);

do $$
declare t text;
begin
  foreach t in array array[
    'engenharia_produtos','engenharia_bom','engenharia_bom_componentes',
    'estoque_enderecos','estoque_lotes','estoque_saldos',
    'qualidade_especificacoes','qualidade_motivos_falha','qualidade_inspecoes','qualidade_rnc_capa','qualidade_fmea',
    'pcp_roteiros','pcp_ordens_producao','pcp_apontamentos',
    'fiscal_parametros_tributarios','fiscal_nfe_entradas','fiscal_historico_custos',
    'rh_funcionarios','rh_turnos','rh_funcionario_turnos','rh_epis','rh_entregas_epis'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format('create policy tenant_isolation on public.%I using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id())', t);
  end loop;
end $$;

commit;
-- <<<<<<<<<<<<<< <<<< 20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261019150000_erp_qualidade_liberacao_lotes.sql  (tabela ausente no banco: erp_qualidade_liberacao_lotes) >>>>>>>>>>>>>>>>>>>>
-- MOLDPLÁS ERP INDUSTRIAL — liberação de lotes por empresa
-- Revisão: 2026-10-19. A migration cria a estrutura; não simula Git/Deploy nem gera hash criptográfico falso.
create table if not exists public.erp_qualidade_liberacao_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo_lote varchar(50) not null,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  status_sgq varchar(20) not null default 'QUARENTENA'
    check (status_sgq in ('APROVADO','REPROVADO','QUARENTENA')),
  responsavel_liberacao varchar(100) not null check (length(trim(responsavel_liberacao)) > 0),
  observacoes text,
  criado_por uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_qualidade_liberacao_lotes_empresa_codigo_uq unique (empresa_id, codigo_lote)
);

create index if not exists erp_qualidade_liberacao_lotes_empresa_data_idx
  on public.erp_qualidade_liberacao_lotes (empresa_id, created_at desc);

alter table public.erp_qualidade_liberacao_lotes enable row level security;

drop policy if exists erp_qualidade_liberacao_lotes_select_tenant on public.erp_qualidade_liberacao_lotes;
create policy erp_qualidade_liberacao_lotes_select_tenant
  on public.erp_qualidade_liberacao_lotes for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_qualidade_liberacao_lotes_insert_tenant on public.erp_qualidade_liberacao_lotes;
create policy erp_qualidade_liberacao_lotes_insert_tenant
  on public.erp_qualidade_liberacao_lotes for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and criado_por = auth.uid()
    and exists (
      select 1 from public.erp_produtos p
      where p.id = produto_id and p.empresa_id = public.erp_current_empresa_id() and p.ativo = true
    )
  );

drop policy if exists erp_qualidade_liberacao_lotes_update_tenant on public.erp_qualidade_liberacao_lotes;
create policy erp_qualidade_liberacao_lotes_update_tenant
  on public.erp_qualidade_liberacao_lotes for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_produtos p
      where p.id = produto_id and p.empresa_id = public.erp_current_empresa_id() and p.ativo = true
    )
  );

grant select, insert, update on public.erp_qualidade_liberacao_lotes to authenticated;

create or replace function public.erp_qualidade_liberacao_lotes_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_erp_qualidade_liberacao_lotes_updated_at on public.erp_qualidade_liberacao_lotes;
create trigger trg_erp_qualidade_liberacao_lotes_updated_at
before update on public.erp_qualidade_liberacao_lotes
for each row execute function public.erp_qualidade_liberacao_lotes_touch_updated_at();
-- <<<<<<<<<<<<<< <<<< 20261019150000_erp_qualidade_liberacao_lotes.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261019190000_erp_qualidade_genealogia_lotes.sql  (tabela ausente no banco: erp_qualidade_genealogia_lotes) >>>>>>>>>>>>>>>>>>>>
-- MOLDPLAS ERP Industrial
-- SGQ: genealogia de lotes / rastreabilidade reversa
-- Revisao: 2026-10-19
-- A tabela registra relacoes explicitas de lote origem -> lote derivado.
-- RLS valida empresa e compatibilidade dos produtos com a empresa do registro.

create table if not exists public.erp_qualidade_genealogia_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo_lote_pai varchar(50) not null check (length(trim(codigo_lote_pai)) > 0),
  produto_pai_id uuid not null references public.erp_produtos(id) on delete restrict,
  codigo_lote_filho varchar(50) not null check (length(trim(codigo_lote_filho)) > 0),
  produto_filho_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_vinculada numeric(14, 4) not null check (quantidade_vinculada > 0),
  ordem_producao_id varchar(100),
  hash_verificacao varchar(100) not null,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_genealogia_lotes_nao_auto_vinculo
    check (upper(trim(codigo_lote_pai)) <> upper(trim(codigo_lote_filho)))
);

create index if not exists ix_erp_qualidade_genealogia_empresa_data
  on public.erp_qualidade_genealogia_lotes (empresa_id, created_at desc);
create index if not exists ix_erp_qualidade_genealogia_lote_pai
  on public.erp_qualidade_genealogia_lotes (empresa_id, upper(codigo_lote_pai));
create index if not exists ix_erp_qualidade_genealogia_lote_filho
  on public.erp_qualidade_genealogia_lotes (empresa_id, upper(codigo_lote_filho));

alter table public.erp_qualidade_genealogia_lotes enable row level security;

drop policy if exists erp_qualidade_genealogia_select_tenant
  on public.erp_qualidade_genealogia_lotes;
create policy erp_qualidade_genealogia_select_tenant
  on public.erp_qualidade_genealogia_lotes
  for select to authenticated
  using (
    empresa_id = (select public.erp_current_empresa_id())
    or (select public.erp_is_master())
  );

drop policy if exists erp_qualidade_genealogia_insert_tenant
  on public.erp_qualidade_genealogia_lotes;
create policy erp_qualidade_genealogia_insert_tenant
  on public.erp_qualidade_genealogia_lotes
  for insert to authenticated
  with check (
    empresa_id = (select public.erp_current_empresa_id())
    and exists (
      select 1
      from public.erp_produtos pp
      where pp.id = produto_pai_id
        and pp.empresa_id = erp_qualidade_genealogia_lotes.empresa_id
    )
    and exists (
      select 1
      from public.erp_produtos pf
      where pf.id = produto_filho_id
        and pf.empresa_id = erp_qualidade_genealogia_lotes.empresa_id
    )
  );

revoke all on table public.erp_qualidade_genealogia_lotes from anon;
grant select, insert on table public.erp_qualidade_genealogia_lotes to authenticated;
-- <<<<<<<<<<<<<< <<<< 20261019190000_erp_qualidade_genealogia_lotes.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261021100000_logistica_expedicao_nfe_etiquetas.sql  (tabela ausente no banco: erp_expedicao_nfe) >>>>>>>>>>>>>>>>>>>>
-- REV-LOG-EXPEDICAO-ETIQUETAS-001 | 2026-10-21
-- Multiempresa: usar o resolvedor oficial do tenant; auth.uid() não é empresa_id.
begin;

create table if not exists public.erp_expedicao_nfe (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  numero_nfe integer not null check (numero_nfe > 0),
  chave_acesso varchar(44) not null check (chave_acesso ~ '^[0-9]{44}$'),
  tipo_fluxo varchar(10) not null check (tipo_fluxo in ('ENTRADA','SAIDA')),
  parceiro_comercial varchar(255) not null check (length(btrim(parceiro_comercial)) > 0),
  transportadora varchar(150),
  placa_veiculo varchar(10),
  status_expedicao varchar(30) not null default 'AGUARDANDO_CONFERENCIA'
    check (status_expedicao in ('AGUARDANDO_CONFERENCIA','LIBERADO','REJEITADO')),
  data_movimentacao timestamptz not null default now(),
  criado_por uuid default auth.uid()
);
create unique index if not exists uq_erp_expedicao_nfe_empresa_chave
  on public.erp_expedicao_nfe(empresa_id,chave_acesso);
create index if not exists idx_erp_expedicao_nfe_empresa_data
  on public.erp_expedicao_nfe(empresa_id,data_movimentacao desc);
alter table public.erp_expedicao_nfe enable row level security;
drop policy if exists erp_expedicao_nfe_select_tenant on public.erp_expedicao_nfe;
drop policy if exists erp_expedicao_nfe_insert_tenant on public.erp_expedicao_nfe;
drop policy if exists erp_expedicao_nfe_update_tenant on public.erp_expedicao_nfe;
create policy erp_expedicao_nfe_select_tenant on public.erp_expedicao_nfe
  for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_expedicao_nfe_insert_tenant on public.erp_expedicao_nfe
  for insert to authenticated with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_expedicao_nfe_update_tenant on public.erp_expedicao_nfe
  for update to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update on public.erp_expedicao_nfe to authenticated;

create table if not exists public.erp_log_etiquetas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo_produto varchar(50) not null,
  descricao_produto varchar(255) not null,
  numero_lote varchar(50) not null,
  numero_nfe integer check (numero_nfe is null or numero_nfe > 0),
  quantidade_pecas numeric(12,3) not null check (quantidade_pecas > 0),
  modelo_etiqueta varchar(50) not null check (modelo_etiqueta in ('PADRAO_INDUSTRIA','CAIXA_PALETE','INTERNO_PROCESSO')),
  operador_id uuid not null references auth.users(id),
  data_emissao date,
  data_impressao timestamptz not null default now()
);
create index if not exists idx_erp_log_etiquetas_empresa_data
  on public.erp_log_etiquetas(empresa_id,data_impressao desc);
create index if not exists idx_erp_log_etiquetas_empresa_lote
  on public.erp_log_etiquetas(empresa_id,numero_lote);
alter table public.erp_log_etiquetas enable row level security;
drop policy if exists erp_log_etiquetas_select_tenant on public.erp_log_etiquetas;
drop policy if exists erp_log_etiquetas_insert_tenant on public.erp_log_etiquetas;
create policy erp_log_etiquetas_select_tenant on public.erp_log_etiquetas
  for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_log_etiquetas_insert_tenant on public.erp_log_etiquetas
  for insert to authenticated with check (
    empresa_id = public.erp_current_empresa_id() and operador_id = auth.uid()
  );
grant select, insert on public.erp_log_etiquetas to authenticated;

commit;
-- <<<<<<<<<<<<<< <<<< 20261021100000_logistica_expedicao_nfe_etiquetas.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261021180000_engenharia_bom_mestre.sql  (tabela ausente no banco: erp_engenharia_bom) >>>>>>>>>>>>>>>>>>>>
/*
 * SYSNQRA — Estrutura BOM transacional
 * Revisão ENG-BOM-001 | 2026-10-21
 * Empresa derivada da sessão no banco; sem aceitar empresa_id do navegador.
 */
create table if not exists public.erp_engenharia_bom (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  produto_pai_id uuid not null references public.erp_produtos(id),
  ferramenta_id uuid,
  versao integer not null check (versao > 0),
  observacoes text,
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','HOMOLOGADA','OBSOLETA')),
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_engenharia_bom_versao_uk unique (empresa_id, produto_pai_id, versao)
);

create table if not exists public.erp_engenharia_bom_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  bom_id uuid not null references public.erp_engenharia_bom(id) on delete cascade,
  componente_id uuid not null references public.erp_produtos(id),
  quantidade_gasto numeric(18,6) not null check (quantidade_gasto > 0),
  perda_pct numeric(8,4) not null default 0 check (perda_pct >= 0 and perda_pct <= 100),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  constraint erp_engenharia_bom_item_uk unique (bom_id, componente_id)
);

create index if not exists erp_engenharia_bom_empresa_produto_idx
  on public.erp_engenharia_bom (empresa_id, produto_pai_id, versao desc);
create index if not exists erp_engenharia_bom_itens_empresa_bom_idx
  on public.erp_engenharia_bom_itens (empresa_id, bom_id);

alter table public.erp_engenharia_bom enable row level security;
alter table public.erp_engenharia_bom_itens enable row level security;

drop policy if exists erp_engenharia_bom_select_tenant on public.erp_engenharia_bom;
create policy erp_engenharia_bom_select_tenant on public.erp_engenharia_bom
  for select to authenticated using (empresa_id = (select public.erp_current_empresa_id()));
drop policy if exists erp_engenharia_bom_itens_select_tenant on public.erp_engenharia_bom_itens;
create policy erp_engenharia_bom_itens_select_tenant on public.erp_engenharia_bom_itens
  for select to authenticated using (empresa_id = (select public.erp_current_empresa_id()));

revoke all on public.erp_engenharia_bom from anon, authenticated;
revoke all on public.erp_engenharia_bom_itens from anon, authenticated;
grant select on public.erp_engenharia_bom to authenticated;
grant select on public.erp_engenharia_bom_itens to authenticated;

create or replace function public.erp_salvar_bom_mestre(
  p_produto_pai_id uuid,
  p_ferramenta_id uuid,
  p_versao integer,
  p_observacoes text,
  p_componentes_json jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_bom_id uuid;
  v_count integer;
  v_item jsonb;
  v_componente uuid;
  v_qtd numeric;
  v_perda numeric;
  v_ficha_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if p_produto_pai_id is null or p_versao is null or p_versao < 1 then
    raise exception 'Produto mestre e versão positiva são obrigatórios.';
  end if;
  if jsonb_typeof(p_componentes_json) <> 'array' or jsonb_array_length(p_componentes_json) = 0 then
    raise exception 'A estrutura precisa conter ao menos um componente.';
  end if;
  if jsonb_array_length(p_componentes_json) > 500 then raise exception 'Limite de 500 componentes por ficha.'; end if;

  perform 1 from public.erp_produtos
    where id = p_produto_pai_id and empresa_id = v_empresa and ativo = true
    for share;
  if not found then raise exception 'Produto mestre inativo ou fora da empresa atual.'; end if;

  if p_ferramenta_id is not null then
    perform 1 from public.erp_ferramentas_industriais
      where id = p_ferramenta_id and empresa_id = v_empresa and ativo = true
      for share;
    if not found then raise exception 'Ferramental inativo ou fora da empresa atual.'; end if;
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_componentes_json) e
    where nullif(e->>'componente_id','') is null
       or coalesce((e->>'quantidade_gasto')::numeric,0) <= 0
       or coalesce((e->>'perda_pct')::numeric,0) < 0
       or coalesce((e->>'perda_pct')::numeric,0) > 100
  ) then raise exception 'Componente, consumo positivo e perda entre 0 e 100 são obrigatórios.'; end if;

  select count(*) into v_count from (
    select e->>'componente_id' as id
    from jsonb_array_elements(p_componentes_json) e
    group by e->>'componente_id' having count(*) > 1
  ) d;
  if v_count > 0 then raise exception 'A lista contém componentes duplicados.'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_componentes_json) e
    where (e->>'componente_id')::uuid = p_produto_pai_id
  ) then raise exception 'O produto mestre não pode ser componente direto de si mesmo.'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_componentes_json) e
    left join public.erp_produtos p on p.id = (e->>'componente_id')::uuid
      and p.empresa_id = v_empresa and p.ativo = true
    where p.id is null
  ) then raise exception 'Um componente está inativo ou não pertence à empresa atual.'; end if;

  if exists (
    select 1 from public.erp_engenharia_bom
    where empresa_id = v_empresa and produto_pai_id = p_produto_pai_id
      and versao = p_versao and status = 'HOMOLOGADA'
  ) then
    raise exception 'Versão homologada é imutável. Crie uma nova versão para revisar a estrutura.';
  end if;

  insert into public.erp_engenharia_bom
    (empresa_id, produto_pai_id, ferramenta_id, versao, observacoes, status, criado_por, updated_at)
  values
    (v_empresa, p_produto_pai_id, p_ferramenta_id, p_versao, nullif(trim(p_observacoes),''), 'RASCUNHO', auth.uid(), now())
  on conflict (empresa_id, produto_pai_id, versao) do update
    set ferramenta_id = excluded.ferramenta_id,
        observacoes = excluded.observacoes,
        status = 'RASCUNHO',
        updated_at = now()
  returning id into v_bom_id;

  delete from public.erp_engenharia_bom_itens
  where empresa_id = v_empresa and bom_id = v_bom_id;

  for v_item in select value from jsonb_array_elements(p_componentes_json)
  loop
    v_componente := (v_item->>'componente_id')::uuid;
    v_qtd := (v_item->>'quantidade_gasto')::numeric;
    v_perda := coalesce((v_item->>'perda_pct')::numeric,0);
    insert into public.erp_engenharia_bom_itens
      (empresa_id, bom_id, componente_id, quantidade_gasto, perda_pct, ordem)
    values (v_empresa, v_bom_id, v_componente, v_qtd, v_perda, 0);
  end loop;

  /*
   * Compatibilidade com o contrato já consumido por erp_mrp_explodir:
   * rascunhos ficam inativos; somente a RPC de homologação ativa a ficha.
   */
  insert into public.erp_fichas_tecnicas
    (empresa_id, produto_id, versao, rendimento, unidade_rendimento, observacoes, ativa, updated_at)
  values
    (v_empresa, p_produto_pai_id, p_versao, 1, 'UN', nullif(trim(p_observacoes),''), false, now())
  on conflict (empresa_id, produto_id, versao) do update
    set rendimento = 1,
        observacoes = excluded.observacoes,
        ativa = false,
        updated_at = now()
  returning id into v_ficha_id;

  delete from public.erp_ficha_itens
    where empresa_id = v_empresa and ficha_id = v_ficha_id;

  insert into public.erp_ficha_itens
    (empresa_id, ficha_id, componente_id, quantidade, perda_percentual, tipo_item, sequencia)
  select v_empresa, v_ficha_id, (e.value->>'componente_id')::uuid,
         (e.value->>'quantidade_gasto')::numeric,
         coalesce((e.value->>'perda_pct')::numeric,0),
         case when coalesce(p.fabricado,false) then 'FABRICADO' else 'COMPRADO' end,
         row_number() over (order by e.ordinality)::integer * 10
  from jsonb_array_elements(p_componentes_json) with ordinality as e(value, ordinality)
  join public.erp_produtos p on p.id = (e.value->>'componente_id')::uuid and p.empresa_id = v_empresa;

  return jsonb_build_object('id',v_bom_id,'ficha_mrp_id',v_ficha_id,'produto_pai_id',p_produto_pai_id,'versao',p_versao,'status','RASCUNHO','componentes',jsonb_array_length(p_componentes_json));
end;
$$;

create or replace function public.erp_homologar_bom_mestre(p_bom_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_produto uuid;
  v_versao integer;
  v_ficha uuid;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;

  select produto_pai_id, versao into v_produto, v_versao
  from public.erp_engenharia_bom
  where id = p_bom_id and empresa_id = v_empresa and status in ('RASCUNHO','HOMOLOGADA')
  for update;
  if not found then raise exception 'Ficha BOM não encontrada na empresa autenticada.'; end if;

  if not exists (select 1 from public.erp_engenharia_bom_itens where bom_id=p_bom_id and empresa_id=v_empresa) then
    raise exception 'Não é possível homologar ficha sem componentes.';
  end if;

  update public.erp_engenharia_bom
  set status='OBSOLETA', updated_at=now()
  where empresa_id=v_empresa and produto_pai_id=v_produto and status='HOMOLOGADA' and id<>p_bom_id;

  update public.erp_engenharia_bom
  set status='HOMOLOGADA', updated_at=now()
  where id=p_bom_id and empresa_id=v_empresa;

  update public.erp_fichas_tecnicas
  set ativa=false, updated_at=now()
  where empresa_id=v_empresa and produto_id=v_produto and ativa=true;

  update public.erp_fichas_tecnicas
  set ativa=true, updated_at=now()
  where empresa_id=v_empresa and produto_id=v_produto and versao=v_versao
  returning id into v_ficha;

  if v_ficha is null then raise exception 'Ficha compatível com MRP não encontrada.'; end if;
  return jsonb_build_object('id',p_bom_id,'ficha_mrp_id',v_ficha,'status','HOMOLOGADA');
end;
$$;

revoke all on function public.erp_salvar_bom_mestre(uuid,uuid,integer,text,jsonb) from public, anon;
grant execute on function public.erp_salvar_bom_mestre(uuid,uuid,integer,text,jsonb) to authenticated;
revoke all on function public.erp_homologar_bom_mestre(uuid) from public, anon;
grant execute on function public.erp_homologar_bom_mestre(uuid) to authenticated;
-- <<<<<<<<<<<<<< <<<< 20261021180000_engenharia_bom_mestre.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261021190000_qualidade_refugos_transacional.sql  (tabela ausente no banco: erp_qualidade_defeitos_motivos) >>>>>>>>>>>>>>>>>>>>
/*
 * SYSNQRA — Refugos e não conformidades
 * Revisão QAL-REFUGO-001 | 2026-10-21
 * Registros vinculados à OP e à empresa derivada da sessão autenticada.
 */
create table if not exists public.erp_qualidade_defeitos_motivos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo_defeito text not null,
  descricao text not null,
  classificacao text not null check (classificacao in ('CRÍTICO','MAIOR','MENOR')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo_defeito)
);

create table if not exists public.erp_qualidade_refugos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ordem_producao_id uuid not null references public.erp_ordens_producao(id),
  defeito_id uuid not null references public.erp_qualidade_defeitos_motivos(id),
  quantidade_refugada integer not null check (quantidade_refugada > 0),
  peso_refugo_kg numeric(18,4) check (peso_refugo_kg is null or peso_refugo_kg >= 0),
  turno text not null default '1',
  operador text not null,
  disposicao_material text not null check (disposicao_material in ('RETRABALHO','SUCATAMENTO','SEGREGADO')),
  observacoes text,
  criado_por uuid,
  created_at timestamptz not null default now()
);

insert into public.erp_qualidade_defeitos_motivos
  (empresa_id, codigo_defeito, descricao, classificacao)
select e.id, d.codigo, d.descricao, d.classificacao
from public.erp_empresas e
cross join (values
  ('DEF-001','Rebarba','MENOR'),
  ('DEF-002','Bolha / porosidade','MAIOR'),
  ('DEF-003','Trinca / fissura','CRÍTICO'),
  ('DEF-004','Quebra de molde / ferramenta','CRÍTICO'),
  ('DEF-005','Dimensão fora de tolerância','MAIOR'),
  ('DEF-006','Falha de inserto metálico','MAIOR'),
  ('DEF-007','Mancha / contaminação','MENOR'),
  ('DEF-008','Deformação / empenamento','MAIOR')
) as d(codigo, descricao, classificacao)
on conflict (empresa_id, codigo_defeito) do nothing;

create index if not exists erp_qualidade_refugos_empresa_data_idx
  on public.erp_qualidade_refugos (empresa_id, created_at desc);
create index if not exists erp_qualidade_refugos_empresa_op_idx
  on public.erp_qualidade_refugos (empresa_id, ordem_producao_id);

alter table public.erp_qualidade_defeitos_motivos enable row level security;
alter table public.erp_qualidade_refugos enable row level security;

drop policy if exists erp_qualidade_defeitos_select_tenant on public.erp_qualidade_defeitos_motivos;
create policy erp_qualidade_defeitos_select_tenant on public.erp_qualidade_defeitos_motivos
  for select to authenticated using (empresa_id = (select public.erp_current_empresa_id()));
drop policy if exists erp_qualidade_refugos_select_tenant on public.erp_qualidade_refugos;
create policy erp_qualidade_refugos_select_tenant on public.erp_qualidade_refugos
  for select to authenticated using (empresa_id = (select public.erp_current_empresa_id()));

revoke all on public.erp_qualidade_defeitos_motivos from anon, authenticated;
revoke all on public.erp_qualidade_refugos from anon, authenticated;
grant select on public.erp_qualidade_defeitos_motivos to authenticated;
grant select on public.erp_qualidade_refugos to authenticated;

create or replace function public.erp_registrar_refugo(
  p_ordem_producao_id uuid,
  p_defeito_id uuid,
  p_quantidade_refugada integer,
  p_peso_refugo_kg numeric,
  p_turno text,
  p_operador text,
  p_disposicao_material text,
  p_observacoes text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_id uuid;
  v_planejada numeric;
  v_produzida numeric;
  v_refugada numeric;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if p_quantidade_refugada is null or p_quantidade_refugada <= 0 then raise exception 'Quantidade refugada deve ser positiva.'; end if;
  if nullif(trim(p_operador),'') is null then raise exception 'Operador é obrigatório.'; end if;
  if p_disposicao_material not in ('RETRABALHO','SUCATAMENTO','SEGREGADO') then raise exception 'Disposição inválida.'; end if;
  if p_peso_refugo_kg is not null and p_peso_refugo_kg < 0 then raise exception 'Peso não pode ser negativo.'; end if;

  select coalesce(quantidade_planejada, quantidade, 0), coalesce(quantidade_produzida,0)
    into v_planejada, v_produzida
    from public.erp_ordens_producao
    where id = p_ordem_producao_id and empresa_id = v_empresa
    for update;
  if not found then raise exception 'OP não encontrada na empresa autenticada.'; end if;

  perform 1 from public.erp_qualidade_defeitos_motivos
    where id = p_defeito_id and empresa_id = v_empresa and ativo = true;
  if not found then raise exception 'Motivo de defeito inativo ou fora da empresa.'; end if;

  select coalesce(sum(quantidade_refugada),0) into v_refugada
    from public.erp_qualidade_refugos
    where empresa_id = v_empresa and ordem_producao_id = p_ordem_producao_id;

  if v_refugada + p_quantidade_refugada > greatest(v_planejada, v_produzida) then
    raise exception 'Refugo acumulado excede a quantidade produzida/planejada da OP.';
  end if;

  insert into public.erp_qualidade_refugos
    (empresa_id, ordem_producao_id, defeito_id, quantidade_refugada, peso_refugo_kg,
     turno, operador, disposicao_material, observacoes, criado_por)
  values
    (v_empresa, p_ordem_producao_id, p_defeito_id, p_quantidade_refugada, p_peso_refugo_kg,
     coalesce(nullif(trim(p_turno),''),'1'), trim(p_operador), p_disposicao_material,
     nullif(trim(p_observacoes),''), auth.uid())
  returning id into v_id;

  return jsonb_build_object('id',v_id,'ordem_producao_id',p_ordem_producao_id,
    'quantidade_refugada',p_quantidade_refugada,'total_refugado_op',v_refugada+p_quantidade_refugada,
    'quantidade_produzida',v_produzida,'quantidade_boa_estimada',greatest(v_produzida-(v_refugada+p_quantidade_refugada),0));
end;
$$;

revoke all on function public.erp_registrar_refugo(uuid,uuid,integer,numeric,text,text,text,text) from public, anon;
grant execute on function public.erp_registrar_refugo(uuid,uuid,integer,numeric,text,text,text,text) to authenticated;
-- <<<<<<<<<<<<<< <<<< 20261021190000_qualidade_refugos_transacional.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261022120000_erp_qualidade_auditorias_planta.sql  (tabela ausente no banco: erp_qualidade_auditorias_planta) >>>>>>>>>>>>>>>>>>>>
-- SYSNQRA · Auditorias internas de processo e produto · 2026-10-22
create sequence if not exists public.erp_qualidade_auditoria_planta_seq;

create table if not exists public.erp_qualidade_auditorias_planta (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  codigo_auditoria text not null,
  maquina_id uuid not null references public.erp_maquinas(id) on delete restrict,
  auditor_nome text not null,
  posto_operador text not null,
  data_auditoria date not null default current_date,
  ficha_processo_conforme boolean,
  instrumento_calibrado boolean,
  fifo_lote_correto boolean,
  observacoes_desvio text,
  resultado_final text not null default 'EM_EXECUCAO'
    check (resultado_final in ('PLANEJADA','EM_EXECUCAO','CONFORME','NAO_CONFORME')),
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, codigo_auditoria)
);

create index if not exists idx_qualidade_auditorias_planta_empresa_data
  on public.erp_qualidade_auditorias_planta (empresa_id, data_auditoria desc);

create or replace function public.erp_qualidade_auditoria_planta_defaults()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(trim(new.codigo_auditoria), '') = '' then
    new.codigo_auditoria := 'AUD-' || to_char(coalesce(new.data_auditoria, current_date), 'YYYY') || '-' ||
      lpad(nextval('public.erp_qualidade_auditoria_planta_seq')::text, 6, '0');
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_qualidade_auditoria_planta_defaults on public.erp_qualidade_auditorias_planta;
create trigger trg_qualidade_auditoria_planta_defaults
before insert or update on public.erp_qualidade_auditorias_planta
for each row execute function public.erp_qualidade_auditoria_planta_defaults();

alter table public.erp_qualidade_auditorias_planta enable row level security;
drop policy if exists qualidade_auditorias_planta_tenant on public.erp_qualidade_auditorias_planta;
create policy qualidade_auditorias_planta_tenant
on public.erp_qualidade_auditorias_planta
for all to authenticated
using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()))
with check ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()));

revoke all on public.erp_qualidade_auditorias_planta from anon;
grant select, insert, update on public.erp_qualidade_auditorias_planta to authenticated;
grant usage, select on sequence public.erp_qualidade_auditoria_planta_seq to authenticated;
-- <<<<<<<<<<<<<< <<<< 20261022120000_erp_qualidade_auditorias_planta.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261024130000_repair_compras_rest_schema.sql  (dependencia: erp_pedidos_compra exigida por 20261027120000_repair_production_rest_schema.sql) >>>>>>>>>>>>>>>>>>>>
-- SYSNQRA ERP INDUSTRIAL
-- Reconciliacao idempotente do schema consultado pelas telas de Compras.
-- Preserva empresa_id e isolamento por RLS; nao cria dados de exemplo.

create table if not exists public.erp_requisicoes_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  ordem_producao_id uuid references public.erp_ordens_producao(id),
  data_limite date,
  comprador_nome text,
  status text not null default 'AGUARDANDO_COTACAO',
  centro_custo varchar(50),
  nivel_urgencia varchar(20) not null default 'MEDIA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);
alter table public.erp_requisicoes_compra
  add column if not exists centro_custo varchar(50),
  add column if not exists nivel_urgencia varchar(20) not null default 'MEDIA';

create table if not exists public.erp_requisicoes_compra_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  requisicao_id uuid not null references public.erp_requisicoes_compra(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  quantidade numeric(14,3) not null default 0,
  fornecedor_id uuid references public.erp_fornecedores(id),
  status text not null default 'AGUARDANDO_COTACAO',
  created_at timestamptz not null default now()
);

create table if not exists public.erp_pedidos_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  numero bigint generated by default as identity,
  fornecedor_id uuid not null references public.erp_fornecedores(id),
  requisicao_id uuid references public.erp_requisicoes_compra(id),
  comprador_id uuid references public.erp_usuarios(id),
  comprador_nome text,
  condicao_pagamento text,
  prazo_entrega date,
  observacoes text,
  status text not null default 'RASCUNHO',
  data_pedido timestamptz not null default now(),
  total numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_pedidos_compra
  add column if not exists centro_custo text,
  add column if not exists local_entrega text,
  add column if not exists especificacao_tecnica text,
  add column if not exists referencia_cotacao text,
  add column if not exists valor_frete numeric(18,2) not null default 0,
  add column if not exists valor_desconto numeric(18,2) not null default 0,
  add column if not exists transportadora text,
  add column if not exists modalidade_frete text,
  add column if not exists numero_contrato text,
  add column if not exists observacoes_recebimento text,
  add column if not exists fiscal_status text not null default 'NAO_ANALISADO',
  add column if not exists fiscal_parecer text;

create table if not exists public.erp_rfq (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  numero bigint not null default 1,
  status text not null default 'RASCUNHO',
  data_emissao date not null default current_date,
  data_necessidade date,
  condicao_pagamento text,
  prazo_resposta date,
  observacoes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_rfq
  add column if not exists fornecedor_escolhido_id uuid references public.erp_fornecedores(id),
  add column if not exists justificativa_escolha text,
  add column if not exists status_aprovacao text,
  add column if not exists menor_preco_ofertado numeric(18,4);

do $$
begin
  alter table public.erp_requisicoes_compra
    add constraint erp_requisicoes_compra_nivel_urgencia_chk
    check (nivel_urgencia in ('BAIXA','MEDIA','ALTA','CRITICA'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_erp_requisicoes_compra_empresa_urgencia_status
  on public.erp_requisicoes_compra(empresa_id,nivel_urgencia,status,created_at desc);
create index if not exists idx_erp_pedidos_compra_empresa_data
  on public.erp_pedidos_compra(empresa_id,data_pedido desc);
create index if not exists idx_erp_rfq_empresa_created_at
  on public.erp_rfq(empresa_id,created_at desc);

alter table public.erp_requisicoes_compra enable row level security;
alter table public.erp_requisicoes_compra_itens enable row level security;
alter table public.erp_pedidos_compra enable row level security;
alter table public.erp_rfq enable row level security;

drop policy if exists erp_requisicoes_compra_tenant on public.erp_requisicoes_compra;
create policy erp_requisicoes_compra_tenant on public.erp_requisicoes_compra
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_requisicoes_compra_itens_tenant on public.erp_requisicoes_compra_itens;
create policy erp_requisicoes_compra_itens_tenant on public.erp_requisicoes_compra_itens
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_pedidos_compra_select on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_insert on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_update on public.erp_pedidos_compra;
drop policy if exists erp_pedidos_compra_delete on public.erp_pedidos_compra;
create policy erp_pedidos_compra_select on public.erp_pedidos_compra for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pedidos_compra_insert on public.erp_pedidos_compra for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pedidos_compra_update on public.erp_pedidos_compra for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pedidos_compra_delete on public.erp_pedidos_compra for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_rfq_tenant on public.erp_rfq;
create policy erp_rfq_tenant on public.erp_rfq for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

notify pgrst, 'reload schema';
-- <<<<<<<<<<<<<< <<<< 20261024130000_repair_compras_rest_schema.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261027120000_repair_production_rest_schema.sql  (tabela ausente no banco: erp_engenharia_bom) >>>>>>>>>>>>>>>>>>>>
-- SYSNQRA ERP INDUSTRIAL
-- Reconciliacao idempotente do schema para os erros REST observados em producao.
-- Nao cria dados de exemplo e preserva isolamento por empresa.
-- Revisao: REST-SCHEMA-REPAIR-001 | 2026-10-27

-- Campos consultados pelo emissor fiscal e pela validacao fiscal de compras.
alter table public.erp_empresas
  add column if not exists inscricao_estadual text,
  add column if not exists razao_social text,
  add column if not exists nome_fantasia text,
  add column if not exists cnpj text,
  add column if not exists endereco text,
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists cep text,
  add column if not exists telefone text,
  add column if not exists email text;

alter table public.erp_pedidos_compra
  add column if not exists fiscal_status text not null default 'NAO_ANALISADO',
  add column if not exists fiscal_parecer text,
  add column if not exists comprador_nome text,
  add column if not exists condicao_pagamento text,
  add column if not exists prazo_entrega date;

-- Campos usados pelo relatorio do Bloco K. data_inicio/data_fim podem ja existir.
alter table public.erp_ordens_producao
  add column if not exists numero_op text,
  add column if not exists numero text,
  add column if not exists quantidade_produzida numeric(18,6) not null default 0,
  add column if not exists data_inicio timestamptz,
  add column if not exists data_fim timestamptz;

-- Campos de compatibilidade consumidos pela tela de RFQ/Análise de Preços.
alter table public.erp_rfq
  add column if not exists fornecedor_escolhido_id uuid,
  add column if not exists justificativa_escolha text,
  add column if not exists status_aprovacao text not null default 'EM_ANALISE',
  add column if not exists menor_preco_ofertado numeric(18,4),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- CRM: tabela consultada pelo funil comercial.
create table if not exists public.erp_crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid references public.erp_clientes(id) on delete set null,
  titulo text not null,
  contato_nome text,
  contato_email text,
  contato_telefone text,
  etapa text not null default 'PROSPECCAO'
    check (etapa in ('PROSPECCAO','QUALIFICACAO','ORCAMENTO','NEGOCIACAO','GANHA','PERDIDA')),
  valor_estimado numeric(18,2) not null default 0 check (valor_estimado >= 0),
  probabilidade numeric(5,2) not null default 0 check (probabilidade between 0 and 100),
  fechamento_previsto date,
  proxima_acao text,
  proxima_acao_em date,
  observacoes text,
  responsavel_id uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists erp_crm_oportunidades_empresa_etapa_idx
  on public.erp_crm_oportunidades(empresa_id, etapa, updated_at desc);
alter table public.erp_crm_oportunidades enable row level security;
drop policy if exists erp_crm_oportunidades_tenant on public.erp_crm_oportunidades;
create policy erp_crm_oportunidades_tenant on public.erp_crm_oportunidades
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update, delete on public.erp_crm_oportunidades to authenticated;

-- Engenharia: cabecalho da estrutura de produto (BOM).
create table if not exists public.erp_engenharia_bom (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  produto_pai_id uuid not null references public.erp_produtos(id),
  ferramenta_id uuid,
  versao integer not null check (versao > 0),
  observacoes text,
  status text not null default 'RASCUNHO'
    check (status in ('RASCUNHO','HOMOLOGADA','OBSOLETA')),
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_engenharia_bom_versao_uk unique (empresa_id, produto_pai_id, versao)
);
create table if not exists public.erp_engenharia_bom_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  bom_id uuid not null references public.erp_engenharia_bom(id) on delete cascade,
  componente_id uuid not null references public.erp_produtos(id),
  quantidade_gasto numeric(18,6) not null check (quantidade_gasto > 0),
  perda_pct numeric(8,4) not null default 0 check (perda_pct >= 0 and perda_pct <= 100),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  constraint erp_engenharia_bom_item_uk unique (bom_id, componente_id)
);
create index if not exists erp_engenharia_bom_empresa_produto_idx
  on public.erp_engenharia_bom(empresa_id, produto_pai_id, versao desc);
create index if not exists erp_engenharia_bom_itens_empresa_bom_idx
  on public.erp_engenharia_bom_itens(empresa_id, bom_id);
alter table public.erp_engenharia_bom enable row level security;
drop policy if exists erp_engenharia_bom_select_tenant on public.erp_engenharia_bom;
create policy erp_engenharia_bom_select_tenant on public.erp_engenharia_bom
  for select to authenticated
  using (empresa_id = (select public.erp_current_empresa_id()));
drop policy if exists erp_engenharia_bom_itens_select_tenant on public.erp_engenharia_bom_itens;
create policy erp_engenharia_bom_itens_select_tenant on public.erp_engenharia_bom_itens
  for select to authenticated
  using (empresa_id = (select public.erp_current_empresa_id()));
grant select on public.erp_engenharia_bom, public.erp_engenharia_bom_itens to authenticated;

-- Regras tributarias consumidas pela tela Fiscal / Impostos.
create table if not exists public.erp_regras_fiscais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ncm text,
  cfop text,
  regime_empresa text,
  uf_destino text,
  icms_aliquota numeric(7,4) not null default 0,
  cst_csosn_icms text,
  ipi_aliquota numeric(7,4) not null default 0,
  cst_ipi text,
  pis_aliquota numeric(7,4) not null default 0,
  pis_cst text,
  cofins_aliquota numeric(7,4) not null default 0,
  cofins_cst text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_regras_fiscais
  add column if not exists pis_cst text,
  add column if not exists cofins_cst text;
alter table public.erp_regras_fiscais enable row level security;
drop policy if exists erp_regras_fiscais_tenant on public.erp_regras_fiscais;
drop policy if exists "erp_regras_fiscais_tenant" on public.erp_regras_fiscais;
create policy erp_regras_fiscais_tenant on public.erp_regras_fiscais
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update, delete on public.erp_regras_fiscais to authenticated;
create index if not exists idx_erp_regras_fiscais_busca
  on public.erp_regras_fiscais(empresa_id, ncm, cfop, uf_destino, ativo);

-- Bloco K: snapshots por periodo, com RLS por empresa.
create table if not exists public.erp_fiscal_bloco_k_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  periodo_referencia date not null,
  data_estoque date not null default current_date,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_estoque numeric(18,6) not null check (quantidade_estoque >= 0),
  indicador_propriedade char(1) not null default '0' check (indicador_propriedade in ('0','1','2')),
  created_at timestamptz not null default now(),
  unique (empresa_id, periodo_referencia, produto_id, indicador_propriedade)
);
create table if not exists public.erp_fiscal_bloco_k_producao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  periodo_referencia date not null,
  ordem_producao_id uuid not null references public.erp_ordens_producao(id) on delete restrict,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_produzida numeric(18,6) not null check (quantidade_produzida >= 0),
  created_at timestamptz not null default now(),
  unique (empresa_id, periodo_referencia, ordem_producao_id)
);
alter table public.erp_fiscal_bloco_k_estoque enable row level security;
alter table public.erp_fiscal_bloco_k_producao enable row level security;
drop policy if exists erp_fiscal_bloco_k_estoque_tenant on public.erp_fiscal_bloco_k_estoque;
create policy erp_fiscal_bloco_k_estoque_tenant on public.erp_fiscal_bloco_k_estoque
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_fiscal_bloco_k_producao_tenant on public.erp_fiscal_bloco_k_producao;
create policy erp_fiscal_bloco_k_producao_tenant on public.erp_fiscal_bloco_k_producao
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update, delete
  on public.erp_fiscal_bloco_k_estoque, public.erp_fiscal_bloco_k_producao
  to authenticated;
create index if not exists erp_bloco_k_estoque_periodo_idx
  on public.erp_fiscal_bloco_k_estoque(empresa_id, periodo_referencia);
create index if not exists erp_bloco_k_producao_periodo_idx
  on public.erp_fiscal_bloco_k_producao(empresa_id, periodo_referencia);

-- Atualiza o cache do PostgREST após aplicar a migracao.
notify pgrst, 'reload schema';

-- RPC consumida pelo Portal do Cliente. Restringe os pedidos ao vínculo ativo
-- do usuário autenticado, sem confiar em empresa_id enviado pelo navegador.
create or replace function public.erp_portal_cliente_pedidos()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_access public.erp_portal_acessos%rowtype;
  v_result jsonb;
begin
  select * into v_access
  from public.erp_portal_acessos
  where auth_user_id=auth.uid() and tipo_portal='CLIENTE' and ativo=true
  limit 1;
  if not found then raise exception 'PORTAL_CLIENTE_SEM_ACESSO'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'numero',p.numero,
    'pedido_cliente',p.pedido_cliente,
    'status',p.status,
    'data_entrega_prometida',p.data_entrega_prometida,
    'total',p.total,
    'itens',(select coalesce(jsonb_agg(jsonb_build_object(
      'descricao',i.descricao,
      'quantidade',i.quantidade,
      'data_fabricacao',i.data_fabricacao
    )),'[]'::jsonb)
    from public.erp_pedidos_venda_itens i
    where i.empresa_id=p.empresa_id and i.pedido_id=p.id)
  ) order by p.created_at desc),'[]'::jsonb)
  into v_result
  from public.erp_pedidos_venda p
  where p.empresa_id=v_access.empresa_id and p.cliente_id=v_access.cliente_id;
  return v_result;
end;
$$;
revoke all on function public.erp_portal_cliente_pedidos() from public,anon;
grant execute on function public.erp_portal_cliente_pedidos() to authenticated;

-- Atualiza o cache de schema do PostgREST após a migração.
notify pgrst, 'reload schema';
-- <<<<<<<<<<<<<< <<<< 20261027120000_repair_production_rest_schema.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261029170000_erp_qualidade_rpnc_ged_evidencias.sql  (tabela ausente no banco: erp_qualidade_rpnc_evidencias) >>>>>>>>>>>>>>>>>>>>
begin;

-- GED de evidências vinculado ao modelo RPNC existente, com isolamento por empresa.
alter table public.erp_rpnc
  add column if not exists cliente_id uuid references public.erp_clientes(id) on delete set null,
  add column if not exists equipamento_codigo text;

create index if not exists erp_rpnc_empresa_cliente_idx
  on public.erp_rpnc (empresa_id, cliente_id, criado_em desc);

create table if not exists public.erp_qualidade_rpnc_evidencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  rpnc_id uuid not null,
  nome_arquivo text not null check (length(trim(nome_arquivo)) > 0),
  storage_path text not null,
  mime_type text,
  tamanho_bytes bigint not null default 0 check (tamanho_bytes >= 0),
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_rpnc_evidencias_rpnc_fk
    foreign key (empresa_id, rpnc_id)
    references public.erp_rpnc (empresa_id, id) on delete cascade,
  constraint erp_qualidade_rpnc_evidencias_storage_path_uq unique (storage_path)
);

create index if not exists erp_qualidade_rpnc_evidencias_rpnc_idx
  on public.erp_qualidade_rpnc_evidencias (empresa_id, rpnc_id, created_at desc);

alter table public.erp_qualidade_rpnc_evidencias enable row level security;

drop policy if exists erp_qualidade_rpnc_evidencias_select on public.erp_qualidade_rpnc_evidencias;
drop policy if exists erp_qualidade_rpnc_evidencias_insert on public.erp_qualidade_rpnc_evidencias;
drop policy if exists erp_qualidade_rpnc_evidencias_delete on public.erp_qualidade_rpnc_evidencias;

create policy erp_qualidade_rpnc_evidencias_select
  on public.erp_qualidade_rpnc_evidencias for select to authenticated
  using (empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('qualidade', 'ver'));

create policy erp_qualidade_rpnc_evidencias_insert
  on public.erp_qualidade_rpnc_evidencias for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id()
    and uploaded_by = auth.uid()
    and public.erp_has_permission('qualidade', 'editar'));

create policy erp_qualidade_rpnc_evidencias_delete
  on public.erp_qualidade_rpnc_evidencias for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('qualidade', 'editar'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qualidade-evidencias', 'qualidade-evidencias', false, 26214400,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists qualidade_evidencias_select on storage.objects;
drop policy if exists qualidade_evidencias_insert on storage.objects;
drop policy if exists qualidade_evidencias_delete on storage.objects;

create policy qualidade_evidencias_select on storage.objects
  for select to authenticated using (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.id::text = (storage.foldername(name))[2]
        and r.empresa_id = public.erp_current_empresa_id()
        and public.erp_has_permission('qualidade', 'ver')
    )
  );

create policy qualidade_evidencias_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.id::text = (storage.foldername(name))[2]
        and r.empresa_id = public.erp_current_empresa_id()
        and public.erp_has_permission('qualidade', 'editar')
    )
  );

create policy qualidade_evidencias_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.id::text = (storage.foldername(name))[2]
        and r.empresa_id = public.erp_current_empresa_id()
        and public.erp_has_permission('qualidade', 'editar')
    )
  );

commit;
-- <<<<<<<<<<<<<< <<<< 20261029170000_erp_qualidade_rpnc_ged_evidencias.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261030210000_customer_debit_notes_pod.sql  (tabela ausente no banco: erp_clientes_dn_config) >>>>>>>>>>>>>>>>>>>>
begin;

create table if not exists public.erp_clientes_dn_config (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid not null references public.erp_clientes(id) on delete cascade,
  email_cobranca text,
  condicao_pagamento_padrao text,
  exigir_pod boolean not null default false,
  limite_credito numeric(18,2) not null default 0 check (limite_credito >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, cliente_id)
);

create table if not exists public.erp_notas_debito_clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid not null references public.erp_clientes(id) on delete restrict,
  numero_dn text not null,
  valor_nominal numeric(18,2) not null check (valor_nominal >= 0),
  data_emissao date not null default current_date,
  descricao text,
  status text not null default 'ABERTA' check (status in ('ABERTA','AGUARDANDO_POD','LIBERADA','CANCELADA')),
  pod_bucket text,
  pod_path text,
  pod_data_entrega date,
  pod_recebedor text,
  pod_validado_em timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero_dn)
);

create index if not exists ix_erp_clientes_dn_config_cliente on public.erp_clientes_dn_config(empresa_id,cliente_id);
create index if not exists ix_erp_notas_debito_cliente_data on public.erp_notas_debito_clientes(empresa_id,data_emissao desc);
create index if not exists ix_erp_notas_debito_cliente_numero on public.erp_notas_debito_clientes(empresa_id,numero_dn);

alter table public.erp_clientes_dn_config enable row level security;
alter table public.erp_notas_debito_clientes enable row level security;

drop policy if exists erp_clientes_dn_config_tenant on public.erp_clientes_dn_config;
create policy erp_clientes_dn_config_tenant on public.erp_clientes_dn_config
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_notas_debito_clientes_tenant on public.erp_notas_debito_clientes;
create policy erp_notas_debito_clientes_tenant on public.erp_notas_debito_clientes
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update on public.erp_clientes_dn_config to authenticated;
grant select, insert, update on public.erp_notas_debito_clientes to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('erp-clientes-pod', 'erp-clientes-pod', false, 5242880, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=array['application/pdf','image/png','image/jpeg'];

drop policy if exists erp_clientes_pod_select_tenant on storage.objects;
create policy erp_clientes_pod_select_tenant on storage.objects
for select to authenticated
using (bucket_id='erp-clientes-pod' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_clientes_pod_insert_tenant on storage.objects;
create policy erp_clientes_pod_insert_tenant on storage.objects
for insert to authenticated
with check (bucket_id='erp-clientes-pod' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_clientes_pod_update_tenant on storage.objects;
create policy erp_clientes_pod_update_tenant on storage.objects
for update to authenticated
using (bucket_id='erp-clientes-pod' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text)
with check (bucket_id='erp-clientes-pod' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

commit;
-- <<<<<<<<<<<<<< <<<< 20261030210000_customer_debit_notes_pod.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql  (tabela ausente no banco: erp_sgq_auditorias) >>>>>>>>>>>>>>>>>>>>
-- SYSNQRA ERP INDUSTRIAL | SGQ | Formulário RPNC (modelo SoftExpert), auditorias,
-- pasta virtual de evidências, varredura de recorrência e plano CAPA dinâmico.
-- Autor: FernandoSch · 2026-10-31
-- Migração 100% aditiva: não altera a RPC erp_sgq_abrir_rpnc, o fluxo da tela
-- aprovada /pageprincipal/qualidade/rpnc nem as políticas de storage existentes.
begin;

-- ---------------------------------------------------------------------------
-- 1 · Programa de auditorias SGQ (escopo/norma, período, auditor líder, status)
-- ---------------------------------------------------------------------------
create table if not exists public.erp_sgq_auditorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo_auditoria text not null,
  escopo text not null,
  objetivo text,
  tipo text not null default 'Interna'
    check (tipo in ('Interna', 'Externa', 'Fornecedor', 'Processo', 'Produto')),
  auditor_lider_id uuid references public.erp_usuarios(id) on delete set null,
  auditor_lider_nome text not null,
  data_inicio date not null,
  data_fim date not null,
  status text not null default 'Planejada'
    check (status in ('Planejada', 'Em Andamento', 'Concluída')),
  observacoes text,
  criado_por uuid references public.erp_usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint erp_sgq_auditorias_codigo_uq unique (empresa_id, codigo_auditoria),
  constraint erp_sgq_auditorias_periodo_ck check (data_fim >= data_inicio)
);

create index if not exists idx_sgq_auditorias_empresa_status
  on public.erp_sgq_auditorias (empresa_id, status, data_inicio desc);
create index if not exists idx_sgq_auditorias_empresa_lider
  on public.erp_sgq_auditorias (empresa_id, auditor_lider_id);

comment on table public.erp_sgq_auditorias is
  'Programa de auditorias de qualidade (norma/ISO, período e auditor líder); base de rastreabilidade do vínculo RPNC-auditoria.';

create or replace function public.erp_sgq_auditoria_normalizar()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_numero bigint;
begin
  if nullif(btrim(new.codigo_auditoria), '') is null then
    insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
      values (new.empresa_id, 'SGQ-AUD-' || to_char(coalesce(new.data_inicio, current_date), 'YYYY'), 1)
      on conflict (empresa_id, chave)
        do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
      returning proximo_valor into v_numero;
    new.codigo_auditoria := 'SGQ-AUD-' || to_char(coalesce(new.data_inicio, current_date), 'YYYY')
      || '-' || lpad(v_numero::text, 5, '0');
  else
    new.codigo_auditoria := btrim(new.codigo_auditoria);
  end if;
  new.escopo := btrim(new.escopo);
  new.auditor_lider_nome := btrim(new.auditor_lider_nome);
  if nullif(new.auditor_lider_nome, '') is null then
    raise exception 'Informe o auditor líder da auditoria.';
  end if;
  new.atualizado_em := now();
  return new;
end
$$;

drop trigger if exists trg_sgq_auditoria_normalizar on public.erp_sgq_auditorias;
create trigger trg_sgq_auditoria_normalizar before insert or update
  on public.erp_sgq_auditorias
  for each row execute function public.erp_sgq_auditoria_normalizar();

drop trigger if exists trg_sgq_auditoria_audit on public.erp_sgq_auditorias;
create trigger trg_sgq_auditoria_audit after insert or update or delete
  on public.erp_sgq_auditorias
  for each row execute function public.erp_sgq_auditar_mutacao();

alter table public.erp_sgq_auditorias enable row level security;

drop policy if exists sgq_auditorias_select on public.erp_sgq_auditorias;
drop policy if exists sgq_auditorias_insert on public.erp_sgq_auditorias;
drop policy if exists sgq_auditorias_update on public.erp_sgq_auditorias;

create policy sgq_auditorias_select on public.erp_sgq_auditorias for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));
create policy sgq_auditorias_insert on public.erp_sgq_auditorias for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'criar'));
create policy sgq_auditorias_update on public.erp_sgq_auditorias for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'));

revoke all on public.erp_sgq_auditorias from anon;
grant select, insert, update on public.erp_sgq_auditorias to authenticated;

-- ---------------------------------------------------------------------------
-- 2 · Vínculo transacional RPNC -> auditoria e pasta virtual de evidências
-- ---------------------------------------------------------------------------
alter table public.erp_rpnc
  add column if not exists sgq_auditoria_id uuid references public.erp_sgq_auditorias(id) on delete restrict,
  add column if not exists sgq_pasta_evidencias text;

create index if not exists idx_erp_rpnc_empresa_auditoria
  on public.erp_rpnc (empresa_id, sgq_auditoria_id) where sgq_auditoria_id is not null;

comment on column public.erp_rpnc.sgq_auditoria_id is
  'Auditoria SGQ que originou a não conformidade (chave de vínculo pedida para rastreabilidade do Bloco K).';
comment on column public.erp_rpnc.sgq_pasta_evidencias is
  'Prefixo privado obrigatório das evidências da RPNC no bucket qualidade-evidencias: {empresa_id}/rpnc_{numero_rpnc}.';

-- Índices de varredura de recorrência por produto e por lote.
create index if not exists idx_erp_rpnc_empresa_produto_data
  on public.erp_rpnc (empresa_id, sgq_produto_id, sgq_data_ocorrencia desc) where sgq_produto_id is not null;
create index if not exists idx_erp_rpnc_empresa_lote
  on public.erp_rpnc (empresa_id, lower(btrim(coalesce(sgq_lote, '')))) where sgq_lote is not null;

-- Anexos individuais de cada ação CAPA, indexados à pasta da RPNC.
alter table public.erp_qualidade_rpnc_evidencias
  add column if not exists acao_id uuid references public.erp_sgq_capa_acoes(id) on delete cascade,
  add column if not exists finalidade text not null default 'Ocorrencia';

comment on column public.erp_qualidade_rpnc_evidencias.acao_id is
  'Ação CAPA à qual o anexo pertence; nulo para evidências da ocorrência.';

-- ---------------------------------------------------------------------------
-- 3 · Abertura atômica do formulário RPNC com pasta virtual privada
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_abrir_rpnc_formulario(
  p_descricao text,
  p_tipo_registro text,
  p_severidade text,
  p_setor_id uuid,
  p_codigo_produto text default null,
  p_lote text default null,
  p_cliente_id uuid default null,
  p_data_ocorrencia date default null,
  p_auditoria_id uuid default null,
  p_linked_entity_type text default null,
  p_linked_entity_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_produto uuid;
  v_numero bigint;
  v_numero_rpnc text;
  v_pasta text;
  v_origem text;
  v_row public.erp_rpnc;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'criar') then
    raise exception 'Sem permissão para abrir RPNC.';
  end if;
  if nullif(btrim(p_descricao), '') is null or length(btrim(p_descricao)) < 10 then
    raise exception 'Descreva a não conformidade com pelo menos 10 caracteres.';
  end if;

  -- Origem obrigatória no modelo do formulário, reutilizando o domínio já
  -- vigente de erp_rpnc.sgq_tipo_registro (nenhum valor novo é inventado).
  if p_tipo_registro is null or p_tipo_registro not in
    ('INTERNO', 'EXTERNO', 'RPNC_CLIENTE', 'AUDITORIA_INTERNA', 'AUDITORIA_EXTERNA') then
    raise exception 'Origem da RPNC inválida.';
  end if;
  v_origem := case p_tipo_registro
    when 'INTERNO' then 'interna'
    when 'EXTERNO' then 'externa'
    when 'RPNC_CLIENTE' then 'cliente'
    when 'AUDITORIA_INTERNA' then 'auditoria interna'
    else 'auditoria externa'
  end;

  if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then
    raise exception 'Gravidade inválida.';
  end if;
  if p_setor_id is null or not exists (
    select 1 from public.erp_setores s
    where s.id = p_setor_id and s.empresa_id = v_empresa and s.ativo = true
  ) then raise exception 'Setor inválido para a empresa.'; end if;

  if nullif(btrim(coalesce(p_codigo_produto, '')), '') is not null then
    select pr.id into v_produto from public.erp_produtos pr
      where pr.empresa_id = v_empresa
        and lower(btrim(pr.codigo)) = lower(btrim(p_codigo_produto))
        and coalesce(pr.ativo, true) = true
      limit 1;
    if v_produto is null then
      raise exception 'Código de peça/produto não cadastrado na empresa: %', btrim(p_codigo_produto);
    end if;
  end if;

  if p_cliente_id is not null and not exists (
    select 1 from public.erp_clientes c where c.id = p_cliente_id and c.empresa_id = v_empresa
  ) then raise exception 'Cliente inválido para a empresa.'; end if;

  if p_auditoria_id is not null and not exists (
    select 1 from public.erp_sgq_auditorias a
    where a.id = p_auditoria_id and a.empresa_id = v_empresa
  ) then raise exception 'Auditoria inválida para a empresa.'; end if;

  select u.id into v_usuario from public.erp_usuarios u
    where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
    limit 1;
  if v_usuario is null then raise exception 'Usuário ERP ativo não identificado.'; end if;

  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
    values (v_empresa, 'RPNC-' || to_char(current_date, 'YYYY'), 1)
    on conflict (empresa_id, chave)
      do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
    returning proximo_valor into v_numero;

  loop
    v_numero_rpnc := 'RPNC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_numero::text, 6, '0');
    exit when not exists (
      select 1 from public.erp_rpnc where empresa_id = v_empresa and numero_rpnc = v_numero_rpnc
    );
    update public.erp_sgq_contadores set proximo_valor = proximo_valor + 1
      where empresa_id = v_empresa and chave = 'RPNC-' || to_char(current_date, 'YYYY')
      returning proximo_valor into v_numero;
  end loop;

  -- Pasta virtual privada: prefixo único por RPNC, dentro do bucket já criado.
  v_pasta := v_empresa::text || '/rpnc_' || v_numero_rpnc;

  perform set_config('app.sgq_rpnc_open', 'open', true);

  insert into public.erp_rpnc (
    empresa_id, numero_rpnc, descricao_nao_conformidade, status, acao_corretiva,
    sgq_origem, sgq_severidade, setor_id, sgq_vinculo_tipo, sgq_vinculo_id, sgq_aberto_por,
    sgq_tipo_registro, sgq_produto_id, sgq_cliente_id, sgq_lote, sgq_data_ocorrencia,
    sgq_responsavel_id, sgq_auditoria_id, sgq_pasta_evidencias, data_ocorrencia
  ) values (
    v_empresa, v_numero_rpnc, btrim(p_descricao), 'aberta', btrim(p_descricao),
    v_origem, p_severidade, p_setor_id, nullif(btrim(coalesce(p_linked_entity_type, '')), ''),
    p_linked_entity_id, v_usuario,
    p_tipo_registro, v_produto, p_cliente_id,
    nullif(btrim(coalesce(p_lote, '')), ''), coalesce(p_data_ocorrencia, current_date),
    v_usuario, p_auditoria_id, v_pasta,
    coalesce(p_data_ocorrencia, current_date)
  )
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'numero_rpnc', v_row.numero_rpnc,
    'status', v_row.status,
    'pasta_evidencias', v_row.sgq_pasta_evidencias,
    'bucket', 'qualidade-evidencias'
  );
end
$$;

-- ---------------------------------------------------------------------------
-- 4 · Gravação do formulário (relato, investigação, equipe, padrão, auditoria)
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_salvar_formulario_rpnc(
  p_rpnc_id uuid,
  p_tratamento jsonb,
  p_ishikawa jsonb,
  p_cinco_porques jsonb,
  p_auditoria_id uuid default null,
  p_codigo_produto text default null,
  p_lote text default null,
  p_data_ocorrencia date default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_produto uuid;
  v_row public.erp_rpnc;
  v_key text;
  v_value jsonb;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'editar') then
    raise exception 'Sem permissão para atualizar o formulário da RPNC.';
  end if;
  if jsonb_typeof(p_tratamento) is distinct from 'object' then
    raise exception 'Os campos do formulário de tratamento devem ser um objeto JSON.';
  end if;
  if jsonb_typeof(p_ishikawa) is distinct from 'object' then
    raise exception 'Ishikawa deve ser um objeto JSON.';
  end if;
  foreach v_key in array array['Metodo', 'Maquina', 'Medida', 'MeioAmbiente', 'MaoDeObra', 'Material'] loop
    v_value := p_ishikawa -> v_key;
    if jsonb_typeof(v_value) is distinct from 'array' then
      raise exception 'Grupo Ishikawa inválido: %.', v_key;
    end if;
    if exists (select 1 from jsonb_array_elements(v_value) as item(value) where jsonb_typeof(item.value) <> 'string') then
      raise exception 'As causas do grupo % devem ser textos.', v_key;
    end if;
  end loop;
  if jsonb_typeof(p_cinco_porques) is distinct from 'array' or jsonb_array_length(p_cinco_porques) <> 5 then
    raise exception 'A cadeia principal deve conter exatamente cinco porquês.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_cinco_porques) as item(value) where jsonb_typeof(item.value) <> 'string') then
    raise exception 'Cada porquê deve ser um texto.';
  end if;

  if nullif(btrim(coalesce(p_codigo_produto, '')), '') is not null then
    select pr.id into v_produto from public.erp_produtos pr
      where pr.empresa_id = v_empresa
        and lower(btrim(pr.codigo)) = lower(btrim(p_codigo_produto))
        and coalesce(pr.ativo, true) = true
      limit 1;
    if v_produto is null then
      raise exception 'Código de peça/produto não cadastrado na empresa: %', btrim(p_codigo_produto);
    end if;
  end if;

  if p_auditoria_id is not null and not exists (
    select 1 from public.erp_sgq_auditorias a
    where a.id = p_auditoria_id and a.empresa_id = v_empresa
  ) then raise exception 'Auditoria inválida para a empresa.'; end if;

  select * into v_row from public.erp_rpnc
    where id = p_rpnc_id and empresa_id = v_empresa and sgq_origem is not null
    for update;
  if not found then raise exception 'RPNC não encontrada nesta empresa.'; end if;

  update public.erp_rpnc set
    sgq_tratamento_anomalia = p_tratamento,
    ishikawa_data = p_ishikawa,
    cinco_porques = p_cinco_porques,
    sgq_auditoria_id = p_auditoria_id,
    sgq_produto_id = coalesce(v_produto, sgq_produto_id),
    sgq_lote = coalesce(nullif(btrim(coalesce(p_lote, '')), ''), sgq_lote),
    sgq_data_ocorrencia = coalesce(p_data_ocorrencia, sgq_data_ocorrencia)
  where id = p_rpnc_id and empresa_id = v_empresa
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'numero_rpnc', v_row.numero_rpnc,
    'status', v_row.status,
    'pasta_evidencias', v_row.sgq_pasta_evidencias,
    'salvo_em', now()
  );
end
$$;

-- ---------------------------------------------------------------------------
-- 5 · Varredura de recorrência por código de peça ou lote (isolada por empresa)
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_buscar_recorrencia_rpnc(
  p_codigo_produto text,
  p_lote text default null,
  p_excluir_rpnc_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_codigo text := lower(btrim(coalesce(p_codigo_produto, '')));
  v_lote text := lower(btrim(coalesce(p_lote, '')));
  v_result jsonb;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'ver') then
    raise exception 'Sem permissão para consultar o histórico de RPNC.';
  end if;
  if v_codigo = '' and v_lote = '' then
    raise exception 'Informe o código da peça ou o lote para a varredura de recorrência.';
  end if;

  select coalesce(jsonb_agg(registro order by registro ->> 'criado_em' desc), '[]'::jsonb)
    into v_result
  from (
    select jsonb_build_object(
      'id', r.id,
      'numero_rpnc', r.numero_rpnc,
      'status', r.status,
      'severidade', r.sgq_severidade,
      'tipo_registro', r.sgq_tipo_registro,
      'descricao', r.descricao_nao_conformidade,
      'criado_em', r.criado_em,
      'data_ocorrencia', coalesce(r.sgq_data_ocorrencia, r.data_ocorrencia::date),
      'lote', coalesce(nullif(r.sgq_lote, ''), nullif(r.lote_afetado, '')),
      'produto_codigo', pr.codigo,
      'produto_nome', pr.nome,
      'setor', s.nome,
      'ishikawa_data', r.ishikawa_data,
      'cinco_porques', r.cinco_porques,
      'contencao', r.sgq_contencao,
      'acao_preventiva', r.sgq_acao_preventiva,
      'verificacao_eficacia', r.sgq_verificacao_eficacia,
      'eficacia_aprovada', r.eficacia_aprovada,
      'acoes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id,
          'tipo', a.tipo,
          'descricao', a.descricao,
          'causa_raiz', a.causa_raiz,
          'responsavel', u.nome,
          'prazo', a.prazo,
          'status', a.status,
          'resultado_eficacia', a.resultado_eficacia,
          'evidencia', a.evidencia
        ) order by a.prazo)
        from public.erp_sgq_capa_acoes a
        left join public.erp_usuarios u on u.id = a.responsavel_id
        where a.rpnc_id = r.id and a.empresa_id = r.empresa_id
      ), '[]'::jsonb),
      'evidencias', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', e.id,
          'nome_arquivo', e.nome_arquivo,
          'storage_path', e.storage_path,
          'finalidade', e.finalidade
        ) order by e.created_at)
        from public.erp_qualidade_rpnc_evidencias e
        where e.rpnc_id = r.id and e.empresa_id = r.empresa_id
      ), '[]'::jsonb)
    ) as registro
    from public.erp_rpnc r
    left join public.erp_produtos pr on pr.id = r.sgq_produto_id
    left join public.erp_setores s on s.id = r.setor_id
    where r.empresa_id = v_empresa
      and r.sgq_origem is not null
      and (p_excluir_rpnc_id is null or r.id <> p_excluir_rpnc_id)
      and (
        (v_codigo <> '' and lower(btrim(coalesce(pr.codigo, ''))) = v_codigo)
        or (v_lote <> '' and (
              lower(btrim(coalesce(r.sgq_lote, ''))) = v_lote
              or lower(btrim(coalesce(r.lote_afetado, ''))) = v_lote
            ))
      )
    order by r.criado_em desc
    limit 20
  ) encontrado;

  return coalesce(v_result, '[]'::jsonb);
end
$$;

-- ---------------------------------------------------------------------------
-- 6 · Plano de ação CAPA dinâmico (inserção/atualização em uma única chamada)
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_salvar_acoes_rpnc(p_rpnc_id uuid, p_acoes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_item jsonb;
  v_acao public.erp_sgq_capa_acoes;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_guardado int;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if jsonb_typeof(p_acoes) is distinct from 'array' then
    raise exception 'O plano de ação deve ser uma lista de ações.';
  end if;
  if not exists (
    select 1 from public.erp_rpnc r
    where r.id = p_rpnc_id and r.empresa_id = v_empresa and r.sgq_origem is not null
  ) then raise exception 'RPNC não encontrada nesta empresa.'; end if;

  select u.id into v_usuario from public.erp_usuarios u
    where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
    limit 1;
  if v_usuario is null then raise exception 'Usuário ERP ativo não identificado.'; end if;

  for v_item in select jsonb_array_elements(p_acoes) loop
    if jsonb_typeof(v_item) is distinct from 'object' then raise exception 'Cada ação deve ser um objeto JSON.'; end if;
    if nullif(btrim(coalesce(v_item ->> 'descricao', '')), '') is null then
      raise exception 'Toda ação CAPA exige a descrição do quê será feito.';
    end if;
    if coalesce(v_item ->> 'tipo', '') not in ('Contencao', 'Corretiva', 'Preventiva') then
      raise exception 'Tipo de ação inválido: %.', coalesce(v_item ->> 'tipo', 'vazio');
    end if;
    if nullif(v_item ->> 'prazo', '') is null then raise exception 'Toda ação CAPA exige prazo.'; end if;
    if nullif(v_item ->> 'responsavel_id', '') is null then raise exception 'Toda ação CAPA exige responsável.'; end if;
    if not exists (
      select 1 from public.erp_usuarios u
      where u.id = (v_item ->> 'responsavel_id')::uuid
        and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
    ) then raise exception 'Responsável da ação não pertence à empresa ou está inativo.'; end if;

    v_id := nullif(v_item ->> 'id', '')::uuid;
    if v_id is null then
      if not public.erp_has_permission('qualidade', 'criar') then
        raise exception 'Sem permissão para criar ações CAPA.';
      end if;
      insert into public.erp_sgq_capa_acoes (
        empresa_id, rpnc_id, tipo, descricao, causa_raiz, responsavel_id, prazo, status
      ) values (
        v_empresa, p_rpnc_id, v_item ->> 'tipo', btrim(v_item ->> 'descricao'),
        nullif(btrim(coalesce(v_item ->> 'causa_raiz', '')), ''),
        (v_item ->> 'responsavel_id')::uuid, (v_item ->> 'prazo')::date,
        coalesce(nullif(v_item ->> 'status', ''), 'Planejada')
      )
      returning * into v_acao;
      v_ids := v_ids || v_acao.id;
    else
      if not public.erp_has_permission('qualidade', 'editar') then
        raise exception 'Sem permissão para atualizar ações CAPA.';
      end if;
      update public.erp_sgq_capa_acoes set
        tipo = v_item ->> 'tipo',
        descricao = btrim(v_item ->> 'descricao'),
        causa_raiz = nullif(btrim(coalesce(v_item ->> 'causa_raiz', '')), ''),
        responsavel_id = (v_item ->> 'responsavel_id')::uuid,
        prazo = (v_item ->> 'prazo')::date
      where id = v_id and rpnc_id = p_rpnc_id and empresa_id = v_empresa
      returning * into v_acao;
      if not found then raise exception 'Ação CAPA não encontrada nesta RPNC.'; end if;
      v_ids := v_ids || v_acao.id;
    end if;
  end loop;

  -- Remove apenas ações ainda no estado 'Planejada' e criadas pelo próprio usuário;
  -- o workflow aprovado (aprovação/verificação) nunca é apagado por esta função.
  delete from public.erp_sgq_capa_acoes a
  where a.rpnc_id = p_rpnc_id
    and a.empresa_id = v_empresa
    and a.status = 'Planejada'
    and a.created_by = v_usuario
    and not (a.id = any (v_ids));
  get diagnostics v_guardado = row_count;

  return jsonb_build_object(
    'rpnc_id', p_rpnc_id,
    'acoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'tipo', a.tipo,
        'descricao', a.descricao,
        'causa_raiz', a.causa_raiz,
        'responsavel_id', a.responsavel_id,
        'responsavel', u.nome,
        'prazo', a.prazo,
        'status', a.status,
        'resultado_eficacia', a.resultado_eficacia,
        'created_by', a.created_by
      ) order by a.prazo, a.created_at)
      from public.erp_sgq_capa_acoes a
      left join public.erp_usuarios u on u.id = a.responsavel_id
      where a.rpnc_id = p_rpnc_id and a.empresa_id = v_empresa
    ), '[]'::jsonb),
    'removidas', v_guardado
  );
end
$$;

-- ---------------------------------------------------------------------------
-- 7 · Vínculo/desvínculo de RPNC com auditoria a partir do painel de auditorias
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_vincular_rpnc_auditoria(p_rpnc_id uuid, p_auditoria_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_rpnc public.erp_rpnc;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'editar') then
    raise exception 'Sem permissão para vincular RPNC a auditoria.';
  end if;
  if p_auditoria_id is not null and not exists (
    select 1 from public.erp_sgq_auditorias a
    where a.id = p_auditoria_id and a.empresa_id = v_empresa
  ) then raise exception 'Auditoria inválida para a empresa.'; end if;

  select * into v_rpnc from public.erp_rpnc
    where id = p_rpnc_id and empresa_id = v_empresa and sgq_origem is not null;
  if not found then raise exception 'RPNC não encontrada nesta empresa.'; end if;

  update public.erp_rpnc
    set sgq_auditoria_id = p_auditoria_id
  where id = p_rpnc_id and empresa_id = v_empresa
  returning * into v_rpnc;

  return jsonb_build_object(
    'rpnc_id', v_rpnc.id,
    'numero_rpnc', v_rpnc.numero_rpnc,
    'auditoria_id', v_rpnc.sgq_auditoria_id
  );
end
$$;

revoke all on function public.erp_sgq_abrir_rpnc_formulario(text, text, text, uuid, text, text, uuid, date, uuid, text, uuid) from public;
revoke all on function public.erp_sgq_salvar_formulario_rpnc(uuid, jsonb, jsonb, jsonb, uuid, text, text, date) from public;
revoke all on function public.erp_sgq_buscar_recorrencia_rpnc(text, text, uuid) from public;
revoke all on function public.erp_sgq_salvar_acoes_rpnc(uuid, jsonb) from public;
revoke all on function public.erp_sgq_vincular_rpnc_auditoria(uuid, uuid) from public;

grant execute on function public.erp_sgq_abrir_rpnc_formulario(text, text, text, uuid, text, text, uuid, date, uuid, text, uuid) to authenticated;
grant execute on function public.erp_sgq_salvar_formulario_rpnc(uuid, jsonb, jsonb, jsonb, uuid, text, text, date) to authenticated;
grant execute on function public.erp_sgq_buscar_recorrencia_rpnc(text, text, uuid) to authenticated;
grant execute on function public.erp_sgq_salvar_acoes_rpnc(uuid, jsonb) to authenticated;
grant execute on function public.erp_sgq_vincular_rpnc_auditoria(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8 · Políticas ADITIVAS de storage para a pasta rpnc_{numero_rpnc}
--    As políticas por uuid do registro permanecem ativas para a tela aprovada.
-- ---------------------------------------------------------------------------
drop policy if exists qualidade_evidencias_select_protocolo on storage.objects;
create policy qualidade_evidencias_select_protocolo on storage.objects
  for select to authenticated using (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.empresa_id = public.erp_current_empresa_id()
        and ('rpnc_' || r.numero_rpnc) = (storage.foldername(name))[2]
        and public.erp_has_permission('qualidade', 'ver')
    )
  );

drop policy if exists qualidade_evidencias_insert_protocolo on storage.objects;
create policy qualidade_evidencias_insert_protocolo on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.empresa_id = public.erp_current_empresa_id()
        and ('rpnc_' || r.numero_rpnc) = (storage.foldername(name))[2]
        and public.erp_has_permission('qualidade', 'editar')
    )
  );

drop policy if exists qualidade_evidencias_delete_protocolo on storage.objects;
create policy qualidade_evidencias_delete_protocolo on storage.objects
  for delete to authenticated using (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.empresa_id = public.erp_current_empresa_id()
        and ('rpnc_' || r.numero_rpnc) = (storage.foldername(name))[2]
        and public.erp_has_permission('qualidade', 'editar')
    )
  );

commit;
-- <<<<<<<<<<<<<< <<<< 20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261101120000_erp_qualidade_certificados_dimensional.sql  (tabela ausente no banco: erp_qualidade_certificado_cotas) >>>>>>>>>>>>>>>>>>>>
begin;

create table if not exists public.erp_qualidade_certificados (
  id uuid primary key,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero_certificado text not null,
  codigo_peca text not null,
  descricao_peca text not null,
  ordem_lote text not null,
  cliente text,
  numero_serie text,
  data_inspecao date not null,
  inspetor_id uuid not null references public.erp_usuarios(id) on delete restrict,
  inspetor_nome text not null,
  desenho_storage_path text not null,
  desenho_nome text not null,
  desenho_mime text not null check (desenho_mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  observacoes text,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','APROVADO','REPROVADO')),
  created_by uuid not null references public.erp_usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_certificados_empresa_numero_uq unique (empresa_id, numero_certificado),
  constraint erp_qualidade_certificados_empresa_id_uq unique (empresa_id, id),
  constraint erp_qualidade_certificados_codigo_ck check (length(btrim(codigo_peca)) between 1 and 80),
  constraint erp_qualidade_certificados_descricao_ck check (length(btrim(descricao_peca)) between 1 and 200),
  constraint erp_qualidade_certificados_ordem_ck check (length(btrim(ordem_lote)) between 1 and 120),
  constraint erp_qualidade_certificados_desenho_nome_ck check (length(btrim(desenho_nome)) between 1 and 200)
);

create table if not exists public.erp_qualidade_certificado_cotas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  certificado_id uuid not null,
  identificador text not null,
  descricao text not null,
  nominal_mm numeric(14,5) not null check (nominal_mm >= 0),
  minimo_mm numeric(14,5) not null check (minimo_mm >= 0),
  maximo_mm numeric(14,5) not null check (maximo_mm >= minimo_mm),
  medido_mm numeric(14,5) check (medido_mm is null or medido_mm >= 0),
  resultado text generated always as (
    case
      when medido_mm is null then 'PENDENTE'
      when medido_mm between minimo_mm and maximo_mm then 'APROVADO'
      else 'REPROVADO'
    end
  ) stored,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_certificado_cotas_certificado_fk
    foreign key (empresa_id, certificado_id)
    references public.erp_qualidade_certificados(empresa_id, id) on delete cascade,
  constraint erp_qualidade_certificado_cotas_identificador_ck
    check (length(btrim(identificador)) between 1 and 40),
  constraint erp_qualidade_certificado_cotas_descricao_ck
    check (length(btrim(descricao)) between 1 and 120),
  constraint erp_qualidade_certificado_cotas_intervalo_ck
    check (minimo_mm <= nominal_mm and nominal_mm <= maximo_mm)
);

create index if not exists idx_erp_qualidade_certificados_empresa_data
  on public.erp_qualidade_certificados (empresa_id, data_inspecao desc, created_at desc);
create index if not exists idx_erp_qualidade_certificado_cotas_certificado
  on public.erp_qualidade_certificado_cotas (empresa_id, certificado_id);

alter table public.erp_qualidade_certificados enable row level security;
alter table public.erp_qualidade_certificado_cotas enable row level security;

drop policy if exists erp_qualidade_certificados_select on public.erp_qualidade_certificados;
create policy erp_qualidade_certificados_select
  on public.erp_qualidade_certificados for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade','ver'));

drop policy if exists erp_qualidade_certificado_cotas_select on public.erp_qualidade_certificado_cotas;
create policy erp_qualidade_certificado_cotas_select
  on public.erp_qualidade_certificado_cotas for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade','ver'));

grant select on public.erp_qualidade_certificados, public.erp_qualidade_certificado_cotas to authenticated;
revoke insert, update, delete on public.erp_qualidade_certificados, public.erp_qualidade_certificado_cotas from anon, authenticated;

drop trigger if exists trg_erp_qualidade_certificados_audit on public.erp_qualidade_certificados;
create trigger trg_erp_qualidade_certificados_audit
  after insert or update or delete on public.erp_qualidade_certificados
  for each row execute function public.erp_sgq_auditar_mutacao();

drop trigger if exists trg_erp_qualidade_certificado_cotas_audit on public.erp_qualidade_certificado_cotas;
create trigger trg_erp_qualidade_certificado_cotas_audit
  after insert or update or delete on public.erp_qualidade_certificado_cotas
  for each row execute function public.erp_sgq_auditar_mutacao();

create or replace function public.erp_qualidade_certificado_criar(
  p_certificado_id uuid,
  p_codigo_peca text,
  p_descricao_peca text,
  p_ordem_lote text,
  p_data_inspecao date,
  p_cliente text,
  p_numero_serie text,
  p_observacoes text,
  p_desenho_storage_path text,
  p_desenho_nome text,
  p_desenho_mime text,
  p_cotas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, storage, pg_temp
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_numero bigint;
  v_chave text;
  v_numero_certificado text;
  v_item jsonb;
  v_identificador text;
  v_descricao text;
  v_nominal numeric;
  v_minimo numeric;
  v_maximo numeric;
  v_medido numeric;
  v_aprovadas integer := 0;
  v_reprovadas integer := 0;
  v_pendentes integer := 0;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not public.erp_has_permission('qualidade','criar') then
    raise exception 'Sem permissão para criar certificado de qualidade.';
  end if;
  if p_certificado_id is null then raise exception 'Identificador do certificado inválido.'; end if;

  select * into v_usuario
  from public.erp_usuarios
  where auth_user_id = auth.uid()
    and empresa_id = v_empresa
    and ativo = true
    and deleted_at is null
  limit 1;
  if not found then raise exception 'Perfil ERP ativo da empresa não encontrado.'; end if;

  if nullif(btrim(p_codigo_peca),'') is null or length(btrim(p_codigo_peca)) > 80 then
    raise exception 'Informe o código da peça (até 80 caracteres).';
  end if;
  if nullif(btrim(p_descricao_peca),'') is null or length(btrim(p_descricao_peca)) > 200 then
    raise exception 'Informe a descrição da peça (até 200 caracteres).';
  end if;
  if nullif(btrim(p_ordem_lote),'') is null or length(btrim(p_ordem_lote)) > 120 then
    raise exception 'Informe a ordem de produção ou lote (até 120 caracteres).';
  end if;
  if p_data_inspecao is null then raise exception 'Informe a data da inspeção.'; end if;
  if nullif(btrim(p_desenho_storage_path),'') is null
     or split_part(p_desenho_storage_path,'/',1) <> v_empresa::text
     or split_part(p_desenho_storage_path,'/',2) <> p_certificado_id::text
     or array_length(string_to_array(p_desenho_storage_path,'/'),1) <> 3 then
    raise exception 'O desenho não está no caminho privado deste certificado.';
  end if;
  if p_desenho_mime not in ('image/jpeg','image/png','image/webp','application/pdf') then
    raise exception 'Formato do desenho não permitido.';
  end if;
  if nullif(btrim(p_desenho_nome),'') is null or length(btrim(p_desenho_nome)) > 200 then
    raise exception 'Nome do desenho inválido.';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'qualidade-certificados'
      and o.name = p_desenho_storage_path
  ) then
    raise exception 'O arquivo do desenho não foi enviado ao armazenamento privado.';
  end if;
  if jsonb_typeof(p_cotas) <> 'array' or jsonb_array_length(p_cotas) < 1 or jsonb_array_length(p_cotas) > 100 then
    raise exception 'Informe de 1 a 100 cotas para o certificado.';
  end if;

  v_chave := 'CERT-QUAL-' || to_char(p_data_inspecao,'YYYY');
  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
  values (v_empresa, v_chave, 1)
  on conflict (empresa_id, chave)
  do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
  returning proximo_valor into v_numero;
  v_numero_certificado := 'CQ-' || to_char(p_data_inspecao,'YYYY') || '-' || lpad(v_numero::text,6,'0');

  insert into public.erp_qualidade_certificados (
    id, empresa_id, numero_certificado, codigo_peca, descricao_peca, ordem_lote,
    cliente, numero_serie, data_inspecao, inspetor_id, inspetor_nome,
    desenho_storage_path, desenho_nome, desenho_mime, observacoes, created_by
  ) values (
    p_certificado_id, v_empresa, v_numero_certificado, btrim(p_codigo_peca), btrim(p_descricao_peca),
    btrim(p_ordem_lote), nullif(btrim(p_cliente),''), nullif(btrim(p_numero_serie),''), p_data_inspecao,
    v_usuario.id, v_usuario.nome, p_desenho_storage_path, btrim(p_desenho_nome), p_desenho_mime,
    nullif(btrim(p_observacoes),''), v_usuario.id
  );

  for v_item in select value from jsonb_array_elements(p_cotas)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item->'nominal') <> 'number'
       or jsonb_typeof(v_item->'minimo') <> 'number'
       or jsonb_typeof(v_item->'maximo') <> 'number'
       or (v_item->'medido' is not null and jsonb_typeof(v_item->'medido') not in ('number','null')) then
      raise exception 'Uma cota contém valores numéricos inválidos.';
    end if;
    v_identificador := btrim(coalesce(v_item->>'identificador',''));
    v_descricao := btrim(coalesce(v_item->>'descricao',''));
    v_nominal := (v_item->>'nominal')::numeric;
    v_minimo := (v_item->>'minimo')::numeric;
    v_maximo := (v_item->>'maximo')::numeric;
    v_medido := case when jsonb_typeof(v_item->'medido') = 'number' then (v_item->>'medido')::numeric else null end;
    if length(v_identificador) not between 1 and 40 then raise exception 'Cada cota precisa de identificação (até 40 caracteres).'; end if;
    if length(v_descricao) not between 1 and 120 then raise exception 'Cada cota precisa de descrição (até 120 caracteres).'; end if;
    if v_minimo < 0 or v_minimo > v_nominal or v_nominal > v_maximo or (v_medido is not null and v_medido < 0) then
      raise exception 'Confira nominal, limites e medição: mínimo ≤ nominal ≤ máximo.';
    end if;

    insert into public.erp_qualidade_certificado_cotas (
      empresa_id, certificado_id, identificador, descricao, nominal_mm, minimo_mm, maximo_mm, medido_mm
    ) values (
      v_empresa, p_certificado_id, v_identificador, v_descricao, v_nominal, v_minimo, v_maximo, v_medido
    );

    if v_medido is null then
      v_pendentes := v_pendentes + 1;
    elsif v_medido between v_minimo and v_maximo then
      v_aprovadas := v_aprovadas + 1;
    else
      v_reprovadas := v_reprovadas + 1;
    end if;
  end loop;

  v_status := case when v_reprovadas > 0 then 'REPROVADO' when v_pendentes > 0 then 'PENDENTE' else 'APROVADO' end;
  update public.erp_qualidade_certificados set status = v_status
  where id = p_certificado_id and empresa_id = v_empresa;

  return jsonb_build_object(
    'id', p_certificado_id,
    'empresa_id', v_empresa,
    'numero_certificado', v_numero_certificado,
    'codigo_peca', btrim(p_codigo_peca),
    'descricao_peca', btrim(p_descricao_peca),
    'ordem_lote', btrim(p_ordem_lote),
    'cliente', nullif(btrim(p_cliente),''),
    'numero_serie', nullif(btrim(p_numero_serie),''),
    'data_inspecao', p_data_inspecao,
    'inspetor_nome', v_usuario.nome,
    'desenho_storage_path', p_desenho_storage_path,
    'desenho_nome', btrim(p_desenho_nome),
    'desenho_mime', p_desenho_mime,
    'observacoes', nullif(btrim(p_observacoes),''),
    'status', v_status,
    'aprovadas', v_aprovadas,
    'reprovadas', v_reprovadas,
    'pendentes', v_pendentes
  );
end
$$;

revoke all on function public.erp_qualidade_certificado_criar(uuid,text,text,text,date,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.erp_qualidade_certificado_criar(uuid,text,text,text,date,text,text,text,text,text,text,jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qualidade-certificados',
  'qualidade-certificados',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists qualidade_certificados_storage_select on storage.objects;
create policy qualidade_certificados_storage_select on storage.objects
  for select to authenticated using (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and public.erp_has_permission('qualidade','ver')
  );

drop policy if exists qualidade_certificados_storage_insert on storage.objects;
create policy qualidade_certificados_storage_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and public.erp_has_permission('qualidade','criar')
  );

drop policy if exists qualidade_certificados_storage_delete on storage.objects;
create policy qualidade_certificados_storage_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and (public.erp_has_permission('qualidade','criar') or public.erp_has_permission('qualidade','editar'))
  );

commit;
-- <<<<<<<<<<<<<< <<<< 20261101120000_erp_qualidade_certificados_dimensional.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261102031000_erp_fiscal_liberacao_item_pedido_v1.sql  (tabela ausente no banco: erp_fiscal_liberacoes_pedido_item) >>>>>>>>>>>>>>>>>>>>
-- 20261102031000_erp_fiscal_liberacao_item_pedido_v1.sql
-- A tela Fiscal (src/pages/Fiscal.tsx) libera itens de pedido de venda pela rotina
-- erp_liberar_item_fiscal e lê o razão de liberações em erp_fiscal_liberacoes_pedido_item. As duas
-- migrations 20260921180000 e 20260925170000 já fazem revoke/grant execute dessa função, o que prova que
-- ela existe no banco em produção, mas o CREATE nunca entrou no repo: em um banco novo a tela ficava sem
-- a rotina e sem a tabela. Este arquivo recria o contrato para ambientes novos.
-- Guarda intencional: se a função já existe, ela NÃO é substituída (não sobrescrever comportamento do
-- cliente que já funciona). A tabela é criada apenas se não existir. Nada aqui apaga pedido ou documento.

begin;

create table if not exists public.erp_fiscal_liberacoes_pedido_item (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  pedido_id uuid not null,
  pedido_item_id uuid not null,
  quantidade numeric(18,4) not null check (quantidade > 0),
  tipo text not null default 'parcial' check (tipo in ('total','parcial')),
  observacao text,
  liberado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists ix_erp_fiscal_liberacoes_item on public.erp_fiscal_liberacoes_pedido_item(empresa_id, pedido_item_id);
create index if not exists ix_erp_fiscal_liberacoes_pedido on public.erp_fiscal_liberacoes_pedido_item(empresa_id, pedido_id);

alter table public.erp_fiscal_liberacoes_pedido_item enable row level security;

drop policy if exists erp_fiscal_liberacoes_pedido_item_tenant on public.erp_fiscal_liberacoes_pedido_item;
create policy erp_fiscal_liberacoes_pedido_item_tenant on public.erp_fiscal_liberacoes_pedido_item
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

grant select, insert on public.erp_fiscal_liberacoes_pedido_item to authenticated;

do $mig$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'erp_liberar_item_fiscal'
  ) then
    raise notice 'erp_liberar_item_fiscal ja existe neste banco; corpo preservado.';
  else
    execute $fn$
      create or replace function public.erp_liberar_item_fiscal(
        p_pedido_item_id uuid,
        p_quantidade numeric,
        p_tipo text,
        p_observacao text
      )
      returns jsonb
      language plpgsql
      security invoker
      set search_path = public
      as $body$
      declare
        v_empresa_id uuid := public.erp_current_empresa_id();
        v_uid uuid := (select auth.uid());
        v_item public.erp_pedidos_venda_itens%rowtype;
        v_liberado numeric(18,4) := 0;
        v_saldo numeric(18,4);
        v_tipo text := case when trim(coalesce(p_tipo,'')) = 'total' then 'total' else 'parcial' end;
      begin
        if v_empresa_id is null then raise exception 'Sessão não autenticada com empresa vinculada'; end if;
        if p_pedido_item_id is null then raise exception 'Item do pedido não informado'; end if;
        if p_quantidade is null or p_quantidade <= 0 then raise exception 'Quantidade liberada deve ser maior que zero'; end if;

        select * into v_item
        from public.erp_pedidos_venda_itens
        where id = p_pedido_item_id and empresa_id = v_empresa_id
        limit 1;

        if not found then raise exception 'Item não encontrado para esta empresa'; end if;

        select coalesce(sum(l.quantidade), 0)::numeric(18,4) into v_liberado
        from public.erp_fiscal_liberacoes_pedido_item l
        where l.pedido_item_id = p_pedido_item_id and l.empresa_id = v_empresa_id;

        v_saldo := coalesce(v_item.quantidade, 0) - v_liberado;

        if v_saldo <= 0 then raise exception 'Este item já está totalmente liberado'; end if;
        if p_quantidade > v_saldo then
          raise exception 'Quantidade maior que o saldo pendente (%)', v_saldo;
        end if;

        insert into public.erp_fiscal_liberacoes_pedido_item(
          empresa_id, pedido_id, pedido_item_id, quantidade, tipo, observacao, liberado_por
        ) values (
          v_empresa_id, v_item.pedido_id, p_pedido_item_id, p_quantidade, v_tipo,
          nullif(trim(coalesce(p_observacao,'')), ''), v_uid
        );

        return jsonb_build_object(
          'pedido_item_id', p_pedido_item_id,
          'liberado_agora', p_quantidade,
          'liberado_total', v_liberado + p_quantidade,
          'saldo_restante', v_saldo - p_quantidade,
          'tipo', case when (v_saldo - p_quantidade) <= 0 then 'total' else v_tipo end,
          'liberado_em', now()
        );
      end;
      $body$;
    $fn$;
  end if;
end
$mig$;

revoke execute on function public.erp_liberar_item_fiscal(uuid, numeric, text, text) from public, anon;
grant execute on function public.erp_liberar_item_fiscal(uuid, numeric, text, text) to authenticated;

commit;
-- <<<<<<<<<<<<<< <<<< 20261102031000_erp_fiscal_liberacao_item_pedido_v1.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261103140000_repair_centrais_rest_schema_v1.sql  (tabela ausente no banco: erp_bom_revisoes) >>>>>>>>>>>>>>>>>>>>
-- SYSNQRA ERP INDUSTRIAL
-- Autor: FernandoSch
-- Revisão: REV-CONTRATO-BANCO-20261103-02
--
-- Reconciliação idempotente das tabelas que as telas consultam e que nenhuma migration
-- deste repositório cria (verificado: nenhuma menção de DDL fora de corpo de função).
-- create table if not exists + add column if not exists: se a tabela já existir no banco
-- vivo, este arquivo não destrói nada e apenas acrescenta as colunas que faltarem.
-- Não insere dados de exemplo. Não toca em tabelas que já possuem versão real no schema
-- (paradas, refugos, treinamentos e auditorias têm tabelas próprias e as telas foram
-- reapontadas para elas no mesmo incremento de código).

-- ── 1. Almoxarifados (BalancoEstoque, EstoqueAlmoxarifadoCompact) ─────────────
create table if not exists public.erp_almoxarifados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  nome text not null,
  tipo text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_almoxarifados_codigo_uq unique (empresa_id, codigo)
);
alter table public.erp_almoxarifados
  add column if not exists tipo text,
  add column if not exists ativo boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_almoxarifados_empresa_ativo
  on public.erp_almoxarifados (empresa_id, ativo, codigo);

-- ── 2. Contas a pagar (CentraisIndustriais financeiro, Fiscal) ────────────────
create table if not exists public.erp_contas_pagar (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  descricao text not null,
  documento text,
  valor numeric(14,2) not null default 0,
  vencimento date,
  pagamento date,
  status text not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_contas_pagar
  add column if not exists documento text,
  add column if not exists pagamento date,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_contas_pagar_empresa_vencimento
  on public.erp_contas_pagar (empresa_id, vencimento, status);

-- ── 3. Contas a receber (Fiscal) ─────────────────────────────────────────────
create table if not exists public.erp_contas_receber (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  descricao text not null,
  documento text,
  valor numeric(14,2) not null default 0,
  vencimento date,
  recebimento date,
  status text not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_contas_receber
  add column if not exists documento text,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_contas_receber_empresa_vencimento
  on public.erp_contas_receber (empresa_id, vencimento, status);

-- ── 4. Lançamentos financeiros (FiscalPrevisaoCaixa, IndustrialModuleWorkspace) ─
create table if not exists public.erp_financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  tipo text not null default 'despesa',
  categoria text,
  descricao text not null,
  valor numeric(14,2) not null default 0,
  vencimento date,
  status text not null default 'aberto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_financeiro_lancamentos
  add column if not exists categoria text,
  add column if not exists vencimento date,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_financeiro_lancamentos_empresa_vencimento
  on public.erp_financeiro_lancamentos (empresa_id, vencimento, status);

-- ── 5. Revisões de BOM (EngenhariaRevisoesBOM) ───────────────────────────────
create table if not exists public.erp_bom_revisoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete cascade,
  versao text not null,
  engenheiro text,
  motivo text,
  created_at timestamptz not null default now()
);
alter table public.erp_bom_revisoes
  add column if not exists engenheiro text,
  add column if not exists motivo text;
create index if not exists idx_erp_bom_revisoes_produto_data
  on public.erp_bom_revisoes (empresa_id, produto_id, created_at desc);

-- ── 6. Planos de inspeção (FichaEngenharia, QualidadeInspecaoProcesso) ───────
create table if not exists public.erp_planos_inspecao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  produto_id uuid references public.erp_produtos(id) on delete cascade,
  codigo text not null,
  caracteristica text not null,
  unidade text,
  limite_inferior numeric(18,6),
  limite_superior numeric(18,6),
  frequencia text not null default '100%',
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_planos_inspecao
  add column if not exists unidade text,
  add column if not exists limite_inferior numeric(18,6),
  add column if not exists limite_superior numeric(18,6),
  add column if not exists frequencia text not null default '100%',
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_planos_inspecao_empresa_produto
  on public.erp_planos_inspecao (empresa_id, produto_id, codigo);

-- ── 7. Anexos de documentos e fotos (upload da máquina, molde, produto, SGQ) ──
create table if not exists public.erp_documentos_anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  entidade_tipo text not null,
  entidade_id uuid not null,
  nome_arquivo text not null,
  storage_path text,
  mime_type text,
  tamanho_bytes bigint,
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_documentos_anexos_entidade
  on public.erp_documentos_anexos (empresa_id, entidade_tipo, entidade_id, created_at desc);

-- ── 8. Alertas do sistema (contadores do cabeçalho e do painel da diretoria) ──
-- Somente leitura no aplicativo: nenhuma tela insere aqui. A tabela existiu sempre
-- fora das migrations, então o hook de realtime recebia erro de relação inexistente.
create table if not exists public.erp_alertas_sistema (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  tipo_alerta text not null,
  status text not null default 'ATIVO',
  descricao text,
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_alertas_sistema_empresa_status
  on public.erp_alertas_sistema (empresa_id, status, tipo_alerta);

-- ── RLS: isolamento por empresa em todas as tabelas acima ────────────────────
alter table public.erp_almoxarifados enable row level security;
alter table public.erp_contas_pagar enable row level security;
alter table public.erp_contas_receber enable row level security;
alter table public.erp_financeiro_lancamentos enable row level security;
alter table public.erp_bom_revisoes enable row level security;
alter table public.erp_planos_inspecao enable row level security;
alter table public.erp_documentos_anexos enable row level security;
alter table public.erp_alertas_sistema enable row level security;

drop policy if exists erp_almoxarifados_tenant on public.erp_almoxarifados;
create policy erp_almoxarifados_tenant on public.erp_almoxarifados
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_contas_pagar_tenant on public.erp_contas_pagar;
create policy erp_contas_pagar_tenant on public.erp_contas_pagar
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_contas_receber_tenant on public.erp_contas_receber;
create policy erp_contas_receber_tenant on public.erp_contas_receber
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_financeiro_lancamentos_tenant on public.erp_financeiro_lancamentos;
create policy erp_financeiro_lancamentos_tenant on public.erp_financeiro_lancamentos
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_bom_revisoes_tenant on public.erp_bom_revisoes;
create policy erp_bom_revisoes_tenant on public.erp_bom_revisoes
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_planos_inspecao_tenant on public.erp_planos_inspecao;
create policy erp_planos_inspecao_tenant on public.erp_planos_inspecao
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_documentos_anexos_tenant on public.erp_documentos_anexos;
create policy erp_documentos_anexos_tenant on public.erp_documentos_anexos
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_alertas_sistema_tenant on public.erp_alertas_sistema;
create policy erp_alertas_sistema_tenant on public.erp_alertas_sistema
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

notify pgrst, 'reload schema';
-- <<<<<<<<<<<<<< <<<< 20261103140000_repair_centrais_rest_schema_v1.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261104190000_repair_updated_em_exigido_pela_trigger.sql  (reparo de defeito denunciado pelo proprio banco) >>>>>>>>>>>>>>>>>>>>
-- SYSNQRA ERP INDUSTRIAL — REPARO DO CARIMBO updated_em EXIGIDO PELO BANCO
-- Autor: FernandoSch | 2026-11-04
--
-- Defeito relatado pelo proprietario em 2026-11-04: ao gravar o apontamento no
-- Chao de Fabrica (PCPTabletOperador / PCPExecucaoIndustrial / Portal do Operador),
-- o Supabase devolve
--   "column \"updated_em\" of relation \"erp_apontamentos_processo\" does not exist"
-- e, na sequencia, a MESMA coluna faltando em "erp_pcp_programacoes".
--
-- Causa: a string updated_em NAO existe em nenhum arquivo do frontend nem das
-- migrations deste repo (as telas enviam inicio_em/fim_em/quantidade_* e o banco
-- carimba criado_em por default). Essa frase, com sqlstate 42703, so nasce dentro
-- do proprio Postgres: algum objeto do banco (gatilho ou funcao/RPC com INSERT ou
-- UPDATE explicito) nomeia a coluna updated_em numa tabela que nao a tem. Toda
-- escrita na tabela falha por isso, mesmo com o codigo das telas correto.
--
-- Reparacao: criar a coluna exigida, apenas em tabelas reais do schema publico.
-- Nao apaga nem altera trigger nem funcao, nao remove coluna, nao toca em dado
-- existente. Idempotente: pode ser aplicada mais de uma vez sem efeito colateral.

begin;

-- Passo 1 — as duas tabelas onde o defeito foi observado, reparo incondicional.
-- IF EXISTS protege ambiente novo onde a tabela ainda nem foi criada pelo nucleo;
-- ADD COLUMN IF NOT EXISTS protege contra dupla aplicacao desta migration.
alter table if exists public.erp_apontamentos_processo
  add column if not exists updated_em timestamptz not null default now();

comment on column public.erp_apontamentos_processo.updated_em is
  'Carimbo exigido por objeto do banco (gatilho ou funcao) nas gravacoes de apontamento; criado em 2026-11-04 para destravar INSERT/UPDATE das telas.';

alter table if exists public.erp_pcp_programacoes
  add column if not exists updated_em timestamptz not null default now();

comment on column public.erp_pcp_programacoes.updated_em is
  'Carimbo exigido por objeto do banco (gatilho ou funcao) nas gravacoes de programacao do PCP; criado em 2026-11-04 para destravar INSERT/UPDATE das telas.';

-- Passo 2 — varredura por GATILHO: toda tabela do schema publico cuja funcao de
-- trigger escreve updated_em e nao tem a coluna recebe a coluna.
-- Usa pg_attribute (catalogo do sistema), porque information_schema so enxerga
-- objetos visiveis ao papel atual e poderia esconder a coluna ja existente.
do $$
declare
  r record;
  aplicadas integer := 0;
begin
  for r in
    select tg.tgrelid::regclass::text as tabela,
           min(p.proname)              as funcao_trigger,
           min(tg.tgname)              as nome_trigger
      from pg_trigger tg
      join pg_proc p on p.oid = tg.tgfoid
      join pg_class c on c.oid = tg.tgrelid
      join pg_namespace ns on ns.oid = c.relnamespace
     where ns.nspname = 'public'
       and c.relkind in ('r','p')
       and not tg.tgisinternal
       and p.prosrc ilike '%updated_em%'
       and not exists (
             select 1
               from pg_attribute a
              where a.attrelid = tg.tgrelid
                and a.attname = 'updated_em'
                and a.attnum > 0
                and not a.attisdropped)
     group by tg.tgrelid
  loop
    execute format('alter table %s add column if not exists updated_em timestamptz not null default now()', r.tabela);
    execute format('comment on column %s.updated_em is %L', r.tabela, 'Carimbo exigido pela trigger ' || r.nome_trigger || ' (' || r.funcao_trigger || '); adicionado em 2026-11-04.');
    raise notice 'SYSNQRA_REPARO_GATILHO | % | coluna updated_em criada | trigger % (%)', r.tabela, r.nome_trigger, r.funcao_trigger;
    aplicadas := aplicadas + 1;
  end loop;

  if aplicadas = 0 then
    raise notice 'SYSNQRA_REPARO_GATILHO | nenhuma trigger exigiu coluna nova';
  end if;
end
$$;

-- Passo 3 — varredura por FUNCAO/RPC: um INSERT ou UPDATE escrito dentro de uma
-- funcao (inclusive SECURITY DEFINER, chamada pelas telas via RPC) tambem produz
-- o erro 42703. Aqui se procura a tabela qualificada no corpo da funcao e so
-- entra na reparacao a funcao que cita updated_em no mesmo corpo.
do $$
declare
  r record;
  aplicadas integer := 0;
begin
  for r in
    select tgt.oid::regclass::text as tabela,
           min(p.proname)          as funcao
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
      cross join lateral regexp_matches(p.prosrc, 'public\.(erp_[a-z0-9_]+)', 'g') as m(tbl)
      join pg_class tgt on tgt.relname = m.tbl
      join pg_namespace tns on tns.oid = tgt.relnamespace
     where ns.nspname = 'public'
       and tns.nspname = 'public'
       and tgt.relkind in ('r','p')
       and p.prosrc ilike '%updated_em%'
       and not exists (
             select 1
               from pg_attribute a
              where a.attrelid = tgt.oid
                and a.attname = 'updated_em'
                and a.attnum > 0
                and not a.attisdropped)
     group by tgt.oid
  loop
    execute format('alter table %s add column if not exists updated_em timestamptz not null default now()', r.tabela);
    execute format('comment on column %s.updated_em is %L', r.tabela, 'Carimbo exigido pela funcao ' || r.funcao || '; adicionado em 2026-11-04.');
    raise notice 'SYSNQRA_REPARO_FUNCAO | % | coluna updated_em criada | funcao %', r.tabela, r.funcao;
    aplicadas := aplicadas + 1;
  end loop;

  if aplicadas = 0 then
    raise notice 'SYSNQRA_REPARO_FUNCAO | nenhuma funcao exigiu coluna nova';
  end if;
end
$$;

commit;

-- Depois do DDL o PostgREST recarrega o cache de schema; a notify garante que as
-- telas passem a ver a coluna nova sem esperar o proximo evento automatico.
notify pgrst, 'reload schema';

-- Diagnostico do resultado (cole a saida no chat):
select '1_coluna_updated_em_apontamentos' as verificacao,
       case when to_regclass('public.erp_apontamentos_processo') is null
            then 'TABELA_NAO_EXISTE_NESTE_BANCO'
            when exists (select 1 from pg_attribute a
                          where a.attrelid = 'public.erp_apontamentos_processo'::regclass
                            and a.attname = 'updated_em' and a.attnum > 0 and not a.attisdropped)
            then 'EXISTE' else 'NAO_EXISTE' end as resultado
union all
select '2_coluna_updated_em_programacoes',
       case when to_regclass('public.erp_pcp_programacoes') is null
            then 'TABELA_NAO_EXISTE_NESTE_BANCO'
            when exists (select 1 from pg_attribute a
                          where a.attrelid = 'public.erp_pcp_programacoes'::regclass
                            and a.attname = 'updated_em' and a.attnum > 0 and not a.attisdropped)
            then 'EXISTE' else 'NAO_EXISTE' end
union all
select '3_objetos_que_ainda_exigem_updated_em_sem_coluna',
       coalesce(string_agg(x, ' | ' order by x), 'nenhum')
  from (
        select tg.tgrelid::regclass::text || ' <- trigger ' || p.proname as x
          from pg_trigger tg
          join pg_proc p on p.oid = tg.tgfoid
          join pg_class c on c.oid = tg.tgrelid
          join pg_namespace ns on ns.oid = c.relnamespace
         where ns.nspname = 'public'
           and c.relkind in ('r','p')
           and not tg.tgisinternal
           and p.prosrc ilike '%updated_em%'
           and not exists (select 1 from pg_attribute a
                            where a.attrelid = tg.tgrelid
                              and a.attname = 'updated_em' and a.attnum > 0 and not a.attisdropped)
        union all
        select p.proname || ' <- funcao que cita ' || tgt.oid::regclass::text as x
          from pg_proc p
          join pg_namespace ns on ns.oid = p.pronamespace
          cross join lateral regexp_matches(p.prosrc, 'public\.(erp_[a-z0-9_]+)', 'g') as m(tbl)
          join pg_class tgt on tgt.relname = m.tbl
          join pg_namespace tns on tns.oid = tgt.relnamespace
         where ns.nspname = 'public'
           and tns.nspname = 'public'
           and tgt.relkind in ('r','p')
           and p.prosrc ilike '%updated_em%'
           and not exists (select 1 from pg_attribute a
                            where a.attrelid = tgt.oid
                              and a.attname = 'updated_em' and a.attnum > 0 and not a.attisdropped)
      ) y
union all
select '4_gatilhos_da_tabela_de_apontamento',
       coalesce(string_agg(tg.tgname || ' -> ' || p.proname, ' | ' order by tg.tgname), 'nenhum')
  from pg_trigger tg
  join pg_proc p on p.oid = tg.tgfoid
 where tg.tgrelid = to_regclass('public.erp_apontamentos_processo')
   and not tg.tgisinternal
union all
select '5_politicas_de_isolamento_apontamento',
       coalesce(string_agg(pol.polname, ' | ' order by pol.polname), 'nenhuma')
  from pg_policy pol
 where pol.polrelid = to_regclass('public.erp_apontamentos_processo')
union all
select '6_grant_de_escrita_apontamento',
       coalesce(string_agg(tp.grantee || ':' || tp.privilege_type, ' | ' order by tp.grantee, tp.privilege_type), 'nenhum')
  from information_schema.table_privileges tp
 where tp.table_schema = 'public'
   and tp.table_name = 'erp_apontamentos_processo'
   and tp.privilege_type in ('INSERT','UPDATE','DELETE');
-- <<<<<<<<<<<<<< <<<< 20261104190000_repair_updated_em_exigido_pela_trigger.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261104200000_repair_central_custos_tabela_e_isolamento.sql  (reparo de defeito denunciado pelo proprio banco) >>>>>>>>>>>>>>>>>>>>
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
-- <<<<<<<<<<<<<< <<<< 20261104200000_repair_central_custos_tabela_e_isolamento.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261106120000_erp_fmea_plano_controle_aiag_v1.sql  (tabela ausente no banco: erp_fmea_cabecalho) >>>>>>>>>>>>>>>>>>>>
-- SYSNQRA ERP INDUSTRIAL — FMEA (AIAG) e Plano de Controle (AIAG) com QR Code
-- @AUTOR: FernandoSch
-- @DATA_REVISAO_APROVACAO: 2026-11-06
-- @REVISAO: REV-FMEA-PLANO-CONTROLE-20261106-01
-- @STATUS_APROVACAO: ORDEM MASTER DE EXECUCAO EM 2026-11-06 — "CPP digital e impresso com QR Code",
--   "FMEA" e "Inspeções / RPNC / Plano de Controle" integram a lista de módulos a concluir.
--
-- Fonte do modelo: pasta de trabalho enviada pelo proprietário em 2026-10-23
-- (FMEA-TAMPA VRLA AGM NOBREAK.xlsm), que tem exatamente duas abas: "FMEA" e "Plano de Controle",
-- no formato AIAG. As colunas abaixo reproduzem aquela pasta, campo a campo. Nada foi inventado.
--
-- Decisão de esquema (registrada para a auditoria):
--   * A tabela de linhas do FMEA continua sendo public.qualidade_fmea, que JÁ EXISTE na base viva e
--     é lida pelo sistema (qualidade/FMEA.tsx, QualidadeCentralTablet.tsx,
--     IndustrialDataWorkspace.tsx). Criar uma segunda tabela de FMEA
--     duplicaria a origem oficial, o que a ordem permanente dele proíbe.
--   * public.erp_fmea (migration 20260925133000_fmea_process_v1.sql) NÃO está aplicada na base viva
--     (probe: PGRST205) e nenhum arquivo do sistema a consulta. Ela fica marcada como superada por
--     esta migration; não é deletada aqui porque exclusão de tabela é operação destrutiva e exige
--     aprovação explícita do proprietário.
--   * Cabeçalho do FMEA e as duas tabelas do Plano de Controle são novas e usam o prefixo erp_.

-- ============================ CABEÇALHO DO FMEA (aba 1 da pasta do proprietário) ============================

create table if not exists public.erp_fmea_cabecalho (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero text not null,
  tipo text not null default 'processo' check (tipo in ('processo','produto','projeto')),
  pagina integer not null default 1,
  total_paginas integer not null default 1,
  codigo_peca text not null default '',
  codigo_peca_cliente text not null default '',
  nome_peca text not null default '',
  cliente_projeto text not null default '',
  fornecedor text not null default '',
  codigo_fornecedor text not null default '',
  areas_envolvidas text not null default '',
  equipe_principal text not null default '',
  contato_principal text not null default '',
  telefone text not null default '',
  data_primeira_emissao date,
  data_revisao date,
  aprovacao_engenharia_cliente text not null default '',
  aprovacao_qualidade_cliente text not null default '',
  aprovacao_fornecedor_planta text not null default '',
  outra_aprovacao text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho','ativo','revisado','obsoleto')),
  versao integer not null default 1,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero, versao)
);

create index if not exists idx_erp_fmea_cabecalho_empresa
  on public.erp_fmea_cabecalho (empresa_id, status, data_revisao desc);

alter table public.erp_fmea_cabecalho enable row level security;
drop policy if exists erp_fmea_cabecalho_tenant on public.erp_fmea_cabecalho;
create policy erp_fmea_cabecalho_tenant on public.erp_fmea_cabecalho
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

-- ============================ LINHAS DO FMEA: colunas que faltavam na tabela viva ============================

alter table public.qualidade_fmea
  add column if not exists cabecalho_id uuid references public.erp_fmea_cabecalho(id) on delete set null,
  add column if not exists ordem integer not null default 1,
  add column if not exists funcao_requisito text not null default '',
  add column if not exists mecanismo_falha text not null default '',
  add column if not exists controle_prevencao text not null default '',
  add column if not exists controle_deteccao text not null default '',
  add column if not exists acao_recomendada text not null default '',
  add column if not exists acao_responsavel text not null default '',
  add column if not exists acao_prazo date,
  add column if not exists acao_tomada text not null default '',
  add column if not exists acao_resultado text not null default '',
  add column if not exists caracteristica_especial text not null default 'nenhuma'
    check (caracteristica_especial in ('nenhuma','critica','significativa','seguranca','regulatoria')),
  add column if not exists severidade_apos integer check (severidade_apos between 1 and 10),
  add column if not exists ocorrencia_apos integer check (ocorrencia_apos between 1 and 10),
  add column if not exists deteccao_apos integer check (deteccao_apos between 1 and 10),
  add column if not exists atualizado_por uuid;

-- NPR após a ação: mesma fórmula da planilha do proprietário (S × O × D), só que da releitura.
alter table public.qualidade_fmea
  add column if not exists npr_apos integer generated always as
    (coalesce(severidade_apos, severidade) * coalesce(ocorrencia_apos, ocorrencia) * coalesce(deteccao_apos, deteccao)) stored;

create index if not exists idx_qualidade_fmea_cabecalho
  on public.qualidade_fmea (cabecalho_id, ordem);

-- ============================ PLANO DE CONTROLE (aba 2 da pasta do proprietário) ============================

create table if not exists public.erp_plano_controle (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero text not null,
  tipo text not null default 'producao' check (tipo in ('prototipo','pre_lancamento','producao')),
  pagina integer not null default 1,
  total_paginas integer not null default 1,
  codigo_peca text not null default '',
  nome_peca text not null default '',
  fornecedor_planta text not null default '',
  codigo_fornecedor text not null default '',
  contato_principal text not null default '',
  telefone text not null default '',
  data_original date,
  data_revisao date,
  equipe_principal text not null default '',
  aprovacao_engenharia_cliente text not null default '',
  aprovacao_qualidade_cliente text not null default '',
  aprovacao_fornecedor_planta text not null default '',
  outra_aprovacao text not null default '',
  produto_id uuid,
  status text not null default 'rascunho' check (status in ('rascunho','ativo','revisado','obsoleto')),
  versao integer not null default 1,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero, versao)
);

create index if not exists idx_erp_plano_controle_empresa
  on public.erp_plano_controle (empresa_id, status, data_revisao desc);

alter table public.erp_plano_controle enable row level security;
drop policy if exists erp_plano_controle_tenant on public.erp_plano_controle;
create policy erp_plano_controle_tenant on public.erp_plano_controle
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

create table if not exists public.erp_plano_controle_linha (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  plano_id uuid not null references public.erp_plano_controle(id) on delete cascade,
  ordem integer not null default 1,
  item_numero text not null default '',
  processo_operacao_numero text not null default '',
  descricao_produto_processo text not null default '',
  caracteristica_especial text not null default '' check (caracteristica_especial in ('','critica','significativa','nenhuma')),
  maquina_dispositivo_ferramenta text not null default '',
  numero_controle text not null default '',
  metodo_manufatura text not null default '',
  padrao_avaliacao text not null default '',
  tecnica_medicao text not null default '',
  tamanho_amostra text not null default '',
  frequencia_amostra text not null default '',
  metodo_controle text not null default '',
  plano_reacao text not null default '',
  fmea_linha_id uuid references public.qualidade_fmea(id) on delete set null,
  inspecao_id uuid,
  atualizado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_erp_plano_controle_linha_plano
  on public.erp_plano_controle_linha (plano_id, ordem);
create index if not exists idx_erp_plano_controle_linha_empresa
  on public.erp_plano_controle_linha (empresa_id);

alter table public.erp_plano_controle_linha enable row level security;
drop policy if exists erp_plano_controle_linha_tenant on public.erp_plano_controle_linha;
create policy erp_plano_controle_linha_tenant on public.erp_plano_controle_linha
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

-- ============================ RPC: matriz FMEA completa (cabeçalho + linhas) ============================

create or replace function public.erp_fmea_matriz(p_cabecalho_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'cabecalho', coalesce((
      select to_jsonb(c) from public.erp_fmea_cabecalho c
      where c.id = p_cabecalho_id
        and (c.empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    ), 'null'::jsonb),
    'linhas', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.ordem, f.created_at)
      from public.qualidade_fmea f
      where f.cabecalho_id = p_cabecalho_id
        and (f.empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.erp_fmea_matriz(uuid) from public;
grant execute on function public.erp_fmea_matriz(uuid) to authenticated;

-- ============================ RPC: risco consolidado do FMEA (sem dados inventados) ============================

create or replace function public.erp_fmea_resumo(p_cabecalho_id uuid)
returns table (
  total_linhas bigint,
  npr_maximo integer,
  npr_medio numeric,
  criticas bigint,
  acoes_abertas bigint,
  acoes_concluidas bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint as total_linhas,
    max(f.npr)::integer as npr_maximo,
    round(avg(f.npr), 1) as npr_medio,
    count(*) filter (where f.caracteristica_especial in ('critica','seguranca','regulatoria'))::bigint as criticas,
    count(*) filter (where lower(f.status_acao) in ('aberta','em_andamento'))::bigint as acoes_abertas,
    count(*) filter (where lower(f.status_acao) = 'concluida')::bigint as acoes_concluidas
  from public.qualidade_fmea f
  where f.cabecalho_id = p_cabecalho_id
    and f.empresa_id = public.erp_current_empresa_id();
$$;

revoke all on function public.erp_fmea_resumo(uuid) from public;
grant execute on function public.erp_fmea_resumo(uuid) to authenticated;

-- ============================ RPC: plano de controle completo ============================

create or replace function public.erp_plano_controle_matriz(p_plano_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'plano', coalesce((select to_jsonb(p) from public.erp_plano_controle p
      where p.id = p_plano_id
        and (p.empresa_id = public.erp_current_empresa_id() or public.erp_is_master())), 'null'::jsonb),
    'linhas', coalesce((select jsonb_agg(to_jsonb(l) order by l.ordem)
      from public.erp_plano_controle_linha l
      where l.plano_id = p_plano_id
        and (l.empresa_id = public.erp_current_empresa_id() or public.erp_is_master())), '[]'::jsonb)
  );
$$;

revoke all on function public.erp_plano_controle_matriz(uuid) from public;
grant execute on function public.erp_plano_controle_matriz(uuid) to authenticated;

-- ============================ Triggers de updated_at ============================
-- Defeito corrigido nesta revisão: a versão anterior deste bloco chamava
-- public.erp_set_updated_at(), que não é criada por NENHUM arquivo deste repo (grep: apenas uma
-- revogação em 20260912_security_performance_hardening.sql:24) e não é resolvível pela API
-- (probe 2026-11-06 com publishable key: PGRST202 "Could not find the function"). Como a função
-- nunca é definida aqui, aplica-la num banco novo daria falha no CREATE TRIGGER e a migration
-- inteira pararia. A função própria é criada abaixo, com nome exclusivo, para não sobrescrever
-- objeto de outro pacote que já use esse nome no banco vivo.

create or replace function public.erp_stdq_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.erp_stdq_touch_updated_at() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['erp_fmea_cabecalho','erp_plano_controle','erp_plano_controle_linha'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.erp_stdq_touch_updated_at()', t);
  end loop;
end $$;
-- <<<<<<<<<<<<<< <<<< 20261106120000_erp_fmea_plano_controle_aiag_v1.sql >>>>

-- >>>>>>>>>>>>>>>>>>>> 20261106150000_erp_central_evolucao_v1.sql  (tabela ausente no banco: erp_central_evolucao_item) >>>>>>>>>>>>>>>>>>>>
-- SYSNQRA ERP INDUSTRIAL — CENTRAL DE EVOLUCAO E CONCLUSAO DO SISTEMA
-- @AUTOR: FernandoSch
-- @DATA_REVISAO_APROVACAO: 2026-11-06
-- @REVISAO: REV-CENTRAL-EVOLUCAO-20261106-01
-- @STATUS_APROVACAO: ORDEM DO PROPRIETARIO EM 2026-11-06 — "VC JA TEM SUAS ORDENS PEGAR TODOS A
--   REALIZAR TODAS E APLICAR TODAS NO SISTEMA DEIXANDO ELE PRONTO" e "SÓ PARA QUANDO TODAS AS TELAS
--   ESTIVEREM PRONTO E APLICADAS NO SISTEMA". A ORDEM MASTER de 2026-11-06 pede a tela
--   "Central de Evolução e Conclusão do SYSNQRA" com filtros por setor/prioridade/situação,
--   historico de mudanca de status e relatorio A4.
--
-- O que esta tabela NÃO é: não é quadro de indicador inventado e não contém dado de produção.
-- Cada linha do seed abaixo é um pendencia real medida neste repo ou no banco vivo em 2026-11-06,
-- com a evidencia escrita na proprio "evidencia". Nada aqui foi preenchido por suposição.
--
-- Escopo das linhas (decisão registrada para a auditoria dele):
--   * empresa_id NULL = item do PRODUTO SYSNQRA (agenda de conclusao do sistema, igual para todas
--     as empresas). Só o MASTER validado no cadastro ERP enxerga e edita esses itens, porque a
--     policy aprovada é "empresa_id = public.erp_current_empresa_id() or public.erp_is_master()" e
--     NULL nunca iguala o uuid da sessão.
--   * empresa_id preenchido = item de implantação daquela empresa (o que falta para aquele cliente).
--     Nenhuma linha do seed usa empresa_id: não há como saber a empresa sem ler o banco autenticado,
--     e inventar uuid viola a regra dele.
--   * Nenhum INSERT do seed toca em tabela existente: são só linhas novas na tabela criada aqui.

-- ============================ FUNÇÃO DE CARIMBO (autossuficiente) ============================
-- O bloco abaixo repete, com corpo idêntico, a função criada em
-- 20261106120000_erp_fmea_plano_controle_aiag_v1.sql. Ela é recriada aqui para esta migration
-- aplicar sozinha num banco novo. Nome exclusivo: não sobrescreve objeto de outro pacote.

create or replace function public.erp_stdq_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.erp_stdq_touch_updated_at() from public, anon, authenticated;

-- ============================ ITENS ============================

create table if not exists public.erp_central_evolucao_item (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  titulo text not null,
  descricao text not null default '',
  setor text not null default 'geral',
  modulo text not null default '',
  tipo text not null default 'acao' check (tipo in ('acao','defeito','melhoria','pendencia_proprietario','auditoria')),
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','critica')),
  situacao text not null default 'pendente' check (situacao in ('pendente','em_andamento','concluido','bloqueado','nao_aplicavel')),
  responsavel text not null default '',
  origem text not null default '',
  arquivo text not null default '',
  rota text not null default '',
  dependencia text not null default '',
  evidencia text not null default '',
  ordem integer not null default 100,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_por uuid,
  updated_at timestamptz not null default now()
);

comment on table public.erp_central_evolucao_item is
  'Agenda mensurável de conclusão do SYSNQRA: uma linha por pendência, com origem, arquivo, rota, dependência e evidência.';
comment on column public.erp_central_evolucao_item.empresa_id is
  'NULL = item do produto (visível só ao MASTER). UUID = item de implantação daquela empresa.';
comment on column public.erp_central_evolucao_item.evidencia is
  'Medição que sustenta a linha (probe do banco vivo, grep do repo ou documento auditsdo com SHA).';

create index if not exists idx_erp_central_evolucao_item_situacao
  on public.erp_central_evolucao_item (situacao, prioridade, ordem);
create index if not exists idx_erp_central_evolucao_item_empresa
  on public.erp_central_evolucao_item (empresa_id, setor);

-- Unicidade por escopo. coalesce com o uuid nulo permite o mesmo codigo em empresas diferentes
-- e impede duplicidade do catalogo do produto numa re-execução da migration.
create unique index if not exists uniq_erp_central_evolucao_item_codigo
  on public.erp_central_evolucao_item
    (coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), codigo);

alter table public.erp_central_evolucao_item enable row level security;

drop policy if exists erp_central_evolucao_item_tenant on public.erp_central_evolucao_item;
create policy erp_central_evolucao_item_tenant on public.erp_central_evolucao_item
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

-- ============================ HISTÓRICO DE STATUS ============================

create table if not exists public.erp_central_evolucao_evento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id) on delete cascade,
  item_id uuid not null references public.erp_central_evolucao_item(id) on delete cascade,
  quando timestamptz not null default now(),
  quem text not null default '',
  tipo_evento text not null default 'situacao' check (tipo_evento in ('criado','situacao','prioridade','edicao')),
  de_valor text not null default '',
  para_valor text not null default '',
  nota text not null default ''
);

comment on table public.erp_central_evolucao_evento is
  'Rastro de cada mudança de situação/prioridade da agenda; escrito pelo gatilho, nunca pelo client.';

create index if not exists idx_erp_central_evolucao_evento_item
  on public.erp_central_evolucao_evento (item_id, quando desc);

alter table public.erp_central_evolucao_evento enable row level security;

drop policy if exists erp_central_evolucao_evento_tenant on public.erp_central_evolucao_evento;
create policy erp_central_evolucao_evento_tenant on public.erp_central_evolucao_evento
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select, insert, update, delete on table public.erp_central_evolucao_item to authenticated;
grant select, insert on table public.erp_central_evolucao_evento to authenticated;

-- ============================ GATILHO DE CARIMBO E DE ALTA ============================

create or replace function public.erp_central_evolucao_ultima_quem()
returns text
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (select u.nome from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) limit 1),
    ((select auth.uid())::text),
    session_user::text
  );
$$;

create or replace function public.erp_central_evolucao_registra_alta()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.erp_central_evolucao_evento
    (empresa_id, item_id, quem, tipo_evento, de_valor, para_valor, nota)
  values (new.empresa_id, new.id, public.erp_central_evolucao_ultima_quem(), 'criado', '', new.situacao,
          'Item cadastrado');
  return new;
end;
$$;

revoke all on function public.erp_central_evolucao_ultima_quem() from public, anon;
revoke all on function public.erp_central_evolucao_registra_alta() from public, anon, authenticated;

drop trigger if exists trg_erp_central_evolucao_item_touch on public.erp_central_evolucao_item;
create trigger trg_erp_central_evolucao_item_touch
  before update on public.erp_central_evolucao_item
  for each row execute function public.erp_stdq_touch_updated_at();

drop trigger if exists trg_erp_central_evolucao_item_alta on public.erp_central_evolucao_item;
create trigger trg_erp_central_evolucao_item_alta
  after insert on public.erp_central_evolucao_item
  for each row execute function public.erp_central_evolucao_registra_alta();

-- ============================ RPC: MUDAR SITUAÇÃO COM NOTA ============================
-- A mudança de situação e o rastro saem na mesma transação e sob RLS (SECURITY INVOKER): quem
-- edita só alcança a própria empresa ou é MASTER. Se nenhuma linha foi afetada a função falha
-- com erro explícito em vez de devolver um sucesso falso, que é a regra permanente dele.

create or replace function public.erp_central_evolucao_mudar_situacao(
  p_item_id uuid,
  p_situacao text,
  p_nota text default ''
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  anterior text;
  empresa uuid;
begin
  if p_situacao is null or p_situacao not in ('pendente','em_andamento','concluido','bloqueado','nao_aplicavel') then
    raise exception 'Situação inválida: %', coalesce(p_situacao, 'null')
      using errcode = '22023';
  end if;

  select situacao, empresa_id into anterior, empresa
    from public.erp_central_evolucao_item
   where id = p_item_id
     for update;

  if anterior is null then
    raise exception 'Item da Central de Evolução não encontrado ou fora do seu escopo de acesso.'
      using errcode = 'P0002';
  end if;

  if anterior = p_situacao then
    return true;
  end if;

  update public.erp_central_evolucao_item
     set situacao = p_situacao,
         atualizado_por = (select auth.uid()),
         updated_at = now()
   where id = p_item_id;

  insert into public.erp_central_evolucao_evento
    (empresa_id, item_id, quem, tipo_evento, de_valor, para_valor, nota)
  values (empresa, p_item_id, public.erp_central_evolucao_ultima_quem(), 'situacao',
          anterior, p_situacao, coalesce(nullif(trim(p_nota), ''), ''));

  return true;
end;
$$;

revoke all on function public.erp_central_evolucao_mudar_situacao(uuid, text, text) from public, anon;
grant execute on function public.erp_central_evolucao_mudar_situacao(uuid, text, text) to authenticated;

comment on function public.erp_central_evolucao_mudar_situacao(uuid, text, text) is
  'Grava a nova situação do item e o evento correspondente na mesma transação, sob RLS do papel atual.';

-- ============================ RPC: RESUMO CONSOLIDADO ============================
-- Percentual e contagens saem das linhas que o próprio usuário pode ver (RLS aplicada dentro da
-- função, que é SECURITY INVOKER). Se a tabela estiver vazia, devolve zero: nenhum número é simulado.

create or replace function public.erp_central_evolucao_resumo()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with f as (
    select situacao, prioridade, setor
      from public.erp_central_evolucao_item
     where empresa_id = public.erp_current_empresa_id() or public.erp_is_master()
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'pendente', (select count(*) from f where situacao = 'pendente'),
    'em_andamento', (select count(*) from f where situacao = 'em_andamento'),
    'concluido', (select count(*) from f where situacao = 'concluido'),
    'bloqueado', (select count(*) from f where situacao = 'bloqueado'),
    'nao_aplicavel', (select count(*) from f where situacao = 'nao_aplicavel'),
    'criticas_abertas', (select count(*) from f where prioridade = 'critica' and situacao <> 'concluido'),
    'percentual_concluido', (
      select case when count(*) = 0 then 0
                  else round(100.0 * count(*) filter (where situacao = 'concluido') / count(*), 1)
             end
        from f
    ),
    'por_setor', (
      select coalesce(jsonb_object_agg(setor, n), '{}'::jsonb)
        from (select setor, count(*) as n from f group by setor) g
    )
  );
$$;

revoke all on function public.erp_central_evolucao_resumo() from public, anon;
grant execute on function public.erp_central_evolucao_resumo() to authenticated;

comment on function public.erp_central_evolucao_resumo() is
  'Contagens e percentual de conclusão da agenda, calculados sobre as linhas visíveis ao papel atual.';

-- ============================ SEED: PENDÊNCIAS MEDIDAS EM 2026-11-06 ============================
-- Origem de cada numero:
--   * probe do banco vivo com a publishable key (somente GET, sem escrita): tabela ausente devolve
--     PGRST205; tabela existente sem grant devolve 42501. Executado em 2026-11-06.
--   * grep do repo nesta branch: contagem de arquivos com window.print.
--   * docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (medido no SHA 40d2dced) para o par tela x tabela.
-- Idempotente: o where not exists impede duplicar o catalogo se a migration rodar duas vezes.

insert into public.erp_central_evolucao_item
  (empresa_id, codigo, titulo, descricao, setor, modulo, tipo, prioridade, situacao,
   responsavel, origem, arquivo, rota, dependencia, evidencia, ordem)
select s.empresa_id, s.codigo, s.titulo, s.descricao, s.setor, s.modulo, s.tipo, s.prioridade, s.situacao,
       s.responsavel, s.origem, s.arquivo, s.rota, s.dependencia, s.evidencia, s.ordem
  from (values
    -- ---------- BLOCO BANCO: migrations que só ele pode aplicar ----------
    (null::uuid,'BCO-001','Aplicar a migration do FMEA AIAG e do Plano de Controle',
     'Sem ela as telas /qualidade/fmea e /qualidade/plano-controle abrem mas avisam que a tabela não existe; nenhum dado é inventado na tela.',
     'banco','Qualidade','pendencia_proprietario','critica','pendente',
     'Proprietário','ORDEM MASTER 2026-11-06 (CPP digital e impresso com QR Code)',
     'supabase/migrations/20261106120000_erp_fmea_plano_controle_aiag_v1.sql','/pageprincipal/qualidade/fmea',
     'SQL Editor do Supabase (não há CLI nem service_role nesta sessão)',
     'Probe 2026-11-06: erp_fmea_cabecalho e erp_plano_controle devolvem PGRST205 (tabela ausente no schema cache do banco vivo).',10),

    (null,'BCO-002','Aplicar a migration da Central de Evolução',
     'Cria erp_central_evolucao_item, erp_central_evolucao_evento, a RPC de resumo e o catálogo medido desta tela.',
     'banco','Administração','pendencia_proprietario','alta','pendente',
     'Proprietário','ORDEM MASTER 2026-11-06 (Central de Evolução e Conclusão do SYSNQRA)',
     'supabase/migrations/20261106150000_erp_central_evolucao_v1.sql','/pageprincipal/administracao/central-evolucao',
     'SQL Editor do Supabase',
     'Probe 2026-11-06: erp_central_evolucao_item e erp_central_evolucao_resumo devolvem PGRST205.',20),

    (null,'BCO-003','Aplicar o pacote das migrations pendentes (25 tabelas ausentes)',
     'Pacote único já escrito no repo. É o gargalo que trava 21 telas prontas no código; não falta programação, falta execução no banco.',
     'banco','Núcleo','pendencia_proprietario','critica','pendente',
     'Proprietário','Ordem permanente: nada é declarado funcional sem o banco real',
     'supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql','',
     'Revisar o pacote antes de colar (ele tem 27 migrations e 4.291 linhas, sem statements destrutivos fora de corpo de função)',
     'Probe 2026-11-06: as 25 tabelas abaixo devolvem PGRST205; erp_usuarios e erp_empresas devolvem 42501, ou seja existem e não têm grant para anon.',30),

    (null,'BCO-004','Aplicar a migration da matriz de permissão por setor',
     'A tela de controle de acesso chama a RPC que essa migration cria; sem ela a central mostra erro.',
     'banco','Segurança','pendencia_proprietario','alta','pendente',
     'Proprietário','Tarefa #25 e #26 (controle de acesso do chão de fábrica)',
     'supabase/migrations/20261030160000_erp_access_control_sector_matrix_v1.sql','/pageprincipal/configuracoes-usuario',
     'SQL Editor do Supabase',
     'Probe 2026-11-06: RPC public.erp_access_control_overview devolve PGRST202 (função ausente).',40),

    -- ---------- BLOCO BLOQUEADAS: decisão dele, não minha ----------
    (null,'DEC-001','Decidir o conflito entre a ORDEM MASTER e as ordens de 2026-11-02',
     'A ORDEM MASTER §6/§8 pede destaque laranja (isUpdated) e barra Windows 11; as ordens dele de 2026-11-02 mandaram deletar os dois, e as travas approved-ui-lock e quality-tablet-contract reprovam o build se voltarem. Não reintroduzi nada por conta própria.',
     'interface','Global','pendencia_proprietario','critica','bloqueado',
     'Proprietário','Conflito registrado nos relatórios; travas em scripts/verify-approved-ui-lock.mjs',
     'scripts/verify-approved-ui-lock.mjs','',
     'Decisão escrita dele sobre qual ordem prevalece',
     'Build atual passa com os dois removidos; reintroduzir sem decisão dele quebra verify:production.',50),

    (null,'DEC-002','Re-aprovar PCPPlanejamentoIndustrial.tsx no contrato de hash',
     'A tela foi corrigida (criado_em para created_at) mas está travada no manifesto; re-aprovação de tela travada exige ordem explícita dele para aquela tela.',
     'interface','PCP','pendencia_proprietario','alta','bloqueado',
     'Proprietário','Memória do projeto: nunca re-gerar o manifesto só para o gate passar',
     'scripts/verify-official-screens-lock.mjs','/pageprincipal/pcp/planejamento',
     'Ordem explícita dele para essa tela',
     'Trava oficiais[] do contrato de telas oficiais.',60),

    (null,'DEC-003','Autorizar a publicação de prod-telas-novas em produção',
     'Cada incremento vai para a branch e para o preview da Vercel. Produção só com ordem dele.',
     'publicacao','Vercel','pendencia_proprietario','critica','bloqueado',
     'Proprietário','Ordem permanente: produção só com ordem dele',
     '','https://erp-sistema-industrial.vercel.app',
     'Ordem dele',
     'Branch viva prod-telas-novas; preview da branch publicado em cada incremento.',70),

    (null,'DEC-004','Destravar Saída de Material (filtro de status das OPs)',
     'Correção pronta para ser feita, mas ele mandou aguardar ordem antes de mexer nessa tela.',
     'interface','Estoque','pendencia_proprietario','media','bloqueado',
     'Proprietário','Tarefa #122',
     'src/pages/AlmoxarifadoSaidaMaterial.tsx','/pageprincipal/almoxarifado/saida-material',
     'Ordem dele',
     'Tarefa registrada como aguardando ordem.',80),

    -- ---------- BLOCO IMPRESSÃO A4 ----------
    (null,'IMP-001','Converter as telas que ainda chamam window.print',
     'Ordem permanente: o botão Imprimir gera documento A4 com dados reais, sem menu, sem filtros e sem barra de ação. O motor já existe (abrirRelatorio + SynqraRelatorioA4); falta aplicar tela a tela.',
     'relatorios','Todos','acao','alta','em_andamento',
     'SYSNQRA','Ordem permanente do proprietário (item 5 da ordem de 2026-11-05)',
     'src/lib/report/abrirRelatorio.tsx','',
     'Nenhuma dependência de banco; trabalho por módulo',
     'grep 2026-11-06 nesta branch: 35 arquivos em src/pages e src/features ainda com window.print (fora o próprio motor A4).',90),

    -- ---------- BLOCO CÓRIGO/SEGURANÇA ----------
    (null,'AUT-001','Remover o fallback na tabela legada usuarios do AppBootstrap',
     'Se o perfil não é resolvido em erp_usuarios, o boot cai numa tabela que não existe no banco vivo e devolve erro em vez de negar o acesso com clareza.',
     'auth','Núcleo','defeito','alta','pendente',
     'SYSNQRA','Tarefa #33 (unificar autenticação) e medição desta execução',
     'src/AppBootstrap.tsx:96','',
     'Nenhuma; é código desta branch',
     'Probe 2026-11-06: SELECT em public.usuarios devolve PGRST205 (tabela legada inexistente).',100),

    -- ---------- BLOCO TELAS PRONTAS NO CÓDIGO X TABELA AUSENTE ----------
    (null,'TBC-001','Certificado de Qualidade aguarda a tabela de cotas',
     'Tela pronta; a leitura falha porque a tabela não existe no banco vivo.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/CertificadoQualidade.tsx','/pageprincipal/qualidade/certificados',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_certificado_cotas = PGRST205.',110),

    (null,'TBC-002','Notas de débito aguardam a configuração de clientes DN',
     'Tela pronta; tabela ausente no banco vivo.',
     'banco','Financeiro','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/CustomerDnSettings.tsx','/pageprincipal/financeiro/notas-debito/configuracoes',
     'BCO-003',
     'Probe 2026-11-06: erp_clientes_dn_config = PGRST205.',120),

    (null,'TBC-003','Controle de Alteração de Documentos aguarda 4 tabelas e a matriz de permissões',
     'Abas de distribuição, revisões, aprovações e solicitações prontas no código; leitura falha no banco.',
     'banco','Qualidade','defeito','critica','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/DocumentosQualidadeControle.tsx','/pageprincipal/qualidade/documentos',
     'BCO-003',
     'Probe 2026-11-06: erp_documentos_qualidade_distribuicoes, _revisoes, _aprovacoes, _solicitacoes e erp_permissoes_modulos = PGRST205.',130),

    (null,'TBC-004','BOM mestre aguarda a tabela de estrutura',
     'Tela pronta; tabela ausente.',
     'banco','Engenharia','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/EngenhariaBOM.tsx','/pageprincipal/engenharia/bom-mestre',
     'BCO-003',
     'Probe 2026-11-06: erp_engenharia_bom = PGRST205 (a migration 20261021180000 tinha dollar-quote quebrado; a trava verificar-migrations-sql.mjs existe por causa disso).',140),

    (null,'TBC-005','Revisões de BOM aguardam a tabela de revisões',
     'Tela pronta; tabela ausente.',
     'banco','Engenharia','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/EngenhariaRevisoesBOM.tsx','/pageprincipal/engenharia/revisoes-bom',
     'BCO-003',
     'Probe 2026-11-06: erp_bom_revisoes = PGRST205.',150),

    (null,'TBC-006','Rastreabilidade de lotes aguarda separações e genealogia',
     'Tela pronta; duas tabelas ausentes.',
     'banco','Estoque','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/EstoqueRastreabilidadeLotes.tsx','/pageprincipal/estoque/rastreabilidade',
     'BCO-003',
     'Probe 2026-11-06: erp_estoque_separacoes e erp_qualidade_genealogia_lotes = PGRST205.',160),

    (null,'TBC-007','Separação de material aguarda a tabela de separações',
     'Tela e RPC atômicas escritas; banco ainda não tem a tabela.',
     'banco','Estoque','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/EstoqueSeparacao.tsx','/pageprincipal/estoque/separacao',
     'BCO-003',
     'Probe 2026-11-06: erp_estoque_separacoes = PGRST205.',170),

    (null,'TBC-008','Expedição NF-e aguarda a tabela de vínculo romaneio x nota',
     'Tela pronta; tabela ausente.',
     'banco','Logística','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/logistica/ExpedicaoNFe.tsx','/pageprincipal/logistica/expedicao-nfe',
     'BCO-003',
     'Probe 2026-11-06: erp_expedicao_nfe = PGRST205.',180),

    (null,'TBC-009','Fichas de processo aguardam o histórico de ajustes de máquina',
     'Abas prontas; a leitura do histórico falha por tabela ausente.',
     'banco','Qualidade','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/FichasProcesso.tsx','/pageprincipal/qualidade/fichas-processo',
     'BCO-003',
     'Probe 2026-11-06: erp_historico_ajustes_maquina = PGRST205.',190),

    (null,'TBC-010','GED aguarda a pasta de evidências da RPNC',
     'Anexos versionados dependem da tabela de evidências.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/qualidade/FileTreeGED.tsx','/pageprincipal/qualidade/ged',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_rpnc_evidencias = PGRST205.',200),

    (null,'TBC-011','Gráfico de desvios aguarda a apuração de custos',
     'Tela pronta; tabela ausente.',
     'banco','Financeiro','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/FinanceiroGraficoDesvios.tsx','/pageprincipal/financeiro/grafico-desvios',
     'BCO-003',
     'Probe 2026-11-06: erp_financeiro_apuracao_custos = PGRST205.',210),

    (null,'TBC-012','Central fiscal aguarda liberações por item de pedido',
     'Tela pronta; tabela ausente.',
     'banco','Fiscal','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/features/fiscal/Fiscal.tsx','/pageprincipal/fiscal',
     'BCO-003',
     'Probe 2026-11-06: erp_fiscal_liberacoes_pedido_item = PGRST205.',220),

    (null,'TBC-013','Impostos aguardam a tabela de regras fiscais',
     'Tela pronta; tabela ausente.',
     'banco','Fiscal','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/features/fiscal/FiscalImpostos.tsx','/pageprincipal/fiscal/impostos',
     'BCO-003',
     'Probe 2026-11-06: erp_regras_fiscais = PGRST205.',230),

    (null,'TBC-014','Impressão de etiquetas aguarda o log de etiquetas',
     'Tela pronta; tabela ausente.',
     'banco','Logística','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/logistica/ImpressaoEtiquetas.tsx','/pageprincipal/logistica/impressao-etiquetas',
     'BCO-003',
     'Probe 2026-11-06: erp_log_etiquetas = PGRST205.',240),

    (null,'TBC-015','Auditorias de planta aguardam a tabela própria',
     'Tela pronta; tabela ausente.',
     'banco','Qualidade','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeAuditoriasPlanta.tsx','/pageprincipal/qualidade/auditorias-planta',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_auditorias_planta = PGRST205.',250),

    (null,'TBC-016','Genealogia de lote aguarda a tabela de genealogia',
     'Tela pronta; tabela ausente.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeGenealogiaLote.tsx','/pageprincipal/qualidade/genealogia-lote',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_genealogia_lotes = PGRST205.',260),

    (null,'TBC-017','Gráficos de refugo aguardam refugos e motivos de defeito',
     'Tela pronta; duas tabelas ausentes.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeGraficosRefugo.tsx','/pageprincipal/qualidade/graficos-refugo',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_defeitos_motivos e erp_qualidade_refugos = PGRST205.',270),

    (null,'TBC-018','Liberação de lotes aguarda a tabela de liberação',
     'Tela pronta; tabela ausente.',
     'banco','Qualidade','defeito','critica','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeLiberacaoLotes.tsx','/pageprincipal/qualidade/liberacao-lote',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_liberacao_lotes = PGRST205.',280),

    (null,'TBC-019','Refugos aguarda refugos e motivos de defeito',
     'Tela pronta; duas tabelas ausentes.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeRefugos.tsx','/pageprincipal/qualidade/refugos',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_defeitos_motivos e erp_qualidade_refugos = PGRST205.',290),

    (null,'TBC-020','Auditorias SGQ aguardam a tabela de auditorias',
     'Tela pronta com vínculo de RPNC; tabela ausente.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualityAuditsList.tsx','/pageprincipal/qualidade/auditorias',
     'BCO-003',
     'Probe 2026-11-06: erp_sgq_auditorias = PGRST205.',300),

    (null,'TBC-021','Plano de Controle e FMEA aguardam as tabelas novas',
     'Telas desta revisão já ligadas ao contrato da migration; sem aplicação ficam com o aviso de pendência.',
     'banco','Qualidade','defeito','critica','pendente','Proprietário',
     'ORDEM MASTER 2026-11-06',
     'src/pages/qualidade/PlanoControle.tsx','/pageprincipal/qualidade/plano-controle',
     'BCO-001',
     'Probe 2026-11-06: erp_plano_controle = PGRST205; qualidade_fmea existe mas sem as colunas novas.',310),

    -- ---------- BLOCO AGENDA DE CONCLUSÃO ----------
    (null,'AGR-001','Conferir os 34 módulos da matriz contra as telas reais',
     'Auditoria módulo a módulo para declarar cobertura sem chutar tela inexistente.',
     'auditoria','Global','auditoria','alta','pendente',
     'SYSNQRA','Tarefa #160 (ordem do proprietário)',
     'docs/TABLET-MATRIZ-SYNQRA.md','',
     'Nenhuma',
     'Matriz dele; a conferência tela a tela ainda não foi registrada como concluída.',320),

    (null,'AGR-002','Entregar o relatório PESQUISA_OPORTUNIDADES_SYSNQRA.md',
     'Pesquisa em 12 áreas com as 30 melhores oportunidades por impacto, com link e evidência lidos. As saídas dos agentes anteriores ficaram com 0 bytes, então as 4 primeiras fontes precisam ser recoletadas; nada será escrito sem evidência.',
     'pesquisa','Global','acao','media','pendente',
     'SYSNQRA','ORDEM DE PESQUISA 2026-11-06',
     'docs/PESQUISA_OPORTUNIDADES_SYSNQRA.md','',
     'Nenhuma',
     'Arquivo ainda não existe no repo (ls docs/ em 2026-11-06).',330),

    (null,'AGR-003','Auditoria comparativa de padrão visual (campos, botões de edição, cores)',
     'Ele autorizou medir o SYSNQRA contra outros sistemas industriais e atualizar imagem e cor do sistema quando o visual sair do padrão.',
     'interface','Global','melhoria','alta','em_andamento',
     'SYSNQRA','Ordem de 2026-11-06 (pesquisa avançada em outros sistemas)',
     'src/styles','',
     'Nenhuma',
     'Paleta oficial travada (#F4FBFD #123B50 #2D8DB8 #48B7C7 #3A9D78 #E6A34A #D65B61, Inter) e régua de 30px opt-in; comparação externa ainda não registrada.',340),

    (null,'AGR-004','Central de Ajuda presente em todas as telas',
     'A tela /ajuda existe; falta o ponto de entrada em todas as telas alcançáveis.',
     'interface','Global','melhoria','media','pendente',
     'SYSNQRA','Tarefa #128 e #130',
     'src/pages/CentralAjuda.tsx','/pageprincipal/ajuda',
     'Nenhuma',
     'Rota registrada no roteador; entrada global ainda não aplicada.',350),

    (null,'AGR-005','Fluxo de caixa: revisão 04 (paginação, concorrência, CONSULTAR, PAGO protegido)',
     'Pendência registrada na auditoria; precisa fechar a proteção de título já pago e o estado de conexão real.',
     'financeiro','Financeiro','defeito','media','pendente',
     'SYSNQRA','Tarefa #146 e #144',
     'src/features/financeiro/FinanceiroFluxoCaixa.tsx','/pageprincipal/financeiro/fluxo-de-caixa',
     'Nenhuma',
     'docs/ERP-CENTRAL-ERROS-PENDENCIAS.md, item ERP-2026-003 (paginação feita; concorrência e estado de conexão ainda sem prova autenticada).',360),

    (null,'AGR-006','Pente fino responsivo mobile-first em todas as telas',
     'Ordem dele: o sistema é usado em tablet de chão de fábrica e em painel; nenhum módulo pode quebrar em 768px.',
     'interface','Global','melhoria','media','pendente',
     'SYSNQRA','Tarefa #140',
     'src/components/layout','',
     'Depende da auditoria visual AGR-003',
     'Verificação visual autenticada ainda não executada (preview da Vercel atrás de autenticação).',370),

    (null,'AGR-007','Terminal de produção da máquina (HMI da injetora)',
     'A partir do print dele: tela de operação por máquina com apontamento em tela de toque.',
     'interface','PCP','melhoria','media','pendente',
     'SYSNQRA','Tarefa #141',
     'src/pages/pcp/ControleProcessoInjetora.tsx','/pageprincipal/pcp/controle-injetora',
     'Nenhuma',
     'Existe a tela de controle da injetora; o formato HMI do print ainda não foi aplicado.',380),

    (null,'AGR-008','MRP do PCP: agregar necessidades no banco antes de gravar ordens',
     'O cálculo hoje atravessa o client; a agregação deve virar RPC transacional para não gerar OP duplicada em concorrência.',
     'producao','PCP','defeito','alta','em_andamento',
     'SYSNQRA','Tarefa #133',
     'src/pages/PCPDemanda.tsx','/pageprincipal/pcp/demanda',
     'Migration nova (ainda escrita aqui)',
     'docs/ERP-CENTRAL-ERROS-PENDENCIAS.md, item ERP-2026-018: cada OP usa a RPC de numeração, mas o lote continua em transações individuais.',390),

    (null,'AGR-009','Portal do Operador: convite por e-mail, cartão e apontamento gravando no PCP',
     'Fechar o ciclo do funcionário de chão de fábrica sem conta Auth: cartão de ponto, PIN e vínculo com a OP.',
     'producao','PCP','acao','alta','em_andamento',
     'SYSNQRA','Tarefa #81 e #134',
     'src/pages/PortalDoOperador.tsx','/pageprincipal/pcp/portal-operador',
     'Tarefa #153 (sigla da empresa, codigo_acesso e PIN com hash) e #154 (Edge Function de validação de PIN)',
     'docs/ERP-CENTRAL-ERROS-PENDENCIAS.md, bloqueio: Deno não instalado, nenhuma Edge Function executada em runtime.',400),

    (null,'AGR-010','Ficha de Processo: abas Acabamento e Montagem aplicadas no sistema',
     'As abas do modelo dele ainda não estão na tela oficial.',
     'qualidade','PCP','acao','media','pendente',
     'SYSNQRA','Tarefa #135 e pasta Fichas de Processo enviada por ele',
     'src/pages/FichasProcesso.tsx','/pageprincipal/qualidade/fichas-processo',
     'TBC-009 para o histórico de ajustes',
     'Ordem permanente: uma versão oficial por tela, sem restaurar tela antiga.',410),

    (null,'AGR-011','Aplicar a migration do bucket erp-fichas-processo',
     'Anexo da ficha de processo depende do bucket de Storage.',
     'banco','Estoque','pendencia_proprietario','media','pendente',
     'Proprietário','Tarefa #91',
     'supabase/migrations','',
     'SQL Editor / painel Storage do Supabase',
     'Storage não é consultável pela publishable key sem sessão; a presença do bucket não pode ser provada nesta sessão.',420),

    (null,'AGR-012','Provar os três serviços ponta a ponta com sessão autenticada',
     'Ordem dele: não declarar acesso integral sem testar banco, Storage e Edge Function de verdade. Sem credencial autenticada nesta sessão, nada aqui é declarado funcional.',
     'auditoria','Núcleo','auditoria','critica','pendente',
     'SYSNQRA','Ordem permanente dele',
     '','/pageprincipal',
     'Sessão Supabase autenticada dele ou token com escopo suficiente',
     'docs/ERP-CENTRAL-ERROS-PENDENCIAS.md, seção Bloqueios externos atuais: sem psql, sem CLI, sem sessão autenticada, sem Deno.',430)
  ) as s(empresa_id, codigo, titulo, descricao, setor, modulo, tipo, prioridade, situacao,
         responsavel, origem, arquivo, rota, dependencia, evidencia, ordem)
 where not exists (
   select 1 from public.erp_central_evolucao_item e
    where e.empresa_id is null and e.codigo = s.codigo
 );
-- <<<<<<<<<<<<<< <<<< 20261106150000_erp_central_evolucao_v1.sql >>>>

notify pgrst, 'reload schema';
