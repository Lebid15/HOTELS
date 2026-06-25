import { maintenanceRepository } from '../../data/repositories/domain-repositories.mjs';

function normalizeTickets(value) {
  return Array.isArray(value) ? value : [];
}

export function createMaintenanceRepository(repository = maintenanceRepository) {
  return Object.freeze({
    read() {
      return normalizeTickets(repository.read());
    },
    write(tickets) {
      return repository.write(normalizeTickets(tickets));
    },
    byId(id) {
      return this.read().find(ticket => ticket.id === id) || null;
    },
    forHotel(hotelId, { includeArchived = false } = {}) {
      return this.read().filter(ticket => ticket.hotelId === hotelId && (includeArchived || ticket.status !== 'archived'));
    },
    upsert(ticket) {
      const tickets = this.read();
      const index = tickets.findIndex(item => item.id === ticket.id);
      const next = index >= 0
        ? tickets.map(item => item.id === ticket.id ? { ...item, ...ticket } : item)
        : [ticket, ...tickets];
      this.write(next);
      return ticket;
    },
    updateStatus(id, status, extra = {}) {
      const tickets = this.read();
      let updated = null;
      const next = tickets.map(ticket => {
        if (ticket.id !== id) return ticket;
        updated = { ...ticket, ...extra, status, updatedAt: extra.updatedAt || new Date().toISOString().slice(0, 10) };
        return updated;
      });
      this.write(next);
      return updated;
    }
  });
}

export const maintenanceTicketsRepository = createMaintenanceRepository();
