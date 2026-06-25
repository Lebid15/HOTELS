import fs from 'node:fs';

const reportsPath = 'apps/web/public/assets/js/modules/10b-reports.js';
const paymentsPath = 'apps/web/public/assets/js/modules/10c-payments-notifications.js';
const adapterPath = 'apps/web/public/assets/js/professional/adapters/ui-adapter.js';

const reports = fs.readFileSync(reportsPath, 'utf8');
const payments = fs.readFileSync(paymentsPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');

const required = [
  ['reports page migration marker', reports, 'data-ui-migrated="reports"'],
  ['reports summary migration marker', reports, 'data-ui-migrated="reports-summary"'],
  ['reports tabs migration marker', reports, 'data-ui-migrated="reports-tabs"'],
  ['reports actions migration marker', reports, 'data-ui-migrated="reports-actions"'],
  ['reports UI facade usage', reports, 'window.FandqiUI'],
  ['central reports button helper', reports, 'renderReportButton'],
  ['central reports tab helper', reports, 'renderReportTabButton'],
  ['central reports empty helper', reports, 'renderReportEmptyState'],
  ['central reports summary helper', reports, 'renderReportSummaryCard'],
  ['payments page migration marker', payments, 'data-ui-migrated="payments"'],
  ['payments summary migration marker', payments, 'data-ui-migrated="payments-summary"'],
  ['payments orders panel migration marker', payments, 'data-ui-migrated="payments-orders-panel"'],
  ['payments UI facade usage', payments, 'window.FandqiUI'],
  ['central payment summary helper', payments, 'renderPaymentSummaryCard'],
  ['central notification button helper', payments, 'renderNotificationButton'],
  ['central notification badge helper', payments, 'renderNotificationBadge'],
  ['central notification refresh helper', payments, 'renderNotificationsRefreshButton'],
  ['UI adapter renderButton', adapter, 'renderButton'],
  ['UI adapter renderBadge', adapter, 'renderBadge'],
  ['UI adapter renderEmptyState', adapter, 'renderEmptyState'],
  ['UI adapter renderCard', adapter, 'renderCard']
];

const failures = required
  .filter(([, source, token]) => !source.includes(token))
  .map(([label, , token]) => `${label}: missing ${token}`);

const forbiddenReportsPatterns = [
  /<button class="btn luxury small" type="button" data-action="print-report"/,
  /<button class="btn accent small" type="button" data-action="export-report-csv"/,
  /` : `<div class="empty-panel"><div><h2>\$\{h\(t\('reports\.emptyTitle'\)\)\}/
];

const forbiddenPaymentsPatterns = [
  /<button class="btn neutral" type="button" id="refreshNotificationsPageBtn"/,
  /<button class="btn accent small" type="button" data-notification-open-page/,
  /<span class="status-badge \$\{h\(item\.tone \|\| 'neutral'\)\}"/
];

for (const pattern of forbiddenReportsPatterns) {
  if (pattern.test(reports)) failures.push(`forbidden legacy reports UI pattern found: ${pattern}`);
}

for (const pattern of forbiddenPaymentsPatterns) {
  if (pattern.test(payments)) failures.push(`forbidden legacy payments/notifications UI pattern found: ${pattern}`);
}

if (failures.length) {
  console.error('Reports & Payments UI migration audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Reports & Payments UI migration audit passed ✅');
