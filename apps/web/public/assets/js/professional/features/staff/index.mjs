import { staffRepositoryInstance } from './repository.mjs';
import { createStaffActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  STAFF_FEATURE_NAME,
  STAFF_ROLES,
  STAFF_STATUSES,
  STAFF_VISIBLE_STATUSES,
  STAFF_SHIFTS,
  STAFF_PERMISSIONS
} from './constants.mjs';
import {
  normalizeStaffMember,
  validateStaffMember
} from './validators.mjs';
import {
  sortStaffByName,
  summarizeStaff,
  filterStaff,
  getStaffBookingEmployeeKey
} from './render.mjs';

export const staffFeature = Object.freeze({
  name: STAFF_FEATURE_NAME,
  constants: Object.freeze({
    roles: STAFF_ROLES,
    statuses: STAFF_STATUSES,
    visibleStatuses: STAFF_VISIBLE_STATUSES,
    shifts: STAFF_SHIFTS,
    permissions: STAFF_PERMISSIONS
  }),
  repository: staffRepositoryInstance,
  selectors: Object.freeze({
    sortStaffByName,
    summarizeStaff,
    filterStaff,
    getStaffBookingEmployeeKey
  }),
  validators: Object.freeze({
    normalizeStaffMember,
    validateStaffMember
  }),
  actions: createStaffActions(staffRepositoryInstance)
});
