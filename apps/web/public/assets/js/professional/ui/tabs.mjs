import { escapeHtml, joinClasses, renderAttributes, renderIcon } from './html.mjs';

export function renderTabs({ tabs = [], active = '', action = '', className = '', tabClassName = '' } = {}) {
  return `<div class="${joinClasses('fandqi-ui-tabs', className)}" role="tablist">${tabs.map(tab => {
    const isActive = String(tab.id) === String(active);
    return `<button class="${joinClasses('fandqi-ui-tab', 'ds-tab-btn', isActive ? 'active' : '', tabClassName, tab.className)}" type="button" role="tab" aria-selected="${isActive ? 'true' : 'false'}"${renderAttributes({
      'data-action': action || undefined,
      'data-tab': tab.id,
      ...(tab.attrs || {})
    })}>${renderIcon(tab.icon || '')}${escapeHtml(tab.label || tab.id || '')}</button>`;
  }).join('')}</div>`;
}
