import fs from 'node:fs';

const exists = file => fs.existsSync(file);
const read = file => fs.readFileSync(file, 'utf8');

const failures = [];

const featureGroups = [
  ['guests', 'apps/web/public/assets/js/professional/features/guests'],
  ['checkio', 'apps/web/public/assets/js/professional/features/checkio']
];

for (const [name, dir] of featureGroups) {
  for (const file of ['constants.mjs', 'repository.mjs', 'validators.mjs', 'render.mjs', 'actions.mjs', 'index.mjs']) {
    const path = `${dir}/${file}`;
    if (!exists(path)) failures.push(`missing ${name} feature file: ${path}`);
  }
}

const guestsIndex = exists('apps/web/public/assets/js/professional/features/guests/index.mjs')
  ? read('apps/web/public/assets/js/professional/features/guests/index.mjs')
  : '';
const checkioIndex = exists('apps/web/public/assets/js/professional/features/checkio/index.mjs')
  ? read('apps/web/public/assets/js/professional/features/checkio/index.mjs')
  : '';
const guestsAdapter = exists('apps/web/public/assets/js/professional/adapters/guests-feature-adapter.js')
  ? read('apps/web/public/assets/js/professional/adapters/guests-feature-adapter.js')
  : '';
const checkioAdapter = exists('apps/web/public/assets/js/professional/adapters/checkio-feature-adapter.js')
  ? read('apps/web/public/assets/js/professional/adapters/checkio-feature-adapter.js')
  : '';
const appEntry = read('apps/web/public/assets/js/professional/app-entry.mjs');
const indexHtml = read('apps/web/public/index.html');
const guestsModule = read('apps/web/public/assets/js/modules/09a-guests.js');
const checkioModule = read('apps/web/public/assets/js/modules/09b-check-in-out.js');

const requiredGuestsTokens = [
  'guestsFeature',
  'GUESTS_FEATURE_NAME',
  'guestsRepository',
  'createGuestActions',
  'normalizeGuestText',
  'normalizeGuestRoomColorPart',
  'validateGuestEntry',
  'getGuestStayStatus',
  'getGuestAmountDue',
  'getGuestDocumentTypeList',
  'buildGuestRoomColorMap',
  'compareGuestsByRoomGroup',
  'summarizeGuests',
  'filterGuests'
];

for (const token of requiredGuestsTokens) {
  if (!guestsIndex.includes(token) && !guestsAdapter.includes(token)) {
    failures.push(`guests feature missing token: ${token}`);
  }
}

const requiredCheckioTokens = [
  'checkioFeature',
  'CHECKIO_FEATURE_NAME',
  'checkioRepository',
  'createCheckioActions',
  'normalizeCheckInOutText',
  'validateCheckioAction',
  'getReservationAmountDue',
  'getReservationTimelineStatus',
  'getReservationGuestsSummary',
  'filterCheckInOutReservations',
  'summarizeCheckInOut',
  'updateRoomStatus'
];

for (const token of requiredCheckioTokens) {
  if (!checkioIndex.includes(token) && !checkioAdapter.includes(token)) {
    failures.push(`checkio feature missing token: ${token}`);
  }
}

const requiredIntegrationTokens = [
  ['app-entry imports guests feature', appEntry, "features/guests/index.mjs"],
  ['app-entry imports checkio feature', appEntry, "features/checkio/index.mjs"],
  ['app-entry exposes guests feature', appEntry, 'guests: guestsFeature'],
  ['app-entry exposes checkio feature', appEntry, 'checkio: checkioFeature'],
  ['index loads guests adapter', indexHtml, 'guests-feature-adapter.js'],
  ['index loads checkio adapter', indexHtml, 'checkio-feature-adapter.js'],
  ['guests module has feature helper', guestsModule, 'function guestsFeature()'],
  ['guests module uses stay status selector', guestsModule, 'feature?.selectors?.getGuestStayStatus'],
  ['guests module uses amount due selector', guestsModule, 'feature?.selectors?.getGuestAmountDue'],
  ['guests module uses document selector', guestsModule, 'feature?.selectors?.getGuestDocumentTypeList'],
  ['guests module uses room color map selector', guestsModule, 'feature?.selectors?.buildGuestRoomColorMap'],
  ['guests module uses compare selector', guestsModule, 'feature?.selectors?.compareGuestsByRoomGroup'],
  ['guests module uses summary selector', guestsModule, 'feature?.selectors?.summarizeGuests'],
  ['guests module uses filter selector', guestsModule, 'feature?.selectors?.filterGuests'],
  ['guests module uses room color validator', guestsModule, 'feature?.validators?.normalizeGuestRoomColorPart'],
  ['checkio module has feature helper', checkioModule, 'function checkioFeature()'],
  ['checkio module uses text normalizer', checkioModule, 'feature?.validators?.normalizeCheckInOutText'],
  ['checkio module uses amount due selector', checkioModule, 'feature?.selectors?.getReservationAmountDue'],
  ['checkio module uses timeline selector', checkioModule, 'feature?.selectors?.getReservationTimelineStatus'],
  ['checkio module uses guests summary selector', checkioModule, 'feature?.selectors?.getReservationGuestsSummary'],
  ['checkio module uses filter selector', checkioModule, 'feature?.selectors?.filterCheckInOutReservations'],
  ['checkio module uses summary selector', checkioModule, 'feature?.selectors?.summarizeCheckInOut'],
  ['checkio module uses update room action', checkioModule, 'feature?.actions?.updateRoomStatus'],
  ['checkio module uses checkin action', checkioModule, 'feature?.actions?.checkIn'],
  ['checkio module uses checkout action', checkioModule, 'feature?.actions?.checkOut']
];

for (const [label, source, token] of requiredIntegrationTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

if (failures.length) {
  console.error('Guests & Check-in/out feature module audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Guests & Check-in/out feature module audit passed ✅');
