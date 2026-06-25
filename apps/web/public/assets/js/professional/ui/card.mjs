import { escapeHtml, joinClasses, renderIcon } from './html.mjs';

export function renderCard({
  title = '',
  subtitle = '',
  icon = '',
  badge = '',
  body = '',
  actions = '',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = ''
} = {}) {
  const iconHtml = icon ? `<div class="fandqi-ui-card-icon">${renderIcon(icon)}</div>` : '';
  const badgeHtml = badge ? `<div class="fandqi-ui-card-badge">${badge}</div>` : '';
  const subtitleHtml = subtitle ? `<p>${escapeHtml(subtitle)}</p>` : '';
  const actionsHtml = actions ? `<footer class="${joinClasses('fandqi-ui-card-actions', footerClassName)}">${actions}</footer>` : '';
  return `<article class="${joinClasses('fandqi-ui-card', 'ds-card', className)}">
    <header class="${joinClasses('fandqi-ui-card-header', headerClassName)}">
      <div class="fandqi-ui-card-title-wrap">${iconHtml}<div><h3>${escapeHtml(title)}</h3>${subtitleHtml}</div></div>${badgeHtml}
    </header>
    <div class="${joinClasses('fandqi-ui-card-body', bodyClassName)}">${body}</div>
    ${actionsHtml}
  </article>`;
}

export function renderMetricCard({ label = '', value = '', note = '', icon = '', tone = 'primary', className = '' } = {}) {
  return `<article class="${joinClasses('fandqi-ui-metric-card', `fandqi-ui-metric-card--${tone}`, className)}">
    ${icon ? `<div class="fandqi-ui-metric-icon">${renderIcon(icon)}</div>` : ''}
    <strong>${escapeHtml(value)}</strong>
    <span>${escapeHtml(label)}</span>
    ${note ? `<small>${escapeHtml(note)}</small>` : ''}
  </article>`;
}
