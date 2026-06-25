import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'apps', 'web', 'public');
const professionalDir = path.join(publicDir, 'assets', 'js', 'professional');
const moduleDir = path.join(publicDir, 'assets', 'js', 'modules');
const packagePath = path.join(root, 'package.json');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredProfessionalFiles = [
  'app-entry.mjs',
  'core/event-bus.mjs',
  'core/date-formatters.mjs',
  'core/runtime-contract.mjs',
  'data/repository.mjs',
  'data/repositories/domain-repositories.mjs',
  'ui/component-factory.mjs',
  'print/print-service.mjs'
];

for (const file of requiredProfessionalFiles) {
  assert(fs.existsSync(path.join(professionalDir, file)), `Professional architecture file missing: ${file}`);
}

const modules = fs.readdirSync(moduleDir).filter(file => /\.js$/.test(file));
assert(modules.length >= 20, 'Feature modules must stay split into at least 20 files.');

for (const file of modules) {
  const count = fs.readFileSync(path.join(moduleDir, file), 'utf8').split(/\r?\n/).length;
  assert(count <= 1200, `${file} is too large (${count} lines).`);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert(pkg.scripts['runtime:audit'], 'runtime:audit script missing.');
assert(pkg.scripts['architecture:audit'], 'architecture:audit script missing.');
assert(pkg.scripts['professional:audit'], 'professional:audit script missing.');
assert(pkg.scripts['quality:full']?.includes('runtime:audit'), 'quality:full must include runtime:audit.');
assert(pkg.scripts['quality:full']?.includes('architecture:audit'), 'quality:full must include architecture:audit.');
assert(pkg.scripts['quality:full']?.includes('professional:audit'), 'quality:full must include professional:audit.');

if (errors.length) {
  console.error('Architecture audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Architecture audit passed ✅');
