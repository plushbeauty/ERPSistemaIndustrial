#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const qualityPath = path.join(root, 'src/features/qualidade/qualityModules.ts');
const pcpPath = path.join(root, 'src/pages/PCPIndustrial.tsx');
const qualityDashboardPath = path.join(root, 'src/pages/QualidadeDashboardSGQ.tsx');
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
const pcp = read(pcpPath);
const qualityDashboard = read(qualityDashboardPath);
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
if (!shell.includes("label: 'Gestão da Qualidade', route: '/qualidade', icon: ShieldCheck }")) {
  failures.push('Gestão da Qualidade deve apontar diretamente para /qualidade sem submenu.');
}
if (shell.includes("label: 'Gestão da Qualidade', route: '/qualidade', icon: ShieldCheck, children:")) {
  failures.push('O menu horizontal ainda contém submenu de Qualidade; a Central Tablet deve ficar dentro do painel.');
}
if (!shell.includes("erp:open-quality-tablet") || !qualityDashboard.includes("new Event('erp:open-quality-tablet')")) {
  failures.push('O botão Central Tablet do dashboard da Qualidade deve abrir o mesmo modal central.');
}
if (!qualityDashboard.includes('CENTRAL TABLET')) {
  failures.push('O painel da Qualidade deve exibir o botão Central Tablet.');
}
if (!shell.includes('erp-page-description') || !shell.includes('{contextualHelp.purpose}')) {
  failures.push('O shell autenticado deve exibir a descrição contextual logo abaixo do menu.');
}
if (!shell.includes('.erp-horizontal-workspace-compact input') || !shell.includes('focus{border-color:#2d8db8')) {
  failures.push('O padrão compacto global e o foco azul devem ser aplicados ao conteúdo autenticado.');
}

const pcpModuleRoutes = [...pcp.matchAll(/route:'([^']+)'/g)].map(match => match[1]);
const pcpDuplicates = pcpModuleRoutes.filter((route, index) => pcpModuleRoutes.indexOf(route) !== index);
const pcpMissing = pcpModuleRoutes.filter(route => !routeDeclarations.has(route));
if (pcpModuleRoutes.length !== 13) failures.push(`Esperados 13 atalhos do Tablet PCP; encontrados ${pcpModuleRoutes.length}.`);
if (pcpDuplicates.length) failures.push(`Rotas duplicadas no Tablet PCP: ${[...new Set(pcpDuplicates)].join(', ')}.`);
if (pcpMissing.length) failures.push(`Atalhos PCP sem rota declarada: ${[...new Set(pcpMissing)].join(', ')}.`);
if (!pcp.includes("type Modal='ajuda'|'op'|'programacao'|'tablet'|null") || !pcp.includes("modal==='tablet'")) {
  failures.push('A tela PCP não declara/renderiza o estado do tablet modal.');
}
if ((pcp.match(/onClick=\{\(\)=>setModal\('tablet'\)\}/g) || []).length < 2) {
  failures.push('Os launchers do PCP devem abrir o tablet em modal no layout standalone e integrado.');
}
if (!pcp.includes('pcp-tablet-modal-grid') || !pcp.includes('navigate(route)')) {
  failures.push('O modal PCP não apresenta os atalhos e a navegação dos módulos.');
}
if (/window\.location\.href=['"]\/pcp\/tablet['"]/.test(pcp)) {
  failures.push('O botão Tablet do PCP ainda navega para uma página em vez de abrir o modal.');
}

if (failures.length) {
  console.error('VERIFICAÇÃO DO TABLET DA QUALIDADE: FALHA');
  for (const failure of failures) console.error(`[BLOCKER] ${failure}`);
  process.exit(1);
}

console.log(`VERIFICAÇÃO DO TABLET DA QUALIDADE: OK — ${moduleRoutes.length} atalhos, rotas declaradas e modal acessível.`);
