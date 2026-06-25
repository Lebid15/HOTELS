import { STAFF_DEFAULTS, STAFF_PERMISSIONS, STAFF_ROLES, STAFF_SHIFTS, STAFF_STATUSES } from './constants.mjs';

export function normalizeStaffMember(staff = {}) {
  const permissions = Array.isArray(staff.permissions)
    ? staff.permissions.filter(permission => STAFF_PERMISSIONS.includes(permission))
    : STAFF_DEFAULTS.permissions;

  return {
    ...STAFF_DEFAULTS,
    ...staff,
    hotelId: String(staff.hotelId || '').trim(),
    fullName: String(staff.fullName || '').trim(),
    email: String(staff.email || '').trim().toLowerCase(),
    phone: String(staff.phone || '').trim(),
    role: STAFF_ROLES.includes(staff.role) ? staff.role : STAFF_DEFAULTS.role,
    status: STAFF_STATUSES.includes(staff.status) ? staff.status : STAFF_DEFAULTS.status,
    shift: STAFF_SHIFTS.includes(staff.shift) ? staff.shift : STAFF_DEFAULTS.shift,
    permissions
  };
}

export function validateStaffMember(staff = {}) {
  const value = normalizeStaffMember(staff);
  const errors = [];

  if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
  if (!value.fullName) errors.push({ field: 'fullName', code: 'required' });
  if (!value.role) errors.push({ field: 'role', code: 'required' });
  if (!value.status) errors.push({ field: 'status', code: 'required' });
  if (!value.shift) errors.push({ field: 'shift', code: 'required' });

  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value
  });
}
