import { normalizeFoodMenuItem, normalizeFoodOrder } from './validators.mjs';

export function createFoodActions({ menuRepository, ordersRepository }) {
  return Object.freeze({
    seedDefaultMenu(hotelId, currency = 'USD', defaults = [], { idFactory = id => id, today = () => new Date().toISOString().slice(0, 10) } = {}) {
      if (!hotelId) return [];
      const existing = menuRepository.forHotel(hotelId);
      if (existing.length) return existing;
      const now = today();
      const seeded = defaults.map((item, index) => normalizeFoodMenuItem({
        id: idFactory('menu-item', index),
        hotelId,
        serviceType: item.serviceType,
        category: item.category,
        name: item.name,
        price: item.price,
        currency,
        availability: 'available',
        status: 'active',
        description: '',
        createdAt: now,
        updatedAt: now
      }));
      menuRepository.write([...menuRepository.read(), ...seeded]);
      return seeded;
    },
    addMenuItem(item, { idFactory = id => id, today = () => new Date().toISOString().slice(0, 10) } = {}) {
      const now = today();
      const value = normalizeFoodMenuItem({
        ...item,
        id: item.id || idFactory('menu-item'),
        status: item.status || 'active',
        createdAt: item.createdAt || now,
        updatedAt: now
      });
      return menuRepository.upsert(value);
    },
    addOrder(order, { idFactory = id => id, now = () => new Date().toISOString().slice(0, 16).replace('T', ' '), today = () => new Date().toISOString().slice(0, 10) } = {}) {
      const timestamp = now();
      const value = normalizeFoodOrder({
        ...order,
        id: order.id || idFactory('food-order'),
        status: order.status || 'delivered',
        deliveredAt: order.deliveredAt || timestamp,
        createdAt: order.createdAt || timestamp,
        updatedAt: order.updatedAt || today()
      });
      return ordersRepository.upsert(value);
    },
    archiveMenuItem(id) {
      return menuRepository.archive(id);
    },
    archiveOrder(id) {
      return ordersRepository.archive(id);
    }
  });
}
