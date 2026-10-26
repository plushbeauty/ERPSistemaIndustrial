export function localDateIso(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function addMonthsClamped(isoDate, months) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match || !Number.isInteger(months)) throw new RangeError('Data e intervalo de meses inválidos.')
  const [, rawYear, rawMonth, rawDay] = match
  const year = Number(rawYear)
  const month = Number(rawMonth)
  const day = Number(rawDay)
  const source = new Date(Date.UTC(year, month - 1, day))
  if (source.getUTCFullYear() !== year || source.getUTCMonth() !== month - 1 || source.getUTCDate() !== day) {
    throw new RangeError('Data de vencimento inválida.')
  }
  const firstOfTarget = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate()
  return [
    firstOfTarget.getUTCFullYear(),
    String(firstOfTarget.getUTCMonth() + 1).padStart(2, '0'),
    String(Math.min(day, lastDay)).padStart(2, '0'),
  ].join('-')
}

export function makeInstallments(total, count, firstDue) {
  const cents = Math.round(Number(total) * 100)
  if (!Number.isFinite(total) || cents <= 0 || !Number.isInteger(count) || count < 1 || count > 120 || count > cents) {
    throw new RangeError('Informe valor positivo por parcela e parcelamento entre 1 e 120.')
  }
  addMonthsClamped(firstDue, 0)
  const base = Math.floor(cents / count)
  return Array.from({ length: count }, (_, index) => ({
    numero: index + 1,
    vencimento: addMonthsClamped(firstDue, index),
    valor: (index === count - 1 ? cents - base * (count - 1) : base) / 100,
  }))
}

export function matchesDueFilter(installments, filter, today) {
  if (filter === 'TODOS') return true
  const endDate = addMonthsClamped(today, 0)
  const [year, month, day] = endDate.split('-').map(Number)
  const end = new Date(Date.UTC(year, month - 1, day + 7))
  const lastDate = [end.getUTCFullYear(), String(end.getUTCMonth() + 1).padStart(2, '0'), String(end.getUTCDate()).padStart(2, '0')].join('-')
  return installments.some(installment => {
    if (Number(installment.saldo) <= 0 || installment.status === 'CANCELADO') return false
    if (filter === 'VENCIDO') return installment.vencimento < today
    if (filter === 'HOJE') return installment.vencimento === today
    if (filter === 'PROXIMOS_7') return installment.vencimento >= today && installment.vencimento <= lastDate
    if (filter === 'FUTURO') return installment.vencimento > lastDate
    return false
  })
}
