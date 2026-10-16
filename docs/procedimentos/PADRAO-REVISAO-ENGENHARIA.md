# Padrão obrigatório de revisão e rastreabilidade de alterações — ERP Industrial

**Vigência:** 16/10/2026  
**Escopo:** todo arquivo de código, migration, configuração, documentação técnica, correção, funcionalidade e entrega do ERP Industrial.  
**Regra:** uma alteração não é considerada concluída apenas porque o arquivo foi escrito ou commitado. O registro deve distinguir implementação, validação estática, teste integrado e homologação em ambiente real.

## 1. Cabeçalho de revisão nos arquivos alterados

Todo arquivo-fonte alterado deve manter ou receber um cabeçalho equivalente ao modelo abaixo, adaptado à linguagem. Não duplicar cabeçalhos: atualizar o existente e acrescentar uma linha de histórico por revisão relevante.

```text
REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
Data da alteração: AAAA-MM-DD
ID da revisão: REV-NNN
Área/módulo: nome do módulo
O que foi revisto: comportamento/defeito concreto encontrado
O que foi alterado: arquivos, funções, consultas, validações e fluxos afetados
Motivo: risco ou requisito que motivou a alteração
Schema/RPC/storage envolvidos: objetos confirmados no repositório; declarar "não aplicável" quando for o caso
Validação executada: comandos e resultados reais, nunca presumidos
Validação pendente: banco, RLS, login, browser, impressão, deploy etc.
Estado: implementado | validado estaticamente | testado integrado | homologado
```

Para arquivos que não comportem comentários (JSON, CSS, SQL com convenção local ou arquivos gerados), registrar os mesmos dados no registro central e/ou no arquivo de documentação adjacente. Nunca alterar arquivos gerados apenas para inserir comentários.

## 2. Registro central obrigatório

Cada alteração deve gerar uma entrada acumulativa em `docs/ERP-CENTRAL-ERROS-PENDENCIAS.md` contendo:
- ID sequencial único (ERP-AAAA-NNN);
- data e revisão (REV-NNN);
- módulo e arquivo(s);
- defeito ou requisito;
- resumo exato do que foi alterado;
- evidências verificáveis e comandos executados;
- resultado dos testes;
- bloqueios externos;
- estado real e próximos passos.

Não sobrescrever o histórico anterior. Se uma correção for revertida ou falhar, registrar a nova situação com outra entrada.

## 3. Estados permitidos — não confundir

- **Implementado no código:** alteração escrita; não implica compilação.
- **Validado estaticamente:** type-check/lint ou inspeção específica executada e passou.
- **Build validado:** build executado após a alteração e passou.
- **Testado integrado:** comportamento exercitado com dependências reais de teste.
- **Homologado:** critérios de aceite testados no ambiente apropriado, incluindo tenant/RLS/RBAC quando aplicável.
- **Bloqueado:** depende de acesso, schema, credenciais ou ambiente indisponível.

Nunca escrever "corrigido", "funcionando", "produção" ou "homologado" sem a evidência correspondente. Sempre listar o que não foi testado.

## 4. Regras para alterações de ERP

1. Ler o código atual, rotas, migrations e contratos existentes antes de alterar.
2. Não usar dados demonstrativos para preencher histórico operacional; não simular lupas, salvamento, Storage, laudos ou integração Supabase.
3. Não inventar tabelas, colunas, RPCs, buckets, políticas, IDs, códigos ou nomes de operadores. Se o schema não for comprovável, registrar o bloqueio e usar somente fontes confirmadas.
4. Preservar escopo de empresa, autenticação, RLS/RBAC, auditoria e regras fiscais.
5. Executar os gates disponíveis depois de alterar. Registrar o comando e o resultado exato; não reutilizar resultado de um commit anterior como prova para o atual.
6. Um deploy bloqueado ou não executado não é validação de produção.
7. Em telas de histórico, mostrar apenas registros persistidos reais, com data e status reais; vazio significa "nenhum registro encontrado", nunca dados de exemplo.
8. Cada PR/commit/entrega deve atualizar a documentação central e indicar arquivos/commit(s) e pendências.

## 5. Modelo de entrada do registro central

| ID | Data / revisão | Área | Problema ou requisito | Alteração realizada | Evidência / validação | Estado / pendências |
|---|---|---|---|---|---|---|
| ERP-AAAA-NNN | AAAA-MM-DD · REV-NNN | Módulo | Descrição objetiva | Arquivos e comportamento alterados | Comandos/resultados realmente executados | Estado preciso |

Este padrão passa a ser obrigatório em todas as próximas intervenções do ERP Industrial e deve ser aplicado retroativamente ao resumir ou continuar trabalho anterior, sem inventar evidências ausentes.
