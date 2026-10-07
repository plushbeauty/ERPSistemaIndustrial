import type { ReactNode } from 'react'

export default function RequiredField({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1">{children}<span aria-hidden="true" className="text-[10px] font-semibold text-red-600">*</span></span>
}
