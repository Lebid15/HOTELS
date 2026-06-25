import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const payments = read('apps/web/public/assets/js/modules/10c-payments-notifications.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

const requiredTokens = [
  'data-ui-centralized="phase106-payments"',
  'function renderPaymentSectionHead',
  'function renderPaymentSummaryCard',
  'function renderPaymentSurface',
  'function renderPaymentField',
  'function renderPaymentFilters',
  'function renderPaymentOrdersList',
  'ui.renderSectionHead',
  'ui.renderMetricCard',
  'ui.renderSurface',
  'ui.renderField',
  'data-ui-component="payments-page-head"',
  'data-ui-component="payments-summary-grid"',
  'data-ui-component="payments-summary-card"',
  'component: \'payments-filter-panel\'',
  'data-ui-component="payments-filter-grid"',
  "component: 'payments-search-field'",
  "component: 'payments-method-field'",
  'component: \'payments-orders-panel\'',
  'data-ui-component="payments-orders-list"',
  'renderPaymentOrdersList(filteredOrders, currency)'
];
for (const token of requiredTokens) assert(payments.includes(token), `payments page missing central token: ${token}`);

const forbiddenLegacyBlocks = [
  '<div class="section-head">',
  '<div class="workspace-filter-panel payments-filter-panel"',
  '<div class="filters-bar compact-filters-bar payments-filters-bar">',
  '<div class="dashboard-panel food-orders-panel payments-content-after-filter"',
  '<div class="dashboard-panel-head"><h3>${h(t(\'payments.roomChargeOrdersTitle\'))}</h3><span>${h(filteredOrders.length)}</span></div>',
  'renderPaymentFoodOrdersTable(filteredOrders, currency)'
];
for (const token of forbiddenLegacyBlocks) assert(!payments.includes(token), `legacy payments template remains: ${token}`);

const pageFunction = payments.slice(payments.indexOf('function renderPaymentsPage'), payments.indexOf('function renderNotificationsPage'));
assert(pageFunction.includes('renderPaymentSectionHead({ title: t(\'page.payments\'), text: t(\'payments.description\') })'), 'Payments page must render a central section head.');
assert(pageFunction.includes('renderPaymentFilters(FOOD_PAYMENT_METHODS)'), 'Payments page must render filters through renderPaymentFilters.');
assert(pageFunction.includes('renderPaymentSurface({'), 'Payments page must render orders panel through renderPaymentSurface.');

for (const token of [
  'function renderSectionHead',
  'function renderSurface',
  'function renderMetricCard',
  'function renderField',
  'renderSectionHead,',
  'renderSurface,',
  'renderMetricCard,',
  'renderField,'
]) assert(adapter.includes(token), `FandqiUI adapter missing payments central component: ${token}`);

for (const token of [
  'Phase 106: payments page 100% component centralization',
  '.payments-central-page[data-ui-centralized="phase106-payments"]',
  '.payments-central-page .payments-central-head[data-ui-component="payments-page-head"]',
  '.payments-central-page .payments-central-summary-grid[data-ui-component="payments-summary-grid"]',
  '.payments-central-page .payment-summary-card[data-ui-component="payments-summary-card"]',
  '.payments-central-page .payments-central-filter-grid[data-ui-component="payments-filter-grid"]',
  '.payments-central-page .payments-orders-panel[data-ui-component="payments-orders-panel"]',
  '.payments-central-page .payments-orders-list-wrap[data-ui-component="payments-orders-list"]',
  '.payments-central-page .payments-empty-state[data-ui-component="payments-empty-state"]'
]) assert(css.includes(token), `Phase 106 payments CSS missing: ${token}`);

assert(packageJson.scripts?.['payments-central:closure-audit'], 'package.json missing payments-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('payments-central:closure-audit'), 'quality:full must include payments-central:closure-audit.');

if (failures.length) {
  console.error('Payments central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Payments central closure audit passed ✅');
