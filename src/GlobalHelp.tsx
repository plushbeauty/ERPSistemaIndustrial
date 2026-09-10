import { useEffect, useState } from 'react'
import { Bot, HelpCircle, X, ArrowRight } from 'lucide-react'

const topics:Record<string,{text:string;steps:string[];href?:string}>={
  Dashboard:{text:'Acompanhe a operação em uma visão simples. Os indicadores mostram onde existe atenção e a Central de Acesso abre os módulos.',steps:['Confira os indicadores do dia.','Abra a Central de Acesso.','Entre no módulo que precisa de atenção.']},
  Cadastros:{text:'Os Cadastros Mestres alimentam todo o ERP. Comece pelos dados que sua operação realmente usa.',steps:['Cadastre setores e máquinas.','Cadastre produtos com código e unidade.','Cadastre clientes e fornecedores.','Depois configure engenharia, estoque e PCP.']},
  Produtos:{text:'O produto é a base da engenharia, estoque, compras, vendas, PCP e fiscal.',steps:['Informe código e descrição.','Defina grupo e unidade.','Configure estoque, custo e preço.','Complete BOM, processo e dados fiscais quando aplicável.']},
  Produção:{text:'Produção transforma uma necessidade planejada em fabricação acompanhada.',steps:['Receba o pedido.','Verifique materiais e capacidade.','Gere a OP.','Programe máquina e operador.','Registre produção boa e refugo.']},
  'Qualidade / QMS':{text:'A Qualidade controla documentos, inspeções, RPNC, ações, auditorias, treinamentos, metrologia e indicadores.',steps:['Defina padrões e documentos.','Inspecione e registre resultados.','Abra RPNC quando houver desvio.','Crie ação corretiva e verifique eficácia.','Mantenha evidências e revisões controladas.'],href:'/qualidade'},
  'Estoque / WMS':{text:'O saldo deve nascer dos movimentos de entrada, consumo, produção e saída.',steps:['Registre entradas.','Reserve materiais para pedidos/OPs.','Baixe consumo na produção.','Confira inventário e rastreabilidade.']},
  Compras:{text:'Compras abastece a fábrica e acompanha fornecedores, pedidos e prazos.',steps:['Identifique a necessidade.','Gere solicitação/pedido.','Acompanhe fornecedor e previsão.','Registre recebimento e impacto no estoque.']},
  'Financeiro':{text:'O Financeiro acompanha pagar, receber, caixa, bancos, conciliação, custos e resultado.',steps:['Registre compromissos.','Conecte pagamentos e recebimentos.','Concilie o banco.','Analise custos e resultado.']},
  'Fiscal / Documentos':{text:'O Fiscal organiza documentos, itens, tributos, XML, DANFE e integração com o autorizador fiscal.',steps:['Confira emitente e destinatário.','Confira produtos e tributação.','Valide a nota.','Transmita pelo integrador.','Guarde XML e DANFE.'],href:'/fiscal'},
  'Manutenção / CMMS':{text:'A manutenção evita paradas e registra o histórico de cada máquina.',steps:['Cadastre a máquina.','Defina plano e periodicidade.','Gere ordem preventiva/corretiva.','Registre execução, peças e custo.']},
  'Indicadores / OEE':{text:'Indicadores transformam apontamentos em informação para decisão.',steps:['Registre produção e paradas.','Calcule disponibilidade e performance.','Compare qualidade e refugo.','Analise tendências.']},
  'Outlook / IA':{text:'Pedidos recebidos por e-mail podem entrar em leitura, OCR, conferência e aprovação antes da produção.',steps:['Capturar e-mail.','Extrair dados.','Conferir cliente, produto e quantidade.','Aprovar pedido.','Enviar ao fluxo operacional.']},
  Configurações:{text:'Use esta área para segurança, empresa, usuários, permissões e parâmetros.',steps:['Configure a empresa.','Defina usuários e setores.','Revise permissões.','Nunca compartilhe senhas.']},
}

export default function GlobalHelp(){
 const [open,setOpen]=useState(false)
 const [title,setTitle]=useState('Ajuda do SGQ ERP')
 const [topic,setTopic]=useState(topics.Dashboard)
 useEffect(()=>{
   const update=()=>{const h=document.querySelector('.v2-top h1')?.textContent?.trim()||'Dashboard';const found=topics[h]||topics.Dashboard;setTitle(`Ajuda: ${h}`);setTopic(found)}
   update(); const observer=new MutationObserver(update); const root=document.querySelector('#root'); if(root)observer.observe(root,{subtree:true,childList:true,characterData:true}); window.addEventListener('popstate',update); return()=>{observer.disconnect();window.removeEventListener('popstate',update)}
 },[])
 return <>
  <button type="button" aria-label="Abrir ajuda desta tela" title="Abrir explicação desta tela" className="global-help-button" onClick={()=>setOpen(v=>!v)}>{open?<X size={20}/>:<HelpCircle size={20}/>}<span>Ajuda</span></button>
  {open&&<div className="global-help-panel" role="dialog" aria-label="Ajuda do SGQ ERP">
   <div className="global-help-head"><span className="global-help-icon"><Bot size={20}/></span><div><strong>{title}</strong><small>Guia rápido do SGQ ERP</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar ajuda" title="Fechar ajuda"><X size={18}/></button></div>
   <p>{topic.text}</p>
   <ol className="global-help-steps">{topic.steps.map((s,i)=><li key={s}><b>{i+1}</b><span>{s}</span></li>)}</ol>
   <div className="global-help-tips"><span>💡 Dica</span><span>Se uma tela estiver vazia, comece pelos Cadastros Mestres.</span></div>
   {topic.href&&<a className="global-help-action" href={topic.href}>Abrir módulo <ArrowRight size={17}/></a>}
   <button type="button" className="global-help-close" onClick={()=>setOpen(false)}>Entendi</button>
  </div>}
 </>
}
