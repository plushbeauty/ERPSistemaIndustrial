import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface ERPUser {
  id: string;
  empresa_id: string | null;
  auth_user_id: string | null;
  nome: string;
  email: string | null;
  nivel_admin: number;
  ativo: boolean;
  setor_id: string | null;
  cargo_id: string | null;
  matricula: string | null;
  login_nome: string | null;
}

interface UserForm {
  nome: string;
  email: string;
  nivel_admin: string;
  setor_id: string;
  cargo_id: string;
  matricula: string;
  login_nome: string;
  password: string;
}

const INITIAL_FORM: UserForm = {
  nome: "",
  email: "",
  nivel_admin: "1",
  setor_id: "",
  cargo_id: "",
  matricula: "",
  login_nome: "",
  password: "",
};

async function executeAdmin(
  body: Record<string, unknown>,
) {
  const {
    data,
    error,
  } = await supabase.functions.invoke(
    "erp-user-admin",
    {
      body,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (
    !data?.ok
  ) {
    throw new Error(
      data?.error ??
        "Operação administrativa recusada.",
    );
  }

  return data;
}

function formatDate(value: unknown) {
  if (!value) {
    return "Não informado";
  }

  const date =
    new Date(String(value));

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Não informado";
  }

  return date.toLocaleString(
    "pt-BR",
  );
}

export default function UsuariosAdmin() {
  const [
    users,
    setUsers,
  ] = useState<ERPUser[]>([]);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    editing,
    setEditing,
  ] = useState<ERPUser | null>(
    null,
  );

  const [
    modal,
    setModal,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<UserForm>(
    INITIAL_FORM,
  );

  const loadUsers =
    useCallback(
      async () => {
        setBusy(true);
        setMessage("");

        try {
          const response =
            await executeAdmin({
              action:
                "list_users",
            });

          setUsers(
            Array.isArray(
              response.users,
            )
              ? response.users
              : [],
          );
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Erro ao carregar usuários.",
          );
        } finally {
          setBusy(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      if (!search) {
        return users;
      }

      return users.filter(
        (user) =>
          user.nome
            .toLowerCase()
            .includes(search) ||
          String(
            user.email ?? "",
          )
            .toLowerCase()
            .includes(search) ||
          String(
            user.login_nome ??
              "",
          )
            .toLowerCase()
            .includes(search),
      );
    }, [users, query]);

  function openCreate() {
    setEditing(null);
    setForm(INITIAL_FORM);
    setMessage("");
    setModal(true);
  }

  function openEdit(
    user: ERPUser,
  ) {
    setEditing(user);

    setForm({
      nome:
        user.nome ?? "",
      email:
        user.email ?? "",
      nivel_admin:
        String(
          user.nivel_admin ??
            1,
        ),
      setor_id:
        user.setor_id ?? "",
      cargo_id:
        user.cargo_id ?? "",
      matricula:
        user.matricula ?? "",
      login_nome:
        user.login_nome ?? "",
      password: "",
    });

    setMessage("");
    setModal(true);
  }

  async function saveUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nome =
      form.nome.trim();

    const email =
      form.email
        .trim()
        .toLowerCase();

    const nivel =
      Number(
        form.nivel_admin,
      );

    if (!nome) {
      setMessage(
        "Informe o nome.",
      );
      return;
    }

    if (
      !email ||
      !email.includes("@")
    ) {
      setMessage(
        "Informe um e-mail válido.",
      );
      return;
    }

    if (
      !Number.isInteger(
        nivel,
      ) ||
      nivel < 1 ||
      nivel > 10
    ) {
      setMessage(
        "Nível administrativo inválido.",
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      if (editing) {
        await executeAdmin({
          action:
            "update_user",
          user_id:
            editing.id,
          nome,
          email,
          nivel_admin:
            nivel,
          setor_id:
            form.setor_id ||
            null,
          cargo_id:
            form.cargo_id ||
            null,
          matricula:
            form.matricula ||
            null,
          login_nome:
            form.login_nome ||
            null,
          ...(form.password
            ? {
                password:
                  form.password,
              }
            : {}),
        });

        setMessage(
          "Usuário atualizado.",
        );
      } else {
        if (
          form.password.length <
          8
        ) {
          setMessage(
            "A senha inicial precisa ter pelo menos 8 caracteres.",
          );
          setBusy(false);
          return;
        }

        await executeAdmin({
          action:
            "create_user",
          nome,
          email,
          password:
            form.password,
          nivel_admin:
            nivel,
          setor_id:
            form.setor_id ||
            null,
          cargo_id:
            form.cargo_id ||
            null,
          matricula:
            form.matricula ||
            null,
          login_nome:
            form.login_nome ||
            null,
        });

        setMessage(
          "Usuário criado no Auth e no ERP.",
        );
      }

      setModal(false);
      setForm(INITIAL_FORM);

      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao salvar usuário.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleUser(
    user: ERPUser,
  ) {
    if (
      !user.ativo
    ) {
      setBusy(true);

      try {
        await executeAdmin({
          action:
            "update_user",
          user_id:
            user.id,
          ativo: true,
        });

        await loadUsers();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Erro ao ativar usuário.",
        );
      } finally {
        setBusy(false);
      }

      return;
    }

    if (
      !window.confirm(
        `Bloquear ${user.nome}?`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      await executeAdmin({
        action:
          "update_user",
        user_id:
          user.id,
        ativo: false,
      });

      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao bloquear usuário.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archiveUser(
    user: ERPUser,
  ) {
    if (
      !window.confirm(
        `Arquivar ${user.nome}? O registro permanecerá preservado.`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      await executeAdmin({
        action:
          "delete_user",
        user_id:
          user.id,
      });

      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao arquivar usuário.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
              Segurança corporativa
            </span>

            <h1 className="mt-1 text-2xl font-black text-slate-900">
              Usuários e Permissões
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Administração real de usuários,
              Auth, empresa e níveis de acesso.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void loadUsers()
              }
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  busy
                    ? "animate-spin"
                    : ""
                }
              />
              Atualizar
            </button>

            <button
              type="button"
              onClick={openCreate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              <Plus size={15} />
              Novo usuário
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex max-w-xl flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search
              size={16}
              className="text-slate-400"
            />

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Buscar usuário..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <strong className="text-xs text-slate-500">
            {filteredUsers.length} usuário(s)
          </strong>
        </div>

        {message && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map(
            (user) => (
              <article
                key={user.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-black text-emerald-800">
                      {user.nome
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-black text-slate-900">
                        {user.nome}
                      </h2>

                      <p className="truncate text-xs text-slate-500">
                        {user.email ??
                          "Sem e-mail"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                      user.ativo
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {user.ativo
                      ? "Ativo"
                      : "Bloqueado"}
                  </span>
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      size={14}
                    />
                    Nível{" "}
                    {user.nivel_admin}
                  </div>

                  <div className="flex items-center gap-2">
                    <Lock
                      size={14}
                    />
                    {user.auth_user_id
                      ? "Auth vinculado"
                      : "Auth não vinculado"}
                  </div>

                  <div className="flex items-center gap-2">
                    {user.ativo ? (
                      <UserCheck
                        size={14}
                      />
                    ) : (
                      <UserX
                        size={14}
                      />
                    )}

                    {user.login_nome ||
                      "Login não informado"}
                  </div>

                  <div>
                    Matrícula:{" "}
                    {user.matricula ||
                      "—"}
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openEdit(
                        user,
                      )
                    }
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <Edit3
                      size={14}
                      className="mr-1 inline"
                    />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void toggleUser(
                        user,
                      )
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                  >
                    {user.ativo
                      ? "Bloquear"
                      : "Ativar"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void archiveUser(
                        user,
                      )
                    }
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                  >
                    <Trash2
                      size={14}
                    />
                  </button>
                </div>

                <p className="mt-3 text-[10px] text-slate-400">
                  ID: {user.id}
                </p>
              </article>
            ),
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editing
                    ? "Editar usuário"
                    : "Novo usuário"}
                </h2>

                <p className="text-xs text-slate-500">
                  Dados administrativos e vínculo com Auth.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(false)
                }
                className="text-sm font-bold text-slate-400"
              >
                Fechar
              </button>
            </div>

            <form
              onSubmit={saveUser}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  Nome
                </span>

                <input
                  value={form.nome}
                  onChange={(event) =>
                    setForm(
                      (old) => ({
                        ...old,
                        nome:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  E-mail
                </span>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm(
                      (old) => ({
                        ...old,
                        email:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  Login
                </span>

                <input
                  value={form.login_nome}
                  onChange={(event) =>
                    setForm(
                      (old) => ({
                        ...old,
                        login_nome:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  Nível administrativo
                </span>

                <select
                  value={
                    form.nivel_admin
                  }
                  onChange={(event) =>
                    setForm(
                      (old) => ({
                        ...old,
                        nivel_admin:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="1">
                    1 — Visualização/operação básica
                  </option>
                  <option value="2">
                    2 — Operador
                  </option>
                  <option value="3">
                    3 — Financeiro/Fiscal
                  </option>
                  <option value="4">
                    4 — Supervisor
                  </option>
                  <option value="5">
                    5 — Gestão
                  </option>
                  <option value="6">
                    6 — Gestão avançada
                  </option>
                  <option value="7">
                    7 — Administrador
                  </option>
                  <option value="8">
                    8 — Administrador avançado
                  </option>
                  <option value="9">
                    9 — Master operacional
                  </option>
                  <option value="10">
                    10 — Master
                  </option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  Setor ID
                </span>

                <input
                  value={form.setor_id}
                  onChange={(event) =>
                    setForm(
                      (old) => ({
                        ...old,
                        setor_id:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="UUID do setor"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  Cargo ID
                </span>

                <input
                  value={form.cargo_id}
                  onChange={(event) =>
                    setForm(
                      (old) => ({
                        ...old,
                        cargo_id:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="UUID do cargo"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  Matrícula
                </span>

                <input
                  value={form.matricula}
                  onChange={(event) =>
                    setForm(
                      (old) => ({
                        ...old,
                        matricula:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-600">
                  {editing
                    ? "Nova senha — opcional"
                    : "Senha inicial"}
                </span>

                <input
                  type="password"
                  value={
                    form.password
                  }
                  onChange={(event) =>
                    setForm(
                      (old) => ({
                        ...old,
                        password:
                          event.target
                            .value,
                      }),
                    )
                  }
                  minLength={8}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>

              <div className="flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() =>
                    setModal(false)
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busy
                    ? "Salvando..."
                    : editing
                      ? "Salvar alterações"
                      : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
