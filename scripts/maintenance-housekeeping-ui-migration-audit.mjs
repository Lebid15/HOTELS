import fs from 'node:fs';

const maintenancePath = 'apps/web/public/assets/js/modules/10a-maintenance.js';
const housekeepingPath = 'apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js';
const adapterPath = 'apps/web/public/assets/js/professional/adapters/ui-adapter.js';

const maintenance = fs.readFileSync(maintenancePath, 'utf8');
const housekeeping = fs.readFileSync(housekeepingPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');

const required = [
  ['maintenance page migration marker', maintenance, 'data-ui-migrated="maintenance"'],
  ['maintenance list migration marker', maintenance, 'data-ui-migrated="maintenance-list"'],
  ['maintenance card migration marker', maintenance, 'data-ui-migrated="maintenance-card"'],
  ['maintenance UI facade usage', maintenance, 'window.FandqiUI'],
  ['central maintenance button helper', maintenance, 'renderMaintenanceButton'],
  ['central maintenance badge helper', maintenance, 'renderMaintenanceBadge'],
  ['central maintenance priority helper', maintenance, 'renderMaintenancePriorityBadge'],
  ['central maintenance empty helper', maintenance, 'renderMaintenanceEmptyState'],
  ['central maintenance actions helper', maintenance, 'renderMaintenanceActionButtons'],
  ['housekeeping page migration marker', housekeeping, 'data-ui-migrated="housekeeping"'],
  ['housekeeping list migration marker', housekeeping, 'data-ui-migrated="housekeeping-list"'],
  ['housekeeping card migration marker', housekeeping, 'data-ui-migrated="housekeeping-card"'],
  ['housekeeping UI facade usage', housekeeping, 'window.FandqiUI'],
  ['central housekeeping button helper', housekeeping, 'renderHousekeepingButton'],
  ['central housekeeping badge helper', housekeeping, 'renderHousekeepingBadge'],
  ['central housekeeping empty helper', housekeeping, 'renderHousekeepingEmptyState'],
  ['central housekeeping actions helper', housekeeping, 'renderHousekeepingActionButtons'],
  ['UI adapter renderButton', adapter, 'renderButton'],
  ['UI adapter renderBadge', adapter, 'renderBadge'],
  ['UI adapter renderEmptyState', adapter, 'renderEmptyState']
];

const failures = required
  .filter(([, source, token]) => !source.includes(token))
  .map(([label, , token]) => `${label}: missing ${token}`);

const forbiddenMaintenancePatterns = [
  /<button class="btn small accent" type="button" data-action="maintenance-start"/,
  /<button class="btn small primary" type="button" data-action="maintenance-resolve"/,
  /<button class="btn small warning" type="button" data-action="maintenance-waiting-parts"/,
  /<button class="btn small ghost" type="button" data-action="maintenance-edit"/,
  /<button class="btn small danger" type="button" data-action="maintenance-cancel"/,
  /<span class="status-badge \$\{h\(ticket\.status\)\}"/
];

const forbiddenHousekeepingPatterns = [
  /<button class="btn small primary" type="button" data-action="housekeeping-mark-clean"/,
  /<button class="btn small ghost" type="button" data-action="housekeeping-send-maintenance"/,
  /<button class="btn small ghost" type="button" data-action="housekeeping-view-room"/,
  /<span class="status-badge \$\{h\(displayStatus\)\}"/
];

for (const pattern of forbiddenMaintenancePatterns) {
  if (pattern.test(maintenance)) failures.push(`forbidden legacy maintenance UI pattern found: ${pattern}`);
}

for (const pattern of forbiddenHousekeepingPatterns) {
  if (pattern.test(housekeeping)) failures.push(`forbidden legacy housekeeping UI pattern found: ${pattern}`);
}

if (failures.length) {
  console.error('Maintenance & Housekeeping UI migration audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Maintenance & Housekeeping UI migration audit passed ✅');
