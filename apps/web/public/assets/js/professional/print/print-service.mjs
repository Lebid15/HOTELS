import { autoPrintScript, renderPrintWindowActions } from './print-actions.mjs';
import { createPrintDocument, escapePrintHtml, isCompletePrintDocument } from './print-document.mjs';
import { buildPrintableHtml, normalizePrintOptions, notifyPrintBlocked, openHtml, openPrintWindow } from './print-window.mjs';

export const printService = Object.freeze({
  version: 'true-module-print-service-v1',
  autoPrintScript,
  renderPrintWindowActions,
  createPrintDocument,
  escapePrintHtml,
  isCompletePrintDocument,
  buildPrintableHtml,
  normalizePrintOptions,
  notifyPrintBlocked,
  openHtml,
  openPrintWindow
});

export {
  autoPrintScript,
  renderPrintWindowActions,
  createPrintDocument,
  escapePrintHtml,
  isCompletePrintDocument,
  buildPrintableHtml,
  normalizePrintOptions,
  notifyPrintBlocked,
  openHtml,
  openPrintWindow
};
