import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const guests = read('apps/web/public/assets/js/modules/09a-guests.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));
const ar = JSON.parse(read('apps/web/public/locales/ar.json'));
const en = JSON.parse(read('apps/web/public/locales/en.json'));

const requiredGuestTokens = [
  'data-ui-centralized="phase102-guests"',
  'function renderGuestsSectionHead',
  'function renderGuestsActions',
  'function renderGuestsSurface',
  'function renderGuestsField',
  'function renderGuestMetricCard',
  'function renderGuestMetaItem',
  'function renderGuestFilterPanel',
  'function renderGuestCard',
  'ui.renderSectionHead',
  'ui.renderActions',
  'ui.renderSurface',
  'ui.renderField',
  'ui.renderMetricCard',
  'data-ui-component="guests-page-head"',
  'data-ui-component="guests-summary-grid"',
  'data-ui-component="guests-summary-card"',
  "component: 'guests-filter-panel'",
  "component: 'guests-list-panel'",
  'data-ui-component="guests-list"',
  'data-ui-component="guest-card"',
  'data-ui-component="guest-meta-grid"',
  "'guest-card-actions'",
  'data-ui-component="guest-modal-card"'
];
for (const token of requiredGuestTokens) {
  assert(guests.includes(token), `guests page missing central token: ${token}`);
}

const forbiddenLegacyBlocks = [
  '<div class="section-head">',
  '<div class="filters-bar compact-filters-bar guests-filters-bar">',
  '<article class="guest-summary-card guest-summary-card--${h(item.key)}">',
  '${sorted.map(entry => {',
  '<div class="guest-meta-item">${icon(\'receipt\')}',
  '<button class="btn ghost" type="button" data-action="close-guest-modal"'
];
for (const token of forbiddenLegacyBlocks) {
  assert(!guests.includes(token), `legacy guests template remains: ${token}`);
}

const guestsTableBody = guests.slice(guests.indexOf('function renderGuestsTable'), guests.indexOf('function getGuestEntryById'));
assert(guestsTableBody.includes('sorted.map(entry => renderGuestCard(entry, roomColorMap))'), 'Guest list must render through renderGuestCard helper.');
assert(!/<button class="btn/.test(guestsTableBody), 'Guest card list body must not create raw buttons.');
assert(!/<span class="guest-stay-badge guest-stay-badge--\$\{h\(entry\.stayStatus\)\}/.test(guestsTableBody), 'Guest card list body must not create raw stay badges.');

for (const token of [
  'function renderSectionHead',
  'function renderActions',
  'function renderSurface',
  'function renderMetricCard',
  'function renderField',
  'renderSectionHead,',
  'renderActions,',
  'renderSurface,',
  'renderMetricCard,',
  'renderField,'
]) {
  assert(adapter.includes(token), `FandqiUI adapter missing guests central component: ${token}`);
}

for (const token of [
  'Phase 102: guests page 100% component centralization',
  '.guests-central-page .guests-central-head',
  '.guests-central-page .guest-summary-grid[data-ui-component="guests-summary-grid"]',
  '.guests-central-page .guest-summary-card[data-ui-component="guests-summary-card"]',
  '.guests-central-page .guests-central-filter-panel[data-ui-component="guests-filter-panel"]',
  '.guests-central-page .guest-card[data-ui-component="guest-card"]',
  '.guests-central-page .guest-card-actions--central[data-ui-component="guest-card-actions"]',
  '.guest-modal-card-central[data-ui-component="guest-modal-card"]'
]) {
  assert(css.includes(token), `Phase 102 guests CSS missing: ${token}`);
}

assert(ar.guests?.pageHint, 'ar guests.pageHint is missing.');
assert(en.guests?.pageHint, 'en guests.pageHint is missing.');
assert(packageJson.scripts?.['guests-central:closure-audit'], 'package.json missing guests-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('guests-central:closure-audit'), 'quality:full must include guests-central:closure-audit.');

if (failures.length) {
  console.error('Guests central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Guests central closure audit passed ✅');
