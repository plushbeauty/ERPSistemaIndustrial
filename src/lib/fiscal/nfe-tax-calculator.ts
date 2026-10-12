/**
 * Calculadora aritmética para valores da NF-e.
 *
 * Este módulo não determina incidência, base legal, CST/CSOSN, CFOP,
 * alíquotas, partilha, ICMS-ST, IPI ou regras de arredondamento específicas
 * de um regime. Os valores tributários são calculados apenas quando a regra
 * aplicável foi definida por outra camada e fornecida explicitamente.
 *
 * Entradas decimais aceitam "1234.56" ou, sem ambiguidade, "1.234,56".
 * Não usa Number para operações monetárias; usa centavos inteiros (BigInt).
 */

import type { NFeItem, NFeTotals } from './nfe-types';

export interface DecimalResult {
  value: string | null;
  error: string | null;
}

export interface NFeItemAmountInput {
  quantity: string;
  unitPrice: string;
  discountAmount?: string;
  freightAmount?: string;
  insuranceAmount?: string;
  otherExpensesAmount?: string;
}

export interface NFeItemAmountResult {
  quantity: string;
  unitPrice: string;
  grossAmount: string;
  discountAmount: string;
  freightAmount: string;
  insuranceAmount: string;
  otherExpensesAmount: string;
  totalAmount: string;
}

export interface NFeArithmeticTotalsInput {
  items: ReadonlyArray<NFeItemAmountResult>;
  icmsBase?: string;
  icmsAmount?: string;
  icmsStBase?: string;
  icmsStAmount?: string;
  ipiAmount?: string;
  pisAmount?: string;
  cofinsAmount?: string;
  approximateTaxAmount?: string;
}

export interface NFeArithmeticResult<T> {
  value: T | null;
  errors: ReadonlyArray<string>;
}

const DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const BR_DECIMAL_PATTERN = /^([+-]?)(\d{1,3}(?:\.\d{3})+|\d+),(\d+)$/;
const MAX_DECIMAL_DIGITS = 18;
const MONEY_SCALE = 2;

function pow10(scale: number): bigint {
  return 10n ** BigInt(scale);
}

function parseDecimal(value: string, scale: number): bigint | null {
  const normalized = value.trim();
  if (!normalized || normalized.length > 80) return null;

  const br = BR_DECIMAL_PATTERN.exec(normalized);
  const match = br
    ? [br[0], br[1], br[2].replace(/\./g, ''), br[3]]
    : DECIMAL_PATTERN.exec(normalized);
  if (!match) return null;

  const sign = match[1] === '-' ? -1n : 1n;
  const integerPart = match[2];
  const fractionPart = match[3] ?? '';
  if (fractionPart.length > MAX_DECIMAL_DIGITS || integerPart.length > MAX_DECIMAL_DIGITS) {
    return null;
  }

  const kept = fractionPart.slice(0, scale).padEnd(scale, '0');
  const discarded = fractionPart.slice(scale);
  let absolute = BigInt(integerPart) * pow10(scale) + BigInt(kept || '0');

  // Round half away from zero at the requested precision.
  if (discarded.length > 0 && discarded[0] >= '5') absolute += 1n;
  return absolute * sign;
}

function formatScaled(value: bigint, scale: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = pow10(scale);
  const integer = absolute / divisor;
  const fraction = (absolute % divisor).toString().padStart(scale, '0');
  return `${negative ? '-' : ''}${integer.toString()}${scale ? `.${fraction}` : ''}`;
}

function requireDecimal(
  value: string | undefined,
  field: string,
  scale = MONEY_SCALE,
): { value: bigint | null; error: string | null } {
  if (value === undefined) return { value: 0n, error: null };
  const parsed = parseDecimal(value, scale);
  return parsed === null
    ? { value: null, error: `${field}: valor decimal inválido (${value}).` }
    : { value: parsed, error: null };
}

/** Normaliza um decimal para duas casas, sem float de ponto flutuante. */
export function normalizeNFeMoney(value: string): DecimalResult {
  const parsed = parseDecimal(value, MONEY_SCALE);
  return parsed === null
    ? { value: null, error: 'Valor monetário inválido.' }
    : { value: formatScaled(parsed, MONEY_SCALE), error: null };
}

/** Multiplica quantidade (até 6 casas) por preço unitário (até 10 casas) e arredonda para centavos. */
export function calculateNFeGrossAmount(
  quantity: string,
  unitPrice: string,
): DecimalResult {
  const parsedQuantity = parseDecimal(quantity, 6);
  const parsedPrice = parseDecimal(unitPrice, 10);
  if (parsedQuantity === null || parsedPrice === null) {
    return { value: null, error: 'Quantidade ou preço unitário inválido.' };
  }
  if (parsedQuantity < 0n || parsedPrice < 0n) {
    return { value: null, error: 'Quantidade e preço unitário não podem ser negativos.' };
  }

  const product = parsedQuantity * parsedPrice;
  const divisor = pow10(14);
  const roundedCents = (product + divisor / 2n) / divisor;
  return { value: formatScaled(roundedCents, MONEY_SCALE), error: null };
}

/**
 * Calcula valores de linha. Desconto/frete/seguro/outras despesas são valores
 * já informados na linha; nenhuma alocação automática é presumida.
 * totalAmount = bruto - desconto + frete + seguro + outras despesas.
 */
export function calculateNFeItemAmounts(
  input: NFeItemAmountInput,
): NFeArithmeticResult<NFeItemAmountResult> {
  const errors: string[] = [];
  const gross = calculateNFeGrossAmount(input.quantity, input.unitPrice);
  if (!gross.value) errors.push(gross.error ?? 'Falha no cálculo do bruto.');

  const discount = requireDecimal(input.discountAmount, 'Desconto');
  const freight = requireDecimal(input.freightAmount, 'Frete');
  const insurance = requireDecimal(input.insuranceAmount, 'Seguro');
  const other = requireDecimal(input.otherExpensesAmount, 'Outras despesas');

  for (const result of [discount, freight, insurance, other]) {
    if (result.error) errors.push(result.error);
    if (result.value !== null && result.value < 0n) {
      errors.push('Desconto, frete, seguro e outras despesas não podem ser negativos.');
    }
  }
  if (errors.length || gross.value === null) return { value: null, errors };

  const grossCents = parseDecimal(gross.value, MONEY_SCALE);
  if (grossCents === null || discount.value === null || freight.value === null ||
      insurance.value === null || other.value === null) {
    return { value: null, errors: ['Não foi possível normalizar os valores da linha.'] };
  }

  if (discount.value > grossCents) {
    return { value: null, errors: ['O desconto da linha não pode exceder o valor bruto.'] };
  }

  const total = grossCents - discount.value + freight.value + insurance.value + other.value;
  return {
    value: {
      quantity: input.quantity.trim(),
      unitPrice: normalizeNFeMoney(input.unitPrice).value ?? input.unitPrice.trim(),
      grossAmount: gross.value,
      discountAmount: formatScaled(discount.value, MONEY_SCALE),
      freightAmount: formatScaled(freight.value, MONEY_SCALE),
      insuranceAmount: formatScaled(insurance.value, MONEY_SCALE),
      otherExpensesAmount: formatScaled(other.value, MONEY_SCALE),
      totalAmount: formatScaled(total, MONEY_SCALE),
    },
    errors: [],
  };
}

/**
 * Soma linhas e tributos explicitamente fornecidos. Não calcula tributos nem
 * infere se devem compor o total fiscal; invoiceAmount é subtotal aritmético
 * das linhas mais tributos explicitamente incluídos pelo chamador.
 */
export function calculateNFeArithmeticTotals(
  input: NFeArithmeticTotalsInput,
): NFeArithmeticResult<NFeTotals> {
  const errors: string[] = [];
  if (input.items.length === 0) errors.push('A NF-e precisa ter ao menos um item.');

  const sumField = (
    field: keyof Pick<NFeItemAmountResult,
      'grossAmount' | 'discountAmount' | 'freightAmount' | 'insuranceAmount' |
      'otherExpensesAmount' | 'totalAmount'>,
  ): bigint => {
    let sum = 0n;
    input.items.forEach((item, index) => {
      const parsed = parseDecimal(item[field], MONEY_SCALE);
      if (parsed === null) errors.push(`Item ${index + 1}: ${field} inválido.`);
      else sum += parsed;
    });
    return sum;
  };

  const products = sumField('grossAmount');
  const discounts = sumField('discountAmount');
  const freight = sumField('freightAmount');
  const insurance = sumField('insuranceAmount');
  const otherExpenses = sumField('otherExpensesAmount');
  const lineTotal = sumField('totalAmount');

  const tax = (value: string | undefined, field: string): bigint => {
    const parsed = requireDecimal(value, field);
    if (parsed.error) errors.push(parsed.error);
    if (parsed.value !== null && parsed.value < 0n) errors.push(`${field} não pode ser negativo.`);
    return parsed.value ?? 0n;
  };

  const icmsBase = tax(input.icmsBase, 'Base ICMS');
  const icmsAmount = tax(input.icmsAmount, 'Valor ICMS');
  const icmsStBase = tax(input.icmsStBase, 'Base ICMS-ST');
  const icmsStAmount = tax(input.icmsStAmount, 'Valor ICMS-ST');
  const ipiAmount = tax(input.ipiAmount, 'Valor IPI');
  const pisAmount = tax(input.pisAmount, 'Valor PIS');
  const cofinsAmount = tax(input.cofinsAmount, 'Valor COFINS');
  const approximateTax = input.approximateTaxAmount === undefined
    ? undefined
    : tax(input.approximateTaxAmount, 'Tributos aproximados');

  if (errors.length) return { value: null, errors };

  // The caller decides which taxes are included in the legally calculated
  // invoice total; only explicitly requested components are added here.
  const invoiceAmount = lineTotal + ipiAmount + icmsStAmount;
  return {
    value: {
      productsAmount: formatScaled(products, MONEY_SCALE),
      discountAmount: formatScaled(discounts, MONEY_SCALE),
      freightAmount: formatScaled(freight, MONEY_SCALE),
      insuranceAmount: formatScaled(insurance, MONEY_SCALE),
      otherExpensesAmount: formatScaled(otherExpenses, MONEY_SCALE),
      icmsBase: formatScaled(icmsBase, MONEY_SCALE),
      icmsAmount: formatScaled(icmsAmount, MONEY_SCALE),
      icmsStBase: formatScaled(icmsStBase, MONEY_SCALE),
      icmsStAmount: formatScaled(icmsStAmount, MONEY_SCALE),
      ipiAmount: formatScaled(ipiAmount, MONEY_SCALE),
      pisAmount: formatScaled(pisAmount, MONEY_SCALE),
      cofinsAmount: formatScaled(cofinsAmount, MONEY_SCALE),
      invoiceAmount: formatScaled(invoiceAmount, MONEY_SCALE),
      ...(approximateTax === undefined
        ? {}
        : { approximateTaxAmount: formatScaled(approximateTax, MONEY_SCALE) }),
    },
    errors: [],
  };
}

/** Adapta uma linha tipada do domínio sem modificar os tributos informados. */
export function calculateNFeItem(item: NFeItem): NFeArithmeticResult<NFeItemAmountResult> {
  return calculateNFeItemAmounts({
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount,
    freightAmount: item.freightAmount,
    insuranceAmount: item.insuranceAmount,
    otherExpensesAmount: item.otherExpensesAmount,
  });
}
