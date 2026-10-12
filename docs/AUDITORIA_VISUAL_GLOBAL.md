# Auditoria visual global — ERP Industrial

- Repositório: `plushbeauty/ERPSistemaIndustrial`
- Branch: `fix/qualidade-padrao-formularios-dashboard`
- Fonte do inventário: `src/AppEntryV2.tsx`
- Data da auditoria inicial: 12/10/2026
- Rotas declaradas encontradas: 244
- Caminhos distintos: 243

## Regras de evidência

Uma rota só pode ser marcada como **Concluída** depois de inspeção visual autenticada em desktop/tablet, correção, nova comparação visual e testes. Compilação isolada não comprova validação visual.

O preview Vercel observado nesta execução redirecionou para a tela de autenticação da Vercel; portanto, a captura visual autenticada ainda não foi possível neste ambiente. Não marcar as rotas como visualmente validadas até haver acesso à tela real.

## Lote 1 — Vendas / PDV

- Arquivo alterado: `src/pages/VendasPDV.tsx`
- Commit: `fc6c8c9646d669790b24ac7cda13342352519923`
- Alterações: cards de catálogo maiores, campo de imagem `foto_url`, descrição real, preço/estoque com hierarquia mais clara, ação explícita de adicionar.
- Estado: **Código alterado; type-check/build/preview visual pendentes.**
- Deploy Vercel associado: estado observado `ERROR`, código `git_info_fail`; eventos de build não retornaram logs. Não é possível afirmar que a alteração foi publicada.
- Pendência: verificar CI, resolver ou confirmar a falha de integração do deploy e validar com sessão autenticada; não realizar venda de teste na produção.

## Lote 2 — Catálogo digital

- Arquivo alterado nesta revisão: `src/pages/VendasCatalogoDigital.tsx`
- Alterações: grade com largura mínima de 240 px, área de imagem ampliada, nome/descrição/código e preço com legibilidade maior.
- Estado: **Código alterado no lote atual; testes pendentes.**

## Inventário de rotas

Todas as rotas abaixo permanecem **PENDENTES** de auditoria visual completa, exceto as observações específicas acima. Redirecionamentos e aliases também são registrados para não serem ignorados.


### admin (1)

- [ ] `/admin/logs` — PENDENTE

### ajuda (2)

- [ ] `/ajuda/assistente` — PENDENTE
- [ ] `/ajuda` — PENDENTE

### almoxarifado (1)

- [ ] `/almoxarifado` — PENDENTE

### blog (1)

- [ ] `/blog` — PENDENTE

### cadastro-empresa (1)

- [ ] `/cadastro-empresa` — PENDENTE

### cadastro-master (1)

- [ ] `/cadastro-master` — PENDENTE

### cadastro-produtos (1)

- [ ] `/cadastro-produtos` — PENDENTE

### catalogo (1)

- [ ] `/catalogo` — PENDENTE

### central-custos-industrial (1)

- [ ] `/central-custos-industrial` — PENDENTE

### clientes (1)

- [ ] `/clientes` — PENDENTE

### comercial (1)

- [ ] `/comercial` — PENDENTE

### comissoes (4)

- [ ] `/comissoes` — PENDENTE
- [ ] `/comissoes/regras` — PENDENTE
- [ ] `/comissoes/calculo` — PENDENTE
- [ ] `/comissoes/perfil` — PENDENTE

### compras (16)

- [ ] `/compras` — PENDENTE
- [ ] `/compras/requisicoes` — PENDENTE
- [ ] `/compras/recebimentos` — PENDENTE
- [ ] `/compras/recebimento` — PENDENTE
- [ ] `/compras/rfq` — PENDENTE
- [ ] `/compras/cotacoes` — PENDENTE
- [ ] `/compras/pedido` — PENDENTE
- [ ] `/compras/pedidos` — PENDENTE
- [ ] `/compras/ordem-compra` — PENDENTE
- [ ] `/compras/fornecedores` — PENDENTE
- [ ] `/compras/solicitacao-manual` — PENDENTE
- [ ] `/compras/analise-precos` — PENDENTE
- [ ] `/compras/relatorios` — PENDENTE
- [ ] `/compras/ajuda` — PENDENTE
- [ ] `/compras/solicitacao` — PENDENTE
- [ ] `/compras/solicitacoes` — PENDENTE

### compras-solicitacao (1)

- [ ] `/compras-solicitacao` — PENDENTE

### configuracao-lote (1)

- [ ] `/configuracao-lote` — PENDENTE

### configuracao-lote-pcp (1)

- [ ] `/configuracao-lote-pcp` — PENDENTE

### configuracoes (1)

- [ ] `/configuracoes` — PENDENTE

### configuracoes-adm (1)

- [ ] `/configuracoes-adm/*` — PENDENTE

### contato (1)

- [ ] `/contato` — PENDENTE

### controladoria (6)

- [ ] `/controladoria/retificacao-pedido/:pedidoId` — PENDENTE
- [ ] `/controladoria/razao-geral` — PENDENTE
- [ ] `/controladoria/lucratividade` — PENDENTE
- [ ] `/controladoria/auditoria-comissoes` — PENDENTE
- [ ] `/controladoria/cadastro-decimais` — PENDENTE
- [ ] `/controladoria/assistente-retificacao` — PENDENTE

### custos (1)

- [ ] `/custos` — PENDENTE

### documentos-qualidade (1)

- [ ] `/documentos-qualidade` — PENDENTE

### engenharia (7)

- [ ] `/engenharia/produtos` — PENDENTE
- [ ] `/engenharia/bom` — PENDENTE
- [ ] `/engenharia/roteiros` — PENDENTE
- [ ] `/engenharia` — PENDENTE
- [ ] `/engenharia/revisoes-bom` — PENDENTE
- [ ] `/engenharia/ficha` — PENDENTE
- [ ] `/engenharia/fichas-processo` — PENDENTE

### erp-industrial (1)

- [ ] `/erp-industrial` — PENDENTE

### estoque (10)

- [ ] `/estoque/enderecos` — PENDENTE
- [ ] `/estoque/movimentacoes` — PENDENTE
- [ ] `/estoque` — PENDENTE
- [ ] `/estoque/saldos` — PENDENTE
- [ ] `/estoque/ajustes` — PENDENTE
- [ ] `/estoque/separacao` — PENDENTE
- [ ] `/estoque/etiquetas` — PENDENTE
- [ ] `/estoque/recebimento-lotes` — PENDENTE
- [ ] `/estoque/curva-abc` — PENDENTE
- [ ] `/estoque/recebimento` — PENDENTE

### expedicao (2)

- [ ] `/expedicao/roteirizacao` — PENDENTE
- [ ] `/expedicao/portaria` — PENDENTE

### ficha-engenharia (1)

- [ ] `/ficha-engenharia` — PENDENTE

### fichas-processo (1)

- [ ] `/fichas-processo` — PENDENTE

### financeiro (10)

- [ ] `/financeiro/lista-precos-cliente` — PENDENTE
- [ ] `/financeiro/ano-fiscal` — PENDENTE
- [ ] `/financeiro/fluxo-caixa` — PENDENTE
- [ ] `/financeiro/contas-pagar` — PENDENTE
- [ ] `/financeiro/contas-receber` — PENDENTE
- [ ] `/financeiro/caixa` — PENDENTE
- [ ] `/financeiro/importar-extratos` — PENDENTE
- [ ] `/financeiro/reconciliacao` — PENDENTE
- [ ] `/financeiro/grafico-desvios` — PENDENTE
- [ ] `/financeiro/custo-padrao` — PENDENTE

### fiscal (16)

- [ ] `/fiscal/parametros` — PENDENTE
- [ ] `/fiscal/nfe-entradas` — PENDENTE
- [ ] `/fiscal/custos-industriais` — PENDENTE
- [ ] `/fiscal` — PENDENTE
- [ ] `/fiscal/compras` — PENDENTE
- [ ] `/fiscal/emissao` — PENDENTE
- [ ] `/fiscal/previsao-caixa` — PENDENTE
- [ ] `/fiscal/carteira-nfe` — PENDENTE
- [ ] `/fiscal/impostos` — PENDENTE
- [ ] `/fiscal/pendencias` — PENDENTE
- [ ] `/fiscal/razao-geral` — PENDENTE
- [ ] `/fiscal/auditoria-documental` — PENDENTE
- [ ] `/fiscal/grupos-contabeis` — PENDENTE
- [ ] `/fiscal/estornos` — PENDENTE
- [ ] `/fiscal/classificacao` — PENDENTE
- [ ] `/fiscal/carteira` — PENDENTE

### fornecedores (1)

- [ ] `/fornecedores` — PENDENTE

### inventario (4)

- [ ] `/inventario` — PENDENTE
- [ ] `/inventario/balanco` — PENDENTE
- [ ] `/inventario/depreciacao` — PENDENTE
- [ ] `/inventario/auditoria` — PENDENTE

### login (1)

- [ ] `/login` — PENDENTE

### manual-usuario (1)

- [ ] `/manual-usuario` — PENDENTE

### manutencao (5)

- [ ] `/manutencao` — PENDENTE
- [ ] `/manutencao/cronograma` — PENDENTE
- [ ] `/manutencao/plano-mestre` — PENDENTE
- [ ] `/manutencao/indicadores` — PENDENTE
- [ ] `/manutencao/ordens` — PENDENTE

### master (1)

- [ ] `/master` — PENDENTE

### module-overview (1)

- [ ] `/module-overview` — PENDENTE

### moldes-injecao (1)

- [ ] `/moldes-injecao` — PENDENTE

### mrp (1)

- [ ] `/mrp` — PENDENTE

### operacao-industrial (1)

- [ ] `/operacao-industrial` — PENDENTE

### outlook (2)

- [ ] `/outlook/configuracao` — PENDENTE
- [ ] `/outlook/caixa-entrada` — PENDENTE

### pcp (23)

- [ ] `/pcp` — PENDENTE
- [ ] `/pcp/ordens-industriais` — PENDENTE
- [ ] `/pcp/apontamentos` — PENDENTE
- [ ] `/pcp/engenharia-bom` — PENDENTE
- [ ] `/pcp/roteiro-operacoes` — PENDENTE
- [ ] `/pcp/ficha-processo` — PENDENTE
- [ ] `/pcp/postos-trabalho` — PENDENTE
- [ ] `/pcp/painel-ordens` — PENDENTE
- [ ] `/pcp/apuracao-turno` — PENDENTE
- [ ] `/pcp/ordens` — PENDENTE
- [ ] `/pcp/demanda` — PENDENTE
- [ ] `/pcp/materiais` — PENDENTE
- [ ] `/pcp/paradas` — PENDENTE
- [ ] `/pcp/sequenciamento` — PENDENTE
- [ ] `/pcp/planejamento` — PENDENTE
- [ ] `/pcp/capacidade` — PENDENTE
- [ ] `/pcp/agenda-maquinas` — PENDENTE
- [ ] `/pcp/fichas-processo` — PENDENTE
- [ ] `/pcp/mrp-ii` — PENDENTE
- [ ] `/pcp/execucao-industrial` — PENDENTE
- [ ] `/pcp/dashboard-oee` — PENDENTE
- [ ] `/pcp/tablet-operador` — PENDENTE
- [ ] `/pcp/controle-injetora` — PENDENTE

### planos (1)

- [ ] `/planos` — PENDENTE

### preview (1)

- [ ] `/preview/icones` — PENDENTE

### processos (10)

- [ ] `/processos/injecao` — PENDENTE
- [ ] `/processos/prensados` — PENDENTE
- [ ] `/processos/estamparia` — PENDENTE
- [ ] `/processos/ferramentaria` — PENDENTE
- [ ] `/processos/extrusao` — PENDENTE
- [ ] `/processos/usinagem` — PENDENTE
- [ ] `/processos/soldagem` — PENDENTE
- [ ] `/processos/montagem` — PENDENTE
- [ ] `/processos/corte` — PENDENTE
- [ ] `/processos/pintura` — PENDENTE

### produtos (1)

- [ ] `/produtos` — PENDENTE

### produtos-vendas (1)

- [ ] `/produtos-vendas` — PENDENTE

### qualidade (35)

- [ ] `/qualidade/especificacoes` — PENDENTE
- [ ] `/qualidade/fmea` — PENDENTE
- [ ] `/qualidade/rnc-capa` — PENDENTE
- [ ] `/qualidade/ishikawa` — PENDENTE
- [ ] `/qualidade/capa` — PENDENTE
- [ ] `/qualidade/cep` — PENDENTE
- [ ] `/qualidade/ged-documentos` — PENDENTE
- [ ] `/qualidade/ged-documentos/nova` — PENDENTE
- [ ] `/qualidade/ged-documentos/:id` — PENDENTE
- [ ] `/qualidade/industrial` — PENDENTE
- [ ] `/qualidade` — PENDENTE
- [ ] `/qualidade/instrumentos` — PENDENTE
- [ ] `/qualidade/liberacao-lote` — PENDENTE
- [ ] `/qualidade/dashboard-rnc` — PENDENTE
- [ ] `/qualidade/pfmea` — PENDENTE
- [ ] `/qualidade/documentos` — PENDENTE
- [ ] `/qualidade/inspecao-processo` — PENDENTE
- [ ] `/qualidade/inspecoes` — PENDENTE
- [ ] `/qualidade/tablet` — PENDENTE
- [ ] `/qualidade/inspecoes/operacao` — PENDENTE
- [ ] `/qualidade/metodologia-8d` — PENDENTE
- [ ] `/qualidade/auditoria-5s` — PENDENTE
- [ ] `/qualidade/lista-mestre` — PENDENTE
- [ ] `/qualidade/relatorios-documentos` — PENDENTE
- [ ] `/qualidade/metrologia` — PENDENTE
- [ ] `/qualidade/calibracao` — PENDENTE
- [ ] `/qualidade/editor-it` — PENDENTE
- [ ] `/qualidade/procedimentos` — PENDENTE
- [ ] `/qualidade/assinatura-it` — PENDENTE
- [ ] `/qualidade/genealogia-lote` — PENDENTE
- [ ] `/qualidade/quarentena` — PENDENTE
- [ ] `/qualidade/refugos` — PENDENTE
- [ ] `/qualidade/rnc` — PENDENTE
- [ ] `/qualidade/sala-rnc` — PENDENTE
- [ ] `/qualidade/controle-injetora` — PENDENTE

### raiz (2)

- [ ] `/` — PENDENTE
- [ ] `*` — PENDENTE

### recebimento-materiais (1)

- [ ] `/recebimento-materiais` — PENDENTE

### recuperar-senha (1)

- [ ] `/recuperar-senha` — PENDENTE

### rh (5)

- [ ] `/rh/funcionarios` — PENDENTE
- [ ] `/rh/turnos` — PENDENTE
- [ ] `/rh/epis` — PENDENTE
- [ ] `/rh/epis/entregas` — PENDENTE
- [ ] `/rh` — PENDENTE

### setup-adm-inicial (1)

- [ ] `/setup-adm-inicial` — PENDENTE

### solicitacao-compra (1)

- [ ] `/solicitacao-compra` — PENDENTE

### tabela-precos (1)

- [ ] `/tabela-precos` — PENDENTE

### tabelas-preco (1)

- [ ] `/tabelas-preco` — PENDENTE

### tablet (2)

- [ ] `/tablet/dashboard` — PENDENTE
- [ ] `/tablet/home` — PENDENTE

### teste-erp (1)

- [ ] `/teste-erp` — PENDENTE

### usuarios (1)

- [ ] `/usuarios` — PENDENTE

### usuarios-admin (1)

- [ ] `/usuarios-admin` — PENDENTE

### vendas (40)

- [ ] `/vendas` — PENDENTE
- [ ] `/vendas/dashboard` — PENDENTE
- [ ] `/vendas/pedidos` — PENDENTE
- [ ] `/vendas/pdv` — PENDENTE
- [ ] `/vendas/tablet` — PENDENTE
- [ ] `/vendas/novo-pedido` — PENDENTE
- [ ] `/vendas/orcamentos` — PENDENTE
- [ ] `/vendas/pendentes` — PENDENTE
- [ ] `/vendas/reajuste` — PENDENTE
- [ ] `/vendas/carteira` — PENDENTE
- [ ] `/vendas/status` — PENDENTE
- [ ] `/vendas/pedido/:id` — PENDENTE
- [ ] `/vendas/catalogo-digital/gestao` — PENDENTE
- [ ] `/vendas/clientes` — PENDENTE
- [ ] `/vendas/catalogo-digital` — PENDENTE
- [ ] `/vendas/analise-custos` — PENDENTE
- [ ] `/vendas/dashboard-graficos` — PENDENTE
- [ ] `/vendas/metas` — PENDENTE
- [ ] `/vendas/relatorios` — PENDENTE
- [ ] `/vendas/configuracoes` — PENDENTE
- [ ] `/vendas/produtos` — PENDENTE
- [ ] `/vendas/estoque` — PENDENTE
- [ ] `/vendas/expedicao` — PENDENTE
- [ ] `/vendas/fiscal` — PENDENTE
- [ ] `/vendas/rh` — PENDENTE
- [ ] `/vendas/engenharia` — PENDENTE
- [ ] `/vendas/materiais` — PENDENTE
- [ ] `/vendas/mrp` — PENDENTE
- [ ] `/vendas/pcp` — PENDENTE
- [ ] `/vendas/chao-de-fabrica` — PENDENTE
- [ ] `/vendas/qualidade` — PENDENTE
- [ ] `/vendas/sgq` — PENDENTE
- [ ] `/vendas/conciliacao` — PENDENTE
- [ ] `/vendas/importador` — PENDENTE
- [ ] `/vendas/ano-fiscal` — PENDENTE
- [ ] `/vendas/fluxo-caixa` — PENDENTE
- [ ] `/vendas/balanco` — PENDENTE
- [ ] `/vendas/auditoria` — PENDENTE
- [ ] `/vendas/classificacao-fiscal` — PENDENTE
- [ ] `/vendas/razao-geral` — PENDENTE

## Critérios de conclusão por rota

- [ ] Captura/inspeção autenticada em desktop e tablet; móvel quando aplicável.
- [ ] Comparação com referência equivalente e licença verificada antes de reutilizar código.
- [ ] Dimensões, alinhamento, tipografia, imagem, espaçamento e overflow verificados.
- [ ] Estados vazio, carregamento, erro, sucesso e desabilitado verificados.
- [ ] Navegação direta e atualização testadas.
- [ ] Dados reais, tenant, RLS e permissões preservados.
- [ ] Testes funcionais e console/rede verificados.
- [ ] Nova inspeção após correção e evidência registrada.

## Referências abertas consultadas

- POSplus (React/TypeScript/Tailwind; licença MIT): https://github.com/firedevelop/POSplus
- Simpos (POS React para backend Odoo; licença MIT): https://github.com/hieuhani/simpos
- Documentação do Odoo POS: https://www.odoo.com/documentation/18.0/applications/sales/point_of_sale.html

As referências foram consultadas para padrões de grade de catálogo, uso de imagem, fluxo de caixa, pesquisa e responsividade. Nenhum código foi copiado desses projetos nesta alteração.

## Lote 3 — Produtos e Vendas: correções de contrato e regra de estoque (12/10/2026)

- `src/pages/ProdutosVendasIndustrial.tsx`: a importação Excel agora normaliza acentos, espaços, hífens e underscores nos cabeçalhos, aceitando variações como `Código Interno` sem depender da grafia exata.
- `src/pages/ProdutosVendasIndustrial.tsx`: removidos do payload os campos `cliente`, `desenho` e `dimensional`, cuja existência no contrato consultado não estava comprovada. Os valores importados são preservados no campo existente `observacoes`; nenhuma coluna ou migração nova foi inventada.
- `src/pages/VendasPDV.tsx`: a validação de saldo e quantidade no carrinho respeita `permite_estoque_negativo`; a autorização definitiva da venda continua no RPC real `erp_pdv_finalizar_venda`.
- Evidência de commits: importação Excel `964e5ec59a730c2084ce503710340fff8a2904b5`; regra de estoque no PDV `3edc55f9d2230aaa50790e4367415727ba38aabf` e `fdf85118d1a7855f174f8782578771b35f6ca723`.
- Estado: **correções de código registradas; type-check, build, verify:production e validação visual ainda pendentes**. O status Vercel consultado durante este lote estava pendente; não há evidência de publicação bem-sucedida.
