import { reservationRepository, roomRepository } from '../../data/repositories/domain-repositories.mjs';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createCheckioRepository({ reservations = reservationRepository, rooms = roomRepository } = {}) {
  return Object.freeze({
    readReservations() {
      return normalizeArray(reservations.read());
    },
    writeReservations(value) {
      return reservations.write(normalizeArray(value));
    },
    reservationById(id) {
      return this.readReservations().find(reservation => reservation.id === id) || null;
    },
    updateReservationStatus(id, status, extra = {}) {
      const all = this.readReservations();
      let updated = null;
      const next = all.map(reservation => {
        if (reservation.id !== id) return reservation;
        updated = { ...reservation, ...extra, status, updatedAt: extra.updatedAt || new Date().toISOString().slice(0, 10) };
        return updated;
      });
      this.writeReservations(next);
      return updated;
    },
    readRooms() {
      return normalizeArray(rooms.read());
    },
    writeRooms(value) {
      return rooms.write(normalizeArray(value));
    },
    updateRoomStatus(roomId, status, extra = {}) {
      const all = this.readRooms();
      let updated = null;
      const next = all.map(room => {
        if (room.id !== roomId) return room;
        updated = { ...room, status, ...extra, updatedAt: extra.updatedAt || new Date().toISOString().slice(0, 10) };
        return updated;
      });
      this.writeRooms(next);
      return updated;
    }
  });
}

export const checkioRepository = createCheckioRepository();
