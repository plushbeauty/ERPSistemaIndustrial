# REFERÊNCIA GLOBAL DO PROJETO — PADRÃO DE INTERFACE ERP INDUSTRIAL

Projeto: `plushbeauty/ERPSistemaIndustrial`
Branch de referência: `feat/erp-global-forms-ux`

## 1. Regra principal

Todas as telas novas e todas as telas alteradas devem seguir um padrão único de formulário empresarial, inspirado em Delphi moderno e em padrões de ERP consolidados.

A tela **Vendas / Novo Pedido** é a referência inicial.

Objetivos:
- controles próximos e compactos;
- pouca área vazia;
- largura proporcional ao conteúdo;
- leitura rápida;
- aparência empresarial;
- comportamento previsível;
- nomes técnicos que permitam localizar cada controle diretamente no código.

Não criar telas com inputs gigantes quando o dado é curto.

---

## 2. Nomenclatura dos controles

Prefixos oficiais:

| Prefixo | Controle |
|---|---|
| `ed` | Edit / campo de edição |
| `cb` | ComboBox / Select |
| `btn` | Button |
| `grid` | Grid / tabela |
| `dlg` | Dialog / modal |
| `frm` | Formulário / tela |
| `chk` | Checkbox |
| `rb` | Radio Button |
| `lbl` | Label |
| `pnl` | Panel |
| `grp` | Group |

Exemplos:
- `edPedido`
- `edDataEntrada`
- `edNomeCliente`
- `edCodigoInterno`
- `edDescricaoProduto`
- `edQuantidade`
- `edValorUnitario`
- `edDescontoPercentual`
- `cbVendedor`
- `cbCondicaoPagamento`
- `btnNovo`
- `btnGravar`
- `btnImprimir`
- `gridItens`
- `dlgImpressao`

Nunca usar `input1`, `campo1`, `botao1`, `select1` ou nomes que não indiquem o que o controle representa.

---

## 3. Padrão dos Edits

### 3.1 Regra

A largura deve ser determinada pelo tipo e pelo tamanho esperado do dado, e não pelo espaço disponível.

### 3.2 Faixas de referência

| Tipo | Largura de referência |
|---|---:|
| Código curto / número curto | 72–90 px |
| Data | 84–96 px |
| Nº Pedido | 84–96 px |
| Código interno | 84–96 px |
| Quantidade | 72–90 px |
| Unidade | 56–72 px |
| Valor unitário | 84–100 px |
| Desconto % | 72–90 px |
| Campo médio | 120–180 px |
| Nome / descrição | 220–420 px |
| Texto longo | 320–600 px |

Essas faixas são referência, não valores absolutos. O dado real pode exigir ajuste.

### 3.3 Regra de equivalência

Controles com conteúdo semelhante devem ter dimensões semelhantes.

Exemplo:

`edPedido`, `edDataEntrada`, `edCodigoInterno` e `edValorUnitario`

não devem ter larguras visualmente muito diferentes sem uma razão funcional.

### 3.4 Não fazer

Não usar:
- `w-full` indiscriminadamente;
- largura gigante para código;
- input de 300–500 px para número curto;
- campos distantes uns dos outros;
- excesso de padding vertical;
- formulário que cresce desnecessariamente por espaçamento.

---

## 4. Tipografia

Padrão base:

- fonte de interface: sistema/UI sans-serif;
- texto normal: 13–14 px;
- labels: 12–13 px;
- campos: 13–14 px;
- títulos de seção: 13–15 px;
- título principal: 18–22 px;
- botões: 12–13 px;
- cabeçalhos de grid: 11–13 px.

Priorizar legibilidade e densidade empresarial.

Não usar fonte grande para preencher espaço.

---

## 5. Altura dos controles

Referência:

| Controle | Altura |
|---|---:|
| Edit / Select | 32–36 px |
| Botão compacto | 30–34 px |
| Botão principal | 34–38 px |
| Linha de grid | 30–34 px |
| Cabeçalho de grid | 32–36 px |

A altura pode variar quando acessibilidade ou conteúdo exigir, mas deve permanecer consistente dentro da mesma tela.

---

## 6. Espaçamento

Referência:

- gap entre campos: 6–10 px;
- gap entre grupos: 10–16 px;
- padding interno de seção: 10–14 px;
- margem vertical entre seções: 10–16 px;
- evitar grandes blocos vazios.

A prioridade é manter os campos próximos, como em um formulário Delphi empresarial.

---

## 7. Botões

Padrão:

- `btnNovo`
- `btnGravar`
- `btnCancelar`
- `btnImprimir`
- `btnAdicionarItem`
- `btnDeletarItem`
- `btnFinalizarPedido`

Botões relacionados devem ficar próximos.

Exemplo:

`btnNovo` + `btnGravar`

devem ficar próximos da identificação do registro quando essa ação fizer sentido.

Ações de item devem ficar próximas do `gridItens`.

Não espalhar botões pela tela sem necessidade.

---

## 8. Grids

Prefixo: `grid`.

Exemplos:
- `gridItens`
- `gridPedidos`
- `gridClientes`
- `gridProdutos`
- `gridFinanceiro`

Regras:
- colunas compactas;
- largura proporcional ao conteúdo;
- códigos e quantidades compactos;
- descrição recebe o espaço restante;
- ações próximas do registro;
- evitar colunas gigantes para dados curtos;
- evitar altura excessiva causada por padding ou linhas grandes.

---

## 9. Seções de formulário

Estrutura preferencial:

1. Identificação
2. Itens
3. Totais / ações

Não criar uma sequência vertical desnecessária de grandes painéis.

Quando uma lista cresce, priorizar grid compacto, rolagem interna ou área de trabalho adequada em vez de empurrar todos os controles para baixo.

---

## 10. Relacionamento entre controles

O layout deve refletir a relação funcional.

Exemplo de Vendas:

`edNomeCliente` deve ter espaço suficiente para o nome.

`edEntradaVia` pode compartilhar a mesma linha com `cbVendedor` quando isso liberar espaço para `edNomeCliente`.

`edCodigoInterno`, `edDescricaoProduto`, `edQuantidade`, `edUnidade`, `edValorUnitario` e `edDescontoPercentual` devem permanecer juntos na entrada do item.

---

## 11. Estados e cores

Manter a identidade visual empresarial do ERP.

Tokens de referência:
- fundo claro: `#F4FBFD`
- texto principal: `#123B50`
- azul principal: `#2D8DB8`
- azul secundário: `#48B7C7`
- produção: `#3A9D78`
- setup: `#E6A34A`
- parada: `#D65B61`

Cor nunca deve ser o único indicador de estado. Usar também texto, ícone, forma ou outro indicador visual.

Evitar texto escuro sobre fundo escuro.

---

## 12. Responsabilidade do código

Ao alterar um controle:

1. localizar pelo identificador técnico;
2. alterar somente o componente necessário;
3. preservar a lógica de negócio;
4. não criar mock;
5. não inserir dados falsos;
6. não usar `any` para esconder erro;
7. não desabilitar lint para esconder erro;
8. validar type-check;
9. validar lint;
10. validar build;
11. quando possível, validar a tela no navegador.

---

## 13. Comunicação com o usuário

O identificador técnico passa a ser uma linguagem comum entre usuário e manutenção.

Exemplos:

> `edDataEntrada` está grande.

> `edValorUnitario` precisa ficar do mesmo tamanho do `edPedido`.

> `btnGravar` está longe do `btnNovo`.

> `gridItens` está ficando muito alto.

> `dlgImpressao` precisa de filtro.

Isso permite localizar o problema sem ambiguidade.

---

## 14. Regra para todos os módulos

Aplicar este documento a:

- Vendas
- Compras
- Estoque
- Financeiro
- Fiscal
- PCP
- Qualidade
- Clientes
- Fornecedores
- Produtos
- Usuários
- Configurações
- Relatórios
- demais módulos presentes ou futuros

---

## 15. Regra de evolução

Quando surgir um novo tipo de controle, criar um prefixo consistente e documentá-lo aqui antes de espalhá-lo pelo projeto.

Este documento é a referência oficial para nomenclatura e densidade visual do ERP.
