/*
  @AUDIT_DATE: 2026-10-16
  @AUDIT_TIME_BRT: 12:44
  @AUDIT_REVISION: #AUDIT-ERP-20261016-05
  @STATUS: IMPLEMENTED_PENDING_VALIDATION
  @SCOPE: src/pages/cadastro-produtos/FormFichaTecnica.tsx
  @REVIEWED: Campos de cadastro, metadados, unidade, referências, NCM/CEST e consultas fiscais.
  @CHANGES: Registro da revisão da ficha industrial ampliada e consulta de códigos; integração e schema precisam de validação automatizada e remota.
  @VALIDATION: Arquivo inspecionado no GitHub; type-check/lint/build e validação remota não executados nesta operação.
  @CHECKLIST: Scope-Limited | Preserve-Business-Rules | No-Fake-Data | Validation-Required
*/

import { Search, Save, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type C = { id: string; prefixo: string; digitos_produto: number }
type P = {
  id: string
  codigo: string
  nome: string
  categoria: string | null
  unidade: string
  unidade_compra: string | null
  unidade_venda: string | null
  cliente: string | null
  codigo_barras: string | null
  referencia_cliente: string | null
  referencia_interna: string | null
  ncm: string | null
  cest: string | null
  peso_liquido: number | null
  peso_bruto: number | null
  fabricado: boolean | null
  comprado: boolean | null
  revenda: boolean | null
  metadados_adicionais: Record<string, unknown> | null
}
type LookupRow = { cod: string; desc: string }

type FormState = {
  nome: string
  categoria: string
  unidade: string
  unidadeCompra: string
  unidadeVenda: string
  cliente: string
  codigoBarras: string
  referenciaCliente: string
  referenciaInterna: string
  abastecimento: 'FABRICADO' | 'COMPRADO' | 'REVENDA'
  ncm: string
  cest: string
  pesoLiquido: string
  pesoBruto: string
  fatorConversao: string
}
const emptyForm: FormState = {
  nome: '', categoria: '', unidade: 'UN', unidadeCompra: 'UN', unidadeVenda: 'UN',
  cliente: '', codigoBarras: '', referenciaCliente: '', referenciaInterna: '',
  abastecimento: 'COMPRADO', ncm: '', cest: '', pesoLiquido: '0', pesoBruto: '0', fatorConversao: '1',
}
const initialMeta = (value: Record<string, unknown> | null | undefined): FormState => ({
  ...emptyForm,
  categoria: typeof value?.categoria === 'string' ? value.categoria : '',
  fatorConversao: typeof value?.fator_conversao === 'number' || typeof value?.fator_conversao === 'string' ? String(value.fator_conversao) : '1',
})

export default function FormFichaTecnica({ productId, onSaved }: { productId?: string; onSaved: () => void }) {
  const [cfg, setCfg] = useState<C[]>([])
  const [configId, setConfigId] = useState('')
  const [tipo, setTipo] = useState('PA')
  const [p, setP] = useState<P | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [empresa, setEmpresa] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [lookupType, setLookupType] = useState<'ncm' | 'cest' | null>(null)
  const [lookupRows, setLookupRows] = useState<LookupRow[]>([])
  const [lookupSearch, setLookupSearch] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const setValue = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }))

  useEffect(() => {
    let alive = true
    void (async () => {
      setError('')
      const auth = await supabase.auth.getUser()
      if (!auth.data.user) { if (alive) setError('Sessão não autenticada.'); return }
      const user = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (user.error || !user.data?.empresa_id) { if (alive) setError(user.error?.message || 'Empresa não identificada.'); return }
      const tenant = user.data.empresa_id
      if (!alive) return
      setEmpresa(tenant)
      const codes = await supabase.from('erp_codigos').select('id,prefixo,digitos_produto').eq('empresa_id', tenant)
      if (codes.error) { setError(codes.error.message); return }
      if (alive) { const rows = (codes.data ?? []) as C[]; setCfg(rows); if (rows[0]) setConfigId(rows[0].id) }
      if (productId) {
        const result = await supabase.from('erp_produtos').select('id,codigo,nome,categoria,unidade,unidade_compra,unidade_venda,cliente,codigo_barras,referencia_cliente,referencia_interna,ncm,cest,peso_liquido,peso_bruto,fabricado,comprado,revenda,metadados_adicionais').eq('id', productId).eq('empresa_id', tenant).maybeSingle()
        if (result.error) { if (alive) setError(result.error.message); return }
        if (result.data && alive) {
          const row = result.data as unknown as P
          setP(row)
          const metadata = row.metadados_adicionais
          const abastecimento: FormState['abastecimento'] = row.fabricado ? 'FABRICADO' : row.revenda ? 'REVENDA' : 'COMPRADO'
          setForm({
            ...initialMeta(metadata),
            nome: row.nome ?? '', categoria: row.categoria ?? (typeof metadata?.categoria === 'string' ? metadata.categoria : ''),
            unidade: row.unidade ?? 'UN', unidadeCompra: row.unidade_compra ?? row.unidade ?? 'UN',
            unidadeVenda: row.unidade_venda ?? row.unidade ?? 'UN', cliente: row.cliente ?? '',
            codigoBarras: row.codigo_barras ?? '', referenciaCliente: row.referencia_cliente ?? '',
            referenciaInterna: row.referencia_interna ?? '', abastecimento, ncm: row.ncm ?? '', cest: row.cest ?? '',
            pesoLiquido: String(row.peso_liquido ?? 0), pesoBruto: String(row.peso_bruto ?? 0),
            fatorConversao: typeof metadata?.fator_conversao === 'number' || typeof metadata?.fator_conversao === 'string' ? String(metadata.fator_conversao) : '1',
          })
        }
      } else {
        setP(null)
        setForm(emptyForm)
      }
    })().catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'Falha ao carregar o cadastro.') })
    return () => { alive = false }
  }, [productId])

  const cfgSelected = cfg.find(row => row.id === configId)
  const preview = (cfgSelected?.prefixo || 'PL') + tipo + '0'.repeat(Math.max(3, Math.min(6, cfgSelected?.digitos_produto || 3)))
  const field = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-400 bg-[#f8fafc] px-2 text-[11px] font-mono text-slate-900 outline-none focus:border-[#2D8DB8] focus:bg-[#fffdf0] focus:ring-1 focus:ring-[#2D8DB8]/20'
  const label = 'grid min-w-0 gap-[2px] text-[9px] font-bold uppercase tracking-wider text-[#344054]'
  const lookupFiltered = useMemo(() => lookupRows.filter(row => (row.cod + ' ' + row.desc).toLocaleLowerCase('pt-BR').includes(lookupSearch.toLocaleLowerCase('pt-BR'))), [lookupRows, lookupSearch])

  const openLookup = async (target: 'ncm' | 'cest') => {
    if (!empresa) { setError('Empresa não identificada.'); return }
    setLookupType(target); setLookupRows([]); setLookupSearch(''); setLookupError(''); setLookupBusy(true)
    try {
      const result = await supabase.from('erp_produtos').select('ncm,cest,nome').eq('empresa_id', empresa).not(target, 'is', null).limit(500)
      if (result.error) throw result.error
      const rows: LookupRow[] = []
      const seen = new Set<string>()
      for (const row of result.data ?? []) {
        const code = target === 'ncm' ? row.ncm : row.cest
        if (typeof code !== 'string' || !code.trim() || seen.has(code)) continue
        seen.add(code)
        rows.push({ cod: code, desc: typeof row.nome === 'string' ? row.nome : 'Código já utilizado no cadastro da empresa' })
      }
      setLookupRows(rows.sort((a, b) => a.cod.localeCompare(b.cod)))
      if (!rows.length) setLookupError('Não há códigos cadastrados na base de produtos desta empresa. Nenhum código fictício foi incluído.')
    } catch (cause) {
      setLookupError(cause instanceof Error ? cause.message : 'Não foi possível consultar os códigos fiscais existentes.')
    } finally { setLookupBusy(false) }
  }

  const save = async () => {
    setError(''); setOk('')
    if (!empresa || !form.nome.trim()) { setError('Empresa e descrição do produto são obrigatórias.'); return }
    if (form.ncm && !/^\d{8}$/.test(form.ncm)) { setError('NCM deve conter exatamente 8 dígitos.'); return }
    if (form.cest && !/^\d{7}$/.test(form.cest)) { setError('CEST deve conter exatamente 7 dígitos.'); return }
    const numbers = [form.pesoLiquido, form.pesoBruto, form.fatorConversao].map(Number)
    if (numbers.some(value => !Number.isFinite(value) || value < 0) || Number(form.fatorConversao) <= 0) { setError('Pesos devem ser não negativos e o fator de conversão deve ser maior que zero.'); return }
    setBusy(true)
    try {
      let codigo = p?.codigo ?? ''
      if (!codigo) {
        if (!configId) throw new Error('Cadastre uma regra em Regras do Código antes de gerar o SKU.')
        const generated = await supabase.rpc('erp_gerar_codigo_produto', { p_config_id: configId, p_tipo_sigla: tipo })
        if (generated.error) throw generated.error
        if (typeof generated.data !== 'string' && typeof generated.data !== 'number') throw new Error('A função de geração não retornou um código válido.')
        codigo = String(generated.data)
      }
      const metadata: Record<string, unknown> = {
        ...(p?.metadados_adicionais ?? {}),
        fator_conversao: Number(form.fatorConversao),
        origem_cadastro: 'cadastro_produtos',
        atualizado_em: new Date().toISOString(),
      }
      const payload = {
        empresa_id: empresa, codigo, nome: form.nome.trim(), categoria: form.categoria.trim() || null,
        unidade: form.unidade.trim().toUpperCase(), unidade_compra: form.unidadeCompra.trim().toUpperCase(),
        unidade_venda: form.unidadeVenda.trim().toUpperCase(), cliente: form.cliente.trim() || null,
        codigo_barras: form.codigoBarras.trim() || null, referencia_cliente: form.referenciaCliente.trim() || null,
        referencia_interna: form.referenciaInterna.trim() || null, ncm: form.ncm || null, cest: form.cest || null,
        peso_liquido: Number(form.pesoLiquido), peso_bruto: Number(form.pesoBruto),
        fabricado: form.abastecimento === 'FABRICADO', comprado: form.abastecimento === 'COMPRADO',
        revenda: form.abastecimento === 'REVENDA', metadados_adicionais: metadata, ativo: true,
      }
      const result = p
        ? await supabase.from('erp_produtos').update(payload).eq('id', p.id).eq('empresa_id', empresa).select('id').maybeSingle()
        : await supabase.from('erp_produtos').insert(payload).select('id').single()
      if (result.error) throw result.error
      if (!result.data) throw new Error('O banco não confirmou a gravação do produto.')
      setOk('Produto gravado no cadastro da empresa: ' + codigo)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gravar produto. Verifique schema, sessão e permissões.')
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-3">
      <header><p className="text-[9px] font-bold uppercase tracking-wider text-[#2D8DB8]">Dados mestres · ERP industrial</p><h2 className="text-base font-bold text-[#123B50]">Cadastro de produtos</h2><p className="text-[10px] text-slate-600">Campos fiscais e logísticos ligados ao registro real de erp_produtos e metadados estruturados.</p></header>
      <div className="rounded-[2px] border border-slate-300 bg-white p-3">
        <div className="mb-3 grid grid-cols-1 gap-2 border-b border-slate-200 pb-3 md:grid-cols-4">
          <label className={label+' md:col-span-2'}>Código / SKU<input className={field+' font-bold text-[#123B50]'} readOnly value={p?.codigo || preview} /></label>
          <label className={label}>Tipo de SKU<select className={field} disabled={!!p} value={tipo} onChange={e=>setTipo(e.target.value)}><option value="MP">Matéria-prima</option><option value="PA">Produto acabado</option><option value="SA">Semiacabado</option><option value="IN">Insumo</option></select></label>
          <label className={label}>Regra de código<select className={field} disabled={!!p} value={configId} onChange={e=>setConfigId(e.target.value)}><option value="">Selecione</option>{cfg.map(row=><option key={row.id} value={row.id}>{row.prefixo} · {row.digitos_produto} dígitos</option>)}</select></label>
        </div>
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-4">
          <label className={label}>Código de barras<input className={field+' max-w-[16ch]'} maxLength={14} value={form.codigoBarras} onChange={e=>setValue('codigoBarras',e.target.value.replace(/[^0-9]/g,'').slice(0,14))}/></label>
          <label className={label+' md:col-span-2'}>Descrição<input className={field} required maxLength={120} value={form.nome} onChange={e=>setValue('nome',e.target.value)}/></label>
          <label className={label}>Categoria / grupo<input className={field} maxLength={60} value={form.categoria} onChange={e=>setValue('categoria',e.target.value)}/></label>
          <label className={label}>Código do cliente<input className={field} maxLength={20} value={form.cliente} onChange={e=>setValue('cliente',e.target.value)}/></label>
          <label className={label}>Referência do cliente<input className={field} maxLength={60} value={form.referenciaCliente} onChange={e=>setValue('referenciaCliente',e.target.value)}/></label>
          <label className={label}>Referência interna<input className={field} maxLength={60} value={form.referenciaInterna} onChange={e=>setValue('referenciaInterna',e.target.value)}/></label>
          <label className={label}>Tipo de abastecimento<select className={field} value={form.abastecimento} onChange={e=>setValue('abastecimento',e.target.value as FormState['abastecimento'])}><option value="FABRICADO">Fabricado</option><option value="COMPRADO">Comprado</option><option value="REVENDA">Revenda</option></select></label>
          <label className={label}>Unidade comercial<input className={field+' max-w-[7ch]'} maxLength={3} value={form.unidadeVenda} onChange={e=>setValue('unidadeVenda',e.target.value.toUpperCase().slice(0,3))}/></label>
          <label className={label}>Unidade de estoque<input className={field+' max-w-[7ch]'} maxLength={3} value={form.unidade} onChange={e=>setValue('unidade',e.target.value.toUpperCase().slice(0,3))}/></label>
          <label className={label}>Unidade de compras<input className={field+' max-w-[7ch]'} maxLength={3} value={form.unidadeCompra} onChange={e=>setValue('unidadeCompra',e.target.value.toUpperCase().slice(0,3))}/></label>
          <label className={label}>Fator de conversão<input className={field+' max-w-[18ch] text-right'} inputMode="decimal" value={form.fatorConversao} onChange={e=>setValue('fatorConversao',e.target.value.replace(/[^0-9.,]/g,'').replace(',','.'))}/></label>
          <div className="grid grid-cols-[minmax(0,1fr)_30px] items-end gap-0"><label className={label}>NCM (8 dígitos)<input className={field+' rounded-r-none'} maxLength={8} inputMode="numeric" value={form.ncm} onChange={e=>setValue('ncm',e.target.value.replace(/\D/g,'').slice(0,8))}/></label><button type="button" aria-label="Consultar NCM cadastrado" title="Consultar NCM já utilizado nesta empresa" className="h-[30px] rounded-r-[2px] border border-[#1a365d] bg-[#2D8DB8] text-white" onClick={()=>void openLookup('ncm')}><Search size={14}/></button></div>
          <div className="grid grid-cols-[minmax(0,1fr)_30px] items-end gap-0"><label className={label}>CEST (7 dígitos)<input className={field+' rounded-r-none'} maxLength={7} inputMode="numeric" value={form.cest} onChange={e=>setValue('cest',e.target.value.replace(/\D/g,'').slice(0,7))}/></label><button type="button" aria-label="Consultar CEST cadastrado" title="Consultar CEST já utilizado nesta empresa" className="h-[30px] rounded-r-[2px] border border-[#1a365d] bg-[#2D8DB8] text-white" onClick={()=>void openLookup('cest')}><Search size={14}/></button></div>
          <label className={label}>Peso líquido<input className={field+' max-w-[18ch] text-right'} inputMode="decimal" value={form.pesoLiquido} onChange={e=>setValue('pesoLiquido',e.target.value.replace(/[^0-9.,]/g,'').replace(',','.'))}/></label>
          <label className={label}>Peso bruto<input className={field+' max-w-[18ch] text-right'} inputMode="decimal" value={form.pesoBruto} onChange={e=>setValue('pesoBruto',e.target.value.replace(/[^0-9.,]/g,'').replace(',','.'))}/></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          <button type="button" disabled={busy} onClick={()=>void save()} className="inline-flex h-[30px] items-center gap-2 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white disabled:opacity-50"><Save size={14}/>{busy?'SALVANDO…':p?'SALVAR ALTERAÇÕES':'GERAR SKU E SALVAR'}</button>
          {error&&<p role="alert" className="rounded-[2px] border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] text-rose-800">{error}</p>}
          {ok&&<p role="status" className="rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] text-emerald-800">{ok}</p>}
        </div>
      </div>
      {lookupType&&<div role="dialog" aria-modal="true" aria-label={'Consulta '+lookupType.toUpperCase()} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3">
        <section className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-[2px] border border-slate-400 bg-white shadow-xl">
          <header className="sticky top-0 flex items-center justify-between border-b border-slate-300 bg-[#123B50] px-3 py-2 text-white"><h3 className="text-xs font-bold uppercase">Consulta de {lookupType.toUpperCase()} — dados já cadastrados</h3><button type="button" aria-label="Fechar consulta" onClick={()=>setLookupType(null)} className="h-[28px] w-[28px] rounded-[2px] hover:bg-white/10"><X size={16}/></button></header>
          <div className="space-y-2 p-3"><input className={field} autoFocus placeholder="Filtrar por código ou descrição" value={lookupSearch} onChange={e=>setLookupSearch(e.target.value)}/>{lookupBusy&&<p className="text-xs">Consultando banco da empresa…</p>}{lookupError&&<p role="status" className="text-xs text-amber-800">{lookupError}</p>}
            <table className="w-full border-collapse text-left text-[10px]"><thead className="bg-slate-100 uppercase"><tr><th className="border border-slate-300 p-2">Código</th><th className="border border-slate-300 p-2">Descrição associada</th><th className="border border-slate-300 p-2">Ação</th></tr></thead><tbody>{lookupFiltered.map(row=><tr key={row.cod} className="hover:bg-sky-50"><td className="border border-slate-200 p-2 font-mono">{row.cod}</td><td className="border border-slate-200 p-2">{row.desc}</td><td className="border border-slate-200 p-2"><button type="button" className="h-[26px] rounded-[2px] bg-[#2D8DB8] px-2 font-bold text-white" onClick={()=>{if(lookupType==='ncm')setValue('ncm',row.cod);else setValue('cest',row.cod);setLookupType(null)}}>Selecionar</button></td></tr>)}</tbody></table>
          </div>
        </section>
      </div>}
    </section>
  )
}
