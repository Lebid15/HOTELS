import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];

const patch = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

const requiredTokens = [
  'remove outer content card visual frame',
  '--fandqi-workspace-padding',
  '--fandqi-workspace-gap',
  '.content .page-shell',
  '.content .workspace-blank',
  'background: transparent',
  'border: 0',
  'box-shadow: none',
  'border-radius: 0',
  'overflow-x: clip',
  '.content .page-shell > *',
  '.content .hotels-page'
];

for (const token of requiredTokens) {
  if (!patch.includes(token)) failures.push(`missing outer content card removal token: ${token}`);
}

if (patch.includes('!important')) {
  failures.push('outer content card removal must not use !important');
}

if (!packageJson.scripts?.['workspace-outer-card-removal:audit']) {
  failures.push('package.json missing workspace-outer-card-removal:audit script');
}

if (!packageJson.scripts?.['quality:full']?.includes('workspace-outer-card-removal:audit')) {
  failures.push('quality:full missing workspace-outer-card-removal:audit');
}

if (failures.length) {
  console.error('Workspace outer card removal audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Workspace outer card removal audit passed ✅');
