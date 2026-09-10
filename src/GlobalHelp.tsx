import { useEffect, useState } from 'react'
import { Bot, HelpCircle, X } from 'lucide-react'

const topics:Record<string,string>={
  Dashboard:'Veja os principais indicadores da empresa e use a Central de Acesso para abrir qualquer módulo.',
  Cadastros:'Os Cadastros Mestres alimentam o restante do ERP. Comece por produtos, clientes, fornecedores, setores e máquinas.',
  Produtos:'Cadastre código, nome, unidade, grupo, estoque, custo e preço. O produto pode ser usado em compras, vendas, estoque e produção.',
  Clientes:'Mantenha os dados comerciais e documentos dos clientes atualizados para vendas, faturamento e financeiro.',
  Fornecedores:'Cadastre fornecedores e seus documentos para compras e contas a pagar.',
  Produção:'Use Engenharia/BOM, MRP, PCP e Ordens de Produção para planejar e acompanhar a fabricação.',
  'Estoque / WMS':'Controle produtos, saldos e movimentações. O estoque se conecta à compra, produção, expedição e venda.',
  Compras:'Registre fornecedores e pedidos de compra para abastecer a produção e controlar compromissos financeiros.',
  'Vendas / CRM':'Organize clientes, pedidos e oportunidades comerciais e acompanhe o histórico.',
  Financeiro:'O financeiro conecta pedidos, faturamento, contas, bancos, conciliação e DRE.',
  'Contas a pagar':'Acompanhe obrigações, vencimentos e pagamentos da empresa.',
  'Contas a receber':'Acompanhe recebimentos, parcelas e inadimplência.',
  'Bancos / OFX':'Importe movimentos bancários e faça a conciliação com o financeiro.',
  'Qualidade / QMS':'Registre inspeções, não conformidades, ações e indicadores de qualidade.',
  'Fiscal / Documentos':'Consulte o fluxo fiscal, NF-e, NFC-e, XML, DANFE e chave de acesso.',
  Expedição:'Controle separação, conferência, despacho e entrega.',
  'Manutenção / CMMS':'Controle máquinas, ordens de manutenção, preventiva e corretiva.',
  'Indicadores / OEE':'Acompanhe disponibilidade, performance, qualidade, produção e paradas.',
  'Outlook / IA':'Pedidos recebidos por e-mail podem entrar no fluxo de leitura, OCR, conferência e processamento.',
  Configurações:'Área para empresa, usuários, permissões e segurança.'
}

export default function GlobalHelp(){
  const [open,setOpen]=useState(false)
  const [title,setTitle]=useState('Ajuda do SGQ ERP')
  const [text,setText]=useState('Posso explicar esta tela, o que cada botão faz e qual é o próximo passo.')
  useEffect(()=>{
    let opened=false
    const update=()=>{
      const h=document.querySelector('.v2-top h1')?.textContent?.trim()||'SGQ ERP'
      setTitle(`Ajuda: ${h}`)
      setText(topics[h]||'Posso explicar esta tela, o que cada botão faz e qual é o próximo passo. Use a Central de Acesso para encontrar outros módulos.')
      if(!opened&&document.querySelector('.v2-shell')){
        opened=true
        window.setTimeout(()=>document.querySelector<HTMLButtonElement>('[data-open-launcher]')?.click(),180)
      }
    }
    update()
    const observer=new MutationObserver(update)
    const root=document.querySelector('#root')
    if(root)observer.observe(root,{subtree:true,childList:true,characterData:true})
    window.addEventListener('popstate',update)
    return()=>{observer.disconnect();window.removeEventListener('popstate',update)}
  },[])
  return <>
    <button type="button" aria-label="Abrir ajuda" className="global-help-button" onClick={()=>setOpen(v=>!v)}>{open?<X size={20}/>:<HelpCircle size={20}/>}<span>Ajuda</span></button>
    {open&&<div className="global-help-panel" role="dialog" aria-label="Ajuda do SGQ ERP">
      <div className="global-help-head"><span className="global-help-icon"><Bot size={20}/></span><div><strong>{title}</strong><small>Assistente SGQ ERP</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar ajuda"><X size={17}/></button></div>
      <p>{text}</p>
      <div className="global-help-tips"><span>💡 Dica</span><span>Comece pelos Cadastros Mestres quando uma tela estiver vazia.</span></div>
      <button type="button" className="global-help-close" onClick={()=>setOpen(false)}>Entendi</button>
    </div>}
  </>
}
