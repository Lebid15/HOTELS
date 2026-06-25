import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(file, 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const staffModule = read(path.join(root, 'apps', 'web', 'public', 'assets', 'js', 'modules', '05-staff.js'));
const patchCss = read(path.join(root, 'apps', 'web', 'public', 'assets', 'css', 'patches', 'final-regression-fixes.css'));
const adapter = read(path.join(root, 'apps', 'web', 'public', 'assets', 'js', 'professional', 'adapters', 'ui-adapter.js'));
const notes = read(path.join(root, 'FANDQI_CHANGE_NOTES.md'));

assert(staffModule.includes('data-ui-migrated="staff"'), 'Staff page must be marked as migrated to the central UI layer.');
for (const expected of ['staffUi()', 'renderStaffButton', 'renderStaffBadge', 'renderStaffEmptyState']) {
  assert(staffModule.includes(expected), `Staff page missing central UI helper: ${expected}`);
}

const staffTableBody = staffModule.slice(
  staffModule.indexOf('function renderStaffTable'),
  staffModule.indexOf('function renderStaffFormModal')
);
const staffCardBody = staffModule.slice(
  staffModule.indexOf('function renderStaffCard'),
  staffModule.indexOf('function getFilteredStaff')
);
assert(staffTableBody.includes('sortedStaff.map(renderStaffCard)'), 'Staff cards table must render through central renderStaffCard helper.');
assert(staffCardBody.includes('renderStaffButton'), 'Staff cards must render actions through central staff button helper.');
assert(staffCardBody.includes('renderStaffBadge'), 'Staff cards must render role/status through central staff badge helper.');
assert(!/<button class="btn/.test(staffCardBody), 'Staff card render body must not create raw btn markup directly.');
assert(!/<span class="status-badge/.test(staffCardBody), 'Staff card render body must not create raw status-badge markup directly.');

assert(staffTableBody.includes('data-layout-fixed="staff-cards-roomy-grid"'), 'Staff cards grid must have stable roomy layout marker.');
assert(staffCardBody.includes('staff-card-actions--fixed-grid'), 'Staff card actions must have fixed-grid layout marker.');

for (const expected of [
  'Final Local MVP Closure Phase 56 — professional staff card actions',
  '.staff-cards-grid[data-layout-fixed="staff-cards-roomy-grid"]',
  '.staff-card-actions--fixed-grid[data-layout-fixed="staff-card-actions-fixed-grid"]',
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
  'data-action="view-staff"',
  'data-action="edit-staff"',
  'data-action="change-staff-password"',
  'data-action="change-staff-shift"',
  'data-action="manage-staff-permissions"',
  'data-action="toggle-staff"',
  'data-action="archive-staff"',
  'order: 1',
  'order: 7'
]) {
  assert(patchCss.includes(expected), `Staff card professional actions CSS missing: ${expected}`);
}


const staffPageBody = staffModule.slice(
  staffModule.indexOf('function renderStaffPage'),
  staffModule.length
);
assert(staffPageBody.includes('renderStaffButton({ label: t(\'staff.actions.add\')'), 'Staff add button must use central button helper.');

assert(adapter.includes('function renderAttributes'), 'UI adapter fallback must support renderAttributes.');
assert(adapter.includes('...(options.attrs || {})'), 'UI adapter button fallback must preserve custom attrs such as id and data-id.');
assert(adapter.includes('renderAttributes(options.attrs || {})'), 'UI adapter badge fallback must preserve custom attrs.');
assert(notes.includes('Phase 8'), 'Change notes must document Phase 8 staff UI migration.');

const packageJson = JSON.parse(read(path.join(root, 'package.json')));
assert(packageJson.scripts?.['staff-ui-migration:audit'], 'package.json missing staff-ui-migration:audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('staff-ui-migration:audit'), 'quality:full must include staff-ui-migration:audit.');

if (errors.length) {
  console.error('Staff UI migration audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Staff UI migration audit passed ✅');
