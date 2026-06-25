import { reservationsRepository } from './repository.mjs';
import { createReservationActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  RESERVATION_FEATURE_NAME,
  RESERVATION_STATUSES,
  RESERVATION_SOURCES,
  ACTIVE_RESERVATION_ROOM_STATUSES
} from './constants.mjs';
import {
  normalizeReservation,
  validateReservation
} from './validators.mjs';
import {
  dateRangesOverlap,
  isRoomReservedByActiveReservation,
  calculateNights,
  calculateReservationTotals,
  getNextReservationNumber,
  getReservationRooms,
  sortReservationsByNewest,
  filterReservations
} from './render.mjs';

export const reservationsFeature = Object.freeze({
  name: RESERVATION_FEATURE_NAME,
  constants: Object.freeze({
    statuses: RESERVATION_STATUSES,
    sources: RESERVATION_SOURCES,
    activeRoomStatuses: ACTIVE_RESERVATION_ROOM_STATUSES
  }),
  repository: reservationsRepository,
  selectors: Object.freeze({
    dateRangesOverlap,
    isRoomReservedByActiveReservation,
    calculateNights,
    calculateReservationTotals,
    getNextReservationNumber,
    getReservationRooms,
    sortReservationsByNewest,
    filterReservations
  }),
  validators: Object.freeze({
    normalizeReservation,
    validateReservation
  }),
  actions: createReservationActions(reservationsRepository)
});
