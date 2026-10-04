import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve('src/AppIndustrialV7.tsx')
const source = readFileSync(file, 'utf8')
const needle = 'useState(segments[0].name)'
const replacement = "useState((new URLSearchParams(location.search).get('segmento') === 'industria_cosmeticos' ? 'Injetados / Prensados / Estampados' : segments[0].name))"
if (!source.includes(needle)) process.exit(0)
writeFileSync(file, source.replace(needle, replacement), 'utf8')
