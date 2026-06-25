import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const subscription = read('apps/web/public/assets/js/modules/11a-subscription-plan.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

const requiredModuleTokens = [
  'data-ui-centralized="phase107-subscription-plan"',
  'function renderSubscriptionPageHead',
  'function renderSubscriptionSurface',
  'function renderSubscriptionPackageCard',
  'function renderSubscriptionPackageMeta',
  'function renderSubscriptionPackageFeatures',
  'function renderSubscriptionActivePackagePanel',
  'function renderSubscriptionRequestsPanel',
  'function renderSubscriptionRequestsTable',
  'ui.renderSectionHead',
  'ui.renderSurface',
  'ui.renderButton',
  'ui.renderBadge',
  'ui.renderEmptyState',
  'ui.renderTable',
  'data-ui-component="subscription-page-head"',
  'data-ui-component="subscription-head-stats"',
  "component: 'subscription-packages-section'",
  'data-ui-component="subscription-packages-grid"',
  "component: 'subscription-package-card'",
  'data-ui-component="subscription-package-meta"',
  'data-ui-component="subscription-package-features"',
  'data-ui-component\': \'subscription-package-action\'',
  "component: 'subscription-active-package-panel'",
  'data-ui-component="subscription-active-package-details"',
  'data-ui-component="subscription-active-package-features"',
  "component: 'subscription-requests-table-panel'",
  'data-ui-component="subscription-requests-table-scroll"',
  'renderSubscriptionPageHead({',
  'const packagesPanel = renderSubscriptionSurface({',
  'const activePackagePanel = renderSubscriptionActivePackagePanel({',
  'const subscriptionRequestsTable = renderSubscriptionRequestsPanel(subscriptionRequests);'
];
for (const token of requiredModuleTokens) assert(subscription.includes(token), `subscription page missing central token: ${token}`);

const renderStart = subscription.indexOf('function renderHotelSubscriptionPlanPage');
const renderEnd = subscription.indexOf('\nfunction bindHotelSubscriptionPlanEvents()', renderStart + 10);
const renderSource = renderStart >= 0 ? subscription.slice(renderStart, renderEnd > renderStart ? renderEnd : subscription.length) : '';
assert(Boolean(renderSource), 'missing renderHotelSubscriptionPlanPage source');
for (const token of [
  '<article class="subscription-platform-package-card',
  '<section class="subscription-active-package-panel',
  '<section class="subscription-requests-table-panel',
  '<table class="subscription-requests-table"',
  '<div class="section-head"',
  'cards.map(renderSubscriptionSummaryCard)'
]) {
  assert(!renderSource.includes(token), `subscription render source still contains legacy raw block: ${token}`);
}

for (const token of [
  'function renderTable',
  'renderTable,',
  'renderAttributes(options.attrs || {})',
  'ui-adapter-v3-subscription-table-central-components'
]) assert(adapter.includes(token), `FandqiUI adapter missing subscription central support: ${token}`);

for (const token of [
  'Phase 107: subscription packages page 100% component centralization',
  '.subscription-central-page[data-ui-centralized="phase107-subscription-plan"]',
  '.subscription-central-page .subscription-central-head[data-ui-component="subscription-page-head"]',
  '.subscription-central-page .subscription-page-head-stats[data-ui-component="subscription-head-stats"]',
  '.subscription-central-page .subscription-central-packages-section[data-ui-component="subscription-packages-section"]',
  '.subscription-central-page .subscription-platform-packages-grid[data-ui-component="subscription-packages-grid"]',
  '.subscription-central-page .subscription-platform-package-card[data-ui-component="subscription-package-card"]',
  '.subscription-central-page .subscription-platform-package-meta[data-ui-component="subscription-package-meta"]',
  '.subscription-central-page .subscription-platform-package-features[data-ui-component="subscription-package-features"]',
  '.subscription-central-page .subscription-active-package-panel[data-ui-component="subscription-active-package-panel"]',
  '.subscription-central-page .subscription-active-package-details[data-ui-component="subscription-active-package-details"]',
  '.subscription-central-page .subscription-active-package-features[data-ui-component="subscription-active-package-features"]',
  '.subscription-central-page .subscription-requests-table-panel[data-ui-component="subscription-requests-table-panel"]',
  '.subscription-central-page .subscription-requests-table-scroll[data-ui-component="subscription-requests-table-scroll"]',
  '.subscription-central-page .subscription-empty-state[data-ui-component]'
]) assert(css.includes(token), `Phase 107 subscription CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['subscription-plan-central:closure-audit'], 'package.json missing subscription-plan-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('subscription-plan-central:closure-audit'), 'quality:full must include subscription-plan-central:closure-audit.');

if (failures.length) {
  console.error('Subscription plan central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Subscription plan central closure audit passed ✅');
