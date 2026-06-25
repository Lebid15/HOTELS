import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps', 'web', 'public');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(html|css|js)$/.test(entry.name)) files.push(full);
  }
}

function readAllByExt(dir, ext) {
  const collected = [];
  function inner(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) inner(full);
      else if (entry.name.endsWith(ext)) collected.push(fs.readFileSync(full, 'utf8'));
    }
  }
  inner(dir);
  return collected.join('\n');
}

walk(publicDir);

const errors = [];
const cssRoot = path.join(publicDir, 'assets', 'css');
const jsRoot = path.join(publicDir, 'assets', 'js');
const centralCss = readAllByExt(cssRoot, '.css');
const appJs = readAllByExt(jsRoot, '.js');
const appCssEntry = fs.readFileSync(path.join(cssRoot, 'app.css'), 'utf8');

for (const file of files) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  const text = fs.readFileSync(file, 'utf8');

  if (!rel.endsWith('app.css') && !rel.endsWith('tokens.css') && /\sstyle\s*=/.test(text)) {
    errors.push(`${rel}: inline style is not allowed.`);
  }

  if (!rel.endsWith('tokens.css') && /#[0-9a-fA-F]{3,8}\b/.test(text.replace(/&#[0-9]+;/g, ''))) {
    errors.push(`${rel}: hard-coded hex color outside tokens.css.`);
  }

  if (!rel.endsWith('tokens.css') && /!important/.test(text)) {
    errors.push(`${rel}: !important is not allowed; fix through central specificity/tokens.`);
  }

  if (rel.endsWith('.css') && !rel.endsWith('tokens.css') && /rgba?\(/.test(text)) {
    errors.push(`${rel}: raw rgb/rgba colors are not allowed outside tokens.css; use tokens or color-mix.`);
  }
}

for (const requiredImport of [
  './base/auth-layout.css',
  './components/design-system.css',
  './components/central-controls.css',
  './patches/final-regression-fixes.css'
]) {
  if (!appCssEntry.includes(requiredImport)) errors.push(`app.css missing modular import ${requiredImport}`);
}

for (const required of ['.btn', '.input', '.auth-card', '.sidebar', '.topbar', '.page-shell', '.empty-panel', '.ds-card', '.ds-filters', '.ds-control', '.ds-btn', '.ds-modal-card']) {
  if (!centralCss.includes(required)) errors.push(`Modular CSS missing central class ${required}`);
}

for (const required of ['const DESIGN_SYSTEM', 'function applyCentralDesignSystem', 'function getCentralButtonTone']) {
  if (!appJs.includes(required)) errors.push(`Modular JS missing central design-system helper: ${required}`);
}

if (!appJs.includes('window.FANDQI_MODULAR_ENTRY')) {
  errors.push('app.js compatibility marker is missing.');
}

if (errors.length) {
  console.error('UI audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('UI audit passed ✅');
