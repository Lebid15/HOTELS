import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const bootstrap = read('apps/web/public/assets/js/modules/00-bootstrap-icons-design.js');
const controls = read('apps/web/public/assets/css/components/central-controls.css');
const tokens = read('apps/web/public/assets/css/tokens.css');
const packageJson = JSON.parse(read('package.json'));

for (const icon of ['edit', 'save', 'print', 'search', 'filter', 'download', 'wrench', 'bed', 'key', 'logOut']) {
  assert(bootstrap.includes(`${icon}: \``), `central icon registry missing ${icon}`);
}

for (const helper of ['getCentralButtonIconKey', 'ensureCentralButtonIcon', 'normalizeCentralActionButton']) {
  assert(bootstrap.includes(`function ${helper}`), `central design-system runtime missing ${helper}()`);
}

for (const selector of ['.platform-owner-card', '.owner-profile-panel', '.owner-stat-card', '.auth-v3-card']) {
  assert(bootstrap.includes(selector), `applyCentralDesignSystem does not centralize ${selector}`);
}

for (const selector of ['.ds-btn-icon', '.ds-btn.ds-btn-success', '.platform-owner-card', '.ds-tab-btn', '.ds-modal-card']) {
  assert(controls.includes(selector), `central controls CSS missing ${selector}`);
}

for (const token of ['--ds-action-success-solid', '--ds-action-success-bg']) {
  assert(tokens.includes(token), `tokens.css missing ${token}`);
}

assert(packageJson.scripts?.['central-ui-system:closure-audit'], 'package.json missing central-ui-system:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('central-ui-system:closure-audit'), 'quality:full must include central-ui-system:closure-audit.');

if (failures.length) {
  console.error('Central UI system closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Central UI system closure audit passed ✅');
