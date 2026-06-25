// Fandqi Food Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiFoodFeature(window) {
  if (window.FandqiFoodFeature) return;

  const FOOD_MENU_STORAGE_KEY = 'fandqi.foodMenuItems';
  const FOOD_ORDER_STORAGE_KEY = 'fandqi.foodOrders';
  const FOOD_MENU_CATEGORIES = Object.freeze(['drinks', 'food', 'dessert', 'hospitality', 'extras']);
  const FOOD_MENU_AVAILABILITY = Object.freeze(['available', 'unavailable']);
  const FOOD_PAYMENT_METHODS = Object.freeze(['cash', 'electronic', 'room_account']);
  const FOOD_ORDER_STATUSES = Object.freeze(['delivered', 'archived', 'cancelled']);

  function readJson(key, fallback = []) {
    try {
      if (window.FandqiStorage?.read) return window.FandqiStorage.read(key, fallback);
      if (typeof window.readStorageJson === 'function') return window.readStorageJson(key, fallback);
      const raw = window.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (window.FandqiStorage?.write) return window.FandqiStorage.write(key, value);
    if (typeof window.writeStorageJson === 'function') return window.writeStorageJson(key, value);
    window.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  }

  function readMenu() {
    const items = readJson(FOOD_MENU_STORAGE_KEY, []);
    return Array.isArray(items) ? items : [];
  }

  function writeMenu(items) {
    return writeJson(FOOD_MENU_STORAGE_KEY, Array.isArray(items) ? items : []);
  }

  function readOrders() {
    const orders = readJson(FOOD_ORDER_STORAGE_KEY, []);
    return Array.isArray(orders) ? orders : [];
  }

  function writeOrders(orders) {
    return writeJson(FOOD_ORDER_STORAGE_KEY, Array.isArray(orders) ? orders : []);
  }

  function menuById(id) {
    return readMenu().find(item => item.id === id) || null;
  }

  function orderById(id) {
    return readOrders().find(order => order.id === id) || null;
  }

  function menuForHotel(hotelId, { includeArchived = false } = {}) {
    return readMenu().filter(item => item.hotelId === hotelId && (includeArchived || item.status !== 'archived'));
  }

  function ordersForHotel(hotelId, { includeArchived = false } = {}) {
    return readOrders().filter(order => order.hotelId === hotelId && (includeArchived || order.status !== 'archived'));
  }

  function upsertMenu(item) {
    const items = readMenu();
    const index = items.findIndex(existing => existing.id === item.id);
    const next = index >= 0
      ? items.map(existing => existing.id === item.id ? { ...existing, ...item } : existing)
      : [...items, item];
    writeMenu(next);
    return item;
  }

  function upsertOrder(order) {
    const orders = readOrders();
    const index = orders.findIndex(existing => existing.id === order.id);
    const next = index >= 0
      ? orders.map(existing => existing.id === order.id ? { ...existing, ...order } : existing)
      : [...orders, order];
    writeOrders(next);
    return order;
  }

  function sortFoodMenuItems(items = []) {
    return [...items].sort((a, b) =>
      FOOD_MENU_CATEGORIES.indexOf(a.category || 'extras') - FOOD_MENU_CATEGORIES.indexOf(b.category || 'extras') ||
      String(a.name || '').localeCompare(String(b.name || ''), 'ar', { numeric: true })
    );
  }

  function getAvailableFoodMenuItems(items = []) {
    return sortFoodMenuItems(items).filter(item => (item.availability || item.status || 'available') === 'available');
  }

  function getFoodOrderItemsTotal(items = []) {
    return items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  }

  function getFoodOrderPaymentTone(order) {
    const method = order?.paymentMethod || 'cash';
    if (method === 'room_account') return 'warning';
    if (method === 'electronic') return 'accent';
    return 'active';
  }

  function getFoodOrderDisplayNumber(order) {
    const raw = String(order?.id || '').split('-').pop() || '';
    return raw ? `ORD-${raw.slice(-5).toUpperCase()}` : 'ORD';
  }

  function sortFoodOrdersNewest(orders = []) {
    return [...orders].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function sortFoodOrdersOldest(orders = []) {
    return [...orders].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }

  function getFoodOrdersByReservationId(orders = [], reservationId = '') {
    if (!reservationId) return [];
    return sortFoodOrdersOldest(orders.filter(order => order.status !== 'archived' && order.reservationId === reservationId));
  }

  function getFoodOrderPaidTotal(orders = []) {
    return orders
      .filter(order => (order.paymentMethod || 'cash') !== 'room_account')
      .reduce((sum, order) => sum + Number(order.amount || 0), 0);
  }

  function getFoodOrderRoomAccountTotal(orders = []) {
    return orders
      .filter(order => (order.paymentMethod || 'cash') === 'room_account')
      .reduce((sum, order) => sum + Number(order.amount || 0), 0);
  }

  function getReservationRoomAccountOrdersTotal(orders = [], reservationId = '') {
    if (!reservationId) return 0;
    return getFoodOrderRoomAccountTotal(orders.filter(order => order.reservationId === reservationId && order.status !== 'archived'));
  }

  function getReservationFinancialTotal(reservation, roomAccountTotal = 0) {
    return Number(reservation?.totalAmount || 0) + Number(roomAccountTotal || 0);
  }

  function normalizeFoodMenuItem(item = {}) {
    const category = FOOD_MENU_CATEGORIES.includes(item.category) ? item.category : 'extras';
    const availability = FOOD_MENU_AVAILABILITY.includes(item.availability) ? item.availability : 'available';
    return {
      serviceType: 'restaurant',
      category: 'extras',
      price: 0,
      currency: 'USD',
      availability: 'available',
      status: 'active',
      description: '',
      ...item,
      hotelId: String(item.hotelId || '').trim(),
      serviceType: String(item.serviceType || 'restaurant').trim(),
      category,
      name: String(item.name || '').trim(),
      price: Math.max(0, Number(item.price || 0)),
      currency: String(item.currency || 'USD').trim(),
      availability,
      description: String(item.description || '').trim()
    };
  }

  function validateFoodMenuItem(item = {}) {
    const value = normalizeFoodMenuItem(item);
    const errors = [];
    if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
    if (!value.name) errors.push({ field: 'name', code: 'required' });
    if (!Number.isFinite(value.price) || value.price < 0) errors.push({ field: 'price', code: 'invalid_price' });
    return Object.freeze({ valid: errors.length === 0, errors, value });
  }

  function normalizeFoodOrder(order = {}) {
    const paymentMethod = FOOD_PAYMENT_METHODS.includes(order.paymentMethod) ? order.paymentMethod : 'cash';
    return {
      serviceType: 'restaurant',
      sourceType: 'room',
      paymentMethod: 'cash',
      amount: 0,
      currency: 'USD',
      status: 'delivered',
      guestType: 'walk_in',
      ...order,
      hotelId: String(order.hotelId || '').trim(),
      serviceType: String(order.serviceType || 'restaurant').trim(),
      sourceType: String(order.sourceType || 'room').trim(),
      paymentMethod,
      roomId: String(order.roomId || '').trim(),
      roomNumber: String(order.roomNumber || '').trim(),
      reservationId: String(order.reservationId || '').trim(),
      guestEntryId: String(order.guestEntryId || '').trim(),
      guestName: String(order.guestName || '').trim(),
      tableNumber: String(order.tableNumber || '').trim(),
      externalVendor: String(order.externalVendor || '').trim(),
      orderText: String(order.orderText || '').trim(),
      items: Array.isArray(order.items) ? order.items : [],
      amount: Math.max(0, Number(order.amount || 0)),
      currency: String(order.currency || 'USD').trim()
    };
  }

  function validateFoodOrder(order = {}) {
    const value = normalizeFoodOrder(order);
    const errors = [];
    if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
    if (!value.serviceType) errors.push({ field: 'serviceType', code: 'required' });
    if (!value.sourceType) errors.push({ field: 'sourceType', code: 'required' });
    if (!value.guestName && value.sourceType !== 'hospitality') errors.push({ field: 'guestName', code: 'required' });
    if (!Array.isArray(value.items) || !value.items.length) errors.push({ field: 'items', code: 'required' });
    if (!Number.isFinite(value.amount) || value.amount < 0) errors.push({ field: 'amount', code: 'invalid_amount' });
    return Object.freeze({ valid: errors.length === 0, errors, value });
  }

  function addMenuItem(item, { idFactory = id => id, today = () => new Date().toISOString().slice(0, 10) } = {}) {
    const now = today();
    return upsertMenu(normalizeFoodMenuItem({
      ...item,
      id: item.id || idFactory('menu-item'),
      status: item.status || 'active',
      createdAt: item.createdAt || now,
      updatedAt: now
    }));
  }

  function addOrder(order, { idFactory = id => id, now = () => new Date().toISOString().slice(0, 16).replace('T', ' '), today = () => new Date().toISOString().slice(0, 10) } = {}) {
    const timestamp = now();
    return upsertOrder(normalizeFoodOrder({
      ...order,
      id: order.id || idFactory('food-order'),
      status: order.status || 'delivered',
      deliveredAt: order.deliveredAt || timestamp,
      createdAt: order.createdAt || timestamp,
      updatedAt: order.updatedAt || today()
    }));
  }

  function seedDefaultMenu(hotelId, currency = 'USD', defaults = [], { idFactory = id => id, today = () => new Date().toISOString().slice(0, 10) } = {}) {
    if (!hotelId) return [];
    const existing = menuForHotel(hotelId);
    if (existing.length) return existing;
    const now = today();
    const seeded = defaults.map((item, index) => normalizeFoodMenuItem({
      id: idFactory('menu-item', index),
      hotelId,
      serviceType: item.serviceType,
      category: item.category,
      name: item.name,
      price: item.price,
      currency,
      availability: 'available',
      status: 'active',
      description: '',
      createdAt: now,
      updatedAt: now
    }));
    writeMenu([...readMenu(), ...seeded]);
    return seeded;
  }

  window.FandqiFoodFeature = Object.freeze({
    version: 'food-feature-adapter-v1',
    constants: Object.freeze({
      menuStorageKey: FOOD_MENU_STORAGE_KEY,
      orderStorageKey: FOOD_ORDER_STORAGE_KEY,
      menuCategories: FOOD_MENU_CATEGORIES,
      menuAvailability: FOOD_MENU_AVAILABILITY,
      paymentMethods: FOOD_PAYMENT_METHODS,
      orderStatuses: FOOD_ORDER_STATUSES
    }),
    repository: Object.freeze({
      menu: Object.freeze({
        read: readMenu,
        write: writeMenu,
        byId: menuById,
        forHotel: menuForHotel,
        upsert: upsertMenu
      }),
      orders: Object.freeze({
        read: readOrders,
        write: writeOrders,
        byId: orderById,
        forHotel: ordersForHotel,
        upsert: upsertOrder
      })
    }),
    selectors: Object.freeze({
      sortFoodMenuItems,
      getAvailableFoodMenuItems,
      getFoodOrderItemsTotal,
      getFoodOrderPaymentTone,
      getFoodOrderDisplayNumber,
      sortFoodOrdersNewest,
      sortFoodOrdersOldest,
      getFoodOrdersByReservationId,
      getFoodOrderPaidTotal,
      getFoodOrderRoomAccountTotal,
      getReservationRoomAccountOrdersTotal,
      getReservationFinancialTotal
    }),
    validators: Object.freeze({
      normalizeFoodMenuItem,
      validateFoodMenuItem,
      normalizeFoodOrder,
      validateFoodOrder
    }),
    actions: Object.freeze({
      seedDefaultMenu,
      addMenuItem,
      addOrder,
      archiveMenuItem: id => {
        const item = menuById(id);
        return item ? upsertMenu({ ...item, status: 'archived', updatedAt: new Date().toISOString().slice(0, 10) }) : null;
      },
      archiveOrder: id => {
        const order = orderById(id);
        return order ? upsertOrder({ ...order, status: 'archived', updatedAt: new Date().toISOString().slice(0, 10) }) : null;
      }
    })
  });
})(window);
