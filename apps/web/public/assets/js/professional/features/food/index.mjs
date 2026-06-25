import { foodMenu, foodOrders } from './repository.mjs';
import { createFoodActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  FOOD_FEATURE_NAME,
  FOOD_MENU_CATEGORIES,
  FOOD_MENU_AVAILABILITY,
  FOOD_PAYMENT_METHODS,
  FOOD_ORDER_STATUSES
} from './constants.mjs';
import {
  normalizeFoodMenuItem,
  validateFoodMenuItem,
  normalizeFoodOrder,
  validateFoodOrder
} from './validators.mjs';
import {
  sortFoodMenuItems,
  getAvailableFoodMenuItems,
  getFoodOrderItemsTotal,
  getFoodOrderPaymentTone,
  getFoodOrderDisplayNumber,
  sortFoodOrdersNewest,
  sortFoodOrdersOldest,
  getFoodOrdersByReservationId,
  getFoodOrderPaidTotal,
  getFoodOrderRoomAccountTotal,
  getReservationRoomAccountOrdersTotal,
  getReservationFinancialTotal
} from './render.mjs';

export const foodFeature = Object.freeze({
  name: FOOD_FEATURE_NAME,
  constants: Object.freeze({
    menuCategories: FOOD_MENU_CATEGORIES,
    menuAvailability: FOOD_MENU_AVAILABILITY,
    paymentMethods: FOOD_PAYMENT_METHODS,
    orderStatuses: FOOD_ORDER_STATUSES
  }),
  repository: Object.freeze({
    menu: foodMenu,
    orders: foodOrders
  }),
  selectors: Object.freeze({
    sortFoodMenuItems,
    getAvailableFoodMenuItems,
    getFoodOrderItemsTotal,
    getFoodOrderPaymentTone,
    getFoodOrderDisplayNumber,
    sortFoodOrdersNewest,
    sortFoodOrdersOldest,
    getFoodOrdersByReservationId,
    getFoodOrderPaidTotal,
    getFoodOrderRoomAccountTotal,
    getReservationRoomAccountOrdersTotal,
    getReservationFinancialTotal
  }),
  validators: Object.freeze({
    normalizeFoodMenuItem,
    validateFoodMenuItem,
    normalizeFoodOrder,
    validateFoodOrder
  }),
  actions: createFoodActions({
    menuRepository: foodMenu,
    ordersRepository: foodOrders
  })
});
