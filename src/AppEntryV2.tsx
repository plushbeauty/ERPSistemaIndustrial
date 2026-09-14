import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigurado } from './lib/supabaseClient';

const AppIndustrialV7 = lazy(() => import('./AppIndustrialV7'));
const PublicIndustrialHome = lazy(() => import('./pages/PublicIndustrialHome'));
const Blog = lazy(() => import('./pages/Blog'));
const Fiscal = lazy(() => import('./pages/Fiscal'));
const FiscalPrevisaoCaixa = lazy(() => import('./pages/FiscalPrevisaoCaixa'));
const Master = lazy(() => import('./pages/Master'));
const PCPIndustrial = lazy(() => import('./pages/PCPIndustrial'));
const QualidadeIndustrial = lazy(() => import('./pages/QualidadeIndustrial'));
const OperacaoIndustrial = lazy(() => import('./pages/OperacaoIndustrial'));
const ProdutosVendasIndustrial = lazy(() => import('./pages/ProdutosVendasIndustrial'));
const CadastroEmpresa = lazy(() => import('./pages/CadastroEmpresa'));
const SolicitacaoCompra = lazy(() => import('./pages/SolicitacaoCompra'));
const TesteERP = lazy(() => import('./pages/TesteERP'));
const UsuariosAdmin = lazy(() => import('./pages/UsuariosAdmin'));
const DocumentosQualidadeControle = lazy(
  () => import('./pages/DocumentosQualidadeControle')
);
const ManualUsuario = lazy(() => import('./pages/ManualUsuario'));
const VirtualGuide = lazy(() => import('./pages/VirtualGuide'));

type ERPUsuario = {
  id: string;
  empresa_id: string;
  auth_user_id: string | null;
  nome: string;
  email: string | null;
  login_nome?: string | null;
  nivel_admin: number | null;
  ativo: boolean;
  setor_id?: string | null;
  cargo_id?: string | null;
  matricula?: string | null;
};

type ERPEmpresa = {
  id: string;
  codigo?: string | null;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  ativo?: boolean | null;
  status?: string | null;
};

type AuthenticatedERP = {
  authUserId: string;
  usuario: ERPUsuario;
  empresa: ERPEmpresa;
};

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f5f4',
        color: '#16352d',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 42,
            height: 42,
            border: '4px solid #d8e1dd',
            borderTopColor: '#16856d',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'erp-spin 0.8s linear infinite',
          }}
        />
        <strong>Carregando SGQ ERP Industrial...</strong>

        <style>
          {`
            @keyframes erp-spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#f3f5f4',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 10px 35px rgba(0,0,0,.08)',
          border: '1px solid #dfe7e3',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#16352d' }}>
          Não foi possível carregar o ERP
        </h2>

        <p style={{ color: '#53615c', lineHeight: 1.6 }}>
          O sistema encontrou um problema ao carregar este ambiente.
        </p>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 10,
            background: '#fff4f2',
            color: '#8b2c20',
            fontSize: 14,
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 22,
            border: 0,
            borderRadius: 10,
            padding: '12px 20px',
            background: '#16856d',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function AuthLoading() {
  return <LoadingScreen />;
}

async function buscarUsuarioERP(
  authUserId: string
): Promise<AuthenticatedERP> {
  const { data: usuario, error: usuarioError } = await supabase
    .from('erp_usuarios')
    .select(
      `
        id,
        empresa_id,
        auth_user_id,
        nome,
        email,
        login_nome,
        nivel_admin,
        ativo,
        setor_id,
        cargo_id,
        matricula
      `
    )
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (usuarioError) {
    throw new Error(
      `Não foi possível consultar o usuário ERP: ${usuarioError.message}`
    );
  }

  if (!usuario) {
    throw new Error(
      'Seu usuário do Supabase Auth não está vinculado a um usuário do ERP.'
    );
  }

  if (!usuario.ativo) {
    throw new Error('Este usuário está inativo no ERP.');
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('erp_empresas')
    .select(
      `
        id,
        codigo,
        nome_fantasia,
        razao_social,
        ativo,
        status
      `
    )
    .eq('id', usuario.empresa_id)
    .maybeSingle();

  if (empresaError) {
    throw new Error(
      `Não foi possível consultar a empresa do usuário: ${empresaError.message}`
    );
  }

  if (!empresa) {
    throw new Error(
      'A empresa vinculada ao usuário não foi encontrada no ERP.'
    );
  }

  if (empresa.ativo === false) {
    throw new Error('A empresa vinculada ao usuário está inativa.');
  }

  return {
    authUserId,
    usuario,
    empresa,
  };
}

async function autenticarERP(
  email: string,
  password: string
): Promise<AuthenticatedERP> {
  if (!supabaseConfigurado) {
    throw new Error(
      'O Supabase não está configurado neste ambiente. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel e faça um novo deploy.'
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Informe seu e-mail.');
  }

  if (!password) {
    throw new Error('Informe sua senha.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'E-mail ou senha inválidos.'
        : error.message
    );
  }

  if (!data.user) {
    throw new Error('O Supabase não retornou o usuário autenticado.');
  }

  try {
    return await buscarUsuarioERP(data.user.id);
  } catch (error) {
    await supabase.auth.signOut();
    throw error;
  }
}

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);
    setErrorMessage('');

    try {
      /*
       * O campo empresa continua visível para o usuário,
       * mas a autenticação de identidade é feita exclusivamente
       * pelo Supabase Auth usando e-mail + senha.
       *
       * A empresa real é obtida depois pelo vínculo:
       *
       * auth.users.id
       *      ↓
       * erp_usuarios.auth_user_id
       *      ↓
       * erp_usuarios.empresa_id
       *      ↓
       * erp_empresas.id
       */
      void empresa;

      await autenticarERP(email, password);

      navigate('/erp-industrial', { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível realizar o login.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail para recuperar a senha.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/login`,
        }
      );

      if (error) {
        throw error;
      }

      setErrorMessage(
        'Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas.'
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível solicitar a recuperação.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!supabaseConfigurado) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#edf2f0',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 620,
            width: '100%',
            background: '#fff',
            borderRadius: 18,
            padding: 34,
            boxShadow: '0 15px 45px rgba(0,0,0,.08)',
          }}
        >
          <h1 style={{ color: '#16352d', marginTop: 0 }}>
            SGQ ERP INDUSTRIAL
          </h1>

          <h3>Configuração do ambiente pendente</h3>

          <p style={{ lineHeight: 1.6, color: '#596660' }}>
            O sistema está carregado, mas as credenciais públicas do Supabase
            ainda não foram disponibilizadas para este deploy.
          </p>

          <p style={{ lineHeight: 1.6, color: '#596660' }}>
            Configure na Vercel:
          </p>

          <ul style={{ lineHeight: 1.8 }}>
            <li>
              <strong>VITE_SUPABASE_URL</strong>
            </li>
            <li>
              <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong>
            </li>
          </ul>

          <p style={{ color: '#596660', fontSize: 14 }}>
            Depois faça um novo deploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(420px, .9fr)',
        background: '#10231f',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <section
        style={{
          padding: '60px 7vw',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#fff',
          background:
            'linear-gradient(135deg, #10231f 0%, #163b32 55%, #0d2923 100%)',
        }}
      >
        <div
          style={{
            maxWidth: 640,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,.15)',
              background: 'rgba(255,255,255,.06)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 24,
            }}
          >
            PORTAL SEGURO
          </div>

          <h1
            style={{
              fontSize: 'clamp(34px, 5vw, 64px)',
              lineHeight: 1.02,
              margin: 0,
              letterSpacing: -2,
            }}
          >
            O controle da fábrica em um único sistema.
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: '#c9d7d2',
              maxWidth: 560,
              marginTop: 26,
            }}
          >
            Produção, qualidade, PCP, estoque, RH, manutenção, documentos e
            gestão industrial integrados.
          </p>
        </div>
      </section>

      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          background: '#f5f7f6',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 470,
            background: '#fff',
            borderRadius: 22,
            padding: 38,
            boxShadow: '0 20px 60px rgba(0,0,0,.12)',
            border: '1px solid #e2e9e6',
          }}
        >
          <div style={{ marginBottom: 30 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.2,
                color: '#16856d',
                marginBottom: 10,
              }}
            >
              SGQ ERP INDUSTRIAL
            </div>

            <h2
              style={{
                margin: 0,
                color: '#16352d',
                fontSize: 30,
              }}
            >
              Acesse seu ERP
            </h2>

            <p style={{ color: '#68756f', lineHeight: 1.5 }}>
              Entre com seu e-mail corporativo e sua senha.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#33423d',
                marginBottom: 7,
              }}
            >
              Empresa
            </label>

            <input
              value={empresa}
              onChange={(event) => setEmpresa(event.target.value)}
              placeholder="Código ou nome da empresa"
              autoComplete="organization"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #d5dfdb',
                borderRadius: 10,
                padding: '13px 14px',
                marginBottom: 16,
                outline: 'none',
              }}
            />

            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#33423d',
                marginBottom: 7,
              }}
            >
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              autoComplete="username"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #d5dfdb',
                borderRadius: 10,
                padding: '13px 14px',
                marginBottom: 16,
                outline: 'none',
              }}
            />

            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#33423d',
                marginBottom: 7,
              }}
            >
              Senha
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #d5dfdb',
                borderRadius: 10,
                padding: '13px 14px',
                marginBottom: 18,
                outline: 'none',
              }}
            />

            {errorMessage && (
              <div
                role="alert"
                style={{
                  padding: 13,
                  borderRadius: 10,
                  background: '#fff1ef',
                  color: '#9a3024',
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginBottom: 18,
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                border: 0,
                borderRadius: 11,
                padding: '14px 18px',
                background: loading ? '#7da99d' : '#16856d',
                color: '#fff',
                fontWeight: 800,
                cursor: loading ? 'wait' : 'pointer',
                fontSize: 15,
              }}
            >
              {loading ? 'Entrando...' : 'Entrar no sistema'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleRecovery}
            disabled={loading}
            style={{
              width: '100%',
              border: 0,
              background: 'transparent',
              color: '#16856d',
              marginTop: 18,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Esqueci minha senha
          </button>

          <button
            type="button"
            onClick={() => navigate('/cadastro-empresa')}
            style={{
              width: '100%',
              border: '1px solid #d5dfdb',
              borderRadius: 11,
              padding: '13px 18px',
              background: '#fff',
              color: '#16352d',
              marginTop: 12,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Cadastrar nova empresa
          </button>

          <div
            style={{
              textAlign: 'center',
              marginTop: 24,
              fontSize: 11,
              color: '#89958f',
            }}
          >
            FernandoSch_System
          </div>
        </div>
      </section>

      <style>
        {`
          @media (max-width: 900px) {
            body {
              margin: 0;
            }
          }
        `}
      </style>
    </div>
  );
}

function ProtectedERP() {
  return <AppIndustrialV7 />;
}

function MasterRoute() {
  return <Master />;
}

function GenericLazyPage({
  Component,
}: {
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
}) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Component />
    </Suspense>
  );
}

function AppRouter() {
  const location = useLocation();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessionExists, setSessionExists] = useState(false);
  const [erpUser, setErpUser] = useState<AuthenticatedERP | null>(null);
  const [authError, setAuthError] = useState('');

  const refreshAuth = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCheckingAuth(false);
      setSessionExists(false);
      setErpUser(null);
      return;
    }

    setCheckingAuth(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      const session = data.session;

      if (!session?.user) {
        setSessionExists(false);
        setErpUser(null);
        return;
      }

      try {
        const authenticated = await buscarUsuarioERP(session.user.id);

        setSessionExists(true);
        setErpUser(authenticated);
      } catch (error) {
        await supabase.auth.signOut();

        setSessionExists(false);
        setErpUser(null);

        setAuthError(
          error instanceof Error
            ? error.message
            : 'Usuário autenticado, mas não vinculado ao ERP.'
        );
      }
    } catch (error) {
      setSessionExists(false);
      setErpUser(null);

      setAuthError(
        error instanceof Error
          ? error.message
          : 'Não foi possível verificar a sessão.'
      );
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();

    if (!supabaseConfigurado) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await refreshAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAuth]);

  if (checkingAuth) {
    return <AuthLoading />;
  }

  if (location.pathname === '/login') {
    if (sessionExists) {
      return <Navigate to="/erp-industrial" replace />;
    }

    return <LoginPage />;
  }

  if (location.pathname === '/cadastro-empresa') {
    return <GenericLazyPage Component={CadastroEmpresa} />;
  }

  if (
    location.pathname === '/' ||
    location.pathname === '/home' ||
    location.pathname === '/inicio'
  ) {
    if (sessionExists) {
      return <Navigate to="/erp-industrial" replace />;
    }

    return <GenericLazyPage Component={PublicIndustrialHome} />;
  }

  if (location.pathname === '/blog') {
    return <GenericLazyPage Component={Blog} />;
  }

  if (location.pathname === '/teste-erp') {
    return <GenericLazyPage Component={TesteERP} />;
  }

  if (!sessionExists || !erpUser) {
    if (authError) {
      return <ErrorScreen message={authError} />;
    }

    return <Navigate to="/login" replace />;
  }

  if (location.pathname === '/master') {
    const nivel = Number(erpUser.usuario.nivel_admin ?? 0);

    if (nivel < 9) {
      return <Navigate to="/erp-industrial" replace />;
    }

    return <MasterRoute />;
  }

  switch (location.pathname) {
    case '/erp-industrial':
      return <ProtectedERP />;

    case '/fiscal':
      return <GenericLazyPage Component={Fiscal} />;

    case '/fiscal/previsao-caixa':
      return <GenericLazyPage Component={FiscalPrevisaoCaixa} />;

    case '/pcp':
    case '/pcp-industrial':
      return <GenericLazyPage Component={PCPIndustrial} />;

    case '/qualidade':
    case '/qualidade-industrial':
      return <GenericLazyPage Component={QualidadeIndustrial} />;

    case '/operacao':
    case '/operacao-industrial':
      return <GenericLazyPage Component={OperacaoIndustrial} />;

    case '/produtos-vendas':
      return <GenericLazyPage Component={ProdutosVendasIndustrial} />;

    case '/solicitacao-compra':
      return <GenericLazyPage Component={SolicitacaoCompra} />;

    case '/usuarios':
    case '/usuarios-admin':
      return <GenericLazyPage Component={UsuariosAdmin} />;

    case '/documentos-qualidade':
      return <GenericLazyPage Component={DocumentosQualidadeControle} />;

    case '/manual':
    case '/manual-usuario':
      return <GenericLazyPage Component={ManualUsuario} />;

    case '/guia':
    case '/virtual-guide':
      return <GenericLazyPage Component={VirtualGuide} />;

    default:
      return <Navigate to="/erp-industrial" replace />;
  }
}

export default function AppEntryV2() {
  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <AppRouter />
    </React.Suspense>
  );
}
