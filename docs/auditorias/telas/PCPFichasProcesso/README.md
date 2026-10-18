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
- [ ] Executar type-check, lint e build no ambiente do projeto.
- [ ] Testar criação, edição e gravação real de ficha PRENSADOS com sessão autenticada e RLS.
- [ ] Conferir em desktop e tablet que os campos de temperatura continuam sobre os pontos corretos da ilustração.
- [ ] Confirmar impressão A4 e quebra de página.
- [ ] Confirmar deploy após o CI finalizar.

**Estado:** revisão visual de código aplicada; validação operacional e deploy ainda não confirmados.
