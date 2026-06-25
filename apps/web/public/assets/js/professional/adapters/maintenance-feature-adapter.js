// Fandqi Maintenance Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiMaintenanceFeature(window) {
  if (window.FandqiMaintenanceFeature) return;

  const MAINTENANCE_STORAGE_KEY = 'fandqi.maintenanceTickets';
  const MAINTENANCE_STATUSES = Object.freeze(['open', 'in_progress', 'waiting_parts', 'resolved', 'cancelled', 'archived']);
  const MAINTENANCE_ACTIVE_STATUSES = Object.freeze(['open', 'in_progress', 'waiting_parts']);
  const MAINTENANCE_PRIORITIES = Object.freeze(['low', 'medium', 'high', 'urgent']);
  const MAINTENANCE_TYPES = Object.freeze(['electric', 'plumbing', 'ac', 'internet', 'furniture', 'appliance', 'door', 'cleaning_damage', 'other']);
  const MAINTENANCE_DEFAULTS = Object.freeze({
    type: 'other',
    priority: 'medium',
    status: 'open',
    source: 'manual',
    assignedTo: '',
    description: ''
  });

  function readJson(key, fallback = []) {
    try {
      if (window.FandqiStorage?.read) return window.FandqiStorage.read(key, fallback);
      if (typeof window.readStorageJson === 'function') return window.readStorageJson(key, fallback);
      const raw = window.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (window.FandqiStorage?.write) return window.FandqiStorage.write(key, value);
    if (typeof window.writeStorageJson === 'function') return window.writeStorageJson(key, value);
    window.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  }

  function readTickets() {
    const tickets = readJson(MAINTENANCE_STORAGE_KEY, []);
    return Array.isArray(tickets) ? tickets : [];
  }

  function writeTickets(tickets) {
    return writeJson(MAINTENANCE_STORAGE_KEY, Array.isArray(tickets) ? tickets : []);
  }

  function byId(id) {
    return readTickets().find(ticket => ticket.id === id) || null;
  }

  function forHotel(hotelId, { includeArchived = false } = {}) {
    return readTickets().filter(ticket => ticket.hotelId === hotelId && (includeArchived || ticket.status !== 'archived'));
  }

  function updateStatus(id, status, extra = {}) {
    let updated = null;
    const next = readTickets().map(ticket => {
      if (ticket.id !== id) return ticket;
      updated = { ...ticket, ...extra, status, updatedAt: extra.updatedAt || new Date().toISOString().slice(0, 10) };
      return updated;
    });
    writeTickets(next);
    return updated;
  }

  function generateTicketNo(tickets = readTickets()) {
    return `MT-${String((tickets || []).length + 1).padStart(4, '0')}`;
  }

  function summarizeTickets(tickets = []) {
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

  function sortTickets(tickets = []) {
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

  function ensureTicketForRoom({ room, options = {}, currentUserName = '', timestamp = '', createId = null } = {}) {
    if (!room?.id || !room.hotelId) return null;
    const tickets = readTickets();
    const existing = tickets.find(ticket => ticket.roomId === room.id && MAINTENANCE_ACTIVE_STATUSES.includes(ticket.status));
    if (existing) return existing;
    const ticket = {
      ...MAINTENANCE_DEFAULTS,
      ...options,
      id: typeof createId === 'function' ? createId('maintenance') : `maintenance-${Date.now()}`,
      ticketNo: options.ticketNo || generateTicketNo(tickets),
      hotelId: room.hotelId,
      roomId: room.id,
      createdAt: options.createdAt || timestamp,
      createdBy: options.createdBy || currentUserName,
      updatedAt: options.updatedAt || timestamp,
      startedAt: '',
      resolvedAt: '',
      resolvedBy: ''
    };
    writeTickets([ticket, ...tickets]);
    return ticket;
  }

  function ensureTicketsForMaintenanceRooms({ rooms = [], options = {}, currentUserName = '', timestamp = '', createId = null } = {}) {
    let tickets = readTickets();
    let changed = false;
    for (const room of rooms) {
      const exists = tickets.some(ticket => ticket.hotelId === room.hotelId && ticket.roomId === room.id && MAINTENANCE_ACTIVE_STATUSES.includes(ticket.status));
      if (!exists) {
        tickets = [{
          ...MAINTENANCE_DEFAULTS,
          ...options,
          id: typeof createId === 'function' ? createId('maintenance') : `maintenance-${Date.now()}-${room.id}`,
          ticketNo: generateTicketNo(tickets),
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
    if (changed) writeTickets(tickets);
    return tickets;
  }

  function setStatus(id, status, extra = {}) {
    const current = byId(id);
    if (!current) return null;
    const patch = { ...extra };
    if (status === 'in_progress' && !current.startedAt) patch.startedAt = extra.updatedAt || extra.stamped || '';
    if (status === 'resolved') {
      patch.resolvedAt = extra.updatedAt || extra.stamped || '';
      patch.resolvedBy = extra.resolvedBy || extra.currentUserName || '';
    }
    return updateStatus(id, status, patch);
  }

  function normalizeTicket(ticket = {}) {
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

  window.FandqiMaintenanceFeature = Object.freeze({
    version: 'maintenance-feature-adapter-v1',
    constants: Object.freeze({
      storageKey: MAINTENANCE_STORAGE_KEY,
      statuses: MAINTENANCE_STATUSES,
      activeStatuses: MAINTENANCE_ACTIVE_STATUSES,
      priorities: MAINTENANCE_PRIORITIES,
      types: MAINTENANCE_TYPES
    }),
    repository: Object.freeze({
      read: readTickets,
      write: writeTickets,
      byId,
      forHotel,
      updateStatus
    }),
    selectors: Object.freeze({
      getMaintenanceActiveStatuses: () => [...MAINTENANCE_ACTIVE_STATUSES],
      generateMaintenanceTicketNo: generateTicketNo,
      summarizeMaintenanceTickets: summarizeTickets,
      sortMaintenanceTickets: sortTickets
    }),
    validators: Object.freeze({
      normalizeMaintenanceTicket: normalizeTicket
    }),
    actions: Object.freeze({
      setStatus,
      ensureTicketForRoom,
      ensureTicketsForMaintenanceRooms
    })
  });
})(window);
