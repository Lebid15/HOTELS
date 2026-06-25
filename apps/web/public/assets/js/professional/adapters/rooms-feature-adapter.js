// Fandqi Rooms Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiRoomsFeature(window) {
  if (window.FandqiRoomsFeature) return;

  const ROOM_STORAGE_KEY = 'fandqi.rooms';
  const ROOM_STATUSES = Object.freeze(['available', 'booked', 'occupied', 'cleaning', 'maintenance', 'out_of_service', 'archived']);
  const ROOM_ATTENTION_STATUSES = Object.freeze(['cleaning', 'maintenance', 'out_of_service']);
  const ROOM_BOOKED_RESERVATION_STATUSES = Object.freeze(['pending', 'confirmed']);
  const ROOM_DEFAULTS = Object.freeze({
    floor: '1',
    type: 'single',
    capacity: 1,
    status: 'available',
    currency: 'USD'
  });

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

  function getById(id) {
    return readRooms().find(room => room.id === id) || null;
  }

  function forHotel(hotelId, { includeArchived = false } = {}) {
    return readRooms().filter(room => room.hotelId === hotelId && (includeArchived || room.status !== 'archived'));
  }

  function updateStatus(id, status) {
    let updated = null;
    const next = readRooms().map(room => {
      if (room.id !== id) return room;
      updated = { ...room, status, updatedAt: new Date().toISOString().slice(0, 10) };
      return updated;
    });
    writeRooms(next);
    return updated;
  }

  function getRoomDisplayStatus(room, reservations = []) {
    if (!room) return 'available';
    if ([...ROOM_ATTENTION_STATUSES, 'archived'].includes(room.status)) return room.status;
    const roomReservations = reservations.filter(reservation => reservation.roomId === room.id);
    if (roomReservations.some(reservation => reservation.status === 'checked_in') || room.status === 'occupied') return 'occupied';
    if (roomReservations.some(reservation => ROOM_BOOKED_RESERVATION_STATUSES.includes(reservation.status || 'pending'))) return 'booked';
    return 'available';
  }

  function sortRoomsByFloorAndNumber(rooms = []) {
    return [...rooms].sort((a, b) => {
      const floorDelta = Number(a.floor || 0) - Number(b.floor || 0);
      if (floorDelta) return floorDelta;
      return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true });
    });
  }

  function groupRoomsByFloor(rooms = []) {
    return sortRoomsByFloorAndNumber(rooms).reduce((groups, room) => {
      const floor = String(room.floor || '-');
      const bucket = groups.find(group => group.floor === floor);
      if (bucket) bucket.rooms.push(room);
      else groups.push({ floor, rooms: [room] });
      return groups;
    }, []);
  }

  function normalizeRoom(room = {}) {
    return {
      ...ROOM_DEFAULTS,
      ...room,
      floor: String(room.floor || ROOM_DEFAULTS.floor).trim(),
      number: String(room.number || '').trim(),
      type: String(room.type || ROOM_DEFAULTS.type).trim(),
      capacity: Number(room.capacity || ROOM_DEFAULTS.capacity),
      price: Number(room.price || 0),
      status: ROOM_STATUSES.includes(room.status) ? room.status : ROOM_DEFAULTS.status
    };
  }

  function validateRoom(room = {}) {
    const value = normalizeRoom(room);
    const errors = [];
    if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
    if (!value.number) errors.push({ field: 'number', code: 'required' });
    if (!value.floor) errors.push({ field: 'floor', code: 'required' });
    if (!value.type) errors.push({ field: 'type', code: 'required' });
    if (!Number.isFinite(value.capacity) || value.capacity < 1) errors.push({ field: 'capacity', code: 'invalid_capacity' });
    return Object.freeze({ valid: errors.length === 0, errors, value });
  }

  window.FandqiRoomsFeature = Object.freeze({
    version: 'rooms-feature-adapter-v1',
    constants: Object.freeze({
      storageKey: ROOM_STORAGE_KEY,
      statuses: ROOM_STATUSES,
      attentionStatuses: ROOM_ATTENTION_STATUSES
    }),
    repository: Object.freeze({
      read: readRooms,
      write: writeRooms,
      byId: getById,
      forHotel,
      updateStatus
    }),
    selectors: Object.freeze({
      getRoomDisplayStatus,
      sortRoomsByFloorAndNumber,
      groupRoomsByFloor
    }),
    validators: Object.freeze({
      normalizeRoom,
      validateRoom
    }),
    actions: Object.freeze({
      archive: id => updateStatus(id, 'archived'),
      restore: id => updateStatus(id, 'available'),
      setCleaning: id => updateStatus(id, 'cleaning'),
      setMaintenance: id => updateStatus(id, 'maintenance'),
      setAvailable: id => updateStatus(id, 'available')
    })
  });
})(window);
