import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];

const patch = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const subscriptionModule = read('apps/web/public/assets/js/modules/11a-subscription-plan.js');
const packageJson = JSON.parse(read('package.json'));

const requiredModuleTokens = [
  'function renderHotelSubscriptionPlanPage',
  'function getVisibleSubscriptionPackages',
  "readStorageJson('fandqi.subscriptionPackages', [])",
  "(plan.status || 'active') !== 'archived'",
  'subscription-platform-packages-page',
  'subscription-platform-packages-section',
  'subscription-platform-packages-grid',
  'subscription-platform-package-card',
  'platform-package-offer-card',
  'platformPackages.map',
  'getPackageStatusLabel(packageStatus)',
  'data-subscription-plan-request',
  'data-package-id',
  'subscription?.endDate',
  'subscription?.startDate',
  'formatSubscriptionPrice(subscription)',
  'subscription-active-package-features',
  'getSubscriptionRequestStatusLabel(request.status ||',
  'getSubscriptionRequestTypeLabel(request.type)',
  'subscriptionRequests.map',
  'hasRenewRequest',
  "data-subscription-plan-request\': \'renew",
  'remainingDays <= SUBSCRIPTION_RENEWAL_WINDOW_DAYS',
  'renewal-warning-three-days',
  'canShowRenewalWarning',
  "t(\'subscriptionPlan.actions.requestSent\', \'تم إرسال الطلب\')",
  'existingChangeRequest',
  'getExistingPackageChangeRequest(subscriptionRequests, hotel.id, plan.id ||',
  'hasSubscriptionRequestAlreadySent(requests, hotel.id, type, targetPackageId)',
  'function getSubscriptionAlreadyRequestedMessage',
  'function getExistingPackageChangeRequest',
  'function hasSubscriptionRequestAlreadySent',
  'subscription-change-extend-requests-table',
  'subscription-requests-table-panel',
  'subscriptionRequestsTable',
  'const subscriptionRequests = getManagerSubscriptionRequestsForHotel(hotel.id)',
  'subscription-active-package-details',
  'active-package-details-under-cards',
  'subscription-active-package-panel',
  'platform-owner-compact-packages-cards-grid',
  'platform-owner-compact-packages-cards-section',
  'compact-platform-package-offers-with-active-details'
];

for (const token of requiredModuleTokens) {
  if (!subscriptionModule.includes(token)) failures.push(`missing platform package cards token: ${token}`);
}

const renderStart = subscriptionModule.indexOf('function renderHotelSubscriptionPlanPage');
const renderEnd = subscriptionModule.indexOf('\nfunction ', renderStart + 10);
const renderSource = renderStart >= 0 ? subscriptionModule.slice(renderStart, renderEnd > renderStart ? renderEnd : subscriptionModule.length) : '';

if (!renderSource) failures.push('missing renderHotelSubscriptionPlanPage source');

const forbiddenRenderTokens = [
  'subscription-current-panel',
  'subscription-requests-panel',
  'subscription-plan-summary-grid',
  'subscription-renewal-policy',
  'subscription-page-empty',
  'subscription-page-content-empty',
  'subscription-platform-packages-head',
  'subscriptionPlan.availablePackagesKicker',
  'subscriptionPlan.availablePackagesTitle',
  'subscriptionPlan.availablePackagesHint',
  'subscriptionPlan.packageDefaultDescription',
  'باقة اشتراك أضافها صاحب المنصة ويمكن طلبها من هنا',
  'عروض الاشتراك',
  'الباقات المتاحة',
  'اختر أي باقة',
  'cards.map(renderSubscriptionSummaryCard)'
];

for (const token of forbiddenRenderTokens) {
  if (renderSource.includes(token)) failures.push(`subscription package offers page must not render old content: ${token}`);
}

const requiredCssTokens = [
  'platform owner packages as offer cards',
  '.subscription-platform-packages-page',
  '.subscription-platform-packages-section',
  '.subscription-platform-packages-grid',
  '.subscription-platform-package-card',
  '.subscription-platform-package-card.is-current',
  '.subscription-platform-package-meta',
  'grid-template-columns: repeat(auto-fit, minmax(255px, 1fr))',
  'min-height: 286px',
  '.subscription-active-package-features',
  '.subscription-request-table-badge',
  '.subscription-requests-table-scroll',
  '.subscription-requests-table-panel[data-layout-fixed="subscription-change-extend-requests-table"]',
  'subscription change/extend requests table',
  '.subscription-active-package-details',
  '.subscription-active-package-panel[data-layout-fixed="active-package-details-under-cards"]',
  'min-height: 224px',
  '.subscription-platform-packages-section[data-layout-fixed="platform-owner-compact-packages-cards-section"] .subscription-platform-package-card',
  '.subscription-platform-packages-page[data-layout-fixed="compact-platform-package-offers-with-active-details"]',
  'compact package cards with active package details',
  'display: none',
  '.subscription-platform-packages-section[data-layout-fixed="platform-owner-packages-cards-section"] .subscription-platform-packages-head',
  'subscription package section header removed',
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
  'font-size: 1.42rem',
  'grid-template-rows: auto minmax(82px, auto) auto auto auto',
  'grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))',
  'balanced professional subscription cards',
  '.subscription-renew-now-alert.is-requested',
  '.subscription-renew-now-alert[data-layout-fixed="renewal-warning-three-days"]',
  '.subscription-platform-package-card.is-requested',
  'one package request and renewal warning'
];

for (const token of requiredCssTokens) {
  if (!patch.includes(token)) failures.push(`missing platform package cards CSS token: ${token}`);
}

if (patch.includes('!important')) {
  failures.push('subscription package cards CSS must not use !important');
}

if (!packageJson.scripts?.['workspace-subscription-packages:audit']) {
  failures.push('package.json missing workspace-subscription-packages:audit script');
}

if (!packageJson.scripts?.['quality:full']?.includes('workspace-subscription-packages:audit')) {
  failures.push('quality:full missing workspace-subscription-packages:audit');
}

if (failures.length) {
  console.error('Workspace subscription packages audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Workspace subscription packages audit passed ✅');
