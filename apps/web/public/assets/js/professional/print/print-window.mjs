import { createPrintDocument, isCompletePrintDocument } from './print-document.mjs';

export function notifyPrintBlocked({ popupMessage } = {}) {
  const message = popupMessage || 'تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.';
  if (typeof window !== 'undefined' && typeof window.toast === 'function') window.toast(message);
}

export function normalizePrintOptions(options = {}) {
  return {
    width: options.width || 900,
    height: options.height || 700,
    title: options.title || 'Fandqi Print',
    styles: options.styles || '',
    lang: options.lang || document?.documentElement?.lang || 'ar',
    dir: options.dir || document?.documentElement?.dir || 'rtl',
    autoPrint: options.autoPrint !== false,
    autoPrintDelay: options.autoPrintDelay ?? options.delay ?? 300,
    popupMessage: options.popupMessage,
    bodyClass: options.bodyClass || ''
  };
}

export function buildPrintableHtml(html = '', options = {}) {
  const normalized = normalizePrintOptions(options);
  if (isCompletePrintDocument(html)) return String(html);
  return createPrintDocument({ ...normalized, html });
}

export function openHtml(html = '', options = {}) {
  const normalized = normalizePrintOptions(options);
  const printWindow = window.open('', '_blank', `width=${normalized.width},height=${normalized.height}`);
  if (!printWindow) {
    notifyPrintBlocked(normalized);
    return false;
  }
  printWindow.document.open();
  printWindow.document.write(buildPrintableHtml(html, normalized));
  printWindow.document.close();
  return true;
}

export function openPrintWindow({ html = '', ...options } = {}) {
  return openHtml(html, options);
}
