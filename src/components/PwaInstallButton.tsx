import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function PwaInstallButton(){
  const [prompt,setPrompt]=useState<any>(null)
  const [hidden,setHidden]=useState(false)
  useEffect(()=>{
    const standalone=window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone===true
    if(standalone){setHidden(true);return}
    const handler=(event:any)=>{event.preventDefault();setPrompt(event)}
    window.addEventListener('beforeinstallprompt',handler)
    return()=>window.removeEventListener('beforeinstallprompt',handler)
  },[])
  if(hidden||!prompt)return null
  async function install(){const p=prompt;setPrompt(null);try{await p.prompt();await p.userChoice}catch{} }
  return <div className="pwa-install-banner" role="status"><div><strong>Instale o ERP no computador</strong><span>Acesso rápido, tela própria e experiência de aplicativo.</span></div><div className="pwa-install-actions"><button onClick={install}><Download size={16}/> Instalar</button><button aria-label="Fechar" onClick={()=>setPrompt(null)}><X size={16}/></button></div></div>
}
