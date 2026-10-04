import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export type LinkOption = {
  value: string
  label: string
  description?: string
  dimensions?: string
}

type Props = {
  value: string
  options: LinkOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

function fuzzyScore(option: LinkOption, query: string) {
  const haystack = [option.label, option.value, option.description || '', option.dimensions || ''].join(' ').toLowerCase()
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return 0
  let total = 0
  for (const term of terms) {
    const exact = haystack.indexOf(term)
    if (exact >= 0) total += 100 - Math.min(exact, 80)
    else {
      let cursor = 0
      let hits = 0
      for (const char of term) {
        const found = haystack.indexOf(char, cursor)
        if (found < 0) break
        hits += 1
        cursor = found + 1
      }
      total += (hits / term.length) * 25
    }
  }
  return total / terms.length
}

export default function LinkFieldCombobox({
  value,
  options,
  onChange,
  placeholder = 'Pesquisar...',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(
    () =>
      options
        .map((option) => ({ option, rank: fuzzyScore(option, query) }))
        .filter((item) => !query.trim() || item.rank > 0)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 80),
    [options, query],
  )

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={open ? query : selected?.label || ''}
          disabled={disabled}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          placeholder={placeholder}
          className="h-7 w-full rounded-md border border-gray-200 bg-white pl-7 pr-7 text-[11px] text-gray-800 outline-none focus:border-blue-500"
        />
        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>
      {open && !disabled && (
        <div
          className="absolute left-0 top-8 z-50 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {filtered.map(({ option }) => (
            <button
              key={option.value}
              type="button"
              className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-slate-50"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value)
                setQuery('')
                setOpen(false)
              }}
            >
              <span className="truncate font-medium">{option.label}</span>
              <span className="ml-auto truncate text-[10px] text-gray-400">{option.value}</span>
            </button>
          ))}
          {!filtered.length && <div className="h-7 px-2 text-[11px] leading-7 text-gray-400">Nenhum registro.</div>}
        </div>
      )}
    </div>
  )
}
