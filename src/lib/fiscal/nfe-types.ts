/**
 * Contratos tipados do domínio de NF-e (modelo 55).
 *
 * Este arquivo descreve dados e resultados; não calcula tributos, não assina
 * XML e não afirma autorização fiscal. Valores monetários são strings decimais
 * para evitar perda de precisão no transporte entre UI, banco e provedor.
 */

export type NFeEnvironment = 'homologacao' | 'producao';
export type NFeDirection = 'entrada' | 'saida';
export type NFeLifecycleStatus =
  | 'rascunho'
  | 'validando'
  | 'pendente_transmissao'
  | 'transmitindo'
  | 'autorizada'
  | 'rejeitada'
  | 'denegada'
  | 'cancelamento_pendente'
  | 'cancelada'
  | 'inutilizada'
  | 'contingencia'
  | 'erro';

export type NFeIssueSeverity = 'error' | 'warning' | 'info';

export interface NFeIssue {
  code: string;
  message: string;
  severity: NFeIssueSeverity;
  field?: string;
  itemIndex?: number;
  source?: 'local' | 'schema' | 'provider' | 'sefaz';
}

export interface NFeAddress {
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  cityCode: string;
  cityName: string;
  state: string;
  postalCode: string;
  countryCode?: string;
  countryName?: string;
  phone?: string | null;
}

export interface NFeParty {
  document: string;
  legalName: string;
  tradeName?: string | null;
  stateRegistration?: string | null;
  municipalRegistration?: string | null;
  taxRegime?: string | null;
  email?: string | null;
  address: NFeAddress;
}

export interface NFeProductReference {
  id?: string;
  code: string;
  description: string;
  ncm: string;
  cest?: string | null;
  gtin?: string | null;
  unit: string;
  origin: string;
}

export interface NFeItemTaxes {
  icmsCstCsosn?: string | null;
  icmsRate?: string | null;
  icmsBase?: string | null;
  icmsAmount?: string | null;
  ipiCst?: string | null;
  ipiRate?: string | null;
  ipiAmount?: string | null;
  pisCst?: string | null;
  pisRate?: string | null;
  pisAmount?: string | null;
  cofinsCst?: string | null;
  cofinsRate?: string | null;
  cofinsAmount?: string | null;
  additionalTaxes?: ReadonlyArray<NFeAdditionalTax>;
}

export interface NFeAdditionalTax {
  code: string;
  base: string;
  rate: string;
  amount: string;
  description?: string;
}

export interface NFeItem {
  lineNumber: number;
  product: NFeProductReference;
  cfop: string;
  quantity: string;
  unitPrice: string;
  grossAmount: string;
  discountAmount: string;
  freightAmount?: string;
  insuranceAmount?: string;
  otherExpensesAmount?: string;
  totalAmount: string;
  taxes: NFeItemTaxes;
  additionalInformation?: string | null;
}

export interface NFeTransport {
  freightMode: string;
  carrierDocument?: string | null;
  carrierName?: string | null;
  vehiclePlate?: string | null;
  vehicleState?: string | null;
  vehicleRntc?: string | null;
  volumes?: ReadonlyArray<NFeVolume>;
}

export interface NFeVolume {
  quantity: string;
  species?: string | null;
  brand?: string | null;
  numbering?: string | null;
  netWeight?: string | null;
  grossWeight?: string | null;
}

export interface NFeTotals {
  productsAmount: string;
  discountAmount: string;
  freightAmount: string;
  insuranceAmount: string;
  otherExpensesAmount: string;
  icmsBase: string;
  icmsAmount: string;
  icmsStBase: string;
  icmsStAmount: string;
  ipiAmount: string;
  pisAmount: string;
  cofinsAmount: string;
  invoiceAmount: string;
  approximateTaxAmount?: string;
}

export interface NFePayment {
  indicator: string;
  method: string;
  amount: string;
  changeAmount?: string;
  description?: string;
}

export interface NFeDraft {
  id?: string;
  companyId: string;
  environment: NFeEnvironment;
  direction: NFeDirection;
  operationNature: string;
  series: string;
  number?: string | null;
  issueDate: string;
  exitEntryDate?: string | null;
  purpose: string;
  destinationType: string;
  finalConsumer: boolean;
  presenceIndicator: string;
  issuer: NFeParty;
  recipient: NFeParty;
  items: ReadonlyArray<NFeItem>;
  totals: NFeTotals;
  transport?: NFeTransport | null;
  payments: ReadonlyArray<NFePayment>;
  additionalInformation?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NFeProviderReceipt {
  provider: string;
  requestId?: string;
  receivedAt: string;
  rawStatus?: string;
}

export interface NFeAuthorization {
  accessKey: string;
  protocol: string;
  authorizedAt: string;
  statusCode: '100' | '150';
  statusMessage: string;
  xmlUrl?: string;
  xmlContent?: string;
}

export interface NFeRejection {
  statusCode: string;
  statusMessage: string;
  receivedAt: string;
  protocol?: string;
}

export interface NFeCancellation {
  protocol: string;
  eventSequence: number;
  registeredAt: string;
  statusCode: string;
  statusMessage: string;
  xmlContent?: string;
}

export interface NFeOperationResult {
  success: boolean;
  status: NFeLifecycleStatus;
  issues: ReadonlyArray<NFeIssue>;
  providerReceipt?: NFeProviderReceipt;
  authorization?: NFeAuthorization;
  rejection?: NFeRejection;
  correlationId?: string;
}

export interface NFeStoredDocument {
  id: string;
  companyId: string;
  environment: NFeEnvironment;
  direction: NFeDirection;
  status: NFeLifecycleStatus;
  accessKey?: string | null;
  series: string;
  number?: string | null;
  protocol?: string | null;
  issueDate: string;
  invoiceAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface NFeRepositoryResult<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export interface NFeTransmissionRequest {
  companyId: string;
  documentId: string;
  environment: NFeEnvironment;
  idempotencyKey: string;
}

export interface NFeCancellationRequest {
  companyId: string;
  documentId: string;
  justification: string;
  idempotencyKey: string;
}

export interface NFeNumberReservation {
  companyId: string;
  environment: NFeEnvironment;
  series: string;
  number: string;
  reservationId: string;
}

export function isNFeAuthorizedStatusCode(
  statusCode: string,
): statusCode is NFeAuthorization['statusCode'] {
  return statusCode === '100' || statusCode === '150';
}
