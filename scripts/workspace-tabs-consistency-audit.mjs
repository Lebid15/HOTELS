import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];

const patchCss = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const tabsMjs = read('apps/web/public/assets/js/professional/ui/tabs.mjs');
const uiAdapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const settingsModule = read('apps/web/public/assets/js/modules/03a-platform-settings-auth-hotels-managers.js');
const hotelSettingsPageModule = read('apps/web/public/assets/js/modules/04-hotel-settings.js');
const checkioModule = read('apps/web/public/assets/js/modules/09b-check-in-out.js');
const reportsModule = read('apps/web/public/assets/js/modules/10b-reports.js');

const requiredCssTokens = [
  'Final Local MVP Closure — unified workspace tabs',
  '.settings-tabs,',
  '.checkio-tabs,',
  '.reports-tabs',
  '.settings-tabs .settings-tab-btn',
  '.checkio-tabs .checkio-tab',
  '.checkio-tabs .fandqi-ui-tab',
  '.reports-tabs .report-tab',
  '.reports-tabs .btn.report-tab',
  'aria-selected="true"',
  'aria-selected="false"',
  'var(--color-on-primary)',
  'var(--color-primary)',
  '@media (max-width: 700px)',
  'Keep settings-tab icons visually identical',
  'text-overflow: ellipsis',
  'max-height: 42px',
  'margin: 0 0 16px',
  'border-width: 1px',
  'padding: 0 12px',
  '.hotel-settings-header-action',
  '.hotel-settings-header-title',
  'max-height: 92px',
  'height: 92px',
  'grid-template-areas: "title action"',
  'Final Local MVP Closure Phase 62 — locked hotel settings header and tabs',
  'max-height: 72px',
  'height: 72px',
  '.hotel-settings-page .hotel-settings-title-head[data-layout-fixed="hotel-settings-title-only-head"]',
  'Final Local MVP Closure Phase 55 — hotel settings title-only fixed header',
  'height: 42px',
  'overflow: hidden',
  'max-height: 62px',
  'Final Local MVP Closure Phase 54 — fixed height hotel settings tabbar',
  'flex-wrap: nowrap',
  'min-height: 62px',
  'grid-template-columns: repeat(6, minmax(0, 1fr))',
  '.hotel-settings-page .hotel-settings-tabs[data-layout-fixed="stable-hotel-settings-tabs"]',
  'Final Local MVP Closure Phase 53 — stable hotel settings tab bar'
];

for (const token of requiredCssTokens) {
  if (!patchCss.includes(token)) failures.push(`missing unified tabs CSS token: ${token}`);
}

if (!tabsMjs.includes('...(tab.attrs || {})')) {
  failures.push('central renderTabs must preserve tab attrs such as data-checkio-tab');
}


if (!uiAdapter.includes('...(tab.attrs || {})')) {
  failures.push('classic FandqiUI renderTabs fallback must preserve tab attrs before app-entry is ready');
}

if (!uiAdapter.includes('data-action') || !uiAdapter.includes('options.tabClassName')) {
  failures.push('classic FandqiUI renderTabs fallback must preserve action and tabClassName options');
}

const requiredModuleTokens = [
  ['settings module renders settings tabs', settingsModule, 'settings-tabs hotel-settings-tabs'],
  ['settings module renders settings buttons', settingsModule, 'settings-tab-btn'],
  ['hotel settings stable tab marker', settingsModule, 'data-layout-fixed="stable-hotel-settings-tabs"'],
  ['hotel settings title-only head class', hotelSettingsPageModule, 'hotel-settings-title-head'],
  ['hotel settings locked header hotel-settings-header-action', hotelSettingsPageModule, 'hotel-settings-header-action'],
  ['hotel settings locked header hotel-settings-header-title', hotelSettingsPageModule, 'hotel-settings-header-title'],
  ['hotel settings locked header hotel-settings-toolbar-locked', hotelSettingsPageModule, 'hotel-settings-toolbar-locked'],
  ['hotel settings title-only head marker', hotelSettingsPageModule, 'data-layout-fixed="hotel-settings-title-only-head"'],
  ['checkio module renders migrated tabs', checkioModule, 'data-ui-migrated="checkio-tabs"'],
  ['checkio module passes data-checkio-tab attrs', checkioModule, 'data-checkio-tab'],
  ['reports module renders reports tabs', reportsModule, 'data-ui-migrated="reports-tabs"'],
  ['reports module renders report tab button', reportsModule, 'report-tab']
];

for (const [label, source, token] of requiredModuleTokens) {
  if (!source.includes(token)) failures.push(`${label}: missing ${token}`);
}


const hotelSettingsRenderStart = hotelSettingsPageModule.indexOf('function renderHotelSettingsPage');
const hotelSettingsRenderEnd = hotelSettingsPageModule.indexOf('${renderManagerHotelHeader(hotel)}', hotelSettingsRenderStart);
const hotelSettingsHeadSource = hotelSettingsRenderStart >= 0 && hotelSettingsRenderEnd > hotelSettingsRenderStart
  ? hotelSettingsPageModule.slice(hotelSettingsRenderStart, hotelSettingsRenderEnd)
  : '';

if (hotelSettingsHeadSource.includes('hotelSettings.description') || hotelSettingsHeadSource.includes('<p class="helper">')) {
  failures.push('hotel settings header above tabs must be title-only without helper phrases');
}

const packageJson = JSON.parse(read('package.json'));
if (!packageJson.scripts?.['workspace-tabs-consistency:audit']) {
  failures.push('package.json missing workspace-tabs-consistency:audit script');
}
if (!packageJson.scripts?.['quality:full']?.includes('workspace-tabs-consistency:audit')) {
  failures.push('quality:full missing workspace-tabs-consistency:audit');
}

if (failures.length) {
  console.error('Workspace tabs consistency audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Workspace tabs consistency audit passed ✅');
