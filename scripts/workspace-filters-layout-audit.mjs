import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];

const patch = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const roomsModule = read('apps/web/public/assets/js/modules/06-rooms-dashboard.js') + '\n' + read('apps/web/public/assets/js/modules/06c-rooms-floors-centralization.js');

const requiredTokens = [
  'global filter/content separation fix',
  'strict compact unified filters fix',
  '.rooms-page .rooms-filter-panel + .rooms-content-after-filter',
  '.rooms-page .rooms-filter-panel .rooms-filters-bar',
  '.rooms-page .workspace-filter-panel-head',
  '.rooms-page .rooms-filter-panel',
  'rooms filter source-separated panel',
  '.rooms-page .rooms-content-after-filter .room-floor-sections',
  'grid-template-rows: none',
  'flex-direction: column',
  'display: flex',
  '.content .rooms-page.hotels-page',
  'rooms page independent vertical stack',
  '.content :is(',
  '.guests-page .guests-filters-bar + .guests-cards-slot',
  '.maintenance-page.hotels-page',
  '.housekeeping-page.hotels-page',
  '.checkio-page.hotels-page',
  '.reservations-page.hotels-page',
  '.staff-page.hotels-page',
  '.guests-page.hotels-page',
  'manager pages independent vertical stack',
  '--fandqi-filter-content-gap',
  '--fandqi-filter-compact-height',
  '--fandqi-filter-compact-gap',
  '.filters-bar + *',
  '.compact-filters-bar + *',
  '.rooms-filters-bar + *',
  '.staff-filters-bar + *',
  '.reservations-filters-bar + *',
  '.guests-filters-bar + *',
  '.checkio-filters-bar + *',
  '.housekeeping-filters-bar + *',
  '.maintenance-filters-bar + *',
  '.reports-filters-bar + *',
  '.payments-filters-bar + *',
  '.hotels-page .rooms-filters-bar',
  '.hotels-page .staff-filters-bar',
  'grid-template-rows: auto var(--fandqi-filter-compact-height)',
  'position: static',
  'min-height: var(--fandqi-filter-compact-height)',
  '#roomsTableSlot',
  '#staffTableSlot',
  '#reportsBodySlot',
  'clear: both'
];

for (const token of requiredTokens) {
  if (!patch.includes(token)) failures.push(`missing global filter layout token: ${token}`);
}

if (!roomsModule.includes('filters-bar compact-filters-bar rooms-filters-bar')) {
  failures.push('rooms page filter bar must use compact-filters-bar class');
}
if (!roomsModule.includes('workspace-filter-panel rooms-filter-panel')) {
  failures.push('rooms page filter must be wrapped inside source-separated workspace filter panel');
}
if (!roomsModule.includes('rooms-content-after-filter')) {
  failures.push('rooms page content slot must be explicitly marked after the source-separated filter panel');
}
if (!roomsModule.includes('data-layout-fixed="after-independent-rooms-filter"')) {
  failures.push('rooms page content slot must explicitly confirm it is after the independent rooms filter');
}
const roomsFilterIndex = roomsModule.indexOf('rooms-filter-panel');
const roomsFilterLayoutIndex = roomsModule.indexOf('source-separated-filter');
const roomsFilterBarIndex = roomsModule.indexOf('rooms-filters-bar');
const roomsTableIndex = roomsModule.indexOf('<div id="roomsTableSlot" class="rooms-cards-slot rooms-content-after-filter"');
if ([roomsFilterIndex, roomsFilterLayoutIndex, roomsFilterBarIndex, roomsTableIndex].some(index => index < 0) || roomsTableIndex < roomsFilterIndex || roomsTableIndex < roomsFilterBarIndex) {
  failures.push('rooms filter panel must be fully closed before roomsTableSlot starts');
}


const cssFiles = [
  'apps/web/public/assets/css/components/design-system.css',
  'apps/web/public/assets/css/pages/rooms-reservations.css',
  'apps/web/public/assets/css/pages/guests-checkio-housekeeping.css',
  'apps/web/public/assets/css/pages/food-maintenance-reports.css',
  'apps/web/public/assets/css/patches/final-regression-fixes.css'
];

const combined = cssFiles.map(read).join('\n');
for (const klass of [
  'filters-bar',
  'compact-filters-bar',
  'rooms-filters-bar',
  'staff-filters-bar',
  'reservations-filters-bar',
  'guests-filters-bar',
  'checkio-filters-bar',
  'housekeeping-filters-bar',
  'maintenance-filters-bar',
  'reports-filters-bar',
  'payments-filters-bar'
]) {
  if (!combined.includes(`.${klass}`)) failures.push(`filter class not covered in CSS: ${klass}`);
}

const packageJson = JSON.parse(read('package.json'));
if (!packageJson.scripts?.['workspace-filters-layout:audit']) {
  failures.push('package.json missing workspace-filters-layout:audit script');
}
if (!packageJson.scripts?.['quality:full']?.includes('workspace-filters-layout:audit')) {
  failures.push('quality:full missing workspace-filters-layout:audit');
}

if (failures.length) {
  console.error('Workspace filters layout audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Workspace filters layout audit passed ✅');
