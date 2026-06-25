import { autoPrintScript } from './print-actions.mjs';

export function escapePrintHtml(value = '') {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;'
  })[char]);
}

export function isCompletePrintDocument(html = '') {
  const value = String(html || '').trim().toLowerCase();
  return value.startsWith('<!doctype') || value.startsWith('<html');
}

export function createPrintDocument({
  title = 'Fandqi Print',
  html = '',
  styles = '',
  lang = 'ar',
  dir = 'rtl',
  autoPrint = true,
  autoPrintDelay = 300,
  bodyClass = ''
} = {}) {
  const bodyClassAttribute = bodyClass ? ` class="${escapePrintHtml(bodyClass)}"` : '';
  return `<!doctype html><html lang="${escapePrintHtml(lang)}" dir="${escapePrintHtml(dir)}"><head><meta charset="utf-8"><title>${escapePrintHtml(title)}</title><style>${styles || ''}</style></head><body${bodyClassAttribute}>${html || ''}${autoPrint ? autoPrintScript(autoPrintDelay) : ''}</body></html>`;
}
