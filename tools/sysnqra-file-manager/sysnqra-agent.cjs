#!/usr/bin/env node
'use strict'

/**
 * SYSNQRA FILE MANAGER INDUSTRIAL — AGENTE LOCAL
 * Node.js 20+; módulos nativos apenas.
 *
 * Segurança:
 * - Não inicia sem token forte configurado por ambiente/argumento.
 * - Escuta em loopback por padrão; rede exige configuração deliberada.
 * - CORS por allowlist, autenticação Bearer, limite de upload e caminhos confinados.
 * - Diretórios escolhidos são persistidos no arquivo local de configuração.
 */
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const os = require('node:os')
const { URL } = require('node:url')

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const match = /^--([^=]+)=(.*)$/.exec(arg)
  return match ? [match[1], match[2]] : [arg.replace(/^--/, ''), true]
}))
const port = Number(args.port || process.env.SYSNQRA_PORT || 8970)
const host = String(args.host || process.env.SYSNQRA_HOST || '127.0.0.1')
const tokenFile = String(process.env.SYSNQRA_TOKEN_FILE || '')
const token = String(args.token || process.env.SYSNQRA_TOKEN || (tokenFile ? fs.readFileSync(tokenFile, 'utf8').trim() : ''))
const configPath = path.resolve(String(args.config || process.env.SYSNQRA_CONFIG || path.join(__dirname, 'sysnqra-agent-config.json')))
const corsOrigins = new Set(String(process.env.SYSNQRA_CORS_ORIGINS || 'https://erp-sistema-industrial.vercel.app,http://localhost:5173,http://127.0.0.1:5173').split(',').map(v => v.trim()).filter(Boolean))
const maxUploadBytes = Math.max(1, Number(process.env.SYSNQRA_MAX_UPLOAD_MB || 100)) * 1024 * 1024
const DEFAULT_FOLDERS = ['fotos', 'imagens', 'desenhos-tecnicos', 'documentos', 'pcp', 'fichas-processo', 'moldes', 'qualidade', 'engenharia', 'compras', 'produtos', 'clientes', 'fornecedores', 'documentos-gerais']
const MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.xml': 'application/xml',
  '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.step': 'application/step', '.stp': 'application/step', '.dwg': 'image/vnd.dwg',
}
let config = {
  primaryPath: path.resolve(String(args.primary || process.env.SYSNQRA_PRIMARY_PATH || 'C:\\SYSNQRA\\Arquivos')),
  networkPath: String(args.network || process.env.SYSNQRA_NETWORK_PATH || ''),
  tenantId: '',
}

function sendJson(res, status, data, extra = {}) {
  const body = Buffer.from(JSON.stringify(data))
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', ...extra })
  res.end(body)
}
function authOk(req) {
  const header = String(req.headers.authorization || '')
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match || !token) return false
  const provided = Buffer.from(match[1].trim())
  const expected = Buffer.from(token)
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
}
function isAllowedOrigin(origin) {
  if (corsOrigins.has(origin)) return true
  // Permite previews do projeto oficial, sem liberar origens arbitrárias do vercel.app.
  return /^https:\\/\\/erp-sistema-industrial-[a-z0-9-]+-plushbeauty\\.vercel\\.app$/i.test(origin)
}
function sendCors(req, res) {
  const origin = req.headers.origin
  if (origin && !isAllowedOrigin(origin)) {
    sendJson(res, 403, { error: 'Origem não autorizada pelo agente. Configure SYSNQRA_CORS_ORIGINS.' })
    return false
  }
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  }
  if (origin && isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers); res.end(); return false
  }
  req.corsHeaders = headers
  return true
}
function saveConfig(next) {
  const temp = configPath + '.tmp'
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(temp, JSON.stringify(next, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })
  fs.renameSync(temp, configPath)
  config = next
}
function loadConfig() {
  try {
    const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    if (typeof saved.primaryPath === 'string' && saved.primaryPath) config.primaryPath = path.resolve(saved.primaryPath)
    if (typeof saved.networkPath === 'string') config.networkPath = saved.networkPath
    if (typeof saved.tenantId === 'string') config.tenantId = saved.tenantId
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
}
function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); return fs.statSync(dir).isDirectory() } catch { return false }
}
function safeSlug(value) {
  if (typeof value !== 'string' || !value || value === '.' || value === '..' || /[<>:"|?*\x00-\x1f]/.test(value) || value.includes('/') || value.includes('\\')) {
    throw new Error('Nome de pasta inválido.')
  }
  return value
}
function safeResolve(root, subpath) {
  if (typeof subpath !== 'string' || subpath.includes('\x00')) throw new Error('Caminho inválido.')
  const relative = subpath.replace(/^[\\/]+/, '')
  const resolvedRoot = path.resolve(root)
  const candidate = path.resolve(resolvedRoot, relative)
  const rel = path.relative(resolvedRoot, candidate)
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw new Error('Caminho fora da pasta autorizada.')
  // Também bloqueia fuga por links simbólicos/junctions em diretórios existentes.
  const rootReal = fs.realpathSync(resolvedRoot)
  let ancestor = candidate
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor)
    if (parent === ancestor) break
    ancestor = parent
  }
  const ancestorReal = fs.realpathSync(ancestor)
  const realRel = path.relative(rootReal, ancestorReal)
  if (realRel === '..' || realRel.startsWith('..' + path.sep) || path.isAbsolute(realRel)) throw new Error('Caminho fora da pasta autorizada.')
  if (fs.existsSync(candidate)) {
    const candidateReal = fs.realpathSync(candidate)
    const candidateRel = path.relative(rootReal, candidateReal)
    if (candidateRel === '..' || candidateRel.startsWith('..' + path.sep) || path.isAbsolute(candidateRel)) throw new Error('Caminho fora da pasta autorizada.')
  }
  return candidate
}
function parseBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let total = 0; let tooLarge = false
    req.on('data', chunk => {
      total += chunk.length
      if (total > limit) { tooLarge = true; chunks.length = 0; return }
      if (!tooLarge) chunks.push(chunk)
    })
    req.on('end', () => {
      if (tooLarge) { reject(Object.assign(new Error('Corpo da solicitação excede o limite permitido.'), { statusCode: 413 })); return }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { reject(Object.assign(new Error('JSON inválido.'), { statusCode: 400 })) }
    })
    req.on('error', reject)
  })
}
function statFile(file) {
  try { const stat = fs.statSync(file); return stat.isFile() ? stat : null } catch { return null }
}
function streamFile(req, res, file, origin, corsHeaders) {
  const stat = statFile(file)
  if (!stat) return sendJson(res, 404, { error: 'Arquivo não encontrado.' }, corsHeaders)
  res.writeHead(200, {
    ...corsHeaders, 'Content-Type': MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size, 'X-Content-Type-Options': 'nosniff',
    'X-SYSNQRA-Storage-Origin': origin, 'Cache-Control': 'private, max-age=60',
  })
  const stream = fs.createReadStream(file)
  stream.on('error', () => { if (!res.headersSent) sendJson(res, 500, { error: 'Falha ao ler arquivo.' }, corsHeaders); else res.destroy() })
  stream.pipe(res)
}
function readFileRoots(relative) {
  const roots = [{ root: config.primaryPath, label: 'local' }]
  if (config.networkPath) roots.push({ root: config.networkPath, label: 'network' })
  for (const item of roots) {
    try {
      const candidate = safeResolve(item.root, relative)
      const stat = statFile(candidate)
      if (stat) return { candidate, label: item.label }
    } catch { /* Caminho inválido não é pesquisado em outra raiz. */ }
  }
  return null
}

loadConfig()
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SYSNQRA_PORT inválida.')
if (token.length < 32 || /CHANGE_ME|DEFAULT_TOKEN/i.test(token)) {
  console.error('[SYSNQRA-AGENT] Configure SYSNQRA_TOKEN com segredo aleatório de pelo menos 32 caracteres.')
  process.exit(1)
}
if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1' && corsOrigins.size === 0) {
  throw new Error('Ao expor o agente na rede, configure SYSNQRA_CORS_ORIGINS.')
}

const server = http.createServer(async (req, res) => {
  if (!sendCors(req, res)) return
  const cors = req.corsHeaders || {}
  let parsed
  try { parsed = new URL(req.url || '/', 'http://localhost') } catch { return sendJson(res, 400, { error: 'URL inválida.' }, cors) }
  const route = parsed.pathname

  if (route === '/health' && req.method === 'GET') {
    if (!authOk(req)) return sendJson(res, 401, { error: 'Token ausente ou inválido.' }, cors)
    if (config.tenantId && String(req.headers['x-sysnqra-company-id'] || '') !== config.tenantId) return sendJson(res, 403, { error: 'Empresa não autorizada neste agente.' }, cors)
    return sendJson(res, 200, {
      status: 'ONLINE', service: 'SYSNQRA File Manager Industrial Agent', version: '1.1.0',
      hostname: os.hostname(), platform: os.platform(), uptimeSeconds: Math.floor(process.uptime()),
      primaryPathConfigured: Boolean(config.primaryPath), networkPathConfigured: Boolean(config.networkPath),
    }, cors)
  }
  if (!authOk(req)) return sendJson(res, 401, { error: 'Não autorizado.' }, cors)
  if (route !== '/validate-paths' && (!config.tenantId || String(req.headers['x-sysnqra-company-id'] || '') !== config.tenantId)) {
    return sendJson(res, 403, { error: 'Empresa não autorizada neste agente.' }, cors)
  }

  if (route === '/validate-paths' && req.method === 'POST') {
    try {
      const body = await parseBody(req)
      const companyId = String(body.companyId || '')
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId)) throw new Error('Empresa da sessão inválida.')
      if (String(req.headers['x-sysnqra-company-id'] || '') !== companyId) throw new Error('Cabeçalho de empresa não corresponde à configuração.')
      if (config.tenantId && config.tenantId !== companyId) throw new Error('Este agente já está vinculado a outra empresa. Use uma instalação isolada por empresa.')
      const primaryPath = path.resolve(String(body.primaryPath || config.primaryPath))
      const networkPath = String(body.networkPath || '')
      const folders = body.autoCreateFolders === false ? [] : (Array.isArray(body.folders) ? body.folders : DEFAULT_FOLDERS)
      if (folders.length > 100 || folders.some(folder => typeof folder !== 'string')) throw new Error('Lista de pastas inválida.')
      folders.forEach(safeSlug)
      const primaryOk = ensureDir(primaryPath)
      if (!primaryOk) return sendJson(res, 200, { success: false, primaryOk: false, networkOk: false, createdFolders: [], error: 'Não foi possível acessar a pasta principal.' }, cors)
      let networkOk = true
      if (networkPath) networkOk = ensureDir(networkPath)
      const createdFolders = []
      if (body.autoCreateFolders !== false) {
        for (const folder of folders) {
          if (ensureDir(path.join(primaryPath, folder))) createdFolders.push('local:' + folder)
          if (networkPath && networkOk && ensureDir(path.join(networkPath, folder))) createdFolders.push('rede:' + folder)
        }
      }
      const next = { primaryPath, networkPath: networkOk ? networkPath : '', tenantId: companyId }
      saveConfig(next)
      return sendJson(res, 200, { success: true, primaryOk, networkOk: Boolean(networkOk && networkPath), createdFolders, configured: true }, cors)
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: err.message || 'Falha ao validar diretórios.' }, cors)
    }
  }

  if (route === '/file' && req.method === 'GET') {
    const subpath = parsed.searchParams.get('path')
    if (!subpath) return sendJson(res, 400, { error: 'Parâmetro path obrigatório.' }, cors)
    try {
      const found = readFileRoots(subpath)
      if (!found) return sendJson(res, 404, { error: 'Arquivo não encontrado no armazenamento local ou na rede.', searchedPath: subpath }, cors)
      return streamFile(req, res, found.candidate, found.label, cors)
    } catch (err) { return sendJson(res, 400, { error: err.message }, cors) }
  }

  if (route === '/upload' && req.method === 'POST') {
    const folder = parsed.searchParams.get('folder') || 'documentos-gerais'
    let fileName = parsed.searchParams.get('filename') || ('arquivo_' + Date.now())
    try {
      safeSlug(folder)
      fileName = path.basename(fileName)
      if (!fileName || fileName === '.' || fileName === '..' || /[\x00-\x1f]/.test(fileName)) throw new Error('Nome de arquivo inválido.')
      const dir = safeResolve(config.primaryPath, folder)
      ensureDir(dir)
      if (!fs.statSync(dir).isDirectory()) throw new Error('Destino não é uma pasta.')
      const destination = safeResolve(dir, fileName)
      const tempPath = destination + '.' + crypto.randomBytes(6).toString('hex') + '.part'
      const hash = crypto.createHash('sha256'); let bytes = 0
      const output = fs.createWriteStream(tempPath, { flags: 'wx' })
      let rejected = false
      req.on('data', chunk => {
        bytes += chunk.length
        if (bytes > maxUploadBytes && !rejected) {
          rejected = true; req.destroy(new Error('Upload excede o limite de tamanho.')); output.destroy()
        } else { hash.update(chunk); output.write(chunk) }
      })
      req.on('error', err => { rejected = true; output.destroy(err) })
      req.on('end', () => {
        if (rejected) return
        output.end(() => {
          try {
            fs.renameSync(tempPath, destination)
            const digest = hash.digest('hex')
            let replicated = false
            if (parsed.searchParams.get('replicate_network') === 'true' && config.networkPath) {
              try {
                const networkDir = safeResolve(config.networkPath, folder)
                ensureDir(networkDir)
                fs.copyFileSync(destination, safeResolve(networkDir, fileName), fs.constants.COPYFILE_EXCL)
                replicated = true
              } catch (err) { console.warn('[SYSNQRA-AGENT] Replicação não concluída:', err.message) }
            }
            return sendJson(res, 201, { success: true, relativePath: path.posix.join(folder, fileName), sizeBytes: bytes, sha256: digest, savedLocal: true, replicatedToNetwork: replicated }, cors)
          } catch (err) { try { fs.unlinkSync(tempPath) } catch {} ; return sendJson(res, 500, { error: 'Falha ao finalizar arquivo: ' + err.message }, cors) }
        })
      })
    } catch (err) { return sendJson(res, 400, { error: err.message }, cors) }
    return
  }

  if (route === '/list' && req.method === 'GET') {
    try {
      const folder = parsed.searchParams.get('folder') || ''
      const target = safeResolve(config.primaryPath, folder)
      if (!fs.existsSync(target)) return sendJson(res, 200, { folder, files: [] }, cors)
      const stat = fs.statSync(target)
      if (!stat.isDirectory()) return sendJson(res, 400, { error: 'O caminho informado não é uma pasta.' }, cors)
      const files = fs.readdirSync(target, { withFileTypes: true }).map(entry => {
        const full = safeResolve(target, entry.name)
        const item = fs.lstatSync(full)
        return { name: entry.name, isDirectory: item.isDirectory(), sizeBytes: item.isFile() ? item.size : 0, updatedAt: item.mtime.toISOString() }
      })
      return sendJson(res, 200, { folder, files }, cors)
    } catch (err) { return sendJson(res, 400, { error: err.message }, cors) }
  }

  return sendJson(res, 404, { error: 'Endpoint não encontrado no agente SYSNQRA.' }, cors)
})

server.listen(port, host, () => {
  console.log('SYSNQRA File Manager Agent 1.1.0')
  console.log('Host: ' + host + ' | Porta: ' + port)
  console.log('Pasta principal: ' + config.primaryPath)
  console.log('Rede: ' + (config.networkPath || 'não configurada'))
  console.log('Token: obrigatório | CORS: ' + [...corsOrigins].join(', '))
})
server.requestTimeout = 120000
server.headersTimeout = 30000
server.keepAliveTimeout = 5000
