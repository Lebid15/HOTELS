export const ROOM_FEATURE_NAME = 'rooms';

export const ROOM_STORAGE_KEY = 'fandqi.rooms';

export const ROOM_STATUSES = Object.freeze([
  'available',
  'booked',
  'occupied',
  'cleaning',
  'maintenance',
  'out_of_service',
  'archived'
]);

export const ROOM_ATTENTION_STATUSES = Object.freeze([
  'cleaning',
  'maintenance',
  'out_of_service'
]);

export const ROOM_ACTIVE_RESERVATION_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'checked_in'
]);

export const ROOM_BOOKED_RESERVATION_STATUSES = Object.freeze([
  'pending',
  'confirmed'
]);

export const ROOM_DEFAULTS = Object.freeze({
  floor: '1',
  type: 'single',
  capacity: 1,
  status: 'available',
  currency: 'USD'
});
