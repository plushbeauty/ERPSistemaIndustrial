# 📑 DIRETRIZ SUPREMA DE INTERFACE E PADRONIZAÇÃO VISUAL ERP INDUSTRIAL

*Data de Homologação: 18/10/2026 | Responsável: FernandoSch System*

Este documento é a fonte de verdade para a estilização de componentes do sistema. Antes de alterar uma tela, consulte este padrão e verifique as regras específicas de páginas homologadas. Não mesclar layouts legados nem introduzir classes arbitrárias sem justificativa técnica.

## 📐 1. Alturas e Inputs (Controle de Edits Compactos)

- **Regra de ouro:** todos os campos de digitação (inputs), caixas de seleção (selects) e botões de ação rápidos de formulários devem possuir altura de **32px** (`h-8`), quando compatível com o componente e sua acessibilidade.
- **Banimento:** não usar alturas excessivas como `h-[54px]` ou `min-h-[46px]` em controles compactos de formulário.
- **Estilo padrão de input:**

```tsx
className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-sky-600 focus:ring-1 focus:ring-sky-100"
```

A classe `w-full` deve preencher apenas a coluna do grid correspondente, não a linha inteira por padrão. Exceções devem ser justificadas por tipo de campo, responsividade ou componente aprovado.

## 🎛️ 2. Malha de Formulários (Grid de 12 Colunas Responsivo)

- **Estrutura de linha:** agrupar campos em containers com `grid grid-cols-1 md:grid-cols-12 gap-3 items-end`.
- **Distribuição por tipo:**
  - Campos curtos (quantidade, unidade, sigla, CFOP, datas): `md:col-span-2` ou `md:col-span-3`.
  - Campos médios (preços, telefones, CNPJ, categoria): `md:col-span-3` ou `md:col-span-4`.
  - Campos longos (razão social, nome do produto, busca): `md:col-span-6` ou `md:col-span-8`.
  - Memorial descritivo/observações: `md:col-span-12`.

A largura deve refletir o conteúdo real. Não comprimir campos longos nem esticar campos curtos sem necessidade.

## 📊 3. Cards de BI e Totalizadores Superiores

- Os cards de métricas devem ser horizontais e compactos, com altura controlada.
- Evitar cards verticais grandes para números pequenos. Usar número legível, preferencialmente monoespaçado, próximo de um ícone funcional discreto em caixa `bg-slate-50 border rounded`.
- **Matriz de status:**
  - **Verde:** `text-emerald-700 bg-emerald-50 border-emerald-200` — Liberado, Aprovado, Concluído.
  - **Laranja:** `text-amber-700 bg-amber-50 border-amber-200` — Alerta, A vencer nos próximos 30 dias, Rascunho.
  - **Vermelho:** `text-red-700 bg-red-50 border-red-200` — Vencido crítico, Bloqueado, Reprovado, Trava fiscal. Usar `animate-pulse` somente quando a criticidade exigir destaque contínuo.
  - **Azul:** `text-sky-700 bg-sky-50 border-sky-200` — Em processamento, Fabricação PCP, Em manutenção.
  - **Cinza:** `text-slate-500 bg-slate-50 border-slate-300` — Inativo, Desativado, Histórico.

## 🗂️ 4. Organização de Grades (Tabelas Densas Delphi/SAP Style)

- Em fluxos de rastreabilidade, cada etapa (PCP, Estoque, Qualidade, Expedição, Fiscal) deve possuir coluna própria e independente, com badges compactos. Não empilhar etapas em uma única célula.
- Cabeçalhos compactos: `h-8 bg-slate-50` e `text-[9px] font-black uppercase`.
- Linhas de dados: preferir `h-9` ou `h-11`, conforme densidade, leitura e conteúdo. Não truncar informação operacional essencial para forçar altura fixa.

## 🛡️ 5. Protocolo de Gravação e Verificação (GitHub & Vercel)

1. Sobrescrever o arquivo completo ao fazer uma atualização; não deixar comentários substitutos como `// ... restante do código`.
2. Após o commit, consultar novamente o arquivo remoto na branch correta e conferir o conteúdo/SHA do blob ou commit.
3. Verificar o estado do build e da implantação Vercel pelo SHA de origem. Não declarar a publicação como concluída sem evidência de implantação `Ready` para o commit esperado.
4. Não fazer push forçado nem sobrescrever arquivos congelados sem autorização explícita e análise de impacto. Preferir commits normais e revisáveis.
5. Executar as verificações relevantes (type-check, lint, auditorias e build) e registrar resultados reais; não presumir que passaram.

## 🔒 6. Compatibilidade, Segurança e Páginas Homologadas

- Preservar rotas, contratos de dados, autenticação Supabase, RLS, isolamento por empresa e permissões existentes.
- Não introduzir dados simulados, autorizações apenas no navegador, chaves secretas no cliente ou tipos `any`.
- Não alterar telas explicitamente congeladas/homologadas sem autorização específica.
- Aplicar o padrão visual por tela e por componente, respeitando requisitos funcionais, acessibilidade e comportamento responsivo.
- Para imagens técnicas aprovadas (ex.: cilindro da injetora e prensa), preservar os arquivos e posicionar campos sobre a imagem apenas com referências verificadas do projeto; não substituir por imagens genéricas nem inventar posições ou temperaturas.

---

## Comando de aplicação por tela

Ao receber uma tela para ajuste:

1. Consultar esta diretriz e os padrões aprovados específicos dessa tela.
2. Ajustar controles para 32px e labels compactas, distribuir campos no grid de 12 colunas e aplicar a matriz de status.
3. Separar colunas de rastreabilidade e manter cards de BI compactos.
4. Investigar imports, rotas, dependências e dados antes de remover código.
5. Registrar data/revisão no arquivo alterado quando compatível com as convenções do projeto.
6. Validar o código, conferir a gravação no GitHub e verificar o SHA do deployment. Relatar claramente o que foi validado e o que ficou pendente.
