export const STORAGE_KEYS = Object.freeze({
  auth: 'fandqi.auth',
  user: 'fandqi.user',
  activePage: 'fandqi.activePage',
  settingsTab: 'fandqi.settingsTab',
  hotelSettingsTab: 'fandqi.hotelSettingsTab',
  theme: 'fandqi.theme',
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

export const STORAGE_FALLBACKS = Object.freeze({
  user: null,
  platformSettings: {},
  hotels: [],
  packages: [],
  subscriptions: [],
  hotelSettings: {},
  staff: [],
  rooms: [],
  reservations: [],
  foodMenu: [],
  foodOrders: [],
  maintenance: [],
  subscriptionRequests: []
});

export const DOMAIN_STORAGE_ENTRIES = Object.freeze([
  ['platformSettings', STORAGE_KEYS.platformSettings, STORAGE_FALLBACKS.platformSettings],
  ['hotels', STORAGE_KEYS.hotels, STORAGE_FALLBACKS.hotels],
  ['packages', STORAGE_KEYS.packages, STORAGE_FALLBACKS.packages],
  ['subscriptions', STORAGE_KEYS.subscriptions, STORAGE_FALLBACKS.subscriptions],
  ['hotelSettings', STORAGE_KEYS.hotelSettings, STORAGE_FALLBACKS.hotelSettings],
  ['staff', STORAGE_KEYS.staff, STORAGE_FALLBACKS.staff],
  ['rooms', STORAGE_KEYS.rooms, STORAGE_FALLBACKS.rooms],
  ['reservations', STORAGE_KEYS.reservations, STORAGE_FALLBACKS.reservations],
  ['foodMenu', STORAGE_KEYS.foodMenu, STORAGE_FALLBACKS.foodMenu],
  ['foodOrders', STORAGE_KEYS.foodOrders, STORAGE_FALLBACKS.foodOrders],
  ['maintenance', STORAGE_KEYS.maintenance, STORAGE_FALLBACKS.maintenance],
  ['subscriptionRequests', STORAGE_KEYS.subscriptionRequests, STORAGE_FALLBACKS.subscriptionRequests]
]);

export const BACKUP_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.auth,
  STORAGE_KEYS.user,
  STORAGE_KEYS.activePage,
  STORAGE_KEYS.settingsTab,
  STORAGE_KEYS.hotelSettingsTab,
  STORAGE_KEYS.platformOwnerPassword,
  STORAGE_KEYS.platformSettings,
  STORAGE_KEYS.hotels,
  STORAGE_KEYS.packages,
  STORAGE_KEYS.subscriptions,
  STORAGE_KEYS.hotelSettings,
  STORAGE_KEYS.staff,
  STORAGE_KEYS.rooms,
  STORAGE_KEYS.reservations,
  STORAGE_KEYS.foodMenu,
  STORAGE_KEYS.foodOrders,
  STORAGE_KEYS.maintenance,
  STORAGE_KEYS.subscriptionRequests
]);
