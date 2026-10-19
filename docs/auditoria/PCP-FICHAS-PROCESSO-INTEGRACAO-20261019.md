# Auditoria — integração das Fichas de Processo do PCP

**Data:** 2026-10-19  
**Rota preservada:** `/pcp/fichas-processo`  
**Branch:** `fix/pcp-fichas-processo-completas-20261019`

## O que foi feito

- A página original por categoria foi preservada integralmente em `src/pages/PCPFichasProcessoCategorias.tsx`, incluindo o modelo de prensados e o painel de fotos do molde.
- A rota oficial mantém `src/pages/PCPFichasProcesso.tsx` como componente central e agora oferece três modelos sem remover os anteriores:
  1. Processos por categoria (tela PCP que já existia).
  2. Cadastro completo da ficha (identificação, cliente, produto, ferramental, máquina, cavidades, parâmetros, zonas, imagem técnica e setup).
  3. Engenharia, materiais e qualidade (tipos de processo, especificações, BOM, operações, fotos, inspeção e revisão).
- O modelo de cadastro recebeu controles compactos, altura de 30 px e tipografia de dados reduzida.
- A foto técnica passa a persistir o caminho do Storage, não a URL assinada temporária; URLs assinadas antigas são normalizadas para o caminho do objeto e renovadas ao abrir a ficha.
- Foram acrescentados filtros explícitos por `empresa_id` nas consultas de produtos, máquinas, moldes e catálogo do modelo de Engenharia, além do filtro de empresa na atualização de controles de inspeção.
- Os três modelos permanecem montados ao alternar as abas, evitando perder os rascunhos apenas por trocar de modelo.

## Arquivos

- `src/pages/PCPFichasProcesso.tsx`
- `src/pages/PCPFichasProcessoCategorias.tsx`
- `src/pages/PCPFichasProcessoCadastro.tsx`
- `src/pages/PCPFichaEngenhariaCompleta.tsx`

## Verificação pendente

- Confirmar o resultado dos checks automáticos de CI e do build Vercel deste branch.
- Confirmar em sessão autenticada o carregamento, gravação, edição e leitura de imagens no Supabase Storage.
- A conexão do banco usada nesta sessão não permitiu executar a inspeção de esquema diretamente; nenhuma migração de banco foi aplicada.
- A publicação em produção não é considerada concluída até existir deployment READY com o commit deste branch e a rota ser verificada.
