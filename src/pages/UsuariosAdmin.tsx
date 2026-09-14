import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Edit3,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export interface ERPUser {
  id: string
  empresa_id: string | null
  nome: string
  email: string | null
  perfil: string | null
  ativo: boolean
  criado_em: string | null
  auth_user_id: string | null
  nivel_admin: number
  setor_id: string | null
  role_id: string | null
  is_master: boolean
  deleted_at: string | null
}

interface UserForm {
  nome: string
  email: string
  perfil: string
  nivel_admin: string
  setor_id: string
  password: string
}

const INITIAL_FORM_STATE: UserForm = {
  nome: '',
  email: '',
  perfil: 'operador',
  nivel_admin: '1',
  setor_id: '',
  password: '',
}

async function executeUserAdminAction(
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke(
    'erp-user-admin',
    {
      body,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.ok && !data?.success) {
    throw new Error(
      data?.error ||
        'Ação administrativa rejeitada pelo servidor.',
    )
  }

  return data
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Não informado'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Não informado'
  }

  return date.toLocaleString('pt-BR')
}

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<ERPUser[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [editing, setEditing] =
    useState<ERPUser | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] =
    useState<UserForm>(INITIAL_FORM_STATE)

  const loadUsuarios = useCallback(async () => {
    setBusy(true)
    setMsg('')

    try {
      const response =
        await executeUserAdminAction({
          action: 'list_users',
        })

      setUsers(
        Array.isArray(response.users)
          ? response.users
          : [],
      )
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : 'Falha ao sincronizar usuários.',
      )
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
      nome: user.nome || '',
      email: user.email || '',
      perfil: user.perfil || 'operador',
      nivel_admin: String(
        user.nivel_admin ?? 1,
      ),
      setor_id: user.setor_id || '',
      password: '',
    })

    setMsg('')
    setShowModal(true)
  }

  const handleSaveUsuario = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const nome = form.nome.trim()
    const email = form.email.trim().toLowerCase()
    const nivel = Number(form.nivel_admin)

    if (!nome) {
      setMsg('Informe o nome do usuário.')
      return
    }

    if (!email || !email.includes('@')) {
      setMsg('Informe um e-mail válido.')
      return
    }

    if (
      !Number.isInteger(nivel) ||
      nivel < 1 ||
      nivel > 99
    ) {
      setMsg('Nível administrativo inválido.')
      return
    }

    setBusy(true)
    setMsg('')

    try {
      if (editing) {
        await executeUserAdminAction({
          action: 'update_user',
          user_id: editing.id,
          nome,
          email,
          perfil: form.perfil,
          nivel_admin: nivel,
          setor_id: form.setor_id || null,
        })

        setMsg(
          'Usuário atualizado com sucesso.',
        )
      } else {
        if (form.password.length < 8) {
          throw new Error(
            'A senha inicial deve conter no mínimo 8 caracteres.',
          )
        }

        await executeUserAdminAction({
          action: 'create_user',
          nome,
          email,
          perfil: form.perfil,
          nivel_admin: nivel,
          setor_id: form.setor_id || null,
          password: form.password,
        })

        setMsg(
          'Usuário criado no ERP e no Supabase Auth.',
        )
      }

      setShowModal(false)
      setForm(INITIAL_FORM_STATE)

      await loadUsuarios()
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar usuário.',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleToggleStatus = async (
    user: ERPUser,
  ) => {
    if (user.is_master) {
      setMsg(
        'O usuário Master não pode ser bloqueado por esta tela.',
      )
      return
    }

    setBusy(true)
    setMsg('')

    try {
      await executeUserAdminAction({
        action: 'update_user',
        user_id: user.id,
        ativo: !user.ativo,
      })

      await loadUsuarios()
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar o status.',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveUsuario = async (
    user: ERPUser,
  ) => {
    if (user.is_master) {
      setMsg(
        'O usuário Master não pode ser excluído.',
      )
      return
    }

    if (
      !window.confirm(
        `Deseja arquivar o usuário ${user.nome}? O registro será preservado para auditoria.`,
      )
    ) {
      return
    }

    setBusy(true)
    setMsg('')

    try {
      await executeUserAdminAction({
        action: 'delete_user',
        user_id: user.id,
      })

      setMsg(
        'Usuário arquivado com soft delete.',
      )

      await loadUsuarios()
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : 'Falha ao arquivar usuário.',
      )
    } finally {
      setBusy(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const search = query
      .toLowerCase()
      .trim()

    if (!search) {
      return users
    }

    return users.filter((user) => {
      return (
        user.nome
          .toLowerCase()
          .includes(search) ||
        (user.email || '')
          .toLowerCase()
          .includes(search) ||
        (user.perfil || '')
          .toLowerCase()
          .includes(search)
      )
    })
  }, [users, query])

  return (
    <div className="users-admin min-h-full p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            Segurança corporativa
          </span>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Usuários e Permissões
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Controle de acesso por empresa, perfil,
            setor e Supabase Auth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadUsuarios()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={
                busy ? 'animate-spin' : ''
              }
            />

            Sincronizar
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Plus size={15} />
            Adicionar usuário
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="flex w-full sm:max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Search
            size={16}
            className="text-slate-400"
          />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Buscar por nome, e-mail ou perfil..."
            className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none"
          />
        </label>

        <span className="text-xs font-bold text-slate-400">
          {filteredUsers.length} registro(s)
        </span>
      </div>

      {msg && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user) => (
          <article
            key={user.id}
            className={`flex flex-col justify-between rounded-[22px] border p-5 shadow-sm transition-shadow hover:shadow-md ${
              user.ativo && !user.deleted_at
                ? 'border-slate-200 bg-white'
                : 'border-dashed border-red-200 bg-red-50/30'
            }`}
          >
            <div>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-800">
                    {(user.nome || '?')
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-black text-slate-900">
                      {user.nome}
                    </strong>

                    <span className="block truncate text-[11px] text-slate-400">
                      {user.email ||
                        'Sem e-mail'}
                    </span>
                  </div>
                </div>

                <b
                  className={`shrink-0 rounded border px-2 py-0.5 text-[9px] font-black uppercase ${
                    user.ativo &&
                    !user.deleted_at
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {user.ativo &&
                  !user.deleted_at
                    ? 'Ativo'
                    : 'Bloqueado'}
                </b>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-2">
                  <ShieldCheck
                    size={14}
                    className="text-emerald-600"
                  />
                  Nível: {user.nivel_admin}
                </span>

                <span className="flex items-center gap-2">
                  <Lock
                    size={14}
                    className="text-slate-400"
                  />
                  Perfil:{' '}
                  {user.perfil ||
                    'não definido'}
                </span>

                <span className="flex items-center gap-2">
                  <UserCheck
                    size={14}
                    className="text-slate-400"
                  />
                  {user.is_master
                    ? 'Master'
                    : user.auth_user_id
                      ? 'Auth vinculado'
                      : 'Auth não vinculado'}
                </span>

                <span className="block text-[10px] text-slate-400">
                  Cadastro:{' '}
                  {formatDate(
                    user.criado_em,
                  )}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() =>
                  handleOpenEdit(user)
                }
                disabled={busy}
                className="rounded-xl border border-slate-200 bg-white p-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Edit3
                  size={13}
                  className="mr-1 inline"
                />
                Editar
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleToggleStatus(
                    user,
                  )
                }
                disabled={
                  busy || user.is_master
                }
                className="rounded-xl border border-slate-200 bg-white p-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {user.ativo ? (
                  <UserX
                    size={13}
                    className="mr-1 inline"
                  />
                ) : (
                  <UserCheck
                    size={13}
                    className="mr-1 inline"
                  />
                )}

                {user.ativo
                  ? 'Bloquear'
                  : 'Ativar'}
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleRemoveUsuario(
                    user,
                  )
                }
                disabled={
                  busy ||
                  user.is_master ||
                  Boolean(user.deleted_at)
                }
                className="rounded-xl border border-red-200 bg-white p-2 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2
                  size={13}
                  className="mr-1 inline"
                />
                Arquivar
              </button>
            </div>
          </article>
        ))}
      </div>

      {filteredUsers.length === 0 &&
        !busy && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-400">
            Nenhum usuário encontrado.
          </div>
        )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveUsuario}
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  Cadastro seguro
                </span>

                <h3 className="mt-1 text-xl font-black text-slate-900">
                  {editing
                    ? 'Editar usuário'
                    : 'Novo usuário'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                className="rounded-xl px-3 py-2 text-sm font-black text-slate-400 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-[11px] font-black text-slate-600">
                  Nome
                </span>

                <input
                  required
                  value={form.nome}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      nome: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-[11px] font-black text-slate-600">
                  E-mail
                </span>

                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      email:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </label>

              <label>
                <span className="mb-1 block text-[11px] font-black text-slate-600">
                  Perfil
                </span>

                <select
                  value={form.perfil}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      perfil:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
                >
                  <option value="admin">
                    ADMIN
                  </option>

                  <option value="gerente">
                    MANAGER
                  </option>

                  <option value="supervisor">
                    SUPERVISOR
                  </option>

                  <option value="operador">
                    OPERATOR
                  </option>

                  <option value="visualizador">
                    VIEWER
                  </option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[11px] font-black text-slate-600">
                  Nível administrativo
                </span>

                <input
                  min="1"
                  max="99"
                  type="number"
                  value={form.nivel_admin}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      nivel_admin:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-[11px] font-black text-slate-600">
                  ID do setor (opcional)
                </span>

                <input
                  value={form.setor_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      setor_id:
                        event.target.value,
                    }))
                  }
                  placeholder="UUID do setor"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono outline-none"
                />
              </label>

              {!editing && (
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-black text-slate-600">
                    Senha inicial
                  </span>

                  <input
                    required
                    minLength={8}
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        password:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </label>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {busy
                  ? 'Salvando...'
                  : editing
                    ? 'Salvar alterações'
                    : 'Criar usuário'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
