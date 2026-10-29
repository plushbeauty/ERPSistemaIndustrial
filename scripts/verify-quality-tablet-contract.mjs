import { existsSync, readFileSync } from 'node:fs'

/**
 * SYSNQRA ERP INDUSTRIAL — contrato de navegação e SGQ.
 * Não permite que uma limpeza do menu remova Compras ou Configurações.
 * @REVISAO 29/10/2026
 */
const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const app = readFileSync('src/AppEntryV2.tsx', 'utf8')
const checks = [
  [
    shell.includes("{ label: 'Compras', route: '/pageprincipal/compras', icon: ShoppingCart, isUpdated: true }") &&
      shell.includes("{ label: 'Configurações', route: '/pageprincipal/administracao-configuracoes', icon: Settings }"),
    'Compras e Configurações devem permanecer como entradas explícitas do menu principal.',
  ],
  [
    app.includes('path="compras" element={<ComprasWorkspace />') &&
      app.includes('path="administracao-configuracoes" element={<AdministracaoConfiguracoesGlobais />'),
    'Compras e Configurações devem continuar conectadas aos workspaces reais.',
  ],
  [
    app.includes('path="/compras" element={<Navigate to="/pageprincipal/compras"') &&
      app.includes('path="/configuracoes-adm" element={<Navigate to="/pageprincipal/administracao-configuracoes"') &&
      app.includes('path="/administracao-configuracoes" element={<Navigate to="/pageprincipal/administracao-configuracoes"'),
    'As URLs antigas de Compras e Configurações devem continuar redirecionando para a área de trabalho.',
  ],
  [
    shell.includes("label: 'Principal'") &&
      shell.includes("label: 'Engenharia e PCP'") &&
      shell.includes("label: 'Qualidade / Paquímetro'") &&
      shell.includes("label: 'Fiscal'") &&
      !shell.includes("label: 'Vendas'"),
    'O menu padrão deve preservar os módulos autorizados nesta fase sem reintroduzir Vendas.',
  ],
  [
    shell.includes('BarraWindows11') && shell.includes('erp-windows-topbar'),
    'A barra estilo Windows 11 deve permanecer.',
  ],
  [
    shell.includes('menu.isUpdated ? \'is-updated-orange\'') &&
      shell.includes('is-updated-orange-icon') &&
      shell.includes('.erp-windows-menu-row.is-updated-orange') &&
      shell.includes('color:#f97316!important'),
    'Compras, marcada como atualizada, deve manter o destaque laranja.',
  ],
  [
    existsSync('src/pages/ComprasWorkspace.tsx') &&
      existsSync('src/pages/ComprasPedidoForm.tsx') &&
      existsSync('src/pages/AdministracaoConfiguracoesGlobais.tsx'),
    'Os workspaces e o formulário de pedido de Compras precisam existir no repositório.',
  ],
  [
    app.includes('path="/erp-industrial"') && app.includes('path="/fiscal"'),
    'O dashboard principal e a Fiscal aprovada devem continuar acessíveis.',
  ],
  [
    !app.includes('path="/qualidade/tablet"') &&
      !app.includes('path="/qualidade/paquimetro-digital"'),
    'As rotas operacionais antigas retiradas do menu não devem reaparecer.',
  ],
]

let failed = false
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
console.log('MENU SGQ CONTRACT PASS — Compras e Configurações preservadas no menu, rotas, workspaces e estilos.')
