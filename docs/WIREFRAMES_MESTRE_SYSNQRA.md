# SYSNQRA ERP INDUSTRIAL — Wireframes Mestre

> Catálogo incremental de referências de interface. Cada bloco registra a estrutura, os rótulos, as ações e as dimensões solicitadas. As medidas são requisitos visuais para implementação; não autorizam preencher telas com dados fictícios.

**Regra de evolução:** receber novos blocos e acrescentar as telas sem apagar nem reescrever as anteriores, salvo correção solicitada. A implementação final deve respeitar autenticação, autorização, empresa ativa, RLS, contratos reais de banco e identidade visual SYSNQRA.

**Blocos recebidos:** 1 e 2  
**Telas registradas:** 7  
**Áreas:** Financeiro e Controladoria Comercial

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

## Próximo bloco

Aguardando o **Bloco 3 final**. As próximas telas deverão ser acrescentadas ao final deste documento e ao catálogo visual, mantendo a numeração e os wireframes já recebidos.


---

## Bloco 2 — Financeiro e Controladoria Comercial

**Bloco recebido:** 2  
**Telas acrescentadas:** 4  
**Total acumulado:** 7 telas


## TELA 04 — FINANCEIRO: FLUXO DE CAIXA E DISPONIBILIDADES

**Rota:** `/pageprincipal/financeiro/fluxo-caixa`

```text
====================================================================================================
[BREADCRUMB] SYSNQRA ERP INDUSTRIAL / FINANCEIRO
[HEADER] Fluxo de Caixa e Disponibilidades      [Badge: ● SUPABASE CONECTADO] [Btn Sec: ATUALIZAR (135x40px)]
====================================================================================================
[01 VISÃO FINANCEIRA - 4 CARDS]
[ Entradas previstas: R$ 0,00 ] [ Saídas previstas: R$ 0,00 ] [ Saldo projetado: R$ 0,00 ] [ Saldo liquidado: R$ 0,00 ]
----------------------------------------------------------------------------------------------------
[02 NOVO LANÇAMENTO]
Descrição *: [ Edit: 420x40px ]   Movimento *: [ Select: 160x40px ]   Valor (R$) *: [ Edit: 160x40px ]   Vencimento *: [ Edit Date: 160x40px ]
O título será gravado como PENDENTE.                                      [ Btn Pri: REGISTRAR TÍTULO (190x42px) ]
----------------------------------------------------------------------------------------------------
[03 EXTRATO PROJETADO - DBGRID]

| Movimento | Descrição | Vencimento | Baixa | Valor (R$) | Status |
Exibindo 0–0 de 0                               [ Btn: ANTERIOR (110x36px) ] Página 1 de 1 [ Btn: PRÓXIMA (110x36px) ]
====================================================================================================
```


## TELA 05 — FINANCEIRO / TESOURARIA: CONTAS A RECEBER

**Rota:** `/pageprincipal/financeiro/contas-receber`

```text
====================================================================================================
[BREADCRUMB] Financeiro / Tesouraria › Contas a receber
[HEADER] Contas a receber                          [Btn Sec: Atualizar (135x40px)] [Btn Pri: + Novo título (155x40px)]
====================================================================================================
[ Títulos: 0 ] [ Saldo em aberto: R$ 0,00 ] [ Parcelas vencidas: 0 ] [ Parceiros ativos: 1 ]
Buscar título: [ Edit: 520x40px | Parceiro, documento, categoria ou status ]          [Badge: 0 título(s)]

| Parceiro / descrição | Documento | Origem | Parcelas | Total / saldo | Status | Ações [Ver/Baixar/Editar] |
Exibindo 0–0 de 0                               [ Btn: Anterior (110x36px) ] Página 1 de 1 [ Btn: Próxima (110x36px) ]
====================================================================================================
```


## TELA 06 — FINANCEIRO / TESOURARIA: CAIXA

**Rota:** `/pageprincipal/financeiro/caixa`

```text
====================================================================================================
[BREADCRUMB] Financeiro / Tesouraria › Caixa
[HEADER] Fluxo de caixa                                                   [Btn Sec: Atualizar (135x40px)]
====================================================================================================
[ A receber hoje: R$ 0,00 ] [ A pagar hoje: R$ 0,00 ] [ A receber no mês: R$ 0,00 ] [ A pagar no mês: R$ 0,00 ]
[ Recebido no mês: R$ 0,00] [ Pago no mês: R$ 0,00  ] [ A receber no ano: R$ 0,00 ] [ A pagar no ano: R$ 0,00 ]
----------------------------------------------------------------------------------------------------
[ DIA (90x40) ] [ SEMANA (100x40) ] [ MÊS (90x40) ] [ ANO (90x40) ]   Data Base: [ Edit Date: 160x40 ]   Conta: [ Select: 260x40 ]

| Data / Período | Entradas (R$) | Saídas (R$) | Variação do Dia (R$) | Variação Acumulada (R$) |
====================================================================================================
```


## TELA 07 — COMISSÕES: REGRAS, CÁLCULO E PERFIL DO VENDEDOR

**Rota:** `/pageprincipal/comissoes/regras`  
**Rotas relacionadas:** `/pageprincipal/comissoes/regras`, `/pageprincipal/comissoes/calculo` e `/pageprincipal/comissoes/perfil`

```text
Rotas relacionadas: /pageprincipal/comissoes/regras · /pageprincipal/comissoes/calculo · /pageprincipal/comissoes/perfil
====================================================================================================
[BREADCRUMB] FINANCEIRO › COMISSÕES › CONTROLADORIA COMERCIAL
[ Aba: Regras (130x40) ]   [ Aba: Cálculo (130x40) ]   [ Aba: Perfil Vendedor (160x40) ]
----------------------------------------------------------------------------------------------------
1. REGRAS DE COMISSÃO:
   Perfil *: [ Select: 300x40 ] | Novo Perfil: [ Edit: 240x40 ] [ + Novo (110x40) ]
   SKU Produto *: [ Edit: 340x40 ] | % Comissão *: [ Edit: 140x40 ] | Meta Qtd *: [ Edit: 140x40 ] [ + Add (110x40) ]

   | Perfil | SKU | Produto | % Comissão | Meta Qtd | Ações | -> [ Btn Pri: Gravar (140x42px) ]
2. CÁLCULO DE COMISSÃO:
   Competência *: [ Edit Month: 190x40 ] | Vendedor *: [ Edit: 340x40 ] | Meta Faturamento: [ Edit: 180x40 ] [ Btn Pri: Calcular (140x40) ]

   | Pedido | Cliente | SKU | Qtd Faturada | Valor Total Nota | % Comissão Regra | Comissão Líquida R$ |
   [ Total Vendas: R$ 0,00 ] [ Meta Batida: NÃO ] [ Total Comissão: R$ 0,00 ] [ Btn Sec: Exportar XLSX (160x42px) ]
3. PERFIL DO VENDEDOR:
   Vendedor/Agente *: [ Edit: 320x40 ] | Perfil de Regras *: [ Edit: 320x40 ] | Status *: [ Select: 160x40 ] [ Btn Pri: Gravar Vínculo (165x40) ]

   | Vendedor | Perfil | Status | Ações |
====================================================================================================
```
