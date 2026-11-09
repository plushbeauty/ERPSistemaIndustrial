# Benchmark de sistemas de referência — SYSNQRA ERP INDUSTRIAL

**Data:** 08/11/2026
**Revisão:** REV-BENCH-20261108-01
**Natureza:** documento de análise. Não altera telas, dados, rotas, permissões nem contratos.
**Ordem de origem:** "atualizar todas as pages com versões premium, analisar todos os sistemas de códigos abertos, melhorar tudo, ver sistemas para ver o que falta fazer e ajustar" (proprietário, 2026-11-08).

---

## 1. Método

- Cada sistema foi lido nas fontes oficiais do próprio projeto (repositório, README, documentação publicada). O que não estava declarado na fonte aparece como **não declarado**, nunca como "inexistente".
- O inventário do SYSNQRA veio do código desta branch: `src/components/layout/ERPHorizontalShell.tsx` (menu), `src/components/quality/qualityTabletModules.ts` (catálogo SGQ) e `src/AppEntryV2.tsx` (rotas reais).
- A conferência de banco veio de `supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql` (28 migrations pendentes de aplicação no ambiente remoto).
- O benchmark serve para **priorizar lacunas funcionais**, não para copiar identidade visual, textos ou fluxo de tela. O padrão visual continua sendo o aprovado pelo proprietário (régua de 30px, ver `docs/ui/CONTRATO-APROVACAO-VISUAL.md`).

---

## 2. O que cada referência entrega (fonte oficial)

### 2.1 ERPs de manufatura

| Sistema | Licença | Força declarada na fonte | O que interessa ao SYSNQRA |
|---|---|---|---|
| **Odoo Community** | LGPL-3.0 | MRP, ordens de produção, roteiros, BOM multi-nível, rastreabilidade por lote/série, código de barras, qualidade nativa (pontos de inspeção, quarentena, alertas de NC) | Modelo de **pontos de inspeção por operação** e vínculo BOM → roteiro → OP |
| **ERPNext** | GPL-3.0 | PCP, estoque, compras, ordens de serviço; qualidade com *Inspection Templates*, *Quality Inspection*, *Non-Conformance*, *Batch Tracking*, qualidade de fornecedor | **Template de inspeção reutilizável** (hoje o SYSNQRA inspeciona por tela, não por template versionado) |
| **Apache OFBiz** | Apache-2.0 | MRP, cadeia de suprimentos, ativos, alta customização | Referência de **escopo MRP II** (capacidade, necessidade líquida) |
| **iDempiere / Adempiere** | GPL-2.0 (badge do repo; pacote sem SPDX declarado) | MRP II, engenharia de produto, custos industriais; arquitetura corporativa | **Custo industrial** por OP e por componente |
| **Carbon ERP** (`crbnos/carbon`) | AGPL-3.0 | ERP + MRP + MES + QMS em **um único schema PostgreSQL**; módulos Inventory & Costing, Planning, MES, QMS, Traceability, Maintenance & Assets | A referência mais próxima do SYSNQRA: mesma stack (Postgres), mesmo escopo. **Genealogia de lote** e **manutenção ligada a ativo** |
| **MyCompany** (`lsfusion-solutions/mycompany`) | Apache-2.0 | Ordens de produção, BOM com operações, centros de trabalho, work orders | Simplicidade de **ordem de produção com operações encadeadas** |
| **Dolibarr** | GPL-3.0+ | BOM, ordens de fabricação, postos de trabalho, lotes/séries; **sem módulo de qualidade no README** | Referência de leveza e navegação; qualidade **não** é referência aqui |

### 2.2 Fiscal brasileiro

| Sistema | Licença | Força declarada | O que interessa ao SYSNQRA |
|---|---|---|---|
| **NFePHP** | LGPLv3 / MIT | Biblioteca PHP para NF-e/NFC-e; base de muitos sistemas nacionais | Contrato de **validação e assinatura** de XML; não é sistema pronto |
| **OCA `l10n-brazil`** | AGPL-3.0 | Localização brasileira oficial do Odoo: NF-e, NFS-e, CT-e | **NFS-e** é tratada como módulo próprio, separado da NF-e |
| **Emissor NFS-e** (`kursku/emissor-nfse`) | (não declarada na página) | Painel web + CLI para o **Ambiente Nacional / SEFIN**, padrão DPS; marcado "Em desenvolvimento", produção liberada a partir de 01/12/2026 (NT 009) | Referência de **DPS / padrão nacional** para NFS-e |

### 2.3 SaaS e APIs fechadas (referência de escopo, não de código)

| Sistema | Escopo público declarado | O que interessa ao SYSNQRA |
|---|---|---|
| **Bling / Omie** | ERP comercial com NF-e, NFS-e, estoque, financeiro, marketplace | NFS-e como **módulo de primeira classe**, não apêndice |
| **Nomus** | ERP industrial: PCP, MRP, custos, qualidade, manutenção | **Custo industrial fechado por OP** |
| **MRPeasy** | MRP para pequena/média indústria, BOM, roteiros, capacidade | **Capacidade finita** com visualização simples |
| **Focus NFe / WebmaniaBR** | API fiscal: NF-e, NFC-e, NFS-e, CT-e, MDF-e | NFS-e por **API com padrão nacional** |
| **DOO! / Weet / 8Quali** | SGQ web: documentos, auditorias, NC, calibração, indicadores | **Portal de qualidade** com indicadores consolidados e assinatura de leitura |

### 2.4 Fora do escopo industrial

- **QATrack+** (Apache-2.0): QA de radioterapia e imagem médica. O motor de testes e calibração é conceitualmente útil, mas **não é QMS de manufatura** — não serve de referência de fluxo.

---

## 3. Inventário do SYSNQRA (o que já existe no código)

Módulos com rota real no roteador desta branch:

- **Financeiro** (12 telas), **Comissões** (3), **Controladoria** (5)
- **Cadastros Mestres** (produto + fiscal)
- **RH/DP** (5)
- **Engenharia e PCP** (13: central, fichas, roteiros, capacidade, OP, Gantt, agenda, sequenciamento, planejamento, MRP II, apontamentos, paradas, auditoria)
- **Chão de Fábrica** (3: portal do operador, apontamento, postos)
- **Sistema SGQ** (34 cards; rotas conferidas uma a uma)
- **Compras** (7), **Fiscal** (13, incluindo NF-e emissão/entrada/carteira)
- **Vendas** (9), **Estoque** (13), **Almoxarifado** (2)
- **Engenharia de Produto/BOM** (5: catálogo, BOM, roteiros, revisões)
- **Manutenção** (5), **Relatórios** (4)

**Fiscal:** NF-e presente e completa no roteador. **NFS-e: nenhuma ocorrência** em `src/` (busca textual por `nfse`, `nfs-e`, `nota de servi` retornou zero).

**Conferência de esquema (08/11/2026):** o código referencia 176 tabelas via `supabase.from(...)`; as migrations de `supabase/migrations` mais o pacote pendente declaram 240 `CREATE TABLE`. Nenhuma tabela referenciada ficou órfã — ou seja, as lacunas abaixo são de **aplicação no banco**, não de autoria de esquema. O que bloqueia tela hoje é o pacote de migrations ainda não executado no ambiente remoto.

---

## 4. Matriz de capacidade — SYSNQRA × referências

Legenda: **OK** = implementado com tela e persistência; **PARCIAL** = tela existe mas falta peça funcional; **BLOQUEADO** = tela no código, tabela ausente no banco remoto; **AUSENTE** = sem tela.

| Capacidade | Referências que entregam | SYSNQRA | Evidência no código |
|---|---|---|---|
| BOM multi-nível + revisão | Odoo, ERPNext, iDempiere, Dolibarr, MyCompany | **BLOQUEADO** | Telas em `/pageprincipal/engenharia/*`; `erp_engenharia_bom` e `erp_bom_revisoes` estão no pacote pendente |
| Roteiro de operações por produto | Odoo, ERPNext, MyCompany, Dolibarr | **OK** | `/pageprincipal/pcp/roteiros`, `/pageprincipal/engenharia/roteiros` |
| MRP / necessidade líquida | OFBiz, iDempiere, MRPeasy, Nomus | **PARCIAL** | `MRPIndustrial.tsx` chama `erp_mrp_explodir`; tela de MRP II existe. Falta confirmar execução ponta a ponta com dados reais |
| Capacidade finita | MRPeasy, OFBiz, iDempiere | **PARCIAL** | `/pageprincipal/pcp/capacidade` existe; sem evidência de calendário finito por centro de trabalho |
| Ordem de produção com apontamento | Odoo, ERPNext, Carbon, MyCompany | **OK** | `/pageprincipal/pcp/apontamentos`, Portal do Operador |
| MES / chão de fábrica | Carbon, Nomus | **OK** | Chão de Fábrica (3 telas) + portal do operador |
| Rastreabilidade / genealogia de lote | Odoo, ERPNext, Carbon, Dolibarr | **BLOQUEADO** | `/estoque/rastreabilidade`, `/qualidade/genealogia-lote`; `erp_qualidade_genealogia_lotes` no pacote pendente |
| Quarentena de lote | Odoo, ERPNext | **PARCIAL** | `/qualidade/quarentena` existe; `erp_qualidade_liberacao_lotes` no pacote pendente |
| Liberação de lote pela qualidade | Carbon, QMS Odoo/ERPNext | **BLOQUEADO** | `/qualidade/liberacao-lote`; `erp_qualidade_liberacao_lotes` no pacote pendente |
| Template de inspeção versionado | ERPNext | **AUSENTE** | Inspeções existem por tela (`/qualidade/inspecoes`, `/inspecao-processo`), sem template reutilizável |
| FMEA AIAG com NPR | QMS Odoo/ERPNext, 8Quali | **BLOQUEADO** | `FMEA.tsx` usa `erp_fmea_cabecalho`; migration existe no repositório, aplicação pendente no banco |
| Plano de Controle (CPP) ligado ao FMEA | 8Quali | **BLOQUEADO** | `PlanoControle.tsx` usa `erp_plano_controle*`; tabelas no pacote pendente |
| RPNC / 8D / CAPA | QMS Odoo/ERPNext, DOO!, 8Quali | **OK** | `/qualidade/rpnc`, `/qualidade/metodologia-8d`, `/qualidade/acompanhamento-rnc` |
| Evidências de RPNC | DOO!, 8Quali | **BLOQUEADO** | `erp_qualidade_rpnc_evidencias` no pacote pendente |
| Auditorias por norma / planta / 5S | DOO!, 8Quali | **PARCIAL** | 3 telas no SGQ; `erp_qualidade_auditorias_planta` e `erp_sgq_auditorias` no pacote pendente |
| Documentos controlados, revisão e distribuição | DOO!, 8Quali, ERPNext | **PARCIAL** | GED, lista mestra, IT, assinatura existem; `erp_documentos_qualidade_aprovacoes` e `..._distribuicoes` no pacote pendente |
| Calibração de instrumentos | QATrack+, 8Quali, DOO! | **OK (verificar alerta)** | `/qualidade/calibracao`, `/qualidade/instrumentos`, `/qualidade/metrologia` |
| Manutenção de ativo | Carbon, Nomus | **OK** | `/pageprincipal/manutencao/*` (5 telas) |
| Custos industriais por OP | iDempiere, Nomus, Carbon | **PARCIAL** | `/financeiro/custo-padrao` existe; `erp_financeiro_apuracao_custos` no pacote pendente |
| Separação / expedição | Odoo, Bling | **BLOQUEADO** | `/estoque/separacao`; `erp_estoque_separacoes` e `erp_expedicao_nfe` no pacote pendente |
| Cadastro de regras fiscais | OCA, Bling, Omie | **BLOQUEADO** | `erp_regras_fiscais` no pacote pendente |
| NF-e (emissão, entrada, carteira) | NFePHP, OCA, Focus, Bling | **OK** | `/pageprincipal/fiscal/emissao`, `/carteira-nfe`, `/nfe-entradas` |
| **NFS-e (padrão nacional / DPS)** | OCA, Emissor NFS-e, Focus, Bling, Omie | **AUSENTE** | Zero ocorrência em `src/` |
| Portal de indicadores do SGQ | 8Quali, DOO! | **PARCIAL** | Dashboards RNC, OEE e refugo existem; sem painel único consolidado do SGQ |

---

## 5. Lacunas ordenadas

### P0 — bloqueia a operação real (tabela ausente, tela pronta)

1. **Aplicar o pacote de 28 migrations** `supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql`.
   Sem isso, estas telas abrem mas não persistem: FMEA, Plano de Controle, BOM e revisões, genealogia, liberação de lote, evidências de RPNC, auditorias de planta, aprovações/distribuições de documentos, separação, expedição NF-e, regras fiscais, apuração de custos.
   **Ação:** proprietário executa no SQL Editor do Supabase. Não há DDL remota autorizada por agente.

### P1 — lacuna funcional real, independente de banco

2. **NFS-e** — único documento fiscal brasileiro sem nenhuma tela. Bling, Omie, Focus e a localização OCA tratam NFS-e como módulo de primeira classe.
   **Menor caminho:** módulo novo no menu Fiscal com emissão por DPS/padrão nacional, reaproveitando o contrato de emissão já usado na NF-e (mesma camada de assinatura, mesmo padrão de status/carteira). Exige decisão do proprietário sobre provedor (API própria × Focus/Webmania × SEFIN direto).
3. **Template de inspeção versionado** (ERPNext) — reduz retrabalho: hoje cada inspeção é configurada na tela. Um template por produto/operação evita divergência entre turnos.
4. **Custo industrial por OP** — `erp_financeiro_apuracao_custos` está no pacote P0, mas a **lógica** de fechamento (material + mão de obra + overhead por OP) não existe. iDempiere, Nomus e Carbon entregam isso.

### P2 — consistência e experiência

5. **Painel único do SGQ** consolidando RNC, refugo, auditorias e calibração vencida — hoje espalhado em quatro dashboards.
6. **Alerta de calibração vencida** na Central de Metrologia — QATrack+ e 8Quali tratam vencimento como evento, não como coluna de tabela.
7. **Impressão A4 única** para documentos do SGQ (FMEA, CPP, certificado, RPNC) — hoje há múltiplos `window.print` com folhas próprias.

---

## 6. O que este benchmark **não** autoriza

- Copiar identidade visual, marca, textos ou ícones de qualquer sistema listado.
- Introduzir dados fictícios, seeds de demonstração ou telas "de vitrine" para simular paridade.
- Declarar módulo funcional sem persistência real no Supabase.
- Alterar telas aprovadas ou o contrato visual de 30px.
- Executar DDL no ambiente remoto sem ordem explícita do proprietário.

---

## 7. Limites da pesquisa

- Páginas de repositório não listam todo o produto: ausência de menção a um recurso **não prova** que ele não exista.
- iDempiere publica badge GPL-2.0 mas o pacote não declara SPDX de forma inequívoca; licença deve ser confirmada antes de qualquer reuso de código.
- Emissor NFS-e está marcado "Em desenvolvimento" e com produção restrita até 01/12/2026 (NT 009) — não é base estável para integração imediata.
- Recursos de SaaS fechado (Bling, Omie, Nomus, MRPeasy, Focus, Webmania, DOO!, Weet, 8Quali) foram lidos em material público de marketing; servem para **escopo**, não para arquitetura.

---

## 8. Próximos incrementos derivados

| # | Incremento | Depende de banco? | Situação |
|---|---|---|---|
| 1 | Régua premium global no conteúdo autenticado | Não | **Publicado** (`601046ab`) |
| 2 | Este documento de benchmark | Não | Publicado neste commit |
| 3 | Alerta de calibração vencida na metrologia | Não | A implementar |
| 4 | Conversão das impressões para folha A4 única | Não | A implementar |
| 5 | Aplicação do pacote de migrations | Sim (ação do proprietário) | Bloqueado |
| 6 | Módulo NFS-e | Sim + decisão de provedor | Aguarda ordem |
