# Loop de auditoria e correção — ERP Industrial

- Data: 2026-10-16
- Revisão: UI-LOOP-R1

## Comando de varredura

Na raiz do repositório, executar npm run audit:ui-standardization. O script percorre páginas/componentes, identifica rotas, classes de altura/largura, maxLength, CSS local e uso dos tokens compartilhados. O relatório em docs/erp-standardization/generated/ui-audit.json é estático e não substitui inspeção visual nem testes funcionais.

## Execução automatizada no GitHub Actions

O workflow `.github/workflows/industrial-code-quality.yml` executa `npm run audit:ui-standardization` depois da instalação determinística e publica `docs/erp-standardization/generated/ui-audit.json` como artefato `erp-ui-standardization-audit` mesmo quando uma etapa posterior falha. A mudança foi gravada no commit `ef29ae745d757ba7cfad543545b4bcd2444f45b7`. A integração só conta como validada quando houver execução do workflow e artefato/resultado real; a existência da configuração não comprova execução.

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
EXECUTAR AGORA O COMANDO GRAVADO DE PENTE-FINO TOTAL DO SYSNQRA ERP INDUSTRIAL.

Repositório: `plushbeauty/ERPSistemaIndustrial`.

Siga obrigatoriamente `docs/erp-standardization/LOOP.md`, `BACKLOG.md`, `REFERENCE.md` e `COMPLETED.md`.

1. Execute `npm run audit:ui-standardization` e examine o relatório `docs/erp-standardization/generated/ui-audit.json`.
2. Execute `npm run audit:all`.
3. Percorra o BACKLOG por prioridade e audite cada tela individualmente, confirmando a rota em `src/AppEntryV2.tsx` e o componente efetivamente renderizado.
4. Use a tela de Compras aprovada como referência visual obrigatória. Compare também com ERPNext, Odoo e Dolibarr.
5. Faça o pente-fino de cards, cabeçalhos, botões, campos, tabelas, fontes, alinhamentos, espaçamentos, responsividade e funcionalidades.
6. Corrija diretamente cada tela, uma por vez, preservando dados reais, Supabase, RLS, RBAC, RPCs, validações, impressão e contratos das telas aprovadas.
7. Não altere automaticamente telas aprovadas/imutáveis. Não burle hash locks nem invente dados ou funcionalidades.
8. Registre cada resultado em `COMPLETED.md` com evidências e commit. Não retire itens do BACKLOG sem comprovação.
9. Depois de cada correção, execute `npm run type-check`, `npm run lint:check`, `npm run audit:all`, `npm run verify:lazy-imports`, `npm run verify-routes` e `npm run build`.
10. Repita o ciclo até concluir todo o BACKLOG. Registre impedimentos reais, sem marcar como concluída tela não verificada.
11. Confira Preview e produção Vercel. Não publique alterações que violem os contratos das telas aprovadas.

Comece agora. Não quero somente relatório: quero auditoria, correções reais no GitHub, commits, testes e evidências até concluir todas as telas.
## Proteções

- Não reescrever JSX/CSS em massa automaticamente.
- Não alterar automaticamente Novo Pedido, que tem status de tela aprovada/imutável.
- Não inventar tabelas, colunas, RPCs ou permissões.
- h-8 isoladamente não comprova conformidade: largura, grid, alinhamento, comportamento e aparência também contam.
- Scanner estático pode gerar falsos positivos/negativos; confirmar código e renderização.
- Falha ambiental ou limite de serviço deve ser registrada como bloqueio, não como sucesso.
