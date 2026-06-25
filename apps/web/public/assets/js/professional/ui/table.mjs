import { escapeHtml, joinClasses } from './html.mjs';

export function renderTable({ columns = [], rows = [], className = '' } = {}) {
  const head = columns.map(column => `<th>${escapeHtml(column.label || column.key || '')}</th>`).join('');
  const body = rows.map(row => `<tr>${columns.map(column => {
    const value = typeof column.render === 'function' ? column.render(row) : row[column.key];
    return `<td>${column.html ? String(value ?? '') : escapeHtml(value ?? '')}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="table-scroll ds-scroll-area"><table class="${joinClasses('data-table', 'ds-table', className)}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
