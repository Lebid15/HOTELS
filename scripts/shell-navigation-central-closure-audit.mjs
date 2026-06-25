import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const shell = read('apps/web/public/assets/js/modules/11b-workspace-login-shell-core.js');
const nav = read('apps/web/public/assets/js/modules/01-navigation-topbar.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return '';
  const endMarker = source.indexOf('\n}\n\nfunction ', start);
  if (endMarker < 0) return source.slice(start);
  return source.slice(start, endMarker + 3);
}


for (const token of [
  'const SHELL_CENTRAL_AUDIT_MARKERS',
  'phase116-shell-navigation-centralization',
  'shell-layout-central',
  'shell-sidebar-central-surface',
  'shell-sidebar-nav-central',
  'shell-topbar-central-surface',
  'shell-topbar-actions-central',
  'shell-content-central-surface',
  'shell-page-slot-central',
  'function shellUi',
  'function shellAttrs',
  'function renderShellSurface',
  'function renderShellButton',
  'function renderShellIconButton',
  'function renderShellActions',
  'function renderShellSidebarBrand',
  'function renderShellSidebarNavItem',
  'function renderShellSidebar',
  'function renderShellMobileBackdrop',
  'function renderShellTopbar',
  'function renderShellContent',
  'function renderShellMain',
  'ui.renderSurface',
  'ui.renderButton',
  'ui.renderIconButton',
  'ui.renderActions',
  'data-ui-component="shell-layout"',
  'data-ui-component="shell-page-slot"',
  'data-ui-centralized="phase116-shell-navigation-centralization"'
]) assert(shell.includes(token), `shell source missing central token: ${token}`);

for (const token of [
  'const TOPBAR_NOTIFICATIONS_CENTRAL_AUDIT_MARKERS',
  'shell-topbar-notifications-central',
  'shell-topbar-notification-button-central',
  'shell-topbar-notification-panel-central',
  'shell-topbar-notification-item-central',
  'function topbarShellUi',
  'function topbarShellAttrs',
  'function renderTopbarShellButton',
  'function renderTopbarNotificationBellButton',
  'function renderTopbarNotificationsOpenPageButton',
  'function renderTopbarNotificationItem',
  'function renderTopbarNotificationsPanel',
  'data-ui-component="shell-topbar-brand"',
  'data-ui-component="shell-topbar-notifications"',
  'data-ui-component="shell-topbar-notification-list"',
  'data-topbar-page',
  'data-notifications-open-page'
]) assert(nav.includes(token), `navigation/topbar source missing central token: ${token}`);

for (const [name, required] of [
  ['renderShell', ['renderShellSidebar({ role, navItems, activePage })', 'renderShellMobileBackdrop()', 'renderShellMain({ activePage, role, hotel })', 'shell-layout-central']],
  ['renderShellSidebar', ['renderShellSurface({', 'shell-sidebar-central-surface', 'renderShellSidebarBrand(role)', 'renderShellSidebarNavItem(item, activePage)', 'data-ui-component="shell-sidebar-nav"']],
  ['renderShellSidebarNavItem', ['renderShellButton({', 'shell-sidebar-nav-item-central', "'data-page': item", "'aria-current': item === activePage ? 'page' : undefined"]],
  ['renderShellTopbar', ['renderShellSurface({', 'shell-topbar-central-surface', 'renderShellIconButton({ id: \'refreshAppBtn\'', 'renderTopbarNotifications(role)', 'renderShellIconButton({ id: \'languageBtn\'', 'renderShellButton({ id: \'logoutBtn\'']],
  ['renderShellContent', ['renderShellSurface({', 'shell-content-central-surface', 'shell-page-slot-central', 'renderWorkspace(activePage, role)']]
]) {
  const source = functionSource(shell, name);
  assert(Boolean(source), `missing ${name} source`);
  for (const token of required) assert(source.includes(token), `${name} missing centralized call: ${token}`);
}

const renderShellSource = functionSource(shell, 'renderShell');
for (const forbidden of [
  '<aside class="sidebar">',
  '<div class="sidebar-header">',
  '<nav class="sidebar-nav"',
  '<button class="nav-item',
  '<header class="topbar">',
  '<button class="icon-btn mobile-menu-btn"',
  '<button class="icon-btn topbar-refresh-btn"',
  '<button class="icon-btn" type="button" id="languageBtn"',
  '<button class="btn danger small" id="logoutBtn"',
  '<section class="content">',
  '<div class="page-shell workspace-blank">'
]) assert(!renderShellSource.includes(forbidden), `renderShell still contains legacy raw shell token: ${forbidden}`);

for (const [name, required] of [
  ['renderTopbarNotifications', ['renderTopbarNotificationBellButton(alertCount)', 'renderTopbarNotificationsPanel(visibleNotifications, alertCount)', 'shell-topbar-notifications-central']],
  ['renderTopbarNotificationBellButton', ['renderTopbarShellButton({', 'notificationsBtn', 'shell-topbar-notification-button', 'aria-expanded']],
  ['renderTopbarNotificationsPanel', ['ui.renderSurface', 'shell-topbar-notification-panel', 'renderTopbarNotificationsOpenPageButton(alertCount)', 'renderTopbarNotificationItem(item)']],
  ['renderTopbarNotificationItem', ['renderTopbarShellButton({', 'shell-topbar-notification-item', 'data-topbar-notification-id', 'data-topbar-page']]
]) {
  const source = functionSource(nav, name);
  assert(Boolean(source), `missing ${name} source`);
  for (const token of required) assert(source.includes(token), `${name} missing centralized call: ${token}`);
}

const topbarNotificationsSource = functionSource(nav, 'renderTopbarNotifications');
for (const forbidden of [
  '<button class="icon-btn topbar-notify-btn"',
  '<div class="topbar-notify-panel"',
  '<button class="btn neutral small" type="button" id="openNotificationsPageBtn"',
  '<button class="topbar-notify-item'
]) assert(!topbarNotificationsSource.includes(forbidden), `renderTopbarNotifications still contains legacy raw token: ${forbidden}`);

const roleNavMatch = nav.match(/const ROLE_NAV = \{[\s\S]*?\n\};/);
assert(roleNavMatch, 'ROLE_NAV arrays not found.');
if (roleNavMatch) assert(!roleNavMatch[0].includes('notifications'), 'notifications must remain removed from sidebar ROLE_NAV arrays.');
assert(shell.includes("if ((isHotelOperationalRole(role) || role === 'platform_owner') && page === 'notifications') return renderNotificationsPage();"), 'notifications route must remain reachable from topbar bell/open page.');

for (const token of [
  'Phase 116: sidebar, topbar and workspace shell 100% component centralization',
  '.shell-layout-central[data-ui-centralized="phase116-shell-navigation-centralization"]',
  '.shell-sidebar-central-surface[data-ui-component="shell-sidebar"]',
  '.shell-sidebar-nav-central[data-ui-component="shell-sidebar-nav"]',
  '.shell-sidebar-nav-item-central.ds-btn[data-ui-component="shell-sidebar-nav-item"]',
  '.shell-main-central-surface[data-ui-component="shell-main"]',
  '.shell-topbar-central-surface[data-ui-component="shell-topbar"]',
  '.shell-topbar-actions-central[data-ui-component="shell-topbar-actions"]',
  '.shell-topbar-notifications-central[data-ui-component="shell-topbar-notifications"]',
  '.shell-topbar-notification-button-central.ds-btn[data-ui-component="shell-topbar-notification-button"]',
  '.shell-topbar-notification-panel-central[data-ui-component="shell-topbar-notification-panel"]',
  '.shell-topbar-notification-item-central.ds-btn[data-ui-component="shell-topbar-notification-item"]',
  '.shell-content-central-surface[data-ui-component="shell-content"]',
  '.shell-page-slot-central[data-ui-component="shell-page-slot"]',
  '.shell-mobile-sidebar-backdrop-central.ds-btn[data-ui-component="shell-mobile-sidebar-backdrop"]'
]) assert(css.includes(token), `Phase 116 CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['shell-navigation-central:closure-audit'], 'package.json missing shell-navigation-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('shell-navigation-central:closure-audit'), 'quality:full must include shell-navigation-central:closure-audit.');

if (failures.length) {
  console.error('Shell navigation central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Shell navigation central closure audit passed ✅');
