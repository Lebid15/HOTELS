export const CHECKIO_FEATURE_NAME = 'checkio';

export const CHECKIO_TABS = Object.freeze([
  'arrivals',
  'in_house',
  'departures',
  'attention',
  'log'
]);

export const CHECKIO_TIMELINE_STATUSES = Object.freeze([
  'arrival_due',
  'in_house',
  'departure_due',
  'upcoming',
  'departed',
  'cancelled',
  'pending'
]);

export const CHECKIO_DEFAULT_FILTERS = Object.freeze({
  tab: 'arrivals',
  search: '',
  room: 'all',
  date: ''
});
