export function normalizeCheckInOutText(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateCheckioAction({ reservationId = '', action = '' } = {}) {
  const errors = [];
  if (!reservationId) errors.push({ field: 'reservationId', code: 'required' });
  if (!action) errors.push({ field: 'action', code: 'required' });
  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value: { reservationId, action }
  });
}
