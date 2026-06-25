import { escapeHtml, joinClasses, renderIcon } from './html.mjs';

export function renderEmptyState({ title = '', text = '', icon = '', action = '', className = '' } = {}) {
  return `<div class="${joinClasses('empty-panel', 'fandqi-ui-empty-state', className)}"><div>${icon ? `<div class="fandqi-ui-empty-icon">${renderIcon(icon)}</div>` : ''}<h2>${escapeHtml(title)}</h2>${text ? `<p>${escapeHtml(text)}</p>` : ''}${action || ''}</div></div>`;
}
