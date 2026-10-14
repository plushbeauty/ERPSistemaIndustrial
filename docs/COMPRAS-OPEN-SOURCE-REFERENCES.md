# Referências open source — piloto Compras

Data da análise: 14/10/2026

## Referências pesquisadas em código-fonte

### 1. ProcureX — MIT

- Repositório: https://github.com/Jkatex/ProcureX
- Licença verificada: https://github.com/Jkatex/ProcureX/blob/main/LICENSE
- Arquivo de frontend inspecionado: https://github.com/Jkatex/ProcureX/blob/67c1663b56e99c2663b2b5cdfe685614e90346e0/procurement-platform/client/src/features/procurement/components/procurex/CreateTenderProcurexPage.tsx
- README/estrutura: https://github.com/Jkatex/ProcureX/blob/main/README.md
- Observação técnica: a tela de criação de tender está fortemente acoplada a Redux, rotas, serviços e componentes internos do ProcureX. Não foi transplantada diretamente, pois isso também exigiria importar contratos de API, estado e dependências que não existem no ERP Industrial. O código foi inspecionado como referência de organização de fluxo documental e formulário.

### 2. ERPNext — GPL-3.0

- Repositório: https://github.com/frappe/erpnext
- Licença verificada: https://github.com/frappe/erpnext/blob/develop/license.txt
- Pedido de compra (JavaScript real): https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/purchase_order/purchase_order.js
- Solicitação de cotação (JavaScript real): https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/request_for_quotation/request_for_quotation.js
- Documentação de RFQ: https://docs.frappe.io/erpnext/request-for-quotation
- Observação técnica: os arquivos usam o framework Frappe e seus contratos de formulário. O código não foi copiado para o app React/TypeScript/Supabase porque isso exigiria avaliar e cumprir as obrigações copyleft da GPL-3.0; a referência foi usada para verificar os campos e a sequência de negócio de RFQ/pedido.

### 3. OCA purchase-workflow — AGPL-3.0

- Repositório: https://github.com/OCA/purchase-workflow
- Licença verificada: https://github.com/OCA/purchase-workflow/blob/18.0/LICENSE
- Observação técnica: conjunto de extensões do Odoo, não um módulo React independente. Não foi transplantado.

## Limites da implementação atual

As referências foram lidas a partir dos arquivos de código-fonte e licenças, não apenas de imagens. Ainda assim, **esta entrega é uma adaptação da interface e do fluxo do ERP existente; não é uma cópia literal de um componente open source**. Nenhuma API, tabela, autenticação ou esquema de dados de terceiros foi importado. O Supabase e as regras de tenant do ERP Industrial permanecem a fonte de dados.

## Alterações do piloto nesta etapa

- `src/pages/ComprasIndustrial.tsx`: retirada a navegação lateral interna duplicada, mantido o shell compartilhado do ERP, adicionada ação de impressão do relatório da tela ativa.
- `src/pages/ComprasRFQ.tsx`: adicionada prévia documental imprimível da RFQ, com fornecedores selecionados, itens, quantidades, datas e observações reais da tela.
- `src/pages/ComprasRequisicoes.tsx`: área do relatório identificada para impressão isolada.
- `src/styles/compras-compact.css`: CSS de impressão A4 com cabeçalho documental, tabelas e ocultação dos controles de tela.

## Validação técnica registrada

- Commit de aplicação validado no Vercel: `adb8cc767eaf26e445a68f4fbba4fcb198b681b5`.
- Deploy de preview: `READY` — https://erp-sistema-industrial-1hr94cdqy-plushbeauty.vercel.app
- O comando de produção terminou com sucesso: `type-check`, `lint:check`, `audit:all`, `verify:lazy-imports`, `build`, `verify:build` e `verify-routes`; o gate registrou 244 rotas e 153 imports lazy.
- O build Vite terminou e o gate confirmou `dist/index.html` e 235 assets.
- A inspeção visual e o diálogo real de impressão não foram confirmados: o preview redireciona para login/SSO do Vercel quando acessado pelo navegador de validação. Os fluxos de dados e as impressões ainda precisam de teste autenticado.

**Estado de aceite:** parcialmente validado, não aprovado como clonagem literal de código open source nem como teste funcional/visual de ponta a ponta. A adaptação visual foi registrada com transparência; nenhuma API, tabela ou autenticação de terceiros foi importada.
