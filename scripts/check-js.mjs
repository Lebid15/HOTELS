import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const targets = [
  path.join(root, 'apps', 'server'),
  path.join(root, 'apps', 'web', 'public', 'assets', 'js'),
  path.join(root, 'scripts')
];

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|mjs)$/.test(entry.name)) files.push(full);
  }
}

targets.forEach(walk);
files.sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stdout || '');
    console.error(result.stderr || '');
    console.error(`JS syntax check failed: ${path.relative(root, file)}`);
    process.exit(result.status || 1);
  }
}

console.log(`JS syntax check passed ✅ (${files.length} files)`);
