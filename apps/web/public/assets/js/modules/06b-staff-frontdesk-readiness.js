// Fandqi Phase 114 — Staff operational dashboard + front desk center 100% component centralization.
const STAFF_FRONTDESK_CENTRAL_AUDIT_MARKERS = Object.freeze([
  'phase114-staff-frontdesk-centralization',
  'staff-operational-page-head',
  'staff-operational-quick-actions',
  'staff-operational-work-panel',
  'frontdesk-page-head',
  'frontdesk-metric-card',
  'frontdesk-queue-panel',
  'frontdesk-queue-item',
  'frontdesk-empty-state'
]);

function staffFrontdeskUi() {
  return window.FandqiUI || null;
}

function staffFrontdeskAttrs(attrs = {}) {
  const ui = staffFrontdeskUi();
  if (ui?.renderAttributes) return ui.renderAttributes(attrs);
  return Object.entries(attrs || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${h(name)}` : ` ${h(name)}="${h(value)}"`)
    .join('');
}

function getStaffDashboardProfile() {
  const user = state.currentUser || {};
  const staff = user.staffId ? getStaffById(user.staffId) : null;
  return {
    name: staff?.fullName || user.name || getRoleLabel(user.role || 'receptionist'),
    role: staff?.role || user.staffRole || user.role || 'receptionist',
    roleLabel: staff ? getStaffRoleLabel(staff.role) : getRoleLabel(user.role || 'receptionist'),
    shiftLabel: staff ? getStaffShiftLabel(staff.shift || 'flexible') : getStaffShiftLabel(user.shift || 'flexible'),
    permissions: Array.isArray(staff?.permissions) ? staff.permissions : (Array.isArray(user.permissions) ? user.permissions : [])
  };
}

function renderStaffFrontdeskButton(options = {}, component = 'staff-frontdesk-action-button') {
  const ui = staffFrontdeskUi();
  const attrs = {
    ...getManagerDashboardAttrs(options),
    'data-ui-component': component,
    'data-ui-centralized': 'phase114-staff-frontdesk-centralization'
  };
  const buttonOptions = {
    label: options.label || '',
    tone: options.tone || 'ghost',
    size: 'small',
    action: options.action || undefined,
    icon: icon(options.iconName || options.icon || 'dashboard'),
    className: ['staff-frontdesk-central-button', options.className].filter(Boolean).join(' '),
    attrs
  };
  if (ui?.renderButton) return ui.renderButton(buttonOptions);
  return `<button class="btn small ${h(buttonOptions.tone)} staff-frontdesk-central-button" type="button"${staffFrontdeskAttrs(attrs)}>${buttonOptions.icon}${h(buttonOptions.label)}</button>`;
}

function renderStaffFrontdeskActions(children, className = '', component = 'staff-frontdesk-actions') {
  const ui = staffFrontdeskUi();
  const attrs = {
    'data-ui-component': component,
    'data-ui-centralized': 'phase114-staff-frontdesk-centralization'
  };
  if (ui?.renderActions) {
    return ui.renderActions({
      children,
      className: ['staff-frontdesk-central-actions', className].filter(Boolean).join(' '),
      attrs
    });
  }
  return `<div class="ds-actions staff-frontdesk-central-actions ${h(className)}"${staffFrontdeskAttrs(attrs)}>${children || ''}</div>`;
}

function renderStaffFrontdeskHead({ title = '', text = '', kicker = '', kickerIcon = 'dashboard', actions = '', className = '', component = 'staff-frontdesk-page-head' } = {}) {
  const ui = staffFrontdeskUi();
  const attrs = {
    'data-ui-component': component,
    'data-ui-centralized': 'phase114-staff-frontdesk-centralization'
  };
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title,
      text,
      kicker,
      kickerIcon: icon(kickerIcon),
      actions,
      className: ['staff-frontdesk-central-head', className].filter(Boolean).join(' '),
      attrs
    });
  }
  return `<div class="section-head ds-section-head staff-frontdesk-central-head ${h(className)}"${staffFrontdeskAttrs(attrs)}><div><span class="staff-role-kicker">${icon(kickerIcon)}${h(kicker)}</span><h2>${h(title)}</h2>${text ? `<p class="helper">${h(text)}</p>` : ''}</div>${actions ? `<div class="ds-actions">${actions}</div>` : ''}</div>`;
}

function renderStaffFrontdeskSurface({ body = '', head = '', className = '', component = 'staff-frontdesk-surface', tag = 'section' } = {}) {
  const ui = staffFrontdeskUi();
  const attrs = {
    'data-ui-component': component,
    'data-ui-centralized': 'phase114-staff-frontdesk-centralization'
  };
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag,
      head,
      body,
      className: ['staff-frontdesk-central-surface', className].filter(Boolean).join(' '),
      attrs
    });
  }
  return `<${tag} class="ds-card ds-surface staff-frontdesk-central-surface ${h(className)}"${staffFrontdeskAttrs(attrs)}>${head}${body}</${tag}>`;
}

function renderStaffFrontdeskPanelTitle(title = '', iconName = 'dashboard', component = 'staff-frontdesk-panel-title') {
  const ui = staffFrontdeskUi();
  const attrs = {
    'data-ui-component': component,
    'data-ui-centralized': 'phase114-staff-frontdesk-centralization'
  };
  if (ui?.renderPanelTitle) {
    return ui.renderPanelTitle({
      title,
      icon: icon(iconName),
      className: 'staff-frontdesk-central-panel-title',
      attrs
    });
  }
  return `<div class="form-section-title ds-form-section-title staff-frontdesk-central-panel-title"${staffFrontdeskAttrs(attrs)}>${icon(iconName)}<span>${h(title)}</span></div>`;
}

function renderStaffFrontdeskMetricCard(options = {}, component = 'staff-frontdesk-metric-card') {
  const ui = staffFrontdeskUi();
  const attrs = {
    ...getManagerDashboardAttrs(options),
    'data-ui-component': component,
    'data-ui-centralized': 'phase114-staff-frontdesk-centralization'
  };
  const cardOptions = {
    tag: 'button',
    title: options.title,
    value: options.value,
    note: options.note,
    tone: options.tone || '',
    icon: icon(options.iconName || options.icon || 'dashboard', 'dashboard-card-svg'),
    className: ['manager-dashboard-smart-card', 'staff-frontdesk-central-metric-card', options.className].filter(Boolean).join(' '),
    attrs
  };
  if (ui?.renderMetricCard) return ui.renderMetricCard(cardOptions);
  return `
    <button class="dashboard-card ds-card ds-metric-card manager-dashboard-smart-card staff-frontdesk-central-metric-card ${h(options.tone || '')}" type="button"${staffFrontdeskAttrs(attrs)}>
      <span class="dashboard-card-icon fandqi-ui-metric-icon">${cardOptions.icon}</span>
      <span class="dashboard-card-title fandqi-ui-metric-title">${h(options.title || '')}</span>
      <strong class="fandqi-ui-metric-value">${h(options.value ?? '')}</strong>
      <small class="fandqi-ui-metric-note">${h(options.note || '')}</small>
    </button>
  `;
}

function renderStaffFrontdeskEmptyState({ title = '', text = '', component = 'frontdesk-empty-state' } = {}) {
  const ui = staffFrontdeskUi();
  const attrs = {
    'data-ui-component': component,
    'data-ui-centralized': 'phase114-staff-frontdesk-centralization'
  };
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title,
      text,
      icon: icon('clipboardCheck'),
      className: 'front-desk-empty frontdesk-central-empty-state',
      attrs
    });
  }
  return `<div class="front-desk-empty frontdesk-central-empty-state"${staffFrontdeskAttrs(attrs)}><div><strong>${h(title)}</strong><span>${h(text)}</span></div></div>`;
}

function renderStaffOperationalDashboardPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const profile = getStaffDashboardProfile();
  const metrics = getManagerDashboardMetrics(hotel);
  const role = state.currentUser?.role || 'receptionist';
  const roleQuickActions = {
    receptionist: [
      { icon: 'plus', label: t('managerDashboard.quick.newReservation', 'حجز جديد'), action: 'new_reservation', tone: 'primary' },
      { icon: 'clock', label: t('managerDashboard.quick.arrivals', 'وصول اليوم'), page: 'check_in_out', tab: 'arrivals', tone: 'warning' },
      { icon: 'externalLink', label: t('checkInOut.tabs.departures', 'المغادرة'), page: 'check_in_out', tab: 'departures', tone: 'ghost' },
      { icon: 'creditCard', label: t('page.payments', 'المدفوعات'), page: 'payments', tone: 'accent' }
    ],
    cashier: [
      { icon: 'creditCard', label: t('page.payments', 'المدفوعات'), page: 'payments', tone: 'primary' },
      { icon: 'restaurant', label: t('page.room_service', 'المطعم والكافتريا'), page: 'room_service', tone: 'luxury' },
      { icon: 'fileText', label: t('page.reports', 'التقارير'), page: 'reports', reportType: 'financial', tone: 'ghost' }
    ],
    housekeeping: [
      { icon: 'checkCircle', label: t('page.housekeeping', 'التنظيف'), page: 'housekeeping', housekeepingStatus: 'cleaning', tone: 'primary' },
      { icon: 'building', label: t('room.status.available', 'متاحة'), page: 'rooms', roomStatus: 'available', tone: 'success' },
      { icon: 'clock', label: t('room.status.cleaning', 'تحت التنظيف'), page: 'housekeeping', housekeepingStatus: 'cleaning', tone: 'warning' }
    ],
    maintenance: [
      { icon: 'shieldAlert', label: t('page.maintenance', 'الصيانة'), page: 'maintenance', maintenanceStatus: 'open', tone: 'primary' },
      { icon: 'building', label: t('page.rooms', 'الغرف'), page: 'rooms', tone: 'ghost' }
    ],
    restaurant: [
      { icon: 'restaurant', label: t('page.room_service', 'المطعم والكافتريا'), page: 'room_service', tone: 'primary' },
      { icon: 'creditCard', label: t('page.payments', 'المدفوعات'), page: 'payments', paymentMethod: 'room_account', tone: 'warning' }
    ],
    room_service: [
      { icon: 'restaurant', label: t('page.room_service', 'المطعم والكافتريا'), page: 'room_service', tone: 'primary' },
      { icon: 'creditCard', label: t('page.payments', 'المدفوعات'), page: 'payments', paymentMethod: 'room_account', tone: 'warning' }
    ],
    supervisor: [
      { icon: 'dashboard', label: t('page.front_desk', 'الاستقبال'), page: 'front_desk', tone: 'primary' },
      { icon: 'clock', label: t('managerDashboard.quick.arrivals', 'وصول اليوم'), page: 'check_in_out', tab: 'arrivals', tone: 'warning' },
      { icon: 'shieldAlert', label: t('page.maintenance', 'الصيانة'), page: 'maintenance', maintenanceStatus: 'open', tone: 'ghost' },
      { icon: 'fileText', label: t('page.reports', 'التقارير'), page: 'reports', tone: 'ghost' }
    ]
  };
  const quickActions = roleQuickActions[role] || roleQuickActions.receptionist;
  const cardsByRole = {
    receptionist: [
      { icon: 'clock', title: t('managerDashboard.smart.arrivalsToday', 'وصول اليوم'), value: metrics.arrivalsToday, note: t('managerDashboard.smartNotes.arrivalsToday', 'نزلاء يجب تسجيل دخولهم'), page: 'check_in_out', tab: 'arrivals', tone: metrics.arrivalsToday ? 'warning' : 'success' },
      { icon: 'users', title: t('managerDashboard.smart.inHouse', 'مقيمون حاليًا'), value: metrics.inHouse, note: t('managerDashboard.smartNotes.inHouse', 'حجوزات داخل الفندق الآن'), page: 'check_in_out', tab: 'in_house' },
      { icon: 'externalLink', title: t('managerDashboard.smart.departuresToday', 'مغادرة اليوم'), value: metrics.departuresToday, note: t('managerDashboard.smartNotes.departuresToday', 'تحقق مالي قبل الخروج'), page: 'check_in_out', tab: 'departures', tone: metrics.departuresToday ? 'warning' : '' },
      { icon: 'alertCircle', title: t('managerDashboard.smart.balanceDue', 'متبقي مالي'), value: moneyValue(metrics.balanceDue, metrics.currency), note: `${metrics.withBalance} ${t('managerDashboard.smartNotes.withBalance', 'حجز عليه مبلغ')}`, page: 'payments', paymentMethod: 'all', tone: metrics.balanceDue ? 'danger' : 'success' }
    ],
    cashier: [
      { icon: 'creditCard', title: t('managerDashboard.smart.balanceDue', 'متبقي مالي'), value: moneyValue(metrics.balanceDue, metrics.currency), note: `${metrics.withBalance} ${t('managerDashboard.smartNotes.withBalance', 'حجز عليه مبلغ')}`, page: 'payments', paymentMethod: 'all', tone: metrics.balanceDue ? 'danger' : 'success' },
      { icon: 'restaurant', title: t('managerDashboard.smart.foodOrdersToday', 'طلبات اليوم'), value: metrics.foodOrdersToday, note: `${moneyValue(metrics.foodRevenueToday, metrics.currency)} ${t('managerDashboard.smartNotes.foodRevenueToday', 'إيراد اليوم')}`, page: 'room_service', tone: 'luxury' },
      { icon: 'creditCard', title: t('managerDashboard.smart.roomAccount', 'على حساب الغرف'), value: moneyValue(metrics.roomAccountTotal, metrics.currency), note: t('managerDashboard.smartNotes.roomAccount', 'طلبات مرحلة على حساب الحجز'), page: 'payments', paymentMethod: 'room_account', tone: metrics.roomAccountTotal ? 'warning' : '' }
    ],
    housekeeping: [
      { icon: 'checkCircle', title: t('managerDashboard.smart.cleaningRooms', 'غرف تحت التنظيف'), value: metrics.roomsCleaning, note: t('managerDashboard.smartNotes.cleaningRooms', 'بعد المغادرة قبل الإتاحة'), page: 'housekeeping', housekeepingStatus: 'cleaning', tone: metrics.roomsCleaning ? 'warning' : 'success' },
      { icon: 'building', title: t('managerDashboard.smart.roomsAvailable', 'غرف متاحة'), value: metrics.roomsAvailable, note: t('managerDashboard.smartNotes.roomsAvailable', 'جاهزة لحجز جديد'), page: 'rooms', roomStatus: 'available', tone: 'success' },
      { icon: 'user', title: t('managerDashboard.smart.roomsOccupied', 'غرف مشغولة'), value: metrics.roomsOccupied, note: t('managerDashboard.smartNotes.roomsOccupied', 'مرتبطة بنزلاء حاليين'), page: 'rooms', roomStatus: 'occupied' }
    ],
    maintenance: [
      { icon: 'shieldAlert', title: t('managerDashboard.smart.maintenanceOpen', 'بلاغات صيانة مفتوحة'), value: metrics.maintenanceOpen, note: metrics.maintenanceUrgent ? `${metrics.maintenanceUrgent} ${t('managerDashboard.smartNotes.urgentMaintenance', 'عاجل')}` : t('managerDashboard.smartNotes.maintenanceOpen', 'تحتاج متابعة تشغيلية'), page: 'maintenance', maintenanceStatus: 'open', tone: metrics.maintenanceOpen ? 'warning' : 'success' },
      { icon: 'building', title: t('page.rooms', 'الغرف'), value: metrics.roomsTotal, note: t('managerDashboard.smartNotes.roomsOverview', 'كل غرف الفندق'), page: 'rooms' },
      { icon: 'checkCircle', title: t('managerDashboard.smart.cleaningRooms', 'غرف تحت التنظيف'), value: metrics.roomsCleaning, note: t('managerDashboard.smartNotes.cleaningRooms', 'بعد المغادرة قبل الإتاحة'), page: 'housekeeping', housekeepingStatus: 'cleaning', tone: metrics.roomsCleaning ? 'warning' : 'success' }
    ],
    restaurant: [],
    room_service: []
  };
  cardsByRole.restaurant = cardsByRole.cashier;
  cardsByRole.room_service = cardsByRole.cashier;
  const cards = role === 'supervisor' ? [
    { icon: 'calendar', title: t('managerDashboard.smart.reservationsToday', 'حجوزات اليوم'), value: metrics.reservationsToday, note: t('managerDashboard.smartNotes.reservationsToday', 'وصول أو مغادرة أو تعديل اليوم'), page: 'reservations', tone: 'accent' },
    { icon: 'clock', title: t('managerDashboard.smart.arrivalsToday', 'وصول اليوم'), value: metrics.arrivalsToday, note: t('managerDashboard.smartNotes.arrivalsToday', 'نزلاء يجب تسجيل دخولهم'), page: 'check_in_out', tab: 'arrivals', tone: metrics.arrivalsToday ? 'warning' : 'success' },
    { icon: 'shieldAlert', title: t('managerDashboard.smart.maintenanceOpen', 'بلاغات صيانة مفتوحة'), value: metrics.maintenanceOpen, note: t('managerDashboard.smartNotes.maintenanceOpen', 'تحتاج متابعة تشغيلية'), page: 'maintenance', maintenanceStatus: 'open', tone: metrics.maintenanceOpen ? 'warning' : 'success' },
    { icon: 'alertCircle', title: t('managerDashboard.smart.balanceDue', 'متبقي مالي'), value: moneyValue(metrics.balanceDue, metrics.currency), note: `${metrics.withBalance} ${t('managerDashboard.smartNotes.withBalance', 'حجز عليه مبلغ')}`, page: 'payments', paymentMethod: 'all', tone: metrics.balanceDue ? 'danger' : 'success' }
  ] : (cardsByRole[role] || cardsByRole.receptionist);

  const head = renderStaffFrontdeskHead({
    title: t('staffDashboard.title', 'لوحة الموظف التشغيلية'),
    text: t('staffDashboard.description', 'واجهة مختصرة تعرض فقط المهام المناسبة لدور الموظف وصلاحياته داخل الفندق.'),
    kicker: `${profile.roleLabel} • ${profile.shiftLabel}`,
    kickerIcon: getStaffRoleIconName(profile.role),
    actions: `<span class="manager-dashboard-date-chip ds-badge" data-ui-component="staff-operational-hotel-chip">${icon('building')}${h(hotel.name || '-')}</span>`,
    className: 'dashboard-head manager-dashboard-head staff-operational-head',
    component: 'staff-operational-page-head'
  });
  const quickbar = renderStaffFrontdeskActions(
    quickActions.map(action => renderStaffFrontdeskButton(action, 'staff-operational-quick-button')).join(''),
    'manager-dashboard-quickbar staff-quickbar',
    'staff-operational-quick-actions'
  );
  const workPanelHead = `
    <div class="dashboard-panel-head ds-section-head compact" data-ui-component="staff-operational-panel-head">
      <div class="fandqi-ui-section-copy">
        <h3>${h(t('staffDashboard.todayWork', 'مهام اليوم'))}</h3>
        <span>${h(profile.name)}</span>
      </div>
    </div>
  `;
  const workPanel = renderStaffFrontdeskSurface({
    className: 'dashboard-panel manager-dashboard-panel staff-operational-work-panel',
    component: 'staff-operational-work-panel',
    body: `${workPanelHead}<div class="dashboard-grid manager-dashboard-grid manager-dashboard-smart-grid staff-dashboard-grid" data-ui-component="staff-operational-metric-grid">${cards.map(card => renderStaffFrontdeskMetricCard(card, 'staff-operational-metric-card')).join('')}</div>`
  });

  return `
    <div class="dashboard-page manager-dashboard-page staff-operational-dashboard-page staff-operational-central-page" data-ui-page="staff-operational-dashboard" data-ui-centralized="phase114-staff-frontdesk-centralization">
      ${head}
      ${quickbar}
      ${workPanel}
    </div>
  `;
}

function renderFrontDeskQueueItem(reservation) {
  const guestName = getReservationGuestDisplayName(reservation);
  const room = getRoomById(reservation.roomId);
  const due = getReservationAmountDue(reservation);
  const currency = readHotelSettings(reservation.hotelId).defaultCurrency || 'USD';
  const settlementStatus = due > 0 ? 'danger' : 'success';
  return renderStaffFrontdeskSurface({
    tag: 'article',
    className: 'front-desk-queue-item frontdesk-central-queue-item',
    component: 'frontdesk-queue-item',
    body: `
      <div class="frontdesk-queue-identity" data-ui-component="frontdesk-queue-identity">
        <strong>${h(guestName || '-')}</strong>
        <span>${h(room?.number ? `${t('reservation.room', 'الغرفة')} ${room.number}` : t('reservation.noRoom', 'بدون غرفة'))}</span>
      </div>
      <div class="frontdesk-queue-status" data-ui-component="frontdesk-queue-status">
        <small>${h(reservation.checkInDate || '-')} → ${h(reservation.checkOutDate || '-')}</small>
        <em class="${due > 0 ? 'front-desk-due' : 'front-desk-clear'}" data-status="${h(settlementStatus)}">${h(due > 0 ? moneyValue(due, currency) : t('reservation.paid', 'مدفوع'))}</em>
      </div>
    `
  });
}

function renderFrontDeskReservationQueue(reservations, title, emptyText) {
  if (!reservations.length) {
    return renderStaffFrontdeskEmptyState({ title, text: emptyText, component: 'frontdesk-empty-state' });
  }
  return `
    <div class="front-desk-queue-list frontdesk-central-queue-list" data-ui-component="frontdesk-queue-list">
      ${reservations.slice(0, 6).map(renderFrontDeskQueueItem).join('')}
    </div>
  `;
}

function renderFrontDeskQueuePanel({ title = '', iconName = 'clipboardCheck', body = '', component = 'frontdesk-queue-panel' } = {}) {
  return renderStaffFrontdeskSurface({
    className: 'front-desk-panel frontdesk-central-queue-panel',
    component,
    head: renderStaffFrontdeskPanelTitle(title, iconName, `${component}-title`),
    body
  });
}

function renderFrontDeskPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const metrics = getManagerDashboardMetrics(hotel);
  const date = getOperationalDate();
  const reservations = getHotelReservations(hotel.id);
  const arrivals = reservations.filter(reservation => getReservationTimelineStatus(reservation, date) === 'arrival_due');
  const departures = reservations.filter(reservation => getReservationTimelineStatus(reservation, date) === 'departure_due');
  const inHouse = reservations.filter(reservation => getReservationTimelineStatus(reservation, date) === 'in_house');
  const actions = renderStaffFrontdeskActions([
    renderStaffFrontdeskButton({ icon: 'plus', label: t('managerDashboard.quick.newReservation', 'حجز جديد'), action: 'new_reservation', tone: 'primary' }, 'frontdesk-head-action-button'),
    renderStaffFrontdeskButton({ icon: 'creditCard', label: t('page.payments', 'المدفوعات'), page: 'payments', tone: 'ghost' }, 'frontdesk-head-action-button')
  ].join(''), 'front-desk-actions', 'frontdesk-head-actions');
  const cards = [
    { icon: 'clock', title: t('managerDashboard.smart.arrivalsToday', 'وصول اليوم'), value: metrics.arrivalsToday, note: t('managerDashboard.smartNotes.arrivalsToday', 'نزلاء يجب تسجيل دخولهم'), page: 'check_in_out', tab: 'arrivals', tone: metrics.arrivalsToday ? 'warning' : 'success' },
    { icon: 'users', title: t('managerDashboard.smart.inHouse', 'مقيمون حاليًا'), value: metrics.inHouse, note: t('managerDashboard.smartNotes.inHouse', 'حجوزات داخل الفندق الآن'), page: 'check_in_out', tab: 'in_house' },
    { icon: 'externalLink', title: t('managerDashboard.smart.departuresToday', 'مغادرة اليوم'), value: metrics.departuresToday, note: t('managerDashboard.smartNotes.departuresToday', 'تحقق مالي قبل الخروج'), page: 'check_in_out', tab: 'departures', tone: metrics.departuresToday ? 'warning' : '' },
    { icon: 'alertCircle', title: t('managerDashboard.smart.balanceDue', 'متبقي مالي'), value: moneyValue(metrics.balanceDue, metrics.currency), note: `${metrics.withBalance} ${t('managerDashboard.smartNotes.withBalance', 'حجز عليه مبلغ')}`, page: 'payments', paymentMethod: 'all', tone: metrics.balanceDue ? 'danger' : 'success' }
  ];
  return `
    <div class="front-desk-page frontdesk-central-page" data-ui-page="front-desk" data-ui-centralized="phase114-staff-frontdesk-centralization">
      ${renderStaffFrontdeskHead({
        title: t('frontDesk.title', 'مركز الاستقبال اليومي'),
        text: t('frontDesk.description', 'وصول، مغادرة، مقيمون، ذمم مالية، واختصارات تشغيلية في واجهة واحدة.'),
        kicker: t('page.front_desk', 'الاستقبال'),
        kickerIcon: 'dashboard',
        actions,
        className: 'front-desk-head',
        component: 'frontdesk-page-head'
      })}
      <div class="dashboard-grid manager-dashboard-grid front-desk-stats frontdesk-central-stats" data-ui-component="frontdesk-metric-grid">
        ${cards.map(card => renderStaffFrontdeskMetricCard(card, 'frontdesk-metric-card')).join('')}
      </div>
      <div class="front-desk-columns frontdesk-central-columns" data-ui-component="frontdesk-queue-columns">
        ${renderFrontDeskQueuePanel({ title: t('checkInOut.tabs.arrivals', 'الوصول'), iconName: 'clock', component: 'frontdesk-arrivals-panel', body: renderFrontDeskReservationQueue(arrivals, t('frontDesk.noArrivalsTitle', 'لا يوجد وصول الآن'), t('frontDesk.noArrivalsText', 'أي حجز موعد دخوله اليوم سيظهر هنا.')) })}
        ${renderFrontDeskQueuePanel({ title: t('checkInOut.tabs.inHouse', 'داخل الفندق'), iconName: 'users', component: 'frontdesk-inhouse-panel', body: renderFrontDeskReservationQueue(inHouse, t('frontDesk.noInHouseTitle', 'لا يوجد مقيمون حاليًا'), t('frontDesk.noInHouseText', 'الحجوزات المسجلة دخول تظهر هنا.')) })}
        ${renderFrontDeskQueuePanel({ title: t('checkInOut.tabs.departures', 'المغادرة'), iconName: 'externalLink', component: 'frontdesk-departures-panel', body: renderFrontDeskReservationQueue(departures, t('frontDesk.noDeparturesTitle', 'لا توجد مغادرة اليوم'), t('frontDesk.noDeparturesText', 'أي حجز موعد خروجه اليوم سيظهر هنا.')) })}
      </div>
    </div>
  `;
}
