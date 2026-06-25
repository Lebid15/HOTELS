import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jsDir = path.join(root, 'apps', 'web', 'public', 'assets', 'js');
const professionalDir = path.join(jsDir, 'professional');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const read = file => fs.readFileSync(path.join(professionalDir, file), 'utf8');

const requiredFiles = [
  'storage/storage-keys.mjs',
  'storage/storage-engine.mjs',
  'storage/storage-repository.mjs',
  'storage/backup-service.mjs',
  'data/repository.mjs',
  'data/repositories/domain-repositories.mjs',
  'adapters/storage-adapter.js'
];

for (const file of requiredFiles) assert(fs.existsSync(path.join(professionalDir, file)), `Storage system file missing: ${file}`);

const storageKeys = read('storage/storage-keys.mjs');
for (const requiredKey of [
  'fandqi.subscriptionPackages',
  'fandqi.hotelStaff',
  'fandqi.foodMenuItems',
  'fandqi.maintenanceTickets',
  'fandqi.managerSubscriptionRequests'
]) {
  assert(storageKeys.includes(requiredKey), `Storage key registry missing real app key: ${requiredKey}`);
}

const repositoryFacade = read('data/repository.mjs');
assert(!/localStorage\./.test(repositoryFacade), 'data/repository.mjs must not access localStorage directly.');
assert(repositoryFacade.includes('../storage/storage-repository.mjs'), 'data/repository.mjs must re-export the true storage repository module.');
assert(repositoryFacade.includes('../storage/storage-keys.mjs'), 'data/repository.mjs must expose the central storage key registry.');

const domainRepositories = read('data/repositories/domain-repositories.mjs');
assert(domainRepositories.includes('domainRepositories'), 'Domain repositories must be created from the centralized storage repository registry.');
assert(!/domainRepository\(['"]/.test(domainRepositories), 'Domain repositories must not redefine hard-coded repository keys.');

const appEntry = read('app-entry.mjs');
for (const expected of ['storageKeys: STORAGE_KEYS', 'backupKeys: BACKUP_STORAGE_KEYS', 'backup: backupService', 'repositories,']) {
  assert(appEntry.includes(expected), `Professional namespace missing storage export: ${expected}`);
}

const adapter = read('adapters/storage-adapter.js');
for (const expected of [
  "packages: 'fandqi.subscriptionPackages'",
  "staff: 'fandqi.hotelStaff'",
  "foodMenu: 'fandqi.foodMenuItems'",
  "maintenance: 'fandqi.maintenanceTickets'"
]) {
  assert(adapter.includes(expected), `Storage adapter key mismatch: ${expected}`);
}
assert(adapter.includes('STORAGE_KEYS,'), 'Storage adapter must expose STORAGE_KEYS for legacy modules.');
assert(adapter.includes('storage-adapter-v2-domain-key-registry'), 'Storage adapter version must document the domain key registry upgrade.');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(packageJson.scripts?.['storage-system:audit'], 'package.json missing storage-system:audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('storage-system:audit'), 'quality:full must include storage-system:audit.');

if (errors.length) {
  console.error('Storage system audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Storage system audit passed ✅');
