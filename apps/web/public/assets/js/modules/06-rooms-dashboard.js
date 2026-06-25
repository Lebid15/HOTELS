// Fandqi Modular Refactor — Rooms, floors, room archive/restore, manager dashboard metrics, and room/dashboard events.
const ROOM_STORAGE_KEY = 'fandqi.rooms';

function roomsFeature() {
  return window.FandqiRoomsFeature || null;
}

function readRooms() {
  const feature = roomsFeature();
  if (feature?.repository?.read) return feature.repository.read();
  try {
    const value = readStorageJson(ROOM_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeRooms(rooms) {
  const feature = roomsFeature();
  if (feature?.repository?.write) return feature.repository.write(rooms);
  writeStorageJson(ROOM_STORAGE_KEY, rooms);
}

function getManagerHotel() {
  const user = state.currentUser;
  if (!user || !isHotelOperationalRole(user.role)) return null;
  const hotels = readHotels();
  if (user.hotelId) {
    const byId = hotels.find(hotel => hotel.id === user.hotelId);
    if (byId) return byId;
  }

  if (isHotelStaffRole(user.role)) {
    const staff = user.staffId
      ? getStaffById(user.staffId)
      : readHotelStaff().find(item => normalizeEmail(item.email) === normalizeEmail(user.email));
    if (staff?.hotelId) {
      const staffHotel = hotels.find(hotel => hotel.id === staff.hotelId);
      if (staffHotel) {
        state.currentUser = { ...user, hotelId: staffHotel.id, hotelName: staffHotel.name || user.hotelName || '' };
        writeStorageJson('fandqi.user', state.currentUser);
        return staffHotel;
      }
    }
  }

  const userEmail = normalizeEmail(user.email);
  const byEmail = hotels.find(hotel => normalizeEmail(hotel.managerEmail || hotel.email) === userEmail);
  if (byEmail) {
    state.currentUser = { ...user, hotelId: byEmail.id, hotelName: byEmail.name || user.hotelName || '' };
    writeStorageJson('fandqi.user', state.currentUser);
    return byEmail;
  }

  const fallback = hotels.find(hotel => hotel.status !== 'archived');
  if (fallback && isHotelOperationalRole(user.role)) {
    state.currentUser = { ...user, hotelId: fallback.id, hotelName: fallback.name || user.hotelName || '' };
    writeStorageJson('fandqi.user', state.currentUser);
    return fallback;
  }

  return null;
}

function renderManagerNoHotel() {
  return `
    <div class="empty-panel manager-no-hotel">
      <div>
        <h2>${h(t('managerInterface.noHotelTitle'))}</h2>
        <p>${h(t('managerInterface.noHotelText'))}</p>
      </div>
    </div>
  `;
}

function getHotelRooms(hotelId) {
  const feature = roomsFeature();
  if (feature?.repository?.forHotel) return feature.repository.forHotel(hotelId);
  return readRooms().filter(room => room.hotelId === hotelId && room.status !== 'archived');
}

function getHotelRoomsIncludingArchived(hotelId) {
  const feature = roomsFeature();
  if (feature?.repository?.forHotel) return feature.repository.forHotel(hotelId, { includeArchived: true });
  return readRooms().filter(room => room.hotelId === hotelId);
}

function getRoomById(id) {
  const feature = roomsFeature();
  if (feature?.repository?.byId) return feature.repository.byId(id);
  return readRooms().find(room => room.id === id) || null;
}

function getRoomStatusLabel(status) {
  return t(`room.status.${status}`, status);
}

function getRoomDisplayStatus(room) {
  const feature = roomsFeature();
  if (feature?.selectors?.getRoomDisplayStatus) {
    return feature.selectors.getRoomDisplayStatus(room, readReservations());
  }
  if (!room) return 'available';
  if (['cleaning', 'maintenance', 'out_of_service', 'archived'].includes(room.status)) return room.status;
  const reservations = readReservations().filter(reservation => reservation.roomId === room.id);
  const hasOccupiedStay = reservations.some(reservation => reservation.status === 'checked_in');
  if (hasOccupiedStay || room.status === 'occupied') return 'occupied';
  const hasUpcomingBooking = reservations.some(reservation => ['pending', 'confirmed'].includes(reservation.status || 'pending'));
  if (hasUpcomingBooking) return 'booked';
  return 'available';
}


function getRoomTypeLabel(type) {
  return t(`room.type.${type}`, type);
}

function roomUi() {
  return window.FandqiUI || null;
}

function renderRoomButton({ action, id = '', label = '', tone = 'ghost', iconName = '' }) {
  return renderRoomCentralButton({
    action,
    label,
    tone,
    iconName,
    size: 'small',
    attrs: {
      ...(id ? { 'data-id': id } : {}),
      'data-ui-component': 'rooms-card-action-button'
    }
  });
}

function renderRoomBadge(status) {
  const ui = roomUi();
  const label = getRoomStatusLabel(status);
  if (ui?.renderBadge) {
    return ui.renderBadge({ label, status, attrs: { 'data-room-status': status } });
  }
  return `<span class="status-badge ${h(status)}" data-room-status="${h(status)}">${h(label)}</span>`;
}

function renderRoomEmptyState() {
  const ui = roomUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title: t('room.emptyTitle'),
      text: t('room.emptyText'),
      icon: icon('building'),
      className: 'rooms-empty'
    });
  }
  return `
    <div class="empty-panel rooms-empty">
      <div>
        <h2>${h(t('room.emptyTitle'))}</h2>
        <p>${h(t('room.emptyText'))}</p>
      </div>
    </div>
  `;
}

function renderRoomActionButtons(room, displayStatus) {
  const actions = [
    renderRoomButton({ action: 'view-room', id: room.id, label: t('room.actions.view'), tone: 'ghost' }),
    renderRoomButton({ action: 'edit-room', id: room.id, label: t('room.actions.edit'), tone: 'ghost' })
  ];
  actions.push(displayStatus === 'archived'
    ? renderRoomButton({ action: 'restore-room', id: room.id, label: t('room.actions.restore', 'استعادة'), tone: 'success' })
    : renderRoomButton({ action: 'archive-room', id: room.id, label: t('room.actions.archive'), tone: 'danger' })
  );
  return actions.join('');
}

function getFilteredRooms() {
  const hotel = getManagerHotel();
  if (!hotel) return [];
  const search = state.roomFilters.search.trim().toLowerCase();
  const floor = state.roomFilters.floor.trim().toLowerCase();
  const sourceRooms = state.roomFilters.status === 'archived'
    ? getHotelRoomsIncludingArchived(hotel.id).filter(room => room.status === 'archived')
    : getHotelRooms(hotel.id);
  return sourceRooms.filter(room => {
    const displayStatus = getRoomDisplayStatus(room);
    const matchesSearch = !search || [room.number, room.floor, getRoomTypeLabel(room.type), room.notes]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesStatus = state.roomFilters.status === 'all' || displayStatus === state.roomFilters.status;
    const matchesType = state.roomFilters.type === 'all' || room.type === state.roomFilters.type;
    const matchesFloor = !floor || String(room.floor || '').toLowerCase().includes(floor);
    return matchesSearch && matchesStatus && matchesType && matchesFloor;
  });
}

function openRoomModal(mode, id = null) {
  state.roomModal = { mode, id };
  render();
}

function openRoomFloorsModal() {
  state.roomModal = { mode: 'floors', id: null };
  render();
}

function closeRoomModal() {
  state.roomModal = null;
  render();
}

function renderManagerHotelHeader(hotel) {
  return '';
}

function getManagerDashboardMetrics(hotel) {
  const rooms = getHotelRooms(hotel.id);
  const reservations = getHotelReservations(hotel.id);
  const guests = getHotelGuestEntries(hotel.id);
  const foodOrders = getHotelFoodOrders(hotel.id);
  const maintenanceTickets = getHotelMaintenanceTickets(hotel.id);
  const staff = getHotelStaff(hotel.id);
  const settings = readHotelSettings(hotel.id);
  const currency = settings.defaultCurrency || readPlatformSettings().defaultCurrency || 'USD';
  const date = getOperationalDate();
  const roomDisplayStates = rooms.map(room => ({ room, status: getRoomDisplayStatus(room) }));
  const activeMaintenanceStatuses = ['open', 'in_progress', 'waiting_parts'];
  const foodToday = foodOrders.filter(order => String(order.createdAt || order.updatedAt || '').slice(0, 10) === date);
  const foodSummary = getPaymentOrdersSummary(foodOrders);
  const todaySummary = reservations.reduce((acc, reservation) => {
    const timelineStatus = getReservationTimelineStatus(reservation, date);
    if (timelineStatus === 'arrival_due') acc.arrivals += 1;
    if (['in_house', 'departure_due'].includes(timelineStatus)) acc.inHouse += 1;
    if (timelineStatus === 'departure_due') acc.departures += 1;
    const due = getReservationAmountDue(reservation);
    if (due > 0) acc.withBalance += 1;
    acc.balance += due;
    return acc;
  }, { arrivals: 0, inHouse: 0, departures: 0, withBalance: 0, balance: 0 });
  const guestSummary = getGuestsSummary(guests);
  const reservationsToday = reservations.filter(reservation => [reservation.checkInDate, reservation.checkOutDate, reservation.createdAt, reservation.updatedAt]
    .some(value => String(value || '').slice(0, 10) === date));

  return {
    currency,
    roomsTotal: rooms.length,
    roomsAvailable: roomDisplayStates.filter(item => item.status === 'available').length,
    roomsBooked: roomDisplayStates.filter(item => item.status === 'booked').length,
    roomsOccupied: roomDisplayStates.filter(item => item.status === 'occupied').length,
    roomsMaintenance: roomDisplayStates.filter(item => item.status === 'maintenance').length,
    roomsCleaning: roomDisplayStates.filter(item => item.status === 'cleaning').length,
    floorsTotal: new Set(rooms.map(room => String(room.floor || '').trim()).filter(Boolean)).size,
    reservationsTotal: reservations.length,
    reservationsToday: reservationsToday.length,
    arrivalsToday: todaySummary.arrivals,
    inHouse: todaySummary.inHouse,
    departuresToday: todaySummary.departures,
    withBalance: todaySummary.withBalance,
    balanceDue: todaySummary.balance,
    guestsTotal: guestSummary.total,
    activeGuests: guestSummary.active,
    staffTotal: staff.length,
    foodOrdersToday: foodToday.length,
    foodRevenueToday: foodToday.reduce((sum, order) => sum + Number(order.amount || 0), 0),
    roomAccountTotal: foodSummary.roomAccount,
    maintenanceOpen: maintenanceTickets.filter(ticket => activeMaintenanceStatuses.includes(ticket.status || 'open')).length,
    maintenanceUrgent: maintenanceTickets.filter(ticket => activeMaintenanceStatuses.includes(ticket.status || 'open') && ticket.priority === 'urgent').length
  };
}

function getManagerDashboardAttrs({ action, page, tab, roomStatus, reservationStatus, guestStatus, housekeepingStatus, maintenanceStatus, paymentMethod, reportType } = {}) {
  return {
    'data-ui-component': 'manager-dashboard-control',
    'data-manager-dashboard-action': action || undefined,
    'data-manager-dashboard-page': page || undefined,
    'data-manager-checkio-tab': tab || undefined,
    'data-manager-room-status': roomStatus || undefined,
    'data-manager-reservation-status': reservationStatus || undefined,
    'data-manager-guest-status': guestStatus || undefined,
    'data-manager-housekeeping-status': housekeepingStatus || undefined,
    'data-manager-maintenance-status': maintenanceStatus || undefined,
    'data-manager-payment-method': paymentMethod || undefined,
    'data-manager-report-type': reportType || undefined
  };
}

function renderManagerQuickButton(options = {}) {
  const ui = roomUi();
  const buttonOptions = {
    label: options.label,
    tone: options.tone || 'ghost',
    size: 'small',
    icon: icon(options.iconName || options.icon || 'dashboard'),
    className: 'manager-dashboard-quick-button',
    attrs: getManagerDashboardAttrs(options)
  };
  if (ui?.renderButton) {
    return ui.renderButton(buttonOptions);
  }
  const attrs = Object.entries(buttonOptions.attrs)
    .filter(([, value]) => value)
    .map(([name, value]) => ` ${h(name)}="${h(value)}"`)
    .join('');
  return `<button class="btn small ${h(buttonOptions.tone)} ds-btn manager-dashboard-quick-button" type="button"${attrs}>${icon(options.iconName || 'dashboard')}${h(options.label || '')}</button>`;
}

function renderManagerSmartCard(options = {}) {
  const ui = roomUi();
  const attrs = getManagerDashboardAttrs(options);
  const cardOptions = {
    tag: 'button',
    title: options.title,
    value: options.value,
    note: options.note,
    tone: options.tone || '',
    icon: icon(options.iconName || options.icon || 'dashboard', 'dashboard-card-svg'),
    className: 'manager-dashboard-smart-card',
    attrs: {
      ...attrs,
      'data-ui-component': 'manager-dashboard-metric-card'
    }
  };
  if (ui?.renderMetricCard) {
    return ui.renderMetricCard(cardOptions);
  }
  const attrHtml = Object.entries(cardOptions.attrs)
    .filter(([, value]) => value)
    .map(([name, value]) => ` ${h(name)}="${h(value)}"`)
    .join('');
  return `
    <button class="dashboard-card ds-card ds-metric-card manager-dashboard-smart-card ${h(options.tone || '')}" type="button"${attrHtml}>
      <span class="dashboard-card-icon fandqi-ui-metric-icon">${icon(options.iconName || options.icon || 'dashboard', 'dashboard-card-svg')}</span>
      <span class="dashboard-card-title fandqi-ui-metric-title">${h(options.title || '')}</span>
      <strong class="fandqi-ui-metric-value">${h(options.value ?? '')}</strong>
      <small class="fandqi-ui-metric-note">${h(options.note || '')}</small>
    </button>
  `;
}

function renderManagerDashboardHead() {
  const ui = roomUi();
  const actions = `<span class="manager-dashboard-date-chip ds-badge" data-ui-component="manager-dashboard-date-chip">${icon('calendar')}${h(getOperationalDate())}</span>`;
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title: t('managerDashboard.title'),
      text: t('managerDashboard.description', 'لوحة تشغيل ذكية تمنح المدير وصولًا مباشرًا إلى الحجوزات، النزلاء، الغرف، المطعم، الصيانة، المالية والتقارير.'),
      className: 'dashboard-head manager-dashboard-head',
      actions,
      attrs: { 'data-ui-component': 'manager-dashboard-head' }
    });
  }
  return `
    <div class="section-head ds-section-head dashboard-head manager-dashboard-head" data-ui-component="manager-dashboard-head">
      <div class="fandqi-ui-section-copy">
        <h2>${h(t('managerDashboard.title'))}</h2>
        <p class="helper">${h(t('managerDashboard.description', 'لوحة تشغيل ذكية تمنح المدير وصولًا مباشرًا إلى الحجوزات، النزلاء، الغرف، المطعم، الصيانة، المالية والتقارير.'))}</p>
      </div>
      <div class="fandqi-ui-section-actions ds-actions">${actions}</div>
    </div>
  `;
}

function renderManagerQuickBar(quickButtons) {
  const ui = roomUi();
  const children = quickButtons.map(renderManagerQuickButton).join('');
  if (ui?.renderActions) {
    return ui.renderActions({
      className: 'manager-dashboard-quickbar',
      attrs: {
        'aria-label': t('managerDashboard.quick.title', 'اختصارات سريعة'),
        'data-ui-component': 'manager-dashboard-quick-actions'
      },
      children
    });
  }
  return `<div class="ds-actions manager-dashboard-quickbar" aria-label="${h(t('managerDashboard.quick.title', 'اختصارات سريعة'))}" data-ui-component="manager-dashboard-quick-actions">${children}</div>`;
}

function renderManagerSmartCardsPanel(smartCards) {
  const ui = roomUi();
  const head = `
    <div class="dashboard-panel-head ds-section-head compact" data-ui-component="manager-dashboard-panel-head">
      <div class="fandqi-ui-section-copy">
        <h3>${h(t('managerDashboard.sections.smartCards', 'كروت لوحة التحكم الذكية'))}</h3>
        <span>${h(t('managerDashboard.sections.smartCardsHint', 'اضغط على أي كرت للانتقال مباشرة'))}</span>
      </div>
    </div>
  `;
  const body = `
    ${head}
    <div class="dashboard-grid ds-summary-grid manager-dashboard-grid manager-dashboard-smart-grid" data-ui-component="manager-dashboard-metric-grid">
      ${smartCards.map(renderManagerSmartCard).join('')}
    </div>
  `;
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag: 'section',
      className: 'dashboard-panel manager-dashboard-panel',
      attrs: { 'data-ui-component': 'manager-dashboard-smart-panel' },
      body
    });
  }
  return `<section class="dashboard-panel ds-card ds-surface manager-dashboard-panel" data-ui-component="manager-dashboard-smart-panel">${body}</section>`;
}


function renderHotelManagerDashboardPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const metrics = getManagerDashboardMetrics(hotel);
  const quickButtons = [
    { icon: 'plus', label: t('managerDashboard.quick.newReservation', 'حجز جديد'), action: 'new_reservation', tone: 'primary' },
    { icon: 'clock', label: t('managerDashboard.quick.arrivals', 'وصول اليوم'), page: 'check_in_out', tab: 'arrivals', tone: 'accent' },
    { icon: 'receipt', label: t('managerDashboard.quick.newFoodOrder', 'طلب مطعم / كافتريا'), action: 'new_food_order', tone: 'luxury' },
    { icon: 'checkCircle', label: t('managerDashboard.quick.cleaning', 'التنظيف'), page: 'housekeeping', housekeepingStatus: 'cleaning', tone: 'warning' },
    { icon: 'shieldAlert', label: t('managerDashboard.quick.maintenance', 'بلاغ صيانة'), action: 'new_maintenance', tone: 'warning' },
    { icon: 'fileText', label: t('managerDashboard.quick.reports', 'التقارير'), page: 'reports', reportType: 'overview', tone: 'ghost' }
  ];

  const smartCards = [
    { icon: 'calendar', title: t('managerDashboard.smart.reservationsToday', 'حجوزات اليوم'), value: metrics.reservationsToday, note: t('managerDashboard.smartNotes.reservationsToday', 'وصول أو مغادرة أو تعديل اليوم'), page: 'reservations', tone: 'accent' },
    { icon: 'clock', title: t('managerDashboard.smart.arrivalsToday', 'وصول اليوم'), value: metrics.arrivalsToday, note: t('managerDashboard.smartNotes.arrivalsToday', 'نزلاء يجب تسجيل دخولهم'), page: 'check_in_out', tab: 'arrivals', tone: metrics.arrivalsToday ? 'warning' : 'success' },
    { icon: 'users', title: t('managerDashboard.smart.inHouse', 'مقيمون حاليًا'), value: metrics.inHouse, note: t('managerDashboard.smartNotes.inHouse', 'حجوزات داخل الفندق الآن'), page: 'check_in_out', tab: 'in_house' },
    { icon: 'externalLink', title: t('managerDashboard.smart.departuresToday', 'مغادرة اليوم'), value: metrics.departuresToday, note: t('managerDashboard.smartNotes.departuresToday', 'تحقق مالي قبل الخروج'), page: 'check_in_out', tab: 'departures', tone: metrics.departuresToday ? 'warning' : '' },
    { icon: 'building', title: t('managerDashboard.smart.roomsAvailable', 'غرف متاحة'), value: metrics.roomsAvailable, note: t('managerDashboard.smartNotes.roomsAvailable', 'جاهزة لحجز جديد'), page: 'rooms', roomStatus: 'available', tone: 'success' },
    { icon: 'user', title: t('managerDashboard.smart.roomsOccupied', 'غرف مشغولة'), value: metrics.roomsOccupied, note: t('managerDashboard.smartNotes.roomsOccupied', 'مرتبطة بنزلاء حاليين'), page: 'rooms', roomStatus: 'occupied' },
    { icon: 'checkCircle', title: t('managerDashboard.smart.cleaningRooms', 'غرف تحت التنظيف'), value: metrics.roomsCleaning, note: t('managerDashboard.smartNotes.cleaningRooms', 'بعد المغادرة قبل الإتاحة'), page: 'housekeeping', housekeepingStatus: 'cleaning', tone: metrics.roomsCleaning ? 'warning' : 'success' },
    { icon: 'shieldAlert', title: t('managerDashboard.smart.maintenanceOpen', 'بلاغات صيانة مفتوحة'), value: metrics.maintenanceOpen, note: metrics.maintenanceUrgent ? `${metrics.maintenanceUrgent} ${t('managerDashboard.smartNotes.urgentMaintenance', 'عاجل')}` : t('managerDashboard.smartNotes.maintenanceOpen', 'تحتاج متابعة تشغيلية'), page: 'maintenance', maintenanceStatus: 'open', tone: metrics.maintenanceOpen ? 'warning' : 'success' },
    { icon: 'users', title: t('managerDashboard.smart.guests', 'النزلاء'), value: metrics.activeGuests, note: `${metrics.guestsTotal} ${t('managerDashboard.smartNotes.totalGuestEntries', 'إجمالي سجلات النزلاء')}`, page: 'guests', guestStatus: 'active' },
    { icon: 'restaurant', title: t('managerDashboard.smart.foodOrdersToday', 'طلبات اليوم'), value: metrics.foodOrdersToday, note: `${moneyValue(metrics.foodRevenueToday, metrics.currency)} ${t('managerDashboard.smartNotes.foodRevenueToday', 'إيراد اليوم')}`, page: 'room_service', tone: 'luxury' },
    { icon: 'creditCard', title: t('managerDashboard.smart.roomAccount', 'على حساب الغرف'), value: moneyValue(metrics.roomAccountTotal, metrics.currency), note: t('managerDashboard.smartNotes.roomAccount', 'طلبات مرحلة على حساب الحجز'), page: 'payments', paymentMethod: 'room_account', tone: metrics.roomAccountTotal ? 'warning' : '' },
    { icon: 'alertCircle', title: t('managerDashboard.smart.balanceDue', 'متبقي مالي'), value: moneyValue(metrics.balanceDue, metrics.currency), note: `${metrics.withBalance} ${t('managerDashboard.smartNotes.withBalance', 'حجز عليه مبلغ')}`, page: 'payments', paymentMethod: 'all', tone: metrics.balanceDue ? 'danger' : 'success' },
    { icon: 'fileText', title: t('managerDashboard.smart.financialReport', 'التقرير المالي'), value: t('managerDashboard.smart.open', 'فتح'), note: t('managerDashboard.smartNotes.financialReport', 'إقامات وطلبات وذمم'), page: 'reports', reportType: 'financial' },
    { icon: 'settings', title: t('managerDashboard.smart.hotelSettings', 'إعدادات الفندق'), value: t('managerDashboard.smart.manage', 'إدارة'), note: t('managerDashboard.smartNotes.hotelSettings', 'هوية الفندق والخدمات'), page: 'hotel_settings' },
    { icon: 'users', title: t('managerDashboard.smart.staff', 'الموظفون'), value: metrics.staffTotal, note: t('managerDashboard.smartNotes.staff', 'صلاحيات وحسابات وصور'), page: 'staff' }
  ];

  return `
    <div class="dashboard-page ds-page manager-dashboard-page" data-ui-page="manager-dashboard" data-ui-centralized="phase92-manager-dashboard">
      ${renderManagerDashboardHead()}
      ${renderManagerHotelHeader(hotel)}
      ${renderManagerQuickBar(quickButtons)}
      ${renderManagerSmartCardsPanel(smartCards)}
    </div>
  `;
}


function refreshStaffTable() {
  const slot = document.getElementById('staffTableSlot');
  if (!slot) return;
  const hotel = getManagerHotel();
  if (hotel) {
    const summarySlot = document.getElementById('staffSummarySlot');
    if (summarySlot) {
      summarySlot.innerHTML = renderStaffSummaryStrip(getHotelStaff(hotel.id));
      applyCentralDesignSystem(summarySlot);
    }
  }
  slot.innerHTML = renderStaffTable(getFilteredStaff());
  applyCentralDesignSystem(slot);
  bindStaffRowActions();
}

function bindStaffRowActions() {
  document.querySelectorAll('[data-action="view-staff"]').forEach(button => {
    button.addEventListener('click', () => openStaffModal('view', button.dataset.id));
  });
  document.querySelectorAll('[data-action="edit-staff"]').forEach(button => {
    button.addEventListener('click', () => openStaffModal('edit', button.dataset.id));
  });
  document.querySelectorAll('[data-action="change-staff-password"]').forEach(button => {
    button.addEventListener('click', () => openStaffModal('password', button.dataset.id));
  });
  document.querySelectorAll('[data-action="change-staff-shift"]').forEach(button => {
    button.addEventListener('click', () => openStaffModal('shift', button.dataset.id));
  });
  document.querySelectorAll('[data-action="manage-staff-permissions"]').forEach(button => {
    button.addEventListener('click', () => openStaffModal('permissions', button.dataset.id));
  });
  document.querySelectorAll('[data-action="toggle-staff"]').forEach(button => {
    button.addEventListener('click', () => {
      const feature = window.FandqiStaffFeature;
      if (feature?.actions?.toggleStatus) {
        feature.actions.toggleStatus(button.dataset.id);
      } else {
        const staff = readHotelStaff().map(item => item.id === button.dataset.id ? { ...item, status: item.status === 'active' ? 'suspended' : 'active', updatedAt: todayISO() } : item);
        writeHotelStaff(staff);
      }
      refreshStaffTable();
    });
  });
  document.querySelectorAll('[data-action="archive-staff"]').forEach(button => {
    button.addEventListener('click', () => {
      const feature = window.FandqiStaffFeature;
      if (feature?.actions?.archive) {
        feature.actions.archive(button.dataset.id);
      } else {
        const staff = readHotelStaff().map(item => item.id === button.dataset.id ? { ...item, status: 'archived', updatedAt: todayISO() } : item);
        writeHotelStaff(staff);
      }
      refreshStaffTable();
    });
  });
  document.querySelectorAll('[data-action="restore-staff"]').forEach(button => {
    button.addEventListener('click', () => {
      const staff = readHotelStaff().map(item => item.id === button.dataset.id ? { ...item, status: 'active', updatedAt: todayISO() } : item);
      writeHotelStaff(staff);
      refreshStaffTable();
    });
  });
}

function bindStaffEvents() {
  const addButton = document.getElementById('addStaffBtn');
  if (addButton) addButton.addEventListener('click', () => openStaffModal('add'));

  const searchInput = document.getElementById('staffSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.staffFilters.search = event.target.value;
    refreshStaffTable();
  });

  const roleFilter = document.getElementById('staffRoleFilter');
  if (roleFilter) roleFilter.addEventListener('change', event => {
    state.staffFilters.role = event.target.value;
    refreshStaffTable();
  });

  const statusFilter = document.getElementById('staffStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.staffFilters.status = event.target.value;
    refreshStaffTable();
  });

  bindStaffRowActions();

  document.querySelectorAll('[data-action="close-staff-modal"]').forEach(button => {
    button.addEventListener('click', closeStaffModal);
  });

  document.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.innerHTML = isPassword ? icons.eyeOff : icons.eye;
      button.setAttribute('aria-label', isPassword ? t('login.hidePassword') : t('login.showPassword'));
      button.setAttribute('title', isPassword ? t('login.hidePassword') : t('login.showPassword'));
    });
  });

  const passwordForm = document.getElementById('staffPasswordForm');
  if (passwordForm) passwordForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(passwordForm).entries());
    const password = normalizePassword(data.password);
    const confirmPassword = normalizePassword(data.confirmPassword);
    if (password !== confirmPassword) {
      toast(t('staff.validation.passwordMismatch'));
      return;
    }
    const feature = window.FandqiStaffFeature;
    if (feature?.actions?.updatePassword) {
      feature.actions.updatePassword(passwordForm.dataset.id, password);
    } else {
      const allStaff = readHotelStaff().map(item => item.id === passwordForm.dataset.id ? { ...item, password, updatedAt: todayISO() } : item);
      writeHotelStaff(allStaff);
    }
    toast(t('staff.toast.passwordChanged'));
    closeStaffModal();
  });

  const shiftForm = document.getElementById('staffShiftForm');
  if (shiftForm) shiftForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(shiftForm).entries());
    const feature = window.FandqiStaffFeature;
    if (feature?.actions?.updateShift) {
      feature.actions.updateShift(shiftForm.dataset.id, data.shift);
    } else {
      const allStaff = readHotelStaff().map(item => item.id === shiftForm.dataset.id ? { ...item, shift: data.shift || item.shift, updatedAt: todayISO() } : item);
      writeHotelStaff(allStaff);
    }
    toast(t('staff.toast.shiftChanged'));
    closeStaffModal();
  });

  const permissionsForm = document.getElementById('staffPermissionsForm');
  if (permissionsForm) permissionsForm.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(permissionsForm);
    const permissions = formData.getAll('permissions');
    const feature = window.FandqiStaffFeature;
    if (feature?.actions?.updatePermissions) {
      feature.actions.updatePermissions(permissionsForm.dataset.id, permissions);
    } else {
      const allStaff = readHotelStaff().map(item => item.id === permissionsForm.dataset.id ? { ...item, permissions, updatedAt: todayISO() } : item);
      writeHotelStaff(allStaff);
    }
    toast(t('staff.toast.permissionsChanged'));
    closeStaffModal();
  });

  const form = document.getElementById('staffForm');
  bindAvatarUploaders();
  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const hotel = getManagerHotel();
    if (!hotel) return;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const permissions = formData.getAll('permissions');
    const password = normalizePassword(data.password);
    const confirmPassword = normalizePassword(data.confirmPassword);
    if (password !== confirmPassword) {
      toast(t('staff.validation.passwordMismatch'));
      return;
    }
    const email = normalizeEmail(data.email);
    const allStaff = readHotelStaff();
    const id = form.dataset.id;
    const duplicateEmail = email && allStaff.some(item => item.id !== id && item.hotelId === hotel.id && item.status !== 'archived' && normalizeEmail(item.email) === email);
    if (duplicateEmail) {
      toast(t('staff.validation.emailExists'));
      return;
    }
    const existingStaff = allStaff.find(item => item.id === id) || {};
    const staffAvatar = await getAvatarPayload('staffPhoto', existingStaff.photoDataUrl || '', existingStaff.photoFileName || '');

    if (form.dataset.mode === 'add') {
      allStaff.push({
        id: createId('staff'),
        hotelId: hotel.id,
        fullName: data.fullName,
        role: data.role,
        phone: data.phone,
        email,
        password,
        shift: data.shift,
        status: data.status || 'active',
        photoDataUrl: staffAvatar.dataUrl,
        photoFileName: staffAvatar.fileName,
        permissions,
        notes: data.notes,
        createdAt: todayISO(),
        updatedAt: todayISO()
      });
    } else {
      const index = allStaff.findIndex(item => item.id === id);
      if (index >= 0) {
        allStaff[index] = {
          ...allStaff[index],
          fullName: data.fullName,
          role: data.role,
          phone: data.phone,
          email,
          password,
          shift: data.shift,
          status: data.status || allStaff[index].status,
          photoDataUrl: staffAvatar.dataUrl,
          photoFileName: staffAvatar.fileName,
          permissions,
          notes: data.notes,
          updatedAt: todayISO()
        };
      }
    }
    const feature = window.FandqiStaffFeature;
    if (feature?.repository?.upsert) {
      const savedStaff = form.dataset.mode === 'add'
        ? allStaff[allStaff.length - 1]
        : allStaff.find(item => item.id === id);
      if (savedStaff) feature.repository.upsert(savedStaff);
      else writeHotelStaff(allStaff);
    } else {
      writeHotelStaff(allStaff);
    }
    closeStaffModal();
  });
}

function refreshRoomsTable() {
  const slot = document.getElementById('roomsTableSlot');
  if (!slot) return;
  slot.innerHTML = renderRoomsTable(getFilteredRooms());
  applyCentralDesignSystem(slot);
  bindRoomRowActions();
}

function bindRoomRowActions() {
  document.querySelectorAll('[data-action="view-room"]').forEach(button => {
    button.addEventListener('click', () => openRoomModal('view', button.dataset.id));
  });
  document.querySelectorAll('[data-action="edit-room"]').forEach(button => {
    button.addEventListener('click', () => openRoomModal('edit', button.dataset.id));
  });
  document.querySelectorAll('[data-action="archive-room"]').forEach(button => {
    button.addEventListener('click', () => {
      const rooms = readRooms().map(room => room.id === button.dataset.id ? { ...room, status: 'archived', updatedAt: todayISO() } : room);
      writeRooms(rooms);
      refreshRoomsTable();
    });
  });
  document.querySelectorAll('[data-action="restore-room"]').forEach(button => {
    button.addEventListener('click', () => {
      const rooms = readRooms().map(room => room.id === button.dataset.id ? { ...room, status: 'available', updatedAt: todayISO() } : room);
      writeRooms(rooms);
      refreshRoomsTable();
    });
  });
}

function bindRoomsEvents() {
  const addButton = document.getElementById('addRoomBtn');
  if (addButton) addButton.addEventListener('click', () => openRoomModal('add'));

  const floorsButton = document.getElementById('editRoomFloorsBtn');
  if (floorsButton) floorsButton.addEventListener('click', openRoomFloorsModal);

  const searchInput = document.getElementById('roomSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.roomFilters.search = event.target.value;
    refreshRoomsTable();
  });

  const statusFilter = document.getElementById('roomStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.roomFilters.status = event.target.value;
    refreshRoomsTable();
  });

  const typeFilter = document.getElementById('roomTypeFilter');
  if (typeFilter) typeFilter.addEventListener('change', event => {
    state.roomFilters.type = event.target.value;
    refreshRoomsTable();
  });

  const floorFilter = document.getElementById('roomFloorFilter');
  if (floorFilter) floorFilter.addEventListener('change', event => {
    state.roomFilters.floor = event.target.value;
    refreshRoomsTable();
  });

  bindRoomRowActions();

  document.querySelectorAll('[data-action="close-room-modal"]').forEach(button => {
    button.addEventListener('click', closeRoomModal);
  });

  const form = document.getElementById('roomForm');
  const floorsForm = document.getElementById('roomFloorsForm');
  if (floorsForm) floorsForm.addEventListener('submit', event => {
    event.preventDefault();
    const hotel = getManagerHotel();
    if (!hotel) return;
    const data = Object.fromEntries(new FormData(floorsForm).entries());
    const minFloors = Math.max(1, Number(floorsForm.dataset.minFloors || 1));
    const floorsCount = Math.max(minFloors, Number(data.floorsCount || minFloors));
    writeHotelSettings(hotel.id, { floorsCount });
    state.roomFilters.floor = '';
    toast(t('room.floors.savedToast'));
    closeRoomModal();
  });

  bindHotelRoomTypeEditor();
  bindReceptionShiftEvents();
  bindFoodServiceSettingsEvents();

  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const hotel = getManagerHotel();
    if (!hotel) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const rooms = readRooms();
    const mode = form.dataset.mode;
    const id = form.dataset.id;
    if (mode === 'add') {
      rooms.push({
        id: createId('room'),
        hotelId: hotel.id,
        number: data.number,
        floor: data.floor,
        type: data.type,
        capacity: Number(data.capacity || 1),
        status: data.status || 'available',
        price: data.price,
        currency: data.currency,
        priceLockedByManager: true,
        notes: data.notes,
        createdAt: todayISO(),
        updatedAt: todayISO()
      });
    } else {
      const index = rooms.findIndex(room => room.id === id && room.hotelId === hotel.id);
      if (index >= 0) {
        rooms[index] = {
          ...rooms[index],
          number: data.number,
          floor: data.floor,
          type: data.type,
          capacity: Number(data.capacity || 1),
          status: data.status || rooms[index].status,
          price: data.price,
          currency: data.currency,
          priceLockedByManager: true,
          notes: data.notes,
          updatedAt: todayISO()
        };
      }
    }
    writeRooms(rooms);
    closeRoomModal();
  });
}

function applyManagerDashboardFilters(button) {
  if (button.dataset.managerRoomStatus) state.roomFilters.status = button.dataset.managerRoomStatus;
  if (button.dataset.managerReservationStatus) state.reservationFilters.status = button.dataset.managerReservationStatus;
  if (button.dataset.managerGuestStatus) state.guestFilters.stayStatus = button.dataset.managerGuestStatus;
  if (button.dataset.managerCheckioTab) state.checkInOutFilters.tab = button.dataset.managerCheckioTab;
  if (button.dataset.managerHousekeepingStatus) state.housekeepingFilters.status = button.dataset.managerHousekeepingStatus;
  if (button.dataset.managerMaintenanceStatus) state.maintenanceFilters.status = button.dataset.managerMaintenanceStatus;
  if (button.dataset.managerPaymentMethod) state.paymentFilters.method = button.dataset.managerPaymentMethod;
  if (button.dataset.managerReportType) state.reportFilters.type = button.dataset.managerReportType;
}

function openManagerDashboardAction(action) {
  if (action === 'new_reservation') {
    state.activePage = 'reservations';
    state.reservationModal = { mode: 'add', id: null };
    writeStorageText('fandqi.activePage', state.activePage);
    render();
    return;
  }
  if (action === 'new_food_order') {
    state.activePage = 'room_service';
    state.foodOrderModal = true;
    writeStorageText('fandqi.activePage', state.activePage);
    render();
    return;
  }
  if (action === 'new_maintenance') {
    state.activePage = 'maintenance';
    state.maintenanceModal = { mode: 'add', id: null };
    writeStorageText('fandqi.activePage', state.activePage);
    render();
    return;
  }
}

function bindManagerDashboardEvents() {
  document.querySelectorAll('[data-manager-dashboard-action]').forEach(button => {
    button.addEventListener('click', () => openManagerDashboardAction(button.dataset.managerDashboardAction));
  });

  document.querySelectorAll('[data-manager-dashboard-page]').forEach(button => {
    button.addEventListener('click', () => {
      applyManagerDashboardFilters(button);
      setActivePage(button.dataset.managerDashboardPage);
    });
  });
}



