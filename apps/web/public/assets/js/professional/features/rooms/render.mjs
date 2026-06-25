import {
  ROOM_ATTENTION_STATUSES,
  ROOM_BOOKED_RESERVATION_STATUSES
} from './constants.mjs';

export function getRoomDisplayStatus(room, reservations = []) {
  if (!room) return 'available';
  if ([...ROOM_ATTENTION_STATUSES, 'archived'].includes(room.status)) return room.status;
  const roomReservations = reservations.filter(reservation => reservation.roomId === room.id);
  const hasOccupiedStay = roomReservations.some(reservation => reservation.status === 'checked_in');
  if (hasOccupiedStay || room.status === 'occupied') return 'occupied';
  const hasUpcomingBooking = roomReservations.some(reservation => ROOM_BOOKED_RESERVATION_STATUSES.includes(reservation.status || 'pending'));
  if (hasUpcomingBooking) return 'booked';
  return 'available';
}

export function sortRoomsByFloorAndNumber(rooms = []) {
  return [...rooms].sort((a, b) => {
    const floorDelta = Number(a.floor || 0) - Number(b.floor || 0);
    if (floorDelta) return floorDelta;
    return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true });
  });
}

export function groupRoomsByFloor(rooms = []) {
  return sortRoomsByFloorAndNumber(rooms).reduce((groups, room) => {
    const floor = String(room.floor || '-');
    const bucket = groups.find(group => group.floor === floor);
    if (bucket) {
      bucket.rooms.push(room);
    } else {
      groups.push({ floor, rooms: [room] });
    }
    return groups;
  }, []);
}

export function summarizeRooms(rooms = [], reservations = []) {
  return rooms.reduce((summary, room) => {
    const status = getRoomDisplayStatus(room, reservations);
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    if (ROOM_ATTENTION_STATUSES.includes(status)) summary.attention += 1;
    return summary;
  }, { total: 0, available: 0, booked: 0, occupied: 0, cleaning: 0, maintenance: 0, out_of_service: 0, archived: 0, attention: 0 });
}
