# Plano de execução — Setup Wizard e auditoria industrial SYNQRA ERP

- **Data:** 29/10/2026
- **Repositório:** `plushbeauty/ERPSistemaIndustrial`
- **Branch deste plano:** `docs/roadmap-setup-wizard-auditoria-industrial-20261029`
- **Status:** planejamento técnico; não representa implementação nem homologação.
- **Regra de preservação:** telas e componentes marcados como aprovados/congelados não podem sofrer alteração visual sem autorização explícita.

## 1. Resultado esperado

Entregar um processo inicial de configuração que crie e configure uma empresa real no ERP, vincule o administrador autenticado, aplique parâmetros de operação e libere o workspace somente após validação. Em paralelo, auditar o sistema por rotas, componentes, banco, segurança, fluxos operacionais, testes e publicação.

O wizard será um **orquestrador de configuração**: não deve fingir que habilitar um checkbox configura contabilidade, MRP, estoque ou produção. Cada etapa deve gravar em estruturas reais e indicar pré-requisitos pendentes.

## 2. Pesquisa comparativa de ERPs

Referências oficiais consultadas em 29/10/2026:

- ERPNext — ordem de configuração, empresa, fiscal, contas, armazéns, itens, parceiros, usuários e teste ponta a ponta: https://docs.frappe.io/erpnext/setting-up
- ERPNext — entidade legal, moeda, abreviação e defaults: https://docs.frappe.io/erpnext/company-setup
- ERPNext — exercício fiscal: https://docs.frappe.io/erpnext/fiscal-year
- ERPNext — lista de materiais, componentes, operações, centros de trabalho e custo: https://docs.frappe.io/erpnext/bill-of-materials
- ERPNext — planejamento de capacidade e armazéns de produção: https://docs.frappe.io/erpnext/manufacturing-settings
- ERPNext — inspeções de qualidade de recebimento, processo e expedição: https://docs.frappe.io/erpnext/quality-inspection
- Odoo — configuração multiempresa e separação de dados: https://www.odoo.com/documentation/19.0/applications/general/companies/multi_company.html
- Odoo — grupos, direitos de acesso e regras por registro: https://www.odoo.com/documentation/19.0/pt_BR/applications/general/users/access_rights.html
- Odoo — fabricação, chão de fábrica, qualidade, manutenção, subcontratação e OEE: https://www.odoo.com/documentation/19.0/pt_BR/applications/inventory_and_mrp/manufacturing.html
- SAP Business One — assistente e ordem de configuração de contabilidade, estoque, parceiros, vendas, compras e usuários: https://learning.sap.com/courses/implementing-sap-business-one-br/configuracao-de-uma-nova-empresa-do-sap-business-one-com-o-assistente-de-configuracao

### Princípios que se repetem

1. Configurar entidade legal, país, moeda e calendário fiscal antes dos lançamentos.
2. Configurar plano de contas, impostos, centros de custo e bancos antes de validar o financeiro.
3. Definir produtos, unidades, estruturas de materiais, operações, máquinas/centros de trabalho e armazéns antes do planejamento e da execução da produção.
4. Ligar compras, vendas, estoque, PCP/MRP, qualidade e custos através de documentos e referências consistentes.
5. Separar autenticação, função/permissão e isolamento de dados por empresa.
6. Testar ciclos completos com usuários e dados reais de homologação; não considerar uma tela pronta apenas porque compila.
7. Destacar configurações difíceis de alterar após haver transações e exigir confirmação/controle de mudança.

## 3. Cronograma proposto

Estimativa de **15 a 20 dias úteis** para a primeira entrega operacional do wizard e uma auditoria priorizada dos fluxos críticos. A auditoria visual/funcional exaustiva de todas as rotas pode exigir uma fase adicional, conforme os defeitos encontrados e o acesso a ambientes de homologação.

| Fase | Prazo estimado | Entregas | Critério de saída |
|---|---:|---|---|
| 0. Baseline e proteção | 1–2 dias | Confirmar branch/base, HEAD, CI, rotas, contrato de telas aprovadas e estado atual da produção | Inventário reproduzível; sem tocar em telas congeladas |
| 1. Auditoria técnica prioritária | 3–4 dias | Mapear rota → componente → tabelas → permissões; identificar páginas duplicadas/aliases, queries, erros de tipo e migrations ausentes | Matriz de riscos e lista priorizada com evidências |
| 2. Modelo de setup e segurança | 2–3 dias | Definir persistência, tenant, estado de onboarding, retomada e conclusão; revisar RLS e funções reais | Esquema compatível com banco real e testes de isolamento definidos |
| 3. Wizard ponta a ponta | 3–4 dias | Etapas regionais, empresa/fiscal, identidade/perfil autorizado, módulos e checklist industrial; validação, erros e retomada | Persistência confirmada; sem dados hardcoded; falhas não redirecionam como sucesso |
| 4. Integração industrial | 2–3 dias | Checklist e dependências para estoque, cadastro de produto, ficha/BOM, máquinas, PCP, qualidade e custos | Configurações apontam para módulos/tabelas reais; itens não implementados ficam pendentes explícitos |
| 5. Homologação e publicação | 3–4 dias | Type-check, lint, scripts de contrato/rotas, migrations em ambiente autorizado, testes de usuário/tenant e build Vercel | CI verde, deployment READY, smoke tests e confirmação de versão publicada |

As fases podem se sobrepor parcialmente, mas não se deve pular a validação do banco nem declarar publicação concluída com base apenas no commit.

## 4. Escopo funcional do Setup Wizard

### Etapa A — Ambiente e regionalização
- Idioma, fuso horário, moeda e país/localização.
- Calendário fiscal com data inicial/final coerente.
- Exibir quais configurações podem ser alteradas depois de existirem lançamentos.

### Etapa B — Empresa e identidade
- Razão social, nome de exibição, CNPJ/identificação fiscal, endereço e abreviação.
- Associar o usuário atual por Supabase Auth; não confiar em e-mail digitado como identidade.
- Criar/associar empresa somente com autorização de bootstrap explícita e auditável.
- Nunca conceder SUPER_ADMIN apenas por passar pelo wizard.

### Etapa C — Fiscal, financeiro e custos
- Localização tributária e parâmetros fiscais aplicáveis, sem inventar regras legais.
- Plano de contas e centros de custo como configuração/revisão real, não checkbox sem efeito.
- Contas, bancos e saldos de abertura apenas por fluxos validados e conciliáveis.

### Etapa D — Operação industrial
- Depósitos/armazéns, unidades, produtos e fornecedores.
- Estruturas/fichas de processo, operações, máquinas, capacidade e calendários.
- Rastreabilidade por lote, inspeção da qualidade e custos.
- Integrações PCP/MRP, compras e vendas conforme as tabelas reais disponíveis.
- Checklist de pendências e responsáveis, sem criar dados fictícios para aparentar conclusão.

### Conclusão
- Resumo das configurações salvas, pendências, usuário responsável e timestamp.
- Revalidar sessão, empresa ativa, permissões e leitura/escrita com RLS.
- Liberar dashboard apenas quando os pré-requisitos obrigatórios forem confirmados; permitir salvar e retomar se houver pendências não bloqueantes.

## 5. Auditoria geral do ERP

A auditoria estática registrada em `docs/auditoria/AUDITORIA-VISUAL-PAGINAS-2026-10-26.md` inventariou **223 arquivos de páginas, 277 declarações de rota e 19 entradas congeladas**. O próprio relatório avisa que não equivale a inspeção visual no navegador.

Prioridades da auditoria:
1. Build/CI/rotas e erros bloqueadores.
2. Autenticação, SUPER_ADMIN, RBAC, RLS e isolamento por `empresa_id`.
3. Rotas duplicadas, componentes legados e diferenças entre código e produção.
4. Fluxos críticos: cadastro de empresa, Compras/RFQ/pedido, Vendas, estoque/rastreabilidade, PCP/ficha/máquinas, Qualidade/Paquímetro/RPNC, Financeiro, RH e Configurações.
5. Integridade transacional: pedido → compra → recebimento → estoque → produção → qualidade → expedição/faturamento → financeiro.
6. Responsividade e consistência visual, preservando o contrato de telas aprovadas.
7. Logs, mensagens de erro, observabilidade e smoke tests após deploy.

## 6. Regras técnicas obrigatórias

- Usar o cliente Supabase já existente; confirmar caminho/export antes de importar.
- Não usar mocks, `any`, cliente `service_role` no navegador ou dados pessoais predefinidos.
- Não gravar campos que não existam no schema real.
- RLS deve verificar a empresa e a autorização do usuário; FK simples não basta para garantir isolamento multiempresa.
- Preferir operações administrativas transacionais no backend autorizado, com idempotência e trilha de auditoria.
- Nunca redirecionar para o dashboard em `finally` após erro.
- Não executar migration de produção sem revisar dependências e autorização.
- Não editar componentes protegidos nem atualizar hashes do contrato de UI para contornar a trava.
- Commits e builds devem ser rastreados; produção só é declarada pronta com deployment `READY` e smoke tests.

## 7. Situação conhecida no início deste plano

- A documentação estática do ERP já lista 223 arquivos de página e 277 declarações de rota; a cobertura de navegador ainda não é completa.
- Na consulta de deployments de 29/10/2026, os cinco deployments mais recentes da branch `fix/restore-compras-configuracoes-20261028` estavam em `ERROR` e apontavam para commits anteriores ao HEAD conhecido dessa linha de trabalho.
- A consulta atual às ferramentas conectadas do Supabase retornou erro de permissão; portanto, o schema e as migrations aplicadas no projeto precisam ser verificados por um acesso autorizado antes de aplicar DDL.
- O exemplo enviado de `sistema_configuracao` ainda não está aprovado como schema de produção: não demonstra vínculo com `erp_empresas`, usuário autenticado nem políticas RLS; o segundo componente envia campos que não constam no SQL mostrado.

## 8. Definição de pronto

A entrega só pode ser marcada como concluída quando todos os itens aplicáveis forem evidenciados:

- [ ] Código e rotas integrados sem duplicar cliente Supabase ou fluxo de autenticação.
- [ ] Migration revisada e aplicada em ambiente autorizado; schema confirmado.
- [ ] Criação/associação de empresa e administrador testada com sessão real.
- [ ] Testes de isolamento: usuário de empresa A não lê/escreve dados de empresa B.
- [ ] Validação de formulário, estados de erro, retry e retomada.
- [ ] Módulos selecionados persistem em configurações reais; nenhum checkbox simula ativação.
- [ ] Type-check, lint e verificações de contrato/rotas passam.
- [ ] Ciclos operacionais críticos testados com dados reais de homologação.
- [ ] Telas congeladas permanecem intactas.
- [ ] Deployment Vercel em `READY`, SHA correto, URL conferida e smoke tests aprovados.
- [ ] Relatório final diferencia concluído, pendente e bloqueado por acesso/ambiente.

## 9. Próxima sequência de trabalho

1. Ler o código atual de Configurações/Instalação, autenticação e cadastro de empresa na branch de trabalho vigente.
2. Confirmar tabelas, colunas, funções e policies existentes por ferramenta autorizada ou migrations do repositório.
3. Confrontar isso com o inventário de rotas e com o último erro de build.
4. Implementar primeiro o menor caminho vertical seguro do wizard (empresa + usuário autenticado + persistência + retomada).
5. Ampliar para fiscal/industrial, testar e publicar em etapas.
