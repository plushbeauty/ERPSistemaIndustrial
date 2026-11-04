# Auditoria técnica — SGQ / RPNC
**Data:** 04/11/2026  
**Projeto:** SYSNQRA ERP INDUSTRIAL  
**Escopo:** integração da página RPNC completa (QualityRpncForm) com rotas, Supabase RPC, Storage, RLS e workflow CAPA.

## Resultado executivo
A implementação ampliada já existia no repositório, mas não era o fluxo principal do menu: a rota RPNC abria uma tela reduzida e o formulário completo ficava em uma segunda entrada. Além disso, o fluxo de anexos por pasta de protocolo tinha incompatibilidade entre permissão de abertura e política de Storage. O formulário também não expunha as transições de execução/aprovação/verificação CAPA nem os avanços de status da RPNC.

A correção foi feita sobre a página existente, sem reformulação visual e sem apagar a implementação antiga.

## Problemas encontrados e correções

| Severidade | Achado | Correção aplicada |
|---|---|---|
| Alta | Menu e rotas dividiam abertura/triagem e formulário completo em duas páginas. | A rota canônica RPNC passa a renderizar QualityRpncForm; a URL antiga rpnc-formulario redireciona para a canônica; menu fica com uma única entrada RPNC. |
| Alta | qualidade_evidencias_insert_protocolo exigia qualidade:editar, embora a abertura da RPNC exija qualidade:criar. Usuário autorizado a abrir podia falhar no upload inicial. | Migration aditiva permite criar ou editar para inserir anexos na pasta do protocolo; exclusão continua exigindo editar. |
| Alta | A tela exibia ações CAPA, mas não disponibilizava o ciclo operacional protegido pelo banco. | Incluídos controles para iniciar execução, concluir, enviar para aprovação, aprovar/reprovar e verificar eficácia, usando a RPC erp_sgq_capa_decidir e as transições já protegidas por trigger/RLS. |
| Alta | A tela completa não oferecia as transições de status da RPNC entre análise, tratamento e eficácia. | Incluídos avanços via RPC erp_sgq_transicionar_rpnc; o envio para eficácia valida no cliente que as ações CAPA estejam verificadas como eficazes. O banco continua sendo a autoridade final. |
| Média | Controle carregava registros legados sem sgq_origem, embora a RPC de gravação do formulário completo rejeite esses registros. | Consulta do controle limitada às RPNCs que pertencem ao fluxo SGQ. |
| Média | Metadados de evidências não estavam conectados à trilha de auditoria SGQ. | Trigger de auditoria adicionado para INSERT/UPDATE/DELETE em erp_qualidade_rpnc_evidencias. |
| Baixa | Na abertura, arquivos acima de 15 MB eram descartados silenciosamente pelo seletor. | A tela agora informa os nomes dos arquivos rejeitados. |
| Baixa | Campos de ações CAPA aprovadas/verificadas continuavam aparentando editáveis, apesar da imutabilidade imposta pelo trigger. | Campos de plano bloqueados na UI para ações Aprovada e Verificada; remoção visual restrita a ações Planejada. |

## Fluxo que a página passa a concentrar
1. Controle e pesquisa de RPNCs da empresa atual.
2. Abertura com origem, severidade, setor, cliente/produto/lote/data e geração transacional do protocolo.
3. Pasta privada {empresa_id}/rpnc_{numero_rpnc} e anexos com metadados vinculados à RPNC.
4. Relato e padronização.
5. Investigação com Ishikawa 6M, 5 Porquês e equipe.
6. Plano CAPA com responsável, prazo, evidência, execução, conclusão, aprovação/reprovação e verificação de eficácia.
7. Varredura de recorrência por código de produto ou lote.
8. Transições da RPNC e parecer formal de eficácia.
9. Relatório para impressão.

## Pendências que exigem validação no ambiente Supabase
**Não foi possível consultar o projeto Supabase por esta sessão:** o conector retornou falta de permissão e não listou projetos acessíveis. Portanto, não afirmo que as migrations estejam aplicadas nem que o banco de produção esteja pronto.

Antes de liberar em produção, confirmar:
- Aplicação das migrations 20261004100000_sgq_integrated_erp_v1.sql, 20261031100000_sgq_rpnc_formulario_auditorias_recorrencia_v1.sql e 20261104100000_sgq_rpnc_storage_create_permission.sql.
- Existência das RPCs erp_sgq_abrir_rpnc_formulario, erp_sgq_salvar_formulario_rpnc, erp_sgq_buscar_recorrencia_rpnc, erp_sgq_salvar_acoes_rpnc, erp_sgq_capa_decidir, erp_sgq_transicionar_rpnc, erp_sgq_salvar_analise_rpnc e erp_sgq_registrar_eficacia_rpnc.
- Bucket privado qualidade-evidencias, limite e MIME types, políticas de leitura/inserção/exclusão e políticas da tabela de metadados.
- Teste com perfis separados: somente qualidade:criar; qualidade:editar; qualidade:aprovar; qualidade:verificar.
- Teste de isolamento com duas empresas: nenhuma RPNC, ação, evidência ou URL assinada de uma empresa pode ser lida pela outra.
- Teste real de upload, download assinado, remoção, histórico e impressão em navegador autenticado.

## Itens ainda não cobertos
- O clique em Imprimir relatório chama window.print(), mas não registra um evento específico de impressão no histórico SGQ.
- Se a remoção do objeto no Storage falhar depois da exclusão dos metadados, pode sobrar um objeto órfão; é necessário processo de reconciliação/limpeza.
- Não foi possível executar testes funcionais autenticados contra o banco real nem conferir dados existentes, porque o projeto Supabase não concedeu acesso ao conector nesta sessão.

## Validação de código
O preview Vercel do commit 05326179704e556665fa0b62af5bf96be8e9386b ficou READY após executar o gate de produção, type-check, lint, auditorias estáticas, build, verificação de artefatos e rotas (121 rotas / 53 imports lazy). A última migration de auditoria e o ajuste do seletor de arquivos foram enviados em commits posteriores; a validação final desses últimos commits permanece pendente do término do novo build.