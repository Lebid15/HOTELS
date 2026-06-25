import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];

const patch = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const reportsModule = read('apps/web/public/assets/js/modules/10b-reports.js');
const packageJson = JSON.parse(read('package.json'));

const requiredCssTokens = [
  'reports actions outside filters',
  '.content .reports-page.workspace-page',
  '.reports-page .reports-section-head',
  '.reports-page .reports-top-actions',
  '.reports-page .reports-filters-bar',
  'grid-template-columns: minmax(180px, 1fr) minmax(160px, 220px) minmax(160px, 220px)',
  '.reports-page .reports-filters-bar .reports-actions',
  'display: none',
  'flex-direction: column',
  'grid-template-rows: none'
];

for (const token of requiredCssTokens) {
  if (!patch.includes(token)) failures.push(`missing reports actions layout CSS token: ${token}`);
}

const requiredModuleTokens = [
  'reports-section-head',
  'function renderReportTopActions()',
  'reports-top-actions',
  'data-layout-fixed="reports-actions-outside-filter"',
  'filters-bar compact-filters-bar reports-filters-bar',
  'data-report-period',
  'report-period-btn',
  'reportFromFilter',
  'reportToFilter'
];

for (const token of requiredModuleTokens) {
  if (!reportsModule.includes(token)) failures.push(`missing reports module token: ${token}`);
}

function functionSource(name) {
  const start = reportsModule.indexOf(`function ${name}`);
  if (start < 0) return '';
  const next = reportsModule.indexOf('\nfunction ', start + 10);
  return reportsModule.slice(start, next > start ? next : reportsModule.length);
}

const filtersSource = functionSource('renderReportFilters');
if (!filtersSource) failures.push('could not locate renderReportFilters source');
if (filtersSource.includes('reports.actions.print') || filtersSource.includes('export-report-csv') || filtersSource.includes('print-report')) {
  failures.push('report print/export actions must not be rendered inside renderReportFilters');
}

const topActionsSource = functionSource('renderReportTopActions');
if (!topActionsSource.includes('print-report') || !topActionsSource.includes('export-report-csv')) {
  failures.push('report top actions must render print and export buttons');
}

if (patch.includes('!important')) {
  failures.push('reports actions layout fix must not use !important');
}

if (!packageJson.scripts?.['workspace-reports-actions-layout:audit']) {
  failures.push('package.json missing workspace-reports-actions-layout:audit script');
}

if (!packageJson.scripts?.['quality:full']?.includes('workspace-reports-actions-layout:audit')) {
  failures.push('quality:full missing workspace-reports-actions-layout:audit');
}

if (failures.length) {
  console.error('Workspace reports actions layout audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Workspace reports actions layout audit passed ✅');
