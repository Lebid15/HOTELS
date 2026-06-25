// Fandqi Housekeeping Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiHousekeepingFeature(window) {
  if (window.FandqiHousekeepingFeature) return;

  const ROOM_STORAGE_KEY = 'fandqi.rooms';
  const HOUSEKEEPING_ATTENTION_STATUSES = Object.freeze(['maintenance', 'out_of_service']);
  const HOUSEKEEPING_SORT_ORDER = Object.freeze({ cleaning: 0, maintenance: 1, out_of_service: 2, occupied: 3, booked: 4, available: 5 });

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

  function readRooms() {
    const rooms = readJson(ROOM_STORAGE_KEY, []);
    return Array.isArray(rooms) ? rooms : [];
  }

  function writeRooms(rooms) {
    return writeJson(ROOM_STORAGE_KEY, Array.isArray(rooms) ? rooms : []);
  }

  function updateRoomStatus(roomId, status, extra = {}) {
    let updated = null;
    const next = readRooms().map(room => {
      if (room.id !== roomId) return room;
      updated = { ...room, status, ...extra, updatedAt: extra.updatedAt || new Date().toISOString().slice(0, 10) };
      return updated;
    });
    writeRooms(next);
    return updated;
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getReservationsByRoom(reservations = [], roomId) {
    return reservations
      .filter(reservation => reservation.roomId === roomId && ['checked_in', 'completed'].includes(reservation.status))
      .sort((a, b) => String(b.actualCheckOutAt || b.checkOutDate || b.updatedAt || '').localeCompare(String(a.actualCheckOutAt || a.checkOutDate || a.updatedAt || '')));
  }

  function getLastReservationForRoom(room, reservations = []) {
    if (!room?.id) return null;
    const roomReservations = getReservationsByRoom(reservations, room.id);
    if (room.lastCheckoutReservationId) {
      return roomReservations.find(reservation => reservation.id === room.lastCheckoutReservationId) || roomReservations[0] || null;
    }
    return roomReservations[0] || null;
  }

  function summarizeRooms(rooms = [], getDisplayStatus = room => room.status) {
    return rooms.reduce((acc, room) => {
      const status = getDisplayStatus(room);
      acc.total += 1;
      if (status === 'cleaning') acc.cleaning += 1;
      if (status === 'available') acc.available += 1;
      if (status === 'occupied') acc.occupied += 1;
      if (HOUSEKEEPING_ATTENTION_STATUSES.includes(status)) acc.attention += 1;
      return acc;
    }, { total: 0, cleaning: 0, available: 0, occupied: 0, attention: 0 });
  }

  function sortRooms(rooms = [], getDisplayStatus = room => room.status) {
    return [...rooms].sort((a, b) => {
      const statusDelta = (HOUSEKEEPING_SORT_ORDER[getDisplayStatus(a)] ?? 9) - (HOUSEKEEPING_SORT_ORDER[getDisplayStatus(b)] ?? 9);
      if (statusDelta) return statusDelta;
      const floorDelta = Number(a.floor || 0) - Number(b.floor || 0);
      if (floorDelta) return floorDelta;
      return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true });
    });
  }

  function filterRooms(rooms = [], filters = {}, helpers = {}) {
    const {
      getDisplayStatus = room => room.status,
      getRoomTypeLabel = room => room.type || '',
      getRoomStatusLabel = value => value || '',
      getLastReservation = () => null,
      getGuestName = reservation => reservation?.guestName || ''
    } = helpers;
    const search = normalizeText(filters.search || '');
    const status = filters.status || 'cleaning';
    const floor = String(filters.floor || '').trim();
    return sortRooms(rooms.filter(room => {
      const displayStatus = getDisplayStatus(room);
      const lastReservation = getLastReservation(room);
      const matchesSearch = !search || [
        room.number,
        room.floor,
        getRoomTypeLabel(room.type),
        getRoomStatusLabel(displayStatus),
        room.notes,
        room.lastCheckoutReservationNo,
        room.lastCheckoutGuestName,
        lastReservation?.reservationNo,
        lastReservation ? getGuestName(lastReservation) : ''
      ].some(value => normalizeText(value).includes(search));
      const matchesStatus = status === 'all' || displayStatus === status;
      const matchesFloor = !floor || String(room.floor || '') === floor;
      return matchesSearch && matchesStatus && matchesFloor;
    }), getDisplayStatus);
  }

  window.FandqiHousekeepingFeature = Object.freeze({
    version: 'housekeeping-feature-adapter-v1',
    constants: Object.freeze({
      attentionStatuses: HOUSEKEEPING_ATTENTION_STATUSES,
      sortOrder: HOUSEKEEPING_SORT_ORDER
    }),
    repository: Object.freeze({
      readRooms,
      writeRooms,
      updateRoomStatus
    }),
    selectors: Object.freeze({
      getReservationsByRoom,
      getLastReservationForRoom,
      summarizeHousekeepingRooms: summarizeRooms,
      sortHousekeepingRooms: sortRooms,
      filterHousekeepingRooms: filterRooms
    }),
    validators: Object.freeze({
      normalizeHousekeepingText: normalizeText
    }),
    actions: Object.freeze({
      markClean: (roomId, extra = {}) => updateRoomStatus(roomId, 'available', extra),
      sendToMaintenance: (roomId, extra = {}) => updateRoomStatus(roomId, 'maintenance', extra),
      setCleaning: (roomId, extra = {}) => updateRoomStatus(roomId, 'cleaning', extra),
      updateRoomStatus
    })
  });
})(window);
