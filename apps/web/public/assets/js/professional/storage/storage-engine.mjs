function parseJson(value, fallback) {
  try {
    return value == null || value === '' ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeJson(value) {
  return JSON.stringify(value);
}

function getStorage(storage = globalThis.localStorage) {
  return storage || {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined
  };
}

export function createBrowserStorageEngine(storage = globalThis.localStorage) {
  const target = getStorage(storage);

  function getText(key, fallback = '') {
    try {
      const value = target.getItem(key);
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function setText(key, value) {
    try {
      target.setItem(key, String(value));
    } catch {}
    return value;
  }

  function readJson(key, fallback = null) {
    return parseJson(getText(key, ''), fallback);
  }

  function writeJson(key, value) {
    try {
      target.setItem(key, serializeJson(value));
    } catch {}
    return value;
  }

  function remove(key) {
    try { target.removeItem(key); } catch {}
  }

  function clear(keys = []) {
    keys.forEach(remove);
  }

  function snapshot(keys = []) {
    return keys.reduce((data, key) => {
      data[key] = getText(key, null);
      return data;
    }, {});
  }

  function restore(data = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) remove(key);
      else setText(key, String(value));
    });
  }

  return Object.freeze({ getText, setText, readJson, writeJson, remove, clear, snapshot, restore });
}

export const browserStorageEngine = createBrowserStorageEngine();
