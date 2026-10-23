'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const net = require('node:net')
const { spawn } = require('node:child_process')
const crypto = require('node:crypto')

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(error => error ? reject(error) : resolve(port))
    })
  })
}

test('agente autentica, vincula empresa, cria pastas e bloqueia traversal', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sysnqra-agent-test-'))
  const primary = path.join(temp, 'storage')
  const config = path.join(temp, 'agent-config.json')
  const port = await freePort()
  const token = crypto.randomBytes(32).toString('hex')
  const companyId = crypto.randomUUID()
  const child = spawn(process.execPath, [
    path.join(__dirname, 'sysnqra-agent.cjs'),
    '--host=127.0.0.1', '--port=' + port, '--token=' + token,
    '--config=' + config, '--primary=' + primary,
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  let logs = ''
  child.stdout.on('data', chunk => { logs += chunk.toString() })
  child.stderr.on('data', chunk => { logs += chunk.toString() })
  t.after(() => {
    child.kill()
    fs.rmSync(temp, { recursive: true, force: true })
  })

  const base = 'http://127.0.0.1:' + port
  const headers = { Authorization: 'Bearer ' + token, 'X-SYSNQRA-Company-ID': companyId }
  let ready = false
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) assert.fail('Agente encerrou na inicialização: ' + logs)
    try {
      const response = await fetch(base + '/health', { headers })
      if (response.ok) { ready = true; break }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.equal(ready, true, 'agente deve ficar disponível')

  const unauth = await fetch(base + '/health')
  assert.equal(unauth.status, 401)

  const setup = await fetch(base + '/validate-paths', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, primaryPath: primary, folders: ['fotos', 'imagens', 'desenhos-tecnicos', 'documentos'], autoCreateFolders: true }),
  })
  assert.equal(setup.status, 200)
  const setupData = await setup.json()
  assert.equal(setupData.success, true)
  for (const folder of ['fotos', 'imagens', 'desenhos-tecnicos', 'documentos']) {
    assert.equal(fs.statSync(path.join(primary, folder)).isDirectory(), true)
  }

  const wrongTenant = await fetch(base + '/list?folder=', {
    headers: { Authorization: 'Bearer ' + token, 'X-SYSNQRA-Company-ID': crypto.randomUUID() },
  })
  assert.equal(wrongTenant.status, 403)

  const traversal = await fetch(base + '/file?path=..%2F..%2Fetc%2Fpasswd', { headers })
  assert.ok([400, 404].includes(traversal.status), 'tentativa de traversal deve ser bloqueada sem revelar arquivo')

  const imageUpload = await fetch(base + '/upload?folder=imagens&filename=TESTSKU.png', {
    method: 'POST', headers, body: Buffer.from('fake-png-payload'),
  })
  assert.equal(imageUpload.status, 201)
  const resolvedImage = await fetch(base + '/resolve-image?name=TESTSKU&kind=product', { headers })
  assert.equal(resolvedImage.status, 200)
  assert.equal(resolvedImage.headers.get('content-type'), 'image/png')
  assert.equal(await resolvedImage.text(), 'fake-png-payload')

  const upload = await fetch(base + '/upload?folder=fotos&filename=teste.txt', {
    method: 'POST', headers, body: Buffer.from('SYSNQRA test file'),
  })
  assert.equal(upload.status, 201)
  const read = await fetch(base + '/file?path=fotos%2Fteste.txt', { headers })
  assert.equal(read.status, 200)
  assert.equal(await read.text(), 'SYSNQRA test file')
})
