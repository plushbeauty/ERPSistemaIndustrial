import { useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes } from 'react'

export interface CompactInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  wide?: boolean
}

export default function CompactInput({ label, value, onChange, required = false, wide = false, className = '', onBlur, placeholder, ...props }: CompactInputProps) {
  const [touched, setTouched] = useState(false)
  const invalid = required && touched && value.trim() === ''
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value)
  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setTouched(true)
    onBlur?.(event)
  }
  return <label className={`grid min-w-0 gap-[2px] ${wide ? 'col-span-2' : ''} ${className}`}>
    {label ? <span className="mb-[2px] text-[9px] font-medium uppercase leading-[10px] tracking-wider text-slate-600">{label}{required ? ' *' : ''}</span> : null}
    <input {...props} value={value} onChange={handleChange} onBlur={handleBlur} placeholder={invalid ? 'Preencher...' : placeholder} aria-invalid={invalid || undefined} className={`h-[30px] min-h-[30px] w-full rounded-[2px] border px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-0 disabled:bg-slate-100 disabled:text-slate-500 ${invalid ? 'border-red-500 bg-red-50/50 placeholder:text-red-400' : 'border-slate-300 bg-white'}`} />
  </label>
}
