import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

export type ErpStatus = 'production'|'setup'|'idle'|'stop'|'maintenance'|'risk'|'info'|'success'

export function StatusBadge({status,label}:{status:ErpStatus;label:string}){
  return <span className={'ds-badge ds-badge--'+status}><span className="ds-status-dot" aria-hidden="true"/>{label}</span>
}

export function PageHeader({eyebrow,title,description,actions}:{eyebrow?:string;title:string;description?:string;actions?:ReactNode}){
  return <header className="ds-page-header"><div>{eyebrow&&<p className="ds-page-header__eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="ds-page-header__actions">{actions}</div>}</header>
}

export function Button({variant='default',size='default',children,className='',...props}:{variant?:'default'|'primary'|'secondary'|'success'|'danger'|'ghost';size?:'sm'|'default'|'lg';children:ReactNode;className?:string}&ButtonHTMLAttributes<HTMLButtonElement>){
  return <button {...props} className={['ds-btn','ds-btn--'+variant,size!=='default'?'ds-btn--'+size:'',className].filter(Boolean).join(' ')}>{children}</button>
}

export function Field({label,hint,error,children,className=''}:{label:string;hint?:string;error?:string;children:ReactNode;className?:string}){
  return <div className={'ds-field '+className}><label>{label}</label>{children}{hint&&!error&&<span className="ds-field__hint">{hint}</span>}{error&&<span className="ds-field__error">{error}</span>}</div>
}

export function Input(props:InputHTMLAttributes<HTMLInputElement>){return <input {...props} className={['ds-control',props.className].filter(Boolean).join(' ')}/>}
export function Select(props:SelectHTMLAttributes<HTMLSelectElement>){return <select {...props} className={['ds-control',props.className].filter(Boolean).join(' ')}/>}

export function FilterBar({children,onClear,onFilter}:{children:ReactNode;onClear?:()=>void;onFilter?:()=>void}){
  return <div className="ds-toolbar ds-toolbar--sticky"><div className="ds-filter-group">{children}</div>{onFilter&&<Button variant="primary" onClick={onFilter}><SlidersHorizontal size={15}/>Filtrar</Button>}{onClear&&<Button variant="ghost" onClick={onClear}><X size={15}/>Limpar</Button>}</div>
}

export function SearchInput({value,onChange,placeholder='Pesquisar…'}:{value:string;onChange:(value:string)=>void;placeholder?:string}){
  return <label className="ds-filter-group" style={{minWidth:240,flex:'1 1 280px'}}><Search size={16} color="var(--ds-text-3)"/><Input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>
}

export function Surface({children,className='',...props}:{children:ReactNode;className?:string}&HTMLAttributes<HTMLDivElement>){return <section {...props} className={['ds-surface',className].filter(Boolean).join(' ')}>{children}</section>}

export function KPI({label,value,meta,tone}:{label:string;value:ReactNode;meta?:ReactNode;tone?:'success'|'warning'|'danger'}){return <div className={['ds-kpi',tone?'ds-kpi--'+tone:''].filter(Boolean).join(' ')}><span className="ds-kpi__label">{label}</span><strong className="ds-kpi__value">{value}</strong>{meta&&<span className="ds-kpi__meta">{meta}</span>}</div>}

export function KpiStrip({children}:{children:ReactNode}){return <div className="ds-kpi-strip">{children}</div>}

export function EmptyState({title,description,action}:{title:string;description?:string;action?:ReactNode}){return <div className="ds-empty"><div><strong>{title}</strong>{description&&<p>{description}</p>}{action&&<div style={{marginTop:12}}>{action}</div>}</div></div>}

export function LoadingState({label='Carregando dados…'}:{label?:string}){return <div className="ds-loading"><div><div className="ds-skeleton" style={{width:180,height:10,margin:'0 auto 8px'}}/><strong>{label}</strong></div></div>}

export function ErrorState({title='Não foi possível carregar os dados',description,action}:{title?:string;description?:string;action?:ReactNode}){return <div className="ds-error"><div><strong>{title}</strong>{description&&<p>{description}</p>}{action&&<div style={{marginTop:12}}>{action}</div>}</div></div>}
