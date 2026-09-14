import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Edit3,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Role = {
  id: string;
  codigo: string;
  nome: string;
  nivel: number;
  ativo: boolean;
};

type Setor = {
  id: string;
  empresa_id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

type Empresa = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  codigo: string | null;
  ativo: boolean;
  plano: string | null;
  plano_status: string | null;
  subscription_status: string | null;
};

type ERPUser = {
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
  role_id: string | null;
  deleted_at: string | null;
  updated_at: string | null;
  created_at: string | null;

  role?: {
    id?: string;
    codigo?: string;
    nome?: string;
    nivel?: number;
  } | null;

  setor?: {
    id?: string;
    codigo?: string;
    nome?: string;
  } | null;

  empresa?: {
    id?: string;
    nome_fantasia?: string | null;
    razao_social?: string | null;
    codigo?: string | null;
  } | null;
};

type Actor = {
  id: string;
  empresa_id: string | null;
  auth_user_id: string | null;
  nome: string;
  nivel_admin: number;
  ativo: boolean;
  role_id: string | null;
  is_master: boolean;
};

type UserForm = {
  nome: string;
  email: string;
  password: string;
  nivel_admin: string;
  role_id: string;
  empresa_id: string;
  setor_id: string;
  cargo_id: string;
  matricula: string;
  login_nome: string;
};

const INITIAL_FORM: UserForm = {
  nome: "",
  email: "",
  password: "",
  nivel_admin: "1",
  role_id: "",
  empresa_id: "",
  setor_id: "",
  cargo_id: "",
  matricula: "",
  login_nome: "",
};

const ROLE_LEVELS: Record<string, number> = {
  VIEWER: 1,
  OPERATOR: 3,
  SUPERVISOR: 5,
  MANAGER: 7,
  ADMIN: 9,
  MASTER: 10,
};

function normalizeRoleCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function roleLabel(code: string | null | undefined): string {
  switch (normalizeRoleCode(code)) {
    case "MASTER":
      return "Master";
    case "ADMIN":
      return "Administrador";
    case "MANAGER":
      return "Gestor";
    case "SUPERVISOR":
      return "Supervisor";
    case "OPERATOR":
      return "Operador";
    case "VIEWER":
      return "Visualizador";
    default:
      return "Sem perfil";
  }
}

function formatDate(value: unknown): string {
  if (!value) {
    return "Não informado";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "Não informado";
  }

  return date.toLocaleString("pt-BR");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message ?? "Erro desconhecido.",
    );
  }

  return "Erro desconhecido.";
}

async function executeAdmin(
  body: Record<string, unknown>,
): Promise<Record<string, any>> {
  const { data, error } = await supabase.functions.invoke(
    "erp-user-admin",
    {
      body,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error(
      data?.error ??
        data?.message ??
        "Operação administrativa recusada.",
    );
  }

  return data as Record<string, any>;
}

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<ERPUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const [actor, setActor] = useState<Actor | null>(null);

  const [query, setQuery] = useState("");

  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  const [editing, setEditing] = useState<ERPUser | null>(null);

  const [modal, setModal] = useState(false);

  const [form, setForm] = useState<UserForm>(INITIAL_FORM);

  const [showPassword, setShowPassword] = useState(false);

  const [companyFilter, setCompanyFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [sectorFilter, setSectorFilter] = useState("");

  const selectedCompanyId =
    form.empresa_id || actor?.empresa_id || "";

  const isMaster = Boolean(
    actor?.is_master || actor?.nivel_admin >= 10,
  );

  const availableRoles = useMemo(() => {
    return roles
      .filter((role) => role.ativo)
      .filter((role) => {
        if (isMaster) {
          return true;
        }

        return role.nivel < 9;
      })
      .sort((a, b) => b.nivel - a.nivel);
  }, [roles, isMaster]);

  const availableSectors = useMemo(() => {
    if (!selectedCompanyId) {
      return [];
    }

    return setores
      .filter(
        (sector) =>
          sector.ativo &&
          sector.empresa_id === selectedCompanyId,
      )
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      );
  }, [setores, selectedCompanyId]);

  const loadActor = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.user?.id) {
      throw new Error(
        "Sessão não encontrada. Faça login novamente.",
      );
    }

    const { data, error } = await supabase
      .from("erp_usuarios")
      .select(
        [
          "id",
          "empresa_id",
          "auth_user_id",
          "nome",
          "nivel_admin",
          "ativo",
          "role_id",
          "deleted_at",
        ].join(","),
      )
      .eq("auth_user_id", session.user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Usuário autenticado não está vinculado ao ERP.",
      );
    }

    const nextActor: Actor = {
      id: String(data.id),
      empresa_id: data.empresa_id ?? null,
      auth_user_id: data.auth_user_id ?? null,
      nome: String(data.nome ?? ""),
      nivel_admin: Number(data.nivel_admin ?? 1),
      ativo: Boolean(data.ativo),
      role_id: data.role_id ?? null,
      is_master: Number(data.nivel_admin ?? 0) >= 10,
    };

    if (!nextActor.ativo) {
      throw new Error(
        "Seu usuário está inativo.",
      );
    }

    setActor(nextActor);

    return nextActor;
  }, []);

  const loadReferenceData = useCallback(
    async (currentActor: Actor) => {
      const roleResult = await supabase
        .from("erp_roles")
        .select("id,codigo,nome,nivel,ativo")
        .eq("ativo", true)
        .order("nivel", {
          ascending: false,
        });

      if (roleResult.error) {
        throw roleResult.error;
      }

      setRoles(
        Array.isArray(roleResult.data)
          ? (roleResult.data as Role[])
          : [],
      );

      const sectorQuery = supabase
        .from("erp_setores")
        .select(
          "id,empresa_id,codigo,nome,ativo",
        )
        .eq("ativo", true)
        .order("nome", {
          ascending: true,
        });

      const sectorResult =
        currentActor.is_master ||
        currentActor.nivel_admin >= 10
          ? await sectorQuery
          : await sectorQuery.eq(
              "empresa_id",
              currentActor.empresa_id,
            );

      if (sectorResult.error) {
        throw sectorResult.error;
      }

      setSetores(
        Array.isArray(sectorResult.data)
          ? (sectorResult.data as Setor[])
          : [],
      );

      const companyQuery = supabase
        .from("erp_empresas")
        .select(
          [
            "id",
            "razao_social",
            "nome_fantasia",
            "codigo",
            "ativo",
            "plano",
            "plano_status",
            "subscription_status",
          ].join(","),
        )
        .order("nome_fantasia", {
          ascending: true,
        });

      const companyResult =
        currentActor.is_master ||
        currentActor.nivel_admin >= 10
          ? await companyQuery
          : await companyQuery.eq(
              "id",
              currentActor.empresa_id,
            );

      if (companyResult.error) {
        throw companyResult.error;
      }

      setEmpresas(
        Array.isArray(companyResult.data)
          ? (companyResult.data as Empresa[])
          : [],
      );
    },
    [],
  );

  const loadUsers = useCallback(async () => {
    setBusy(true);
    setMessage("");

    try {
      const response = await executeAdmin({
        action: "list_users",
        empresa_id:
          isMaster && companyFilter
            ? companyFilter
            : undefined,
        include_deleted: false,
      });

      const nextUsers = Array.isArray(response.users)
        ? (response.users as ERPUser[])
        : [];

      setUsers(nextUsers);
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(error) ||
          "Erro ao carregar usuários.",
      );
    } finally {
      setBusy(false);
    }
  }, [companyFilter, isMaster]);

  const loadAll = useCallback(async () => {
    setBusy(true);
    setMessage("");

    try {
      const currentActor = await loadActor();

      await loadReferenceData(currentActor);

      const response = await executeAdmin({
        action: "list_users",
        include_deleted: false,
      });

      setUsers(
        Array.isArray(response.users)
          ? (response.users as ERPUser[])
          : [],
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(error) ||
          "Erro ao carregar dados administrativos.",
      );
    } finally {
      setBusy(false);
    }
  }, [loadActor, loadReferenceData]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!form.empresa_id && actor?.empresa_id) {
      setForm((current) => ({
        ...current,
        empresa_id: actor.empresa_id ?? "",
      }));
    }
  }, [actor, form.empresa_id]);

  useEffect(() => {
    if (
      form.setor_id &&
      !availableSectors.some(
        (sector) => sector.id === form.setor_id,
      )
    ) {
      setForm((current) => ({
        ...current,
        setor_id: "",
      }));
    }
  }, [availableSectors, form.setor_id]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = query
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          user.nome,
          user.email,
          user.login_nome,
          user.matricula,
          user.role?.nome,
          user.role?.codigo,
          user.setor?.nome,
          user.empresa?.nome_fantasia,
          user.empresa?.razao_social,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(normalizedSearch),
          );

      const matchesCompany =
        !companyFilter ||
        user.empresa_id === companyFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          user.ativo &&
          !user.deleted_at) ||
        (statusFilter === "inactive" &&
          (!user.ativo || Boolean(user.deleted_at)));

      const matchesSector =
        !sectorFilter ||
        user.setor_id === sectorFilter;

      return (
        matchesSearch &&
        matchesCompany &&
        matchesStatus &&
        matchesSector
      );
    });
  }, [
    users,
    query,
    companyFilter,
    statusFilter,
    sectorFilter,
  ]);

  function setField<K extends keyof UserForm>(
    field: K,
    value: UserForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreate() {
    const defaultCompany =
      isMaster
        ? ""
        : actor?.empresa_id ?? "";

    const defaultRole =
      availableRoles.find(
        (role) => role.codigo === "VIEWER",
      ) ??
      availableRoles[
        availableRoles.length - 1
      ];

    setEditing(null);

    setForm({
      ...INITIAL_FORM,
      empresa_id: defaultCompany,
      role_id: defaultRole?.id ?? "",
      nivel_admin:
        String(
          defaultRole?.nivel ??
            ROLE_LEVELS.VIEWER,
        ),
    });

    setShowPassword(false);
    setMessage("");
    setModal(true);
  }

  function openEdit(user: ERPUser) {
    setEditing(user);

    const matchedRole =
      roles.find(
        (role) => role.id === user.role_id,
      ) ??
      roles.find(
        (role) =>
          role.nivel ===
          Number(user.nivel_admin ?? 1),
      );

    setForm({
      nome: user.nome ?? "",
      email: user.email ?? "",
      password: "",
      nivel_admin: String(
        matchedRole?.nivel ??
          user.nivel_admin ??
          1,
      ),
      role_id:
        user.role_id ??
        matchedRole?.id ??
        "",
      empresa_id:
        user.empresa_id ?? "",
      setor_id:
        user.setor_id ?? "",
      cargo_id:
        user.cargo_id ?? "",
      matricula:
        user.matricula ?? "",
      login_nome:
        user.login_nome ?? "",
    });

    setShowPassword(false);
    setMessage("");
    setModal(true);
  }

  function handleRoleChange(roleId: string) {
    const role = roles.find(
      (item) => item.id === roleId,
    );

    setForm((current) => ({
      ...current,
      role_id: roleId,
      nivel_admin: String(
        role?.nivel ??
          current.nivel_admin,
      ),
    }));
  }

  function handleCompanyChange(
    companyId: string,
  ) {
    setForm((current) => ({
      ...current,
      empresa_id: companyId,
      setor_id: "",
    }));
  }

  function validateForm(): string | null {
    const nome = form.nome.trim();

    const email = form.email
      .trim()
      .toLowerCase();

    if (!nome) {
      return "Informe o nome do usuário.";
    }

    if (
      !email ||
      !email.includes("@") ||
      !email.includes(".")
    ) {
      return "Informe um e-mail válido.";
    }

    if (!form.empresa_id) {
      return "Selecione a empresa do usuário.";
    }

    if (!form.role_id) {
      return "Selecione o perfil de acesso.";
    }

    const selectedRole = roles.find(
      (role) =>
        role.id === form.role_id,
    );

    if (!selectedRole) {
      return "O perfil selecionado não existe.";
    }

    if (
      !isMaster &&
      selectedRole.nivel >= 9
    ) {
      return "Seu nível não permite criar ou promover outro administrador.";
    }

    if (
      !isMaster &&
      form.empresa_id !==
        actor?.empresa_id
    ) {
      return "Você não pode vincular o usuário a outra empresa.";
    }

    if (
      !editing &&
      form.password.length < 8
    ) {
      return "A senha inicial precisa ter pelo menos 8 caracteres.";
    }

    if (
      editing &&
      form.password &&
      form.password.length < 8
    ) {
      return "A nova senha precisa ter pelo menos 8 caracteres.";
    }

    return null;
  }

  async function saveUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setMessageType("error");
      setMessage(validationError);
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const payload: Record<
        string,
        unknown
      > = {
        nome: form.nome.trim(),
        email: form.email
          .trim()
          .toLowerCase(),
        role_id:
          form.role_id || null,
        nivel_admin: Number(
          form.nivel_admin,
        ),
        empresa_id:
          form.empresa_id || null,
        setor_id:
          form.setor_id || null,
        cargo_id:
          form.cargo_id || null,
        matricula:
          form.matricula.trim() || null,
        login_nome:
          form.login_nome
            .trim()
            .toLowerCase() || null,
      };

      if (form.password) {
        payload.password =
          form.password;
      }

      if (editing) {
        await executeAdmin({
          action: "update_user",
          user_id: editing.id,
          ...payload,
        });

        setMessageType("success");
        setMessage(
          "Usuário atualizado com sucesso no ERP e no Supabase Auth.",
        );
      } else {
        await executeAdmin({
          action: "create_user",
          ...payload,
        });

        setMessageType("success");
        setMessage(
          "Usuário criado com vínculo entre Supabase Auth e ERP.",
        );
      }

      setModal(false);
      setEditing(null);
      setForm(INITIAL_FORM);
      setShowPassword(false);

      await loadAll();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(error) ||
          "Não foi possível salvar o usuário.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleUser(
    user: ERPUser,
  ) {
    if (
      user.id === actor?.id
    ) {
      setMessageType("error");
      setMessage(
        "O próprio usuário Master não pode ser bloqueado por esta tela.",
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await executeAdmin({
        action: "update_user",
        user_id: user.id,
        ativo: !user.ativo,
      });

      setMessageType("success");
      setMessage(
        user.ativo
          ? `Usuário ${user.nome} bloqueado.`
          : `Usuário ${user.nome} ativado.`,
      );

      await loadAll();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(error) ||
          "Erro ao alterar o status.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archiveUser(
    user: ERPUser,
  ) {
    if (
      user.id === actor?.id
    ) {
      setMessageType("error");
      setMessage(
        "O próprio usuário Master nunca pode ser excluído.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Deseja fazer a exclusão lógica de "${user.nome}"?\n\nO usuário será desativado e preservado no histórico de auditoria.`,
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await executeAdmin({
        action: "delete_user",
        user_id: user.id,
      });

      setMessageType("success");
      setMessage(
        `Usuário ${user.nome} arquivado por exclusão lógica.`,
      );

      await loadAll();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(error) ||
          "Erro ao arquivar usuário.",
      );
    } finally {
      setBusy(false);
    }
  }

  const activeCount = users.filter(
    (user) =>
      user.ativo &&
      !user.deleted_at,
  ).length;

  const inactiveCount =
    users.length - activeCount;

  return (
    <section className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  Segurança e RBAC
                </span>

                {isMaster && (
                  <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    MASTER
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                Usuários e Permissões
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Administração multiempresa com
                Supabase Auth, perfis RBAC,
                setores, vínculo empresarial e
                exclusão lógica.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void loadAll()
                }
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                Novo usuário
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total
            </span>
            <div className="mt-1 text-2xl font-black text-slate-950">
              {users.length}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
              Usuários ativos
            </span>
            <div className="mt-1 text-2xl font-black text-emerald-900">
              {activeCount}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Inativos
            </span>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {inactiveCount}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(250px,1fr)_220px_180px_180px]">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search
                size={16}
                className="shrink-0 text-slate-400"
              />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="Buscar por nome, e-mail, login, matrícula..."
                className="h-10 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>

            {isMaster ? (
              <select
                value={companyFilter}
                onChange={(event) =>
                  setCompanyFilter(
                    event.target.value,
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="">
                  Todas as empresas
                </option>

                {empresas.map(
                  (empresa) => (
                    <option
                      key={empresa.id}
                      value={empresa.id}
                    >
                      {empresa.nome_fantasia ||
                        empresa.razao_social ||
                        empresa.codigo ||
                        empresa.id}
                    </option>
                  ),
                )}
              </select>
            ) : (
              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600">
                {empresas[0]?.nome_fantasia ||
                  empresas[0]?.razao_social ||
                  "Empresa atual"}
              </div>
            )}

            <select
              value={sectorFilter}
              onChange={(event) =>
                setSectorFilter(
                  event.target.value,
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">
                Todos os setores
              </option>

              {setores
                .filter(
                  (sector) =>
                    !companyFilter ||
                    sector.empresa_id ===
                      companyFilter,
                )
                .map((sector) => (
                  <option
                    key={sector.id}
                    value={sector.id}
                  >
                    {sector.nome}
                  </option>
                ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | "all"
                    | "active"
                    | "inactive",
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">
                Todos os status
              </option>
              <option value="active">
                Ativos
              </option>
              <option value="inactive">
                Inativos
              </option>
            </select>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-2xl border p-4 text-sm font-semibold ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : messageType === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {message}
          </div>
        )}

        {busy && users.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <RefreshCw
              size={26}
              className="mx-auto animate-spin text-emerald-700"
            />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Carregando usuários...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <UserX
              size={32}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-3 font-black text-slate-800">
              Nenhum usuário encontrado
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ajuste os filtros ou cadastre
              um novo usuário.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map(
              (user) => {
                const roleCode =
                  normalizeRoleCode(
                    user.role?.codigo,
                  );

                const companyName =
                  user.empresa
                    ?.nome_fantasia ||
                  user.empresa
                    ?.razao_social ||
                  empresas.find(
                    (company) =>
                      company.id ===
                      user.empresa_id,
                  )?.nome_fantasia ||
                  "Empresa não informada";

                const sectorName =
                  user.setor?.nome ||
                  setores.find(
                    (sector) =>
                      sector.id ===
                      user.setor_id,
                  )?.nome ||
                  "Setor não informado";

                const isSelf =
                  user.id === actor?.id;

                return (
                  <article
                    key={user.id}
                    className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                          {user.nome
                            .trim()
                            .slice(0, 1)
                            .toUpperCase() ||
                            "U"}
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate font-black text-slate-950">
                            {user.nome}
                          </h2>

                          <p className="truncate text-xs text-slate-500">
                            {user.email ||
                              "E-mail não informado"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                          user.ativo &&
                          !user.deleted_at
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.ativo &&
                        !user.deleted_at
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-400">
                          Perfil
                        </span>

                        <span className="font-black text-slate-700">
                          {roleLabel(
                            roleCode ||
                              user.role
                                ?.nome,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-400">
                          Empresa
                        </span>

                        <span className="max-w-[65%] truncate text-right font-semibold text-slate-700">
                          {companyName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-400">
                          Setor
                        </span>

                        <span className="max-w-[65%] truncate text-right font-semibold text-slate-700">
                          {sectorName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-400">
                          Auth
                        </span>

                        <span className="font-semibold text-slate-700">
                          {user.auth_user_id
                            ? "Vinculado"
                            : "Pendente"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-400">
                          Última alteração
                        </span>

                        <span className="font-semibold text-slate-700">
                          {formatDate(
                            user.updated_at ||
                              user.created_at,
                          )}
                        </span>
                      </div>
                    </div>

                    {isSelf && (
                      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500">
                        Este é o seu usuário
                        administrativo.
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEdit(user)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Edit3
                          size={14}
                          className="mr-1.5 inline"
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
                        disabled={isSelf}
                        title={
                          isSelf
                            ? "O próprio usuário não pode ser bloqueado."
                            : undefined
                        }
                        className={`rounded-xl border px-3 py-2.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          user.ativo
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {user.ativo ? (
                          <UserX
                            size={14}
                          />
                        ) : (
                          <UserCheck
                            size={14}
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void archiveUser(
                            user,
                          )
                        }
                        disabled={isSelf}
                        title={
                          isSelf
                            ? "O próprio usuário não pode ser excluído."
                            : "Exclusão lógica"
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2
                          size={14}
                        />
                      </button>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 md:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      size={18}
                      className="text-emerald-700"
                    />

                    <h2 className="font-black text-slate-950">
                      {editing
                        ? "Editar usuário"
                        : "Novo usuário"}
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    O Supabase Auth é a
                    autoridade da senha.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModal(false);
                    setEditing(null);
                  }}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={saveUser}
                className="space-y-5 p-5 md:p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      Nome completo *
                    </span>

                    <input
                      value={form.nome}
                      onChange={(event) =>
                        setField(
                          "nome",
                          event.target
                            .value,
                        )
                      }
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Nome do usuário"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      E-mail *
                    </span>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setField(
                          "email",
                          event.target
                            .value,
                        )
                      }
                      required
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      placeholder="usuario@empresa.com.br"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      Login interno
                    </span>

                    <input
                      value={
                        form.login_nome
                      }
                      onChange={(event) =>
                        setField(
                          "login_nome",
                          event.target
                            .value,
                        )
                      }
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      placeholder="usuario"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      Empresa *
                    </span>

                    <select
                      value={
                        form.empresa_id
                      }
                      onChange={(event) =>
                        handleCompanyChange(
                          event.target
                            .value,
                        )
                      }
                      disabled={!isMaster}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                    >
                      <option value="">
                        Selecione...
                      </option>

                      {empresas
                        .filter(
                          (empresa) =>
                            empresa.ativo,
                        )
                        .map(
                          (empresa) => (
                            <option
                              key={
                                empresa.id
                              }
                              value={
                                empresa.id
                              }
                            >
                              {empresa.nome_fantasia ||
                                empresa.razao_social ||
                                empresa.codigo ||
                                empresa.id}
                            </option>
                          ),
                        )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      Setor
                    </span>

                    <select
                      value={
                        form.setor_id
                      }
                      onChange={(event) =>
                        setField(
                          "setor_id",
                          event.target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">
                        Sem setor
                      </option>

                      {availableSectors.map(
                        (sector) => (
                          <option
                            key={
                              sector.id
                            }
                            value={
                              sector.id
                            }
                          >
                            {sector.nome}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      Perfil de acesso *
                    </span>

                    <select
                      value={
                        form.role_id
                      }
                      onChange={(event) =>
                        handleRoleChange(
                          event.target
                            .value,
                        )
                      }
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">
                        Selecione...
                      </option>

                      {availableRoles.map(
                        (role) => (
                          <option
                            key={role.id}
                            value={role.id}
                          >
                            {role.nome}{" "}
                            — nível{" "}
                            {role.nivel}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      Matrícula
                    </span>

                    <input
                      value={
                        form.matricula
                      }
                      onChange={(event) =>
                        setField(
                          "matricula",
                          event.target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Ex.: 000123"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      Cargo / ID
                    </span>

                    <input
                      value={
                        form.cargo_id
                      }
                      onChange={(event) =>
                        setField(
                          "cargo_id",
                          event.target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      placeholder="UUID do cargo, se utilizado"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-xs font-black text-slate-700">
                      {editing
                        ? "Nova senha (opcional)"
                        : "Senha inicial *"}
                    </span>

                    <div className="relative">
                      <KeyRound
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          form.password
                        }
                        onChange={(event) =>
                          setField(
                            "password",
                            event.target
                              .value,
                          )
                        }
                        required={!editing}
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-24 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder={
                          editing
                            ? "Deixe vazio para manter a senha"
                            : "Mínimo de 8 caracteres"
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (value) =>
                              !value,
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-100"
                      >
                        {showPassword
                          ? "Ocultar"
                          : "Mostrar"}
                      </button>
                    </div>
                  </label>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="text-xs font-black text-emerald-900">
                        Segurança
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-800">
                        A senha não é gravada
                        em{" "}
                        <code>
                          erp_usuarios
                        </code>
                        . O usuário é criado
                        no Supabase Auth e
                        recebe apenas o vínculo
                        por{" "}
                        <code>
                          auth_user_id
                        </code>
                        .
                      </p>
                    </div>
                  </div>
                </div>

                {editing && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                    <strong>
                      ID do usuário:
                    </strong>{" "}
                    <code>
                      {editing.id}
                    </code>

                    <br />

                    <strong>
                      Auth:
                    </strong>{" "}
                    {editing.auth_user_id ||
                      "não vinculado"}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setModal(false);
                      setEditing(null);
                    }}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-emerald-700 px-5 py-3 text-xs font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>
    </section>
  );
}
