import { HOUSEKEEPING_ATTENTION_STATUSES, HOUSEKEEPING_SORT_ORDER } from './constants.mjs';
import { normalizeHousekeepingText } from './validators.mjs';

export function getReservationsByRoom(reservations = [], roomId) {
  return reservations
    .filter(reservation => reservation.roomId === roomId && ['checked_in', 'completed'].includes(reservation.status))
    .sort((a, b) => String(b.actualCheckOutAt || b.checkOutDate || b.updatedAt || '').localeCompare(String(a.actualCheckOutAt || a.checkOutDate || a.updatedAt || '')));
}

export function getLastReservationForRoom(room, reservations = []) {
  if (!room?.id) return null;
  const roomReservations = getReservationsByRoom(reservations, room.id);
  if (room.lastCheckoutReservationId) {
    return roomReservations.find(reservation => reservation.id === room.lastCheckoutReservationId) || roomReservations[0] || null;
  }
  return roomReservations[0] || null;
}

export function summarizeHousekeepingRooms(rooms = [], getDisplayStatus = room => room.status) {
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

export function sortHousekeepingRooms(rooms = [], getDisplayStatus = room => room.status) {
  return [...rooms].sort((a, b) => {
    const statusDelta = (HOUSEKEEPING_SORT_ORDER[getDisplayStatus(a)] ?? 9) - (HOUSEKEEPING_SORT_ORDER[getDisplayStatus(b)] ?? 9);
    if (statusDelta) return statusDelta;
    const floorDelta = Number(a.floor || 0) - Number(b.floor || 0);
    if (floorDelta) return floorDelta;
    return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true });
  });
}

export function filterHousekeepingRooms(rooms = [], { search = '', status = 'cleaning', floor = '' } = {}, helpers = {}) {
  const {
    getDisplayStatus = room => room.status,
    getRoomTypeLabel = room => room.type || '',
    getRoomStatusLabel = value => value || '',
    getLastReservation = () => null,
    getGuestName = reservation => reservation?.guestName || ''
  } = helpers;
  const normalizedSearch = normalizeHousekeepingText(search);
  const floorFilter = String(floor || '').trim();
  return sortHousekeepingRooms(rooms.filter(room => {
    const displayStatus = getDisplayStatus(room);
    const lastReservation = getLastReservation(room);
    const matchesSearch = !normalizedSearch || [
      room.number,
      room.floor,
      getRoomTypeLabel(room.type),
      getRoomStatusLabel(displayStatus),
      room.notes,
      room.lastCheckoutReservationNo,
      room.lastCheckoutGuestName,
      lastReservation?.reservationNo,
      lastReservation ? getGuestName(lastReservation) : ''
    ].some(value => normalizeHousekeepingText(value).includes(normalizedSearch));
    const matchesStatus = status === 'all' || displayStatus === status;
    const matchesFloor = !floorFilter || String(room.floor || '') === floorFilter;
    return matchesSearch && matchesStatus && matchesFloor;
  }), getDisplayStatus);
}
