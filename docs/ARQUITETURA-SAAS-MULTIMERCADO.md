# Arquitetura SaaS Multimercado — SGQ ERP / Plastibor

Data: 17/09/2026

## Objetivo

Consolidar o ERP Industrial em uma plataforma SaaS multi-tenant preparada para verticais diferentes sem misturar identidade, empresa, permissões ou dados entre contextos.

## Regra central de segurança

Autenticação e autorização são camadas diferentes:

1. Supabase Auth autentica o usuário por e-mail e senha.
2. `app_metadata` carrega somente contexto de autorização confiável administrado pelo backend.
3. O perfil operacional fica em `erp_usuarios` para o ERP Industrial.
4. O tenant industrial é identificado por `erp_empresa_id`.
5. O papel industrial é identificado por `erp_role` e `erp_nivel_admin`.
6. RLS continua sendo a barreira definitiva no PostgreSQL; esconder menu no React nunca é considerado segurança.
7. O contexto do Salão usa chaves próprias (`salon_empresa_id`, `salon_role`, `salon_nivel_admin`) e não deve reutilizar o contexto industrial.

## Identidade visual e empresa

Para a homologação industrial atual, a empresa exibida na entrada é **PLASTIBOR**. O cadastro operacional existente usa o código `PLASTIBOR-2026`.

## Rotas públicas

- `/` — portal público industrial/SaaS
- `/home` — alias do portal
- `/login` — autenticação industrial
- `/cadastro-empresa` — onboarding de empresa
- `/contato` — contato
- `/blog` — conteúdo público
- `/modulos/*` — apresentação pública de recursos

Rotas privadas permanecem atrás do bootstrap de sessão e autorização.

## Portal multimercado

A evolução de portal deve suportar:

- `INDUSTRIAL`: ERP + SGQ, PCP, produção, estoque, qualidade, manutenção, fiscal e financeiro.
- `SALON`: agenda, clientes, profissionais, serviços, caixa, estoque e relatórios.
- `PETSHOP`: clientes, animais, agenda, banho/tosa, vacinas e histórico.
- `CLINIC`: agenda, pacientes, prontuários e faturamento, respeitando requisitos específicos do domínio.

O segmento é contexto de produto/UI. Ele não substitui o tenant nem autoriza acesso a dados.

## Arquitetura de frontend

```text
src/
  pages/
    LandingPortal.tsx
    LoginDinamico.tsx
    PlanosDinamicos.tsx
```

Essas páginas podem compartilhar o shell visual, mas o login real deve continuar usando o cliente Supabase já existente e uma única origem de autenticação por aplicação.

## Arquitetura de banco

Toda tabela operacional multi-tenant deve possuir `empresa_id` ou uma relação inequívoca com uma entidade que possua `empresa_id`.

Padrão para uma futura vertical Pet:

```text
animais
  id
  empresa_id
  cliente_id
  nome
  especie
  raca
  peso
  data_nascimento

historico_clinico
  id
  empresa_id
  animal_id
  veterinario_id
  data_consulta
  sintomas
  diagnostico
  prescricao
```

O `empresa_id` deve ser validado pelo banco e não recebido cegamente do navegador.

## RBAC

Perfis devem ser definidos por código/nível e, quando disponível, por `erp_roles`.

Exemplo de setores de homologação Plastibor:

| Setor | Login | Perfil esperado |
|---|---|---|
| ADM | ADM_Vandinha | Administrador |
| Comercial | PLComercial | Comercial |
| Compras | PLCompras | Compras |
| Qualidade | PLQualidade | Qualidade |
| Estoque | PLEstoque | Estoque |
| Expedição | PLExpedicao | Expedição |
| Financeiro | PLFinanceiro | Financeiro |
| Fiscal | PLFiscal | Fiscal |
| Manutenção | PLManutencao | Manutenção |
| PCP | PLPCP | PCP |
| Produção | PLProducao | Produção |
| RH | PLRH | RH |

Os logins acima são dados de homologação fornecidos para criação das contas Auth. Eles não devem ser tratados como usuários existentes até que existam em `auth.users`.

## Fluxo obrigatório de homologação

Para cada conta:

1. `signInWithPassword` deve retornar sessão.
2. `auth.uid()` deve corresponder ao perfil operacional correto.
3. `erp_usuarios.ativo` deve ser verdadeiro.
4. `empresa_id` deve corresponder ao tenant esperado.
5. `erp_role`/nível devem corresponder ao perfil.
6. RLS deve permitir apenas as operações do perfil e tenant.
7. Dashboard deve abrir.
8. Módulo autorizado deve abrir.
9. Criar registro deve persistir.
10. Editar registro deve persistir.
11. Pesquisar deve retornar o registro correto.
12. Usuário sem permissão deve receber bloqueio, não apenas menu oculto.
13. Logout deve encerrar a sessão.
14. Refresh deve preservar a sessão quando ainda válida.
15. Usuário inativo deve ser bloqueado.
16. Empresa A não pode consultar, editar ou excluir dados da Empresa B.

## Situação de homologação em 17/09/2026

O projeto Supabase atualmente possui uma conta Auth existente para `admin@plushbeauty.com`. Os demais e-mails de homologação listados pelo cliente não aparecem em `auth.users` neste momento. Portanto, não é correto declarar que esses logins já funcionam.

A criação das contas deve ser feita pelo fluxo administrativo seguro de Supabase Auth/Edge Function, sem inserir senhas diretamente em tabelas do banco.

## Decisões de implementação

- Não usar senha administrativa em `localStorage`.
- Não usar função exclusiva para MASTER como porta de entrada de usuários comuns.
- Não confiar em `role` enviado pelo frontend.
- Não usar um único `current_empresa_id()` ambíguo para Salão e Industrial quando a mesma identidade Auth tiver os dois contextos.
- Não misturar `salon_*` com `erp_*`.
- Não considerar o menu React como controle de segurança.
- Manter PWA como opcional; o navegador deve abrir o ERP normalmente até o usuário instalar o aplicativo.

## Critério de pronto

A plataforma só deve ser considerada homologada quando o build estiver `READY`, a aplicação abrir sem tela azul/blank, a sessão persistir e a matriz completa de CRUD + RLS + tenant + permissões for validada com contas Auth reais de teste.
