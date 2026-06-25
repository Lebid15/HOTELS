import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const source = read('apps/web/public/assets/js/modules/10c-payments-notifications.js');
const shell = read('apps/web/public/assets/js/modules/11b-workspace-login-shell-core.js');
const nav = read('apps/web/public/assets/js/modules/01-navigation-topbar.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

function functionSource(code, name) {
  const start = code.indexOf(`function ${name}`);
  if (start < 0) return '';
  const brace = code.indexOf('{', start);
  let depth = 1;
  let i = brace + 1;
  let inString = null;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1] || '';
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
    } else if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i += 1; }
    } else if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === inString) inString = null;
    } else {
      if (ch === '/' && next === '/') { inLineComment = true; i += 1; }
      else if (ch === '/' && next === '*') { inBlockComment = true; i += 1; }
      else if (ch === '"' || ch === "'" || ch === '`') inString = ch;
      else if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) return code.slice(start, i + 1);
      }
    }
    i += 1;
  }
  return '';
}

for (const token of [
  'const NOTIFICATIONS_CENTRAL_AUDIT_MARKERS',
  'phase115-notifications-centralization',
  'data-ui-page="notifications"',
  'function notificationAttrs',
  'function renderNotificationActions',
  'function renderNotificationSectionHead',
  'function renderNotificationPanelTitle',
  'function renderNotificationSurface',
  'function renderNotificationButton',
  'function renderNotificationMarkReadButton',
  'function renderNotificationBadge',
  'function renderNotificationReadBadge',
  'function renderNotificationCounterBadge',
  'function renderNotificationFilterButton',
  'function renderNotificationEmptyState',
  'function renderNotificationCard',
  'function renderNotificationsRefreshButton',
  'ui.renderActions',
  'ui.renderSectionHead',
  'ui.renderPanelTitle',
  'ui.renderSurface',
  'ui.renderButton',
  'ui.renderBadge',
  'ui.renderEmptyState',
  'data-ui-component="notifications-feed-grid"',
  "\'data-ui-component\': \'notifications-status-filter\'",
  'component: \'notifications-card\'',
  'component: \'notifications-feed-panel\'',
  "\'data-ui-component\': \'notifications-refresh-button\'",
  "\'data-ui-component\': \'notifications-mark-all-read-button\'",
  'data-notification-status-filter',
  'data-notification-open-page',
  'data-notification-mark-read'
]) {
  assert(source.includes(token), `notifications source missing central token: ${token}`);
}

for (const [name, required] of [
  ['renderNotificationsPage', [
    'renderNotificationSectionHead({',
    'renderNotificationActions(`',
    'renderNotificationsRefreshButton()',
    'renderNotificationSurface({',
    'renderNotificationFilterButton(',
    'renderNotificationPanelTitle({',
    'renderNotificationCounterBadge(',
    'renderNotificationCard(item)',
    'renderNotificationEmptyState(activeStatus)',
    'notifications-central-page',
    'data-ui-centralized="phase115-notifications-centralization"'
  ]],
  ['renderNotificationCard', [
    'renderNotificationSurface({',
    'renderNotificationReadBadge(item)',
    'renderNotificationActions(',
    'renderNotificationButton(item)',
    'renderNotificationMarkReadButton(item)',
    'component: \'notifications-card\''
  ]],
  ['renderNotificationFilterButton', [
    'ui.renderButton',
    'children',
    'data-notification-status-filter',
    "\'data-ui-component\': \'notifications-status-filter\'"
  ]],
  ['renderNotificationEmptyState', [
    'ui.renderEmptyState',
    'notifications-empty-state',
    'data-ui-component="notifications-empty-state"'
  ]]
]) {
  const body = functionSource(source, name);
  assert(Boolean(body), `missing ${name} source`);
  for (const token of required) assert(body.includes(token), `${name} missing centralized call: ${token}`);
}

const renderPageSource = functionSource(source, 'renderNotificationsPage');
for (const token of [
  '<div class="workspace-title notifications-title"',
  '<div class="notifications-status-strip" role="tablist"',
  '<div class="notifications-page-panel">',
  '<div class="notifications-page-head">',
  '<button class="notification-filter-btn',
  '<article class="notification-card'
]) {
  assert(!renderPageSource.includes(token), `renderNotificationsPage still contains legacy raw token: ${token}`);
}

const renderCardSource = functionSource(source, 'renderNotificationCard');
assert(!renderCardSource.includes('<article class="notification-card'), 'renderNotificationCard must use renderNotificationSurface, not raw article card.');
assert(!renderCardSource.includes('<button class="btn ghost small notification-mark-read-btn'), 'renderNotificationCard must use renderNotificationMarkReadButton, not raw mark-read button.');

const roleNavMatch = nav.match(/const ROLE_NAV = \{[\s\S]*?\n\};/);
assert(roleNavMatch, 'ROLE_NAV arrays not found.');
if (roleNavMatch) assert(!roleNavMatch[0].includes('notifications'), 'notifications must remain removed from sidebar ROLE_NAV arrays.');
assert(shell.includes("if ((isHotelOperationalRole(role) || role === 'platform_owner') && page === 'notifications') return renderNotificationsPage();"), 'notifications page route must remain reachable through topbar notification icon.');
assert(shell.includes('bindNotificationsPageEvents()'), 'notifications page events must remain bound after render.');

for (const token of [
  'Phase 115: notifications page 100% component centralization',
  '.notifications-central-page[data-ui-centralized="phase115-notifications-centralization"]',
  '.notifications-central-page .notifications-central-head[data-ui-component="notifications-page-head"]',
  '.notifications-central-page .notifications-central-actions[data-ui-component="notifications-page-actions"]',
  '.notifications-central-page .notifications-central-status-strip[data-ui-component="notifications-status-strip"]',
  '.notifications-central-page .notifications-central-filter-btn[data-ui-component="notifications-status-filter"]',
  '.notifications-central-page .notifications-central-feed-panel[data-ui-component="notifications-feed-panel"]',
  '.notifications-central-page .notifications-central-panel-head[data-ui-component="notifications-feed-title"]',
  '.notifications-central-page .notifications-central-feed-grid[data-ui-component="notifications-feed-grid"]',
  '.notifications-central-page .notifications-central-card[data-ui-component="notifications-card"]',
  '.notifications-central-page [data-ui-component="notifications-card-icon"]',
  '.notifications-central-page [data-ui-component="notifications-card-body"]',
  '.notifications-central-page [data-ui-component="notifications-read-badge"]',
  '.notifications-central-page .notifications-central-empty-state[data-ui-component="notifications-empty-state"]'
]) assert(css.includes(token), `Phase 115 CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['notifications-central:closure-audit'], 'package.json missing notifications-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('notifications-central:closure-audit'), 'quality:full must include notifications-central:closure-audit.');

if (failures.length) {
  console.error('Notifications central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Notifications central closure audit passed ✅');
