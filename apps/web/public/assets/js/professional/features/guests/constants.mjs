export const GUESTS_FEATURE_NAME = 'guests';

export const GUEST_TYPES = Object.freeze([
  'primary',
  'companion',
  'children'
]);

export const GUEST_STAY_STATUSES = Object.freeze([
  'arriving',
  'active',
  'upcoming',
  'departed',
  'cancelled',
  'pending'
]);

export const GUEST_ROOM_COLOR_CLASS_COUNT = 72;

export const GUEST_TYPE_SORT_ORDER = Object.freeze({
  primary: 1,
  companion: 2,
  children: 3
});

export const GUEST_DEFAULT_FILTERS = Object.freeze({
  search: '',
  stayStatus: 'all',
  type: 'all',
  room: 'all'
});
