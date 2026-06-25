import {
  foodMenuRepository,
  foodOrderRepository
} from '../../data/repositories/domain-repositories.mjs';

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

export function createFoodMenuRepository(repository = foodMenuRepository) {
  return Object.freeze({
    read() {
      return normalizeList(repository.read());
    },
    write(items) {
      return repository.write(normalizeList(items));
    },
    byId(id) {
      return this.read().find(item => item.id === id) || null;
    },
    forHotel(hotelId, { includeArchived = false } = {}) {
      return this.read().filter(item => item.hotelId === hotelId && (includeArchived || item.status !== 'archived'));
    },
    upsert(item) {
      const items = this.read();
      const index = items.findIndex(existing => existing.id === item.id);
      const next = index >= 0
        ? items.map(existing => existing.id === item.id ? { ...existing, ...item } : existing)
        : [...items, item];
      this.write(next);
      return item;
    },
    archive(id) {
      const items = this.read();
      let updated = null;
      const next = items.map(item => {
        if (item.id !== id) return item;
        updated = { ...item, status: 'archived', updatedAt: new Date().toISOString().slice(0, 10) };
        return updated;
      });
      this.write(next);
      return updated;
    }
  });
}

export function createFoodOrdersRepository(repository = foodOrderRepository) {
  return Object.freeze({
    read() {
      return normalizeList(repository.read());
    },
    write(orders) {
      return repository.write(normalizeList(orders));
    },
    byId(id) {
      return this.read().find(order => order.id === id) || null;
    },
    forHotel(hotelId, { includeArchived = false } = {}) {
      return this.read().filter(order => order.hotelId === hotelId && (includeArchived || order.status !== 'archived'));
    },
    upsert(order) {
      const orders = this.read();
      const index = orders.findIndex(existing => existing.id === order.id);
      const next = index >= 0
        ? orders.map(existing => existing.id === order.id ? { ...existing, ...order } : existing)
        : [...orders, order];
      this.write(next);
      return order;
    },
    archive(id) {
      const orders = this.read();
      let updated = null;
      const next = orders.map(order => {
        if (order.id !== id) return order;
        updated = { ...order, status: 'archived', updatedAt: new Date().toISOString().slice(0, 10) };
        return updated;
      });
      this.write(next);
      return updated;
    }
  });
}

export const foodMenu = createFoodMenuRepository();
export const foodOrders = createFoodOrdersRepository();
