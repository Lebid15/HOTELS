import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
};

const appCss = read('apps/web/public/assets/css/app.css');
const phase118Css = read('apps/web/public/assets/css/patches/phase118-feedback-polish.css');
const phase119Css = read('apps/web/public/assets/css/patches/phase119-corrective-closure.css');
const checkio = read('apps/web/public/assets/js/modules/09b-check-in-out.js');
const dashboard = read('apps/web/public/assets/js/modules/06-rooms-dashboard.js');
const food = read('apps/web/public/assets/js/modules/07-food-services.js');
const ar = JSON.parse(read('apps/web/public/locales/ar.json'));
const en = JSON.parse(read('apps/web/public/locales/en.json'));

assert(appCss.includes("./patches/phase118-feedback-polish.css") && appCss.includes("./patches/phase119-corrective-closure.css"), 'Phase 119 corrective CSS must be imported after Phase 118.');
assert(appCss.indexOf("phase119-corrective-closure.css") > appCss.indexOf("phase118-feedback-polish.css"), 'Phase 119 corrective CSS must load after Phase 118.');

const tokensCss = read('apps/web/public/assets/css/tokens.css');
assert(tokensCss.includes('--text-4xl') && tokensCss.includes('--tracking-tight') && tokensCss.includes('--color-white'), 'Phase 119 safety aliases must be defined in tokens.css.');
assert(!phase118Css.includes('.workspace-page .fandqi-ui-section-copy h2') && !phase118Css.includes('.hotels-page .fandqi-ui-section-head'), 'Unsafe broad header selectors must not remain in Phase 118 patch.');

const cssFiles = [
  'apps/web/public/assets/css/tokens.css',
  'apps/web/public/assets/css/app.css',
  ...fs.readdirSync(path.join(root, 'apps/web/public/assets/css/patches')).map(name => `apps/web/public/assets/css/patches/${name}`),
  ...fs.readdirSync(path.join(root, 'apps/web/public/assets/css/components')).map(name => `apps/web/public/assets/css/components/${name}`),
  ...fs.readdirSync(path.join(root, 'apps/web/public/assets/css/pages')).map(name => `apps/web/public/assets/css/pages/${name}`),
  ...fs.readdirSync(path.join(root, 'apps/web/public/assets/css/layout')).map(name => `apps/web/public/assets/css/layout/${name}`),
  ...fs.readdirSync(path.join(root, 'apps/web/public/assets/css/base')).map(name => `apps/web/public/assets/css/base/${name}`)
];
const allCss = cssFiles.map(read).join('\n');
const definitions = new Set([...allCss.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
const uses = new Set([...allCss.matchAll(/var\((--[\w-]+)/g)].map(match => match[1]));
const undefinedVars = [...uses].filter(name => !definitions.has(name));
assert(undefinedVars.length === 0, `Undefined CSS variables remain: ${undefinedVars.join(', ')}`);

assert(phase119Css.includes('data-payment-summary-tone="success"') && phase119Css.includes('data-payment-summary-tone="warning"') && phase119Css.includes('data-payment-summary-tone="accent"'), 'Payments cards must be tone-driven and visibly distinct.');
assert(phase119Css.includes('data-report-summary="revenue"') && phase119Css.includes('data-report-summary="pendingOps"') && phase119Css.includes('white-on-white'), 'Reports cards and hover readability fixes are missing.');
assert(phase119Css.includes('data-food-menu-category="food"') && phase119Css.includes('data-food-menu-category="drinks"'), 'Food/drinks visual separation must remain.');
assert(phase119Css.includes('.housekeeping-central-page') && phase119Css.includes('.maintenance-central-page') && phase119Css.includes('phase119-icon-strong'), 'Housekeeping/maintenance icon contrast correction is missing.');

assert(checkio.includes('max="${h(String(due))}"') && checkio.includes('amount > dueBefore') && checkio.includes("source: 'checkout_settlement'"), 'Checkout payment must prevent overpayment and tag settlement source.');
assert(ar.checkInOut?.payment?.amountTooHigh && en.checkInOut?.payment?.amountTooHigh, 'Overpayment i18n key missing.');
assert(dashboard.includes("payAccount") && dashboard.includes("tab: 'departures'") && !dashboard.includes("tab: 'attention'"), 'Dashboard pay-account quick button must route to a real checkout tab.');
assert(food.includes("title: t('page.room_service')") && food.includes("text: ''") && !food.includes("text: t('foodServices.description')"), 'Food header must be title-only to avoid visual duplication.');

console.log('Phase 119 corrective closure audit passed ✅');
