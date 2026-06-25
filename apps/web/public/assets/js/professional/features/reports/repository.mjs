import {
  roomRepository,
  reservationRepository,
  foodOrderRepository,
  maintenanceRepository
} from '../../data/repositories/domain-repositories.mjs';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createReportsRepository({
  rooms = roomRepository,
  reservations = reservationRepository,
  foodOrders = foodOrderRepository,
  maintenance = maintenanceRepository
} = {}) {
  return Object.freeze({
    readRooms() {
      return normalizeArray(rooms.read());
    },
    readReservations() {
      return normalizeArray(reservations.read());
    },
    readFoodOrders() {
      return normalizeArray(foodOrders.read());
    },
    readMaintenanceTickets() {
      return normalizeArray(maintenance.read());
    }
  });
}

export const reportsRepository = createReportsRepository();
