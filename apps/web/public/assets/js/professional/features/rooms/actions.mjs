export function createRoomActions(repository) {
  return Object.freeze({
    archive(id) {
      return repository.updateStatus(id, 'archived');
    },
    restore(id) {
      return repository.updateStatus(id, 'available');
    },
    setCleaning(id) {
      return repository.updateStatus(id, 'cleaning');
    },
    setMaintenance(id) {
      return repository.updateStatus(id, 'maintenance');
    },
    setAvailable(id) {
      return repository.updateStatus(id, 'available');
    }
  });
}
