import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourcePath = fileURLToPath(new URL('../src/lib/fiscal/nfe-release-pricing.ts', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { allocateReleaseDiscounts } = await import(moduleUrl);

assert.deepEqual(allocateReleaseDiscounts(10, 10, [5, 5]), [5, 5]);
assert.deepEqual(allocateReleaseDiscounts(1, 3, [1, 1, 1]), [0.33, 0.33, 0.34]);
assert.deepEqual(allocateReleaseDiscounts(10, 10, [2, 3]), [4, 6]);
assert.deepEqual(allocateReleaseDiscounts(10, 10, [2]), [2]);
assert.deepEqual(allocateReleaseDiscounts(10, 10, [12]), [10]);
assert.deepEqual(allocateReleaseDiscounts(10, 0, [2]), [0]);
assert.deepEqual(allocateReleaseDiscounts(10, 10, []), []);
assert.deepEqual(allocateReleaseDiscounts(-5, 10, [5]), [0]);
console.log('NF-e release discount allocation tests: PASS (proportional lots, cent remainder, partial shipment, and invalid quantities).');
