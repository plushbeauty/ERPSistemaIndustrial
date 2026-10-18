# DIRETRIZ SUPREMA DE ARQUITETURA DE INTERFACE (UI/UX) — SGQERP
**Vigência:** 2026-10-18  
**Status:** padrão obrigatório para toda tela nova ou alterada  
**Aplicação:** React/TypeScript (.tsx/.ts/.jsx/.js), formulários, dashboards, grids, tablets, impressão e relatórios.

## Regra de bloqueio
Toda tela criada ou corrigida deve ter uma pasta de auditoria própria em `docs/auditorias/telas/<NomeDaTela>/`, com `README.md` contendo escopo, campos e contratos de dados, revisão/data, critérios avaliados, evidências de teste e pendências. Uma tela só pode ser declarada concluída com auditoria e validação técnica registradas. Telas congeladas/aprovadas não podem ser modificadas sem autorização explícita; esta diretriz não remove o bloqueio de UI aprovado.

## 1. Inputs, selects e labels
- Campos de entrada, selects, datas e controles equivalentes usam altura de **32px (`h-8`)**.
- Label acima do campo: `text-[9px] font-bold uppercase text-slate-400 tracking-wide`.
- Campo comum: `h-8 rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100 transition-all placeholder-slate-400`.
- Campo somente leitura/calculado: `h-8 rounded border border-slate-200 bg-slate-50 px-2.5 text-xs font-mono font-bold text-slate-500 outline-none`.
- Não esticar campos curtos (código, UF, quantidade, competência, CEP, CFOP). Usar largura proporcional, por exemplo `w-[90px]`, `w-[132px]`, `w-[160px]` e `max-w-full`. `w-full` só para descrições longas ou controles cuja função realmente exige preencher a coluna; não usar por padrão.
- Nunca sacrificar acessibilidade: cada input precisa de label associado ou nome acessível, validação e estado de erro visível.

## 2. Grids responsivos e estilos
- Cabeçalhos de filtro/formulários: `grid grid-cols-1 md:grid-cols-12 gap-3 items-end`; distribuir spans pelo comprimento real dos dados.
- Campos curtos: `md:col-span-1` ou `md:col-span-2`; médios: `md:col-span-3` ou `md:col-span-4`; longos: `md:col-span-5` a `md:col-span-7`.
- Proibido usar `style={{...}}` para layout, dimensões, alinhamento, cores ou posicionamento. Preferir Tailwind e tokens compartilhados. Se uma biblioteca exigir estilo dinâmico para visualização, documentar a exceção e não usá-la para layout de formulário.
- Evitar duplicar menus, cabeçalhos, CTAs ou painéis já fornecidos pelo shell global.

## 3. Cards, KPIs e abas
- Agrupamento: `bg-white border border-slate-200 rounded p-3 shadow-sm`.
- KPI crítico deve ter borda lateral forte, por exemplo `border-l-4 border-l-red-500` para atraso e `border-l-4 border-l-sky-600` para andamento.
- Abas de fichário: comum `h-7 px-3 text-[10px] font-bold border-t border-x border-transparent text-slate-500 hover:bg-slate-100 transition-all`; ativa `bg-white border-slate-200 text-sky-800 font-black relative z-10 -mb-[5px] shadow-sm`.
- Respeitar identidade industrial SGQERP: controles compactos, contraste suficiente, bordas discretas, tipografia operacional e sem cartões desnecessariamente grandes.

## 4. Workflow, grids e status
- Etapas distintas de Pedido, PCP, Estoque, SGQ, Logística e Fiscal devem possuir colunas próprias; não compactar múltiplas etapas numa única célula horizontal.
- Legenda horizontal de cores imediatamente acima do grid de dados quando o grid usa estados codificados por cor.
- Status concluído: `bg-emerald-100 text-emerald-800 border-emerald-300 font-bold`.
- Em andamento: `bg-sky-100 text-sky-800 border-sky-300 font-medium`.
- Bloqueio/atraso crítico: `bg-red-100 text-red-800 border-red-300 font-black`; animação pulsante apenas quando o alerta realmente exigir atenção contínua.
- Aguardando: `bg-slate-100 text-slate-600 border-slate-200`.
- Valores apresentados devem vir de consultas reais; nunca preencher telas com registros sintéticos para mascarar ausência de dados.

## 5. Integração real com Supabase e esquema
- Antes de alterar a lógica, ler os estados React, tratamento de erros, autenticação, consultas, RPCs, mutações, políticas RLS e contratos já usados.
- Todo campo persistente da UI precisa existir no esquema real. Se faltar, criar uma migração SQL versionada no repositório, com tipos, restrições, índices, chaves, RLS/policies e grants coerentes com o isolamento por `empresa_id`.
- Não remover um campo da UI só porque ainda não existe no banco. Também não inventar nomes de tabela/coluna sem conferir código, migrações e esquema. Registrar explicitamente se a migração foi apenas commitada ou aplicada e testada no Supabase remoto.
- Toda query e mutação deve tratar erros, escopar a empresa autenticada e obedecer RLS/RBAC. Nunca usar `service_role` no navegador, nem considerar `empresa_id` informado pelo cliente uma autorização suficiente.
- Para confirmar integração: verificar migração/esquema, grants/RLS, executar leitura/gravação de teste segura e confirmar o resultado retornado pelo banco. Não declarar teste remoto se o conector/ambiente não estiver acessível.

## 6. Impressão e PDF
- Toolbars, filtros, botões de salvar e paginações devem usar `no-print`.
- Incluir estilos de impressão para esconder controles, remover sombras desnecessárias e manter conteúdo legível em A4.
- Quando um formulário tiver abas com conteúdo essencial, impressão deve revelar sequencialmente as seções necessárias; não imprimir apenas a aba visível. Não revelar conteúdo confidencial ou de outras empresas.

## 7. Protocolo de auditoria e conclusão
- Nunca usar comentários de omissão como `// restante do código igual` para substituir a entrega de arquivo completo.
- Antes de editar: inspecionar arquivo integral, estados, efeitos, erros, imports, consultas, tabelas, migrações e rotas.
- Depois de editar: rodar type-check, lint e build/auditorias aplicáveis; validar a rota e o comportamento real. Registrar resultados com status PASS/FAIL/BLOCKED e evidência.
- Registrar commit SHA, arquivos alterados e estado de CI/deploy. Commit não significa deploy; build não significa teste remoto do banco.
- Auditar responsividade, alinhamento, alturas, largura de campos, acessibilidade, loading/empty/error/success states, persistência, isolamento multiempresa, impressão e regressões.
- Preservar telas congeladas e seus hashes. Não atualizar hashes aprovados apenas para mascarar regressão.
