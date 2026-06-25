import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const owner = read('apps/web/public/assets/js/modules/03d-platform-owner-executive-restructure.js');
const nav = read('apps/web/public/assets/js/modules/01-navigation-topbar.js');
const shell = read('apps/web/public/assets/js/modules/11b-workspace-login-shell-core.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

for (const token of [
  'const PLATFORM_OWNER_DASHBOARD_CENTRAL_AUDIT_MARKERS',
  'data-ui-centralized="phase109-platform-owner-dashboard"',
  'data-ui-page="platform-owner-dashboard"',
  'function poUI',
  'function poOwnerPageHeader',
  'function poOwnerMiniMetrics',
  'function poOwnerStatCards',
  'function poOwnerSection',
  'function poOwnerActionButton',
  'function poOwnerTimelineItem',
  'function poOwnerEmptyState',
  'ui.renderSectionHead',
  'ui.renderMetricCard',
  'ui.renderSurface',
  'ui.renderButton',
  'ui.renderEmptyState',
  "component: 'owner-dashboard-page-head'",
  "'owner-dashboard-head-metrics'",
  'data-ui-component="owner-dashboard-stat-grid"',
  'data-ui-component\': \'owner-dashboard-stat-card\'',
  'data-ui-component="owner-dashboard-command-grid"',
  'owner-dashboard-command-section',
  'data-ui-component\': \'owner-dashboard-timeline-item\'',
  'owner-dashboard-requests-empty',
  'owner-dashboard-ending-empty',
  'owner-dashboard-hotels-empty'
]) {
  assert(owner.includes(token), `platform owner dashboard missing central token: ${token}`);
}

const renderStart = owner.indexOf('function renderPlatformDashboardPage');
const renderEnd = owner.indexOf('\nfunction renderHotelsTable', renderStart + 10);
const renderSource = renderStart >= 0 ? owner.slice(renderStart, renderEnd > renderStart ? renderEnd : owner.length) : '';
assert(Boolean(renderSource), 'missing renderPlatformDashboardPage source');
for (const token of [
  '<section class="owner-workspace-hero">',
  '<div class="owner-stat-grid">',
  '<section class="owner-section ',
  '<button class="owner-stat-card',
  '<button class="owner-timeline-item'
]) {
  assert(!renderSource.includes(token), `owner dashboard render source still contains legacy raw block: ${token}`);
}

for (const token of [
  "version: 'ui-adapter-v3-subscription-table-central-components-v4-owner-dashboard-children'",
  'options.children !== undefined',
  'function renderButton',
  'function renderSectionHead',
  'function renderSurface',
  'function renderMetricCard',
  'function renderEmptyState'
]) assert(adapter.includes(token), `FandqiUI adapter missing owner dashboard support: ${token}`);

const roleNavMatch = nav.match(/const ROLE_NAV = \{[\s\S]*?\n\};/);
assert(roleNavMatch, 'ROLE_NAV block not found');
if (roleNavMatch) {
  assert(!roleNavMatch[0].includes('notifications'), 'notifications must be removed from sidebar ROLE_NAV arrays');
}
assert(shell.includes("if ((isHotelOperationalRole(role) || role === 'platform_owner') && page === 'notifications') return renderNotificationsPage();"), 'notifications page route must remain reachable through topbar notification icon');
assert(shell.includes("if (state.activePage === 'notifications') return 'notifications';" ) || read('apps/web/public/assets/js/modules/02-state-print-avatar-utils.js').includes("if (state.activePage === 'notifications') return 'notifications';"), 'active notifications page exception must remain available');

for (const token of [
  'Phase 109: platform owner dashboard 100% component centralization',
  '.owner-central-dashboard-page[data-ui-centralized="phase109-platform-owner-dashboard"]',
  '.owner-central-dashboard-page .owner-central-hero[data-ui-component="owner-dashboard-page-head"]',
  '.owner-central-dashboard-page .owner-workspace-hero-metrics[data-ui-component="owner-dashboard-head-metrics"]',
  '.owner-central-dashboard-page .owner-stat-grid[data-ui-component="owner-dashboard-stat-grid"]',
  '.owner-central-dashboard-page .owner-stat-card[data-ui-component="owner-dashboard-stat-card"]',
  '.owner-central-dashboard-page .owner-command-grid[data-ui-component="owner-dashboard-command-grid"]',
  '.owner-central-dashboard-page .owner-central-section[data-ui-component="owner-dashboard-command-section"]',
  '.owner-central-dashboard-page .owner-timeline-item[data-ui-component="owner-dashboard-timeline-item"]',
  '.owner-central-dashboard-page .owner-empty-state-wrap[data-ui-component]'
]) assert(css.includes(token), `Phase 109 owner dashboard CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['platform-owner-dashboard-central:closure-audit'], 'package.json missing platform-owner-dashboard-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('platform-owner-dashboard-central:closure-audit'), 'quality:full must include platform-owner-dashboard-central:closure-audit.');

if (failures.length) {
  console.error('Platform owner dashboard central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Platform owner dashboard central closure audit passed ✅');
