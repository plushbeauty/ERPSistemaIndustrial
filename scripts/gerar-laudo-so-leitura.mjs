/**
 * Gera um LAUDO SOMENTE LEITURA para colar no SQL Editor do Supabase.
 *
 * Por que isto existe: de fora (REST + chave de cliente) da para provar que uma TABELA
 * nao existe, mas nao da para provar nada sobre FUNCTION — o PostgREST devolve o mesmo
 * codigo PGRST202 para "funcao ausente" e para "funcao que exige parametros". Por isso
 * a medida de fora e um piso, nao um teto. Este laudo roda por dentro do banco e da a
 * resposta exata em uma grade: identidade do banco, o que falta, quem nao tem politica
 * RLS, quem nao tem grant e como ficou o carimbo updated_em.
 *
 * NAO ESCREVE NADA: nenhum insert/update/delete/alter/create. Copie a grade de volta.
 *
 * Entrada: laudo de scripts/auditar-contrato-banco-vivo.mjs (<temp>/sysnqra-live-contract.json)
 * Saida:   supabase/diagnosticos/<data>_laudo_so_leitura_banco.sql
 *
 * Uso: node scripts/gerar-laudo-so-leitura.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = process.cwd()
const LAUDO = process.argv[2] ?? path.join(os.tmpdir(), 'sysnqra-live-contract.json')
const DATA = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const SAIDA = path.join(ROOT, 'supabase', 'diagnosticos', DATA + '_laudo_so_leitura_banco.sql')

if (!fs.existsSync(LAUDO)) {
  console.error('ERRO: laudo nao encontrado em ' + LAUDO + '. Rode antes: node scripts/auditar-contrato-banco-vivo.mjs')
  process.exit(1)
}

const laudo = JSON.parse(fs.readFileSync(LAUDO, 'utf8'))
const esc = (s) => String(s).replace(/'/g, "''")
const telas = (r) => (r.arquivos ?? []).slice(0, 3).map((a) => a.replace(/^src\//, '')).join(', ')

const linhasTabelas = (laudo.tabelas ?? []).map((r) => `  ('${esc(r.nome)}', '${esc(telas(r))}')`)
const linhasRpcs = (laudo.rpcs ?? []).map((r) => `  ('${esc(r.nome)}', '${esc(telas(r))}')`)

const sql = `-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — LAUDO SOMENTE LEITURA DO BANCO
-- Gerado em ${new Date().toISOString().slice(0, 19)} por scripts/gerar-laudo-so-leitura.mjs
-- Lista de conferencia: as ${linhasTabelas.length} tabelas e as ${linhasRpcs.length} funcoes que o codigo do sistema usa,
-- medidas no repo prod-telas-novas contra o banco zsklkydlawgvwgnvxwwx.supabase.co.
--
-- Cole no SQL Editor (New query > Run). NAO altera nada: nao tem create, alter, insert,
-- update ou delete. Devolve UMA grade de 4 colunas. Copie as linhas para mim — elas
-- substituem qualquer chute meu sobre o que falta.
--
-- A linha 0 diz em qual banco a consulta rodou. Se o numero de tabelas dela for muito
-- menor que ${linhasTabelas.length}, o pacote de migrations ainda nao foi aplicado a este banco.
-- ============================================================================

with app_tabelas(nome, telas) as (
  values
${linhasTabelas.join(',\n')}
), app_funcoes(nome, telas) as (
  values
${linhasRpcs.join(',\n')}
), no_banco as (
  select t.nome, t.telas,
         (to_regclass('public.' || t.nome) is not null) as existe,
         c.relrowsecurity as rls_on,
         (select count(*) from pg_policy p where p.polrelid = c.oid) as politicas,
         case when to_regclass('public.' || t.nome) is null then null else
           (has_table_privilege('authenticated', 'public.' || t.nome, 'select')
             and has_table_privilege('authenticated', 'public.' || t.nome, 'insert')
             and has_table_privilege('authenticated', 'public.' || t.nome, 'update')
             and has_table_privilege('authenticated', 'public.' || t.nome, 'delete'))::int
         end as authenticated_com_crd
    from app_tabelas t
    left join pg_class c on c.relname = t.nome
    left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
), fun_no_banco as (
  select f.nome, f.telas,
         (select count(*) from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = f.nome) as sobrecargas,
         (select bool_or(p.prosecdef) from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = f.nome) as security_definer
    from app_funcoes f
), updated_em_ruim as (
  select tg.tgrelid::regclass::text as tabela
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind in ('r','p') and not tg.tgisinternal
     and p.prosrc ilike '%updated_em%'
     and not exists (select 1 from pg_attribute a
                      where a.attrelid = tg.tgrelid and a.attname = 'updated_em'
                        and a.attnum > 0 and not a.attisdropped)
)
select 0 as ordem, '0.identicidade_do_banco' as verificacao,
       current_database() as resultado,
       'tabelas_no_schema_public=' ||
       (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r','p'))::text ||
       ' | funcoes_no_schema_public=' ||
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public')::text as detalhe, '' as telas
union all
select 1, '1.tabelas_que_o_codigo_usa', count(*)::text, 'das quais existem neste banco: ' ||
       count(*) filter (where existe)::text || ' | faltam: ' || count(*) filter (where not existe)::text, ''
  from no_banco
union all
select 2, '2.tabela_faltando_no_banco', nome, 'esta tela chama', telas from no_banco where not existe
union all
select 3, '3.tabela_sem_politica_rls', nome, 'rls_on=' || coalesce(rls_on::text, '?') || ' | politicas=' || coalesce(politicas::text, '?'), telas
  from no_banco where existe and coalesce(politicas, 0) = 0
union all
select 4, '4.tabela_sem_grant_de_escrita', nome, 'authenticated pode inserir/alterar/apagar: ' || coalesce(authenticated_com_crd::text, '?'), telas
  from no_banco where existe and coalesce(authenticated_com_crd, 0) = 0
union all
select 5, '5.funcao_que_o_codigo_chama', count(*)::text, 'das quais existem neste banco: ' ||
       count(*) filter (where sobrecargas > 0)::text || ' | faltam: ' || count(*) filter (where sobrecargas = 0)::text, ''
  from fun_no_banco
union all
select 6, '6.funcao_faltando_no_banco', nome, 'nenhuma sobrecarga com esse nome no schema public', telas
  from fun_no_banco where sobrecargas = 0
union all
select 7, '7.gatilho_exige_updated_em_sem_coluna', tabela, 'a gravacao dessa tela quebra com 42703 ate o reparo', ''
  from updated_em_ruim
union all
select 8, '8.contagem_final',
       (select count(*) from no_banco where not existe)::text || ' tabelas + ' ||
       (select count(*) from fun_no_banco where sobrecargas = 0)::text || ' funcoes faltando',
       'se der 0 + 0 o banco esta no mesmo ponto do codigo', ''
order by 1, 3;
`

fs.writeFileSync(SAIDA, sql, 'utf8')
console.log('LAUDO_GERADO ' + SAIDA)
console.log('tabelas_conferidas=' + linhasTabelas.length + ' funcoes_conferidas=' + linhasRpcs.length + ' bytes=' + Buffer.byteLength(sql))
