import { ROOM_DEFAULTS, ROOM_STATUSES } from './constants.mjs';

export function normalizeRoom(room = {}) {
  return {
    ...ROOM_DEFAULTS,
    ...room,
    floor: String(room.floor || ROOM_DEFAULTS.floor).trim(),
    number: String(room.number || '').trim(),
    type: String(room.type || ROOM_DEFAULTS.type).trim(),
    capacity: Number(room.capacity || ROOM_DEFAULTS.capacity),
    price: Number(room.price || 0),
    status: ROOM_STATUSES.includes(room.status) ? room.status : ROOM_DEFAULTS.status
  };
}

export function validateRoom(room = {}) {
  const normalized = normalizeRoom(room);
  const errors = [];

  if (!normalized.hotelId) errors.push({ field: 'hotelId', code: 'required' });
  if (!normalized.number) errors.push({ field: 'number', code: 'required' });
  if (!normalized.floor) errors.push({ field: 'floor', code: 'required' });
  if (!normalized.type) errors.push({ field: 'type', code: 'required' });
  if (!Number.isFinite(normalized.capacity) || normalized.capacity < 1) {
    errors.push({ field: 'capacity', code: 'invalid_capacity' });
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value: normalized
  });
}
