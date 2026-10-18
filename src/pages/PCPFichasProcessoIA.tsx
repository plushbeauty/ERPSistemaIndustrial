import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FilePlus2, LoaderCircle, Save, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { categories, paramsFor } from './PCPFichasProcesso'
import type { Category } from './PCPFichasProcesso'

type Product = { id: string; codigo: string; nome: string }
type Machine = { id: string; codigo: string; nome: string }
type Generated = Record<string, string>

const inputClass = 'h-10 w-full rounded-lg border border-[#294456] bg-[#071522] px-3 text-sm text-[#F4FBFD] outline-none focus:border-[#48B7C7] focus:ring-2 focus:ring-[#48B7C7]/20'
const labelClass = 'mb-1 block text-xs font-semibold text-[#A8BBC8]'

export default function PCPFichasProcessoIA() {
 const navigate = useNavigate()
 const [empresaId, setEmpresaId] = useState('')
 const [products, setProducts] = useState<Product[]>([])
 const [machines, setMachines] = useState<Machine[]>([])
 const [category, setCategory] = useState<Category>('ACABAMENTO')
 const [productId, setProductId] = useState('')
 const [machineId, setMachineId] = useState('')
 const [code, setCode] = useState('')
 const [brief, setBrief] = useState('')
 const [generated, setGenerated] = useState<Generated | null>(null)
 const [loading, setLoading] = useState(false)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState('')
 const [notice, setNotice] = useState('')

 useEffect(() => {
  let active = true
  async function load() {
   setLoading(true)
   setError('')
   try {
    const tenant = await supabase.rpc('erp_current_empresa_id')
    if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
    const [productResult, machineResult] = await Promise.all([
     supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenant.data).eq('ativo', true).order('codigo').limit(3000),
     supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', tenant.data).not('status', 'eq', 'INATIVA').order('codigo').limit(2000),
    ])
    if (productResult.error) throw productResult.error
    if (machineResult.error) throw machineResult.error
    if (active) {
     setEmpresaId(tenant.data)
     setProducts((productResult.data ?? []) as Product[])
     setMachines((machineResult.data ?? []) as Machine[])
    }
   } catch (cause) {
    if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar os cadastros da empresa.')
   } finally {
    if (active) setLoading(false)
   }
  }
  void load()
  return () => { active = false }
 }, [])

 const fields = useMemo(() => paramsFor(category), [category])
 const selectedProduct = products.find(product => product.id === productId)

 function changeCategory(next: Category) {
  setCategory(next)
  setGenerated(null)
  setNotice('')
  setError('')
 }

 async function generateDraft() {
  setError('')
  setNotice('')
  setGenerated(null)
  if (!brief.trim()) {
   setError('Descreva o processo e os critérios que a IA deve organizar.')
   return
  }
  setLoading(true)
  try {
   const result = await supabase.functions.invoke('erp-ai-process-sheet', {
    body: {
     category,
     description: brief.trim(),
     fields: fields.map(({ key, label, unit, type, options }) => ({ key, label, unit, type: type ?? 'text', options })),
    },
   })
   if (result.error) throw result.error
   const payload = result.data as { parameters?: unknown; error?: string } | null
   if (payload?.error) throw new Error(payload.error)
   if (!payload?.parameters || typeof payload.parameters !== 'object' || Array.isArray(payload.parameters)) {
    throw new Error('A IA retornou uma ficha em formato inválido. Revise a descrição e tente novamente.')
   }
   const values = payload.parameters as Record<string, unknown>
   const safeValues: Generated = {}
   for (const field of fields) {
    const value = values[field.key]
    if (field.type === 'number' && typeof value === 'number' && Number.isFinite(value)) safeValues[field.key] = String(value)
    else if (field.type === 'select' && typeof value === 'string' && field.options?.includes(value)) safeValues[field.key] = value
    else if ((field.type ?? 'text') === 'text' && typeof value === 'string') safeValues[field.key] = value.slice(0, 4000)
    else safeValues[field.key] = ''
   }
   setGenerated(safeValues)
   setNotice('Proposta gerada como rascunho. Revise todos os dados antes de gravar.')
  } catch (cause) {
   setError(cause instanceof Error ? cause.message : 'Não foi possível gerar a proposta com IA.')
  } finally {
   setLoading(false)
  }
 }

 function updateField(key: string, value: string) {
  setGenerated(current => current ? { ...current, [key]: value } : current)
 }

 async function saveDraft() {
  setError('')
  setNotice('')
  if (!empresaId) return setError('Empresa da sessão não identificada.')
  if (!selectedProduct) return setError('Selecione o produto vinculado à ficha.')
  if (!code.trim()) return setError('Informe um código único para a ficha.')
  if (!generated) return setError('Gere e revise a proposta antes de gravar.')
  if (code.trim().length > 80) return setError('O código da ficha não pode exceder 80 caracteres.')
  const missing = fields.filter(field => field.required && !String(generated[field.key] ?? '').trim())
  if (missing.length) return setError('Preencha os campos obrigatórios antes de gravar: ' + missing.map(field => field.label).join(', ') + '.')
  const invalid = fields.filter(field => field.type === 'number' && generated[field.key] !== '' && !Number.isFinite(Number(generated[field.key])))
  if (invalid.length) return setError('Corrija os valores numéricos: ' + invalid.map(field => field.label).join(', ') + '.')
  const parameters = Object.fromEntries(fields.map(field => {
   const value = generated[field.key] ?? ''
   return [field.key, field.type === 'number' && value !== '' ? Number(value) : value || null]
  }))
  setSaving(true)
  try {
   const result = await supabase.from('erp_fichas_processo').insert({
    empresa_id: empresaId,
    codigo_ficha: code.trim(),
    produto_id: productId,
    ferramenta_id: null,
    maquina_id: machineId || null,
    categoria_processo: category,
    revisao: 1,
    versao_ficha: 1,
    status: 'RASCUNHO',
    ativo: true,
    parametros_tecnicos: { ...parameters, origem_geracao: 'IA_REVISADA' },
   })
   if (result.error) throw result.error
   setNotice('Rascunho gravado no cadastro real de fichas de processo.')
   setGenerated(null)
   navigate('/pcp/fichas-processo?tipo=' + encodeURIComponent(category) + '&produto=' + encodeURIComponent(productId))
  } catch (cause) {
   setError(cause instanceof Error ? cause.message : 'Falha ao gravar o rascunho da ficha.')
  } finally {
   setSaving(false)
  }
 }

 return <main className="min-h-screen bg-[#071522] p-3 text-[#F4FBFD] md:p-6">
  <div className="mx-auto max-w-6xl">
   <header className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#294456] bg-[#0D2638] p-4">
    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#48B7C7]/30 bg-[#071522] text-[#48B7C7]"><Sparkles size={20}/></span>
    <div className="min-w-[230px] flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#48B7C7]">PCP / ENGENHARIA</p><h1 className="text-xl font-bold">Criar ficha de processo com IA</h1><p className="text-sm text-[#A8BBC8]">A IA sugere os campos; você revisa e confirma antes de salvar como rascunho.</p></div>
    <Link className="erp-premium-button erp-premium-button-secondary" to="/pcp/fichas-processo"><ArrowLeft size={15}/> Voltar às fichas</Link>
   </header>

   {error&&<div role="alert" className="mb-3 rounded-lg border border-[#D65B61]/50 bg-[#D65B61]/10 p-3 text-sm text-[#F4B8BB]">{error}</div>}
   {notice&&<div role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-[#3A9D78]/40 bg-[#3A9D78]/10 p-3 text-sm text-[#8ED0B4]"><CheckCircle2 size={16}/>{notice}</div>}

   <section className="rounded-xl border border-[#294456] bg-[#0D2638] p-4">
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
     <label><span className={labelClass}>Modelo de ficha</span><select className={inputClass} value={category} onChange={event=>changeCategory(event.target.value as Category)}>{categories.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
     <label><span className={labelClass}>Produto real da empresa</span><select className={inputClass} value={productId} onChange={event=>setProductId(event.target.value)}><option value="">Selecione o produto</option>{products.map(product=><option key={product.id} value={product.id}>{product.codigo} · {product.nome}</option>)}</select></label>
     <label><span className={labelClass}>Código único da ficha</span><input className={inputClass} value={code} onChange={event=>setCode(event.target.value)} maxLength={80} placeholder="Informe o código controlado pela Engenharia"/></label>
     <label><span className={labelClass}>Máquina / recurso cadastrado</span><select className={inputClass} value={machineId} onChange={event=>setMachineId(event.target.value)}><option value="">Não vincular máquina</option>{machines.map(machine=><option key={machine.id} value={machine.id}>{machine.codigo} · {machine.nome}</option>)}</select></label>
    </div>
    <label className="block"><span className={labelClass}>Contexto técnico para a IA</span><textarea className="min-h-32 w-full rounded-lg border border-[#294456] bg-[#071522] p-3 text-sm text-[#F4FBFD] outline-none focus:border-[#48B7C7]" value={brief} onChange={event=>setBrief(event.target.value)} maxLength={6000} placeholder="Descreva o processo, sequência, materiais, critérios de inspeção, embalagem, tempos e requisitos já aprovados. A IA não deve presumir valores que você não informar."/></label>
    <p className="mt-2 text-xs text-[#A8BBC8]">Apenas a categoria, a lista de campos e o texto digitado aqui são enviados ao provedor de IA configurado. Não inclua segredos ou dados confidenciais. Campos sem evidência ficam vazios; valide os dados técnicos com Engenharia.</p>
    <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className="erp-premium-button" onClick={()=>void generateDraft()} disabled={loading||saving}><Sparkles size={15}/>{loading?<><LoaderCircle size={15} className="animate-spin"/> Gerando proposta…</>:'Gerar proposta para revisar'}</button></div>
   </section>

   {generated&&<section className="mt-4 rounded-xl border border-[#48B7C7]/40 bg-[#0D2638] p-4">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-[#48B7C7]">RASCUNHO NÃO HOMOLOGADO</p><h2 className="text-lg font-bold">Revise e corrija os campos sugeridos</h2><p className="text-xs text-[#A8BBC8]">{selectedProduct?`${selectedProduct.codigo} · ${selectedProduct.nome}`:'Produto ainda não selecionado'}</p></div><span className="rounded-lg border border-[#E6A34A]/40 bg-[#E6A34A]/10 px-3 py-2 text-xs font-bold text-[#E6A34A]">Não liberar para produção</span></div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{fields.map(field=><label key={field.key} className={field.multiline?'md:col-span-2':''}><span className={labelClass}>{field.label}{field.required&&<span className="ml-1 text-[#D65B61]">*</span>}</span>{field.type==='select'?<select className={inputClass} value={generated[field.key]??''} onChange={event=>updateField(field.key,event.target.value)}><option value="">Selecione</option>{(field.options??[]).map(option=><option key={option} value={option}>{option}</option>)}</select>:field.multiline?<textarea className="min-h-24 w-full rounded-lg border border-[#294456] bg-[#071522] p-3 text-sm text-[#F4FBFD] outline-none focus:border-[#48B7C7]" value={generated[field.key]??''} onChange={event=>updateField(field.key,event.target.value)}/>:<span className="flex"><input className={inputClass+' rounded-r-none'} type={field.type==='number'?'number':'text'} step={field.step} value={generated[field.key]??''} onChange={event=>updateField(field.key,event.target.value)}/><span className="flex min-w-[58px] items-center justify-center rounded-r-lg border border-l-0 border-[#294456] bg-[#123B50] px-2 text-xs text-[#A8BBC8]">{field.unit}</span></span>}</label>)}</div>
    <div className="mt-4 flex justify-end"><button type="button" className="erp-premium-button" onClick={()=>void saveDraft()} disabled={saving||loading}><Save size={15}/>{saving?'Gravando rascunho…':'Confirmar e gravar como RASCUNHO'}</button></div>
   </section>}

   {!loading&&products.length===0&&<p className="mt-4 rounded-lg border border-[#E6A34A]/40 bg-[#E6A34A]/10 p-3 text-sm text-[#E6A34A]">Não há produtos ativos disponíveis nesta empresa para vincular à ficha.</p>}
   <p className="mt-4 flex items-center gap-2 text-xs text-[#8297A5]"><FilePlus2 size={14}/> A gravação usa a sessão e as políticas RLS existentes; a IA não grava diretamente no banco nem altera ficha homologada.</p>
  </div>
 </main>
}