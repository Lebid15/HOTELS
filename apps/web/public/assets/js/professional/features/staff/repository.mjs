import { staffRepository } from '../../data/repositories/domain-repositories.mjs';

function normalizeStaffList(value) {
  return Array.isArray(value) ? value : [];
}

export function createStaffRepository(repository = staffRepository) {
  return Object.freeze({
    read() {
      return normalizeStaffList(repository.read());
    },
    write(staff) {
      return repository.write(normalizeStaffList(staff));
    },
    byId(id) {
      return this.read().find(staff => staff.id === id) || null;
    },
    forHotel(hotelId, { includeArchived = false } = {}) {
      return this.read().filter(staff => staff.hotelId === hotelId && (includeArchived || staff.status !== 'archived'));
    },
    upsert(staff) {
      const staffList = this.read();
      const index = staffList.findIndex(item => item.id === staff.id);
      const next = index >= 0
        ? staffList.map(item => item.id === staff.id ? { ...item, ...staff } : item)
        : [...staffList, staff];
      this.write(next);
      return staff;
    },
    update(id, patch = {}) {
      const staffList = this.read();
      let updated = null;
      const next = staffList.map(staff => {
        if (staff.id !== id) return staff;
        updated = { ...staff, ...patch, updatedAt: patch.updatedAt || new Date().toISOString().slice(0, 10) };
        return updated;
      });
      this.write(next);
      return updated;
    },
    updateStatus(id, status) {
      return this.update(id, { status });
    }
  });
}

export const staffRepositoryInstance = createStaffRepository();
