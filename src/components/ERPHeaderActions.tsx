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
      if (alive) setShowMaster(profile?.nivel_admin === 1)
    })()
    return () => { alive = false }
  }, [])
  if (['/', '/login', '/fiscal', '/master', '/pcp', '/qualidade', '/compras-solicitacao', '/cadastro-empresa'].includes(location.pathname)) return null
  return <div className="erp-header-actions"><a href="/compras-solicitacao" className="erp-header-action purchases" title="Abrir solicitações de compras"><ShoppingCart size={17} /><span>Solicitação de Compras</span></a>{showMaster && <a href="/master" className="erp-header-action master" title="Abrir administração Master"><ShieldCheck size={17} /><span>Master</span></a>}</div>
}
