import {
  FOOD_MENU_CATEGORIES,
  FOOD_MENU_AVAILABILITY,
  FOOD_PAYMENT_METHODS,
  FOOD_MENU_DEFAULTS,
  FOOD_ORDER_DEFAULTS
} from './constants.mjs';

export function normalizeFoodMenuItem(item = {}) {
  const category = FOOD_MENU_CATEGORIES.includes(item.category) ? item.category : FOOD_MENU_DEFAULTS.category;
  const availability = FOOD_MENU_AVAILABILITY.includes(item.availability) ? item.availability : FOOD_MENU_DEFAULTS.availability;
  return {
    ...FOOD_MENU_DEFAULTS,
    ...item,
    hotelId: String(item.hotelId || '').trim(),
    serviceType: String(item.serviceType || FOOD_MENU_DEFAULTS.serviceType).trim(),
    category,
    name: String(item.name || '').trim(),
    price: Math.max(0, Number(item.price || 0)),
    currency: String(item.currency || FOOD_MENU_DEFAULTS.currency).trim(),
    availability,
    description: String(item.description || '').trim()
  };
}

export function validateFoodMenuItem(item = {}) {
  const value = normalizeFoodMenuItem(item);
  const errors = [];

  if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
  if (!value.name) errors.push({ field: 'name', code: 'required' });
  if (!Number.isFinite(value.price) || value.price < 0) errors.push({ field: 'price', code: 'invalid_price' });

  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value
  });
}

export function normalizeFoodOrder(order = {}) {
  const paymentMethod = FOOD_PAYMENT_METHODS.includes(order.paymentMethod) ? order.paymentMethod : FOOD_ORDER_DEFAULTS.paymentMethod;
  const items = Array.isArray(order.items) ? order.items : [];
  return {
    ...FOOD_ORDER_DEFAULTS,
    ...order,
    hotelId: String(order.hotelId || '').trim(),
    serviceType: String(order.serviceType || FOOD_ORDER_DEFAULTS.serviceType).trim(),
    sourceType: String(order.sourceType || FOOD_ORDER_DEFAULTS.sourceType).trim(),
    paymentMethod,
    roomId: String(order.roomId || '').trim(),
    roomNumber: String(order.roomNumber || '').trim(),
    reservationId: String(order.reservationId || '').trim(),
    guestEntryId: String(order.guestEntryId || '').trim(),
    guestName: String(order.guestName || '').trim(),
    tableNumber: String(order.tableNumber || '').trim(),
    externalVendor: String(order.externalVendor || '').trim(),
    orderText: String(order.orderText || '').trim(),
    items,
    amount: Math.max(0, Number(order.amount || 0)),
    currency: String(order.currency || FOOD_ORDER_DEFAULTS.currency).trim()
  };
}

export function validateFoodOrder(order = {}) {
  const value = normalizeFoodOrder(order);
  const errors = [];

  if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
  if (!value.serviceType) errors.push({ field: 'serviceType', code: 'required' });
  if (!value.sourceType) errors.push({ field: 'sourceType', code: 'required' });
  if (!value.guestName && value.sourceType !== 'hospitality') errors.push({ field: 'guestName', code: 'required' });
  if (!Array.isArray(value.items) || !value.items.length) errors.push({ field: 'items', code: 'required' });
  if (!Number.isFinite(value.amount) || value.amount < 0) errors.push({ field: 'amount', code: 'invalid_amount' });

  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value
  });
}
