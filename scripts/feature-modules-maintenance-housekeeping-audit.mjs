import fs from 'node:fs';

const exists = file => fs.existsSync(file);
const read = file => fs.readFileSync(file, 'utf8');

const failures = [];

const featureGroups = [
  ['maintenance', 'apps/web/public/assets/js/professional/features/maintenance'],
  ['housekeeping', 'apps/web/public/assets/js/professional/features/housekeeping']
];

for (const [name, dir] of featureGroups) {
  for (const file of ['constants.mjs', 'repository.mjs', 'validators.mjs', 'render.mjs', 'actions.mjs', 'index.mjs']) {
    const path = `${dir}/${file}`;
    if (!exists(path)) failures.push(`missing ${name} feature file: ${path}`);
  }
}

const maintenanceIndex = exists('apps/web/public/assets/js/professional/features/maintenance/index.mjs')
  ? read('apps/web/public/assets/js/professional/features/maintenance/index.mjs')
  : '';
const housekeepingIndex = exists('apps/web/public/assets/js/professional/features/housekeeping/index.mjs')
  ? read('apps/web/public/assets/js/professional/features/housekeeping/index.mjs')
  : '';
const maintenanceAdapter = exists('apps/web/public/assets/js/professional/adapters/maintenance-feature-adapter.js')
  ? read('apps/web/public/assets/js/professional/adapters/maintenance-feature-adapter.js')
  : '';
const housekeepingAdapter = exists('apps/web/public/assets/js/professional/adapters/housekeeping-feature-adapter.js')
  ? read('apps/web/public/assets/js/professional/adapters/housekeeping-feature-adapter.js')
  : '';
const appEntry = read('apps/web/public/assets/js/professional/app-entry.mjs');
const indexHtml = read('apps/web/public/index.html');
const maintenanceModule = read('apps/web/public/assets/js/modules/10a-maintenance.js');
const housekeepingModule = read('apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js');

const requiredMaintenanceTokens = [
  'maintenanceFeature',
  'MAINTENANCE_FEATURE_NAME',
  'maintenanceTicketsRepository',
  'createMaintenanceActions',
  'normalizeMaintenanceTicket',
  'validateMaintenanceTicket',
  'getMaintenanceActiveStatuses',
  'generateMaintenanceTicketNo',
  'summarizeMaintenanceTickets',
  'sortMaintenanceTickets',
  'ensureTicketForRoom',
  'ensureTicketsForMaintenanceRooms'
];

for (const token of requiredMaintenanceTokens) {
  if (!maintenanceIndex.includes(token) && !maintenanceAdapter.includes(token)) {
    failures.push(`maintenance feature missing token: ${token}`);
  }
}

const requiredHousekeepingTokens = [
  'housekeepingFeature',
  'HOUSEKEEPING_FEATURE_NAME',
  'housekeepingRepository',
  'createHousekeepingActions',
  'normalizeHousekeepingText',
  'validateRoomStatusChange',
  'getReservationsByRoom',
  'getLastReservationForRoom',
  'summarizeHousekeepingRooms',
  'sortHousekeepingRooms',
  'filterHousekeepingRooms',
  'updateRoomStatus'
];

for (const token of requiredHousekeepingTokens) {
  if (!housekeepingIndex.includes(token) && !housekeepingAdapter.includes(token)) {
    failures.push(`housekeeping feature missing token: ${token}`);
  }
}

const requiredIntegrationTokens = [
  ['app-entry imports maintenance feature', appEntry, "features/maintenance/index.mjs"],
  ['app-entry imports housekeeping feature', appEntry, "features/housekeeping/index.mjs"],
  ['app-entry exposes maintenance feature', appEntry, 'maintenance: maintenanceFeature'],
  ['app-entry exposes housekeeping feature', appEntry, 'housekeeping: housekeepingFeature'],
  ['index loads maintenance adapter', indexHtml, 'maintenance-feature-adapter.js'],
  ['index loads housekeeping adapter', indexHtml, 'housekeeping-feature-adapter.js'],
  ['maintenance module has feature helper', maintenanceModule, 'function maintenanceFeature()'],
  ['maintenance module reads via feature repository', maintenanceModule, 'feature?.repository?.read'],
  ['maintenance module writes via feature repository', maintenanceModule, 'feature?.repository?.write'],
  ['maintenance module uses feature hotel repository', maintenanceModule, 'feature?.repository?.forHotel'],
  ['maintenance module uses feature byId', maintenanceModule, 'feature?.repository?.byId'],
  ['maintenance module uses feature active statuses', maintenanceModule, 'feature?.selectors?.getMaintenanceActiveStatuses'],
  ['maintenance module uses feature ticket generator', maintenanceModule, 'feature?.selectors?.generateMaintenanceTicketNo'],
  ['maintenance module uses feature summary', maintenanceModule, 'feature?.selectors?.summarizeMaintenanceTickets'],
  ['maintenance module uses feature sorter', maintenanceModule, 'feature?.selectors?.sortMaintenanceTickets'],
  ['maintenance module uses ensureTicketForRoom action', maintenanceModule, 'feature?.actions?.ensureTicketForRoom'],
  ['maintenance module uses ensureTicketsForMaintenanceRooms action', maintenanceModule, 'feature?.actions?.ensureTicketsForMaintenanceRooms'],
  ['maintenance module uses setStatus action', maintenanceModule, 'feature?.actions?.setStatus'],
  ['housekeeping module has feature helper', housekeepingModule, 'function housekeepingFeature()'],
  ['housekeeping module uses normalizer', housekeepingModule, 'feature?.validators?.normalizeHousekeepingText'],
  ['housekeeping module uses reservations by room selector', housekeepingModule, 'feature?.selectors?.getReservationsByRoom'],
  ['housekeeping module uses last reservation selector', housekeepingModule, 'feature?.selectors?.getLastReservationForRoom'],
  ['housekeeping module uses filter selector', housekeepingModule, 'feature?.selectors?.filterHousekeepingRooms'],
  ['housekeeping module uses summary selector', housekeepingModule, 'feature?.selectors?.summarizeHousekeepingRooms'],
  ['housekeeping module uses updateRoomStatus action', housekeepingModule, 'feature?.actions?.updateRoomStatus'],
  ['housekeeping module uses markClean action', housekeepingModule, 'feature?.actions?.markClean'],
  ['housekeeping module uses sendToMaintenance action', housekeepingModule, 'feature?.actions?.sendToMaintenance']
];

for (const [label, source, token] of requiredIntegrationTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

if (failures.length) {
  console.error('Maintenance & Housekeeping feature module audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Maintenance & Housekeeping feature module audit passed ✅');
