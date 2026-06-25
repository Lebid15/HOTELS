export const REPORTS_FEATURE_NAME = 'reports';

export const REPORT_TYPES = Object.freeze([
  'overview',
  'reservations',
  'financial',
  'rooms',
  'food',
  'maintenance'
]);

export const REPORT_PERIODS = Object.freeze([
  'today',
  'last7',
  'month',
  'custom'
]);

export const REPORT_DEFAULT_FILTERS = Object.freeze({
  type: 'overview',
  period: 'month',
  from: '',
  to: ''
});
