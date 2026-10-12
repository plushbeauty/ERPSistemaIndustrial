/**
 * Validação pura de dados fiscais para NF-e (modelo 55).
 *
 * Este módulo não emite nem autoriza documentos fiscais. Ele valida dados
 * locais antes de persistir/transmitir; a autorização depende do retorno real
 * do provedor fiscal/SEFAZ e da validação do XML assinado.
 */

export type ValidationSeverity = 'error' | 'warning';

export type ValidationIssue = {
  field: string;
  code: string;
  message: string;
  severity: ValidationSeverity;
};

export type NFePartyForValidation = {
  document: string;
  legalName: string;
  stateRegistration?: string | null;
  email?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  cityCode?: string | null;
  city?: string | null;
  state?: string | null;
};

export type NFeItemForValidation = {
  code: string;
  description: string;
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount?: number | null;
  origin?: string | null;
  icmsCstCsosn?: string | null;
  icmsRate?: number | null;
  ipiRate?: number | null;
  pisRate?: number | null;
  cofinsRate?: number | null;
};

export type NFeDraftForValidation = {
  number?: string | null;
  series?: string | null;
  issueDate?: string | null;
  exitDate?: string | null;
  operationNature: string;
  direction: 'entrada' | 'saida' | '';
  environment: 'homologacao' | 'producao' | '';
  issuer: NFePartyForValidation;
  recipient: NFePartyForValidation;
  items: NFeItemForValidation[];
  freight?: number | null;
  discount?: number | null;
  otherExpenses?: number | null;
  total?: number | null;
};

const DIGITS_ONLY = /\D/g;
const UF_CODES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT',
  'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO',
  'RR', 'SC', 'SP', 'SE', 'TO',
]);

function normalizedText(value: unknown): string {
  return String(value ?? '').trim();
}

function onlyDigits(value: unknown): string {
  return normalizedText(value).replace(DIGITS_ONLY, '');
}

function isBlank(value: unknown): boolean {
  return normalizedText(value).length === 0;
}

function addIssue(
  issues: ValidationIssue[],
  field: string,
  code: string,
  message: string,
  severity: ValidationSeverity = 'error',
): void {
  issues.push({ field, code, message, severity });
}

/**
 * Valida CPF pelos dois dígitos verificadores.
 */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number): number => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) &&
    calculateDigit(10) === Number(cpf[10]);
}

/**
 * Valida CNPJ numérico e o formato alfanumérico adotado para novos CNPJs.
 * Para o cálculo alfanumérico, cada caractere é convertido por charCode - 48.
 */
export function isValidCNPJ(value: string): boolean {
  const cnpj = normalizedText(value).toUpperCase().replace(/[./\-\s]/g, '');
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calculateDigit = (base: string): number => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let index = 0; index < base.length; index += 1) {
      sum += (base.charCodeAt(index) - 48) * weights[index];
    }

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(cnpj.slice(0, 12)) === Number(cnpj[12]) &&
    calculateDigit(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

/**
 * Aceita CPF ou CNPJ e remove apenas a formatação usual.
 */
export function isValidBrazilianTaxId(value: string): boolean {
  const compact = normalizedText(value).toUpperCase().replace(/[./\-\s]/g, '');
  if (/^\d{11}$/.test(compact)) return isValidCPF(compact);
  if (/^[A-Z0-9]{12}\d{2}$/.test(compact)) return isValidCNPJ(compact);
  return false;
}

/**
 * Converte entrada monetária brasileira ou numérica para número finito.
 * Exemplos: "1.234,56", "1234.56", 1234.56.
 * Retorna null para texto vazio ou valor não numérico.
 */
export function parseBrazilianNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = normalizedText(value);
  if (!raw) return null;

  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;

  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Arredonda valores para centavos evitando resíduos binários comuns.
 */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o total bruto, desconto e líquido dos itens usando centavos.
 */
export function calculateNFeItemTotals(items: readonly NFeItemForValidation[]): {
  grossTotal: number;
  discountTotal: number;
  productsTotal: number;
} {
  let grossCents = 0;
  let discountCents = 0;

  for (const item of items) {
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
    const gross = roundCurrency(Math.max(0, quantity) * Math.max(0, unitPrice));
    const discount = roundCurrency(Math.max(0, item.discount ?? 0));
    grossCents += Math.round(gross * 100);
    discountCents += Math.round(discount * 100);
  }

  const grossTotal = grossCents / 100;
  const discountTotal = discountCents / 100;
  return {
    grossTotal,
    discountTotal,
    productsTotal: Math.max(0, grossTotal - discountTotal),
  };
}

function validateParty(
  party: NFePartyForValidation,
  prefix: 'issuer' | 'recipient',
  issues: ValidationIssue[],
): void {
  if (isBlank(party.document) || !isValidBrazilianTaxId(party.document)) {
    addIssue(issues, `${prefix}.document`, 'INVALID_TAX_ID', 'Informe um CPF/CNPJ válido.');
  }

  if (isBlank(party.legalName)) {
    addIssue(issues, `${prefix}.legalName`, 'REQUIRED_NAME', 'Informe a razão social/nome.');
  }

  const state = normalizedText(party.state).toUpperCase();
  if (!isBlank(party.state) && !UF_CODES.has(state)) {
    addIssue(issues, `${prefix}.state`, 'INVALID_UF', 'Informe uma UF brasileira válida.');
  }

  if (!isBlank(party.email) &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedText(party.email))) {
    addIssue(issues, `${prefix}.email`, 'INVALID_EMAIL', 'Informe um e-mail válido.');
  }

  if (!isBlank(party.postalCode) && !/^\d{8}$/.test(onlyDigits(party.postalCode))) {
    addIssue(issues, `${prefix}.postalCode`, 'INVALID_POSTAL_CODE', 'O CEP deve conter 8 dígitos.');
  }
}

/**
 * Valida os campos essenciais de um rascunho antes de salvar ou solicitar
 * transmissão. As regras tributárias legais finais devem ser verificadas
 * pelo motor fiscal, pelo schema/XSD e pelo ambiente autorizador aplicável.
 */
export function validateNFeDraft(draft: NFeDraftForValidation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (isBlank(draft.operationNature)) {
    addIssue(issues, 'operationNature', 'REQUIRED_OPERATION', 'Informe a natureza da operação.');
  }

  if (draft.direction !== 'entrada' && draft.direction !== 'saida') {
    addIssue(issues, 'direction', 'REQUIRED_DIRECTION', 'Selecione entrada ou saída.');
  }

  if (draft.environment !== 'homologacao' && draft.environment !== 'producao') {
    addIssue(issues, 'environment', 'REQUIRED_ENVIRONMENT', 'Selecione o ambiente fiscal.');
  }

  if (draft.issueDate && Number.isNaN(Date.parse(draft.issueDate))) {
    addIssue(issues, 'issueDate', 'INVALID_ISSUE_DATE', 'A data de emissão é inválida.');
  }

  if (draft.exitDate && Number.isNaN(Date.parse(draft.exitDate))) {
    addIssue(issues, 'exitDate', 'INVALID_EXIT_DATE', 'A data de saída/entrada é inválida.');
  }

  validateParty(draft.issuer, 'issuer', issues);
  validateParty(draft.recipient, 'recipient', issues);

  if (!Array.isArray(draft.items) || draft.items.length === 0) {
    addIssue(issues, 'items', 'EMPTY_ITEMS', 'Adicione pelo menos um item à NF-e.');
  } else {
    draft.items.forEach((item, index) => {
      const prefix = `items.${index}`;

      if (isBlank(item.code)) {
        addIssue(issues, `${prefix}.code`, 'REQUIRED_ITEM_CODE', 'Informe o código do produto.');
      }
      if (isBlank(item.description)) {
        addIssue(issues, `${prefix}.description`, 'REQUIRED_ITEM_DESCRIPTION', 'Informe a descrição do produto.');
      }
      if (!/^\d{8}$/.test(onlyDigits(item.ncm))) {
        addIssue(issues, `${prefix}.ncm`, 'INVALID_NCM', 'O NCM deve conter 8 dígitos.');
      }
      if (!/^\d{4}$/.test(onlyDigits(item.cfop))) {
        addIssue(issues, `${prefix}.cfop`, 'INVALID_CFOP', 'O CFOP deve conter 4 dígitos.');
      }
      if (isBlank(item.unit)) {
        addIssue(issues, `${prefix}.unit`, 'REQUIRED_UNIT', 'Informe a unidade comercial.');
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        addIssue(issues, `${prefix}.quantity`, 'INVALID_QUANTITY', 'A quantidade deve ser maior que zero.');
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        addIssue(issues, `${prefix}.unitPrice`, 'INVALID_UNIT_PRICE', 'O valor unitário não pode ser negativo.');
      }

      const discount = item.discount ?? 0;
      const gross = roundCurrency(Math.max(0, item.quantity) * Math.max(0, item.unitPrice));
      if (!Number.isFinite(discount) || discount < 0 || discount > gross) {
        addIssue(issues, `${prefix}.discount`, 'INVALID_ITEM_DISCOUNT', 'O desconto deve estar entre zero e o total bruto do item.');
      }

      const rates: Array<[keyof NFeItemForValidation, number | null | undefined]> = [
        ['icmsRate', item.icmsRate],
        ['ipiRate', item.ipiRate],
        ['pisRate', item.pisRate],
        ['cofinsRate', item.cofinsRate],
      ];

      for (const [field, rate] of rates) {
        if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
          addIssue(issues, `${prefix}.${String(field)}`, 'INVALID_TAX_RATE', 'A alíquota deve estar entre 0 e 100%.');
        }
      }
    });
  }

  const monetaryFields: Array<[keyof NFeDraftForValidation, number | null | undefined]> = [
    ['freight', draft.freight],
    ['discount', draft.discount],
    ['otherExpenses', draft.otherExpenses],
    ['total', draft.total],
  ];

  for (const [field, value] of monetaryFields) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      addIssue(issues, String(field), 'INVALID_MONETARY_VALUE', 'O valor deve ser numérico e não negativo.');
    }
  }

  const calculated = calculateNFeItemTotals(draft.items ?? []);
  if (draft.discount != null && draft.discount > calculated.productsTotal) {
    addIssue(issues, 'discount', 'DISCOUNT_EXCEEDS_PRODUCTS', 'O desconto total não pode superar o total líquido dos itens.');
  }

  if (draft.total != null && draft.total > 0 && draft.items.length > 0) {
    const expectedTotal = roundCurrency(
      calculated.productsTotal +
      Math.max(0, draft.freight ?? 0) +
      Math.max(0, draft.otherExpenses ?? 0) -
      Math.max(0, draft.discount ?? 0),
    );

    if (Math.abs(roundCurrency(draft.total) - expectedTotal) > 0.02) {
      addIssue(
        issues,
        'total',
        'TOTAL_MISMATCH',
        'O total informado difere do total calculado dos itens, frete, despesas e descontos.',
        'warning',
      );
    }
  }

  return issues;
}

export function hasBlockingNFeIssues(issues: readonly ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}
