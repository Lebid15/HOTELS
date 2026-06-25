import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const page = read('apps/web/public/assets/js/modules/08c-reservation-page-events.js');
const modal = read('apps/web/public/assets/js/modules/08b-reservation-modal-print.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));
const ar = JSON.parse(read('apps/web/public/locales/ar.json'));
const en = JSON.parse(read('apps/web/public/locales/en.json'));

const requiredPageTokens = [
  'data-ui-centralized="phase100-reservations"',
  'function renderReservationPageSectionHead',
  'function renderReservationPageActions',
  'function renderReservationField',
  'function renderReservationFilterPanel',
  'function renderReservationNoRoomsWarning',
  'ui.renderSectionHead',
  'ui.renderActions',
  'ui.renderField',
  'ui.renderSurface',
  'ui.renderMetricCard',
  'data-ui-component="reservations-page-head"',
  'data-ui-component="reservations-page-actions"',
  'data-ui-component="reservations-summary-grid"',
  'data-ui-component="reservations-summary-card"',
  'data-ui-component="reservations-filter-panel"',
  'data-ui-component="reservations-list-slot"'
];
for (const token of requiredPageTokens) assert(page.includes(token), `reservations page missing central token: ${token}`);

const requiredModalTokens = [
  'function renderReservationActionsRow',
  'function renderReservationMetaItem',
  'function renderReservationStatBox',
  'function renderReservationCard',
  'sortedReservations.map(renderReservationCard)',
  'ui.renderSurface',
  'ui.renderActions',
  'ui.renderTabs',
  'ui.renderMetricCard',
  'data-ui-component="reservation-card"',
  'data-ui-component="reservation-card-actions"',
  'data-ui-component="reservation-meta-grid"',
  'data-ui-component="reservation-stats-row"',
  'data-ui-component="reservation-form-modal"',
  'data-ui-component="reservation-details-modal"',
  'data-ui-component="reservation-success-modal"',
  'data-ui-component="reservation-detail-tabs"',
  'data-ui-component="reservation-overview-card"'
];
for (const token of requiredModalTokens) assert(modal.includes(token), `reservations modal/list missing central token: ${token}`);

const forbiddenLegacyPageBlocks = [
  '<div class="section-head">',
  '<div class="filters-bar compact-filters-bar reservations-filters-bar">',
  '<article class="reservation-summary-card reservation-summary-card--${h(item.key)}">',
  '${sortedReservations.map(reservation => {'
];
for (const token of forbiddenLegacyPageBlocks) {
  assert(!(`${page}\n${modal}`).includes(token), `legacy reservations template remains: ${token}`);
}

for (const token of [
  'function renderSectionHead',
  'function renderActions',
  'function renderSurface',
  'function renderMetricCard',
  'function renderField',
  'function renderTabs',
  'renderSectionHead,',
  'renderActions,',
  'renderSurface,',
  'renderMetricCard,',
  'renderField,',
  'renderTabs,'
]) {
  assert(adapter.includes(token), `FandqiUI adapter missing reservation central component: ${token}`);
}

for (const token of [
  'Phase 100: reservations page 100% component centralization',
  '.reservation-central-page .reservations-central-head[data-ui-component="reservations-page-head"]',
  '.reservation-central-page .reservation-summary-grid[data-ui-component="reservations-summary-grid"]',
  '.reservation-central-page .reservation-central-filter-panel[data-ui-component="reservations-filter-panel"]',
  '.reservation-central-page .reservation-cards-grid--central[data-ui-component="reservations-list"]',
  '.reservation-central-page .reservation-card[data-ui-component="reservation-card"]',
  '.reservation-central-page .reservation-card-actions--central[data-ui-component="reservation-card-actions"]',
  '.reservation-central-modal[data-ui-component]'
]) {
  assert(css.includes(token), `Phase 100 reservations CSS missing: ${token}`);
}

assert(ar.reservation?.pageDescription, 'ar reservation.pageDescription is missing.');
assert(en.reservation?.pageDescription, 'en reservation.pageDescription is missing.');
assert(ar.reservation?.page?.kicker, 'ar reservation.page.kicker is missing.');
assert(en.reservation?.page?.kicker, 'en reservation.page.kicker is missing.');
assert(packageJson.scripts?.['reservations-central:closure-audit'], 'package.json missing reservations-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('reservations-central:closure-audit'), 'quality:full must include reservations-central:closure-audit.');

if (failures.length) {
  console.error('Reservations central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Reservations central closure audit passed ✅');
