export const RESERVATION_FEATURE_NAME = 'reservations';

export const RESERVATION_STORAGE_KEY = 'fandqi.reservations';

export const RESERVATION_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'cancelled',
  'checked_in',
  'completed',
  'archived'
]);

export const RESERVATION_SOURCES = Object.freeze([
  'direct',
  'phone',
  'whatsapp',
  'online',
  'other'
]);

export const ACTIVE_RESERVATION_ROOM_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'checked_in'
]);

export const RESERVATION_DEFAULTS = Object.freeze({
  status: 'pending',
  source: 'direct',
  guestsCount: 1,
  adultsCount: 1,
  childrenCount: 0,
  paidAmount: 0,
  amount: 0,
  currency: 'USD'
});
