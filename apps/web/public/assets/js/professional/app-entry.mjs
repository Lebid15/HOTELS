import { createEventBus } from './core/event-bus.mjs';
import { todayISO, formatDate, formatDateTime } from './core/date-formatters.mjs';
import { storageRepository, STORAGE_KEYS, BACKUP_STORAGE_KEYS } from './data/repository.mjs';
import { repositories } from './data/repositories/domain-repositories.mjs';
import { backupService } from './storage/backup-service.mjs';
import * as ui from './ui/component-factory.mjs';
import { printService } from './print/print-service.mjs';
import { installRuntimeContractReporter } from './core/runtime-contract.mjs';
import { roomsFeature } from './features/rooms/index.mjs';
import { reservationsFeature } from './features/reservations/index.mjs';
import { staffFeature } from './features/staff/index.mjs';
import { foodFeature } from './features/food/index.mjs';
import { maintenanceFeature } from './features/maintenance/index.mjs';
import { housekeepingFeature } from './features/housekeeping/index.mjs';
import { guestsFeature } from './features/guests/index.mjs';
import { checkioFeature } from './features/checkio/index.mjs';
import { reportsFeature } from './features/reports/index.mjs';
import { paymentsFeature } from './features/payments/index.mjs';
import { notificationsFeature } from './features/notifications/index.mjs';

const FandqiProfessional = {
  version: 'professional-runtime-stability-v13-central-ui-components-feature-modules-reports-payments-notifications',
  eventBus: createEventBus(),
  dates: { todayISO, formatDate, formatDateTime },
  storage: storageRepository,
  storageKeys: STORAGE_KEYS,
  backupKeys: BACKUP_STORAGE_KEYS,
  backup: backupService,
  repositories,
  ui,
  print: printService,
  features: Object.freeze({
    rooms: roomsFeature,
    reservations: reservationsFeature,
    staff: staffFeature,
    food: foodFeature,
    maintenance: maintenanceFeature,
    housekeeping: housekeepingFeature,
    guests: guestsFeature,
    checkio: checkioFeature,
    reports: reportsFeature,
    payments: paymentsFeature,
    notifications: notificationsFeature
  })
};

installRuntimeContractReporter(FandqiProfessional);

window.FandqiProfessional = Object.freeze(FandqiProfessional);
