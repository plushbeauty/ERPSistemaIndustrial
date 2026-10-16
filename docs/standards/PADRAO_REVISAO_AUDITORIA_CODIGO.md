# Padrão obrigatório de revisão e auditoria de código — ERP Sistema Industrial

**Vigência:** 2026-10-16  
**Revisão:** PADRAO-CODIGO-20261016-01  
**Escopo:** Toda alteração de código no repositório `plushbeauty/ERPSistemaIndustrial`.

## Regra obrigatória

Toda modificação de código deve registrar no próprio arquivo, quando tecnicamente aplicável, data, horário com fuso, revisão única, estado, escopo e descrição objetiva do que foi revisado e alterado. A alteração também deve ter uma mensagem de commit coerente. Para formatos que não comportem cabeçalho (por exemplo, JSON, imagens ou arquivos gerados), registrar os mesmos dados no arquivo de auditoria/PR associado; não inserir comentários inválidos no arquivo.

## Cabeçalho recomendado para arquivos TypeScript/TSX

```ts
/*
  @AUDIT_DATE: YYYY-MM-DD
  @AUDIT_TIME_BRT: HH:mm
  @AUDIT_REVISION: #AUDIT-ERP-YYYYMMDD-NN
  @STATUS: IMPLEMENTED_PENDING_VALIDATION | VALIDATED | BLOCKED
  @SCOPE: caminho/do/arquivo
  @REVIEWED: áreas e comportamentos efetivamente inspecionados.
  @CHANGES: mudanças reais realizadas, de forma objetiva.
  @VALIDATION: comandos executados e resultado; nunca declarar teste não executado.
  @CHECKLIST: itens relevantes verificados para esta alteração.
*/
```

## Fluxo exigido por alteração

1. Ler o arquivo real e os componentes/estilos/rotas diretamente relacionados antes de editar; não inventar APIs, schema, dados ou componentes.
2. Definir uma revisão única e escopo limitado. Registrar o que foi revisado e o que mudou.
3. Preservar autenticação, sessão, Supabase, RLS/RBAC, rotas, regras fiscais e de negócio que não façam parte do escopo.
4. Revisar o diff após a gravação e confirmar que o commit contém somente a alteração prevista.
5. Executar, quando disponíveis e aplicáveis, `npm run type-check`, lint e `npm run build`. Não mascarar falhas.
6. Confirmar o estado dos checks/CI e do deploy separadamente. Um commit criado não comprova build verde nem publicação.
7. Só usar o estado `VALIDATED` ou a expressão **[CONCLUÍDA E VALIDADA]** quando todas as verificações exigidas tiverem sido executadas com sucesso. Se não foram executadas, usar `IMPLEMENTED_PENDING_VALIDATION`; se houver bloqueio, usar `BLOCKED` e descrever o motivo.
8. Na resposta, fornecer arquivo, branch, revisão, commit e o que foi ou não validado. Não alegar publicação sem evidência.

## Revisão específica da Home / carrossel — 2026-10-16

- Arquivo: `src/PublicIndustrialHome.tsx`.
- Revisão: `#AUDIT-ERP-20261016-02`.
- Alteração: ocultar a legenda `.sgq-stage-caption` e os indicadores `.sgq-dots` sobre as imagens.
- Preservação: manter o array de imagens e a troca automática controlada por `setInterval` de 5 segundos.
- Estado: `IMPLEMENTED_PENDING_VALIDATION`. O diff do commit foi conferido; type-check, lint, build e publicação devem ser verificados antes de marcar como validado.

## Atualização do padrão

Este documento é a referência para as próximas alterações neste repositório. Ao modificar código existente, atualizar também o cabeçalho de auditoria do arquivo tocado; não reutilizar revisão de uma alteração anterior.
