# Matriz do Tablet — referência SYNQRA

Base visual: referência enviada pelo usuário em 03/10/2026.

Regra: não considerar módulo concluído apenas porque existe um card. O card só é considerado operacional quando possui rota real e tela funcional integrada ao ERP/Supabase.

| # | Módulo | Situação atual |
|---:|---|---|
| 1 | INÍCIO | rota real: /comercial |
| 2 | DASHBOARD | rota real: /erp-industrial |
| 3 | VENDAS | rota real: /vendas |
| 4 | COMPRAS | rota real: /compras/rfq |
| 5 | FINANCEIRO | rota real: /financeiro/custo-padrao |
| 6 | RH | rota real: /rh |
| 7 | ADMINISTRAÇÃO | rota real: /usuarios-admin |
| 8 | PCP | rota real: /pcp |
| 9 | QUALIDADE | rota real: /qualidade |
| 10 | ESTOQUE | rota real: /estoque |
| 11 | LOGÍSTICA | rota real: /expedicao/roteirizacao |
| 12 | MANUTENÇÃO | rota real: /manutencao/ordens |
| 13 | MÁQUINAS E EQUIPAMENTOS | rota existente compartilhada com manutenção; revisar módulo específico |
| 14 | CONTROLE DE MATERIAIS | rota real: /pcp/materiais |
| 15 | PROJETOS | rota real: /engenharia; revisar escopo específico de projetos |
| 16 | DOCUMENTOS | rota real: /documentos-qualidade |
| 17 | RELATÓRIOS | rota real: /vendas/relatorios; ampliar para central de relatórios |
| 18 | TREINAMENTOS | ainda sem rota operacional própria |
| 19 | SEGURANÇA DO TRABALHO | ainda sem rota operacional própria |
| 20 | MEIO AMBIENTE | ainda sem rota operacional própria |
| 21 | TI | ainda sem rota operacional própria |
| 22 | FORNECEDORES | rota real: /fornecedores |
| 23 | CLIENTES | rota real: /clientes |
| 24 | SUPORTE | rota real: /ajuda |
| 25 | NOTIFICAÇÕES | ainda sem rota operacional própria |
| 26 | AGENDA | ainda sem rota operacional própria |
| 27 | APROVAÇÕES | ainda sem rota operacional própria |
| 28 | AUDITORIAS | rota real: /qualidade/auditoria-5s |
| 29 | PLANEJAMENTO | rota real: /pcp/planejamento |
| 30 | INDICADORES | rota real: /pcp/dashboard-oee |
| 31 | CONFIGURAÇÕES | rota real existente: /configuracoes-adm; revisar para fluxo administrativo definitivo |
| 32 | PERFIL | rota real: /usuarios |

## Próxima regra de implementação

1. Preservar a ordem e linguagem visual desta referência.
2. Para cada módulo, comparar tela atual, rotas, banco/RPC, permissões, formulários, grids e ações.
3. Corrigir primeiro o que já existe; não duplicar módulos.
4. Onde faltar módulo, implementar a operação real antes de liberar o card.
5. Nenhum botão ou card será considerado funcional por aparência.
6. A próxima referência visual enviada será incorporada como segunda rodada de comparação, sem apagar o que já estiver correto.
