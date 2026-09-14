import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigurado } from './lib/supabaseClient';

const AppIndustrialV7 = lazy(() => import('./AppIndustrialV7'));
const PublicIndustrialHome = lazy(
  () => import('./pages/PublicIndustrialHome')
);
const Blog = lazy(() => import('./pages/Blog'));
const Fiscal = lazy(() => import('./pages/Fiscal'));
const FiscalPrevisaoCaixa = lazy(
  () => import('./pages/FiscalPrevisaoCaixa')
);
const Master = lazy(() => import('./pages/Master'));
const PCPIndustrial = lazy(() => import('./pages/PCPIndustrial'));
const QualidadeIndustrial = lazy(
  () => import('./pages/QualidadeIndustrial')
);
const OperacaoIndustrial = lazy(
  () => import('./pages/OperacaoIndustrial')
);
const ProdutosVendasIndustrial = lazy(
  () => import('./pages/ProdutosVendasIndustrial')
);
const CadastroEmpresa = lazy(
  () => import('./pages/CadastroEmpresa')
);
const SolicitacaoCompra = lazy(
  () => import('./pages/SolicitacaoCompra')
);
const TesteERP = lazy(() => import('./pages/TesteERP'));
const UsuariosAdmin = lazy(
  () => import('./pages/UsuariosAdmin')
);
const DocumentosQualidadeControle = lazy(
  () => import('./pages/DocumentosQualidadeControle')
);
const ManualUsuario = lazy(
  () => import('./pages/ManualUsuario')
);
const VirtualGuide = lazy(
  () => import('./pages/VirtualGuide')
);

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
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
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
              to {
                transform: rotate(360deg);
              }
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
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#fff',
          borderRadius: 18,
          padding: 34,
          boxShadow: '0 16px 45px rgba(0,0,0,.08)',
          border: '1px solid #dfe7e3',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 12,
            background: '#fff1ef',
            color: '#9a3024',
            fontWeight: 900,
            fontSize: 22,
            marginBottom: 18,
          }}
        >
          !
        </div>

        <h2
          style={{
            marginTop: 0,
            marginBottom: 10,
            color: '#16352d',
          }}
        >
          Não foi possível carregar o ERP
        </h2>

        <p
          style={{
            color: '#53615c',
            lineHeight: 1.6,
            marginBottom: 0,
          }}
        >
          O sistema encontrou um problema ao validar o ambiente ou a
          autenticação.
        </p>

        <div
          role="alert"
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 10,
            background: '#fff4f2',
            color: '#8b2c20',
            fontSize: 14,
            lineHeight: 1.55,
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

  if (!usuario.auth_user_id) {
    throw new Error(
      'O usuário ERP ainda não possui vínculo com o Supabase Auth.'
    );
  }

  if (!usuario.ativo) {
    throw new Error('Este usuário está inativo no ERP.');
  }

  if (!usuario.empresa_id) {
    throw new Error(
      'Este usuário não possui uma empresa vinculada.'
    );
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
    throw new Error(
      'A empresa vinculada ao usuário está inativa.'
    );
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

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (error) {
    if (error.message === 'Invalid login credentials') {
      throw new Error('E-mail ou senha inválidos.');
    }

    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error(
      'O Supabase não retornou o usuário autenticado.'
    );
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

  const [empresa, setEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);
    setErrorMessage('');
    setNotice('');

    try {
      /*
       * A empresa permanece no formulário para facilitar
       * identificação visual pelo usuário.
       *
       * A identidade NÃO é autenticada pela empresa.
       *
       * O fluxo seguro é:
       *
       * auth.users.id
       *       ↓
       * erp_usuarios.auth_user_id
       *       ↓
       * erp_usuarios.empresa_id
       *       ↓
       * erp_empresas.id
       *
       * O valor informado em "empresa" não é utilizado
       * para conceder acesso.
       */
      void empresa;

      await autenticarERP(email, password);

      navigate('/erp-industrial', {
        replace: true,
      });
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
    setNotice('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(
        'Informe seu e-mail para recuperar a senha.'
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: `${window.location.origin}/login`,
          }
        );

      if (error) {
        throw error;
      }

      setNotice(
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
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#edf2f0',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <section
          style={{
            maxWidth: 620,
            width: '100%',
            background: '#fff',
            borderRadius: 18,
            padding: 34,
            boxShadow: '0 15px 45px rgba(0,0,0,.08)',
            border: '1px solid #e1e8e5',
          }}
        >
          <div
            style={{
              color: '#16856d',
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            SGQ ERP INDUSTRIAL
          </div>

          <h1
            style={{
              color: '#16352d',
              marginTop: 0,
            }}
          >
            Configuração do ambiente pendente
          </h1>

          <p
            style={{
              lineHeight: 1.6,
              color: '#596660',
            }}
          >
            O sistema foi carregado, mas as credenciais públicas do
            Supabase ainda não estão disponíveis neste deploy.
          </p>

          <p
            style={{
              lineHeight: 1.6,
              color: '#596660',
            }}
          >
            Configure na Vercel:
          </p>

          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: '#f3f7f5',
              border: '1px solid #dce6e1',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                marginBottom: 10,
                color: '#16352d',
              }}
            >
              VITE_SUPABASE_URL
            </div>

            <div
              style={{
                fontFamily: 'monospace',
                color: '#16352d',
              }}
            >
              VITE_SUPABASE_PUBLISHABLE_KEY
            </div>
          </div>

          <p
            style={{
              color: '#596660',
              fontSize: 14,
              marginBottom: 0,
            }}
          >
            Depois faça um novo deploy da aplicação.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns:
          'minmax(0, 1.15fr) minmax(430px, .85fr)',
        background: '#10231f',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
          background: '#10231f',
        }}
        aria-label="Apresentação do SGQ ERP"
      >
        <img
          src="/images/sgq/sgq-erp-login.png"
          alt="SGQ ERP — Gestão Industrial"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 0.72,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(10,30,25,.96) 0%, rgba(12,42,34,.82) 48%, rgba(12,42,34,.45) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '70px 7vw',
            color: '#fff',
          }}
        >
          <div
            style={{
              maxWidth: 700,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                padding: '8px 14px',
                borderRadius: 999,
                border:
                  '1px solid rgba(255,255,255,.18)',
                background:
                  'rgba(255,255,255,.07)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.1,
                marginBottom: 24,
              }}
            >
              SGQ ERP INDUSTRIAL
            </div>

            <h2
              style={{
                fontSize:
                  'clamp(36px, 5vw, 66px)',
                lineHeight: 1.03,
                margin: 0,
                letterSpacing: -2,
                maxWidth: 690,
              }}
            >
              O controle da fábrica em um único sistema.
            </h2>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                color: '#d0ddd8',
                maxWidth: 620,
                marginTop: 26,
              }}
            >
              Produção, qualidade, PCP, estoque,
              manutenção, financeiro e gestão
              integrados por empresa.
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 26,
              }}
            >
              {[
                'Produção',
                'Qualidade',
                'PCP',
                'Estoque',
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    padding:
                      '8px 12px',
                    borderRadius: 999,
                    background:
                      'rgba(255,255,255,.09)',
                    border:
                      '1px solid rgba(255,255,255,.14)',
                    color: '#e7efec',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  ● {item}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: '7vw',
              bottom: 26,
              fontSize: 12,
              color: '#c4d2cd',
              opacity: 0.9,
            }}
          >
            Ambiente protegido • Dados separados por empresa
          </div>
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
        <form
          onSubmit={handleLogin}
          style={{
            width: '100%',
            maxWidth: 480,
            background: '#fff',
            borderRadius: 22,
            padding: 38,
            boxShadow:
              '0 20px 60px rgba(0,0,0,.12)',
            border:
              '1px solid #e2e9e6',
          }}
        >
          <div
            style={{
              marginBottom: 30,
            }}
          >
            <a
              href="/login"
              aria-label="SGQ ERP"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginBottom: 22,
              }}
            >
              <img
                src="/logo-industrial.svg"
                alt="SGQ ERP"
                style={{
                  display: 'block',
                  width: 'auto',
                  maxWidth: 230,
                  maxHeight: 72,
                }}
              />
            </a>

            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1.2,
                color: '#16856d',
                marginBottom: 9,
              }}
            >
              PORTAL SEGURO
            </div>

            <h1
              style={{
                margin: 0,
                color: '#16352d',
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              Acesse seu SGQ ERP
            </h1>

            <p
              style={{
                color: '#68756f',
                lineHeight: 1.55,
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              Entre com suas credenciais para acessar
              a operação da sua empresa.
            </p>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 800,
                color: '#33423d',
                marginBottom: 7,
              }}
            >
              Empresa
            </label>

            <input
              value={empresa}
              onChange={(event) =>
                setEmpresa(event.target.value)
              }
              placeholder="Ex.: PLASTIBOR"
              autoComplete="organization"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border:
                  '1px solid #d5dfdb',
                borderRadius: 10,
                padding:
                  '13px 14px',
                marginBottom: 16,
                outline: 'none',
                fontSize: 14,
                color: '#24352f',
                background: '#fff',
              }}
            />

            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 800,
                color: '#33423d',
                marginBottom: 7,
              }}
            >
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Digite seu e-mail cadastrado"
              autoComplete="username"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border:
                  '1px solid #d5dfdb',
                borderRadius: 10,
                padding:
                  '13px 14px',
                marginBottom: 16,
                outline: 'none',
                fontSize: 14,
                color: '#24352f',
                background: '#fff',
              }}
            />

            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 800,
                color: '#33423d',
                marginBottom: 7,
              }}
            >
              Senha
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border:
                  '1px solid #d5dfdb',
                borderRadius: 10,
                padding:
                  '13px 14px',
                marginBottom: 18,
                outline: 'none',
                fontSize: 14,
                color: '#24352f',
                background: '#fff',
              }}
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              style={{
                padding: 13,
                borderRadius: 10,
                background: '#fff1ef',
                border:
                  '1px solid #f0d0ca',
                color: '#9a3024',
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              {errorMessage}
            </div>
          )}

          {notice && (
            <div
              role="status"
              style={{
                padding: 13,
                borderRadius: 10,
                background: '#eef8f4',
                border:
                  '1px solid #cfe7dd',
                color: '#17634f',
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              {notice}
            </div>
          )}

          {!recovery ? (
            <>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  border: 0,
                  borderRadius: 11,
                  padding:
                    '14px 18px',
                  background: loading
                    ? '#7da99d'
                    : '#16856d',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: loading
                    ? 'wait'
                    : 'pointer',
                  fontSize: 15,
                }}
              >
                {loading
                  ? 'Entrando...'
                  : 'Entrar no sistema'}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'space-between',
                  gap: 12,
                  marginTop: 15,
                }}
              >
                <a
                  href="/cadastro-empresa"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    textDecoration: 'none',
                    padding:
                      '11px 10px',
                    borderRadius: 10,
                    border:
                      '1px solid #d8e4df',
                    color: '#16856d',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  Teste grátis 15 dias
                </a>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setRecovery(true)
                  }
                  style={{
                    flex: 1,
                    border: 0,
                    background:
                      'transparent',
                    color: '#16856d',
                    cursor: loading
                      ? 'wait'
                      : 'pointer',
                    fontWeight: 800,
                    fontSize: 13,
                    padding:
                      '11px 8px',
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>

              <a
                href="/cadastro-empresa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 12,
                  border:
                    '1px solid #d5dfdb',
                  borderRadius: 11,
                  padding:
                    '13px 18px',
                  background: '#fff',
                  color: '#16352d',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                Cadastrar nova empresa
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void handleRecovery()
                }
                style={{
                  width: '100%',
                  border: 0,
                  borderRadius: 11,
                  padding:
                    '14px 18px',
                  background: loading
                    ? '#7da99d'
                    : '#16856d',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: loading
                    ? 'wait'
                    : 'pointer',
                  fontSize: 15,
                }}
              >
                {loading
                  ? 'Enviando...'
                  : 'Enviar recuperação'}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setRecovery(false);
                  setErrorMessage('');
                  setNotice('');
                }}
                style={{
                  width: '100%',
                  border:
                    '1px solid #d5dfdb',
                  borderRadius: 11,
                  padding:
                    '13px 18px',
                  background: '#fff',
                  color: '#16352d',
                  marginTop: 12,
                  cursor: loading
                    ? 'wait'
                    : 'pointer',
                  fontWeight: 800,
                }}
              >
                Voltar ao login
              </button>
            </>
          )}

          <a
            href="/"
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: 22,
              color: '#65736d',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Voltar para o site
          </a>

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
        </form>
      </section>

      <style>
        {`
          @media (max-width: 900px) {
            main {
              grid-template-columns: 1fr !important;
            }

            main > section:first-child {
              display: none !important;
            }

            main > section:last-child {
              min-height: 100vh !important;
              padding: 20px !important;
            }
          }
        `}
      </style>
    </main>
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
  Component: React.LazyExoticComponent<
    React.ComponentType<any>
  >;
}) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Component />
    </Suspense>
  );
}

function AppRouter() {
  const location = useLocation();

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [sessionExists, setSessionExists] =
    useState(false);

  const [erpUser, setErpUser] =
    useState<AuthenticatedERP | null>(null);

  const [authError, setAuthError] =
    useState('');

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
      const {
        data,
        error,
      } = await supabase.auth.getSession();

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
        const authenticated =
          await buscarUsuarioERP(
            session.user.id
          );

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
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          setSessionExists(false);
          setErpUser(null);
          return;
        }

        /*
         * Não executamos consultas pesadas diretamente
         * dentro do callback do Supabase Auth.
         *
         * Isso evita travamentos/deadlocks durante a
         * troca de sessão.
         */
        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          window.setTimeout(() => {
            void refreshAuth();
          }, 0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAuth]);

  if (checkingAuth) {
    return <AuthLoading />;
  }

  /*
   * LOGIN
   */
  if (location.pathname === '/login') {
    if (sessionExists) {
      return (
        <Navigate
          to="/erp-industrial"
          replace
        />
      );
    }

    return <LoginPage />;
  }

  /*
   * CADASTRO DE EMPRESA
   *
   * Esta página continua pública.
   */
  if (
    location.pathname ===
    '/cadastro-empresa'
  ) {
    return (
      <GenericLazyPage
        Component={CadastroEmpresa}
      />
    );
  }

  /*
   * PÁGINA PÚBLICA
   *
   * Usuário não autenticado:
   * página institucional.
   *
   * Usuário autenticado:
   * entra diretamente no ERP.
   */
  if (
    location.pathname === '/' ||
    location.pathname === '/home' ||
    location.pathname === '/inicio'
  ) {
    if (sessionExists) {
      return (
        <Navigate
          to="/erp-industrial"
          replace
        />
      );
    }

    return (
      <GenericLazyPage
        Component={PublicIndustrialHome}
      />
    );
  }

  /*
   * BLOG PÚBLICO
   */
  if (location.pathname === '/blog') {
    return (
      <GenericLazyPage
        Component={Blog}
      />
    );
  }

  /*
   * TESTE DO ERP
   *
   * Mantido protegido.
   */
  if (location.pathname === '/teste-erp') {
    if (!sessionExists || !erpUser) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    return (
      <GenericLazyPage
        Component={TesteERP}
      />
    );
  }

  /*
   * TODAS AS ROTAS ABAIXO SÃO PROTEGIDAS.
   */
  if (!sessionExists || !erpUser) {
    if (authError) {
      return (
        <ErrorScreen
          message={authError}
        />
      );
    }

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /*
   * MASTER
   */
  if (location.pathname === '/master') {
    const nivel = Number(
      erpUser.usuario.nivel_admin ?? 0
    );

    if (nivel < 9) {
      return (
        <Navigate
          to="/erp-industrial"
          replace
        />
      );
    }

    return <MasterRoute />;
  }

  /*
   * ERP PRINCIPAL
   */
  switch (location.pathname) {
    case '/erp-industrial':
      return <ProtectedERP />;

    /*
     * FISCAL
     */
    case '/fiscal':
      return (
        <GenericLazyPage
          Component={Fiscal}
        />
      );

    case '/fiscal/previsao-caixa':
      return (
        <GenericLazyPage
          Component={FiscalPrevisaoCaixa}
        />
      );

    /*
     * PCP
     */
    case '/pcp':
    case '/pcp-industrial':
      return (
        <GenericLazyPage
          Component={PCPIndustrial}
        />
      );

    /*
     * QUALIDADE
     */
    case '/qualidade':
    case '/qualidade-industrial':
      return (
        <GenericLazyPage
          Component={QualidadeIndustrial}
        />
      );

    /*
     * OPERAÇÃO
     */
    case '/operacao':
    case '/operacao-industrial':
      return (
        <GenericLazyPage
          Component={OperacaoIndustrial}
        />
      );

    /*
     * PRODUTOS / VENDAS
     */
    case '/produtos-vendas':
      return (
        <GenericLazyPage
          Component={ProdutosVendasIndustrial}
        />
      );

    /*
     * COMPRAS
     */
    case '/solicitacao-compra':
      return (
        <GenericLazyPage
          Component={SolicitacaoCompra}
        />
      );

    /*
     * USUÁRIOS
     */
    case '/usuarios':
    case '/usuarios-admin':
      return (
        <GenericLazyPage
          Component={UsuariosAdmin}
        />
      );

    /*
     * DOCUMENTOS / QUALIDADE
     */
    case '/documentos-qualidade':
      return (
        <GenericLazyPage
          Component={DocumentosQualidadeControle}
        />
      );

    /*
     * MANUAL
     */
    case '/manual':
    case '/manual-usuario':
      return (
        <GenericLazyPage
          Component={ManualUsuario}
        />
      );

    /*
     * GUIA
     */
    case '/guia':
    case '/virtual-guide':
      return (
        <GenericLazyPage
          Component={VirtualGuide}
        />
      );

    /*
     * QUALQUER ROTA DESCONHECIDA
     */
    default:
      return (
        <Navigate
          to="/erp-industrial"
          replace
        />
      );
  }
}

export default function AppEntryV2() {
  return (
    <React.Suspense
      fallback={<LoadingScreen />}
    >
      <AppRouter />
    </React.Suspense>
  );
}
