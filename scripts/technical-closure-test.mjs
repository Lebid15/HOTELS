import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jsRoot = path.join(root, 'apps', 'web', 'public', 'assets', 'js');
const arPath = path.join(root, 'apps', 'web', 'public', 'locales', 'ar.json');
const enPath = path.join(root, 'apps', 'web', 'public', 'locales', 'en.json');
const packagePath = path.join(root, 'package.json');

function readAllJs(dir) {
  const files = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name)) files.push(full);
    }
  }
  walk(dir);
  return files.sort().map(file => fs.readFileSync(file, 'utf8')).join('\n');
}

const app = readAllJs(jsRoot);
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const backupKeys = [
  'fandqi.platformSettings',
  'fandqi.platformOwnerPassword',
  'fandqi.hotels',
  'fandqi.subscriptionPackages',
  'fandqi.subscriptions',
  'fandqi.hotelSettings',
  'fandqi.hotelStaff',
  'fandqi.rooms',
  'fandqi.reservations',
  'fandqi.foodMenuItems',
  'fandqi.foodOrders',
  'fandqi.maintenanceTickets'
];

for (const key of backupKeys) {
  assert(app.includes(`'${key}'`), `Backup storage key is missing: ${key}`);
}

assert(app.includes('BACKUP_STORAGE_KEYS.forEach(key => removeStorageKey(key))') || app.includes('BACKUP_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))'), 'Clear demo data must use the central backup key list through the storage adapter.');
assert(app.includes('function getCentralPrintStyles'), 'Central print styles helper is missing.');
assert(app.includes('function renderPrintWindowActions'), 'Central print action helper is missing.');
assert(app.includes('function renderAutoPrintScript'), 'Central auto-print helper is missing.');
assert((app.match(/getCentralPrintStyles\('/g) || []).length >= 4, 'All main print templates must use central print styles.');
assert((app.match(/data-avatar-clear="\$\{h\(prefix\)\}"/g) || []).length === 1, 'Avatar uploader must not render duplicate clear buttons.');
assert(app.includes('function formatDateTime'), 'formatDateTime helper must exist.');
assert(app.includes('function getHotelRoomsIncludingArchived'), 'Archived rooms helper must exist.');
assert(ar.common?.user, 'Arabic common.user translation is missing.');
assert(en.common?.user, 'English common.user translation is missing.');
assert(ar.reports?.financial?.foodRevenue, 'Arabic reports.financial.foodRevenue translation is missing.');
assert(en.reports?.financial?.foodRevenue, 'English reports.financial.foodRevenue translation is missing.');
assert(pkg.scripts?.['closure:test'] === 'node scripts/technical-closure-test.mjs', 'closure:test script is missing from package.json.');
const qualityFull = pkg.scripts?.['quality:full'] || '';
for (const requiredQualityScript of ['check', 'smoke:test', 'ui:audit', 'modular:audit', 'runtime:audit', 'architecture:audit', 'professional:audit', 'print-system:audit', 'closure:test']) {
  assert(qualityFull.includes(`npm run ${requiredQualityScript}`), `quality:full must include ${requiredQualityScript}.`);
}

if (errors.length) {
  console.error('Technical closure test failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Technical closure test passed ✅');
