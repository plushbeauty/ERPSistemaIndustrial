import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export interface DataTableColumn<T> {
  key: keyof T
  title: string
  className?: string
  render?: (row: T) => React.ReactNode
  searchable?: boolean
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchPlaceholder = 'Pesquisar registros...',
  emptyMessage = 'Nenhum registro encontrado.',
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState('')
  const [sortKey, setSortKey] = React.useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

  const visibleRows = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    const filtered = normalizedQuery
      ? data.filter((row) => columns.some((column) => {
          if (column.searchable === false) return false
          const value = row[column.key]
          return value != null && String(value).toLocaleLowerCase('pt-BR').includes(normalizedQuery)
        }))
      : [...data]

    if (!sortKey) return filtered
    return filtered.sort((left, right) => {
      const a = left[sortKey]
      const b = right[sortKey]
      const comparison = String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      })
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [columns, data, query, sortDirection, sortKey])

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  return (
    <section className={cn('min-w-0 border border-border bg-card text-card-foreground', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border p-2">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
          <Input
            aria-label={searchPlaceholder}
            className="pl-7"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={searchPlaceholder}
          />
        </label>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground" aria-live="polite">
          {visibleRows.length} de {data.length}
        </span>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="bg-muted/70 text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {columns.map((column) => {
                const active = sortKey === column.key
                const SortIcon = active ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
                return (
                  <th key={String(column.key)} scope="col" className={cn('whitespace-nowrap border-b border-border px-2 py-1 font-bold', column.className)}>
                    <button
                      type="button"
                      className="inline-flex h-[24px] min-h-0 items-center gap-1 rounded-[2px] text-left font-[inherit] text-[9px]"
                      onClick={() => toggleSort(column.key)}
                      aria-label={`Ordenar por ${column.title}`}
                      aria-pressed={active}
                    >
                      {column.title}
                      <SortIcon aria-hidden="true" className="size-3 opacity-60" />
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={getRowId(row)} className="border-b border-border/70 last:border-0 hover:bg-accent/40">
                {columns.map((column) => (
                  <td key={String(column.key)} className={cn('px-2 py-1 align-middle', column.className)}>
                    {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
