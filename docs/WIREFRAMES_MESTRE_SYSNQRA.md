# SYSNQRA ERP INDUSTRIAL — Wireframes Mestre

> Catálogo incremental de referências de interface. Cada bloco registra a estrutura, os rótulos, as ações e as dimensões solicitadas. As medidas são requisitos visuais para implementação; não autorizam preencher telas com dados fictícios.

**Regra de evolução:** receber novos blocos e acrescentar as telas sem apagar nem reescrever as anteriores, salvo correção solicitada. A implementação final deve respeitar autenticação, autorização, empresa ativa, RLS, contratos reais de banco e identidade visual SYSNQRA.

**Blocos recebidos:** 1, 2 e 3 (final)  
**Telas registradas:** 13  
**Áreas:** Financeiro, Controladoria, RH, Produção e Qualidade

---

## TELA 01 — FINANCEIRO: RETIFICAÇÃO FINANCEIRA

**Rota:** `/pageprincipal/financeiro/retificacao`

```text
[HEADER] Retificação Financeira                                      [Btn: Histórico Geral (160x40px)]
====================================================================================================
Busca Rápida: [ Edit: 380x40px ]   Tipo: [ Select: 160x40px ]   Status: [ Select: 160x40px ]   [ Btn: Buscar (110x40px) ]

| ID | Documento / NF | Cliente / Fornecedor | Vencimento | Valor Original | Status | Ação [Retificar] |
----------------------------------------------------------------------------------------------------
Dados Originais (Disabled): Valor [180x40] | Vencimento [150x40] | Conta [240x40] | Centro Custo [240x40]
Novos Dados: Tipo Retificação *: [ Select: 350x40 ] | Novo Valor *: [180x40] | Nova Data *: [160x40] | Juros: [150x40] | Desconto: [150x40]
Nova Conta: [ Select: 340x40 ] | Novo Centro Custo: [ Select: 340x40 ]
Justificativa *: [ Textarea: 100% x 90px ] | Anexo: [ Dropzone: 100% x 56px ]
[ Btn Sec: Cancelar (120x42px) ]   [ Btn Pri: Confirmar Retificação (210x42px) ]
====================================================================================================
```

## TELA 02 — FINANCEIRO: NOTAS DE DÉBITO

**Rota:** `/pageprincipal/financeiro/notas-debito`

```text
[HEADER] Notas de Débito e Rotinas Financeiras                      [Btn: + Nova Nota de Débito (190x40px)]
====================================================================================================
[ Notas de Débito (160x40) ] [ Conciliação (180x40) ] [ Importar Extratos (210x40) ] [ Demais Operações (170x40) ]
Busca: [ Edit: 380x40px ]   Tipo: [ Select: 160x40px ]   Status: [ Select: 160x40px ]   [ Btn: Buscar (110x40px) ]

| Nº Nota | Documento Ref. | Cliente / Fornecedor | Emissão | Vencimento | Valor (R$) | Status | Ações |
----------------------------------------------------------------------------------------------------
Nº Nota: [ Disabled: 180x40 ] | Doc. Origem: [180x40] | Emissão *: [150x40] | Vencimento *: [150x40]
Entidade *: [ Autocomplete: 440x40 ] | Tipo *: [ Select: 280x40 ]
Valor Principal *: [180x40] | Acréscimos: [160x40] | Descontos: [160x40] | Total: [ Disabled: 180x40 ]
Conta *: [ Select: 340x40 ] | Centro Custo *: [ Select: 340x40 ]
Motivo *: [ Textarea: 100% x 90px ] | [ Btn Sec: Cancelar (140x42px) ] [ Btn Pri: Salvar Nota de Débito (210x42px) ]
====================================================================================================
```

## TELA 03 — FINANCEIRO: CONFIGURAÇÕES DE NOTAS DE DÉBITO

**Rota:** `/pageprincipal/financeiro/notas-debito/configuracoes`

```text
[HEADER] Configurações de Notas de Débito                           [Btn: Voltar para Rotinas (170x40px)]
====================================================================================================
Prefixo: [160x40] | Próximo Nº *: [180x40] | Série: [150x40] | Dias Venc. *: [150x40]
Natureza Padrão *: [ Select: 340x40 ] | Layout PDF *: [ Select: 340x40 ]
Conta Padrão *: [ Select: 340x40 ] | Centro Custo Padrão *: [ Select: 340x40 ]
Regra Conciliação: [ Select: 340x40 ] | Tolerância Divergência: [180x40]
Limite Alçada: [180x40] | Multa (%): [150x40] | Juros (%): [150x40] | E-mail Auditoria: [240x40]
Observações Padrão: [ Textarea: 100% x 90px ] | [ Btn Pri: Salvar Configurações (210x42px) ]
====================================================================================================
```



---

## Bloco 3 — Controladoria, RH e Produção/Qualidade

**Bloco recebido:** 3 (final)  
**Telas acrescentadas:** 6  
**Total acumulado:** 13 telas

## Identidade visual oficial — padrão FichaMontagem

- Cabeçalho `bg-brand` com camada decorativa `bg-glow`; contraste adequado em impressão.
- Cards de indicadores sobrepostos com `-mt-12` e `animate-rise`.
- Componentes `Panel`, `Btn`, `Pill`, `Th` e `Td` de `@/components/compras/ui`.
- Inputs `rounded-lg border border-input bg-card`, altura padronizada de 40px salvo dimensão específica.
- Layout responsivo e suporte a impressão com variantes `print:`.
- Estados vazios sem dados fictícios. Consultas, cálculos e gravações devem respeitar dados reais, `empresa_id`, RLS e permissões.

## TELA 08 — CONTROLADORIA: ENGENHARIA DE CUSTO PADRÃO

**Rota sugerida:** `/pageprincipal/controladoria/engenharia-custo-padrao`

```text
[HEADER bg-brand + bg-glow] FINANCEIRO › ENGENHARIA DE CUSTO PADRÃO [Btn: Emitir Planilha] [Btn: Salvar Preço]
Título: Formação de Preço por Custo Absorvido
[Panel Parâmetros] Produto alvo * [260x40] | Máquina/Centro custo * [260x40] | Qtd. projeção * [110x40] | Tempo ciclo/un (seg) [140x40] | Margem % * [120x40 | 50]
[Grid 65% Panel Custo BOM Teórico (MRP)] | [Grid 35% Panel Engenharia do Preço de Venda]
| Componente | Qtd. MRP | Custo Unit. | Total |
Estado vazio: Selecione produto com BOM ativa
(+) Matéria-prima BOM: R$ 0,00 | (+) Fabricação: R$ 0,00 | (+) Hora/Máquina: R$ 0,00
(=) CUSTO FÁBRICA TOTAL: R$ 0,00 | (=) PREÇO SUGERIDO: R$ 0,00
```

**Regras:** consultar produto/BOM e centro de custo reais; calcular apenas com valores persistidos; não assumir BOM ativa ou custo de máquina inexistente; planilha deve refletir os valores exibidos.

## TELA 09 — CONTROLADORIA: DESVIOS DE CUSTO (PADRÃO × REAL)

**Rota sugerida:** `/pageprincipal/controladoria/desvios-custo`

```text
[HEADER bg-brand + bg-glow] FINANCEIRO › CUSTOS INDUSTRIAIS [Btn: Atualizar] [Btn: Imprimir]
Título: Desvios de Custo (Custo Padrão × Custo Real Absorvido)
[4 Cards -mt-12 animate-rise] Custo Padrão: R$ 0,00 | Custo Real: R$ 0,00 | Desvio Abs.: R$ 0,00 | Variação: 0,00 %
[Panel Filtros] Competência * [Month: 170x40] | Produto [Edit: 280x40] | OP [Edit: 160x40] | Status [Select: 180x40]
[Panel Apuração por Produto]
| Cód. Produto | Descrição | Qtd. Produzida | Custo Padrão Un. | Custo Real Un. | Desvio R$ | Var. % |
```

**Regra:** exibir somente apurações reais persistidas; não substituir ausência de apuração por estimativa; respeitar a empresa ativa.

## TELA 10 — CONTROLADORIA: LUCRATIVIDADE, RAZÃO GERAL E DECIMAIS (PLASTIBOR)

**Rota sugerida:** `/pageprincipal/controladoria/lucratividade-razao-decimais`

```text
[Btn Voltar: 115x38 rounded-full] [HEADER bg-brand] CONTROLADORIA
1. LUCRATIVIDADE E MARGENS: Mês/Competência * [Month: 200x40] | Margem Alvo % * [150x40 | 25] | [Btn: Filtrar Custos]
| Nº Pedido | Razão Social / Produtos | Faturamento Bruto | Custo Fabricação | Margem Bruta | Taxa de Margem (Pill: CUSTO PENDENTE) |
2. MONITOR DO RAZÃO GERAL — GL: Empresa * [Disabled: 280x40] | Banco/Diário * [Select: 340x40] | [Btn: Filtrar]
| Data | Documento | Descrição | Débito (R$) | Crédito (R$) |
Rodapé: SALDO TOTAL DO RAZÃO: R$ 0,00
3. CADASTRO DE PRECISÃO DECIMAL — CUBAGEM (PLASTIBOR): Código * [180x40 | VOLUME] | Descrição * [420x40] | Casas * [120x40 | 4] | [Btn: Gravar]
| Código | Descrição | Casas | Exemplo | Ações |
Padrões: VOLUME, PESO_LIQ, PESO_BRUTO, MEDIDA_TEC, QTD_BOM, VALOR_UNIT
```

## TELA 11 — CONTROLADORIA: ESTORNO DOCUMENTAL E COMPLIANCE

**Rota sugerida:** `/pageprincipal/controladoria/estorno-documental-compliance`

```text
[Btn Voltar: 115x38 rounded-full] [HEADER bg-brand] Assistente de Retificação e Compliance Financeiro [Pill: Acesso Restrito]
[Panel Localizar] Tipo Documento * [Select: 240x40] | Nº Documento * [300x40] | Data [Date: 160x40] | [Btn: Buscar]
[Panel Originais Disabled] Nº Doc [200x40] | Entidade [420x40] | Valor [180x40] | Data [180x40] | Conta [310x40] | Centro Custo [310x40]
[Panel Compliance] Motivo * [Select: 340x40] | Data Estorno * [Date: 160x40] | Ação Título * [Select: 290x40]
Justificativa * [Textarea: 100%x85px] | Anexo [File: 480x40]
[ ] Confirmo período contábil ABERTO [ ] Ciente do lançamento inverso de auditoria
[Btn: Limpar Tela] [Btn Destructive: Executar Estorno Documental]
[Panel Log] | Data/Hora | Documento Original | Tipo Operação | Valor Estornado | Usuário | Motivo | Comprovante |
```

**Segurança:** operação restrita, validação de período contábil aberto, autorização por perfil, justificativa obrigatória e trilha de auditoria. Estornar por lançamento inverso; nunca apagar ou sobrescrever o original.

## TELA 12 — RH / DEPARTAMENTO PESSOAL: FUNCIONÁRIOS, TURNOS E EPIS (NR-6)

**Rota sugerida:** `/pageprincipal/rh/gestao-pessoas`

```text
[HEADER bg-brand] RH / DEPARTAMENTO PESSOAL — GESTÃO DE PESSOAS
[Abas] Visão geral | Funcionários | Turnos e escalas | Ponto | Treinamentos | EPIs | Documentos
1. FUNCIONÁRIOS: Foto 3x4 [170x210] | Nome * [340x40] | Nasc * [150x40] | CPF * [160x40] | RG [150x40]
Celular [180x40] | Fixo [180x40] | E-mail [340x40] | Matrícula * [140x40] | Admissão * [150x40] | Cargo * [240x40] | Depto * [240x40]
Regime * [220x40] | Turno * [220x40] | RFID [200x40] | Salário [180x40] | Custo H/H [180x40] | Situação * [200x40]
DBGrid: Busca [360x40] | Matrícula | Colaborador | Cargo/Departamento | Situação | Ação
2. TURNOS E ESCALAS: Código * [150x40] | Nome * [340x40] | Escala * [220x40] | Ent [130x40] | Int Saída [130x40] | Int Ret [130x40] | Saída * [130x40] | Tol [120x40]
[ ] Seg [ ] Ter [ ] Qua [ ] Qui [ ] Sex [ ] Sáb [ ] Dom [ ] Adicional Noturno [Btn: Gravar Turno]
3. ENTREGA DE EPIs (NR-6): Colaborador * [360x40] | EPI * [360x40] | Nº CA * [180x40] | Validade CA * [150x40] | Qtd * [110x40] | Data * [150x40]
Motivo * [240x40] | Próx. Troca [150x40] | Termo * [280x40] | Obs/Tamanho [840x40] | [Btn: Registrar Entrega de EPI]
DBGrid: Data Entrega | Colaborador | EPI | Nº CA | Validade CA | Qtd | Motivo | Status/Termo | Ações
```

**Regra:** reaproveitar tabelas e políticas RLS existentes de funcionários, turnos e entregas de EPI. Não criar estruturas duplicadas sem auditar o schema.

## TELA 13 — PRODUÇÃO · QUALIDADE: FICHA DE MONTAGEM E ACABAMENTO

**Rota:** componente/rota oficial existente de `FichaMontagem.tsx` (preservar o registro do roteador).

```text
[HEADER bg-brand + bg-glow] Logo Synqra [Btn: Imprimir ficha]
Subtítulo: PRODUÇÃO · QUALIDADE | Título: Ficha de Montagem e Acabamento
[4 Cards -mt-12 animate-rise] Etapas montagem 0/0 | Parâmetros acabamento 0/0 | Peças inspecionadas 0 | Situação lote Em aberto
[Panel Identificação da ordem] Grid 5 colunas, sem dados fictícios: Ordem de produção | Produto (2 cols) | Código | Cliente | Quantidade | Lote | Data | Turno | Linha/posto
[Abas] Montagem | Acabamento | Inspeção | Liberação
1. MONTAGEM: Barra progresso + tabela (Check | Seq. | Operação | Padrão | Padrão min | Real min | Operador) + gráfico Tempo por etapa
2. ACABAMENTO: tabela (Característica | Mínimo | Máximo | Medido | Resultado Pill OK/Fora/Pendente)
3. INSPEÇÃO: Peças aprovadas + contadores (-/+) por defeito + resumo (Inspecionadas | Aprovadas | Refugo) + Pareto
4. LIBERAÇÃO: Cards decisão LIBERADO | RETRABALHO | SEGREGADO + Observações + assinaturas Montagem, Acabamento e Qualidade
Contrato visual: bg-brand + bg-glow; cards -mt-12 animate-rise; Panel, Btn, Pill, Th, Td de @/components/compras/ui; inputs rounded-lg border border-input bg-card; altura padronizada; suporte print:.
```
