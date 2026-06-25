import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps', 'web', 'public');
const jsDir = path.join(publicDir, 'assets', 'js');
const jsModulesDir = path.join(jsDir, 'modules');
const cssDir = path.join(publicDir, 'assets', 'css');
const appJs = path.join(jsDir, 'app.js');
const appCss = path.join(cssDir, 'app.css');
const indexPath = path.join(publicDir, 'index.html');
const errors = [];

function lineCount(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(fs.existsSync(jsModulesDir), 'assets/js/modules directory is missing.');
assert(fs.existsSync(path.join(cssDir, 'base')), 'assets/css/base directory is missing.');
assert(fs.existsSync(path.join(cssDir, 'components')), 'assets/css/components directory is missing.');
assert(fs.existsSync(path.join(cssDir, 'pages')), 'assets/css/pages directory is missing.');
assert(fs.existsSync(path.join(cssDir, 'layout')), 'assets/css/layout directory is missing.');
assert(fs.existsSync(path.join(cssDir, 'patches')), 'assets/css/patches directory is missing.');

const jsModules = fs.readdirSync(jsModulesDir).filter(file => /^\d{2}[a-z]?-.+\.js$/.test(file)).sort();
assert(jsModules.length >= 20, 'Expected at least 20 ordered JS modules after professional split.');
assert(lineCount(appJs) <= 60, 'app.js must remain a small compatibility entry, not a monolith.');
assert(lineCount(appCss) <= 80, 'app.css must remain an import-only stylesheet entry, not a monolith.');

const html = fs.readFileSync(indexPath, 'utf8');
for (const module of jsModules) {
  assert(html.includes(`assets/js/modules/${module}`), `index.html does not load JS module: ${module}`);
}

const cssEntry = fs.readFileSync(appCss, 'utf8');
for (const required of [
  './base/auth-layout.css',
  './components/design-system.css',
  './components/central-controls.css',
  './layout/sidebar-topbar-dashboard.css',
  './patches/final-regression-fixes.css'
]) {
  assert(cssEntry.includes(required), `app.css missing required CSS module import: ${required}`);
}

for (const module of jsModules) {
  const count = lineCount(path.join(jsModulesDir, module));
  assert(count <= 1200, `${module} is too large (${count} lines). Split it before adding more logic.`);
}

if (errors.length) {
  console.error('Modular audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Modular audit passed ✅ (${jsModules.length} JS modules)`);
