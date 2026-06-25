import { roomRepository } from '../../data/repositories/domain-repositories.mjs';

function normalizeRooms(value) {
  return Array.isArray(value) ? value : [];
}

export function createHousekeepingRepository(repository = roomRepository) {
  return Object.freeze({
    readRooms() {
      return normalizeRooms(repository.read());
    },
    writeRooms(rooms) {
      return repository.write(normalizeRooms(rooms));
    },
    roomById(id) {
      return this.readRooms().find(room => room.id === id) || null;
    },
    updateRoomStatus(roomId, status, extra = {}) {
      const rooms = this.readRooms();
      let updated = null;
      const next = rooms.map(room => {
        if (room.id !== roomId) return room;
        updated = {
          ...room,
          status,
          ...extra,
          updatedAt: extra.updatedAt || new Date().toISOString().slice(0, 10)
        };
        return updated;
      });
      this.writeRooms(next);
      return updated;
    }
  });
}

export const housekeepingRepository = createHousekeepingRepository();
