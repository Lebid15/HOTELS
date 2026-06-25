import { roomsRepository } from './repository.mjs';
import { createRoomActions } from './actions.mjs';
export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  ROOM_FEATURE_NAME,
  ROOM_STATUSES,
  ROOM_ATTENTION_STATUSES
} from './constants.mjs';
import {
  getRoomDisplayStatus,
  sortRoomsByFloorAndNumber,
  groupRoomsByFloor,
  summarizeRooms
} from './render.mjs';
import {
  normalizeRoom,
  validateRoom
} from './validators.mjs';

export const roomsFeature = Object.freeze({
  name: ROOM_FEATURE_NAME,
  constants: Object.freeze({
    statuses: ROOM_STATUSES,
    attentionStatuses: ROOM_ATTENTION_STATUSES
  }),
  repository: roomsRepository,
  selectors: Object.freeze({
    getRoomDisplayStatus,
    sortRoomsByFloorAndNumber,
    groupRoomsByFloor,
    summarizeRooms
  }),
  validators: Object.freeze({
    normalizeRoom,
    validateRoom
  }),
  actions: createRoomActions(roomsRepository)
});
