import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps', 'web', 'public');
const jsDir = path.join(publicDir, 'assets', 'js');
const printDir = path.join(jsDir, 'professional', 'print');
const moduleDir = path.join(jsDir, 'modules');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const requiredPrintFiles = [
  'print-actions.mjs',
  'print-document.mjs',
  'print-window.mjs',
  'print-service.mjs'
];
for (const file of requiredPrintFiles) {
  assert(fs.existsSync(path.join(printDir, file)), `True print module missing: ${file}`);
}

const printService = fs.readFileSync(path.join(printDir, 'print-service.mjs'), 'utf8');
for (const requiredImport of ['./print-actions.mjs', './print-document.mjs', './print-window.mjs']) {
  assert(printService.includes(requiredImport), `print-service.mjs must compose ${requiredImport}`);
}
assert(printService.includes('printService'), 'print-service.mjs must export printService namespace.');
assert(printService.includes('openHtml'), 'print-service.mjs must export openHtml.');
assert(printService.includes('autoPrintScript'), 'print-service.mjs must export autoPrintScript.');

const appEntry = fs.readFileSync(path.join(jsDir, 'professional', 'app-entry.mjs'), 'utf8');
assert(appEntry.includes("import { printService } from './print/print-service.mjs';"), 'app-entry.mjs must import the printService namespace.');
assert(appEntry.includes('print: printService'), 'FandqiProfessional.print must expose the true module printService.');

const adapter = fs.readFileSync(path.join(jsDir, 'professional', 'adapters', 'print-adapter.js'), 'utf8');
assert(adapter.includes('window.FandqiProfessional?.print'), 'Print adapter must prefer the true module print service.');
assert(adapter.includes('print-adapter-v2-true-module-facade'), 'Print adapter version must reflect true module facade.');

const bridge = fs.readFileSync(path.join(jsDir, 'professional', 'adapters', 'classic-runtime-bridge.js'), 'utf8');
assert(!/window\.open\(/.test(bridge), 'Classic runtime bridge must not open print windows directly.');
assert(!/\.document\.write\(/.test(bridge), 'Classic runtime bridge must not write print documents directly.');
assert(bridge.includes('window.FandqiPrint.openHtml'), 'Classic runtime bridge print must delegate to FandqiPrint.');

for (const file of fs.readdirSync(moduleDir).filter(item => item.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(moduleDir, file), 'utf8');
  assert(!/window\.open\(/.test(text), `Legacy module must not open windows directly: ${file}`);
  assert(!/\.document\.write\(/.test(text), `Legacy module must not write print documents directly: ${file}`);
}

const allowedRawPrintFiles = new Set([
  path.join(jsDir, 'professional', 'print', 'print-window.mjs'),
  path.join(jsDir, 'professional', 'adapters', 'print-adapter.js')
]);
function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, results);
    else if (/\.(js|mjs)$/.test(entry.name)) results.push(full);
  }
  return results;
}
for (const file of walk(jsDir)) {
  const text = fs.readFileSync(file, 'utf8');
  if (!allowedRawPrintFiles.has(file)) {
    assert(!/window\.open\(/.test(text), `Raw window.open is only allowed inside print-window.mjs or print adapter: ${path.relative(root, file)}`);
    assert(!/\.document\.write\(/.test(text), `Raw document.write is only allowed inside print-window.mjs or print adapter: ${path.relative(root, file)}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(pkg.scripts?.['print-system:audit'] === 'node scripts/print-system-audit.mjs', 'print-system:audit script missing.');
assert(pkg.scripts?.['quality:full']?.includes('print-system:audit'), 'quality:full must include print-system:audit.');

if (errors.length) {
  console.error('Print system audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Print system audit passed ✅');
