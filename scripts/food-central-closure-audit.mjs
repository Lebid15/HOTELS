import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const food = read('apps/web/public/assets/js/modules/07-food-services.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));
const ar = JSON.parse(read('apps/web/public/locales/ar.json'));
const en = JSON.parse(read('apps/web/public/locales/en.json'));

const requiredTokens = [
  'data-ui-centralized="phase104-food-services"',
  'function renderFoodSectionHead',
  'function renderFoodActions',
  'function renderFoodSurface',
  'function renderFoodField',
  'function renderFoodFormGrid',
  'function renderFoodMetaItem',
  'function renderFoodServiceCard',
  'function renderFoodMenuCard',
  'function renderFoodOrderCard',
  'ui.renderSectionHead',
  'ui.renderActions',
  'ui.renderSurface',
  'ui.renderField',
  'ui.renderFormGrid',
  'data-ui-component="food-page-head"',
  'data-ui-component="food-services-summary-grid"',
  'data-ui-component="food-service-card"',
  "component: 'food-menu-panel'",
  'data-ui-component="food-menu-list"',
  'data-ui-component="food-menu-card"',
  "component: 'food-orders-panel'",
  'data-ui-component="food-orders-list"',
  'data-ui-component="food-order-card"',
  'data-ui-component="food-order-meta-grid"',
  'data-ui-component="food-order-card-footer"',
  'data-ui-component="food-order-modal"',
  'data-ui-component="food-menu-modal"'
];
for (const token of requiredTokens) assert(food.includes(token), `food page missing central token: ${token}`);

const forbiddenLegacyBlocks = [
  '<div class="section-head">',
  '<div class="food-service-summary-card">',
  '<div class="dashboard-panel food-menu-panel">',
  '<div class="dashboard-panel food-orders-panel">',
  '${services.map(service => `',
  '${orders.map(order => `',
  '<div class="detail-item"><span>${h(t(\'foodServices.fields.serviceType\'))}</span>',
  '<button class="btn primary" type="submit" ${menuItems.length ? \'\' : \'disabled\'}>',
  '<button class="btn secondary compact-action-btn" type="button" data-action="add-food-order-item-row"'
];
for (const token of forbiddenLegacyBlocks) assert(!food.includes(token), `legacy food template remains: ${token}`);

const pageFunction = food.slice(food.indexOf('function renderFoodServicesPage'), food.length);
assert(pageFunction.includes('renderFoodSectionHead({ actions: pageActions })'), 'Food services page must render a central section head.');
assert(pageFunction.includes('services.map(service => renderFoodServiceCard(service, hotelName))'), 'Food services page must render service cards through central helper.');
assert(pageFunction.includes('renderFoodSurface({'), 'Food services page must render panels through renderFoodSurface.');

const orderCardFunction = food.slice(food.indexOf('function renderFoodOrderCard'), food.indexOf('function renderFoodOrdersCards'));
assert(orderCardFunction.includes('renderFoodMetaItem'), 'Food order card must render metadata through renderFoodMetaItem.');
assert(orderCardFunction.includes('renderFoodPrintInvoiceButton'), 'Food order card must render invoice action through central button helper.');
assert(!/<button class="btn/.test(orderCardFunction), 'Food order card must not create raw buttons.');

for (const token of [
  'function renderSectionHead',
  'function renderActions',
  'function renderSurface',
  'function renderField',
  'function renderFormGrid',
  'renderSectionHead,',
  'renderActions,',
  'renderSurface,',
  'renderField,',
  'renderFormGrid,'
]) assert(adapter.includes(token), `FandqiUI adapter missing food central component: ${token}`);

for (const token of [
  'Phase 104: restaurant/cafeteria page 100% component centralization',
  '.food-services-central-page[data-ui-centralized="phase104-food-services"]',
  '.food-services-central-page .food-central-head[data-ui-component="food-page-head"]',
  '.food-services-central-page .food-services-central-summary-grid[data-ui-component="food-services-summary-grid"]',
  '.food-services-central-page .food-central-service-card[data-ui-component="food-service-card"]',
  '.food-services-central-page .food-menu-grid[data-ui-component="food-menu-list"]',
  '.food-services-central-page .food-order-card[data-ui-component="food-order-card"]',
  '.food-modal-card-central[data-ui-component]'
]) assert(css.includes(token), `Phase 104 food CSS missing: ${token}`);

assert(ar.common?.remove, 'ar common.remove is missing.');
assert(en.common?.remove, 'en common.remove is missing.');
assert(ar.foodServices?.description, 'ar foodServices.description is missing.');
assert(en.foodServices?.description, 'en foodServices.description is missing.');
assert(packageJson.scripts?.['food-central:closure-audit'], 'package.json missing food-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('food-central:closure-audit'), 'quality:full must include food-central:closure-audit.');

if (failures.length) {
  console.error('Food central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Food central closure audit passed ✅');
