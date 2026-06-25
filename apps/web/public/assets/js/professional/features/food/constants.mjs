export const FOOD_FEATURE_NAME = 'food';

export const FOOD_MENU_STORAGE_KEY = 'fandqi.foodMenuItems';
export const FOOD_ORDER_STORAGE_KEY = 'fandqi.foodOrders';

export const FOOD_MENU_CATEGORIES = Object.freeze([
  'drinks',
  'food',
  'dessert',
  'hospitality',
  'extras'
]);

export const FOOD_MENU_AVAILABILITY = Object.freeze([
  'available',
  'unavailable'
]);

export const FOOD_MENU_STATUSES = Object.freeze([
  'active',
  'archived'
]);

export const FOOD_ORDER_STATUSES = Object.freeze([
  'delivered',
  'archived',
  'cancelled'
]);

export const FOOD_PAYMENT_METHODS = Object.freeze([
  'cash',
  'electronic',
  'room_account'
]);

export const FOOD_MENU_DEFAULTS = Object.freeze({
  serviceType: 'restaurant',
  category: 'extras',
  price: 0,
  currency: 'USD',
  availability: 'available',
  status: 'active',
  description: ''
});

export const FOOD_ORDER_DEFAULTS = Object.freeze({
  serviceType: 'restaurant',
  sourceType: 'room',
  paymentMethod: 'cash',
  amount: 0,
  currency: 'USD',
  status: 'delivered',
  guestType: 'walk_in'
});
