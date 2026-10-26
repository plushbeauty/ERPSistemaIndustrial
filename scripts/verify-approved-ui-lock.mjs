import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-19, approval revision APROV-008 (compact edit sizing and removal of duplicated zone controls explicitly authorized by user). Explicitly authorized revisions APROV-005 (Novo Pedido), APROV-006 (Vendas / Status), and APROV-011 (single top Windows 11 navigation with visible Menu control) are frozen alongside the restored screens.
 * Explicit user authorization on 2026-10-23 permits PCPFichasProcesso.tsx REV-FICHA-010: standardize the SGQ/IT-PCP-001 header and light document cards, and highlight the Nova Ficha action with a violet icon/button. Other frozen files remain unchanged.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/pages/CalibracaoIndustrial.tsx', sha: '848b72d7c4c7db5c52de3db18c73a22f94a7af54', label: 'Qualidade / Calibração com Paquímetro Digital', source: 'revisão explicitamente autorizada em 2026-10-26; cadastro, histórico e paquímetro na mesma tela' },
  { path: 'src/pages/FinanceiroDashboardCaixa.tsx', sha: '4f139da09789e0f3c8e669bd1bfbca9aa3e65659', label: 'Financeiro / Fluxo de Caixa e Caixa', source: 'tela única compartilhada pelas rotas /financeiro/fluxo-caixa e /financeiro/caixa; preserva consulta de parcelas e baixas reais' },
  { path: 'src/pages/FinanceiroTitulos.tsx', sha: '2e9f2a554993145f2e00335ec509c50062beb33c', label: 'Financeiro / padrão visual de Contas a Receber', source: 'referência visual aprovada para o módulo financeiro em 2026-10-26' },
  { path: 'src/pages/QualidadePaquimetroDigital.tsx', sha: '3c355adb13c288e66c54556fd9123700e6956097', label: 'Qualidade / Paquímetro Digital', source: 'revisão visual premium autorizada em 2026-10-26; mantém dados reais e integração ao histórico de inspeções' },
  { path: 'src/components/DigitalCaliper.tsx', sha: '2de2550896b0ccb33730432bc0457085f693b488', label: 'Qualidade / componente Paquímetro Digital', source: 'revisão visual premium autorizada em 2026-10-26; mantém validação de calibração e identifica a leitura simulada sem conexão física' },
  { path: 'src/pages/ComprasCentral.tsx', sha: '6d7947a4dcbe1b2f04f10e56a5165d031cedc4f3', label: 'Compras / Central aprovada', source: 'restaurada conforme referência APROV-COMPRAS-2026-10-24-R1; congelar o visual original' },
  { path: 'src/pages/ComprasAbaNativa.tsx', sha: 'adbf0e76c6c627a2c53fe82e7f7f8370d2265083', label: 'Compras / abas nativas', source: 'correção funcional não visual autorizada em 2026-10-26: estado do fornecedor vencedor e renderização tipada; preservar layout aprovado' },
  { path: 'src/pages/VendasCentral.tsx', sha: '0129b7cd990ed03982803d473fcb917589969947', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-006 — consistent card alignment and visible color legend; frozen after this revision' },
  { path: 'src/pages/NovoPedido.tsx', sha: '6d1368026d51f186baa297f71569a61a1f79e944', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized revision APROV-005 — compact controls, 30px fields, 9px labels and compact buttons; frozen after this revision' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: '95434d18498d1a0709c0ccfb1d7ba51949b71d1d', label: 'Cadastro Mestre de Produtos / padrão visual PCP compacto', source: 'revisão visual explicitamente autorizada pelo usuário em 2026-10-23 — campos alinhados à largura disponível dentro do grid responsivo de 12 colunas, sem cortes artificiais de largura; CRUD e regras de dados preservados; congelar após esta revisão' },
  { path: 'src/styles/industrial-login.css', sha: 'fcbea255f1a476c1e228c7490052a7cea0a507b0', label: 'Login institucional', source: 'explicit user-authorized revision APROV-005 — institutional copy white with black outline for contrast' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'e7c407a6a21df06081f374b06805c39d69086597', label: 'PCP / Tablet do operador', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-21 — consolidar o código do tablet PCP enviado em 19–21/10; preservar e congelar esta versão' },
  { path: 'src/components/PCPTabletMenuModal.tsx', sha: '60bf035ae3bd3e89be45577ca62714058f56b1bc', label: 'PCP / Menu Tablet e Chão de Fábrica', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-23 — incluir atalho Chão de Fábrica / Portal do Funcionário; preservar módulos anteriores' },
  { path: 'src/components/layout/ERPHorizontalShell.tsx', sha: '73e718465200f7f54743a0e82011f86761dd385b', label: 'Shell global / menu superior único Windows 11', source: 'revisão aprovada em 2026-10-23 mais destaque azul da entrada Cotações / RFQ explicitamente solicitado em 2026-10-26; preservar shell, layout e demais rotas aprovadas' },
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: '821b2cb2add9ec0a31d0c81e906a2c1f6e84118b', label: 'Dashboard principal industrial', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
  { path: 'src/pages/PCPFichasProcesso.tsx', sha: 'eed2c198fb8628719a909cbf5eb1b613025c0e14', label: 'PCP / Fichas de Processo (Prensados, Injetados, Estamparia, Montagem)', source: 'explicit user-authorized UI revision REV-FICHA-010 on 2026-10-23 — standardized SYSNQRA SGQ/IT-PCP-001 header, light document status cards, violet Nova Ficha icon/action; freeze after this revision' },
  { path: 'src/pages/QualidadeInspecoesIndustrial.tsx', sha: 'ebb5bd1e523f38a2ab6169bda4e7a9855ee3e65a', label: 'Qualidade / Inspeções de Lotes', source: 'explicit user-provided approval directive 2026-10-19 — Steel Blue split-screen, compact h-8 controls and dense inspection grid; frozen after revision' },
  { path: 'src/PublicIndustrialHome.tsx', sha: '5c6a08d84d9d942ac6f274bb32a3a12d39e964bd', label: 'Página inicial pública / Carrossel e planos', source: 'explicit user-authorized revision 2026-10-21 — image zoom 85%, white logo header and 13px default typography; frozen after this revision' },
  { path: 'src/components/PCPMoldPhotoPanel.tsx', sha: '7764fc6d527cfecac69ff8f32c8dd589ecd047d9', label: 'PCP / Fotos da ficha de processo', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
]

let failed = false
for (const item of approved) {
  const content = readFileSync(item.path)
  const header = Buffer.from(`blob ${content.byteLength}\0`, 'utf8')
  const actual = createHash('sha1').update(header).update(content).digest('hex')
  const ok = actual === item.sha
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${item.label} [${item.path}] — ${ok ? 'aprovado e congelado' : `hash divergente; esperado=${item.sha}; encontrado=${actual}`}\n`)
  if (!ok) failed = true
}

const routeContent = readFileSync('src/AppEntryV2.tsx', 'utf8')
const requiredRoutes = [
  ['Financeiro / Fluxo de Caixa usa o painel padronizado', '<Route path="/financeiro/fluxo-caixa" element={<QualityPlanGate>{<FinanceiroDashboardCaixa />}</QualityPlanGate>} />'],
  ['Financeiro / Caixa usa o painel padronizado', '<Route path="/financeiro/caixa" element={<QualityPlanGate>{<FinanceiroDashboardCaixa />}</QualityPlanGate>} />'],
  ['Qualidade / Calibração mantém a tela com Paquímetro Digital', '<Route path="/qualidade/calibracao" element={<QualityPlanGate><CalibracaoIndustrial /></QualityPlanGate>} />'],
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

