export function normalizeNotificationTone(value) {
  return String(value || 'neutral').trim() || 'neutral';
}

export function validateNotification(item = {}) {
  const errors = [];
  if (!item.title) errors.push({ field: 'title', code: 'required' });
  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value: item
  });
}
