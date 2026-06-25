import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const settings = read('apps/web/public/assets/js/modules/04-hotel-settings.js');
const tabs = read('apps/web/public/assets/js/modules/03a-platform-settings-auth-hotels-managers.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

const requiredSettingsTokens = [
  'data-ui-component="hotel-settings-page"',
  'function getHotelSettingsUi',
  'function renderHotelSettingsCentralButton',
  'function renderHotelSettingsPanelTitle',
  'function renderHotelSettingsField',
  'function renderHotelSettingsInput',
  'function renderHotelSettingsSelect',
  'function renderHotelSettingsTextarea',
  'function renderHotelSettingsCheck',
  'function renderHotelSettingsFormGrid',
  'function renderHotelSettingsPanel',
  'ui.renderSectionHead',
  'ui.renderSurface',
  'ui.renderField',
  'ui.renderFormGrid',
  'ui.renderPanelTitle',
  'ui.renderCheckField',
  'data-ui-component="hotel-settings-panel"',
  'data-ui-component="hotel-settings-form-grid"',
  'data-ui-component="hotel-settings-field"',
  'data-ui-component="hotel-settings-check-field"',
  'data-ui-component="hotel-settings-food-service-card"'
];

for (const token of requiredSettingsTokens) {
  assert(settings.includes(token), `hotel settings missing central token: ${token}`);
}

const requiredTabTokens = [
  'ui.renderTabs',
  'hotel-settings-central-tabs',
  'data-ui-component\': \'hotel-settings-tabs\'',
  'data-hotel-settings-tab'
];
for (const token of requiredTabTokens) {
  assert(tabs.includes(token), `hotel settings tabs missing central token: ${token}`);
}

const requiredAdapterTokens = [
  'function renderField',
  'function renderFormGrid',
  'function renderPanelTitle',
  'function renderCheckField',
  'renderField,',
  'renderFormGrid,',
  'renderPanelTitle,',
  'renderCheckField,'
];
for (const token of requiredAdapterTokens) {
  assert(adapter.includes(token), `FandqiUI adapter missing hotel settings component: ${token}`);
}

const forbiddenLegacyBlocks = [
  '<div class="section-head hotel-settings-title-head hotel-settings-toolbar-locked" data-layout-fixed="hotel-settings-title-only-head">',
  '<section class="${panelClass(\'identity\')} settings-logo-card"',
  '<section class="${panelClass(\'contact\')}"',
  '<section class="${panelClass(\'operation\')}"',
  '<section class="${panelClass(\'services\')}"',
  '<section class="${panelClass(\'policies\')}"',
  '<section class="${panelClass(\'billing\')}"',
  'const panelClass = tab =>'
];
for (const token of forbiddenLegacyBlocks) {
  assert(!settings.includes(token), `legacy hotel settings template remains: ${token}`);
}

for (const token of [
  'Phase 93: hotel settings component centralization closure',
  '.hotel-settings-central-page .hotel-settings-panel',
  '.hotel-settings-central-page .fandqi-ui-form-grid',
  '.hotel-settings-central-page .food-service-card'
]) {
  assert(css.includes(token), `Phase 93 hotel settings CSS missing ${token}`);
}

assert(packageJson.scripts?.['hotel-settings-central:closure-audit'], 'package.json missing hotel-settings-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('hotel-settings-central:closure-audit'), 'quality:full must include hotel-settings-central:closure-audit.');

if (failures.length) {
  console.error('Hotel settings central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Hotel settings central closure audit passed ✅');
