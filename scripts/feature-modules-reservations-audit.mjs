import fs from 'node:fs';

const exists = file => fs.existsSync(file);
const read = file => fs.readFileSync(file, 'utf8');

const featureDir = 'apps/web/public/assets/js/professional/features/reservations';
const requiredFiles = [
  'constants.mjs',
  'repository.mjs',
  'validators.mjs',
  'render.mjs',
  'actions.mjs',
  'index.mjs'
].map(file => `${featureDir}/${file}`);

const adapterPath = 'apps/web/public/assets/js/professional/adapters/reservations-feature-adapter.js';
const appEntryPath = 'apps/web/public/assets/js/professional/app-entry.mjs';
const indexPath = 'apps/web/public/index.html';
const reservationCorePath = 'apps/web/public/assets/js/modules/08a-reservation-core.js';
const reservationModalPath = 'apps/web/public/assets/js/modules/08b-reservation-modal-print.js';
const reservationEventsPath = 'apps/web/public/assets/js/modules/08c-reservation-page-events.js';

const failures = [];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`missing reservations feature file: ${file}`);
}

if (!exists(adapterPath)) failures.push(`missing reservations feature adapter: ${adapterPath}`);

const featureIndex = exists(`${featureDir}/index.mjs`) ? read(`${featureDir}/index.mjs`) : '';
const adapter = exists(adapterPath) ? read(adapterPath) : '';
const appEntry = read(appEntryPath);
const indexHtml = read(indexPath);
const reservationCore = read(reservationCorePath);
const reservationModal = read(reservationModalPath);
const reservationEvents = read(reservationEventsPath);

const requiredFeatureTokens = [
  'reservationsFeature',
  'RESERVATION_FEATURE_NAME',
  'reservationsRepository',
  'createReservationActions',
  'normalizeReservation',
  'validateReservation',
  'dateRangesOverlap',
  'isRoomReservedByActiveReservation',
  'calculateNights',
  'calculateReservationTotals',
  'getNextReservationNumber',
  'getReservationRooms'
];

for (const token of requiredFeatureTokens) {
  if (!featureIndex.includes(token) && !adapter.includes(token)) {
    failures.push(`reservations feature missing token: ${token}`);
  }
}

const requiredIntegrationTokens = [
  ['app-entry imports reservations feature', appEntry, "features/reservations/index.mjs"],
  ['app-entry exposes reservations feature', appEntry, 'reservations: reservationsFeature'],
  ['index loads reservations adapter', indexHtml, 'reservations-feature-adapter.js'],
  ['core uses reservations feature helper', reservationCore, 'function reservationsFeature()'],
  ['core read via feature repository', reservationCore, 'feature?.repository?.read'],
  ['core write via feature repository', reservationCore, 'feature?.repository?.write'],
  ['core hotel reservations via feature repository', reservationCore, 'feature?.repository?.forHotel'],
  ['core byId via feature repository', reservationCore, 'feature?.repository?.byId'],
  ['core date overlap via feature selector', reservationCore, 'feature?.selectors?.dateRangesOverlap'],
  ['core room availability via feature selector', reservationCore, 'feature?.selectors?.isRoomReservedByActiveReservation'],
  ['core totals via feature selector', reservationCore, 'feature?.selectors?.calculateReservationTotals'],
  ['modal sorting via feature selector', reservationModal, 'sortReservationsByNewest'],
  ['events confirm via feature action', reservationEvents, 'feature?.actions?.confirm'],
  ['events cancel via feature action', reservationEvents, 'feature?.actions?.cancel']
];

for (const [label, source, token] of requiredIntegrationTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

if (failures.length) {
  console.error('Reservations feature module audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Reservations feature module audit passed ✅');
