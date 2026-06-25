export function normalizeHousekeepingText(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateRoomStatusChange({ roomId = '', status = '' } = {}) {
  const errors = [];
  if (!roomId) errors.push({ field: 'roomId', code: 'required' });
  if (!status) errors.push({ field: 'status', code: 'required' });
  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value: { roomId, status }
  });
}
