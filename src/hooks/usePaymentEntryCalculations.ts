import { useMemo } from 'react'

export type PaymentAllocationLine = {
  id: string
  base: number
  rateio: number
  liquido: number
}

type Params = {
  lines: ReadonlyArray<{ id: string; base: number }>
  frete?: number
  desconto?: number
  outrasDespesas?: number
}

export function usePaymentEntryCalculations({
  lines,
  frete = 0,
  desconto = 0,
  outrasDespesas = 0,
}: Params) {
  return useMemo(() => {
    const baseTotal = lines.reduce((sum, line) => sum + Math.max(0, line.base), 0)
    const adjustment =
      Math.max(0, frete) +
      Math.max(0, outrasDespesas) -
      Math.max(0, desconto)

    const allocated = lines.map((line) => {
      const base = Math.max(0, line.base)
      const rateio = baseTotal > 0 ? (base / baseTotal) * adjustment : 0
      return { id: line.id, base, rateio, liquido: Math.max(0, base + rateio) }
    })

    return {
      baseTotal,
      adjustment,
      totalLiquido: allocated.reduce((sum, line) => sum + line.liquido, 0),
      lines: allocated,
    }
  }, [lines, frete, desconto, outrasDespesas])
}
