/**
 * Contrato tela x banco, medido no banco VIVO (e nao nas migrations do repo).
 *
 * Como funciona sem chave secreta: o PostgREST devolve assinaturas diferentes para
 * objeto que existe e objeto que nao existe, mesmo para o papel anon sem grant.
 *   42501 "permission denied for table/function" -> o objeto EXISTE no banco
 *   PGRST205 "Could not find the table"          -> a TABELA NAO EXISTE
 *   PGRST202 "Could not find the function"       -> a FUNCAO RPC NAO EXISTE
 *   200                                            -> existe e o anon pode ler
 * A checagem de privilegio vem antes da de colunas, entao colunas so sao conferidas
 * nas tabelas que o anon consegue ler (linha COLUNAS_CONFERIDAS do sumario).
 *
 * Nada aqui escreve no banco: sao somente requisicoes GET com limit=0.
 *
 * Uso: node scripts/auditar-contrato-banco-vivo.mjs
 * Saida: sumario no stdout e o laudo completo em <temp>/sysnqra-live-contract.json
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = path.join(os.tmpdir(), 'sysnqra-live-contract.json')
const CONCORRENCIA = 8

function readEnv() {
  const file = path.join(ROOT, '.env.local')
  if (!fs.existsSync(file)) {
    console.error('ERRO: .env.local nao existe. Copie .env.example e preencha com a URL e a chave de cliente.')
    process.exit(1)
  }
  const txt = fs.readFileSync(file, 'utf8')
  const url = (txt.match(/^VITE_SUPABASE_URL=(.*)$/m) || [])[1]?.trim()
  const key =
    (txt.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.*)$/m) || [])[1]?.trim() ||
    (txt.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/m) || [])[1]?.trim()
  if (!url || !key) {
    console.error('ERRO: .env.local sem VITE_SUPABASE_URL e chave de cliente.')
    process.exit(1)
  }
  return { url: url.replace(/\/$/, ''), key }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(e.name)) out.push(full)
  }
  return out
}

const { url, key } = readEnv()
const headers = { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' }

/** Classifica uma requisicao GET somente-leitura contra o PostgREST. */
async function classificar(caminho) {
  let res
  try {
    res = await fetch(url + caminho, { headers })
  } catch (e) {
    return { estado: 'SEM_RESPOSTA', detalhe: String(e?.message ?? e).slice(0, 120) }
  }
  const status = res.status
  let corpo = ''
  try {
    corpo = await res.text()
  } catch {
    /* corpo irrelevante */
  }
  let json = {}
  try {
    json = JSON.parse(corpo)
  } catch {
    /* resposta sem JSON */
  }
  const code = String(json.code ?? '')
  const message = String(json.message ?? corpo ?? '').slice(0, 160)

  if (status === 200 || status === 206) return { estado: 'LEIVEL', status, message }
  if (code === '42501') return { estado: 'EXISTE_SEM_GRANT_ANON', status, message }
  if (code === 'PGRST205') return { estado: 'TABELA_NAO_EXISTE', status, message }
  if (code === 'PGRST202') return { estado: 'FUNCAO_NAO_EXISTE', status, message }
  if (code === 'PGRST106' || code === 'PGRST204') return { estado: 'EXISTS_COLUNA_PROBLEMA', status, message }
  if (status === 401 || status === 403) return { estado: 'BLOQUEADO_AUTENTICACAO', status, message }
  return { estado: 'OUTRO', status, message }
}

/** Percorre uma lista de nomes com numero limitado de requisicoes em voo. */
async function varrer(itens, mapper) {
  const fila = itens.map(mapper)
  const saida = []
  let ponteiro = 0
  const workers = Array.from({ length: Math.min(CONCORRENCIA, fila.length || 1) }, async () => {
    while (ponteiro < fila.length) {
      const atual = fila[ponteiro++]
      saida.push(await atual())
    }
  })
  await Promise.all(workers)
  return saida
}

const arquivos = walk(path.join(ROOT, 'src'))
const tabelasDaTela = new Map()
const rpcDasTelas = new Map()

const registrar = (mapa, nome, arquivo) => {
  if (!nome || nome.includes('$') || nome.includes('{')) return
  if (!mapa.has(nome)) mapa.set(nome, new Set())
  mapa.get(nome).add(arquivo)
}

for (const arquivo of arquivos) {
  const texto = fs.readFileSync(arquivo, 'utf8')
  if (!texto.includes('supabase')) continue
  const rel = path.relative(ROOT, arquivo).replace(/\\/g, '/')
  for (const m of texto.matchAll(/\.from\(\s*['"`]([a-z_][a-z0-9_]*)['"`]\s*\)/g)) registrar(tabelasDaTela, m[1], rel)
  for (const m of texto.matchAll(/\.rpc\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/g)) registrar(rpcDasTelas, m[1], rel)
}

const resultadosTabelas = await varrer([...tabelasDaTela.keys()].sort(), (nome) => async () => {
  const r = await classificar(`/rest/v1/${nome}?select=*&limit=0`)
  return { nome, arquivos: [...tabelasDaTela.get(nome)], ...r }
})
const resultadosRpc = await varrer([...rpcDasTelas.keys()].sort(), (nome) => async () => {
  const r = await classificar(`/rest/v1/rpc/${nome}`)
  return { nome, arquivos: [...rpcDasTelas.get(nome)], ...r }
})

const tabelasFaltando = resultadosTabelas.filter((r) => r.estado === 'TABELA_NAO_EXISTE')
const rpcFaltando = resultadosRpc.filter((r) => r.estado === 'FUNCAO_NAO_EXISTE')
const tabelasLeiveis = resultadosTabelas.filter((r) => r.estado === 'LEIVEL')
const bloqueadas = resultadosTabelas.filter((r) => r.estado === 'BLOQUEADO_AUTENTICACAO' || r.estado === 'SEM_RESPOSTA' || r.estado === 'OUTRO')

/**
 * Cruza cada tabela ausente com as migrations do repo: se existe um create table dela
 * em supabase/migrations, a pendencia e aplicar a migration; se so aparece em alter
 * table, a tabela nunca foi definida; se nao aparece em .sql nenhum, a tela pede uma
 * tabela que nao existe em lugar nenhum.
 */
const pastaMigrations = path.join(ROOT, 'supabase', 'migrations')
const migrations = fs.existsSync(pastaMigrations)
  ? fs
      .readdirSync(pastaMigrations)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => ({ arquivo: f, texto: fs.readFileSync(path.join(pastaMigrations, f), 'utf8').toLowerCase() }))
  : []

function ondeDefinida(nome) {
  const esc = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const cria = new RegExp('create table(?:\\s+if\\s+not\\s+exists)?\\s+(?:public\\.)?"?' + esc + '"?\\s*\\(', 's')
  const alter = new RegExp('alter table[^;\\n]*[^a-z0-9_]' + esc + '[^a-z0-9_]', 's')
  const emCreate = migrations.filter((m) => cria.test(m.texto))
  if (emCreate.length) return { classe: 'MIGRATION_EXISTE_NAO_APLICADA', migrations: emCreate.map((m) => m.arquivo) }
  const emAlter = migrations.filter((m) => alter.test(m.texto))
  if (emAlter.length) return { classe: 'SO_ALTER_NO_REPO_NUNCA_CRIADA', migrations: emAlter.slice(0, 3).map((m) => m.arquivo) }
  return { classe: 'TELA_PEDE_TABELA_INEXISTENTE', migrations: [] }
}

const laudoTabelas = tabelasFaltando.map((r) => ({ ...r, ...ondeDefinida(r.nome) }))
const rpcFaltandoComMigration = rpcFaltando.map((r) => {
  const esc = r.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const emCreate = migrations.filter((m) => new RegExp('create (?:or replace )?function[^;\\n]*[^a-z0-9_]' + esc + '\\s*\\(', 's').test(m.texto))
  return { ...r, classe: emCreate.length ? 'MIGRATION_EXISTE_NAO_APLICADA' : 'INDETERMINADO_PELO_REST', migrations: emCreate.map((m) => m.arquivo) }
})

fs.writeFileSync(
  OUT,
  JSON.stringify(
    { geradoEm: new Date().toISOString(), tabelas: resultadosTabelas, rpcs: resultadosRpc, faltantesCruzados: laudoTabelas },
    null,
    2,
  ),
  'utf8',
)

console.log('BANCO_CONECTADO host=' + url.replace(/^https:\/\//, ''))
console.log(`tabelas_usadas_pelas_telas=${resultadosTabelas.length}  rpc_usadas=${resultadosRpc.length}  migrations_no_repo=${migrations.length}`)
console.log(`TABELAS_FALTANDO=${tabelasFaltando.length}`)
for (const r of laudoTabelas)
  console.log(`  FALTA_TABELA ${r.nome} | ${r.classe} | ${r.migrations.join(', ') || 'nenhuma migration do repo cria'} | telas: ${r.arquivos.slice(0, 2).join(', ')}`)
console.log(`RPC_NAO_RESOLVIDAS=${rpcFaltando.length} (o REST nao distingue funcao inexistente de funcao que exige parametros; classe abaixo vem das migrations)`)
for (const r of rpcFaltandoComMigration) console.log(`  RPC ${r.nome} | ${r.classe} | ${r.migrations.slice(0, 2).join(', ') || '-'}`)
console.log(`COLUNAS_CONFERIDAS=${tabelasLeiveis.length} (tabelas que o anon le; nas demais a checagem de privilegio vem antes da de coluna)`)
if (bloqueadas.length) {
  console.log(`INDETERMINADAS=${bloqueadas.length}`)
  for (const r of bloqueadas.slice(0, 12)) console.log(`  INDETERMINADO ${r.nome} estado=${r.estado} status=${r.status ?? '-'} ${r.message ?? ''}`)
}
console.log('LAUDO=' + OUT)

