export type BoletoData = {
  codigoBarras: string
  banco: string
  moeda: string
  vencimento: string | null
  valor: number | null
}

const onlyDigits = (value: string) => value.replace(/\D/g, '')

function mod10(value: string): number {
  let sum = 0
  let weight = 2
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const product = Number(value[index]) * weight
    sum += Math.floor(product / 10) + (product % 10)
    weight = weight === 2 ? 1 : 2
  }
  return (10 - (sum % 10)) % 10
}

function boletoGeneralDigit(barcode: string): number {
  let sum = 0
  let weight = 2
  for (let index = barcode.length - 1; index >= 0; index -= 1) {
    if (index === 4) continue
    sum += Number(barcode[index]) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  const remainder = sum % 11
  const digit = 11 - remainder
  return digit === 0 || digit === 10 || digit === 11 ? 1 : digit
}

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function dueDateFromFactor(factor: number): string | null {
  if (factor === 0) return null
  const base = factor >= 1000 ? new Date(Date.UTC(2022, 4, 29)) : new Date(Date.UTC(1997, 9, 7))
  base.setUTCDate(base.getUTCDate() + factor)
  return formatDate(base)
}

function validateBarcode(barcode: string): void {
  if (!/^\d{44}$/.test(barcode)) {
    throw new Error('O código de barras de boleto bancário deve conter 44 dígitos.')
  }
  if (!/^[0-9]{3}9$/.test(barcode.slice(0, 4))) {
    throw new Error('O código informado não é um boleto bancário registrado.')
  }
  if (Number(barcode[4]) !== boletoGeneralDigit(barcode)) {
    throw new Error('O dígito verificador geral do boleto é inválido.')
  }
}

export function parseBoleto(value: string): BoletoData {
  const digits = onlyDigits(value)
  let barcode: string

  if (digits.length === 47) {
    const first = digits.slice(0, 10)
    const second = digits.slice(10, 21)
    const third = digits.slice(21, 32)
    const generalDigit = digits[32]
    const factorAndAmount = digits.slice(33, 47)

    if (
      mod10(first.slice(0, 9)) !== Number(first[9]) ||
      mod10(second.slice(0, 10)) !== Number(second[10]) ||
      mod10(third.slice(0, 10)) !== Number(third[10])
    ) {
      throw new Error('A linha digitável contém dígito verificador inválido.')
    }

    barcode = `${first.slice(0, 4)}${generalDigit}${factorAndAmount}${first.slice(4, 9)}${second.slice(0, 10)}${third.slice(0, 10)}`
  } else if (digits.length === 44) {
    barcode = digits
  } else {
    throw new Error('Informe uma linha digitável com 47 dígitos ou código de barras com 44 dígitos.')
  }

  validateBarcode(barcode)
  const factor = Number(barcode.slice(5, 9))
  const amountCents = Number(barcode.slice(9, 19))

  return {
    codigoBarras: barcode,
    banco: barcode.slice(0, 3),
    moeda: barcode[3],
    vencimento: dueDateFromFactor(factor),
    valor: amountCents === 0 ? null : amountCents / 100,
  }
}
