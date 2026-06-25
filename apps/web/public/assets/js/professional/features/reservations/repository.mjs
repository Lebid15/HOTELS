import { reservationRepository } from '../../data/repositories/domain-repositories.mjs';

function normalizeReservations(value) {
  return Array.isArray(value) ? value : [];
}

export function createReservationsRepository(repository = reservationRepository) {
  return Object.freeze({
    read() {
      return normalizeReservations(repository.read());
    },
    write(reservations) {
      return repository.write(normalizeReservations(reservations));
    },
    byId(id) {
      return this.read().find(reservation => reservation.id === id) || null;
    },
    forHotel(hotelId, { includeArchived = false } = {}) {
      return this.read().filter(reservation => reservation.hotelId === hotelId && (includeArchived || reservation.status !== 'archived'));
    },
    upsert(reservation) {
      const reservations = this.read();
      const index = reservations.findIndex(item => item.id === reservation.id);
      const next = index >= 0
        ? reservations.map(item => item.id === reservation.id ? { ...item, ...reservation } : item)
        : [...reservations, reservation];
      this.write(next);
      return reservation;
    },
    updateStatus(id, status, extra = {}) {
      const reservations = this.read();
      let updated = null;
      const next = reservations.map(reservation => {
        if (reservation.id !== id) return reservation;
        updated = {
          ...reservation,
          ...extra,
          status,
          updatedAt: new Date().toISOString().slice(0, 10)
        };
        return updated;
      });
      this.write(next);
      return updated;
    }
  });
}

export const reservationsRepository = createReservationsRepository();
