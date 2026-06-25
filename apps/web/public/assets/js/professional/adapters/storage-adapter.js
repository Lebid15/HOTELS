// Fandqi Storage Adapter
// Centralized classic-script storage layer used by legacy modules during migration.
(function installFandqiStorageAdapter(window) {
  if (window.FandqiStorage) return;

  function parseJson(value, fallback) {
    try {
      return value == null || value === '' ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function nativeRead(key) {
    try { return window.localStorage.getItem(key); }
    catch { return null; }
  }

  function nativeWrite(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return value;
    } catch {
      return value;
    }
  }

  function nativeRemove(key) {
    try { window.localStorage.removeItem(key); }
    catch {}
  }

  function readText(key, fallback = '') {
    const runtimeValue = window.FandqiRuntime?.storage?.getText?.(key, fallback);
    if (runtimeValue !== undefined && runtimeValue !== null) return runtimeValue;
    const value = nativeRead(key);
    return value == null ? fallback : value;
  }

  function writeText(key, value) {
    if (window.FandqiRuntime?.storage?.setText) return window.FandqiRuntime.storage.setText(key, value);
    return nativeWrite(key, String(value));
  }

  function readJson(key, fallback = null) {
    if (window.FandqiRuntime?.storage?.readJson) return window.FandqiRuntime.storage.readJson(key, fallback);
    return parseJson(nativeRead(key), fallback);
  }

  function writeJson(key, value) {
    if (window.FandqiRuntime?.storage?.writeJson) return window.FandqiRuntime.storage.writeJson(key, value);
    nativeWrite(key, JSON.stringify(value));
    return value;
  }

  function remove(key) {
    if (window.FandqiRuntime?.storage?.remove) return window.FandqiRuntime.storage.remove(key);
    nativeRemove(key);
  }

  function snapshot(keys = []) {
    return keys.reduce((data, key) => {
      data[key] = nativeRead(key);
      return data;
    }, {});
  }

  function restore(data = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) remove(key);
      else writeText(key, String(value));
    });
  }

  function clear(keys = []) {
    keys.forEach(remove);
  }

  function createRepository(key, fallback = []) {
    return Object.freeze({
      key,
      read() { return readJson(key, fallback); },
      write(value) { return writeJson(key, value); },
      clear() { return remove(key); }
    });
  }

  const STORAGE_KEYS = Object.freeze({
    auth: 'fandqi.auth',
    user: 'fandqi.user',
    activePage: 'fandqi.activePage',
    settingsTab: 'fandqi.settingsTab',
    hotelSettingsTab: 'fandqi.hotelSettingsTab',
    platformOwnerPassword: 'fandqi.platformOwnerPassword',
    platformSettings: 'fandqi.platformSettings',
    hotels: 'fandqi.hotels',
    packages: 'fandqi.subscriptionPackages',
    subscriptions: 'fandqi.subscriptions',
    hotelSettings: 'fandqi.hotelSettings',
    staff: 'fandqi.hotelStaff',
    rooms: 'fandqi.rooms',
    reservations: 'fandqi.reservations',
    foodMenu: 'fandqi.foodMenuItems',
    foodOrders: 'fandqi.foodOrders',
    maintenance: 'fandqi.maintenanceTickets',
    subscriptionRequests: 'fandqi.managerSubscriptionRequests'
  });

  const repositories = Object.freeze({
    user: createRepository(STORAGE_KEYS.user, null),
    platformSettings: createRepository(STORAGE_KEYS.platformSettings, {}),
    hotels: createRepository(STORAGE_KEYS.hotels, []),
    packages: createRepository(STORAGE_KEYS.packages, []),
    subscriptions: createRepository(STORAGE_KEYS.subscriptions, []),
    hotelSettings: createRepository(STORAGE_KEYS.hotelSettings, {}),
    staff: createRepository(STORAGE_KEYS.staff, []),
    rooms: createRepository(STORAGE_KEYS.rooms, []),
    reservations: createRepository(STORAGE_KEYS.reservations, []),
    foodMenu: createRepository(STORAGE_KEYS.foodMenu, []),
    foodOrders: createRepository(STORAGE_KEYS.foodOrders, []),
    maintenance: createRepository(STORAGE_KEYS.maintenance, []),
    subscriptionRequests: createRepository(STORAGE_KEYS.subscriptionRequests, [])
  });

  window.FandqiStorage = Object.freeze({
    version: 'storage-adapter-v2-domain-key-registry',
    readText,
    writeText,
    readJson,
    writeJson,
    remove,
    snapshot,
    restore,
    clear,
    createRepository,
    STORAGE_KEYS,
    repositories
  });
})(window);
