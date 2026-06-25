export function normalizePaymentSearch(value) {
  return String(value || '').trim().toLowerCase();
}

export function validatePaymentFilters(filters = {}) {
  return Object.freeze({
    valid: true,
    errors: [],
    value: {
      method: filters.method || 'all',
      search: String(filters.search || '').trim()
    }
  });
}
