import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import './entity-code-lookup.css'

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
  records: LookupRecord[]
  onChange: (value: string) => void
  onSelect: (record: LookupRecord) => void
  placeholder?: string
  required?: boolean
  helper?: string
  entityType?: string
}

export { EntityCodeLookup }

export default function EntityCodeLookup({label,value,records=[],onChange,onSelect=()=>undefined,placeholder='Digite o código e pressione Enter',required=false,helper}:Props){
  const [open,setOpen]=useState(false)
  const [codigo,setCodigo]=useState('')
  const [nome,setNome]=useState('')
  const [cliente,setCliente]=useState('')
  const [dimensoes,setDimensoes]=useState('')
  const [resolved,setResolved]=useState<LookupRecord|null>(null)

  const resolve=(raw=value)=>{
    const code=raw.trim().toLowerCase()
    if(!code)return
    const hit=records.find(r=>String(r.codigo??'').trim().toLowerCase()===code)
    if(hit){setResolved(hit);onChange(hit.id);onSelect(hit)}
    else {setResolved(null);onChange(raw)}
  }

  const filtered=useMemo(()=>{
    const c=codigo.trim().toLowerCase(),n=nome.trim().toLowerCase(),cc=cliente.trim().toLowerCase(),d=dimensoes.trim().toLowerCase()
    return records.filter(r=>{
      const text=[r.codigo,r.nome,r.documento,r.codigo_cliente,r.dimensoes,r.canal,r.molde].map(x=>String(x??'').toLowerCase()).join(' ')
      return (!c||String(r.codigo??'').toLowerCase().includes(c)) && (!n||String(r.nome??'').toLowerCase().includes(n)) && (!cc||String(r.codigo_cliente??'').toLowerCase().includes(cc)) && (!d||text.includes(d))
    }).slice(0,200)
  },[records,codigo,nome,cliente,dimensoes])

  return <div className="code-lookup">
    <label className="code-lookup-label">{label}{required?' *':''}</label>
    <div className="code-lookup-row">
      <input className="code-lookup-input" value={resolved?.codigo??value} required={required} placeholder={placeholder}
        onChange={e=>{setResolved(null);onChange(e.target.value)}} onBlur={()=>resolve()}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();resolve()}}}/>
      <button type="button" className="code-lookup-button" onClick={()=>setOpen(true)} aria-label={'Consultar '+label} title="Abrir consulta"><Search size={18}/></button>
    </div>
    {resolved&&<div className="code-lookup-resolved"><strong>{resolved.codigo}</strong><span>{resolved.nome??'Registro selecionado'}</span></div>}
    {helper&&<small className="code-lookup-helper">{helper}</small>}
    {open&&<div className="code-lookup-overlay" role="dialog" aria-modal="true">
      <section className="code-lookup-modal">
        <header className="code-lookup-modal-head"><div><span>CONSULTA</span><h2>{label}</h2><p>Digite o código diretamente ou use os filtros para localizar o registro.</p></div><button type="button" className="code-lookup-close" onClick={()=>setOpen(false)} aria-label="Fechar"><X size={20}/></button></header>
        <div className="code-lookup-filters">
          <label>Código Interno<input value={codigo} onChange={e=>setCodigo(e.target.value)} autoFocus/></label>
          <label>Descrição<input value={nome} onChange={e=>setNome(e.target.value)}/></label>
          <label>Código do Cliente<input value={cliente} onChange={e=>setCliente(e.target.value)}/></label>
          <label>Dimensões / Canal / Molde<input value={dimensoes} onChange={e=>setDimensoes(e.target.value)}/></label>
        </div>
        <div className="code-lookup-results"><table><thead><tr><th>Código</th><th>Descrição</th><th>Cód. Cliente</th><th>Dimensões / Canal / Molde</th><th>Estoque</th></tr></thead>
          <tbody>{filtered.map(r=><tr key={r.id} tabIndex={0} onDoubleClick={()=>{onChange(r.id);onSelect(r);setResolved(r);setOpen(false)}} onClick={()=>{onChange(r.id);onSelect(r);setResolved(r);setOpen(false)}}>
            <td><strong>{r.codigo??'—'}</strong></td><td>{r.nome??'—'}</td><td>{r.codigo_cliente??'—'}</td><td>{[r.dimensoes,r.canal,r.molde].filter(Boolean).join(' • ')||'—'}</td><td>{r.estoque_atual==null?'—':Number(r.estoque_atual).toLocaleString('pt-BR')}</td>
          </tr>)}{!filtered.length&&<tr><td colSpan={5}>Nenhum registro encontrado.</td></tr>}</tbody></table></div>
      </section>
    </div>}
  </div>
}
