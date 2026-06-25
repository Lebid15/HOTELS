function housekeepingFeature() {
  return window.FandqiHousekeepingFeature || null;
}

function normalizeHousekeepingText(value) {
  const feature = housekeepingFeature();
  if (feature?.validators?.normalizeHousekeepingText) return feature.validators.normalizeHousekeepingText(value);
  return String(value || '').trim().toLowerCase();
}

function getHousekeepingReservationsByRoom(roomId) {
  const feature = housekeepingFeature();
  if (feature?.selectors?.getReservationsByRoom) return feature.selectors.getReservationsByRoom(readReservations(), roomId);
  return readReservations()
    .filter(reservation => reservation.roomId === roomId && ['checked_in', 'completed'].includes(reservation.status))
    .sort((a, b) => String(b.actualCheckOutAt || b.checkOutDate || b.updatedAt || '').localeCompare(String(a.actualCheckOutAt || a.checkOutDate || a.updatedAt || '')));
}

function getHousekeepingLastReservation(room) {
  if (!room?.id) return null;
  const feature = housekeepingFeature();
  const reservations = getHousekeepingReservationsByRoom(room.id);
  if (feature?.selectors?.getLastReservationForRoom) return feature.selectors.getLastReservationForRoom(room, reservations);
  if (room.lastCheckoutReservationId) {
    return reservations.find(reservation => reservation.id === room.lastCheckoutReservationId) || reservations[0] || null;
  }
  return reservations[0] || null;
}

function getFilteredHousekeepingRooms() {
  const hotel = getManagerHotel();
  if (!hotel) return [];
  const filters = state.housekeepingFilters || { search: '', status: 'cleaning', floor: '' };
  const rooms = getHotelRooms(hotel.id);
  const feature = housekeepingFeature();
  if (feature?.selectors?.filterHousekeepingRooms) {
    return feature.selectors.filterHousekeepingRooms(rooms, filters, {
      getDisplayStatus: getRoomDisplayStatus,
      getRoomTypeLabel,
      getRoomStatusLabel,
      getLastReservation: getHousekeepingLastReservation,
      getGuestName: getReservationGuestDisplayName
    });
  }
  const search = normalizeHousekeepingText(filters.search);
  const statusFilter = filters.status || 'cleaning';
  const floorFilter = String(filters.floor || '').trim();
  return rooms.filter(room => {
    const displayStatus = getRoomDisplayStatus(room);
    const lastReservation = getHousekeepingLastReservation(room);
    const matchesSearch = !search || [
      room.number,
      room.floor,
      getRoomTypeLabel(room.type),
      getRoomStatusLabel(displayStatus),
      room.notes,
      room.lastCheckoutReservationNo,
      room.lastCheckoutGuestName,
      lastReservation?.reservationNo,
      lastReservation ? getReservationGuestDisplayName(lastReservation) : ''
    ].some(value => normalizeHousekeepingText(value).includes(search));
    const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;
    const matchesFloor = !floorFilter || String(room.floor || '') === floorFilter;
    return matchesSearch && matchesStatus && matchesFloor;
  }).sort((a, b) => {
    const statusOrder = { cleaning: 0, maintenance: 1, out_of_service: 2, occupied: 3, booked: 4, available: 5 };
    const statusDelta = (statusOrder[getRoomDisplayStatus(a)] ?? 9) - (statusOrder[getRoomDisplayStatus(b)] ?? 9);
    if (statusDelta) return statusDelta;
    const floorDelta = Number(a.floor || 0) - Number(b.floor || 0);
    if (floorDelta) return floorDelta;
    return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true });
  });
}

function housekeepingUi() {
  return window.FandqiUI || null;
}

function renderHousekeepingButton({ action = '', id = '', label = '', tone = 'ghost', iconName = '' }) {
  const ui = housekeepingUi();
  if (ui?.renderButton) {
    return ui.renderButton({
      label,
      tone,
      size: 'small',
      action,
      icon: iconName ? icon(iconName) : '',
      attrs: id ? { 'data-id': id } : {}
    });
  }
  return `<button class="btn small ${h(tone)}" type="button"${action ? ` data-action="${h(action)}"` : ''}${id ? ` data-id="${h(id)}"` : ''}>${iconName ? icon(iconName) : ''}${h(label)}</button>`;
}

function renderHousekeepingBadge(status) {
  const ui = housekeepingUi();
  const label = getRoomStatusLabel(status);
  if (ui?.renderBadge) {
    return ui.renderBadge({
      label,
      status: status || 'neutral',
      className: status || '',
      attrs: { 'data-housekeeping-status': status || '' }
    });
  }
  return `<span class="status-badge ${h(status || '')}" data-housekeeping-status="${h(status || '')}">${h(label)}</span>`;
}

function renderHousekeepingEmptyState() {
  const ui = housekeepingUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title: t('housekeeping.emptyTitle'),
      text: t('housekeeping.emptyText'),
      icon: icon('sparkles'),
      className: 'housekeeping-empty'
    });
  }
  return `
    <div class="empty-panel housekeeping-empty">
      <div>
        <h2>${h(t('housekeeping.emptyTitle'))}</h2>
        <p>${h(t('housekeeping.emptyText'))}</p>
      </div>
    </div>
  `;
}

function renderHousekeepingActionButtons(room, displayStatus, canMarkClean) {
  const actions = [];
  if (canMarkClean) {
    actions.push(renderHousekeepingButton({ action: 'housekeeping-mark-clean', id: room.id, label: t('housekeeping.actions.markClean'), tone: 'success', iconName: 'checkCircle' }));
  }
  if (displayStatus !== 'maintenance') {
    actions.push(renderHousekeepingButton({ action: 'housekeeping-send-maintenance', id: room.id, label: t('housekeeping.actions.sendMaintenance'), tone: 'warning', iconName: 'shieldAlert' }));
  }
  actions.push(renderHousekeepingButton({ action: 'housekeeping-view-room', id: room.id, label: t('room.actions.view'), tone: 'primary', iconName: 'eye' }));
  return actions.join('');
}

function renderHousekeepingSectionHead() {
  const ui = housekeepingUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title: t('page.housekeeping'),
      text: t('housekeeping.pageHint'),
      kicker: t('page.housekeeping'),
      kickerIcon: icon('checkCircle'),
      className: 'housekeeping-central-head',
      attrs: { 'data-ui-component': 'housekeeping-page-head' }
    });
  }
  return `<div class="section-head housekeeping-central-head" data-ui-component="housekeeping-page-head"><div><h2>${h(t('page.housekeeping'))}</h2><p class="helper">${h(t('housekeeping.pageHint'))}</p></div></div>`;
}

function renderHousekeepingMetricCard(item) {
  const ui = housekeepingUi();
  if (ui?.renderMetricCard) {
    return ui.renderMetricCard({
      title: item.label,
      value: String(item.value),
      note: item.note,
      icon: icon(item.iconName),
      tone: item.tone || item.key,
      tag: 'article',
      className: `housekeeping-summary-card housekeeping-summary-card--${item.key}`,
      attrs: { 'data-ui-component': 'housekeeping-summary-card', 'data-housekeeping-summary': item.key }
    });
  }
  return `
    <article class="guest-summary-card housekeeping-summary-card housekeeping-summary-card--${h(item.key)}" data-ui-component="housekeeping-summary-card" data-housekeeping-summary="${h(item.key)}">
      <div class="guest-summary-icon">${icon(item.iconName)}</div>
      <div class="guest-summary-content">
        <span class="guest-summary-label">${h(item.label)}</span>
        <strong class="guest-summary-value">${h(String(item.value))}</strong>
        <small class="guest-summary-note">${h(item.note)}</small>
      </div>
    </article>
  `;
}

function renderHousekeepingSurface({ component = '', className = '', body = '' }) {
  const ui = housekeepingUi();
  if (ui?.renderSurface) {
    return ui.renderSurface({
      body,
      className: ['housekeeping-central-surface', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component || 'housekeeping-surface' }
    });
  }
  return `<section class="ds-card ds-surface housekeeping-central-surface ${h(className)}" data-ui-component="${h(component || 'housekeeping-surface')}">${body}</section>`;
}

function renderHousekeepingField({ label = '', iconName = '', control = '', className = '' }) {
  const ui = housekeepingUi();
  if (ui?.renderField) {
    return ui.renderField({
      label,
      icon: iconName ? icon(iconName) : '',
      control,
      className: ['housekeeping-central-field', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': 'housekeeping-field' }
    });
  }
  return `<div class="field ds-field housekeeping-central-field ${h(className)}" data-ui-component="housekeeping-field"><label>${iconName ? icon(iconName) : ''}${h(label)}</label>${control}</div>`;
}

function renderHousekeepingMetaItem(iconName, label, value, className = '') {
  return `<div class="guest-meta-item ds-meta-item housekeeping-meta-item ${h(className)}" data-ui-component="housekeeping-meta-item">${icon(iconName)}<span>${h(label)}: ${h(value || '-')}</span></div>`;
}


function getHousekeepingSummary(rooms) {
  const feature = housekeepingFeature();
  if (feature?.selectors?.summarizeHousekeepingRooms) return feature.selectors.summarizeHousekeepingRooms(rooms, getRoomDisplayStatus);
  return rooms.reduce((acc, room) => {
    const status = getRoomDisplayStatus(room);
    acc.total += 1;
    if (status === 'cleaning') acc.cleaning += 1;
    if (status === 'available') acc.available += 1;
    if (status === 'occupied') acc.occupied += 1;
    if (['maintenance', 'out_of_service'].includes(status)) acc.attention += 1;
    return acc;
  }, { total: 0, cleaning: 0, available: 0, occupied: 0, attention: 0 });
}

function renderHousekeepingSummaryStrip(rooms) {
  const summary = getHousekeepingSummary(rooms);
  const cards = [
    { key: 'cleaning', tone: 'warning', iconName: 'clock', label: t('housekeeping.cards.cleaning'), note: t('housekeeping.cards.cleaningNote'), value: summary.cleaning },
    { key: 'available', tone: 'success', iconName: 'checkCircle', label: t('housekeeping.cards.available'), note: t('housekeeping.cards.availableNote'), value: summary.available },
    { key: 'occupied', tone: 'primary', iconName: 'users', label: t('housekeeping.cards.occupied'), note: t('housekeeping.cards.occupiedNote'), value: summary.occupied },
    { key: 'attention', tone: 'danger', iconName: 'alertCircle', label: t('housekeeping.cards.attention'), note: t('housekeeping.cards.attentionNote'), value: summary.attention }
  ];
  return `<div class="housekeeping-summary-grid ds-summary-grid" data-ui-component="housekeeping-summary-grid">${cards.map(renderHousekeepingMetricCard).join('')}</div>`;
}

function renderHousekeepingRooms(rooms) {
  if (!rooms.length) {
    return renderHousekeepingEmptyState();
  }

  return `
    <div class="housekeeping-cards-grid" data-ui-component="housekeeping-list" data-ui-migrated="housekeeping-list">
      ${rooms.map(room => {
        const displayStatus = getRoomDisplayStatus(room);
        const lastReservation = getHousekeepingLastReservation(room);
        const guestName = room.lastCheckoutGuestName || (lastReservation ? getReservationGuestDisplayName(lastReservation) : '');
        const reservationNo = room.lastCheckoutReservationNo || lastReservation?.reservationNo || '';
        const cleaningAt = room.cleaningStartedAt || lastReservation?.actualCheckOutAt || lastReservation?.checkOutDate || room.updatedAt || '-';
        const canMarkClean = displayStatus === 'cleaning';
        return `
          <article class="housekeeping-room-card housekeeping-central-card housekeeping-room-card--${h(displayStatus)}" data-ui-component="housekeeping-card" data-ui-migrated="housekeeping-card">
            <div class="housekeeping-card-top" data-ui-component="housekeeping-card-head">
              <div class="room-card-title-wrap housekeeping-card-title-wrap">
                <div class="room-card-icon room-card-icon--${h(displayStatus)}">${icon('building')}</div>
                <div class="housekeeping-card-title-copy">
                  <span class="room-number-chip">${h(t('room.cards.roomLabel'))} ${h(room.number || '-')}</span>
                  <h3>${h(getRoomTypeLabel(room.type))}</h3>
                </div>
              </div>
              ${renderHousekeepingBadge(displayStatus)}
            </div>

            <div class="housekeeping-flow-band" data-ui-component="housekeeping-flow">
              <span>${icon('clock')}${h(t('housekeeping.flow.afterCheckout'))}</span>
              <strong>${h(getRoomStatusLabel(displayStatus))}</strong>
              <span>${icon('checkCircle')}${h(t('housekeeping.flow.availableAfterClean'))}</span>
            </div>

            <div class="guest-meta-grid ds-meta-grid housekeeping-meta-grid" data-ui-component="housekeeping-meta-grid">
              ${renderHousekeepingMetaItem('dashboard', t('room.form.floorPrefix'), room.floor || '-')}
              ${renderHousekeepingMetaItem('users', t('room.columns.capacity'), String(room.capacity || '-'))}
              ${renderHousekeepingMetaItem('calendar', t('housekeeping.fields.cleaningStartedAt'), cleaningAt)}
              ${renderHousekeepingMetaItem('fileText', t('housekeeping.fields.lastReservation'), reservationNo || '-')}
              ${renderHousekeepingMetaItem('user', t('housekeeping.fields.lastGuest'), guestName || '-', 'field-full')}
            </div>

            ${displayStatus === 'cleaning' ? `<p class="housekeeping-note">${icon('alertCircle')}${h(t('housekeeping.cleaningHint'))}</p>` : ''}

            <div class="room-card-actions housekeeping-card-actions housekeeping-card-actions--central row-actions" data-ui-component="housekeeping-card-actions">
              ${renderHousekeepingActionButtons(room, displayStatus, canMarkClean)}
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderHousekeepingPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const filters = state.housekeepingFilters || { search: '', status: 'cleaning', floor: '' };
  const allRooms = getHotelRooms(hotel.id);
  const rooms = getFilteredHousekeepingRooms();
  const floors = [...new Set(allRooms.map(room => String(room.floor || '').trim()).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const filterBody = `
    ${renderHousekeepingField({
      label: t('housekeeping.filters.search'),
      iconName: 'search',
      className: 'field-search',
      control: `<input class="input ds-control" id="housekeepingSearch" value="${h(filters.search)}" autocomplete="off">`
    })}
    ${renderHousekeepingField({
      label: t('housekeeping.filters.status'),
      iconName: 'status',
      control: `<select class="select ds-control" id="housekeepingStatusFilter">
        <option value="all" ${filters.status === 'all' ? 'selected' : ''}>${h(t('housekeeping.filters.all'))}</option>
        ${['cleaning','available','occupied','maintenance','out_of_service'].map(status => `<option value="${h(status)}" ${filters.status === status ? 'selected' : ''}>${h(getRoomStatusLabel(status))}</option>`).join('')}
      </select>`
    })}
    ${renderHousekeepingField({
      label: t('housekeeping.filters.floor'),
      iconName: 'dashboard',
      control: `<select class="select ds-control" id="housekeepingFloorFilter">
        <option value="" ${filters.floor === '' ? 'selected' : ''}>${h(t('housekeeping.filters.all'))}</option>
        ${floors.map(floor => `<option value="${h(floor)}" ${String(filters.floor) === floor ? 'selected' : ''}>${h(t('room.form.floorPrefix'))} ${h(floor)}</option>`).join('')}
      </select>`
    })}
  `;
  return `
    <div class="hotels-page housekeeping-page housekeeping-central-page" data-ui-centralized="phase105-housekeeping" data-ui-migrated="housekeeping">
      ${renderHousekeepingSectionHead()}
      ${renderHousekeepingSummaryStrip(allRooms)}
      ${renderHousekeepingSurface({ component: 'housekeeping-filter-panel', className: 'housekeeping-filters-bar housekeeping-central-filter-panel', body: filterBody })}
      <div id="housekeepingCardsSlot" class="housekeeping-cards-slot" data-ui-component="housekeeping-list-slot">${renderHousekeepingRooms(rooms)}</div>
    </div>
  `;
}

function updateRoomStatusById(roomId, status, extra = {}) {
  const feature = housekeepingFeature();
  if (feature?.actions?.updateRoomStatus) return feature.actions.updateRoomStatus(roomId, status, { ...extra, updatedAt: todayISO() });
  const rooms = readRooms().map(room => room.id === roomId ? { ...room, status, ...extra, updatedAt: todayISO() } : room);
  writeRooms(rooms);
}

function markRoomCleaned(roomId) {
  const room = getRoomById(roomId);
  if (!room || getRoomDisplayStatus(room) !== 'cleaning') {
    toast(t('housekeeping.toast.cannotMarkClean'));
    return;
  }
  const stamped = new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  const cleanPatch = {
    cleanedAt: stamped,
    cleanedBy: getCurrentUserDisplayName(),
    cleaningStartedAt: '',
    cleaningReason: '',
    lastCheckoutReservationId: room.lastCheckoutReservationId || '',
    lastCheckoutReservationNo: room.lastCheckoutReservationNo || '',
    lastCheckoutGuestName: room.lastCheckoutGuestName || ''
  };
  const feature = housekeepingFeature();
  if (feature?.actions?.markClean) {
    feature.actions.markClean(roomId, { ...cleanPatch, updatedAt: todayISO() });
  } else {
    updateRoomStatusById(roomId, 'available', cleanPatch);
  }
  toast(t('housekeeping.toast.markedClean'));
  refreshHousekeepingCards();
}

function sendRoomToMaintenance(roomId) {
  const room = getRoomById(roomId);
  if (!room) return;
  const stamped = new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  const maintenancePatch = {
    maintenanceStartedAt: stamped,
    maintenanceBy: getCurrentUserDisplayName()
  };
  const feature = housekeepingFeature();
  if (feature?.actions?.sendToMaintenance) {
    feature.actions.sendToMaintenance(roomId, { ...maintenancePatch, updatedAt: todayISO() });
  } else {
    updateRoomStatusById(roomId, 'maintenance', maintenancePatch);
  }
  ensureMaintenanceTicketForRoom(roomId, {
    source: 'housekeeping',
    type: 'cleaning_damage',
    priority: 'medium',
    description: t('maintenance.autoTicketDescription'),
    createdAt: stamped
  });
  toast(t('housekeeping.toast.sentMaintenance'));
  refreshHousekeepingCards();
}

function refreshHousekeepingCards() {
  const slot = document.getElementById('housekeepingCardsSlot');
  if (!slot) return;
  slot.innerHTML = renderHousekeepingRooms(getFilteredHousekeepingRooms());
  applyCentralDesignSystem(slot);
  bindHousekeepingCardActions();
}

function bindHousekeepingCardActions() {
  document.querySelectorAll('[data-action="housekeeping-mark-clean"]').forEach(button => {
    button.addEventListener('click', () => markRoomCleaned(button.dataset.id));
  });
  document.querySelectorAll('[data-action="housekeeping-send-maintenance"]').forEach(button => {
    button.addEventListener('click', () => sendRoomToMaintenance(button.dataset.id));
  });
  document.querySelectorAll('[data-action="housekeeping-view-room"]').forEach(button => {
    button.addEventListener('click', () => {
      state.roomModal = { mode: 'view', id: button.dataset.id };
      state.activePage = 'rooms';
      writeStorageText('fandqi.activePage', state.activePage);
      render();
    });
  });
}

function bindHousekeepingEvents() {
  const searchInput = document.getElementById('housekeepingSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.housekeepingFilters.search = event.target.value;
    refreshHousekeepingCards();
  });
  const statusFilter = document.getElementById('housekeepingStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.housekeepingFilters.status = event.target.value;
    refreshHousekeepingCards();
  });
  const floorFilter = document.getElementById('housekeepingFloorFilter');
  if (floorFilter) floorFilter.addEventListener('change', event => {
    state.housekeepingFilters.floor = event.target.value;
    refreshHousekeepingCards();
  });
  bindHousekeepingCardActions();
}

function paymentsFeature() {
  return window.FandqiPaymentsFeature || null;
}

function getFilteredPaymentOrders(hotelId) {
  const method = state.paymentFilters.method || 'all';
  const search = String(state.paymentFilters.search || '').trim().toLowerCase();
  const orders = getHotelFoodOrders(hotelId);
  const feature = paymentsFeature();
  if (feature?.selectors?.filterPaymentOrders) {
    return feature.selectors.filterPaymentOrders(orders, { method, search }, {
      formatFoodOrderItems,
      getPaymentMethodLabel: getFoodOrderPaymentMethodLabel
    });
  }
  return orders
    .filter(order => method === 'all' || (order.paymentMethod || 'cash') === method)
    .filter(order => {
      if (!search) return true;
      return [order.guestName, order.roomNumber, order.tableNumber, order.reservationNo, formatFoodOrderItems(order), order.externalVendor, getFoodOrderPaymentMethodLabel(order.paymentMethod || 'cash')]
        .some(value => String(value || '').toLowerCase().includes(search));
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function getPaymentOrdersSummary(orders) {
  const feature = paymentsFeature();
  if (feature?.selectors?.summarizePaymentOrders) return feature.selectors.summarizePaymentOrders(orders);
  return orders.reduce((acc, order) => {
    const amount = Number(order.amount || 0);
    acc.total += amount;
    if ((order.paymentMethod || 'cash') === 'cash') acc.cash += amount;
    if ((order.paymentMethod || 'cash') === 'electronic') acc.electronic += amount;
    if ((order.paymentMethod || 'cash') === 'room_account') acc.roomAccount += amount;
    return acc;
  }, { total: 0, cash: 0, electronic: 0, roomAccount: 0 });
}

function renderPaymentFoodOrdersTable(orders, currency) {
  return renderFoodOrdersCards(orders, currency, { compact: true });
}


/* Maintenance workflow */
