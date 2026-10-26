import FinanceiroTitulos from './FinanceiroTitulos'

type FinanceKind = 'PAGAR' | 'RECEBER'

export default function FinancasContasPagar({ kind = 'PAGAR' }: { kind?: FinanceKind }) {
  return <FinanceiroTitulos kind={kind} />
}
