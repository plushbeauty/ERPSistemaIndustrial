# UI-004 — Inventário de componentes e controles compartilhados

- Data: 2026-11-11
- Branch: `integration/solicitacoes-telas-20261111`
- Escopo: componentes de formulários, campos, lookups, botões, cards, abas, modais, tabelas, mensagens e impressão.
- Método: árvore Git recursiva + leitura dos componentes e folhas de estilo. Inventário estático; não mede dimensões computadas no navegador.

## 1. Texto, código, descrição, número e data

| Componente | Arquivo | Capacidades / observações |
|---|---|---|
| Form / FormField / FormRow / FormSection | `src/components/industrial/forms/index.tsx` | Formulário em 12 colunas; campo com label; seções; linhas; ações. |
| FormInput / FormSelect | mesmo arquivo | Inputs e selects nativos com props HTML. |
| FormDate / FormTime | mesmo arquivo | Inputs nativos date/time. |
| FormNumber / FormMoney | mesmo arquivo | Número e moeda; FormMoney define inputMode decimal e step 0.01. |
| FormTextarea / FormCheckbox | mesmo arquivo | Texto multilinha e checkbox nativo. |
| CompactInput | `src/components/ui/CompactInput.tsx` | Valor controlado, touched/required, aria-invalid, onBlur; recebe atributos nativos. |
| CompactSelect | `src/components/ui/CompactSelect.tsx` | Valor controlado, opções, touched/required, aria-invalid. |
| LinkFieldCombobox | `src/components/LinkFieldCombobox.tsx` + re-export em `src/components/ui/LinkFieldCombobox.tsx` | Busca fuzzy local por label/value/description/dimensions, limite de 80 opções. |
| EntityCodeLookup | `src/components/industrial/EntityCodeLookup.tsx` | Lookup por código, seleção por ID, filtros e modal de consulta, até 250 resultados. |

## 2. Tokens e geometrias encontradas

| Origem | Geometria declarada |
|---|---|
| `industrialFormStyles.ts` | fieldClass `h-8` (32px); label 11px; card e título compartilhados. |
| `form-system-2026.css` | `--erp-form-height:36px`; `--erp-form-height-compact:32px`; labels 12px; radius 2px; grid de 12 colunas. |
| `CompactInput` / `CompactSelect` / `CompactButton` | 30px; labels 9px nos campos. |
| `ERPButton` / `ERPIconButton` + `erp-ui.css` | 40px desktop e 44px abaixo de 1024px; loading no ERPButton. |
| `LinkFieldCombobox` | `h-7` (28px) no markup. |
| `EntityCodeLookup` | input padrão 40px, modo compact 36px; folha CSS legada `entity-code-lookup.css` declara 54px para input/botão/linha. |
| `Menubar` | barra 36px e trigger 28px. |
| `RequiredField` / FormCheckbox | marcador obrigatório e checkbox nativo; checkbox mede 16px no CSS do form system. |

A folha `erp-compact-global.css` declara regras que forçam inputs/selects/textarea para 30px e labels para 9px dentro de `.erp-global-surface`; em `.erp-compact` também declara min-height de 30px para botões. Porém não foi localizada importação direta dela em `main.tsx`, `AppEntryV2.tsx`, `ERPHorizontalShell.tsx`, `PagePrincipal.tsx` ou `styles/index.css`; a ativação efetiva dessa folha permanece não confirmada. Em contraste, `form-system-2026.css` é importada por `main.tsx`. Não assumir override em runtime sem rastrear a cadeia de imports e conferir o navegador.

## 3. Botões e ações

- `CompactButton`: tons default/primary/danger/orange, altura 30px, estado disabled nativo.
- `ERPButton`: primary/secondary/success/danger/warning/ghost/neutral, tamanhos semânticos, ícone e loading; desabilita enquanto loading.
- `ERPIconButton`: ícone com aria-label/title e variantes neutral/primary/danger/ghost.
- Não existe uma única primitiva universal de botão; páginas ainda podem usar botões nativos com classes próprias.

## 4. Lookup e seleção

- `EntityCodeLookup`: resolução por código, seleção do registro, modal e filtros por código/descrição/código do cliente/dimensões.
- `LinkFieldCombobox`: combobox com pontuação fuzzy e lista local.
- Não foi identificado um componente único de datepicker; o formulário compartilhado usa input nativo `type=date`.

## 5. Cards, abas, modais e navegação

| Componente | Arquivo | Observação |
|---|---|---|
| PageIntroCard / PageIntro | `src/components/layout/PageIntroCard.tsx` | Cabeçalho de tela com ajuda contextual expansível. |
| Panel / PageHeader | `src/components/ui/panel.tsx` | Painel branco com título/ação; PageHeader ainda usa título 24px. |
| Kpi / Badge | `src/components/ui/kpi.tsx` | KPI e badge semântico; estilos de card mais amplos. |
| Dialog / DialogContent / DialogTitle / DialogDescription | `src/components/ui/dialog.tsx` | Radix; largura padrão até 1100px/94vw, max-height 90vh, superfície branca. |
| Tabs / TabsList / TabsTrigger / TabsContent | `src/components/ui/tabs.tsx` | Radix; lista navy e trigger cyan, padding amplo e fonte 16px. |
| Accordion | `src/components/ui/accordion.tsx` | Single/multiple, controlado ou interno, aria-expanded. |
| Menubar | `src/components/ui/menubar.tsx` | Menubar navy com itens, submenus, radio e checkbox. |

## 6. Grid, tabela e impressão

- Não foi encontrado um componente único de DataGrid/Tabela dentro de `src/components/ui`.
- `src/pages/IndustrialDataWorkspace.tsx` implementa workspace genérico configurado por módulo, com campos, pesquisa e tabela no próprio arquivo; não é um grid universal isolado.
- Há estilos compartilhados por classe para `.industrial-table` e `.sgq-table` em `erp-compact-global.css`.
- Motor de relatório: `src/lib/report/abrirRelatorio.tsx`, `documento.ts`, `relatorioContexto.ts` e componente `SynqraRelatorioA4`. Monta folha A4 própria fora da raiz do sistema; carrega contexto de empresa/emissor no Supabase e bloqueia emissão se faltar sessão/contexto.
- Impressão de fallback: `src/styles/index.css` contém baseline `@media print` A4, oculta shell/botões, repete thead e controla quebras de página.
- Não foi identificado um componente global único de alert/toast. Feedback de sucesso/erro é geralmente implementado por tela, frequentemente com `role=status` e `role=alert`.

## 7. Achados para os próximos ciclos

1. Há pelo menos seis geometrias declaradas diferentes (28, 30, 32, 36, 40, 44 e 54px, dependendo do componente/contexto).
2. `maxLength` não é aplicado automaticamente pelos wrappers; cada tela precisa derivá-lo do schema real.
3. Lookups têm duas implementações e uma folha CSS legada com altura muito maior.
4. Botões, tabelas, mensagens e impressão ainda não são cobertos por uma única API visual; a auditoria por tela deve registrar a implementação usada.
5. A auditoria estática do run `43044102410` registrou 244 arquivos, 3 importando tokens compartilhados, 94 com estilos locais e 208 com controles sem altura estática detectada; regex não prova renderização.

## Evidências de arquivos consultados

- `industrialFormStyles.ts`: `62ffebee741dbf718b99ba36058f06c0e917a24f`
- `forms/index.tsx`: `59ad4a49704db3e6932d81a7f9e3041210f15add`
- `CompactInput.tsx`: `9c23e9470c8ca634db37273a5f8fa8497511916e`
- `CompactSelect.tsx`: `5abd4ee4c0ccd891d179e6f9f4b7b13975116fea`
- `CompactButton.tsx`: `b94aed414bc800aebe602b67282a50f4c051cff5`
- `ERPButton.tsx`: `074c2bad1d35a03249c6825089c5b708707a5dd4`
- `ERPIconButton.tsx`: `810133d26b0e5e47cd25e6667a23e01da34bb566`
- `EntityCodeLookup.tsx`: `b6354412475b8e9eb48661b2387463f0fe312987`
- `LinkFieldCombobox.tsx`: `defbf2768a6c3837d813c66b3dacc6a188084148`
- `form-system-2026.css`: `e86b7db2d3c13869031af6914bd43daff9b50d44`
- `erp-compact-global.css`: `23c61c0fd1846d5cffae71c8ba7f51e64c9c1b1e`
- `abrirRelatorio.tsx`: `024d06a6e47410909a5734333a7185b21a2dd8cf`

**Conclusão:** inventário estático concluído. Nenhuma tela ou regra de negócio foi alterada nesta etapa.
