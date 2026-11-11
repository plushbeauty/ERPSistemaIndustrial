# SYSNQRA ERP INDUSTRIAL — Wireframes Mestre

> Catálogo incremental de referências de interface. Cada bloco registra a estrutura, os rótulos, as ações e as dimensões solicitadas. As medidas são requisitos visuais para implementação; não autorizam preencher telas com dados fictícios.

**Regra de evolução:** receber novos blocos e acrescentar as telas sem apagar nem reescrever as anteriores, salvo correção solicitada. A implementação final deve respeitar autenticação, autorização, empresa ativa, RLS, contratos reais de banco e identidade visual SYSNQRA.

**Bloco recebido:** 1  
**Telas registradas:** 3  
**Área:** Financeiro

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

Aguardando o **Bloco 2**. As próximas telas deverão ser acrescentadas ao final deste documento e ao catálogo visual, mantendo a numeração e os wireframes já recebidos.
