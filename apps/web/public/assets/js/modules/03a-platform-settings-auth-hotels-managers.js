// Fandqi Modular Refactor — Platform owner settings, hotels, managers, packages, subscriptions, and owner dashboard.
const PLATFORM_SETTINGS_STORAGE_KEY = 'fandqi.platformSettings';

const PLATFORM_OWNER_PASSWORD_STORAGE_KEY = 'fandqi.platformOwnerPassword';
const BACKUP_STORAGE_KEYS = [
  'fandqi.platformSettings',
  'fandqi.platformOwnerPassword',
  'fandqi.hotels',
  'fandqi.subscriptionPackages',
  'fandqi.subscriptions',
  'fandqi.managerSubscriptionRequests',
  'fandqi.hotelSettings',
  'fandqi.hotelStaff',
  'fandqi.rooms',
  'fandqi.reservations',
  'fandqi.foodMenuItems',
  'fandqi.foodOrders',
  'fandqi.maintenanceTickets'
];

const SETTINGS_TABS = [
  { id: 'identity', icon: 'type', label: 'settings.sections.identity' },
  { id: 'defaults', icon: 'settings', label: 'settings.sections.defaults' },
  { id: 'security', icon: 'lockKeyhole', label: 'settings.sections.security' },
  { id: 'billing', icon: 'receipt', label: 'settings.sections.billing' },
  { id: 'notifications', icon: 'bell', label: 'settings.sections.notifications' },
  { id: 'support', icon: 'messageSquare', label: 'settings.sections.support' },
  { id: 'terms', icon: 'fileText', label: 'settings.sections.terms' },
  { id: 'backup', icon: 'fileArchive', label: 'settings.sections.backup' }
];

function getActiveSettingsTab() {
  return SETTINGS_TABS.some(tab => tab.id === state.settingsTab) ? state.settingsTab : 'identity';
}

function resetPlatformSettingsScrollLock() {
  requestAnimationFrame(() => {
    [
      document.querySelector('.page-shell.workspace-blank'),
      document.querySelector('.content'),
      document.querySelector('.settings-page'),
      document.scrollingElement
    ].filter(Boolean).forEach(element => {
      element.scrollTop = 0;
    });
  });
}

function renderSettingsTabs() {
  const activeTab = getActiveSettingsTab();
  const ui = window.FandqiUI || null;
  if (ui?.renderTabs) {
    return ui.renderTabs({
      active: activeTab,
      className: 'settings-tabs platform-settings-tabs owner-settings-tabs',
      tabClassName: 'settings-tab-btn',
      attrs: {
        'data-layout-fixed': 'stable-platform-settings-tabs',
        'aria-label': t('settings.tabsLabel'),
        'data-ui-component': 'owner-settings-tabs',
        'data-ui-owner-central': 'tabs'
      },
      tabs: SETTINGS_TABS.map(tab => ({
        id: tab.id,
        label: t(tab.label),
        icon: icon(tab.icon, 'settings-tab-icon'),
        attrs: { 'data-settings-tab': tab.id, 'data-ui-component': 'owner-settings-tab' }
      }))
    });
  }
  return `
    <div class="settings-tabs platform-settings-tabs owner-settings-tabs" data-layout-fixed="stable-platform-settings-tabs" role="tablist" aria-label="${h(t('settings.tabsLabel'))}" data-ui-component="owner-settings-tabs" data-ui-owner-central="tabs">
      ${SETTINGS_TABS.map(tab => `
        <button class="settings-tab-btn ${tab.id === activeTab ? 'active' : ''}" type="button" role="tab" aria-selected="${tab.id === activeTab ? 'true' : 'false'}" data-settings-tab="${h(tab.id)}" data-ui-component="owner-settings-tab">
          ${icon(tab.icon, 'settings-tab-icon')}
          <span>${h(t(tab.label))}</span>
        </button>
      `).join('')}
    </div>
  `;
}

const HOTEL_SETTINGS_TABS = [
  { id: 'identity', icon: 'building', label: 'hotelSettings.sections.identity' },
  { id: 'contact', icon: 'messageSquare', label: 'hotelSettings.sections.contact' },
  { id: 'operation', icon: 'settings', label: 'hotelSettings.sections.operation' },
  { id: 'services', icon: 'restaurant', label: 'hotelSettings.sections.services' },
  { id: 'policies', icon: 'fileText', label: 'hotelSettings.sections.policies' },
  { id: 'billing', icon: 'receipt', label: 'hotelSettings.sections.billing' }
];

function getActiveHotelSettingsTab() {
  return HOTEL_SETTINGS_TABS.some(tab => tab.id === state.hotelSettingsTab) ? state.hotelSettingsTab : 'identity';
}

function resetHotelSettingsScrollLock() {
  requestAnimationFrame(() => {
    [
      document.querySelector('.page-shell.workspace-blank'),
      document.querySelector('.content'),
      document.querySelector('.hotel-settings-page'),
      document.scrollingElement
    ].filter(Boolean).forEach(element => {
      element.scrollTop = 0;
    });
  });
}

function setHotelSettingsTab(tab) {
  if (!HOTEL_SETTINGS_TABS.some(item => item.id === tab)) return;
  state.hotelSettingsTab = tab;
  writeStorageText('fandqi.hotelSettingsTab', tab);
  render();
  resetHotelSettingsScrollLock();
}

function renderHotelSettingsTabs() {
  const activeTab = getActiveHotelSettingsTab();
  const ui = window.FandqiUI || null;
  if (ui?.renderTabs) {
    return ui.renderTabs({
      active: activeTab,
      className: 'settings-tabs hotel-settings-tabs hotel-settings-central-tabs',
      tabClassName: 'settings-tab-btn',
      attrs: { 'data-layout-fixed': 'stable-hotel-settings-tabs', 'aria-label': t('hotelSettings.tabsLabel'), 'data-ui-component': 'hotel-settings-tabs' },
      tabs: HOTEL_SETTINGS_TABS.map(tab => ({
        id: tab.id,
        label: t(tab.label),
        icon: icon(tab.icon, 'settings-tab-icon'),
        attrs: { 'data-hotel-settings-tab': tab.id }
      }))
    });
  }
  return `
    <div class="settings-tabs hotel-settings-tabs hotel-settings-central-tabs" data-layout-fixed="stable-hotel-settings-tabs" role="tablist" aria-label="${h(t('hotelSettings.tabsLabel'))}" data-ui-component="hotel-settings-tabs">
      ${HOTEL_SETTINGS_TABS.map(tab => `
        <button class="settings-tab-btn ${tab.id === activeTab ? 'active' : ''}" type="button" role="tab" aria-selected="${tab.id === activeTab ? 'true' : 'false'}" data-hotel-settings-tab="${h(tab.id)}">
          ${icon(tab.icon, 'settings-tab-icon')}
          <span>${h(t(tab.label))}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function getPlatformOwnerPassword() {
  return readStorageText(PLATFORM_OWNER_PASSWORD_STORAGE_KEY) || '123456';
}

function writePlatformOwnerPassword(password) {
  if (!password) return;
  writeStorageText(PLATFORM_OWNER_PASSWORD_STORAGE_KEY, password);
}

function getHotelManagerLoginUsers() {
  return readHotels()
    .filter(hotel => hotel.status === 'active' && (hotel.managerStatus || 'active') === 'active' && (hotel.managerEmail || hotel.email) && hotel.managerPassword)
    .map(hotel => ({
      email: hotel.managerEmail || hotel.email,
      password: normalizePassword(hotel.managerPassword),
      name: hotel.managerName || hotel.name || 'Hotel Manager',
      role: 'hotel_manager',
      hotelId: hotel.id,
      hotelName: hotel.name || '',
      photoDataUrl: hotel.managerPhotoDataUrl || ''
    }));
}

function getHotelStaffLoginUsers() {
  return readHotelStaff()
    .filter(staff => staff.status === 'active' && isHotelStaffRole(staff.role) && staff.email && staff.password)
    .map(staff => {
      const hotel = getHotelById(staff.hotelId);
      return {
        email: staff.email,
        password: normalizePassword(staff.password),
        name: staff.fullName || getStaffRoleLabel(staff.role),
        role: staff.role || 'receptionist',
        staffRole: staff.role,
        staffId: staff.id,
        hotelId: staff.hotelId,
        hotelName: hotel?.name || '',
        permissions: Array.isArray(staff.permissions) ? staff.permissions : [],
        shift: staff.shift || 'flexible',
        photoDataUrl: staff.photoDataUrl || ''
      };
    })
    .filter(user => user.hotelId);
}

function findLoginUser(email, password) {
  const loginEmail = normalizeEmail(email);
  const loginPassword = normalizePassword(password);
  const staticUser = USERS.find(item => normalizeEmail(item.email) === loginEmail);
  if (staticUser?.role === 'platform_owner' && loginPassword === normalizePassword(getPlatformOwnerPassword())) return staticUser;

  const managerUser = getHotelManagerLoginUsers().find(item => normalizeEmail(item.email) === loginEmail && normalizePassword(item.password) === loginPassword);
  if (managerUser) return managerUser;

  const staffUser = getHotelStaffLoginUsers().find(item => normalizeEmail(item.email) === loginEmail && normalizePassword(item.password) === loginPassword);
  if (staffUser) return staffUser;

  if (staticUser && staticUser.role !== 'platform_owner' && normalizePassword(staticUser.password) === loginPassword) return staticUser;
  return null;
}

function boolFromFormValue(value) {
  return value === 'on' || value === true || value === 'true';
}


function getDefaultPlatformSettings() {
  return {
    platformName: t('app.name', 'فندقي'),
    platformNameEn: 'Fandqi',
    platformEmail: '',
    platformPhone: '',
    defaultCurrency: 'USD',
    defaultCountry: '',
    timezone: 'Europe/Istanbul',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24',
    defaultLanguage: i18n.state.lang || 'ar',
    defaultTheme: 'light',
    invoiceTitle: t('app.name', 'فندقي'),
    invoiceFooter: '',
    taxRate: 0,
    invoicePrefix: 'INV',
    invoiceLastNumber: 0,
    subscriptionPrefix: 'SUB',
    subscriptionLastNumber: 0,
    subscriptionExpireBeforeDays: 7,
    notifySubscriptionExpired: true,
    notifyNewHotel: true,
    notifyHotelSuspended: true,
    subscriptionWarningMessage: t('settings.defaults.subscriptionWarningMessage', 'تنبيه: اشتراك الفندق سينتهي قريبًا، يرجى التجديد لتجنب إيقاف الخدمة.'),
    subscriptionExpiredMessage: t('settings.defaults.subscriptionExpiredMessage', 'انتهى اشتراك الفندق، يرجى التجديد لإعادة تفعيل الخدمة.'),
    supportEmail: '',
    supportPhone: '',
    supportWhatsapp: '',
    supportWhatsappLink: '',
    facebookUrl: '',
    instagramUrl: '',
    websiteUrl: '',
    subscriptionTerms: '',
    suspensionPolicy: '',
    legalNote: '',
    logoDataUrl: '',
    notes: ''
  };
}

function readPlatformSettings() {
  try {
    const saved = readStorageJson(PLATFORM_SETTINGS_STORAGE_KEY, {});
    return { ...getDefaultPlatformSettings(), ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return getDefaultPlatformSettings();
  }
}

function writePlatformSettings(settings) {
  writeStorageJson(PLATFORM_SETTINGS_STORAGE_KEY, settings);
}

function getPlatformBrandName() {
  const settings = readPlatformSettings();
  if (i18n.state.lang === 'en') return settings.platformNameEn || settings.platformName || t('app.name');
  return settings.platformName || settings.platformNameEn || t('app.name');
}

function getPlatformBrandSubtitle() {
  return t('app.subtitle');
}

function getBrandMarkMarkup(extraClass = '') {
  const settings = readPlatformSettings();
  const className = extraClass ? `brand-mark ${extraClass}` : 'brand-mark';
  if (settings.logoDataUrl) {
    return `<div class="${h(className)} brand-mark-image"><img src="${h(settings.logoDataUrl)}" alt="${h(getPlatformBrandName())}"></div>`;
  }
  return `<div class="${h(className)}">${h(t('app.initial', 'ف'))}</div>`;
}


const HOTEL_STORAGE_KEY = 'fandqi.hotels';

function readHotels() {
  try {
    const value = readStorageJson(HOTEL_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeHotels(hotels) {
  writeStorageJson(HOTEL_STORAGE_KEY, hotels);
}

function createId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusLabel(status) {
  return t(`hotel.status.${status}`, status);
}

function getFilteredHotels() {
  const filters = state.hotelFilters;
  const search = filters.search.trim().toLowerCase();
  const location = filters.location.trim().toLowerCase();
  return readHotels().filter(hotel => {
    const matchesSearch = !search || [hotel.name, hotel.email, hotel.phone, hotel.managerName, hotel.managerEmail]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesStatus = filters.status === 'all' || hotel.status === filters.status;
    const matchesLocation = !location || [hotel.country, hotel.city]
      .some(value => String(value || '').toLowerCase().includes(location));
    return matchesSearch && matchesStatus && matchesLocation;
  });
}

function getHotelById(id) {
  return readHotels().find(hotel => hotel.id === id) || null;
}

function openHotelModal(mode, id = null) {
  state.hotelModal = { mode, id };
  render();
}

function closeHotelModal() {
  state.hotelModal = null;
  render();
}

function renderHotelsTable(hotels) {
  if (!hotels.length) {
    return `
      <div class="empty-panel hotels-empty">
        <div>
          <h2>${h(t('hotel.emptyTitle'))}</h2>
          <p>${h(t('hotel.emptyText'))}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="platform-owner-cards-grid platform-owner-hotel-cards" data-platform-owner-view="cards">
      ${hotels.map(hotel => {
        const location = [hotel.country, hotel.city].filter(Boolean).join(' / ') || '-';
        const managerName = hotel.managerName || '-';
        const status = hotel.status || 'active';
        return `
          <article class="platform-owner-card platform-owner-card--hotel platform-owner-card--${h(status)}">
            <div class="platform-owner-card-top">
              <div class="platform-owner-identity">
                <div class="platform-owner-card-icon">${icon('building')}</div>
                <div>
                  <span class="platform-owner-kicker">${h(t('hotel.columns.name'))}</span>
                  <h3>${h(hotel.name || '-')}</h3>
                  <p>${h(location)}</p>
                </div>
              </div>
              <span class="status-badge ${h(status)}">${h(getStatusLabel(status))}</span>
            </div>

            <div class="platform-owner-manager-strip">
              ${renderPersonAvatar(hotel.managerPhotoDataUrl || '', managerName || hotel.name || '', 'manager-table-avatar')}
              <div>
                <span>${h(t('hotel.columns.manager'))}</span>
                <strong>${h(managerName)}</strong>
              </div>
            </div>

            <div class="platform-owner-meta-grid">
              <div>${icon('phone')}<span>${h(t('hotel.columns.phone'))}</span><strong>${h(hotel.phone || '-')}</strong></div>
              <div>${icon('mail')}<span>${h(t('hotel.columns.email'))}</span><strong>${h(hotel.email || hotel.managerEmail || '-')}</strong></div>
              <div>${icon('calendar')}<span>${h(t('hotel.columns.createdAt'))}</span><strong>${h(hotel.createdAt || '-')}</strong></div>
              <div>${icon('mapPin')}<span>${h(t('hotel.columns.location'))}</span><strong>${h(location)}</strong></div>
            </div>

            <div class="platform-owner-card-actions">
              <button class="btn small ghost" type="button" data-action="view-hotel" data-id="${h(hotel.id)}">${h(t('hotel.actions.view'))}</button>
              <button class="btn small ghost" type="button" data-action="edit-hotel" data-id="${h(hotel.id)}">${h(t('hotel.actions.edit'))}</button>
              <button class="btn small ghost" type="button" data-action="manager-hotel" data-id="${h(hotel.id)}">${h(t('hotel.actions.manager'))}</button>
              <button class="btn small ghost" type="button" data-action="toggle-hotel" data-id="${h(hotel.id)}">${h(hotel.status === 'active' ? t('hotel.actions.suspend') : t('hotel.actions.activate'))}</button>
              <button class="btn small danger" type="button" data-action="archive-hotel" data-id="${h(hotel.id)}">${h(t('hotel.actions.archive'))}</button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderHotelFormModal(mode, hotel) {
  const isEdit = mode === 'edit';
  const isManager = mode === 'manager';
  const title = isManager ? t('hotel.modal.managerTitle') : isEdit ? t('hotel.modal.editTitle') : t('hotel.modal.addTitle');
  const current = hotel || { status: 'active' };
  const sharedEmail = current.email || current.managerEmail || '';
  const passwordValue = current.managerPassword || '';

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card" id="hotelForm" data-mode="${h(mode)}" data-id="${h(current.id || '')}">
        <div class="modal-head">
          <h2>${h(title)}</h2>
          <button class="icon-btn" type="button" data-action="close-modal">${icon('x')}</button>
        </div>

        ${!isManager ? `
          <div class="form-section-title">${h(t('hotel.form.hotelInfo'))}</div>
          <div class="modal-grid">
            <div class="field">${fieldLabel('building', h(t('hotel.form.name')))}<input class="input" name="name" value="${h(current.name || '')}" required></div>
            <div class="field">${fieldLabel('globe', h(t('hotel.form.country')))}<input class="input" name="country" value="${h(current.country || '')}" required></div>
            <div class="field">${fieldLabel('building', h(t('hotel.form.city')))}<input class="input" name="city" value="${h(current.city || '')}" required></div>
            <div class="field">${fieldLabel('mapPin', h(t('hotel.form.address')))}<input class="input" name="address" value="${h(current.address || '')}"></div>
            <div class="field">${fieldLabel('phone', h(t('hotel.form.phone')))}<input class="input" name="phone" value="${h(current.phone || '')}"></div>
            <div class="field">${fieldLabel('mail', h(t('hotel.form.email')))}<input class="input" type="email" name="email" value="${h(sharedEmail)}" required></div>
            <div class="field">${fieldLabel('status', h(t('hotel.form.status')))}
              <select class="select" name="status">
                <option value="active" ${current.status === 'active' ? 'selected' : ''}>${h(t('hotel.status.active'))}</option>
                <option value="suspended" ${current.status === 'suspended' ? 'selected' : ''}>${h(t('hotel.status.suspended'))}</option>
              </select>
            </div>
          </div>
        ` : ''}

        <div class="form-section-title">${h(t('hotel.form.managerInfo'))}</div>
        <div class="modal-grid">
          ${renderAvatarUploader('managerPhoto', current.managerPhotoDataUrl || '', current.managerPhotoFileName || '', current.managerName || current.name || '')}
          <div class="field">${fieldLabel('user', h(t('hotel.form.managerName')))}<input class="input" name="managerName" value="${h(current.managerName || '')}" required></div>
          ${isManager ? `<div class="field">${fieldLabel('mail', h(t('hotel.form.email')))}<input class="input" type="email" name="email" value="${h(sharedEmail)}" required></div>` : ''}
          <div class="field">${fieldLabel('lock', h(t('hotel.form.managerPassword')))}
            <div class="password-field">
              <input class="input" id="managerPasswordField" name="managerPassword" type="password" value="${h(passwordValue)}" required>
              <button class="password-toggle icon-btn" type="button" data-toggle-password="managerPasswordField" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
            </div>
          </div>
          <div class="field">${fieldLabel('lockKeyhole', h(t('hotel.form.managerPasswordConfirm')))}
            <div class="password-field">
              <input class="input" id="managerPasswordConfirmField" name="managerPasswordConfirm" type="password" value="${h(passwordValue)}" required>
              <button class="password-toggle icon-btn" type="button" data-toggle-password="managerPasswordConfirmField" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-action="close-modal">${h(t('common.cancel'))}</button>
          <button class="btn primary" type="submit">${h(t('common.save'))}</button>
        </div>
      </form>
    </div>
  `;
}

function renderHotelViewModal(hotel) {
  if (!hotel) return '';
  const items = [
    ['hotel.form.name', hotel.name],
    ['hotel.form.country', hotel.country],
    ['hotel.form.city', hotel.city],
    ['hotel.form.address', hotel.address],
    ['hotel.form.phone', hotel.phone],
    ['hotel.form.email', hotel.email || hotel.managerEmail],
    ['hotel.form.managerName', hotel.managerName],
    ['hotel.form.status', getStatusLabel(hotel.status)],
    ['hotel.columns.createdAt', hotel.createdAt],
    ['hotel.details.updatedAt', hotel.updatedAt || '-']
  ];

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-head">
          <h2>${h(t('hotel.modal.viewTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-modal">${icon('x')}</button>
        </div>
        <div class="details-grid">
          ${items.map(([label, value]) => `
            <div class="detail-item">
              <span>${h(t(label))}</span>
              <strong>${h(value || '-')}</strong>
            </div>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn primary" type="button" data-action="close-modal">${h(t('common.close'))}</button>
        </div>
      </div>
    </div>
  `;
}

function renderHotelModal() {
  if (!state.hotelModal) return '';
  const { mode, id } = state.hotelModal;
  const hotel = id ? getHotelById(id) : null;
  if (mode === 'view') return renderHotelViewModal(hotel);
  return renderHotelFormModal(mode, hotel);
}

function renderHotelsPage() {
  const hotels = getFilteredHotels();
  return `
    <div class="hotels-page">
      <div class="section-head">
        <div>
          <h2>${h(t('page.hotels'))}</h2>
        </div>
        <button class="btn primary" type="button" id="addHotelBtn">${icon('building')}${h(t('hotel.actions.add'))}</button>
      </div>

      <div class="filters-bar">
        <div class="field"><label>${h(t('hotel.filters.search'))}</label><input class="input" id="hotelSearch" value="${h(state.hotelFilters.search)}" autocomplete="off"></div>
        <div class="field"><label>${h(t('hotel.filters.status'))}</label>
          <select class="select" id="hotelStatusFilter">
            <option value="all" ${state.hotelFilters.status === 'all' ? 'selected' : ''}>${h(t('hotel.filters.all'))}</option>
            <option value="active" ${state.hotelFilters.status === 'active' ? 'selected' : ''}>${h(t('hotel.status.active'))}</option>
            <option value="suspended" ${state.hotelFilters.status === 'suspended' ? 'selected' : ''}>${h(t('hotel.status.suspended'))}</option>
            <option value="archived" ${state.hotelFilters.status === 'archived' ? 'selected' : ''}>${h(t('hotel.status.archived'))}</option>
          </select>
        </div>
        <div class="field"><label>${h(t('hotel.filters.location'))}</label><input class="input" id="hotelLocationFilter" value="${h(state.hotelFilters.location)}" autocomplete="off"></div>
      </div>

      <div id="hotelsTableSlot">${renderHotelsTable(hotels)}</div>
      ${renderHotelModal()}
    </div>
  `;
}


function getHotelManagers() {
  return readHotels()
    .filter(hotel => hotel.managerName || hotel.email || hotel.managerEmail)
    .map(hotel => ({
      hotelId: hotel.id,
      hotelName: hotel.name || '-',
      country: hotel.country || '',
      city: hotel.city || '',
      managerName: hotel.managerName || '-',
      email: hotel.email || hotel.managerEmail || '-',
      managerStatus: hotel.managerStatus || 'active',
      managerPhotoDataUrl: hotel.managerPhotoDataUrl || '',
      managerPhotoFileName: hotel.managerPhotoFileName || '',
      hotelStatus: hotel.status || 'active',
      updatedAt: hotel.updatedAt || hotel.createdAt || '-'
    }));
}

function getFilteredManagers() {
  const filters = state.managerFilters;
  const search = filters.search.trim().toLowerCase();
  return getHotelManagers().filter(manager => {
    const matchesSearch = !search || [manager.managerName, manager.email, manager.hotelName, manager.country, manager.city]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesStatus = filters.status === 'all' || manager.managerStatus === filters.status;
    const matchesHotelStatus = filters.hotelStatus === 'all' || manager.hotelStatus === filters.hotelStatus;
    return matchesSearch && matchesStatus && matchesHotelStatus;
  });
}

function renderManagersTable(managers) {
  if (!managers.length) {
    return `
      <div class="empty-panel hotels-empty">
        <div>
          <h2>${h(t('manager.emptyTitle'))}</h2>
          <p>${h(t('manager.emptyText'))}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="platform-owner-cards-grid platform-owner-manager-cards" data-platform-owner-view="cards">
      ${managers.map(manager => {
        const managerStatus = manager.managerStatus || 'active';
        const hotelStatus = manager.hotelStatus || 'active';
        const location = [manager.country, manager.city].filter(Boolean).join(' / ') || '-';
        return `
          <article class="platform-owner-card platform-owner-card--manager platform-owner-card--${h(managerStatus)}">
            <div class="platform-owner-card-top">
              <div class="platform-owner-identity">
                ${renderPersonAvatar(manager.managerPhotoDataUrl || '', manager.managerName || '', 'platform-owner-card-avatar manager-table-avatar')}
                <div>
                  <span class="platform-owner-kicker">${h(t('manager.columns.manager'))}</span>
                  <h3>${h(manager.managerName || '-')}</h3>
                  <p>${h(manager.email || '-')}</p>
                </div>
              </div>
              <span class="status-badge ${h(managerStatus)}">${h(t(`manager.status.${managerStatus}`))}</span>
            </div>

            <div class="platform-owner-meta-grid">
              <div>${icon('building')}<span>${h(t('manager.columns.hotel'))}</span><strong>${h(manager.hotelName || '-')}</strong></div>
              <div>${icon('mapPin')}<span>${h(t('manager.columns.location'))}</span><strong>${h(location)}</strong></div>
              <div>${icon('shieldCheck')}<span>${h(t('manager.columns.hotelStatus'))}</span><strong>${h(getStatusLabel(hotelStatus))}</strong></div>
              <div>${icon('calendar')}<span>${h(t('manager.columns.updatedAt'))}</span><strong>${h(manager.updatedAt || '-')}</strong></div>
            </div>

            <div class="platform-owner-card-status-row">
              <span class="status-badge ${h(hotelStatus)}">${h(getStatusLabel(hotelStatus))}</span>
              <span class="status-badge ${h(managerStatus)}">${h(t(`manager.status.${managerStatus}`))}</span>
            </div>

            <div class="platform-owner-card-actions platform-owner-card-actions--compact">
              <button class="btn small ghost" type="button" data-action="view-hotel" data-id="${h(manager.hotelId)}">${h(t('hotel.actions.view'))}</button>
              <button class="btn small ghost" type="button" data-action="manager-hotel" data-id="${h(manager.hotelId)}">${h(t('manager.actions.edit'))}</button>
              <button class="btn small ghost" type="button" data-action="toggle-manager" data-id="${h(manager.hotelId)}">${h(manager.managerStatus === 'active' ? t('manager.actions.suspend') : t('manager.actions.activate'))}</button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderManagersPage() {
  const managers = getFilteredManagers();
  return `
    <div class="hotels-page managers-page">
      <div class="section-head">
        <div>
          <h2>${h(t('page.hotel_managers'))}</h2>
        </div>
      </div>

      <div class="filters-bar">
        <div class="field"><label>${h(t('manager.filters.search'))}</label><input class="input" id="managerSearch" value="${h(state.managerFilters.search)}" autocomplete="off"></div>
        <div class="field"><label>${h(t('manager.filters.status'))}</label>
          <select class="select" id="managerStatusFilter">
            <option value="all" ${state.managerFilters.status === 'all' ? 'selected' : ''}>${h(t('manager.filters.all'))}</option>
            <option value="active" ${state.managerFilters.status === 'active' ? 'selected' : ''}>${h(t('manager.status.active'))}</option>
            <option value="suspended" ${state.managerFilters.status === 'suspended' ? 'selected' : ''}>${h(t('manager.status.suspended'))}</option>
          </select>
        </div>
        <div class="field"><label>${h(t('manager.filters.hotelStatus'))}</label>
          <select class="select" id="managerHotelStatusFilter">
            <option value="all" ${state.managerFilters.hotelStatus === 'all' ? 'selected' : ''}>${h(t('manager.filters.all'))}</option>
            <option value="active" ${state.managerFilters.hotelStatus === 'active' ? 'selected' : ''}>${h(t('hotel.status.active'))}</option>
            <option value="suspended" ${state.managerFilters.hotelStatus === 'suspended' ? 'selected' : ''}>${h(t('hotel.status.suspended'))}</option>
            <option value="archived" ${state.managerFilters.hotelStatus === 'archived' ? 'selected' : ''}>${h(t('hotel.status.archived'))}</option>
          </select>
        </div>
      </div>

      <div id="managersTableSlot">${renderManagersTable(managers)}</div>
      ${renderHotelModal()}
    </div>
  `;
}




