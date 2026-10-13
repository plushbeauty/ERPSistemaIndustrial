# ERP Sistema Industrial

ERP web para gestão integrada de operações industriais, desenvolvido para centralizar processos administrativos, comerciais, produtivos, logísticos, fiscais e de qualidade em uma aplicação única, com foco em rastreabilidade, segurança por empresa e padronização dos fluxos de trabalho.

- **Repositório:** [plushbeauty/ERPSistemaIndustrial](https://github.com/plushbeauty/ERPSistemaIndustrial)
- **Aplicação publicada:** [erp-sistema-industrial.vercel.app](https://erp-sistema-industrial.vercel.app/)
- **Branch principal:** `main`
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Supabase e Vercel.
- **Runtime definido no projeto:** Node.js 24.x.

> **Importante sobre o estado do produto:** este README descreve o escopo funcional e a arquitetura pretendida do ERP. A presença de um módulo nesta documentação não garante, por si só, que todas as telas, permissões, integrações ou operações estejam concluídas e validadas em produção. Consulte os testes, verificações de CI e implementação do módulo antes de considerar uma funcionalidade pronta para uso operacional.

## Sumário

- [Visão geral](#visão-geral)
- [Objetivos](#objetivos)
- [Áreas funcionais](#áreas-funcionais)
- [Fluxos industriais integrados](#fluxos-industriais-integrados)
- [Tecnologias e arquitetura](#tecnologias-e-arquitetura)
- [Segurança, autenticação e multiempresa](#segurança-autenticação-e-multiempresa)
- [Qualidade e documentos controlados](#qualidade-e-documentos-controlados)
- [Fiscal e notas fiscais](#fiscal-e-notas-fiscais)
- [Interface e experiência de uso](#interface-e-experiência-de-uso)
- [Desenvolvimento local](#desenvolvimento-local)
- [Verificações e qualidade de entrega](#verificações-e-qualidade-de-entrega)
- [Configuração e variáveis de ambiente](#configuração-e-variáveis-de-ambiente)
- [Implantação](#implantação)
- [Diretrizes de contribuição](#diretrizes-de-contribuição)
- [Limites e transparência](#limites-e-transparência)

## Visão geral

O ERP Sistema Industrial tem como objetivo conectar as áreas da empresa em uma base operacional consistente: cadastros alimentam compras e vendas; materiais e engenharia subsidiam o planejamento; o PCP acompanha a produção; estoque e almoxarifado controlam movimentações; qualidade mantém inspeções e registros; e os processos fiscais apoiam a conferência e o tratamento documental.

A aplicação é voltada a operações industriais que precisam organizar dados, acompanhar o andamento dos processos, reduzir retrabalho e manter histórico das atividades. O desenho contempla uso em estações de trabalho e fluxos específicos para tablet.

## Objetivos

- Centralizar cadastros e operações em um sistema integrado.
- Manter separação de dados por empresa/organização.
- Aplicar autenticação, autorização por perfil e políticas de acesso no banco.
- Padronizar formulários, tabelas, navegação, ações e mensagens de validação.
- Dar suporte à rastreabilidade de materiais, lotes, inspeções e documentos.
- Disponibilizar relatórios, consultas e impressões focadas no documento ou processo.
- Validar código, rotas, configuração e build antes de publicar alterações.

## Áreas funcionais

O escopo do ERP abrange as seguintes áreas. O nível de conclusão deve ser confirmado no código e nos ambientes de teste para cada funcionalidade.

### Administração e cadastros
- Administração do sistema, usuários, perfis e permissões.
- Cadastros gerais necessários aos processos empresariais.
- Empresas/organizações e parâmetros de operação.
- Cadastros de clientes, fornecedores, materiais e produtos, conforme as telas e entidades disponíveis.

### Vendas
- Fluxos de pedidos e acompanhamento de status.
- Consulta de clientes e itens relacionados ao pedido.
- Relatórios e consultas comerciais.
- Validação de campos obrigatórios e ações de criar, consultar, editar e salvar conforme permissões.

### Compras
- Processos de compras e consulta de fornecedores e materiais.
- Apoio à cotação e à solicitação de preços.
- Consulta por código, descrição e grupo quando disponível na tela.
- Integração pretendida com recebimento e estoque.

### Estoque e almoxarifado
- Consultas de saldo e movimentações de materiais.
- Organização por empresa, material, lote e localização quando suportado pelos dados existentes.
- Recebimento, conferência e liberação conforme os fluxos implementados.
- Tratamento de materiais bloqueados ou em quarentena quando acionado pelas regras de qualidade configuradas.

### Engenharia e estrutura de produtos
- Informações técnicas de materiais e produtos.
- Estrutura de produto/lista de materiais (BOM) e componentes, conforme implementação.
- Relação entre produto, especificação técnica e documentos controlados.
- Integração planejada com planejamento da produção e necessidades de materiais.

### Planejamento e Controle da Produção (PCP)
- Acompanhamento de ordens e apontamentos de produção conforme telas disponíveis.
- Planejamento de necessidades de materiais e recursos.
- Visibilidade de carga, capacidade e agenda de máquinas, quando implementadas.
- Impressão de fichas e documentos de produção específicos, sem depender da impressão integral da tela.

### Qualidade — SGQ
- Inspeções e registros da qualidade.
- Especificações técnicas e documentos controlados.
- Não conformidades e ações corretivas/preventivas (RNC/CAPA), quando implementadas.
- Análise de risco e ferramentas de qualidade previstas no escopo, como FMEA, 5W2H, Ishikawa/6M, CEP e indicadores de capacidade de processo.
- Registros auditáveis e apoio à rastreabilidade de decisões.
- Central de acesso por tablet para os módulos de qualidade, conforme a experiência definida para a aplicação.

### GED — Gestão Eletrônica de Documentos
- Organização e consulta de documentos técnicos e da qualidade.
- Controle documental por identificação, revisão, data e vínculo com materiais/produtos, quando suportado pelo modelo de dados.
- Relação entre documento controlado e especificação técnica.
- Acesso ao documento adequado para o processo, respeitando permissões.

### Fiscal e notas fiscais
- Fluxos de conferência e liberação de documentos fiscais conforme a implementação disponível.
- Consulta e tratamento de informações relacionadas à nota fiscal.
- Integração com estoque e custos somente conforme regras e contratos efetivamente implementados.
- Qualquer emissão, transmissão, autorização ou consulta oficial de NF-e depende das integrações fiscais necessárias e não deve ser presumida a partir da existência de uma tela.

### Recursos humanos, manutenção e outros módulos
O projeto também contempla áreas de apoio industrial, como RH e manutenção, conforme o escopo evolutivo do produto. A disponibilidade operacional de cada processo deve ser verificada na versão implantada.

## Fluxos industriais integrados

A proposta de integração inclui os seguintes encadeamentos, sujeitos às regras e integrações já implementadas:

1. **Pedido e atendimento comercial:** cadastro → pedido → acompanhamento → expedição/faturamento, conforme os módulos disponíveis.
2. **Suprimentos:** necessidade de material → cotação/compra → recebimento → conferência → estoque.
3. **Engenharia e produção:** produto/BOM → necessidade de materiais → planejamento → ordem de produção → apontamento → registro do resultado.
4. **Qualidade:** especificação aplicável → inspeção → aprovação ou reprovação → bloqueio/quarentena e não conformidade quando a regra estiver configurada.
5. **Documentação:** produto/material → especificação técnica → documento controlado → revisão e consulta.
6. **Fiscal e estoque:** conferência documental e movimentações relacionadas, de acordo com as integrações efetivamente validadas.

Esses fluxos são objetivos funcionais; não substituem testes de integração, validação de regras de negócio nem homologação com usuários.

## Tecnologias e arquitetura

| Camada | Tecnologia / responsabilidade |
| --- | --- |
| Interface | React 18 |
| Linguagem | TypeScript |
| Ferramenta de desenvolvimento e build | Vite |
| Estilos | Tailwind CSS |
| Rotas | React Router |
| Componentes e acessibilidade | Radix UI, conforme uso no código |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Backend e banco | Supabase e PostgreSQL |
| Autenticação e sessão | Supabase Auth, conforme fluxo implementado |
| Arquivos/relatórios para impressão | jsPDF e react-to-print, conforme telas |
| Leitura de códigos | ZXing, conforme fluxo implementado |
| Hospedagem e integração contínua | Vercel e GitHub |

A aplicação web utiliza componentes React e rotas de navegação. O Supabase fornece os serviços de backend usados pelo projeto, incluindo banco de dados e autenticação conforme a configuração real do ambiente. As regras de negócio críticas devem ser protegidas no servidor/banco, e não apenas escondidas na interface.

## Segurança, autenticação e multiempresa

A segurança deve ser validada de ponta a ponta, incluindo:

- Autenticação real e gerenciamento correto da sessão.
- Controle de acesso por usuário, perfil e permissão.
- Isolamento entre empresas/organizações, usando o vínculo de empresa definido pelo esquema existente.
- Políticas RLS (Row Level Security) adequadas nas tabelas expostas pelo Supabase.
- Verificação de autorização também no backend/banco para operações sensíveis.
- Proteção de credenciais: segredos de servidor não devem ser incluídos no bundle do navegador nem versionados no repositório.
- Tratamento de erros de autenticação, sessão expirada e falta de permissão sem conceder acesso por padrão.

Os nomes de tabelas, funções RPC, colunas e políticas precisam corresponder ao esquema real do banco. Não se deve criar dependências em colunas ou funções presumidas sem migração revisada e validação. O papel administrativo ou de superadministrador deve ser verificado no contrato de autorização do projeto, sem confiar exclusivamente em valores enviados pelo cliente.

## Qualidade e documentos controlados

O Sistema de Gestão da Qualidade (SGQ) tem como objetivo registrar inspeções, critérios de aceitação, evidências e ações decorrentes dos resultados. O fluxo de reprovação deve, quando configurado e validado, impedir que material não conforme seja liberado indevidamente.

Os documentos técnicos devem ter identificação clara e, quando aplicável, código/sigla, nome, revisão, data de vigência, material ou produto relacionado e histórico de revisão. A aplicação deve diferenciar documento controlado de anexo informal e aplicar permissões de consulta e alteração.

Indicadores e ferramentas como FMEA, RNC/CAPA, 5W2H, Ishikawa/6M e CEP são parte do escopo funcional planejado; a disponibilidade, os cálculos e a impressão de cada ferramenta precisam ser comprovados por testes próprios.

## Fiscal e notas fiscais

As rotinas fiscais exigem cuidado especial com legislação, certificados, ambiente, regras tributárias e serviços oficiais. Uma tela de consulta ou liberação documental não significa que a emissão ou autorização de NF-e esteja integrada e homologada.

Antes de usar um fluxo fiscal em produção, valide:
- contrato de dados e campos obrigatórios;
- cálculos e regras tributárias aplicáveis;
- integração com o serviço fiscal oficial, se houver;
- tratamento de rejeições, contingência e duplicidade;
- vínculo correto entre documento fiscal, empresa, estoque e custo;
- testes em ambiente de homologação e revisão por profissional responsável.

## Interface e experiência de uso

O padrão visual pretendido é compacto e consistente, com foco em produtividade industrial:

- Navegação horizontal compartilhada entre módulos.
- Formulários com campos e botões compactos, rótulos claros e validação visível.
- Tabelas densas e legíveis para consulta operacional.
- Hierarquia visual, cores funcionais para estados e contraste adequado.
- Ações previsíveis para novo, editar, salvar, cancelar, consultar e imprimir.
- Ajuda contextual explicando o objetivo da tela, seus campos e o fluxo de uso.
- Impressão do documento operacional relevante, evitando imprimir toda a interface.
- Layouts adequados para desktop e fluxos específicos de tablet.

A padronização visual não deve alterar cálculos fiscais, permissões, regras de negócio ou comportamento funcional sem testes.

## Desenvolvimento local

### Pré-requisitos

- Node.js **24.x** (versão indicada em `package.json`).
- npm.
- Acesso a um projeto Supabase de desenvolvimento com o esquema e as políticas necessários.

### Instalação

```bash
git clone https://github.com/plushbeauty/ERPSistemaIndustrial.git
cd ERPSistemaIndustrial
npm ci --legacy-peer-deps --no-audit --no-fund
```

Configure as variáveis de ambiente exigidas pelos verificadores e pelo cliente Supabase, usando os nomes documentados nos arquivos de configuração e nos scripts do próprio repositório. Não publique valores secretos.

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

### Scripts disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor Vite de desenvolvimento. |
| `npm run type-check` | Executa a verificação de tipos TypeScript sem emitir arquivos. |
| `npm run build` | Verifica tipos e gera o build Vite. |
| `npm run lint:check` | Executa ESLint sem corrigir arquivos automaticamente. |
| `npm run audit:interactions` | Executa a auditoria de interações definida pelo projeto. |
| `npm run audit:global` | Executa a auditoria global definida pelo projeto. |
| `npm run audit:brutal` | Executa a auditoria adicional definida pelo projeto. |
| `npm run audit:all` | Executa as auditorias brutal, global e de interações. |
| `npm run verify:routes` | Verifica as rotas por meio do script do projeto. |
| `npm run verify:nfe-contract` | Verifica o contrato de NF-e definido no projeto. |
| `npm run verify:release` | Executa a sequência de verificações de release declarada no package.json. |
| `npm run build:verified` | Executa verificações, auditorias, lint e build verificado. |
| `npm run build:vercel` | Executa a verificação de produção usada pela configuração de build da Vercel. |

Use os scripts do repositório como fonte de verdade: sua composição pode mudar com a evolução do projeto. Uma verificação automatizada aprovada não substitui testes manuais, testes de integração, revisão de segurança ou homologação funcional.

## Configuração e variáveis de ambiente

A configuração deve ser obtida dos arquivos de exemplo, do cliente Supabase e dos scripts de verificação presentes no repositório. Não invente nomes de variáveis nem copie credenciais de produção para ambientes locais.

Boas práticas:
- Use projetos e credenciais separados para desenvolvimento, homologação e produção.
- Mantenha chaves privilegiadas exclusivamente em ambiente de servidor.
- Nunca versione arquivos `.env` com segredos.
- Confirme as variáveis exigidas antes do build e da implantação.
- Não desative guardas de segurança para fazer o build passar.

## Implantação

A aplicação de produção está associada ao projeto Vercel indicado acima. O fluxo de entrega deve manter:
1. alterações versionadas em branch apropriada;
2. revisão de código e escopo;
3. verificações de tipos, lint, segurança e integridade;
4. build reproduzível;
5. testes das rotas e dos fluxos alterados;
6. validação das variáveis de ambiente e das políticas do Supabase;
7. verificação do deploy e teste de fumaça no ambiente publicado.

Um commit criado ou um build iniciado não significa que o deploy terminou com sucesso. Confirme o estado final no GitHub/Vercel e teste os fluxos críticos após a publicação.

## Diretrizes de contribuição

- Respeite a arquitetura, os padrões TypeScript e os componentes compartilhados.
- Não use dados falsos ou mocks como se fossem dados operacionais reais.
- Não use `any` para contornar erros de tipagem.
- Não contorne autenticação, RLS, autorização ou verificações de produção.
- Não presuma tabelas, colunas, funções RPC ou permissões: confira o esquema e as migrações existentes.
- Evite alterações globais de CSS que afetem fluxos fiscais ou operacionais sem regressão.
- Inclua validações e testes para os caminhos de sucesso e erro.
- Registre no PR o que foi alterado, o que foi testado e o que permanece pendente.
- Atualize esta documentação quando o escopo, os comandos ou a arquitetura realmente mudarem.

## Limites e transparência

Este projeto está em evolução. A documentação apresenta a finalidade do ERP e os processos contemplados, mas não certifica que todos os módulos estejam finalizados, que todas as rotas funcionem, que as políticas de segurança estejam corretas ou que integrações fiscais estejam homologadas.

Antes de considerar o sistema pronto para uso real, é necessário verificar o estado atual do código, os resultados de CI/CD, o esquema e as políticas do Supabase, as permissões por perfil, as rotas publicadas e os fluxos de ponta a ponta de cada módulo.
