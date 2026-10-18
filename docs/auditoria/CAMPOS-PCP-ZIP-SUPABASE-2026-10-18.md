# Auditoria de campos PCP do arquivo de referência — 2026-10-18

## Escopo e limite da verificação

Comparação feita contra os arquivos extraídos de `ERPSistemaIndustrial-main.rar` e as migrations versionadas na branch `fix/pcp-process-sheet-submenu-guard`.

**O schema remoto do Supabase ainda não foi confirmado.** A integração Supabase disponível nesta execução retornou zero projetos acessíveis; portanto, esta auditoria distingue contrato no repositório de aplicação real no banco. Nenhuma migration foi aplicada remotamente.

## Fichas de processo

A tela `src/pages/PCPFichasProcesso.tsx` lê e grava em `public.erp_fichas_processo`. Os campos comuns da ficha são persistidos em colunas, enquanto os parâmetros específicos por processo são armazenados em `parametros_tecnicos` (JSONB), sem criar uma coluna SQL para cada parâmetro.

| Campo/contrato | Persistência versionada no repositório | Situação remota |
|---|---|---|
| `codigo_ficha`, `produto_id`, `ferramenta_id`, `maquina_id` | Usados pela tela e pelo cadastro existente | Não consultada |
| `categoria_processo` | Coluna existente; migration `20261017140000_pcp_fichas_acabamento_embalagem.sql` amplia o CHECK para `ACABAMENTO` e `MONTAGEM_EMBALAGEM` | Não consultada/aplicada nesta execução |
| `versao_ficha`, `revisao`, `data_homologacao`, `assinatura_tecnica`, `status` | Colunas adicionadas/contratadas em `20261010120000_pcp_fichas_processo_tecnicas.sql` | Não consultada |
| `parametros_tecnicos` | JSONB para parâmetros tipados por categoria, inclusive novos parâmetros de acabamento e montagem/embalagem | Não consultada |
| `parametros_tecnicos.instrucoes_setup` | Gravado dentro do JSONB, não em coluna própria | Não consultada |
| `ativo`, `atualizado_em`, `cavidades_ativas` | Referenciados pela tela; precisam existir no schema instalado conforme migrations-base | Não consultada |

## Programação PCP — campos novos identificados

O código de `src/pages/PCPIndustrial.tsx` grava a ficha selecionada e a revisão usada pela programação:

- `erp_pcp_programacoes.ficha_processo_id`
- `erp_pcp_programacoes.ficha_processo_revisao`

A migration `20261017130000_pcp_programacao_ficha_processo.sql` foi adicionada nesta branch no commit `359d20ad7d4b36426b94882f8d2675dd62e92cad`. Ela adiciona as duas colunas, uma FK composta por `(empresa_id, ficha_processo_id)` para `erp_fichas_processo(empresa_id,id)`, CHECK para revisão positiva, índice tenant-aware e comentários.

O teste `scripts/verify-process-sheet-submenu.mjs` foi ampliado no commit `67400b7e270509ce5df9797a9a0b179cb3ba1c20` para validar a migration e a gravação do identificador/revisão pelo PCP.

## Consultas somente de leitura para validar o banco real

Executar no projeto Supabase correto depois de restabelecer acesso:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'erp_fichas_processo' and column_name in (
      'codigo_ficha','produto_id','ferramenta_id','maquina_id','categoria_processo',
      'versao_ficha','revisao','data_homologacao','assinatura_tecnica',
      'parametros_tecnicos','ativo','atualizado_em','cavidades_ativas'
    ))
    or
    (table_name = 'erp_pcp_programacoes' and column_name in (
      'ficha_processo_id','ficha_processo_revisao','empresa_id'
    ))
  )
order by table_name, ordinal_position;

select version, name
from supabase_migrations.schema_migrations
where version in ('20261010120000','20261017130000','20261017140000')
order by version;
```

A segunda consulta pode precisar de ajuste conforme a versão/configuração do registro de migrations; não presumir que a presença de um arquivo no Git significa que ele já foi aplicado.

## Próximas verificações obrigatórias

1. Obter acesso ao projeto Supabase `zsklkydlawgvwgnvxwwx` e confirmar as colunas e migrations instaladas.
2. Aplicar as migrations pendentes somente após validar a ordem e as dependências de schema, com backup/ambiente apropriado.
3. Testar leitura/gravação com sessão autenticada e duas empresas distintas; confirmar RLS, constraints, FK e revisão histórica.
4. Manter o fluxo marcado como pendente até obter resultados reais dessas consultas e testes.
