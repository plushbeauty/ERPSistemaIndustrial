/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:47 BRT
 * Desenvolvedor: Homologado por FernandoSch.
 * ID da Revisão: REV-053
 * Alterações: Reordenação do cabeçalho/imports e manutenção da tipagem estrita do evento PWA.
 * Status do Build Local: Não executado — gate remoto após commit.
 * =========================================================================
 */

import { useEffect, useState } from 'react'
interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }
interface NavigatorWithStandalone extends Navigator { standalone?: boolean }
import { Download, X } from 'lucide-react'

export default function PwaInstallButton(){
  const [prompt,setPrompt]=useState<BeforeInstallPromptEvent | null>(null)
  const [hidden,setHidden]=useState(false)
  useEffect(()=>{
    const standalone=window.matchMedia('(display-mode: standalone)').matches || (navigator as NavigatorWithStandalone).standalone===true
    if(standalone){setHidden(true);return}
    const handler=(event: Event)=>{event.preventDefault();setPrompt(event as BeforeInstallPromptEvent)}
    window.addEventListener('beforeinstallprompt',handler)
    return()=>window.removeEventListener('beforeinstallprompt',handler)
  },[])
  if(hidden||!prompt)return null
  async function install(){if(!prompt)return;const p=prompt;setPrompt(null);try{await p.prompt();await p.userChoice}catch { setPrompt(null) } }
  return <div className="pwa-install-banner" role="status"><div><strong>Instale o ERP no computador</strong><span>Acesso rápido, tela própria e experiência de aplicativo.</span></div><div className="pwa-install-actions"><button onClick={install}><Download size={16}/> Instalar</button><button aria-label="Fechar" onClick={()=>setPrompt(null)}><X size={16}/></button></div></div>
}
