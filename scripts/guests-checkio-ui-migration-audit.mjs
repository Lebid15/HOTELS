import fs from 'node:fs';

const guestsPath = 'apps/web/public/assets/js/modules/09a-guests.js';
const checkioPath = 'apps/web/public/assets/js/modules/09b-check-in-out.js';
const adapterPath = 'apps/web/public/assets/js/professional/adapters/ui-adapter.js';

const guests = fs.readFileSync(guestsPath, 'utf8');
const checkio = fs.readFileSync(checkioPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');
const patchCss = fs.readFileSync('apps/web/public/assets/css/patches/final-regression-fixes.css', 'utf8');

const required = [
  ['guests page migration marker', guests, 'data-ui-migrated="guests"'],
  ['guests list migration marker', guests, 'data-ui-migrated="guests-list"'],
  ['guest card migration marker', guests, 'data-ui-migrated="guest-card"'],
  ['guests UI facade usage', guests, 'window.FandqiUI'],
  ['central guest button helper', guests, 'renderGuestButton'],
  ['central guest badge helper', guests, 'renderGuestBadge'],
  ['central guests empty helper', guests, 'renderGuestsEmptyState'],
  ['central guest actions helper', guests, 'renderGuestActionButtons'],
  ['checkio page migration marker', checkio, 'data-ui-migrated="checkio"'],
  ['checkio tabs migration marker', checkio, 'data-ui-migrated="checkio-tabs"'],
  ['checkio list migration marker', checkio, 'data-ui-migrated="checkio-list"'],
  ['checkio card migration marker', checkio, 'data-ui-migrated="checkio-card"'],
  ['checkio UI facade usage', checkio, 'window.FandqiUI'],
  ['central checkio button helper', checkio, 'renderCheckioButton'],
  ['central checkio badge helper', checkio, 'renderCheckioBadge'],
  ['central checkio actions helper', checkio, 'renderCheckioActionButtons'],
  ['UI adapter renderButton', adapter, 'renderButton'],
  ['UI adapter renderBadge', adapter, 'renderBadge'],
  ['UI adapter renderEmptyState', adapter, 'renderEmptyState'],
  ['UI adapter renderTabs', adapter, 'renderTabs']
];

const failures = required
  .filter(([, source, token]) => !source.includes(token))
  .map(([label, , token]) => `${label}: missing ${token}`);

const forbiddenGuestPatterns = [
  /<button class="btn small ghost" type="button" data-action="view-guest"/,
  /<button class="btn small ghost" type="button" data-action="open-guest-reservation"/,
  /<button class="btn small ghost" type="button" data-action="print-guest-reservation"/,
  /<span class="guest-stay-badge guest-stay-badge--\$\{h\(entry\.stayStatus\)\}"/
];

const forbiddenCheckioPatterns = [
  /<button class="btn small primary" type="button" data-action="checkio-check-in"/,
  /<button class="btn small warning" type="button" data-action="checkio-blocked-check-out"/,
  /<button class="btn small ghost" type="button" data-action="checkio-check-out"/,
  /<button class="btn small ghost" type="button" data-action="checkio-view-reservation"/,
  /<button class="btn small ghost" type="button" data-action="checkio-print-reservation"/,
  /<button class="btn small luxury" type="button" data-action="checkio-print-account"/,
  /<span class="guest-stay-badge guest-stay-badge--\$\{h\(timelineStatus\)\}"/
];

for (const pattern of forbiddenGuestPatterns) {
  if (pattern.test(guests)) failures.push(`forbidden legacy guest UI pattern found: ${pattern}`);
}



const checkioThreeColumnTokens = [
  ['checkio grid 3-column marker', checkio, 'data-layout-fixed="checkio-cards-three-per-row"'],
  ['checkio cards 3 per row CSS phase marker', patchCss, 'Final Local MVP Closure Phase 58 — check-in/out cards three per row'],
  ['checkio cards 3 columns CSS', patchCss, '.checkio-page .checkio-cards-grid[data-layout-fixed="checkio-cards-three-per-row"]'],
  ['checkio cards grid 3 columns rule', patchCss, 'grid-template-columns: repeat(3, minmax(0, 1fr))'],
  ['checkio cards grid 2 columns responsive rule', patchCss, 'grid-template-columns: repeat(2, minmax(0, 1fr))'],
  ['checkio cards readable min height', patchCss, 'min-height: 236px']
];

for (const [label, source, token] of checkioThreeColumnTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

const guestThreeColumnTokens = [
  ['guest grid 3-column marker', guests, 'data-layout-fixed="guest-cards-three-per-row"'],
  ['guest cards 3 per row CSS phase marker', patchCss, 'Final Local MVP Closure Phase 57 — guest cards three per row'],
  ['guest cards 3 columns CSS', patchCss, 'grid-template-columns: repeat(3, minmax(0, 1fr))'],
  ['guest cards 2 columns responsive CSS', patchCss, 'grid-template-columns: repeat(2, minmax(0, 1fr))'],
  ['guest cards 1 column responsive CSS', patchCss, 'grid-template-columns: 1fr'],
  ['guest cards readable min height', patchCss, 'min-height: 236px']
];

for (const [label, source, token] of guestThreeColumnTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}

for (const pattern of forbiddenCheckioPatterns) {
  if (pattern.test(checkio)) failures.push(`forbidden legacy check-in/out UI pattern found: ${pattern}`);
}

if (failures.length) {
  console.error('Guests & Check-in/out UI migration audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Guests & Check-in/out UI migration audit passed ✅');
