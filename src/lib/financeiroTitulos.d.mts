export type FinanceInstallment = { vencimento: string; saldo: number; status: string }
export type DueFilter = 'TODOS' | 'VENCIDO' | 'HOJE' | 'PROXIMOS_7' | 'FUTURO'
export type GeneratedInstallment = { numero: number; vencimento: string; valor: number }

export function localDateIso(date?: Date): string
export function addMonthsClamped(isoDate: string, months: number): string
export function makeInstallments(total: number, count: number, firstDue: string): GeneratedInstallment[]
export function matchesDueFilter(installments: FinanceInstallment[], filter: DueFilter, today: string): boolean
