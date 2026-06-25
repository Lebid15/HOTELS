// Fandqi Phase 94 — Rooms and floors full component centralization helpers.
function renderRoomCentralButton({ action = '', id = '', label = '', tone = 'ghost', iconName = '', size = 'small', className = '', type = 'button', attrs = {} } = {}) {
  const ui = roomUi();
  const options = {
    label,
    tone,
    size,
    action,
    icon: iconName ? icon(iconName) : '',
    className,
    type,
    attrs: {
      ...(id ? { id } : {}),
      'data-ui-component': 'rooms-action-button',
      ...attrs
    }
  };
  if (ui?.renderButton) return ui.renderButton(options);
  const attrHtml = Object.entries(options.attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => ` ${h(name)}="${h(value)}"`)
    .join('');
  return `<button class="btn ${h(tone)} ${h(size)} ds-btn ${h(className)}" type="${h(type || 'button')}"${action ? ` data-action="${h(action)}"` : ''}${attrHtml}>${iconName ? icon(iconName) : ''}${h(label)}</button>`;
}

function renderRoomAddButton() {
  return renderRoomCentralButton({
    id: 'addRoomBtn',
    label: t('room.actions.add'),
    tone: 'primary',
    iconName: 'building',
    size: 'small',
    attrs: { 'data-ui-component': 'rooms-add-room-action' }
  });
}

function renderRoomFloorsButton() {
  return renderRoomCentralButton({
    id: 'editRoomFloorsBtn',
    label: t('room.floors.editAction'),
    tone: 'success',
    iconName: 'edit',
    size: 'small',
    attrs: { 'data-ui-component': 'rooms-edit-floors-action' }
  });
}

function renderRoomPageActions() {
  const ui = roomUi();
  const children = `${renderRoomFloorsButton()}${renderRoomAddButton()}`;
  if (ui?.renderActions) {
    return ui.renderActions({
      className: 'rooms-page-actions',
      attrs: { 'data-ui-component': 'rooms-page-actions' },
      children
    });
  }
  return `<div class="ds-actions rooms-page-actions" data-ui-component="rooms-page-actions">${children}</div>`;
}

function renderRoomsPageHead() {
  const ui = roomUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title: t('page.rooms'),
      text: t('room.page.description'),
      className: 'rooms-central-head',
      actions: renderRoomPageActions(),
      attrs: { 'data-ui-component': 'rooms-page-head' }
    });
  }
  return `
    <div class="section-head ds-section-head rooms-central-head" data-ui-component="rooms-page-head">
      <div class="fandqi-ui-section-copy">
        <h2>${h(t('page.rooms'))}</h2>
        <p class="helper">${h(t('room.page.description'))}</p>
      </div>
      ${renderRoomPageActions()}
    </div>
  `;
}

function renderRoomField({ label, iconName = '', control = '', helper = '', className = '', attrs = {} } = {}) {
  const ui = roomUi();
  if (ui?.renderField) {
    return ui.renderField({
      label,
      icon: iconName ? icon(iconName) : '',
      control,
      helper,
      className,
      attrs: { 'data-ui-component': 'rooms-field', ...attrs }
    });
  }
  return `<div class="field ds-field ${h(className)}" data-ui-component="rooms-field">${fieldLabel(iconName || 'clipboardCheck', h(label || ''))}${control}${helper ? `<p class="helper">${h(helper)}</p>` : ''}</div>`;
}

function renderRoomFormGrid(children, className = '') {
  const ui = roomUi();
  if (ui?.renderFormGrid) {
    return ui.renderFormGrid({
      children,
      className: `rooms-form-grid ${className}`.trim(),
      attrs: { 'data-ui-component': 'rooms-form-grid' }
    });
  }
  return `<div class="modal-grid compact-modal-grid ds-form-grid rooms-form-grid ${h(className)}" data-ui-component="rooms-form-grid">${children}</div>`;
}

function renderRoomsPanelTitle(title, iconName = 'building') {
  const ui = roomUi();
  if (ui?.renderPanelTitle) {
    return ui.renderPanelTitle({ title, icon: icon(iconName), attrs: { 'data-ui-component': 'rooms-panel-title' } });
  }
  return `<div class="form-section-title ds-form-section-title" data-ui-component="rooms-panel-title">${icon(iconName)}<span>${h(title)}</span></div>`;
}

function renderRoomsSurface({ className = '', body = '', head = '', tag = 'section', attrs = {} } = {}) {
  const ui = roomUi();
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag,
      className,
      head,
      body,
      attrs: { 'data-ui-component': 'rooms-surface', ...attrs }
    });
  }
  return `<${tag} class="ds-card ds-surface fandqi-ui-surface ${h(className)}" data-ui-component="rooms-surface">${head}${body}</${tag}>`;
}


function renderRoomCard(room) {
  const displayStatus = getRoomDisplayStatus(room);
  const ui = roomUi();
  const meta = `
    <div class="room-card-meta ds-meta-grid" data-ui-component="rooms-card-meta-grid">
      <div class="room-meta-item ds-meta-item" data-ui-component="rooms-card-meta-item">${icon('dashboard')}<span>${h(t('room.form.floorPrefix'))} ${h(room.floor || '-')}</span></div>
      <div class="room-meta-item ds-meta-item" data-ui-component="rooms-card-meta-item">${icon('users')}<span>${h(t('room.columns.capacity'))}: ${h(String(room.capacity || '-'))}</span></div>
      <div class="room-meta-item ds-meta-item" data-ui-component="rooms-card-meta-item">${icon('creditCard')}<span>${h(room.price ? `${room.price} ${room.currency || ''}` : '-')}</span></div>
      <div class="room-meta-item ds-meta-item" data-ui-component="rooms-card-meta-item">${icon('calendar')}<span>${h(t('room.columns.updatedAt'))}: ${h(room.updatedAt || room.createdAt || '-')}</span></div>
    </div>
    ${room.notes ? `<p class="room-card-note">${h(room.notes)}</p>` : `<p class="room-card-note room-card-note--muted">${h(t('room.cards.noNotes'))}</p>`}
  `;
  const top = `
    <div class="room-card-top" data-ui-component="rooms-card-head">
      <div class="room-card-title-wrap">
        <div class="room-card-icon room-card-icon--${h(displayStatus || 'available')}">${icon('building')}</div>
        <div>
          <span class="room-number-chip ds-badge" data-ui-component="rooms-number-badge">${h(t('room.cards.roomLabel'))} ${h(room.number || '-')}</span>
          <h4>${h(getRoomTypeLabel(room.type))}</h4>
        </div>
      </div>
      ${renderRoomBadge(displayStatus)}
    </div>
  `;
  const actions = `<div class="room-card-actions row-actions ds-actions" data-ui-component="rooms-card-actions">${renderRoomActionButtons(room, displayStatus)}</div>`;
  if (ui?.renderCard) {
    return ui.renderCard({
      title: '',
      body: `${top}${meta}`,
      actions,
      className: `room-card room-card--${displayStatus || 'available'} rooms-central-card`,
      attrs: { 'data-ui-component': 'rooms-room-card', 'data-room-id': room.id, 'data-room-status': displayStatus }
    }).replace('<article class="', '<article data-ui-component="rooms-room-card" data-ui-migrated="room-card" class="');
  }
  return `
    <article class="room-card rooms-central-card room-card--${h(displayStatus || 'available')} ds-card" data-ui-component="rooms-room-card" data-ui-migrated="room-card" data-room-id="${h(room.id)}" data-room-status="${h(displayStatus)}">
      ${top}${meta}${actions}
    </article>
  `;
}

function renderRoomsTable(rooms) {
  if (!rooms.length) {
    return renderRoomEmptyState();
  }

  const feature = roomsFeature();
  const grouped = feature?.selectors?.groupRoomsByFloor
    ? feature.selectors.groupRoomsByFloor(rooms)
    : [...rooms]
      .sort((a, b) => Number(a.floor || 0) - Number(b.floor || 0) || String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true }))
      .reduce((acc, room) => {
        const floor = String(room.floor || '-');
        const bucket = acc.find(group => group.floor === floor);
        if (bucket) {
          bucket.rooms.push(room);
        } else {
          acc.push({ floor, rooms: [room] });
        }
        return acc;
      }, []);

  return `
    <div class="room-floor-sections ds-list" data-ui-component="rooms-floor-sections" data-ui-migrated="rooms-list">
      ${grouped.map(group => {
        const roomStates = group.rooms.map(room => ({ room, displayStatus: getRoomDisplayStatus(room) }));
        const available = roomStates.filter(item => item.displayStatus === 'available').length;
        const booked = roomStates.filter(item => item.displayStatus === 'booked').length;
        const occupied = roomStates.filter(item => item.displayStatus === 'occupied').length;
        const attention = roomStates.filter(item => ['cleaning', 'maintenance', 'out_of_service'].includes(item.displayStatus)).length;
        const head = `
          <div class="room-floor-head ds-section-head compact" data-ui-component="rooms-floor-head">
            <div class="fandqi-ui-section-copy">
              <span class="room-floor-kicker">${h(t('room.cards.floorLabel'))}</span>
              <h3>${h(t('room.form.floorPrefix'))} ${h(group.floor)}</h3>
              <p>${h(group.rooms.length)} ${h(t('room.cards.roomsWord'))} • ${h(available)} ${h(t('room.cards.available'))}${booked ? ` • ${h(booked)} ${h(t('room.cards.booked'))}` : ''} • ${h(occupied)} ${h(t('room.cards.occupied'))}${attention ? ` • ${h(attention)} ${h(t('room.cards.attention'))}` : ''}</p>
            </div>
            <span class="room-floor-count ds-badge" data-ui-component="rooms-floor-count">${h(String(group.rooms.length))}</span>
          </div>
        `;
        const body = `
          ${head}
          <div class="room-cards-grid ds-grid" data-ui-component="rooms-card-grid">
            ${group.rooms.map(renderRoomCard).join('')}
          </div>
        `;
        return renderRoomsSurface({
          className: 'room-floor-section rooms-central-floor-section',
          body,
          attrs: { 'data-ui-component': 'rooms-floor-section', 'data-floor': group.floor }
        });
      }).join('')}
    </div>
  `;
}

function renderRoomFormModal(mode, room) {
  const hotel = getManagerHotel();
  if (!hotel) return '';
  const isEdit = mode === 'edit';
  const floorOptions = getHotelFloorOptions(hotel.id);
  const current = room || { floor: floorOptions[0] || '1', type: getConfiguredRoomTypes(hotel.id)[0] || 'single', status: 'available', currency: readPlatformSettings().defaultCurrency || 'USD', capacity: 1 };
  const roomTypes = [...getConfiguredRoomTypes(hotel.id)];
  if (current.type && !roomTypes.includes(current.type)) roomTypes.unshift(current.type);
  if (current.floor && !floorOptions.includes(String(current.floor))) floorOptions.unshift(String(current.floor));
  const capacityOptions = [1,2,3,4,5,6,7,8,9,10];
  const body = `
    ${renderRoomsPanelTitle(t('room.form.roomInfo'), 'building')}
    ${renderRoomFormGrid(`
      ${renderRoomField({ label: t('room.form.number'), iconName: 'hash', control: `<input class="input ds-control" name="number" value="${h(current.number || '')}" required>` })}
      ${renderRoomField({ label: t('room.form.floor'), iconName: 'dashboard', control: `
        <select class="select ds-control" name="floor" required>
          ${floorOptions.map(floor => `<option value="${h(floor)}" ${String(current.floor || '') === floor ? 'selected' : ''}>${h(t('room.form.floorPrefix'))} ${h(floor)}</option>`).join('')}
        </select>
      ` })}
      ${renderRoomField({ label: t('room.form.type'), iconName: 'building', control: `
        <select class="select ds-control" name="type" required>
          ${roomTypes.map(type => `<option value="${h(type)}" ${current.type === type ? 'selected' : ''}>${h(getRoomTypeLabel(type))}</option>`).join('')}
        </select>
      ` })}
      ${renderRoomField({ label: t('room.form.capacity'), iconName: 'users', control: `
        <select class="select ds-control" name="capacity" required>
          ${capacityOptions.map(capacity => `<option value="${capacity}" ${Number(current.capacity || 1) === capacity ? 'selected' : ''}>${capacity}</option>`).join('')}
        </select>
      ` })}
      ${renderRoomField({ label: t('room.form.status'), iconName: 'status', control: `
        <select class="select ds-control" name="status" required>
          ${['available','occupied','cleaning','maintenance','out_of_service'].map(status => `<option value="${h(status)}" ${current.status === status ? 'selected' : ''}>${h(getRoomStatusLabel(status))}</option>`).join('')}
        </select>
      ` })}
      ${renderRoomField({ label: t('room.form.price'), iconName: 'creditCard', control: `<input class="input ds-control" type="number" min="0" step="0.01" name="price" value="${h(current.price || '')}">` })}
      ${renderRoomField({ label: t('room.form.currency'), iconName: 'currency', control: `
        <select class="select ds-control" name="currency">
          ${['USD','EUR','TRY','SAR','AED','SYP'].map(currency => `<option value="${currency}" ${current.currency === currency ? 'selected' : ''}>${currency}</option>`).join('')}
        </select>
      ` })}
      ${renderRoomField({ label: t('room.form.notes'), iconName: 'notes', className: 'field-full room-form-note', helper: t('room.form.priceLockHelper'), control: `<textarea class="input textarea ds-control" name="notes" rows="2">${h(current.notes || '')}</textarea>` })}
    `, 'room-form-grid')}
  `;
  return `
    <div class="modal-backdrop ds-modal-backdrop" role="dialog" aria-modal="true" data-ui-component="rooms-room-modal-backdrop">
      <form class="modal-card compact-modal-card ds-modal-card rooms-room-modal" id="roomForm" data-ui-component="rooms-room-form-modal" data-mode="${h(mode)}" data-id="${h(current.id || '')}">
        <div class="modal-head ds-section-head compact" data-ui-component="rooms-modal-head">
          <h2>${h(isEdit ? t('room.modal.editTitle') : t('room.modal.addTitle'))}</h2>
          ${renderRoomCentralButton({ action: 'close-room-modal', label: '', tone: 'neutral', iconName: 'x', className: 'icon-btn', attrs: { 'aria-label': t('common.close'), title: t('common.close'), 'data-ui-component': 'rooms-modal-close' } })}
        </div>
        ${body}
        <div class="modal-actions ds-actions" data-ui-component="rooms-modal-actions">
          ${renderRoomCentralButton({ action: 'close-room-modal', label: t('common.cancel'), tone: 'ghost', iconName: 'x' })}
          ${renderRoomCentralButton({ label: t('common.save'), tone: 'primary', iconName: 'save', type: 'submit' })}
        </div>
      </form>
    </div>
  `;
}

function renderRoomViewModal(room) {
  if (!room) return '';
  const items = [
    ['room.form.number', room.number, 'hash'],
    ['room.form.floor', room.floor, 'dashboard'],
    ['room.form.type', getRoomTypeLabel(room.type), 'building'],
    ['room.form.capacity', room.capacity, 'users'],
    ['room.form.status', getRoomStatusLabel(room.status), 'status'],
    ['room.form.price', room.price ? `${room.price} ${room.currency || ''}` : '-', 'creditCard'],
    ['room.form.notes', room.notes || '-', 'notes'],
    ['room.columns.createdAt', room.createdAt || '-', 'calendar'],
    ['room.columns.updatedAt', room.updatedAt || '-', 'calendar']
  ];
  return `
    <div class="modal-backdrop ds-modal-backdrop" role="dialog" aria-modal="true" data-ui-component="rooms-view-modal-backdrop">
      <div class="modal-card compact-modal-card ds-modal-card rooms-view-modal" data-ui-component="rooms-view-modal">
        <div class="modal-head ds-section-head compact" data-ui-component="rooms-modal-head">
          <h2>${h(t('room.modal.viewTitle'))}</h2>
          ${renderRoomCentralButton({ action: 'close-room-modal', label: '', tone: 'neutral', iconName: 'x', className: 'icon-btn', attrs: { 'aria-label': t('common.close'), title: t('common.close'), 'data-ui-component': 'rooms-modal-close' } })}
        </div>
        <div class="details-grid compact-details-grid ds-meta-grid rooms-details-grid" data-ui-component="rooms-details-grid">
          ${items.map(([label, value, iconName]) => `
            <div class="detail-item ds-meta-item" data-ui-component="rooms-detail-item">
              <span>${icon(iconName)}${h(t(label))}</span>
              <strong>${h(value || '-')}</strong>
            </div>
          `).join('')}
        </div>
        <div class="modal-actions ds-actions" data-ui-component="rooms-modal-actions">
          ${renderRoomCentralButton({ action: 'close-room-modal', label: t('common.close'), tone: 'primary', iconName: 'checkCircle' })}
        </div>
      </div>
    </div>
  `;
}

function renderRoomFloorsModal() {
  const hotel = getManagerHotel();
  if (!hotel) return '';
  const settings = readHotelSettings(hotel.id);
  const rooms = getHotelRoomsIncludingArchived(hotel.id).filter(room => room.status !== 'archived');
  const usedFloors = [...new Set(rooms.map(room => String(room.floor || '').trim()).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const minFloors = Math.max(1, ...usedFloors.map(value => Number(value) || 1));
  const floorsCount = Math.max(minFloors, Number(settings.floorsCount || minFloors || 1));
  const body = `
    ${renderRoomsPanelTitle(t('room.floors.modalSection'), 'dashboard')}
    ${renderRoomFormGrid(`
      ${renderRoomField({
        label: t('room.floors.countLabel'),
        iconName: 'dashboard',
        helper: t('room.floors.countHelper'),
        control: `<input class="input ds-control" type="number" min="${h(String(minFloors))}" step="1" name="floorsCount" value="${h(String(floorsCount))}" required>`
      })}
      ${renderRoomField({
        label: t('room.floors.usedFloors'),
        iconName: 'building',
        className: 'field-full',
        helper: t('room.floors.usedFloorsHelper'),
        control: `
          <div class="rooms-used-floors-list ds-actions" data-ui-component="rooms-used-floors-list">
            ${(usedFloors.length ? usedFloors : getHotelFloorOptions(hotel.id)).map(floor => `<span class="ds-badge floor-overview-badge">${h(t('room.form.floorPrefix'))} ${h(floor)}</span>`).join('')}
          </div>
        `
      })}
    `, 'rooms-floor-form-grid')}
  `;
  return `
    <div class="modal-backdrop ds-modal-backdrop" role="dialog" aria-modal="true" data-ui-component="rooms-floor-modal-backdrop">
      <form class="modal-card compact-modal-card ds-modal-card rooms-floor-modal" id="roomFloorsForm" data-ui-component="rooms-floor-form-modal" data-min-floors="${h(String(minFloors))}">
        <div class="modal-head ds-section-head compact" data-ui-component="rooms-modal-head">
          <h2>${h(t('room.floors.modalTitle'))}</h2>
          ${renderRoomCentralButton({ action: 'close-room-modal', label: '', tone: 'neutral', iconName: 'x', className: 'icon-btn', attrs: { 'aria-label': t('common.close'), title: t('common.close'), 'data-ui-component': 'rooms-modal-close' } })}
        </div>
        ${body}
        <div class="modal-actions ds-actions" data-ui-component="rooms-modal-actions">
          ${renderRoomCentralButton({ action: 'close-room-modal', label: t('common.cancel'), tone: 'ghost', iconName: 'x' })}
          ${renderRoomCentralButton({ label: t('room.floors.saveAction'), tone: 'primary', iconName: 'save', type: 'submit' })}
        </div>
      </form>
    </div>
  `;
}

function renderRoomModal() {
  if (!state.roomModal) return '';
  const { mode, id } = state.roomModal;
  const room = id ? getRoomById(id) : null;
  if (mode === 'view') return renderRoomViewModal(room);
  if (mode === 'floors') return renderRoomFloorsModal();
  return renderRoomFormModal(mode, room);
}

function getRoomVisualSummary(rooms, configuredFloors = []) {
  const floorSet = new Set([...(configuredFloors || []).map(value => String(value || '').trim()).filter(Boolean), ...rooms.map(room => String(room.floor || '').trim()).filter(Boolean)]);
  return {
    total: rooms.length,
    floors: floorSet.size,
    available: rooms.filter(room => room.status === 'available').length,
    occupied: rooms.filter(room => room.status === 'occupied').length,
    attention: rooms.filter(room => ['cleaning', 'maintenance', 'out_of_service'].includes(room.status)).length
  };
}

function renderRoomSummaryStrip(summary) {
  const ui = roomUi();
  const items = [
    { key: 'total', iconName: 'building', label: t('room.cards.total'), note: t('room.cards.totalNote'), value: summary.total, tone: 'accent' },
    { key: 'floors', iconName: 'dashboard', label: t('room.cards.floors'), note: t('room.cards.floorsNote'), value: summary.floors, tone: 'luxury' },
    { key: 'available', iconName: 'checkCircle', label: t('room.cards.available'), note: t('room.cards.availableNote'), value: summary.available, tone: 'success' },
    { key: 'occupied', iconName: 'pauseCircle', label: t('room.cards.occupied'), note: t('room.cards.occupiedNote'), value: summary.occupied, tone: 'warning' },
    { key: 'attention', iconName: 'alertCircle', label: t('room.cards.attention'), note: t('room.cards.attentionNote'), value: summary.attention, tone: summary.attention ? 'danger' : 'success' }
  ];
  const children = items.map(item => {
    if (ui?.renderMetricCard) {
      return ui.renderMetricCard({
        tag: 'article',
        title: item.label,
        value: item.value,
        note: item.note,
        tone: item.tone,
        icon: icon(item.iconName),
        className: `room-summary-card room-summary-card--${item.key}`,
        attrs: { 'data-ui-component': 'rooms-summary-card', 'data-room-summary-key': item.key }
      });
    }
    return `
      <article class="room-summary-card room-summary-card--${h(item.key)} ds-card ds-metric-card" data-ui-component="rooms-summary-card" data-room-summary-key="${h(item.key)}">
        <span class="dashboard-card-icon fandqi-ui-metric-icon">${icon(item.iconName)}</span>
        <span class="dashboard-card-title fandqi-ui-metric-title">${h(item.label)}</span>
        <strong class="fandqi-ui-metric-value">${h(String(item.value))}</strong>
        <small class="fandqi-ui-metric-note">${h(item.note)}</small>
      </article>
    `;
  }).join('');
  return `<div class="room-summary-grid ds-summary-grid" data-ui-component="rooms-summary-grid">${children}</div>`;
}

function renderFloorOverviewCards(rooms, floors) {
  if (!floors.length) return '';
  const body = `
    ${renderRoomsPanelTitle(t('room.floors.overviewTitle'), 'dashboard')}
    <div class="floor-overview-grid ds-grid" data-ui-component="rooms-floor-overview-grid">
      ${floors.map(floor => {
        const floorRooms = rooms.filter(room => String(room.floor || '') === String(floor));
        const available = floorRooms.filter(room => getRoomDisplayStatus(room) === 'available').length;
        const occupied = floorRooms.filter(room => getRoomDisplayStatus(room) === 'occupied').length;
        return `
          <article class="floor-overview-card ds-card" data-ui-component="rooms-floor-overview-card" data-floor="${h(floor)}">
            <div class="floor-overview-top ds-section-head compact" data-ui-component="rooms-floor-overview-head">
              <div class="fandqi-ui-section-copy">
                <span class="floor-overview-kicker">${h(t('room.cards.floorLabel'))}</span>
                <h3>${h(t('room.form.floorPrefix'))} ${h(String(floor))}</h3>
              </div>
              <span class="floor-overview-badge ds-badge" data-ui-component="rooms-floor-overview-badge">${h(String(floorRooms.length))}</span>
            </div>
            <div class="floor-overview-stats ds-meta-grid" data-ui-component="rooms-floor-overview-stats">
              <div class="ds-meta-item"><span>${h(t('room.cards.total'))}</span><strong>${h(String(floorRooms.length))}</strong></div>
              <div class="ds-meta-item"><span>${h(t('room.cards.available'))}</span><strong>${h(String(available))}</strong></div>
              <div class="ds-meta-item"><span>${h(t('room.cards.occupied'))}</span><strong>${h(String(occupied))}</strong></div>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
  return renderRoomsSurface({
    className: 'rooms-floor-overview-panel',
    body,
    attrs: { 'data-ui-component': 'rooms-floor-overview-panel' }
  });
}

function renderRoomsFilterPanel({ roomTypes, floors } = {}) {
  const body = `
    <div class="workspace-filter-panel-head ds-section-head compact" data-ui-component="rooms-filter-head">
      <div class="fandqi-ui-section-copy">
        <strong>${h(t('room.filters.title'))}</strong>
        <span>${h(t('room.filters.note'))}</span>
      </div>
    </div>
    ${renderRoomFormGrid(`
      ${renderRoomField({
        label: t('room.filters.search'),
        iconName: 'search',
        control: `<input class="input ds-control" id="roomSearch" value="${h(state.roomFilters.search)}" autocomplete="off">`
      })}
      ${renderRoomField({
        label: t('room.filters.status'),
        iconName: 'status',
        control: `
          <select class="select ds-control" id="roomStatusFilter">
            <option value="all" ${state.roomFilters.status === 'all' ? 'selected' : ''}>${h(t('room.filters.all'))}</option>
            ${['available','booked','occupied','cleaning','maintenance','out_of_service','archived'].map(status => `<option value="${h(status)}" ${state.roomFilters.status === status ? 'selected' : ''}>${h(getRoomStatusLabel(status))}</option>`).join('')}
          </select>
        `
      })}
      ${renderRoomField({
        label: t('room.filters.type'),
        iconName: 'building',
        control: `
          <select class="select ds-control" id="roomTypeFilter">
            <option value="all" ${state.roomFilters.type === 'all' ? 'selected' : ''}>${h(t('room.filters.all'))}</option>
            ${(roomTypes || []).map(type => `<option value="${h(type)}" ${state.roomFilters.type === type ? 'selected' : ''}>${h(getRoomTypeLabel(type))}</option>`).join('')}
          </select>
        `
      })}
      ${renderRoomField({
        label: t('room.filters.floor'),
        iconName: 'dashboard',
        control: `
          <select class="select ds-control" id="roomFloorFilter">
            <option value="" ${state.roomFilters.floor === '' ? 'selected' : ''}>${h(t('room.filters.all'))}</option>
            ${(floors || []).map(floor => `<option value="${h(floor)}" ${String(state.roomFilters.floor) === floor ? 'selected' : ''}>${h(t('room.form.floorPrefix'))} ${h(floor)}</option>`).join('')}
          </select>
        `
      })}
    `, 'filters-bar compact-filters-bar rooms-filters-bar')}
  `;
  return renderRoomsSurface({
    className: 'workspace-filter-panel rooms-filter-panel rooms-central-filter-panel',
    body,
    attrs: { 'data-ui-component': 'rooms-filter-panel', 'data-layout-fixed': 'source-separated-filter' }
  });
}

function renderRoomsPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const rooms = getFilteredRooms();
  const allRooms = getHotelRoomsIncludingArchived(hotel.id);
  const floors = [...new Set([...getHotelFloorOptions(hotel.id), ...allRooms.map(room => String(room.floor || '').trim()).filter(Boolean)])].sort((a, b) => Number(a) - Number(b));
  const roomTypes = [...new Set([...getConfiguredRoomTypes(hotel.id), ...allRooms.map(room => room.type).filter(Boolean)])];
  const summary = getRoomVisualSummary(allRooms.filter(room => room.status !== 'archived'), floors);
  return `
    <div class="hotels-page rooms-page rooms-central-page ds-page" data-ui-page="rooms" data-ui-centralized="phase94-rooms" data-ui-migrated="rooms" data-feature-module="rooms">
      ${renderRoomsPageHead()}
      <p class="helper room-archive-helper" data-ui-component="rooms-archive-helper">${h(t('room.archiveHelper'))}</p>
      ${renderRoomSummaryStrip(summary)}
      ${renderFloorOverviewCards(allRooms.filter(room => room.status !== 'archived'), floors)}
      ${renderRoomsFilterPanel({ roomTypes, floors })}
      <div id="roomsTableSlot" class="rooms-cards-slot rooms-content-after-filter" data-ui-component="rooms-content-slot" data-layout-fixed="after-independent-rooms-filter">${renderRoomsTable(rooms)}</div>
      ${renderRoomModal()}
    </div>
  `;
}

