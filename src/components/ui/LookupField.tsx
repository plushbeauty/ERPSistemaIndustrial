import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export type LookupColumn<T> = { key: keyof T & string; label: string }
export type LookupResult<T> = { id: string; code: string; description: string; row: T }

type Props<T extends Record<string, unknown>> = {
  label: string; value: string; onChange: (value: string) => void; onSelect: (result: LookupResult<T>) => void
  table: string; codeColumn?: string; descriptionColumn?: string; extraColumns?: string; placeholder?: string
  disabled?: boolean; searchColumns?: string[]; columns: LookupColumn<T>[]; title?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function toRow<T extends Record<string, unknown>>(value: unknown): T | null {
  return isRecord(value) ? (value as unknown as T) : null
}

export default function LookupField<T extends Record<string, unknown>>({ label, value, onChange, onSelect, table, codeColumn='codigo', descriptionColumn='nome', extraColumns='', placeholder='Digite o código', disabled=false, searchColumns, columns, title }: Props<T>) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[rows,setRows]=useState<T[]>([]),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[resolved,setResolved]=useState(false)
  const timer=useRef<number|null>(null)
  async function findByCode(code=value){
    const normalized=code.trim(); if(!normalized){setResolved(false);return}
    setLoading(true);setMessage('')
    const select=[ 'id',codeColumn,descriptionColumn,extraColumns ].filter(Boolean).join(',')
    const {data,error}=await supabase.from(table).select(select).eq(codeColumn,normalized).eq('ativo',true).maybeSingle()
    if(error){setMessage(error.message);setResolved(false)}else{
      const row=toRow<T>(data)
      if(!row){setResolved(false);setMessage('Código não localizado. Use a lupa para consultar.')}else{
        setResolved(true);onSelect({id:String(row.id??''),code:String(row[codeColumn]??normalized),description:String(row[descriptionColumn]??''),row})
      }
    }
    setLoading(false)
  }
  useEffect(()=>()=>{if(timer.current!==null)window.clearTimeout(timer.current)},[])
  async function search(){
    setLoading(true);setMessage('')
    const select='id,'+codeColumn+','+descriptionColumn+(extraColumns?','+extraColumns:'')
    let request=supabase.from(table).select(select).eq('ativo',true).limit(100)
    const term=query.trim()
    if(term){const cols=searchColumns?.length?searchColumns:[codeColumn,descriptionColumn];request=request.or(cols.map(column=>column+'.ilike.%'+term+'%').join(','))}
    const {data,error}=await request
    if(error)setMessage(error.message);else{const normalizedRows=Array.isArray(data)?data.map(toRow<T>).filter((row):row is T=>row!==null):[];setRows(normalizedRows)}
    setLoading(false)
  }
  return <div className="lookup-field">
    <label>{label}</label>
    <div className="lookup-control">
      <input value={value} disabled={disabled} placeholder={placeholder} onChange={event=>{onChange(event.target.value);setResolved(false);if(timer.current!==null)window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>void findByCode(event.target.value),450)}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void findByCode()}}}/>
      <button type="button" disabled={disabled||loading} aria-label={'Consultar '+label} title="Consulta avançada" onClick={()=>{setOpen(true);void search()}}><Search size={17}/></button>
      {resolved&&<Check className="lookup-ok" size={17}/>}</div>
    {message&&<small className="lookup-message">{message}</small>}
    {open&&<div className="lookup-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <section className="lookup-dialog" role="dialog" aria-modal="true" aria-label={title||'Consultar '+label}>
        <header><div><span>CONSULTA</span><h2>{title||'Consultar '+label}</h2></div><button type="button" aria-label="Fechar consulta" onClick={()=>setOpen(false)}><X size={19}/></button></header>
        <div className="lookup-search"><Search size={17}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void search()}} placeholder="Código, descrição ou outro filtro..."/><button type="button" onClick={()=>void search()} disabled={loading}>{loading?<Loader2 className="spin" size={17}/>:'Pesquisar'}</button></div>
        {message&&<div className="lookup-error" role="alert">{message}</div>}
        <div className="lookup-table-wrap"><table><thead><tr>{columns.map(column=><th key={column.key}>{column.label}</th>)}<th>Ação</th></tr></thead><tbody>
          {rows.map((row,index)=><tr key={String(row.id??index)}>{columns.map(column=><td key={column.key}>{String(row[column.key]??'—')}</td>)}<td><button type="button" className="lookup-select" onClick={()=>{onSelect({id:String(row.id??''),code:String(row[codeColumn]??''),description:String(row[descriptionColumn]??''),row});setOpen(false);setResolved(true)}}>Selecionar</button></td></tr>)}
          {!loading&&rows.length===0&&<tr><td colSpan={columns.length+1} className="lookup-empty">Nenhum registro encontrado.</td></tr>}
        </tbody></table></div>
      </section>
    </div>}
  </div>
}