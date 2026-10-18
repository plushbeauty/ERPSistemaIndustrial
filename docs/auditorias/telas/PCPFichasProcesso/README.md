# Auditoria de tela — Ficha de Processo (PCP)

**Arquivo:** `src/pages/PCPFichasProcesso.tsx`  
**Diretriz:** `docs/erp-standardization/DIRETRIZ_SUPREMA_UI_UX_SGQERP.md`  
**Escopo desta revisão:** compactação e alinhamento dos campos e cartões, sem redesenhar o tema aprovado.

## Alterações realizadas
- Campos padrão reduzidos para altura de 32 px (`h-8`), texto de 11 px, padding compacto e largura mínima segura.
- Rótulos ajustados para 9 px, negrito, caixa alta e espaçamento consistente.
- Formulário de pesquisa distribuído em grade responsiva de 12 colunas.
- Cartões dos parâmetros técnicos exibidos lado a lado a partir de telas `lg`, com espaçamentos menores e campos internos alinhados em duas colunas quando houver espaço.
- Cartões de fichas existentes passam a ocupar duas colunas em telas `lg`.
- Reduzidos os espaços externos e o padding do cabeçalho/folha para aproveitar melhor a altura útil.
- Campo de unidade compactado para não empurrar nem desalinha os inputs.
- Área de instruções reduzida, mantendo possibilidade de redimensionamento.
- **Preservado:** paleta escura aprovada, estrutura e desenho SVG da prensa/injetora, e inputs de temperatura posicionados diretamente sobre o desenho. Nenhuma imagem do equipamento foi removida ou substituída.

## Verificações ainda necessárias
- [x] Build/deploy preview concluído com estado `READY` no Vercel para commit `77cd0b1be4a538ccf11f0972e03e514d0ff0c841`; status combinado Vercel = `success`.
- [ ] Executar/obter saída explícita de type-check e lint isolados. O deploy READY comprova que o pipeline de build finalizou, mas não substitui relatórios individuais.
- [ ] Testar criação, edição e gravação real de ficha PRENSADOS com sessão autenticada e RLS. O conector Supabase disponível retornou erro de permissão e não lista o projeto; nenhuma gravação de teste foi executada.
- [ ] Conferir em desktop e tablet que os campos de temperatura continuam sobre os pontos corretos da ilustração. A tentativa de inspeção visual remota redirecionou para a tela de login do ERP; sem sessão autenticada não foi possível inspecionar a ficha renderizada.
- [ ] Confirmar impressão A4 e quebra de página.
- [x] Confirmar deploy preview: Vercel `READY`; não é confirmação de produção.

## Evidências e limites
- O deploy READY corresponde à branch `fix/pcp-process-sheet-submenu-guard` e inclui o commit de compactação da ficha.
- A ilustração SVG da prensa mantém `viewBox="0 0 680 300"`; os três campos continuam posicionados por percentuais (`left: 33%`, `width: 34%`; `top: 27%, 52%, 72%`). Isso confirma que o posicionamento é relativo ao desenho no código, não que tenha sido visualmente validado em viewport real.
- O código de carregamento e gravação obtém `erp_current_empresa_id`, filtra as leituras por `empresa_id` e grava com `empresa_id` no payload; persistência/RLS real ainda precisa de teste com sessão autenticada.

**Estado:** build/deploy preview confirmado; validação operacional e inspeção visual desktop/tablet permanecem pendentes por falta de acesso à sessão autenticada e ao projeto Supabase via conector.
