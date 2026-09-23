# ORDEM MÁXIMA DE ARQUITETURA — ERP INDUSTRIAL TOTAL

## Objetivo
Transformar esta branch em um ERP industrial real, operacional e homologável. O PDF `ERP_Industrial_Completo_Projeto_Telas (1).pdf` é a referência visual e funcional obrigatória. O código já existente no repositório é patrimônio do projeto: reutilizar componentes, páginas, consultas, funções, estilos e fluxos que já funcionam antes de criar novos.

## Regra absoluta
NÃO criar tela demonstrativa, mock, card com número inventado, tabela estática, botão sem persistência, sucesso falso, select gigante, fluxo quebrado, placeholder como implementação ou módulo duplicado.
Se uma função não estiver implementada de ponta a ponta, marcar como PENDENTE e continuar a implementação.
Toda gravação só pode informar sucesso depois de resposta positiva do banco/API.
Toda leitura operacional deve vir de dados reais.
Toda alteração precisa respeitar tenant/empresa, RLS, permissões e auditoria.

## Fonte de verdade
1. PDF do projeto de telas.
2. Schema real do Supabase.
3. Código existente que já funciona.
4. Fluxos e referências funcionais já incorporados ao projeto.
Não substituir o PDF por uma interpretação própria.

## Shell obrigatório
/erp-industrial deve sempre montar um shell estável independente dos módulos:
- marca SGQ ERP INDUSTRIAL;
- empresa/filial real da sessão;
- cliente/tenant quando aplicável;
- usuário real;
- planta/status real;
- data e hora vivas;
- pesquisa;
- Tablet;
- tema;
- logout;
- Error Boundary visível.
Um erro de módulo não pode apagar o shell nem produzir tela preta.

## Padrão de todas as telas
Topo: título, código/documento, status, empresa/filial e ações.
Filtros: período, filial, planta, depósito, centro de custo, cliente/fornecedor, produto, status, responsável conforme o domínio.
Formulários: labels claros, unidade, máscara, validação, obrigatoriedade, ajuda contextual, autocomplete e histórico.
Grades: ordenação, filtro por coluna, seleção, paginação, totalizadores, exportação e colunas configuráveis.
Status: Rascunho, Em análise, Aguardando aprovação, Aprovado, Liberado, Em execução, Bloqueado, Cancelado, Encerrado.
Tablet/chão de fábrica: toque grande, QR/código de barras, confirmação visual e operação com luvas.

## Fluxos obrigatórios de negócio
### Vendas → Produção
Pedido → disponibilidade → MRP → OP → apontamento → inspeção → estoque acabado → faturamento → expedição.

### Compras
Solicitação → cotação → mapa comparativo → aprovação → pedido → recebimento NF/XML → inspeção → estoque → contas a pagar → contabilidade.

### Recebimento
NF/XML → validação fiscal → conferência física → lote/validade → endereço WMS → financeiro → contábil.

### Qualidade
Plano → coleta → resultado → aprovado/reprovado → NC → causa → ação corretiva/preventiva → eficácia → encerramento.

### Engenharia
Produto → BOM → roteiro → ficha de processo → aprovação → revisão → publicação → PCP/OP.

## PCP — implementação completa
Não tratar PCP como calendário.
Deve existir:
- Pedidos pendentes;
- carteira de pedidos;
- previsão/demanda;
- PMP;
- MRP;
- MRP II/necessidades;
- capacidade;
- sequenciamento;
- calendário;
- cenários/exceções;
- reserva de materiais;
- geração e acompanhamento de OP;
- programação por máquina;
- status Andon;
- apontamento/entrada da produção;
- refugo/perdas/retrabalho;
- encerramento da OP;
- integração com qualidade e estoque.

### Pedidos pendentes
Pesquisar por cliente, período, pedido, produto e status.
Abrir pedido.
Reservar.
Enviar para PCP.
Gerar OP.
Importar pedido XML.

### XML
Upload de XML como primeiro mecanismo real.
Validar antes de gravar:
número, data, CNPJ, cliente, itens, código, descrição, quantidade, unidade, valores, NCM/CFOP.
Resolver cliente por documento real.
Resolver produto por código real.
Mostrar prévia.
Confirmar.
Persistir pedido e itens.
Registrar origem XML/auditoria.
Nunca criar cliente/produto silenciosamente.

### Apontamento
OP, produto, lote, pedido interno, máquina, operação, operador, data/hora, quantidade produzida, boa, rejeitada, perda, motivo, início/fim, tempo real, observação, evidências.
Após gravação: atualizar saldo da OP, lote, qualidade e estoque.

## Engenharia/Ficha de Processo
Uma experiência unificada.
Identificação: código cliente, cliente, desenho, modelo.
Máquina deve vir do cadastro mestre de máquinas/equipamentos.
Operações devem vir do cadastro mestre de operações.
Setup em tempo.
Ciclo com tempo, quantidade/hora e quantidade/dia.
Materiais em lista única:
código, descrição, consumo, perda, lote, origem, peso/medida, unidade.
Busca de material por código primeiro; lupa abre consulta filtrável por grupo Matéria Prima e descrição.
Não usar dropdown de milhares de itens.
Lista BOM cresce conforme materiais são incluídos.
Qualidade trata desenho/tolerância/medição, sem duplicar consumo/perda.
Master list inferior com todos os produtos/fichas e última revisão.
Persistência real e revisão/histórico.

## Qualidade
Implementar de verdade:
- PPAP/RIA/PSW;
- características dimensionais;
- tolerâncias do desenho;
- amostras;
- medições;
- gráficos;
- certificados de matéria-prima;
- desenhos/anexos;
- inspeção recebimento;
- inspeção processo;
- inspeção final;
- instrumentos;
- calibração;
- NC/RPNC;
- CAPA;
- auditorias;
- FMEA;
- SIPOC;
- 5W2H;
- Ishikawa/5 porquês;
- riscos;
- plano de inspeção;
- fornecedores e indicadores.
Inspeção final deve identificar produto, lote, OP/pedido, máquina, operador, data, defeito, quantidades e gráfico.
RPNC deve ter formulário próprio e lista por estado.

## Estoque/WMS
Produto acabado, matéria-prima, lotes, endereços, entradas, saídas, transferências, reservas, inventário, consumo de OP, recebimento, rastreabilidade.
Consulta e Entrada devem ser claramente separados.
Nada de contagem falsa.

## Compras
Solicitação → cotação → mapa comparativo → aprovação → pedido → recebimento → NF/XML → inspeção → estoque → financeiro.
Fornecedor deve ter histórico de prazo prometido x prazo real e indicador de atraso.

## Fiscal/NF-e
Emitir/editar com dados reais persistidos:
destinatário, itens, quantidade, preço, impostos, pagamento, transporte e demais campos suportados pelo schema.
DANFE A4 para impressão.
Chave/barcode quando disponível.
Não inventar campo que o banco não suporta: primeiro ampliar schema de forma rastreável.

## Financeiro/Contábil
Contas a pagar, receber, caixa, bancos, conciliação, cobrança, pagamentos, impostos, centros de custo, lançamentos, rateios, auditoria e integração originada dos documentos reais.

## RH/DP
Colaboradores, cargos, jornadas, escalas, ponto, férias, benefícios, folha, SST, treinamentos, documentos e indicadores.

## Logística
Separação, conferência, romaneio, frete, roteirização, rastreamento, devolução e logística reversa.

## Administração
Usuários, perfis, permissões, alçadas, parâmetros, integrações, logs, auditoria, backups, notificações e monitoramento.
Master é universal e não deve escolher salão/empresa. Usuário empresarial deve estar isolado por tenant.

## Segurança
Supabase Auth real.
RLS por empresa.
Master separado.
RBAC.
Auditoria.
Nada de senha hardcoded.
Nada de service_role no browser.
Nada de localStorage como autenticação.
Sessão persistente e refresh.
MFA quando suportado pelo fluxo.
Segregação de funções.

## Design
Industrial premium, consistente com o PDF.
Não usar aparência de Delphi/DBGrid antigo.
Cards e formulários alinhados.
Grid responsivo.
Ações claras: Novo, Gravar, Editar, Atualizar, Pesquisar, Filtrar, Anexos, Histórico, Imprimir.
Reutilizar componentes existentes.
Não copiar propriedade visual de sistemas proprietários; usar apenas padrões funcionais.

## Regra de implementação
Antes de criar arquivo novo:
1. procurar componente/página/consulta existente;
2. reutilizar;
3. corrigir se necessário;
4. extrair componente compartilhado quando houver duplicação;
5. somente criar algo novo quando não existir.

## Auditoria automática obrigatória
Antes de considerar concluído:
- TypeScript;
- lint;
- build;
- testes;
- auditoria de placeholders;
- auditoria de botões sem ação;
- auditoria de dados fake;
- auditoria de consultas Supabase;
- auditoria RLS;
- auditoria de rotas;
- auditoria de exports/imports;
- auditoria de console/runtime;
- auditoria visual;
- E2E dos fluxos críticos;
- Vercel Preview atual da mesma branch;
- nenhum teste em URL antiga.

## Critério de aceite
Uma tela só é considerada PRONTA quando:
1. abre;
2. não gera erro no console;
3. carrega dados reais;
4. permite executar sua ação principal;
5. persiste;
6. recarrega e mantém o dado;
7. respeita RLS/permissão;
8. possui feedback verdadeiro;
9. possui histórico/auditoria quando o domínio exigir;
10. está alinhada ao PDF/design system;
11. funciona em desktop e tablet;
12. está coberta pelo fluxo E2E quando for crítica.

## Regra final
Não parar depois de corrigir um erro isolado.
Mapear todas as lacunas do ERP e trabalhar em ondas até zerar:
- telas quebradas;
- telas fake;
- ações fake;
- dados fake;
- rotas mortas;
- imports quebrados;
- tabelas inexistentes;
- migrations faltantes;
- RLS faltante;
- integrações faltantes;
- módulos fragmentados;
- inconsistências visuais;
- erros de build/runtime;
- deploy não homologado.

O resultado esperado é um produto operacional, não uma coleção de telas.
