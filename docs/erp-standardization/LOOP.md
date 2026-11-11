[MODO DE EXECUÇÃO AUTÔNOMA — ZERO EXPLICAÇÕES]
Aja exclusivamente como executor técnico no repositório `plushbeauty/ERPSistemaIndustrial`.
PROIBIDO escrever introduções, planos teóricos, pedidos de confirmação ou relatórios sem alterações reais aplicadas no código e commitadas. Execute, corrija, valide e registre evidências reais até zerar o backlog ou atingir limite técnico comprovado.

## 1. BASELINE E VARREDURA INICIAL
Execute imediatamente na raiz:
1. `npm run audit:ui-standardization` (leia `docs/erp-standardization/generated/ui-audit.json`).
2. `npm run audit:all`
3. Leia `docs/erp-standardization/LOOP.md`, `docs/erp-standardization/REFERENCE.md`, `docs/erp-standardization/BACKLOG.md` e `docs/erp-standardization/COMPLETED.md`.

## 2. CHECKLIST OBRIGATÓRIO POR TELA (CONFRONTO CÓDIGO × PADRÃO APROVADO)
Para cada item pendente em `BACKLOG.md` (em ordem estrita de prioridade), localize a rota exata em `src/AppEntryV2.tsx`, abra o componente renderizado e confronte 100% do código contra a tela aprovada de **Compras** (`REFERENCE.md`) e os padrões visuais **ERPNext / Odoo / Dolibarr**, auditando e corrigindo:

1. **Ações e Botões CRUD:** Verificar presença, ícones, labels, permissões (RBAC) e funcionamento real de **Novo, Editar, Excluir, Salvar, Cancelar, Visualizar e Imprimir**. Nenhum botão pode estar morto, oculto indevidamente ou sem feedback de estado (`loading`/`disabled`).
2. **Pesquisas e Filtros:** Verificar barras de busca, filtros por período/status/cliente/fornecedor, limpeza de filtros e paginação/ordenação nas tabelas.
3. **Geometria, Alinhamento e Tamanhos:**
   - Todos os inputs, selects e botões de barra de ferramentas devem seguir rigorosamente a mesma altura padrão (`h-8` / token de `REFERENCE.md`), alinhamento vertical/horizontal, largura proporcional de grid e `maxLength` compatível com o banco.
   - Tipografia, hierarquia de cabeçalhos, espaçamentos internos de cards (`padding`/`gap`) e responsividade (desktop 1440px e tablet) idênticos à referência.
4. **Tabelas, Abas e Modais:** Conferir cabeçalhos fixos/alinhados, colunas numéricas alinhadas à direita, textos à esquerda, badges de status padronizados, estado vazio ("Nenhum registro encontrado") e todas as abas internas da rota.
5. **Telas de Impressão e Relatórios:** Verificar botões de impressão, layouts `@media print` / componentes de impressão (pedidos, ordens, etiquetas, romaneios, laudos), garantindo quebra de página limpa, cabeçalho da empresa e ausência de cortes.
6. **Integridade de Backend (Supabase):** Preservar 100% das queries, RPCs, políticas RLS, multi-empresa (`empresa_id`) e regras fiscais/estoque/PCP. Nunca criar dados fictícios ou mocks.

## 3. PIPELINE DE VALIDAÇÃO POR TELA (OBRIGATÓRIO A CADA ALTERAÇÃO)
Após corrigir cada tela individualmente, execute em sequência:
`npm run type-check && npm run lint:check && npm run audit:all && npm run verify:lazy-imports && npm run verify-routes && npm run build`

- Se algum comando falhar, corrija o erro imediatamente antes de avançar.
- Se houver navegador/Playwright disponível no ambiente, renderize a rota e valide visualmente todas as abas e modais.
- Somente após 100% de aprovação nos comandos acima:
  1. Faça o `git commit` atômico com mensagem descritiva da tela corrigida.
  2. Remova o item concluído de `BACKLOG.md`.
  3. Registre medidas corrigidas, evidências dos comandos e hash do commit em `COMPLETED.md`.

## 4. TRAVAS E PROTEÇÕES INVIOLÁVEIS
- **NÃO** alterar telas já aprovadas/imutáveis (especialmente **Novo Pedido** e **Compras**).
- **NÃO** burlar hash locks, comentários de auditoria ou regras de ESLint/TypeScript (`@ts-ignore` / `any` proibidos).
- **NÃO** inventar tabelas, colunas, RPCs, rotas ou permissões inexistentes no Supabase.
- **NÃO** reescrever arquivos inteiros em massa; faça cirurgias precisas no JSX/CSS preservando a lógica de negócio.
- **NÃO** marcar item como concluído se houver falha ambiental (ex: falta de variável de ambiente ou navegador); documente como `[BLOQUEIO AMBIENTAL]` com o log exato.

## 5. VERIFICAÇÃO FINAL E ENTREGA
Ao finalizar o loop do `BACKLOG.md`, verifique o status do workflow `.github/workflows/industrial-code-quality.yml` e os ambientes Preview/Produção na Vercel (sem publicar nada que quebre contratos aprovados).
Sua saída final deve conter APENAS o resumo técnico objetivo dos commits realizados, telas homologadas e eventuais bloqueios reais encontrados.
