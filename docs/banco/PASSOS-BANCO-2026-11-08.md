# SYSNQRA ERP INDUSTRIAL — passos no banco de dados

**Medido no banco vivo em 2026-11-08** (projeto `zsklkydlawgvwgnvxwwx`), com o auditor
somente-leitura `scripts/auditar-contrato-banco-vivo.mjs`:

| Medida | Valor |
|---|---|
| Tabelas usadas pelas telas | 176 |
| Tabelas que existem no banco | 148 |
| Tabelas que faltam | **28** (todas já têm migration escrita neste repo) |
| RPCs chamadas pelo código | 102 |
| RPCs que o REST não resolveu | 98 (22 são criadas pelo pacote do passo 1; 76 estão listadas no Anexo A) |
| Telas bloqueadas hoje por tabela ausente | **24** |
| Migrations no repo | 267 (266 medidas + a do operador, passo 6, criada depois da medição) |

O código está na frente do banco. Nada aqui é para o assistente executar: **quem roda é o
proprietário**, no SQL Editor do Supabase. Os arquivos abaixo são idempotentes
(`create table if not exists`, `create or replace function`, `drop policy if exists` + `create policy`).

> **Nota sobre a medição do cabeçalho:** os números de 176 tabelas, 148 existentes, 28 ausentes e 98 RPCs não resolvidas são o snapshot original do auditor em 08/11/2026, antes dos complementos descritos abaixo. Não representam uma nova leitura do banco após as alterações no repositório.

---

## 1. Ordem de execução

| # | Passo | Onde | Escreve? |
|---|---|---|---|
| 1 | Backup / branch do projeto no Supabase | Dashboard do Supabase | não |
| 2 | Rodar o pacote atualizado das 32 migrations | SQL Editor | **sim** |
| 3 | Conferir as 28 tabelas | SQL Editor | não |
| 4 | Conferir as 76 funções do Anexo A | SQL Editor | não |
| 5 | Conceder o módulo `qualidade_documentos` aos perfis | tela Configuração de Permissões | **sim** |
| 6 | Aplicar a migration do operador (cartão + 3 dígitos do CPF) | SQL Editor | **sim** |
| 7 | Smoke test por módulo | telas do sistema | não |

---

## 2. Passo 2 — pacote atualizado das 32 migrations (copiar e executar)

Arquivo pronto, já consolidado e na ordem de dependência:

```
supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql
```

6.182 linhas, 32 blocos de migration. São as 28 migrations base mais 4 dependências adicionais de segurança/PCP/SGQ. O pacote foi atualizado depois da medição original. Como aplicar: **SQL Editor → New query → colar o arquivo inteiro → Run**, somente após backup e conferência do projeto Supabase.

### O que cada bloco desbloqueia

| # | Migration | Cria (principal) | Tela / rota desbloqueada |
|---|---|---|---|
| 1 | `20260912160000_qms_controlled_documents_workflow_v1.sql` | `erp_documentos_qualidade_revisoes`, `_solicitacoes`, `_aprovacoes`, `_ciencia`, `erp_permissoes_modulos` + RPCs `erp_qms_*` | Controle de Documentos — `/pageprincipal/qualidade/documentos` e `/pageprincipal/documentos-qualidade` |
| 2 | `20260921130000_erp_fornecedores_iso_precos_clientes.sql` | `erp_fornecedores`, `erp_tabelas_preco`, `erp_tabelas_preco_itens` | dependência de Compras/Fornecedores |
| 3 | `20260925134500_manutencao_ordens_v1.sql` | `erp_manutencao_ordens` | dependência de Manutenção/TPM |
| 4 | `20260926190000_erp_fiscal_regras_v1.sql` | `erp_regras_fiscais` | Fiscal — `/pageprincipal/fiscal/impostos` |
| 5 | `20260926_industrial_quality_supplyshopfloor_submodules.sql` | `erp_estoque_separacoes`, `erp_rastreabilidade_cartoes`, `erp_qualidade_8d`, `erp_qualidade_5s_auditorias`, `erp_requisicoes_compra{,_itens}`, `erp_producao_paradas`, `erp_acabamentos` | Separação — `/pageprincipal/estoque/separacao` e Rastreabilidade — `/pageprincipal/estoque/rastreabilidade` |
| 6 | `20260927124000_erp_quality_finance_tpm_hardening.sql` | `erp_financeiro_apuracao_custos` + RPC `erp_tpm_sync_machine_status` | Financeiro — `/pageprincipal/financeiro/grafico-desvios` |
| 7 | `20260927183000_pedidos_compra.sql` | `erp_pedidos_compra{,_itens}` + RPCs de total/numeração | dependência de Compras |
| 8 | `20261001120000_pos_rfq_operacao_comercial.sql` | `erp_rfq{,_itens,_fornecedores}`, `erp_caixas{,_movimentos,_movimentos_itens}` | dependência de Compras/RFQ/PDV |
| 9 | `20261004100000_sgq_integrated_erp_v1.sql` | `erp_sgq_contadores`, `erp_sgq_capa_acoes`, `erp_sgq_auditoria`, `erp_documentos_qualidade_distribuicoes`, `_leituras` + 16 RPCs `erp_qms_*` / `erp_sgq_*` | Controle de Documentos (distribuição/leitura) e RPNC — `/pageprincipal/qualidade/rpnc` |
| 10 | `20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql` | base de engenharia/WMS/qualidade/PCP/fiscal/RH (inclui `qualidade_fmea`) | dependência do FMEA/Plano de Controle |
| 11 | `20261019150000_erp_qualidade_liberacao_lotes.sql` | `erp_qualidade_liberacao_lotes` | Liberação de Lotes — `/pageprincipal/qualidade/liberacao-lote` |
| 12 | `20261019190000_erp_qualidade_genealogia_lotes.sql` | `erp_qualidade_genealogia_lotes` | Genealogia — `/pageprincipal/qualidade/genealogia-lote` e Rastreabilidade |
| 13 | `20261021100000_logistica_expedicao_nfe_etiquetas.sql` | `erp_expedicao_nfe`, `erp_log_etiquetas` | Expedição NF-e — `/pageprincipal/logistica/expedicao-nfe` e Etiquetas — `/pageprincipal/logistica/impressao-etiquetas` |
| 14 | `20261021180000_engenharia_bom_mestre.sql` | `erp_engenharia_bom{,_itens}` + RPCs `erp_salvar_bom_mestre` / `erp_homologar_bom_mestre` | BOM Mestre — `/pageprincipal/engenharia/bom-mestre` |
| 15 | `20261021190000_qualidade_refugos_transacional.sql` | `erp_qualidade_refugos`, `erp_qualidade_defeitos_motivos` (+ 8 motivos por empresa) + RPC `erp_registrar_refugo` | Refugos — `/pageprincipal/qualidade/refugos` e Gráficos — `/pageprincipal/qualidade/graficos-refugo` |
| 16 | `20261022120000_erp_qualidade_auditorias_planta.sql` | `erp_qualidade_auditorias_planta` | Auditorias de Planta — `/pageprincipal/qualidade/auditorias-planta` |
| 17 | `20261024130000_repair_compras_rest_schema.sql` | reparo de requisições/pedidos/RFQ | dependência de Compras |
| 18 | `20261027120000_repair_production_rest_schema.sql` | reparo de BOM, regras fiscais, Bloco K, CRM | dependência de Engenharia/Fiscal |
| 19 | `20261029170000_erp_qualidade_rpnc_ged_evidencias.sql` | `erp_qualidade_rpnc_evidencias` | GED — `/pageprincipal/qualidade/ged` e RPNC |
| 20 | `20261030210000_customer_debit_notes_pod.sql` | `erp_clientes_dn_config`, `erp_notas_debito_clientes` | Notas de Débito — `/pageprincipal/financeiro/notas-debito/configuracoes` |
| 21 | `20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql` | `erp_sgq_auditorias` + 6 RPCs do formulário RPNC | Auditorias SGQ — `/pageprincipal/qualidade/auditorias` e RPNC |
| 22 | `20261101120000_erp_qualidade_certificados_dimensional.sql` | `erp_qualidade_certificados`, `erp_qualidade_certificado_cotas` + RPC `erp_qualidade_certificado_criar` | Certificados — `/pageprincipal/qualidade/certificados` |
| 23 | `20261102031000_erp_fiscal_liberacao_item_pedido_v1.sql` | `erp_fiscal_liberacoes_pedido_item` + RPC `erp_liberar_item_fiscal` | Fiscal — `/pageprincipal/fiscal` |
| 24 | `20261103140000_repair_centrais_rest_schema_v1.sql` | `erp_bom_revisoes` e reparos de centrais | Revisões de BOM — `/pageprincipal/engenharia/revisoes-bom` |
| 25 | `20261104190000_repair_updated_em_exigido_pela_trigger.sql` | reparo da trigger `updated_em` | Apontamento do chão de fábrica |
| 26 | `20261104200000_repair_central_custos_tabela_e_isolamento.sql` | `erp_centros_custos`, `erp_custos_fixos` | Central de Custos |
| 27 | `20261106120000_erp_fmea_plano_controle_aiag_v1.sql` | `erp_fmea_cabecalho`, `erp_plano_controle`, `erp_plano_controle_linha` + RPCs | FMEA — `/pageprincipal/qualidade/fmea` e Plano de Controle — `/pageprincipal/qualidade/plano-controle` |
| 28 | `20261106150000_erp_central_evolucao_v1.sql` | `erp_central_evolucao_item`, `erp_central_evolucao_evento` + catálogo de pendências | Central de Evolução — `/pageprincipal/administracao/central-evolucao` |

### Risco do pacote (medido, não suposto)

O pacote **não apaga tabela, coluna ou migration**. Ele contém `update`/`delete` apenas dentro
do corpo de RPCs (só rodam quando a tela chama a RPC) — a lista completa está no cabeçalho do
arquivo, linhas 17–52. Se algum desses `update`/`delete` não for aceitável agora, apague só o
bloco marcado: a criação das tabelas não depende deles.

---

## 3. Passo 3 — conferência das tabelas (somente leitura)

Cole no SQL Editor depois do passo 2. Tem que voltar **28 linhas com `OK`**.

```sql
with esperadas(nome) as (values
  ('erp_central_evolucao_evento'), ('erp_bom_revisoes'), ('erp_central_evolucao_item'),
  ('erp_clientes_dn_config'), ('erp_documentos_qualidade_distribuicoes'),
  ('erp_documentos_qualidade_aprovacoes'), ('erp_documentos_qualidade_revisoes'),
  ('erp_documentos_qualidade_solicitacoes'), ('erp_engenharia_bom'), ('erp_expedicao_nfe'),
  ('erp_estoque_separacoes'), ('erp_financeiro_apuracao_custos'),
  ('erp_fiscal_liberacoes_pedido_item'), ('erp_fmea_cabecalho'), ('erp_log_etiquetas'),
  ('erp_permissoes_modulos'), ('erp_plano_controle'), ('erp_plano_controle_linha'),
  ('erp_qualidade_auditorias_planta'), ('erp_qualidade_certificado_cotas'),
  ('erp_qualidade_defeitos_motivos'), ('erp_qualidade_genealogia_lotes'),
  ('erp_qualidade_liberacao_lotes'), ('erp_qualidade_refugos'),
  ('erp_qualidade_rpnc_evidencias'), ('erp_regras_fiscais'), ('erp_sgq_auditorias'),
  ('erp_sgq_capa_acoes')
)
select e.nome as tabela,
       case when to_regclass('public.' || e.nome) is null then 'FALTA' else 'OK' end as situacao
from esperadas e
order by situacao desc, tabela;
```

### RLS das tabelas criadas

```sql
select c.relname as tabela,
       c.relrowsecurity as rls_ligada,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as policies
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'erp_documentos_qualidade_revisoes','erp_documentos_qualidade_solicitacoes',
    'erp_documentos_qualidade_aprovacoes','erp_documentos_qualidade_distribuicoes',
    'erp_permissoes_modulos','erp_fmea_cabecalho','erp_plano_controle','erp_plano_controle_linha',
    'erp_engenharia_bom','erp_engenharia_bom_itens','erp_bom_revisoes',
    'erp_qualidade_liberacao_lotes','erp_qualidade_genealogia_lotes',
    'erp_qualidade_refugos','erp_qualidade_defeitos_motivos',
    'erp_qualidade_certificados','erp_qualidade_certificado_cotas',
    'erp_sgq_auditorias','erp_sgq_capa_acoes','erp_qualidade_rpnc_evidencias',
    'erp_expedicao_nfe','erp_log_etiquetas','erp_estoque_separacoes',
    'erp_regras_fiscais','erp_fiscal_liberacoes_pedido_item',
    'erp_financeiro_apuracao_custos','erp_clientes_dn_config',
    'erp_central_evolucao_item','erp_central_evolucao_evento'
  )
order by c.relname;
```

Esperado: `rls_ligada = true` e pelo menos 1 policy em cada linha.

---

## 4. Passo 4 — conferência das funções (somente leitura)

O REST do Supabase não distingue "função inexistente" de "função que exige parâmetros", por
isso a lista abaixo é a única forma exata de saber. Cole e veja o que volta como `FALTA`:

```sql
with esperadas(nome) as (values
  ('erp_access_control_overview'), ('erp_adicionar_operacao_orcamento'), ('erp_apontamento_iniciar'), ('erp_apontamento_finalizar'), ('erp_ativar_revisao_documento'), ('erp_access_control_save_setor'),
  ('erp_admin_save_role'), ('erp_access_control_save_setor_matrix'), ('erp_calcular_custo_produto'), ('erp_calcular_preco_sugerido_venda'), ('erp_comissao_calcular'), ('erp_comissao_vincular'),
  ('erp_comissao_salvar_regra'), ('erp_compras_criar_solicitacao'), ('erp_compras_salvar_pedido_completo'), ('erp_compras_salvar_pedido'), ('erp_concluir_manutencao'), ('erp_compras_validar_fiscal'),
  ('erp_conciliar_transacao_bancaria'), ('erp_calcular_custo_tecnico'), ('erp_confirmar_recebimento_nfe'), ('erp_criar_rpnc_com_quarentena'), ('erp_criar_ordem_producao_v2'), ('erp_decimal_salvar_regra'),
  ('erp_depreciacao_desativar_regra'), ('erp_compras_encaminhar_requisicoes'), ('erp_estoque_inventario_ajustar'), ('erp_documento_qualidade_anexo_substituir'), ('erp_escriturar_nfe_entrada'), ('erp_estoque_inventario_encerrar'),
  ('erp_estoque_inventario_contar'), ('erp_estoque_registrar_movimento'), ('erp_finalizar_pedido_venda'), ('erp_estoque_separar_material'), ('erp_financeiro_registrar_baixa'), ('erp_expedicao_criar_romaneio'),
  ('erp_financeiro_salvar_titulo'), ('erp_depreciacao_salvar_regra'), ('erp_fiscal_estornar_documento'), ('erp_fiscal_saldo_razao'), ('erp_gerar_codigo'), ('erp_has_permission'),
  ('erp_listar_operacoes_orcamento'), ('erp_master_set_empresa_status'), ('erp_master_save_plan'), ('erp_mrp_explodir'), ('erp_obter_custo_industrial_produto'), ('erp_nfe_pagamento_consultar'),
  ('erp_nfe_pagamento_salvar'), ('erp_pcp_bom_adicionar'), ('erp_pcp_gerar_ordens_planejadas_do_mrp'), ('erp_pcp_reordenar_agenda_maquinas'), ('erp_pcp_salvar_posto'), ('erp_pdv_finalizar_venda'),
  ('erp_pcp_mrp_explodir'), ('erp_qms_decidir_inspecao_recebimento'), ('erp_qualidade_revisao_anexo_vincular'), ('erp_reajuste_global_postos_trabalho'), ('erp_registrar_conferencia_producao'), ('erp_registrar_calibracao'),
  ('erp_registrar_parada_manutencao'), ('erp_registrar_manutencao_molde'), ('erp_remover_operacao_orcamento'), ('erp_reservar_saldo_pedido_item'), ('erp_reservar_numero_nfe'), ('erp_reter_lote'),
  ('erp_retificar_pedido_faturado'), ('erp_salvar_acoes_rnc'), ('erp_reajuste_global_vendas'), ('erp_salvar_inspecao_lote'), ('erp_salvar_rascunho_nfe'), ('erp_scan_barcode_metadata'),
  ('erp_salvar_revisao_documento'), ('erp_sgq_registrar_eficacia_rpnc'), ('erp_sgq_salvar_analise_rpnc'), ('fn_receber_lote_almoxarifado')
)
select e.nome as funcao,
       case when p.oid is null then 'FALTA' else 'OK' end as situacao
from esperadas e
left join pg_proc p
       on p.proname = e.nome
      and p.pronamespace = 'public'::regnamespace
order by situacao desc, funcao;
```

Para cada linha `FALTA`, aplique o arquivo indicado no **Anexo A** (SQL Editor, um por vez, na
ordem em que aparecem). Se alguma linha continuar `FALTA` mesmo depois de aplicar o arquivo, o
motivo mais provável é dependência de tabela de outro módulo — rode o pacote do passo 2 de novo
e repita.

---

## 5. Passo 5 — permissões do módulo de documentos

Depois de criar `erp_permissoes_modulos`, a tela de Controle de Documentos abre, mas fica em
somente-leitura até alguém conceder o módulo `qualidade_documentos`. Conceda em
**Configuração de Permissões** (Administração), por perfil/setor, com as colunas:

`visualizar`, `criar`, `editar`, `excluir`, `solicitar_alteracao`, `revisar`, `aprovar`, `liberar`, `bloquear`.

Conferência:

```sql
select usuario_id, setor_id, visualizar, criar, editar, revisar, aprovar, liberar
from public.erp_permissoes_modulos
where modulo = 'qualidade_documentos'
order by usuario_id;
```

Se voltar vazio, nenhum usuário (fora admin de nível máximo) vai conseguir sair da leitura.

---

## 6. Passo 6 — identificação do operador por cartão + 3 dígitos do CPF

O pacote das 28 migrations **não** traz este fluxo. Rode este arquivo separado no SQL Editor:

```
supabase/migrations/20261108120000_erp_operador_cartao_cpf3_v1.sql
```

O que ele faz (idempotente):

1. adiciona `erp_funcionarios.cpf` se ainda não existir;
2. cria índices por empresa em `cpf` e `numero_cracha_rfid`;
3. cria `erp_operador_identificacao_tentativa` (guardada só como hash do cartão, sem CPF);
4. cria a RPC `erp_operador_identificar_cartao(p_cartao text, p_cpf3 text)`, `security definer`,
   que confere cartão/matrícula + 3 últimos dígitos do CPF **na empresa da sessão** e devolve
   apenas os dados públicos do crachá;
5. bloqueia o cartão por 15 minutos após 8 tentativas erradas.

Depois de aplicar, preencha o CPF dos operadores. O CPF pode estar formatado; a função usa só os
dígitos:

```sql
-- conferir quantos operadores ativos já têm CPF preenchido
select count(*) filter (where cpf is not null and btrim(cpf) <> '') as com_cpf,
       count(*) filter (where cpf is null or btrim(cpf) = '') as sem_cpf
  from public.erp_funcionarios
 where lower(coalesce(status,'ativo')) not in ('inativo','desligado','demitido','cancelado','afastado');

-- exemplo de carga pontual (troque empresa/crachá/CPF reais)
-- update public.erp_funcionarios set cpf = '000.000.000-00'
--  where empresa_id = '<uuid-da-empresa>' and numero_cracha_rfid = '<cartao>';
```

Conferência da função (somente leitura):

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'erp_operador_identificar_cartao';
```

Teste na tela: **Chão de Fábrica → Apontamento por cartão de ponto**. O operador digita o cartão e
os 3 últimos dígitos do CPF; a agenda do dia/semana e a ficha de processo só abrem se os dois
conferirem. Sem CPF cadastrado, o operador não entra — o RH precisa preencher antes.

---

## 7. Passo 7 — smoke test por módulo

Somente leitura. Cada linha deve trazer um número (0 é resposta válida; erro não é).

```sql
select 'documentos/revisoes' as modulo, count(*) from public.erp_documentos_qualidade_revisoes
union all select 'documentos/aprovacoes', count(*) from public.erp_documentos_qualidade_aprovacoes
union all select 'documentos/distribuicoes', count(*) from public.erp_documentos_qualidade_distribuicoes
union all select 'fmea', count(*) from public.erp_fmea_cabecalho
union all select 'plano_controle', count(*) from public.erp_plano_controle
union all select 'bom_mestre', count(*) from public.erp_engenharia_bom
union all select 'bom_revisoes', count(*) from public.erp_bom_revisoes
union all select 'liberacao_lotes', count(*) from public.erp_qualidade_liberacao_lotes
union all select 'genealogia_lotes', count(*) from public.erp_qualidade_genealogia_lotes
union all select 'refugos', count(*) from public.erp_qualidade_refugos
union all select 'certificados', count(*) from public.erp_qualidade_certificados
union all select 'auditorias_planta', count(*) from public.erp_qualidade_auditorias_planta
union all select 'sgq_auditorias', count(*) from public.erp_sgq_auditorias
union all select 'sgq_capa', count(*) from public.erp_sgq_capa_acoes
union all select 'rpnc_evidencias', count(*) from public.erp_qualidade_rpnc_evidencias
union all select 'expedicao_nfe', count(*) from public.erp_expedicao_nfe
union all select 'etiquetas_log', count(*) from public.erp_log_etiquetas
union all select 'separacoes', count(*) from public.erp_estoque_separacoes
union all select 'regras_fiscais', count(*) from public.erp_regras_fiscais
union all select 'liberacoes_fiscais', count(*) from public.erp_fiscal_liberacoes_pedido_item
union all select 'apuracao_custos', count(*) from public.erp_financeiro_apuracao_custos
union all select 'dn_config', count(*) from public.erp_clientes_dn_config
union all select 'central_evolucao', count(*) from public.erp_central_evolucao_item
order by modulo;
```

Depois do SQL, abra cada tela da tabela do passo 2 e confirme que o aviso de "tabela não
existe" sumiu. Enquanto isso não acontecer, a tela **não é considerada funcional** — ela não
inventa dado.

---

## 8. O que este pacote não resolve

- **Emissão de NF-e / NFS-e**: falta decidir o provedor (SEFIN/DPS direto ou API Focus/Webmania).
  Não é tabela; é integração e credencial.
- **Dados reais**: o pacote cria estrutura, não popula produção. As únicas cargas são os 8 motivos
  de refugo por empresa e o catálogo da Central de Evolução.

---

## Anexo A — 76 funções fora do pacote (tela → arquivo que define)

| Função | Migration que define | Telas que chamam |
|---|---|---|
| `erp_access_control_overview` | `20261030160000_erp_access_control_sector_matrix_v1.sql` | pages/AccessControlSettings.tsx |
| `erp_adicionar_operacao_orcamento` | `20261003170000_vendas_auditoria_anexos_engenharia.sql` | pages/VendasAnaliseCustos.tsx |
| `erp_apontamento_iniciar` | `20261103100000_mes_apontamento_gravado_no_servidor.sql` | pages/ChaoDeFabricaApontamento.tsx, pages/PCPAreaFuncionario.tsx |
| `erp_apontamento_finalizar` | `20261103100000_mes_apontamento_gravado_no_servidor.sql` | pages/ChaoDeFabricaApontamento.tsx, pages/PCPAreaFuncionario.tsx |
| `erp_ativar_revisao_documento` | `20261010130000_sgq_ged_revision_approval.sql`<br>`20261010172051_sgq_documentos_revisao_anexos_workflow.sql`<br>`20261010172319_sgq_revision_rpcs_private_impl.sql` | pages/qualidade/GEDDocumentos.tsx |
| `erp_access_control_save_setor` | `20261030160000_erp_access_control_sector_matrix_v1.sql` | pages/AccessControlSettings.tsx |
| `erp_admin_save_role` | `20261005180000_erp_admin_tenant_rbac_master_audit.sql` | pages/configuracoes/ConfiguracaoPermissoes.tsx |
| `erp_access_control_save_setor_matrix` | `20261030160000_erp_access_control_sector_matrix_v1.sql` | pages/AccessControlSettings.tsx |
| `erp_calcular_custo_produto` | `20260910194847_erp_master_hardening_costs_v4.sql` | lib/secureDataPipeline.ts |
| `erp_calcular_preco_sugerido_venda` | `20261003110000_vendas_rebuild_relational_pricing_v1.sql`<br>`20261003150000_vendas_modulo_industrial_end_to_end_v1.sql`<br>`20261003190000_lista_precos_cliente.sql` | pages/NovoPedido.tsx |
| `erp_comissao_calcular` | `20261003210000_comissoes_metas_controladoria_comercial.sql`<br>`20261005223000_vendas_vendedor_comissao_integracao.sql`<br>`20261031150000_hardening_comissoes_controladoria.sql` | features/comissoes/CalculoComissao.tsx, features/controladoria/AuditoriaComissoes.tsx |
| `erp_comissao_vincular` | `20261003210000_comissoes_metas_controladoria_comercial.sql`<br>`20261031150000_hardening_comissoes_controladoria.sql` | features/comissoes/PerfilVendedor.tsx |
| `erp_comissao_salvar_regra` | `20261003210000_comissoes_metas_controladoria_comercial.sql`<br>`20261031150000_hardening_comissoes_controladoria.sql` | features/comissoes/CadastroRegras.tsx |
| `erp_compras_criar_solicitacao` | `20261006090000_erp_atomic_operations_stock_integrity.sql` | pages/SolicitacaoCompra.tsx |
| `erp_compras_salvar_pedido_completo` | `20261102032000_erp_compras_salvar_pedido_completo_v1.sql`<br>`20261103190000_erp_compras_pedido_completo_atomic.sql` | pages/ComprasPedidoForm.tsx |
| `erp_compras_salvar_pedido` | `20261006090000_erp_atomic_operations_stock_integrity.sql`<br>`20261026120000_erp_compras_pedido_fiscal_items.sql` | pages/ComprasIndustrial.tsx |
| `erp_concluir_manutencao` | `20261006110000_erp_maintenance_atomic_rbac.sql` | pages/ManutencaoOrdens.tsx |
| `erp_compras_validar_fiscal` | `20261005190000_erp_compras_approval_fiscal_workflow.sql` | pages/FiscalCompras.tsx |
| `erp_conciliar_transacao_bancaria` | `20261008010000_erp_banking_reconciliation_rbac_atomic.sql` | features/banking/BankReconciliation.tsx |
| `erp_calcular_custo_tecnico` | `20261003170000_vendas_auditoria_anexos_engenharia.sql` | pages/VendasAnaliseCustos.tsx |
| `erp_confirmar_recebimento_nfe` | `20260915020500_erp_recebimento_nfe_atomic_lotes_rastreabilidade_v2.sql`<br>`20261006090000_erp_atomic_operations_stock_integrity.sql` | pages/RecebimentoMateriais.tsx |
| `erp_criar_rpnc_com_quarentena` | `20261011120000_erp_rpnc_atomic_quarantine_v1.sql`<br>`20261011123000_erp_rpnc_atomic_capa_actions_v2.sql`<br>`20261011124500_erp_rpnc_atomic_capa_actions_v3.sql`<br>`20261012103000_sgq_8d_code_from_rnc_v1.sql`<br>`20261012110000_sgq_8d_snapshot_after_rnc_metadata_v1.sql` | pages/qualidade/sala-rnc.tsx, pages/QualidadeRNC.tsx |
| `erp_criar_ordem_producao_v2` | `20260927161000_erp_pcp_atomic_create_op_v2.sql`<br>`20261009190000_pcp_vinculo_op_pedido_venda.sql`<br>`20261009193000_pcp_op_ficha_opcional_vinculo_pedido.sql` | pages/PCPIndustrial.tsx, pages/PCPOrdens.tsx, pages/PCPPedidosPendentes.tsx |
| `erp_decimal_salvar_regra` | `20261003223000_controladoria_decimal_precision.sql`<br>`20261031150000_hardening_comissoes_controladoria.sql` | features/controladoria/CadastroDecimais.tsx |
| `erp_depreciacao_desativar_regra` | `20261003143000_inventario_valoracao_controladoria.sql` | features/inventario/RegrasDepreciacao.tsx |
| `erp_compras_encaminhar_requisicoes` | `20261006130000_erp_compras_requisitions_rbac_atomic.sql` | pages/ComprasRequisicoes.tsx |
| `erp_estoque_inventario_ajustar` | `20260923190000_plastibor_inventory_docs_purge_v1.sql` | pages/EstoqueAlmoxarifadoCompact.tsx |
| `erp_documento_qualidade_anexo_substituir` | `20261010173456_documentos_qualidade_anexo_revision_rpc.sql` | pages/DocumentosQualidadeControle.tsx, pages/QualidadeRNC.tsx |
| `erp_escriturar_nfe_entrada` | `20261009200000_post_incoming_nfe_and_recalculate_costs.sql` | pages/IndustrialDataWorkspace.tsx |
| `erp_estoque_inventario_encerrar` | `20260923190000_plastibor_inventory_docs_purge_v1.sql` | pages/EstoqueAlmoxarifadoCompact.tsx |
| `erp_estoque_inventario_contar` | `20260923190000_plastibor_inventory_docs_purge_v1.sql`<br>`20260928164500_erp_security_inventory_and_production_rpc_rbac_v1.sql` | pages/EstoqueAlmoxarifadoCompact.tsx |
| `erp_estoque_registrar_movimento` | `20261006153000_erp_stock_manual_movement_rbac.sql` | pages/AlmoxarifadoSaidaMaterial.tsx, pages/EstoqueAjustes.tsx, pages/EstoqueAlmoxarifadoCompact.tsx |
| `erp_finalizar_pedido_venda` | `20260922042000_erp_finalizar_pedido_venda_v1.sql`<br>`20260927083000_vendas_order_reservation_flow.sql`<br>`20261001103000_vendas_pedido_completo_campos_v3.sql`<br>`20261002160000_vendas_transportadoras_pedido_padrao.sql`<br>`20261002170000_vendas_pedido_aguardando_producao_pcp.sql`<br>`20261003193000_vendas_margem_industrial_item.sql` | pages/NovoPedido.tsx |
| `erp_estoque_separar_material` | `20261005190000_erp_stock_separation_atomic_rbac.sql`<br>`20261006140000_erp_stock_separation_atomic_rbac.sql` | pages/EstoqueSeparacao.tsx |
| `erp_financeiro_registrar_baixa` | `20261005150000_financeiro_titulos_parcelas_baixas_v1.sql`<br>`20261005160000_financeiro_titulos_parcelas_baixas_v1.sql` | modules/financeiro/pages/FinanceiroWorkspace.tsx, pages/FinanceiroTitulos.tsx |
| `erp_expedicao_criar_romaneio` | `20261005170000_fix_expedicao_logistica_schema.sql`<br>`20261006100000_erp_expedicao_atomic_rbac.sql` | pages/ExpedicaoRoteirizacao.tsx, pages/logistica/RomaneioCarga.tsx |
| `erp_financeiro_salvar_titulo` | `20261005150000_financeiro_titulos_parcelas_baixas_v1.sql`<br>`20261005160000_financeiro_titulos_parcelas_baixas_v1.sql` | modules/financeiro/pages/FinanceiroWorkspace.tsx, pages/FinanceiroTitulos.tsx |
| `erp_depreciacao_salvar_regra` | `20261003143000_inventario_valoracao_controladoria.sql` | features/inventario/RegrasDepreciacao.tsx |
| `erp_fiscal_estornar_documento` | `20261003160000_fiscal_controladoria_core.sql`<br>`20261031150000_hardening_comissoes_controladoria.sql` | features/controladoria/AssistenteRetificacao.tsx, features/fiscal/EstornoLancamentos.tsx |
| `erp_fiscal_saldo_razao` | `20261031150000_hardening_comissoes_controladoria.sql` | features/controladoria/PainelRazaoGeral.tsx |
| `erp_gerar_codigo` | `20260928200100_erp_codigo_generation_atomic_history.sql`<br>`20261103110000_erp_codigo_digitos_produto_v1.sql` | pages/cadastro-produtos/FormFichaTecnica.tsx, pages/configuracoes/ConfiguracaoCodificacaoAreas.tsx, pages/ProdutosVendasIndustrial.tsx |
| `erp_has_permission` | `20260913000100_erp_rbac_multitenant_hardening.sql`<br>`20260916141000_align_erp_security_functions_to_auth_identity.sql`<br>`20260917120000_harden_erp_rbac_tenant_authorization.sql`<br>`20260917143000_harden_erp_auth_identity_strict_uid.sql`<br>`20261005180000_erp_admin_tenant_rbac_master_audit.sql`<br>`20261005231000_erp_has_permission_master_and_auth_contract.sql` | pages/configuracoes/ConfiguracaoPerfis.tsx, pages/configuracoes/ConfiguracaoPermissoes.tsx, pages/configuracoes/ConfiguracoesADM.tsx, pages/pcp/PCPAuditoria.tsx, pages/ProcessoIndustrialPage.tsx, pages/SolicitacaoCompra.tsx, pages/UsuariosAdmin.tsx |
| `erp_listar_operacoes_orcamento` | `20261003170000_vendas_auditoria_anexos_engenharia.sql` | pages/VendasAnaliseCustos.tsx |
| `erp_master_set_empresa_status` | `20261005180000_erp_admin_tenant_rbac_master_audit.sql` | pages/Master.tsx |
| `erp_master_save_plan` | `20261005180000_erp_admin_tenant_rbac_master_audit.sql` | pages/Master.tsx |
| `erp_mrp_explodir` | `20260924230000_erp_industrial_execution_architecture_v1.sql` | pages/FinanceiroCustoPadrao.tsx, pages/MRPIndustrial.tsx, pages/PCPOrdens.tsx |
| `erp_obter_custo_industrial_produto` | `20261003193000_vendas_margem_industrial_item.sql` | pages/NovoPedido.tsx |
| `erp_nfe_pagamento_consultar` | `20261102013000_erp_nfe_pagamento_v1.sql` | pages/NFeEmissao.tsx |
| `erp_nfe_pagamento_salvar` | `20261102013000_erp_nfe_pagamento_v1.sql` | pages/NFeEmissao.tsx |
| `erp_pcp_bom_adicionar` | `20261003144000_pcp_chao_fabrica_core.sql` | features/pcp/EngenhariaBOM.tsx |
| `erp_pcp_gerar_ordens_planejadas_do_mrp` | `20261104172000_erp_pcp_gerar_ordens_planejadas_do_mrp.sql` | pages/PCPPlanejamentoIndustrial.tsx |
| `erp_pcp_reordenar_agenda_maquinas` | `20261009180000_pcp_agenda_reordenar_intervalos.sql` | pages/PCPAgendaMaquinas.tsx, pages/PCPSequenciamento.tsx |
| `erp_pcp_salvar_posto` | `20261003144000_pcp_chao_fabrica_core.sql` | features/pcp/PostosTrabalho.tsx |
| `erp_pdv_finalizar_venda` | `20261005170000_pdv_atomic_checkout.sql` | pages/VendasPDV.tsx |
| `erp_pcp_mrp_explodir` | `20261009200000_pcp_mrp_capacity_atomic.sql` | pages/PCPExecucaoIndustrial.tsx |
| `erp_qms_decidir_inspecao_recebimento` | `20261006170000_qms_recebimento_dimensional_ishikawa_v1.sql`<br>`20261010203000_qms_inspection_decision_existing_schema.sql` | pages/QualidadeIndustrial.tsx |
| `erp_qualidade_revisao_anexo_vincular` | `20261011150000_erp_ged_revision_attachment_upload.sql` | pages/qualidade/GEDDocumentos.tsx |
| `erp_reajuste_global_postos_trabalho` | `20261003150000_vendas_modulo_industrial_end_to_end_v1.sql` | pages/TabelaPrecos.tsx |
| `erp_registrar_conferencia_producao` | `20260928164500_erp_security_inventory_and_production_rpc_rbac_v1.sql`<br>`20261006090000_erp_atomic_operations_stock_integrity.sql` | pages/EstoqueAlmoxarifadoCompact.tsx, pages/OperacaoIndustrial.tsx, pages/PCPIndustrial.tsx |
| `erp_registrar_calibracao` | `20260927160000_erp_calibracao_atomic_registration_v1.sql`<br>`20261011213000_erp_metrologia_calibracao_tecnica_v2.sql` | components/CalibracaoPanel.tsx, pages/CalibracaoIndustrial.tsx |
| `erp_registrar_parada_manutencao` | `20260927170000_pcp_tpm_sequence.sql`<br>`20261006110000_erp_maintenance_atomic_rbac.sql` | pages/ManutencaoOrdens.tsx |
| `erp_registrar_manutencao_molde` | `20261103112000_erp_moldes_manutencao_historico_v1.sql` | pages/MoldesFerramentaria.tsx |
| `erp_remover_operacao_orcamento` | `20261003170000_vendas_auditoria_anexos_engenharia.sql` | pages/VendasAnaliseCustos.tsx |
| `erp_reservar_saldo_pedido_item` | `20261021170000_pcp_reserva_transacional_saldo.sql` | pages/PCPPedidosPendentes.tsx |
| `erp_reservar_numero_nfe` | `20261005120000_erp_fiscal_nfe_numbering_and_claim_v1.sql` | pages/NFeEmissao.tsx |
| `erp_reter_lote` | `20260927231000_erp_quality_genealogy_quarantine_v1.sql` | pages/qualidade/QualidadeQuarentena.tsx |
| `erp_retificar_pedido_faturado` | `20261003193000_retificacao_pedido_faturado_controladoria.sql`<br>`20261031150000_hardening_comissoes_controladoria.sql`<br>`20261104171000_erp_audit_logs_colunas_oficiais.sql` | features/controladoria/RetificacaoPedido.tsx |
| `erp_salvar_acoes_rnc` | `20261011123000_erp_rpnc_atomic_capa_actions_v2.sql`<br>`20261011124500_erp_rpnc_atomic_capa_actions_v3.sql` | pages/qualidade/sala-rnc.tsx |
| `erp_reajuste_global_vendas` | `20261003150000_vendas_modulo_industrial_end_to_end_v1.sql` | pages/TabelaPrecos.tsx |
| `erp_salvar_inspecao_lote` | `20261010150000_qualidade_inspecao_quarentena_atomica.sql`<br>`20261010160000_qualidade_inspecao_bloqueio_lote.sql`<br>`20261016170000_harden_quality_inspection_validation.sql` | pages/QualidadeInspecoesIndustrial.tsx |
| `erp_salvar_rascunho_nfe` | `20260924210000_erp_nfe_rascunho_transacional_v1.sql`<br>`20261005130000_erp_nfe_draft_tenant_permission_hardening.sql` | pages/NFeEmissao.tsx |
| `erp_scan_barcode_metadata` | `20261020120000_erp_scan_barcode_metadata.sql` | components/KioskConsultaRapida.tsx |
| `erp_salvar_revisao_documento` | `20260927240000_sgq_documentos_editor_it.sql`<br>`20261010120000_sgq_ged_revision_lifecycle.sql`<br>`20261010172051_sgq_documentos_revisao_anexos_workflow.sql`<br>`20261010172319_sgq_revision_rpcs_private_impl.sql` | pages/qualidade/GEDDocumentos.tsx, pages/qualidade/QualidadeEditorIT.tsx, pages/qualidade/QualidadeProcedimentos.tsx |
| `erp_sgq_registrar_eficacia_rpnc` | `20261029233000_sgq_rpnc_root_cause_effectiveness.sql` | pages/QualidadeRPNCTratamento.tsx, pages/QualityRpncForm.tsx |
| `erp_sgq_salvar_analise_rpnc` | `20261029233000_sgq_rpnc_root_cause_effectiveness.sql` | pages/QualidadeRPNCTratamento.tsx, pages/QualityRpncForm.tsx |
| `fn_receber_lote_almoxarifado` | `20260927160100_erp_recebimento_lotes_transacao_v1.sql`<br>`20261020170000_estoque_lotes_data_validade.sql` | pages/AlmoxarifadoInventario.tsx, pages/estoque/EstoqueRecebimentoLotes.tsx |

---

## Anexo B — mapa tabela ausente → tela → rota

| Tabela | Tela | Rota |
|---|---|---|
| `erp_documentos_qualidade_revisoes` | Controle de Documentos | `/pageprincipal/qualidade/documentos` |
| `erp_documentos_qualidade_solicitacoes` | Controle de Documentos | `/pageprincipal/qualidade/documentos` |
| `erp_documentos_qualidade_aprovacoes` | Controle de Documentos | `/pageprincipal/qualidade/documentos` |
| `erp_documentos_qualidade_distribuicoes` | Controle de Documentos | `/pageprincipal/qualidade/documentos` |
| `erp_permissoes_modulos` | Controle de Documentos | `/pageprincipal/qualidade/documentos` |
| `erp_central_evolucao_item` | Central de Evolução | `/pageprincipal/administracao/central-evolucao` |
| `erp_central_evolucao_evento` | Central de Evolução | `/pageprincipal/administracao/central-evolucao` |
| `erp_bom_revisoes` | Revisões de BOM | `/pageprincipal/engenharia/revisoes-bom` |
| `erp_engenharia_bom` | BOM Mestre | `/pageprincipal/engenharia/bom-mestre` |
| `erp_clientes_dn_config` | Notas de Débito — configuração | `/pageprincipal/financeiro/notas-debito/configuracoes` |
| `erp_expedicao_nfe` | Expedição NF-e | `/pageprincipal/logistica/expedicao-nfe` |
| `erp_log_etiquetas` | Impressão de Etiquetas | `/pageprincipal/logistica/impressao-etiquetas` |
| `erp_estoque_separacoes` | Separação | `/pageprincipal/estoque/separacao` |
| `erp_estoque_separacoes` | Rastreabilidade de Lotes | `/pageprincipal/estoque/rastreabilidade` |
| `erp_financeiro_apuracao_custos` | Gráfico de Desvios | `/pageprincipal/financeiro/grafico-desvios` |
| `erp_fiscal_liberacoes_pedido_item` | Fiscal | `/pageprincipal/fiscal` |
| `erp_fmea_cabecalho` | FMEA | `/pageprincipal/qualidade/fmea` |
| `erp_plano_controle` | Plano de Controle | `/pageprincipal/qualidade/plano-controle` |
| `erp_plano_controle_linha` | Plano de Controle | `/pageprincipal/qualidade/plano-controle` |
| `erp_qualidade_auditorias_planta` | Auditorias de Planta | `/pageprincipal/qualidade/auditorias-planta` |
| `erp_qualidade_certificado_cotas` | Certificados | `/pageprincipal/qualidade/certificados` |
| `erp_qualidade_defeitos_motivos` | Refugos / Gráficos de Refugo | `/pageprincipal/qualidade/refugos` |
| `erp_qualidade_refugos` | Refugos / Gráficos de Refugo | `/pageprincipal/qualidade/refugos` |
| `erp_qualidade_genealogia_lotes` | Genealogia de Lote | `/pageprincipal/qualidade/genealogia-lote` |
| `erp_qualidade_liberacao_lotes` | Liberação de Lotes | `/pageprincipal/qualidade/liberacao-lote` |
| `erp_qualidade_rpnc_evidencias` | GED / RPNC | `/pageprincipal/qualidade/ged` |
| `erp_regras_fiscais` | Fiscal — Impostos | `/pageprincipal/fiscal/impostos` |
| `erp_sgq_auditorias` | Auditorias SGQ | `/pageprincipal/qualidade/auditorias` |
| `erp_sgq_capa_acoes` | RPNC — tratamento | `/pageprincipal/qualidade/rpnc` |

---

## Anexo C — como reconferir tudo depois

No PC, com `.env.local` preenchido:

```
ELECTRON_RUN_AS_NODE=1 "C:\Users\Dri\AppData\Local\Programs\Qoder\Qoder.exe" scripts/auditar-contrato-banco-vivo.mjs
```

A primeira linha do laudo tem que sair `TABELAS_FALTANDO=0`. O JSON completo fica em
`%TEMP%\sysnqra-live-contract.json`.

---

## Complemento de execução — 08/11/2026 (após a medição original)

### Pacote atualizado

O pacote `supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql` agora contém **32 migrations**:

- As 28 migrations-base listadas na tabela acima.
- `20261006140000_erp_stock_separation_atomic_rbac.sql`: RPC transacional e RBAC de separação.
- `20261009200000_pcp_mrp_capacity_atomic.sql`: capacidade/programação PCP e contratos auxiliares.
- `20261010184500_pcp_acabamentos_tenant.sql`: endurecimento de RLS/RBAC de acabamentos.
- `20261108225000_sgq_rel_001_liberacao_transacional_lote.sql`: FK ao lote operacional, auditoria e RPCs de liberação/bloqueio.

O gerador `scripts/gerar-pacote-migrations-pendentes.mjs` foi atualizado para manter essas dependências obrigatórias no pacote.

### Auditoria estática do pacote atualizado

| Verificação | Resultado |
|---|---:|
| Blocos de migration | 32 |
| CREATE TABLE encontrados | 99 |
| Tabelas distintas | 91 |
| CREATE POLICY estáticos | 120 |
| DROP POLICY IF EXISTS estáticos | 132 |
| Policies sem DROP anterior correspondente | 0 |
| CREATE INDEX sem IF NOT EXISTS | 0 |
| ADD COLUMN sem IF NOT EXISTS | 0 |
| DROP TABLE / DROP COLUMN / TRUNCATE | 0 |
| UPDATE/DELETE direto ao colar | 0 |
| UPDATE/DELETE dentro de funções/RPCs | 30 |

Os blocos dinâmicos de RLS também foram considerados na revisão manual. Essa auditoria é estática: não comprova que o Supabase remoto recebeu as migrations.

### Novos arquivos de prova e rastreabilidade

- `docs/banco/VERIFICACAO-POS-MIGRATIONS.sql`: script somente SELECT para conferir tabelas, colunas críticas, RLS, policies, grants, RPCs, contrato Auth/Master e a view de custo com `security_invoker`.
- `docs/banco/MATRIZ-DESBLOQUEIO-24-TELAS.md`: matriz de 24 telas com arquivo, rota, menu, objetos Supabase e divergências de nomenclatura.

### Migrations de funcionalidades novas

Aplicar separadamente, depois do pacote base:

1. `20261108200000_qualidade_templates_inspecao_versionados.sql`: templates de inspeção, itens versionados, publicação e snapshot da versão usada na inspeção.
2. `20261108223500_financeiro_custo_op_real.sql`: custo real por OP, consumo de materiais, custos indiretos, apuração e view `erp_financeiro_custo_op`.

A migration SGQ-REL-001 já está dentro do pacote de 32 migrations.

### SGQ-REL-001 — regra de autorização

A tela já chama `erp_liberar_lote` e `erp_bloquear_lote`. A nova migration acrescenta vínculo por FK ao lote operacional, histórico de auditoria e escrita somente pelas RPCs. A autorização exige usuário ativo no tenant com `nivel_admin >= 8`, alinhado ao padrão de nível administrativo usado pelas migrations recentes.

### Limitação importante de RPC

O snapshot antigo classificou 98 RPCs como não resolvidas pelo REST sem argumentos. Isso não prova que todas estejam ausentes: o PostgREST pode retornar erro de assinatura quando uma função exige parâmetros. A prova correta é consultar `pg_proc`, a assinatura exata e os grants. O novo script de verificação faz essa consulta para as funções cobertas pelo pacote e pelas novas migrations; o inventário completo das RPCs chamadas pelas telas ainda precisa ser concluído no CMP-002.

### Divergências para não duplicar tabelas

- A RNC/CAPA atual usa `qualidade_rnc_capa`, não `erp_qualidade_capa`.
- A auditoria de planta usa `erp_qualidade_auditorias_planta`, não `erp_qualidade_auditorias`.
- A ficha de processo atual usa `erp_fichas_processo`; não foi encontrado uso atual de `erp_historico_ajustes_maquina`.
- `erp_log_etiquetas` está no pacote, mas a tela `EstoqueEtiquetas.tsx` conferida não grava nessa tabela. Confirmar antes de declarar histórico de impressão.
- A tela MRP chama `erp_mrp_explodir`; a migration de capacidade também define `erp_pcp_mrp_explodir`. Não presumir que sejam a mesma assinatura.

### Estado e próximos passos

**Código e pacote preparados; banco remoto não comprovado.** Nenhum DDL foi executado no Supabase.

Depois da aplicação pelo proprietário:

1. Executar `docs/banco/VERIFICACAO-POS-MIGRATIONS.sql`.
2. Resolver todos os resultados `FALTA_*`, `SEM_GRANT_AUTHENTICATED` e RPC ausente.
3. Testar dois tenants e perfis com níveis administrativos diferentes.
4. Concluir CMP-002 (rota × menu × permissão × escrita), CMP-003 (11 rotas `IndustrialDataWorkspace`) e CMP-004 (Auth/RBAC/RLS/Master).
5. Executar auditoria visual e todos os gates, sem `|| true`.
6. Validar preview Vercel. Produção continua bloqueada até autorização explícita.

### Complemento de auditoria de rotas e telas — 08/11/2026

- Relatório CMP-002/003/004: `docs/auditoria/CMP-002-003-004-20261108.md`.
- Matriz de 24 telas: `docs/banco/MATRIZ-DESBLOQUEIO-24-TELAS.md`.
- CMP-003 classificou as 11 rotas diretas de `IndustrialDataWorkspace`: 3 cobertas pelo genérico para uso limitado e 8 que precisam de tela própria ou redirecionamento. Nenhuma rota foi removida.
- CMP-002 encontrou 322 rotas no `AppEntryV2.tsx`, 114 rotas únicas no menu horizontal, 113 correspondências diretas e 209 rotas sem link direto. Estas últimas incluem subrotas, aliases e fluxos do SGQ tablet; não foram tratadas automaticamente como órfãs.
- O CMP-002 continua parcial: o gate `verify-routes` não prova RBAC por ação nem persistência para cada rota.
- O CMP-004 confirmou o contrato Master estático e identificou dependências de RLS sem filtro explícito de empresa em `IndustrialDataWorkspace.tsx` e `EngenhariaRevisoesBOM.tsx`. Ambos estão protegidos pelo manifesto; não foram alterados.

### Complemento de impressão A4 e contrato Master

- FMEA, Plano de Controle, Certificado e RPNC utilizam o motor compartilhado `abrirRelatorio` / componente `SynqraRelatorioA4`.
- Os formulários de RPNC `QualityRpncForm.tsx` e `QualidadeRPNCMultiorigem.tsx` foram migrados da impressão local para o relatório A4 compartilhado, preservando dados, formulário e fluxo.
- Os hashes das telas protegidas foram atualizados no manifesto, mantendo as datas históricas de aprovação.
- `QualityPlanGate.tsx` agora consulta `setor_id` e exige `setor_id IS NULL` para reconhecer Master, alinhando o gate ao contrato estrito. `verify-auth-master-contract.mjs` verifica essa condição.
- `audit:ui-standardization` foi incluído nos comandos `verify:release` e `verify:production`.

**Atenção:** a tela legada `QualidadeRNC.tsx` mantém uma impressão própria de Ishikawa/CAPA. Ela é uma rota distinta da RPNC unificada; não foi alterada nesta ordem porque o escopo A4 autorizado foi aplicado aos relatórios RPNC/FMEA/Plano de Controle/Certificado e o contrato visual dessa tela precisa ser confirmado separadamente.
