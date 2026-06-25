import { notificationsRepository } from './repository.mjs';
import { createNotificationActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  NOTIFICATIONS_FEATURE_NAME,
  NOTIFICATION_TONES
} from './constants.mjs';
import {
  normalizeNotificationTone,
  validateNotification
} from './validators.mjs';
import {
  summarizeNotifications,
  buildNotificationOpenAttrs,
  buildNotificationSummaryCards
} from './render.mjs';

export const notificationsFeature = Object.freeze({
  name: NOTIFICATIONS_FEATURE_NAME,
  constants: Object.freeze({
    tones: NOTIFICATION_TONES
  }),
  repository: notificationsRepository,
  selectors: Object.freeze({
    summarizeNotifications,
    buildNotificationOpenAttrs,
    buildNotificationSummaryCards
  }),
  validators: Object.freeze({
    normalizeNotificationTone,
    validateNotification
  }),
  actions: createNotificationActions()
});
