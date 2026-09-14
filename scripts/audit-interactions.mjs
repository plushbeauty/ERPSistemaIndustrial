#!/usr/bin/env node
/**
 * SGQ ERP — auditoria estática de telas/interações.
 *
 * O scanner é deliberadamente leve: percorre cada arquivo linha a linha e
 * usa uma pequena máquina de estados para reconhecer tags interativas sem
 * construir regex globais sobre o arquivo inteiro. Isso evita crescimento
 * desnecessário do heap em repositórios grandes.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'src');
const exts = new Set(['.tsx', '.jsx', '.js']);
const skip = new Set(['node_modules', 'dist', '.git']);
const blocking = [];
const warnings = [];
let filesAnalyzed = 0;

const INTERACTIVE = /<(button|a|Link)\b/i;
const PLACEHOLDER = /(console\.log\s*\(|TODO|FIXME|em breve|em\s+desenvolvimento|coming\s+soon)/i;
const ACTION = /\b(onClick|onSubmit|onChange|to|href|type)\s*=/i;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (skip.has(ent.name)) continue;
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file);
    else if (exts.has(path.extname(ent.name))) scan(file);
  }
}

function relative(file) {
  return path.relative(process.cwd(), file);
}

function normalizeHandler(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\b[a-zA-Z_$][\w$]*\b/g, 'ID')
    .trim();
}

function scan(file) {
  filesAnalyzed += 1;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const handlers = new Map();

  // Pequena máquina de estados: acumula somente a tag interativa atual,
  // nunca o arquivo inteiro em uma expressão regular global.
  let tag = null;
  let tagStart = 0;
  let quote = null;
  let braceDepth = 0;
  let handlerBuffer = '';
  let handlerStart = 0;

  const finishTag = (lineNumber) => {
    if (!tag) return;
    const text = tag.text;
    if (!ACTION.test(text)) {
      blocking.push({ type: 'SEM_ACAO', file: relative(file), line: tagStart, label: text.slice(0, 180) });
    }
    if (PLACEHOLDER.test(text)) {
      blocking.push({ type: 'PLACEHOLDER', file: relative(file), line: tagStart, label: text.slice(0, 180) });
    }
    tag = null;
    quote = null;
    braceDepth = 0;
    handlerBuffer = '';
    handlerStart = lineNumber;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!tag) {
      const start = line.search(INTERACTIVE);
      if (start >= 0) {
        tag = { text: line.slice(start) };
        tagStart = i + 1;
      }
    } else {
      tag.text += ` ${line}`;
    }

    if (tag) {
      for (let c = 0; c < line.length; c += 1) {
        const ch = line[c];
        if (quote) {
          if (ch === quote && line[c - 1] !== '\\') quote = null;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
          quote = ch;
          continue;
        }
        if (ch === '{') braceDepth += 1;
        else if (ch === '}' && braceDepth > 0) braceDepth -= 1;
        if (ch === '>' && braceDepth === 0) {
          finishTag(i + 1);
          break;
        }
      }
    }

    // Mantém apenas uma janela pequena para detectar handlers e duplicações.
    if (/\bonClick\s*=/.test(line) || /\bonSubmit\s*=/.test(line)) {
      handlerBuffer = `${handlerBuffer} ${line}`.slice(-1200);
      if (!handlerStart) handlerStart = i + 1;
      const normalized = normalizeHandler(handlerBuffer);
      if (normalized.length >= 8) {
        const list = handlers.get(normalized) || [];
        list.push(handlerStart);
        handlers.set(normalized, list);
      }
      handlerBuffer = '';
      handlerStart = 0;
    }
  }

  if (tag) finishTag(lines.length);

  for (const [key, lineList] of handlers) {
    if (lineList.length > 1) {
      warnings.push({
        type: 'DUPLICADO_POTENCIAL',
        file: relative(file),
        line: lineList.join(','),
        label: key.slice(0, 180),
      });
    }
  }
}

if (!fs.existsSync(root)) {
  console.error(`Diretório não encontrado: ${root}`);
  process.exitCode = 2;
} else {
  walk(root);
  console.log('\nSGQ ERP — AUDITORIA DE INTERAÇÕES');
  console.log(`Arquivos analisados: ${filesAnalyzed}`);
  console.log(`Bloqueios: ${blocking.length}`);
  console.log(`Alertas de revisão: ${warnings.length}\n`);
  for (const item of blocking) console.log(`[BLOQUEIO:${item.type}] ${item.file}:${item.line} — ${item.label}`);
  for (const item of warnings) console.log(`[ALERTA:${item.type}] ${item.file}:${item.line} — ${item.label}`);
  if (!blocking.length) console.log('OK — nenhum bloqueio estático encontrado.');
  process.exitCode = blocking.length ? 1 : 0;
}
