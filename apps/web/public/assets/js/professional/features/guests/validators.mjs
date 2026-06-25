export function normalizeGuestText(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeGuestRoomColorPart(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateGuestEntry(entry = {}) {
  const errors = [];
  if (!entry.id) errors.push({ field: 'id', code: 'required' });
  if (!entry.hotelId) errors.push({ field: 'hotelId', code: 'required' });
  if (!entry.reservationId) errors.push({ field: 'reservationId', code: 'required' });
  if (!entry.type) errors.push({ field: 'type', code: 'required' });
  if (!entry.name) errors.push({ field: 'name', code: 'required' });
  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value: entry
  });
}
