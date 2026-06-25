export const PAYMENTS_FEATURE_NAME = 'payments';

export const PAYMENT_METHODS = Object.freeze([
  'cash',
  'electronic',
  'room_account'
]);

export const PAYMENTS_DEFAULT_FILTERS = Object.freeze({
  method: 'all',
  search: ''
});
