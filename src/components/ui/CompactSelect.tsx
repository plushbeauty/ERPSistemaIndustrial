import { useState, type ChangeEvent, type FocusEvent, type SelectHTMLAttributes } from 'react'

export interface CompactSelectOption { value: string; label: string }
export interface CompactSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  label?: string
  value: string
  onChange: (value: string) => void
  options: CompactSelectOption[]
  required?: boolean
  wide?: boolean
}

export default function CompactSelect({ label, value, onChange, options, required = false, wide = false, className = '', onBlur, ...props }: CompactSelectProps) {
  const [touched, setTouched] = useState(false)
  const invalid = required && touched && value.trim() === ''
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value)
  const handleBlur = (event: FocusEvent<HTMLSelectElement>) => {
    setTouched(true)
    onBlur?.(event)
  }
  return <label className={`grid min-w-0 gap-[2px] ${wide ? 'col-span-2' : ''} ${className}`}>
    {label ? <span className="mb-[2px] text-[9px] font-medium uppercase leading-[10px] tracking-wider text-slate-600">{label}{required ? ' *' : ''}</span> : null}
    <select {...props} value={value} onChange={handleChange} onBlur={handleBlur} aria-invalid={invalid || undefined} className={`h-[30px] min-h-[30px] w-full rounded-[2px] border px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-0 disabled:bg-slate-100 disabled:text-slate-500 ${invalid ? 'border-red-500 bg-red-50/50' : 'border-slate-300 bg-white'}`}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
}
