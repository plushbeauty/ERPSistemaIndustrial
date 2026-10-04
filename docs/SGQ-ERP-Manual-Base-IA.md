# SGQ ERP — Manual Operacional e Base de Conhecimento para IA

## 1. Visão geral
O SGQ ERP é uma plataforma de gestão industrial multiempresa. A empresa, usuários, setores, permissões, produtos, estoque, compras, vendas, produção, qualidade, manutenção, fiscal e financeiro trabalham sobre dados separados por empresa.

**Palavras-chave:** SGQ ERP, ERP industrial, gestão industrial, multiempresa, empresa, operação, fábrica, gestão.

## 2. Login e acesso
Campos: Nome da Empresa, Usuário ou e-mail e Senha. O login resolve o e-mail real do usuário e autentica no Supabase Auth. Depois da autenticação, o vínculo do usuário com a empresa e o status ativo são conferidos.

**Palavras-chave:** login, entrar, usuário, e-mail, senha, empresa, acesso, autenticação, Supabase Auth.

## 3. Cadastro de nova empresa
O cadastro solicita Razão Social, Nome Fantasia, responsável, e-mail e senha. O nome de acesso é gerado a partir do primeiro nome da empresa e pode ser apresentado ao usuário. A criação é feita pelo backend da Edge Function de provisionamento para manter isolamento por empresa.

**Palavras-chave:** cadastro empresa, nova empresa, razão social, nome fantasia, administrador, ambiente, provisionamento, setores.

## 4. Dashboard
O dashboard apresenta visão executiva da operação e atalhos para os módulos. Indicadores devem refletir dados reais do banco; números demonstrativos não devem ser tratados como dados de produção.

**Palavras-chave:** dashboard, indicadores, KPIs, visão executiva, operação.

## 5. Cadastros mestres
Cadastros mestres alimentam os demais módulos. Devem ser mantidos setores, usuários, produtos, clientes, fornecedores, máquinas, moldes, serviços/processos e parâmetros necessários.

**Palavras-chave:** cadastros, mestre, setores, usuários, produtos, clientes, fornecedores, máquinas, moldes.

## 6. Produtos e engenharia
Produto possui código/SKU, descrição, unidade, grupo, estoque, custo e preço. A engenharia pode usar BOM/ficha técnica, componentes, quantidades e processo. O custo industrial deve considerar materiais, mão de obra, máquinas, energia, indiretos, terceiros, embalagem e perdas.

**Palavras-chave:** produto, SKU, BOM, ficha técnica, componente, matéria-prima, custo, markup, margem.

## 7. Estoque e rastreabilidade
O estoque nasce dos movimentos de entrada, consumo, produção, transferência e saída. Lotes e matérias-primas devem permitir rastreabilidade. Estoque mínimo e alertas apoiam compras e PCP.

**Palavras-chave:** estoque, WMS, lote, saldo, movimentação, entrada, saída, consumo, inventário, rastreabilidade.

## 8. Compras
A necessidade pode nascer de estoque, MRP, produção ou solicitação manual. A solicitação contém descrição, prioridade, itens e aprovação. O pedido de compra acompanha fornecedor, prazo, recebimento e impacto no estoque.

**Palavras-chave:** compras, solicitação de compra, fornecedor, cotação, pedido, aprovação, recebimento, prazo.

## 9. Vendas e pedidos
Pedidos comerciais alimentam planejamento, estoque, produção, expedição, fiscal e financeiro. Dados de cliente, produto, quantidade, preço e prazo devem ser conferidos antes de liberar a produção.

**Palavras-chave:** vendas, cliente, pedido, pedido de venda, preço, quantidade, prazo, faturamento.

## 10. PCP e MRP
PCP transforma pedidos e necessidades em planejamento de materiais e capacidade. MRP identifica componentes necessários, estoque disponível e necessidade de compra. O fluxo esperado é pedido → necessidade → compra/estoque → ordem de produção → apontamento → qualidade → estoque final → expedição.

**Palavras-chave:** PCP, MRP, planejamento, capacidade, necessidade, OP, ordem de produção, programação.

## 11. Produção e apontamento
A ordem de produção identifica produto, quantidade, processo, máquina, setor e programação. O apontamento registra produção boa, refugo, paradas e ocorrências. A planilha PLASTIBOR FRP-PROD-010 usa apontamento horário de 08:00 a 17:00, operador, cliente, pedido, molde, máquina, início/fim e motivo de parada.

**Palavras-chave:** produção, OP, ordem de produção, apontamento, refugo, parada, operador, máquina, molde, FRP-PROD-010.

## 12. Qualidade / QMS
Qualidade controla documentos, inspeções, RPNC, ações corretivas, auditorias, metrologia, manutenção relacionada e indicadores. O controle de documentos deve preservar código, revisão, data, armazenamento, retenção, acesso e disposição.

**Referências PLASTIBOR:** FRTB-GQ-004 Cadastro de Registro da Qualidade; FRP-GQ-001 Lista Mestre de Documentos enviados a fornecedores; FRP-GQ-002 Lista Mestre de Especificações enviadas a terceiros.

**Palavras-chave:** qualidade, QMS, RPNC, inspeção, auditoria, documento, revisão, retenção, registro, especificação, fornecedor.

## 13. RPNC e não conformidades
Uma não conformidade registra problema, causa, ação, responsável, prazo, evidência e encerramento. O sistema deve permitir analisar reincidência, severidade, ocorrência e detecção quando aplicável.

**Palavras-chave:** RPNC, não conformidade, causa, ação corretiva, eficácia, severidade, ocorrência, detecção.

## 14. Manutenção / CMMS
Máquinas possuem identificação, plano e histórico. Manutenção preventiva segue periodicidade e status. A planilha PLASTIBOR 2026 usa status R = Realizado, A = Agendado e AT = Atrasado. O dashboard fornecido contém 16 realizados, 20 agendados e 2 atrasados.

**Palavras-chave:** manutenção, CMMS, preventiva, corretiva, máquina, plano, OS, cronograma, PR-01, INJ-01, CP-01, TR-01, CH-01.

## 15. Fiscal
O módulo fiscal prepara NF-e modelo 55, NFC-e modelo 65, itens, tributos, XML, DANFE e chave de acesso. A autorização oficial depende de integrador fiscal e certificado digital no backend. O ERP não deve fingir emissão/autorização quando a credencial do provedor não estiver configurada.

**Palavras-chave:** fiscal, NF-e, NFC-e, modelo 55, modelo 65, XML, DANFE, SEFAZ, certificado, integrador.

## 16. Financeiro
Financeiro acompanha contas a pagar, receber, caixa, bancos, conciliação, custos, pagamentos, recebimentos e resultado. Movimentos originados de vendas, compras e operações devem ser rastreáveis.

**Palavras-chave:** financeiro, caixa, contas a pagar, contas a receber, banco, conciliação, custo, resultado.

## 17. Relatórios e indicadores
Relatórios devem ser baseados nos registros reais. Indicadores de produção, OEE, refugo, estoque, qualidade, manutenção, vendas e financeiro devem possuir período, empresa e origem dos dados.

**Palavras-chave:** relatórios, BI, KPI, OEE, refugo, estoque, qualidade, manutenção, vendas, financeiro.

## 18. Outlook, IA e OCR
O fluxo planejado é e-mail → leitura de remetente/assunto/anexo → OCR/IA → extração de cliente, SKU, quantidade, preço e entrega → conferência → aprovação → pedido → produção/faturamento.

**Palavras-chave:** Outlook, Microsoft Graph, IA, OCR, PDF, imagem, e-mail, pedido automático, aprovação.

## 19. Documentos e anexos
Documentos de qualidade podem receber anexos em armazenamento privado por empresa. O caminho de armazenamento deve ser separado por empresa e documento. Downloads devem usar URLs assinadas, sem expor arquivos privados publicamente.

**Palavras-chave:** documento, anexo, Storage, arquivo, evidência, URL assinada, privado, empresa.

## 20. Usuários e permissões
Usuários são vinculados a uma empresa e podem possuir nível administrativo e setor. Master possui visão administrativa global. Usuários comuns devem enxergar apenas dados autorizados de sua empresa e módulos.

**Palavras-chave:** usuário, permissão, perfil, setor, Master, administrador, RLS, empresa.

## 21. Segurança
O sistema usa autenticação real, RLS multiempresa e funções protegidas. Nenhuma senha deve ser armazenada em tabelas públicas como mecanismo paralelo ao Supabase Auth. Não usar service_role no navegador. Funções SECURITY DEFINER devem ter search_path seguro e privilégios mínimos.

**Palavras-chave:** segurança, RLS, multiempresa, SECURITY DEFINER, search_path, service_role, Supabase Auth.

## 22. Integrações
Integrações externas incluem fiscal, e-mail, Outlook/Microsoft Graph e pagamentos quando configuradas. Sem credenciais reais, a interface deve informar que a integração está pendente e nunca simular sucesso.

**Palavras-chave:** integração, API, fiscal, e-mail, Outlook, Graph, pagamento, credencial.

## 23. Base PLASTIBOR
A base de testes operacional contém empresa PLASTIBOR, setores, produtos, matérias-primas, máquinas, moldes, lotes, BOM/custos, pedidos, ordens de produção, estoque, RPNC, inspeções, manutenção, documentos e solicitações de compra. Os dados devem permanecer isolados por empresa.

**Palavras-chave:** PLASTIBOR, Plastibor, indústria, testes, pedidos, OPs, qualidade, manutenção, compras.

## 24. Regras para a IA
Quando o usuário perguntar sobre uma tela, procure primeiro o tópico correspondente, depois palavras-chave e termos equivalentes. Nunca invente dados de produção. Diferencie funcionalidade disponível, funcionalidade preparada e integração pendente. Para problemas de login, verificar empresa, usuário/e-mail, Supabase Auth, vínculo auth_user_id, usuário ativo e empresa ativa.

**Palavras-chave:** IA, busca semântica, conhecimento, tópico, palavra-chave, suporte, diagnóstico.
