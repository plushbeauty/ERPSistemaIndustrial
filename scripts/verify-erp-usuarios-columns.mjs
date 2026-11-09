import fs from 'node:fs'
import path from 'node:path'

/*
 * SYSNQRA ERP INDUSTRIAL — trava de colunas de erp_usuarios
 *
 * Evidência (aba Network do proprietário, 2026-11-05):
 *   GET /rest/v1/erp_usuarios?select=id,nome,matricula&ativo=eq.true
 *     → HTTP 400 · PostgreSQL 42703 · column erp_usuarios.matricula does not exist
 *
 * A matrícula é coluna de erp_funcionarios e rh_funcionarios (unique (empresa_id, matricula)
 * criado em 20261009180000). Em erp_usuarios ela nunca existiu. Ordem do proprietário:
 * "Não criar coluna artificial em erp_usuarios para esconder o erro."
 *
 * Este guarda proibe a coluna de voltar em qualquer caminho que leia ou escreva a tabela:
 * select/eq/in/ilike/order da cadeia, corpo de insert/update, `patch.matricula` escrito antes
 * do update, embed `...:erp_usuarios(...)` e migration que crie a coluna.
 * Ele NÃO olha erp_funcionarios nem rh_funcionarios: lá a coluna é legítima.
 *
 * Regra de mudança: nenhuma. Se este guarda falhar, a correção é tirar a coluna da consulta,
 * nunca criar a coluna na tabela.
 */

const ROOT = path.resolve(import.meta.dirname, '..')
const TABLE = 'erp_usuarios'
const WINDOW_CHARS = 700
const EMBED_CHARS = 200

const scanDirs = [
  { rel: 'src', exts: new Set(['.ts', '.tsx', '.js', '.jsx']) },
  { rel: 'supabase/functions', exts: new Set(['.ts', '.js', '.mjs']) },
]

const CHAIN_SOURCE = `\\.from\\(\\s*['"\`]\\s*${TABLE}\\s*['"\`]\\s*\\)`

const failures = []

function stripComments(text) {
  let out = ''
  let i = 0
  let mode = 'code' // code | line | block | single | double | backtick
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]
    if (mode === 'code') {
      if (ch === '/' && next === '/') { mode = 'line'; i += 2; continue }
      if (ch === '/' && next === '*') { mode = 'block'; i += 2; continue }
      if (ch === "'") { mode = 'single'; out += ch; i++; continue }
      if (ch === '"') { mode = 'double'; out += ch; i++; continue }
      if (ch === '`') { mode = 'backtick'; out += ch; i++; continue }
      out += ch; i++; continue
    }
    if (mode === 'line') {
      if (ch === '\n') { mode = 'code'; out += ch }
      i++; continue
    }
    if (mode === 'block') {
      if (ch === '*' && next === '/') { mode = 'code'; i += 2; continue }
      out += ch === '\n' ? '\n' : ' '
      i++; continue
    }
    if (ch === '\\') { out += ch + (next ?? ''); i += 2; continue }
    if ((mode === 'single' && ch === "'") || (mode === 'double' && ch === '"') || (mode === 'backtick' && ch === '`')) mode = 'code'
    out += ch
    i++
  }
  return out
}

function lineOf(text, index) {
  let line = 1
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++
  return line
}

function collectFiles(dir, exts, out) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectFiles(full, exts, out)
    else if (exts.has(path.extname(entry.name).toLowerCase())) out.push(full)
  }
}

// Uma cadeia vai do .from('erp_usuarios') até o próximo .from( ou o fim do arquivo.
function chainWindows(code) {
  const windows = []
  const targetRe = new RegExp(CHAIN_SOURCE, 'g')
  const nextFrom = /\.from\(/g
  let match
  while ((match = targetRe.exec(code))) {
    const start = match.index + match[0].length
    nextFrom.lastIndex = start
    const nxt = nextFrom.exec(code)
    const end = Math.min(nxt ? nxt.index : code.length, start + WINDOW_CHARS)
    windows.push({ start, slice: code.slice(start, end) })
  }
  return windows
}

// Analisa código sem comentários e devolve violações com número de linha.
function scanCode(code, label) {
  const found = []
  const windows = chainWindows(code)

  for (const win of windows) {
    if (!/matricula/i.test(win.slice)) continue
    const offset = win.slice.toLowerCase().indexOf('matricula')
    const near = win.slice.slice(Math.max(0, offset - 60), offset + 70).replace(/\s+/g, ' ').trim()
    found.push(`${label}:${lineOf(code, win.start + offset)} — cadeia de ${TABLE} pede a coluna matricula (42703). Trecho: …${near}…`)
  }

  // corpo de escrita montado fora da cadeia: patch.matricula alimenta .update(patch)
  const writesToTable = windows.some(w => /\.insert\(|\.update\(/.test(w.slice))
  if (writesToTable) {
    for (const re of [/\b[A-Za-z_$][\w$]*\.matricula\b/g, /\bmatricula\s*:/g]) {
      let m
      while ((m = re.exec(code))) {
        found.push(`${label}:${lineOf(code, m.index)} — corpo de escrita em ${TABLE} cita matricula, coluna que não existe (42703). Trecho: ${code.slice(m.index, m.index + 40).replace(/\s+/g, ' ').trim()}`)
      }
    }
  }

  // embed PostgREST: responsavel:erp_usuarios(nome,matricula)
  const embedRe = new RegExp(TABLE, 'g')
  let e
  while ((e = embedRe.exec(code))) {
    const before = code.slice(Math.max(0, e.index - 12), e.index)
    if (/\.from\(\s*['"\s]*$/.test(before)) continue
    const until = code.indexOf(')', e.index)
    const end = until === -1 ? e.index + EMBED_CHARS : Math.min(until, e.index + EMBED_CHARS)
    const slice = code.slice(e.index + TABLE.length, end)
    if (!/matricula/i.test(slice)) continue
    found.push(`${label}:${lineOf(code, e.index)} — embed de ${TABLE} seleciona matricula (42703). Trecho: …${slice.replace(/\s+/g, ' ').trim().slice(0, 120)}…`)
  }

  return { found, anchors: windows.length }
}

function rel(full) {
  return path.relative(ROOT, full).replaceAll(path.sep, '/')
}

// Auto-verificação: as violações plantadas têm de ser pegas. Sem isto o guarda pode passar
// por cego (regex quebrada) e o 42703 voltar silencioso.
const selfTest = stripComments(
  `await supabase.from('${TABLE}').select('id,nome,matricula')\n` +
  `const patch = {}\npatch.matricula = '1'\nawait admin.from('${TABLE}').update(patch)\n` +
  `await supabase.from('erp_qualidade_acoes').select('responsavel:${TABLE}(nome,matricula)')\n`,
)
const self = scanCode(selfTest, 'fixtures')
if (self.found.length < 3) {
  console.error(`[BLOCKER] TRAVA CEGA: o auto-teste plantou 3 violações e o guarda achou ${self.found.length}.`)
  console.error('RESULT: FAIL — o verificador está quebrado, não o projeto.')
  process.exit(2)
}

const sourceFiles = []
for (const { rel: dir, exts } of scanDirs) collectFiles(path.join(ROOT, dir), exts, sourceFiles)

let filesWithChain = 0
for (const full of sourceFiles) {
  const raw = fs.readFileSync(full, 'utf8')
  if (!raw.includes(TABLE)) continue
  const result = scanCode(stripComments(raw), rel(full))
  failures.push(...result.found)
  if (result.anchors) filesWithChain++
}

// Migrations: proibir criar/alterar a coluna em erp_usuarios.
const migrationsDir = path.join(ROOT, 'supabase', 'migrations')
let migrationStatements = 0
if (fs.existsSync(migrationsDir)) {
  for (const entry of fs.readdirSync(migrationsDir)) {
    if (!entry.endsWith('.sql')) continue
    const full = path.join(migrationsDir, entry)
    const code = stripComments(fs.readFileSync(full, 'utf8'))
    for (const stmt of code.split(';')) {
      if (!new RegExp(TABLE, 'i').test(stmt)) continue
      migrationStatements++
      if (!/matricula/i.test(stmt)) continue
      if (/drop\s+column[\s\S]{0,40}matricula/i.test(stmt)) continue
      failures.push(`${rel(full)} — migration toca matricula em ${TABLE}; a correção aprovada é remover a coluna da consulta, não criá-la.`)
    }
  }
}

if (!filesWithChain) {
  console.error(`[BLOCKER] TRAVA CEGA: nenhuma cadeia .from('${TABLE}') encontrada, mas a tabela é citada no repo.`)
  process.exit(2)
}

console.log('=== ERP INDUSTRIAL — TRAVA DE COLUNAS DE erp_usuarios ===')
console.log('Arquivos de código analisados:', sourceFiles.length, '| com cadeia em', TABLE + ':', filesWithChain)
console.log('Statements de migration com a tabela:', migrationStatements)
console.log('Auto-teste da trava: OK —', self.found.length, 'violações plantadas detectadas')
console.log('Falhas:', failures.length)
for (const failure of failures) console.log('[BLOCKER]', failure)
if (failures.length) {
  console.log('RESULT: FAIL — a coluna matricula voltou para erp_usuarios (PostgreSQL 42703).')
  process.exit(2)
}
console.log(`RESULT: PASS — nenhuma consulta, corpo de escrita, embed ou migration pede matricula de ${TABLE}; a matrícula permanece em erp_funcionarios/rh_funcionarios.`)
