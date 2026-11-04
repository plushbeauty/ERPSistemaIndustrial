-- SYSNQRA ERP INDUSTRIAL — REPARO DO CARIMBO updated_em EXIGIDO PELO BANCO
-- Autor: Fernando Schuinsekel | 2026-11-04
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
