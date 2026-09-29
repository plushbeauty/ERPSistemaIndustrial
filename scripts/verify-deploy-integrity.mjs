const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true'
const isCi = process.env.CI === 'true'
const ref = String(process.env.VERCEL_GIT_COMMIT_REF || '').trim()
const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || '').trim()
const githubSha = String(process.env.GITHUB_SHA || '').trim()

console.log('=== ERP INDUSTRIAL — DEPLOY INTEGRITY GATE ===')
console.log('Vercel:', isVercel)
console.log('CI:', isCi)
console.log('Commit ref:', ref || '(não informado)')
console.log('Commit SHA present:', Boolean(sha || githubSha))

const failures = []

if (isVercel && !sha) failures.push('Vercel não informou VERCEL_GIT_COMMIT_SHA; deploy sem identidade verificável.')
if (isVercel && !ref) failures.push('Vercel não informou VERCEL_GIT_COMMIT_REF; deploy sem branch verificável.')
if (isVercel && ref === 'main' && process.env.VERCEL_ENV === 'production' && !sha) failures.push('Production exige SHA Git verificável.')
if (isCi && !githubSha) failures.push('CI não informou GITHUB_SHA; execução sem identidade verificável.')

for (const failure of failures) console.log('[BLOCKER]', failure)
console.log('Failures:', failures.length)

if (failures.length) {
  console.log('RESULT: FAIL — integridade do deploy não comprovada.')
  process.exit(3)
}

console.log('RESULT: PASS — identidade do build verificável.')
