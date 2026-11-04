import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

// Hashes are Git blob SHA-1 values from the approved release baseline.
// A legitimate redesign requires explicit approval and a deliberate revision here.
const approved = [
  ['src/components/layout/PageIntroCard.tsx', '7b8f056e5b1655be07a2b6203a6d221df837aec4'],
  ['src/components/layout/pageIntroCatalog.ts', '389b2ddbc909cb688f0ac902c5c4be0c16811da3'],
  ['src/pages/ProdutosVendasIndustrial.tsx', '4fb1a6a0603e7814098e583437a187cdb865a130'],
  ['src/components/DigitalCaliper.tsx', '2de2550896b0ccb33730432bc0457085f693b488'],
  ['src/components/IndustrialCommandDashboard.tsx', 'fa49460b6fb18a7686a3e6ac20b6e516eb2e0275'],
  ['src/PublicIndustrialHome.tsx', '8135335a283f8a56180d8764312f0abbcf75df53'],
  ['src/IndustrialLoginDirect.tsx', 'e7d1dd3ca355eee9f628fa5da3e70baf6b17fb25'],
  ['src/styles/industrial-login.css', '049aed65c981467e0d1052e99b21ece40e6c4152'],
  ['src/pages/ComprasWorkspace.tsx', 'aeb16bc0b7640bac7df1f2fa681cad0e87983cd4'],
  ['src/pages/PCPWorkspace.tsx', '4890a3cc2d0a5c50c6ee9e43f8c1b2beb949cc58'],
  ['src/components/PCPMoldPhotoPanel.tsx', '7764fc6d527cfecac69ff8f32c8dd589ecd047d9'],
  ['src/features/pcp/FichaProcesso.tsx', 'd706c66a1585d3f783efaf4ccdb5e96ad478a8ae'],
  ['src/pages/QualidadePaquimetroDigital.tsx', '9e57e1318490c038192882f07374ba5fe3e3e186'],
  ['src/pages/PCPTabletOperador.tsx', '9d73beb0b7adc1b5a865b0c2db39885c5d173cea'],
  ['src/pages/CertificadoQualidade.tsx', 'fedbf7bc96faa10f001191ea5db32e0211298a58'],
  ['src/pages/CentraisIndustriais.tsx', '1ab71637bd5d30ecd17e08a647ac537cdbda8f62'],
  ['src/hooks/useRealtimeAlerts.ts', '22cd5592b5d48660b37385d68a6ab9853fe33e67'],
  ['src/pages/QualityRpncForm.tsx', '381b3765b81513ce5f9da39fc33e6d5b678f4960'],
  ['src/pages/QualityAuditsList.tsx', '34d4247238acaa0cab346056b56953a049c4ec2d'],
  ['src/styles/quality-rpnc-form.css', '123b6df03ca1bfe0bc204a3e76982a31a9586a5d'],
  ['src/pages/AccessControlSettings.tsx', 'dbd538d0934318ec88675e894208e3ce65df8e5a'],
  ['supabase/migrations/20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql', 'ad3faec742aa01d74b42edc1e0816c34397987e3'],
  ['src/components/layout/ModuleTabletMenuModal.tsx', '072412bf24cdf90509cb8ed114731adb999b85cd'],
  ['src/styles/module-tablet-panel.css', '9c354f194067f42e9786b1340f509e2dfeda9c14'],
  ['src/AppEntryV2.tsx', '842bfb7b925d03c8eba5ce7486f37f5e5938ebcf'],
  ['src/AppBootstrap.tsx', '3cc6b3f6530db4785f32f1d0bc9ba5feeba5aeae'],
  ['src/main.tsx', '201089c95125d3baa0ed1461f0836f087ea438fa'],
]

const failures = []
for (const [path, expected] of approved) {
  if (!existsSync(path)) {
    failures.push('Arquivo aprovado ausente: ' + path)
    continue
  }
  const bytes = readFileSync(path)
  const header = Buffer.from('blob ' + bytes.length + '\0', 'utf8')
  const actual = createHash('sha1').update(header).update(bytes).digest('hex')
  if (actual !== expected) failures.push('Tela/contrato aprovado alterado: ' + path + ' (esperado ' + expected + ', atual ' + actual + ')')
}

const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
if (existsSync('src/components/layout/BarraWindows11.tsx')) failures.push('Componente obsoleto da barra inferior Windows 11 foi reintroduzido.')
if (existsSync('src/components/PCPTabletMenuModal.tsx')) failures.push('Modal antigo PCP/Qualidade foi reintroduzido.')
if (shell.includes('BarraWindows11') || shell.includes('PCPTabletMenuModal')) failures.push('Shell voltou a importar navegação/modal legado.')
if (shell.includes('is-updated-orange') || shell.includes('isUpdated: true')) failures.push('Marcadores laranja de atualização foram reintroduzidos.')
if (!shell.includes("label: 'Sistema SGQ'") || !shell.includes("tabletModule: 'sgq'")) failures.push('A entrada Sistema SGQ deixou de abrir o tablet compartilhado.')
const bootstrap = readFileSync('src/main.tsx', 'utf8')
if (!bootstrap.includes('erp-industrial-legacy-pwa-cleanup-v3') || !bootstrap.includes('window.location.reload()') || !bootstrap.includes("if ('caches' in window)")) failures.push('A limpeza única do cache PWA e a recarga do bundle atual foram revertidas.')

for (const failure of failures) console.error('FAIL — ' + failure)
if (failures.length) process.exit(1)
console.log('APPROVED REGRESSION LOCK PASS — 27 arquivos congelados; barra inferior, modal legado e marcadores laranja bloqueados.')
