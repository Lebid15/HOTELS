import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jsDir = path.join(root, 'apps', 'web', 'public', 'assets', 'js');
const moduleDir = path.join(jsDir, 'modules');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const index = fs.readFileSync(path.join(root, 'apps', 'web', 'public', 'index.html'), 'utf8');
const ordered = [
  'assets/js/professional/adapters/classic-runtime-bridge.js',
  'assets/js/professional/adapters/storage-adapter.js',
  'assets/js/professional/adapters/print-adapter.js',
  'assets/js/i18n.js',
  'assets/js/modules/00-bootstrap-icons-design.js',
  'assets/js/modules/02-state-print-avatar-utils.js'
];
for (const item of ordered) assert(index.includes(item), `Missing script in index.html: ${item}`);
for (let i = 0; i < ordered.length - 1; i += 1) {
  assert(index.indexOf(ordered[i]) < index.indexOf(ordered[i + 1]), `Script order is wrong: ${ordered[i]} must be before ${ordered[i + 1]}`);
}

const storageAdapter = fs.readFileSync(path.join(jsDir, 'professional/adapters/storage-adapter.js'), 'utf8');
const printAdapter = fs.readFileSync(path.join(jsDir, 'professional/adapters/print-adapter.js'), 'utf8');
assert(storageAdapter.includes('window.FandqiStorage'), 'Storage adapter must install window.FandqiStorage.');
assert(storageAdapter.includes('createRepository'), 'Storage adapter must expose repository factory.');
assert(printAdapter.includes('window.FandqiPrint'), 'Print adapter must install window.FandqiPrint.');
assert(printAdapter.includes('autoPrintScript'), 'Print adapter must expose autoPrintScript.');

const legacyFiles = fs.readdirSync(moduleDir).filter(file => file.endsWith('.js'));
const rawStorage = [];
const rawOpen = [];
const rawDocumentWrite = [];
for (const file of legacyFiles) {
  const text = fs.readFileSync(path.join(moduleDir, file), 'utf8');
  if (/localStorage\./.test(text)) rawStorage.push(file);
  if (/window\.open\(/.test(text)) rawOpen.push(file);
  if (/\.document\.write\(/.test(text)) rawDocumentWrite.push(file);
}
assert(rawStorage.length === 0, `Legacy modules must not call localStorage directly: ${rawStorage.join(', ')}`);
assert(rawOpen.length === 0, `Legacy modules must not call window.open directly: ${rawOpen.join(', ')}`);
assert(rawDocumentWrite.length === 0, `Legacy modules must not write print windows directly: ${rawDocumentWrite.join(', ')}`);

const stateModule = fs.readFileSync(path.join(moduleDir, '02-state-print-avatar-utils.js'), 'utf8');
assert(!/function\s+writeStorageJson[\s\S]*?writeStorageJson\(key, value\)/.test(stateModule), 'writeStorageJson fallback recursion detected.');
assert(stateModule.includes('window.FandqiStorage?.writeJson'), 'writeStorageJson must delegate to FandqiStorage.');
assert(stateModule.includes('window.FandqiPrint?.openHtml'), 'openRuntimePrintWindow must delegate to FandqiPrint.');

if (errors.length) {
  console.error('Adapter audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Adapter audit passed ✅');
