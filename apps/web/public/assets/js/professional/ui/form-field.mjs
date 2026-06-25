import { escapeHtml, joinClasses, renderAttributes } from './html.mjs';

export function renderField({ label = '', name = '', value = '', type = 'text', placeholder = '', required = false, className = '', attrs = {} } = {}) {
  const id = attrs.id || name || `field-${Math.random().toString(36).slice(2)}`;
  return `<label class="${joinClasses('field', 'ds-field', className)}" for="${escapeHtml(id)}">
    <span>${escapeHtml(label)}</span>
    <input class="input ds-control" id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"${renderAttributes({ required, ...attrs })}>
  </label>`;
}

export function renderSelectField({ label = '', name = '', value = '', options = [], required = false, className = '', attrs = {} } = {}) {
  const id = attrs.id || name || `select-${Math.random().toString(36).slice(2)}`;
  return `<label class="${joinClasses('field', 'ds-field', className)}" for="${escapeHtml(id)}">
    <span>${escapeHtml(label)}</span>
    <select class="select ds-control" id="${escapeHtml(id)}" name="${escapeHtml(name)}"${renderAttributes({ required, ...attrs })}>
      ${options.map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
    </select>
  </label>`;
}
