# Manutenção — Plano mestre preventivo

## Alteração de interface

- Tela: `/manutencao/plano-mestre`
- Componente: `src/pages/ManutencaoPlanoMestre.tsx`
- Commit de implementação: `395ec1db02da41781861185c3c411e5a76a08ebe`
- Branch: `fix/qualidade-padrao-formularios-dashboard`

## Regras visuais

- `R` / `PE`: verde (realizado / programado e executado).
- `A` / `P`: amarelo (agendado / programado).
- `AT`: vermelho (atrasado).
- O fundo da linha também recebe uma tonalidade de situação, priorizando atraso, depois agendamento e depois realizado.
- `M` e `D` mantêm distinção visual própria.

## Empresa e vínculo com máquinas

- A empresa da sessão é resolvida pela RPC existente `erp_current_empresa_id`.
- O nome exibido vem de `erp_empresas.nome_fantasia` ou `erp_empresas.razao_social`.
- As máquinas são consultadas em `erp_maquinas`, filtradas pelo `empresa_id` da sessão.
- Uma linha da planilha só é identificada como vinculada quando a tag de origem coincide com `erp_maquinas.codigo` após normalização de caracteres. Não se cria máquina nem ordem automaticamente.
- Quando a tag não existe no cadastro da empresa, a tela avisa explicitamente e impede seguir pelo atalho de O.S. daquele detalhe. A linha permanece disponível para comparação documental, sem ser apresentada como ativo operacional confirmado.

## Detalhe da máquina

O clique na linha abre painel com identificação, frequência e status da planilha, além de checklist orientativo para segurança, inspeção mecânica, lubrificação, inspeção elétrica e teste funcional. Os itens marcados e as observações são persistidos em `erp_manutencao_checklists`, isolados por empresa e pela chave `origem_cronograma + tag_fonte`. A página reabre o registro salvo para a mesma origem/tag. Esse registro documenta o checklist preenchido, mas não substitui uma Ordem de Serviço nem é prova independente de execução técnica.

O roteiro é genérico e não substitui manual do fabricante, procedimento aprovado, bloqueio/etiquetagem, capacitação nem requisitos de segurança da máquina. A equipe técnica deve validar e adaptar cada tarefa ao ativo real antes de executar.

## Conferência da planilha enviada em 11/10/2026

Arquivo localizado na biblioteca: `FRP-FER-001-PLASTIBOR - CRONOGRAMA DE MANUTENÇÃO PREVENTIVA MÁQUINAS.xlsx`. Foram lidas as abas `Dashboard de Manutenção` e `Cronograma 2026`. A tabela FRP-MP-001 contém 13 equipamentos/tag e os status mensais P, PE, AT, M e D; as linhas incorporadas em `frpRows` correspondem aos dados dessa aba. A legenda é: P = programado; PE = programado e executado; AT = em atraso; M = em manutenção; D = desativado.

**Limite operacional:** os status mensais P/PE/AT/M/D são a referência documental de origem. Não são transformados automaticamente em ordens de serviço, nem devem ser tratados como confirmação de ativo cadastrado. A correspondência operacional é feita pelo código/tag de `erp_maquinas` dentro da empresa atual. A aba de dashboard da planilha conta esses códigos com fórmulas; os KPIs da aplicação devem continuar sendo calculados a partir dos registros persistidos, sem inventar execução de manutenção.


## Referência técnica consultada

- Produttivo, plano preventivo: https://www.produttivo.com.br/blog/plano-de-manutencao-preventiva/
- Produttivo, checklist preventivo: https://www.produttivo.com.br/blog/check-list-manutencao-preventiva/
- Os artigos orientam a manter inventário de ativos, periodicidade, procedimentos por equipamento, responsáveis, histórico, observações e evidências. Nenhum código externo foi copiado.

## Validação e limitações

- A implementação foi registrada na branch de trabalho; não significa que já esteja em produção.
- CI/TypeScript/build precisam concluir para o commit final.
- Não foi realizado teste visual autenticado contra uma sessão de empresa real nesta alteração.
- A grade de referência mantém os valores das planilhas-fonte embutidos no componente. Ela ainda não é um plano operacional persistido no Supabase; o vínculo operacional é apenas por tag/código exato. Antes de importar/ativar planos por empresa, é necessário confirmar a planilha original e a correspondência das tags com o cadastro real de máquinas.
