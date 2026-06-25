import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const owner = read('apps/web/public/assets/js/modules/03d-platform-owner-executive-restructure.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

function functionSource(name) {
  const start = owner.indexOf(`function ${name}`);
  if (start < 0) return '';
  const brace = owner.indexOf('{', start);
  let depth = 1;
  let i = brace + 1;
  let inString = null;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < owner.length) {
    const ch = owner[i];
    const next = owner[i + 1] || '';
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
        if (depth === 0) return owner.slice(start, i + 1);
      }
    }
    i += 1;
  }
  return '';
}

for (const token of [
  'const PLATFORM_OWNER_PACKAGES_SUBSCRIPTIONS_CENTRAL_AUDIT_MARKERS',
  'data-ui-centralized="phase111-platform-owner-packages-subscriptions-requests"',
  'data-ui-page="platform-owner-packages"',
  'data-ui-page="platform-owner-subscriptions"',
  'data-ui-page="platform-owner-subscription-requests"',
  'function poOwnerCentralButton',
  'function poOwnerCentralBadge',
  'function poOwnerPackageCard',
  'function poOwnerSubscriptionCard',
  'function poOwnerSubscriptionRequestCard',
  'function poOwnerRequestFilterPill',
  'function poOwnerRequestsPanelSurface',
  'ui.renderButton',
  'ui.renderBadge',
  'ui.renderCard',
  'ui.renderField',
  'ui.renderSurface',
  'ui.renderEmptyState',
  "component: 'owner-packages-page-head'",
  "component: 'owner-subscriptions-page-head'",
  "component: 'owner-requests-page-head'",
  'data-ui-component="owner-packages-cards-grid"',
  'data-ui-component="owner-subscriptions-cards-grid"',
  'data-ui-component="owner-requests-cards-grid"',
  "component: 'owner-package-card'",
  "component: 'owner-subscription-card'",
  "component: 'owner-subscription-request-card'",
  'data-ui-component="owner-package-card-actions"',
  'data-ui-component="owner-subscription-card-actions"',
  'data-ui-component="owner-request-card-actions"',
  "component: 'owner-package-card-action'",
  "component: 'owner-subscription-card-action'",
  "component: 'owner-request-card-action'",
  "component: 'owner-request-filter-pill'",
  "component: 'owner-packages-filter-field'",
  "component: 'owner-subscriptions-filter-field'",
  'owner-packages-empty-state',
  'owner-subscriptions-empty-no-hotels',
  'owner-requests-empty-state'
]) {
  assert(owner.includes(token), `platform owner packages/subscriptions source missing central token: ${token}`);
}

for (const [name, forbidden] of [
  ['renderPackagesPage', ['<div class="section-head">', '<div class="filters-bar">', '<div class="field"><label>', '<button class="btn']],
  ['renderPackagesTable', ['<article class="platform-owner-card', '<button class="btn small', '<div class="empty-panel']],
  ['renderSubscriptionsPage', ['<div class="section-head">', '<div class="filters-bar">', '<div class="field"><label>', '<button class="btn']],
  ['renderSubscriptionsTable', ['<article class="platform-owner-card', '<button class="btn small', '<div class="empty-panel']],
  ['renderOwnerSubscriptionRequestCard', ['<article class="platform-owner-card', '<button class="btn small']],
  ['renderOwnerSubscriptionRequestsPanel', ['<button class="owner-request-filter', '<div class="empty-panel']]
]) {
  const source = functionSource(name);
  assert(Boolean(source), `missing ${name} source`);
  for (const token of forbidden) assert(!source.includes(token), `${name} still contains legacy raw token: ${token}`);
}

for (const token of [
  'Phase 111: platform owner packages, subscriptions and requests 100% component centralization',
  '.owner-packages-central-page[data-ui-centralized="phase111-platform-owner-packages-subscriptions-requests"]',
  '.owner-subscriptions-central-page[data-ui-centralized="phase111-platform-owner-packages-subscriptions-requests"]',
  '.owner-subscription-requests-central-page[data-ui-centralized="phase111-platform-owner-packages-subscriptions-requests"]',
  '.owner-packages-central-page .owner-central-hero[data-ui-component="owner-packages-page-head"]',
  '.owner-subscriptions-central-page .owner-central-hero[data-ui-component="owner-subscriptions-page-head"]',
  '.owner-subscription-requests-central-page .owner-central-hero[data-ui-component="owner-requests-page-head"]',
  '.owner-packages-central-page .owner-filter-bar[data-ui-component="owner-packages-filter-grid"]',
  '.owner-subscriptions-central-page .owner-filter-bar[data-ui-component="owner-subscriptions-filter-grid"]',
  '.owner-packages-central-page [data-ui-component="owner-packages-cards-grid"]',
  '.owner-subscriptions-central-page [data-ui-component="owner-subscriptions-cards-grid"]',
  '.owner-subscription-requests-central-page [data-ui-component="owner-requests-cards-grid"]',
  '.owner-packages-central-page .owner-entity-card[data-ui-component="owner-package-card"]',
  '.owner-subscriptions-central-page .owner-entity-card[data-ui-component="owner-subscription-card"]',
  '.owner-subscription-requests-central-page .owner-entity-card[data-ui-component="owner-subscription-request-card"]',
  '.owner-subscription-requests-central-page [data-ui-component="owner-request-filter-pill"]'
]) assert(css.includes(token), `Phase 111 CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['platform-owner-packages-subscriptions-central:closure-audit'], 'package.json missing platform-owner-packages-subscriptions-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('platform-owner-packages-subscriptions-central:closure-audit'), 'quality:full must include platform-owner-packages-subscriptions-central:closure-audit.');

if (failures.length) {
  console.error('Platform owner packages/subscriptions/requests central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Platform owner packages/subscriptions/requests central closure audit passed ✅');
