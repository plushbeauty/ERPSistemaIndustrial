import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourcePath = fileURLToPath(new URL('../src/lib/fiscal/nfe-xml-builder.ts', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { buildNFeDraftXml } = await import(moduleUrl);

const draft = {
  id: 'draft-test',
  companyId: 'company-test',
  environment: 'homologacao',
  direction: 'saida',
  operationNature: 'Venda & remessa <teste>',
  series: '1',
  number: '1',
  issueDate: '2026-10-12',
  exitEntryDate: null,
  purpose: 'normal',
  destinationType: 'interna',
  finalConsumer: true,
  presenceIndicator: '9',
  issuer: {
    document: '12345678000199',
    legalName: 'Empresa & Cia <Indústria> "A" \'B\'\u0001',
    address: {
      street: 'Rua de teste',
      number: '1',
      district: 'Centro',
      cityCode: '3550308',
      cityName: 'São Paulo',
      state: 'SP',
      postalCode: '01001000',
    },
  },
  recipient: {
    document: '12345678909',
    legalName: 'Destinatário',
    address: {
      street: 'Rua Um',
      number: '2',
      district: 'Centro',
      cityCode: '3550308',
      cityName: 'São Paulo',
      state: 'SP',
      postalCode: '01001000',
    },
  },
  items: [{
    lineNumber: 1,
    product: {
      code: 'P-1',
      description: 'Produto\u0001\nLinha 2',
      ncm: '00000000',
      unit: 'UN',
      origin: '0',
    },
    cfop: '5102',
    quantity: '1.0000',
    unitPrice: '10.00',
    grossAmount: '10.00',
    discountAmount: '0.00',
    totalAmount: '10.00',
    taxes: {},
  }],
  totals: {
    productsAmount: '10.00',
    discountAmount: '0.00',
    freightAmount: '0.00',
    insuranceAmount: '0.00',
    otherExpensesAmount: '0.00',
    icmsBase: '0.00',
    icmsAmount: '0.00',
    icmsStBase: '0.00',
    icmsStAmount: '0.00',
    ipiAmount: '0.00',
    pisAmount: '0.00',
    cofinsAmount: '0.00',
    invoiceAmount: '10.00',
  },
  payments: [],
};

const result = buildNFeDraftXml(draft);
assert.equal(result.documentKind, 'internal-draft');
assert.equal(result.suitableForSefaz, false);
assert.match(result.xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(result.xml, /<NFeDraft xmlns="urn:erp-industrial:nfe:draft:v1">/);
assert.match(result.xml, /<operationNature>Venda &amp; remessa &lt;teste&gt;<\/operationNature>/);
assert.match(result.xml, /<legalName>Empresa &amp; Cia &lt;Indústria&gt; &quot;A&quot; &apos;B&apos;<\/legalName>/);
assert.match(result.xml, /<description>Produto\nLinha 2<\/description>/);
assert.doesNotMatch(result.xml, /\u0001/);
assert.doesNotMatch(result.xml, /<NFe(?:\s|>)/);

console.log('NF-e XML draft tests: PASS (escaping, XML 1.0 filtering, and internal-only marker).');
