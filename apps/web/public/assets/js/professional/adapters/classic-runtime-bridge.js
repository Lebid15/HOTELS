// Fandqi Professional Runtime Bridge
// Classic-script adapter used by legacy modules during the gradual ES Modules migration.
(function installFandqiRuntimeBridge(window) {
  if (window.FandqiRuntime) return;

  function parseJson(value, fallback) {
    try {
      return value == null || value === '' ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function normalizeFallback(fallback) {
    return fallback == null ? '' : fallback;
  }

  const storage = {
    readJson(key, fallback = null) {
      return parseJson(window.localStorage.getItem(key), fallback);
    },
    writeJson(key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
      return value;
    },
    getText(key, fallback = '') {
      const value = window.localStorage.getItem(key);
      return value == null ? normalizeFallback(fallback) : value;
    },
    setText(key, value) {
      window.localStorage.setItem(key, String(value));
      return value;
    },
    remove(key) {
      window.localStorage.removeItem(key);
    },
    clear(keys = []) {
      keys.forEach(key => window.localStorage.removeItem(key));
    },
    snapshot(keys = []) {
      return keys.reduce((data, key) => {
        data[key] = window.localStorage.getItem(key);
        return data;
      }, {});
    },
    restore(snapshot = {}) {
      Object.entries(snapshot).forEach(([key, value]) => {
        if (value === null || value === undefined) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, String(value));
      });
    }
  };

  function todayISO(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function formatDateTime(value, locale = 'ar-SY') {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function openHtml(html, options = {}) {
    if (window.FandqiPrint?.openHtml) return window.FandqiPrint.openHtml(html, options);
    if (typeof window.toast === 'function') window.toast(options.popupMessage || 'تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.');
    return false;
  }

  const events = (() => {
    const listeners = new Map();
    return {
      on(name, handler) {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(handler);
        return () => listeners.get(name)?.delete(handler);
      },
      emit(name, payload = {}) {
        for (const handler of listeners.get(name) || []) handler(payload);
      },
      clear(name) {
        if (name) listeners.delete(name);
        else listeners.clear();
      }
    };
  })();

  window.FandqiRuntime = Object.freeze({
    version: 'classic-runtime-bridge-v3-print-facade',
    storage,
    dates: { todayISO, formatDateTime },
    print: { openHtml },
    events
  });
})(window);
