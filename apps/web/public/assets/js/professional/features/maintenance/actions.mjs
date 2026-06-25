import { MAINTENANCE_ACTIVE_STATUSES, MAINTENANCE_DEFAULTS } from './constants.mjs';
import { generateMaintenanceTicketNo } from './render.mjs';

export function createMaintenanceActions(repository) {
  return Object.freeze({
    setStatus(id, status, extra = {}) {
      const current = repository.byId(id);
      if (!current) return null;
      const patch = { ...extra };
      if (status === 'in_progress' && !current.startedAt) patch.startedAt = extra.updatedAt || extra.stamped || '';
      if (status === 'resolved') {
        patch.resolvedAt = extra.updatedAt || extra.stamped || '';
        patch.resolvedBy = extra.resolvedBy || extra.currentUserName || '';
      }
      return repository.updateStatus(id, status, patch);
    },
    ensureTicketForRoom({ room, options = {}, currentUserName = '', timestamp = '', createId = null } = {}) {
      if (!room?.id || !room.hotelId) return null;
      const tickets = repository.read();
      const existing = tickets.find(ticket => ticket.roomId === room.id && MAINTENANCE_ACTIVE_STATUSES.includes(ticket.status));
      if (existing) return existing;
      const ticket = {
        ...MAINTENANCE_DEFAULTS,
        ...options,
        id: typeof createId === 'function' ? createId('maintenance') : `maintenance-${Date.now()}`,
        ticketNo: options.ticketNo || generateMaintenanceTicketNo(tickets),
        hotelId: room.hotelId,
        roomId: room.id,
        createdAt: options.createdAt || timestamp,
        createdBy: options.createdBy || currentUserName,
        updatedAt: options.updatedAt || timestamp,
        startedAt: '',
        resolvedAt: '',
        resolvedBy: ''
      };
      repository.write([ticket, ...tickets]);
      return ticket;
    },
    ensureTicketsForMaintenanceRooms({ rooms = [], options = {}, currentUserName = '', timestamp = '', createId = null } = {}) {
      let tickets = repository.read();
      let changed = false;
      for (const room of rooms) {
        const exists = tickets.some(ticket => ticket.hotelId === room.hotelId && ticket.roomId === room.id && MAINTENANCE_ACTIVE_STATUSES.includes(ticket.status));
        if (!exists) {
          tickets = [{
            ...MAINTENANCE_DEFAULTS,
            ...options,
            id: typeof createId === 'function' ? createId('maintenance') : `maintenance-${Date.now()}-${room.id}`,
            ticketNo: generateMaintenanceTicketNo(tickets),
            hotelId: room.hotelId,
            roomId: room.id,
            source: options.source || 'room_status',
            createdAt: room.maintenanceStartedAt || timestamp,
            createdBy: room.maintenanceBy || currentUserName,
            updatedAt: timestamp,
            startedAt: '',
            resolvedAt: '',
            resolvedBy: ''
          }, ...tickets];
          changed = true;
        }
      }
      if (changed) repository.write(tickets);
      return tickets;
    }
  });
}
