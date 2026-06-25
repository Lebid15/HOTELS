import { paymentsRepository } from './repository.mjs';
import { createPaymentActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  PAYMENTS_FEATURE_NAME,
  PAYMENT_METHODS
} from './constants.mjs';
import {
  normalizePaymentSearch,
  validatePaymentFilters
} from './validators.mjs';
import {
  summarizePaymentOrders,
  filterPaymentOrders,
  buildPaymentSummaryCards
} from './render.mjs';

export const paymentsFeature = Object.freeze({
  name: PAYMENTS_FEATURE_NAME,
  constants: Object.freeze({
    methods: PAYMENT_METHODS
  }),
  repository: paymentsRepository,
  selectors: Object.freeze({
    summarizePaymentOrders,
    filterPaymentOrders,
    buildPaymentSummaryCards
  }),
  validators: Object.freeze({
    normalizePaymentSearch,
    validatePaymentFilters
  }),
  actions: createPaymentActions()
});
