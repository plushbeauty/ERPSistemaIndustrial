import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

export type LookupRecord = {
  id: string
  codigo?: string | null
  nome?: string | null
  documento?: string | null
  codigo_cliente?: string | null
  dimensoes?: string | null
  canal?: string | null
  molde?: string | null
  unidade?: string | null
  estoque_atual?: number | null
  preco_venda?: number | null
}

type Props = {
  label: string
  value: string
  records?: LookupRecord[]
  onChange: (value: string) => void
  onSelect?: (record: LookupRecord) => void
  placeholder?: string
  required?: boolean
  helper?: string
  entityType?: string
}

export { EntityCodeLookup }

const inputClass = 'h-[54px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const filterClass = 'h-[50px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'

export default function EntityCodeLookup({
  label,
  value,
  records = [],
  onChange,
  onSelect = () => undefined,
  placeholder = 'Digite o código exato',
  required = false,
  helper,
}: Props) {
  const [open, setOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [dimensoes, setDimensoes] = useState('')
  const [typedCode, setTypedCode] = useState('')

  const selected = useMemo(() => records.find(record => record.id === value) ?? null, [records, value])

  useEffect(() => {
    setTypedCode(selected?.codigo ?? (value && !records.some(record => record.id === value) ? value : ''))
  }, [selected, value, records])

  const resolve = (raw = typedCode) => {
    const code = raw.trim().toLowerCase()
    if (!code) return
    const hit = records.find(record => String(record.codigo ?? '').trim().toLowerCase() === code)
    if (!hit) {
      onChange(raw.trim())
      onSelect({ id: '', codigo: raw.trim(), nome: null })
      return
    }
    setTypedCode(String(hit.codigo ?? ''))
    onChange(hit.id)
    onSelect(hit)
  }

  const filtered = useMemo(() => {
    const c = codigo.trim().toLowerCase()
    const d = descricao.trim().toLowerCase()
    const cc = codigoCliente.trim().toLowerCase()
    const dim = dimensoes.trim().toLowerCase()

    return records
      .filter(record => {
        const searchable = [
          record.codigo,
          record.nome,
          record.documento,
          record.codigo_cliente,
          record.dimensoes,
          record.canal,
          record.molde,
        ].map(value => String(value ?? '').toLowerCase()).join(' ')

        return (
          (!c || String(record.codigo ?? '').toLowerCase().includes(c)) &&
          (!d || String(record.nome ?? '').toLowerCase().includes(d)) &&
          (!cc || String(record.codigo_cliente ?? '').toLowerCase().includes(cc)) &&
          (!dim || searchable.includes(dim))
        )
      })
      .slice(0, 250)
  }, [records, codigo, descricao, codigoCliente, dimensoes])

  const selectRecord = (record: LookupRecord) => {
    setTypedCode(String(record.codigo ?? ''))
    onChange(record.id)
    onSelect(record)
    setOpen(false)
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-extrabold uppercase tracking-wide text-slate-800">
        {label}{required ? ' *' : ''}
      </label>

      <div className="mt-2 flex gap-2">
        <input
          className={inputClass}
          value={typedCode}
          required={required}
          placeholder={placeholder}
          aria-label={label}
          onChange={event => setTypedCode(event.target.value)}
          onBlur={() => resolve()}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              resolve()
            }
          }}
        />
        <button
          type="button"
          className="grid h-[54px] w-[58px] shrink-0 place-items-center rounded-md border border-slate-300 bg-slate-100 text-slate-800 shadow-sm transition hover:border-sky-500 hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
          onClick={() => setOpen(true)}
          aria-label={`Consultar ${label}`}
          title="Consultar por filtros"
        >
          <Search size={23} />
        </button>
      </div>

      {selected && (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-base">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <strong className="text-slate-950">{selected.codigo ?? '—'}</strong>
            <span className="text-slate-700">{selected.nome ?? 'Registro selecionado'}</span>
          </div>
          {(selected.dimensoes || selected.canal || selected.molde) && (
            <p className="mt-1 text-sm font-medium text-slate-600">
              {[selected.dimensoes, selected.canal, selected.molde].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
      )}

      {helper && <p className="mt-1 text-sm font-medium text-slate-600">{helper}</p>}

      {open && (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Consulta de ${label}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <section className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Consulta inteligente</span>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{label}</h2>
                <p className="mt-1 text-base text-slate-600">Filtre, selecione uma linha e o registro será aplicado ao formulário.</p>
              </div>
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                onClick={() => setOpen(false)}
                aria-label="Fechar consulta"
              >
                <X size={22} />
              </button>
            </header>

            <div className="grid shrink-0 gap-3 border-b border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-extrabold text-slate-800">
                Código Interno
                <input className={filterClass} value={codigo} onChange={event => setCodigo(event.target.value)} autoFocus />
              </label>
              <label className="text-sm font-extrabold text-slate-800">
                Descrição do Produto
                <input className={filterClass} value={descricao} onChange={event => setDescricao(event.target.value)} />
              </label>
              <label className="text-sm font-extrabold text-slate-800">
                Código do Cliente
                <input className={filterClass} value={codigoCliente} onChange={event => setCodigoCliente(event.target.value)} />
              </label>
              <label className="text-sm font-extrabold text-slate-800">
                Dimensões / Canal / Molde
                <input className={filterClass} value={dimensoes} onChange={event => setDimensoes(event.target.value)} />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[900px] border-collapse text-base">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-sm font-black uppercase text-slate-800">
                  <tr>
                    <th className="h-[54px] border-b border-slate-200 px-4">Código</th>
                    <th className="border-b border-slate-200 px-4">Descrição</th>
                    <th className="border-b border-slate-200 px-4">Cód. Cliente</th>
                    <th className="border-b border-slate-200 px-4">Dimensões / Canal / Molde</th>
                    <th className="border-b border-slate-200 px-4 text-right">Estoque</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(record => (
                    <tr
                      key={record.id}
                      tabIndex={0}
                      className="cursor-pointer border-b border-slate-200 text-slate-900 hover:bg-sky-50 focus:bg-sky-50 focus:outline-none"
                      onClick={() => selectRecord(record)}
                      onDoubleClick={() => selectRecord(record)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          selectRecord(record)
                        }
                      }}
                    >
                      <td className="h-[54px] px-4 font-black">{record.codigo ?? '—'}</td>
                      <td className="px-4 font-medium">{record.nome ?? '—'}</td>
                      <td className="px-4">{record.codigo_cliente ?? '—'}</td>
                      <td className="px-4">{[record.dimensoes, record.canal, record.molde].filter(Boolean).join(' • ') || '—'}</td>
                      <td className="px-4 text-right font-semibold">{record.estoque_atual == null ? '—' : Number(record.estoque_atual).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-base font-semibold text-slate-600">Nenhum registro encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600">
              <span>{filtered.length} registro(s) encontrado(s)</span>
              <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 font-bold text-slate-800 hover:bg-slate-100" onClick={() => setOpen(false)}>Cancelar</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
