// Fandqi Modular Refactor — Restaurant and cafeteria menu, order cards, order invoices, and food services events.
const FOOD_ORDER_STORAGE_KEY = 'fandqi.foodOrders';
const FOOD_MENU_STORAGE_KEY = 'fandqi.foodMenuItems';
const FOOD_MENU_CATEGORIES = ['drinks', 'food', 'dessert', 'hospitality', 'extras'];
const FOOD_MENU_STATUSES = ['available', 'unavailable'];

function foodFeature() {
  return window.FandqiFoodFeature || null;
}

function readFoodMenuItems() {
  const feature = foodFeature();
  if (feature?.repository?.menu?.read) return feature.repository.menu.read();
  try {
    const value = readStorageJson(FOOD_MENU_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeFoodMenuItems(items) {
  const feature = foodFeature();
  if (feature?.repository?.menu?.write) return feature.repository.menu.write(items);
  writeStorageJson(FOOD_MENU_STORAGE_KEY, items);
}

function getHotelFoodMenuItems(hotelId) {
  const feature = foodFeature();
  const items = feature?.repository?.menu?.forHotel
    ? feature.repository.menu.forHotel(hotelId)
    : readFoodMenuItems().filter(item => item.hotelId === hotelId && item.status !== 'archived');
  if (feature?.selectors?.sortFoodMenuItems) return feature.selectors.sortFoodMenuItems(items);
  return items.sort((a, b) => FOOD_MENU_CATEGORIES.indexOf(a.category || 'extras') - FOOD_MENU_CATEGORIES.indexOf(b.category || 'extras') || String(a.name || '').localeCompare(String(b.name || ''), 'ar', { numeric: true }));
}

function getHotelAvailableFoodMenuItems(hotelId) {
  const items = getHotelFoodMenuItems(hotelId);
  const feature = foodFeature();
  if (feature?.selectors?.getAvailableFoodMenuItems) return feature.selectors.getAvailableFoodMenuItems(items);
  return items.filter(item => (item.availability || item.status || 'available') === 'available');
}

function ensureHotelFoodMenuSeed(hotelId, currency = 'USD') {
  if (!hotelId) return [];
  const defaults = [
    { name: t('foodServices.seed.tea'), category: 'drinks', serviceType: 'cafeteria', price: 2 },
    { name: t('foodServices.seed.coffee'), category: 'drinks', serviceType: 'cafeteria', price: 3 },
    { name: t('foodServices.seed.water'), category: 'drinks', serviceType: 'cafeteria', price: 1 },
    { name: t('foodServices.seed.breakfast'), category: 'food', serviceType: 'restaurant', price: 8 },
    { name: t('foodServices.seed.sandwich'), category: 'food', serviceType: 'restaurant', price: 5 },
    { name: t('foodServices.seed.hospitality'), category: 'hospitality', serviceType: 'cafeteria', price: 0 }
  ];
  const feature = foodFeature();
  if (feature?.actions?.seedDefaultMenu) {
    return feature.actions.seedDefaultMenu(hotelId, currency, defaults, {
      idFactory: prefix => createId(prefix),
      today: todayISO
    });
  }
  const all = readFoodMenuItems();
  const existing = all.filter(item => item.hotelId === hotelId && item.status !== 'archived');
  if (existing.length) return existing;
  const now = todayISO();
  const seeded = defaults.map(item => ({
    id: createId('menu-item'),
    hotelId,
    serviceType: item.serviceType,
    category: item.category,
    name: item.name,
    price: item.price,
    currency,
    availability: 'available',
    status: 'active',
    description: '',
    createdAt: now,
    updatedAt: now
  }));
  writeFoodMenuItems([...all, ...seeded]);
  return seeded;
}

function getFoodMenuCategoryLabel(category) {
  return t(`foodServices.menu.category.${category || 'extras'}`, category || '-');
}

function getFoodMenuAvailabilityLabel(value) {
  return t(`foodServices.menu.availability.${value || 'available'}`, value || '-');
}

function getFoodMenuItemById(hotelId, id) {
  const feature = foodFeature();
  const item = feature?.repository?.menu?.byId ? feature.repository.menu.byId(id) : null;
  if (item && item.hotelId === hotelId && item.status !== 'archived') return item;
  return getHotelFoodMenuItems(hotelId).find(item => item.id === id) || null;
}

function openFoodMenuModal() {
  state.foodMenuModal = true;
  render();
}

function closeFoodMenuModal() {
  state.foodMenuModal = null;
  render();
}

function renderFoodMenuItemModal(hotel, settings) {
  if (!state.foodMenuModal) return '';
  const currency = settings.defaultCurrency || 'USD';
  const serviceOptions = getFoodServiceOptions(settings);
  const formGrid = renderFoodFormGrid(`
    ${renderFoodField({
      iconName: 'restaurant',
      label: t('foodServices.fields.serviceType'),
      control: `<select class="select ds-control" name="serviceType" required>${serviceOptions.map(option => `<option value="${h(option.value)}">${h(option.label)}</option>`).join('')}</select>`,
      component: 'food-menu-service-field'
    })}
    ${renderFoodField({
      iconName: 'dashboard',
      label: t('foodServices.menu.categoryLabel'),
      control: `<select class="select ds-control" name="category" required>${FOOD_MENU_CATEGORIES.map(category => `<option value="${h(category)}">${h(getFoodMenuCategoryLabel(category))}</option>`).join('')}</select>`,
      component: 'food-menu-category-field'
    })}
    ${renderFoodField({ iconName: 'fileText', label: t('foodServices.menu.name'), control: `<input class="input ds-control" name="name" required autocomplete="off" placeholder="${h(t('foodServices.menu.namePlaceholder'))}">`, component: 'food-menu-name-field' })}
    ${renderFoodField({ iconName: 'creditCard', label: t('foodServices.menu.price'), control: `<input class="input ds-control" type="number" min="0" step="0.01" name="price" required placeholder="0"><input type="hidden" name="currency" value="${h(currency)}">`, component: 'food-menu-price-field' })}
    ${renderFoodField({
      iconName: 'checkCircle',
      label: t('foodServices.menu.availabilityLabel'),
      control: `<select class="select ds-control" name="availability">${FOOD_MENU_STATUSES.map(status => `<option value="${h(status)}">${h(getFoodMenuAvailabilityLabel(status))}</option>`).join('')}</select>`,
      component: 'food-menu-availability-field'
    })}
    ${renderFoodField({ iconName: 'notes', label: t('foodServices.menu.description'), control: `<textarea class="input textarea ds-control" name="description" rows="2" placeholder="${h(t('foodServices.menu.descriptionPlaceholder'))}"></textarea>`, className: 'settings-full', component: 'food-menu-description-field' })}
  `, '', 'food-menu-form-grid');
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card modal-card-wide food-menu-modal ds-modal-card food-modal-card-central" id="foodMenuItemForm" data-ui-component="food-menu-modal">
        <div class="modal-head ds-section-head food-modal-head"><h2>${h(t('foodServices.menu.modalTitle'))}</h2><button class="icon-btn" type="button" data-action="close-food-menu-modal">${icon('x')}</button></div>
        ${formGrid}
        ${renderFoodActions([
          renderFoodButton({ action: 'close-food-menu-modal', label: t('common.cancel'), tone: 'neutral', iconName: 'x' }),
          renderFoodButton({ label: t('common.save'), tone: 'primary', iconName: 'checkCircle', type: 'submit' })
        ].join(''), 'modal-actions food-modal-actions', 'food-menu-modal-actions')}
      </form>
    </div>
  `;
}

function renderFoodMenuCard(item, currency) {
  const availability = (item.availability || 'available') === 'available' ? 'active' : 'warning';
  return `
    <article class="food-menu-card ds-card ${h((item.availability || 'available') === 'available' ? 'is-available' : 'is-unavailable')}" data-ui-component="food-menu-card" data-ui-migrated="food-menu-card">
      <div class="food-menu-card-head">
        <span class="food-menu-category ds-badge ds-status-info">${h(getFoodMenuCategoryLabel(item.category))}</span>
        ${renderFoodBadge({
          label: getFoodMenuAvailabilityLabel(item.availability || 'available'),
          status: availability,
          attrs: { 'data-food-menu-availability': item.availability || 'available' }
        })}
      </div>
      <strong>${h(item.name)}</strong>
      <small>${h(getFoodOrderServiceLabel(item.serviceType))}</small>
      ${item.description ? `<p>${h(item.description)}</p>` : ''}
      <div class="food-menu-price ds-badge ds-status-neutral">${h(String(item.price || 0))} ${h(item.currency || currency || '')}</div>
    </article>
  `;
}

function renderFoodMenuCards(menuItems, currency) {
  if (!menuItems.length) {
    return renderFoodEmptyState({
      title: t('foodServices.menu.emptyTitle'),
      text: t('foodServices.menu.emptyText'),
      iconName: 'restaurant',
      className: 'food-menu-empty'
    });
  }
  return `
    <div class="food-menu-grid ds-grid" data-ui-component="food-menu-list" data-ui-migrated="food-menu-list">
      ${menuItems.map(item => renderFoodMenuCard(item, currency)).join('')}
    </div>
  `;
}

function getFoodOrderItemRowHtml(menuItems, index = 0) {
  return `
    <div class="food-order-item-row ds-form-grid" data-ui-component="food-order-item-row" data-food-order-item-row>
      <select class="select ds-control" data-food-order-item-select name="menuItemId_${h(index)}" required>
        <option value="">${h(t('foodServices.menu.selectItem'))}</option>
        ${menuItems.map(item => `<option value="${h(item.id)}" data-price="${h(item.price || 0)}" data-name="${h(item.name || '')}" data-category="${h(item.category || '')}" data-service="${h(item.serviceType || '')}">${h(item.name)} — ${h(getFoodMenuCategoryLabel(item.category))} — ${h(item.price || 0)} ${h(item.currency || '')}</option>`).join('')}
      </select>
      <input class="input ds-control" type="number" min="1" step="1" value="1" data-food-order-item-qty name="menuItemQty_${h(index)}" aria-label="${h(t('foodServices.menu.quantity'))}">
      <output class="food-order-line-total" data-food-order-line-total>0</output>
      ${renderFoodButton({ action: 'remove-food-order-item-row', label: '', tone: 'neutral', iconName: 'x', className: 'compact-action-btn food-order-row-remove', attrs: { 'aria-label': t('common.remove', 'إزالة') } })}
    </div>
  `;
}

function formatFoodOrderItems(order) {
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items.map(item => `${item.name || '-'} × ${item.quantity || 1}`).join(t('common.listSeparator', '، '));
  }
  return order?.orderText || '-';
}

function getFoodOrderItemsTotal(items = []) {
  const feature = foodFeature();
  if (feature?.selectors?.getFoodOrderItemsTotal) return feature.selectors.getFoodOrderItemsTotal(items);
  return items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
}

function readFoodOrders() {
  const feature = foodFeature();
  if (feature?.repository?.orders?.read) return feature.repository.orders.read();
  try {
    const value = readStorageJson(FOOD_ORDER_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeFoodOrders(orders) {
  const feature = foodFeature();
  if (feature?.repository?.orders?.write) return feature.repository.orders.write(orders);
  writeStorageJson(FOOD_ORDER_STORAGE_KEY, orders);
}

function getHotelFoodOrders(hotelId) {
  const feature = foodFeature();
  if (feature?.repository?.orders?.forHotel) return feature.repository.orders.forHotel(hotelId);
  return readFoodOrders().filter(order => order.hotelId === hotelId && order.status !== 'archived');
}

function getFoodServiceOptions(settings) {
  const options = [];
  if (boolFromFormValue(settings.hasRestaurant)) options.push({ value: 'restaurant', label: t('foodServices.service.restaurant') });
  if (boolFromFormValue(settings.hasCafeteria)) options.push({ value: 'cafeteria', label: t('foodServices.service.cafeteria') });
  if (boolFromFormValue(settings.restaurantExternalOrders) || boolFromFormValue(settings.cafeteriaExternalOrders)) options.push({ value: 'external', label: t('foodServices.service.external') });
  return options;
}

function getFoodOrderSourceOptions(settings) {
  const options = [];
  if (boolFromFormValue(settings.restaurantRoomDelivery) || boolFromFormValue(settings.cafeteriaRoomDelivery)) options.push({ value: 'room', label: t('foodServices.source.room') });
  if (boolFromFormValue(settings.restaurantHasTables) || boolFromFormValue(settings.cafeteriaHasTables)) options.push({ value: 'table', label: t('foodServices.source.table') });
  if (boolFromFormValue(settings.restaurantExternalOrders) || boolFromFormValue(settings.cafeteriaExternalOrders)) options.push({ value: 'external', label: t('foodServices.source.external') });
  options.push({ value: 'hospitality', label: t('foodServices.source.hospitality') });
  return options.filter((option, index, list) => list.findIndex(item => item.value === option.value) === index);
}

function getFoodOrderStatusLabel(status) {
  return t(`foodServices.status.${status || 'delivered'}`, status || 'delivered');
}

function getFoodOrderServiceLabel(serviceType) {
  return t(`foodServices.service.${serviceType || 'restaurant'}`, serviceType || '-');
}

function getFoodOrderSourceLabel(sourceType) {
  return t(`foodServices.source.${sourceType || 'room'}`, sourceType || '-');
}

const FOOD_PAYMENT_METHODS = ['cash', 'electronic', 'room_account'];

function getFoodOrderPaymentMethodLabel(method) {
  return t(`foodServices.paymentMethod.${method || 'cash'}`, method || '-');
}

function getFoodOrderFinancialStatusLabel(order) {
  if ((order?.paymentMethod || 'cash') === 'room_account') return t('foodServices.financialStatus.roomAccount', 'مرحل على حساب الغرفة');
  return t('foodServices.financialStatus.paid', 'مدفوع');
}

function getFoodOrderPaymentTone(order) {
  const feature = foodFeature();
  if (feature?.selectors?.getFoodOrderPaymentTone) return feature.selectors.getFoodOrderPaymentTone(order);
  const method = order?.paymentMethod || 'cash';
  if (method === 'room_account') return 'warning';
  if (method === 'electronic') return 'accent';
  return 'active';
}

function foodUi() {
  return window.FandqiUI || null;
}

function renderFoodButton({ action = '', id = '', label = '', tone = 'ghost', iconName = '', disabled = false, attrs = {}, className = '', type = 'button' }) {
  const ui = foodUi();
  const safeAttrs = { ...attrs, ...(id ? { 'data-id': id } : {}) };
  if (ui?.renderButton) {
    return ui.renderButton({
      label,
      tone,
      size: className.includes('compact-action-btn') ? 'compact' : '',
      action,
      icon: iconName ? icon(iconName) : '',
      disabled,
      type,
      className,
      attrs: safeAttrs
    });
  }
  return `<button class="btn ${h(tone)} ${h(className)}" type="${h(type || 'button')}"${action ? ` data-action="${h(action)}"` : ''}${id ? ` data-id="${h(id)}"` : ''}${disabled ? ' disabled' : ''}>${iconName ? icon(iconName) : ''}${h(label)}</button>`;
}

function renderFoodBadge({ label = '', status = 'neutral', className = '', attrs = {} }) {
  const ui = foodUi();
  if (ui?.renderBadge) {
    return ui.renderBadge({ label, status, className, attrs });
  }
  return `<span class="status-badge ${h(status)} ${h(className)}"${Object.entries(attrs).map(([key, value]) => ` ${h(key)}="${h(value)}"`).join('')}>${h(label)}</span>`;
}

function renderFoodEmptyState({ title, text, iconName = 'restaurant', className = '' }) {
  const ui = foodUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({ title, text, icon: icon(iconName), className });
  }
  return `<div class="empty-panel ${h(className)}"><div><h2>${h(title)}</h2><p>${h(text)}</p></div></div>`;
}

function renderFoodActions(children, className = '', component = 'food-actions') {
  const ui = foodUi();
  const attrs = { 'data-ui-component': component };
  if (ui?.renderActions) return ui.renderActions({ children, className: ['food-central-actions', className].filter(Boolean).join(' '), attrs });
  return `<div class="section-actions ds-actions food-central-actions ${h(className)}" data-ui-component="${h(component)}">${children}</div>`;
}

function renderFoodSectionHead({ actions = '' } = {}) {
  const ui = foodUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title: t('page.room_service'),
      text: t('foodServices.description'),
      kicker: t('foodServices.service.restaurant'),
      kickerIcon: icon('restaurant'),
      actions,
      className: 'food-central-head',
      attrs: { 'data-ui-component': 'food-page-head' }
    });
  }
  return `<div class="section-head ds-section-head food-central-head" data-ui-component="food-page-head"><div><h2>${h(t('page.room_service'))}</h2><p class="helper">${h(t('foodServices.description'))}</p></div>${actions ? `<div class="section-actions ds-actions">${actions}</div>` : ''}</div>`;
}

function renderFoodSurface({ title = '', count = '', iconName = '', body = '', className = '', component = 'food-surface' } = {}) {
  const ui = foodUi();
  const head = title ? `<div class="dashboard-panel-head food-central-panel-head" data-ui-component="${h(component)}-head"><h3>${iconName ? icon(iconName) : ''}${h(title)}</h3>${count !== '' ? `<span>${h(count)}</span>` : ''}</div>` : '';
  const attrs = { 'data-ui-component': component };
  if (ui?.renderSurface) return ui.renderSurface({ tag: 'section', head, body, className: ['food-central-surface', className].filter(Boolean).join(' '), attrs });
  return `<section class="dashboard-panel ds-surface food-central-surface ${h(className)}" data-ui-component="${h(component)}">${head}${body}</section>`;
}

function renderFoodField({ iconName = '', label = '', control = '', className = '', component = 'food-field', helper = '', attrs = {} } = {}) {
  const ui = foodUi();
  const labelHtml = fieldLabel(iconName || 'fileText', h(label));
  if (ui?.renderField) {
    return ui.renderField({ labelHtml, control, helper, className: ['food-central-field', className].filter(Boolean).join(' '), attrs: { 'data-ui-component': component, ...attrs } });
  }
  return `<div class="field ds-field food-central-field ${h(className)}" data-ui-component="${h(component)}"${Object.entries(attrs || {}).map(([key, value]) => value === true ? ` ${h(key)}` : ` ${h(key)}="${h(value)}"`).join('')}>${labelHtml}${control}${helper ? `<p class="helper">${h(helper)}</p>` : ''}</div>`;
}

function renderFoodFormGrid(children, className = '', component = 'food-form-grid') {
  const ui = foodUi();
  if (ui?.renderFormGrid) return ui.renderFormGrid({ children, className: ['food-central-form-grid', className].filter(Boolean).join(' '), attrs: { 'data-ui-component': component } });
  return `<div class="modal-grid compact-modal-grid ds-form-grid food-central-form-grid ${h(className)}" data-ui-component="${h(component)}">${children}</div>`;
}

function renderFoodMetaItem({ iconName = '', label = '', value = '', className = '', component = 'food-meta-item' } = {}) {
  return `<div class="detail-item ds-meta-item food-central-meta-item ${h(className)}" data-ui-component="${h(component)}">${iconName ? icon(iconName) : ''}<span>${h(label)}</span><strong>${h(value ?? '-')}</strong></div>`;
}

function renderFoodServiceCard(service, hotelName) {
  return `
    <article class="food-service-summary-card ds-card food-central-service-card" data-ui-component="food-service-card" data-service-type="${h(service.key)}">
      <div class="food-service-summary-head food-central-service-head">
        <span class="food-service-icon">${icon(service.iconName)}</span>
        <div><strong>${h(hotelName)}</strong><small>${h(service.title)}</small></div>
      </div>
      <div class="details-grid compact-details-grid ds-meta-grid food-service-meta-grid">
        ${renderFoodMetaItem({ iconName: 'settings', label: t('foodServices.scope'), value: t(`hotelSettings.serviceScope.${service.scope || 'inside'}`), component: 'food-service-meta-item' })}
        ${renderFoodMetaItem({ iconName: 'table', label: t('foodServices.tables'), value: service.hasTables ? `${service.tablesCount || 0}` : t('common.no'), component: 'food-service-meta-item' })}
        ${renderFoodMetaItem({ iconName: 'building', label: t('foodServices.roomDelivery'), value: service.roomDelivery ? t('common.yes') : t('common.no'), component: 'food-service-meta-item' })}
        ${renderFoodMetaItem({ iconName: 'externalLink', label: t('foodServices.externalOrders'), value: service.externalOrders ? t('common.yes') : t('common.no'), component: 'food-service-meta-item' })}
      </div>
    </article>
  `;
}

function renderFoodOrderItemChip(item) {
  if (!item) {
    return `<div class="food-order-item-chip ds-badge ds-status-neutral" data-ui-migrated="food-order-item-chip"><span>-</span></div>`;
  }
  return `
    <div class="food-order-item-chip ds-badge ds-status-neutral" data-ui-migrated="food-order-item-chip">
      <span>${h(item.name || '-')}</span>
      ${item.quantity || item.price ? `<strong>${h(item.quantity || 1)} × ${h(item.price || 0)}</strong>` : ''}
    </div>
  `;
}

function renderFoodOrderBadges(order) {
  const status = order.status || 'delivered';
  const paymentTone = getFoodOrderPaymentTone(order);
  return [
    renderFoodBadge({
      label: getFoodOrderStatusLabel(status),
      status: status === 'delivered' ? 'active' : status,
      attrs: { 'data-food-order-status': status }
    }),
    renderFoodBadge({
      label: getFoodOrderPaymentMethodLabel(order.paymentMethod || 'cash'),
      status: paymentTone,
      attrs: { 'data-food-payment-method': order.paymentMethod || 'cash' }
    })
  ].join('');
}

function renderFoodPrintInvoiceButton(order) {
  return renderFoodButton({
    action: 'print-food-order-invoice',
    id: order.id,
    label: t('foodServices.actions.printInvoice', 'طباعة الفاتورة'),
    tone: 'luxury',
    iconName: 'receipt',
    className: 'small'
  });
}

function renderFoodHeaderActions(canAddOrder) {
  return [
    renderFoodButton({
      label: t('foodServices.menu.addItem'),
      tone: 'accent',
      iconName: 'plus',
      attrs: { id: 'addFoodMenuItemBtn' }
    }),
    renderFoodButton({
      label: t('foodServices.actions.addOrder'),
      tone: 'primary',
      iconName: 'restaurant',
      disabled: !canAddOrder,
      attrs: { id: 'addFoodOrderBtn' }
    })
  ].join('');
}

function getFoodOrderDisplayNumber(order) {
  const feature = foodFeature();
  if (feature?.selectors?.getFoodOrderDisplayNumber) return feature.selectors.getFoodOrderDisplayNumber(order);
  const raw = String(order?.id || '').split('-').pop() || '';
  return raw ? `ORD-${raw.slice(-5).toUpperCase()}` : 'ORD';
}

function getFoodOrderTargetLine(order) {
  const parts = [];
  if (order?.roomNumber) parts.push(`${t('foodServices.fields.roomNumber')}: ${order.roomNumber}`);
  if (order?.tableNumber) parts.push(`${t('foodServices.fields.tableNumber')}: ${order.tableNumber}`);
  if (order?.externalVendor) parts.push(`${t('foodServices.fields.externalVendor')}: ${order.externalVendor}`);
  return parts.join(' · ') || t('foodServices.fields.notSelected');
}

function getFoodOrdersByReservationId(reservationId) {
  const feature = foodFeature();
  if (feature?.selectors?.getFoodOrdersByReservationId) return feature.selectors.getFoodOrdersByReservationId(readFoodOrders(), reservationId);
  if (!reservationId) return [];
  return readFoodOrders()
    .filter(order => order.status !== 'archived' && order.reservationId === reservationId)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

function getFoodOrderPaidTotal(orders = []) {
  const feature = foodFeature();
  if (feature?.selectors?.getFoodOrderPaidTotal) return feature.selectors.getFoodOrderPaidTotal(orders);
  return orders
    .filter(order => (order.paymentMethod || 'cash') !== 'room_account')
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);
}

function getFoodOrderRoomAccountTotal(orders = []) {
  const feature = foodFeature();
  if (feature?.selectors?.getFoodOrderRoomAccountTotal) return feature.selectors.getFoodOrderRoomAccountTotal(orders);
  return orders
    .filter(order => (order.paymentMethod || 'cash') === 'room_account')
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);
}

function getFoodOrderGuestOptions(hotelId) {
  return getHotelGuestEntries(hotelId)
    .filter(entry => entry?.reservation?.status === 'checked_in' || entry?.stayStatus === 'active')
    .filter(entry => entry?.room?.id || entry?.reservation?.roomId)
    .sort((a, b) => getGuestRoomSortKey(a).localeCompare(getGuestRoomSortKey(b), 'ar', { numeric: true }) || String(a.name || '').localeCompare(String(b.name || ''), 'ar', { numeric: true }));
}

function getFoodOrderGuestOptionLabel(entry) {
  return `${entry.name || '-'} — ${entry.roomLabel || '-'} — ${entry.reservationNo || '-'}`;
}

function getFoodOrderRoomOptionsFromGuests(guestOptions = []) {
  const rooms = new Map();
  guestOptions.forEach(entry => {
    const roomId = entry?.room?.id || entry?.reservation?.roomId || '';
    if (!roomId || rooms.has(roomId)) return;
    rooms.set(roomId, {
      id: roomId,
      number: entry?.room?.number || '',
      label: entry?.roomLabel || getReservationRoomLabel(entry?.room),
      sort: getGuestRoomSortKey(entry)
    });
  });
  return [...rooms.values()].sort((a, b) => String(a.sort).localeCompare(String(b.sort), 'ar', { numeric: true }));
}

function getReservationRoomAccountOrdersTotal(reservationId) {
  const feature = foodFeature();
  if (feature?.selectors?.getReservationRoomAccountOrdersTotal) return feature.selectors.getReservationRoomAccountOrdersTotal(readFoodOrders(), reservationId);
  if (!reservationId) return 0;
  return readFoodOrders()
    .filter(order => order.reservationId === reservationId && order.status !== 'archived' && (order.paymentMethod || 'cash') === 'room_account')
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);
}

function getReservationFinancialTotal(reservation) {
  const roomAccountTotal = getReservationRoomAccountOrdersTotal(reservation?.id);
  const feature = foodFeature();
  if (feature?.selectors?.getReservationFinancialTotal) return feature.selectors.getReservationFinancialTotal(reservation, roomAccountTotal);
  return Number(reservation?.totalAmount || 0) + roomAccountTotal;
}

function openFoodOrderModal() {
  state.foodOrderModal = true;
  render();
}

function closeFoodOrderModal() {
  state.foodOrderModal = null;
  render();
}

function renderFoodOrderModal(hotel, settings) {
  if (!state.foodOrderModal) return '';
  const serviceOptions = getFoodServiceOptions(settings);
  const sourceOptions = getFoodOrderSourceOptions(settings);
  const guestOptions = getFoodOrderGuestOptions(hotel.id);
  const roomOptions = getFoodOrderRoomOptionsFromGuests(guestOptions);
  const currency = settings.defaultCurrency || 'USD';
  const menuItems = getHotelAvailableFoodMenuItems(hotel.id);

  const formGrid = renderFoodFormGrid(`
    ${renderFoodField({ iconName: 'status', label: t('foodServices.fields.serviceType'), control: `<select class="select ds-control" name="serviceType" required>${serviceOptions.map(option => `<option value="${h(option.value)}">${h(option.label)}</option>`).join('')}</select>`, component: 'food-order-service-field' })}
    ${renderFoodField({ iconName: 'dashboard', label: t('foodServices.fields.sourceType'), control: `<select class="select ds-control" name="sourceType" id="foodOrderSourceType" required>${sourceOptions.map(option => `<option value="${h(option.value)}">${h(option.label)}</option>`).join('')}</select>`, component: 'food-order-source-field' })}
    ${renderFoodField({ iconName: 'building', label: t('foodServices.fields.roomNumber'), control: `<select class="select ds-control" name="roomId" id="foodOrderRoomId"><option value="">${h(t('foodServices.fields.selectRoomOptional'))}</option>${roomOptions.map(room => `<option value="${h(room.id)}" data-room-number="${h(room.number)}">${h(room.label)}</option>`).join('')}</select><input type="hidden" name="roomNumber" id="foodOrderRoomNumber">`, attrs: { 'data-food-room-field': true }, component: 'food-order-room-field' })}
    ${renderFoodField({ iconName: 'user', label: t('foodServices.fields.guestName'), control: `<select class="select ds-control" name="guestEntryId" id="foodOrderGuestEntry"><option value="">${h(t('foodServices.fields.selectGuestOptional'))}</option>${guestOptions.map(entry => `<option value="${h(entry.id)}" data-room-id="${h(entry.room?.id || entry.reservation?.roomId || '')}" data-room-number="${h(entry.room?.number || '')}" data-reservation-id="${h(entry.reservationId)}" data-guest-name="${h(entry.name || '')}">${h(getFoodOrderGuestOptionLabel(entry))}</option>`).join('')}</select><input type="hidden" name="reservationId" id="foodOrderReservationId"><input type="hidden" name="guestName" id="foodOrderGuestName">`, attrs: { 'data-food-guest-field': true }, component: 'food-order-guest-field' })}
    ${renderFoodField({ iconName: 'user', label: t('foodServices.fields.walkInGuestName'), control: `<input class="input ds-control" name="walkInGuestName" id="foodOrderWalkInGuestName" placeholder="${h(t('foodServices.placeholders.walkInGuest'))}">`, attrs: { 'data-food-manual-guest-field': true }, component: 'food-order-walkin-field' })}
    ${renderFoodField({ iconName: 'table', label: t('foodServices.fields.tableNumber'), control: `<input class="input ds-control" name="tableNumber" id="foodOrderTableNumber" placeholder="${h(t('foodServices.placeholders.table'))}">`, component: 'food-order-table-field' })}
    ${renderFoodField({ iconName: 'creditCard', label: t('foodServices.fields.paymentMethod'), control: `<select class="select ds-control" name="paymentMethod" id="foodOrderPaymentMethod" required>${FOOD_PAYMENT_METHODS.map(method => `<option value="${h(method)}">${h(getFoodOrderPaymentMethodLabel(method))}</option>`).join('')}</select>`, component: 'food-order-payment-field' })}
    ${renderFoodField({ iconName: 'creditCard', label: t('foodServices.fields.amount'), control: `<input class="input ds-control" type="number" min="0" step="0.01" name="amount" id="foodOrderAmount" placeholder="0" readonly required><input type="hidden" name="currency" value="${h(currency)}">`, component: 'food-order-amount-field' })}
    ${renderFoodField({ iconName: 'restaurant', label: t('foodServices.menu.orderItemsTitle'), className: 'settings-full food-order-items-field', component: 'food-order-items-field', control: `
      <div class="food-order-items-box ds-card">
        <div class="food-order-items-head">
          <span>${h(t('foodServices.menu.chooseItemsHelper'))}</span>
          ${renderFoodButton({ action: 'add-food-order-item-row', label: t('foodServices.menu.addItemRow'), tone: 'accent', iconName: 'plus', className: 'compact-action-btn' })}
        </div>
        <div id="foodOrderItemsList" class="food-order-items-list">
          ${menuItems.length ? getFoodOrderItemRowHtml(menuItems, 0) : renderFoodEmptyState({ title: t('foodServices.menu.emptyTitle'), text: t('foodServices.menu.emptyForOrderText'), iconName: 'restaurant', className: 'food-menu-empty food-menu-empty--order' })}
        </div>
        <input type="hidden" name="orderText" id="foodOrderTextInput">
      </div>` })}
    ${renderFoodField({ iconName: 'externalLink', label: t('foodServices.fields.externalVendor'), control: `<input class="input ds-control" name="externalVendor" placeholder="${h(t('foodServices.placeholders.externalVendor'))}">`, className: 'settings-full', component: 'food-order-external-field' })}
    ${renderFoodField({ iconName: 'notes', label: t('foodServices.fields.notes'), control: `<textarea class="input textarea ds-control" name="notes" rows="2"></textarea>`, className: 'settings-full', component: 'food-order-notes-field' })}
  `, '', 'food-order-form-grid');

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card modal-card-wide ds-modal-card food-modal-card-central food-order-modal-central" id="foodOrderForm" data-ui-component="food-order-modal">
        <div class="modal-head ds-section-head food-modal-head"><h2>${h(t('foodServices.modal.addTitle'))}</h2><button class="icon-btn" type="button" data-action="close-food-order-modal">${icon('x')}</button></div>
        ${formGrid}
        <p class="helper food-order-account-helper" id="foodOrderAccountHelper">${h(t('foodServices.roomAccountHelper'))}</p>
        ${renderFoodActions([
          renderFoodButton({ action: 'close-food-order-modal', label: t('common.cancel'), tone: 'neutral', iconName: 'x' }),
          renderFoodButton({ label: t('common.save'), tone: 'primary', iconName: 'checkCircle', type: 'submit', disabled: !menuItems.length })
        ].join(''), 'modal-actions food-modal-actions', 'food-order-modal-actions')}
      </form>
    </div>
  `;
}

function renderFoodOrderCard(order, currency) {
  return `
    <article class="food-order-card ds-card" data-ui-component="food-order-card" data-ui-migrated="food-order-card">
      <div class="food-order-card-head">
        <div class="food-order-main-title">
          <span class="food-order-number ds-badge ds-status-info">${h(getFoodOrderDisplayNumber(order))}</span>
          <h3>${h(order.guestName || t('foodServices.fields.walkInGuestName'))}</h3>
          <p>${h(getFoodOrderTargetLine(order))}</p>
        </div>
        <div class="food-order-badges ds-actions">
          ${renderFoodOrderBadges(order)}
        </div>
      </div>
      <div class="food-order-items-summary" data-ui-component="food-order-items-summary">
        ${Array.isArray(order.items) && order.items.length
          ? order.items.map(item => renderFoodOrderItemChip(item)).join('')
          : renderFoodOrderItemChip({ name: formatFoodOrderItems(order) })}
      </div>
      <div class="food-order-card-meta ds-meta-grid" data-ui-component="food-order-meta-grid">
        ${renderFoodMetaItem({ iconName: 'restaurant', label: t('foodServices.fields.serviceType'), value: getFoodOrderServiceLabel(order.serviceType), component: 'food-order-meta-item' })}
        ${renderFoodMetaItem({ iconName: 'dashboard', label: t('foodServices.fields.sourceType'), value: getFoodOrderSourceLabel(order.sourceType), component: 'food-order-meta-item' })}
        ${renderFoodMetaItem({ iconName: 'calendar', label: t('foodServices.columns.createdAt'), value: order.createdAt || '-', component: 'food-order-meta-item' })}
        ${renderFoodMetaItem({ iconName: 'creditCard', label: t('foodServices.fields.amount'), value: `${order.amount || 0} ${order.currency || currency || ''}`, className: 'total', component: 'food-order-meta-item' })}
      </div>
      ${order.notes ? `<p class="food-order-note">${h(order.notes)}</p>` : ''}
      <div class="food-order-card-footer ds-actions" data-ui-component="food-order-card-footer">
        <span>${h(getFoodOrderFinancialStatusLabel(order))}</span>
        ${renderFoodPrintInvoiceButton(order)}
      </div>
    </article>
  `;
}

function renderFoodOrdersCards(orders, currency, options = {}) {
  if (!orders.length) {
    return renderFoodEmptyState({
      title: t('foodServices.ordersEmptyTitle'),
      text: t('foodServices.ordersEmptyText'),
      iconName: 'receipt',
      className: 'food-orders-empty'
    });
  }
  const compact = options.compact ? ' food-orders-cards-grid--compact' : '';
  return `
    <div class="food-orders-cards-grid ds-grid${compact}" data-ui-component="food-orders-list" data-ui-migrated="food-orders-list" data-layout-fixed="food-orders-three-professional">
      ${orders.map(order => renderFoodOrderCard(order, currency)).join('')}
    </div>
  `;
}

function renderFoodOrdersTable(orders, currency) {
  return renderFoodOrdersCards(orders, currency);
}

function getFoodOrderInvoiceHtml(order) {
  const hotel = getManagerHotel() || {};
  const settings = readHotelSettings(order.hotelId || hotel.id) || {};
  const platformSettings = readPlatformSettings();
  const hotelName = settings.displayName || hotel.name || getPlatformBrandName() || 'Fandqi';
  const logo = settings.logoDataUrl || platformSettings.logoDataUrl || '';
  const printedAt = new Date().toLocaleString(state.lang === 'ar' ? 'ar' : 'en');
  const logoHtml = logo ? `<img src="${h(logo)}" alt="${h(hotelName)}">` : `<span>${h(String(hotelName).slice(0, 1) || 'F')}</span>`;
  const itemsRows = Array.isArray(order.items) && order.items.length ? order.items.map((item, index) => `
    <tr><td>${index + 1}</td><td>${h(item.name || '-')}</td><td>${h(item.quantity || 1)}</td><td>${h(item.price || 0)}</td><td>${h(item.total || (Number(item.price || 0) * Number(item.quantity || 1)))}</td></tr>
  `).join('') : `<tr><td>1</td><td>${h(formatFoodOrderItems(order))}</td><td>1</td><td>${h(order.amount || 0)}</td><td>${h(order.amount || 0)}</td></tr>`;
  return `<!doctype html>
<html lang="${h(state.lang || 'ar')}" dir="${h(document.documentElement.dir || 'rtl')}">
<head><meta charset="utf-8"><title>${h(t('foodServices.invoice.title', 'فاتورة طلب'))} - ${h(getFoodOrderDisplayNumber(order))}</title>
<style>${getCentralPrintStyles('food-invoice')}</style></head>
<body>${renderPrintWindowActions(t('foodServices.actions.printInvoice', 'طباعة الفاتورة'))}
<main class="paper"><header class="top"><div class="brand"><div class="logo">${logoHtml}</div><div><h1>${h(hotelName)}</h1><p>${h(printedAt)}</p></div></div><div><h2>${h(t('foodServices.invoice.title', 'فاتورة طلب'))}</h2><p>${h(getFoodOrderDisplayNumber(order))}</p></div></header>
<section class="meta"><div class="box"><span>${h(t('foodServices.fields.guestName'))}</span><strong>${h(order.guestName || '-')}</strong></div><div class="box"><span>${h(t('foodServices.fields.serviceType'))}</span><strong>${h(getFoodOrderServiceLabel(order.serviceType))}</strong></div><div class="box"><span>${h(t('foodServices.fields.sourceType'))}</span><strong>${h(getFoodOrderSourceLabel(order.sourceType))}</strong></div><div class="box"><span>${h(t('foodServices.fields.paymentMethod'))}</span><strong>${h(getFoodOrderPaymentMethodLabel(order.paymentMethod || 'cash'))}</strong></div><div class="box"><span>${h(t('foodServices.fields.roomNumber'))}</span><strong>${h(order.roomNumber || '-')}</strong></div><div class="box"><span>${h(t('foodServices.fields.tableNumber'))}</span><strong>${h(order.tableNumber || '-')}</strong></div></section>
<table><thead><tr><th>#</th><th>${h(t('foodServices.columns.request'))}</th><th>${h(t('foodServices.menu.quantity'))}</th><th>${h(t('foodServices.menu.price'))}</th><th>${h(t('foodServices.fields.amount'))}</th></tr></thead><tbody>${itemsRows}</tbody></table>
<div class="total"><span>${h(t('foodServices.fields.amount'))}</span><strong>${h(order.amount || 0)} ${h(order.currency || '')}</strong></div><p class="note">${h(getFoodOrderFinancialStatusLabel(order))}</p></main>${renderAutoPrintScript()}</body></html>`;
}

function printFoodOrderInvoice(id) {
  const order = readFoodOrders().find(item => item.id === id);
  if (!order) return;
  openRuntimePrintWindow(getFoodOrderInvoiceHtml(order), { width: 520, height: 740, popupMessage: t('reservation.receipt.popupBlocked') });
}

function renderFoodServicesPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const settings = readHotelSettings(hotel.id);
  const hotelName = settings.displayName || hotel.name || '-';
  const services = [
    { key: 'restaurant', iconName: 'restaurant', title: t('hotelSettings.services.restaurantTitle'), enabled: boolFromFormValue(settings.hasRestaurant), hasTables: boolFromFormValue(settings.restaurantHasTables), tablesCount: settings.restaurantTablesCount, roomDelivery: boolFromFormValue(settings.restaurantRoomDelivery), externalOrders: boolFromFormValue(settings.restaurantExternalOrders), scope: settings.restaurantServiceScope },
    { key: 'cafeteria', iconName: 'coffee', title: t('hotelSettings.services.cafeteriaTitle'), enabled: boolFromFormValue(settings.hasCafeteria), hasTables: boolFromFormValue(settings.cafeteriaHasTables), tablesCount: settings.cafeteriaTablesCount, roomDelivery: boolFromFormValue(settings.cafeteriaRoomDelivery), externalOrders: boolFromFormValue(settings.cafeteriaExternalOrders), scope: settings.cafeteriaServiceScope }
  ].filter(service => service.enabled);
  const sourceOptions = getFoodOrderSourceOptions(settings);
  const serviceOptions = getFoodServiceOptions(settings);
  const canAddOrder = sourceOptions.length > 0 && serviceOptions.length > 0;
  const menuItems = ensureHotelFoodMenuSeed(hotel.id, settings.defaultCurrency || 'USD');
  const orders = foodFeature()?.selectors?.sortFoodOrdersNewest ? foodFeature().selectors.sortFoodOrdersNewest(getHotelFoodOrders(hotel.id)) : getHotelFoodOrders(hotel.id).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  if (!services.length) {
    return renderFoodEmptyState({ title: t('foodServices.emptyTitle'), text: t('foodServices.emptyText'), iconName: 'restaurant', className: 'food-services-empty' });
  }

  const pageActions = renderFoodActions(renderFoodHeaderActions(canAddOrder), 'food-page-actions', 'food-page-actions');
  return `
    <div class="workspace-page food-services-page food-services-central-page" data-ui-centralized="phase104-food-services" data-ui-migrated="food-services">
      ${renderFoodSectionHead({ actions: pageActions })}
      <div class="food-services-summary-grid food-services-central-summary-grid ds-grid" data-ui-component="food-services-summary-grid">
        ${services.map(service => renderFoodServiceCard(service, hotelName)).join('')}
      </div>
      ${renderFoodSurface({
        title: t('foodServices.menu.title'),
        count: menuItems.length,
        iconName: 'restaurant',
        body: renderFoodMenuCards(menuItems, settings.defaultCurrency),
        className: 'food-menu-panel food-central-menu-panel',
        component: 'food-menu-panel'
      })}
      ${renderFoodSurface({
        title: t('foodServices.ordersTitle'),
        count: orders.length,
        iconName: 'receipt',
        body: canAddOrder ? renderFoodOrdersCards(orders, settings.defaultCurrency) : renderFoodEmptyState({
          title: t('foodServices.sourcesMissingTitle'),
          text: t('foodServices.sourcesMissingText'),
          iconName: 'restaurant',
          className: 'food-orders-empty'
        }),
        className: 'food-orders-panel food-central-orders-panel',
        component: 'food-orders-panel'
      })}
      ${renderFoodOrderModal(hotel, settings)}
      ${renderFoodMenuItemModal(hotel, settings)}
    </div>
  `;
}



