import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
function readUiSource(file) {
  const source = read(file);
  if (file.endsWith('06-rooms-dashboard.js')) {
    return `${source}\n${read('apps/web/public/assets/js/modules/06c-rooms-floors-centralization.js')}`;
  }
  return source;
}

const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const finalPatchCss = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

const requiredAdapterCapabilities = [
  'renderButton',
  'renderIconButton',
  'renderBadge',
  'renderCard',
  'renderTabs',
  'renderEmptyState',
  'renderAttributes'
];

const requiredMarkers = [
  ['staff page', 'apps/web/public/assets/js/modules/05-staff.js', 'data-ui-migrated="staff"'],
  ['rooms page', 'apps/web/public/assets/js/modules/06-rooms-dashboard.js', 'data-ui-migrated="rooms"'],
  ['rooms list', 'apps/web/public/assets/js/modules/06-rooms-dashboard.js', 'data-ui-migrated="rooms-list"'],
  ['room card', 'apps/web/public/assets/js/modules/06-rooms-dashboard.js', 'data-ui-migrated="room-card"'],
  ['food services page', 'apps/web/public/assets/js/modules/07-food-services.js', 'data-ui-migrated="food-services"'],
  ['food menu card', 'apps/web/public/assets/js/modules/07-food-services.js', 'data-ui-migrated="food-menu-card"'],
  ['food order card', 'apps/web/public/assets/js/modules/07-food-services.js', 'data-ui-migrated="food-order-card"'],
  ['reservations page', 'apps/web/public/assets/js/modules/08c-reservation-page-events.js', 'data-ui-migrated="reservations"'],
  ['reservations list', 'apps/web/public/assets/js/modules/08b-reservation-modal-print.js', 'data-ui-migrated="reservations-list"'],
  ['reservation card', 'apps/web/public/assets/js/modules/08b-reservation-modal-print.js', 'data-ui-migrated="reservation-card"'],
  ['guests page', 'apps/web/public/assets/js/modules/09a-guests.js', 'data-ui-migrated="guests"'],
  ['guests list', 'apps/web/public/assets/js/modules/09a-guests.js', 'data-ui-migrated="guests-list"'],
  ['guest card', 'apps/web/public/assets/js/modules/09a-guests.js', 'data-ui-migrated="guest-card"'],
  ['check-in/out page', 'apps/web/public/assets/js/modules/09b-check-in-out.js', 'data-ui-migrated="checkio"'],
  ['check-in/out tabs', 'apps/web/public/assets/js/modules/09b-check-in-out.js', 'data-ui-migrated="checkio-tabs"'],
  ['check-in/out card', 'apps/web/public/assets/js/modules/09b-check-in-out.js', 'data-ui-migrated="checkio-card"'],
  ['housekeeping page', 'apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js', 'data-ui-migrated="housekeeping"'],
  ['housekeeping card', 'apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js', 'data-ui-migrated="housekeeping-card"'],
  ['maintenance page', 'apps/web/public/assets/js/modules/10a-maintenance.js', 'data-ui-migrated="maintenance"'],
  ['maintenance card', 'apps/web/public/assets/js/modules/10a-maintenance.js', 'data-ui-migrated="maintenance-card"'],
  ['reports page', 'apps/web/public/assets/js/modules/10b-reports.js', 'data-ui-migrated="reports"'],
  ['reports tabs', 'apps/web/public/assets/js/modules/10b-reports.js', 'data-ui-migrated="reports-tabs"'],
  ['payments page', 'apps/web/public/assets/js/modules/10c-payments-notifications.js', 'data-ui-migrated="payments"'],
  ['payments summary', 'apps/web/public/assets/js/modules/10c-payments-notifications.js', 'data-ui-migrated="payments-summary"'],
  ['subscription plan page', 'apps/web/public/assets/js/modules/11a-subscription-plan.js', 'data-ui-migrated="subscription-plan"']
];

const requiredAudits = [
  'ui-components:audit',
  'ui-migration:audit',
  'staff-ui-migration:audit',
  'rooms-ui-migration:audit',
  'reservations-ui-migration:audit',
  'food-ui-migration:audit',
  'maintenance-housekeeping-ui-migration:audit',
  'reports-payments-ui-migration:audit',
  'guests-checkio-ui-migration:audit'
];

const requiredDocs = [
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE6.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE7.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE8.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE9.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE10.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE11.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE12.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE13.md',
  'docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE14.md',
  'docs/UI_MIGRATION_MANUAL_HTML_INVENTORY.json'
];

const forbiddenOperationalPatterns = [
  ['room direct action buttons', 'apps/web/public/assets/js/modules/06-rooms-dashboard.js', /<button class="btn small (ghost|success|danger)" type="button" data-action="(view-room|edit-room|restore-room|archive-room)"/],
  ['reservation direct card buttons', 'apps/web/public/assets/js/modules/08b-reservation-modal-print.js', /<button class="btn small (ghost|success|danger|luxury)" type="button" data-action="(view-reservation|print-reservation|edit-reservation|confirm-reservation|cancel-reservation)"/],
  ['food direct invoice button', 'apps/web/public/assets/js/modules/07-food-services.js', /<button class="btn small luxury" type="button" data-action="print-food-order-invoice"/],
  ['maintenance direct action buttons', 'apps/web/public/assets/js/modules/10a-maintenance.js', /<button class="btn small (accent|primary|warning|ghost|danger)" type="button" data-action="maintenance-/],
  ['housekeeping direct action buttons', 'apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js', /<button class="btn small (primary|ghost)" type="button" data-action="housekeeping-/],
  ['guest direct action buttons', 'apps/web/public/assets/js/modules/09a-guests.js', /<button class="btn small ghost" type="button" data-action="(view-guest|open-guest-reservation|print-guest-reservation)"/],
  ['checkio direct action buttons', 'apps/web/public/assets/js/modules/09b-check-in-out.js', /<button class="btn small (primary|warning|ghost|luxury)" type="button" data-action="checkio-/]
];

const failures = [];

for (const capability of requiredAdapterCapabilities) {
  if (!adapter.includes(capability)) failures.push(`FandqiUI adapter missing ${capability}`);
}

for (const [label, file, token] of requiredMarkers) {
  const source = readUiSource(file);
  if (!source.includes(token)) failures.push(`${label} missing marker ${token}`);
}

for (const audit of requiredAudits) {
  if (!packageJson.scripts?.[audit]) failures.push(`package.json missing script ${audit}`);
  if (!packageJson.scripts?.['quality:full']?.includes(`npm run ${audit}`)) {
    failures.push(`quality:full does not include ${audit}`);
  }
}

for (const doc of requiredDocs) {
  if (!fs.existsSync(doc)) failures.push(`required documentation/report missing ${doc}`);
}

for (const [label, file, pattern] of forbiddenOperationalPatterns) {
  const source = readUiSource(file);
  if (pattern.test(source)) failures.push(`forbidden legacy operational UI pattern found in ${label}`);
}

const inventory = JSON.parse(read('docs/UI_MIGRATION_MANUAL_HTML_INVENTORY.json'));
if (!Array.isArray(inventory) || inventory.length === 0) {
  failures.push('manual HTML inventory is empty or invalid');
}


const requiredGlobalHeaderTokens = [
  'Final Local MVP Closure Phase 58 — global page title headers',
  '.workspace-page > .section-head',
  '.hotels-page > .section-head',
  '.settings-page > .section-head',
  '.workspace-page > .section-head p',
  'display: none',
  'min-height: 72px',
  'height: 42px'
];

for (const token of requiredGlobalHeaderTokens) {
  if (!finalPatchCss.includes(token)) {
    failures.push(`global title-only header CSS missing: ${token}`);
  }
}

if (failures.length) {
  console.error('UI migration closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('UI migration closure audit passed ✅');
