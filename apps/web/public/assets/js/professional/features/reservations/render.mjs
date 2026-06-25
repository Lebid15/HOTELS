import { ACTIVE_RESERVATION_ROOM_STATUSES } from './constants.mjs';

export function dateRangesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  return String(startA) < String(endB) && String(startB) < String(endA);
}

export function isRoomReservedByActiveReservation(reservations = [], roomId, excludeReservationId = '', checkInDate = '', checkOutDate = '') {
  if (!roomId || !checkInDate || !checkOutDate) return false;
  return reservations.some(reservation => {
    if (reservation.roomId !== roomId || reservation.id === excludeReservationId) return false;
    if (!ACTIVE_RESERVATION_ROOM_STATUSES.includes(reservation.status || 'pending')) return false;
    return dateRangesOverlap(checkInDate, checkOutDate, reservation.checkInDate, reservation.checkOutDate);
  });
}

export function calculateNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 1;
  const start = new Date(`${checkInDate}T00:00:00`);
  const end = new Date(`${checkOutDate}T00:00:00`);
  const diff = Math.round((end - start) / 86400000);
  return Math.max(1, Number.isFinite(diff) ? diff : 1);
}

export function calculateReservationTotals(room, checkInDate, checkOutDate, defaultCurrency = 'USD') {
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

export function getNextReservationNumber({ prefix = 'RES', lastNumber = 0, existingCount = 0 } = {}) {
  const seed = Math.max(Number(lastNumber || 0) + 1, Number(existingCount || 0) + 1);
  return `${prefix || 'RES'}-${String(seed).padStart(4, '0')}`;
}

export function getReservationRooms(rooms = [], includeRoomId = '') {
  return rooms.filter(room => {
    if (room.status === 'archived' || room.status === 'out_of_service') return false;
    if (includeRoomId && room.id === includeRoomId) return true;
    return true;
  });
}

export function sortReservationsByNewest(reservations = []) {
  return [...reservations].sort((a, b) =>
    String(b.checkInDate || '').localeCompare(String(a.checkInDate || '')) ||
    String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  );
}

export function filterReservations(reservations = [], predicate = () => true) {
  return reservations.filter(predicate);
}
