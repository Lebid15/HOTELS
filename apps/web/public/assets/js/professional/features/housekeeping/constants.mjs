export const HOUSEKEEPING_FEATURE_NAME = 'housekeeping';

export const HOUSEKEEPING_DEFAULT_FILTERS = Object.freeze({
  search: '',
  status: 'cleaning',
  floor: ''
});

export const HOUSEKEEPING_ATTENTION_STATUSES = Object.freeze([
  'maintenance',
  'out_of_service'
]);

export const HOUSEKEEPING_SORT_ORDER = Object.freeze({
  cleaning: 0,
  maintenance: 1,
  out_of_service: 2,
  occupied: 3,
  booked: 4,
  available: 5
});
