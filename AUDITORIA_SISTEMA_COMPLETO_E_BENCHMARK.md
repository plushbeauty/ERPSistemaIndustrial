# AUDITORIA GLOBAL, VISUAL E BENCHMARK — SYSNQRA ERP INDUSTRIAL

**Atualização verificada:** 27/11/2026 · **PR #329** · branch `fix/consolidacao-global-padrao-ouro-20261124`  
**HEAD auditado:** `d15d79e07bef2e22ce742e3c570328940115bca6`

## 1. Resultado executivo e escopo comprovado

Este documento separa evidência automatizada, evidência do schema vivo e itens ainda não homologados. A presença de uma rota, formulário ou menu não significa que o fluxo esteja completo. “Pronto 100%” exige persistência real, tenant/RLS, autorização, tratamento de falha e teste funcional ponta a ponta.

### Validações do commit auditado

O GitHub Actions **ERP Industrial CI**, execução `45879404120` / `11029`, concluiu **success** no job P0 — Full Release Gate. Passaram: lock de telas oficiais, contrato SQL de migrations, Auth Master, TypeScript, ESLint, auditorias global/brutal/interações, lazy imports, build, build-output, rotas, contrato tablet SGQ, shell horizontal, assets e UI aprovada. O status combinado do commit é `success`.

A verificação de rotas do build anterior reportou 334 rotas e 193 imports lazy. Isso comprova resolução estática, não execução real de todas as jornadas.

### Estado de branch, PR e deploy

- Branch HEAD: `d15d79e07bef2e22ce742e3c570328940115bca6`
- PR #329: aberta.
- Vercel Preview desse mesmo SHA: **READY**, deployment `dpl_D36UvwhNJ7BrMkishfuaVtMqFBK6`.
- URL Preview: https://erp-sistema-industrial-efjtte2kb-plushbeauty.vercel.app
- Não é o domínio de produção e não equivale a publicação em produção.

## 2. Auditoria visual — inputs, edits, fontes, cores e responsividade

### Tokens existentes identificados

`src/styles/sysnqra-premium-tokens.css` fornece tokens de superfície, texto, borda, input, ring, estado e paleta oficial (`#F4FBFD`, `#123B50`, `#2D8DB8`, `#48B7C7`, `#3A9D78`, `#E6A34A`, `#D65B61`, `#D3E3EA`). Classes compartilhadas existentes incluem `.erp-input`, `.erp-label`, `.erp-card` e `.erp-btn`. `tailwind.config.ts` e esse CSS são a fonte normativa para novos ajustes; cores ad hoc não devem ser introduzidas.

### Resultado do scanner de interação disponível no CI

O log do gate informa **15 arquivos/rotas analisados por esse scanner específico**, zero falhas bloqueantes e nove warnings. Foram detectados botões/links de edição sem classe compartilhada em:
- `src/pages/RHSubmodules.tsx`
- `src/pages/PCPFichasProcesso.tsx`
- `src/pages/AccessControlSettings.tsx`
- `src/features/comissoes/PerfilVendedor.tsx`
- `src/pages/QualidadeAuditoriasPlanta.tsx`
- `src/pages/DocumentosQualidadeControle.tsx`

Marcadores mock/fake/TODO/FIXME/temporário a revisar, sem concluir automaticamente que representam dados ativos:
- `src/pages/VendasDashboardGraficos.tsx`
- `src/pages/CentralEvolucao.tsx`
- `src/pages/DiretoriaDashboard.tsx`

O scanner de interação é estrutural e parcial; não mede pixel, não calcula contraste de cada estado e não valida a largura de cada campo em 1440/768/360px.

### Corrigido e confirmado nesta entrega

- `src/components/layout/ERPHorizontalShell.tsx`: ação contextual do configurador de etiquetas em Estoque/Almoxarifado, preservando páginas com hash oficial.
- `src/components/print/ConfiguracaoEtiquetaModal.tsx`: formulário/preview de etiqueta, QR renderizado no navegador, dimensões e orientação.
- `src/components/print/PrintLayoutManager.tsx`: suporte de layout de impressão retrato/paisagem.
- `src/utils/thermalLabelGenerator.ts`: saída de etiquetas nos formatos implementados no código e validação de largura.
- `src/hooks/useDadosReaisEtiqueta.ts`: consulta de dados cadastrais reais, sem fixtures.
- `supabase/migrations/20261126_etiquetas_e_setup_molde.sql`: migration aditiva versionada para templates e troca de molde.

**Não certifico como concluída** a correção de proporção de todos os inputs, contraste WCAG 2.2 AA em todos os estados, altura 34px desktop/44px touch ou o ajuste pixel a pixel em todas as telas. O CI não fornece evidência visual suficiente para essa declaração e a varredura visual completa ainda precisa ser executada em runtime com captura de telas. Não altere telas protegidas sem procedimento de atualização controlada do manifesto.

## 3. Schema Supabase — consulta somente leitura

Projeto consultado: `zsklkydlawgvwgnvxwwx`, status `ACTIVE_HEALTHY`. Consulta em `information_schema.columns` foi somente leitura.

### Colunas reais relevantes confirmadas

- `erp_empresas`: `razao_social`, `cnpj`, `logo_url`, `logo_impressao_url`, `endereco`, `cidade`, `uf`, `cep` e outros campos retornados pelo catálogo.
- `erp_clientes`: `razao_social`, `nome`, `documento`, `endereco`, `cidade`, `estado`, `cep` e campos cadastrais retornados.
- `erp_pcp_paradas`: atualmente o catálogo vivo retornou `molde_id`, `setup_changeover` e os demais campos listados; **não retornou** `molde_anterior_id` nem `molde_novo_id`.
- `erp_label_templates`: **não retornou colunas**, portanto a tabela não existe no schema público consultado ou ainda não foi exposta/criada.
- `erp_usuarios`: colunas reais incluem `auth_user_id`, `empresa_id`, `perfil`, `nivel_admin`, `is_master`, `ativo`, `role_id`, `setor_id`, `login_nome`, `matricula` e demais colunas retornadas.
- `erp_roles`: usa `company_id`, `name`, `codigo`, `nome`, `nivel`, `ativo`.

Não inferir coluna ausente nem tratar arquivo de migration como prova de aplicação remota.

### Estado operacional de migration e Edge Function

A migration `20261126_etiquetas_e_setup_molde.sql` está no repositório, mas o catálogo vivo consultado ainda não contém a tabela de templates nem os dois campos de molde. **Não foi aplicada nesta execução.** Nenhuma DDL, dado ou registro Master foi alterado no Supabase. A função `erp-user-admin` tem fonte versionada; deploy da Edge Function não foi executado nesta etapa.

## 4. Benchmark de mercado — critérios de paridade

| Área | SYSNQRA: evidência / pronto parcial | Para atingir paridade funcional robusta |
|---|---|---|
| Engenharia & Produto | Cadastro, ficha de processo e estrutura/BOM presentes no sistema; sem certificação de BOM multi-nível e revisão de engenharia integral | BOM multi-nível versionada, alternativos, roteiro/revisão, parâmetros específicos de injeção plástica, borracha/vulcanização e estampagem de cobre; rendimento/perda por operação; retorno de moagem/sucata com pesagem, crédito de custo e genealogia |
| PCP & MRP | Filas PCP, pedidos pendentes, programação e rotinas de necessidade existentes | MRP temporal por demanda, BOM e estoque disponível/reservado/previsto; regras make/buy/subcontratar; bloqueio transacional; SC/OP sugerida e aprovada; lote diário por processo e rateio por pedido auditável |
| MES / Chão de Fábrica | Portal operador, apontamentos, paradas e estrutura de setup existentes | validação operador/crachá/turno; produção boa/refugo; consumo real por lote; coleta de máquina; tempos de ciclo/setup; troca de molde persistida; OEE e trilha de aprovação |
| Estoque / Expedição | Estoque, lotes, movimentações e páginas/rotinas de etiquetas | endereçamento por localização; FEFO por lote/validade; inventário com dupla contagem e aprovação; bloqueios e reserva; genealogia reversa MP→OP→PA→NF/cliente; etiquetas testadas em cada driver/modelo e DPI |
| Compras / Recebimento | Requisição, cotação/pedido e recebimento em módulos do sistema | XML NF-e importado e conciliado com pedido/fornecedor/itens; conferência quantitativa e qualitativa; divergência, lote, validade e custo integrados |
| SGQ | Rotinas de inspeção, RNC/RPNC e evidências presentes | controle documental com revisão/obsolescência; calibração e vencimento; Ishikawa, 8D, CAPA; responsáveis, prazos, anexos, eficácia, auditoria e encerramento formal |
| Financeiro / Fiscal / Multiempresa | módulos e arquitetura tenant/RLS existentes; CI cobre contratos de segurança declarados | conciliação bancária/fiscal, fechamento e integrações; RBAC validado em cada rota/RPC/Edge; isolamento cross-tenant testado por testes negativos e relatórios de auditoria |

### Referências comparadas

- **TOTVS Protheus:** MRP considera demanda e posição de estoque por período e gera documentos de planejamento, incluindo OP ou solicitação de compra conforme a estrutura/configuração; não se deve confundir sugestão de MRP com pedido de compra aprovado. Referência: https://centraldeatendimento.totvs.com/hc/pt-br/articles/56854206032147-Manufatura-Linha-Protheus-SIGAPCP-Documentos-gerados-pelo-MRP e https://centraldeatendimento.totvs.com/hc/pt-br/articles/1500012938642-Manufatura-Linha-Protheus-SIGAPCP-C%C3%A1lculo-de-necessidade-no-MRP
- **SAP Business One:** MRP trabalha com BOM hierárquica, demanda, estoque, pedidos e ordens existentes, lead times e parâmetros de planejamento; produção contempla consumo real e custos adicionais. Referências: https://help.sap.com/docs/SAP_BUSINESS_ONE/68a2e87fb29941b5bf959a184d9c6727/44e98a287851363de10000000a1553f6.html e https://help.sap.com/docs/SAP_BUSINESS_ONE/68a2e87fb29941b5bf959a184d9c6727/44f29313df7365fbe10000000a1553f7.html
- **Omie:** documentação de Compras/Estoque/Produção confirma fluxo de notas recebidas e acesso/exportação de XML; o benchmark é de integração comercial e documental, não MES avançado. Referência: https://ajuda.omie.com.br/pt-BR/articles/11870042-exportando-o-xml-das-nf-es-compras-estoque-e-producao
- **Bling:** benchmark de simplicidade operacional, catálogo, estoque, pedidos e impressão; a paridade industrial deve ser julgada nos controles de lote, custo e chão de fábrica, não apenas nas funções comerciais.
- **SoftExpert EQM:** referência de SGQ para documentos, auditoria, não conformidade, CAPA e eficácia; a comparação deve exigir ciclo governado e evidências, não somente formulário RNC.

A comparação é funcional e baseada em documentação pública, não em teste de produto concorrente nem declaração de equivalência certificada.

## 5. Pendências bloqueadoras para declarar “100% completo”

1. Aplicar e verificar a migration de templates/setup em ambiente autorizado; o schema vivo consultado ainda não reflete esses objetos.
2. Implantar e testar a Edge Function atualizada, com teste de autorização e isolamento por empresa.
3. Realizar auditoria visual de runtime em todas as páginas/formulários, incluindo os seis arquivos com warnings de ação Edit; medir contrastes, placeholders, disabled, badges, tabelas e responsividade em 1440/768/360px.
4. Confirmar que o código de etiquetas emite comandos nativos válidos para cada impressora/linguagem suportada. QR nativo em PPLA/PPLB e fluxo real de impressão não são considerados certificados por preview/browser print.
5. Integrar e testar consulta de produto/OP/pedido/lote/NF no formulário de etiqueta, usando apenas campos confirmados no schema.
6. Executar testes transacionais de BOM/MRP, bloqueio/reserva, FEFO, inventário de dupla contagem, genealogia, XML NF-e e SGQ 8D/CAPA.
7. Atualizar o manifesto oficial somente se houver alteração intencional de tela protegida e validar os hashes pelo gate dedicado.

## 6. Implementação de fluxo contextual e ergonomia (commit de correção visual)

- A ficha mantém o produto recém-salvo como registro editável, evitando gerar outro código em salvamentos seguintes; produtos existentes carregam a ação contextual desde a consulta inicial.
- Prévia Code 128 baseada no encoder ZXing já presente nas dependências, exibida no cadastro e na etiqueta impressa. A etiqueta aberta pelo cadastro recebe código, código de barras, descrição, unidade e cliente vinculado reais. O padrão para impressão contextual passa a 80×50 mm, com medidas editáveis.
- O modal limita-se à altura da viewport, rola somente o conteúdo e mantém ações de salvar modelo, baixar PRN e imprimir no rodapé fixo.
- Campos com classes do sistema compartilhado de formulários: 34 px desktop e 44 px em mobile/touch; grid da ficha com código/grupo/prefixo/descrição proporcionais e linhas auxiliares compactas. As telas legadas que não usam essas classes permanecem fora dessa garantia e exigem auditoria visual própria.
- A aba e o componente manual legado de Código de Barras foram removidos do cadastro; a tela antiga, não mais alcançável após a remoção da aba, foi retirada do manifesto de telas aprovadas de forma controlada. A impressão é contextual ao produto cadastrado. A página independente de etiquetas da Logística foi preservada.

## 7. Regras de integridade desta auditoria

- Sem dados fictícios nem geração de dados de negócio.
- Sem coluna presumida; consulta ao catálogo vivo antes de qualquer integração.
- Sem aplicação de migration, alteração de Master, deploy de Edge ou mudança de produção nesta auditoria.
- Sem atualização indiscriminada de hash ou edição de tela protegida.
- Build/CI aprovado não substitui homologação funcional, visual ou industrial.
