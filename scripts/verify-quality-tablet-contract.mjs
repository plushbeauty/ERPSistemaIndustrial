#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const qualityPath = path.join(root, 'src/pages/QualidadeCentralTablet.tsx');
const shellPath = path.join(root, 'src/components/layout/ERPHorizontalShell.tsx');
const routerPath = path.join(root, 'src/AppEntryV2.tsx');
const failures = [];

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(`Arquivo obrigatório ausente: ${path.relative(root, file)}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

const quality = read(qualityPath);
const shell = read(shellPath);
const router = read(routerPath);
const moduleRoutes = [...quality.matchAll(/route:\s*'([^']+)'/g)].map(match => match[1]);
const routeDeclarations = new Set([...router.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map(match => match[1]));
const duplicates = moduleRoutes.filter((route, index) => moduleRoutes.indexOf(route) !== index);
const missing = moduleRoutes.filter(route => !routeDeclarations.has(route));

if (moduleRoutes.length !== 22) failures.push(`Esperados 22 atalhos operacionais da Qualidade; encontrados ${moduleRoutes.length}.`);
if (duplicates.length) failures.push(`Rotas duplicadas no tablet: ${[...new Set(duplicates)].join(', ')}.`);
if (missing.length) failures.push(`Atalhos sem rota declarada: ${[...new Set(missing)].join(', ')}.`);
if (!shell.includes("label: 'Gestão da Qualidade'") || !shell.includes('setTabletOpen(true)')) {
  failures.push('O menu horizontal não abre o tablet da Qualidade em modal.');
}
if (!shell.includes('role="dialog"') || !shell.includes('aria-modal="true"')) {
  failures.push('O modal do tablet deve expor semântica acessível de diálogo modal.');
}
if (!shell.includes('qualityModules.map')) failures.push('O modal não renderiza a lista central de módulos da Qualidade.');

if (failures.length) {
  console.error('VERIFICAÇÃO DO TABLET DA QUALIDADE: FALHA');
  for (const failure of failures) console.error(`[BLOCKER] ${failure}`);
  process.exit(1);
}

console.log(`VERIFICAÇÃO DO TABLET DA QUALIDADE: OK — ${moduleRoutes.length} atalhos, rotas declaradas e modal acessível.`);
