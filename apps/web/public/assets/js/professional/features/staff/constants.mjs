export const STAFF_FEATURE_NAME = 'staff';

export const STAFF_STORAGE_KEY = 'fandqi.hotelStaff';

export const STAFF_ROLES = Object.freeze([
  'receptionist',
  'cashier',
  'housekeeping',
  'maintenance',
  'restaurant',
  'room_service',
  'supervisor'
]);

export const STAFF_STATUSES = Object.freeze([
  'active',
  'suspended',
  'archived'
]);

export const STAFF_VISIBLE_STATUSES = Object.freeze([
  'active',
  'suspended'
]);

export const STAFF_SHIFTS = Object.freeze([
  'morning',
  'evening',
  'night',
  'flexible'
]);

export const STAFF_PERMISSIONS = Object.freeze([
  'reservations',
  'check_in_out',
  'payments',
  'rooms',
  'room_service',
  'housekeeping',
  'maintenance',
  'reports'
]);

export const STAFF_DEFAULTS = Object.freeze({
  role: 'receptionist',
  status: 'active',
  shift: 'flexible',
  permissions: ['reservations', 'check_in_out']
});
