import { useEffect, useState } from 'react'
import { BookOpen, ClipboardCheck, FileText, Factory, HelpCircle, Package, Settings, ShieldCheck, ShoppingCart, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function ERPHeaderActions() {
  const [showMaster, setShowMaster] = useState(false)
  const [open, setOpen] = useState(false)
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
  const path = location.pathname
  if (path !== '/erp-industrial' && path !== '/master') return null
  const links = [
    { href: '/pcp', label: 'PCP', icon: Factory },
    { href: '/produtos-vendas', label: 'Produtos / Vendas / Estoque', icon: Package },
    { href: '/qualidade', label: 'Qualidade / RPNC', icon: ClipboardCheck },
    { href: '/qualidade/documentos', label: 'Documentos da Qualidade', icon: FileText },
    { href: '/fiscal', label: 'Fiscal / NF-e', icon: FileText },
    { href: '/compras-solicitacao', label: 'Solicitação de Compras', icon: ShoppingCart },
    { href: '/usuarios', label: 'Usuários / Permissões', icon: Users },
    { href: '/manual-usuario', label: 'Manual do Usuário', icon: BookOpen },
  ]
  return <div className="erp-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    {path === '/erp-industrial' && <>
      <button type="button" className="erp-header-action" title="Abrir atalhos dos módulos principais" onClick={() => setOpen(v => !v)}><HelpCircle size={17} /><span>Ajuda e Atalhos</span></button>
      {open && <div role="menu" style={{ position: 'absolute', top: 58, right: 16, zIndex: 1500, width: 'min(360px, calc(100vw - 32px))', padding: 10, borderRadius: 16, background: '#fff', border: '1px solid #dce6e9', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
        <strong style={{ display: 'block', padding: '8px 10px 10px' }}>Acesso rápido aos módulos</strong>
        {links.map(({ href, label, icon: Icon }) => <a key={href} href={href} role="menuitem" className="erp-header-action" style={{ display: 'flex', width: '100%', marginBottom: 4, textDecoration: 'none' }} title={`Abrir ${label}`}><Icon size={17} /><span>{label}</span></a>)}
      </div>}
    </>}
    {showMaster && path === '/master' && <a href="/master" className="erp-header-action master" title="Abrir administração Master"><ShieldCheck size={17} /><span>Master</span></a>}
    <a href="/manual-usuario" className="erp-header-action" title="Abrir Manual do Usuário"><BookOpen size={17} /><span>Manual</span></a>
    {path === '/erp-industrial' && <a href="/compras-solicitacao?returnTo=%2Ferp-industrial" className="erp-header-action purchases" title="Abrir solicitações de compras"><ShoppingCart size={17} /><span>Solicitação de Compras</span></a>}
    {path === '/erp-industrial' && <a href="/usuarios" className="erp-header-action" title="Abrir usuários e permissões"><Settings size={17} /><span>Usuários</span></a>}
  </div>
}