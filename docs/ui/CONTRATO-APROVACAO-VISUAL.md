# Contrato de aprovação visual do SYSNQRA ERP & SGQ INDUSTRIAL

- Revisão: UI-CONTRACT-001
- Data: 2026-10-20
- Branch de referência: main
- Verificador obrigatório existente: `npm run verify:approved-ui-lock`
- Fonte executável: `scripts/verify-approved-ui-lock.mjs`

## Regra de proteção

Uma tela só é considerada congelada quando existe uma referência explícita no verificador e o comando `verify:approved-ui-lock` passa no commit avaliado. Não atualize hashes para fazer uma alteração não aprovada passar. Uma aprovação é específica aos arquivos e ao escopo registrados; não autoriza mudanças em outros módulos.

Antes de alterar CSS global, shell, navegação, tokens ou componentes compartilhados, identifique as telas dependentes e execute as verificações pertinentes. Se o bloqueio falhar, interrompa a publicação até restaurar a referência ou registrar uma revisão autorizada.

## Referências já cadastradas no verificador

A lista executável de arquivos e hashes fica em `scripts/verify-approved-ui-lock.mjs` e, nesta revisão, abrange 14 arquivos:

1. `src/pages/VendasCentral.tsx` — Vendas / Status do pedido
2. `src/pages/NovoPedido.tsx` — Vendas / Novo Pedido
3. `src/pages/ProdutosVendasIndustrial.tsx` — Cadastros / Produtos
4. `src/styles/industrial-login.css` — Login institucional
5. `src/pages/QualidadePaquimetroDigital.tsx` — Qualidade / Paquímetro Digital
6. `src/components/DigitalCaliper.tsx` — Qualidade / componente de medição digital
7. `src/pages/PCPTabletOperador.tsx` — PCP / Tablet do operador
8. `src/components/PCPTabletMenuModal.tsx` — PCP / Menu Tablet
9. `src/components/layout/ERPHorizontalShell.tsx` — Shell horizontal
10. `src/components/IndustrialCommandDashboard.tsx` — Dashboard industrial
11. `src/pages/PCPFichasProcesso.tsx` — PCP / Fichas de Processo
12. `src/pages/QualidadeInspecoesIndustrial.tsx` — Qualidade / Inspeções
13. `src/PublicIndustrialHome.tsx` — Página inicial pública
14. `src/components/PCPMoldPhotoPanel.tsx` — PCP / Fotos da ficha

## Estado honesto da cobertura

**Proteção parcial, não total.** A existência de 14 entradas não prova que todas as telas e rotas do sistema foram inventariadas, que todos os hashes correspondem ao conteúdo atual ou que o CI de branch esteja configurado como obrigatório no GitHub. O comando deve ser executado e seu resultado revisado para confirmar o estado atual.

## Inventário pendente

Antes de marcar qualquer tela adicional como aprovada, levantar as rotas de `src/AppEntryV2.tsx`, mapear o componente renderizado por cada rota, identificar estilos e dependências compartilhadas, obter referência visual aprovada e registrar arquivos, revisão, data e evidências. Telas sem evidência de aprovação ficam como `PENDENTE_DE_REFERENCIA`; não gerar hashes automaticamente para elas.

A expansão do bloqueio deve ser incremental. Cada nova referência só pode entrar após aprovação explícita do usuário para aquela tela e validação do hash inicial. As páginas congeladas não devem ser modificadas para acomodar a inclusão de outra página.
