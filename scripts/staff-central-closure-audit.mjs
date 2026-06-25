import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const staff = read('apps/web/public/assets/js/modules/05-staff.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));
const ar = JSON.parse(read('apps/web/public/locales/ar.json'));
const en = JSON.parse(read('apps/web/public/locales/en.json'));

const requiredStaffTokens = [
  'data-ui-centralized="phase97-staff"',
  'function renderStaffSectionHead',
  'function renderStaffActions',
  'function renderStaffSurface',
  'function renderStaffField',
  'function renderStaffFormGrid',
  'function renderStaffPanelTitle',
  'function renderStaffMetricCard',
  'function renderStaffMetaItem',
  'function renderStaffCard',
  'function renderStaffFilterPanel',
  'ui.renderSectionHead',
  'ui.renderActions',
  'ui.renderSurface',
  'ui.renderField',
  'ui.renderFormGrid',
  'ui.renderPanelTitle',
  'ui.renderMetricCard',
  'data-ui-component="staff-page-head"',
  'data-ui-component="staff-summary-grid"',
  'data-ui-component="staff-summary-card"',
  'data-ui-component="staff-filter-panel"',
  'data-ui-component="staff-card"',
  "'staff-card-actions'",
  'data-ui-component="staff-modal-card"',
  'data-ui-component="staff-field"'
];
for (const token of requiredStaffTokens) {
  assert(staff.includes(token), `staff page missing central token: ${token}`);
}

const forbiddenLegacyBlocks = [
  '<div class="section-head">',
  '<div class="filters-bar compact-filters-bar staff-filters-bar">',
  '<article class="staff-summary-card staff-summary-card--${h(item.key)}">',
  '${sortedStaff.map(staff => `',
  '<article class="staff-card staff-card--${h(staff.status || \'active\')} staff-card--no-permissions">'
];
for (const token of forbiddenLegacyBlocks) {
  assert(!staff.includes(token), `legacy staff template remains: ${token}`);
}

const staffTableBody = staff.slice(staff.indexOf('function renderStaffTable'), staff.indexOf('function renderStaffFormModal'));
assert(staffTableBody.includes('sortedStaff.map(renderStaffCard)'), 'Staff cards list must render through renderStaffCard helper.');
assert(!/<button class="btn/.test(staffTableBody), 'Staff card table body must not create raw buttons.');
assert(!/<span class="status-badge/.test(staffTableBody), 'Staff card table body must not create raw badges.');

for (const token of [
  'function renderSectionHead',
  'function renderActions',
  'function renderSurface',
  'function renderMetricCard',
  'function renderField',
  'function renderFormGrid',
  'function renderPanelTitle',
  'renderSectionHead,',
  'renderActions,',
  'renderSurface,',
  'renderMetricCard,',
  'renderField,',
  'renderFormGrid,',
  'renderPanelTitle,'
]) {
  assert(adapter.includes(token), `FandqiUI adapter missing staff central component: ${token}`);
}

for (const token of [
  'Phase 97: staff page 100% component centralization',
  '.staff-central-page .staff-central-head',
  '.staff-central-page .staff-summary-grid[data-ui-component="staff-summary-grid"]',
  '.staff-central-page .staff-summary-card[data-ui-component="staff-summary-card"]',
  '.staff-central-page .staff-central-filter-panel[data-ui-component="staff-filter-panel"]',
  '.staff-central-page .staff-card[data-ui-component="staff-card"]',
  '.staff-central-page .staff-card-actions--central[data-ui-component="staff-card-actions"]',
  '.staff-modal-card-central[data-ui-component="staff-modal-card"]'
]) {
  assert(css.includes(token), `Phase 97 staff CSS missing: ${token}`);
}

assert(ar.staff?.pageDescription, 'ar staff.pageDescription is missing.');
assert(en.staff?.pageDescription, 'en staff.pageDescription is missing.');
assert(packageJson.scripts?.['staff-central:closure-audit'], 'package.json missing staff-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('staff-central:closure-audit'), 'quality:full must include staff-central:closure-audit.');

if (failures.length) {
  console.error('Staff central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Staff central closure audit passed ✅');
