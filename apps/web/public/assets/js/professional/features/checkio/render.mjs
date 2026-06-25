import { normalizeCheckInOutText } from './validators.mjs';

export function getReservationAmountDue(reservation, getFinancialTotal = value => Number(value?.totalAmount || value?.amount || 0)) {
  return Math.max(0, getFinancialTotal(reservation) - Number(reservation?.paidAmount || 0));
}

export function getReservationTimelineStatus(reservation, date) {
  const status = reservation?.status || 'pending';
  const checkIn = String(reservation?.checkInDate || '');
  const checkOut = String(reservation?.checkOutDate || '');
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'departed';
  if (status === 'checked_in') {
    if (checkOut && checkOut <= date) return 'departure_due';
    return 'in_house';
  }
  if (['pending', 'confirmed'].includes(status) && checkIn && checkIn <= date) return 'arrival_due';
  if (['pending', 'confirmed'].includes(status) && checkIn && checkIn > date) return 'upcoming';
  return status;
}

export function getReservationGuestsSummary(reservation) {
  const adults = Number(reservation?.adultCompanionCount || reservation?.adultCompanions?.length || 0);
  const children = Number(reservation?.childrenCount || 0);
  const total = Number(reservation?.guestsCount || 1);
  return { total, adults, children };
}

export function filterCheckInOutReservations(reservations = [], filters = {}, helpers = {}) {
  const {
    date = new Date().toISOString().slice(0, 10),
    getRoomById = () => null,
    getTimelineStatus = getReservationTimelineStatus,
    getAmountDue = getReservationAmountDue,
    getGuestName = reservation => reservation?.guestName || '',
    getRoomLabel = room => room?.number || '',
    getReservationStatusLabel = status => status || '',
    getCheckInOutStatusLabel = status => status || ''
  } = helpers;
  const search = normalizeCheckInOutText(filters.search || '');
  const tab = filters.tab || 'arrivals';
  return reservations.filter(reservation => {
    const room = getRoomById(reservation.roomId);
    const timelineStatus = getTimelineStatus(reservation, date);
    const amountDue = getAmountDue(reservation);
    const guestName = getGuestName(reservation);
    const matchesSearch = !search || [
      guestName,
      reservation.reservationNo,
      reservation.nationalId,
      reservation.guestPhone,
      reservation.guestEmail,
      getRoomLabel(room),
      getReservationStatusLabel(reservation.status),
      getCheckInOutStatusLabel(timelineStatus),
      reservation.actualCheckInAt,
      reservation.actualCheckOutAt
    ].some(value => normalizeCheckInOutText(value).includes(search));
    const matchesRoom = filters.room === 'all' || reservation.roomId === filters.room;
    const matchesTab =
      (tab === 'arrivals' && timelineStatus === 'arrival_due') ||
      (tab === 'in_house' && ['in_house', 'departure_due'].includes(timelineStatus)) ||
      (tab === 'departures' && timelineStatus === 'departure_due') ||
      (tab === 'log' && ['checked_in', 'completed'].includes(reservation.status)) ||
      (tab === 'attention' && (timelineStatus === 'departure_due' || amountDue > 0));
    return matchesSearch && matchesRoom && matchesTab;
  });
}

export function summarizeCheckInOut(reservations = [], { date = new Date().toISOString().slice(0, 10), getTimelineStatus = getReservationTimelineStatus, getAmountDue = getReservationAmountDue } = {}) {
  return reservations.reduce((acc, reservation) => {
    const status = getTimelineStatus(reservation, date);
    const due = getAmountDue(reservation);
    if (status === 'arrival_due') acc.arrivals += 1;
    if (['in_house', 'departure_due'].includes(status)) acc.inHouse += 1;
    if (status === 'departure_due') acc.departures += 1;
    if (due > 0 && ['arrival_due', 'in_house', 'departure_due'].includes(status)) acc.withBalance += 1;
    acc.balance += due;
    return acc;
  }, { arrivals: 0, inHouse: 0, departures: 0, withBalance: 0, balance: 0 });
}
