export function createCheckioActions(repository) {
  return Object.freeze({
    checkIn(id, extra = {}) {
      return repository.updateReservationStatus(id, 'checked_in', extra);
    },
    checkOut(id, extra = {}) {
      return repository.updateReservationStatus(id, 'completed', extra);
    },
    updateRoomStatus(roomId, status, extra = {}) {
      return repository.updateRoomStatus(roomId, status, extra);
    }
  });
}
