// Fandqi Print Adapter
// Classic-script facade. Legacy pages call this facade while the real print logic lives in professional/print/*.mjs.
(function installFandqiPrintAdapter(window) {
  if (window.FandqiPrint) return;

  function getModulePrintService() {
    return window.FandqiProfessional?.print || null;
  }

  function notifyBlocked(options = {}) {
    const message = options.popupMessage || window.FandqiI18n?.t?.('print.popupBlocked', 'تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.') || 'تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.';
    if (typeof window.toast === 'function') window.toast(message);
  }

  function fallbackOpenHtml(html, options = {}) {
    const width = options.width || 900;
    const height = options.height || 700;
    const win = window.open('', '_blank', `width=${width},height=${height}`);
    if (!win) {
      notifyBlocked(options);
      return false;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    return true;
  }

  function fallbackAutoPrintScript(delay = 300) {
    const safeDelay = Number.isFinite(Number(delay)) ? Number(delay) : 300;
    return `<script>
(function () {
  function runPrint() {
    try {
      window.focus();
      window.print();
    } catch (error) {
      console.error('Fandqi print failed:', error);
    }
  }
  if (document.readyState === 'complete') setTimeout(runPrint, ${safeDelay});
  else window.addEventListener('load', function () { setTimeout(runPrint, ${safeDelay}); }, { once: true });
})();
<\/script>`;
  }

  function openHtml(html, options = {}) {
    const printService = getModulePrintService();
    if (printService?.openHtml) return printService.openHtml(html, options);
    return fallbackOpenHtml(html, options);
  }

  function autoPrintScript(delay = 300) {
    const printService = getModulePrintService();
    if (printService?.autoPrintScript) return printService.autoPrintScript(delay);
    return fallbackAutoPrintScript(delay);
  }

  window.FandqiPrint = Object.freeze({
    version: 'print-adapter-v2-true-module-facade',
    openHtml,
    autoPrintScript
  });
})(window);
