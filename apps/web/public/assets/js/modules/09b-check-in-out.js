function checkioFeature() {
  return window.FandqiCheckioFeature || null;
}

function getOperationalDate() {
  const value = state.checkInOutFilters?.date || todayISO();
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? value : todayISO();
}

function normalizeCheckInOutText(value) {
  const feature = checkioFeature();
  if (feature?.validators?.normalizeCheckInOutText) return feature.validators.normalizeCheckInOutText(value);
  return String(value || '').trim().toLowerCase();
}

function getReservationAmountDue(reservation) {
  const feature = checkioFeature();
  if (feature?.selectors?.getReservationAmountDue) return feature.selectors.getReservationAmountDue(reservation, getReservationFinancialTotal);
  return Math.max(0, getReservationFinancialTotal(reservation) - Number(reservation?.paidAmount || 0));
}

function getReservationTimelineStatus(reservation, date = getOperationalDate()) {
  const feature = checkioFeature();
  if (feature?.selectors?.getReservationTimelineStatus) return feature.selectors.getReservationTimelineStatus(reservation, date);
  const status = reservation?.status || 'pending';
  const checkIn = String(reservation?.checkInDate || '');
  const checkOut = String(reservation?.checkOutDate || '');
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'departed';
  if (status === 'checked_in') {
    if (checkOut && checkOut <= date) return 'departure_due';
    return 'in_house';
  }
  if (['pending', 'confirmed'].includes(status) && checkIn && checkIn <= date) return 'arrival_due';
  if (['pending', 'confirmed'].includes(status) && checkIn && checkIn > date) return 'upcoming';
  return status;
}

function getCheckInOutStatusLabel(status) {
  return t(`checkInOut.status.${status}`, status || '-');
}

function getCheckInOutTabLabel(tab) {
  return t(`checkInOut.tabs.${tab}`, tab || '-');
}

function getCheckInOutReservationGuests(reservation) {
  const feature = checkioFeature();
  if (feature?.selectors?.getReservationGuestsSummary) return feature.selectors.getReservationGuestsSummary(reservation);
  const adults = Number(reservation?.adultCompanionCount || reservation?.adultCompanions?.length || 0);
  const children = Number(reservation?.childrenCount || 0);
  const total = Number(reservation?.guestsCount || 1);
  return { total, adults, children };
}

function getCheckInOutFilteredReservations() {
  const hotel = getManagerHotel();
  if (!hotel) return [];
  const filters = state.checkInOutFilters || { tab: 'arrivals', search: '', room: 'all', date: todayISO() };
  const date = getOperationalDate();
  const reservations = getHotelReservations(hotel.id);
  const feature = checkioFeature();
  if (feature?.selectors?.filterCheckInOutReservations) {
    return feature.selectors.filterCheckInOutReservations(reservations, filters, {
      date,
      getRoomById,
      getTimelineStatus: getReservationTimelineStatus,
      getAmountDue: getReservationAmountDue,
      getGuestName: getReservationGuestDisplayName,
      getRoomLabel: getReservationRoomLabel,
      getReservationStatusLabel,
      getCheckInOutStatusLabel
    });
  }
  const search = normalizeCheckInOutText(filters.search);
  const tab = filters.tab || 'arrivals';
  return reservations.filter(reservation => {
    const room = getRoomById(reservation.roomId);
    const timelineStatus = getReservationTimelineStatus(reservation, date);
    const amountDue = getReservationAmountDue(reservation);
    const guestName = getReservationGuestDisplayName(reservation);
    const matchesSearch = !search || [
      guestName,
      reservation.reservationNo,
      reservation.nationalId,
      reservation.guestPhone,
      reservation.guestEmail,
      getReservationRoomLabel(room),
      getReservationStatusLabel(reservation.status),
      getCheckInOutStatusLabel(timelineStatus),
      reservation.actualCheckInAt,
      reservation.actualCheckOutAt
    ].some(value => normalizeCheckInOutText(value).includes(search));
    const matchesRoom = filters.room === 'all' || reservation.roomId === filters.room;
    const matchesTab =
      (tab === 'arrivals' && timelineStatus === 'arrival_due') ||
      (tab === 'in_house' && ['in_house', 'departure_due'].includes(timelineStatus)) ||
      (tab === 'departures' && timelineStatus === 'departure_due') ||
      (tab === 'log' && ['checked_in', 'completed'].includes(reservation.status)) ||
      (tab === 'attention' && (timelineStatus === 'departure_due' || amountDue > 0));
    return matchesSearch && matchesRoom && matchesTab;
  });
}

function checkioUi() {
  return window.FandqiUI || null;
}

function renderCheckioButton({ action = '', id = '', label = '', tone = 'ghost', iconName = '' }) {
  const ui = checkioUi();
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

function renderCheckioBadge(label, status, className = '') {
  const ui = checkioUi();
  if (ui?.renderBadge) {
    return ui.renderBadge({
      label,
      status: status || 'neutral',
      className,
      attrs: { 'data-checkio-status': status || '' }
    });
  }
  return `<span class="guest-stay-badge guest-stay-badge--${h(status || '')} ${h(className)}" data-checkio-status="${h(status || '')}">${h(label)}</span>`;
}


function renderCheckioSectionHead({ title, text = '', actions = '' } = {}) {
  const ui = checkioUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title,
      text,
      actions,
      className: 'checkio-central-head',
      attrs: { 'data-ui-component': 'checkio-page-head' }
    });
  }
  return `<div class="section-head checkio-central-head" data-ui-component="checkio-page-head"><div><h2>${h(title)}</h2>${text ? `<p class="helper">${h(text)}</p>` : ''}</div>${actions ? `<div class="ds-actions">${actions}</div>` : ''}</div>`;
}

function renderCheckioSurface({ body = '', head = '', className = '', component = 'checkio-surface', tag = 'section' } = {}) {
  const ui = checkioUi();
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag,
      head,
      body,
      className: ['checkio-central-surface', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component }
    });
  }
  return `<${tag} class="ds-card ds-surface checkio-central-surface ${h(className)}" data-ui-component="${h(component)}">${head}${body}</${tag}>`;
}

function renderCheckioActions(children, className = '', component = 'checkio-actions') {
  const ui = checkioUi();
  if (ui?.renderActions) {
    return ui.renderActions({
      children,
      className: ['checkio-central-actions', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component }
    });
  }
  return `<div class="ds-actions checkio-central-actions ${h(className)}" data-ui-component="${h(component)}">${children || ''}</div>`;
}

function renderCheckioField({ label = '', iconName = '', control = '', className = '', component = 'checkio-field' } = {}) {
  const ui = checkioUi();
  const labelHtml = label ? fieldLabel(iconName || 'filter', h(label)) : '';
  if (ui?.renderField) {
    return ui.renderField({
      labelHtml,
      control,
      className: ['checkio-central-field', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component }
    });
  }
  return `<div class="field ds-field checkio-central-field ${h(className)}" data-ui-component="${h(component)}">${labelHtml}${control}</div>`;
}

function renderCheckioMetricCard(item) {
  const ui = checkioUi();
  const options = {
    tag: 'article',
    title: item.label,
    value: item.value,
    note: item.note,
    icon: icon(item.iconName),
    tone: `checkio-summary-card--${item.key}`,
    className: 'checkio-summary-card checkio-central-summary-card',
    attrs: { 'data-ui-component': 'checkio-summary-card', 'data-checkio-summary': item.key }
  };
  if (ui?.renderMetricCard) return ui.renderMetricCard(options);
  return `<article class="checkio-summary-card checkio-central-summary-card checkio-summary-card--${h(item.key)}" data-ui-component="checkio-summary-card" data-checkio-summary="${h(item.key)}"><div class="guest-summary-icon">${icon(item.iconName)}</div><div class="guest-summary-content"><span class="guest-summary-label">${h(item.label)}</span><strong class="guest-summary-value">${h(String(item.value))}</strong><small class="guest-summary-note">${h(item.note)}</small></div></article>`;
}

function renderCheckioMetaItem(iconName, value, className = '') {
  return `<div class="guest-meta-item checkio-meta-item ds-meta-item ${h(className)}" data-ui-component="checkio-meta-item">${icon(iconName)}<span>${h(value || '-')}</span></div>`;
}

function renderCheckioFilterPanel({ rooms = [], filters = {} } = {}) {
  const body = `
    <div class="checkio-central-filter-grid ds-form-grid" data-ui-component="checkio-filter-grid">
      ${renderCheckioField({
        label: t('checkInOut.filters.search'),
        iconName: 'search',
        className: 'field-search checkio-central-search-field',
        component: 'checkio-search-field',
        control: `<input class="input ds-control" id="checkioSearch" value="${h(filters.search || '')}" autocomplete="off">`
      })}
      ${renderCheckioField({
        label: t('checkInOut.filters.date'),
        iconName: 'calendar',
        component: 'checkio-date-field',
        control: `<input class="input ds-control" id="checkioDateFilter" type="date" value="${h(getOperationalDate())}">`
      })}
      ${renderCheckioField({
        label: t('checkInOut.filters.room'),
        iconName: 'building',
        component: 'checkio-room-filter',
        control: `<select class="select ds-control" id="checkioRoomFilter">
          <option value="all" ${filters.room === 'all' ? 'selected' : ''}>${h(t('guests.filters.all'))}</option>
          ${rooms.map(room => `<option value="${h(room.id)}" ${filters.room === room.id ? 'selected' : ''}>${h(getReservationRoomLabel(room))}</option>`).join('')}
        </select>`
      })}
    </div>`;
  return renderCheckioSurface({ body, className: 'checkio-central-filter-panel checkio-filters-bar compact-filters-bar', component: 'checkio-filter-panel' });
}

function getCheckioActionTone(action = '', due = 0) {
  const map = {
    'checkio-check-in': 'primary',
    'checkio-check-out': 'success',
    'checkio-blocked-check-out': 'warning',
    'checkio-view-reservation': 'accent',
    'checkio-print-reservation': 'luxury',
    'checkio-print-account': 'luxury'
  };
  return map[action] || (due > 0 ? 'warning' : 'neutral');
}

function getCheckioActionIcon(action = '') {
  const map = {
    'checkio-check-in': 'checkCircle',
    'checkio-check-out': 'externalLink',
    'checkio-blocked-check-out': 'alertCircle',
    'checkio-view-reservation': 'eye',
    'checkio-print-reservation': 'print',
    'checkio-print-account': 'receipt'
  };
  return map[action] || 'clock';
}

function renderCheckioActionButton(action, reservation, label, due = 0) {
  return renderCheckioButton({
    action,
    id: reservation.id,
    label,
    tone: getCheckioActionTone(action, due),
    iconName: getCheckioActionIcon(action)
  });
}

function renderCheckioActionButtons(reservation, canCheckIn, canCheckOut, due) {
  const actions = [];
  if (canCheckIn) actions.push(renderCheckioActionButton('checkio-check-in', reservation, t('checkInOut.actions.checkIn'), due));
  if (canCheckOut && due > 0) actions.push(renderCheckioActionButton('checkio-blocked-check-out', reservation, t('checkInOut.actions.checkOut'), due));
  if (canCheckOut && due <= 0) actions.push(renderCheckioActionButton('checkio-check-out', reservation, t('checkInOut.actions.checkOut'), due));
  actions.push(renderCheckioActionButton('checkio-view-reservation', reservation, t('reservation.actions.view'), due));
  actions.push(renderCheckioActionButton('checkio-print-reservation', reservation, t('reservation.actions.print'), due));
  actions.push(renderCheckioActionButton('checkio-print-account', reservation, t('accountStatement.printShort', 'كشف حساب'), due));
  return renderCheckioActions(actions.join(''), 'checkio-card-actions row-actions checkio-card-actions--central', 'checkio-card-actions');
}


function getCheckInOutSummary(reservations) {
  const date = getOperationalDate();
  const feature = checkioFeature();
  if (feature?.selectors?.summarizeCheckInOut) {
    return feature.selectors.summarizeCheckInOut(reservations, {
      date,
      getTimelineStatus: getReservationTimelineStatus,
      getAmountDue: getReservationAmountDue
    });
  }
  return reservations.reduce((acc, reservation) => {
    const status = getReservationTimelineStatus(reservation, date);
    const due = getReservationAmountDue(reservation);
    if (status === 'arrival_due') acc.arrivals += 1;
    if (['in_house', 'departure_due'].includes(status)) acc.inHouse += 1;
    if (status === 'departure_due') acc.departures += 1;
    if (due > 0 && ['arrival_due', 'in_house', 'departure_due'].includes(status)) acc.withBalance += 1;
    acc.balance += due;
    return acc;
  }, { arrivals: 0, inHouse: 0, departures: 0, withBalance: 0, balance: 0 });
}

function renderCheckInOutSummaryStrip(reservations, currency) {
  const summary = getCheckInOutSummary(reservations);
  const cards = [
    { key: 'arrivals', iconName: 'calendar', label: t('checkInOut.cards.arrivals'), note: t('checkInOut.cards.arrivalsNote'), value: summary.arrivals },
    { key: 'inHouse', iconName: 'users', label: t('checkInOut.cards.inHouse'), note: t('checkInOut.cards.inHouseNote'), value: summary.inHouse },
    { key: 'departures', iconName: 'clock', label: t('checkInOut.cards.departures'), note: t('checkInOut.cards.departuresNote'), value: summary.departures },
    { key: 'balance', iconName: 'currency', label: t('checkInOut.cards.balance'), note: t('checkInOut.cards.balanceNote'), value: `${summary.balance} ${currency || ''}` }
  ];
  return `
    <div class="checkio-summary-grid ds-summary-grid" data-ui-component="checkio-summary-grid">
      ${cards.map(renderCheckioMetricCard).join('')}
    </div>
  `;
}

function renderCheckInOutTabs() {
  const tabs = [
    { id: 'arrivals', iconName: 'calendar' },
    { id: 'in_house', iconName: 'users' },
    { id: 'departures', iconName: 'clock' },
    { id: 'attention', iconName: 'alertCircle' },
    { id: 'log', iconName: 'fileText' }
  ];
  const active = state.checkInOutFilters?.tab || 'arrivals';
  const ui = checkioUi();
  if (ui?.renderTabs) {
    return ui.renderTabs({
      active,
      className: 'checkio-tabs',
      tabs: tabs.map(tab => ({
        id: tab.id,
        label: getCheckInOutTabLabel(tab.id),
        icon: icon(tab.iconName),
        attrs: { 'data-checkio-tab': tab.id }
      }))
    }).replace('role="tablist"', `role="tablist" aria-label="${h(t('checkInOut.tabsLabel'))}" data-ui-migrated="checkio-tabs"`);
  }
  return `
    <div class="checkio-tabs" role="tablist" aria-label="${h(t('checkInOut.tabsLabel'))}" data-ui-migrated="checkio-tabs">
      ${tabs.map(tab => `
        <button class="checkio-tab ${tab.id === active ? 'active' : ''}" type="button" data-checkio-tab="${h(tab.id)}" role="tab" aria-selected="${tab.id === active ? 'true' : 'false'}">
          ${icon(tab.iconName)}<span>${h(getCheckInOutTabLabel(tab.id))}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderCheckInOutEmpty() {
  const tab = state.checkInOutFilters?.tab || 'arrivals';
  const ui = checkioUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title: t(`checkInOut.empty.${tab}.title`, t('checkInOut.emptyTitle')),
      text: t(`checkInOut.empty.${tab}.text`, t('checkInOut.emptyText')),
      icon: icon('calendar'),
      className: 'hotels-empty checkio-empty'
    });
  }
  return `
    <div class="empty-panel hotels-empty checkio-empty">
      <div>
        <h2>${h(t(`checkInOut.empty.${tab}.title`, t('checkInOut.emptyTitle')))}</h2>
        <p>${h(t(`checkInOut.empty.${tab}.text`, t('checkInOut.emptyText')))}</p>
      </div>
    </div>
  `;
}

function renderCheckInOutTimeline(reservation) {
  const pieces = [];
  if (reservation.actualCheckInAt) pieces.push(`${t('checkInOut.fields.actualCheckIn')}: ${reservation.actualCheckInAt}`);
  if (reservation.actualCheckOutAt) pieces.push(`${t('checkInOut.fields.actualCheckOut')}: ${reservation.actualCheckOutAt}`);
  if (!pieces.length) pieces.push(t('checkInOut.noActualTimes'));
  return pieces.join(' · ');
}

function renderCheckioReservationCard(reservation, roomColorMap, date) {
  const room = getRoomById(reservation.roomId);
  const guestName = getReservationGuestDisplayName(reservation);
  const timelineStatus = getReservationTimelineStatus(reservation, date);
  const due = getReservationAmountDue(reservation);
  const guests = getCheckInOutReservationGuests(reservation);
  const roomEntry = { reservation, room, roomLabel: getReservationRoomLabel(room) };
  const colorClass = getGuestRoomColorClass(roomEntry, roomColorMap);
  const canCheckIn = ['pending', 'confirmed'].includes(reservation.status || 'pending');
  const canCheckOut = reservation.status === 'checked_in';
  return `
    <article class="checkio-card ${h(colorClass)} checkio-card--${h(timelineStatus)}" data-ui-component="checkio-card" data-ui-migrated="checkio-card" data-checkio-status="${h(timelineStatus)}">
      <header class="checkio-card-top" data-ui-component="checkio-card-head">
        <div class="guest-card-title-wrap checkio-card-title-wrap">
          ${renderPersonAvatar('', guestName, 'guest-card-avatar checkio-card-avatar')}
          <div class="checkio-card-title-copy">
            <span class="reservation-number-chip">${h(t('reservation.form.number'))}: ${h(reservation.reservationNo || '-')}</span>
            <h3>${h(guestName)}</h3>
            <p>${h(reservation.nationalId || reservation.guestPhone || '-')}</p>
          </div>
        </div>
        ${renderCheckioBadge(getCheckInOutStatusLabel(timelineStatus), timelineStatus, `guest-stay-badge guest-stay-badge--${timelineStatus}`)}
      </header>

      <div class="checkio-room-band" data-ui-component="checkio-room-band">
        <div>${icon('building')}<strong>${h(getReservationRoomLabel(room))}</strong></div>
        <span>${h(t('checkInOut.fields.roomState'))}: ${h(getRoomStatusLabel(getRoomDisplayStatus(room)))}</span>
      </div>

      <div class="guest-meta-grid checkio-meta-grid ds-meta-grid" data-ui-component="checkio-meta-grid">
        ${renderCheckioMetaItem('calendar', `${reservation.checkInDate || '-'} → ${reservation.checkOutDate || '-'}`)}
        ${renderCheckioMetaItem('users', `${guests.total} ${t('checkInOut.fields.persons')}`)}
        ${renderCheckioMetaItem('clock', renderCheckInOutTimeline(reservation))}
        ${renderCheckioMetaItem('currency', `${t('guests.remaining')}: ${due} ${reservation.currency || ''}`)}
      </div>

      ${due > 0 ? `<p class="checkio-warning" data-ui-component="checkio-balance-warning">${icon('alertCircle')}${h(t('checkInOut.balanceWarning'))}: ${h(String(due))} ${h(reservation.currency || '')}</p>` : ''}

      <footer class="guest-card-footer checkio-card-footer" data-ui-component="checkio-card-footer">
        <div class="guest-balance-box checkio-status-box"><span>${h(t('reservation.form.status'))}</span><strong>${h(getReservationStatusLabel(reservation.status))}</strong></div>
        ${renderCheckioActionButtons(reservation, canCheckIn, canCheckOut, due)}
      </footer>
    </article>
  `;
}

function renderCheckInOutCards(reservations) {
  if (!reservations.length) return renderCheckInOutEmpty();
  const date = getOperationalDate();
  const roomColorMap = buildGuestRoomColorMap(getHotelGuestEntries(getManagerHotel()?.id || ''));
  const sorted = [...reservations].sort((a, b) => {
    const roomA = getRoomById(a.roomId);
    const roomB = getRoomById(b.roomId);
    const roomDelta = getGuestRoomSortKey({ reservation: a, room: roomA, roomLabel: getReservationRoomLabel(roomA) })
      .localeCompare(getGuestRoomSortKey({ reservation: b, room: roomB, roomLabel: getReservationRoomLabel(roomB) }), 'ar', { numeric: true });
    if (roomDelta) return roomDelta;
    return String(a.checkInDate || '').localeCompare(String(b.checkInDate || ''), 'ar', { numeric: true }) || String(a.reservationNo || '').localeCompare(String(b.reservationNo || ''), 'ar', { numeric: true });
  });
  return `
    <div class="checkio-cards-grid ds-grid" data-ui-component="checkio-list" data-ui-migrated="checkio-list" data-layout-fixed="checkio-cards-three-per-row">
      ${sorted.map(reservation => renderCheckioReservationCard(reservation, roomColorMap, date)).join('')}
    </div>
  `;
}

function renderCheckInOutPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const filters = state.checkInOutFilters;
  const allReservations = getHotelReservations(hotel.id).filter(reservation => reservation.status !== 'archived' && reservation.status !== 'cancelled');
  const reservations = getCheckInOutFilteredReservations();
  const rooms = getHotelRooms(hotel.id).filter(room => room.status !== 'archived');
  const currency = readPlatformSettings().defaultCurrency || hotel.currency || 'USD';
  return `
    <div class="hotels-page checkio-page checkio-central-page guests-page" data-ui-migrated="checkio" data-ui-centralized="phase103-checkio">
      ${renderCheckioSectionHead({ title: t('page.check_in_out'), text: t('checkInOut.pageHint') })}
      ${renderCheckInOutSummaryStrip(allReservations, currency)}
      ${renderCheckInOutTabs()}
      ${renderCheckioFilterPanel({ rooms, filters })}
      ${renderCheckioSurface({
        body: `<div id="checkioCardsSlot" class="checkio-cards-slot" data-ui-component="checkio-cards-slot">${renderCheckInOutCards(reservations)}</div>`,
        className: 'checkio-central-list-panel',
        component: 'checkio-list-panel'
      })}
    </div>
  `;
}

function updateRoomStatusForReservation(reservation, status, extra = {}) {
  if (!reservation?.roomId) return;
  const feature = checkioFeature();
  if (feature?.actions?.updateRoomStatus) return feature.actions.updateRoomStatus(reservation.roomId, status, { ...extra, updatedAt: todayISO() });
  const rooms = readRooms().map(room => room.id === reservation.roomId ? { ...room, status, ...extra, updatedAt: todayISO() } : room);
  writeRooms(rooms);
}

function getCurrentUserDisplayName() {
  return state.currentUser?.name || state.currentUser?.email || t('common.user', 'User');
}

function markReservationCheckIn(id) {
  const reservation = getReservationById(id);
  if (!reservation) return;
  if (!['pending', 'confirmed'].includes(reservation.status || 'pending')) {
    toast(t('checkInOut.toast.cannotCheckIn'));
    return;
  }
  const stamped = new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  const patch = {
    actualCheckInAt: reservation.actualCheckInAt || stamped,
    checkedInBy: getCurrentUserDisplayName(),
    updatedAt: todayISO()
  };
  const feature = checkioFeature();
  if (feature?.actions?.checkIn) {
    feature.actions.checkIn(id, patch);
  } else {
    const reservations = readReservations();
    const index = reservations.findIndex(item => item.id === id);
    if (index < 0) return;
    reservations[index] = { ...reservation, status: 'checked_in', ...patch };
    writeReservations(reservations);
  }
  updateRoomStatusForReservation(reservation, 'occupied');
  toast(t('checkInOut.toast.checkedIn'));
  render();
}

function getCheckoutBlockedBalanceMessage(reservation) {
  const due = getReservationAmountDue(reservation);
  const currency = reservation?.currency || '';
  return `${t('checkInOut.toast.checkoutBlockedBalance')} ${due} ${currency}`.trim();
}

function showCheckoutBlockedBalanceWarning(id) {
  const reservation = readReservations().find(item => item.id === id);
  if (!reservation) return;
  toast(getCheckoutBlockedBalanceMessage(reservation));
}

function markReservationCheckOut(id) {
  const reservation = getReservationById(id);
  if (!reservation) return;
  if (reservation.status !== 'checked_in') {
    toast(t('checkInOut.toast.cannotCheckOut'));
    return;
  }
  const due = getReservationAmountDue(reservation);
  if (due > 0) {
    toast(getCheckoutBlockedBalanceMessage(reservation));
    return;
  }
  const stamped = new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  const patch = {
    actualCheckOutAt: reservation.actualCheckOutAt || stamped,
    checkedOutBy: getCurrentUserDisplayName(),
    checkoutBalanceWarning: false,
    updatedAt: todayISO()
  };
  const feature = checkioFeature();
  if (feature?.actions?.checkOut) {
    feature.actions.checkOut(id, patch);
  } else {
    const reservations = readReservations();
    const index = reservations.findIndex(item => item.id === id);
    if (index < 0) return;
    reservations[index] = { ...reservation, status: 'completed', ...patch };
    writeReservations(reservations);
  }
  printReservationAccountStatement(id);
  updateRoomStatusForReservation(reservation, 'cleaning', {
    cleaningStartedAt: stamped,
    cleaningReason: 'checkout',
    lastCheckoutReservationId: reservation.id,
    lastCheckoutReservationNo: reservation.reservationNo || '',
    lastCheckoutGuestName: getReservationGuestDisplayName(reservation),
    cleanedAt: '',
    cleanedBy: ''
  });
  toast(due > 0 ? t('checkInOut.toast.checkedOutWithBalance') : t('checkInOut.toast.checkedOut'));
  state.activePage = 'housekeeping';
  writeStorageText('fandqi.activePage', state.activePage);
  render();
}

function refreshCheckInOutCards() {
  const slot = document.getElementById('checkioCardsSlot');
  if (!slot) return;
  slot.innerHTML = renderCheckInOutCards(getCheckInOutFilteredReservations());
  applyCentralDesignSystem(slot);
  bindCheckInOutCardActions();
}

function bindCheckInOutCardActions() {
  document.querySelectorAll('[data-action="checkio-check-in"]').forEach(button => {
    button.addEventListener('click', () => markReservationCheckIn(button.dataset.id));
  });
  document.querySelectorAll('[data-action="checkio-check-out"]').forEach(button => {
    button.addEventListener('click', () => markReservationCheckOut(button.dataset.id));
  });
  document.querySelectorAll('[data-action="checkio-blocked-check-out"]').forEach(button => {
    button.addEventListener('click', () => showCheckoutBlockedBalanceWarning(button.dataset.id));
  });
  document.querySelectorAll('[data-action="checkio-view-reservation"]').forEach(button => {
    button.addEventListener('click', () => {
      state.reservationModal = { mode: 'view', id: button.dataset.id };
      state.activePage = 'reservations';
      writeStorageText('fandqi.activePage', state.activePage);
      render();
    });
  });
  document.querySelectorAll('[data-action="checkio-print-reservation"]').forEach(button => {
    button.addEventListener('click', () => printReservationReceipt(button.dataset.id));
  });
  document.querySelectorAll('[data-action="checkio-print-account"]').forEach(button => {
    button.addEventListener('click', () => printReservationAccountStatement(button.dataset.id));
  });
}

function bindCheckInOutEvents() {
  document.querySelectorAll('[data-checkio-tab]').forEach(button => {
    button.addEventListener('click', () => {
      state.checkInOutFilters.tab = button.dataset.checkioTab || 'arrivals';
      refreshCheckInOutCards();
      render();
    });
  });
  const searchInput = document.getElementById('checkioSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.checkInOutFilters.search = event.target.value;
    refreshCheckInOutCards();
  });
  const dateInput = document.getElementById('checkioDateFilter');
  if (dateInput) dateInput.addEventListener('change', event => {
    state.checkInOutFilters.date = event.target.value || todayISO();
    render();
  });
  const roomFilter = document.getElementById('checkioRoomFilter');
  if (roomFilter) roomFilter.addEventListener('change', event => {
    state.checkInOutFilters.room = event.target.value;
    refreshCheckInOutCards();
  });
  bindCheckInOutCardActions();
}

