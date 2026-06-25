import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const exists = file => fs.existsSync(file);

const failures = [];
const packageJson = JSON.parse(read('package.json'));
const appEntry = read('apps/web/public/assets/js/professional/app-entry.mjs');
const indexHtml = read('apps/web/public/index.html');

const featureModules = [
  {
    name: 'rooms',
    variable: 'roomsFeature',
    adapterGlobal: 'FandqiRoomsFeature',
    individualAudit: 'feature-modules-rooms:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/06-rooms-dashboard.js']
  },
  {
    name: 'reservations',
    variable: 'reservationsFeature',
    adapterGlobal: 'FandqiReservationsFeature',
    individualAudit: 'feature-modules-reservations:audit',
    sourceModuleHints: [
      'apps/web/public/assets/js/modules/08a-reservation-core.js',
      'apps/web/public/assets/js/modules/08b-reservation-modal-print.js',
      'apps/web/public/assets/js/modules/08c-reservation-page-events.js'
    ]
  },
  {
    name: 'staff',
    variable: 'staffFeature',
    adapterGlobal: 'FandqiStaffFeature',
    individualAudit: 'feature-modules-staff:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/05-staff.js']
  },
  {
    name: 'food',
    variable: 'foodFeature',
    adapterGlobal: 'FandqiFoodFeature',
    individualAudit: 'feature-modules-food:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/07-food-services.js']
  },
  {
    name: 'maintenance',
    variable: 'maintenanceFeature',
    adapterGlobal: 'FandqiMaintenanceFeature',
    individualAudit: 'feature-modules-maintenance-housekeeping:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/10a-maintenance.js']
  },
  {
    name: 'housekeeping',
    variable: 'housekeepingFeature',
    adapterGlobal: 'FandqiHousekeepingFeature',
    individualAudit: 'feature-modules-maintenance-housekeeping:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js']
  },
  {
    name: 'guests',
    variable: 'guestsFeature',
    adapterGlobal: 'FandqiGuestsFeature',
    individualAudit: 'feature-modules-guests-checkio:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/09a-guests.js']
  },
  {
    name: 'checkio',
    variable: 'checkioFeature',
    adapterGlobal: 'FandqiCheckioFeature',
    individualAudit: 'feature-modules-guests-checkio:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/09b-check-in-out.js']
  },
  {
    name: 'reports',
    variable: 'reportsFeature',
    adapterGlobal: 'FandqiReportsFeature',
    individualAudit: 'feature-modules-reports-payments-notifications:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/10b-reports.js']
  },
  {
    name: 'payments',
    variable: 'paymentsFeature',
    adapterGlobal: 'FandqiPaymentsFeature',
    individualAudit: 'feature-modules-reports-payments-notifications:audit',
    sourceModuleHints: [
      'apps/web/public/assets/js/modules/10c-payments-notifications.js',
      'apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js'
    ]
  },
  {
    name: 'notifications',
    variable: 'notificationsFeature',
    adapterGlobal: 'FandqiNotificationsFeature',
    individualAudit: 'feature-modules-reports-payments-notifications:audit',
    sourceModuleHints: ['apps/web/public/assets/js/modules/10c-payments-notifications.js']
  }
];

const requiredFeatureFiles = [
  'constants.mjs',
  'repository.mjs',
  'validators.mjs',
  'render.mjs',
  'actions.mjs',
  'index.mjs'
];

for (const feature of featureModules) {
  const base = `apps/web/public/assets/js/professional/features/${feature.name}`;
  for (const file of requiredFeatureFiles) {
    const path = `${base}/${file}`;
    if (!exists(path)) failures.push(`${feature.name}: missing required feature file ${path}`);
  }

  const indexPath = `${base}/index.mjs`;
  if (exists(indexPath)) {
    const source = read(indexPath);
    if (!source.includes(`const ${feature.variable}`) && !source.includes(`export const ${feature.variable}`)) {
      failures.push(`${feature.name}: index.mjs does not export ${feature.variable}`);
    }
    for (const token of ['constants', 'repository', 'validators', 'actions']) {
      if (!source.includes(token)) failures.push(`${feature.name}: index.mjs missing ${token} exposure`);
    }
  }

  const adapterPath = `apps/web/public/assets/js/professional/adapters/${feature.name}-feature-adapter.js`;
  if (!exists(adapterPath)) {
    failures.push(`${feature.name}: missing classic adapter ${adapterPath}`);
  } else {
    const adapter = read(adapterPath);
    if (!adapter.includes(feature.adapterGlobal)) {
      failures.push(`${feature.name}: adapter does not expose window.${feature.adapterGlobal}`);
    }
    if (!adapter.includes('Object.freeze')) {
      failures.push(`${feature.name}: adapter is not frozen/immutable`);
    }
  }

  if (!appEntry.includes(`features/${feature.name}/index.mjs`)) {
    failures.push(`${feature.name}: professional app entry missing module import`);
  }
  if (!appEntry.includes(`${feature.name}: ${feature.variable}`)) {
    failures.push(`${feature.name}: professional app entry does not expose feature`);
  }
  if (!indexHtml.includes(`${feature.name}-feature-adapter.js`)) {
    failures.push(`${feature.name}: index.html does not load classic feature adapter`);
  }

  for (const sourceModule of feature.sourceModuleHints) {
    if (!exists(sourceModule)) {
      failures.push(`${feature.name}: linked source module does not exist ${sourceModule}`);
      continue;
    }
    const source = read(sourceModule);
    if (!source.includes(feature.adapterGlobal) && !source.includes(feature.variable.replace('Feature', 'Feature()')) && !source.includes(`function ${feature.variable.replace('Feature', 'Feature')}`)) {
      failures.push(`${feature.name}: source module ${sourceModule} does not reference migrated feature adapter/helper`);
    }
  }
}

const requiredIndividualAudits = [
  'feature-modules-rooms:audit',
  'feature-modules-reservations:audit',
  'feature-modules-staff:audit',
  'feature-modules-food:audit',
  'feature-modules-maintenance-housekeeping:audit',
  'feature-modules-guests-checkio:audit',
  'feature-modules-reports-payments-notifications:audit'
];

for (const audit of requiredIndividualAudits) {
  if (!packageJson.scripts?.[audit]) failures.push(`package.json missing individual audit ${audit}`);
  if (!packageJson.scripts?.['quality:full']?.includes(`npm run ${audit}`)) {
    failures.push(`quality:full missing individual audit ${audit}`);
  }
}

const requiredDocs = [
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE16.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE17.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE18.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE19.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE20.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE21.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE22.md',
  'docs/FEATURE_MODULES_INVENTORY.json'
];

for (const doc of requiredDocs) {
  if (!exists(doc)) failures.push(`missing feature-module documentation ${doc}`);
}

if (!appEntry.includes('central-ui-components')) {
  failures.push('professional app entry version must continue documenting central UI components');
}
if (!appEntry.includes('feature-modules')) {
  failures.push('professional app entry version must document feature modules');
}

const inventory = exists('docs/FEATURE_MODULES_INVENTORY.json') ? JSON.parse(read('docs/FEATURE_MODULES_INVENTORY.json')) : [];
if (!Array.isArray(inventory) || inventory.length !== featureModules.length) {
  failures.push(`feature modules inventory must contain ${featureModules.length} entries`);
} else {
  const missingInventory = featureModules
    .map(feature => feature.name)
    .filter(name => !inventory.some(item => item.feature === name && item.requiredFilesPresent && item.adapterPresent));
  if (missingInventory.length) failures.push(`inventory missing complete feature entries: ${missingInventory.join(', ')}`);
}

if (failures.length) {
  console.error('Feature modules closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Feature modules closure audit passed ✅');
