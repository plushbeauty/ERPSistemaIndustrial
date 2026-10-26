import assert from 'node:assert/strict'
import test from 'node:test'
import { localDateIso, makeInstallments, matchesDueFilter } from '../lib/financeiroTitulos.mjs'

test('uses the browser local calendar date instead of UTC date', () => {
  const date = new Date(2026, 9, 26, 23, 30)
  assert.equal(localDateIso(date), '2026-10-26')
})

test('splits installments to the exact cent and clamps month-end dates', () => {
  const installments = makeInstallments(100, 3, '2026-01-31')
  assert.deepEqual(installments.map(item => item.valor), [33.33, 33.33, 33.34])
  assert.deepEqual(installments.map(item => item.vencimento), ['2026-01-31', '2026-02-28', '2026-03-31'])
})

test('rejects installment counts that would create zero-value installments', () => {
  assert.throws(() => makeInstallments(0.01, 2, '2026-10-26'), /valor positivo por parcela/i)
})

test('filters only open installments into the due-date window', () => {
  const installments = [
    { vencimento: '2026-10-25', saldo: 10, status: 'ABERTO' },
    { vencimento: '2026-10-26', saldo: 0, status: 'LIQUIDADO' },
    { vencimento: '2026-11-02', saldo: 5, status: 'PARCIAL' },
  ]
  assert.equal(matchesDueFilter(installments, 'VENCIDO', '2026-10-26'), true)
  assert.equal(matchesDueFilter(installments.slice(1), 'HOJE', '2026-10-26'), false)
  assert.equal(matchesDueFilter(installments.slice(2), 'PROXIMOS_7', '2026-10-26'), true)
})
