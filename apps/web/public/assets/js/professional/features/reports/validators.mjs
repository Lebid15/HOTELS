export function normalizeReportDate(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return '';
}

export function validateReportRange(range = {}) {
  const from = normalizeReportDate(range.from);
  const to = normalizeReportDate(range.to);
  const errors = [];
  if (from && to && from > to) errors.push({ field: 'range', code: 'invalid_range' });
  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value: { from, to }
  });
}
