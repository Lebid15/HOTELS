import { checkioRepository } from './repository.mjs';
import { createCheckioActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  CHECKIO_FEATURE_NAME,
  CHECKIO_TABS,
  CHECKIO_TIMELINE_STATUSES
} from './constants.mjs';
import {
  normalizeCheckInOutText,
  validateCheckioAction
} from './validators.mjs';
import {
  getReservationAmountDue,
  getReservationTimelineStatus,
  getReservationGuestsSummary,
  filterCheckInOutReservations,
  summarizeCheckInOut
} from './render.mjs';

export const checkioFeature = Object.freeze({
  name: CHECKIO_FEATURE_NAME,
  constants: Object.freeze({
    tabs: CHECKIO_TABS,
    timelineStatuses: CHECKIO_TIMELINE_STATUSES
  }),
  repository: checkioRepository,
  selectors: Object.freeze({
    getReservationAmountDue,
    getReservationTimelineStatus,
    getReservationGuestsSummary,
    filterCheckInOutReservations,
    summarizeCheckInOut
  }),
  validators: Object.freeze({
    normalizeCheckInOutText,
    validateCheckioAction
  }),
  actions: createCheckioActions(checkioRepository)
});
