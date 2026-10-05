# Módulo Fiscal — inventário arquitetural inicial

**Estado deste documento:** levantamento do checkout e da implementação fiscal já iniciada; não representa conclusão nem prova de implantação das migrations.

## Arquitetura identificada

O projeto segue React/Vite/TypeScript → cliente Supabase/Edge Functions → PostgreSQL, com autenticação, tenant e permissões do ERP. Não foi encontrado motivo para introduzir backend, banco ou autenticação paralelos. As alterações fiscais em andamento reutilizam essa arquitetura.

## Mapa tela → serviço/RPC → persistência → segurança

| Fluxo | Tela/componente | Serviço/RPC/integração | Persistência e segurança observadas |
|---|---|---|---|
| Central e carteira de vendas | `src/pages/Fiscal.tsx` | `erp_liberar_item_fiscal`; chamada da Edge Function de emissão | Consulta pedidos (`erp_pedidos_venda`, itens), documentos fiscais e contas a pagar/receber. O código oferece integração operacional, mas não comprova que uma autorização fiscal atualize estoque ou financeiro. A definição da RPC `erp_liberar_item_fiscal` não foi localizada nas migrations versionadas. |
| Emissão e rascunho de NF-e | `src/pages/NFeEmissao.tsx` | `erp_salvar_rascunho_nfe`, reserva/claim/release propostos na migration `20261005120000_erp_fiscal_nfe_numbering_and_claim_v1.sql`, Edge Function `supabase/functions/emitir-nfe/index.ts` | `erp_documentos_fiscais` e `erp_documentos_fiscais_itens`; o código registra eventos em `erp_logs_sistema`. DDL-base das tabelas de cabeçalho não foi encontrada no conjunto local de migrations. |
| Provedor de emissão | Edge Function `emitir-nfe` | Notaas (`https://platform.notaas.com.br/api/v1`) | Usa segredo server-side `NOTAAS_API_KEY`; não é comunicação direta com SEFAZ. O código exige chave, protocolo, XML compatível e `cStat` 100/150 antes de classificar o documento como autorizado. Isso não verifica criptograficamente a assinatura do XML e o contrato/credencial externa não foram testados. |
| Carteira NF-e | `src/pages/FiscalCarteiraNFe.tsx` | Consultas Supabase e links assinados de storage | Documentos/protocolos de `erp_documentos_fiscais`; XML/DANFE só são disponibilizados se os arquivos existirem. |
| Pendências fiscais | `src/pages/FiscalPendencias.tsx` | Consulta Supabase | Rascunhos, processamento, rejeição e contingência. A rota lazy `/fiscal/pendencias` foi registrada em `src/AppEntryV2.tsx` durante este trabalho. |
| Regras tributárias | `src/pages/FiscalImpostos.tsx` | CRUD Supabase | `erp_regras_fiscais` e `erp_config_fiscal`; gravação depende das policies existentes para perfil administrativo. |
| Entrada de NF-e por XML | `src/pages/RecebimentoMateriais.tsx` | `erp_confirmar_recebimento_nfe(p_header, p_items, p_lotes)` | RPC transacional grava `erp_recebimento_notas`, `erp_recebimento_itens`, `erp_recebimento_lotes`, movimentos/rastreabilidade e auditoria. A tela interpreta XML com `DOMParser`; não foi encontrada validação de assinatura/XSD nem persistência do arquivo XML original nesse fluxo. A DDL-base das tabelas de recebimento não foi localizada no inventário de migrations. |

## Rotas e navegação encontradas

`src/AppEntryV2.tsx` contém `/fiscal`, `/fiscal/emissao`, `/fiscal/carteira-nfe`, `/fiscal/impostos` e `/fiscal/pendencias`, todas com imports lazy já registrados. `src/components/fiscal/FiscalSidebar.tsx` é a navegação fiscal existente. Não foram adicionadas rotas separadas para NFC-e, NFS-e, eventos, cancelamento, CC-e, inutilização, manifestação, livros ou DANFE independente; não há implementação/versionamento local suficiente para apresentá-las como fluxos disponíveis.

## Persistência fiscal e migrations versionadas

- `20260921140500_erp_nfe_legacy_tenant_helper_compatibility.sql`: fornece o alias legado `erp_current_company_id()` somente para o encadeamento histórico de migrations, delegando ao helper canônico `erp_current_empresa_id()` com `SECURITY INVOKER`.
- `20260921141000_erp_nfe_itens_form.sql`: cria `erp_documentos_fiscais_itens`, com FK para documento fiscal, vínculo opcional de produto, dados fiscais por item, verificações de valores/quantidade, índice por documento/empresa e policy tenant/master.
- `20260923113000_erp_fiscal_totais_danfe_v1.sql`: acrescenta campos de totais/documento e campos de itens às tabelas já existentes.
- `20260924210000_erp_nfe_rascunho_transacional_v1.sql`: migration histórica acrescenta campos e define `erp_salvar_rascunho_nfe`; a definição efetiva é substituída pela migration aditiva de hardening abaixo.
- `20260926190000_erp_fiscal_regras_v1.sql`: cria `erp_regras_fiscais`, com NCM, CFOP, UF, regime/tributos, vigência/ativo e índice de busca por empresa/NCM/CFOP/UF.
- `20261003161000_classificacao_fiscal.sql`: cria `erp_classificacao_fiscal` para NCM, alíquota e vigência.
- `20261003160000_fiscal_controladoria_core.sql`: cria `erp_fiscal_razao_lancamentos`, `erp_fiscal_documentos`, `erp_fiscal_grupos_contabeis`, `erp_fiscal_estornos` e a função `erp_fiscal_estornar_documento`; são estruturas de controladoria, não substituem a emissão de NF-e.
- `20260915020500_erp_recebimento_nfe_atomic_lotes_rastreabilidade_v2.sql`: cria/atualiza `erp_confirmar_recebimento_nfe`, associando o recebimento a lotes, estoque, rastreabilidade e `erp_audit_logs`.
- `20261004190000_erp_nfe_lock_after_submission_v1.sql`: migration local adicional com triggers que bloqueiam remoção/rebaixamento de NF-e e alteração de conteúdo/itens após sair de `Rascunho`; mantém updates operacionais da resposta externa separados. Não foi aplicada nem validada no banco remoto.
- `20261005120000_erp_fiscal_nfe_numbering_and_claim_v1.sql`: migration nova ainda não aplicada nem validada; propõe `erp_nfe_numeradores`, campos de CST PIS/COFINS/regime e funções transacionais de reserva e claim. Não inclui RPC de liberação de reserva/documento ambíguo.
- `20261005130000_erp_nfe_draft_tenant_permission_hardening.sql`: migration local aditiva que registra permissões RBAC fiscal; habilita e protege cabeçalhos, itens e notas NF-e com políticas permissivas e guardas restritivas de tenant; substitui a policy legada e a RPC `erp_salvar_rascunho_nfe`; exige usuário ativo, empresa, `fiscal.emitir`, cabeçalho rascunho no mesmo tenant, itens consistentes e produtos ativos do mesmo tenant; mantém gravação transacional e log. Não foi aplicada nem validada no banco remoto.

O diretório contém referências a `erp_documentos_fiscais`, `erp_notas_fiscais` e `erp_config_fiscal`, mas não foi encontrada nele a DDL-base dessas tabelas. Policies/hardening de `erp_config_fiscal` e `erp_notas_fiscais` estão presentes; a existência e o estado efetivos no projeto Supabase remoto não foram consultados. `erp_nfe_simulacoes` também é referenciada por migrations de hardening, sem DDL-base localizada neste levantamento. O inventário pesquisou 126 migrations SQL locais; isso não equivale a uma introspecção do banco implantado.

## RLS, RBAC e auditoria

- As migrations de itens fiscais usam isolamento por `empresa_id`/master e habilitam RLS. Regras tributárias e classificação fiscal também têm RLS/policies tenant/master. Configuração fiscal tem leitura tenant e escrita reservada a perfis administrativos por migrations de otimização/separação de policies.
- Migrations de hardening citam policies de `erp_notas_fiscais` e `erp_nfe_simulacoes`, porém não fornecem neste checkout suas DDL-base completas. Não se deve concluir que o schema remoto corresponde a esse conjunto.
- `erp_current_empresa_id()` é o único helper de tenant usado pela lógica final. O alias legado, necessário porque a policy histórica é processada antes da migration fiscal de hardening em instalações limpas, apenas delega a ele; a policy e a RPC finais usam diretamente o helper canônico. O banco remoto não foi consultado, então compatibilidade do schema implantado e resultado da migration permanecem sem confirmação.
- O fluxo novo da Edge Function verifica `erp_has_permission('fiscal','emitir')`; o catálogo efetivo de permissões depende do RBAC já existente e precisa ser validado no ambiente. Eventos registrados pelo frontend/Edge Function e `erp_audit_logs` do recebimento não formam, por si só, um histórico fiscal imutável/versionado completo.

## XML, DANFE, certificado e SEFAZ

O código existente chama o integrador Notaas. Não foram encontradas migrations locais para versionamento/eventos normalizados de XML fiscal, certificado A1, cancelamento, CC-e, inutilização ou manifestação. O fluxo de entrada por XML já atualiza recebimento/estoque por RPC, mas não equivale à emissão de saída.

Até obter retorno externo verificável, emissão, cancelamento e demais eventos não podem ser declarados autorizados. Arquivo XML com chave/protocolo/código de status recebido do integrador é uma confirmação de contrato da aplicação; não é, isoladamente, verificação criptográfica nem consulta independente da SEFAZ. A configuração de certificado e o comportamento real do tenant/provedor ainda dependem de validação segura no ambiente.

## Referências abertas e licenças

- [NFePHP/sped-nfe](https://github.com/nfephp-org/sped-nfe): referência técnica para montagem/assinatura, validação XSD, comunicação e operações de NF-e/NFC-e; a licença do pacote declara LGPL-3.0 e MIT. [sped-common](https://github.com/nfephp-org/sped-common) documenta suporte a certificado PKCS#12/A1 e validação XML; [sped-da](https://github.com/nfephp-org/sped-da) cobre documentos auxiliares/DANFE. São referências conceituais; nenhum código desses projetos foi copiado.
- [ACBr](https://github.com/ProjetoACBr/ACBr) redireciona para um espelho que se identifica como não oficial. Os arquivos de licença encontrados no espelho são específicos de diretório/componente: `Doctos/LICENSE.TXT` contém GPL-2.0 e `Projetos/ACBrMonitorPLUS/Lazarus/LICENSE.TXT` contém LGPL-2.1. Isso não estabelece uma licença única para todo o repositório; licença e termos do componente exato teriam de ser confirmados antes de qualquer uso.
- O endereço Sebrae consultado redirecionou para a página genérica de conteúdos. Não foi possível verificar ali um manual atual do emissor fiscal do Sebrae; o fluxo proposto pelo usuário foi mantido como requisito funcional, não como conteúdo atribuído ao Sebrae.
- As referências OCA/MeyerThorsten/QAtrial/Awesome-Quality-Management-System/OpenQMS mencionadas em pedidos anteriores pertencem a SGQ/eQMS e não são base técnica para emissão fiscal; nenhuma delas foi usada como fonte de código.

## Lacunas e sequência antes de ampliar a emissão

1. Confirmar o schema remoto e obter/identificar as DDL-base e policies implantadas de cabeçalho fiscal, configuração e recebimento; esclarecer a disponibilidade do helper de tenant e da RPC de liberação usada por Vendas.
2. A rota lazy `/fiscal/pendencias` já foi registrada; revisar o contrato de integração da central de Vendas com a Edge Function.
3. Validar a migration de numeração contra schema real e números já usados; provar atomicidade da reserva e tratar emissão presa em processamento com reconciliação, sem mudar estado fiscal sem retorno real.
4. Confirmar, sem expor segredo, a configuração/contrato do provedor e testar o caminho de homologação autorizado. Bloquear campos obrigatórios ausentes e regras tributárias não parametrizadas; não inventar dados nem alíquotas.
5. Só então decidir quais partes de transporte, pagamento, impostos complexos, eventos, importação XML validada e DANFE são suportadas por dados e integrações reais. NFC-e/NFS-e permanecem fora do suporte demonstrado até haver provider/leiaute e configuração confirmados.

**Status:** AMARELO. O checkout contém fluxos parciais de emissão, configuração tributária e entrada por XML, mas falta schema remoto confirmado, validação/build/testes executáveis, confirmação do integrador e cobertura de vários eventos fiscais. A pendência de rota foi resolvida, mas a emissão e a integração fim a fim ainda não devem ser declaradas concluídas.

**Matriz de completude funcional:** consulte [`docs/FISCAL_MATRIZ_COMPLETUDE.md`](./FISCAL_MATRIZ_COMPLETUDE.md) para o levantamento campo/ação/tela → serviço → tabela/migration → status, incluindo os grupos requeridos para NF-e, dimensões estáticas, recebimento XML, eventos não implementados e bloqueios de schema/provedor.

## Auditoria visual e funcional das telas fiscais existentes

Esta auditoria antecede novas telas. Foram comparadas as páginas efetivamente roteadas, componentes ERP compartilhados e os tokens globais do checkout.

### Régua visual encontrada antes da padronização

- `src/styles/erp-design-system-2026.css` declarava campo de 42 px, fonte de campo 14 px, label 12 px, linha 40 px e cabeçalho de grid 38 px; as regras só atingiam páginas com `.erp-dense`, classe não usada pelas telas fiscais auditadas.
- `src/components/ui/erp-ui.css` tinha três alturas diferentes para botões (34/40/46 px) e três para botões de ícone (32/38/44 px). `src/styles/index.css` também define mínimo genérico de 42 px para botões.
- `NFeEmissao.tsx` é a tela ativa de emissão, mas contém uma folha de estilos inline conflitante: inputs/selects de formulário e grid são reduzidos a 28 px; texto do grid chega a 10 px; ações também são 28 px. Labels têm 9 px e peso 950. O grid fixa larguras de 36 a 240 px e força `min-width:1730px`; exemplos de colunas menores que o conteúdo esperado são unidade 45 px, CFOP 58 px, quantidade 62 px, NCM 72 px, valores 75–85 px e ações 36 px. Datas e montantes não têm classes semânticas de largura.
- A Central Fiscal usa texto-base `text-base`, cabeçalho `text-3xl`, cartões grandes, espaçamentos de 16–24 px e botões com alturas 40/44 px. Carteira, Pendências e Regras Tributárias usam headers e filtros de 12–14 px, controles `h-9` e tabelas com mínimos fixos (720/850/980 px). Os pesos e alturas não são os mesmos entre essas páginas. Carteira/Pendências limitam leitura em 500 registros sem paginação.
- A previsão de caixa tem outra linguagem (títulos 3xl, cards grandes e `h-11`), além de uma verificação de acesso por perfil/setor própria da tela; isso não foi tratado como mecanismo de autorização novo nem como parte da emissão fiscal.
- `FiscalEmissao.tsx` era uma implementação órfã com total fixo de R$ 0,00, natureza presumida e botões sem fluxo real; após confirmar que não havia import/rota local, foi removida. A emissão ativa permanece em `NFeEmissao.tsx`, sem promover a tela legada.

### Cobertura funcional da emissão (tela ativa)

Os cinco passos atuais são Dados Gerais, Emitente/Destinatário, Itens, Tributação Detalhada e Transporte/Totais. O formulário dispõe de modelo 55 no título, número/série/data de emissão/saída/natureza/CFOP/tipo/ambiente, resumo do emitente, seleção e dados básicos de destinatário, itens com código/descrição/NCM/CFOP/CST-CSOSN/unidade/quantidade/preço/desconto/origem/alíquotas e lote, totais manuais de ICMS/ST/IPI/PIS/COFINS e campos básicos de transporte.

Campos do processo pedidos e não representados de forma completa no formulário/persistência verificados: finalidade, indicador de presença, consumidor final, documento referenciado; emitente com IE e endereço fiscal discriminado; número/complemento e indicador de IE do destinatário; CEST, seguro/outras despesas/frete por item, CST IPI e bases/valores fiscais calculados por item; tributos adicionais (FCP/DIFAL/retenções); indicador/forma/valor/troco/parcelas de pagamento; informações fiscais/complementares e observação interna separadas; eventos e histórico de alterações na própria tela. O total atual combina produtos, frete, outras despesas, IPI, ICMS-ST e desconto a partir de campos locais; não há cálculo tributário completo demonstrado nem envio dos elementos de pagamento/referência listados ao provedor.

### Régua única adotada para os ajustes seguintes

Sem trocar a identidade azul institucional nem reescrever o ERP: controles de formulário com altura uniforme de 40 px em desktop e 44 px em telas touch; tipografia operacional 13–14 px, labels 12 px em peso regular/médio, títulos de página 22–24 px e títulos de seção 15–16 px; ações primárias/secundárias com altura igual e raio de 2 px; botões iconográficos quadrados e com nome acessível; filtros em faixa alinhada; grids com altura de linha 38–40 px, cabeçalhos 36–38 px, colunas dimensionadas para conteúdo e rolagem horizontal explícita quando a densidade fiscal exigir.

As larguras são semânticas, não estimadas por placeholder: data 160 px; data/hora 210 px; série 88 px; número 140 px; UF 72 px; CEP 112 px; CFOP 110 px; NCM 130 px; CST/CSOSN 120 px; CPF/CNPJ 210 px; IE 190 px; quantidade 160 px; percentual 130 px; moeda 170 px; descrição/nome/razão social/endereço flexíveis com mínimo útil. O layout deve ser verificado em telas estreitas sem ocultar dígitos nem criar uma coluna vertical única.

Esta régua é um critério de implementação e revisão, não uma alegação de que a emissão passou a cobrir os campos ausentes. Qualquer dado sem coluna, RPC ou contrato de provedor comprovado continua pendente e não pode ser simulado.

### Ajustes de padronização já aplicados

- Tokens de `erp-design-system-2026.css`: campo/ação padrão 40 px, linha 38 px, cabeçalho 36 px e título 24 px; telas touch usam 44 px. Foram adicionadas larguras semânticas para códigos, série/número, documentos, datas, quantidades, percentuais, valores e textos.
- `ERPButton` e `ERPIconButton` usam a mesma medida por breakpoint. As páginas fiscais principais foram marcadas para herdar tipografia, controles, raios, densidade e espaçamento comuns; as rotas de classificação, auditoria documental, grupos contábeis e estornos também receberam o escopo compartilhado. A escala de texto utilitário e o wrap de toolbars foi uniformizado, preservando a paleta e os fluxos existentes.
- A tela NF-e recebeu larguras semânticas nos campos ativos e uma grade de itens dimensionada para conteúdo, com coluna de número do item e rolagem horizontal; nenhum campo novo foi gravado sem persistência correspondente.
- Tipo de operação e ambiente deixaram de ser pré-selecionados. Seleção de produto não inventa código, unidade, quantidade ou preço ausentes no cadastro; a validação impede avançar quando unidade/tipo/ambiente não estão informados.
- A rota da fila foi conectada. O contrato da central de Vendas foi alinhado ao JSON efetivamente retornado pela Edge Function, e a interface não apresenta rejeição oficial só por receber um `cStat` numérico em resposta não verificada do provedor.
- A Edge Function mantém respostas externas ambíguas em `Processando`; a central só oferece transmissão para `Rascunho`. Isso evita converter falha/timeout em rejeição ou autorização, mas ainda falta reconciliação segura desses documentos.
- A tela de previsão de caixa agora verifica e apresenta falhas de autenticação, perfil e consulta Supabase, em vez de exibir uma lista vazia como se fosse resultado válido.
- A identificação da Central Fiscal foi corrigida: o título anterior “SGQ • CORE TRIBUTÁRIO” foi substituído por “ERP • MÓDULO FISCAL”.
- A grade de itens da emissão agora exibe o subtotal calculado por item sem tributos, usando traço enquanto quantidade/preço não formarem um total válido; a tabela ganhou largura mínima compatível com a nova coluna.
- O resumo de impostos e transporte identifica o valor calculado localmente como total provisório do rascunho e avisa que não substitui a totalização do provedor nem representa autorização fiscal; o cálculo parcial existente ainda é persistido para o rascunho, portanto o fluxo não foi promovido a totalização fiscal completa.
- A auditoria das rotas fiscais alcançou também classificação, auditoria documental, grupos, estornos e o alias de razão geral. O gerador de grupos contábeis, que persistia nomes/códigos constantes de demonstração e ignorava um parâmetro, foi substituído por bloqueio explícito até haver plano de contas aprovado; não grava mais linhas fictícias.
- Foi proposta proteção no banco contra alteração/exclusão de NF-e e itens ao sair de `Rascunho`, inclusive na própria atualização que inicia o processamento; impede rebaixar um documento já processado e bloqueia alterações fiscais feitas simultaneamente à mudança de estado. A comparação inclui também `valor_liquido`, total adicionado pela migration fiscal local; ainda requer conferência da DDL-base efetiva, validação PostgreSQL e aplicação antes de proteger o ambiente real.
- A página de classificação fiscal valida agora NCM com oito dígitos, alíquota digitada explicitamente entre 0 e 100 e data-calendário válida; isso valida os dados inseridos, mas não os conecta ao motor tributário nem atesta a alíquota legal.
- A tela de estorno explicita que registra solicitação e não executa reversão/cancelamento; a auditoria documental confirma a exclusão em massa, e o campo de justificativa usa largura mínima responsiva.
- A grade NF-e permite remover qualquer linha, inclusive a última; nesse estado, orienta a adicionar um item, e `validate()` continua bloqueando salvar/transmitir sem item válido. O botão anuncia o número da linha para leitores de tela.
- A proteção de conteúdo também verifica a atualização que sai de `Rascunho`, recusando mudança de dados fiscais nessa mesma transição; a comparação estática encontrou 38 campos em ordem idêntica no lado `new`/`old`.
- A emissão agora expõe “Solicitar transmissão”: confirma o ambiente/número, valida e salva o rascunho atual antes de invocar a Edge Function. O cliente só reconhece `Autorizada` quando a resposta contém status reconhecido, chave de 44 dígitos, protocolo e caminho de XML armazenado; após falha, cruza `erp_documentos_fiscais` com `erp_notas_fiscais` e exige chave/caminho compatíveis e protocolo presente antes de mostrar o estado autorizado. Estados ambíguos ou registros inconsistentes bloqueiam novas tentativas. Isso não prova a SEFAZ nem implementa reconciliação independente.
- CPF/CNPJ do destinatário passou a ter validação matemática dos dígitos verificadores tanto no formulário quanto na Edge Function, antes da reivindicação/transmissão. Isso não consulta a Receita Federal. O cálculo aceita a forma alfanumérica de CNPJ, mas a Edge Function a bloqueia com `INTEGRAÇÃO EXTERNA PENDENTE` até confirmar suporte no contrato Notaas; nenhum valor de documento de exemplo foi persistido.
- A tela e a Edge Function recusam transmitir `NF-e Entrada`: o adaptador existente chama o endpoint de emissão de saída e não mapeia importação/entrada nesse request. Documento de entrada continua no fluxo separado de importação/recebimento XML.
- O recebimento por XML exige, no parser da tela, chave NF-e de 44 dígitos com dígito verificador válido e protocolo `infProt` correspondente com `cStat` 100/150 antes de preencher itens/lotes; compara também chave com modelo/série/número/CNPJ do emitente, valida dados essenciais dos itens e calcula SHA-256 dos bytes, enviado ao RPC existente. O RPC persiste hash/nome, recebimento, estoque/lotes/rastreabilidade e auditoria transacional, mas não revalida hash/chave/protocolo no servidor e não há persistência local comprovada do XML original. Assinatura digital, XSD e consulta externa não são verificados; entrada manual segue disponível, portanto esse fluxo não equivale a importação fiscal autenticada.
- As prévias fiscais de `src/PublicIndustrial.tsx` e `src/pages/FiscalPublic.tsx` não consultavam documentos reais e exibiam identificadores/valores/status fictícios. Esses dados foram removidos; as áreas agora comunicam indisponibilidade e não são declaradas como rotas ativas.
- Consumidores do status NF-e em Vendas, Diretoria e Expedição foram alinhados ao literal `Autorizada` gravado pela Edge Function; o painel de Vendas não conta `100` ou `processada` isoladamente como autorização. Compatibilidade com dados legados/capitalização no Supabase remoto não foi verificada.
- Repetiram-se sete asserções estáticas PowerShell focadas (subtotal da linha, largura/estrutura da grade, triggers pendentes incluindo `valor_liquido`, ausência de gravação demonstrativa, aviso de estorno, wrapper da rota fiscal e validações da classificação): **7/7 passaram**. Também foi conferido que a grade tem 21 colunas alinhadas entre larguras, cabeçalhos e células, com soma de larguras declaradas de 2788 px; após a ação de remoção de linha, há um `<td>` adicional para o estado vazio. Checks estáticos da remoção e bloqueio da última linha vazia passaram. Isso não substitui testes de navegador nem valida TypeScript/SQL.

## Resultado da validação disponível neste checkout

**VALIDAÇÃO AUTOMÁTICA BLOQUEADA — NODE/NPM AUSENTE.** Tentativa de instalação: `npm ci --legacy-peer-deps --no-audit --no-fund` — bloqueada antes do início do comando npm porque `npm` não está instalado/no `PATH`. O bloqueio literal do PowerShell é: `O termo 'npm' não é reconhecido como nome de cmdlet, função, arquivo de script ou programa operável. Verifique a grafia do nome ou, se um caminho tiver sido incluído, veja se o caminho está correto e tente novamente.` `node`, `npx`, `tsc` e `eslint` também não foram encontrados.

Comandos solicitados tentados, todos bloqueados pelo mesmo erro antes de iniciarem seus scripts: `npm run type-check`, `npm run lint:check`, `npm run build:vercel`, `npm run build`, `npm run verify:lazy-imports`, `npm run verify-routes` e `npm run audit:all`. Portanto, não há resultado PASS/FAIL de compilação, lint ou auditoria; o erro é de ferramenta ausente, não um resultado do código.

Scripts relevantes existentes em `package.json`: `type-check` (`tsc --noEmit`), `lint:check` (`eslint . --ext .js,.jsx,.ts,.tsx`), `build:vercel` (`vite build --emptyOutDir`), `build` (`tsc && vite build --emptyOutDir`), `verify:lazy-imports` (`node scripts/verify-lazy-imports.mjs`), `verify-routes` (`node scripts/verify-routes.mjs`), `audit:all` (executa `audit:brutal`, `audit:global` e `audit:interactions`) e `audit:security` (executa `audit:global` e `audit:brutal`). `audit:all` é o alvo completo de auditoria configurado; `audit:security` é um script separado e não o alias de `audit:all`.

Correções estáticas verificadas por leitura do código: registro da rota e import lazy existentes em `src/AppEntryV2.tsx`; `FiscalPendencias` tem export default; ambiente/tipo/unidade não são presumidos em `src/pages/NFeEmissao.tsx`; consultas com erro na previsão de caixa são reportadas em `src/pages/FiscalPrevisaoCaixa.tsx`; e a Edge Function não transforma respostas HTTP ambíguas em status fiscal confirmado em `supabase/functions/emitir-nfe/index.ts`. Essas inspeções não substituem os gates automatizados de resolução de imports/casing, rotas, TypeScript, ESLint e build, que permanecem sem resultado por falta do runtime.

Não foi feito commit; o checkout é folder-backed e não contém repositório Git.
