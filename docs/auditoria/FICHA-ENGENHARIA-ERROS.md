# Auditoria técnica — Ficha de Engenharia / Prensados e Injetados

- **Data:** 18/10/2026
- **Escopo:** `src/pages/FichaEngenharia.tsx`, persistência dos parâmetros de qualidade e navegação interna do catálogo.
- **Branch de trabalho:** `fix/ficha-engenharia-prensados-injetados-20261018`
- **Status geral:** correções de código registradas; homologação visual/runtime e aplicação da migration no Supabase ainda pendentes.

## Requisitos e resultado da auditoria

| Requisito | Resultado | Evidência / observação |
|---|---|---|
| Imagens de Prensados e Injetados | **Corrigido no código; asset homologado pendente de conferência** | Upload autenticado no bucket privado `engenharia-projetos`, caminho iniciado pelo `empresa_id`, referências `storage:` persistidas em `observacoes`, URLs assinadas ao carregar. Compatibilidade com URLs/data URLs legadas mantida. |
| Temperatura associada à imagem | **Corrigido no código** | Campo de temperatura de Prensados e temperatura do molde de Injetados foi removido da grade genérica e apresentado como controle editável sobre a imagem principal. A referência visual é obrigatória ao gravar esses dois tipos. |
| Campos compactos/alinhados | **Parcial** | A ficha continua usando a grade `process-form-grid` existente e tabelas densas; a conferência final de CSS e alinhamento no navegador precisa ser feita no preview implantado. |
| Atalhos e revisões | **Corrigido no código** | O botão Abrir do catálogo solicita a revisão selecionada, em vez de sempre carregar a maior revisão ativa do produto. A rota existente `/ficha-engenharia` abre esta tela; a rota aprovada `/pcp/fichas-processo` foi preservada sem alteração. A consulta continua restrita à empresa autenticada. |
| Persistência e isolamento por empresa | **Corrigido no código; teste real pendente** | Carregamentos e gravações usam `erp_current_empresa_id` e filtros `empresa_id`; as imagens usam Storage privado com política de tenant por primeira pasta. |
| Valores nominais de qualidade | **Migration adicionada; aplicação pendente** | A ficha lê/grava `valor_nominal` e mantém os IDs retornados após inserção para não duplicar linhas em gravações seguintes. Migration: `supabase/migrations/20261018210000_ficha_engenharia_valor_nominal.sql`. |
| Exclusão de controles de qualidade | **Corrigido no código** | Os registros persistidos removidos da grade são excluídos com filtros de empresa e produto; novos registros guardam o ID retornado pelo banco. |

## Alterações de código

1. Upload de imagem com validação de formato e limite de 10 MB.
2. Referências de imagens gravadas como caminhos do Storage, não como conteúdo Base64 novo no JSON.
3. Em carregamento, criação de URL assinada por 1 hora para cada imagem privada. Falha de uma imagem não deve impedir o carregamento dos demais dados da ficha.
4. Campo de temperatura sobre a imagem principal em Prensados/Injetados; as chaves técnicas antigas são mantidas para compatibilidade com fichas existentes.
5. Abertura da revisão específica escolhida no catálogo.
6. Persistência de valor nominal e correção do ciclo de vida dos IDs dos controles de qualidade.
7. Validação que impede gravar ficha de Prensados/Injetados sem referência visual principal.

## Bloqueios e verificações ainda necessárias

- **Imagens aprovadas:** a busca do código remoto não identificou arquivos-fonte inequívocos das imagens homologadas da prensa e do cilindro/injetora. Não foram substituídas por imagens genéricas. Para comprovar que os arquivos visuais originais foram preservados, é necessário comparar com o ZIP/arquivo aprovado ou com os caminhos exatos dos assets existentes.
- **Banco remoto:** a integração Supabase conectada não retornou projetos disponíveis. Portanto, a migration de `valor_nominal` não foi aplicada nem foi possível verificar a coluna no banco remoto. Aplicar a migration antes de publicar/ativar o código que consulta `valor_nominal`.
- **CI da revisão `661217c4`:** PASS TypeScript, ESLint, auditoria global, auditoria brutal, auditoria de interações, lazy imports, build de produção, verificação de saída e rotas (258 rotas / 164 imports lazy). **FAIL** no contrato global `verify:quality-tablet-contract`: “A barra horizontal deve ocultar o botão Menu SGQ e abrir o tablet pelo botão Qualidade.” O PR altera apenas a ficha, migration e relatório; esse gate aponta uma regressão de Qualidade/Shell fora do escopo desta alteração e precisa ser tratada separadamente antes de um merge que exija CI totalmente verde.
- **Teste de persistência real:** validar com usuário de empresa autenticada: carregar ficha, anexar imagem, salvar, atualizar/reabrir, confirmar URL assinada, salvar novamente sem duplicar controles e confirmar que outra empresa não consegue ler o arquivo.
- **Vercel:** a implantação de preview não foi criada porque a Vercel retornou `api-deployments-free-per-day` (limite diário de builds). Não há SHA READY desta PR para validar visualmente.
- **Navegador/preview:** validar o alinhamento dos campos sobre as imagens homologadas e testar todos os atalhos do catálogo. Não declarar homologação visual antes dessa conferência.

## Critério de conclusão

A correção de código está versionada nesta branch. A tarefa **não deve ser considerada homologada/publicada** até que a migration seja aplicada, o contrato de Qualidade/Shell que falhou no CI seja resolvido separadamente, a Vercel permita o preview, os assets homologados sejam confirmados e o teste real de salvar/reabrir com empresa autenticada seja concluído.
