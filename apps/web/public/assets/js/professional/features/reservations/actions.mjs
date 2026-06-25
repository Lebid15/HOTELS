export function createReservationActions(repository) {
  return Object.freeze({
    confirm(id) {
      return repository.updateStatus(id, 'confirmed');
    },
    cancel(id, extra = {}) {
      return repository.updateStatus(id, 'cancelled', extra);
    },
    checkIn(id, extra = {}) {
      return repository.updateStatus(id, 'checked_in', extra);
    },
    checkOut(id, extra = {}) {
      return repository.updateStatus(id, 'completed', extra);
    },
    archive(id) {
      return repository.updateStatus(id, 'archived');
    },
    reopen(id) {
      return repository.updateStatus(id, 'pending');
    }
  });
}
