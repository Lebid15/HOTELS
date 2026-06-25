import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const rooms = read('apps/web/public/assets/js/modules/06-rooms-dashboard.js') + '\n' + read('apps/web/public/assets/js/modules/06c-rooms-floors-centralization.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const ar = JSON.parse(read('apps/web/public/locales/ar.json'));
const en = JSON.parse(read('apps/web/public/locales/en.json'));
const packageJson = JSON.parse(read('package.json'));

const requiredRoomTokens = [
  'data-ui-centralized="phase94-rooms"',
  'function renderRoomCentralButton',
  'function renderRoomsPageHead',
  'function renderRoomPageActions',
  'function renderRoomsFilterPanel',
  'function renderRoomsSurface',
  'function renderRoomField',
  'function renderRoomFormGrid',
  'function renderRoomsPanelTitle',
  'function renderRoomFloorsModal',
  'function openRoomFloorsModal',
  'id: \'editRoomFloorsBtn\'',
  'id="roomFloorsForm"',
  'writeHotelSettings(hotel.id, { floorsCount })',
  'ui.renderSectionHead',
  'ui.renderActions',
  'ui.renderSurface',
  'ui.renderField',
  'ui.renderFormGrid',
  'ui.renderPanelTitle',
  'ui.renderMetricCard',
  'ui.renderCard',
  'data-ui-component="rooms-page-head"',
  'data-ui-component="rooms-summary-grid"',
  'rooms-floor-overview-panel',
  'rooms-filter-panel',
  'rooms-floor-section',
  'data-ui-component="rooms-room-card"',
  'data-ui-component="rooms-floor-form-modal"'
];

for (const token of requiredRoomTokens) {
  assert(rooms.includes(token), `rooms page missing central token: ${token}`);
}

const requiredAdapterTokens = [
  'function renderSectionHead',
  'function renderActions',
  'function renderSurface',
  'function renderMetricCard',
  'function renderField',
  'function renderFormGrid',
  'function renderPanelTitle',
  'function renderCard',
  'renderSectionHead,',
  'renderActions,',
  'renderSurface,',
  'renderMetricCard,',
  'renderField,',
  'renderFormGrid,',
  'renderPanelTitle,',
  'renderCard,'
];
for (const token of requiredAdapterTokens) {
  assert(adapter.includes(token), `FandqiUI adapter missing rooms central component: ${token}`);
}

const forbiddenLegacyBlocks = [
  '<div class="section-head">',
  '<div class="workspace-filter-panel rooms-filter-panel"',
  '<div class="field"><label>${h(t(\'room.filters.search\'))}</label>',
  '<div class="form-section-title">${h(t(\'room.form.roomInfo\'))}</div>',
  '<article class="room-summary-card room-summary-card--${h(item.key)}">',
  '<article class="floor-overview-card">',
  '<article class="room-card room-card--${h(displayStatus || \'available\')}"'
];
for (const token of forbiddenLegacyBlocks) {
  assert(!rooms.includes(token), `legacy rooms template remains: ${token}`);
}

for (const token of [
  'Phase 94: rooms and floors component centralization closure',
  '.rooms-central-page .rooms-central-head',
  '.rooms-central-page .room-summary-grid',
  '.rooms-central-page .rooms-floor-overview-panel',
  '.rooms-central-page .rooms-central-filter-panel',
  '.rooms-floor-modal .rooms-used-floors-list'
]) {
  assert(css.includes(token), `Phase 94 rooms CSS missing ${token}`);
}

for (const key of ['page', 'floors']) {
  assert(ar.room?.[key], `ar room.${key} is missing`);
  assert(en.room?.[key], `en room.${key} is missing`);
}
for (const key of ['editAction', 'overviewTitle', 'modalTitle', 'countLabel', 'saveAction', 'savedToast']) {
  assert(ar.room?.floors?.[key], `ar room.floors.${key} is missing`);
  assert(en.room?.floors?.[key], `en room.floors.${key} is missing`);
}

assert(packageJson.scripts?.['rooms-central:closure-audit'], 'package.json missing rooms-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('rooms-central:closure-audit'), 'quality:full must include rooms-central:closure-audit.');

if (failures.length) {
  console.error('Rooms central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Rooms central closure audit passed ✅');
