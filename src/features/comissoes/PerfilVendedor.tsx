/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-10
 * @REVISAO: REV-COMISSOES-PERFIL-VENDEDOR-WIREFRAME-20261110-01
 * @STATUS_APROVACAO: WIREFRAME E AJUDA AUTORIZADOS PELO PROPRIETARIO EM 2026-11-10
 */
import { useEffect, useMemo, useState } from 'react'
import { Pencil, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import LinkFieldCombobox, { type LinkOption } from '../../components/ui/LinkFieldCombobox'

type User = { id: string; nome: string; email: string | null }
type Profile = { id: string; nome: string }
type Link = { id: string; usuario_id: string; perfil_id: string; status: 'Ativo' | 'Inativo'; usuario?: User | null; perfil?: Profile | null }

const input = 'h-10 rounded-md border border-gray-200 bg-white px-3 text-[12px] text-gray-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500'
const button = 'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export default function PerfilVendedor() {
  const [users, setUsers] = useState<User[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [userId, setUserId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [editingId, setEditingId] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Selecione a empresa de trabalho antes de consultar os vínculos.')
      const tenant = String(company.data)
      setEmpresaId(tenant)
      const [u, p, l] = await Promise.all([
        supabase.from('erp_usuarios').select('id,nome,email').eq('empresa_id', tenant).eq('ativo', true).is('deleted_at', null).order('nome'),
        supabase.from('erp_comissao_perfis').select('id,nome').eq('empresa_id', tenant).eq('ativo', true).order('nome'),
        supabase.from('erp_comissao_vinculos').select('id,usuario_id,perfil_id,status,usuario:erp_usuarios(id,nome,email),perfil:erp_comissao_perfis(id,nome)').eq('empresa_id', tenant).order('created_at', { ascending: false }),
      ])
      if (u.error) throw u.error
      if (p.error) throw p.error
      if (l.error) throw l.error
      setUsers((u.data ?? []) as User[])
      setProfiles((p.data ?? []) as Profile[])
      setLinks((l.data ?? []) as unknown as Link[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar vínculos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const userOptions = useMemo<LinkOption[]>(() => users.map(u => ({ value: u.id, label: u.nome, description: u.email ?? undefined })), [users])
  const profileOptions = useMemo<LinkOption[]>(() => profiles.map(p => ({ value: p.id, label: p.nome })), [profiles])

  const reset = () => { setUserId(''); setProfileId(''); setStatus('Ativo'); setEditingId('') }

  const save = async () => {
    if (!userId || !profileId) { setError('Selecione o Vendedor/Agente e o Perfil de Regras.'); return }
    setBusy(true)
    setError('')
    try {
      const result = await supabase.rpc('erp_comissao_vincular', { p_usuario_id: userId, p_perfil_id: profileId, p_status: status })
      if (result.error) throw result.error
      reset()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gravar o vínculo.')
    } finally {
      setBusy(false)
    }
  }

  const edit = (link: Link) => {
    setUserId(link.usuario_id)
    setProfileId(link.perfil_id)
    setStatus(link.status)
    setEditingId(link.id)
    setError('')
  }

  const remove = async (link: Link) => {
    if (!empresaId || !window.confirm('Excluir este vínculo de vendedor e perfil?')) return
    setBusy(true)
    setError('')
    try {
      const result = await supabase.from('erp_comissao_vinculos').delete().eq('id', link.id).eq('empresa_id', empresaId)
      if (result.error) throw result.error
      if (editingId === link.id) reset()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível excluir o vínculo.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50]">
    <div className="mx-auto max-w-[1600px] space-y-3">
      <header className="rounded-md border border-[#D3E3EA] bg-white p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#2D8DB8]">FINANCEIRO › COMISSÕES › PERFIL DO VENDEDOR</div>
        <h1 className="mt-1 text-[18px] font-bold">Controladoria Comercial — Perfil do Vendedor</h1>
        <p className="mt-1 text-[12px] text-slate-500">Associação de vendedores e agentes aos perfis de regras de comissionamento.</p>
        <nav className="mt-3 flex flex-wrap gap-3">
          <a className="flex h-10 w-[130px] items-center justify-center rounded-md border border-[#D3E3EA] text-[12px] font-semibold text-slate-600 hover:bg-slate-50" href="/pageprincipal/comissoes/regras">Regras</a>
          <a className="flex h-10 w-[130px] items-center justify-center rounded-md border border-[#D3E3EA] text-[12px] font-semibold text-slate-600 hover:bg-slate-50" href="/pageprincipal/comissoes/calculo">Cálculo</a>
          <a className="flex h-10 w-[160px] items-center justify-center rounded-md border border-[#2D8DB8] bg-[#EAF6FA] text-[12px] font-bold text-[#123B50]" href="/pageprincipal/comissoes/perfil">Perfil Vendedor</a>
        </nav>
      </header>

      <section className="rounded-md border border-[#D3E3EA] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-4 xl:grid-cols-[320px_320px_160px_165px]">
          <div><label className={label}>Vendedor/Agente *</label><LinkFieldCombobox value={userId} options={userOptions} onChange={setUserId} placeholder="Pesquisar..." /></div>
          <div><label className={label}>Perfil de Regras *</label><LinkFieldCombobox value={profileId} options={profileOptions} onChange={setProfileId} placeholder="Pesquisar..." /></div>
          <div><label className={label}>Status *</label><select className={input + ' w-full'} value={status} onChange={e => setStatus(e.target.value as 'Ativo' | 'Inativo')}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select></div>
          <div className="flex gap-2">
            <button type="button" className={button + ' w-[165px] bg-[#2D8DB8] text-white hover:bg-[#236F91]'} onClick={() => void save()} disabled={busy || loading}><Save size={15}/>{editingId ? 'Atualizar Vínculo' : 'Gravar Vínculo'}</button>
            {editingId && <button type="button" title="Cancelar edição" className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200" onClick={reset}><X size={15}/></button>}
          </div>
        </div>
        {error && <p role="alert" className="mt-3 text-[12px] font-medium text-red-600">{error}</p>}
      </section>

      <section className="overflow-hidden rounded-md border border-[#D3E3EA] bg-white shadow-sm">
        <div className="flex min-h-14 items-center justify-between border-b border-[#D3E3EA] px-4">
          <h2 className="text-[13px] font-bold">Vínculos Vendedor × Perfil</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{links.length} vínculo(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-[12px]">
            <thead className="bg-[#123B50] text-white"><tr className="h-11"><th className="px-4 text-left font-semibold">Vendedor</th><th className="px-4 text-left font-semibold">Perfil</th><th className="px-4 text-left font-semibold">Status</th><th className="w-[150px] px-4 text-center font-semibold">Ações</th></tr></thead>
            <tbody>{links.map((link, index) => <tr key={link.id} className="h-12 border-b border-slate-100 even:bg-[#F8FBFC]">
              <td className="px-4 font-medium">{link.usuario?.nome ?? '—'}</td>
              <td className="px-4">{link.perfil?.nome ?? '—'}</td>
              <td className="px-4"><span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (link.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{link.status}</span></td>
              <td className="px-4"><div className="flex justify-center gap-2"><button type="button" title="Editar vínculo" disabled={busy} onClick={() => edit(link)} className="flex h-8 w-8 items-center justify-center rounded border border-[#D3E3EA] text-[#2D8DB8]"><Pencil size={14}/></button><button type="button" title="Excluir vínculo" disabled={busy} onClick={() => void remove(link)} className="flex h-8 w-8 items-center justify-center rounded border border-red-100 text-red-600"><Trash2 size={14}/></button></div></td>
            </tr>)}
            {!loading && links.length === 0 && <tr><td colSpan={4} className="h-20 px-4 text-center text-[12px] text-slate-400">Nenhum vínculo entre vendedor e perfil cadastrado para esta empresa.</td></tr>}
            {loading && <tr><td colSpan={4} className="h-20 text-center text-[12px] text-slate-400">Carregando vínculos...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
}
