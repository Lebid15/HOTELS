import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const auth = read('apps/web/public/assets/js/modules/11b-workspace-login-shell-core.js');
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
  'const AUTH_CENTRAL_AUDIT_MARKERS',
  'phase113-auth-access-centralization',
  'auth-shell-central-page',
  'auth-layout-central',
  'auth-visual-central-surface',
  'auth-card-central-surface',
  'auth-field-central',
  'auth-password-field-central',
  'auth-action-central',
  'function authUi',
  'function authAttrs',
  'function renderAuthButton',
  'function renderAuthIconButton',
  'function renderAuthHead',
  'function renderAuthPills',
  'function renderAuthField',
  'function renderAuthPasswordField',
  'function renderAuthRememberCheck',
  'function renderAuthSwitch',
  'function renderAuthSubmit',
  'function renderAuthFormSurface',
  'ui.renderButton',
  'ui.renderIconButton',
  'ui.renderActions',
  'ui.renderSectionHead',
  'ui.renderSurface',
  'ui.renderField',
  'ui.renderCheckField',
  'data-ui-page="auth-${h(mode)}"',
  'data-ui-component="auth-shell"',
  'data-ui-component="auth-layout"',
  "'data-ui-component': 'auth-visual'",
  "'data-ui-component': component",
  "'data-ui-component': 'auth-field'",
  "'data-ui-component': 'auth-password-field'",
  "'data-ui-component': 'auth-password-toggle'",
  "'data-ui-component': 'auth-remember-check'",
  "'data-ui-component': 'auth-submit-button'",
  'data-ui-component="auth-login-form-fields"',
  'data-ui-component="auth-register-form-fields"',
  'data-ui-component="auth-forgot-form-fields"'
]) {
  assert(auth.includes(token), `auth source missing central token: ${token}`);
}

for (const [name, required] of [
  ['renderAuthLoginForm', ['renderAuthFormSurface({', 'renderAuthToolbar()', 'renderAuthHead({', 'renderAuthPills({', 'renderAuthField({', 'renderAuthPasswordField({', 'renderAuthRememberCheck()', 'renderAuthSubmit({', 'renderAuthSwitch({']],
  ['renderAuthRegisterForm', ['renderAuthFormSurface({', 'renderAuthToolbar()', 'renderAuthHead({', 'renderAuthPills({', 'renderAuthField({', 'renderAuthPasswordField({', 'renderAuthSubmit({', 'renderAuthSwitch({']],
  ['renderAuthForgotForm', ['renderAuthFormSurface({', 'renderAuthToolbar()', 'renderAuthHead({', 'renderAuthField({', 'renderAuthSubmit({', 'renderAuthSwitch({', 'auth-reset-central-surface']]
]) {
  const source = functionSource(auth, name);
  assert(Boolean(source), `missing ${name} source`);
  for (const token of required) assert(source.includes(token), `${name} missing centralized call: ${token}`);
  for (const forbidden of [
    '<form class="auth-card',
    '<div class="field">',
    '<label class="check-row">',
    '<button class="btn primary',
    '<button class="link-btn',
    '<button class="password-toggle icon-btn',
    '<div class="auth-card-head',
    '<div class="auth-mini-pills-v3"'
  ]) assert(!source.includes(forbidden), `${name} still contains legacy raw token: ${forbidden}`);
}

const renderLoginSource = functionSource(auth, 'renderLogin');
assert(renderLoginSource.includes('auth-shell-central-page'), 'renderLogin missing auth-shell-central-page marker.');
assert(renderLoginSource.includes('data-ui-page="auth-${h(mode)}"'), 'renderLogin missing auth page data attribute.');
assert(renderLoginSource.includes('data-ui-component="auth-layout"'), 'renderLogin missing auth layout component marker.');

for (const token of [
  'Phase 113: auth/login/register/forgot 100% component centralization',
  '.auth-shell-central-page[data-ui-centralized="phase113-auth-access-centralization"]',
  '.auth-shell-central-page .auth-layout-central[data-ui-component="auth-layout"]',
  '.auth-shell-central-page .auth-visual-central-surface[data-ui-component="auth-visual"]',
  '.auth-shell-central-page .auth-card-central-surface[data-ui-component="auth-login-card"]',
  '.auth-shell-central-page .auth-card-central-surface[data-ui-component="auth-register-card"]',
  '.auth-shell-central-page .auth-card-central-surface[data-ui-component="auth-forgot-card"]',
  '.auth-shell-central-page .auth-toolbar-central[data-ui-component="auth-toolbar"]',
  '.auth-shell-central-page .auth-card-head-central[data-ui-component="auth-login-head"]',
  '.auth-shell-central-page .auth-pills-central-surface[data-ui-component="auth-benefit-pills"]',
  '.auth-shell-central-page [data-ui-component="auth-benefit-pill"]',
  '.auth-shell-central-page .auth-form-central-grid[data-ui-component$="form-fields"]',
  '.auth-shell-central-page .auth-field-central[data-ui-component="auth-field"]',
  '.auth-shell-central-page .auth-password-field-central[data-ui-component="auth-password-field"]',
  '.auth-shell-central-page .auth-password-control-central[data-ui-component="auth-password-control"]',
  '.auth-shell-central-page .auth-password-toggle-central[data-ui-component="auth-password-toggle"]',
  '.auth-shell-central-page .auth-inline-central-row[data-ui-component="auth-login-options"]',
  '.auth-shell-central-page .auth-submit-central[data-ui-component="auth-submit-button"]',
  '.auth-shell-central-page .auth-reset-central-surface[data-ui-component="auth-reset-illustration"]'
]) assert(css.includes(token), `Phase 113 CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['auth-central:closure-audit'], 'package.json missing auth-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('auth-central:closure-audit'), 'quality:full must include auth-central:closure-audit.');

if (failures.length) {
  console.error('Auth central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Auth central closure audit passed ✅');
