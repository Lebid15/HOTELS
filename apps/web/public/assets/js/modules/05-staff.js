// Fandqi Modular Refactor — Hotel staff data, cards, modals, password/shift/permissions, and staff events.
const STAFF_STORAGE_KEY = 'fandqi.hotelStaff';
const STAFF_ROLES = ['receptionist','cashier','housekeeping','maintenance','restaurant','room_service','supervisor'];
const STAFF_STATUSES = ['active','suspended','archived'];
const STAFF_SHIFTS = ['morning','evening','night','flexible'];
const STAFF_PERMISSIONS = ['reservations','check_in_out','payments','rooms','room_service','housekeeping','maintenance','reports'];

function staffFeature() {
  return window.FandqiStaffFeature || null;
}

function readHotelStaff() {
  const feature = staffFeature();
  if (feature?.repository?.read) return feature.repository.read();
  try {
    const value = readStorageJson(STAFF_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeHotelStaff(staff) {
  const feature = staffFeature();
  if (feature?.repository?.write) return feature.repository.write(staff);
  writeStorageJson(STAFF_STORAGE_KEY, staff);
}

function getHotelStaff(hotelId, options = {}) {
  const feature = staffFeature();
  if (feature?.repository?.forHotel) return feature.repository.forHotel(hotelId, options);
  const includeArchived = Boolean(options.includeArchived);
  return readHotelStaff().filter(staff => staff.hotelId === hotelId && (includeArchived || staff.status !== 'archived'));
}

function getStaffById(id) {
  const feature = staffFeature();
  if (feature?.repository?.byId) return feature.repository.byId(id);
  return readHotelStaff().find(staff => staff.id === id) || null;
}

function getStaffRoleLabel(role) {
  return t(`staff.roles.${role}`, role);
}

function getStaffStatusLabel(status) {
  return t(`staff.status.${status}`, status);
}

function getStaffShiftLabel(shift) {
  return t(`staff.shifts.${shift}`, shift);
}

function getStaffPermissionLabel(permission) {
  return t(`staff.permissions.${permission}`, permission);
}

function getCurrentReservationEmployee() {
  const user = state.currentUser || {};
  const hotel = getManagerHotel();
  const staff = user.staffId ? getStaffById(user.staffId) : readHotelStaff().find(item => item.hotelId === hotel?.id && normalizeEmail(item.email) === normalizeEmail(user.email));
  if (staff) {
    return {
      id: staff.id || user.staffId || '',
      name: staff.fullName || user.name || user.email || '-',
      email: staff.email || user.email || '',
      role: staff.role || user.staffRole || user.role || '',
      roleLabel: getStaffRoleLabel(staff.role || user.staffRole || user.role),
      photoDataUrl: staff.photoDataUrl || user.photoDataUrl || '',
      shift: staff.shift || 'flexible',
      shiftLabel: getStaffShiftLabel(staff.shift || 'flexible')
    };
  }
  return {
    id: user.staffId || user.id || '',
    name: user.name || hotel?.managerName || hotel?.name || user.email || '-',
    email: user.email || '',
    role: user.staffRole || user.role || '',
    roleLabel: user.role === 'hotel_manager' ? getRoleLabel('hotel_manager') : getRoleLabel(user.role || 'receptionist'),
    photoDataUrl: user.photoDataUrl || hotel?.managerPhotoDataUrl || '',
    shift: user.role === 'hotel_manager' ? '' : 'flexible',
    shiftLabel: user.role === 'hotel_manager' ? t('reservation.staff.managerShift') : getStaffShiftLabel('flexible')
  };
}

function getReservationBookingEmployeeSummary(reservation) {
  if (!reservation) return '-';
  const name = reservation.bookingEmployeeName || reservation.createdByName || '-';
  const role = reservation.bookingEmployeeRole || reservation.createdByRole || '';
  const shift = reservation.bookingEmployeeShift || '';
  return [name, role, shift].filter(Boolean).join(' - ') || '-';
}

function getReservationBookingEmployeeKey(reservation) {
  return String(reservation?.bookingEmployeeId || reservation?.createdById || reservation?.bookingEmployeeEmail || reservation?.createdByEmail || reservation?.bookingEmployeeName || reservation?.createdByName || '').trim();
}

function getReservationEmployeeFilterOptions(hotelId) {
  const options = new Map();
  getHotelStaff(hotelId).forEach(staff => {
    const key = String(staff.id || staff.email || staff.fullName || '').trim();
    if (key) options.set(key, `${staff.fullName || staff.email || key} - ${getStaffRoleLabel(staff.role)}`);
  });
  getHotelReservations(hotelId).forEach(reservation => {
    const key = getReservationBookingEmployeeKey(reservation);
    const name = reservation.bookingEmployeeName || reservation.createdByName || reservation.bookingEmployeeEmail || reservation.createdByEmail || '';
    if (key && name && !options.has(key)) options.set(key, getReservationBookingEmployeeSummary(reservation));
  });
  return [...options.entries()].map(([value, label]) => ({ value, label }));
}

function getStaffRoleIconName(role) {
  const map = {
    receptionist: 'user',
    cashier: 'creditCard',
    housekeeping: 'checkCircle',
    maintenance: 'shieldAlert',
    restaurant: 'calendar',
    room_service: 'messageSquare',
    supervisor: 'dashboard'
  };
  return map[role] || 'users';
}

function getStaffSummary(staffList) {
  const feature = staffFeature();
  const summary = feature?.selectors?.summarizeStaff ? feature.selectors.summarizeStaff(staffList) : null;
  if (summary) {
    return {
      total: summary.total,
      active: summary.active,
      suspended: summary.suspended,
      reception: summary.roles.receptionist || 0,
      service: ['housekeeping', 'maintenance', 'restaurant', 'room_service'].reduce((sum, role) => sum + Number(summary.roles[role] || 0), 0)
    };
  }
  return {
    total: staffList.length,
    active: staffList.filter(staff => staff.status === 'active').length,
    suspended: staffList.filter(staff => staff.status === 'suspended').length,
    reception: staffList.filter(staff => staff.role === 'receptionist').length,
    service: staffList.filter(staff => ['housekeeping', 'maintenance', 'restaurant', 'room_service'].includes(staff.role)).length
  };
}


function staffUi() {
  return window.FandqiUI || null;
}

function getStaffActionTone(action = '', status = '') {
  if (action === 'view-staff') return 'accent';
  if (action === 'edit-staff') return 'success';
  if (action === 'change-staff-password') return 'luxury';
  if (action === 'change-staff-shift') return 'primary';
  if (action === 'manage-staff-permissions') return 'accent';
  if (action === 'toggle-staff') return status === 'active' ? 'warning' : 'success';
  if (action === 'archive-staff') return 'danger';
  if (action === 'restore-staff') return 'success';
  if (action === 'close-staff-modal') return 'neutral';
  return 'primary';
}

function getStaffActionIcon(action = '') {
  const map = {
    'view-staff': 'eye',
    'edit-staff': 'edit',
    'change-staff-password': 'key',
    'change-staff-shift': 'clock',
    'manage-staff-permissions': 'shieldCheck',
    'toggle-staff': 'pauseCircle',
    'archive-staff': 'fileArchive',
    'restore-staff': 'refreshCw',
    'close-staff-modal': 'x'
  };
  return map[action] || 'users';
}

function renderStaffButton({ label = '', tone = '', size = 'small', action = '', id = '', iconName = '', className = '', attrs = {} } = {}) {
  const ui = staffUi();
  const resolvedTone = tone || getStaffActionTone(action);
  const resolvedIcon = iconName || getStaffActionIcon(action);
  const iconHtml = resolvedIcon ? icon(resolvedIcon) : '';
  const buttonAttrs = {
    'data-ui-component': 'staff-button',
    ...(id ? { 'data-id': id } : {}),
    ...attrs
  };
  if (ui?.renderButton) {
    return ui.renderButton({
      label,
      tone: resolvedTone,
      size,
      action,
      icon: iconHtml,
      className: ['staff-central-button', className].filter(Boolean).join(' '),
      attrs: buttonAttrs
    });
  }
  return `<button class="btn ${h(resolvedTone)} ${h(size)} staff-central-button ${h(className)}" type="button"${action ? ` data-action="${h(action)}"` : ''}${Object.entries(buttonAttrs).map(([key, value]) => value === true ? ` ${h(key)}` : ` ${h(key)}="${h(value)}"`).join('')}>${iconHtml}${h(label)}</button>`;
}

function renderStaffBadge({ label = '', status = 'neutral', className = '', attrs = {} } = {}) {
  const ui = staffUi();
  const badgeAttrs = { 'data-ui-component': 'staff-badge', ...attrs };
  if (ui?.renderBadge) return ui.renderBadge({ label, status, className: ['staff-central-badge', className].filter(Boolean).join(' '), attrs: badgeAttrs });
  return `<span class="status-badge ${h(status)} staff-central-badge ${h(className)}" data-status="${h(status)}" data-ui-component="staff-badge">${h(label)}</span>`;
}

function renderStaffSectionHead({ title, text = '', actions = '' } = {}) {
  const ui = staffUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title,
      text,
      actions,
      className: 'staff-central-head',
      attrs: { 'data-ui-component': 'staff-page-head' }
    });
  }
  return `<div class="section-head staff-central-head" data-ui-component="staff-page-head"><div><h2>${h(title)}</h2>${text ? `<p class="helper">${h(text)}</p>` : ''}</div><div class="ds-actions">${actions}</div></div>`;
}

function renderStaffActions(children, className = '', component = 'staff-actions') {
  const ui = staffUi();
  if (ui?.renderActions) {
    return ui.renderActions({ children, className: ['staff-central-actions', className].filter(Boolean).join(' '), attrs: { 'data-ui-component': component } });
  }
  return `<div class="ds-actions staff-central-actions ${h(className)}" data-ui-component="${h(component)}">${children || ''}</div>`;
}

function renderStaffSurface({ body = '', head = '', className = '', component = 'staff-surface', tag = 'section' } = {}) {
  const ui = staffUi();
  if (ui?.renderSurface) {
    return ui.renderSurface({ tag, head, body, className: ['staff-central-surface', className].filter(Boolean).join(' '), attrs: { 'data-ui-component': component } });
  }
  return `<${tag} class="ds-card ds-surface staff-central-surface ${h(className)}" data-ui-component="${h(component)}">${head}${body}</${tag}>`;
}

function renderStaffField({ label = '', iconName = '', control = '', className = '', component = 'staff-field' } = {}) {
  const ui = staffUi();
  const labelHtml = label ? fieldLabel(iconName || 'status', h(label)) : '';
  if (ui?.renderField) {
    return ui.renderField({ labelHtml, control, className: ['staff-central-field', className].filter(Boolean).join(' '), attrs: { 'data-ui-component': component } });
  }
  return `<div class="field ds-field staff-central-field ${h(className)}" data-ui-component="${h(component)}">${labelHtml}${control}</div>`;
}

function renderStaffFormGrid(children, className = '') {
  const ui = staffUi();
  if (ui?.renderFormGrid) return ui.renderFormGrid({ children, className: ['staff-central-form-grid', className].filter(Boolean).join(' '), attrs: { 'data-ui-component': 'staff-form-grid' } });
  return `<div class="modal-grid compact-modal-grid ds-form-grid staff-central-form-grid ${h(className)}" data-ui-component="staff-form-grid">${children || ''}</div>`;
}

function renderStaffPanelTitle(title, iconName = 'users', className = '') {
  const ui = staffUi();
  if (ui?.renderPanelTitle) return ui.renderPanelTitle({ title, icon: icon(iconName), className: ['staff-central-panel-title', className].filter(Boolean).join(' '), attrs: { 'data-ui-component': 'staff-panel-title' } });
  return `<div class="form-section-title ds-form-section-title staff-central-panel-title ${h(className)}" data-ui-component="staff-panel-title">${icon(iconName)}<span>${h(title)}</span></div>`;
}

function renderStaffEmptyState() {
  const ui = staffUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title: t('staff.emptyTitle'),
      text: t('staff.emptyText'),
      icon: icon('users'),
      className: 'hotels-empty staff-central-empty',
      attrs: { 'data-ui-component': 'staff-empty-state' }
    });
  }
  return `
    <div class="empty-panel hotels-empty staff-central-empty" data-ui-component="staff-empty-state">
      <div>
        <h2>${h(t('staff.emptyTitle'))}</h2>
        <p>${h(t('staff.emptyText'))}</p>
      </div>
    </div>
  `;
}

function renderStaffMetricCard(item) {
  const ui = staffUi();
  const cardOptions = {
    tag: 'article',
    title: item.label,
    value: item.value,
    note: item.note,
    icon: icon(item.iconName),
    tone: `staff-summary-card--${item.key}`,
    className: 'staff-summary-card staff-central-summary-card',
    attrs: { 'data-ui-component': 'staff-summary-card', 'data-staff-summary': item.key }
  };
  if (ui?.renderMetricCard) return ui.renderMetricCard(cardOptions);
  return `<article class="staff-summary-card staff-central-summary-card staff-summary-card--${h(item.key)}" data-ui-component="staff-summary-card" data-staff-summary="${h(item.key)}"><div class="staff-summary-icon">${icon(item.iconName)}</div><div class="staff-summary-content"><span class="staff-summary-label">${h(item.label)}</span><strong class="staff-summary-value">${h(String(item.value))}</strong><small class="staff-summary-note">${h(item.note)}</small></div></article>`;
}

function renderStaffSummaryStrip(staffList) {
  const summary = getStaffSummary(staffList);
  const items = [
    { key: 'total', iconName: 'users', label: t('staff.cards.total'), note: t('staff.cards.totalNote'), value: summary.total },
    { key: 'active', iconName: 'checkCircle', label: t('staff.cards.active'), note: t('staff.cards.activeNote'), value: summary.active },
    { key: 'suspended', iconName: 'pauseCircle', label: t('staff.cards.suspended'), note: t('staff.cards.suspendedNote'), value: summary.suspended },
    { key: 'reception', iconName: 'user', label: t('staff.cards.reception'), note: t('staff.cards.receptionNote'), value: summary.reception },
    { key: 'service', iconName: 'settings', label: t('staff.cards.service'), note: t('staff.cards.serviceNote'), value: summary.service }
  ];
  return `
    <div class="staff-summary-grid ds-summary-grid" data-ui-component="staff-summary-grid">
      ${items.map(renderStaffMetricCard).join('')}
    </div>
  `;
}

function renderStaffMetaItem(iconName, value, className = '') {
  return `<div class="staff-meta-item ds-meta-item ${h(className)}" data-ui-component="staff-meta-item">${icon(iconName)}<span>${h(value || '-')}</span></div>`;
}

function renderStaffCard(staff) {
  const status = staff.status || 'active';
  const isActive = status === 'active';
  const isArchived = status === 'archived';
  const actionButtons = (isArchived ? [
    renderStaffButton({ label: t('staff.actions.view'), action: 'view-staff', id: staff.id }),
    renderStaffButton({ label: t('staff.actions.restore'), tone: 'success', action: 'restore-staff', id: staff.id, iconName: 'refreshCw' })
  ] : [
    renderStaffButton({ label: t('staff.actions.view'), action: 'view-staff', id: staff.id }),
    renderStaffButton({ label: t('staff.actions.edit'), action: 'edit-staff', id: staff.id }),
    renderStaffButton({ label: t('staff.actions.changePassword'), action: 'change-staff-password', id: staff.id }),
    renderStaffButton({ label: t('staff.actions.changeShift'), action: 'change-staff-shift', id: staff.id }),
    renderStaffButton({ label: t('staff.actions.managePermissions'), action: 'manage-staff-permissions', id: staff.id }),
    renderStaffButton({ label: isActive ? t('staff.actions.suspend') : t('staff.actions.activate'), action: 'toggle-staff', id: staff.id, tone: isActive ? 'warning' : 'success', iconName: isActive ? 'pauseCircle' : 'checkCircle' }),
    renderStaffButton({ label: t('staff.actions.archive'), tone: 'danger', action: 'archive-staff', id: staff.id })
  ]).join('');
  return `
    <article class="staff-card ds-card staff-central-card staff-card--${h(staff.status || 'active')} staff-card--no-permissions" data-ui-component="staff-card" data-staff-id="${h(staff.id || '')}">
      <div class="staff-card-top" data-ui-component="staff-card-head">
        <div class="staff-card-title-wrap">
          ${renderPersonAvatar(staff.photoDataUrl || '', staff.fullName || '', 'staff-card-avatar')}
          <div class="staff-card-identity">
            ${renderStaffBadge({ label: getStaffRoleLabel(staff.role), status: 'neutral', className: 'staff-role-chip' })}
            <h3>${h(staff.fullName || '-')}</h3>
            <p>${h(staff.email || t('staff.cards.noEmail'))}</p>
          </div>
        </div>
        ${renderStaffBadge({ label: getStaffStatusLabel(staff.status || 'active'), status: staff.status || 'active', className: 'staff-status-chip' })}
      </div>

      <div class="staff-meta-grid ds-meta-grid" data-ui-component="staff-meta-grid">
        ${renderStaffMetaItem('phone', staff.phone || t('staff.cards.noPhone'))}
        ${renderStaffMetaItem('clock', getStaffShiftLabel(staff.shift || 'flexible'))}
      </div>

      <p class="staff-card-note ${staff.notes ? '' : 'staff-card-note--muted'}" data-ui-component="staff-note">${h(staff.notes || t('staff.cards.noNotes'))}</p>

      ${renderStaffActions(actionButtons, 'staff-card-actions staff-card-actions--fixed-grid staff-card-actions--central row-actions', 'staff-card-actions')}
    </article>
  `;
}
function getFilteredStaff() {
  const hotel = getManagerHotel();
  if (!hotel) return [];
  const feature = staffFeature();
  if (feature?.selectors?.filterStaff) {
    return feature.selectors.filterStaff(getHotelStaff(hotel.id, { includeArchived: state.staffFilters.status === 'archived' }), {
      search: state.staffFilters.search,
      role: state.staffFilters.role,
      status: state.staffFilters.status,
      getRoleLabel: getStaffRoleLabel
    });
  }
  const search = state.staffFilters.search.trim().toLowerCase();
  return getHotelStaff(hotel.id, { includeArchived: state.staffFilters.status === 'archived' }).filter(staff => {
    const matchesSearch = !search || [staff.fullName, staff.email, staff.phone, getStaffRoleLabel(staff.role), staff.notes]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesRole = state.staffFilters.role === 'all' || staff.role === state.staffFilters.role;
    const matchesStatus = state.staffFilters.status === 'all' || staff.status === state.staffFilters.status;
    return matchesSearch && matchesRole && matchesStatus;
  });
}

function openStaffModal(mode, id = null) {
  state.staffModal = { mode, id };
  render();
}

function closeStaffModal() {
  state.staffModal = null;
  render();
}

function renderStaffTable(staffList) {
  if (!staffList.length) return renderStaffEmptyState();
  const feature = staffFeature();
  const sortedStaff = feature?.selectors?.sortStaffByName ? feature.selectors.sortStaffByName(staffList) : [...staffList].sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')));
  return `
    <div class="staff-cards-grid staff-cards-grid--compact ds-grid" data-layout-fixed="staff-cards-roomy-grid" data-ui-component="staff-cards-grid">
      ${sortedStaff.map(renderStaffCard).join('')}
    </div>
  `;
}

function renderStaffFormModal(mode, staff) {
  const hotel = getManagerHotel();
  if (!hotel) return '';
  const isEdit = mode === 'edit';
  const current = staff || { role: 'receptionist', status: 'active', shift: 'flexible', permissions: ['reservations','check_in_out'] };
  const permissions = Array.isArray(current.permissions) ? current.permissions : [];
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card compact-modal-card ds-modal-card staff-modal-card-central" data-ui-component="staff-modal-card" id="staffForm" data-mode="${h(mode)}" data-id="${h(current.id || '')}">
        <div class="modal-head ds-section-head staff-modal-head" data-ui-component="staff-modal-head">
          <h2>${h(isEdit ? t('staff.modal.editTitle') : t('staff.modal.addTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-staff-modal">${icon('x')}</button>
        </div>
        <div class="form-section-title ds-form-section-title" data-ui-component="staff-panel-title">${h(t('staff.form.basicInfo'))}</div>
        <div class="modal-grid compact-modal-grid staff-form-grid ds-form-grid" data-ui-component="staff-form-grid">
          ${renderAvatarUploader('staffPhoto', current.photoDataUrl || '', current.photoFileName || '', current.fullName || '')}
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('user', h(t('staff.form.fullName')))}<input class="input" name="fullName" value="${h(current.fullName || '')}" required></div>
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('users', h(t('staff.form.role')))}
            <select class="select" name="role" required>
              ${STAFF_ROLES.map(role => `<option value="${h(role)}" ${current.role === role ? 'selected' : ''}>${h(getStaffRoleLabel(role))}</option>`).join('')}
            </select>
          </div>
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('phone', h(t('staff.form.phone')))}<input class="input" name="phone" value="${h(current.phone || '')}"></div>
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('mail', h(t('staff.form.email')))}<input class="input" type="email" name="email" value="${h(current.email || '')}"></div>
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('lock', h(t('staff.form.password')))}
            <div class="password-field">
              <input class="input" id="staffPassword" name="password" type="password" value="${h(current.password || '')}">
              <button class="password-toggle icon-btn" type="button" data-toggle-password="staffPassword" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
            </div>
          </div>
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('lockKeyhole', h(t('staff.form.confirmPassword')))}
            <div class="password-field">
              <input class="input" id="staffConfirmPassword" name="confirmPassword" type="password" value="${h(current.password || '')}">
              <button class="password-toggle icon-btn" type="button" data-toggle-password="staffConfirmPassword" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
            </div>
          </div>
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('clock', h(t('staff.form.shift')))}
            <select class="select" name="shift" required>
              ${STAFF_SHIFTS.map(shift => `<option value="${h(shift)}" ${current.shift === shift ? 'selected' : ''}>${h(getStaffShiftLabel(shift))}</option>`).join('')}
            </select>
          </div>
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('status', h(t('staff.form.status')))}
            <select class="select" name="status" required>
              ${STAFF_STATUSES.map(status => `<option value="${h(status)}" ${current.status === status ? 'selected' : ''}>${h(getStaffStatusLabel(status))}</option>`).join('')}
            </select>
          </div>
          <div class="field field-full ds-field staff-permissions-field">
            <div class="form-section-title mini-title ds-form-section-title" data-ui-component="staff-panel-title">${h(t('staff.form.permissions'))}</div>
            <div class="permissions-grid ds-grid" data-ui-component="staff-permissions-grid">
              ${STAFF_PERMISSIONS.map(permission => `
                <label class="permission-chip ds-badge" data-ui-component="staff-permission-chip">
                  <input type="checkbox" name="permissions" value="${h(permission)}" ${permissions.includes(permission) ? 'checked' : ''}>
                  <span>${h(getStaffPermissionLabel(permission))}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="field field-full ds-field">${fieldLabel('notes', h(t('staff.form.notes')))}<textarea class="input textarea" name="notes" rows="2">${h(current.notes || '')}</textarea></div>
        </div>
        <div class="modal-actions ds-actions staff-modal-actions" data-ui-component="staff-modal-actions">
          <button class="btn ghost" type="button" data-action="close-staff-modal">${h(t('common.cancel'))}</button>
          <button class="btn primary" type="submit">${h(t('common.save'))}</button>
        </div>
      </form>
    </div>
  `;
}

function renderStaffPasswordModal(staff) {
  if (!staff) return '';
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card compact-modal-card staff-quick-modal ds-modal-card staff-modal-card-central" data-ui-component="staff-modal-card" id="staffPasswordForm" data-id="${h(staff.id)}">
        <div class="modal-head ds-section-head staff-modal-head" data-ui-component="staff-modal-head">
          <h2>${h(t('staff.modal.passwordTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-staff-modal">${icon('x')}</button>
        </div>
        <div class="staff-quick-header ds-card" data-ui-component="staff-quick-header">
          ${renderPersonAvatar(staff.photoDataUrl || '', staff.fullName || '', 'staff-quick-avatar')}
          <div>
            <strong>${h(staff.fullName || '-')}</strong>
            <small>${h(getStaffRoleLabel(staff.role))}</small>
          </div>
        </div>
        <div class="modal-grid compact-modal-grid ds-form-grid" data-ui-component="staff-form-grid">
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('lock', h(t('staff.form.password')))}
            <div class="password-field">
              <input class="input" id="quickStaffPassword" name="password" type="password" required>
              <button class="password-toggle icon-btn" type="button" data-toggle-password="quickStaffPassword" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
            </div>
          </div>
          <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('lockKeyhole', h(t('staff.form.confirmPassword')))}
            <div class="password-field">
              <input class="input" id="quickStaffConfirmPassword" name="confirmPassword" type="password" required>
              <button class="password-toggle icon-btn" type="button" data-toggle-password="quickStaffConfirmPassword" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
            </div>
          </div>
        </div>
        <div class="modal-actions ds-actions staff-modal-actions" data-ui-component="staff-modal-actions">
          <button class="btn ghost" type="button" data-action="close-staff-modal">${h(t('common.cancel'))}</button>
          <button class="btn primary" type="submit">${h(t('common.save'))}</button>
        </div>
      </form>
    </div>
  `;
}

function renderStaffShiftModal(staff) {
  if (!staff) return '';
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card compact-modal-card staff-quick-modal ds-modal-card staff-modal-card-central" data-ui-component="staff-modal-card" id="staffShiftForm" data-id="${h(staff.id)}">
        <div class="modal-head ds-section-head staff-modal-head" data-ui-component="staff-modal-head">
          <h2>${h(t('staff.modal.shiftTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-staff-modal">${icon('x')}</button>
        </div>
        <div class="staff-quick-header ds-card" data-ui-component="staff-quick-header">
          ${renderPersonAvatar(staff.photoDataUrl || '', staff.fullName || '', 'staff-quick-avatar')}
          <div>
            <strong>${h(staff.fullName || '-')}</strong>
            <small>${h(t('staff.cards.currentShift'))}: ${h(getStaffShiftLabel(staff.shift || 'flexible'))}</small>
          </div>
        </div>
        <div class="field ds-field" data-ui-component="staff-field">${fieldLabel('clock', h(t('staff.form.shift')))}
          <select class="select" name="shift" required>
            ${STAFF_SHIFTS.map(shift => `<option value="${h(shift)}" ${staff.shift === shift ? 'selected' : ''}>${h(getStaffShiftLabel(shift))}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions ds-actions staff-modal-actions" data-ui-component="staff-modal-actions">
          <button class="btn ghost" type="button" data-action="close-staff-modal">${h(t('common.cancel'))}</button>
          <button class="btn primary" type="submit">${h(t('common.save'))}</button>
        </div>
      </form>
    </div>
  `;
}

function renderStaffPermissionsModal(staff) {
  if (!staff) return '';
  const permissions = Array.isArray(staff.permissions) ? staff.permissions : [];
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card compact-modal-card staff-quick-modal ds-modal-card staff-modal-card-central" data-ui-component="staff-modal-card" id="staffPermissionsForm" data-id="${h(staff.id)}">
        <div class="modal-head ds-section-head staff-modal-head" data-ui-component="staff-modal-head">
          <h2>${h(t('staff.modal.permissionsTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-staff-modal">${icon('x')}</button>
        </div>
        <div class="staff-quick-header ds-card" data-ui-component="staff-quick-header">
          ${renderPersonAvatar(staff.photoDataUrl || '', staff.fullName || '', 'staff-quick-avatar')}
          <div>
            <strong>${h(staff.fullName || '-')}</strong>
            <small>${h(getStaffRoleLabel(staff.role))}</small>
          </div>
        </div>
        <div class="permissions-grid staff-quick-permissions-grid ds-grid" data-ui-component="staff-permissions-grid">
          ${STAFF_PERMISSIONS.map(permission => `
            <label class="permission-chip ds-badge" data-ui-component="staff-permission-chip">
              <input type="checkbox" name="permissions" value="${h(permission)}" ${permissions.includes(permission) ? 'checked' : ''}>
              <span>${h(getStaffPermissionLabel(permission))}</span>
            </label>
          `).join('')}
        </div>
        <div class="modal-actions ds-actions staff-modal-actions" data-ui-component="staff-modal-actions">
          <button class="btn ghost" type="button" data-action="close-staff-modal">${h(t('common.cancel'))}</button>
          <button class="btn primary" type="submit">${h(t('common.save'))}</button>
        </div>
      </form>
    </div>
  `;
}

function renderStaffViewModal(staff) {
  if (!staff) return '';
  const items = [
    ['staff.form.fullName', staff.fullName],
    ['staff.form.role', getStaffRoleLabel(staff.role)],
    ['staff.form.phone', staff.phone || '-'],
    ['staff.form.email', staff.email || '-'],
    ['staff.form.shift', getStaffShiftLabel(staff.shift || 'flexible')],
    ['staff.form.status', getStaffStatusLabel(staff.status)],
    ['staff.form.permissions', (staff.permissions || []).map(getStaffPermissionLabel).join(t('common.listSeparator', '، ')) || '-'],
    ['staff.columns.createdAt', staff.createdAt || '-'],
    ['staff.columns.updatedAt', staff.updatedAt || '-'],
    ['staff.form.notes', staff.notes || '-']
  ];
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card compact-modal-card ds-modal-card staff-modal-card-central" data-ui-component="staff-modal-card">
        <div class="modal-head ds-section-head staff-modal-head" data-ui-component="staff-modal-head">
          <h2>${h(t('staff.modal.viewTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-staff-modal">${icon('x')}</button>
        </div>
        <div class="staff-view-hero ds-card" data-ui-component="staff-view-hero">
          ${renderPersonAvatar(staff.photoDataUrl || '', staff.fullName || '', 'staff-view-avatar')}
          <div>
            <strong>${h(staff.fullName || '-')}</strong>
            <small>${h(getStaffRoleLabel(staff.role))}</small>
          </div>
        </div>
        <div class="details-grid compact-details-grid ds-meta-grid" data-ui-component="staff-details-grid">
          ${items.map(([label, value]) => `
            <div class="detail-item ds-meta-item" data-ui-component="staff-detail-item">
              <span>${h(t(label))}</span>
              <strong>${h(value || '-')}</strong>
            </div>
          `).join('')}
        </div>
        <div class="modal-actions ds-actions staff-modal-actions" data-ui-component="staff-modal-actions">
          <button class="btn primary" type="button" data-action="close-staff-modal">${h(t('common.close'))}</button>
        </div>
      </div>
    </div>
  `;
}

function renderStaffModal() {
  if (!state.staffModal) return '';
  const { mode, id } = state.staffModal;
  const staff = id ? getStaffById(id) : null;
  if (mode === 'view') return renderStaffViewModal(staff);
  if (mode === 'password') return renderStaffPasswordModal(staff);
  if (mode === 'shift') return renderStaffShiftModal(staff);
  if (mode === 'permissions') return renderStaffPermissionsModal(staff);
  return renderStaffFormModal(mode, staff);
}

function renderStaffFilterPanel() {
  const searchControl = `<input class="input ds-control" id="staffSearch" value="${h(state.staffFilters.search)}" autocomplete="off">`;
  const roleControl = `
    <select class="select ds-control" id="staffRoleFilter">
      <option value="all" ${state.staffFilters.role === 'all' ? 'selected' : ''}>${h(t('staff.filters.all'))}</option>
      ${STAFF_ROLES.map(role => `<option value="${h(role)}" ${state.staffFilters.role === role ? 'selected' : ''}>${h(getStaffRoleLabel(role))}</option>`).join('')}
    </select>
  `;
  const statusControl = `
    <select class="select ds-control" id="staffStatusFilter">
      <option value="all" ${state.staffFilters.status === 'all' ? 'selected' : ''}>${h(t('staff.filters.all'))}</option>
      ${STAFF_STATUSES.map(status => `<option value="${h(status)}" ${state.staffFilters.status === status ? 'selected' : ''}>${h(getStaffStatusLabel(status))}</option>`).join('')}
    </select>
  `;
  return `
    <div class="filters-bar compact-filters-bar staff-filters-bar ds-filters staff-central-filter-panel" data-ui-component="staff-filter-panel">
      ${renderStaffField({ label: t('staff.filters.search'), iconName: 'search', control: searchControl, className: 'field-search', component: 'staff-search-field' })}
      ${renderStaffField({ label: t('staff.filters.role'), iconName: 'users', control: roleControl, component: 'staff-role-filter-field' })}
      ${renderStaffField({ label: t('staff.filters.status'), iconName: 'status', control: statusControl, component: 'staff-status-filter-field' })}
    </div>
  `;
}

function renderStaffPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const staff = getFilteredStaff();
  const allStaff = getHotelStaff(hotel.id);
  const headActions = renderStaffButton({ label: t('staff.actions.add'), tone: 'primary', size: '', iconName: 'users', attrs: { id: 'addStaffBtn' } });
  return `
    <div class="hotels-page staff-page staff-central-page" data-ui-migrated="staff" data-ui-centralized="phase97-staff" data-feature-module="staff" data-ui-component="staff-page">
      ${renderStaffSectionHead({
        title: t('page.staff'),
        text: t('staff.pageDescription'),
        actions: headActions
      })}
      <div id="staffSummarySlot" data-ui-component="staff-summary-slot">${renderStaffSummaryStrip(allStaff)}</div>
      ${renderStaffFilterPanel()}
      ${renderStaffSurface({
        className: 'staff-cards-panel',
        component: 'staff-cards-panel',
        body: `<div id="staffTableSlot" class="staff-cards-slot" data-ui-component="staff-cards-slot">${renderStaffTable(staff)}</div>`
      })}
      ${renderStaffModal()}
    </div>
  `;
}
