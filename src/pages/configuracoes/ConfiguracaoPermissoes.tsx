import { useEffect, useState } from 'react'
import { Settings, Sliders, Users, Database, ChevronRight, User, LogOut, ShieldCheck, Check, HelpCircle, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface PermissaoModulo {
  id: string
  modulo_nome: string
  visualizar: boolean
  editar: boolean
  aprovar: boolean
}

const modulos = [
  ['ENGENHARIA', '1. Engenharia de Produto (BOM)'],
  ['COMERCIAL', '2. Comercial e Pedidos de Venda'],
  ['MRP', '3. Planejamento de Materiais (MRP)'],
  ['PCP', '4. Programação PCP e Ordens (OP)'],
  ['FABRICA', '5. Chão de Fábrica e Apontamentos'],
  ['QUALIDADE', '6. Gestão de Qualidade (SGQ)'],
] as const

const cargos = [
  ['ADMIN', 'Super Administrador'],
  ['PCP', 'Planejador de PCP (Fábrica)'],
  ['OPERADOR', 'Operador de Máquina / Chão'],
  ['QUALIDADE', 'Auditor de Qualidade (SGQ)'],
  ['VENDAS', 'Analista Comercial'],
] as const

export default function ControlePermissoes() {
  const [cargoAtivo, setCargoAtivo] = useState('PCP')
  const [permissoes, setPermissoes] = useState<PermissaoModulo[]>(
    modulos.map(([id, modulo_nome], index) => ({
      id,
      modulo_nome,
      visualizar: true,
      editar: index !== 1 && index !== 5,
      aprovar: index === 2 || index === 3,
    })),
  )
  const [operator, setOperator] = useState('Administrador')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    void (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data } = await supabase
        .from('erp_usuarios')
        .select('nome')
        .eq('auth_user_id', auth.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (alive && data?.nome) setOperator(data.nome)
    })()
    return () => { alive = false }
  }, [])

  const handleToggle = (id: string, campo: 'visualizar' | 'editar' | 'aprovar') => {
    setPermissoes(current => current.map(item =>
      item.id === id ? { ...item, [campo]: !item[campo] } : item,
    ))
    setMessage('')
  }

  const calcularNivelAcesso = (item: PermissaoModulo) => {
    if (item.visualizar && item.editar && item.aprovar) return { label: 'Acesso Total', style: 'text-cyan-700 bg-cyan-50 border-cyan-200' }
    if (item.visualizar && item.editar) return { label: 'Modificação', style: 'text-blue-700 bg-blue-50 border-blue-200' }
    if (item.visualizar) return { label: 'Leitura', style: 'text-slate-600 bg-slate-100 border-slate-200' }
    return { label: 'Bloqueado', style: 'text-red-700 bg-red-50 border-red-200' }
  }

  const salvar = async () => {
    setSaving(true)
    setMessage('')
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sessão não encontrada.')
      const { data: perfil } = await supabase
        .from('erp_usuarios')
        .select('empresa_id,is_master')
        .eq('auth_user_id', auth.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      let query = supabase.from('erp_roles').select('id,name').eq('name', cargoAtivo)
      query = perfil?.is_master === true ? query.is('company_id', null) : query.eq('company_id', perfil?.empresa_id ?? '')
      const { data: role, error: roleError } = await query.maybeSingle()
      if (roleError) throw roleError
      if (!role) throw new Error('Cargo não encontrado no Supabase.')
      for (const [module_code, p] of permissoes.map((p, i) => [modulos[i][0], p] as const)) {
        const { error } = await supabase.from('erp_role_module_permissions').upsert({
          role_id: role.id,
          module_code,
          can_view: p.visualizar,
          can_edit: p.editar,
          can_approve: p.aprovar,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'role_id,module_code' })
        if (error) throw error
      }
      setMessage('Acessos atualizados no Supabase.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar acessos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F4F7FE] font-sans antialiased text-slate-800">
      <aside className="fixed left-0 top-0 z-30 flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 shadow-2xl">
        <div className="flex items-center space-x-3 border-b border-slate-800 p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 text-sm font-black text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]">SQ</div>
          <div><span className="block text-base font-black tracking-tight text-white">SGQERP</span><span className="-mt-1 block text-[10px] font-bold uppercase tracking-widest text-cyan-400">Industrial</span></div>
        </div>
        <div className="p-4 pb-3 pl-6 pt-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">Administração</div>
        <nav className="flex-1 space-y-1 px-4">
          <a href="/configuracoes-adm/codificacao" className="group flex items-center justify-between rounded-xl p-3 pl-6 font-semibold text-slate-400 transition-all hover:bg-slate-800/40 hover:text-white"><span className="flex items-center space-x-3"><Settings className="h-4 w-4" /><span>Codificação e Áreas</span></span><ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" /></a>
          <a href="/configuracoes-adm" className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-600/10 p-3 font-bold text-cyan-400 shadow-sm"><span className="flex items-center space-x-3"><Sliders className="h-4 w-4 text-cyan-400" /><span>Controle Permissões</span></span><ChevronRight className="h-3.5 w-3.5 opacity-80" /></a>
          <a href="/configuracoes-adm/perfis" className="group flex items-center space-x-3 rounded-xl p-3 pl-6 font-semibold text-slate-400 transition-all hover:bg-slate-800/40 hover:text-white"><Users className="h-4 w-4" /><span>Perfis de Usuários</span></a>
          <a href="/admin/logs" className="group flex items-center space-x-3 rounded-xl p-3 pl-6 font-semibold text-slate-400 transition-all hover:bg-slate-800/40 hover:text-white"><Database className="h-4 w-4" /><span>Logs do Sistema</span></a>
        </nav>
        <div className="flex items-center justify-between border-t border-slate-800 p-4 pl-6 font-mono text-[10px] text-slate-500"><span>SUPABASE CONNECTED</span><span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" /></div>
      </aside>

      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-8 py-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-400"><span>Dashboard</span><ChevronRight className="h-3.5 w-3.5" /><span className="text-slate-800">Controle de Permissões</span></div>
          <div className="flex items-center space-x-4">
            <div className="text-right text-[10px] font-bold leading-tight text-slate-400"><div>{new Date().toLocaleDateString('pt-BR')}</div><div>{new Date().toLocaleTimeString('pt-BR')}</div></div>
            <div className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500"><User className="h-3.5 w-3.5 text-blue-900" /><span>Operador: <strong className="text-slate-700">{operator}</strong></span></div>
            <button type="button" onClick={() => void supabase.auth.signOut()} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="ml-64 flex-1 space-y-6 p-8">
          <div className="border-b border-slate-200/60 pb-2"><h2 className="text-2xl font-black tracking-tight text-slate-900">Matriz de Governança e Acesso</h2><p className="mt-0.5 text-xs font-medium text-slate-400">Gerencie os bloqueios e liberações de nível de execução para cada perfil corporativo da fábrica.</p></div>
          <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
            <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400"><span className="h-3 w-3 rounded-full bg-gradient-to-tr from-blue-700 to-cyan-400" />1. Seleção do Cargo Industrial</h3>
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Perfil em Configuração<select value={cargoAtivo} onChange={e => setCargoAtivo(e.target.value)} className="mt-1.5 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 shadow-inner focus:border-blue-600 focus:outline-none">{cargos.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-500 md:col-span-2"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-blue-900">Escopo Operacional do Cargo</span>{cargoAtivo === 'PCP' && 'Autorizado a realizar modificações de fichas técnicas (BOM), disparar ordens de produção e aprovar o sequenciamento de máquinas baseado nas ordens do comercial.'}{cargoAtivo === 'OPERADOR' && 'Restrito estritamente a ler as OPs enviadas e realizar os apontamentos de início, fim e motivos de paradas mecânicas.'}{cargoAtivo === 'ADMIN' && 'Controle irrestrito de gravação, exclusão e alteração de parâmetros globais nas tabelas internas do Supabase.'}{cargoAtivo === 'QUALIDADE' && 'Focado nos laudos de liberação, inspeções de setup, registros de defeitos de peças e bloqueios de lotes não conformes.'}{cargoAtivo === 'VENDAS' && 'Acesso exclusivo de inserção de demandas comerciais, sem permissão para alterar custos ou tempos de engenharia.'}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between border-b border-slate-100 p-6"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Matriz de Autorização por Módulo Industrial</h3><ShieldCheck className="h-5 w-5 text-[#2D8DB8]" /></div>
            <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-[#123B50] text-white"><tr><th className="p-4 text-left">Módulo Industrial</th><th className="p-4 text-center">Visualizar</th><th className="p-4 text-center">Criar / Editar</th><th className="p-4 text-center">Aprovar / Liberar</th><th className="p-4 text-center">Nível de Acesso</th></tr></thead><tbody>{permissoes.map(item => { const status = calcularNivelAcesso(item); return <tr key={item.id} className="border-t border-slate-100"><td className="p-4 font-bold text-slate-700">{item.modulo_nome}</td>{(['visualizar','editar','aprovar'] as const).map(campo => <td key={campo} className="p-4 text-center"><button type="button" onClick={() => handleToggle(item.id,campo)} aria-label={`${item.modulo_nome} ${campo}`} className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 transition ${item[campo] ? 'border-blue-600 bg-blue-600 text-white hover:bg-cyan-500' : 'border-slate-300 bg-white text-transparent hover:border-blue-400'}`}><Check size={17} /></button></td>)}<td className="p-4 text-center"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status.style}`}>{status.label}</span></td></tr> })}</tbody></table></div>
            <div className="flex justify-end p-6"><button type="button" disabled={saving} onClick={() => void salvar()} className="flex items-center gap-2 rounded-xl bg-[#123B50] px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-[#2D8DB8] disabled:opacity-50"><Save size={17} />{saving ? 'Salvando...' : 'Atualizar Acessos no Supabase'}</button></div>
          </section>

          <section className="rounded-3xl border border-cyan-100 bg-[#F4FBFD] p-6 shadow-xl shadow-slate-200/20">
            <div className="flex items-center gap-2 font-black text-[#123B50]"><HelpCircle size={18} />3. Manual do Usuário: Governança de Matriz de Segurança</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Aqui você amarra as permissões operacionais por grupo. Isso impede que operadores alterem as fichas técnicas de engenharia ou que o comercial libere ordens sem validação física.</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">A ativação da coluna Aprovar/Liberar confere autoridade operacional. As alterações são gravadas no Supabase canônico através da matriz de permissões.</p>
          </section>

          {message && <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold text-[#123B50]">{message}</div>}
        </main>
      </div>
    </div>
  )
}
