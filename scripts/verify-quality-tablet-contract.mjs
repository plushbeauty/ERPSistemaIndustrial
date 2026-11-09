import { readFileSync } from 'node:fs'

const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const app = readFileSync('src/AppEntryV2.tsx', 'utf8')
const tablet = readFileSync('src/components/layout/ModuleTabletMenuModal.tsx', 'utf8')
const sgqItems = readFileSync('src/components/quality/qualityTabletModules.ts', 'utf8')
const checks = [
  // A proibicao de 'Vendas' no menu era da fase 1. Ordem do proprietario (2026-11-02): trocar
  // todas as pages de ponta a ponta, entao toda tela registrada precisa entrar pelo Iniciar.
  // Revisao 2026-11-03 (#108): o grupo 'Qualidade / Paquímetro' passou a ser 'Sistema SGQ' e abre o
  // painel flutuante, por ordem explícita do proprietário ("todos os módulos qualidade do menu você vai
  // alterar para Sistema SGQ; quando clicar vai abrir o tablet").
  [shell.includes("label: 'Principal'") && shell.includes("label: 'Engenharia e PCP'") && shell.includes("label: 'Sistema SGQ'") && shell.includes("label: 'Fiscal'") && shell.includes("label: 'Compras'") && shell.includes("label: 'Configurações'"), 'O menu padrão deve preservar os módulos existentes Compras e Configurações junto aos módulos autorizados nesta fase.'],
  [!shell.includes('BarraWindows11'), 'A barra Windows 11 da base foi deletada por ordem do proprietário (2026-11-02) e não pode voltar.'],
  [!shell.includes('isUpdated') && !shell.includes('is-updated-orange'), 'O destaque laranja do menu foi removido por ordem do proprietário e não pode voltar.'],
  [app.includes('path="/erp-industrial"'), 'O dashboard principal deve permanecer acessível.'],
  [app.includes('path="/fiscal"'), 'A Fiscal aprovada deve permanecer acessível como referência.'],
  [!app.includes('path="/qualidade/tablet"') && !app.includes('path="/qualidade/paquimetro-digital"'), 'Rotas operacionais antigas devem ficar fora da navegação durante o reset.'],
  // #108: o tablet do SGQ e a entrada unica das rotinas da Qualidade.
  [shell.includes("action: 'sgqTablet'") && shell.includes('<ModuleTabletMenuModal'), 'O menu Sistema SGQ deve abrir o painel flutuante do SGQ, não um dropdown.'],
  [sgqItems.includes("route: '/pageprincipal/qualidade/certificados'"), 'O Certificado de Qualidade tem que continuar dentro do tablet do SGQ.'],
  [sgqItems.includes("route: '/pageprincipal/qualidade/documentos'"), 'O Controle de Alteração de Documentos tem que continuar dentro do tablet do SGQ.'],
  [!sgqItems.includes('controle-desenhos'), 'A tela de Controle de desenhos técnicos foi deletada por ordem do proprietário (#109) e não pode voltar pelo tablet.'],
  [tablet.includes('src="/logo/logo.png"'), 'O cabeçalho do painel flutuante usa o lockup horizontal da marca no slot largo.'],
]
let failed = false
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
