/**
 * Monta o pacote SQL das migrations que o banco VIVO ainda nao tem.
 *
 * Entrada: o laudo de scripts/auditar-contrato-banco-vivo.mjs (JSON no <temp>).
 * Saida: um arquivo unico, em supabase/diagnosticos/, com as migrations necessarias
 * em ordem de timestamp e fechadas por dependencia: se uma migration precisada faz
 * alter table em erp_x, a migration que cria erp_x entra antes dela.
 *
 * Nao inventa DDL: o conteudo e copiado byte a byte dos arquivos ja versionados em
 * supabase/migrations, para o banco nao ter duas versoes da mesma tabela.
 *
 * Uso: node scripts/gerar-pacote-migrations-pendentes.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = process.cwd()
const LAUDO = process.argv[2] ?? path.join(os.tmpdir(), 'sysnqra-live-contract.json')
const SAIDA = path.join(ROOT, 'supabase', 'diagnosticos', '20261104_pacote_aplicar_migrations_pendidas.sql')

if (!fs.existsSync(LAUDO)) {
  console.error('ERRO: laudo nao encontrado em ' + LAUDO + '. Rode antes: node scripts/auditar-contrato-banco-vivo.mjs')
  process.exit(1)
}

const laudo = JSON.parse(fs.readFileSync(LAUDO, 'utf8'))
const pasta = path.join(ROOT, 'supabase', 'migrations')
const nomes = fs.readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort()
const texto = new Map(nomes.map((f) => [f, fs.readFileSync(path.join(pasta, f), 'utf8')]))

const reCreate = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\s*)?\.\s*"?([a-z0-9_]+)"?\s*\(|create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\s*\.)?\s*"?([a-z0-9_]+)"?\s*\(/gi
const reReferencia = /(?:alter\s+table|create\s+index(?:\s+if\s+not\s+exists)?\s+\w+\s+on|create\s+policy[^;]*?\s+on|references)\s+(?:public\s*\.)?\s*"?([a-z0-9_]+)"?/gi

/** Quem cria cada tabela, no repo inteiro. */
const criadorDe = new Map()
for (const [arquivo, t] of texto) {
  for (const m of t.matchAll(reCreate)) {
    const nome = m[1] || m[2]
    if (!nome) continue
    if (!criadorDe.has(nome)) criadorDe.set(nome, new Set())
    criadorDe.get(nome).add(arquivo)
  }
}

const selecionadas = new Set()
const fila = []

function entrar(arquivo, motivo) {
  if (!arquivo || selecionadas.has(arquivo) || !texto.has(arquivo)) return
  selecionadas.add(arquivo)
  fila.push({ arquivo, motivo })
}

for (const r of laudo.faltantesCruzados ?? []) {
  for (const a of r.migrations ?? []) entrar(a, 'tabela ausente no banco: ' + r.nome)
}

/* Reparos escritos no repo para defeitos que o proprio banco denuncia, mas que nao
   aparecem na lista de tabelas ausentes porque a tabela ja existe — o que falta e a
   coluna/gatilho ou a politica. Sem estes dois arquivos, Chao de Fabrica (updated_em,
   sqlstate 42703) e Central de Custos continuam travando depois do pacote. */
const REPAROS_OBRIGATORIOS = [
  '20261104190000_repair_updated_em_exigido_pela_trigger.sql',
  '20261104200000_repair_central_custos_tabela_e_isolamento.sql'
]
for (const a of REPAROS_OBRIGATORIOS) entrar(a, 'reparo de defeito denunciado pelo proprio banco')

/* Fechamento por dependencia: toda tabela citada numa migration precisada, que ela
   mesma nao cria, puxa a migration que a cria (e assim por diante). */
for (let i = 0; i < fila.length; i++) {
  const t = texto.get(fila[i].arquivo)
  const propias = new Set()
  for (const m of t.matchAll(reCreate)) propias.add(m[1] || m[2])
  for (const m of t.matchAll(reReferencia)) {
    const nome = m[1]
    if (!nome || propias.has(nome) || nome === fila[i].arquivo) continue
    for (const criador of criadorDe.get(nome) ?? []) entrar(criador, 'dependencia: ' + nome + ' exigida por ' + fila[i].arquivo)
  }
}

const emOrdem = nomes.filter((f) => selecionadas.has(f))
const existentes = (laudo.tabelas ?? []).filter((t) => t.estado === 'LEIVEL' || t.estado === 'EXISTE_SEM_GRANT_ANON').length
const usadas = (laudo.tabelas ?? []).length
const faltando = (laudo.faltantesCruzados ?? []).length

/* --------------------------------------------------------------------------
   Inventario honesto do que mexe em dado ou remove objeto.
   Um SQL perigoso aqui e de dois tipos muito diferentes:
     AGORA  - statement fora de qualquer corpo $$..$$: roda no momento da colagem.
     FUNCAO - statement dentro do corpo de uma create function: nao roda agora,
              so quando alguem chamar a RPC.
   Contar os dois juntos daria um alarme falso, entao separamos pelo delimitador.
   -------------------------------------------------------------------------- */
/* Padrões estreitos, cada um com o alvo no grupo 1. 'update' sozinho pegaria
   'grant select, insert, update on <tabela>', que nao mexe em dado nenhum, entao
   so conta UPDATE quando tem SET logo depois. */
const padroesDestrutivos = [
  { rotulo: 'DELETE', re: /\bdelete\s+from\s+(?:public\s*\.)?([a-z_][a-z0-9_.]*)/gi },
  { rotulo: 'TRUNCATE', re: /\btruncate\s+(?:table\s+)?(?:public\s*\.)?([a-z_][a-z0-9_.]*)/gi },
  { rotulo: 'UPDATE...SET', re: /\bupdate\s+(?:public\s*\.)?([a-z_][a-z0-9_.]*)\s+(?:as\s+\w+\s+)?set\b/gi },
  { rotulo: 'DROP TABLE', re: /\bdrop\s+table\s+(?:if\s+exists\s+)?(?:public\s*\.)?([a-z_][a-z0-9_.]*)/gi },
  { rotulo: 'DROP FUNCTION', re: /\bdrop\s+function\s+(?:if\s+exists\s+)?(?:public\s*\.)?([a-z_][a-z0-9_.]*)/gi },
  { rotulo: 'ALTER...DROP COLUMN', re: /\balter\s+table\s+(?:if\s+exists\s+)?(?:public\s*\.)?([a-z_][a-z0-9_.]*)[^;]{0,80}?\bdrop\s+(?:column\s+)?(?:if\s+exists\s+)?[a-z_]/gi }
]

function linhaDo(texto, indice) {
  let n = 1
  for (let i = 0; i < indice; i++) if (texto.charCodeAt(i) === 10) n++
  return n
}

/** Devolve {agora:[], funcao:[]} com {arquivo, linha, declaracao, alvo}. */
function vistoriar(arquivos) {
  const agora = []
  const funcao = []
  for (const arquivo of arquivos) {
    const t = texto.get(arquivo) ?? ''
    /* Marcadores de corpo de funcao: $$, $tag$ ... $tag$. Um statement esta dentro de
       um corpo se cair entre um abertura e o fechamento com o mesmo rotulo. */
    const marcas = [...t.matchAll(/\$[A-Za-z_0-9]*\$/g)]
    const dentroDeCorpo = (indice) => {
      for (let i = 0; i + 1 < marcas.length; i++) {
        const abre = marcas[i]
        const fecha = marcas[i + 1]
        if (abre[0] === fecha[0] && abre.index < indice && indice < fecha.index) return true
      }
      return false
    }
    const achados = []
    for (const { rotulo, re } of padroesDestrutivos) {
      for (const m of t.matchAll(re)) {
        const inicioLinha = Math.max(0, t.lastIndexOf('\n', m.index) + 1)
        if (/^\s*(--|\/\*)/.test(t.slice(inicioLinha, m.index))) continue
        achados.push({ arquivo, linha: linhaDo(t, m.index), declaracao: rotulo, alvo: (m[1] ?? '').replace(/^public\./, ''), indice: m.index })
      }
    }
    achados.sort((a, b) => a.indice - b.indice)
    for (const item of achados) (dentroDeCorpo(item.indice) ? funcao : agora).push(item)
  }
  return { agora, funcao }
}

const risco = vistoriar(emOrdem)
const relatorioRisco = [
  ...risco.agora.map((r) => `--   [RODA NA COLAGEM] ${r.declaracao}${r.alvo ? ' ' + r.alvo : ''}  —  ${r.arquivo}:${r.linha}`),
  ...risco.funcao.map((r) => `--   [SO RODA SE CHAMAR A RPC] ${r.declaracao}${r.alvo ? ' ' + r.alvo : ''}  —  ${r.arquivo}:${r.linha}`)
].join('\n') || '--   nenhum statement de escrita destrutiva encontrado'

const cabecalho = `-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — APLICAR AS MIGRATIONS QUE O BANCO AINDA NAO TEM
-- Gerado em ${new Date().toISOString().slice(0, 19)} por scripts/gerar-pacote-migrations-pendentes.mjs
-- Origem da lista: contrato medido no banco vivo (scripts/auditar-contrato-banco-vivo.mjs)
--
-- Medida no banco de agora: ${existentes} das ${usadas} tabelas que as telas usam existem.
-- Faltam ${faltando}, e todas elas ja tem migration escrita neste repo — o codigo esta na
-- frente do banco. O pacote abaixo contem exatamente essas migrations, copiadas sem
-- alteracao, em ordem de timestamp e fechadas por dependencia (${emOrdem.length} arquivo(s)).
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
${relatorioRisco}
--
-- NADA aqui apaga tabela, coluna ou migration existente. Se os itens de cima nao
-- forem aceitaveis agora, apague apenas os blocos marcados antes de colar: o pacote
-- nao precisa dos DELETE para criar as tabelas que faltam.
-- ============================================================================

`

const corpo = emOrdem
  .map((f) => {
    const motivo = fila.find((x) => x.arquivo === f)?.motivo ?? 'ordem dependente'
    return `-- >>>>>>>>>>>>>>>>>>>> ${f}  (${motivo}) >>>>>>>>>>>>>>>>>>>>\n${texto.get(f).trimEnd()}\n-- <<<<<<<<<<<<<< <<<< ${f} >>>>\n`
  })
  .join('\n')

const rodape = `
notify pgrst, 'reload schema';
`

fs.writeFileSync(SAIDA, cabecalho + corpo + rodape, 'utf8')
const linhas = (cabecalho + corpo + rodape).split('\n').length
console.log('PACOTE_GERADO ' + SAIDA)
console.log('migrations_no_pacote=' + emOrdem.length + ' linhas=' + linhas + ' bytes=' + Buffer.byteLength(cabecalho + corpo + rodape))
for (const f of emOrdem) console.log('  + ' + f + '  <- ' + (fila.find((x) => x.arquivo === f)?.motivo ?? ''))
console.log('RISCO | roda_na_colagem=' + risco.agora.length + ' | so_se_chamar_rpc=' + risco.funcao.length)
for (const r of risco.agora) console.log('  ! AGORA ' + r.declaracao + ' ' + r.alvo + ' — ' + r.arquivo + ':' + r.linha)
for (const r of risco.funcao) console.log('  ~ FUNCAO ' + r.declaracao + ' ' + r.alvo + ' — ' + r.arquivo + ':' + r.linha)
