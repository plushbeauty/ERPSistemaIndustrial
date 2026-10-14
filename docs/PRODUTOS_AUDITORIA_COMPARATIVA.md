# Auditoria comparativa — Cadastro Mestre de Produtos

**Data da auditoria:** 14/10/2026  
**Escopo:** `src/pages/ProdutosVendasIndustrial.tsx`, cadastro de produto, estoque, custos e dados fiscais.  
**Status:** correções de interface aplicadas; integração de catálogos fiscais oficiais permanece pendente e é explicitamente sinalizada no formulário.

## Método e referências verificadas

- **ERPNext / Frappe — código do DocType Item:** https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/item/item.json  
  Campos observados incluem código/nome, grupo, unidade de estoque, situação, item de estoque, compra/venda, unidades alternativas, código de barras, peso, valuation method, reorder levels, lotes/séries, fornecedores e tabelas fiscais.
- **ERPNext — documentação do Item:** https://docs.frappe.io/erpnext/item  
  Confirma grupo, unidade, estoque rastreável, código de barras, método de avaliação, unidades alternativas e reposição.
- **ERPNext — avaliação do estoque:** https://docs.frappe.io/erpnext/item-valuation-transactions  
  A avaliação é atualizada por transações de estoque; o método de avaliação deve ser explícito.
- **Odoo — gestão de produtos:** https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management.html  
  Separa tipo de produto, unidades, embalagens e rastreabilidade.
- **Odoo — tipos de produto e estoque:** https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/configure/type.html  
  Diferencia itens rastreados e não rastreados, regras de reposição e avaliação.
- **Odoo — lotes e números de série:** https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking.html  
  Confirma rastreabilidade por lote/série e ciclo de vida do produto.
- **TOTVS Logix — MAN10021 / aba Fiscal e SPED:** https://tdn.totvs.com/pages/releaseview.action?pageId=423943091  
  Documenta tipo de item para SPED na aba Fiscal e integração com registros de estoque/produção.
- **TOTVS Logix — Cadastro de Item e integração:** https://tdn.totvs.com/pages/viewpage.action?pageId=210048067  
  Mostra código, descrição, descrição reduzida e situação ativa em integração do cadastro de item.
- **ERP brasileiro open source — F2U ERP:** https://github.com/MarcusTechs/f2u-erp  
  Referência nacional pública para cadastro de produtos, estoque e NF-e. O projeto tem stack diferente; não foi copiado código, e a licença deve ser verificada antes de qualquer reutilização literal.
- **Receita Federal — download da NCM vigente:** https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/classificacao-fiscal-de-mercadorias/download-ncm-nomenclatura-comum-do-mercosul  
  A fonte oficial disponibiliza JSON e XLSX pelo Sistema Classif e alerta que a tabela vigente não substitui a consulta de histórico/futuras vigências.
- **Sistema Classif — consulta/histórico NCM:** https://portalunico.siscomex.gov.br/classif/#/nomenclatura/avancada?perfil=publico
- **Portal Nacional da NF-e — tabelas e informes técnicos:** https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=%2FNJarYc9nus%3D  
  A página oficial publica tabelas de CFOP e informes técnicos; as versões vigentes devem ser verificadas antes de atualizar o catálogo local.
- **CONFAZ — Convênio ICMS 142/2018:** https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18  
  Referência normativa de substituição tributária/CEST; a aplicação depende do produto e da legislação pertinente.

## Matriz de decisão

| Área/campo | Evidência no ERP Industrial | Referências comparadas | Decisão |
|---|---|---|---|
| Código, descrição, descrição reduzida | Colunas existentes em `erp_produtos`; código gerado por configuração da empresa | ERPNext Item e TOTVS MAN10021 | **MANTER**; código continua sendo gerado pelo mecanismo existente |
| Grupo | `erp_grupos`, filtrado por `empresa_id`; inclusão rápida grava no banco | ERPNext usa grupo mestre relacionado ao item | **MANTER/CORRIGIR**; pesquisa e inclusão persistente por empresa |
| Subgrupo | Campo texto `erp_produtos.subgrupo`; valores são descobertos dos produtos existentes; não foi encontrada tabela mestre `erp_subgrupos` nas migrations pesquisadas | ERPNext e Odoo usam estruturas mestres/categorias | **MANTER COM LIMITAÇÃO EXPLÍCITA**; o botão + seleciona valor para o produto, não afirma criar um mestre persistente independente |
| Unidades estoque/compra/venda | Campos existentes, opções atuais limitadas a UN/PC/KG/M/L | ERPNext/Odoo suportam unidades e conversões | **MANTER**; catálogo completo e fatores de conversão dependem de modelo mestre validado, não inventar tabela |
| Marca, código de barras, referências e dimensões | Colunas existentes no cadastro | ERPNext/Odoo contemplam identificação e atributos físicos/comerciais | **MANTER** |
| Tipo e situação | Categoria e flags fabricado/comprado/revenda; ativo/inativo já existe | ERPNext/Odoo diferenciam tipo, estoque e disponibilidade | **MANTER**; não confundir tipo industrial com status de ativo |
| Localização padrão | `localizacao_padrao_id` ligado a `erp_estoque_localizacoes` | ERPNext/Odoo usam warehouse/localização padrão | **MANTER NA ABA ESTOQUE**; não duplicar em Geral |
| Estoque atual | Derivado de movimentos e atualizado no banco | ERPNext/Odoo usam razão/ledger de estoque | **MANTER BLOQUEADO PARA EDIÇÃO** |
| Ponto de reposição/estoque máximo | Campos existentes no schema | ERPNext/Odoo oferecem níveis/regras de reposição | **MANTER**; automação de requisição precisa ser verificada separadamente |
| Lote, série, validade e inspeção | Campos de controle e módulos relacionados existem | Odoo e ERPNext documentam lotes/séries/inspeção | **MANTER**; a tela mestre não substitui a execução das transações de rastreabilidade/qualidade |
| Custo médio/último custo | Migration `20260912200000_industrial_produtos_vendas_estoque_integrity_v1.sql` atualiza custos em movimentos de entrada positivos com custo unitário; migration `20260915020500_erp_recebimento_nfe_atomic_lotes_rastreabilidade_v2.sql` atualiza custos no recebimento NF-e | ERPNext atualiza valuation por transações de estoque | **MANTER BLOQUEADO**; entradas genéricas e recebimento NF-e estão representados no código, mas testes de execução no banco não foram realizados nesta auditoria |
| Custo de fabricação | Campo existe e é somente leitura no cadastro; trigger de margem apenas normaliza valor, não calcula BOM/roteiro | ERP industrial requer custo derivado de estrutura/processo | **NÃO DECLARAR AUTOMÁTICO** até validar integração de custos, BOM, mão de obra, máquina, perdas e apontamentos |
| NCM | Coluna de texto existente | Receita Federal oferece catálogo JSON/XLSX vigente e histórico no Classif | **CORRIGIR**; removidas sugestões baseadas em outros produtos. Valida-se apenas formato de 8 dígitos; catálogo oficial ainda não está importado/validado |
| CEST | Coluna de texto existente | CONFAZ/Convênio ICMS 142/18 e legislação aplicável | **CORRIGIR**; removidas sugestões derivadas de produtos existentes. Valida-se apenas formato de 7 dígitos; enquadramento fiscal permanece condicional |
| CFOP entrada/saída | Colunas de texto existentes; opções antigas eram uma lista curta codificada na interface | Portal NF-e publica tabela CFOP versionada | **CORRIGIR**; removidas sugestões estáticas não versionadas; validação de 4 dígitos, sem alegar validação de operação |
| CST ICMS/CSOSN | Colunas existentes | Dependem de regime tributário e operação | **CORRIGIR**; removidas listas incompletas embutidas; valida-se tamanho/formato, não combinação tributária |
| Alíquotas ICMS/IPI/PIS/COFINS | Colunas existentes | A tributação depende da operação, regime e vigência | **MANTER COMO INFORMATIVAS**; não apresentar como motor tributário validado |
| IBS/CBS, FCP, DIFAL, retenções e outras regras | Não foram encontradas colunas equivalentes no schema do cadastro mestre inspecionado | Portal NF-e publica tabelas/informes próprios, inclusive IBS/CBS | **NÃO IMPLEMENTAR NO CADASTRO MESTRE** sem auditoria do módulo fiscal, schema e cálculo por operação |
| Observações | Coluna existente, agora junto da área comercial/custos | Padrões de ERP mantêm notas gerais fora dos campos transacionais | **MANTER/REPOSICIONAR** junto dos dados comerciais, sem substituir ficha técnica |
| Ajuda por campo | Helper contextual existente | Padrão de formulários empresariais | **MANTER** |

## Integridade fiscal aplicada nesta alteração

- O formulário não utiliza mais produtos cadastrados como se fossem um catálogo oficial de NCM/CEST.
- Removidas as listas curtas de CST/CSOSN/CFOP embutidas na interface, que não tinham versão oficial vinculada.
- Foram incluídos links diretos para Classif, download oficial NCM, tabelas NF-e e CONFAZ.
- NCM, CEST, CFOP, CST ICMS e CSOSN recebem validação de formato/tamanho quando preenchidos.
- **Limite importante:** validação de formato não confirma vigência, classificação correta, enquadramento CEST, operação CFOP, regime tributário ou imposto devido.
- A fonte oficial permite obter NCM em JSON, mas esta branch ainda não contém um catálogo fiscal local importado, versionado e testado. A integração de dados e atualização periódica segue pendente; o formulário deixa isso explícito em vez de simular uma busca oficial.
- A tabela CFOP deve ser sincronizada a partir da publicação vigente do Portal NF-e. CEST precisa respeitar o Convênio ICMS 142/2018 e as regras aplicáveis à UF/mercadoria. Não existe uma combinação universal de NCM+CEST+CFOP+alíquotas para todos os produtos.

## Estado técnico e pendências

1. **Implementado no código:** organização fiscal por seções; campos de código com limite de caracteres; remoção de sugestões não oficiais; links de consulta; mensagens explícitas sobre ausência do catálogo local.
2. **Confirmado no código/migrations:** grupo mestre persistente por empresa; subgrupo é texto do produto; localização padrão aponta para o cadastro de localizações; custos médio/último são atualizados por rotinas de movimentos/recebimento NF-e.
3. **Não validado em ambiente real:** gravação de grupo sob RLS, ciclo completo de recebimento NF-e e atualização de custos, renderização visual de todas as larguras, fluxo de fabricação/custo industrial.
4. **Bloqueio de publicação identificado:** o deployment do commit `b2a672ae1fc74d7dc4975c607e4715d19c1921e0` falhou em `verify:approved-homepage` com a mensagem “A área inicial deve manter imagem à esquerda e texto à direita”. Não desativar o teste; corrigir o conflito entre a tela inicial e seu contrato de regressão antes de considerar o preview pronto.
5. **Próxima etapa fiscal para produção:** importar os catálogos oficiais em tabelas/arquivos versionados após revisar schema, licença, estratégia de atualização, histórico e regras por UF/regime; depois testar NCM/CEST/CFOP e motor tributário no fluxo de emissão NF-e.

## Critério de aprovação

O cadastro só pode ser considerado concluído quando a verificação de regressão da página inicial passar, o type-check/build passarem, a tela for visualmente conferida, a persistência for testada em ambiente autorizado e os catálogos fiscais versionados estiverem integrados ou a limitação permanecer formalmente aceita como pendência.
