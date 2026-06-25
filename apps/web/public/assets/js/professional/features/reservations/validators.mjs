import { RESERVATION_DEFAULTS, RESERVATION_STATUSES, RESERVATION_SOURCES } from './constants.mjs';

export function normalizeReservation(reservation = {}) {
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
    guestFirstName: String(reservation.guestFirstName || '').trim(),
    guestLastName: String(reservation.guestLastName || '').trim(),
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

export function validateReservation(reservation = {}) {
  const value = normalizeReservation(reservation);
  const errors = [];

  if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
  if (!value.roomId) errors.push({ field: 'roomId', code: 'required' });
  if (!value.checkInDate) errors.push({ field: 'checkInDate', code: 'required' });
  if (!value.checkOutDate) errors.push({ field: 'checkOutDate', code: 'required' });
  if (!value.guestName && !(value.guestFirstName || value.guestLastName)) {
    errors.push({ field: 'guestName', code: 'required' });
  }
  if (!Number.isFinite(value.guestsCount) || value.guestsCount < 1) {
    errors.push({ field: 'guestsCount', code: 'invalid_guests_count' });
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value
  });
}
