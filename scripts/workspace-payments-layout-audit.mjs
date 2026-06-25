import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];

const patch = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const paymentsModule = read('apps/web/public/assets/js/modules/10c-payments-notifications.js');
const packageJson = JSON.parse(read('package.json'));

const hasPhase106Centralization = paymentsModule.includes('data-ui-centralized="phase106-payments"');

const legacyRequiredCssTokens = [
  'payments page filter and cards consistency',
  '.content .payments-page.workspace-page',
  '.payments-page .payments-summary-grid',
  '.payments-page .payment-summary-card',
  '.payments-page .payments-filter-panel',
  '.payments-page .payments-filter-panel .payments-filters-bar',
  '.payments-page .payments-content-after-filter',
  'grid-template-columns: repeat(4, minmax(0, 1fr))',
  'grid-template-columns: minmax(280px, 1.5fr) minmax(160px, 220px)',
  'flex-direction: column',
  'grid-template-rows: none'
];

const centralRequiredCssTokens = [
  'Phase 106: payments page 100% component centralization',
  '.payments-central-page[data-ui-centralized="phase106-payments"]',
  '.payments-central-page .payments-central-summary-grid[data-ui-component="payments-summary-grid"]',
  '.payments-central-page .payment-summary-card[data-ui-component="payments-summary-card"]',
  '.payments-central-page .payments-central-filter-grid[data-ui-component="payments-filter-grid"]',
  '.payments-central-page .payments-orders-panel[data-ui-component="payments-orders-panel"]',
  '.payments-central-page .payments-orders-list-wrap[data-ui-component="payments-orders-list"]',
  'grid-template-columns: repeat(4, minmax(0, 1fr))',
  'grid-template-columns: minmax(260px, 1.5fr) minmax(220px, .85fr)',
  'flex-direction: column'
];

const requiredCssTokens = hasPhase106Centralization ? centralRequiredCssTokens : legacyRequiredCssTokens;
for (const token of requiredCssTokens) {
  if (!patch.includes(token)) failures.push(`missing payments layout CSS token: ${token}`);
}

const legacyRequiredModuleTokens = [
  'workspace-filter-panel payments-filter-panel',
  'data-layout-fixed="source-separated-payments-filter"',
  'filters-bar compact-filters-bar payments-filters-bar',
  'payments-content-after-filter',
  'data-layout-fixed="after-independent-payments-filter"',
  'payments-summary-grid'
];

const centralRequiredModuleTokens = [
  'data-ui-centralized="phase106-payments"',
  'renderPaymentFilters(FOOD_PAYMENT_METHODS)',
  'data-ui-component="payments-filter-grid"',
  'component: \'payments-filter-panel\'',
  'component: \'payments-orders-panel\'',
  'data-ui-component="payments-orders-list"',
  'payments-content-after-filter',
  'payments-summary-grid'
];

const requiredModuleTokens = hasPhase106Centralization ? centralRequiredModuleTokens : legacyRequiredModuleTokens;
for (const token of requiredModuleTokens) {
  if (!paymentsModule.includes(token)) failures.push(`missing payments module structure token: ${token}`);
}

if (hasPhase106Centralization) {
  const filterBeforeOrders = paymentsModule.indexOf('renderPaymentFilters(FOOD_PAYMENT_METHODS)') >= 0
    && paymentsModule.indexOf('renderPaymentFilters(FOOD_PAYMENT_METHODS)') < paymentsModule.indexOf("component: 'payments-orders-panel'");
  if (!filterBeforeOrders) failures.push('central payments filter panel must render before the orders panel starts');
} else {
  const independentPaymentsFilterSequence = /data-layout-fixed="source-separated-payments-filter"[\s\S]*?<div class="filters-bar compact-filters-bar payments-filters-bar">[\s\S]*?<\/div>\s*<\/div>\s*<div class="dashboard-panel food-orders-panel payments-content-after-filter"/;
  if (!independentPaymentsFilterSequence.test(paymentsModule)) {
    failures.push('payments filter panel must be fully closed before the orders panel starts');
  }
}

if (patch.includes('!important')) {
  failures.push('payments layout fix must not use !important');
}

if (!packageJson.scripts?.['workspace-payments-layout:audit']) {
  failures.push('package.json missing workspace-payments-layout:audit script');
}

if (!packageJson.scripts?.['quality:full']?.includes('workspace-payments-layout:audit')) {
  failures.push('quality:full missing workspace-payments-layout:audit');
}

if (failures.length) {
  console.error('Workspace payments layout audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Workspace payments layout audit passed ✅');
