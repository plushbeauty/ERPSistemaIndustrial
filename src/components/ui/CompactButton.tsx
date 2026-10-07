import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface CompactButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  tone?: 'default' | 'primary' | 'danger' | 'orange'
}

const tones: Record<NonNullable<CompactButtonProps['tone']>, string> = {
  default: 'border-[#2D8DB8] bg-white text-[#24566B]',
  primary: 'border-[#2D8DB8] bg-[#2D8DB8] text-white',
  danger: 'border-red-300 bg-red-50 text-red-700',
  orange: 'border-orange-600 bg-orange-600 text-white',
}

export default function CompactButton({ children, tone = 'default', className = '', ...props }: CompactButtonProps) {
  return <button {...props} className={`inline-flex h-[30px] min-h-[30px] items-center justify-center gap-1 rounded-[2px] border px-3 text-[10px] font-medium uppercase leading-none transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 ${tones[tone]} ${className}`}>{children}</button>
}
