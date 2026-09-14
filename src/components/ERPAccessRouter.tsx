import { useEffect } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'

export default function ERPAccessRouter() {
  useEffect(() => {
    if (!supabaseConfigurado) return

    let active = true

    const enforce = async () => {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user || !active) return

      const { data: erpUser, error } = await supabase
        .from('erp_usuarios')
        .select('nivel_admin, ativo, empresa_id, erp_empresas(tipo_segmento, ativo)')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (error || !erpUser || !erpUser.ativo || !erpUser.empresa_id) return

      const empresa = Array.isArray(erpUser.erp_empresas)
        ? erpUser.erp_empresas[0]
        : erpUser.erp_empresas

      if (!empresa || empresa.ativo === false) return

      const nivel = Number(erpUser.nivel_admin ?? 0)
      const path = window.location.pathname

      if (path.startsWith('/master') && nivel < 9) {
        window.location.replace('/erp-industrial')
        return
      }

      if ((path === '/erp-industrial' || path === '/login') && nivel >= 9) {
        window.location.replace('/master')
        return
      }

      if (path === '/login' && empresa.tipo_segmento === 'industria_cosmeticos') {
        window.location.replace('/erp-industrial')
      }
    }

    void enforce()

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => {
          if (active) void enforce()
        }, 0)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return null
}
