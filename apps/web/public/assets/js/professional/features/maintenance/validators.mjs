import {
  MAINTENANCE_DEFAULTS,
  MAINTENANCE_STATUSES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_TYPES
} from './constants.mjs';

export function normalizeMaintenanceTicket(ticket = {}) {
  return {
    ...MAINTENANCE_DEFAULTS,
    ...ticket,
    hotelId: String(ticket.hotelId || '').trim(),
    roomId: String(ticket.roomId || '').trim(),
    ticketNo: String(ticket.ticketNo || '').trim(),
    type: MAINTENANCE_TYPES.includes(ticket.type) ? ticket.type : MAINTENANCE_DEFAULTS.type,
    priority: MAINTENANCE_PRIORITIES.includes(ticket.priority) ? ticket.priority : MAINTENANCE_DEFAULTS.priority,
    status: MAINTENANCE_STATUSES.includes(ticket.status) ? ticket.status : MAINTENANCE_DEFAULTS.status,
    assignedTo: String(ticket.assignedTo || '').trim(),
    description: String(ticket.description || '').trim()
  };
}

export function validateMaintenanceTicket(ticket = {}) {
  const value = normalizeMaintenanceTicket(ticket);
  const errors = [];

  if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
  if (!value.type) errors.push({ field: 'type', code: 'required' });
  if (!value.priority) errors.push({ field: 'priority', code: 'required' });
  if (!value.status) errors.push({ field: 'status', code: 'required' });

  return Object.freeze({
    valid: errors.length === 0,
    errors,
    value
  });
}
