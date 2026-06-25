import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const owner = read('apps/web/public/assets/js/modules/03d-platform-owner-executive-restructure.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

for (const token of [
  'const PLATFORM_OWNER_HOTELS_MANAGERS_CENTRAL_AUDIT_MARKERS',
  'data-ui-centralized="phase110-platform-owner-hotels-managers"',
  'data-ui-page="platform-owner-hotels"',
  'data-ui-page="platform-owner-managers"',
  'function poOwnerFilterField',
  'function poOwnerEntityActionButton',
  'function poOwnerEntityCard',
  'function poOwnerMetaGrid',
  'function poOwnerHotelCard',
  'function poOwnerManagerCard',
  'ui.renderField',
  'ui.renderButton',
  'ui.renderCard',
  'ui.renderEmptyState',
  "component: 'owner-hotels-page-head'",
  "component: 'owner-managers-page-head'",
  'owner-hotels-filter-grid',
  'owner-managers-filter-grid',
  "component: 'owner-hotels-filter-field'",
  "component: 'owner-managers-filter-field'",
  "component: 'owner-hotel-card'",
  "component: 'owner-manager-card'",
  "component: 'owner-hotel-card-action'",
  "component: 'owner-manager-card-action'",
  'data-ui-component="owner-hotels-cards-grid"',
  'data-ui-component="owner-managers-cards-grid"',
  'owner-hotels-empty-state',
  'owner-managers-empty-state'
]) {
  assert(owner.includes(token), `platform owner hotels/managers missing central token: ${token}`);
}

const hotelsStart = owner.indexOf('function renderHotelsPage');
const hotelsEnd = owner.indexOf('\nfunction poOwnerManagerCard', hotelsStart + 10);
const hotelsSource = hotelsStart >= 0 ? owner.slice(hotelsStart, hotelsEnd > hotelsStart ? hotelsEnd : owner.length) : '';
assert(Boolean(hotelsSource), 'missing renderHotelsPage source');
for (const token of [
  '<div class="section-head">',
  '<div class="filters-bar">',
  '<button class="btn primary"',
  '<article class="platform-owner-card',
  '<button class="btn small ghost"',
  '<button class="btn small danger"'
]) {
  assert(!hotelsSource.includes(token), `hotels page source still contains legacy raw block: ${token}`);
}

const managersStart = owner.indexOf('function renderManagersPage');
const managersEnd = owner.indexOf('\nfunction renderPackagesTable', managersStart + 10);
const managersSource = managersStart >= 0 ? owner.slice(managersStart, managersEnd > managersStart ? managersEnd : owner.length) : '';
assert(Boolean(managersSource), 'missing renderManagersPage source');
for (const token of [
  '<div class="section-head">',
  '<div class="filters-bar">',
  '<article class="platform-owner-card',
  '<button class="btn small ghost"'
]) {
  assert(!managersSource.includes(token), `managers page source still contains legacy raw block: ${token}`);
}

for (const token of [
  'Phase 110: platform owner hotels and managers 100% component centralization',
  '.owner-hotels-central-page[data-ui-centralized="phase110-platform-owner-hotels-managers"]',
  '.owner-managers-central-page[data-ui-centralized="phase110-platform-owner-hotels-managers"]',
  '.owner-hotels-central-page .owner-central-hero[data-ui-component="owner-hotels-page-head"]',
  '.owner-managers-central-page .owner-central-hero[data-ui-component="owner-managers-page-head"]',
  '.owner-hotels-central-page .owner-filter-bar[data-ui-component="owner-hotels-filter-grid"]',
  '.owner-managers-central-page .owner-filter-bar[data-ui-component="owner-managers-filter-grid"]',
  '.owner-hotels-central-page .owner-filter-field[data-ui-component="owner-hotels-filter-field"]',
  '.owner-managers-central-page .owner-filter-field[data-ui-component="owner-managers-filter-field"]',
  '.owner-hotels-central-page [data-ui-component="owner-hotels-cards-grid"]',
  '.owner-managers-central-page [data-ui-component="owner-managers-cards-grid"]',
  '.owner-hotels-central-page .owner-entity-card[data-ui-component="owner-hotel-card"]',
  '.owner-managers-central-page .owner-entity-card[data-ui-component="owner-manager-card"]',
  '.owner-hotels-central-page [data-ui-component="owner-hotels-table-slot"]',
  '.owner-managers-central-page [data-ui-component="owner-managers-table-slot"]'
]) assert(css.includes(token), `Phase 110 owner hotels/managers CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['platform-owner-hotels-managers-central:closure-audit'], 'package.json missing platform-owner-hotels-managers-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('platform-owner-hotels-managers-central:closure-audit'), 'quality:full must include platform-owner-hotels-managers-central:closure-audit.');

if (failures.length) {
  console.error('Platform owner hotels/managers central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Platform owner hotels/managers central closure audit passed ✅');
