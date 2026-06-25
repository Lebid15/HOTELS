// Fandqi Modular Refactor — Hotel settings tabs, identity, operations, room types, restaurant/cafeteria configuration, and settings events.
const HOTEL_SETTINGS_STORAGE_KEY = 'fandqi.hotelSettings';

function readHotelSettingsMap() {
  try {
    const value = readStorageJson(HOTEL_SETTINGS_STORAGE_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function writeHotelSettingsMap(map) {
  writeStorageJson(HOTEL_SETTINGS_STORAGE_KEY, map || {});
}



function getHotelSettingsUi() {
  return window.FandqiUI || null;
}

function renderHotelSettingsCentralButton(options = {}) {
  const ui = getHotelSettingsUi();
  if (ui?.renderButton) return ui.renderButton(options);
  return `<button class="btn ${h(options.tone || 'primary')} ${h(options.className || '')}" type="${h(options.type || 'button')}">${options.icon || ''}${h(options.label || '')}</button>`;
}

function renderHotelSettingsPanelTitle(title, iconName = 'settings') {
  const ui = getHotelSettingsUi();
  if (ui?.renderPanelTitle) {
    return ui.renderPanelTitle({ title, icon: iconName ? icon(iconName) : '', attrs: { 'data-ui-component': 'hotel-settings-panel-title' } });
  }
  return `<div class="form-section-title ds-form-section-title" data-ui-component="hotel-settings-panel-title">${iconName ? icon(iconName) : ''}<span>${h(title)}</span></div>`;
}

function renderHotelSettingsField({ iconName = 'settings', label = '', control = '', helper = '', className = '', attrs = {} }) {
  const ui = getHotelSettingsUi();
  const labelHtml = fieldLabel(iconName, h(label));
  if (ui?.renderField) {
    return ui.renderField({
      labelHtml,
      control,
      helper,
      className,
      attrs: { 'data-ui-component': 'hotel-settings-field', ...attrs }
    });
  }
  return `<div class="field ds-field ${h(className)}" data-ui-component="hotel-settings-field">${labelHtml}${control}${helper ? `<p class="helper">${h(helper)}</p>` : ''}</div>`;
}

function renderHotelSettingsInput(name, value, label, iconName, options = {}) {
  const dataAttrs = options.dataAttrs || '';
  const attrs = [
    `class="input ds-control"`,
    options.type ? `type="${h(options.type)}"` : '',
    `name="${h(name)}"`,
    options.id ? `id="${h(options.id)}"` : '',
    options.min !== undefined ? `min="${h(options.min)}"` : '',
    options.max !== undefined ? `max="${h(options.max)}"` : '',
    options.step !== undefined ? `step="${h(options.step)}"` : '',
    options.required ? 'required' : '',
    options.placeholder ? `placeholder="${h(options.placeholder)}"` : '',
    dataAttrs,
    `value="${h(value)}"`
  ].filter(Boolean).join(' ');
  return renderHotelSettingsField({ iconName, label, className: options.className || '', attrs: options.attrs || {}, control: `<input ${attrs}>` });
}

function renderHotelSettingsSelect(name, value, label, iconName, choices, options = {}) {
  const control = `<select class="select ds-control" name="${h(name)}"${options.id ? ` id="${h(options.id)}"` : ''}${options.dataAttrs || ''}>${choices.map(choice => {
    const choiceValue = typeof choice === 'object' ? choice.value : choice;
    const choiceLabel = typeof choice === 'object' ? choice.label : choice;
    return `<option value="${h(choiceValue)}" ${String(value) === String(choiceValue) ? 'selected' : ''}>${h(choiceLabel)}</option>`;
  }).join('')}</select>`;
  return renderHotelSettingsField({ iconName, label, className: options.className || '', control });
}

function renderHotelSettingsTextarea(name, value, label, iconName, options = {}) {
  const rows = options.rows || 3;
  const control = `<textarea class="input textarea ds-control" name="${h(name)}" rows="${h(rows)}">${h(value)}</textarea>`;
  return renderHotelSettingsField({ iconName, label, className: options.className || '', control });
}

function renderHotelSettingsCheck(name, checked, label, iconName = 'checkCircle', options = {}) {
  const ui = getHotelSettingsUi();
  if (ui?.renderCheckField) {
    return ui.renderCheckField({
      name,
      id: options.id,
      checked: boolFromFormValue(checked),
      label,
      icon: icon(iconName, 'check-icon'),
      className: options.className || '',
      inputAttrs: options.inputAttrs || {},
      attrs: { 'data-ui-component': 'hotel-settings-check-field', ...(options.attrs || {}) }
    });
  }
  const checkedAttr = boolFromFormValue(checked) ? 'checked' : '';
  return `<label class="check-row settings-check ds-check-field ${h(options.className || '')}" data-ui-component="hotel-settings-check-field"><input type="checkbox" name="${h(name)}" ${checkedAttr}><span class="check-label">${icon(iconName, 'check-icon')}<span>${h(label)}</span></span></label>`;
}

function renderHotelSettingsFormGrid(children, className = '') {
  const ui = getHotelSettingsUi();
  if (ui?.renderFormGrid) {
    return ui.renderFormGrid({ children, className, attrs: { 'data-ui-component': 'hotel-settings-form-grid' } });
  }
  return `<div class="modal-grid compact-modal-grid ds-form-grid ${h(className)}" data-ui-component="hotel-settings-form-grid">${children}</div>`;
}

function renderHotelSettingsPanel(tab, activeTab, iconName, title, body, extraClass = '') {
  const ui = getHotelSettingsUi();
  const isActive = tab === activeTab;
  const className = `settings-card settings-tab-panel hotel-settings-panel ${extraClass} ${isActive ? 'active' : ''}`.trim();
  const attrs = {
    'data-hotel-settings-panel': tab,
    'data-ui-component': 'hotel-settings-panel',
    role: 'tabpanel'
  };
  const panelBody = `${renderHotelSettingsPanelTitle(title, iconName)}${body}`;
  if (ui?.renderSurface) {
    return ui.renderSurface({ tag: 'section', className, body: panelBody, attrs });
  }
  return `<section class="ds-card ds-surface ${h(className)}" data-hotel-settings-panel="${h(tab)}" data-ui-component="hotel-settings-panel" role="tabpanel">${panelBody}</section>`;
}

const DEFAULT_ROOM_TYPES = ['single', 'double', 'triple', 'suite', 'wing', 'suite_room', 'deluxe', 'family'];

function parseRoomTypes(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  const raw = String(value || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(item => String(item || '').trim()).filter(Boolean);
  } catch {}
  return raw.split(/[\n,|]+/).map(item => item.trim()).filter(Boolean);
}

function serializeRoomTypes(types) {
  const unique = [];
  types.forEach(type => {
    const value = String(type || '').trim();
    if (!value) return;
    if (unique.some(item => item.toLowerCase() === value.toLowerCase())) return;
    unique.push(value);
  });
  return JSON.stringify(unique);
}

function getConfiguredRoomTypes(hotelId, settingsOverride = null) {
  const settings = settingsOverride || (hotelId ? readHotelSettings(hotelId) : null);
  const parsed = parseRoomTypes(settings?.roomTypes);
  const source = parsed.length ? parsed : [];
  const merged = [];
  [...source, ...DEFAULT_ROOM_TYPES].forEach(type => {
    const value = String(type || '').trim();
    if (!value) return;
    if (merged.some(item => item.toLowerCase() === value.toLowerCase())) return;
    merged.push(value);
  });
  return merged.length ? merged : [...DEFAULT_ROOM_TYPES];
}

function getHotelFloorOptions(hotelId) {
  const settings = hotelId ? readHotelSettings(hotelId) : null;
  const floorsCount = Math.max(1, Number(settings?.floorsCount || 1));
  return Array.from({ length: floorsCount }, (_, index) => String(index + 1));
}

function renderRoomTypesChips(types) {
  const normalized = parseRoomTypes(types);
  if (!normalized.length) {
    return `<div class="room-types-empty">${h(t('hotelSettings.roomTypes.empty'))}</div>`;
  }
  return normalized.map((type, index) => `
    <span class="room-type-chip" title="${h(getRoomTypeLabel(type))}">
      <span class="room-type-chip-label">${h(getRoomTypeLabel(type))}</span>
      <button class="room-type-remove" type="button" data-room-type-index="${h(index)}" aria-label="${h(t('hotelSettings.actions.removeRoomType'))}" title="${h(t('hotelSettings.actions.removeRoomType'))}">
        <span class="room-type-remove-icon" aria-hidden="true">${icon('x')}</span>
      </button>
    </span>
  `).join('');
}

function getHotelSettingsRoomTypesFromDom() {
  const hidden = document.getElementById('hotelRoomTypesInput');
  return parseRoomTypes(hidden?.value);
}

function setHotelSettingsRoomTypesInDom(types) {
  const normalized = parseRoomTypes(types);
  const hidden = document.getElementById('hotelRoomTypesInput');
  const list = document.getElementById('hotelRoomTypesList');
  if (hidden) hidden.value = serializeRoomTypes(normalized);
  if (list) {
    list.innerHTML = renderRoomTypesChips(normalized);
    applyCentralDesignSystem(list);
  }
  bindHotelRoomTypeRemoveButtons();
}

function bindHotelRoomTypeRemoveButtons() {
  document.querySelectorAll('[data-room-type-index]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.roomTypeIndex);
      const types = getHotelSettingsRoomTypesFromDom();
      if (!Number.isInteger(index)) return;
      types.splice(index, 1);
      setHotelSettingsRoomTypesInDom(types);
    });
  });
}

function bindHotelRoomTypeEditor() {
  const input = document.getElementById('roomTypeNewInput');
  const button = document.getElementById('addRoomTypeBtn');
  if (!input || !button) return;

  const addType = () => {
    const value = String(input.value || '').trim();
    if (!value) return;
    const types = getHotelSettingsRoomTypesFromDom();
    if (types.some(type => type.toLowerCase() === value.toLowerCase())) {
      toast(t('hotelSettings.roomTypes.duplicate'));
      return;
    }
    types.push(value);
    input.value = '';
    setHotelSettingsRoomTypesInDom(types);
  };

  button.addEventListener('click', addType);
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addType();
  });

  setHotelSettingsRoomTypesInDom(getHotelSettingsRoomTypesFromDom());
}

function getDefaultHotelSettings(hotel) {
  const platformSettings = readPlatformSettings();
  return {
    displayName: hotel?.name || '',
    logoDataUrl: '',
    country: hotel?.country || platformSettings.defaultCountry || '',
    city: hotel?.city || '',
    address: hotel?.address || '',
    phone: hotel?.phone || '',
    email: hotel?.email || hotel?.managerEmail || '',
    receptionPhone: hotel?.phone || '',
    reservationsPhone: '',
    whatsappNumber: '',
    supportPhone: '',
    emergencyPhone: '',
    contactEmail: hotel?.email || hotel?.managerEmail || '',
    websiteUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    googleMapsUrl: '',
    floorsCount: '',
    defaultCurrency: platformSettings.defaultCurrency || 'USD',
    roomTypes: serializeRoomTypes(DEFAULT_ROOM_TYPES),
    workStartTime: '08:00',
    workEndTime: '23:00',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    reception24_7: true,
    receptionShiftCount: 3,
    receptionShift1Start: '08:00',
    receptionShift1End: '16:00',
    receptionShift2Start: '16:00',
    receptionShift2End: '00:00',
    receptionShift3Start: '00:00',
    receptionShift3End: '08:00',
    hasRestaurant: false,
    restaurantName: hotel?.name || '',
    restaurantHasTables: false,
    restaurantTablesCount: '',
    restaurantRoomDelivery: false,
    restaurantExternalOrders: false,
    restaurantServiceScope: 'inside',
    restaurantScheduleMode: '24_7',
    restaurantShiftCount: 1,
    restaurantShift1Start: '08:00',
    restaurantShift1End: '16:00',
    restaurantShift2Start: '16:00',
    restaurantShift2End: '00:00',
    restaurantShift3Start: '00:00',
    restaurantShift3End: '08:00',
    restaurantNotes: '',
    hasCafeteria: false,
    cafeteriaName: hotel?.name || '',
    cafeteriaHasTables: false,
    cafeteriaTablesCount: '',
    cafeteriaRoomDelivery: false,
    cafeteriaExternalOrders: false,
    cafeteriaServiceScope: 'inside',
    cafeteriaScheduleMode: '24_7',
    cafeteriaShiftCount: 1,
    cafeteriaShift1Start: '08:00',
    cafeteriaShift1End: '16:00',
    cafeteriaShift2Start: '16:00',
    cafeteriaShift2End: '00:00',
    cafeteriaShift3Start: '00:00',
    cafeteriaShift3End: '08:00',
    cafeteriaNotes: '',
    cancellationPolicy: '',
    paymentPolicy: '',
    depositEnabled: false,
    depositAmount: '',
    depositRefundable: true,
    securityDepositRequired: false,
    securityDepositAmount: '',
    autoCleaningAfterCheckout: true,
    defaultCleaningMinutes: 30,
    invoiceTitle: hotel?.name || platformSettings.invoiceTitle || '',
    invoiceFooter: platformSettings.invoiceFooter || '',
    taxRate: platformSettings.taxRate || 0,
    taxNumber: '',
    commercialRegister: '',
    bookingPrefix: 'BK',
    bookingLastNumber: 0,
    hotelInvoicePrefix: 'HINV',
    hotelInvoiceLastNumber: 0,
    serviceOrderPrefix: 'SRV',
    serviceOrderLastNumber: 0,
    notes: ''
  };
}

function readHotelSettings(hotelId) {
  const hotel = getHotelById(hotelId);
  const map = readHotelSettingsMap();
  const merged = { ...getDefaultHotelSettings(hotel), ...(map[hotelId] || {}) };
  return {
    ...merged,
    roomTypes: serializeRoomTypes(getConfiguredRoomTypes(null, merged)),
    workStartTime: merged.workStartTime || merged.checkInTime || '08:00',
    workEndTime: merged.workEndTime || merged.checkOutTime || '23:00'
  };
}

function writeHotelSettings(hotelId, settings) {
  const map = readHotelSettingsMap();
  map[hotelId] = { ...(map[hotelId] || {}), ...settings, updatedAt: todayISO() };
  writeHotelSettingsMap(map);
}

function renderHotelSettingsLogoPreview(settings) {
  if (settings.logoDataUrl) {
    return `<div class="settings-logo-preview"><img src="${h(settings.logoDataUrl)}" alt="${h(t('hotelSettings.logoAlt'))}"></div>`;
  }
  const initials = String(settings.displayName || t('app.name') || 'F').trim().slice(0, 1).toUpperCase();
  return `<div class="settings-logo-preview"><span>${h(initials || 'F')}</span></div>`;
}

function renderReceptionShiftRows(settings) {
  const count = Number(settings.receptionShiftCount || 3);
  const rows = [1, 2, 3].map(index => {
    const hiddenClass = index <= count ? '' : ' hidden';
    const startValue = settings[`receptionShift${index}Start`] || (index === 1 ? '08:00' : index === 2 ? '16:00' : '00:00');
    const endValue = settings[`receptionShift${index}End`] || (index === 1 ? '16:00' : index === 2 ? '00:00' : '08:00');
    return `
      <div class="service-shift-row${hiddenClass}" data-reception-shift-row data-shift-index="${h(index)}" data-ui-component="hotel-settings-shift-row">
        ${renderHotelSettingsInput(`receptionShift${index}Start`, startValue, t('hotelSettings.fields.receptionShiftStart'), 'clock', { type: 'time' })}
        ${renderHotelSettingsInput(`receptionShift${index}End`, endValue, t('hotelSettings.fields.receptionShiftEnd'), 'clock', { type: 'time' })}
      </div>
    `;
  }).join('');

  return `
    <div class="service-shift-box settings-full ds-card" data-reception-shifts-box data-ui-component="hotel-settings-shift-box">
      ${renderHotelSettingsSelect('receptionShiftCount', count, t('hotelSettings.fields.receptionShiftCount'), 'users', [1, 2, 3], { id: 'receptionShiftCount' })}
      <div class="service-shift-rows">${rows}</div>
      <p class="helper">${h(t('hotelSettings.receptionShifts.helper'))}</p>
    </div>
  `;
}

function renderFoodServiceShiftRows(prefix, shiftCount, settings) {
  const rows = [1, 2, 3].map(index => {
    const hiddenClass = index <= Number(shiftCount || 1) ? '' : ' hidden';
    const startValue = settings[`${prefix}Shift${index}Start`] || (index === 1 ? '08:00' : index === 2 ? '16:00' : '00:00');
    const endValue = settings[`${prefix}Shift${index}End`] || (index === 1 ? '16:00' : index === 2 ? '00:00' : '08:00');
    return `
      <div class="service-shift-row${hiddenClass}" data-shift-row="${h(prefix)}" data-shift-index="${h(index)}" data-ui-component="hotel-settings-shift-row">
        ${renderHotelSettingsInput(`${prefix}Shift${index}Start`, startValue, t('hotelSettings.fields.shiftStart', 'Shift start'), 'clock', { type: 'time' })}
        ${renderHotelSettingsInput(`${prefix}Shift${index}End`, endValue, t('hotelSettings.fields.shiftEnd', 'Shift end'), 'clock', { type: 'time' })}
      </div>
    `;
  }).join('');

  return `
    <div class="service-shift-box ds-card" data-shift-settings="${h(prefix)}" data-ui-component="hotel-settings-shift-box">
      ${renderHotelSettingsSelect(`${prefix}ShiftCount`, shiftCount, t(`hotelSettings.fields.${prefix}ShiftCount`), 'users', [1, 2, 3], { dataAttrs: ` data-shift-count="${h(prefix)}"` })}
      <div class="service-shift-rows">
        ${rows}
      </div>
    </div>
  `;
}

function renderFoodServiceSettings(serviceKey, iconName, titleKey, settings) {
  const hasService = boolFromFormValue(settings[`has${serviceKey}`]);
  const prefix = serviceKey.charAt(0).toLowerCase() + serviceKey.slice(1);
  const hotelName = settings.displayName || getManagerHotel()?.name || getPlatformBrandName();
  const hasTables = boolFromFormValue(settings[`${prefix}HasTables`]);
  const tablesCount = settings[`${prefix}TablesCount`] || '';
  const roomDelivery = boolFromFormValue(settings[`${prefix}RoomDelivery`]);
  const externalOrders = boolFromFormValue(settings[`${prefix}ExternalOrders`]);
  const serviceScope = settings[`${prefix}ServiceScope`] || 'inside';
  const notes = settings[`${prefix}Notes`] || '';
  const hiddenClass = hasService ? '' : ' hidden';
  const tablesHiddenClass = hasTables ? '' : ' hidden';

  const serviceFields = renderHotelSettingsFormGrid(`
    ${renderHotelSettingsSelect(`${prefix}ServiceScope`, serviceScope, t(`hotelSettings.fields.${prefix}ServiceScope`), 'status', ['inside','room_delivery','both'].map(value => ({ value, label: t(`hotelSettings.serviceScope.${value}`) })))}
    ${renderHotelSettingsCheck(`${prefix}HasTables`, hasTables, t(`hotelSettings.fields.${prefix}HasTables`), 'table', { inputAttrs: { 'data-table-toggle': prefix } })}
    ${renderHotelSettingsCheck(`${prefix}RoomDelivery`, roomDelivery, t(`hotelSettings.fields.${prefix}RoomDelivery`), 'delivery')}
    ${renderHotelSettingsCheck(`${prefix}ExternalOrders`, externalOrders, t(`hotelSettings.fields.${prefix}ExternalOrders`), 'externalLink')}
    ${renderHotelSettingsInput(`${prefix}TablesCount`, tablesCount, t(`hotelSettings.fields.${prefix}TablesCount`), 'table', { type: 'number', min: 0, step: 1, className: `table-count-field${tablesHiddenClass}`, attrs: { 'data-table-count': prefix } })}
    ${renderHotelSettingsField({ iconName: 'notes', label: t('hotelSettings.services.orderSourcesTitle'), className: 'settings-full service-source-note', control: `<p class="helper">${h(t('hotelSettings.services.orderSourcesHelper'))}</p>` })}
    ${renderHotelSettingsTextarea(`${prefix}Notes`, notes, t(`hotelSettings.fields.${prefix}Notes`), 'notes', { rows: 2, className: 'settings-full' })}
  `);

  return `
    <div class="food-service-card ds-card" data-food-service-card="${h(prefix)}" data-ui-component="hotel-settings-food-service-card">
      <label class="toggle-card" data-ui-component="hotel-settings-service-toggle">
        <input type="checkbox" name="has${h(serviceKey)}" data-service-toggle="${h(prefix)}" ${hasService ? 'checked' : ''}>
        <span class="toggle-card-icon">${icon(iconName)}</span>
        <span>
          <strong>${h(t(titleKey))}</strong>
          <small>${h(t(`hotelSettings.services.${prefix}Helper`))}</small>
        </span>
      </label>

      <div class="food-service-settings${hiddenClass}" data-service-settings="${h(prefix)}" data-ui-component="hotel-settings-food-service-fields">
        <div class="service-name-note ds-badge" data-ui-component="hotel-settings-service-note">
          ${icon(iconName)}
          <span>${h(t('hotelSettings.services.serviceUsesHotelName'))}</span>
          <strong>${h(hotelName || '-')}</strong>
        </div>
        ${serviceFields}
      </div>
    </div>
  `;
}


function renderHotelSettingsPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const settings = readHotelSettings(hotel.id);
  const activeTab = getActiveHotelSettingsTab();
  const ui = getHotelSettingsUi();
  const saveAction = renderHotelSettingsCentralButton({
    label: t('hotelSettings.actions.save'),
    icon: icon('checkCircle'),
    tone: 'primary',
    type: 'submit',
    className: 'header-primary-action',
    attrs: { form: 'hotelSettingsForm', 'data-ui-component': 'hotel-settings-save-action' }
  });
  const pageHead = ui?.renderSectionHead
    ? ui.renderSectionHead({
      title: t('page.hotel_settings'),
      actions: `<div class="hotel-settings-header-action">${saveAction}</div>`,
      className: 'hotel-settings-title-head hotel-settings-toolbar-locked hotel-settings-central-head',
      attrs: { 'data-layout-fixed': 'hotel-settings-title-only-head', 'data-ui-component': 'hotel-settings-page-head' }
    })
    : `<div class="section-head ds-section-head hotel-settings-title-head hotel-settings-toolbar-locked hotel-settings-central-head" data-layout-fixed="hotel-settings-title-only-head" data-ui-component="hotel-settings-page-head"><div class="hotel-settings-header-title"><h2>${h(t('page.hotel_settings'))}</h2></div><div class="hotel-settings-header-action">${saveAction}</div></div>`;

  const identityBody = `
    <div class="settings-logo-row ds-card" data-ui-component="hotel-settings-logo-row">
      ${renderHotelSettingsLogoPreview(settings)}
      <div class="settings-logo-actions ds-actions" data-ui-component="hotel-settings-logo-actions">
        <label class="btn ghost small ds-btn ds-btn-neutral" for="hotelLogoInput" data-ui-component="hotel-settings-upload-logo-action">${icon('upload')}${h(t('hotelSettings.actions.uploadLogo'))}</label>
        ${renderHotelSettingsCentralButton({ label: t('hotelSettings.actions.removeLogo'), icon: icon('trash'), tone: 'danger', size: 'small', type: 'button', className: 'small', attrs: { id: 'removeHotelLogoBtn', 'data-ui-component': 'hotel-settings-remove-logo-action' } })}
        <input class="sr-only-file" id="hotelLogoInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
        <input type="hidden" name="logoDataUrl" id="hotelLogoDataUrl" value="${h(settings.logoDataUrl || '')}">
      </div>
    </div>
    ${renderHotelSettingsFormGrid(`
      ${renderHotelSettingsInput('displayName', settings.displayName, t('hotelSettings.fields.displayName'), 'building', { required: true })}
      ${renderHotelSettingsInput('country', settings.country, t('hotelSettings.fields.country'), 'globe')}
      ${renderHotelSettingsInput('city', settings.city, t('hotelSettings.fields.city'), 'building')}
      ${renderHotelSettingsInput('address', settings.address, t('hotelSettings.fields.address'), 'mapPin')}
    `)}
  `;

  const contactBody = renderHotelSettingsFormGrid(`
    ${renderHotelSettingsInput('phone', settings.phone, t('hotelSettings.fields.phone'), 'phone')}
    ${renderHotelSettingsInput('receptionPhone', settings.receptionPhone, t('hotelSettings.fields.receptionPhone'), 'phone')}
    ${renderHotelSettingsInput('reservationsPhone', settings.reservationsPhone, t('hotelSettings.fields.reservationsPhone'), 'phone')}
    ${renderHotelSettingsInput('whatsappNumber', settings.whatsappNumber, t('hotelSettings.fields.whatsappNumber'), 'messageSquare')}
    ${renderHotelSettingsInput('supportPhone', settings.supportPhone, t('hotelSettings.fields.supportPhone'), 'phone')}
    ${renderHotelSettingsInput('emergencyPhone', settings.emergencyPhone, t('hotelSettings.fields.emergencyPhone'), 'shieldAlert')}
    ${renderHotelSettingsInput('email', settings.email, t('hotelSettings.fields.email'), 'mail', { type: 'email' })}
    ${renderHotelSettingsInput('contactEmail', settings.contactEmail, t('hotelSettings.fields.contactEmail'), 'mail', { type: 'email' })}
    ${renderHotelSettingsInput('websiteUrl', settings.websiteUrl, t('hotelSettings.fields.websiteUrl'), 'globe')}
    ${renderHotelSettingsInput('facebookUrl', settings.facebookUrl, t('hotelSettings.fields.facebookUrl'), 'facebook')}
    ${renderHotelSettingsInput('instagramUrl', settings.instagramUrl, t('hotelSettings.fields.instagramUrl'), 'instagram')}
    ${renderHotelSettingsInput('googleMapsUrl', settings.googleMapsUrl, t('hotelSettings.fields.googleMapsUrl'), 'mapPin')}
  `);

  const operationBody = renderHotelSettingsFormGrid(`
    ${renderHotelSettingsInput('floorsCount', settings.floorsCount, t('hotelSettings.fields.floorsCount'), 'dashboard', { type: 'number', min: 0, step: 1 })}
    ${renderHotelSettingsSelect('defaultCurrency', settings.defaultCurrency, t('hotelSettings.fields.defaultCurrency'), 'currency', ['USD','EUR','TRY','SAR','AED','SYP'])}
    ${renderHotelSettingsInput('workStartTime', settings.workStartTime, t('hotelSettings.fields.workStartTime'), 'clock', { type: 'time' })}
    ${renderHotelSettingsInput('workEndTime', settings.workEndTime, t('hotelSettings.fields.workEndTime'), 'clock', { type: 'time' })}
    ${renderHotelSettingsCheck('reception24_7', settings.reception24_7, t('hotelSettings.fields.reception24_7'), 'clock', { id: 'reception247Toggle' })}
    ${renderReceptionShiftRows(settings)}
    ${renderHotelSettingsField({
      iconName: 'building',
      label: t('hotelSettings.fields.roomTypes'),
      className: 'settings-full room-types-section',
      control: `
        <div class="room-type-adder ds-actions" data-ui-component="hotel-settings-room-type-adder">
          <input class="input ds-control" id="roomTypeNewInput" type="text" placeholder="${h(t('hotelSettings.roomTypes.placeholder'))}" autocomplete="off">
          ${renderHotelSettingsCentralButton({ label: t('hotelSettings.actions.addRoomType'), icon: icon('package'), tone: 'neutral', size: 'small', type: 'button', className: 'ghost small', attrs: { id: 'addRoomTypeBtn', 'data-ui-component': 'hotel-settings-add-room-type-action' } })}
        </div>
        <input type="hidden" id="hotelRoomTypesInput" name="roomTypes" value="${h(serializeRoomTypes(getConfiguredRoomTypes(hotel.id, settings)))}">
        <div class="room-types-list" id="hotelRoomTypesList" data-ui-component="hotel-settings-room-types-list">${renderRoomTypesChips(getConfiguredRoomTypes(hotel.id, settings))}</div>
        <p class="helper room-types-helper">${h(t('hotelSettings.roomTypes.helper'))}</p>
      `
    })}
  `);

  const servicesBody = `
    <p class="helper services-helper" data-ui-component="hotel-settings-services-helper">${h(t('hotelSettings.services.description'))}</p>
    <div class="food-services-grid ds-grid" data-ui-component="hotel-settings-food-services-grid">
      ${renderFoodServiceSettings('Restaurant', 'restaurant', 'hotelSettings.services.restaurantTitle', settings)}
      ${renderFoodServiceSettings('Cafeteria', 'coffee', 'hotelSettings.services.cafeteriaTitle', settings)}
    </div>
  `;

  const policiesBody = renderHotelSettingsFormGrid(`
    ${renderHotelSettingsInput('checkInTime', settings.checkInTime, t('hotelSettings.fields.checkInTime'), 'clock', { type: 'time' })}
    ${renderHotelSettingsInput('checkOutTime', settings.checkOutTime, t('hotelSettings.fields.checkOutTime'), 'clock', { type: 'time' })}
    ${renderHotelSettingsCheck('depositEnabled', settings.depositEnabled, t('hotelSettings.fields.depositEnabled'), 'creditCard')}
    ${renderHotelSettingsInput('depositAmount', settings.depositAmount, t('hotelSettings.fields.depositAmount'), 'creditCard', { type: 'number', min: 0, step: 0.01 })}
    ${renderHotelSettingsCheck('depositRefundable', settings.depositRefundable, t('hotelSettings.fields.depositRefundable'), 'checkCircle')}
    ${renderHotelSettingsCheck('securityDepositRequired', settings.securityDepositRequired, t('hotelSettings.fields.securityDepositRequired'), 'shieldCheck')}
    ${renderHotelSettingsInput('securityDepositAmount', settings.securityDepositAmount, t('hotelSettings.fields.securityDepositAmount'), 'creditCard', { type: 'number', min: 0, step: 0.01 })}
    ${renderHotelSettingsCheck('autoCleaningAfterCheckout', settings.autoCleaningAfterCheckout, t('hotelSettings.fields.autoCleaningAfterCheckout'), 'settings')}
    ${renderHotelSettingsInput('defaultCleaningMinutes', settings.defaultCleaningMinutes, t('hotelSettings.fields.defaultCleaningMinutes'), 'clock', { type: 'number', min: 0, step: 1 })}
    ${renderHotelSettingsTextarea('cancellationPolicy', settings.cancellationPolicy, t('hotelSettings.fields.cancellationPolicy'), 'fileText', { rows: 3, className: 'settings-full' })}
    ${renderHotelSettingsTextarea('paymentPolicy', settings.paymentPolicy, t('hotelSettings.fields.paymentPolicy'), 'creditCard', { rows: 3, className: 'settings-full' })}
  `);

  const billingBody = renderHotelSettingsFormGrid(`
    ${renderHotelSettingsInput('invoiceTitle', settings.invoiceTitle, t('hotelSettings.fields.invoiceTitle'), 'receipt')}
    ${renderHotelSettingsInput('taxRate', settings.taxRate, t('hotelSettings.fields.taxRate'), 'badgePercent', { type: 'number', min: 0, max: 100, step: 0.01 })}
    ${renderHotelSettingsInput('taxNumber', settings.taxNumber, t('hotelSettings.fields.taxNumber'), 'hash')}
    ${renderHotelSettingsInput('commercialRegister', settings.commercialRegister, t('hotelSettings.fields.commercialRegister'), 'fileText')}
    ${renderHotelSettingsInput('bookingPrefix', settings.bookingPrefix, t('hotelSettings.fields.bookingPrefix'), 'hash')}
    ${renderHotelSettingsInput('bookingLastNumber', settings.bookingLastNumber, t('hotelSettings.fields.bookingLastNumber'), 'calculator', { type: 'number', min: 0, step: 1 })}
    ${renderHotelSettingsInput('hotelInvoicePrefix', settings.hotelInvoicePrefix, t('hotelSettings.fields.hotelInvoicePrefix'), 'hash')}
    ${renderHotelSettingsInput('hotelInvoiceLastNumber', settings.hotelInvoiceLastNumber, t('hotelSettings.fields.hotelInvoiceLastNumber'), 'calculator', { type: 'number', min: 0, step: 1 })}
    ${renderHotelSettingsInput('serviceOrderPrefix', settings.serviceOrderPrefix, t('hotelSettings.fields.serviceOrderPrefix'), 'hash')}
    ${renderHotelSettingsInput('serviceOrderLastNumber', settings.serviceOrderLastNumber, t('hotelSettings.fields.serviceOrderLastNumber'), 'calculator', { type: 'number', min: 0, step: 1 })}
    ${renderHotelSettingsInput('invoiceFooter', settings.invoiceFooter, t('hotelSettings.fields.invoiceFooter'), 'fileText', { className: 'settings-full' })}
    ${renderHotelSettingsTextarea('notes', settings.notes, t('hotelSettings.fields.notes'), 'notes', { rows: 3, className: 'settings-full' })}
  `);

  return `
    <div class="settings-page hotel-settings-page hotel-settings-central-page" data-ui-component="hotel-settings-page">
      ${pageHead}
      ${renderManagerHotelHeader(hotel)}
      ${renderHotelSettingsTabs()}
      <form class="settings-layout hotel-settings-layout settings-tab-layout ds-surface" id="hotelSettingsForm" data-ui-component="hotel-settings-form">
        ${renderHotelSettingsPanel('identity', activeTab, 'building', t('hotelSettings.sections.identity'), identityBody, 'settings-logo-card')}
        ${renderHotelSettingsPanel('contact', activeTab, 'messageSquare', t('hotelSettings.sections.contact'), contactBody)}
        ${renderHotelSettingsPanel('operation', activeTab, 'settings', t('hotelSettings.sections.operation'), operationBody)}
        ${renderHotelSettingsPanel('services', activeTab, 'restaurant', t('hotelSettings.sections.services'), servicesBody)}
        ${renderHotelSettingsPanel('policies', activeTab, 'fileText', t('hotelSettings.sections.policies'), policiesBody)}
        ${renderHotelSettingsPanel('billing', activeTab, 'receipt', t('hotelSettings.sections.billing'), billingBody)}
      </form>
    </div>
  `;
}

function applyFoodServiceShiftVisibility(key) {
  const mode = document.querySelector(`[data-schedule-mode="${key}"]`)?.value || '24_7';
  const wrapper = document.querySelector(`[data-shift-settings-wrapper="${key}"]`);
  if (wrapper) wrapper.classList.toggle('hidden', mode !== 'shifts');

  const count = Number(document.querySelector(`[data-shift-count="${key}"]`)?.value || 1);
  document.querySelectorAll(`[data-shift-row="${key}"]`).forEach(row => {
    const index = Number(row.dataset.shiftIndex || 0);
    row.classList.toggle('hidden', index > count);
  });
}

function bindReceptionShiftEvents() {
  const select = document.getElementById('receptionShiftCount');
  if (!select) return;
  const apply = () => {
    const count = Number(select.value || 3);
    document.querySelectorAll('[data-reception-shift-row]').forEach(row => {
      const index = Number(row.dataset.shiftIndex || 0);
      row.classList.toggle('hidden', index > count);
    });
  };
  select.addEventListener('change', apply);
  apply();
}

function bindFoodServiceSettingsEvents() {
  document.querySelectorAll('[data-service-toggle]').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.serviceToggle;
      const panel = document.querySelector(`[data-service-settings="${key}"]`);
      if (panel) panel.classList.toggle('hidden', !input.checked);
    });
  });

  document.querySelectorAll('[data-table-toggle]').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.tableToggle;
      const field = document.querySelector(`[data-table-count="${key}"]`);
      if (field) field.classList.toggle('hidden', !input.checked);
    });
  });
}

function bindHotelSettingsEvents() {
  const hotel = getManagerHotel();
  if (!hotel) return;

  document.querySelectorAll('[data-hotel-settings-tab]').forEach(button => {
    button.addEventListener('click', () => setHotelSettingsTab(button.dataset.hotelSettingsTab));
  });

  const form = document.getElementById('hotelSettingsForm');
  const logoInput = document.getElementById('hotelLogoInput');
  const logoData = document.getElementById('hotelLogoDataUrl');
  const removeLogo = document.getElementById('removeHotelLogoBtn');

  if (logoInput && logoData) {
    logoInput.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        logoData.value = String(reader.result || '');
        const current = readHotelSettings(hotel.id);
        writeHotelSettings(hotel.id, { ...current, logoDataUrl: logoData.value });
        render();
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeLogo && logoData) {
    removeLogo.addEventListener('click', () => {
      logoData.value = '';
      const current = readHotelSettings(hotel.id);
      writeHotelSettings(hotel.id, { ...current, logoDataUrl: '' });
      render();
    });
  }

  bindHotelRoomTypeEditor();
  bindReceptionShiftEvents();
  bindFoodServiceSettingsEvents();

  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    writeHotelSettings(hotel.id, {
      displayName: data.displayName,
      country: data.country,
      city: data.city,
      address: data.address,
      phone: data.phone,
      email: data.email,
      receptionPhone: data.receptionPhone,
      reservationsPhone: data.reservationsPhone,
      whatsappNumber: data.whatsappNumber,
      supportPhone: data.supportPhone,
      emergencyPhone: data.emergencyPhone,
      contactEmail: data.contactEmail,
      websiteUrl: data.websiteUrl,
      facebookUrl: data.facebookUrl,
      instagramUrl: data.instagramUrl,
      googleMapsUrl: data.googleMapsUrl,
      floorsCount: data.floorsCount,
      defaultCurrency: data.defaultCurrency,
      roomTypes: serializeRoomTypes(parseRoomTypes(data.roomTypes)),
      workStartTime: data.workStartTime,
      workEndTime: data.workEndTime,
      reception24_7: boolFromFormValue(data.reception24_7),
      receptionShiftCount: data.receptionShiftCount || 3,
      receptionShift1Start: data.receptionShift1Start,
      receptionShift1End: data.receptionShift1End,
      receptionShift2Start: data.receptionShift2Start,
      receptionShift2End: data.receptionShift2End,
      receptionShift3Start: data.receptionShift3Start,
      receptionShift3End: data.receptionShift3End,
      checkInTime: data.checkInTime,
      checkOutTime: data.checkOutTime,
      hasRestaurant: boolFromFormValue(data.hasRestaurant),
      restaurantName: data.displayName,
      restaurantHasTables: boolFromFormValue(data.restaurantHasTables),
      restaurantTablesCount: data.restaurantTablesCount,
      restaurantRoomDelivery: boolFromFormValue(data.restaurantRoomDelivery),
      restaurantExternalOrders: boolFromFormValue(data.restaurantExternalOrders),
      restaurantServiceScope: data.restaurantServiceScope || 'inside',
      restaurantNotes: data.restaurantNotes,
      hasCafeteria: boolFromFormValue(data.hasCafeteria),
      cafeteriaName: data.displayName,
      cafeteriaHasTables: boolFromFormValue(data.cafeteriaHasTables),
      cafeteriaTablesCount: data.cafeteriaTablesCount,
      cafeteriaRoomDelivery: boolFromFormValue(data.cafeteriaRoomDelivery),
      cafeteriaExternalOrders: boolFromFormValue(data.cafeteriaExternalOrders),
      cafeteriaServiceScope: data.cafeteriaServiceScope || 'inside',
      cafeteriaNotes: data.cafeteriaNotes,
      cancellationPolicy: data.cancellationPolicy,
      paymentPolicy: data.paymentPolicy,
      depositEnabled: boolFromFormValue(data.depositEnabled),
      depositAmount: data.depositAmount,
      depositRefundable: boolFromFormValue(data.depositRefundable),
      securityDepositRequired: boolFromFormValue(data.securityDepositRequired),
      securityDepositAmount: data.securityDepositAmount,
      autoCleaningAfterCheckout: boolFromFormValue(data.autoCleaningAfterCheckout),
      defaultCleaningMinutes: data.defaultCleaningMinutes,
      invoiceTitle: data.invoiceTitle,
      invoiceFooter: data.invoiceFooter,
      taxRate: data.taxRate,
      taxNumber: data.taxNumber,
      commercialRegister: data.commercialRegister,
      bookingPrefix: data.bookingPrefix,
      bookingLastNumber: data.bookingLastNumber,
      hotelInvoicePrefix: data.hotelInvoicePrefix,
      hotelInvoiceLastNumber: data.hotelInvoiceLastNumber,
      serviceOrderPrefix: data.serviceOrderPrefix,
      serviceOrderLastNumber: data.serviceOrderLastNumber,
      notes: data.notes,
      logoDataUrl: data.logoDataUrl
    });
    toast(t('hotelSettings.toast.saved'));
    render();
  });
}

