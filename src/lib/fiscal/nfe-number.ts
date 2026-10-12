export function parseFiscalNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value ?? '').trim().replace(/\s+/g, '').replace(/^R\$/i, '')
  if (!raw) return 0

  const comma = raw.lastIndexOf(',')
  const dot = raw.lastIndexOf('.')
  let normalized: string

  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '')
  } else if (comma >= 0) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else {
    normalized = raw
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}
