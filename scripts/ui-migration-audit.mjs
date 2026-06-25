import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const moduleDir = path.join(root, 'apps', 'web', 'public', 'assets', 'js', 'modules');
const uiDir = path.join(root, 'apps', 'web', 'public', 'assets', 'js', 'professional', 'ui');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const read = file => fs.readFileSync(file, 'utf8');

const subscriptionPlan = read(path.join(moduleDir, '11a-subscription-plan.js'));
const packageModule = read(path.join(moduleDir, '03b-platform-packages-subscriptions-dashboard.js'));
const badgeModule = read(path.join(uiDir, 'badge.mjs'));
const adapter = read(path.join(root, 'apps', 'web', 'public', 'assets', 'js', 'professional', 'adapters', 'ui-adapter.js'));

assert(subscriptionPlan.includes('data-ui-migrated="subscription-plan"'), 'Subscription plan page must be marked as migrated to the central UI layer.');
for (const expected of ['subscriptionUi()', 'renderSubscriptionButton', 'renderSubscriptionBadge', 'renderSubscriptionEmptyState']) {
  assert(subscriptionPlan.includes(expected), `Subscription plan page missing central UI helper: ${expected}`);
}
const subscriptionRenderBody = subscriptionPlan.slice(
  subscriptionPlan.indexOf('function renderHotelSubscriptionPlanPage()'),
  subscriptionPlan.indexOf('function bindHotelSubscriptionPlanEvents()')
);
assert(!/<button class="btn/.test(subscriptionRenderBody), 'Subscription plan render body must not create raw btn markup directly.');
assert(!/<span class="status-badge/.test(subscriptionRenderBody), 'Subscription plan render body must not create raw status-badge markup directly.');

for (const expected of ['platformPackagesUi()', 'renderPlatformPackageButton', 'renderPlatformPackageBadge', 'renderPlatformPackageEmptyState']) {
  assert(packageModule.includes(expected), `Package management page missing central UI helper: ${expected}`);
}
for (const expected of ['view-package', 'edit-package', 'toggle-package', 'archive-package']) {
  assert(packageModule.includes(`renderPlatformPackageButton({ label: ${expected === 'toggle-package' ? 'packageItem.status' : "t('package.actions."}`) || packageModule.includes(`'data-action': '${expected}'`), `Package table action must use central button for ${expected}.`);
}

for (const expectedStatus of ['not_set', 'expired', 'suspended', 'trial']) {
  assert(badgeModule.includes(`${expectedStatus}:`), `Central badge tone map must support subscription status: ${expectedStatus}.`);
}
assert(adapter.includes('getBadgeTone'), 'UI adapter must preserve central badge tone mapping for legacy pages.');

const packageJson = JSON.parse(read(path.join(root, 'package.json')));
assert(packageJson.scripts?.['ui-migration:audit'], 'package.json missing ui-migration:audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('ui-migration:audit'), 'quality:full must include ui-migration:audit.');

if (errors.length) {
  console.error('UI migration audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('UI migration audit passed ✅');
