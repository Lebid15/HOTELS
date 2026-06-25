import { MAINTENANCE_ACTIVE_STATUSES } from './constants.mjs';

export function getMaintenanceActiveStatuses() {
  return [...MAINTENANCE_ACTIVE_STATUSES];
}

export function generateMaintenanceTicketNo(tickets = []) {
  return `MT-${String((tickets || []).length + 1).padStart(4, '0')}`;
}

export function summarizeMaintenanceTickets(tickets = []) {
  return tickets.reduce((acc, ticket) => {
    acc.total += 1;
    if (ticket.status === 'open') acc.open += 1;
    if (ticket.status === 'in_progress') acc.inProgress += 1;
    if (ticket.status === 'waiting_parts') acc.waitingParts += 1;
    if (ticket.status === 'resolved') acc.resolved += 1;
    if (['high', 'urgent'].includes(ticket.priority) && MAINTENANCE_ACTIVE_STATUSES.includes(ticket.status)) acc.critical += 1;
    return acc;
  }, { total: 0, open: 0, inProgress: 0, waitingParts: 0, resolved: 0, critical: 0 });
}

export function sortMaintenanceTickets(tickets = []) {
  const statusOrder = { open: 0, in_progress: 1, waiting_parts: 2, resolved: 3, cancelled: 4 };
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  return [...tickets].sort((a, b) => {
    const statusDelta = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (statusDelta) return statusDelta;
    const priorityDelta = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    if (priorityDelta) return priorityDelta;
    return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
  });
}

export function findActiveTicketForRoom(tickets = [], roomId) {
  return tickets.find(ticket => ticket.roomId === roomId && MAINTENANCE_ACTIVE_STATUSES.includes(ticket.status)) || null;
}
