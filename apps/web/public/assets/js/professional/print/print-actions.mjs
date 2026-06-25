export function toSafeDelay(delay = 300) {
  const parsed = Number(delay);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 300;
}

export function autoPrintScript(delay = 300) {
  const safeDelay = toSafeDelay(delay);
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

export function renderPrintWindowActions({ printLabel = 'طباعة', closeLabel = 'إغلاق', escapeHtml } = {}) {
  const escape = typeof escapeHtml === 'function'
    ? escapeHtml
    : value => String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;'
    })[char]);
  return `<div class="no-print"><button onclick="window.print()">${escape(printLabel)}</button><button class="close" onclick="window.close()">${escape(closeLabel)}</button></div>`;
}
