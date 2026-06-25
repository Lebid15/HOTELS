import { housekeepingRepository } from './repository.mjs';
import { createHousekeepingActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  HOUSEKEEPING_FEATURE_NAME,
  HOUSEKEEPING_DEFAULT_FILTERS,
  HOUSEKEEPING_ATTENTION_STATUSES,
  HOUSEKEEPING_SORT_ORDER
} from './constants.mjs';
import {
  normalizeHousekeepingText,
  validateRoomStatusChange
} from './validators.mjs';
import {
  getReservationsByRoom,
  getLastReservationForRoom,
  summarizeHousekeepingRooms,
  sortHousekeepingRooms,
  filterHousekeepingRooms
} from './render.mjs';

export const housekeepingFeature = Object.freeze({
  name: HOUSEKEEPING_FEATURE_NAME,
  constants: Object.freeze({
    defaultFilters: HOUSEKEEPING_DEFAULT_FILTERS,
    attentionStatuses: HOUSEKEEPING_ATTENTION_STATUSES,
    sortOrder: HOUSEKEEPING_SORT_ORDER
  }),
  repository: housekeepingRepository,
  selectors: Object.freeze({
    getReservationsByRoom,
    getLastReservationForRoom,
    summarizeHousekeepingRooms,
    sortHousekeepingRooms,
    filterHousekeepingRooms
  }),
  validators: Object.freeze({
    normalizeHousekeepingText,
    validateRoomStatusChange
  }),
  actions: createHousekeepingActions(housekeepingRepository)
});
