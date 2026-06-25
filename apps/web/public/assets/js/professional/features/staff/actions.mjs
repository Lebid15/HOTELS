export function createStaffActions(repository) {
  return Object.freeze({
    activate(id) {
      return repository.updateStatus(id, 'active');
    },
    suspend(id) {
      return repository.updateStatus(id, 'suspended');
    },
    toggleStatus(id) {
      const staff = repository.byId(id);
      const nextStatus = staff?.status === 'active' ? 'suspended' : 'active';
      return repository.updateStatus(id, nextStatus);
    },
    archive(id) {
      return repository.updateStatus(id, 'archived');
    },
    updatePassword(id, password) {
      return repository.update(id, { password });
    },
    updateShift(id, shift) {
      return repository.update(id, { shift });
    },
    updatePermissions(id, permissions = []) {
      return repository.update(id, { permissions });
    }
  });
}
