import { useEffect, useRef, useState } from 'react'
import { Ban, Edit2, Save, User, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type PerfilRole = 'Administrador' | 'Comercial' | 'Engenharia' | 'PCP' | 'Produção'

interface UsuarioPonto {
  id: string
  codigo_cracha: string
  nome_funcionario: string
  perfil_role: PerfilRole
  ativo: boolean
}

const perfis: PerfilRole[] = ['Administrador', 'Comercial', 'Engenharia', 'PCP', 'Produção']
const inputStyle = 'h-6 w-full border border-gray-300 rounded-sm bg-white px-1.5 py-0.5 text-[11px] text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
const labelStyle = 'mb-0 text-[10px] font-bold text-gray-500'
const buttonStyle = 'flex h-6 items-center justify-center gap-1 rounded-sm px-2 text-xs font-bold'

export default function Configuracoes() {
  const [empresaId, setEmpresaId] = useState('')
  const [usuarios, setUsuarios] = useState<UsuarioPonto[]>([])
  const [nome, setNome] = useState('')
  const [cracha, setCracha] = useState('')
  const [perfil, setPerfil] = useState<PerfilRole>('Comercial')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const nomeRef = useRef<HTMLInputElement>(null)

  const resolveEmpresa = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    const metadataEmpresa = authData.user?.user_metadata?.empresa_id
    if (typeof metadataEmpresa === 'string' && metadataEmpresa.trim()) return metadataEmpresa.trim()
    const { data, error } = await supabase.rpc('erp_current_empresa_id')
    if (error || !data) throw error ?? new Error('Empresa não identificada para o usuário autenticado.')
    return String(data)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const id = await resolveEmpresa()
      setEmpresaId(id)
      const { data, error: queryError } = await supabase
        .from('erp_usuarios_ponto')
        .select('id,codigo_cracha,nome_funcionario,perfil_role,ativo')
        .eq('empresa_id', id)
        .order('ativo', { ascending: false })
        .order('nome_funcionario', { ascending: true })
      if (queryError) throw queryError
      setUsuarios((data ?? []) as UsuarioPonto[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar usuários de ponto.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const clearForm = () => {
    setNome('')
    setCracha('')
    setPerfil('Comercial')
    setEditingId(null)
    window.setTimeout(() => nomeRef.current?.focus(), 0)
  }

  const handleCadastrar = async () => {
    const nomeNormalizado = nome.trim()
    const crachaNormalizado = cracha.trim()
    if (!nomeNormalizado || !crachaNormalizado || !perfil) {
      setError('Preencha Nome Funcionário, Código Crachá / RE e Perfil Industrial.')
      return
    }
    if (!empresaId) {
      setError('Empresa não identificada.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('erp_usuarios_ponto')
          .update({ nome_funcionario: nomeNormalizado, codigo_cracha: crachaNormalizado, perfil_role: perfil })
          .eq('id', editingId)
          .eq('empresa_id', empresaId)
        if (updateError) {
          if (updateError.code === '23505') throw new Error('O código de crachá já está cadastrado nesta empresa.')
          throw updateError
        }
        setMessage('Usuário atualizado no PostgreSQL.')
      } else {
        const { error: insertError } = await supabase
          .from('erp_usuarios_ponto')
          .insert({ empresa_id: empresaId, nome_funcionario: nomeNormalizado, codigo_cracha: crachaNormalizado, perfil_role: perfil, ativo: true })
        if (insertError) {
          if (insertError.code === '23505') throw new Error('O código de crachá já está cadastrado nesta empresa.')
          throw insertError
        }
        setMessage('Usuário gravado no PostgreSQL.')
      }
      clearForm()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar usuário.')
    } finally {
      setSaving(false)
    }
  }

  const editUser = (usuario: UsuarioPonto) => {
    setEditingId(usuario.id)
    setNome(usuario.nome_funcionario)
    setCracha(usuario.codigo_cracha)
    setPerfil(usuario.perfil_role)
    setError('')
    setMessage('Modo de edição ativo.')
    window.setTimeout(() => nomeRef.current?.focus(), 0)
  }

  const blockUser = async (usuario: UsuarioPonto) => {
    setError('')
    setMessage('')
    const { error: updateError } = await supabase
      .from('erp_usuarios_ponto')
      .update({ ativo: false })
      .eq('id', usuario.id)
      .eq('empresa_id', empresaId)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage('Usuário inativado no banco.')
    await load()
  }

  return (
    <VendasLayout title="Configurações" subtitle="Gestão de usuários e controle de acesso por cartão de ponto industrial" onRefresh={() => void load()}>
      <div className="flex flex-col gap-4 bg-slate-50 text-gray-800">
        {(error || message) && (
          <div className={`border px-2 py-1 text-[10px] ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
            {error || message}
          </div>
        )}

        <section className="rounded-sm border border-gray-200 bg-white p-2">
          <div className="mb-2 text-[11px] font-bold text-gray-700">GESTÃO DE USUÁRIOS / CARTÃO DE PONTO</div>
          <div className="flex items-end gap-2">
            <div className="w-64">
              <label htmlFor="nomeFuncionario" className={labelStyle}>Nome Funcionário</label>
              <div className="relative">
                <User size={12} className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-gray-400" />
                <input id="nomeFuncionario" ref={nomeRef} value={nome} onChange={e => setNome(e.target.value)} className={`${inputStyle} pl-5`} maxLength={100} />
              </div>
            </div>
            <div className="w-32">
              <label htmlFor="codigoCracha" className={labelStyle}>Código Crachá / RE</label>
              <div className="relative">
                <Clock size={12} className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-gray-400" />
                <input id="codigoCracha" value={cracha} onChange={e => setCracha(e.target.value)} className={`${inputStyle} pl-5`} maxLength={50} />
              </div>
            </div>
            <div className="w-40">
              <label htmlFor="perfilIndustrial" className={labelStyle}>Perfil Industrial</label>
              <select id="perfilIndustrial" value={perfil} onChange={e => setPerfil(e.target.value as PerfilRole)} className={inputStyle}>
                {perfis.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <button id="btnGravarUsuario" type="button" disabled={saving} onClick={() => void handleCadastrar()} className={`${buttonStyle} bg-green-600 text-white hover:bg-green-700 disabled:opacity-50`}>
              <Save size={12} />{editingId ? 'Atualizar Usuário' : 'Gravar Usuário'}
            </button>
            {editingId && <button type="button" onClick={clearForm} className={`${buttonStyle} border border-gray-300 bg-gray-100 text-gray-700`}>Cancelar</button>}
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-gray-200 bg-white">
          <div className="flex h-8 items-center justify-between border-b border-gray-200 px-2">
            <span className="text-[10px] font-bold text-gray-600">FUNCIONÁRIOS ATIVOS</span>
            <button type="button" onClick={() => void load()} className="flex h-6 items-center gap-1 border border-gray-300 bg-white px-2 text-[10px] font-bold text-gray-700"><RefreshCw size={11} /> Atualizar</button>
          </div>
          <div className="overflow-auto">
            <table id="gridUsuariosPonto" className="w-full border-collapse text-[11px]">
              <thead className="bg-slate-700 text-white">
                <tr className="h-7">
                  <th className="border-r border-slate-600 px-2 text-left font-normal">Item (Seq)</th>
                  <th className="border-r border-slate-600 px-2 text-left font-normal">Nome</th>
                  <th className="border-r border-slate-600 px-2 text-left font-normal">Código Crachá / RE</th>
                  <th className="border-r border-slate-600 px-2 text-left font-normal">Perfil/Função</th>
                  <th className="border-r border-slate-600 px-2 text-left font-normal">Status</th>
                  <th className="px-2 text-left font-normal">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="h-8 px-2 text-center text-[10px] text-gray-500">Consultando PostgreSQL...</td></tr>
                ) : usuarios.length === 0 ? (
                  <tr><td colSpan={6} className="h-8 px-2 text-center text-[10px] text-gray-500">Nenhum usuário de ponto cadastrado para esta empresa.</td></tr>
                ) : usuarios.map((usuario, index) => (
                  <tr key={usuario.id} className="h-7 border-t border-gray-200 even:bg-slate-50">
                    <td className="px-2">{index + 1}</td>
                    <td className="px-2 font-semibold">{usuario.nome_funcionario}</td>
                    <td className="px-2">{usuario.codigo_cracha}</td>
                    <td className="px-2">{usuario.perfil_role}</td>
                    <td className="px-2">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {usuario.ativo ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="px-2">
                      <div className="flex items-center gap-1">
                        <button type="button" title="Editar perfil" aria-label={`Editar ${usuario.nome_funcionario}`} onClick={() => editUser(usuario)} className="flex h-6 w-6 items-center justify-center rounded-sm border border-gray-200 bg-white"><Edit2 size={11} className="text-blue-600" /></button>
                        {usuario.ativo && <button type="button" title="Bloquear usuário" aria-label={`Inativar ${usuario.nome_funcionario}`} onClick={() => void blockUser(usuario)} className="flex h-6 w-6 items-center justify-center rounded-sm border border-gray-200 bg-white"><Ban size={11} className="text-red-600" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </VendasLayout>
  )
}
