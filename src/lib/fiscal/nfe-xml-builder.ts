/**
 * Serializador XML interno do rascunho de NF-e.
 *
 * IMPORTANTE: o formato gerado é um envelope interno de intercâmbio do ERP,
 * não o XML fiscal oficial da NF-e modelo 55. Não contém assinatura digital,
 * chave de acesso calculada, grupos tributários XSD completos ou protocolo.
 * Nunca transmitir este resultado diretamente à SEFAZ/provedor.
 */
import type {
  NFeAddress,
  NFeDraft,
  NFeItem,
  NFeParty,
  NFePayment,
  NFeTransport,
  NFeVolume,
} from './nfe-types';

export interface NFeDraftXmlResult {
  xml: string;
  documentKind: 'internal-draft';
  suitableForSefaz: false;
}

function cleanXmlText(value: string): string {
  // Filtra por ponto de código para respeitar XML 1.0 sem uma regex de
  // caracteres de controle (bloqueada pela regra ESLint no CI).
  let cleaned = '';
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    const valid = codePoint === 0x9 || codePoint === 0xA || codePoint === 0xD ||
      (codePoint >= 0x20 && codePoint <= 0xD7FF) ||
      (codePoint >= 0xE000 && codePoint <= 0xFFFD) ||
      (codePoint >= 0x10000 && codePoint <= 0x10FFFF);
    if (valid) cleaned += character;
  }
  return cleaned;
}

function escapeXml(value: string): string {
  return cleanXmlText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function element(name: string, value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return `<${name}>${escapeXml(String(value))}</${name}>`;
}

function group(name: string, contents: string): string {
  return `<${name}>${contents}</${name}>`;
}

function addressXml(address: NFeAddress): string {
  return group('address', [
    element('street', address.street),
    element('number', address.number),
    element('complement', address.complement),
    element('district', address.district),
    element('cityCode', address.cityCode),
    element('cityName', address.cityName),
    element('state', address.state),
    element('postalCode', address.postalCode),
    element('countryCode', address.countryCode),
    element('countryName', address.countryName),
    element('phone', address.phone),
  ].join(''));
}

function partyXml(name: 'issuer' | 'recipient', party: NFeParty): string {
  return group(name, [
    element('document', party.document),
    element('legalName', party.legalName),
    element('tradeName', party.tradeName),
    element('stateRegistration', party.stateRegistration),
    element('municipalRegistration', party.municipalRegistration),
    element('taxRegime', party.taxRegime),
    element('email', party.email),
    addressXml(party.address),
  ].join(''));
}

function itemXml(item: NFeItem): string {
  const taxes = item.taxes;
  const taxXml = group('taxes', [
    element('icmsCstCsosn', taxes.icmsCstCsosn),
    element('icmsRate', taxes.icmsRate),
    element('icmsBase', taxes.icmsBase),
    element('icmsAmount', taxes.icmsAmount),
    element('ipiCst', taxes.ipiCst),
    element('ipiRate', taxes.ipiRate),
    element('ipiAmount', taxes.ipiAmount),
    element('pisCst', taxes.pisCst),
    element('pisRate', taxes.pisRate),
    element('pisAmount', taxes.pisAmount),
    element('cofinsCst', taxes.cofinsCst),
    element('cofinsRate', taxes.cofinsRate),
    element('cofinsAmount', taxes.cofinsAmount),
    group('additionalTaxes', (taxes.additionalTaxes ?? []).map(tax => group('tax', [
      element('code', tax.code),
      element('base', tax.base),
      element('rate', tax.rate),
      element('amount', tax.amount),
      element('description', tax.description),
    ].join(''))).join('')),
  ].join(''));

  return group('item', [
    element('lineNumber', item.lineNumber),
    group('product', [
      element('id', item.product.id),
      element('code', item.product.code),
      element('description', item.product.description),
      element('ncm', item.product.ncm),
      element('cest', item.product.cest),
      element('gtin', item.product.gtin),
      element('unit', item.product.unit),
      element('origin', item.product.origin),
    ].join('')),
    element('cfop', item.cfop),
    element('quantity', item.quantity),
    element('unitPrice', item.unitPrice),
    element('grossAmount', item.grossAmount),
    element('discountAmount', item.discountAmount),
    element('freightAmount', item.freightAmount),
    element('insuranceAmount', item.insuranceAmount),
    element('otherExpensesAmount', item.otherExpensesAmount),
    element('totalAmount', item.totalAmount),
    taxXml,
    element('additionalInformation', item.additionalInformation),
  ].join(''));
}

function volumeXml(volume: NFeVolume): string {
  return group('volume', [
    element('quantity', volume.quantity),
    element('species', volume.species),
    element('brand', volume.brand),
    element('numbering', volume.numbering),
    element('netWeight', volume.netWeight),
    element('grossWeight', volume.grossWeight),
  ].join(''));
}

function transportXml(transport: NFeTransport | null | undefined): string {
  if (!transport) return '';
  return group('transport', [
    element('freightMode', transport.freightMode),
    element('carrierDocument', transport.carrierDocument),
    element('carrierName', transport.carrierName),
    element('vehiclePlate', transport.vehiclePlate),
    element('vehicleState', transport.vehicleState),
    element('vehicleRntc', transport.vehicleRntc),
    group('volumes', (transport.volumes ?? []).map(volumeXml).join('')),
  ].join(''));
}

function paymentXml(payment: NFePayment): string {
  return group('payment', [
    element('indicator', payment.indicator),
    element('method', payment.method),
    element('amount', payment.amount),
    element('changeAmount', payment.changeAmount),
    element('description', payment.description),
  ].join(''));
}

/**
 * Gera uma representação XML de transporte/auditoria para o rascunho.
 * O chamador deve validar os dados e usar a integração fiscal oficial para
 * compor o XML XSD, assinar, transmitir e interpretar a autorização.
 */
export function buildNFeDraftXml(draft: NFeDraft): NFeDraftXmlResult {
  const body = [
    element('documentId', draft.id),
    element('companyId', draft.companyId),
    element('environment', draft.environment),
    element('direction', draft.direction),
    element('operationNature', draft.operationNature),
    element('series', draft.series),
    element('number', draft.number),
    element('issueDate', draft.issueDate),
    element('exitEntryDate', draft.exitEntryDate),
    element('purpose', draft.purpose),
    element('destinationType', draft.destinationType),
    element('finalConsumer', draft.finalConsumer),
    element('presenceIndicator', draft.presenceIndicator),
    partyXml('issuer', draft.issuer),
    partyXml('recipient', draft.recipient),
    group('items', draft.items.map(itemXml).join('')),
    group('totals', [
      element('productsAmount', draft.totals.productsAmount),
      element('discountAmount', draft.totals.discountAmount),
      element('freightAmount', draft.totals.freightAmount),
      element('insuranceAmount', draft.totals.insuranceAmount),
      element('otherExpensesAmount', draft.totals.otherExpensesAmount),
      element('icmsBase', draft.totals.icmsBase),
      element('icmsAmount', draft.totals.icmsAmount),
      element('icmsStBase', draft.totals.icmsStBase),
      element('icmsStAmount', draft.totals.icmsStAmount),
      element('ipiAmount', draft.totals.ipiAmount),
      element('pisAmount', draft.totals.pisAmount),
      element('cofinsAmount', draft.totals.cofinsAmount),
      element('invoiceAmount', draft.totals.invoiceAmount),
      element('approximateTaxAmount', draft.totals.approximateTaxAmount),
    ].join('')),
    transportXml(draft.transport),
    group('payments', draft.payments.map(paymentXml).join('')),
    element('additionalInformation', draft.additionalInformation),
  ].join('');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<NFeDraft xmlns="urn:erp-industrial:nfe:draft:v1">',
    body,
    '</NFeDraft>',
  ].join('\n');

  return {
    xml,
    documentKind: 'internal-draft',
    suitableForSefaz: false,
  };
}
