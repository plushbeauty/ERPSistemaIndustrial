/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-047
 * Alterações: Corrigir narrowing do prompt de instalação antes do uso assíncrono.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-033
 * Alterações: Eliminar any do evento de instalação PWA e do estado; usar interface estrita BeforeInstallPromptEvent e guarda de capacidade do navigator.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }
interface NavigatorWithStandalone extends Navigator { standalone?: boolean }
import { useEffect, useState } from 'react'
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
  async function install(){if(!prompt)return;const p=prompt;setPrompt(null);try{await p.prompt();await p.userChoice}catch{} }
  return <div className="pwa-install-banner" role="status"><div><strong>Instale o ERP no computador</strong><span>Acesso rápido, tela própria e experiência de aplicativo.</span></div><div className="pwa-install-actions"><button onClick={install}><Download size={16}/> Instalar</button><button aria-label="Fechar" onClick={()=>setPrompt(null)}><X size={16}/></button></div></div>
}
