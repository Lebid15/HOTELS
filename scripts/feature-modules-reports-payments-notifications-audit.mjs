import fs from 'node:fs';

const exists = file => fs.existsSync(file);
const read = file => fs.readFileSync(file, 'utf8');

const failures = [];

const featureGroups = [
  ['reports', 'apps/web/public/assets/js/professional/features/reports'],
  ['payments', 'apps/web/public/assets/js/professional/features/payments'],
  ['notifications', 'apps/web/public/assets/js/professional/features/notifications']
];

for (const [name, dir] of featureGroups) {
  for (const file of ['constants.mjs', 'repository.mjs', 'validators.mjs', 'render.mjs', 'actions.mjs', 'index.mjs']) {
    const path = `${dir}/${file}`;
    if (!exists(path)) failures.push(`missing ${name} feature file: ${path}`);
  }
}

const reportsIndex = exists('apps/web/public/assets/js/professional/features/reports/index.mjs')
  ? read('apps/web/public/assets/js/professional/features/reports/index.mjs')
  : '';
const paymentsIndex = exists('apps/web/public/assets/js/professional/features/payments/index.mjs')
  ? read('apps/web/public/assets/js/professional/features/payments/index.mjs')
  : '';
const notificationsIndex = exists('apps/web/public/assets/js/professional/features/notifications/index.mjs')
  ? read('apps/web/public/assets/js/professional/features/notifications/index.mjs')
  : '';
const reportsAdapter = exists('apps/web/public/assets/js/professional/adapters/reports-feature-adapter.js')
  ? read('apps/web/public/assets/js/professional/adapters/reports-feature-adapter.js')
  : '';
const paymentsAdapter = exists('apps/web/public/assets/js/professional/adapters/payments-feature-adapter.js')
  ? read('apps/web/public/assets/js/professional/adapters/payments-feature-adapter.js')
  : '';
const notificationsAdapter = exists('apps/web/public/assets/js/professional/adapters/notifications-feature-adapter.js')
  ? read('apps/web/public/assets/js/professional/adapters/notifications-feature-adapter.js')
  : '';
const appEntry = read('apps/web/public/assets/js/professional/app-entry.mjs');
const indexHtml = read('apps/web/public/index.html');
const reportsModule = read('apps/web/public/assets/js/modules/10b-reports.js');
const paymentsModule = read('apps/web/public/assets/js/modules/10c-payments-notifications.js');
const housekeepingModule = read('apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js');

const requiredReportsTokens = [
  'reportsFeature',
  'REPORTS_FEATURE_NAME',
  'reportsRepository',
  'createReportActions',
  'normalizeReportDate',
  'validateReportRange',
  'getReportRange',
  'isReportDateInRange',
  'moneyValue',
  'sumBy',
  'countBy',
  'summarizeReports',
  'getFoodTopItems'
];

for (const token of requiredReportsTokens) {
  if (!reportsIndex.includes(token) && !reportsAdapter.includes(token)) {
    failures.push(`reports feature missing token: ${token}`);
  }
}

const requiredPaymentsTokens = [
  'paymentsFeature',
  'PAYMENTS_FEATURE_NAME',
  'paymentsRepository',
  'createPaymentActions',
  'normalizePaymentSearch',
  'validatePaymentFilters',
  'summarizePaymentOrders',
  'filterPaymentOrders',
  'buildPaymentSummaryCards'
];

for (const token of requiredPaymentsTokens) {
  if (!paymentsIndex.includes(token) && !paymentsAdapter.includes(token)) {
    failures.push(`payments feature missing token: ${token}`);
  }
}

const requiredNotificationsTokens = [
  'notificationsFeature',
  'NOTIFICATIONS_FEATURE_NAME',
  'notificationsRepository',
  'createNotificationActions',
  'normalizeNotificationTone',
  'validateNotification',
  'summarizeNotifications',
  'buildNotificationOpenAttrs',
  'buildNotificationSummaryCards'
];

for (const token of requiredNotificationsTokens) {
  if (!notificationsIndex.includes(token) && !notificationsAdapter.includes(token)) {
    failures.push(`notifications feature missing token: ${token}`);
  }
}

const requiredIntegrationTokens = [
  ['app-entry imports reports feature', appEntry, "features/reports/index.mjs"],
  ['app-entry imports payments feature', appEntry, "features/payments/index.mjs"],
  ['app-entry imports notifications feature', appEntry, "features/notifications/index.mjs"],
  ['app-entry exposes reports feature', appEntry, 'reports: reportsFeature'],
  ['app-entry exposes payments feature', appEntry, 'payments: paymentsFeature'],
  ['app-entry exposes notifications feature', appEntry, 'notifications: notificationsFeature'],
  ['index loads reports adapter', indexHtml, 'reports-feature-adapter.js'],
  ['index loads payments adapter', indexHtml, 'payments-feature-adapter.js'],
  ['index loads notifications adapter', indexHtml, 'notifications-feature-adapter.js'],
  ['reports module has feature helper', reportsModule, 'function reportsFeature()'],
  ['reports module uses date validator', reportsModule, 'feature?.validators?.normalizeReportDate'],
  ['reports module uses range selector', reportsModule, 'feature?.selectors?.getReportRange'],
  ['reports module uses date range selector', reportsModule, 'feature?.selectors?.isReportDateInRange'],
  ['reports module uses money selector', reportsModule, 'feature?.selectors?.moneyValue'],
  ['reports module uses summary selector', reportsModule, 'feature?.selectors?.summarizeReports'],
  ['reports module uses food top selector', reportsModule, 'feature?.selectors?.getFoodTopItems'],
  ['reports module uses csv action', reportsModule, 'feature?.actions?.toCsv'],
  ['payments module has feature helper', paymentsModule, 'function paymentsFeature()'],
  ['payments module builds summary cards', paymentsModule, 'feature?.selectors?.buildPaymentSummaryCards'],
  ['payment helpers have feature helper', housekeepingModule, 'function paymentsFeature()'],
  ['payment helpers summarize orders', housekeepingModule, 'feature?.selectors?.summarizePaymentOrders'],
  ['payment helpers filter orders', housekeepingModule, 'feature?.selectors?.filterPaymentOrders'],
  ['notifications module has feature helper', paymentsModule, 'function notificationsFeature()'],
  ['notifications module summarizes notifications', paymentsModule, 'feature?.selectors?.summarizeNotifications'],
  ['notifications module builds open attrs', paymentsModule, 'feature?.selectors?.buildNotificationOpenAttrs']
];

for (const [label, source, token] of requiredIntegrationTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

if (failures.length) {
  console.error('Reports, Payments & Notifications feature module audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Reports, Payments & Notifications feature module audit passed ✅');
