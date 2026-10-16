# Padrão de medidas e hierarquia visual — ERP Industrial

Status: especificação técnica de referência. Aplicar aos componentes existentes, sem clonar telas nem alterar schema/RLS.

## 1. Compatibilidade por comprimento

| Campo | maxlength | width | max-width | Regras |
|---|---:|---|---|---|
| Tipo/situação | 2 | 5ch !important | 5ch | text-align:center |
| Unidade de medida | 3 | 6ch !important | 6ch | text-transform:uppercase |
| Lead time/prazo | 4 | 7ch !important | 7ch | text-align:right |
| Código de grupo/WIP | 6 | 9ch !important | 9ch | compacto |
| NCM/CEST/CFOP | 10 | 13ch !important | 13ch | compacto; respeitar validação fiscal específica |
| Valores/pesos/saldos | 14 | 16ch !important | 16ch | text-align:right; máscara/precisão conforme domínio |
| Código-chave/código do item | 20 | 23ch !important | 23ch | fonte monoespaçada |
| Nome de cliente/fornecedor | 60 | 100% !important | 280px | contêiner flexível |
| Descrição mestre de produto | 120 | 100% !important | 450px | contêiner flexível |

**Importante:** maxlength e largura visual não definem a capacidade do banco. Antes de aplicar um limite, verificar coluna, constraints, validação de domínio, RPCs e integrações existentes. Não truncar silenciosamente dados fiscais ou identificadores. A especificação de NCM/CEST/CFOP deve respeitar o comprimento e a regra fiscal real de cada campo (por exemplo, CFOP de quatro dígitos e NCM de oito dígitos).

## 2. Regra anti-estiramento

Wrappers de campos:
```css
.field-wrapper {
  flex: 0 0 auto !important;
  min-width: 0;
  box-sizing: border-box !important;
}
```

Controles:
```css
.field-wrapper input,
.field-wrapper select,
.field-wrapper textarea {
  display: inline-block !important;
  box-sizing: border-box !important;
  min-width: 0;
}
```

Classes-alvo:
```css
.edit-2   { width: 5ch !important; max-width: 5ch; }
.edit-3   { width: 6ch !important; max-width: 6ch; }
.edit-4   { width: 7ch !important; max-width: 7ch; }
.edit-6   { width: 9ch !important; max-width: 9ch; }
.edit-10  { width: 13ch !important; max-width: 13ch; }
.edit-14  { width: 16ch !important; max-width: 16ch; }
.edit-20  { width: 23ch !important; max-width: 23ch; }
.edit-60  { width: 100% !important; max-width: 280px; }
.edit-120 { width: 100% !important; max-width: 450px; }
```

Para .edit-60 e .edit-120, o wrapper deve permitir encolhimento e quebra responsiva; a largura percentual nunca deve causar overflow no pai. Não permitir que regras genéricas width:100% anulem campos compactos.

## 3. Card 01 — Identificação do produto

Ordem de composição:
1. Código — `edit-20`.
2. Cód. Barras — `edit-14`.
3. Descrição — `edit-120`.
4. Linha horizontal: Código Cliente (`edit-20`) ao lado de Referência Cliente (`edit-60`), responsiva sem sobreposição.
5. Referência Interna — `edit-60`.
6. Checkboxes em uma linha: Fabricado, Comprado, Revenda.

A aplicação deve manter nomes de campos e bindings do schema existentes. Não substituir referências de cliente e interna entre si sem verificar o modelo funcional atual.

## 4. Hierarquia visual de todos os cards

- Identificador/ícone e número da seção: azul de destaque `#2B6CB0`, negrito, caixa alta.
- Título principal: `#1A365D`, maior e mais destacado que a descrição.
- Descrição auxiliar: `#486581`, legível e com contraste suficiente.
- Fundo-base: `#F4F6F9`; superfície do card branca ou superfície já usada pelo módulo.
- Borda/separador: azul claro discreto; faixa lateral de destaque opcional, sem exagerar em sombras/radius.
- Reutilizar componente/classe compartilhada quando existir. Não duplicar estilos divergentes por módulo.
- Manter controles compactos (30 px como referência industrial), bordas de 2 px quando compatível com o padrão do módulo, foco visível e responsividade.

## 5. Auditoria e segurança de aplicação

Antes de editar: localizar componentes compartilhados, mapear classes concorrentes e conferir schema/tipos. Depois de editar: type-check, lint, build de produção, testes disponíveis e inspeção do preview Vercel. Não declarar sucesso sem logs/resultados confirmados. Preservar Supabase Auth, RLS, isolamento por `empresa_id`/`organization_id`, validações fiscais e contratos de RPC existentes.
