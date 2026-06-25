import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const page = read('apps/web/public/assets/js/modules/09b-check-in-out.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));
const ar = JSON.parse(read('apps/web/public/locales/ar.json'));
const en = JSON.parse(read('apps/web/public/locales/en.json'));

const requiredTokens = [
  'data-ui-centralized="phase103-checkio"',
  'function renderCheckioSectionHead',
  'function renderCheckioSurface',
  'function renderCheckioActions',
  'function renderCheckioField',
  'function renderCheckioMetricCard',
  'function renderCheckioMetaItem',
  'function renderCheckioFilterPanel',
  'function renderCheckioReservationCard',
  'function getCheckioActionTone',
  'function getCheckioActionIcon',
  'ui.renderSectionHead',
  'ui.renderSurface',
  'ui.renderActions',
  'ui.renderField',
  'ui.renderMetricCard',
  'data-ui-component="checkio-page-head"',
  'data-ui-component="checkio-summary-grid"',
  'data-ui-component="checkio-summary-card"',
  "component: 'checkio-filter-panel'",
  "component: 'checkio-list-panel'",
  'data-ui-component="checkio-list"',
  'data-ui-component="checkio-card"',
  'data-ui-component="checkio-meta-grid"',
  "'checkio-card-actions'",
  'data-ui-component="checkio-card-footer"'
];
for (const token of requiredTokens) assert(page.includes(token), `check-in/out page missing central token: ${token}`);

const forbiddenLegacyBlocks = [
  '<div class="section-head">',
  '<div class="filters-bar compact-filters-bar checkio-filters-bar">',
  '<article class="guest-summary-card checkio-summary-card checkio-summary-card--${h(item.key)}">',
  '${sorted.map(reservation => {',
  '<div class="guest-meta-item">${icon(\'calendar\')}',
  '<div class="guest-card-actions checkio-card-actions row-actions">'
];
for (const token of forbiddenLegacyBlocks) assert(!page.includes(token), `legacy check-in/out template remains: ${token}`);

const cardFunction = page.slice(page.indexOf('function renderCheckioReservationCard'), page.indexOf('function renderCheckInOutCards'));
assert(cardFunction.includes('renderCheckioMetaItem'), 'Check-in/out card must render metadata through renderCheckioMetaItem.');
assert(cardFunction.includes('renderCheckioActionButtons'), 'Check-in/out card must render actions through central action helper.');
assert(!/<button class="btn/.test(cardFunction), 'Check-in/out card must not create raw buttons.');

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
]) assert(adapter.includes(token), `FandqiUI adapter missing check-in/out central component: ${token}`);

for (const token of [
  'Phase 103: check-in/out page 100% component centralization',
  '.checkio-central-page[data-ui-centralized="phase103-checkio"]',
  '.checkio-central-page .checkio-central-head[data-ui-component="checkio-page-head"]',
  '.checkio-central-page .checkio-summary-grid[data-ui-component="checkio-summary-grid"]',
  '.checkio-central-page .checkio-summary-card[data-ui-component="checkio-summary-card"]',
  '.checkio-central-page .checkio-central-filter-panel[data-ui-component="checkio-filter-panel"]',
  '.checkio-central-page .checkio-cards-grid[data-ui-component="checkio-list"]',
  '.checkio-central-page .checkio-card[data-ui-component="checkio-card"]',
  '.checkio-central-page .checkio-card-actions--central[data-ui-component="checkio-card-actions"]'
]) assert(css.includes(token), `Phase 103 check-in/out CSS missing: ${token}`);

assert(ar.checkInOut?.pageHint, 'ar checkInOut.pageHint is missing.');
assert(en.checkInOut?.pageHint, 'en checkInOut.pageHint is missing.');
assert(ar.checkInOut?.tabs?.arrivals, 'ar checkInOut tabs are missing.');
assert(en.checkInOut?.tabs?.arrivals, 'en checkInOut tabs are missing.');
assert(packageJson.scripts?.['checkio-central:closure-audit'], 'package.json missing checkio-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('checkio-central:closure-audit'), 'quality:full must include checkio-central:closure-audit.');

if (failures.length) {
  console.error('Check-in/out central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Check-in/out central closure audit passed ✅');
