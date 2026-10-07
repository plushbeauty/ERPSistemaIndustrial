import type { ChangeEvent, InputHTMLAttributes } from 'react'

export interface CompactInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  wide?: boolean
}

export default function CompactInput({ label, value, onChange, required = false, wide = false, className = '', ...props }: CompactInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value)
  return <label className={`grid min-w-0 gap-[2px] ${wide ? 'col-span-2' : ''} ${className}`}>
    {label ? <span className="text-[9px] font-medium uppercase leading-[10px] text-slate-600">{label}{required ? ' *' : ''}</span> : null}
    <input {...props} value={value} onChange={handleChange} className="h-[30px] min-h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-0 disabled:bg-slate-100 disabled:text-slate-500" />
  </label>
}
