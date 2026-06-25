import fs from 'node:fs';

const exists = file => fs.existsSync(file);
const read = file => fs.readFileSync(file, 'utf8');

const featureDir = 'apps/web/public/assets/js/professional/features/food';
const requiredFiles = [
  'constants.mjs',
  'repository.mjs',
  'validators.mjs',
  'render.mjs',
  'actions.mjs',
  'index.mjs'
].map(file => `${featureDir}/${file}`);

const adapterPath = 'apps/web/public/assets/js/professional/adapters/food-feature-adapter.js';
const appEntryPath = 'apps/web/public/assets/js/professional/app-entry.mjs';
const indexPath = 'apps/web/public/index.html';
const foodPath = 'apps/web/public/assets/js/modules/07-food-services.js';
const eventsPath = 'apps/web/public/assets/js/modules/11d-backup-dashboard-workspace-events-init.js';

const failures = [];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`missing food feature file: ${file}`);
}

if (!exists(adapterPath)) failures.push(`missing food feature adapter: ${adapterPath}`);

const featureIndex = exists(`${featureDir}/index.mjs`) ? read(`${featureDir}/index.mjs`) : '';
const adapter = exists(adapterPath) ? read(adapterPath) : '';
const appEntry = read(appEntryPath);
const indexHtml = read(indexPath);
const food = read(foodPath);
const events = read(eventsPath);

const requiredFeatureTokens = [
  'foodFeature',
  'FOOD_FEATURE_NAME',
  'foodMenu',
  'foodOrders',
  'createFoodActions',
  'normalizeFoodMenuItem',
  'validateFoodMenuItem',
  'normalizeFoodOrder',
  'validateFoodOrder',
  'sortFoodMenuItems',
  'getAvailableFoodMenuItems',
  'getFoodOrderItemsTotal',
  'getFoodOrderPaymentTone',
  'getFoodOrderDisplayNumber',
  'getFoodOrdersByReservationId',
  'getFoodOrderPaidTotal',
  'getFoodOrderRoomAccountTotal',
  'getReservationRoomAccountOrdersTotal',
  'getReservationFinancialTotal'
];

for (const token of requiredFeatureTokens) {
  if (!featureIndex.includes(token) && !adapter.includes(token)) {
    failures.push(`food feature missing token: ${token}`);
  }
}

const requiredIntegrationTokens = [
  ['app-entry imports food feature', appEntry, "features/food/index.mjs"],
  ['app-entry exposes food feature', appEntry, 'food: foodFeature'],
  ['index loads food adapter', indexHtml, 'food-feature-adapter.js'],
  ['food module uses food feature helper', food, 'function foodFeature()'],
  ['menu read via feature repository', food, 'feature?.repository?.menu?.read'],
  ['menu write via feature repository', food, 'feature?.repository?.menu?.write'],
  ['menu hotel list via feature repository', food, 'feature?.repository?.menu?.forHotel'],
  ['menu seed via feature action', food, 'feature?.actions?.seedDefaultMenu'],
  ['food orders read via feature repository', food, 'feature?.repository?.orders?.read'],
  ['food orders write via feature repository', food, 'feature?.repository?.orders?.write'],
  ['food orders hotel list via feature repository', food, 'feature?.repository?.orders?.forHotel'],
  ['food order item total via selector', food, 'feature?.selectors?.getFoodOrderItemsTotal'],
  ['food payment tone via selector', food, 'feature?.selectors?.getFoodOrderPaymentTone'],
  ['food display number via selector', food, 'feature?.selectors?.getFoodOrderDisplayNumber'],
  ['reservation room account total via selector', food, 'feature?.selectors?.getReservationRoomAccountOrdersTotal'],
  ['reservation financial total via selector', food, 'feature?.selectors?.getReservationFinancialTotal'],
  ['events add menu item via feature action', events, 'feature?.actions?.addMenuItem'],
  ['events add order via feature action', events, 'feature?.actions?.addOrder']
];

for (const [label, source, token] of requiredIntegrationTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

if (failures.length) {
  console.error('Food feature module audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Food feature module audit passed ✅');
