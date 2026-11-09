# Pesquisa de referências para evolução das telas industriais — SYSNQRA ERP INDUSTRIAL

**Data:** 06/11/2026  
**Branch:** `prod-telas-novas`  
**Escopo:** pesquisa funcional das referências previamente combinadas: iFactory, APIS IQ-Software, MetalurgicaPro e Objetiva/DiamondOne.  
**Regra de implementação:** aproveitar padrões funcionais, sem copiar identidade visual ou substituir telas aprovadas do SYSNQRA.

## 1. Referências pesquisadas

### iFactory AI — integração e inteligência da fábrica
Fonte: https://www.ifactoryapp.com/  
A referência consultada é uma plataforma de AI/MES industrial, não um ERP administrativo tradicional. Apresenta integração de ERP, MES, PLC, SCADA, sensores IoT e sistemas de qualidade; visão computacional para defeitos e segurança; análise preditiva de falhas; indicadores operacionais; e criação/acionamento de ordens de manutenção.

**Ideias aproveitáveis no SYSNQRA:**
- camada de integração industrial desacoplada do ERP, com eventos identificados por empresa, máquina e origem;
- OEE e alertas baseados em apontamentos e sinais reais;
- visão computacional e inspeção automática como evolução futura, sempre com decisão de disposição registrada pela Qualidade;
- manutenção preditiva somente depois de existir histórico confiável de máquina e apontamento.

**Cuidado:** indicadores de demonstração e percentuais de marketing da referência não devem ser tratados como resultados comprovados do SYSNQRA.

### APIS IQ-Software — FMEA, fluxo de processo e plano de controle
Fontes:
- https://www.apis.de/en/software/products/
- https://www.apis.de/en/software/products/product-comparison
- https://www.apis.de/en/software/products/function-overview

A suíte apresenta FMEA/DRBFM, estrutura de produto/processo, redes de função e falha, análise de risco, acompanhamento de ações com prazos, comunicação de equipe, versionamento, trilha de auditoria, diagrama de fluxo de processo (PFD) e plano de controle (CP).

**Ideias aproveitáveis no SYSNQRA:**
- vincular FMEA, fluxo de processo, plano de controle, inspeções e RPNC à mesma revisão de produto/processo;
- acompanhar ações com responsável, prazo, situação, evidência e eficácia;
- manter histórico de revisão e auditoria sem sobrescrever versões aprovadas;
- gerar relatórios gerenciais e impressão controlada a partir dos dados persistidos.

### MetalurgicaPro — ERP industrial, PCP e chão de fábrica
Fontes:
- https://metalurgicapro.com.br/sistema-erp-industria
- https://metalurgicapro.com.br/software-pcp

A comunicação pública destaca ERP em nuvem, PCP, ordens, programação de máquinas, apontamento em tempo real, integração com terminais/leitores/IoT, rastreabilidade de matérias-primas e lotes, parâmetros técnicos, controle dimensional, qualidade e indicadores de eficiência.

**Ideias aproveitáveis no SYSNQRA:**
- fluxo único de demanda → programação → ordem → operação → apontamento → qualidade → estoque;
- identificação da operação e máquina no apontamento, não apenas da OP;
- rastreabilidade por lote e transferência parcial entre etapas;
- registro de refugo, parada, setup e quantidade boa por operador;
- consulta da ficha de processo aprovada no posto de trabalho.

### Objetiva / DiamondOne — manufatura sob encomenda e custo por OP
Fontes:
- https://objetivasolucao.com.br/diamondone/
- https://diamondone.objetivasolucao.com.br/
- https://objetivasolucao.com.br/solucoes/

O DiamondOne se posiciona como camada industrial integrada ao ERP existente. Destaca PCP por ordem, APS com capacidade finita, MRP por BOM, configurador de produto, apontamento de fábrica, custos reais por OP, rastreabilidade e qualidade ligada à ordem.

**Ideias aproveitáveis no SYSNQRA:**
- programação finita considerando máquina, capacidade, materiais, prazo e prioridade;
- cenários de reprogramação antes de comprometer o plano;
- BOM e roteiro variáveis por pedido quando a engenharia exigir configuração;
- comparação de custo previsto versus realizado por OP;
- integração bidirecional com cadastros e ordens, preservando o ERP como fonte única de cada dado.

## 2. Matriz de aplicação ao SYSNQRA

| Área SYSNQRA | Capacidade funcional a consolidar | Referência principal | Critério de aceite |
|---|---|---|---|
| PCP / APS | capacidade finita, sequência, cenários, prioridades e reprogramação | DiamondOne / MetalurgicaPro | programação respeita máquina, turno, materiais e prazo; alterações ficam auditadas |
| Chão de Fábrica | entrada individual, fila do dia/semana, OP, máquina, operação, parada, refugo e apontamento parcial | MetalurgicaPro / DiamondOne | operador real identificado; horário do banco; sessão isolada por empresa |
| Fichas de Processo | parâmetros aprovados, revisão, máquina/ferramenta, operações e instrução no posto | MetalurgicaPro | somente ficha liberada é apresentada para execução; histórico preservado |
| Engenharia / BOM / MRP | estrutura multinível, necessidade por OP, reserva e rastreabilidade | DiamondOne | cálculo reproduzível e movimentos transacionais, sem saldo fictício |
| Qualidade / SGQ | FMEA, PFD, plano de controle, inspeção, RPNC, CAPA, ações e eficácia | APIS IQ | vínculo entre revisão, risco, ação, evidência e aprovação |
| Custos / BI | previsto versus realizado, hora-máquina, mão de obra, refugo e custo por OP | DiamondOne | origem rastreável de cada custo; sem indicadores calculados com dados simulados |
| Integração / IoT | ingestão de eventos de máquina, alertas e telemetria | iFactory AI | autenticação de origem, idempotência, tenant, trilha de auditoria e tratamento de falha |

## 3. Prioridades recomendadas

1. **Concluir o fluxo transacional já existente:** OP, programação, operador, máquina, apontamento, ficha aprovada, qualidade e estoque.
2. **Fechar a autenticação individual do Chão de Fábrica:** o identificador global da empresa deve apenas direcionar à entrada operacional; a identidade de cada operador deve ser validada no servidor e gravada individualmente.
3. **Consolidar a Qualidade:** FMEA + fluxo + plano de controle + inspeção + RPNC/CAPA, com revisão e auditoria comuns.
4. **Validar MRP e custo real por OP:** somente depois de validar BOM, reservas, consumos, apontamentos e movimentos.
5. **Planejar IoT/IA como fase posterior:** não apresentar predição, OEE ou alertas como reais antes de haver fonte de dados operacional e histórico suficientes.

## 4. Regras de preservação e segurança

- Não copiar telas, marcas, textos comerciais ou identidade visual das referências.
- Não alterar o design aprovado de Home, Compras, PCP, Paquímetro e Qualidade sem ordem específica.
- Não criar demonstrações com dados fictícios no ambiente operacional.
- Todas as consultas e gravações devem respeitar Supabase Auth, RLS/RBAC e `empresa_id`.
- O operador deve ser identificado individualmente; nunca atribuir apontamentos a um usuário global compartilhado.
- A implantação de migrations depende de revisão de dependências e autorização do proprietário.
- Toda função operacional deve ter tratamento explícito para tabela/RPC ausente; erro de banco não pode ser convertido em sucesso visual.

## 5. Limites da pesquisa

Esta pesquisa utiliza páginas públicas oficiais dos fornecedores. Não é uma auditoria dos produtos instalados, não confirma funcionalidades contratadas/licenciadas e não prova resultados comerciais divulgados. As recomendações acima são critérios de produto para o SYSNQRA, não afirmações de que todas as capacidades já estejam implementadas.
