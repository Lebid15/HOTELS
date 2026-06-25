export function createHousekeepingActions(repository) {
  return Object.freeze({
    markClean(roomId, extra = {}) {
      return repository.updateRoomStatus(roomId, 'available', extra);
    },
    sendToMaintenance(roomId, extra = {}) {
      return repository.updateRoomStatus(roomId, 'maintenance', extra);
    },
    setCleaning(roomId, extra = {}) {
      return repository.updateRoomStatus(roomId, 'cleaning', extra);
    },
    updateRoomStatus(roomId, status, extra = {}) {
      return repository.updateRoomStatus(roomId, status, extra);
    }
  });
}
