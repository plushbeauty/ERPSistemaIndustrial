# Loop de auditoria e correção — ERP Industrial

- Data: 2026-10-16
- Revisão: UI-LOOP-R1

## Comando de varredura

Na raiz do repositório, executar npm run audit:ui-standardization. O script percorre páginas/componentes, identifica rotas, classes de altura/largura, maxLength, CSS local e uso dos tokens compartilhados. O relatório em docs/erp-standardization/generated/ui-audit.json é estático e não substitui inspeção visual nem testes funcionais.

## Ciclo obrigatório por tela

1. Ler BACKLOG.md e escolher o item pendente de maior prioridade.
2. Confirmar a rota em src/AppEntryV2.tsx e o componente que realmente renderiza.
3. Consultar REFERENCE.md, a tela aprovada e o relatório automático.
4. Registrar medidas e divergências antes de editar.
5. Corrigir uma tela por vez, preservando Supabase, validações, permissões, RPCs, dados, impressão e fiscal.
6. Revisar o diff para manter a mudança no escopo.
7. Executar npm run type-check, npm run lint:check, npm run audit:all, npm run verify:lazy-imports, npm run verify-routes e npm run build. Registrar resultados reais.
8. Conferir todas as abas da rota em execução quando o navegador estiver disponível.
9. Só após atender REFERENCE.md, retirar o item de BACKLOG.md e registrar evidência/commit em COMPLETED.md.
10. Repetir até não restar item pendente. Nunca esvaziar o backlog sem evidência.

## Proteções

- Não reescrever JSX/CSS em massa automaticamente.
- Não alterar automaticamente Novo Pedido, que tem status de tela aprovada/imutável.
- Não inventar tabelas, colunas, RPCs ou permissões.
- h-8 isoladamente não comprova conformidade: largura, grid, alinhamento, comportamento e aparência também contam.
- Scanner estático pode gerar falsos positivos/negativos; confirmar código e renderização.
- Falha ambiental ou limite de serviço deve ser registrada como bloqueio, não como sucesso.