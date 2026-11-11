import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'slate'
const toneClass: Record<Tone,string> = {
  blue:'border-[#B9DDEB] bg-[#EDF7FB] text-[#176487]',
  green:'border-[#B8E0CE] bg-[#EFF9F3] text-[#287B59]',
  amber:'border-[#F0D6A7] bg-[#FFF8EA] text-[#94611B]',
  red:'border-[#EBC0C3] bg-[#FFF2F2] text-[#A63C3C]',
  slate:'border-[#D3E3EA] bg-[#F5F9FA] text-[#547080]',
}
export function Panel({title,subtitle,actions,children,className='',...props}:HTMLAttributes<HTMLElement>&{title?:string;subtitle?:string;actions?:ReactNode;children:ReactNode}){
 return <section className={`overflow-hidden rounded-xl border border-[#D3E3EA] bg-white shadow-sm ${className}`} {...props}>
  {(title||subtitle||actions)&&<header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6EEF2] px-3 py-2.5"><div>{title&&<h2 className="text-xs font-extrabold text-[#123B50]">{title}</h2>}{subtitle&&<p className="mt-0.5 text-[10px] text-[#66808D]">{subtitle}</p>}</div>{actions}</header>}
  <div className="p-3">{children}</div>
 </section>
}
export function Btn({variant='primary',className='',children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost';children:ReactNode}){
 const variantClass=variant==='primary'?'border-[#176487] bg-[#176487] text-white hover:bg-[#125573]':variant==='secondary'?'border-[#D3E3EA] bg-white text-[#315466] hover:bg-[#EDF6F9]':'border-transparent bg-transparent text-[#315466] hover:bg-[#EDF6F9]'
 return <button className={`inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${className}`} {...props}>{children}</button>
}
export function Pill({tone='slate',children,className=''}:{tone?:Tone;children:ReactNode;className?:string}){
 return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${toneClass[tone]} ${className}`}>{children}</span>
}
export function Th({className='',...props}:ThHTMLAttributes<HTMLTableCellElement>){return <th className={`h-10 bg-[#123B50] px-3 text-left text-[9px] font-extrabold uppercase tracking-wide text-white ${className}`} {...props}/>}
export function Td({className='',...props}:TdHTMLAttributes<HTMLTableCellElement>){return <td className={`h-12 border-b border-[#E6EEF2] px-3 text-[11px] text-[#315466] ${className}`} {...props}/>}
