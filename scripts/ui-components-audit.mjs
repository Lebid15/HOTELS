import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps', 'web', 'public');
const jsDir = path.join(publicDir, 'assets', 'js');
const professionalDir = path.join(jsDir, 'professional');
const cssDir = path.join(publicDir, 'assets', 'css');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const read = file => fs.readFileSync(file, 'utf8');

const uiFiles = [
  'ui/html.mjs',
  'ui/button.mjs',
  'ui/badge.mjs',
  'ui/card.mjs',
  'ui/tabs.mjs',
  'ui/modal.mjs',
  'ui/form-field.mjs',
  'ui/table.mjs',
  'ui/empty-state.mjs',
  'ui/index.mjs',
  'ui/component-factory.mjs',
  'adapters/ui-adapter.js'
];

for (const file of uiFiles) {
  assert(fs.existsSync(path.join(professionalDir, file)), `Central UI component file missing: ${file}`);
}

const indexModule = read(path.join(professionalDir, 'ui/index.mjs'));
for (const expected of ['renderButton', 'renderCard', 'renderBadge', 'renderTabs', 'renderModal', 'renderField', 'renderTable', 'renderEmptyState']) {
  assert(indexModule.includes(expected), `ui/index.mjs must export ${expected}.`);
}

const componentFactory = read(path.join(professionalDir, 'ui/component-factory.mjs'));
assert(componentFactory.includes("export * from './index.mjs'"), 'component-factory.mjs must remain a compatibility re-export of ui/index.mjs.');

const appEntry = read(path.join(professionalDir, 'app-entry.mjs'));
assert(appEntry.includes("import * as ui from './ui/component-factory.mjs'") || appEntry.includes("import * as ui from './ui/index.mjs'"), 'Professional app entry must import the full central UI system.');
assert(appEntry.includes('ui,'), 'FandqiProfessional namespace must expose ui.');
assert(appEntry.includes('central-ui-components'), 'Professional app entry version must document central UI components.');

const adapter = read(path.join(professionalDir, 'adapters/ui-adapter.js'));
for (const expected of ['window.FandqiUI', 'renderButton', 'renderCard', 'renderTabs', 'renderBadge', 'renderEmptyState']) {
  assert(adapter.includes(expected), `UI adapter missing ${expected}.`);
}
assert(adapter.includes('FandqiProfessional?.ui'), 'UI adapter must delegate to the professional UI namespace when available.');

const html = read(path.join(publicDir, 'index.html'));
const uiAdapterPath = 'assets/js/professional/adapters/ui-adapter.js';
const printAdapterPath = 'assets/js/professional/adapters/print-adapter.js';
const i18nPath = 'assets/js/i18n.js';
assert(html.includes(uiAdapterPath), 'index.html must load ui-adapter.js.');
assert(html.indexOf(printAdapterPath) < html.indexOf(uiAdapterPath), 'ui-adapter.js should load after print-adapter.js.');
assert(html.indexOf(uiAdapterPath) < html.indexOf(i18nPath), 'ui-adapter.js must load before legacy modules.');

const componentCss = path.join(cssDir, 'components', 'ui-components.css');
assert(fs.existsSync(componentCss), 'Central UI components CSS file is missing.');
const appCss = read(path.join(cssDir, 'app.css'));
assert(appCss.includes("./components/ui-components.css"), 'app.css must import components/ui-components.css.');

const packageJson = JSON.parse(read(path.join(root, 'package.json')));
assert(packageJson.scripts?.['ui-components:audit'], 'package.json missing ui-components:audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('ui-components:audit'), 'quality:full must include ui-components:audit.');

if (errors.length) {
  console.error('Central UI components audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Central UI components audit passed ✅');
