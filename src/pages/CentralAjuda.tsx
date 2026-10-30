import { ArrowRight, BookOpen, Factory, FileText, Package, Settings, ShieldCheck, ShoppingCart, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const groups = [
  { title: 'Acesso e Chão de Fábrica', icon: ShieldCheck, items: [
    { name: 'Login Operador / Administração', route: '/login-operador', purpose: 'Autenticar com Supabase Auth; o perfil OPERADOR_FABRIL acessa o Tablet e os demais perfis seguem para o ERP.' },
    { name: 'Painel Tablet', route: '/tablet/dashboard', purpose: 'Acompanhar e registrar atividades de produção conforme as permissões do operador.' },
  ]},
  { title: 'Compras', icon: ShoppingCart, items: [
    { name: 'Central de Compras', route: '/pageprincipal/compras', purpose: 'Gerenciar solicitações, cotações, pedidos e fornecedores.' },
    { name: 'Solicitação de Compra', route: '/pageprincipal/compras/solicitacao', purpose: 'Registrar necessidades de aquisição e encaminhar para aprovação.' },
    { name: 'Requisições de Compra', route: '/pageprincipal/compras/requisicoes', purpose: 'Acompanhar requisições e seu andamento.' },
  ]},
  { title: 'Produção e PCP', icon: Factory, items: [
    { name: 'Central PCP', route: '/pageprincipal/pcp', purpose: 'Planejar e acompanhar ordens, recursos e execução.' },
    { name: 'Fichas de Processo', route: '/pageprincipal/pcp/fichas-processo', purpose: 'Consultar parâmetros e instruções de processo produtivo.' },
    { name: 'Chão de Fábrica / Tablet', route: '/tablet/dashboard', purpose: 'Registrar e acompanhar a execução operacional.' },
  ]},
  { title: 'Qualidade', icon: ShieldCheck, items: [
    { name: 'Paquímetro Digital', route: '/pageprincipal/paquimetro', purpose: 'Registrar medições e controles metrológicos.' },
    { name: 'RPNC', route: '/pageprincipal/qualidade/rpnc', purpose: 'Registrar não conformidades, causas, ações e eficácia.' },
  ]},
  { title: 'Pessoas', icon: Users, items: [
    { name: 'RH / Departamento Pessoal', route: '/pageprincipal/rh', purpose: 'Consultar e administrar rotinas de pessoas e competências.' },
  ]},
  { title: 'Administração', icon: Settings, items: [
    { name: 'Configurações', route: '/pageprincipal/administracao-configuracoes', purpose: 'Administrar parâmetros e configurações autorizadas.' },
    { name: 'Fiscal', route: '/pageprincipal/fiscal', purpose: 'Acompanhar rotinas fiscais e documentos integrados.' },
  ]},
]

export default function CentralAjuda() {
  const navigate = useNavigate()
  return <main className="space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c9dde5] pb-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">SYSNQRA ERP INDUSTRIAL</p><h1 className="text-xl font-extrabold text-[#123B50]">Central de Ajuda</h1><p className="text-xs text-slate-500">Orientações de uso das telas e rotinas disponíveis no sistema.</p></div>
      <div className="flex items-center gap-2 text-xs font-semibold text-[#2D8DB8]"><BookOpen size={17}/> Guia operacional</div>
    </header>
    <section className="erp-card space-y-2 p-4"><h2 className="text-sm font-bold text-[#123B50]">Como utilizar as telas</h2><ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-600"><li>Entre com seu usuário autorizado; o sistema valida empresa, perfil e sessão.</li><li>Use o menu para abrir o módulo desejado. Os acessos dependem das permissões atribuídas.</li><li>Pesquise e selecione registros existentes antes de cadastrar ou alterar informações.</li><li>Confira os campos e confirme a gravação. Em caso de erro, leia a mensagem e corrija os dados.</li><li>Não compartilhe senha, PIN ou sessão. Encerre o acesso ao sair do posto de trabalho.</li></ol></section>
    <div className="grid gap-4 xl:grid-cols-2">{groups.map(group=>{const Icon=group.icon;return <section key={group.title} className="erp-card overflow-hidden"><div className="flex items-center gap-2 border-b border-[#dceaf0] bg-[#F4FBFD] px-4 py-3"><Icon size={17} className="text-[#2D8DB8]"/><h2 className="text-xs font-extrabold uppercase tracking-wide text-[#123B50]">{group.title}</h2></div><div className="divide-y divide-slate-100">{group.items.map(item=><button type="button" key={item.route} onClick={()=>navigate(item.route)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F4FBFD]"><span className="min-w-0"><strong className="block text-xs text-[#123B50]">{item.name}</strong><small className="mt-1 block text-[10px] leading-4 text-slate-500">{item.purpose}</small></span><ArrowRight size={14} className="shrink-0 text-[#2D8DB8]"/></button>)}</div></section>})}</div>
    <section className="erp-card flex items-start gap-3 p-4"><Package size={18} className="mt-0.5 text-[#2D8DB8]"/><div><h2 className="text-xs font-bold text-[#123B50]">Dados e segurança</h2><p className="mt-1 text-[10px] leading-4 text-slate-600">Os registros são carregados conforme a sessão, empresa e políticas de acesso do Supabase. Uma tela sem permissão ou sem conexão não deve ser contornada; solicite ao administrador a liberação adequada.</p></div><FileText size={16} className="ml-auto shrink-0 text-[#2D8DB8]"/></section>
  </main>
}
