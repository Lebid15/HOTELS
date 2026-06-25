import { reportsRepository } from './repository.mjs';
import { createReportActions } from './actions.mjs';

export * from './constants.mjs';
export * from './repository.mjs';
export * from './validators.mjs';
export * from './render.mjs';
export * from './actions.mjs';

import {
  REPORTS_FEATURE_NAME,
  REPORT_TYPES,
  REPORT_PERIODS
} from './constants.mjs';
import {
  normalizeReportDate,
  validateReportRange
} from './validators.mjs';
import {
  addDaysToISO,
  getReportRange,
  isReportDateInRange,
  moneyValue,
  sumBy,
  countBy,
  summarizeReports,
  getFoodTopItems
} from './render.mjs';

export const reportsFeature = Object.freeze({
  name: REPORTS_FEATURE_NAME,
  constants: Object.freeze({
    types: REPORT_TYPES,
    periods: REPORT_PERIODS
  }),
  repository: reportsRepository,
  selectors: Object.freeze({
    addDaysToISO,
    getReportRange,
    isReportDateInRange,
    moneyValue,
    sumBy,
    countBy,
    summarizeReports,
    getFoodTopItems
  }),
  validators: Object.freeze({
    normalizeReportDate,
    validateReportRange
  }),
  actions: createReportActions()
});
