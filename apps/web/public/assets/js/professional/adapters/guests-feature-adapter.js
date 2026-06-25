// Fandqi Guests Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiGuestsFeature(window) {
  if (window.FandqiGuestsFeature) return;

  const GUEST_ROOM_COLOR_CLASS_COUNT = 72;
  const GUEST_TYPE_SORT_ORDER = Object.freeze({ primary: 1, companion: 2, children: 3 });

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeRoomPart(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getGuestStayStatus(reservation, today = new Date().toISOString().slice(0, 10)) {
    const status = reservation?.status || 'pending';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'completed') return 'departed';
    const checkIn = String(reservation?.checkInDate || '');
    const checkOut = String(reservation?.checkOutDate || '');
    if (status === 'checked_in') return 'active';
    if (checkIn && checkIn === today && ['pending', 'confirmed', 'checked_in'].includes(status)) return 'arriving';
    if (checkIn && checkOut && checkIn < today && checkOut >= today && ['pending', 'confirmed', 'checked_in'].includes(status)) return 'active';
    if (checkIn && checkIn > today && ['pending', 'confirmed'].includes(status)) return 'upcoming';
    if (checkOut && checkOut < today) return 'departed';
    return status === 'confirmed' ? 'upcoming' : 'pending';
  }

  function getGuestAmountDue(entry, getAmountDue = reservation => Math.max(0, Number(reservation?.totalAmount || reservation?.amount || 0) - Number(reservation?.paidAmount || 0))) {
    return getAmountDue(entry?.reservation);
  }

  function getGuestDocumentTypeList(entry, getDocumentLabel = value => value) {
    const docs = [];
    if (entry.documentType) docs.push(getDocumentLabel(entry.documentType));
    if (entry.familyProofType) docs.push(getDocumentLabel(entry.familyProofType));
    return [...new Set(docs.filter(Boolean))];
  }

  function getGuestRoomColorKey(entry) {
    const roomId = normalizeRoomPart(entry?.reservation?.roomId || entry?.room?.id || '');
    if (roomId) return `room-id:${roomId}`;
    const roomLabel = normalizeRoomPart(entry?.roomLabel || entry?.reservation?.roomLabel || '');
    if (roomLabel) return `room-label:${roomLabel}`;
    return 'room-label:no-room';
  }

  function getGuestRoomSortKey(entry) {
    const room = entry?.room || {};
    const floorValue = Number(room.floor || entry?.reservation?.roomFloor || 0);
    const floor = Number.isFinite(floorValue) ? floorValue : 0;
    const roomNumber = normalizeRoomPart(room.number || entry?.reservation?.roomNumber || entry?.roomLabel || '');
    return `${String(floor).padStart(4, '0')}|${roomNumber}`;
  }

  function buildGuestRoomColorMap(entries = []) {
    const rooms = new Map();
    entries.forEach(entry => {
      const key = getGuestRoomColorKey(entry);
      if (!rooms.has(key)) rooms.set(key, getGuestRoomSortKey(entry));
    });
    return new Map(
      [...rooms.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'ar', { numeric: true }) || a[0].localeCompare(b[0], 'ar', { numeric: true }))
        .map(([key], index) => [key, index])
    );
  }

  function getGuestRoomColorIndex(entry, roomColorMap = null) {
    const key = getGuestRoomColorKey(entry);
    if (roomColorMap && roomColorMap.has(key)) return roomColorMap.get(key);
    return 0;
  }

  function getGuestRoomColorClass(entry, roomColorMap = null) {
    const index = getGuestRoomColorIndex(entry, roomColorMap);
    return `guest-room-color-${(index % GUEST_ROOM_COLOR_CLASS_COUNT) + 1}`;
  }

  function getGuestTypeSortRank(entry) {
    return GUEST_TYPE_SORT_ORDER[entry?.type] || 9;
  }

  function compareGuestsByRoomGroup(a, b, roomColorMap) {
    const roomIndexDelta = getGuestRoomColorIndex(a, roomColorMap) - getGuestRoomColorIndex(b, roomColorMap);
    if (roomIndexDelta) return roomIndexDelta;
    const roomSortDelta = getGuestRoomSortKey(a).localeCompare(getGuestRoomSortKey(b), 'ar', { numeric: true });
    if (roomSortDelta) return roomSortDelta;
    const reservationDelta = String(a?.reservationNo || '').localeCompare(String(b?.reservationNo || ''), 'ar', { numeric: true });
    if (reservationDelta) return reservationDelta;
    const typeDelta = getGuestTypeSortRank(a) - getGuestTypeSortRank(b);
    if (typeDelta) return typeDelta;
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'ar', { numeric: true });
  }

  function summarizeGuests(entries = [], getAmountDue = getGuestAmountDue, getDocuments = getGuestDocumentTypeList) {
    return entries.reduce((acc, entry) => {
      const count = Number(entry.personCount || 1);
      acc.total += count;
      if (entry.stayStatus === 'active') acc.active += count;
      if (entry.stayStatus === 'arriving') acc.arriving += count;
      if (entry.stayStatus === 'upcoming') acc.upcoming += count;
      if (getDocuments(entry).length) acc.documents += count;
      acc.remaining += getAmountDue(entry);
      return acc;
    }, { total: 0, active: 0, arriving: 0, upcoming: 0, documents: 0, remaining: 0 });
  }

  function filterGuests(entries = [], filters = {}) {
    const search = normalizeText(filters.search || '');
    const stayStatus = filters.stayStatus || 'all';
    const type = filters.type || 'all';
    const room = filters.room || 'all';
    return entries.filter(entry => {
      const docs = Array.isArray(entry.documentLabels) ? entry.documentLabels.join(' ') : '';
      const matchesSearch = !search || [
        entry.name,
        entry.nationalId,
        entry.phone,
        entry.email,
        entry.relationshipLabel,
        entry.typeLabel,
        entry.reservationNo,
        entry.roomLabel,
        entry.sourceLabel,
        docs
      ].some(value => normalizeText(value).includes(search));
      const matchesStatus = stayStatus === 'all' || entry.stayStatus === stayStatus;
      const matchesType = type === 'all' || entry.type === type;
      const matchesRoom = room === 'all' || entry.reservation?.roomId === room;
      return matchesSearch && matchesStatus && matchesType && matchesRoom;
    });
  }

  window.FandqiGuestsFeature = Object.freeze({
    version: 'guests-feature-adapter-v1',
    constants: Object.freeze({
      roomColorClassCount: GUEST_ROOM_COLOR_CLASS_COUNT,
      typeSortOrder: GUEST_TYPE_SORT_ORDER
    }),
    selectors: Object.freeze({
      getGuestStayStatus,
      getGuestAmountDue,
      getGuestDocumentTypeList,
      getGuestRoomColorKey,
      getGuestRoomSortKey,
      buildGuestRoomColorMap,
      getGuestRoomColorIndex,
      getGuestRoomColorClass,
      getGuestTypeSortRank,
      compareGuestsByRoomGroup,
      summarizeGuests,
      filterGuests
    }),
    validators: Object.freeze({
      normalizeGuestText: normalizeText,
      normalizeGuestRoomColorPart: normalizeRoomPart
    }),
    actions: Object.freeze({
      openReservation: entry => entry?.reservationId || '',
      printReservation: entry => entry?.reservationId || ''
    })
  });
})(window);
