import { roomRepository } from '../../data/repositories/domain-repositories.mjs';

function normalizeRooms(value) {
  return Array.isArray(value) ? value : [];
}

export function createRoomsRepository(repository = roomRepository) {
  return Object.freeze({
    read() {
      return normalizeRooms(repository.read());
    },
    write(rooms) {
      return repository.write(normalizeRooms(rooms));
    },
    byId(id) {
      return this.read().find(room => room.id === id) || null;
    },
    forHotel(hotelId, { includeArchived = false } = {}) {
      return this.read().filter(room => room.hotelId === hotelId && (includeArchived || room.status !== 'archived'));
    },
    upsert(room) {
      const rooms = this.read();
      const index = rooms.findIndex(item => item.id === room.id);
      const next = index >= 0
        ? rooms.map(item => item.id === room.id ? { ...item, ...room } : item)
        : [...rooms, room];
      this.write(next);
      return room;
    },
    updateStatus(id, status) {
      const rooms = this.read();
      let updated = null;
      const next = rooms.map(room => {
        if (room.id !== id) return room;
        updated = { ...room, status, updatedAt: new Date().toISOString().slice(0, 10) };
        return updated;
      });
      this.write(next);
      return updated;
    }
  });
}

export const roomsRepository = createRoomsRepository();
