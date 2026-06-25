import { foodOrderRepository } from '../../data/repositories/domain-repositories.mjs';

function normalizeOrders(value) {
  return Array.isArray(value) ? value : [];
}

export function createPaymentsRepository(repository = foodOrderRepository) {
  return Object.freeze({
    readOrders() {
      return normalizeOrders(repository.read());
    },
    ordersForHotel(hotelId) {
      return this.readOrders().filter(order => order.hotelId === hotelId && order.status !== 'archived');
    }
  });
}

export const paymentsRepository = createPaymentsRepository();
