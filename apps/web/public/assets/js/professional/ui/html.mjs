export function escapeHtml(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function joinClasses(...values) {
  return values
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .map(value => String(value).trim())
    .filter(Boolean)
    .join(' ');
}

export function renderAttributes(attributes = {}) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${escapeHtml(name)}` : ` ${escapeHtml(name)}="${escapeHtml(value)}"`)
    .join('');
}

export function renderIcon(icon = '') {
  return icon ? String(icon) : '';
}
