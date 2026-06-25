import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const appCss = read('apps/web/public/assets/css/app.css');
const polishCss = read('apps/web/public/assets/css/patches/phase118-feedback-polish.css');
const checkio = read('apps/web/public/assets/js/modules/09b-check-in-out.js');
const food = read('apps/web/public/assets/js/modules/07-food-services.js');
const reports = read('apps/web/public/assets/js/modules/10b-reports.js');
const dashboard = read('apps/web/public/assets/js/modules/06-rooms-dashboard.js');
const reservations = read('apps/web/public/assets/js/modules/08c-reservation-page-events.js');
const ar = JSON.parse(read('apps/web/public/locales/ar.json'));
const en = JSON.parse(read('apps/web/public/locales/en.json'));

assert(appCss.includes("./patches/phase118-feedback-polish.css"), 'Phase 118 polish CSS is not imported after final regression fixes.');
assert(polishCss.includes('guest-stay-badge--departed') && polishCss.includes('var(--ds-action-danger-bg)'), 'Departed/left status is not forced into the central danger tone.');
assert(checkio.includes('checkio-settle-balance') && checkio.includes('renderCheckioPaymentModal') && checkio.includes('submitCheckioPayment'), 'Checkout balance payment/close flow is missing.');
assert(checkio.includes('paymentHistory') && checkio.includes('markReservationCheckOut(id)'), 'Checkout payment does not record history and close the stay after settlement.');
assert(food.includes('data-food-menu-category') && polishCss.includes('data-food-menu-category="food"') && polishCss.includes('data-food-menu-category="drinks"'), 'Food/drinks category visual separation is missing.');
assert(!food.includes("kicker: t('foodServices.service.restaurant')"), 'Restaurant page still duplicates the restaurant word through the header kicker.');
assert(polishCss.includes('housekeeping-view-room') && polishCss.includes('maintenance-central-page'), 'Housekeeping/maintenance icon and view button polish is missing.');
assert(polishCss.includes('payment-summary-card--warning') && polishCss.includes('payment-summary-card--success'), 'Payments cards do not have restored colored summary tones.');
assert(reports.includes("tone: 'success'") && reports.includes("tone: 'luxury'") && polishCss.includes('data-report-summary="revenue"'), 'Reports summary cards do not have distinct tones.');
assert(polishCss.includes('.report-period-btn') && polishCss.includes(':hover'), 'Reports hover readability fix is missing.');
assert(!reservations.includes("kicker: t('reservation.page.kicker')"), 'Reservations header still uses the duplicative kicker.');
assert(dashboard.includes("managerDashboard.quick.payAccount"), 'Manager dashboard pay account quick button is missing.');
assert(ar.checkInOut?.actions?.payAndClose && en.checkInOut?.actions?.payAndClose, 'Pay-and-close i18n key missing in ar/en.');
assert(ar.managerDashboard?.quick?.payAccount && en.managerDashboard?.quick?.payAccount, 'Dashboard pay-account i18n key missing in ar/en.');

if (errors.length) {
  console.error('Phase 118 feedback polish audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Phase 118 feedback polish audit passed ✅');
