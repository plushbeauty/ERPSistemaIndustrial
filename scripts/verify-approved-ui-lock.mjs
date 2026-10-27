import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-19, approval revision APROV-008 (compact edit sizing and removal of duplicated zone controls explicitly authorized by user). Explicitly authorized revisions APROV-005 (Novo Pedido), APROV-006 (Vendas / Status), and APROV-011 (single top Windows 11 navigation with visible Menu control) are frozen alongside the restored screens.
 * Explicit user authorization on 2026-10-23 permits PCPFichasProcesso.tsx REV-FICHA-010: standardize the SGQ/IT-PCP-001 header and light document cards, and highlight the Nova Ficha action with a violet icon/button. Other frozen files remain unchanged.
 * Do not update these hashes as part of ordinary styling/refactor work. On 2026-10-26 the user explicitly authorized a shared master cadastro for Products, Customers and Suppliers, including new premium alignment and redirecting legacy entry points; the revised screens are frozen below.
 * Explicit user authorization on 2026-10-27 permits a light, readable revision of Quality Lot Inspections and shared SGQ navigation; only its recorded hash is updated below. Explicit user authorization on 2026-10-26 permits premium visual revisions and freezing each completed screen. Fiscal central, standard-cost pricing, cost-variance analysis, cash forecast, NF-e pending queue, NF-e wallet, tax rules, NF-e draft workspace, active stock warehouse page, active materials-receipt workspace, and RH central were revised and frozen in this batch; preserve their business logic and visual layout unless the user authorizes another revision.
 */
const approved = [
  { path: 'src/pages/CalibracaoIndustrial.tsx', sha: '848b72d7c4c7db5c52de3db18c73a22f94a7af54', label: 'Qualidade / Calibração com Paquímetro Digital', source: 'revisão explicitamente autorizada em 2026-10-26; cadastro, histórico e paquímetro na mesma tela' },
  { path: 'src/pages/FinanceiroDashboardCaixa.tsx', sha: '4f139da09789e0f3c8e669bd1bfbca9aa3e65659', label: 'Financeiro / Fluxo de Caixa e Caixa', source: 'tela única compartilhada pelas rotas /financeiro/fluxo-caixa e /financeiro/caixa; preserva consulta de parcelas e baixas reais' },
  { path: 'src/pages/FinanceiroTitulos.tsx', sha: '2e9f2a554993145f2e00335ec509c50062beb33c', label: 'Financeiro / padrão visual de Contas a Receber', source: 'referência visual aprovada para o módulo financeiro em 2026-10-26' },
  { path: 'src/pages/Fiscal.tsx', sha: '8c5198778cb3e4d1ba27ec8377c18b63a6948089', label: 'Fiscal / Central Fiscal Premium', source: 'revisão visual autorizada em 2026-10-26; cinco abas, ações separadas, tabelas compactas e regras fiscais preservadas' },
  { path: 'src/pages/FinanceiroCustoPadrao.tsx', sha: '2ef871badab8dcb534f5c1f0bfa39f16dc2765a3', label: 'Financeiro / Custo Padrão e Formação de Preço', source: 'revisão visual autorizada em 2026-10-26; campos compactos, resumo de custos e BOM real preservada' },
  { path: 'src/pages/FinanceiroGraficoDesvios.tsx', sha: '28ee3ba7825c08ba41f12f29e2d698d79c61bf28', label: 'Financeiro / Gráfico de Desvios de Custos', source: 'revisão visual autorizada em 2026-10-26; comparativo gráfico e tabular das apurações reais' },
  { path: 'src/pages/FiscalPrevisaoCaixa.tsx', sha: '78823bc6f39347a1cb6bb9b9a2e07b14fb2bf257', label: 'Fiscal / Previsão de Caixa', source: 'revisão visual autorizada em 2026-10-26; escopo de acesso e consultas empresariais preservados' },
  { path: 'src/pages/FiscalPendencias.tsx', sha: 'bc504eb3f56ff2537fbd1f2416ae1a311be84da0', label: 'Fiscal / Pendências de NF-e', source: 'revisão visual autorizada em 2026-10-26; status SEFAZ reais e retorno fiscal preservados' },
  { path: 'src/pages/FiscalCarteiraNFe.tsx', sha: 'c8e06cde3fc5151661386e06c5d916bf9a73998c', label: 'Fiscal / Carteira de NF-e', source: 'revisão visual autorizada em 2026-10-26; status, protocolo e documentos fiscais reais preservados' },
  { path: 'src/pages/FiscalImpostos.tsx', sha: 'a6833d55dbb6706c418bb8cf1d3638ab88b57279', label: 'Fiscal / Regras Tributárias', source: 'revisão visual autorizada em 2026-10-26; validações fiscais, RLS e persistência preservadas' },
  { path: 'src/pages/NFeEmissaoCompact.tsx', sha: '676f0074466df8da5639d27648e604e6579071fc', label: 'Fiscal / Emissor NF-e', source: 'revisão visual autorizada em 2026-10-26; rascunho, cálculos e campos fiscais preservados; ações fiscais sem integração permanecem desabilitadas' },
  { path: 'src/pages/EstoqueAlmoxarifadoCompact.tsx', sha: '582ab4501e0c102ef550e9a2987bffa628cd1ac0', label: 'Estoque / Almoxarifado ativo', source: 'REV-ESTOQUE-009; revisão visual premium registrada em 2026-10-27: grade de 12 colunas, campos compactos, barra de ações e chips unificados; entradas, saídas, transferências, inventário cíclico via RPC e conferência de produção preservados' },
  { path: 'src/pages/RecebimentoMateriais.tsx', sha: '8230f008ccdaa72cf8b3951702dffcb27cde1438', label: 'Compras / Recebimento de materiais ativo', source: 'revisão visual autorizada em 2026-10-26; XML, conferência de itens/lotes e RPC de gravação preservados' },
  { path: 'src/pages/RHIndustrial.tsx', sha: '0b20ca8166da2d06b78b750a3704e1b63fe21c66', label: 'RH / Central de Recursos Humanos', source: 'revisão visual autorizada em 2026-10-26; abas, KPIs, tabelas e modais alinhados; consultas e operações preservadas' },
  { path: 'src/components/fiscal/FiscalSidebar.tsx', sha: '60385bd15ac4e42003ffd523bd65867e9747dc46', label: 'Fiscal / navegação de módulo premium', source: 'layout aprovado preservado; entrada adicional Bloco K solicitada pelo usuário em 2026-10-26' },
  { path: 'src/pages/QualidadePaquimetroDigital.tsx', sha: '3c355adb13c288e66c54556fd9123700e6956097', label: 'Qualidade / Paquímetro Digital', source: 'revisão visual premium autorizada em 2026-10-26; mantém dados reais e integração ao histórico de inspeções' },
  { path: 'src/components/DigitalCaliper.tsx', sha: '2de2550896b0ccb33730432bc0457085f693b488', label: 'Qualidade / componente Paquímetro Digital', source: 'revisão visual premium autorizada em 2026-10-26; mantém validação de calibração e identifica a leitura simulada sem conexão física' },
  { path: 'src/pages/ComprasCentral.tsx', sha: '6d7947a4dcbe1b2f04f10e56a5165d031cedc4f3', label: 'Compras / Central aprovada', source: 'restaurada conforme referência APROV-COMPRAS-2026-10-24-R1; congelar o visual original' },
  { path: 'src/pages/ComprasAbaNativa.tsx', sha: 'adbf0e76c6c627a2c53fe82e7f7f8370d2265083', label: 'Compras / abas nativas', source: 'correção funcional não visual autorizada em 2026-10-26: estado do fornecedor vencedor e renderização tipada; preservar layout aprovado' },
  { path: 'src/pages/VendasCentral.tsx', sha: '0129b7cd990ed03982803d473fcb917589969947', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-006 — consistent card alignment and visible color legend; frozen after this revision' },
  { path: 'src/pages/NovoPedido.tsx', sha: '6d1368026d51f186baa297f71569a61a1f79e944', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized revision APROV-005 — compact controls, 30px fields, 9px labels and compact buttons; frozen after this revision' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: '022a4c8f437bb1377212dd32b9980ef3a727af60', label: 'Cadastro Mestre de Produtos / padrão visual premium', source: 'REV-PRODUTO-UI-015; ajuste autorizado em 2026-10-27: cabeçalho azul duplicado removido, campos editáveis alinhados e preenchendo a coluna do grid; CRUD, Supabase, segurança por empresa, estoque, engenharia e fiscal preservados' },
  { path: 'src/pages/CadastroMestreIndustrial.tsx', sha: 'a8abd0e55f4c0396ee3a8a375792e12475a62265', label: 'Cadastro Mestre / abas de produtos, clientes e fornecedores', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-26 — uma página, navegação por abas e redirecionamento dos caminhos legados' },
  { path: 'src/styles/industrial-login.css', sha: 'fcbea255f1a476c1e228c7490052a7cea0a507b0', label: 'Login institucional', source: 'explicit user-authorized revision APROV-005 — institutional copy white with black outline for contrast' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'e7c407a6a21df06081f374b06805c39d69086597', label: 'PCP / Tablet do operador', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-21 — consolidar o código do tablet PCP enviado em 19–21/10; preservar e congelar esta versão' },
  { path: 'src/components/PCPTabletMenuModal.tsx', sha: '60bf035ae3bd3e89be45577ca62714058f56b1bc', label: 'PCP / Menu Tablet e Chão de Fábrica', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-23 — incluir atalho Chão de Fábrica / Portal do Funcionário; preservar módulos anteriores' },
  { path: 'src/components/layout/ERPHorizontalShell.tsx', sha: '9dc916d0d93ee463eadf261f5c1f5ecb4d533aa9', label: 'Shell global / menu superior único Windows 11', source: 'REV-SYSNQRA-UI-2026-10-27; normalização global de fundos, bordas, raios, tipografia e tabelas para alinhar telas ao padrão premium aprovado' },
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: 'fa49460b6fb18a7686a3e6ac20b6e516eb2e0275', label: 'Dashboard principal industrial', source: 'atalho autenticado ao Portal do Operador incluído com autorização expressa do usuário em 2026-10-26; preservar os demais indicadores e layout' },
  { path: 'src/pages/PCPFichasProcesso.tsx', sha: '905870e2e475a558db0edd92014e147e5a8cae3e', label: 'PCP / Fichas de Processo (Prensados, Injetados, Estamparia, Montagem)', source: 'após pedido do usuário para equalizar edição, somente a ação Editar ficha recebeu o padrão compartilhado erp-edit-button; visual restante preservado em 2026-10-26' },
  { path: 'src/pages/QualidadeInspecoesIndustrial.tsx', sha: 'a1de3d1ae3c1b5028c2bef4d147deb9866122a57', label: 'Qualidade / Inspeções de Lotes', source: 'revisão visual explicitamente autorizada pelo usuário em 2026-10-27 — fundo claro, contraste legível, navegação SGQ compartilhada e ações compactas; congelada nesta revisão' },
  { path: 'src/PublicIndustrialHome.tsx', sha: '5c6a08d84d9d942ac6f274bb32a3a12d39e964bd', label: 'Página inicial pública / Carrossel e planos', source: 'explicit user-authorized revision 2026-10-21 — image zoom 85%, white logo header and 13px default typography; frozen after this revision' },
  { path: 'src/components/PCPMoldPhotoPanel.tsx', sha: '7764fc6d527cfecac69ff8f32c8dd589ecd047d9', label: 'PCP / Fotos da ficha de processo', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
]

let failed = false
for (const item of approved) {
  // Compare the committed Git blob and require a clean worktree for this path.
  // Hashing the raw Windows working file can produce a false CRLF mismatch.
  const actual = execFileSync('git', ['rev-parse', `HEAD:${item.path}`], { encoding: 'utf8' }).trim()
  let worktreeClean = true
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', item.path], { stdio: 'ignore' })
  } catch {
    worktreeClean = false
  }
  const ok = worktreeClean && actual === item.sha
  const reason = !worktreeClean ? 'arquivo modificado na árvore de trabalho' : `hash divergente; esperado=${item.sha}; encontrado=${actual}`
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${item.label} [${item.path}] — ${ok ? 'aprovado e congelado' : reason}\n`)
  if (!ok) failed = true
}

const routeContent = readFileSync('src/AppEntryV2.tsx', 'utf8')
const requiredRoutes = [
  ['Financeiro / Fluxo de Caixa usa o painel padronizado', '<Route path="/financeiro/fluxo-caixa" element={<QualityPlanGate>{<FinanceiroDashboardCaixa />}</QualityPlanGate>} />'],
  ['Financeiro / Caixa usa o painel padronizado', '<Route path="/financeiro/caixa" element={<QualityPlanGate>{<FinanceiroDashboardCaixa />}</QualityPlanGate>} />'],
  ['Vendas / atalho de Fluxo de Caixa usa o painel padronizado', '<Route path="/vendas/fluxo-caixa" element={<QualityPlanGate>{<FinanceiroDashboardCaixa />}</QualityPlanGate>} />'],
  ['Qualidade / Calibração mantém a tela com Paquímetro Digital', '<Route path="/qualidade/calibracao" element={<QualityPlanGate><CalibracaoIndustrial /></QualityPlanGate>} />'],
  ['Cadastro Mestre / tela única de produtos, clientes e fornecedores', '<Route path="/produtos-vendas" element={<CadastroMestreIndustrial />} />'],
  ['Cadastro de clientes legado redireciona para a aba unificada', '<Route path="/cadastros/clientes" element={<Navigate to="/produtos-vendas?aba=clientes" replace />} />'],
  ['Cadastro de fornecedores legado redireciona para a aba unificada', '<Route path="/cadastros/fornecedores" element={<Navigate to="/produtos-vendas?aba=fornecedores" replace />} />'],
]
for (const [label, route] of requiredRoutes) {
  const ok = routeContent.includes(route)
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${label}\n`)
  if (!ok) failed = true
}
if (routeContent.includes("import('./pages/FinanceiroFluxoCaixa')")) {
  process.stderr.write('Approved route lock: a tela legada de Fluxo de Caixa foi reintroduzida.\n')
  failed = true
}

if (failed) {
  process.stderr.write('Approved UI lock: alterações em telas aprovadas são bloqueadas. Restaure o conteúdo aprovado ou obtenha autorização explícita para nova revisão e atualização do contrato.\n')
  process.exit(1)
}

