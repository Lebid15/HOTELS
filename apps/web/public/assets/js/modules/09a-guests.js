function guestsFeature() {
  return window.FandqiGuestsFeature || null;
}

// Fandqi Modular Refactor — Guests, check-in/out, housekeeping workflows, and payment order helpers.
function getGuestStayStatus(reservation) {
  const feature = guestsFeature();
  if (feature?.selectors?.getGuestStayStatus) return feature.selectors.getGuestStayStatus(reservation, todayISO());
  const status = reservation?.status || 'pending';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'departed';
  const today = todayISO();
  const checkIn = String(reservation?.checkInDate || '');
  const checkOut = String(reservation?.checkOutDate || '');
  if (status === 'checked_in') return 'active';
  if (checkIn && checkIn === today && ['pending','confirmed','checked_in'].includes(status)) return 'arriving';
  if (checkIn && checkOut && checkIn < today && checkOut >= today && ['pending','confirmed','checked_in'].includes(status)) return 'active';
  if (checkIn && checkIn > today && ['pending','confirmed'].includes(status)) return 'upcoming';
  if (checkOut && checkOut < today) return 'departed';
  return status === 'confirmed' ? 'upcoming' : 'pending';
}

function getGuestStayStatusLabel(status) {
  return t(`guests.stayStatus.${status}`, status || '-');
}

function getGuestTypeLabel(type) {
  return t(`guests.type.${type}`, type || '-');
}

function getGuestDocumentTypeList(entry) {
  const feature = guestsFeature();
  if (feature?.selectors?.getGuestDocumentTypeList) {
    return feature.selectors.getGuestDocumentTypeList(entry, getReservationDocumentTypeLabel);
  }
  const docs = [];
  if (entry.documentType) docs.push(getReservationDocumentTypeLabel(entry.documentType));
  if (entry.familyProofType) docs.push(getReservationDocumentTypeLabel(entry.familyProofType));
  return [...new Set(docs.filter(Boolean))];
}

function getGuestAmountDue(entry) {
  const feature = guestsFeature();
  if (feature?.selectors?.getGuestAmountDue) return feature.selectors.getGuestAmountDue(entry, getReservationAmountDue);
  return getReservationAmountDue(entry?.reservation);
}

function createGuestEntryFromReservation(reservation, kind, options = {}) {
  const room = getRoomById(reservation.roomId);
  const status = getGuestStayStatus(reservation);
  const base = {
    id: `${reservation.id}:${kind}${options.index != null ? `:${options.index}` : ''}`,
    hotelId: reservation.hotelId,
    reservationId: reservation.id,
    reservation,
    room,
    roomLabel: getReservationRoomLabel(room),
    reservationNo: reservation.reservationNo || '-',
    checkInDate: reservation.checkInDate || '',
    checkOutDate: reservation.checkOutDate || '',
    nights: reservation.nights || 1,
    stayStatus: status,
    stayStatusLabel: getGuestStayStatusLabel(status),
    sourceLabel: getReservationSourceLabel(reservation.source || 'direct'),
    currency: reservation.currency || readPlatformSettings().defaultCurrency || 'USD',
    personCount: 1
  };
  if (kind === 'primary') {
    return {
      ...base,
      type: 'primary',
      typeLabel: getGuestTypeLabel('primary'),
      name: getReservationGuestDisplayName(reservation),
      nationalId: reservation.nationalId || '',
      fatherName: reservation.fatherName || '',
      motherName: reservation.motherName || '',
      birthDate: reservation.birthDate || '',
      phone: reservation.guestPhone || '',
      email: reservation.guestEmail || '',
      relationshipLabel: t('guests.primaryRelation', 'صاحب الحجز'),
      documentType: reservation.documentType || 'national_id',
      familyProofType: reservation.familyProofRequired ? (reservation.familyProofType || '') : ''
    };
  }
  if (kind === 'companion') {
    const companion = options.companion || {};
    const name = [companion.firstName, companion.lastName].filter(Boolean).join(' ').trim() || `${t('reservation.companions.adultTitle')} ${(Number(options.index || 0) + 1)}`;
    return {
      ...base,
      type: 'companion',
      typeLabel: getGuestTypeLabel('companion'),
      name,
      nationalId: companion.nationalId || '',
      fatherName: companion.fatherName || '',
      motherName: companion.motherName || '',
      birthDate: companion.birthDate || '',
      phone: reservation.guestPhone || '',
      email: '',
      relationshipLabel: getReservationRelationshipLabel(companion.relationship),
      documentType: companion.documentType || 'national_id',
      familyProofType: ''
    };
  }
  const childrenCount = Number(reservation.childrenCount || 0);
  return {
    ...base,
    id: `${reservation.id}:children`,
    type: 'children',
    typeLabel: getGuestTypeLabel('children'),
    name: `${childrenCount} ${t('guests.childrenName', 'أطفال / قاصرون')}`,
    nationalId: '',
    fatherName: '',
    motherName: '',
    birthDate: '',
    phone: reservation.guestPhone || '',
    email: '',
    relationshipLabel: getReservationRelationshipLabel(reservation.childrenRelationship),
    documentType: '',
    familyProofType: reservation.familyProofRequired ? (reservation.familyProofType || 'family_book') : '',
    personCount: childrenCount || 1
  };
}

function getHotelGuestEntries(hotelId) {
  return getHotelReservations(hotelId)
    .filter(reservation => reservation.status !== 'archived')
    .flatMap(reservation => {
      const entries = [createGuestEntryFromReservation(reservation, 'primary')];
      (reservation.adultCompanions || []).forEach((companion, index) => {
        entries.push(createGuestEntryFromReservation(reservation, 'companion', { companion, index }));
      });
      if (Number(reservation.childrenCount || 0) > 0) {
        entries.push(createGuestEntryFromReservation(reservation, 'children'));
      }
      return entries;
    });
}

function getFilteredGuests() {
  const hotel = getManagerHotel();
  if (!hotel) return [];
  const entries = getHotelGuestEntries(hotel.id).map(entry => ({
    ...entry,
    documentLabels: getGuestDocumentTypeList(entry)
  }));
  const feature = guestsFeature();
  if (feature?.selectors?.filterGuests) return feature.selectors.filterGuests(entries, state.guestFilters || {});
  const search = String(state.guestFilters.search || '').trim().toLowerCase();
  return entries.filter(entry => {
    const docs = getGuestDocumentTypeList(entry).join(' ');
    const matchesSearch = !search || [entry.name, entry.nationalId, entry.phone, entry.email, entry.relationshipLabel, entry.typeLabel, entry.reservationNo, entry.roomLabel, entry.sourceLabel, docs]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesStatus = state.guestFilters.stayStatus === 'all' || entry.stayStatus === state.guestFilters.stayStatus;
    const matchesType = state.guestFilters.type === 'all' || entry.type === state.guestFilters.type;
    const matchesRoom = state.guestFilters.room === 'all' || entry.reservation.roomId === state.guestFilters.room;
    return matchesSearch && matchesStatus && matchesType && matchesRoom;
  });
}

function guestsUi() {
  return window.FandqiUI || null;
}

function renderGuestButton({ action = '', id = '', label = '', tone = '', iconName = '', className = '', attrs = {} } = {}) {
  const ui = guestsUi();
  const resolvedTone = tone || getGuestActionTone(action);
  const resolvedIcon = iconName || getGuestActionIcon(action);
  const buttonAttrs = {
    'data-ui-component': 'guest-button',
    ...(id ? { 'data-id': id } : {}),
    ...attrs
  };
  if (ui?.renderButton) {
    return ui.renderButton({
      label,
      tone: resolvedTone,
      size: 'small',
      action,
      icon: resolvedIcon ? icon(resolvedIcon) : '',
      className: ['guest-central-button', className].filter(Boolean).join(' '),
      attrs: buttonAttrs
    });
  }
  return `<button class="btn small ${h(resolvedTone)} guest-central-button ${h(className)}" type="button"${action ? ` data-action="${h(action)}"` : ''}${Object.entries(buttonAttrs).map(([key, value]) => value === true ? ` ${h(key)}` : ` ${h(key)}="${h(value)}"`).join('')}>${resolvedIcon ? icon(resolvedIcon) : ''}${h(label)}</button>`;
}

function renderGuestBadge(label, status, className = '') {
  const ui = guestsUi();
  if (ui?.renderBadge) {
    return ui.renderBadge({
      label,
      status: status || 'neutral',
      className,
      attrs: { 'data-ui-component': 'guest-badge', 'data-guest-status': status || '' }
    });
  }
  return `<span class="guest-stay-badge guest-stay-badge--${h(status || '')} ${h(className)}" data-guest-status="${h(status || '')}">${h(label)}</span>`;
}

function renderGuestsEmptyState() {
  const ui = guestsUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title: t('guests.emptyTitle'),
      text: t('guests.emptyText'),
      icon: icon('users'),
      className: 'hotels-empty guests-empty'
    });
  }
  return `
    <div class="empty-panel hotels-empty guests-empty">
      <div>
        <h2>${h(t('guests.emptyTitle'))}</h2>
        <p>${h(t('guests.emptyText'))}</p>
      </div>
    </div>
  `;
}


function getGuestActionTone(action = '') {
  const map = {
    'view-guest': 'accent',
    'open-guest-reservation': 'primary',
    'print-guest-reservation': 'luxury',
    'close-guest-modal': 'neutral'
  };
  return map[action] || 'primary';
}

function getGuestActionIcon(action = '') {
  const map = {
    'view-guest': 'eye',
    'open-guest-reservation': 'receipt',
    'print-guest-reservation': 'print',
    'close-guest-modal': 'x'
  };
  return map[action] || 'users';
}

function renderGuestsSectionHead({ title, text = '', actions = '' } = {}) {
  const ui = guestsUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title,
      text,
      actions,
      className: 'guests-central-head',
      attrs: { 'data-ui-component': 'guests-page-head' }
    });
  }
  return `<div class="section-head guests-central-head" data-ui-component="guests-page-head"><div><h2>${h(title)}</h2>${text ? `<p class="helper">${h(text)}</p>` : ''}</div>${actions ? `<div class="ds-actions">${actions}</div>` : ''}</div>`;
}

function renderGuestsActions(children, className = '', component = 'guests-actions') {
  const ui = guestsUi();
  if (ui?.renderActions) {
    return ui.renderActions({
      children,
      className: ['guests-central-actions', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component }
    });
  }
  return `<div class="ds-actions guests-central-actions ${h(className)}" data-ui-component="${h(component)}">${children || ''}</div>`;
}

function renderGuestsSurface({ body = '', head = '', className = '', component = 'guests-surface', tag = 'section' } = {}) {
  const ui = guestsUi();
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag,
      head,
      body,
      className: ['guests-central-surface', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component }
    });
  }
  return `<${tag} class="ds-card ds-surface guests-central-surface ${h(className)}" data-ui-component="${h(component)}">${head}${body}</${tag}>`;
}

function renderGuestsField({ label = '', iconName = '', control = '', className = '', component = 'guests-field' } = {}) {
  const ui = guestsUi();
  const labelHtml = label ? fieldLabel(iconName || 'filter', h(label)) : '';
  if (ui?.renderField) {
    return ui.renderField({
      labelHtml,
      control,
      className: ['guests-central-field', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component }
    });
  }
  return `<div class="field ds-field guests-central-field ${h(className)}" data-ui-component="${h(component)}">${labelHtml}${control}</div>`;
}

function renderGuestMetricCard(item) {
  const ui = guestsUi();
  const options = {
    tag: 'article',
    title: item.label,
    value: item.value,
    note: item.note,
    icon: icon(item.iconName),
    tone: `guest-summary-card--${item.key}`,
    className: 'guest-summary-card guest-central-summary-card',
    attrs: { 'data-ui-component': 'guests-summary-card', 'data-guest-summary': item.key }
  };
  if (ui?.renderMetricCard) return ui.renderMetricCard(options);
  return `<article class="guest-summary-card guest-central-summary-card guest-summary-card--${h(item.key)}" data-ui-component="guests-summary-card" data-guest-summary="${h(item.key)}"><div class="guest-summary-icon">${icon(item.iconName)}</div><div class="guest-summary-content"><span class="guest-summary-label">${h(item.label)}</span><strong class="guest-summary-value">${h(String(item.value))}</strong><small class="guest-summary-note">${h(item.note)}</small></div></article>`;
}

function renderGuestMetaItem(iconName, value, className = '') {
  return `<div class="guest-meta-item ds-meta-item ${h(className)}" data-ui-component="guest-meta-item">${icon(iconName)}<span>${h(value || '-')}</span></div>`;
}

function renderGuestFilterPanel({ rooms = [] } = {}) {
  const body = `
    <div class="guests-central-filter-grid ds-form-grid" data-ui-component="guests-filter-grid">
      ${renderGuestsField({
        label: t('guests.filters.search'),
        iconName: 'search',
        className: 'field-search guests-central-search-field',
        component: 'guests-search-field',
        control: `<input class="input ds-control" id="guestSearch" value="${h(state.guestFilters.search)}" autocomplete="off">`
      })}
      ${renderGuestsField({
        label: t('guests.filters.status'),
        iconName: 'status',
        component: 'guests-status-filter',
        control: `<select class="select ds-control" id="guestStatusFilter">
          <option value="all" ${state.guestFilters.stayStatus === 'all' ? 'selected' : ''}>${h(t('guests.filters.all'))}</option>
          ${['arriving','active','upcoming','departed','cancelled','pending'].map(status => `<option value="${h(status)}" ${state.guestFilters.stayStatus === status ? 'selected' : ''}>${h(getGuestStayStatusLabel(status))}</option>`).join('')}
        </select>`
      })}
      ${renderGuestsField({
        label: t('guests.filters.type'),
        iconName: 'users',
        component: 'guests-type-filter',
        control: `<select class="select ds-control" id="guestTypeFilter">
          <option value="all" ${state.guestFilters.type === 'all' ? 'selected' : ''}>${h(t('guests.filters.all'))}</option>
          ${['primary','companion','children'].map(type => `<option value="${h(type)}" ${state.guestFilters.type === type ? 'selected' : ''}>${h(getGuestTypeLabel(type))}</option>`).join('')}
        </select>`
      })}
      ${renderGuestsField({
        label: t('guests.filters.room'),
        iconName: 'building',
        component: 'guests-room-filter',
        control: `<select class="select ds-control" id="guestRoomFilter">
          <option value="all" ${state.guestFilters.room === 'all' ? 'selected' : ''}>${h(t('guests.filters.all'))}</option>
          ${rooms.map(room => `<option value="${h(room.id)}" ${state.guestFilters.room === room.id ? 'selected' : ''}>${h(getReservationRoomLabel(room))}</option>`).join('')}
        </select>`
      })}
    </div>`;
  return renderGuestsSurface({ body, className: 'guests-central-filter-panel guests-filters-bar', component: 'guests-filter-panel' });
}

function renderGuestActionButtons(entry) {
  const buttons = [
    renderGuestButton({ action: 'view-guest', id: entry.id, label: t('guests.actions.view') }),
    renderGuestButton({ action: 'open-guest-reservation', id: entry.reservationId, label: t('guests.actions.reservation') }),
    renderGuestButton({ action: 'print-guest-reservation', id: entry.reservationId, label: t('reservation.actions.print') })
  ].join('');
  return renderGuestsActions(buttons, 'guest-card-actions row-actions guest-card-actions--central', 'guest-card-actions');
}


function getGuestsSummary(entries) {
  const feature = guestsFeature();
  if (feature?.selectors?.summarizeGuests) return feature.selectors.summarizeGuests(entries, getGuestAmountDue, getGuestDocumentTypeList);
  return entries.reduce((acc, entry) => {
    const count = Number(entry.personCount || 1);
    acc.total += count;
    if (entry.stayStatus === 'active') acc.active += count;
    if (entry.stayStatus === 'arriving') acc.arriving += count;
    if (entry.stayStatus === 'upcoming') acc.upcoming += count;
    if (getGuestDocumentTypeList(entry).length) acc.documents += count;
    acc.remaining += getGuestAmountDue(entry);
    return acc;
  }, { total: 0, active: 0, arriving: 0, upcoming: 0, documents: 0, remaining: 0 });
}

function renderGuestsSummaryStrip(entries, currency) {
  const summary = getGuestsSummary(entries);
  const cards = [
    { key: 'total', iconName: 'users', label: t('guests.cards.total'), note: t('guests.cards.totalNote'), value: summary.total },
    { key: 'active', iconName: 'checkCircle', label: t('guests.cards.active'), note: t('guests.cards.activeNote'), value: summary.active },
    { key: 'arriving', iconName: 'calendar', label: t('guests.cards.arriving'), note: t('guests.cards.arrivingNote'), value: summary.arriving },
    { key: 'upcoming', iconName: 'clock', label: t('guests.cards.upcoming'), note: t('guests.cards.upcomingNote'), value: summary.upcoming },
    { key: 'remaining', iconName: 'currency', label: t('guests.cards.remaining'), note: t('guests.cards.remainingNote'), value: `${summary.remaining} ${currency || ''}` }
  ];
  return `
    <div class="guest-summary-grid ds-summary-grid" data-ui-component="guests-summary-grid">
      ${cards.map(renderGuestMetricCard).join('')}
    </div>
  `;
}

function renderGuestDocumentChips(entry) {
  const docs = getGuestDocumentTypeList(entry);
  if (!docs.length) return `<span class="guest-doc-chip guest-doc-chip--muted">${h(t('guests.noDocuments'))}</span>`;
  return docs.map(doc => `<span class="guest-doc-chip">${icon('fileText')}${h(doc)}</span>`).join('');
}


const GUEST_ROOM_COLOR_CLASS_COUNT = 72;

function normalizeGuestRoomColorPart(value) {
  const feature = guestsFeature();
  if (feature?.validators?.normalizeGuestRoomColorPart) return feature.validators.normalizeGuestRoomColorPart(value);
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getGuestRoomColorKey(entry) {
  const feature = guestsFeature();
  if (feature?.selectors?.getGuestRoomColorKey) return feature.selectors.getGuestRoomColorKey(entry);
  const roomId = normalizeGuestRoomColorPart(entry?.reservation?.roomId || entry?.room?.id || '');
  if (roomId) return `room-id:${roomId}`;
  const roomLabel = normalizeGuestRoomColorPart(entry?.roomLabel || entry?.reservation?.roomLabel || '');
  if (roomLabel) return `room-label:${roomLabel}`;
  return 'room-label:no-room';
}

function getGuestRoomSortKey(entry) {
  const feature = guestsFeature();
  if (feature?.selectors?.getGuestRoomSortKey) return feature.selectors.getGuestRoomSortKey(entry);
  const room = entry?.room || {};
  const floorValue = Number(room.floor || entry?.reservation?.roomFloor || 0);
  const floor = Number.isFinite(floorValue) ? floorValue : 0;
  const roomNumber = normalizeGuestRoomColorPart(room.number || entry?.reservation?.roomNumber || entry?.roomLabel || '');
  return `${String(floor).padStart(4, '0')}|${roomNumber}`;
}

function buildGuestRoomColorMap(entries = []) {
  const feature = guestsFeature();
  if (feature?.selectors?.buildGuestRoomColorMap) return feature.selectors.buildGuestRoomColorMap(entries);
  const rooms = new Map();
  entries.forEach(entry => {
    const key = getGuestRoomColorKey(entry);
    if (!rooms.has(key)) rooms.set(key, getGuestRoomSortKey(entry));
  });
  return new Map(
    [...rooms.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'ar', { numeric: true }) || a[0].localeCompare(b[0], 'ar', { numeric: true }))
      .map(([key], index) => [key, index])
  );
}

function getGuestRoomColorIndex(entry, roomColorMap = null) {
  const feature = guestsFeature();
  if (feature?.selectors?.getGuestRoomColorIndex) return feature.selectors.getGuestRoomColorIndex(entry, roomColorMap);
  const key = getGuestRoomColorKey(entry);
  if (roomColorMap && roomColorMap.has(key)) return roomColorMap.get(key);
  return 0;
}

function getGuestRoomColorClass(entry, roomColorMap = null) {
  const feature = guestsFeature();
  if (feature?.selectors?.getGuestRoomColorClass) return feature.selectors.getGuestRoomColorClass(entry, roomColorMap);
  const index = getGuestRoomColorIndex(entry, roomColorMap);
  return `guest-room-color-${(index % GUEST_ROOM_COLOR_CLASS_COUNT) + 1}`;
}

function getGuestTypeSortRank(entry) {
  const feature = guestsFeature();
  if (feature?.selectors?.getGuestTypeSortRank) return feature.selectors.getGuestTypeSortRank(entry);
  const order = { primary: 1, companion: 2, children: 3 };
  return order[entry?.type] || 9;
}

function compareGuestsByRoomGroup(a, b, roomColorMap) {
  const feature = guestsFeature();
  if (feature?.selectors?.compareGuestsByRoomGroup) return feature.selectors.compareGuestsByRoomGroup(a, b, roomColorMap);
  const roomIndexDelta = getGuestRoomColorIndex(a, roomColorMap) - getGuestRoomColorIndex(b, roomColorMap);
  if (roomIndexDelta) return roomIndexDelta;

  const roomSortDelta = getGuestRoomSortKey(a).localeCompare(getGuestRoomSortKey(b), 'ar', { numeric: true });
  if (roomSortDelta) return roomSortDelta;

  const reservationDelta = String(a?.reservationNo || '').localeCompare(String(b?.reservationNo || ''), 'ar', { numeric: true });
  if (reservationDelta) return reservationDelta;

  const typeDelta = getGuestTypeSortRank(a) - getGuestTypeSortRank(b);
  if (typeDelta) return typeDelta;

  return String(a?.name || '').localeCompare(String(b?.name || ''), 'ar', { numeric: true });
}


function renderGuestCard(entry, roomColorMap) {
  const due = getGuestAmountDue(entry);
  return `
    <article class="guest-card ds-card guest-central-card guest-card--${h(entry.stayStatus)} guest-card--${h(entry.type)} ${h(getGuestRoomColorClass(entry, roomColorMap))}" data-ui-migrated="guest-card" data-ui-component="guest-card" data-guest-id="${h(entry.id || '')}">
      <div class="guest-card-top" data-ui-component="guest-card-head">
        <div class="guest-card-title-wrap">
          ${renderPersonAvatar('', entry.name, 'guest-card-avatar')}
          <div class="guest-card-identity">
            <span class="guest-type-chip ds-badge" data-ui-component="guest-type-chip">${h(entry.typeLabel)}</span>
            <h3>${h(entry.name || '-')}</h3>
            <p>${h(entry.nationalId || entry.phone || entry.relationshipLabel || '-')}</p>
          </div>
        </div>
        ${renderGuestBadge(entry.stayStatusLabel, entry.stayStatus, `guest-stay-badge guest-stay-badge--${entry.stayStatus}`)}
      </div>

      <div class="guest-meta-grid ds-meta-grid" data-ui-component="guest-meta-grid">
        ${renderGuestMetaItem('receipt', entry.reservationNo)}
        ${renderGuestMetaItem('building', entry.roomLabel)}
        ${renderGuestMetaItem('calendar', `${entry.checkInDate || '-'} → ${entry.checkOutDate || '-'}`)}
        ${renderGuestMetaItem('clock', `${String(entry.nights || 1)} ${t('reservation.units.nights')}`)}
        ${renderGuestMetaItem('phone', entry.phone || '-')}
        ${renderGuestMetaItem('users', entry.relationshipLabel || '-')}
      </div>

      <div class="guest-doc-row" data-ui-component="guest-doc-row">
        ${renderGuestDocumentChips(entry)}
      </div>

      <div class="guest-card-footer" data-ui-component="guest-card-footer">
        <div class="guest-balance-box ds-meta-item" data-ui-component="guest-balance-box">
          <span>${h(t('guests.remaining'))}</span>
          <strong>${h(String(due))} ${h(entry.currency || '')}</strong>
        </div>
        ${renderGuestActionButtons(entry)}
      </div>
    </article>
  `;
}

function renderGuestsTable(entries, colorSourceEntries = entries) {
  if (!entries.length) {
    return renderGuestsEmptyState();
  }
  const roomColorMap = buildGuestRoomColorMap(colorSourceEntries);
  const sorted = [...entries].sort((a, b) => compareGuestsByRoomGroup(a, b, roomColorMap));
  return `
    <div class="guest-cards-grid ds-grid" data-ui-migrated="guests-list" data-ui-component="guests-list" data-layout-fixed="guest-cards-three-per-row">
      ${sorted.map(entry => renderGuestCard(entry, roomColorMap)).join('')}
    </div>
  `;
}

function getGuestEntryById(id) {
  const hotel = getManagerHotel();
  if (!hotel) return null;
  return getHotelGuestEntries(hotel.id).find(entry => entry.id === id) || null;
}

function openGuestModal(id) {
  state.guestModal = { id };
  render();
}

function closeGuestModal() {
  state.guestModal = null;
  render();
}

function renderGuestModal() {
  const entry = state.guestModal?.id ? getGuestEntryById(state.guestModal.id) : null;
  if (!entry) return '';
  const due = getGuestAmountDue(entry);
  const hotel = getManagerHotel();
  const roomColorMap = buildGuestRoomColorMap(hotel ? getHotelGuestEntries(hotel.id) : [entry]);
  const detailPairs = [
    [t('guests.details.name'), entry.name || '-'],
    [t('guests.details.type'), entry.typeLabel || '-'],
    [t('guests.details.relationship'), entry.relationshipLabel || '-'],
    [t('reservation.form.nationalId'), entry.nationalId || '-'],
    [t('reservation.form.fatherName'), entry.fatherName || '-'],
    [t('reservation.form.motherName'), entry.motherName || '-'],
    [t('reservation.form.birthDate'), entry.birthDate || '-'],
    [t('reservation.form.guestPhone'), entry.phone || '-'],
    [t('reservation.form.guestEmail'), entry.email || '-']
  ];
  const bookingPairs = [
    [t('reservation.form.number'), entry.reservationNo],
    [t('reservation.form.room'), entry.roomLabel],
    [t('reservation.form.status'), getReservationStatusLabel(entry.reservation.status)],
    [t('reservation.form.source'), entry.sourceLabel],
    [t('reservation.form.checkInDate'), entry.checkInDate || '-'],
    [t('reservation.form.checkOutDate'), entry.checkOutDate || '-'],
    [t('reservation.form.nights'), entry.nights || 1],
    [t('guests.details.remaining'), `${due} ${entry.currency || ''}`]
  ];
  const modalActions = renderGuestsActions([
    renderGuestButton({ action: 'close-guest-modal', label: t('common.close') }),
    renderGuestButton({ action: 'open-guest-reservation', id: entry.reservationId, label: t('guests.actions.reservation') }),
    renderGuestButton({ action: 'print-guest-reservation', id: entry.reservationId, label: t('reservation.actions.print') })
  ].join(''), 'reservation-details-actions guest-modal-actions', 'guest-modal-actions');
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card compact-modal-card guest-details-modal guest-modal-card-central ds-modal-card ${h(getGuestRoomColorClass(entry, roomColorMap))}" data-ui-component="guest-modal-card">
        <div class="modal-head" data-ui-component="guest-modal-head">
          <h2>${h(t('guests.modalTitle'))}</h2>
          ${renderGuestButton({ action: 'close-guest-modal', label: '', tone: 'danger', iconName: 'x', className: 'icon-btn guest-modal-close', attrs: { 'aria-label': t('common.close') } })}
        </div>
        <div class="guest-detail-hero ds-card" data-ui-component="guest-detail-hero">
          ${renderPersonAvatar('', entry.name, 'guest-detail-avatar')}
          <div>
            <span>${h(entry.typeLabel)}</span>
            <strong>${h(entry.name || '-')}</strong>
            <small>${h(entry.reservationNo)} · ${h(entry.roomLabel)}</small>
          </div>
          ${renderGuestBadge(entry.stayStatusLabel, entry.stayStatus, `guest-stay-badge guest-stay-badge--${entry.stayStatus}`)}
        </div>
        <div class="reservation-detail-sections guest-modal-sections" data-ui-component="guest-modal-sections">
          ${renderReservationDetailSection(t('guests.details.personalSection'), detailPairs)}
          ${renderReservationDetailSection(t('guests.details.bookingSection'), bookingPairs)}
          <section class="reservation-detail-section guest-documents-section" data-ui-component="guest-documents-section">
            <h3>${h(t('guests.documentsTitle'))}</h3>
            <div class="guest-doc-row guest-doc-row--modal">${renderGuestDocumentChips(entry)}</div>
            <p class="helper">${h(t('guests.documentsHelper'))}</p>
          </section>
        </div>
        <div class="modal-actions reservation-details-actions guest-modal-footer" data-ui-component="guest-modal-footer">
          ${modalActions}
        </div>
      </div>
    </div>
  `;
}

function renderGuestsPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const allEntries = getHotelGuestEntries(hotel.id);
  const entries = getFilteredGuests();
  const rooms = getHotelRooms(hotel.id).filter(room => room.status !== 'archived');
  const currency = readPlatformSettings().defaultCurrency || hotel.currency || 'USD';
  const pageHead = renderGuestsSectionHead({
    title: t('page.guests'),
    text: t('guests.pageHint')
  });
  return `
    <div class="hotels-page guests-page guests-central-page" data-ui-migrated="guests" data-ui-centralized="phase102-guests">
      ${pageHead}
      ${renderGuestsSummaryStrip(allEntries, currency)}
      ${renderGuestFilterPanel({ rooms })}
      ${renderGuestsSurface({
        body: `<div id="guestsTableSlot" class="guests-cards-slot" data-ui-component="guests-table-slot">${renderGuestsTable(entries, allEntries)}</div>`,
        className: 'guests-list-panel',
        component: 'guests-list-panel'
      })}
      ${renderGuestModal()}
    </div>
  `;
}

function refreshGuestsTable() {
  const slot = document.getElementById('guestsTableSlot');
  if (!slot) return;
  const hotel = getManagerHotel();
  const allEntries = hotel ? getHotelGuestEntries(hotel.id) : getFilteredGuests();
  slot.innerHTML = renderGuestsTable(getFilteredGuests(), allEntries);
  applyCentralDesignSystem(slot);
  bindGuestRowActions();
}

function bindGuestRowActions() {
  document.querySelectorAll('[data-action="view-guest"]').forEach(button => {
    button.addEventListener('click', () => openGuestModal(button.dataset.id));
  });
  document.querySelectorAll('[data-action="open-guest-reservation"]').forEach(button => {
    button.addEventListener('click', () => {
      state.guestModal = null;
      state.reservationModal = { mode: 'view', id: button.dataset.id };
      state.activePage = 'reservations';
      writeStorageText('fandqi.activePage', state.activePage);
      render();
    });
  });
  document.querySelectorAll('[data-action="print-guest-reservation"]').forEach(button => {
    button.addEventListener('click', () => printReservationReceipt(button.dataset.id));
  });
  document.querySelectorAll('[data-action="close-guest-modal"]').forEach(button => {
    button.addEventListener('click', closeGuestModal);
  });
}

function bindGuestsEvents() {
  const searchInput = document.getElementById('guestSearch');
  if (searchInput) searchInput.addEventListener('input', event => {
    state.guestFilters.search = event.target.value;
    refreshGuestsTable();
  });
  const statusFilter = document.getElementById('guestStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', event => {
    state.guestFilters.stayStatus = event.target.value;
    refreshGuestsTable();
  });
  const typeFilter = document.getElementById('guestTypeFilter');
  if (typeFilter) typeFilter.addEventListener('change', event => {
    state.guestFilters.type = event.target.value;
    refreshGuestsTable();
  });
  const roomFilter = document.getElementById('guestRoomFilter');
  if (roomFilter) roomFilter.addEventListener('change', event => {
    state.guestFilters.room = event.target.value;
    refreshGuestsTable();
  });
  bindGuestRowActions();
}
