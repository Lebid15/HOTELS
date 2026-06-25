import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const bootstrap = read('apps/web/public/assets/js/modules/00-bootstrap-icons-design.js');
const printUtils = read('apps/web/public/assets/js/modules/02-state-print-avatar-utils.js');
const uiAdapter = read('apps/web/public/assets/js/professional/adapters/ui-adapter.js');
const modalModule = read('apps/web/public/assets/js/professional/ui/modal.mjs');
const uiIndex = read('apps/web/public/assets/js/professional/ui/index.mjs');
const printActions = read('apps/web/public/assets/js/professional/print/print-actions.mjs');
const css = read('apps/web/public/assets/css/patches/final-regression-fixes.css');
const packageJson = JSON.parse(read('package.json'));

function functionSource(code, name) {
  const start = code.indexOf(`function ${name}`);
  if (start < 0) return '';
  let parenDepth = 0;
  let brace = -1;
  for (let cursor = start; cursor < code.length; cursor += 1) {
    const ch = code[cursor];
    if (ch === '(') parenDepth += 1;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === '{' && parenDepth === 0) { brace = cursor; break; }
  }
  if (brace < 0) return '';
  let depth = 1;
  let i = brace + 1;
  let inString = null;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1] || '';
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
        if (depth === 0) return code.slice(start, i + 1);
      }
    }
    i += 1;
  }
  return '';
}

for (const token of [
  'const MODAL_PRINT_CENTRAL_AUDIT_MARKERS',
  'phase117-modal-print-centralization',
  'modal-frame-central',
  'modal-head-central',
  'modal-actions-central',
  'print-window-actions-central',
  'function centralModalPrintUi',
  'function centralModalPrintAttrs',
  'function renderCentralModalButton',
  'function renderCentralModalCloseButton',
  'function renderCentralModalHead',
  'function renderCentralModalActions',
  'function renderCentralModalFrame',
  'function renderPrintWindowActions',
  'data-ui-component="modal-backdrop"',
  'data-ui-component="modal-head"',
  'data-ui-component="modal-actions"',
  'data-ui-component\': \'print-window-actions\''
]) assert(printUtils.includes(token), `print/modal utility source missing token: ${token}`);

for (const [name, required] of [
  ['renderCentralModalButton', ['ui.renderButton', 'modal-button-central', 'data-ui-component\': \'modal-button\'']],
  ['renderCentralModalHead', ['modal-head-central', 'renderCentralModalCloseButton', 'data-ui-component="modal-head"', 'modal-head-copy']],
  ['renderCentralModalActions', ['ui.renderActions', 'modal-actions-central', 'data-ui-component\': \'modal-actions\'']],
  ['renderCentralModalFrame', ['modal-backdrop-central', 'modal-frame-central', 'data-ui-component\': \'modal-frame\'']],
  ['renderPrintWindowActions', ['ui.renderButton', 'ui.renderActions', 'print-window-actions-central', 'print-action-button', 'print-close-button', 'window.print()', 'window.close()']]
]) {
  const body = functionSource(printUtils, name);
  assert(Boolean(body), `missing ${name} source`);
  for (const token of required) assert(body.includes(token), `${name} missing centralized call/token: ${token}`);
}

for (const token of [
  'modal-backdrop-central',
  'modal-frame-central',
  'modal-head-central',
  'modal-actions-central',
  'phase117-modal-print-centralization',
  "element.dataset.uiComponent = element.dataset.uiComponent || 'modal-backdrop'",
  "element.dataset.uiComponent = element.dataset.uiComponent || 'modal-frame'",
  "element.dataset.uiComponent = element.dataset.uiComponent || 'modal-head'",
  "element.dataset.uiComponent = element.dataset.uiComponent || 'modal-actions'"
]) assert(bootstrap.includes(token), `central design normalizer missing Phase 117 modal token: ${token}`);

for (const token of [
  'function renderModalHead',
  'function renderModalActions',
  'function renderModal',
  'modal-head-central',
  'modal-actions-central',
  'modal-frame-central',
  "data-ui-component': 'modal-backdrop'"
]) assert(uiAdapter.includes(token), `FandqiUI adapter missing modal token: ${token}`);

assert(uiAdapter.includes('renderModalHead,') && uiAdapter.includes('renderModalActions,') && uiAdapter.includes('renderModal,'), 'FandqiUI adapter must export renderModalHead/renderModalActions/renderModal.');
assert(uiAdapter.includes('phase117-modal-print-centralization'), 'FandqiUI adapter version must reflect Phase 117 modal/print centralization.');

for (const token of [
  'export function renderModalHead',
  'export function renderModalActions',
  'export function renderModal',
  'modal-backdrop-central',
  'modal-frame-central',
  'modal-head-central',
  'modal-actions-central',
  'data-ui-component="modal-body"'
]) assert(modalModule.includes(token), `professional modal module missing token: ${token}`);

assert(uiIndex.includes("export { renderModal, renderModalHead, renderModalActions } from './modal.mjs';"), 'professional UI index must export modal head/actions/frame helpers.');

for (const token of [
  'print-window-actions-central',
  'data-ui-component="print-window-actions"',
  'data-ui-centralized="phase117-modal-print-centralization"',
  'data-ui-component="print-action-button"',
  'data-ui-component="print-close-button"'
]) assert(printActions.includes(token), `professional print actions missing token: ${token}`);

for (const token of [
  'Phase 117: modal and print 100% centralization polish',
  '.modal-backdrop-central[data-ui-centralized="phase117-modal-print-centralization"]',
  '.modal-frame-central[data-ui-centralized="phase117-modal-print-centralization"]',
  '.modal-head-central[data-ui-component="modal-head"]',
  '.modal-close-central[data-ui-component="modal-close-button"]',
  '.modal-actions-central[data-ui-component="modal-actions"]',
  '.print-window-actions-central[data-ui-component="print-window-actions"]',
  '.print-window-action-btn'
]) assert(css.includes(token), `Phase 117 CSS missing: ${token}`);

assert(!css.includes('!important'), 'CSS patch must remain free from !important.');
assert(packageJson.scripts?.['modal-print-central:closure-audit'], 'package.json missing modal-print-central:closure-audit script.');
assert(packageJson.scripts?.['quality:full']?.includes('modal-print-central:closure-audit'), 'quality:full must include modal-print-central:closure-audit.');

if (failures.length) {
  console.error('Modal and print central closure audit failed ❌');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Modal and print central closure audit passed ✅');
