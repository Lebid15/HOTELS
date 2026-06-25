import fs from 'node:fs';

const foodPath = 'apps/web/public/assets/js/modules/07-food-services.js';
const adapterPath = 'apps/web/public/assets/js/professional/adapters/ui-adapter.js';

const food = fs.readFileSync(foodPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');
const patchCss = fs.readFileSync('apps/web/public/assets/css/patches/final-regression-fixes.css', 'utf8');

const required = [
  ['food services page migration marker', 'data-ui-migrated="food-services"'],
  ['food menu list migration marker', 'data-ui-migrated="food-menu-list"'],
  ['food menu card migration marker', 'data-ui-migrated="food-menu-card"'],
  ['food orders list migration marker', 'data-ui-migrated="food-orders-list"'],
  ['food order card migration marker', 'data-ui-migrated="food-order-card"'],
  ['food order item chip migration marker', 'data-ui-migrated="food-order-item-chip"'],
  ['food UI facade usage', 'window.FandqiUI'],
  ['central food button helper', 'renderFoodButton'],
  ['central food badge helper', 'renderFoodBadge'],
  ['central food empty helper', 'renderFoodEmptyState'],
  ['central food header actions helper', 'renderFoodHeaderActions'],
  ['central food print invoice helper', 'renderFoodPrintInvoiceButton'],
  ['UI adapter renderButton', 'renderButton'],
  ['UI adapter renderBadge', 'renderBadge'],
  ['UI adapter renderEmptyState', 'renderEmptyState']
];

const failures = required
  .filter(([, token]) => !(food.includes(token) || adapter.includes(token)))
  .map(([label, token]) => `${label}: missing ${token}`);


const phase59Required = [
  ['food orders 3-column marker', 'data-layout-fixed="food-orders-three-professional"'],
  ['food orders 3-column css phase marker', 'Final Local MVP Closure Phase 59 — food order cards three professional per row'],
  ['food orders 3-column css rule', 'grid-template-columns: repeat(3, minmax(0, 1fr))'],
  ['food orders meta 2-column css rule', '.food-order-card-meta {'],
  ['food orders detail item height', 'min-height: 86px']
];
for (const [label, token] of phase59Required) {
  if (!(food.includes(token) || patchCss.includes(token))) failures.push(`${label}: missing ${token}`);
}

const forbiddenPatterns = [
  /<button class="btn small luxury" type="button" data-action="print-food-order-invoice"/,
  /<button class="btn accent" type="button" id="addFoodMenuItemBtn"/,
  /<button class="btn primary" type="button" id="addFoodOrderBtn"/,
  /<div class="empty-panel food-orders-empty"/,
  /<div class="empty-panel food-menu-empty"/,
  /<span class="status-badge active">\$\{h\(getFoodOrderStatusLabel/
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(food)) failures.push(`forbidden legacy food UI pattern found: ${pattern}`);
}

if (failures.length) {
  console.error('Food UI migration audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Food UI migration audit passed ✅');
