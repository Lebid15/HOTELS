import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps', 'web', 'public');
const jsDir = path.join(publicDir, 'assets', 'js');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const required = [
  'professional/adapters/classic-runtime-bridge.js',
  'professional/adapters/storage-adapter.js',
  'professional/adapters/print-adapter.js',
  'professional/adapters/ui-adapter.js',
  'professional/core/date-formatters.mjs',
  'professional/core/event-bus.mjs',
  'professional/core/runtime-contract.mjs',
  'professional/data/repository.mjs',
  'professional/data/repositories/domain-repositories.mjs',
  'professional/print/print-service.mjs',
  'professional/ui/index.mjs',
  'professional/ui/component-factory.mjs',
  'professional/app-entry.mjs'
];

for (const file of required) {
  assert(fs.existsSync(path.join(jsDir, file)), `Professional layer missing: ${file}`);
}

const index = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const bridge = 'assets/js/professional/adapters/classic-runtime-bridge.js';
const storageAdapter = 'assets/js/professional/adapters/storage-adapter.js';
const printAdapter = 'assets/js/professional/adapters/print-adapter.js';
const uiAdapter = 'assets/js/professional/adapters/ui-adapter.js';
const i18n = 'assets/js/i18n.js';
assert(index.includes(bridge), 'Classic runtime bridge is not loaded in index.html.');
assert(index.includes(storageAdapter), 'Storage adapter is not loaded in index.html.');
assert(index.includes(printAdapter), 'Print adapter is not loaded in index.html.');
assert(index.includes(uiAdapter), 'UI adapter is not loaded in index.html.');
assert(index.indexOf(bridge) < index.indexOf(storageAdapter), 'Classic runtime bridge must load before storage adapter.');
assert(index.indexOf(storageAdapter) < index.indexOf(printAdapter), 'Storage adapter must load before print adapter.');
assert(index.indexOf(printAdapter) < index.indexOf(uiAdapter), 'Print adapter must load before UI adapter.');
assert(index.indexOf(uiAdapter) < index.indexOf(i18n), 'UI adapter must load before i18n and legacy modules.');

const stateModule = fs.readFileSync(path.join(jsDir, 'modules/02-state-print-avatar-utils.js'), 'utf8');
for (const requiredSymbol of ['readStorageJson', 'writeStorageJson', 'readStorageText', 'writeStorageText', 'openRuntimePrintWindow']) {
  assert(stateModule.includes(`function ${requiredSymbol}`), `State module missing ${requiredSymbol} adapter.`);
}
assert(stateModule.includes('window.FandqiStorage'), 'State module must delegate storage to FandqiStorage.');
assert(stateModule.includes('window.FandqiPrint'), 'State module must delegate print windows to FandqiPrint.');
assert(!stateModule.includes('writeStorageJson(key, value);'), 'writeStorageJson must not recursively call itself.');

const moduleDir = path.join(jsDir, 'modules');
const legacyModules = fs.readdirSync(moduleDir).filter(file => file.endsWith('.js'));
const directStorage = [];
const directPrint = [];
for (const file of legacyModules) {
  const rel = `modules/${file}`;
  const text = fs.readFileSync(path.join(moduleDir, file), 'utf8');
  if (file !== '02-state-print-avatar-utils.js' && /localStorage\./.test(text)) directStorage.push(rel);
  if (file !== '02-state-print-avatar-utils.js' && /window\.open\('', '_blank'/.test(text)) directPrint.push(rel);
}
assert(directStorage.length === 0, `Legacy modules must use storage adapter, direct localStorage found in: ${directStorage.join(', ')}`);
assert(directPrint.length === 0, `Legacy modules must use print adapter, direct window.open found in: ${directPrint.join(', ')}`);

const appEntry = fs.readFileSync(path.join(jsDir, 'professional/app-entry.mjs'), 'utf8');
assert(appEntry.includes('./data/repositories/domain-repositories.mjs'), 'Professional entry must expose domain repositories.');
assert(appEntry.includes('repositories,'), 'Professional namespace must include repositories.');
assert(appEntry.includes('ui,'), 'Professional namespace must include central UI components.');

if (errors.length) {
  console.error('Professional layer audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Professional layer audit passed ✅');
