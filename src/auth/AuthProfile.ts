export type EmpresaERPAuth = {
  id: string;
  ativo: boolean;
};

export type AuthProfile =
  | {
      id: string;
      auth_user_id: string;
      email: string;
      perfil: 'MASTER';
      nivel_admin: 9;
      ativo: true;
      empresa_id: null;
      empresa: null;
      isMaster: true;
    }
  | {
      id: string;
      auth_user_id: string;
      email: string;
      perfil: string;
      nivel_admin: number;
      ativo: true;
      empresa_id: string;
      empresa: EmpresaERPAuth;
      isMaster: false;
    };

export type ERPProfile = AuthProfile;

export type DbERPUsuario = {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  empresa_id: string | null;
  perfil: string | null;
  nivel_admin: number | null;
  is_master: boolean | null;
  ativo: boolean | null;
  deleted_at: string | null;
  setor_id?: string | null;
};

export function narrowERPProfile(user: DbERPUsuario, empresa: EmpresaERPAuth | null): AuthProfile {
  if (user.ativo !== true) throw new Error('ERP_USUARIO_INATIVO');
  if (!user.auth_user_id) throw new Error('ERP_USUARIO_SEM_AUTH_ID');

  const perfil = String(user.perfil ?? '').trim().toUpperCase();
  const nivel = Number(user.nivel_admin ?? 0);
  const email = String(user.email ?? '').trim();

  const isStrictMaster =
    user.is_master === true &&
    perfil === 'MASTER' &&
    nivel === 100 &&
    user.empresa_id === null &&
    (user.setor_id === null || user.setor_id === undefined);

  if (isStrictMaster) {
    return {
      id: user.id,
      auth_user_id: user.auth_user_id,
      email,
      perfil: 'MASTER',
      nivel_admin: 9,
      ativo: true,
      empresa_id: null,
      empresa: null,
      isMaster: true,
    };
  }

  if (user.is_master === true || perfil === 'MASTER' || nivel === 100) {
    throw new Error('ERP_IDENTIDADE_MASTER_INCONSISTENTE');
  }

  if (!user.empresa_id) throw new Error('ERP_USUARIO_SEM_EMPRESA');
  if (!empresa || empresa.ativo !== true) throw new Error('ERP_EMPRESA_INATIVA_OU_AUSENTE');

  return {
    id: user.id,
    auth_user_id: user.auth_user_id,
    email,
    perfil,
    nivel_admin: nivel,
    ativo: true,
    empresa_id: user.empresa_id,
    empresa,
    isMaster: false,
  };
}
