import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourcePath = fileURLToPath(new URL('../src/lib/fiscal/nfe-number.ts', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { parseFiscalNumber } = await import(moduleUrl);

const cases = [
  ['0.5', 0.5],
  ['12.50', 12.5],
  ['1.234,56', 1234.56],
  ['1,234.56', 1234.56],
  ['1,5', 1.5],
  ['R$ 1.234,56', 1234.56],
  ['1234', 1234],
  ['', 0],
  ['invalid', 0],
  [-2.75, -2.75],
];
for (const [input, expected] of cases) assert.equal(parseFiscalNumber(input), expected, String(input));
console.log('NF-e number parser tests: PASS (decimal dot/comma, grouped amounts, invalid and numeric inputs).');
