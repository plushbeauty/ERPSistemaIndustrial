/**
 * SYSNQRA ERP INDUSTRIAL — tabela de dados compacta com ordenação, paginação e estados.
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 */
import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import '../../styles/synqra-premium-foundation-20261031.css'
import { ERPEmptyState, ERPErrorState, ERPLoadingState } from './ERPStatusBadge'

export type ERPColumn<Row> = {
  key: string
  header: string
  render: (row: Row) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: number | string
  sortable?: boolean
  /** Valor usado para ordenar e para busca textual; omitido desativa a ordenação da coluna. */
  value?: (row: Row) => string | number | null | undefined
  muted?: boolean
  strong?: boolean
}

type SortState = { key: string; direction: 'asc' | 'desc' }

type ERPDataTableProps<Row> = {
  columns: ERPColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRowClick?: (row: Row) => void
  selectedKey?: string | null
  pageSize?: number
  maxHeight?: number
  searchable?: boolean
  searchPlaceholder?: string
  summary?: ReactNode
  footer?: ReactNode
  ariaLabel?: string
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true })
}

function styleWidth(width?: number | string): { width?: string; minWidth?: string; maxWidth?: string } {
  if (width == null) return {}
  if (typeof width === 'number') return { width: `${width}px`, minWidth: `${width}px` }
  return { width, minWidth: width }
}

export function ERPDataTable<Row>({
  columns, rows, rowKey, loading = false, error = null, onRetry, emptyTitle = 'Nenhum registro encontrado',
  emptyDescription, emptyAction, onRowClick, selectedKey = null, pageSize, maxHeight, searchable = false,
  searchPlaceholder = 'Buscar…', summary, footer, ariaLabel,
}: ERPDataTableProps<Row>) {
  const [sort, setSort] = useState<SortState | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const searchableColumns = useMemo(() => columns.filter((column) => column.value), [columns])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term || searchableColumns.length === 0) return rows
    return rows.filter((row) => searchableColumns.some((column) => String(column.value?.(row) ?? '').toLowerCase().includes(term)))
  }, [rows, query, searchableColumns])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const column = columns.find((item) => item.key === sort.key)
    if (!column?.value) return filtered
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((left, right) => compareValues(column.value?.(left), column.value?.(right)) * factor)
  }, [filtered, sort, columns])

  const pageCount = pageSize && pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const currentPage = Math.min(page, pageCount - 1)
  const visible = pageSize && pageSize > 0 ? sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize) : sorted

  const toggleSort = (key: string) => {
    setSort((current) => (current?.key === key
      ? (current.direction === 'asc' ? { key, direction: 'desc' } : null)
      : { key, direction: 'asc' }))
  }

  return (
    <div className="sxp-table-panel">
      {searchable && (
        <div className="sxp-filters sxp-filters--table">
          <div className="sxp-filters__field sxp-filters__grow">
            <input className="sxp-input" type="search" value={query} placeholder={searchPlaceholder} onChange={(event) => { setQuery(event.target.value); setPage(0) }} aria-label={searchPlaceholder} />
          </div>
          {summary && <div className="sxp-table__summary">{summary}</div>}
        </div>
      )}
      <div className="sxp-tablewrap" style={maxHeight ? ({ '--sxp-table-max': `${maxHeight}px` } as CSSProperties) : undefined}>
        {loading && <div className="sxp-loadingbar" aria-hidden><i /></div>}
        {error
          ? <div className="sxp-table__state"><ERPErrorState message={error} onRetry={onRetry} /></div>
          : loading && rows.length === 0
            ? <div className="sxp-table__state"><ERPLoadingState columns={Math.min(columns.length, 5)} /></div>
            : visible.length === 0
              ? <div className="sxp-table__state"><ERPEmptyState title={emptyTitle} description={query ? `Nenhum resultado para "${query}".` : emptyDescription} action={emptyAction} /></div>
              : (
                <table className="sxp-table" aria-label={ariaLabel}>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          style={styleWidth(column.width)}
                          className={[
                            column.align === 'right' ? 'sxp-th--num' : column.align === 'center' ? 'sxp-th--center' : '',
                            column.sortable && column.value ? 'sxp-th--sortable' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={column.sortable && column.value ? () => toggleSort(column.key) : undefined}
                          aria-sort={sort?.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                        >
                          {column.header}
                          {column.sortable && column.value && (
                            <span className={`sxp-table__sort${sort?.key === column.key ? ' sxp-table__sort--active' : ''}`} aria-hidden>
                              {sort?.key === column.key ? (sort.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ChevronsUpDown size={11} />}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => {
                      const key = rowKey(row)
                      return (
                        <tr
                          key={key}
                          className={[onRowClick ? 'sxp-tr--click' : '', selectedKey === key ? 'sxp-tr--selected' : ''].filter(Boolean).join(' ')}
                          onClick={onRowClick ? () => onRowClick(row) : undefined}
                        >
                          {columns.map((column) => (
                            <td
                              key={column.key}
                              className={[
                                column.align === 'right' ? 'sxp-td--num' : column.align === 'center' ? 'sxp-td--center' : '',
                                column.muted ? 'sxp-td--muted' : '',
                                column.strong ? 'sxp-td--strong' : '',
                              ].filter(Boolean).join(' ')}
                            >
                              {column.render(row)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
      </div>
      {(footer || (pageSize && pageSize > 0 && pageCount > 1)) && (
        <div className="sxp-panel__foot">
          {footer}
          {pageSize && pageSize > 0 && pageCount > 1 && (
            <div className="sxp-pager">
              <span className="sxp-pager__info">{sorted.length} registros · página {currentPage + 1} de {pageCount}</span>
              <span className="sxp-pager__btns">
                <button type="button" className="sxp-btn sxp-btn--sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior"><ChevronLeft size={13} /></button>
                <button type="button" className="sxp-btn sxp-btn--sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} aria-label="Próxima página"><ChevronRight size={13} /></button>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
