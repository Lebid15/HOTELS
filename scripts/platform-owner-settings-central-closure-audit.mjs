import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const settingsCore = read('apps/web/public/assets/js/modules/03a-platform-settings-auth-hotels-managers.js');
const ownerPages = read('apps/web/public/assets/js/modules/03e-platform-owner-settings-centralization.js');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return '';
  const brace = source.indexOf('{', start);
  let depth = 1;
  let i = brace + 1;
  let inString = null;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1] || '';
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
        if (depth === 0) return source.slice(start, i + 1);
      }
    }
    i += 1;
  }
  return '';
}

for (const token of [
  'const PLATFORM_OWNER_SETTINGS_CENTRAL_AUDIT_MARKERS',
  'phase112-platform-owner-settings',
  'data-ui-page=\"platform-owner-settings\"',
  'data-ui-centralized=\"phase112-platform-owner-settings\"',
  'function platformSettingsUi',
  'function renderPlatformSettingsHead',
  'function renderPlatformSettingsButton',
  'function renderPlatformSettingsFileAction',
  'function renderPlatformSettingsPanelTitle',
  'function renderPlatformSettingsFormGrid',
  'function renderPlatformSettingsField',
  'function renderPlatformSettingsPasswordField',
  'function renderPlatformSettingsCheck',
  'function renderPlatformSettingsPanel',
  'function renderPlatformSettingsLogoBlock',
  'function renderPlatformSettingsInvoicePreview',
  'ui.renderSectionHead',
  'ui.renderButton',
  'ui.renderPanelTitle',
  'ui.renderFormGrid',
  'ui.renderField',
  'ui.renderCheckField',
  'ui.renderSurface',
  "'data-ui-component': 'owner-settings-page-head'",
  'data-ui-component="owner-settings-form"',
  "'data-ui-component': 'owner-settings-panel'",
  "component = 'owner-settings-field'",
  'data-ui-component="owner-settings-logo-row"',
  'data-ui-component="owner-settings-logo-actions"',
  'data-ui-component="owner-settings-backup-actions"',
  'data-ui-component="owner-settings-backup-helper"'
]) {
  assert(ownerPages.includes(token), `platform owner settings source missing central token: ${token}`);
}

for (const token of [
  'ui.renderTabs',
  'data-ui-component\': \'owner-settings-tabs\'',
  'data-ui-component\': \'owner-settings-tab\'',
  'data-settings-tab'
]) {
  assert(settingsCore.includes(token), `platform settings tabs missing central token: ${token}`);
}

const renderSource = functionSource(ownerPages, 'renderPlatformSettingsPage');
assert(Boolean(renderSource), 'missing renderPlatformSettingsPage source');
for (const token of [
  '<div class="section-head platform-settings-title-head"',
  '<section class="${panelClass',
  '<div class="field">',
  '<label class="check-row settings-check"',
  '<button class="btn primary"',
  '<button class="btn ghost"',
  '<button class="btn danger"'
]) {
  assert(!renderSource.includes(token), `renderPlatformSettingsPage still contains legacy raw token: ${token}`);
}
for (const token of [
  'renderPlatformSettingsHead()',
  'renderSettingsTabs()',
  'renderPlatformSettingsPanel({',
  'renderPlatformSettingsField({',
  'renderPlatformSettingsCheck({',
  'renderPlatformSettingsPasswordField({',
  'renderPlatformSettingsInvoicePreview(settings)',
  'renderPlatformSettingsFileAction({',
  'owner-settings-central-page',
  'owner-settings-form'
]) {
  assert(renderSource.includes(token), `renderPlatformSettingsPage missing centralized call: ${token}`);
}

for (const token of [
  'Phase 112: platform owner settings 100% component centralization',
  '.owner-settings-central-page[data-ui-centralized="phase112-platform-owner-settings"]',
  '.owner-settings-central-page .owner-central-hero[data-ui-component="owner-settings-page-head"]',
  '.owner-settings-central-page .owner-settings-tabs[data-ui-component="owner-settings-tabs"]',
  '.owner-settings-central-page .owner-settings-form[data-ui-component="owner-settings-form"]',
  '.owner-settings-central-page .owner-settings-panel[data-ui-component="owner-settings-panel"]',
  '.owner-settings-central-page [data-ui-component="owner-settings-panel-title"]',
  '.owner-settings-central-page .owner-settings-field[data-ui-component="owner-settings-field"]',
  '.owner-settings-central-page [data-ui-component="owner-settings-logo-row"]',
  '.owner-settings-central-page [data-ui-component="owner-settings-logo-preview"]',
  '.owner-settings-central-page [data-ui-component="owner-settings-backup-actions"]',
  '.owner-settings-central-page [data-ui-component="owner-settings-password-control"]',
  '.owner-settings-central-page [data-ui-component="owner-settings-check-field"]',
  '.owner-settings-central-page [data-ui-component="owner-settings-invoice-preview"]'
]) assert(css.includes(token), `Phase 112 CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['platform-owner-settings-central:closure-audit'], 'package.json missing platform-owner-settings-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('platform-owner-settings-central:closure-audit'), 'quality:full must include platform-owner-settings-central:closure-audit.');

if (failures.length) {
  console.error('Platform owner settings central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Platform owner settings central closure audit passed ✅');
