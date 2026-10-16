import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Printer, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type ProductLookup = {
  id: string
  codigo: string
  nome: string
  codigo_barras: string | null
  referencia_cliente: string | null
  referencia_interna: string | null
}

type TestForm = {
  codigo: string
  codigoBarras: string
  descricao: string
  codigoCliente: string
  referenciaCliente: string
  referenciaInterna: string
  fabricado: boolean
  comprado: boolean
  revenda: boolean
}

const initialForm: TestForm = {
  codigo: '',
  codigoBarras: '',
  descricao: '',
  codigoCliente: '',
  referenciaCliente: '',
  referenciaInterna: '',
  fabricado: false,
  comprado: false,
  revenda: false,
}

export default function ProdutosVendasTelaTeste() {
  const navigate = useNavigate()
  const [empresaId, setEmpresaId] = useState('')
  const [form, setForm] = useState<TestForm>(initialForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [rows, setRows] = useState<ProductLookup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc('erp_current_empresa_id')
      if (!active) return
      if (rpcError || !data) {
        setError('Não foi possível identificar a empresa da sessão. A consulta ao cadastro está bloqueada.')
        return
      }
      setEmpresaId(String(data))
    })()
    return () => { active = false }
  }, [])

  const update = <K extends keyof TestForm>(key: K, value: TestForm[K]) => {
    setForm(current => ({ ...current, [key]: value }))
    setNotice('')
  }

  const searchProducts = async () => {
    if (!empresaId) {
      setError('Empresa da sessão não identificada. Entre novamente no ERP e tente outra vez.')
      return
    }
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('erp_produtos')
      .select('id,codigo,nome,codigo_barras,referencia_cliente,referencia_interna')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('codigo')
      .limit(500)
    setLoading(false)
    if (queryError) {
      setError('Falha na consulta real de produtos: ' + queryError.message)
      setRows([])
      return
    }
    setRows((data ?? []) as ProductLookup[])
  }

  const openLookup = () => {
    setSearchText('')
    setModalOpen(true)
    setNotice('')
    void searchProducts()
  }

  const filteredRows = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter(row =>
      [row.codigo, row.nome, row.codigo_barras ?? '', row.referencia_cliente ?? '', row.referencia_interna ?? '']
        .some(value => value.toLocaleLowerCase('pt-BR').includes(term)),
    )
  }, [rows, searchText])

  const chooseProduct = (row: ProductLookup) => {
    setForm(current => ({
      ...current,
      codigo: row.codigo ?? '',
      codigoBarras: row.codigo_barras ?? '',
      descricao: row.nome ?? '',
      codigoCliente: row.codigo ?? '',
      referenciaCliente: row.referencia_cliente ?? '',
      referenciaInterna: row.referencia_interna ?? '',
    }))
    setModalOpen(false)
    setNotice('Registro real selecionado para validar o alinhamento. Esta tela não grava nem altera produtos.')
    setError('')
  }

  return (
    <main className="product-test-page">
      <style>{`
        .product-test-page{min-height:100vh;background:#f4f6f9;color:#123b50;padding:18px;font-family:Inter,"Segoe UI",Arial,sans-serif;box-sizing:border-box}
        .product-test-page *{box-sizing:border-box}
        .pt-shell{max-width:1120px;margin:0 auto}
        .pt-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
        .pt-title{margin:0;font-size:18px;font-weight:700;letter-spacing:.02em;color:#123b50}
        .pt-subtitle{margin:4px 0 0;font-size:11px;color:#526579}
        .pt-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .pt-btn{height:32px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 11px;border:1px solid #b9c7d5;border-radius:3px;background:#fff;color:#123b50;font-size:11px;font-weight:650;cursor:pointer}
        .pt-btn-primary{background:#2d8db8;border-color:#2d8db8;color:#fff}
        .pt-card{background:#fff;border:1px solid #cbd5df;border-radius:3px;margin-bottom:12px;overflow:hidden}
        .pt-card-head{height:36px;display:flex;align-items:center;padding:0 12px;background:#e7f2f7;border-bottom:1px solid #cbd5df;color:#123b50;font-size:11px;font-weight:750;letter-spacing:.04em}
        .pt-card-body{padding:14px}
        .pt-row{display:flex!important;align-items:center!important;gap:12px!important;width:100%!important;min-height:32px!important;height:32px!important;margin:0 0 10px!important;flex-wrap:nowrap!important}
        .pt-row:last-child{margin-bottom:0!important}
        .pt-label{display:block!important;flex:0 0 160px!important;width:160px!important;min-width:160px!important;max-width:160px!important;margin:0!important;color:#475569!important;font-size:12px!important;line-height:16px!important;font-weight:600!important;text-transform:uppercase!important;white-space:nowrap!important;overflow:visible!important}
        .pt-control{display:flex!important;align-items:center!important;gap:5px!important;flex:0 0 auto!important;min-width:0!important;height:32px!important}
        .pt-input{display:block!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;height:32px!important;max-width:none!important;margin:0!important;padding:0 7px!important;border:1px solid #94a3b8!important;border-radius:3px!important;background:#f8fafc!important;color:#172b3a!important;font-family:Consolas,"Courier New",monospace!important;font-size:13px!important;line-height:30px!important;box-shadow:none!important}
        .pt-input:focus{outline:2px solid #2d8db8!important;outline-offset:1px!important;background:#fffdf0!important}
        .edit-2{width:6ch!important;max-width:6ch!important;text-align:center!important}
        .edit-3{width:7ch!important;max-width:7ch!important;text-transform:uppercase!important}
        .edit-4{width:8ch!important;max-width:8ch!important;text-align:right!important}
        .edit-6{width:11ch!important;max-width:11ch!important}
        .edit-8{width:14ch!important;max-width:14ch!important}
        .edit-12{width:18ch!important;max-width:18ch!important;text-align:right!important}
        .edit-14{width:18ch!important;max-width:18ch!important}
        .edit-20{width:25ch!important;max-width:25ch!important}
        .edit-60{width:38ch!important;max-width:280px!important}
        .edit-120{width:60ch!important;max-width:450px!important}
        .pt-lookup{height:32px;width:32px;flex:0 0 32px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #2d8db8;border-radius:3px;background:#eaf6fb;color:#17678c;cursor:pointer}
        .pt-checks{display:flex;align-items:center;gap:22px;min-height:32px;flex-wrap:wrap}
        .pt-check{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#334155;white-space:nowrap}
        .pt-check input{width:15px;height:15px;margin:0;accent-color:#2d8db8}
        .pt-note{margin:0 0 12px;padding:9px 11px;border:1px solid #d7e5ec;background:#f0f8fb;color:#36566a;font-size:11px;line-height:1.5}
        .pt-error{margin:0 0 12px;padding:9px 11px;background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;font-size:11px;overflow-wrap:anywhere}
        .pt-modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:rgba(15,35,52,.58)}
        .pt-modal{display:flex;flex-direction:column;width:min(820px,96vw);max-height:82vh;background:#fff;border:1px solid #123b50;border-radius:3px;box-shadow:0 18px 55px #0004;overflow:hidden}
        .pt-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 13px;background:#123b50;color:#fff}
        .pt-modal-body{padding:12px;overflow:auto}
        .pt-search{width:100%;height:32px;padding:0 9px;border:1px solid #94a3b8;border-radius:3px;font:12px Consolas,"Courier New",monospace}
        .pt-table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px}
        .pt-table th{position:sticky;top:0;background:#e7f2f7;color:#123b50;text-align:left;font-size:10px;text-transform:uppercase}
        .pt-table th,.pt-table td{padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:middle}
        .pt-table tbody tr:hover{background:#f1f8fb}
        .pt-empty{text-align:center;padding:22px!important;color:#64748b}
        @media(max-width:700px){.product-test-page{padding:10px}.pt-card-body{padding:10px}.pt-row{height:auto!important;min-height:32px!important;flex-wrap:wrap!important;align-items:flex-start!important;margin-bottom:12px!important}.pt-label{flex-basis:100%!important;width:100%!important;max-width:none!important}.pt-control{max-width:100%;flex-wrap:nowrap}.edit-60,.edit-120{max-width:min(100%,450px)!important}.pt-checks{gap:14px}}
        @media print{.pt-no-print{display:none!important}.product-test-page{padding:0;background:#fff}.pt-card{break-inside:avoid}}
      `}</style>
      <div className="pt-shell">
        <header className="pt-toolbar pt-no-print">
          <div>
            <h1 className="pt-title">CADASTRO DE PRODUTOS — TELA-TESTE</h1>
            <p className="pt-subtitle">Laboratório isolado de geometria de campos · ERP Industrial</p>
          </div>
          <div className="pt-actions">
            <button className="pt-btn" type="button" onClick={() => navigate('/produtos-vendas')}><ArrowLeft size={14} /> VOLTAR AO CADASTRO</button>
            <button className="pt-btn pt-btn-primary" type="button" onClick={() => window.print()}><Printer size={14} /> IMPRIMIR TELA</button>
          </div>
        </header>

        <p className="pt-note">Tela de teste isolada: os campos servem para homologar largura e alinhamento. A lupa consulta produtos reais da empresa autenticada. Nenhuma alteração é salva no banco nesta tela.</p>
        {error && <p className="pt-error" role="alert">{error}</p>}
        {notice && <p className="pt-note" role="status">{notice}</p>}

        <section className="pt-card" aria-labelledby="pt-identificacao">
          <div className="pt-card-head" id="pt-identificacao">CARD 01 · IDENTIFICAÇÃO DO ITEM</div>
          <div className="pt-card-body">
            <div className="pt-row">
              <label className="pt-label" htmlFor="pt-codigo">Código do Item</label>
              <div className="pt-control"><input id="pt-codigo" className="pt-input edit-20" maxLength={20} value={form.codigo} onChange={e => update('codigo', e.target.value)} /></div>
            </div>
            <div className="pt-row">
              <label className="pt-label" htmlFor="pt-barras">Cód. Barras</label>
              <div className="pt-control"><input id="pt-barras" className="pt-input edit-14" maxLength={14} value={form.codigoBarras} onChange={e => update('codigoBarras', e.target.value)} /></div>
            </div>
            <div className="pt-row">
              <label className="pt-label" htmlFor="pt-descricao">Descrição Comercial</label>
              <div className="pt-control"><input id="pt-descricao" className="pt-input edit-120" maxLength={120} value={form.descricao} onChange={e => update('descricao', e.target.value)} /></div>
            </div>
            <div className="pt-row">
              <label className="pt-label" htmlFor="pt-codigo-cliente">Código Cliente</label>
              <div className="pt-control"><input id="pt-codigo-cliente" className="pt-input edit-20" maxLength={20} value={form.codigoCliente} onChange={e => update('codigoCliente', e.target.value)} /></div>
              <label className="pt-label" htmlFor="pt-ref-cliente" style={{flexBasis: '160px'}}>Referência Cliente</label>
              <div className="pt-control">
                <input id="pt-ref-cliente" className="pt-input edit-60" maxLength={60} value={form.referenciaCliente} onChange={e => update('referenciaCliente', e.target.value)} />
                <button type="button" className="pt-lookup pt-no-print" onClick={openLookup} title="Pesquisar produtos existentes da empresa" aria-label="Pesquisar produto"><Search size={16} /></button>
              </div>
            </div>
            <div className="pt-row">
              <label className="pt-label" htmlFor="pt-ref-interna">Referência Interna</label>
              <div className="pt-control"><input id="pt-ref-interna" className="pt-input edit-60" maxLength={60} value={form.referenciaInterna} onChange={e => update('referenciaInterna', e.target.value)} /></div>
            </div>
            <div className="pt-row">
              <span className="pt-label">Tipo de fornecimento</span>
              <div className="pt-checks">
                <label className="pt-check"><input type="checkbox" checked={form.fabricado} onChange={e => update('fabricado', e.target.checked)} /> Fabricado</label>
                <label className="pt-check"><input type="checkbox" checked={form.comprado} onChange={e => update('comprado', e.target.checked)} /> Comprado</label>
                <label className="pt-check"><input type="checkbox" checked={form.revenda} onChange={e => update('revenda', e.target.checked)} /> Revenda</label>
              </div>
            </div>
          </div>
        </section>

        <footer className="pt-actions pt-no-print" style={{justifyContent: 'flex-end'}}>
          <button type="button" className="pt-btn" onClick={() => setForm(initialForm)}>LIMPAR CAMPOS</button>
          <button type="button" className="pt-btn pt-btn-primary" onClick={() => window.print()}><Printer size={14} /> IMPRIMIR TELA</button>
        </footer>
      </div>

      {modalOpen && <div className="pt-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false) }}>
        <section className="pt-modal" role="dialog" aria-modal="true" aria-labelledby="pt-modal-title">
          <header className="pt-modal-head">
            <strong id="pt-modal-title" style={{fontSize: 12}}>PESQUISA REAL DE PRODUTOS · EMPRESA AUTENTICADA</strong>
            <button type="button" className="pt-btn" onClick={() => setModalOpen(false)} aria-label="Fechar pesquisa"><X size={14} /> FECHAR</button>
          </header>
          <div className="pt-modal-body">
            <input autoFocus className="pt-search" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Filtrar por código, descrição, barras ou referência..." />
            {loading ? <p className="pt-empty">Consultando o cadastro da empresa...</p> : <table className="pt-table">
              <thead><tr><th>Código</th><th>Descrição</th><th>Referência cliente</th><th>Referência interna</th><th>Ação</th></tr></thead>
              <tbody>
                {filteredRows.map(row => <tr key={row.id}>
                  <td>{row.codigo}</td><td>{row.nome}</td><td>{row.referencia_cliente || '—'}</td><td>{row.referencia_interna || '—'}</td>
                  <td><button type="button" className="pt-btn pt-btn-primary" onClick={() => chooseProduct(row)}>SELECIONAR</button></td>
                </tr>)}
                {!filteredRows.length && <tr><td colSpan={5} className="pt-empty">{rows.length ? 'Nenhum produto corresponde ao filtro.' : 'Nenhum produto ativo encontrado para esta empresa.'}</td></tr>}
              </tbody>
            </table>}
          </div>
        </section>
      </div>}
    </main>
  )
}
