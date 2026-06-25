import fs from 'node:fs';

const tablePath = 'apps/web/public/assets/js/modules/08b-reservation-modal-print.js';
const pagePath = 'apps/web/public/assets/js/modules/08c-reservation-page-events.js';
const adapterPath = 'apps/web/public/assets/js/professional/adapters/ui-adapter.js';

const table = fs.readFileSync(tablePath, 'utf8');
const page = fs.readFileSync(pagePath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');

const required = [
  ['reservations page migration marker', page, 'data-ui-migrated="reservations"'],
  ['reservations list migration marker', table, 'data-ui-migrated="reservations-list"'],
  ['reservation card migration marker', table, 'data-ui-migrated="reservation-card"'],
  ['reservation UI facade usage in table', table, 'window.FandqiUI'],
  ['reservation UI facade usage in page', page, 'window.FandqiUI'],
  ['central reservation button helper', table, 'renderReservationButton'],
  ['central reservation badge helper', table, 'renderReservationBadge'],
  ['central reservation empty helper', table, 'renderReservationEmptyState'],
  ['central reservation actions helper', table, 'renderReservationActionButtons'],
  ['central reservation add button helper', page, 'renderReservationAddButton'],
  ['UI adapter renderButton', adapter, 'renderButton'],
  ['UI adapter renderBadge', adapter, 'renderBadge'],
  ['UI adapter renderEmptyState', adapter, 'renderEmptyState']
];

const failures = required
  .filter(([, source, token]) => !source.includes(token))
  .map(([label, , token]) => `${label}: missing ${token}`);

const forbiddenPatterns = [
  /<button class="btn small ghost" type="button" data-action="view-reservation"/,
  /<button class="btn small ghost" type="button" data-action="print-reservation"/,
  /<button class="btn small ghost" type="button" data-action="edit-reservation"/,
  /<button class="btn small ghost" type="button" data-action="confirm-reservation"/,
  /<button class="btn small danger" type="button" data-action="cancel-reservation"/
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(table)) failures.push(`forbidden legacy reservation card UI pattern found: ${pattern}`);
}

if (failures.length) {
  console.error('Reservations UI migration audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Reservations UI migration audit passed ✅');
