import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps', 'web', 'public');
const indexPath = path.join(publicDir, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const scriptMatches = [...html.matchAll(/<script([^>]*)src="\.\/([^"]+)"([^>]*)><\/script>/g)];
const scripts = scriptMatches.map(match => ({
  attrs: `${match[1]} ${match[3]}`,
  src: match[2]
}));

for (const script of scripts) {
  const file = path.join(publicDir, script.src);
  assert(fs.existsSync(file), `Script not found: ${script.src}`);
}

const sources = scripts.map(script => script.src);
const indexOf = src => sources.indexOf(src);

assert(indexOf('assets/js/professional/adapters/classic-runtime-bridge.js') !== -1, 'Classic runtime bridge must be loaded.');
assert(indexOf('assets/js/i18n.js') !== -1, 'i18n.js must be loaded.');
assert(indexOf('assets/js/professional/adapters/classic-runtime-bridge.js') < indexOf('assets/js/i18n.js'), 'Classic runtime bridge must load before i18n and feature modules.');
assert(indexOf('assets/js/modules/00-bootstrap-icons-design.js') !== -1, 'Bootstrap/design module missing.');
assert(indexOf('assets/js/modules/02-state-print-avatar-utils.js') !== -1, 'State module missing.');
assert(indexOf('assets/js/modules/02-state-print-avatar-utils.js') < indexOf('assets/js/modules/01-navigation-topbar.js'), 'State module must load before navigation/topbar.');
assert(indexOf('assets/js/modules/11d-backup-dashboard-workspace-events-init.js') > indexOf('assets/js/modules/11a-subscription-plan.js'), 'Init module must load after feature modules.');
assert(indexOf('assets/js/professional/app-entry.mjs') > indexOf('assets/js/app.js'), 'Professional ES module entry must load after compatibility app marker.');

const combinedClassic = scripts
  .filter(script => !script.attrs.includes('type="module"'))
  .map(script => fs.readFileSync(path.join(publicDir, script.src), 'utf8'))
  .join('\n');

for (const required of [
  'const state',
  'function render',
  'function formatDateTime',
  'function todayISO',
  'function applyCentralDesignSystem',
  'function renderAutoPrintScript',
  'function readStorageJson',
  'function writeStorageJson',
  'function openRuntimePrintWindow'
]) {
  assert(combinedClassic.includes(required), `Runtime required symbol missing: ${required}`);
}

const professionalEntry = fs.readFileSync(path.join(publicDir, 'assets/js/professional/app-entry.mjs'), 'utf8');
for (const requiredImport of [
  './core/event-bus.mjs',
  './core/date-formatters.mjs',
  './data/repository.mjs',
  './data/repositories/domain-repositories.mjs',
  './ui/component-factory.mjs',
  './print/print-service.mjs',
  './core/runtime-contract.mjs'
]) {
  assert(professionalEntry.includes(requiredImport), `Professional ES module import missing: ${requiredImport}`);
}

if (errors.length) {
  console.error('Runtime stability audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Runtime stability audit passed ✅');
