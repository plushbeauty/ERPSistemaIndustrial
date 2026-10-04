import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

type TableUrlStateOptions = {
  filterKey?: string
  pageKey?: string
  pageSizeKey?: string
  defaultPage?: number
  defaultPageSize?: number
}

export function useTableUrlState(options: TableUrlStateOptions = {}) {
  const {
    filterKey = 'filter',
    pageKey = 'page',
    pageSizeKey = 'pageSize',
    defaultPage = 1,
    defaultPageSize = 50,
  } = options
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo(
    () => ({
      globalFilter: searchParams.get(filterKey) ?? '',
      page: Math.max(Number(searchParams.get(pageKey) ?? defaultPage) || defaultPage, 1),
      pageSize: Math.max(Number(searchParams.get(pageSizeKey) ?? defaultPageSize) || defaultPageSize, 1),
    }),
    [defaultPage, defaultPageSize, filterKey, pageKey, pageSizeKey, searchParams],
  )

  const update = useCallback(
    (patch: Partial<{ globalFilter: string; page: number; pageSize: number }>) => {
      const next = new URLSearchParams(searchParams)

      if (patch.globalFilter !== undefined) {
        if (patch.globalFilter) next.set(filterKey, patch.globalFilter)
        else next.delete(filterKey)
        next.set(pageKey, String(defaultPage))
      }

      if (patch.page !== undefined) next.set(pageKey, String(Math.max(patch.page, 1)))
      if (patch.pageSize !== undefined) next.set(pageSizeKey, String(Math.max(patch.pageSize, 1)))

      setSearchParams(next)
    },
    [defaultPage, filterKey, pageKey, pageSizeKey, searchParams, setSearchParams],
  )

  const resetPage = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.set(pageKey, String(defaultPage))
    setSearchParams(next)
  }, [defaultPage, pageKey, searchParams, setSearchParams])

  return { ...state, setState: update, resetPage }
}
