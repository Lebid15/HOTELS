import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const reports = read('apps/web/public/assets/js/modules/10b-reports.js');
const adapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

const requiredModuleTokens = [
  'data-ui-centralized="phase108-reports"',
  'const REPORTS_CENTRAL_AUDIT_MARKERS',
  'function renderReportAttrs',
  'function renderReportActions',
  'function renderReportPageHead',
  'function renderReportSurface',
  'function renderReportField',
  'function renderReportButton',
  'function renderReportSummaryCard',
  'function renderReportMetricTable',
  'function renderReportBars',
  'ui?.renderSectionHead',
  'ui?.renderSurface',
  'ui?.renderField',
  'ui?.renderButton',
  'ui?.renderMetricCard',
  'ui?.renderTable',
  'data-ui-component="reports-page-head"',
  'data-ui-component="reports-head-stats"',
  'data-ui-component="reports-actions"',
  'data-ui-component="reports-summary-grid"',
  'data-ui-component\': \'reports-summary-card\'',
  'data-ui-component="reports-filter-grid"',
  "component: 'reports-filter-panel'",
  'data-ui-component="reports-period-quick-filter"',
  'data-ui-component\': \'reports-period-button\'',
  "component: 'reports-tabs'",
  'data-ui-component\': \'reports-tab-button\'',
  'data-ui-component="reports-body-slot"',
  "component: 'reports-table-panel'",
  'data-ui-component="reports-table-scroll"',
  "component: 'reports-chart-panel'",
  'data-ui-component="reports-bars"',
  'data-ui-component="reports-bar-row"',
  'renderReportPageHead({',
  'renderReportSummaryCards(ctx)',
  'renderReportFilters(ctx)',
  'renderReportTabs()',
  'renderReportBody(ctx)'
];
for (const token of requiredModuleTokens) assert(reports.includes(token), `reports page missing central token: ${token}`);

const renderStart = reports.indexOf('function renderReportsPage');
const renderEnd = reports.indexOf('\nfunction getReportExportRows', renderStart + 10);
const renderSource = renderStart >= 0 ? reports.slice(renderStart, renderEnd > renderStart ? renderEnd : reports.length) : '';
assert(Boolean(renderSource), 'missing renderReportsPage source');
for (const token of [
  '<div class="section-head reports-section-head">',
  '<div class="filters-bar compact-filters-bar reports-filters-bar',
  '<div class="reports-tabs" role="tablist"',
  '<div id="reportsBodySlot">',
  '${renderReportTopActions()}\n      </div>'
]) {
  assert(!renderSource.includes(token), `reports render source still contains legacy raw block: ${token}`);
}

for (const token of [
  'function renderSectionHead',
  'function renderSurface',
  'function renderMetricCard',
  'function renderField',
  'function renderTable',
  'renderSectionHead,',
  'renderSurface,',
  'renderMetricCard,',
  'renderField,',
  'renderTable,'
]) assert(adapter.includes(token), `FandqiUI adapter missing reports central component: ${token}`);

for (const token of [
  'Phase 108: reports page 100% component centralization',
  '.reports-central-page[data-ui-centralized="phase108-reports"]',
  '.reports-central-page .reports-central-head[data-ui-component="reports-page-head"]',
  '.reports-central-page .reports-head-stats[data-ui-component="reports-head-stats"]',
  '.reports-central-page .reports-top-actions[data-ui-component="reports-actions"]',
  '.reports-central-page .reports-summary-grid[data-ui-component="reports-summary-grid"]',
  '.reports-central-page .reports-central-summary-card[data-ui-component="reports-summary-card"]',
  '.reports-central-page .reports-filter-panel[data-ui-component="reports-filter-panel"]',
  '.reports-central-page .reports-filters-bar[data-ui-component="reports-filter-grid"]',
  '.reports-central-page .report-period-quick-filter[data-ui-component="reports-period-quick-filter"]',
  '.reports-central-page .report-period-btn[data-ui-component="reports-period-button"]',
  '.reports-central-page .reports-tabs[data-ui-component="reports-tabs"]',
  '.reports-central-page .report-tab[data-ui-component="reports-tab-button"]',
  '.reports-central-page .reports-body-slot[data-ui-component="reports-body-slot"]',
  '.reports-central-page .reports-central-surface[data-ui-component="reports-table-panel"]',
  '.reports-central-page .reports-central-surface[data-ui-component="reports-chart-panel"]',
  '.reports-central-page .report-table-scroll[data-ui-component="reports-table-scroll"]',
  '.reports-central-page .report-bars[data-ui-component="reports-bars"]',
  '.reports-central-page .report-bar-row[data-ui-component="reports-bar-row"]',
  '.reports-central-page .reports-empty-state-wrap[data-ui-component="reports-empty-state"]'
]) assert(css.includes(token), `Phase 108 reports CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['reports-central:closure-audit'], 'package.json missing reports-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('reports-central:closure-audit'), 'quality:full must include reports-central:closure-audit.');

if (failures.length) {
  console.error('Reports central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Reports central closure audit passed ✅');
