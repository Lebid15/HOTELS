// Fandqi Modular Refactor — Maintenance tickets, reports, payments page, and notifications page rendering/events.
const MAINTENANCE_STORAGE_KEY = 'fandqi.maintenanceTickets';
const MAINTENANCE_STATUSES = ['open','in_progress','waiting_parts','resolved','cancelled'];
const MAINTENANCE_PRIORITIES = ['low','medium','high','urgent'];
const MAINTENANCE_TYPES = ['electric','plumbing','ac','internet','furniture','appliance','door','cleaning_damage','other'];

function maintenanceFeature() {
  return window.FandqiMaintenanceFeature || null;
}

function readMaintenanceTickets() {
  const feature = maintenanceFeature();
  if (feature?.repository?.read) return feature.repository.read();
  try {
    const value = readStorageJson(MAINTENANCE_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeMaintenanceTickets(tickets) {
  const feature = maintenanceFeature();
  if (feature?.repository?.write) return feature.repository.write(tickets);
  writeStorageJson(MAINTENANCE_STORAGE_KEY, tickets);
}

function getHotelMaintenanceTickets(hotelId) {
  const feature = maintenanceFeature();
  if (feature?.repository?.forHotel) return feature.repository.forHotel(hotelId);
  return readMaintenanceTickets().filter(ticket => ticket.hotelId === hotelId && ticket.status !== 'archived');
}

function getMaintenanceTicketById(id) {
  const feature = maintenanceFeature();
  if (feature?.repository?.byId) return feature.repository.byId(id);
  return readMaintenanceTickets().find(ticket => ticket.id === id) || null;
}

function getMaintenanceStatusLabel(status) {
  return t(`maintenance.status.${status}`, status || '-');
}

function getMaintenancePriorityLabel(priority) {
  return t(`maintenance.priority.${priority}`, priority || '-');
}

function getMaintenanceTypeLabel(type) {
  return t(`maintenance.types.${type}`, type || '-');
}

function getMaintenanceRoomLabel(roomId) {
  const room = getRoomById(roomId);
  if (!room) return t('maintenance.common.generalLocation');
  return `${t('room.cards.roomLabel')} ${room.number || '-'} - ${t('room.form.floorPrefix')} ${room.floor || '-'}`;
}

function getMaintenanceAssigneeLabel(staffId) {
  const staff = getStaffById(staffId);
  return staff ? staff.name : t('maintenance.common.unassigned');
}

function normalizeMaintenanceText(value) {
  return String(value || '').trim().toLowerCase();
}

function getMaintenanceActiveStatuses() {
  const feature = maintenanceFeature();
  if (feature?.selectors?.getMaintenanceActiveStatuses) return feature.selectors.getMaintenanceActiveStatuses();
  return ['open','in_progress','waiting_parts'];
}

function generateMaintenanceTicketNo() {
  const feature = maintenanceFeature();
  if (feature?.selectors?.generateMaintenanceTicketNo) return feature.selectors.generateMaintenanceTicketNo(readMaintenanceTickets());
  const count = readMaintenanceTickets().length + 1;
  return `MT-${String(count).padStart(4, '0')}`;
}

function ensureMaintenanceTicketForRoom(roomId, options = {}) {
  const room = getRoomById(roomId);
  if (!room) return null;
  const feature = maintenanceFeature();
  const stamped = options.createdAt || new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  if (feature?.actions?.ensureTicketForRoom) {
    return feature.actions.ensureTicketForRoom({
      room,
      options: {
        source: 'manual',
        type: 'other',
        priority: 'medium',
        status: 'open',
        description: '',
        assignedTo: '',
        ...options,
        createdAt: stamped,
        updatedAt: stamped
      },
      currentUserName: getCurrentUserDisplayName(),
      timestamp: stamped,
      createId
    });
  }
  const hotelId = room.hotelId;
  const activeStatuses = getMaintenanceActiveStatuses();
  const existing = getHotelMaintenanceTickets(hotelId).find(ticket => ticket.roomId === roomId && activeStatuses.includes(ticket.status));
  if (existing) return existing;
  const ticket = {
    id: createId('maintenance'),
    ticketNo: generateMaintenanceTicketNo(),
    hotelId,
    roomId,
    type: options.type || 'other',
    priority: options.priority || 'medium',
    status: options.status || 'open',
    description: options.description || '',
    assignedTo: options.assignedTo || '',
    source: options.source || 'manual',
    createdAt: stamped,
    createdBy: getCurrentUserDisplayName(),
    updatedAt: stamped,
    startedAt: '',
    resolvedAt: '',
    resolvedBy: ''
  };
  writeMaintenanceTickets([ticket, ...readMaintenanceTickets()]);
  return ticket;
}

function ensureMaintenanceTicketsForMaintenanceRooms(hotelId) {
  const rooms = getHotelRooms(hotelId).filter(room => getRoomDisplayStatus(room) === 'maintenance');
  const stamped = new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  const feature = maintenanceFeature();
  if (feature?.actions?.ensureTicketsForMaintenanceRooms) {
    feature.actions.ensureTicketsForMaintenanceRooms({
      rooms,
      options: {
        type: 'other',
        priority: 'medium',
        status: 'open',
        description: t('maintenance.autoTicketDescription'),
        assignedTo: '',
        source: 'room_status'
      },
      currentUserName: getCurrentUserDisplayName(),
      timestamp: stamped,
      createId
    });
    return;
  }
  let changed = false;
  const tickets = readMaintenanceTickets();
  const activeStatuses = getMaintenanceActiveStatuses();
  rooms.forEach(room => {
    const exists = tickets.some(ticket => ticket.hotelId === hotelId && ticket.roomId === room.id && activeStatuses.includes(ticket.status));
    if (!exists) {
      tickets.unshift({
        id: createId('maintenance'),
        ticketNo: `MT-${String(tickets.length + 1).padStart(4, '0')}`,
        hotelId,
        roomId: room.id,
        type: 'other',
        priority: 'medium',
        status: 'open',
        description: t('maintenance.autoTicketDescription'),
        assignedTo: '',
        source: 'room_status',
        createdAt: room.maintenanceStartedAt || stamped,
        createdBy: room.maintenanceBy || getCurrentUserDisplayName(),
        updatedAt: stamped,
        startedAt: '',
        resolvedAt: '',
        resolvedBy: ''
      });
      changed = true;
    }
  });
  if (changed) writeMaintenanceTickets(tickets);
}

function getFilteredMaintenanceTickets() {
  const hotel = getManagerHotel();
  if (!hotel) return [];
  ensureMaintenanceTicketsForMaintenanceRooms(hotel.id);
  const filters = state.maintenanceFilters || { search: '', status: 'all', priority: 'all', room: 'all' };
  const search = normalizeMaintenanceText(filters.search);
  const statusFilter = filters.status || 'all';
  const priorityFilter = filters.priority || 'all';
  const roomFilter = filters.room || 'all';
  const filteredTickets = getHotelMaintenanceTickets(hotel.id).filter(ticket => {
    const room = getRoomById(ticket.roomId);
    const assignee = getStaffById(ticket.assignedTo);
    const matchesSearch = !search || [
      ticket.ticketNo,
      getMaintenanceTypeLabel(ticket.type),
      getMaintenancePriorityLabel(ticket.priority),
      getMaintenanceStatusLabel(ticket.status),
      ticket.description,
      room?.number,
      room?.floor,
      assignee?.name,
      ticket.createdBy
    ].some(value => normalizeMaintenanceText(value).includes(search));
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesRoom = roomFilter === 'all' || ticket.roomId === roomFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesRoom;
  });
  const feature = maintenanceFeature();
  return feature?.selectors?.sortMaintenanceTickets ? feature.selectors.sortMaintenanceTickets(filteredTickets) : filteredTickets.sort((a, b) => {
    const statusOrder = { open: 0, in_progress: 1, waiting_parts: 2, resolved: 3, cancelled: 4 };
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const statusDelta = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (statusDelta) return statusDelta;
    const priorityDelta = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    if (priorityDelta) return priorityDelta;
    return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
  });
}

function maintenanceUi() {
  return window.FandqiUI || null;
}

function renderMaintenanceButton({ action = '', id = '', label = '', tone = 'ghost', iconName = '', type = 'button', attrs = {} }) {
  const ui = maintenanceUi();
  const buttonAttrs = { ...(id ? { 'data-id': id } : {}), ...attrs };
  if (ui?.renderButton) {
    return ui.renderButton({
      label,
      tone,
      size: 'small',
      type,
      action,
      icon: iconName ? icon(iconName) : '',
      attrs: buttonAttrs
    });
  }
  const attrString = Object.entries(buttonAttrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${h(name)}` : ` ${h(name)}="${h(value)}"`).join('');
  return `<button class="btn small ${h(tone)}" type="${h(type)}"${action ? ` data-action="${h(action)}"` : ''}${attrString}>${iconName ? icon(iconName) : ''}${h(label)}</button>`;
}

function renderMaintenancePrimaryButton({ id = '', label = '', iconName = 'plus' }) {
  return renderMaintenanceButton({ label, tone: 'primary', iconName, attrs: id ? { id } : {}, type: 'button' });
}

function renderMaintenanceBadge(status) {
  const ui = maintenanceUi();
  const label = getMaintenanceStatusLabel(status);
  if (ui?.renderBadge) {
    return ui.renderBadge({
      label,
      status: status || 'neutral',
      className: status || '',
      attrs: { 'data-maintenance-status': status || '' }
    });
  }
  return `<span class="status-badge ${h(status || '')}" data-maintenance-status="${h(status || '')}">${h(label)}</span>`;
}

function renderMaintenancePriorityBadge(priority) {
  const ui = maintenanceUi();
  const label = getMaintenancePriorityLabel(priority);
  if (ui?.renderBadge) {
    return ui.renderBadge({
      label,
      status: priority || 'neutral',
      className: `maintenance-priority-chip maintenance-priority-chip--${priority || 'normal'}`,
      attrs: { 'data-maintenance-priority': priority || '' }
    });
  }
  return `<span class="maintenance-priority-chip maintenance-priority-chip--${h(priority)}" data-maintenance-priority="${h(priority || '')}">${h(label)}</span>`;
}

function renderMaintenanceEmptyState() {
  const ui = maintenanceUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title: t('maintenance.emptyTitle'),
      text: t('maintenance.emptyText'),
      icon: icon('shieldAlert'),
      className: 'maintenance-empty'
    });
  }
  return `
    <div class="empty-panel maintenance-empty">
      <div>
        <h2>${h(t('maintenance.emptyTitle'))}</h2>
        <p>${h(t('maintenance.emptyText'))}</p>
      </div>
    </div>
  `;
}

function renderMaintenanceActionButtons(ticket, isActive) {
  const actions = [];
  if (ticket.status === 'open') {
    actions.push(renderMaintenanceButton({ action: 'maintenance-start', id: ticket.id, label: t('maintenance.actions.start'), tone: 'accent', iconName: 'wrench' }));
  }
  if (isActive) {
    actions.push(renderMaintenanceButton({ action: 'maintenance-resolve', id: ticket.id, label: t('maintenance.actions.resolve'), tone: 'success', iconName: 'checkCircle' }));
    actions.push(renderMaintenanceButton({ action: 'maintenance-waiting-parts', id: ticket.id, label: t('maintenance.actions.waitingParts'), tone: 'warning', iconName: 'clock' }));
  }
  actions.push(renderMaintenanceButton({ action: 'maintenance-edit', id: ticket.id, label: t('maintenance.actions.edit'), tone: 'primary', iconName: 'edit' }));
  if (isActive) {
    actions.push(renderMaintenanceButton({ action: 'maintenance-cancel', id: ticket.id, label: t('maintenance.actions.cancel'), tone: 'danger', iconName: 'x' }));
  }
  return actions.join('');
}

function renderMaintenanceSectionHead(actions = '') {
  const ui = maintenanceUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title: t('page.maintenance'),
      text: t('maintenance.pageHint'),
      kicker: t('page.maintenance'),
      kickerIcon: icon('shieldAlert'),
      actions,
      className: 'maintenance-central-head',
      attrs: { 'data-ui-component': 'maintenance-page-head' }
    });
  }
  return `<div class="section-head maintenance-central-head" data-ui-component="maintenance-page-head"><div><h2>${h(t('page.maintenance'))}</h2><p class="helper">${h(t('maintenance.pageHint'))}</p></div>${actions ? `<div class="ds-actions">${actions}</div>` : ''}</div>`;
}

function renderMaintenanceMetricCard(item) {
  const ui = maintenanceUi();
  if (ui?.renderMetricCard) {
    return ui.renderMetricCard({
      title: item.label,
      value: String(item.value),
      note: item.note,
      icon: icon(item.iconName),
      tone: item.tone || item.key,
      tag: 'article',
      className: `maintenance-summary-card maintenance-summary-card--${item.key}`,
      attrs: { 'data-ui-component': 'maintenance-summary-card', 'data-maintenance-summary': item.key }
    });
  }
  return `
    <article class="guest-summary-card maintenance-summary-card maintenance-summary-card--${h(item.key)}" data-ui-component="maintenance-summary-card" data-maintenance-summary="${h(item.key)}">
      <div class="guest-summary-icon">${icon(item.iconName)}</div>
      <div class="guest-summary-content">
        <span class="guest-summary-label">${h(item.label)}</span>
        <strong class="guest-summary-value">${h(String(item.value))}</strong>
        <small class="guest-summary-note">${h(item.note)}</small>
      </div>
    </article>
  `;
}

function renderMaintenanceSurface({ component = '', className = '', body = '' }) {
  const ui = maintenanceUi();
  if (ui?.renderSurface) {
    return ui.renderSurface({
      body,
      className: ['maintenance-central-surface', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component || 'maintenance-surface' }
    });
  }
  return `<section class="ds-card ds-surface maintenance-central-surface ${h(className)}" data-ui-component="${h(component || 'maintenance-surface')}">${body}</section>`;
}

function renderMaintenanceField({ label = '', iconName = '', control = '', className = '' }) {
  const ui = maintenanceUi();
  if (ui?.renderField) {
    return ui.renderField({
      label,
      icon: iconName ? icon(iconName) : '',
      control,
      className: ['maintenance-central-field', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': 'maintenance-field' }
    });
  }
  return `<div class="field ds-field maintenance-central-field ${h(className)}" data-ui-component="maintenance-field"><label>${iconName ? icon(iconName) : ''}${h(label)}</label>${control}</div>`;
}

function renderMaintenanceFormGrid(children, className = '') {
  const ui = maintenanceUi();
  if (ui?.renderFormGrid) return ui.renderFormGrid({ children, className: ['maintenance-central-form-grid', className].filter(Boolean).join(' '), attrs: { 'data-ui-component': 'maintenance-form-grid' } });
  return `<div class="modal-grid compact-modal-grid ds-form-grid maintenance-central-form-grid ${h(className)}" data-ui-component="maintenance-form-grid">${children}</div>`;
}

function renderMaintenanceMetaItem(iconName, label, value, className = '') {
  return `<div class="guest-meta-item ds-meta-item maintenance-meta-item ${h(className)}" data-ui-component="maintenance-meta-item">${icon(iconName)}<span>${h(label)}: ${h(value || '-')}</span></div>`;
}


function getMaintenanceSummary(tickets) {
  const feature = maintenanceFeature();
  if (feature?.selectors?.summarizeMaintenanceTickets) return feature.selectors.summarizeMaintenanceTickets(tickets);
  return tickets.reduce((acc, ticket) => {
    acc.total += 1;
    if (ticket.status === 'open') acc.open += 1;
    if (ticket.status === 'in_progress') acc.inProgress += 1;
    if (ticket.status === 'waiting_parts') acc.waitingParts += 1;
    if (ticket.status === 'resolved') acc.resolved += 1;
    if (['high','urgent'].includes(ticket.priority) && getMaintenanceActiveStatuses().includes(ticket.status)) acc.critical += 1;
    return acc;
  }, { total: 0, open: 0, inProgress: 0, waitingParts: 0, resolved: 0, critical: 0 });
}

function renderMaintenanceSummaryStrip(tickets) {
  const summary = getMaintenanceSummary(tickets);
  const cards = [
    { key: 'open', tone: 'danger', iconName: 'shieldAlert', label: t('maintenance.cards.open'), note: t('maintenance.cards.openNote'), value: summary.open },
    { key: 'inProgress', tone: 'primary', iconName: 'settings', label: t('maintenance.cards.inProgress'), note: t('maintenance.cards.inProgressNote'), value: summary.inProgress },
    { key: 'critical', tone: 'warning', iconName: 'alertCircle', label: t('maintenance.cards.critical'), note: t('maintenance.cards.criticalNote'), value: summary.critical },
    { key: 'resolved', tone: 'success', iconName: 'checkCircle', label: t('maintenance.cards.resolved'), note: t('maintenance.cards.resolvedNote'), value: summary.resolved }
  ];
  return `<div class="maintenance-summary-grid ds-summary-grid" data-ui-component="maintenance-summary-grid">${cards.map(renderMaintenanceMetricCard).join('')}</div>`;
}

function renderMaintenanceTickets(tickets) {
  if (!tickets.length) {
    return renderMaintenanceEmptyState();
  }
  return `
    <div class="maintenance-cards-grid" data-ui-component="maintenance-list" data-ui-migrated="maintenance-list">
      ${tickets.map(ticket => {
        const room = getRoomById(ticket.roomId);
        const assignee = getStaffById(ticket.assignedTo);
        const isActive = getMaintenanceActiveStatuses().includes(ticket.status);
        return `
          <article class="maintenance-ticket-card maintenance-central-card maintenance-ticket-card--${h(ticket.status)} maintenance-priority--${h(ticket.priority)}" data-ui-component="maintenance-card" data-ui-migrated="maintenance-card">
            <div class="maintenance-card-top" data-ui-component="maintenance-card-head">
              <div class="room-card-title-wrap maintenance-card-title-wrap">
                <div class="room-card-icon room-card-icon--maintenance">${icon('shieldAlert')}</div>
                <div class="maintenance-card-title-copy">
                  <span class="room-number-chip">${h(ticket.ticketNo || '-')}</span>
                  <h3>${h(getMaintenanceTypeLabel(ticket.type))}</h3>
                </div>
              </div>
              <div class="maintenance-chip-stack" data-ui-component="maintenance-chip-stack">
                ${renderMaintenanceBadge(ticket.status)}
                ${renderMaintenancePriorityBadge(ticket.priority)}
              </div>
            </div>

            <div class="maintenance-room-band" data-ui-component="maintenance-room-band">
              <span>${icon('building')}${h(getMaintenanceRoomLabel(ticket.roomId))}</span>
              <strong>${h(room ? getRoomStatusLabel(getRoomDisplayStatus(room)) : t('maintenance.common.generalLocation'))}</strong>
            </div>

            <div class="guest-meta-grid ds-meta-grid maintenance-meta-grid" data-ui-component="maintenance-meta-grid">
              ${renderMaintenanceMetaItem('calendar', t('maintenance.fields.createdAt'), ticket.createdAt || '-')}
              ${renderMaintenanceMetaItem('user', t('maintenance.fields.assignedTo'), assignee?.name || t('maintenance.common.unassigned'))}
              ${renderMaintenanceMetaItem('status', t('maintenance.fields.source'), t(`maintenance.source.${ticket.source}`, ticket.source || '-'))}
              ${renderMaintenanceMetaItem('clock', t('maintenance.fields.updatedAt'), ticket.updatedAt || ticket.createdAt || '-')}
              ${ticket.description ? renderMaintenanceMetaItem('notes', t('maintenance.form.description'), ticket.description, 'field-full maintenance-description') : ''}
            </div>

            ${isActive ? `<p class="housekeeping-note maintenance-warning-note">${icon('alertCircle')}${h(t('maintenance.activeHint'))}</p>` : `<p class="maintenance-resolved-note">${icon('checkCircle')}${h(t('maintenance.resolvedHint'))}</p>`}

            <div class="room-card-actions maintenance-card-actions maintenance-card-actions--central row-actions" data-ui-component="maintenance-card-actions">
              ${renderMaintenanceActionButtons(ticket, isActive)}
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderMaintenanceModal(hotel) {
  const modal = state.maintenanceModal;
  if (!modal) return '';
  const mode = modal.mode || 'add';
  const ticket = mode === 'edit' ? getMaintenanceTicketById(modal.id) : null;
  const rooms = getHotelRooms(hotel.id);
  const staff = getHotelStaff(hotel.id).filter(item => ['maintenance','supervisor','housekeeping'].includes(item.role));
  const current = ticket || { roomId: '', type: 'other', priority: 'medium', status: 'open', description: '', assignedTo: '' };
  const formBody = `
    ${renderMaintenanceField({
      label: t('maintenance.form.room'),
      iconName: 'building',
      control: `<select class="select ds-control" name="roomId">
        <option value="">${h(t('maintenance.common.generalLocation'))}</option>
        ${rooms.map(room => `<option value="${h(room.id)}" ${current.roomId === room.id ? 'selected' : ''}>${h(t('room.cards.roomLabel'))} ${h(room.number || '-')} - ${h(t('room.form.floorPrefix'))} ${h(room.floor || '-')}</option>`).join('')}
      </select>`
    })}
    ${renderMaintenanceField({
      label: t('maintenance.form.type'),
      iconName: 'shieldAlert',
      control: `<select class="select ds-control" name="type" required>
        ${MAINTENANCE_TYPES.map(type => `<option value="${h(type)}" ${current.type === type ? 'selected' : ''}>${h(getMaintenanceTypeLabel(type))}</option>`).join('')}
      </select>`
    })}
    ${renderMaintenanceField({
      label: t('maintenance.form.priority'),
      iconName: 'alertCircle',
      control: `<select class="select ds-control" name="priority" required>
        ${MAINTENANCE_PRIORITIES.map(priority => `<option value="${h(priority)}" ${current.priority === priority ? 'selected' : ''}>${h(getMaintenancePriorityLabel(priority))}</option>`).join('')}
      </select>`
    })}
    ${renderMaintenanceField({
      label: t('maintenance.form.assignedTo'),
      iconName: 'user',
      control: `<select class="select ds-control" name="assignedTo">
        <option value="">${h(t('maintenance.common.unassigned'))}</option>
        ${staff.map(member => `<option value="${h(member.id)}" ${current.assignedTo === member.id ? 'selected' : ''}>${h(member.name)} - ${h(getStaffRoleLabel(member.role))}</option>`).join('')}
      </select>`
    })}
    ${renderMaintenanceField({
      label: t('maintenance.form.description'),
      iconName: 'notes',
      className: 'field-full',
      control: `<textarea class="textarea ds-control" name="description" rows="4" placeholder="${h(t('maintenance.form.descriptionPlaceholder'))}">${h(current.description || '')}</textarea>`
    })}
  `;
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card ds-modal-card maintenance-modal-card maintenance-modal-card--central" id="maintenanceForm" data-ui-component="maintenance-modal">
        <button class="modal-close icon-btn" type="button" data-action="close-maintenance-modal" aria-label="${h(t('common.close'))}">${icons.x}</button>
        <div class="modal-title-row" data-ui-component="maintenance-modal-head">
          <h2>${h(mode === 'edit' ? t('maintenance.modal.editTitle') : t('maintenance.modal.addTitle'))}</h2>
          <span class="reservation-number-chip">${h(ticket?.ticketNo || t('maintenance.common.newTicket'))}</span>
        </div>
        <input type="hidden" name="ticketId" value="${h(ticket?.id || '')}">
        ${renderMaintenanceFormGrid(formBody)}
        <div class="modal-actions ds-actions" data-ui-component="maintenance-modal-actions">
          ${renderMaintenanceButton({ label: t('maintenance.actions.save'), tone: 'primary', iconName: 'save', type: 'submit' })}
          ${renderMaintenanceButton({ label: t('common.cancel'), tone: 'danger', iconName: 'x', action: 'close-maintenance-modal' })}
        </div>
      </form>
    </div>
  `;
}

function renderMaintenancePage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  ensureMaintenanceTicketsForMaintenanceRooms(hotel.id);
  const filters = state.maintenanceFilters || { search: '', status: 'all', priority: 'all', room: 'all' };
  const allTickets = getHotelMaintenanceTickets(hotel.id);
  const tickets = getFilteredMaintenanceTickets();
  const rooms = getHotelRooms(hotel.id);
  const actions = renderMaintenancePrimaryButton({ id: 'addMaintenanceTicketBtn', label: t('maintenance.actions.add'), iconName: 'plus' });
  const filterBody = `
    ${renderMaintenanceField({
      label: t('maintenance.filters.search'),
      iconName: 'search',
      className: 'field-search',
      control: `<input class="input ds-control" id="maintenanceSearch" value="${h(filters.search)}" autocomplete="off">`
    })}
    ${renderMaintenanceField({
      label: t('maintenance.filters.status'),
      iconName: 'status',
      control: `<select class="select ds-control" id="maintenanceStatusFilter">
        <option value="all" ${filters.status === 'all' ? 'selected' : ''}>${h(t('maintenance.filters.all'))}</option>
        ${MAINTENANCE_STATUSES.map(status => `<option value="${h(status)}" ${filters.status === status ? 'selected' : ''}>${h(getMaintenanceStatusLabel(status))}</option>`).join('')}
      </select>`
    })}
    ${renderMaintenanceField({
      label: t('maintenance.filters.priority'),
      iconName: 'alertCircle',
      control: `<select class="select ds-control" id="maintenancePriorityFilter">
        <option value="all" ${filters.priority === 'all' ? 'selected' : ''}>${h(t('maintenance.filters.all'))}</option>
        ${MAINTENANCE_PRIORITIES.map(priority => `<option value="${h(priority)}" ${filters.priority === priority ? 'selected' : ''}>${h(getMaintenancePriorityLabel(priority))}</option>`).join('')}
      </select>`
    })}
    ${renderMaintenanceField({
      label: t('maintenance.filters.room'),
      iconName: 'building',
      control: `<select class="select ds-control" id="maintenanceRoomFilter">
        <option value="all" ${filters.room === 'all' ? 'selected' : ''}>${h(t('maintenance.filters.all'))}</option>
        ${rooms.map(room => `<option value="${h(room.id)}" ${filters.room === room.id ? 'selected' : ''}>${h(t('room.cards.roomLabel'))} ${h(room.number || '-')}</option>`).join('')}
      </select>`
    })}
  `;
  return `
    <div class="hotels-page maintenance-page maintenance-central-page" data-ui-centralized="phase105-maintenance" data-ui-migrated="maintenance">
      ${renderMaintenanceSectionHead(actions)}
      ${renderMaintenanceSummaryStrip(allTickets)}
      ${renderMaintenanceSurface({ component: 'maintenance-filter-panel', className: 'maintenance-filters-bar maintenance-central-filter-panel', body: filterBody })}
      <div id="maintenanceCardsSlot" class="maintenance-cards-slot" data-ui-component="maintenance-list-slot">${renderMaintenanceTickets(tickets)}</div>
      ${renderMaintenanceModal(hotel)}
    </div>
  `;
}

function refreshMaintenanceCards() {
  const hotel = getManagerHotel();
  if (hotel) ensureMaintenanceTicketsForMaintenanceRooms(hotel.id);
  const slot = document.getElementById('maintenanceCardsSlot');
  if (!slot) return render();
  slot.innerHTML = renderMaintenanceTickets(getFilteredMaintenanceTickets());
  applyCentralDesignSystem(slot);
  bindMaintenanceCardActions();
}

function setMaintenanceTicketStatus(ticketId, status) {
  const current = getMaintenanceTicketById(ticketId);
  if (!current) return;
  const stamped = new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  const feature = maintenanceFeature();
  if (feature?.actions?.setStatus) {
    feature.actions.setStatus(ticketId, status, {
      updatedAt: stamped,
      stamped,
      currentUserName: getCurrentUserDisplayName(),
      resolvedBy: getCurrentUserDisplayName()
    });
  } else {
    const tickets = readMaintenanceTickets();
    const index = tickets.findIndex(ticket => ticket.id === ticketId);
    if (index < 0) return;
    const patch = { status, updatedAt: stamped };
    if (status === 'in_progress' && !current.startedAt) patch.startedAt = stamped;
    if (status === 'resolved') {
      patch.resolvedAt = stamped;
      patch.resolvedBy = getCurrentUserDisplayName();
    }
    tickets[index] = { ...current, ...patch };
    writeMaintenanceTickets(tickets);
  }
  if (status === 'resolved' && current.roomId) {
    const room = getRoomById(current.roomId);
    if (room && getRoomDisplayStatus(room) === 'maintenance') {
      updateRoomStatusById(current.roomId, 'cleaning', {
        maintenanceResolvedAt: stamped,
        maintenanceResolvedBy: getCurrentUserDisplayName(),
        cleaningStartedAt: stamped,
        cleaningReason: t('maintenance.cleaningAfterResolve')
      });
    }
  }
  toast(t(`maintenance.toast.${status}`, t('maintenance.toast.updated')));
  render();
}

function saveMaintenanceTicket(form) {
  const hotel = getManagerHotel();
  if (!hotel) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const stamped = new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  const tickets = readMaintenanceTickets();
  const existingIndex = data.ticketId ? tickets.findIndex(ticket => ticket.id === data.ticketId) : -1;
  const payload = {
    hotelId: hotel.id,
    roomId: data.roomId || '',
    type: data.type || 'other',
    priority: data.priority || 'medium',
    status: existingIndex >= 0 ? tickets[existingIndex].status : 'open',
    description: data.description || '',
    assignedTo: data.assignedTo || '',
    updatedAt: stamped
  };
  if (existingIndex >= 0) {
    tickets[existingIndex] = { ...tickets[existingIndex], ...payload };
  } else {
    tickets.unshift({
      id: createId('maintenance'),
      ticketNo: generateMaintenanceTicketNo(),
      ...payload,
      source: 'manual',
      createdAt: stamped,
      createdBy: getCurrentUserDisplayName(),
      startedAt: '',
      resolvedAt: '',
      resolvedBy: ''
    });
  }
  writeMaintenanceTickets(tickets);
  if (payload.roomId && getMaintenanceActiveStatuses().includes(payload.status)) {
    const room = getRoomById(payload.roomId);
    if (room && !['occupied','booked'].includes(getRoomDisplayStatus(room))) {
      updateRoomStatusById(payload.roomId, 'maintenance', {
        maintenanceStartedAt: room.maintenanceStartedAt || stamped,
        maintenanceBy: getCurrentUserDisplayName()
      });
    }
  }
  state.maintenanceModal = null;
  toast(t('maintenance.toast.saved'));
  render();
}

function bindMaintenanceCardActions() {
  document.querySelectorAll('[data-action="maintenance-start"]').forEach(button => button.addEventListener('click', () => setMaintenanceTicketStatus(button.dataset.id, 'in_progress')));
  document.querySelectorAll('[data-action="maintenance-waiting-parts"]').forEach(button => button.addEventListener('click', () => setMaintenanceTicketStatus(button.dataset.id, 'waiting_parts')));
  document.querySelectorAll('[data-action="maintenance-resolve"]').forEach(button => button.addEventListener('click', () => setMaintenanceTicketStatus(button.dataset.id, 'resolved')));
  document.querySelectorAll('[data-action="maintenance-cancel"]').forEach(button => button.addEventListener('click', () => setMaintenanceTicketStatus(button.dataset.id, 'cancelled')));
  document.querySelectorAll('[data-action="maintenance-edit"]').forEach(button => button.addEventListener('click', () => {
    state.maintenanceModal = { mode: 'edit', id: button.dataset.id };
    render();
  }));
}

function bindMaintenanceEvents() {
  const addBtn = document.getElementById('addMaintenanceTicketBtn');
  if (addBtn) addBtn.addEventListener('click', () => {
    state.maintenanceModal = { mode: 'add', id: null };
    render();
  });
  const searchInput = document.getElementById('maintenanceSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.maintenanceFilters.search = event.target.value;
    refreshMaintenanceCards();
  });
  const statusFilter = document.getElementById('maintenanceStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.maintenanceFilters.status = event.target.value;
    refreshMaintenanceCards();
  });
  const priorityFilter = document.getElementById('maintenancePriorityFilter');
  if (priorityFilter) priorityFilter.addEventListener('change', event => {
    state.maintenanceFilters.priority = event.target.value;
    refreshMaintenanceCards();
  });
  const roomFilter = document.getElementById('maintenanceRoomFilter');
  if (roomFilter) roomFilter.addEventListener('change', event => {
    state.maintenanceFilters.room = event.target.value;
    refreshMaintenanceCards();
  });
  document.querySelectorAll('[data-action="close-maintenance-modal"]').forEach(button => button.addEventListener('click', () => {
    state.maintenanceModal = null;
    render();
  }));
  const form = document.getElementById('maintenanceForm');
  if (form) form.addEventListener('submit', event => {
    event.preventDefault();
    saveMaintenanceTicket(event.currentTarget);
  });
  bindMaintenanceCardActions();
}


/* Reports section */
const REPORT_TYPES = ['overview', 'reservations', 'financial', 'rooms', 'food', 'maintenance'];
const REPORT_PERIODS = ['today', 'last7', 'month', 'custom'];
