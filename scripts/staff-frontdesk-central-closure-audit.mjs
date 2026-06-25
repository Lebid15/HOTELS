import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const source = read('apps/web/public/assets/js/modules/06b-staff-frontdesk-readiness.js');
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
  'const STAFF_FRONTDESK_CENTRAL_AUDIT_MARKERS',
  'phase114-staff-frontdesk-centralization',
  'function staffFrontdeskUi',
  'function staffFrontdeskAttrs',
  'function renderStaffFrontdeskButton',
  'function renderStaffFrontdeskActions',
  'function renderStaffFrontdeskHead',
  'function renderStaffFrontdeskSurface',
  'function renderStaffFrontdeskPanelTitle',
  'function renderStaffFrontdeskMetricCard',
  'function renderStaffFrontdeskEmptyState',
  'function renderFrontDeskQueueItem',
  'function renderFrontDeskQueuePanel',
  'ui.renderButton',
  'ui.renderActions',
  'ui.renderSectionHead',
  'ui.renderSurface',
  'ui.renderPanelTitle',
  'ui.renderMetricCard',
  'ui.renderEmptyState',
  'data-ui-page="staff-operational-dashboard"',
  'data-ui-page="front-desk"',
  'data-ui-component="staff-operational-hotel-chip"',
  'data-ui-component="staff-operational-metric-grid"',
  'data-ui-component="frontdesk-metric-grid"',
  'data-ui-component="frontdesk-queue-columns"',
  'data-ui-component="frontdesk-queue-list"',
  'data-ui-component="frontdesk-queue-identity"',
  'data-ui-component="frontdesk-queue-status"'
]) {
  assert(source.includes(token), `staff/frontdesk source missing central token: ${token}`);
}

for (const [name, required] of [
  ['renderStaffOperationalDashboardPage', ['renderStaffFrontdeskHead({', 'renderStaffFrontdeskActions(', 'renderStaffFrontdeskButton(', 'renderStaffFrontdeskSurface({', 'renderStaffFrontdeskMetricCard(', 'staff-operational-central-page', 'data-ui-centralized="phase114-staff-frontdesk-centralization"']],
  ['renderFrontDeskPage', ['renderStaffFrontdeskHead({', 'renderStaffFrontdeskActions(', 'renderStaffFrontdeskButton(', 'renderStaffFrontdeskMetricCard(', 'renderFrontDeskQueuePanel({', 'frontdesk-central-page', 'data-ui-centralized="phase114-staff-frontdesk-centralization"']],
  ['renderFrontDeskReservationQueue', ['renderStaffFrontdeskEmptyState({', 'renderFrontDeskQueueItem']],
  ['renderFrontDeskQueueItem', ['renderStaffFrontdeskSurface({', 'component: \'frontdesk-queue-item\'']]
]) {
  const body = functionSource(source, name);
  assert(Boolean(body), `missing ${name} source`);
  for (const token of required) assert(body.includes(token), `${name} missing centralized call: ${token}`);
}

for (const token of [
  '<div class="section-head front-desk-head">',
  '<div class="section-head dashboard-head manager-dashboard-head staff-operational-head">',
  '<section class="front-desk-panel">',
  '<article class="front-desk-queue-item">',
  '<div class="front-desk-empty">',
  '.map(renderManagerSmartCard)',
  '.map(renderManagerQuickButton)'
]) {
  assert(!source.includes(token), `legacy staff/frontdesk template remains: ${token}`);
}

for (const token of [
  'Phase 114: staff operational dashboard + front desk 100% component centralization',
  '.staff-operational-central-page[data-ui-centralized="phase114-staff-frontdesk-centralization"]',
  '.frontdesk-central-page[data-ui-centralized="phase114-staff-frontdesk-centralization"]',
  '.staff-operational-central-page .staff-frontdesk-central-head[data-ui-component="staff-operational-page-head"]',
  '.frontdesk-central-page .staff-frontdesk-central-head[data-ui-component="frontdesk-page-head"]',
  '.staff-operational-central-page .staff-frontdesk-central-actions[data-ui-component="staff-operational-quick-actions"]',
  '.staff-operational-central-page .staff-operational-work-panel[data-ui-component="staff-operational-work-panel"]',
  '.staff-operational-central-page [data-ui-component="staff-operational-metric-grid"]',
  '.frontdesk-central-page [data-ui-component="frontdesk-metric-grid"]',
  '.frontdesk-central-page [data-ui-component="frontdesk-queue-columns"]',
  '.frontdesk-central-page .frontdesk-central-queue-panel[data-ui-component$="panel"]',
  '.frontdesk-central-page [data-ui-component="frontdesk-queue-list"]',
  '.frontdesk-central-page .frontdesk-central-queue-item[data-ui-component="frontdesk-queue-item"]',
  '.frontdesk-central-page .frontdesk-central-empty-state[data-ui-component="frontdesk-empty-state"]'
]) {
  assert(css.includes(token), `Phase 114 CSS missing: ${token}`);
}

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['staff-frontdesk-central:closure-audit'], 'package.json missing staff-frontdesk-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('staff-frontdesk-central:closure-audit'), 'quality:full must include staff-frontdesk-central:closure-audit.');

if (failures.length) {
  console.error('Staff/frontdesk central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Staff/frontdesk central closure audit passed ✅');
