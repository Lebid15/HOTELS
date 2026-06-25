import { escapeHtml, joinClasses } from './html.mjs';

export function renderModal({ title = '', description = '', body = '', actions = '', className = '', closeIcon = '×' } = {}) {
  const descriptionHtml = description ? `<p>${escapeHtml(description)}</p>` : '';
  return `<div class="modal-backdrop ds-modal-backdrop">
    <section class="${joinClasses('modal-card', 'ds-modal-card', className)}" role="dialog" aria-modal="true">
      <button class="modal-close icon-btn" type="button" data-action="close-modal" aria-label="إغلاق">${closeIcon}</button>
      <header><h2>${escapeHtml(title)}</h2>${descriptionHtml}</header>
      <div class="modal-body">${body}</div>
      ${actions ? `<footer class="modal-actions ds-modal-actions">${actions}</footer>` : ''}
    </section>
  </div>`;
}
