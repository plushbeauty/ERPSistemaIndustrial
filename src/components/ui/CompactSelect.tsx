import type { ChangeEvent, SelectHTMLAttributes } from 'react'

export interface CompactSelectOption { value: string; label: string }
export interface CompactSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  label?: string
  value: string
  onChange: (value: string) => void
  options: CompactSelectOption[]
  required?: boolean
  wide?: boolean
}

export default function CompactSelect({ label, value, onChange, options, required = false, wide = false, className = '', ...props }: CompactSelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value)
  return <label className={`grid min-w-0 gap-[2px] ${wide ? 'col-span-2' : ''} ${className}`}>
    {label ? <span className="text-[9px] font-medium uppercase leading-[10px] text-slate-600">{label}{required ? ' *' : ''}</span> : null}
    <select {...props} value={value} onChange={handleChange} className="h-[30px] min-h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-0 disabled:bg-slate-100 disabled:text-slate-500">
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
}
