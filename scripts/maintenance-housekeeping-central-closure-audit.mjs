import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const housekeeping = read('apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js');
const maintenance = read('apps/web/public/assets/js/modules/10a-maintenance.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

const housekeepingTokens = [
  'data-ui-centralized="phase105-housekeeping"',
  'function renderHousekeepingSectionHead',
  'function renderHousekeepingMetricCard',
  'function renderHousekeepingSurface',
  'function renderHousekeepingField',
  'function renderHousekeepingMetaItem',
  'ui.renderSectionHead',
  'ui.renderMetricCard',
  'ui.renderSurface',
  'ui.renderField',
  'data-ui-component="housekeeping-page-head"',
  'data-ui-component="housekeeping-summary-grid"',
  'data-ui-component="housekeeping-summary-card"',
  'component: \'housekeeping-filter-panel\'',
  'data-ui-component="housekeeping-card"',
  'data-ui-component="housekeeping-meta-grid"',
  'data-ui-component="housekeeping-card-actions"'
];
for (const token of housekeepingTokens) assert(housekeeping.includes(token), `housekeeping page missing central token: ${token}`);

const maintenanceTokens = [
  'data-ui-centralized="phase105-maintenance"',
  'function renderMaintenanceSectionHead',
  'function renderMaintenanceMetricCard',
  'function renderMaintenanceSurface',
  'function renderMaintenanceField',
  'function renderMaintenanceFormGrid',
  'function renderMaintenanceMetaItem',
  'ui.renderSectionHead',
  'ui.renderMetricCard',
  'ui.renderSurface',
  'ui.renderField',
  'ui.renderFormGrid',
  'data-ui-component="maintenance-page-head"',
  'data-ui-component="maintenance-summary-grid"',
  'data-ui-component="maintenance-summary-card"',
  'component: \'maintenance-filter-panel\'',
  'data-ui-component="maintenance-card"',
  'data-ui-component="maintenance-meta-grid"',
  'data-ui-component="maintenance-card-actions"',
  'data-ui-component="maintenance-modal"'
];
for (const token of maintenanceTokens) assert(maintenance.includes(token), `maintenance page missing central token: ${token}`);

const forbiddenHousekeeping = [
  '<div class="section-head">',
  '<div class="filters-bar compact-filters-bar housekeeping-filters-bar">',
  '<article class="guest-summary-card housekeeping-summary-card housekeeping-summary-card--${h(item.key)}">',
  '<div class="guest-meta-item">${icon(\'dashboard\')}'
];
for (const token of forbiddenHousekeeping) assert(!housekeeping.includes(token), `legacy housekeeping template remains: ${token}`);

const forbiddenMaintenance = [
  '<div class="section-head">',
  '<div class="filters-bar compact-filters-bar maintenance-filters-bar">',
  '<article class="guest-summary-card maintenance-summary-card maintenance-summary-card--${h(item.key)}">',
  '<div class="guest-meta-item">${icon(\'calendar\')}',
  '<div class="modal-grid compact-modal-grid">',
  '<button class="btn primary" type="submit">'
];
for (const token of forbiddenMaintenance) assert(!maintenance.includes(token), `legacy maintenance template remains: ${token}`);

const housekeepingCardFunction = housekeeping.slice(housekeeping.indexOf('function renderHousekeepingRooms'), housekeeping.indexOf('function renderHousekeepingPage'));
assert(housekeepingCardFunction.includes('renderHousekeepingMetaItem'), 'Housekeeping cards must render metadata through renderHousekeepingMetaItem.');
assert(housekeepingCardFunction.includes('renderHousekeepingActionButtons'), 'Housekeeping cards must render actions through central helper.');
assert(!/<button class="btn/.test(housekeepingCardFunction), 'Housekeeping cards must not create raw buttons.');

const maintenanceCardFunction = maintenance.slice(maintenance.indexOf('function renderMaintenanceTickets'), maintenance.indexOf('function renderMaintenanceModal'));
assert(maintenanceCardFunction.includes('renderMaintenanceMetaItem'), 'Maintenance cards must render metadata through renderMaintenanceMetaItem.');
assert(maintenanceCardFunction.includes('renderMaintenanceActionButtons'), 'Maintenance cards must render actions through central helper.');
assert(!/<button class="btn/.test(maintenanceCardFunction), 'Maintenance cards must not create raw buttons.');

for (const token of [
  'function renderSectionHead',
  'function renderSurface',
  'function renderMetricCard',
  'function renderField',
  'function renderFormGrid',
  'renderSectionHead,',
  'renderSurface,',
  'renderMetricCard,',
  'renderField,',
  'renderFormGrid,'
]) assert(adapter.includes(token), `FandqiUI adapter missing central component: ${token}`);

for (const token of [
  'Phase 105: housekeeping + maintenance 100% component centralization',
  '.housekeeping-central-page[data-ui-centralized="phase105-housekeeping"]',
  '.maintenance-central-page[data-ui-centralized="phase105-maintenance"]',
  '.housekeeping-central-page .housekeeping-summary-card',
  '.maintenance-central-page .maintenance-summary-card',
  '.housekeeping-central-page .housekeeping-central-filter-panel',
  '.maintenance-central-page .maintenance-central-filter-panel',
  '.housekeeping-central-page .housekeeping-central-card',
  '.maintenance-central-page .maintenance-central-card',
  '.housekeeping-central-page .housekeeping-card-actions--central',
  '.maintenance-central-page .maintenance-card-actions--central',
  '.maintenance-central-page .maintenance-modal-card--central'
]) assert(css.includes(token), `Phase 105 CSS missing: ${token}`);

assert(packageJson.scripts?.['maintenance-housekeeping-central:closure-audit'], 'package.json missing maintenance-housekeeping-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('maintenance-housekeeping-central:closure-audit'), 'quality:full must include maintenance-housekeeping-central:closure-audit.');

if (failures.length) {
  console.error('Maintenance + housekeeping central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Maintenance + housekeeping central closure audit passed ✅');
