# Registro de referências técnicas — ERP Industrial

Data da consulta: 12/10/2026  
Repositório de destino: `plushbeauty/ERPSistemaIndustrial`  
Branch de trabalho: `fix/qualidade-padrao-formularios-dashboard`

## Carbon — ERP/MES/QMS de manufatura

- Origem: https://github.com/crbnos/carbon
- Documentação do produto: https://docs.carbon.ms
- README consultado: https://github.com/crbnos/carbon/blob/main/README.md
- Licença consultada: https://github.com/crbnos/carbon/blob/main/LICENSE
- Áreas concretas identificadas no repositório:
  - `apps/mes/app/services/models.ts`: enumerações e modelos de domínio do MES; a busca encontrou estados/severidade de manutenção e comentários relacionados à rastreabilidade por unidade/operação.
  - `.ai/research/2026-09-22-app-feature-surface.md`: inventário de superfícies funcionais; a busca encontrou manutenção (despacho, estados, prioridades, severidade, origem, frequência e impacto no OEE) e rastreabilidade.
  - README: manufatura, ERP/MRP/MES/QMS, BOM multinível e revisões, fluxo de cotação/pedido/ordem, rastreabilidade por lote/série, chão de fábrica, API e MCP.
- Licença: o arquivo `LICENSE` informa AGPL-3.0 para o repositório em geral, mas exclui `packages/ee/**` e arquivos cujo nome contém `.ee.`, sujeitos à licença comercial Carbon; componentes de terceiros mantêm suas próprias licenças. O campo SPDX da API não esclarece a licença, portanto prevalece a leitura do arquivo LICENSE.
- Regra de reutilização: **não copiar código, componentes ou arquivos do Carbon nesta etapa**. Usar como referência funcional e implementar de forma independente no ERP Industrial. Qualquer incorporação futura exige análise jurídica/licença por arquivo, dependências e avaliação das obrigações AGPL, especialmente para software oferecido pela rede.
- Aplicação no ERP Industrial:
  1. Manutenção: estados explícitos de despacho, prioridade, severidade, origem e periodicidade; validar compatibilidade com as tabelas/RPCs já existentes antes de alterar o modelo.
  2. PCP/MES: preservar vínculos entre ordem, operações, unidade/lote, apontamentos e rastreabilidade; evitar introduzir um segundo banco ou serviço sem necessidade demonstrada.
  3. SGQ: conectar inspeção e não conformidade ao registro real de lote/operação quando esses vínculos existirem no schema atual.
  4. Segurança de automações: usar a API/MCP do Carbon apenas como referência; nenhuma automação poderá contornar autenticação, tenant, RLS, RBAC ou aprovações humanas.
- Critérios de teste derivados: transições válidas/inválidas de estado; segregação por empresa; rastreabilidade de ida e volta entre ordem/operação/lote; manutenção preventiva vs. corretiva; reprocessamento idempotente; ausência de baixa de estoque sem transação confirmada.
- Limitação desta consulta: a busca verificou README, LICENSE, metadados e trechos de arquivos específicos; **não equivale a uma auditoria linha a linha de todo o Carbon**. Os itens acima são pistas verificadas para priorizar inspeção, não afirmação de que todos os fluxos estão completos ou podem ser transplantados.

## Outros repositórios já listados na ordem de execução

- Docxtemplater — https://github.com/open-xml-templating/docxtemplater
- Templater — https://github.com/SilentVoid13/Templater
- TableTool — https://github.com/jakob/TableTool
- Python CEQ M5 — https://github.com/gustavouhlein/python-ceq-m5
- SigeprodPCP — https://github.com/JpMarinoto/SigeprodPCP
- Agent Control — https://github.com/agentcontrol/agent-control
- ERPNext — https://github.com/frappe/erpnext

Para cada um, registrar arquivo/caminho efetivamente verificado, licença, funcionalidade demonstrada, decisão (referência independente / dependência / código incorporado) e testes. Não presumir licença ou funcionalidade a partir do nome do repositório.

## Estado da implementação e da liberação

- Este registro documenta a análise inicial da referência Carbon; **não marca nenhum módulo como concluído**.
- A tela `/manutencao/plano-mestre` ainda contém linhas de cronograma estáticas e checklist/observações locais não persistidos. Isso permanece uma pendência funcional explícita.
- O fluxo oficial de ordens usa a RPC existente `erp_registrar_parada_manutencao` para abertura e `erp_concluir_manutencao` para conclusão. Antes de persistir itens detalhados do checklist, inspecionar o contrato completo dessas RPCs, a estrutura real de `erp_manutencao_ordens`, as políticas RLS e os vínculos de estoque.
- Não houve alteração do banco, RLS, autenticação ou permissões por causa desta análise.
- A validação visual autenticada das rotas e a confirmação de deploy de produção continuam separadas da aprovação de CI.
