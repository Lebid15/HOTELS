import { guestsRepository } from './repository.mjs';
import { createGuestActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  GUESTS_FEATURE_NAME,
  GUEST_TYPES,
  GUEST_STAY_STATUSES,
  GUEST_ROOM_COLOR_CLASS_COUNT,
  GUEST_TYPE_SORT_ORDER
} from './constants.mjs';
import {
  normalizeGuestText,
  normalizeGuestRoomColorPart,
  validateGuestEntry
} from './validators.mjs';
import {
  getGuestStayStatus,
  getGuestAmountDue,
  getGuestDocumentTypeList,
  getGuestRoomColorKey,
  getGuestRoomSortKey,
  buildGuestRoomColorMap,
  getGuestRoomColorIndex,
  getGuestRoomColorClass,
  getGuestTypeSortRank,
  compareGuestsByRoomGroup,
  summarizeGuests,
  filterGuests
} from './render.mjs';

export const guestsFeature = Object.freeze({
  name: GUESTS_FEATURE_NAME,
  constants: Object.freeze({
    types: GUEST_TYPES,
    stayStatuses: GUEST_STAY_STATUSES,
    roomColorClassCount: GUEST_ROOM_COLOR_CLASS_COUNT,
    typeSortOrder: GUEST_TYPE_SORT_ORDER
  }),
  repository: guestsRepository,
  selectors: Object.freeze({
    getGuestStayStatus,
    getGuestAmountDue,
    getGuestDocumentTypeList,
    getGuestRoomColorKey,
    getGuestRoomSortKey,
    buildGuestRoomColorMap,
    getGuestRoomColorIndex,
    getGuestRoomColorClass,
    getGuestTypeSortRank,
    compareGuestsByRoomGroup,
    summarizeGuests,
    filterGuests
  }),
  validators: Object.freeze({
    normalizeGuestText,
    normalizeGuestRoomColorPart,
    validateGuestEntry
  }),
  actions: createGuestActions()
});
