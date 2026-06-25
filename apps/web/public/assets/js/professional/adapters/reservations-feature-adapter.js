// Fandqi Reservations Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiReservationsFeature(window) {
  if (window.FandqiReservationsFeature) return;

  const RESERVATION_STORAGE_KEY = 'fandqi.reservations';
  const RESERVATION_STATUSES = Object.freeze(['pending', 'confirmed', 'cancelled', 'checked_in', 'completed', 'archived']);
  const RESERVATION_SOURCES = Object.freeze(['direct', 'phone', 'whatsapp', 'online', 'other']);
  const ACTIVE_RESERVATION_ROOM_STATUSES = Object.freeze(['pending', 'confirmed', 'checked_in']);
  const RESERVATION_DEFAULTS = Object.freeze({
    status: 'pending',
    source: 'direct',
    guestsCount: 1,
    adultsCount: 1,
    childrenCount: 0,
    paidAmount: 0,
    amount: 0,
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

  function readReservations() {
    const reservations = readJson(RESERVATION_STORAGE_KEY, []);
    return Array.isArray(reservations) ? reservations : [];
  }

  function writeReservations(reservations) {
    return writeJson(RESERVATION_STORAGE_KEY, Array.isArray(reservations) ? reservations : []);
  }

  function byId(id) {
    return readReservations().find(reservation => reservation.id === id) || null;
  }

  function forHotel(hotelId, { includeArchived = false } = {}) {
    return readReservations().filter(reservation => reservation.hotelId === hotelId && (includeArchived || reservation.status !== 'archived'));
  }

  function updateStatus(id, status, extra = {}) {
    let updated = null;
    const next = readReservations().map(reservation => {
      if (reservation.id !== id) return reservation;
      updated = { ...reservation, ...extra, status, updatedAt: new Date().toISOString().slice(0, 10) };
      return updated;
    });
    writeReservations(next);
    return updated;
  }

  function dateRangesOverlap(startA, endA, startB, endB) {
    if (!startA || !endA || !startB || !endB) return false;
    return String(startA) < String(endB) && String(startB) < String(endA);
  }

  function isRoomReservedByActiveReservation(reservations = [], roomId, excludeReservationId = '', checkInDate = '', checkOutDate = '') {
    if (!roomId || !checkInDate || !checkOutDate) return false;
    return reservations.some(reservation => {
      if (reservation.roomId !== roomId || reservation.id === excludeReservationId) return false;
      if (!ACTIVE_RESERVATION_ROOM_STATUSES.includes(reservation.status || 'pending')) return false;
      return dateRangesOverlap(checkInDate, checkOutDate, reservation.checkInDate, reservation.checkOutDate);
    });
  }

  function calculateNights(checkInDate, checkOutDate) {
    if (!checkInDate || !checkOutDate) return 1;
    const start = new Date(`${checkInDate}T00:00:00`);
    const end = new Date(`${checkOutDate}T00:00:00`);
    const diff = Math.round((end - start) / 86400000);
    return Math.max(1, Number.isFinite(diff) ? diff : 1);
  }

  function calculateReservationTotals(room, checkInDate, checkOutDate, defaultCurrency = 'USD') {
    const nights = calculateNights(checkInDate, checkOutDate);
    const roomPrice = Number(room?.price || 0);
    const totalAmount = roomPrice * nights;
    return {
      room,
      nights,
      roomPrice,
      totalAmount,
      currency: room?.currency || defaultCurrency || 'USD'
    };
  }

  function getNextReservationNumber({ prefix = 'RES', lastNumber = 0, existingCount = 0 } = {}) {
    const seed = Math.max(Number(lastNumber || 0) + 1, Number(existingCount || 0) + 1);
    return `${prefix || 'RES'}-${String(seed).padStart(4, '0')}`;
  }

  function getReservationRooms(rooms = [], includeRoomId = '') {
    return rooms.filter(room => {
      if (room.status === 'archived' || room.status === 'out_of_service') return false;
      if (includeRoomId && room.id === includeRoomId) return true;
      return true;
    });
  }

  function sortReservationsByNewest(reservations = []) {
    return [...reservations].sort((a, b) =>
      String(b.checkInDate || '').localeCompare(String(a.checkInDate || '')) ||
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );
  }

  function normalizeReservation(reservation = {}) {
    const status = RESERVATION_STATUSES.includes(reservation.status) ? reservation.status : RESERVATION_DEFAULTS.status;
    const source = RESERVATION_SOURCES.includes(reservation.source) ? reservation.source : RESERVATION_DEFAULTS.source;
    return {
      ...RESERVATION_DEFAULTS,
      ...reservation,
      status,
      source,
      hotelId: String(reservation.hotelId || '').trim(),
      roomId: String(reservation.roomId || '').trim(),
      reservationNo: String(reservation.reservationNo || '').trim(),
      guestName: String(reservation.guestName || '').trim(),
      guestPhone: String(reservation.guestPhone || '').trim(),
      guestEmail: String(reservation.guestEmail || '').trim(),
      nationalId: String(reservation.nationalId || '').trim(),
      guestsCount: Number(reservation.guestsCount || RESERVATION_DEFAULTS.guestsCount),
      adultsCount: Number(reservation.adultsCount || RESERVATION_DEFAULTS.adultsCount),
      childrenCount: Number(reservation.childrenCount || RESERVATION_DEFAULTS.childrenCount),
      paidAmount: Number(reservation.paidAmount || 0),
      amount: Number(reservation.amount || 0)
    };
  }

  function validateReservation(reservation = {}) {
    const value = normalizeReservation(reservation);
    const errors = [];
    if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
    if (!value.roomId) errors.push({ field: 'roomId', code: 'required' });
    if (!value.checkInDate) errors.push({ field: 'checkInDate', code: 'required' });
    if (!value.checkOutDate) errors.push({ field: 'checkOutDate', code: 'required' });
    if (!value.guestName && !(value.guestFirstName || value.guestLastName)) errors.push({ field: 'guestName', code: 'required' });
    if (!Number.isFinite(value.guestsCount) || value.guestsCount < 1) errors.push({ field: 'guestsCount', code: 'invalid_guests_count' });
    return Object.freeze({ valid: errors.length === 0, errors, value });
  }

  window.FandqiReservationsFeature = Object.freeze({
    version: 'reservations-feature-adapter-v1',
    constants: Object.freeze({
      storageKey: RESERVATION_STORAGE_KEY,
      statuses: RESERVATION_STATUSES,
      sources: RESERVATION_SOURCES,
      activeRoomStatuses: ACTIVE_RESERVATION_ROOM_STATUSES
    }),
    repository: Object.freeze({
      read: readReservations,
      write: writeReservations,
      byId,
      forHotel,
      updateStatus
    }),
    selectors: Object.freeze({
      dateRangesOverlap,
      isRoomReservedByActiveReservation,
      calculateNights,
      calculateReservationTotals,
      getNextReservationNumber,
      getReservationRooms,
      sortReservationsByNewest
    }),
    validators: Object.freeze({
      normalizeReservation,
      validateReservation
    }),
    actions: Object.freeze({
      confirm: id => updateStatus(id, 'confirmed'),
      cancel: (id, extra = {}) => updateStatus(id, 'cancelled', extra),
      checkIn: (id, extra = {}) => updateStatus(id, 'checked_in', extra),
      checkOut: (id, extra = {}) => updateStatus(id, 'completed', extra),
      archive: id => updateStatus(id, 'archived'),
      reopen: id => updateStatus(id, 'pending')
    })
  });
})(window);
