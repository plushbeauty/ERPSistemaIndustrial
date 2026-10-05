type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
  count: number | null
}

export async function fetchAllPages<T>(
  readPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = []
  let total: number | null = null
  let from = 0

  while (total === null || rows.length < total) {
    const result = await readPage(from, from + pageSize - 1)
    if (result.error) throw new Error(result.error.message)
    const page = result.data ?? []
    rows.push(...page)
    if (result.count !== null) total = result.count
    if (page.length === 0) break
    from += page.length
  }

  return rows
}
