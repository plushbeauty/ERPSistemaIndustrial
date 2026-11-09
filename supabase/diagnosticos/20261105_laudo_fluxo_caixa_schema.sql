-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — LAUDO SOMENTE LEITURA: FLUXO DE CAIXA x USUARIOS x AUDITORIA
-- @AUTOR: FernandoSch
-- Data: 2026-11-05
-- Motivo: REVISAO TECNICA OBRIGATORIA — FLUXO DE CAIXA, itens 1 e 9:
--   "Verifique no PostgreSQL as colunas reais de erp_usuarios e erp_fluxo_caixa.
--    Nao presuma a existencia de ativo e deleted_at." / "Nao crie tabelas ou colunas
--    sem antes conferir o schema existente."
--
-- COMO USAR: cole o BLOCO A inteiro no Supabase > SQL Editor > Run. Ele le somente
-- catalogos (information_schema / pg_*), entao NAO quebra mesmo se alguma tabela nao
-- existir. NAO altera nada: nao tem create, alter, insert, update, delete, drop nem grant.
-- Devolve uma grade (ordem, secao, objeto, detalhe). Cole as linhas de volta para mim.
-- O BLOCO B le as proprias tabelas: rode-o só depois de conferir no BLOCO A (secao 1)
-- que elas existem; se nao existirem, ele erra "relation does not exist".
--
-- ATENCAO: o SQL Editor roda como a role postgres, que bypassa RLS. As contagens do
-- BLOCO B sao do banco inteiro, nao de uma empresa.
-- ============================================================================

-- ── BLOCO A ──────────────────────────────────────────────────────────────────
with esperadas(tabela, coluna, uso) as (
  values
  ('erp_usuarios', 'id', 'FK de actor_user_id na auditoria'),
  ('erp_usuarios', 'auth_user_id', 'vinculo com auth.users; filtro da sessao'),
  ('erp_usuarios', 'empresa_id', 'tenant; bloqueia consulta global'),
  ('erp_usuarios', 'setor_id', 'matriz de permissao por setor'),
  ('erp_usuarios', 'nome', 'rodape da tela e historico'),
  ('erp_usuarios', 'email', 'tela de administracao'),
  ('erp_usuarios', 'login_nome', 'tela de administracao'),
  ('erp_usuarios', 'perfil', 'controle de permissao da edicao/baixa'),
  ('erp_usuarios', 'nivel_admin', 'controle de permissao por nivel'),
  ('erp_usuarios', 'ativo', 'a tela FILTRA por isso hoje — confirmar'),
  ('erp_usuarios', 'is_master', 'master enxerga todas as empresas'),
  ('erp_usuarios', 'role_id', 'RBAC criado em 20260913000100'),
  ('erp_usuarios', 'deleted_at', 'a tela FILTRA por isso hoje — confirmar'),
  ('erp_usuarios', 'updated_at', 'coluna da migration RBAC'),
  ('erp_usuarios', 'matricula', 'FOI ESSA QUE O POSTGREST NEGOU (42703) — deve cair em 3-FALTANDO'),
  ('erp_funcionarios', 'id', 'chave do funcionario'),
  ('erp_funcionarios', 'empresa_id', 'tenant do funcionario'),
  ('erp_funcionarios', 'matricula', 'ONDE A MATRICULA MORA? portal do operador'),
  ('erp_funcionarios', 'numero_cracha_rfid', 'leitura do cartao no chao de fabrica'),
  ('erp_funcionarios', 'auth_user_id', 'vinculo funcionario x usuario ERP?'),
  ('erp_funcionarios', 'usuario_id', 'vinculo funcionario x usuario ERP?'),
  ('erp_funcionarios', 'email', 'vinculo funcionario x usuario por e-mail?'),
  ('rh_funcionarios', 'matricula', 'unica tabela com CREATE TABLE de matricula (20261009180000)'),
  ('rh_funcionarios', 'empresa_id', 'tenant'),
  ('rh_funcionarios', 'auth_user_id', 'vinculo funcionario x usuario ERP?'),
  ('rh_funcionarios', 'usuario_id', 'vinculo funcionario x usuario ERP?'),
  ('rh_funcionarios', 'email', 'vinculo funcionario x usuario por e-mail?'),
  ('erp_fluxo_caixa', 'id', 'chave do lancamento'),
  ('erp_fluxo_caixa', 'empresa_id', 'tenant'),
  ('erp_fluxo_caixa', 'descricao', 'campo editavel'),
  ('erp_fluxo_caixa', 'tipo', 'filtro de tipo ENTRADA/SAIDA'),
  ('erp_fluxo_caixa', 'valor', 'indicador de previsto'),
  ('erp_fluxo_caixa', 'data_vencimento', 'filtro de periodo'),
  ('erp_fluxo_caixa', 'data_pagamento', 'baixa financeira'),
  ('erp_fluxo_caixa', 'status', 'filtro de status; o CHECK pode travar estado novo'),
  ('erp_fluxo_caixa', 'pedido_venda_id', 'origem do titulo'),
  ('erp_fluxo_caixa', 'rfq_id', 'origem do titulo'),
  ('erp_fluxo_caixa', 'created_at', 'historico'),
  ('erp_fluxo_caixa', 'updated_at', 'A CONFIRMAR: a migration original nao cria'),
  ('erp_fluxo_caixa', 'deleted_at', 'A CONFIRMAR: necessario para exclusao logica'),
  ('erp_fluxo_caixa', 'valor_pago', 'A CONFIRMAR: necessario para baixa parcial'),
  ('erp_audit_logs', 'id', 'chave'),
  ('erp_audit_logs', 'empresa_id', 'tenant da auditoria'),
  ('erp_audit_logs', 'actor_user_id', 'usuario que alterou'),
  ('erp_audit_logs', 'action', 'acao gravada'),
  ('erp_audit_logs', 'module', 'modulo (migration 20261104171000)'),
  ('erp_audit_logs', 'entity_type', 'nome da tabela auditada'),
  ('erp_audit_logs', 'entity_id', 'id do lancamento'),
  ('erp_audit_logs', 'old_data', 'valor anterior'),
  ('erp_audit_logs', 'new_data', 'valor novo'),
  ('erp_audit_logs', 'created_at', 'data da alteracao')
),
reais(tabela, coluna) as (
  select c.table_name, c.column_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in ('erp_usuarios', 'erp_fluxo_caixa', 'erp_audit_logs', 'erp_funcionarios', 'rh_funcionarios')
),
grade(ordem, secao, objeto, detalhe) as (
  select 0, '0-BANCO', current_database(),
    'tabelas public: ' ||
    (select count(*)::text from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE') ||
    ' | role: ' || current_user ||
    ' | super: ' || coalesce((select rolsuper::text from pg_roles where rolname = current_user), '?') ||
    ' | bypass RLS: ' || coalesce((select rolbypassrls::text from pg_roles where rolname = current_user), '?')

  union all
  select 1, '1-TABELA', t.nome,
    case when x.regclass is null then 'NAO EXISTE'
         else 'existe | ' || x.reltuples::text || ' linhas estimadas' end
  from (values ('erp_usuarios'), ('erp_fluxo_caixa'), ('erp_audit_logs'), ('erp_empresas'), ('erp_funcionarios'), ('rh_funcionarios')) t(nome)
  cross join lateral (
    select to_regclass('public.' || t.nome) as regclass,
           coalesce((select g.reltuples from pg_class g where g.oid = to_regclass('public.' || t.nome)), -1) as reltuples
  ) x

  union all
  select 2, '2-COLUNA', c.table_name || '.' || c.column_name,
    c.data_type ||
    coalesce('(' || c.character_maximum_length || ')',
             case when c.numeric_precision is not null
                  then '(' || c.numeric_precision || ',' || coalesce(c.numeric_scale::text, '0') || ')' end,
             '') ||
    ' | ' || case when c.is_nullable = 'NO' then 'NOT NULL' else 'NULL' end ||
    ' | default: ' || coalesce(c.column_default, '-')
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in ('erp_usuarios', 'erp_fluxo_caixa', 'erp_audit_logs', 'erp_funcionarios', 'rh_funcionarios')

  union all
  select 3, '3-FALTANDO', e.tabela || '.' || e.coluna, 'uso: ' || e.uso
  from esperadas e
  left join reais r on r.tabela = e.tabela and r.coluna = e.coluna
  where r.coluna is null

  union all
  select 4, '4-USUARIO-COLUNA', r.tabela || '.' || r.coluna,
    c.data_type || ' | ' || case when c.is_nullable = 'NO' then 'NOT NULL' else 'NULL' end ||
    ' | default: ' || coalesce(c.column_default, '-')
  from esperadas r
  join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = r.tabela and c.column_name = r.coluna
  where r.tabela = 'erp_usuarios'

  union all
  select 5, '5-CONSTRAINT', k.table_name || '.' || k.constraint_name,
    case when k.constraint_type = 'CHECK' then 'CHECK ' || coalesce(
           (select ck.check_clause from information_schema.check_constraints ck
             where ck.constraint_name = k.constraint_name and ck.constraint_schema = 'public'), '(sem clausula)')
         else k.constraint_type || ' (' || coalesce(string_agg(uc.column_name, ','), '?') || ')' end
  from information_schema.table_constraints k
  left join information_schema.key_column_usage uc
    on uc.constraint_name = k.constraint_name and uc.table_name = k.table_name
   and uc.table_schema = 'public'
  where k.table_schema = 'public'
    and k.table_name in ('erp_fluxo_caixa', 'erp_audit_logs')
    and k.constraint_type <> 'FOREIGN KEY'
  group by k.table_name, k.constraint_name, k.constraint_type

  union all
  select 6, '6-RLS', p.tablename || ' / ' || p.policyname,
    'cmd=' || p.cmd || ' | roles=' || coalesce(array_to_string(p.roles, ','), '-') ||
    ' | using=' || coalesce(p.qual, '-') || ' | with_check=' || coalesce(p.with_check, '-')
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in ('erp_fluxo_caixa', 'erp_usuarios', 'erp_audit_logs')

  union all
  select 7, '7-RLS-FLAG', p.tablename,
    'rowsecurity=' || p.relrowsecurity::text || ' | forced=' || p.relforcerowsecurity::text
  from pg_class p
  where p.relnamespace = 'public'::regnamespace
    and p.relname in ('erp_fluxo_caixa', 'erp_usuarios', 'erp_audit_logs')

  union all
  select 8, '8-GRANT', g.table_name || ' -> ' || g.grantee,
    string_agg(distinct g.privilege_type, ', ' order by g.privilege_type)
  from information_schema.role_table_grants g
  where g.table_schema = 'public'
    and g.table_name in ('erp_fluxo_caixa', 'erp_usuarios', 'erp_audit_logs')
    and g.grantee in ('authenticated', 'anon', 'postgres')
  group by g.table_name, g.grantee

  union all
  select 9, '9-FUNCAO', p.proname,
    pg_get_function_arguments(p.oid) || ' -> ' || pg_get_function_result(p.oid) ||
    ' | definer=' || p.prosecdef::text || ' | kind=' || p.prokind::text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.proname in ('erp_current_empresa_id', 'erp_is_master', 'erp_current_user_id',
    'erp_has_permission', 'erp_fluxo_caixa_editar', 'erp_fluxo_caixa_baixar',
    'erp_fluxo_caixa_excluir', 'erp_fluxo_caixa_historico')

  union all
  -- RELACIONAMENTO funcionario x usuario (item 3): toda FK que toca uma dessas tres tabelas.
  select 10, '10-FK-VINCULO',
    c.table_name || '.' || k.column_name || ' -> ' || f.table_name || '.' || f.column_name,
    'constraint: ' || rc.constraint_name ||
    ' | on_delete=' || rc.delete_rule || ' | on_update=' || rc.update_rule
  from information_schema.referential_constraints rc
  join information_schema.key_column_usage k
    on k.constraint_name = rc.constraint_name and k.table_schema = 'public'
  join information_schema.constraint_column_usage f
    on f.constraint_name = rc.constraint_name and f.table_schema = 'public'
  join information_schema.tables c
    on c.table_name = k.table_name and c.table_schema = 'public' and c.table_type = 'BASE TABLE'
  where k.table_name in ('erp_usuarios', 'erp_funcionarios', 'rh_funcionarios')
     or f.table_name in ('erp_usuarios', 'erp_funcionarios', 'rh_funcionarios')
)
select ordem, secao, objeto, detalhe from grade order by ordem, secao, objeto;

-- ── BLOCO B ──────────────────────────────────────────────────────────────────
-- So faz sentido se o BLOCO A mostrou as duas tabelas em 1-TABELA.
select 'erp_fluxo_caixa' as tabela, count(*) as lancamentos,
       count(distinct empresa_id) as empresas_distintas,
       count(*) filter (where status = 'PENDENTE') as pendentes,
       count(*) filter (where status = 'PAGO') as pagos,
       count(*) filter (where data_pagamento is not null and status <> 'PAGO') as inconsistencia_data_pagamento,
       count(*) filter (where empresa_id is null) as sem_empresa
from public.erp_fluxo_caixa;

select 'erp_usuarios' as tabela, count(*) as usuarios,
       count(*) filter (where empresa_id is null) as sem_empresa,
       count(*) filter (where coalesce(ativo, true)) as ativos,
       count(*) filter (where deleted_at is not null) as excluidos_logicamente,
       count(distinct perfil) as perfis_distintos
from public.erp_usuarios;
