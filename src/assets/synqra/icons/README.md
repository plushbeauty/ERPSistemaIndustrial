# Biblioteca de ícones SYSNQRA

Esta pasta centraliza os ícones reutilizáveis do SYSNQRA ERP INDUSTRIAL.

- `index.ts`: catálogo de módulos existente e ponto de entrada público.
- `library.ts`: biblioteca organizada por categorias, usando a dependência `lucide-react` já instalada.

## Uso

```tsx
import { SYNQRA_ICON_LIBRARY } from '@/assets/synqra/icons'

const FolderIcon = SYNQRA_ICON_LIBRARY.pastas.items.find(
  (item) => item.key === 'folder-open',
)?.Icon

// Dentro do JSX:
{FolderIcon ? <FolderIcon size={20} aria-hidden="true" /> : null}
```

Para escolher um ícone por categoria, consulte `SYNQRA_ICON_LIBRARY`:
- `instalacao`: primeiro acesso, etapas, salvar e concluir.
- `rede`: rede local, servidor, computador, nuvem e conexão.
- `pastas`: pastas, fotos, desenhos, documentos e arquivos.
- `armazenamento`: disco local, banco de dados, backup e sincronização.

## Padrão visual

- Reutilizar ícones Lucide, evitando SVGs duplicados para o mesmo conceito.
- Manter tamanho e cor coerentes com o componente que contém o ícone.
- Preferir 16–20 px em ações compactas e 20–24 px em cards.
- Ícones decorativos devem usar `aria-hidden="true"`; controles devem ter rótulo acessível.
- Não substituir nem redesenhar telas já aprovadas apenas para trocar ícones. A biblioteca deve ser adotada nas próximas implementações e em ajustes explicitamente autorizados.
