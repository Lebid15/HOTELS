import { maintenanceTicketsRepository } from './repository.mjs';
import { createMaintenanceActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  MAINTENANCE_FEATURE_NAME,
  MAINTENANCE_STATUSES,
  MAINTENANCE_ACTIVE_STATUSES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_TYPES
} from './constants.mjs';
import {
  normalizeMaintenanceTicket,
  validateMaintenanceTicket
} from './validators.mjs';
import {
  getMaintenanceActiveStatuses,
  generateMaintenanceTicketNo,
  summarizeMaintenanceTickets,
  sortMaintenanceTickets,
  findActiveTicketForRoom
} from './render.mjs';

export const maintenanceFeature = Object.freeze({
  name: MAINTENANCE_FEATURE_NAME,
  constants: Object.freeze({
    statuses: MAINTENANCE_STATUSES,
    activeStatuses: MAINTENANCE_ACTIVE_STATUSES,
    priorities: MAINTENANCE_PRIORITIES,
    types: MAINTENANCE_TYPES
  }),
  repository: maintenanceTicketsRepository,
  selectors: Object.freeze({
    getMaintenanceActiveStatuses,
    generateMaintenanceTicketNo,
    summarizeMaintenanceTickets,
    sortMaintenanceTickets,
    findActiveTicketForRoom
  }),
  validators: Object.freeze({
    normalizeMaintenanceTicket,
    validateMaintenanceTicket
  }),
  actions: createMaintenanceActions(maintenanceTicketsRepository)
});
