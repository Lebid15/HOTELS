import { escapeHtml, joinClasses, renderAttributes } from './html.mjs';

const STATUS_TONES = {
  success: 'success',
  active: 'success',
  paid: 'success',
  completed: 'success',
  confirmed: 'success',
  checked_in: 'success',
  enabled: 'success',

  warning: 'warning',
  pending: 'warning',
  trial: 'warning',
  suspended: 'warning',
  partial: 'warning',
  booked: 'warning',

  danger: 'danger',
  expired: 'danger',
  cancelled: 'danger',
  canceled: 'danger',
  unpaid: 'danger',
  archived: 'danger',
  inactive: 'danger',

  info: 'info',
  neutral: 'neutral',
  not_set: 'neutral'
};

export function normalizeBadgeStatus(status = 'neutral') {
  return STATUS_TONES[status] ? status : 'neutral';
}

export function normalizeBadgeTone(status = 'neutral') {
  return STATUS_TONES[status] || 'neutral';
}

export function renderBadge({ label = '', status = 'neutral', className = '', attrs = {} } = {}) {
  const rawStatus = normalizeBadgeStatus(status);
  const tone = normalizeBadgeTone(rawStatus);
  return `<span class="${joinClasses('status-badge', rawStatus, 'ds-badge', `ds-status-${tone}`, className)}" data-status="${escapeHtml(rawStatus)}"${renderAttributes(attrs)}>${escapeHtml(label)}</span>`;
}
