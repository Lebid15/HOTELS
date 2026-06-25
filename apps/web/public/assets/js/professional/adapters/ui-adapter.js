// Fandqi UI Adapter
// Classic-script facade for central UI components during gradual module migration.
(function installFandqiUIAdapter(window) {
  if (window.FandqiUI) return;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function joinClasses(...values) {
    return values
      .flatMap(value => Array.isArray(value) ? value : [value])
      .filter(Boolean)
      .map(value => String(value).trim())
      .filter(Boolean)
      .join(' ');
  }

  function renderAttributes(attributes = {}) {
    return Object.entries(attributes)
      .filter(([, value]) => value !== undefined && value !== null && value !== false)
      .map(([name, value]) => value === true ? ` ${escapeHtml(name)}` : ` ${escapeHtml(name)}="${escapeHtml(value)}"`)
      .join('');
  }

  function moduleUi() {
    return window.FandqiProfessional?.ui || null;
  }

  function renderButton(options = {}) {
    const ui = moduleUi();
    if (ui?.renderButton && options.children === undefined) return ui.renderButton(options);
    const tone = options.tone || 'primary';
    const attrs = renderAttributes({
      'data-action': options.action || undefined,
      title: options.title || undefined,
      'aria-label': options.ariaLabel || undefined,
      disabled: options.disabled || undefined,
      ...(options.attrs || {})
    });
    const content = options.children !== undefined ? String(options.children || '') : `${options.icon || ''}${escapeHtml(options.label || '')}`;
    return `<button class="${joinClasses('btn', tone, options.size, 'ds-btn', options.size ? 'ds-btn-small' : '', options.className)}" type="${escapeHtml(options.type || 'button')}"${attrs}>${content}</button>`;
  }

  function renderIconButton(options = {}) {
    const ui = moduleUi();
    if (ui?.renderIconButton) return ui.renderIconButton(options);
    return renderButton({ ...options, label: '', className: joinClasses('icon-btn', options.className), tone: options.tone || 'neutral' });
  }

  function getBadgeTone(status = 'neutral') {
    const tones = {
      success: 'success', active: 'success', paid: 'success', completed: 'success', confirmed: 'success', checked_in: 'success', enabled: 'success',
      warning: 'warning', pending: 'warning', trial: 'warning', suspended: 'warning', partial: 'warning', booked: 'warning',
      danger: 'danger', expired: 'danger', cancelled: 'danger', canceled: 'danger', unpaid: 'danger', archived: 'danger', inactive: 'danger',
      info: 'info', neutral: 'neutral', not_set: 'neutral'
    };
    return tones[status] || 'neutral';
  }

  function renderBadge(options = {}) {
    const ui = moduleUi();
    if (ui?.renderBadge) return ui.renderBadge(options);
    const status = options.status || 'neutral';
    const tone = getBadgeTone(status);
    return `<span class="${joinClasses('status-badge', status, 'ds-badge', `ds-status-${tone}`, options.className)}" data-status="${escapeHtml(status)}"${renderAttributes(options.attrs || {})}>${escapeHtml(options.label || '')}</span>`;
  }

  function renderCard(options = {}) {
    const ui = moduleUi();
    if (ui?.renderCard) return ui.renderCard(options);
    const iconHtml = options.icon ? `<div class="fandqi-ui-card-icon">${options.icon}</div>` : '';
    const badgeHtml = options.badge ? `<div class="fandqi-ui-card-badge">${options.badge}</div>` : '';
    const subtitleHtml = options.subtitle ? `<p>${escapeHtml(options.subtitle)}</p>` : '';
    const actionsHtml = options.actions ? `<footer class="${joinClasses('fandqi-ui-card-actions', options.footerClassName)}">${options.actions}</footer>` : '';
    return `<article class="${joinClasses('fandqi-ui-card', 'ds-card', options.className)}"${renderAttributes(options.attrs || {})}><header class="${joinClasses('fandqi-ui-card-header', options.headerClassName)}"><div class="fandqi-ui-card-title-wrap">${iconHtml}<div><h3>${escapeHtml(options.title || '')}</h3>${subtitleHtml}</div></div>${badgeHtml}</header><div class="${joinClasses('fandqi-ui-card-body', options.bodyClassName)}">${options.body || ''}</div>${actionsHtml}</article>`;
  }

  function renderTabs(options = {}) {
    const ui = moduleUi();
    if (ui?.renderTabs) return ui.renderTabs(options);
    return `<div class="${joinClasses('fandqi-ui-tabs', options.className)}" role="tablist"${renderAttributes(options.attrs || {})}>${(options.tabs || []).map(tab => {
      const isActive = String(tab.id) === String(options.active);
      return `<button class="${joinClasses('fandqi-ui-tab', 'ds-tab-btn', isActive ? 'active' : '', options.tabClassName, tab.className)}" type="button" role="tab"${renderAttributes({
        'data-action': options.action || undefined,
        'data-tab': tab.id,
        'aria-selected': isActive ? 'true' : 'false',
        ...(tab.attrs || {})
      })}>${tab.icon || ''}${escapeHtml(tab.label || tab.id || '')}</button>`;
    }).join('')}</div>`;
  }

  function renderEmptyState(options = {}) {
    const ui = moduleUi();
    if (ui?.renderEmptyState) return ui.renderEmptyState(options);
    return `<div class="empty-panel fandqi-ui-empty-state"><div><h2>${escapeHtml(options.title || '')}</h2>${options.text ? `<p>${escapeHtml(options.text)}</p>` : ''}${options.action || ''}</div></div>`;
  }


  function renderSectionHead(options = {}) {
    const headingTag = options.headingTag || 'h2';
    const kicker = options.kicker ? `<span class="fandqi-ui-section-kicker">${options.kickerIcon || ''}${escapeHtml(options.kicker)}</span>` : '';
    const heading = `<${headingTag}>${escapeHtml(options.title || '')}</${headingTag}>`;
    const text = options.text ? `<p class="helper">${escapeHtml(options.text)}</p>` : '';
    const actionSlot = options.actions ? `<div class="fandqi-ui-section-actions ds-actions">${options.actions}</div>` : '';
    return `<div class="${joinClasses('section-head', 'ds-section-head', 'fandqi-ui-section-head', options.className)}"${renderAttributes(options.attrs || {})}><div class="fandqi-ui-section-copy">${kicker}${heading}${text}</div>${actionSlot}</div>`;
  }

  function renderActions(options = {}) {
    return `<div class="${joinClasses('ds-actions', 'fandqi-ui-actions', options.className)}"${renderAttributes(options.attrs || {})}>${options.children || ''}</div>`;
  }

  function renderSurface(options = {}) {
    const tag = options.tag || 'section';
    const head = options.head || '';
    return `<${tag} class="${joinClasses('ds-card', 'ds-surface', 'fandqi-ui-surface', options.className)}"${renderAttributes(options.attrs || {})}>${head}${options.body || ''}</${tag}>`;
  }

  function renderMetricCard(options = {}) {
    const tag = options.tag || 'button';
    const attrs = renderAttributes({
      type: tag === 'button' ? (options.type || 'button') : undefined,
      ...(options.attrs || {})
    });
    return `<${tag} class="${joinClasses('dashboard-card', 'ds-card', 'ds-metric-card', 'fandqi-ui-metric-card', options.tone, options.className)}"${attrs}><span class="dashboard-card-icon fandqi-ui-metric-icon">${options.icon || ''}</span><span class="dashboard-card-title fandqi-ui-metric-title">${escapeHtml(options.title || '')}</span><strong class="fandqi-ui-metric-value">${escapeHtml(options.value ?? '')}</strong><small class="fandqi-ui-metric-note">${escapeHtml(options.note || '')}</small></${tag}>`;
  }

  function renderField(options = {}) {
    const tag = options.tag || 'div';
    const label = options.labelHtml || (options.label ? `<span class="field-label">${options.icon || ''}${escapeHtml(options.label)}</span>` : '');
    const helper = options.helper ? `<p class="helper">${escapeHtml(options.helper)}</p>` : '';
    return `<${tag} class="${joinClasses('field', 'ds-field', 'fandqi-ui-field', options.className)}"${renderAttributes(options.attrs || {})}>${label}${options.control || ''}${helper}</${tag}>`;
  }

  function renderFormGrid(options = {}) {
    return `<div class="${joinClasses('modal-grid', 'compact-modal-grid', 'ds-form-grid', 'fandqi-ui-form-grid', options.className)}"${renderAttributes(options.attrs || {})}>${options.children || ''}</div>`;
  }

  function renderPanelTitle(options = {}) {
    return `<div class="${joinClasses('form-section-title', 'ds-form-section-title', 'fandqi-ui-panel-title', options.className)}"${renderAttributes(options.attrs || {})}>${options.icon || ''}<span>${escapeHtml(options.title || '')}</span></div>`;
  }

  function renderCheckField(options = {}) {
    const attrs = renderAttributes({
      type: 'checkbox',
      name: options.name || undefined,
      id: options.id || undefined,
      checked: options.checked || undefined,
      ...(options.inputAttrs || {})
    });
    return `<label class="${joinClasses('check-row', 'settings-check', 'ds-check-field', 'fandqi-ui-check-field', options.className)}"${renderAttributes(options.attrs || {})}><input${attrs}><span class="check-label">${options.icon || ''}<span>${escapeHtml(options.label || '')}</span></span></label>`;
  }

  function renderTable(options = {}) {
    const columns = Array.isArray(options.columns) ? options.columns : [];
    const rows = Array.isArray(options.rows) ? options.rows : [];
    const head = columns.map(column => `<th>${escapeHtml(column.label || column.key || '')}</th>`).join('');
    const body = rows.map(row => `<tr>${columns.map(column => {
      const value = typeof column.render === 'function' ? column.render(row) : row[column.key];
      return `<td>${column.html ? String(value ?? '') : escapeHtml(value ?? '')}</td>`;
    }).join('')}</tr>`).join('');
    return `<div class="table-scroll ds-scroll-area fandqi-ui-table-wrap"${renderAttributes(options.attrs || {})}><table class="${joinClasses('data-table', 'ds-table', 'fandqi-ui-table', options.className)}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  window.FandqiUI = Object.freeze({
    version: 'ui-adapter-v3-subscription-table-central-components-v4-owner-dashboard-children',
    escapeHtml,
    joinClasses,
    renderButton,
    renderIconButton,
    renderBadge,
    renderCard,
    renderTabs,
    renderEmptyState,
    renderSectionHead,
    renderActions,
    renderSurface,
    renderMetricCard,
    renderField,
    renderFormGrid,
    renderPanelTitle,
    renderCheckField,
    renderTable,
    renderAttributes
  });
})(window);
