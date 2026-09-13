// src/pages/UsuariosAdmin.tsx
import React, { FormEvent, useEffect, useState, useMemo, useCallback } from 'react'
import { Edit3, Lock, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// Interface de tipos estrita e mapeada com a realidade do banco de dados relacional
export interface ERPUser {
  id: string
  nome: string
  email: string | null
  nivel_admin: number
  ativo: boolean
  setor_id: string | null
  cargo_id: string | null
  matricula: string | null
  created_at: string
}

// Payload inicial higienizado para controle de estado do formulário
const INITIAL_FORM_STATE = {
  nome: '',
  email: '',
  matricula: '',
  nivel_admin: '1',
  password: ''
}

// Barramento centralizado de chamadas de API contra a Edge Function do Supabase
const executeUserAdminAction = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('erp-user-admin', { body })
  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error || 'A ação administrativa foi rejeitada pelo servidor.')
  return data
}

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<ERPUser[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState<ERPUser | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM_STATE)

  // Função estável de carregamento com useCallback para evitar re-renderizações infinitas
  const loadUsuarios = useCallback(async () => {
    setBusy(true)
    setMsg('')
    try {
      const response = await executeUserAdminAction({ action: 'list_users' })
      setUsers(response.users || [])
    } catch (error: any) {
      setMsg(error.message || 'Falha ao sincronizar lista de usuários.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void loadUsuarios()
  }, [loadUsuarios])

  const handleOpenCreate = () => {
    setEditing(null)
    setForm(INITIAL_FORM_STATE)
    setMsg('')
    setShowModal(true)
  }

  const handleOpenEdit = (user: ERPUser) => {
    setEditing(user)
    setForm({
      nome: user.nome,
      email: user.email || '',
      matricula: user.matricula || '',
      nivel_admin: String(user.nivel_admin),
      password: ''
    })
    setMsg('')
    setShowModal(true)
  }

  const handleSaveUsuario = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')

    try {
      if (editing) {
        await executeUserAdminAction({
          action: 'update_user',
          user_id: editing.id,
          nome: form.nome.trim(),
          email: form.email.trim(),
          matricula: form.matricula.trim(),
          nivel_admin: Number(form.nivel_admin)
        })
        setMsg('Usuário industrial atualizado com sucesso.')
      } else {
        if (!form.password || form.password.length < 8) {
          throw new Error('A senha inicial é obrigatória e deve conter no mínimo 8 caracteres.')
        }
        await executeUserAdminAction({
          ...form,
          action: 'create_user',
          nome: form.nome.trim(),
          email: form.email.trim(),
          matricula: form.matricula.trim(),
          nivel_admin: Number(form.nivel_admin)
        })
        setMsg('Novo usuário criado e registrado no Auth com sucesso.')
      }
      setShowModal(false)
      await loadUsuarios()
    } catch (error: any) {
      setMsg(error.message || 'Erro ao salvar os dados cadastrais.')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleStatus = async (user: ERPUser) => {
    setBusy(true)
    setMsg('')
    try {
      await executeUserAdminAction({ action: 'set_active', user_id: user.id, ativo: !user.ativo })
      await loadUsuarios()
    } catch (error: any) {
      setMsg(error.message || 'Não foi possível alterar o status de acesso.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveUsuario = async (user: ERPUser) => {
    const confirmacao = window.confirm(`Atenção: Deseja excluir definitivamente o usuário ${user.nome}? Isso apagará o perfil no ERP e a credencial no Supabase Auth.`)
    if (!confirmacao) return

    setBusy(true)
    setMsg('')
    try {
      await executeUserAdminAction({ action: 'delete_user', user_id: user.id })
      setMsg('Usuário removido permanentemente de todas as camadas.')
      await loadUsuarios()
    } catch (error: any) {
      setMsg(error.message || 'Falha ao deletar registro do servidor.')
    } finally {
      setBusy(false)
    }
  }

  // Filtro performático via useMemo baseado nos índices válidos de e-mail, nome e matrícula
  const filteredUsers = useMemo(() => {
    const search = query.toLowerCase().trim()
    if (!search) return users
    return users.filter(u =>
      u.nome.toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search) ||
      (u.matricula || '').toLowerCase().includes(search)
    )
  }, [users, query])

  return (
    <div className="users-admin p-4 md:p-6 space-y-6">
      {/* CABEÇALHO */}
      <div className="users-head flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <span className="eyebrow text-xs font-black text-emerald-700 uppercase tracking-widest">Controle de Segurança</span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">Usuários e Permissões do ERP</h2>
          <p className="text-xs font-medium text-slate-400">Sincronização instantânea de perfis e acessos corporativos com o banco relacional.</p>
        </div>
        <div className="users-actions flex items-center gap-2">
          <button type="button" className="secondary border px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 transition-colors disabled:opacity-50" onClick={() => void loadUsuarios()} disabled={busy}>
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Sincronizar
          </button>
          <button type="button" className="primary bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1 transition-colors" onClick={handleOpenCreate}>
            <Plus size={15} /> Adicionar Usuário
          </button>
        </div>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="users-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        <label className="form-search flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:max-w-md">
          <Search size={16} className="text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou matrícula corporativa..." className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none" />
        </label>
        <span className="text-xs font-bold text-slate-400 shrink-0">{filteredUsers.length} registro(s) listado(s)</span>
      </div>

      {msg && <div className="form-message p-3 bg-slate-100 border text-slate-700 rounded-xl font-bold text-xs animate-fadeIn">{msg}</div>}

      {/* GRID DE CARDS DOS USUÁRIOS */}
      <div className="users-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {filteredUsers.map(u => (
          <article className={`user-card bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative ${u.ativo ? '' : 'opacity-65 border-dashed bg-slate-50/50'}`} key={u.id}>
            <div>
              <div className="user-card-top flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="user-avatar w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center font-black text-emerald-800 text-sm">{u.nome.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <strong className="block text-xs font-black text-slate-900 leading-tight truncate max-w-[160px]">{u.nome}</strong>
                    <span className="block text-[11px] text-slate-400 font-medium truncate max-w-[160px] mt-0.5">{u.email || 'Sem endereço de e-mail'}</span>
                  </div>
                </div>
                <b className={`text-[9px] font-black px-2 py-0.5 rounded border tracking-wider uppercase ${u.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{u.ativo ? 'Ativo' : 'Bloqueado'}</b>
              </div>
              <div className="user-meta space-y-1.5 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-600" /> Nível Operacional: {u.nivel_admin}</span>
                <span className="flex items-center gap-1.5"><Lock size={13} className="text-slate-400" /> Identificador: {u.email || 'Não configurado'}</span>
                {u.matricula && <span className="block text-slate-400 font-mono">ID Matrícula: {u.matricula}</span>}
              </div>
            </div>
            <div className="user-card-actions grid grid-cols-3 gap-2 mt-6 pt-3 border-t border-slate-100">
              <button type="button" className="border p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50" onClick={() => handleOpenEdit(u)} disabled={busy}><Edit3 size={13} className="inline mr-1" />Editar</button>
