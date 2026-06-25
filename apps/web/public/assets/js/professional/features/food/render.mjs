import { FOOD_MENU_CATEGORIES } from './constants.mjs';

export function sortFoodMenuItems(items = []) {
  return [...items].sort((a, b) =>
    FOOD_MENU_CATEGORIES.indexOf(a.category || 'extras') - FOOD_MENU_CATEGORIES.indexOf(b.category || 'extras') ||
    String(a.name || '').localeCompare(String(b.name || ''), 'ar', { numeric: true })
  );
}

export function getAvailableFoodMenuItems(items = []) {
  return sortFoodMenuItems(items).filter(item => (item.availability || item.status || 'available') === 'available');
}

export function getFoodOrderItemsTotal(items = []) {
  return items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
}

export function getFoodOrderPaymentTone(order) {
  const method = order?.paymentMethod || 'cash';
  if (method === 'room_account') return 'warning';
  if (method === 'electronic') return 'accent';
  return 'active';
}

export function getFoodOrderDisplayNumber(order) {
  const raw = String(order?.id || '').split('-').pop() || '';
  return raw ? `ORD-${raw.slice(-5).toUpperCase()}` : 'ORD';
}

export function sortFoodOrdersNewest(orders = []) {
  return [...orders].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function sortFoodOrdersOldest(orders = []) {
  return [...orders].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

export function getFoodOrdersByReservationId(orders = [], reservationId = '') {
  if (!reservationId) return [];
  return sortFoodOrdersOldest(orders.filter(order => order.status !== 'archived' && order.reservationId === reservationId));
}

export function getFoodOrderPaidTotal(orders = []) {
  return orders
    .filter(order => (order.paymentMethod || 'cash') !== 'room_account')
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);
}

export function getFoodOrderRoomAccountTotal(orders = []) {
  return orders
    .filter(order => (order.paymentMethod || 'cash') === 'room_account')
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);
}

export function getReservationRoomAccountOrdersTotal(orders = [], reservationId = '') {
  if (!reservationId) return 0;
  return getFoodOrderRoomAccountTotal(orders.filter(order => order.reservationId === reservationId && order.status !== 'archived'));
}

export function getReservationFinancialTotal(reservation, roomAccountTotal = 0) {
  return Number(reservation?.totalAmount || 0) + Number(roomAccountTotal || 0);
}
