import fs from 'node:fs';

const exists = file => fs.existsSync(file);
const read = file => fs.readFileSync(file, 'utf8');

const featureDir = 'apps/web/public/assets/js/professional/features/staff';
const requiredFiles = [
  'constants.mjs',
  'repository.mjs',
  'validators.mjs',
  'render.mjs',
  'actions.mjs',
  'index.mjs'
].map(file => `${featureDir}/${file}`);

const adapterPath = 'apps/web/public/assets/js/professional/adapters/staff-feature-adapter.js';
const appEntryPath = 'apps/web/public/assets/js/professional/app-entry.mjs';
const indexPath = 'apps/web/public/index.html';
const staffModulePath = 'apps/web/public/assets/js/modules/05-staff.js';
const staffEventsPath = 'apps/web/public/assets/js/modules/06-rooms-dashboard.js';

const failures = [];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`missing staff feature file: ${file}`);
}

if (!exists(adapterPath)) failures.push(`missing staff feature adapter: ${adapterPath}`);

const featureIndex = exists(`${featureDir}/index.mjs`) ? read(`${featureDir}/index.mjs`) : '';
const adapter = exists(adapterPath) ? read(adapterPath) : '';
const appEntry = read(appEntryPath);
const indexHtml = read(indexPath);
const staffModule = read(staffModulePath);
const staffEvents = read(staffEventsPath);

const requiredFeatureTokens = [
  'staffFeature',
  'STAFF_FEATURE_NAME',
  'staffRepositoryInstance',
  'createStaffActions',
  'normalizeStaffMember',
  'validateStaffMember',
  'sortStaffByName',
  'summarizeStaff',
  'filterStaff',
  'getStaffBookingEmployeeKey'
];

for (const token of requiredFeatureTokens) {
  if (!featureIndex.includes(token) && !adapter.includes(token)) {
    failures.push(`staff feature missing token: ${token}`);
  }
}

const requiredIntegrationTokens = [
  ['app-entry imports staff feature', appEntry, "features/staff/index.mjs"],
  ['app-entry exposes staff feature', appEntry, 'staff: staffFeature'],
  ['index loads staff adapter', indexHtml, 'staff-feature-adapter.js'],
  ['staff page has feature marker', staffModule, 'data-feature-module="staff"'],
  ['classic staff module uses feature facade', staffModule, 'window.FandqiStaffFeature'],
  ['staff read via feature repository', staffModule, 'feature?.repository?.read'],
  ['staff write via feature repository', staffModule, 'feature?.repository?.write'],
  ['staff hotel list via feature repository', staffModule, 'feature?.repository?.forHotel'],
  ['staff byId via feature repository', staffModule, 'feature?.repository?.byId'],
  ['staff summary via feature selector', staffModule, 'feature?.selectors?.summarizeStaff'],
  ['staff filtering via feature selector', staffModule, 'feature?.selectors?.filterStaff'],
  ['staff sorting via feature selector', staffModule, 'feature?.selectors?.sortStaffByName'],
  ['staff events use feature facade', staffEvents, 'window.FandqiStaffFeature'],
  ['staff toggle via feature action', staffEvents, 'feature?.actions?.toggleStatus'],
  ['staff archive via feature action', staffEvents, 'feature?.actions?.archive'],
  ['staff password via feature action', staffEvents, 'feature?.actions?.updatePassword'],
  ['staff shift via feature action', staffEvents, 'feature?.actions?.updateShift'],
  ['staff permissions via feature action', staffEvents, 'feature?.actions?.updatePermissions'],
  ['staff upsert via feature repository', staffEvents, 'feature?.repository?.upsert']
];

for (const [label, source, token] of requiredIntegrationTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

const forbiddenPatterns = [
  ['staff read direct only', /function readHotelStaff\(\) \{\s*try \{/],
  ['staff hotel direct only', /function getHotelStaff\(hotelId\) \{\s*return readHotelStaff\(\)\.filter/],
  ['staff byId direct only', /function getStaffById\(id\) \{\s*return readHotelStaff\(\)\.find/],
  ['staff repository direct-only storage', /function writeHotelStaff\(staff\) \{\s*writeStorageJson/]
];

for (const [label, pattern] of forbiddenPatterns) {
  if (pattern.test(staffModule) || pattern.test(staffEvents)) {
    failures.push(`forbidden non-feature staff implementation remains: ${label}`);
  }
}

if (failures.length) {
  console.error('Staff feature module audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Staff feature module audit passed ✅');
