import { useEffect, useState } from 'react'
import { ShieldCheck, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function ERPHeaderActions() {
  const [showMaster, setShowMaster] = useState(false)
  useEffect(() => {
    let alive = true
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const { data: profile } = await supabase.from('erp_usuarios').select('nivel_admin').eq('auth_user_id', data.user.id).maybeSingle()
      if (alive) setShowMaster(Number(profile?.nivel_admin) >= 9)
    })()
    return () => { alive = false }
  }, [])
  // Solicitação de Compras é uma ação do workspace principal; não deve poluir blog, home ou módulos.
  const path = location.pathname
  if (path !== '/erp-industrial' && path !== '/master') return null
  return <div className="erp-header-actions">
    {path === '/erp-industrial' && <a href="/compras-solicitacao?returnTo=%2Ferp-industrial" className="erp-header-action purchases" title="Abrir solicitações de compras"><ShoppingCart size={17} /><span>Solicitação de Compras</span></a>}
    {showMaster && path === '/master' && <a href="/master" className="erp-header-action master" title="Abrir administração Master"><ShieldCheck size={17} /><span>Master</span></a>}
  </div>
}
