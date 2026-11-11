# UI-005 — Registro de exceções geométricas e larguras funcionais

- Data: 2026-11-11
- Branch: `integration/solicitacoes-telas-20261111`
- Referência geral: controles de formulário 32px (`h-8`), radius 2px; larguras por função, sem forçar mesma largura para código, descrição, quantidade, data, valor e identificadores.
- Fontes: `REFERENCE.md`, `industrialFormStyles.ts`, `form-system-2026.css`, componentes de UI, `erp-ui.css`, `NovoPedido.tsx` e `index.css`.
- Escopo: registro documental; não altera telas aprovadas nem força classes globais.

## Exceções legítimas / estruturais

| Elemento | Medida declarada | Classificação | Motivo / regra |
|---|---:|---|---|
| Checkbox/radio nativo | 16px | EXCEÇÃO LEGÍTIMA | Controle binário não é campo de texto; preservar hit area/estilo nativo e alinhamento do label. |
| Textarea | min-height 90px | EXCEÇÃO LEGÍTIMA | Campo multilinha; altura deve crescer conforme conteúdo e manter resize vertical quando apropriado. |
| Botões de ação ERPButton/ERPIconButton em tablet | 44px | EXCEÇÃO LEGÍTIMA | Alvo de toque para operação em tablet; não reduzir a 32px. |
| Botões de ação ERPButton/ERPIconButton desktop | 40px | EXCEÇÃO DE COMPONENTE | Botões de ação com ícone/texto; validar em cada tela, não aplicar a inputs. |
| Fechamento de modal / ação de toque | 40px | EXCEÇÃO DE COMPONENTE | Alvo de toque independente do tamanho do campo. |
| Menubar | barra 36px; trigger 28px | FORA DO PADRÃO DE FORMULÁRIO | Navegação, não controle de entrada. |
| Cabeçalho/linha de tabela | 32–54px, conforme grade | FORA DO PADRÃO DE FORMULÁRIO | Densidade e leitura tabular; não aplicar altura de input à linha da tabela. |
| Novo Pedido aprovado | inputs 30px; botões toolbar 32px; tabela header 36px/linhas 40px | EXCEÇÃO CONGELADA | SHA do arquivo coincide com manifesto oficial; não modificar sem nova autorização. |

## Variações que NÃO são aprovadas como exceção geral

| Origem | Medida declarada | Estado |
|---|---:|---|
| `fieldClass` em `industrialFormStyles.ts` | 32px | PADRÃO compartilhado atual. |
| `form-system-2026.css` `--erp-form-height` | 36px | DIVERGÊNCIA a validar; `--erp-form-height-compact` é 32px. O CSS é importado por `main.tsx`. |
| `CompactInput` / `CompactSelect` / `CompactButton` | 30px | PADRÃO COMPACTO de componentes; exige uso contextual e não deve ser confundido com padrão universal 32px. |
| `LinkFieldCombobox` | 28px no markup | PENDENTE de medição renderizada; não declarar exceção legítima sem confirmar contexto. |
| `EntityCodeLookup` | 40px padrão / 36px compact | PENDENTE de validação no contexto real. |
| `entity-code-lookup.css` | 54px em input/botão | LEGADO / PENDENTE; não replicar automaticamente. |
| `ERPButton` | 40px desktop / 44px tablet | Componente de ação; legítimo para alvo de toque, mas não substituir toolbar compacta automaticamente. |

## Larguras funcionais — regra registrada

- Código, SKU, CNPJ/CPF, quantidade, unidade e identificadores: largura compacta conforme máscara e limite real do banco.
- Descrição, nome, observação e texto técnico: largura flexível, `min-w-0`, truncamento apenas visual e conteúdo completo acessível.
- Datas, valores, pesos, medidas e percentuais: larguras coerentes entre campos equivalentes e alinhamento numérico à direita quando em tabela.
- Lookup: campo ocupa o espaço disponível; botão de pesquisa permanece acoplado na mesma linha, com alvo independente.
- Grades: usar spans funcionais/responsivos; evitar largura fixa que provoque corte ou sobreposição em 1440px/tablet.
- Modal de lookup: largura limitada pela viewport e filtros em colunas responsivas; a largura não define a altura dos campos.
- Não fixar largura universal para todos os campos.

## Bloqueio de validação visual

O Preview Vercel do commit `7c57d96dc7c9d0b3735867c9b46d91a0ae81a9e7` reportou `failure` com descrição `Deployment rate limited — retry in 24 hours`. Assim, as medidas acima são declarações de código/CSS e não medições computadas no navegador. O inventário UI-003 permanece pendente de conferência visual; Novo Pedido continua congelado.

## Critério de uso

A exceção só pode ser aplicada a componente/tela cuja função e evidência estejam registradas. Não usar este documento para normalizar em massa telas aprovadas, modificar a geometria de Novo Pedido, alterar contratos de banco ou remover proteções. Variações marcadas PENDENTE/LEGADO precisam de conferência individual antes de qualquer correção.

**Conclusão:** registro de exceções e larguras funcionais concluído para o inventário disponível; divergências não homologadas permanecem explícitas para a auditoria por tela.
