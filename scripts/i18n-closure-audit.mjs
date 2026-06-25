import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const localeDir = path.join(root, 'apps/web/public/locales');
const jsDir = path.join(root, 'apps/web/public/assets/js');
const requiredLocales = ['ar', 'en'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flatten(value, prefix = '', output = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }
  output[prefix] = value;
  return output;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
  return files;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const locales = Object.fromEntries(requiredLocales.map(locale => {
  const filePath = path.join(localeDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`Missing locale file: ${filePath}`);
  return [locale, flatten(readJson(filePath))];
}));

const [baseLocale, ...otherLocales] = requiredLocales;
const baseKeys = new Set(Object.keys(locales[baseLocale]));
const failures = [];

for (const locale of otherLocales) {
  const keys = new Set(Object.keys(locales[locale]));
  const missing = [...baseKeys].filter(key => !keys.has(key));
  const extra = [...keys].filter(key => !baseKeys.has(key));
  if (missing.length) failures.push(`${locale}.json is missing ${missing.length} keys: ${missing.slice(0, 20).join(', ')}`);
  if (extra.length) failures.push(`${locale}.json has ${extra.length} extra keys: ${extra.slice(0, 20).join(', ')}`);
}

for (const locale of requiredLocales) {
  for (const [key, value] of Object.entries(locales[locale])) {
    if (typeof value !== 'string') failures.push(`${locale}.${key} must be a string leaf value`);
    else if (!value.trim()) failures.push(`${locale}.${key} is empty`);
  }
}

const literalTKeys = new Map();
const literalKeyPattern = /\bt\(\s*'([^']+)'/g;
for (const filePath of walk(jsDir)) {
  const source = stripComments(fs.readFileSync(filePath, 'utf8'));
  let match;
  while ((match = literalKeyPattern.exec(source))) {
    const key = match[1];
    if (!literalTKeys.has(key)) literalTKeys.set(key, []);
    literalTKeys.get(key).push(path.relative(root, filePath));
  }
}

for (const [key, files] of literalTKeys) {
  for (const locale of requiredLocales) {
    if (!(key in locales[locale])) {
      failures.push(`Missing i18n key ${locale}.${key} used in ${[...new Set(files)].slice(0, 3).join(', ')}`);
    }
  }
}

if (failures.length) {
  console.error('✗ i18n closure audit failed');
  failures.slice(0, 80).forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`✓ i18n closure audit passed — ${baseKeys.size} synchronized keys across ${requiredLocales.join('/')} and ${literalTKeys.size} literal t() keys covered.`);
