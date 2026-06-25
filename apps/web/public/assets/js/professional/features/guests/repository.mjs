import { reservationRepository } from '../../data/repositories/domain-repositories.mjs';

function normalizeReservations(value) {
  return Array.isArray(value) ? value : [];
}

export function createGuestsRepository(repository = reservationRepository) {
  return Object.freeze({
    readReservations() {
      return normalizeReservations(repository.read());
    },
    reservationsForHotel(hotelId, { includeArchived = false } = {}) {
      return this.readReservations().filter(reservation => reservation.hotelId === hotelId && (includeArchived || reservation.status !== 'archived'));
    }
  });
}

export const guestsRepository = createGuestsRepository();
