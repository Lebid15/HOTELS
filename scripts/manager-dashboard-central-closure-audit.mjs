import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const dashboard = read('apps/web/public/assets/js/modules/06-rooms-dashboard.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

const requiredDashboardTokens = [
  'data-ui-page="manager-dashboard"',
  'data-ui-centralized="phase92-manager-dashboard"',
  'function getManagerDashboardAttrs',
  'function renderManagerDashboardHead',
  'function renderManagerQuickBar',
  'function renderManagerSmartCardsPanel',
  'ui.renderButton',
  'ui.renderMetricCard',
  'ui.renderSectionHead',
  'ui.renderActions',
  'ui.renderSurface',
  'ds-page',
  'ds-actions',
  'ds-section-head',
  'ds-summary-grid',
  'ds-metric-card'
];

for (const token of requiredDashboardTokens) {
  assert(dashboard.includes(token), `manager dashboard missing central token: ${token}`);
}

const requiredAdapterTokens = [
  'function renderSectionHead',
  'function renderActions',
  'function renderSurface',
  'function renderMetricCard',
  'renderSectionHead,',
  'renderActions,',
  'renderSurface,',
  'renderMetricCard,'
];

for (const token of requiredAdapterTokens) {
  assert(adapter.includes(token), `FandqiUI adapter missing reusable dashboard component: ${token}`);
}

const legacyDashboardBlocks = [
  '<div class="section-head dashboard-head manager-dashboard-head">',
  '<div class="manager-dashboard-quickbar" aria-label=',
  '<section class="dashboard-panel manager-dashboard-panel">',
  '<button class="btn small ${h(tone)} manager-dashboard-quick-button"',
  '<button class="dashboard-card manager-dashboard-smart-card ${h(tone || \'\')}"'
];

for (const token of legacyDashboardBlocks) {
  assert(!dashboard.includes(token), `legacy manager dashboard template remains: ${token}`);
}

for (const token of ['Phase 92: manager dashboard full component centralization', '.fandqi-ui-section-copy', '.ds-metric-card.manager-dashboard-smart-card']) {
  assert(css.includes(token), `Phase 92 manager dashboard CSS missing ${token}`);
}

assert(packageJson.scripts?.['manager-dashboard-central:closure-audit'], 'package.json missing manager-dashboard-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('manager-dashboard-central:closure-audit'), 'quality:full must include manager-dashboard-central:closure-audit.');

if (failures.length) {
  console.error('Manager dashboard central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Manager dashboard central closure audit passed ✅');
