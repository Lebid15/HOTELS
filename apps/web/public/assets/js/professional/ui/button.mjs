import { escapeHtml, joinClasses, renderAttributes, renderIcon } from './html.mjs';

const TONES = new Set(['primary', 'secondary', 'accent', 'success', 'warning', 'danger', 'luxury', 'ghost', 'neutral']);
const SIZES = new Set(['small', 'large', 'compact']);

export function normalizeButtonTone(tone = 'primary') {
  return TONES.has(tone) ? tone : 'primary';
}

export function renderButton({
  label = '',
  tone = 'primary',
  size = '',
  type = 'button',
  action = '',
  icon = '',
  disabled = false,
  title = '',
  ariaLabel = '',
  className = '',
  attrs = {}
} = {}) {
  const safeTone = normalizeButtonTone(tone);
  const safeSize = SIZES.has(size) ? size : '';
  return `<button class="${joinClasses('btn', safeTone, safeSize, 'ds-btn', safeSize ? 'ds-btn-small' : '', className)}" type="${escapeHtml(type)}"${renderAttributes({
    'data-action': action || undefined,
    title: title || undefined,
    'aria-label': ariaLabel || undefined,
    disabled,
    ...attrs
  })}>${renderIcon(icon)}${escapeHtml(label)}</button>`;
}

export function renderIconButton({ icon = '', action = '', tone = 'neutral', label = '', title = '', className = '', attrs = {} } = {}) {
  const accessible = label || title || 'زر إجراء';
  return renderButton({
    label: '',
    tone,
    action,
    icon,
    title: title || accessible,
    ariaLabel: accessible,
    className: joinClasses('icon-btn', className),
    attrs
  });
}

export function renderActionGroup(actions = [], { className = 'row-actions' } = {}) {
  return `<div class="${joinClasses(className)}">${actions.map(action => renderButton(action)).join('')}</div>`;
}
