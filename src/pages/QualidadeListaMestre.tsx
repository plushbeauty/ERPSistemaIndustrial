import { useEffect, useMemo, useState } from 'react'
import { Printer, FileText } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import QualitySidebar from '../components/quality/QualitySidebar'

type Doc = {
  id: string
  codigo: string
  titulo: string
  area: string | null
  setor: string | null
  tipo: string
  revisao: number
  status: string
  data_emissao: string | null
  validade_ate: string | null
}

const ACTIVE_STATUSES = ['vigente', 'liberada', 'aprovada']
const OBSOLETE_STATUSES = ['obsoleta', 'substituida']

export default function QualidadeListaMestre() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ATIVOS')
  const [departamento, setDepartamento] = useState('TODOS')
  const [incluirFormularios, setIncluirFormularios] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const empresa = await supabase.rpc('erp_current_empresa_id')
    if (empresa.error || !empresa.data) {
      setError('Empresa não identificada.')
      return
    }

    const result = await supabase
      .from('erp_documentos_qualidade')
      .select('id,codigo,titulo,area,setor,tipo,revisao,status,data_emissao,validade_ate')
      .eq('empresa_id', empresa.data)
      .order('codigo')

    if (result.error) {
      setError(result.error.message)
      return
    }

    setDocs((result.data ?? []) as Doc[])
  }

  useEffect(() => {
    void load()
  }, [])

  const departamentos = useMemo<string[]>(() => {
    const values = docs.flatMap((doc) => [doc.area, doc.setor])
    const unique = new Set<string>()

    values.forEach((value) => {
      if (value?.trim()) unique.add(value.trim())
    })

    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [docs])

  const rows = useMemo<Doc[]>(() => {
    const normalizedQuery = q.trim().toLowerCase()

    return docs.filter((doc) => {
      const active =
        status === 'ATIVOS'
          ? ACTIVE_STATUSES.includes(doc.status)
          : status === 'OBSOLETOS'
            ? OBSOLETE_STATUSES.includes(doc.status)
            : true

      const departmentMatches =
        departamento === 'TODOS' ||
        doc.area === departamento ||
        doc.setor === departamento

      const isForm = /formul[aá]rio|^for[-_]/i.test(\`\${doc.tipo} \${doc.codigo}\`)
      const formMatches = incluirFormularios || !isForm

      const searchable = [
        doc.codigo,
        doc.titulo,
        doc.area,
        doc.setor,
        doc.tipo,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase()

      return (
        active &&
        departmentMatches &&
        formMatches &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      )
    })
  }, [docs, q, status, departamento, incluirFormularios])

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-sky-300">
              QUALIDADE &gt; SGQ &gt; LISTA MESTRE
            </p>
            <h1 className="text-2xl font-extrabold">Lista Mestre de Documentos</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md bg-sky-600 px-5 py-3 text-base font-extrabold text-white"
            >
              <Printer className="mr-2 inline" size={18} />
              IMPRIMIR LISTA MESTRE
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-slate-500 px-5 py-3 text-base font-extrabold text-white"
            >
              <Printer className="mr-2 inline" size={18} />
              IMPRIMIR ÍNDICE DE PASTA
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-5 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <QualitySidebar active="/qualidade/lista-mestre" />

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-rose-300 bg-rose-50 p-4 font-semibold text-rose-900">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row">
            <label className="flex-1 text-sm font-extrabold text-slate-800">
              PESQUISAR
              <input
                className="mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Código, título, setor ou departamento"
              />
            </label>

            <label className="w-full text-sm font-extrabold text-slate-800 md:w-64">
              DEPARTAMENTO
              <select
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900"
              >
                <option value="TODOS">Todos os departamentos</option>
                {departamentos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="w-full text-sm font-extrabold text-slate-800 md:w-64">
              VISÃO
              <select
                className="mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="ATIVOS">ATIVOS</option>
                <option value="TODOS">TODOS</option>
                <option value="OBSOLETOS">OBSOLETOS</option>
              </select>
            </label>

            <label className="flex items-center gap-3 self-end rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-800">
              <input
                type="checkbox"
                checked={incluirFormularios}
                onChange={(event) => setIncluirFormularios(event.target.checked)}
                className="h-5 w-5"
              />
              Incluir formulários/anexos
            </label>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-base">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-3 text-left">Código</th>
                  <th className="p-3 text-left">Título</th>
                  <th className="p-3 text-left">Área</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Revisão</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Validade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-extrabold">{doc.codigo}</td>
                    <td className="p-3">{doc.titulo}</td>
                    <td className="p-3">{doc.area || doc.setor || '—'}</td>
                    <td className="p-3">{doc.tipo}</td>
                    <td className="p-3">Rev. {doc.revisao}</td>
                    <td className="p-3 font-bold">{doc.status}</td>
                    <td className="p-3">{doc.validade_ate || '—'}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center font-semibold text-slate-600">
                      <FileText className="mx-auto mb-2" size={30} />
                      Nenhum documento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
