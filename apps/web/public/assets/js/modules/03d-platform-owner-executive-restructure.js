// Fandqi Phase 81 — Executive platform owner restructure: unified professional owner workspace.
const PLATFORM_OWNER_REQUEST_FILTER_KEY = 'fandqi.platformOwner.requestStatusFilter';

if (!state.platformOwnerRequestStatusFilter) {
  state.platformOwnerRequestStatusFilter = readStorageText(PLATFORM_OWNER_REQUEST_FILTER_KEY, 'all') || 'all';
}

function poArrayFromReader(readerName, storageKey) {
  try {
    if (typeof window[readerName] === 'function') {
      const value = window[readerName]();
      return Array.isArray(value) ? value : [];
    }
  } catch {
    return [];
  }
  try {
    const value = readStorageJson(storageKey, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function poRooms() { return poArrayFromReader('readRooms', 'fandqi.rooms'); }
function poStaff() { return poArrayFromReader('readStaff', 'fandqi.hotelStaff'); }
function poReservations() { return poArrayFromReader('readReservations', 'fandqi.reservations'); }
function poMaintenanceTickets() { return poArrayFromReader('readMaintenanceTickets', 'fandqi.maintenanceTickets'); }
function poFoodOrders() { return poArrayFromReader('readFoodOrders', 'fandqi.foodOrders'); }

function poByHotel(items, hotelId) {
  return items.filter(item => item?.hotelId === hotelId);
}

function poFormatNumber(value) {
  return new Intl.NumberFormat(i18n?.state?.lang === 'en' ? 'en' : 'ar').format(Number(value || 0));
}

function poFormatDate(value) {
  return value ? String(value).slice(0, 10) : '-';
}

function poProgressClass(percent) {
  const value = Math.max(0, Math.min(100, Number(percent || 0)));
  const bucket = Math.round(value / 10) * 10;
  return `owner-progress--${bucket}`;
}

function poSubscriptionForHotel(hotelId) {
  if (typeof getSubscriptionByHotelId === 'function') return getSubscriptionByHotelId(hotelId);
  return readStorageJson('fandqi.subscriptions', []).find(item => item?.hotelId === hotelId) || null;
}

function poPackageUsage(packageId) {
  return readSubscriptions().filter(subscription => (subscription.packageId || subscription.plan) === packageId).length;
}

function poRecentDateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function poHotelActivityScore(hotel) {
  const subscription = poSubscriptionForHotel(hotel.id);
  const relatedDates = [hotel.updatedAt, hotel.createdAt, subscription?.updatedAt, subscription?.endDate]
    .map(poRecentDateValue)
    .filter(Boolean);
  return relatedDates.length ? Math.max(...relatedDates) : 0;
}

function poHotelHealth(hotel) {
  const subscription = poSubscriptionForHotel(hotel.id);
  const subscriptionStatus = subscription ? getSubscriptionStatus(subscription) : 'not_set';
  if ((hotel.status || 'active') === 'archived') return { status: 'archived', label: getStatusLabel('archived'), tone: 'danger' };
  if ((hotel.status || 'active') === 'suspended') return { status: 'suspended', label: getStatusLabel('suspended'), tone: 'danger' };
  if (subscriptionStatus === 'expired') return { status: 'expired', label: getSubscriptionStatusLabel('expired'), tone: 'danger' };
  if (subscriptionStatus === 'suspended') return { status: 'suspended', label: getSubscriptionStatusLabel('suspended'), tone: 'warning' };
  if (subscriptionStatus === 'trial') return { status: 'trial', label: getSubscriptionStatusLabel('trial'), tone: 'warning' };
  if (!subscription) return { status: 'not_set', label: getSubscriptionStatusLabel('not_set'), tone: 'warning' };
  return { status: 'active', label: getSubscriptionStatusLabel('active'), tone: 'success' };
}

function poHotelCounts(hotelId) {
  return {
    rooms: poByHotel(poRooms(), hotelId).length,
    staff: poByHotel(poStaff(), hotelId).length,
    reservations: poByHotel(poReservations(), hotelId).length,
    maintenance: poByHotel(poMaintenanceTickets(), hotelId).filter(ticket => !['closed', 'completed', 'done'].includes(ticket.status)).length,
    foodOrders: poByHotel(poFoodOrders(), hotelId).length
  };
}

function poStatusBadge(status, label, component = 'owner-status-badge') {
  const ui = poUI();
  const attrs = { 'data-ui-component': component, 'data-status': status || 'neutral' };
  if (ui?.renderBadge) {
    return ui.renderBadge({ status: status || 'neutral', label: label || status || '-', className: 'owner-central-status-badge', attrs });
  }
  return `<span class="status-badge ${h(status)}" data-ui-component="${h(component)}" data-status="${h(status)}">${h(label || status || '-')}</span>`;
}

const PLATFORM_OWNER_DASHBOARD_CENTRAL_AUDIT_MARKERS = Object.freeze([
  'phase109-platform-owner-dashboard',
  'owner-dashboard-page-head',
  'owner-dashboard-stat-card',
  'owner-dashboard-command-section',
  'owner-dashboard-timeline-item'
]);

function poUI() {
  return window.FandqiUI || null;
}

function poOwnerAttrs(attrs = {}) {
  const ui = poUI();
  if (ui?.renderAttributes) return ui.renderAttributes(attrs);
  return Object.entries(attrs || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${h(name)}` : ` ${h(name)}="${h(value)}"`)
    .join('');
}

function poOwnerMiniMetrics(metrics = [], component = 'owner-dashboard-head-metrics') {
  if (!metrics.length) return '';
  return `
    <div class="owner-workspace-hero-metrics" data-ui-component="${h(component)}">
      ${metrics.map(item => `
        <div class="owner-mini-metric owner-mini-metric--${h(item.tone || 'neutral')} ds-card" data-ui-component="owner-dashboard-mini-metric" data-owner-metric-tone="${h(item.tone || 'neutral')}">
          <span>${h(item.label)}</span>
          <strong>${h(item.value)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function poOwnerPageHeader({ iconName = 'dashboard', kicker = '', title = '', subtitle = '', actions = '', metrics = [], component = 'owner-page-head' } = {}) {
  const ui = poUI();
  const metricsSlot = poOwnerMiniMetrics(metrics);
  const actionsSlot = `${metricsSlot}${actions ? `<div class="owner-workspace-hero-actions ds-actions" data-ui-component="owner-page-actions">${actions}</div>` : ''}`;
  const attrs = { 'data-ui-component': component, 'data-ui-owner-central': 'page-head' };
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      kicker,
      kickerIcon: icon(iconName),
      title,
      text: subtitle,
      actions: actionsSlot,
      className: 'owner-workspace-hero owner-central-hero',
      attrs
    });
  }
  return `
    <section class="owner-workspace-hero owner-central-hero"${poOwnerAttrs(attrs)}>
      <div class="owner-workspace-hero-main fandqi-ui-section-copy">
        <span class="owner-workspace-kicker fandqi-ui-section-kicker">${icon(iconName)}${h(kicker)}</span>
        <h2>${h(title)}</h2>
        ${subtitle ? `<p>${h(subtitle)}</p>` : ''}
      </div>
      ${actionsSlot}
    </section>
  `;
}

function poOwnerSection(title, subtitle = '', body = '', className = '', component = 'owner-section') {
  const ui = poUI();
  const head = `
    <div class="owner-section-head ds-section-head" data-ui-component="owner-section-head">
      <div>
        <h3>${h(title)}</h3>
        ${subtitle ? `<p>${h(subtitle)}</p>` : ''}
      </div>
    </div>
  `;
  const attrs = { 'data-ui-component': component, 'data-ui-owner-central': 'surface' };
  if (ui?.renderSurface) {
    return ui.renderSurface({
      className: `owner-section owner-central-section ${className}`,
      head,
      body,
      attrs
    });
  }
  return `<section class="owner-section owner-central-section ${h(className)}"${poOwnerAttrs(attrs)}>${head}${body}</section>`;
}

function poOwnerFilterBar(body, component = 'owner-filter-panel', gridComponent = 'owner-filter-grid', className = '') {
  const ui = poUI();
  const attrs = { 'data-ui-component': component, 'data-ui-owner-central': 'filters' };
  if (ui?.renderSurface) {
    return ui.renderSurface({
      className: `owner-filter-surface ${className}`,
      body: `<div class="filters-bar owner-filter-bar" data-ui-component="${h(gridComponent)}">${body}</div>`,
      attrs
    });
  }
  return `<div class="filters-bar owner-filter-bar ${h(className)}"${poOwnerAttrs(attrs)}>${body}</div>`;
}

const PLATFORM_OWNER_HOTELS_MANAGERS_CENTRAL_AUDIT_MARKERS = Object.freeze([
  'phase110-platform-owner-hotels-managers',
  'owner-hotels-page-head',
  'owner-hotels-filter-field',
  'owner-hotel-card',
  'owner-manager-card',
  'owner-entity-card-action'
]);

function poOwnerFilterField({ label = '', iconName = '', id = '', value = '', type = 'text', options = [], component = 'owner-filter-field', controlAttrs = {} } = {}) {
  const ui = poUI();
  const baseAttrs = { id, ...(controlAttrs || {}) };
  const control = options.length
    ? `<select class="select"${poOwnerAttrs(baseAttrs)}>${options.map(option => `<option value="${h(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${h(option.label)}</option>`).join('')}</select>`
    : `<input class="input" type="${h(type)}" value="${h(value)}" autocomplete="off"${poOwnerAttrs(baseAttrs)}>`;
  const labelHtml = `<span class="field-label">${iconName ? icon(iconName) : ''}${h(label)}</span>`;
  const attrs = { 'data-ui-component': component, 'data-ui-owner-central': 'field' };
  if (ui?.renderField) {
    return ui.renderField({ labelHtml, control, className: 'owner-filter-field', attrs });
  }
  return `<div class="field owner-filter-field"${poOwnerAttrs(attrs)}>${labelHtml}${control}</div>`;
}

function poOwnerEntityActionButton({ label = '', iconName = '', action = '', id = '', ownerModal = '', tone = 'neutral', className = 'btn small ghost', component = 'owner-entity-card-action' } = {}) {
  const ui = poUI();
  const attrs = {
    ...(action ? { 'data-action': action } : {}),
    ...(ownerModal ? { 'data-owner-modal': ownerModal } : {}),
    ...(id ? { 'data-id': id } : {}),
    'data-ui-component': component
  };
  if (ui?.renderButton) {
    return ui.renderButton({
      label,
      icon: iconName ? icon(iconName) : '',
      tone,
      size: 'small',
      className: `${className} owner-entity-card-action`,
      attrs
    });
  }
  return `<button class="${h(className)} owner-entity-card-action" type="button"${poOwnerAttrs(attrs)}>${iconName ? icon(iconName) : ''}${h(label)}</button>`;
}


const PLATFORM_OWNER_PACKAGES_SUBSCRIPTIONS_CENTRAL_AUDIT_MARKERS = Object.freeze([
  'phase111-platform-owner-packages-subscriptions-requests',
  'owner-packages-page-head',
  'owner-package-card',
  'owner-subscription-card',
  'owner-subscription-request-card',
  'owner-request-filter-pill'
]);

function poOwnerCentralButton({ label = '', iconName = '', tone = 'neutral', size = 'small', className = 'btn small ghost', attrs = {}, disabled = false, component = 'owner-central-action', children } = {}) {
  const ui = poUI();
  const finalAttrs = { ...(attrs || {}), ...(disabled ? { disabled: true } : {}), 'data-ui-component': component };
  const options = {
    label,
    icon: iconName ? icon(iconName) : '',
    tone,
    size,
    className: `${className} owner-central-action`,
    attrs: finalAttrs,
    disabled,
    ...(children !== undefined ? { children } : {})
  };
  if (ui?.renderButton) return ui.renderButton(options);
  const content = children !== undefined ? children : `${iconName ? icon(iconName) : ''}${h(label)}`;
  return `<button class="${h(className)} owner-central-action" type="button"${poOwnerAttrs(finalAttrs)}>${content}</button>`;
}

function poOwnerCentralBadge(status, label, component = 'owner-central-badge') {
  const ui = poUI();
  const attrs = { 'data-ui-component': component, 'data-status': status || 'neutral' };
  if (ui?.renderBadge) return ui.renderBadge({ status: status || 'neutral', label: label || status || '-', className: 'owner-central-status-badge', attrs });
  return `<span class="status-badge ${h(status || 'neutral')}"${poOwnerAttrs(attrs)}>${h(label || status || '-')}</span>`;
}

function poOwnerFeatureList(items = [], component = 'owner-feature-list') {
  return `
    <div class="platform-owner-feature-list owner-feature-list-v2" data-ui-component="${h(component)}">
      ${items.map(item => `<div data-ui-component="${h(component)}-item">${icon(item.iconName || 'checkCircle')}<span>${h(item.label ?? item)}</span></div>`).join('')}
    </div>
  `;
}

function poOwnerValuePanel({ label = '', value = '', note = '', iconName = 'creditCard', component = 'owner-value-panel' } = {}) {
  return `
    <div class="platform-owner-package-price owner-value-panel" data-ui-component="${h(component)}">
      <span>${icon(iconName)}${h(label)}</span>
      <strong>${h(value || '-')}</strong>
      ${note ? `<small>${h(note)}</small>` : ''}
    </div>
  `;
}

function poOwnerFilterNote(text = '', iconName = 'info', component = 'owner-filter-note') {
  return `<div class="owner-filter-note" data-ui-component="${h(component)}">${icon(iconName)}<span>${h(text)}</span></div>`;
}

function poOwnerProgressPanel({ title = '', value = '', progress = 0, component = 'owner-subscription-progress' } = {}) {
  const pct = Math.max(0, Math.min(100, Number(progress || 0)));
  return `
    <div class="owner-subscription-progress ${h(poProgressClass(pct))}" data-ui-component="${h(component)}" data-owner-progress="${h(pct)}">
      <div><span>${h(title || '-')}</span><strong>${h(value || '-')}</strong></div>
      <span class="owner-progress-track" data-ui-component="${h(component)}-track"><i></i></span>
    </div>
  `;
}

function poOwnerPackageCard(packageItem) {
  const status = packageItem.status || 'suspended';
  const usage = poPackageUsage(packageItem.id);
  const isTrial = packageItem.id === DEFAULT_TRIAL_PACKAGE_ID || packageItem.trialSupport === 'yes' && Number(packageItem.price || 0) === 0;
  const features = [
    { label: `${t('package.form.maxUsers')}: ${packageItem.maxUsers || '-'}` },
    { label: `${t('package.form.maxRooms')}: ${packageItem.maxRooms || '-'}` },
    { label: `${t('package.form.restaurantSupport')}: ${getPackageBooleanLabel(packageItem.restaurantSupport)}` },
    { label: `${t('package.form.reportsSupport')}: ${getPackageBooleanLabel(packageItem.reportsSupport)}` }
  ];
  const body = `
    ${poOwnerValuePanel({
      label: t('package.columns.price'),
      value: formatPackagePrice(packageItem),
      note: `${packageItem.durationDays || '-'} ${t('package.units.days')} • ${usage} ${t('owner.package.usedBy', 'فندق يستخدمها')}`,
      iconName: 'creditCard',
      component: 'owner-package-price-panel'
    })}
    ${poOwnerFeatureList(features, 'owner-package-feature-list')}
    ${poOwnerMetaGrid([
      { iconName: 'calendar', label: t('package.columns.updatedAt'), value: packageItem.updatedAt || packageItem.createdAt || '-' }
    ], 'owner-package-meta-grid')}
  `;
  const actions = `
    <div class="platform-owner-card-actions platform-owner-card-actions--compact" data-ui-component="owner-package-card-actions">
      ${poOwnerCentralButton({ label: t('package.actions.view'), iconName: 'fileText', tone: 'neutral', attrs: { 'data-action': 'view-package', 'data-id': packageItem.id }, component: 'owner-package-card-action' })}
      ${poOwnerCentralButton({ label: t('package.actions.edit'), iconName: 'settings', tone: 'neutral', attrs: { 'data-action': 'edit-package', 'data-id': packageItem.id }, component: 'owner-package-card-action' })}
      ${poOwnerCentralButton({ label: packageItem.status === 'active' ? t('package.actions.suspend') : t('package.actions.activate'), iconName: packageItem.status === 'active' ? 'ban' : 'checkCircle', tone: 'warning', attrs: { 'data-action': 'toggle-package', 'data-id': packageItem.id }, component: 'owner-package-card-action' })}
      ${packageItem.id !== DEFAULT_TRIAL_PACKAGE_ID ? poOwnerCentralButton({ label: t('package.actions.archive'), iconName: 'archive', tone: 'danger', className: 'btn small danger', attrs: { 'data-action': 'archive-package', 'data-id': packageItem.id }, component: 'owner-package-card-action' }) : ''}
    </div>
  `;
  return poOwnerEntityCard({
    title: packageItem.name || '-',
    subtitle: packageItem.description || '-',
    iconName: isTrial ? 'clock' : 'package',
    badge: poOwnerCentralBadge(status, getPackageStatusLabel(status), 'owner-package-status-badge'),
    body,
    actions,
    status,
    className: `platform-owner-card--package platform-owner-card--${h(status)} owner-package-card-v2`,
    component: 'owner-package-card'
  });
}

function poOwnerSubscriptionCard(row) {
  const hotel = row.hotel;
  const subscription = row.subscription;
  const location = [hotel.country, hotel.city].filter(Boolean).join(' / ') || '-';
  const period = subscription ? `${subscription.startDate || '-'} → ${subscription.endDate || '-'}` : '-';
  const remainingDays = subscription ? getSubscriptionRemainingDays(subscription) : null;
  const durationDays = subscription ? Math.max(1, Number(subscription.durationDays || getSubscriptionPlanDays(subscription.packageId || subscription.plan))) : 0;
  const progress = remainingDays === null || !durationDays ? 0 : Math.max(0, Math.min(100, Math.round((remainingDays / durationDays) * 100)));
  const paymentStatus = subscription ? getPaymentStatusLabel(subscription.paymentStatus || 'unpaid') : '-';
  const body = `
    ${poOwnerProgressPanel({
      title: getSubscriptionPlanLabel(row.plan),
      value: subscription ? getSubscriptionRemainingLabel(subscription) : t('subscription.status.not_set', 'غير مضبوط'),
      progress,
      component: 'owner-subscription-progress-panel'
    })}
    ${poOwnerMetaGrid([
      { iconName: 'calendar', label: t('subscription.columns.period'), value: period },
      { iconName: 'creditCard', label: t('subscription.columns.amount'), value: formatSubscriptionPrice(subscription) },
      { iconName: 'receipt', label: t('subscription.columns.payment'), value: paymentStatus },
      { iconName: 'clock', label: t('subscription.columns.updatedAt'), value: subscription?.updatedAt || '-' }
    ], 'owner-subscription-meta-grid')}
  `;
  const actions = `
    <div class="platform-owner-card-actions platform-owner-card-actions--compact" data-ui-component="owner-subscription-card-actions">
      ${poOwnerCentralButton({ label: subscription ? t('subscription.actions.edit') : t('subscription.actions.setup'), iconName: 'settings', tone: 'neutral', attrs: { 'data-action': 'edit-subscription', 'data-id': hotel.id }, component: 'owner-subscription-card-action' })}
      ${subscription ? poOwnerCentralButton({ label: t('subscription.actions.view'), iconName: 'fileText', tone: 'neutral', attrs: { 'data-action': 'view-subscription', 'data-id': hotel.id }, component: 'owner-subscription-card-action' }) : ''}
      ${subscription ? poOwnerCentralButton({ label: t('subscription.actions.renew'), iconName: 'refreshCw', tone: 'neutral', attrs: { 'data-action': 'renew-subscription', 'data-id': hotel.id }, component: 'owner-subscription-card-action' }) : ''}
      ${subscription && row.status !== 'expired' ? poOwnerCentralButton({ label: row.status === 'suspended' ? t('subscription.actions.activate') : t('subscription.actions.suspend'), iconName: row.status === 'suspended' ? 'checkCircle' : 'ban', tone: 'warning', attrs: { 'data-action': 'toggle-subscription', 'data-id': hotel.id }, component: 'owner-subscription-card-action' }) : ''}
    </div>
  `;
  return poOwnerEntityCard({
    title: hotel.name || '-',
    subtitle: location,
    iconName: 'shieldCheck',
    badge: poOwnerCentralBadge(row.status, getSubscriptionStatusLabel(row.status), 'owner-subscription-status-badge'),
    body,
    actions,
    status: row.status,
    className: `platform-owner-card--subscription platform-owner-card--${h(row.status)} owner-subscription-card-v2`,
    component: 'owner-subscription-card'
  });
}

function poOwnerSubscriptionRequestCard(request) {
  const hotel = getOwnerSubscriptionRequestHotel(request);
  const requestedPackage = getOwnerSubscriptionRequestPackage(request);
  const currentPackage = getOwnerSubscriptionRequestCurrentPackage(request);
  const status = request.status || 'pending';
  const isPending = status === 'pending';
  const statusTone = getOwnerSubscriptionRequestStatusClass(status);
  const body = `
    ${poOwnerMetaGrid([
      { iconName: 'package', label: t('subscriptionPlan.requestsTable.requestedPackage', 'الباقة المطلوبة'), value: requestedPackage?.name || request.requestedPackageName || '-' },
      { iconName: 'shieldCheck', label: t('subscriptionPlan.requestsTable.currentPackage', 'الباقة الحالية'), value: currentPackage?.name || request.currentPackageName || '-' },
      { iconName: 'calendar', label: t('subscriptionPlan.requestsTable.createdAt', 'تاريخ الطلب'), value: formatDateTime(request.createdAt) },
      { iconName: 'clock', label: t('subscription.columns.updatedAt'), value: request.resolvedAt ? formatDateTime(request.resolvedAt) : '-' }
    ], 'owner-request-meta-grid')}
  `;
  const actions = `
    <div class="platform-owner-card-actions platform-owner-card-actions--compact" data-ui-component="owner-request-card-actions">
      ${isPending ? poOwnerCentralButton({ label: t('subscription.requests.approve', 'موافقة وتفعيل'), iconName: 'checkCircle', tone: 'primary', className: 'btn small primary', attrs: { 'data-action': 'approve-subscription-request', 'data-id': request.id }, component: 'owner-request-card-action' }) : ''}
      ${isPending ? poOwnerCentralButton({ label: t('subscription.requests.reject', 'رفض'), iconName: 'x', tone: 'danger', className: 'btn small danger', attrs: { 'data-action': 'reject-subscription-request', 'data-id': request.id }, component: 'owner-request-card-action' }) : ''}
      ${hotel ? poOwnerCentralButton({ label: t('subscription.actions.setup'), iconName: 'settings', tone: 'neutral', attrs: { 'data-owner-modal': 'edit-subscription', 'data-id': hotel.id }, component: 'owner-request-card-action' }) : ''}
    </div>
  `;
  return poOwnerEntityCard({
    title: hotel?.name || request.hotelName || '-',
    subtitle: request.managerName || hotel?.managerName || '-',
    iconName: isPending ? 'bell' : 'receipt',
    badge: poOwnerCentralBadge(statusTone, getOwnerSubscriptionRequestStatusLabel(status), 'owner-request-status-badge'),
    body,
    actions,
    status,
    className: `platform-owner-card--subscription-request platform-owner-card--${h(status)} owner-request-card-v2`,
    component: 'owner-subscription-request-card'
  });
}

function poOwnerRequestFilterPill({ value = 'all', label = '', count = 0, selected = false } = {}) {
  return poOwnerCentralButton({
    tone: selected ? 'primary' : 'neutral',
    className: `owner-request-filter ${selected ? 'active' : ''}`,
    attrs: { 'data-owner-request-filter': value, 'aria-pressed': selected ? 'true' : 'false' },
    component: 'owner-request-filter-pill',
    children: `<span>${h(label)}</span><strong>${h(String(count))}</strong>`
  });
}

function poOwnerRequestsPanelSurface({ summary, filtersHtml = '', cardsHtml = '', emptyHtml = '' } = {}) {
  const ui = poUI();
  const head = `
    <div class="platform-owner-requests-head" data-ui-component="owner-requests-panel-head">
      <div>
        <span>${h(t('subscription.requests.kicker', 'متابعة صاحب المنصة'))}</span>
        <h3>${h(t('subscription.requests.title', 'طلبات الاشتراك الواردة'))}</h3>
        <p>${h(t('subscription.requests.note', 'طلبات تغيير أو تجديد أو تمديد الباقات التي يرسلها مدراء الفنادق تظهر هنا مباشرة.'))}</p>
      </div>
      <div class="platform-owner-requests-summary" data-ui-component="owner-requests-summary-pill">
        <strong>${h(String(summary?.pending || 0))}</strong>
        <small>${h(t('subscription.requests.pending', 'قيد الانتظار'))}</small>
      </div>
    </div>
  `;
  const body = `${filtersHtml}${cardsHtml || emptyHtml}`;
  const attrs = { id: 'subscriptionRequestsSlot', 'data-platform-owner-view': 'subscription-requests', 'data-ui-component': 'owner-requests-panel', 'data-ui-owner-central': 'surface' };
  if (ui?.renderSurface) {
    return ui.renderSurface({ className: 'platform-owner-requests-panel owner-requests-panel-v2 owner-central-section', head, body, attrs });
  }
  return `<section class="platform-owner-requests-panel owner-requests-panel-v2"${poOwnerAttrs(attrs)}>${head}${body}</section>`;
}

function poOwnerEntityCard({ title = '', subtitle = '', iconName = 'building', badge = '', body = '', actions = '', status = 'neutral', className = '', component = 'owner-entity-card' } = {}) {
  const ui = poUI();
  const attrs = { 'data-ui-component': component, 'data-ui-owner-central': 'entity-card', 'data-owner-card-status': status };
  if (ui?.renderCard) {
    return ui.renderCard({
      title,
      subtitle,
      icon: icon(iconName),
      badge,
      body,
      actions,
      className: `platform-owner-card owner-entity-card owner-entity-card--${status} ${className}`,
      attrs
    });
  }
  return `<article class="platform-owner-card owner-entity-card owner-entity-card--${h(status)} ${h(className)}"${poOwnerAttrs(attrs)}><header class="platform-owner-card-top"><div class="platform-owner-identity"><div class="platform-owner-card-icon">${icon(iconName)}</div><div><h3>${h(title)}</h3><p>${h(subtitle)}</p></div></div>${badge}</header><div class="fandqi-ui-card-body">${body}</div><footer class="platform-owner-card-actions">${actions}</footer></article>`;
}

function poOwnerMetaGrid(items = [], component = 'owner-entity-meta-grid') {
  return `
    <div class="platform-owner-meta-grid owner-meta-grid-compact" data-ui-component="${h(component)}">
      ${items.map(item => `<div data-ui-component="owner-entity-meta-item">${icon(item.iconName || 'info')}<span>${h(item.label)}</span><strong>${h(item.value ?? '-')}</strong></div>`).join('')}
    </div>
  `;
}

function poOwnerActionButton({ label, iconName = '', page = '', action = '', className = 'btn small ghost', id = '', disabled = false, component = 'owner-action-button' } = {}) {
  const ui = poUI();
  const attrs = {
    ...(id ? { id } : {}),
    ...(page ? { 'data-owner-page': page } : {}),
    ...(action ? { 'data-owner-action': action } : {}),
    ...(disabled ? { disabled: true } : {}),
    'data-ui-component': component
  };
  if (ui?.renderButton) {
    const tone = className.includes('primary') ? 'primary' : className.includes('danger') ? 'danger' : className.includes('warning') ? 'warning' : 'neutral';
    return ui.renderButton({ label, icon: iconName ? icon(iconName) : '', tone, size: className.includes('small') ? 'small' : '', className, attrs });
  }
  return `<button class="${h(className)}" type="button"${poOwnerAttrs(attrs)}>${iconName ? icon(iconName) : ''}${h(label)}</button>`;
}

function poOwnerStatCards(items) {
  const ui = poUI();
  return `
    <div class="owner-stat-grid ds-summary-grid" data-ui-component="owner-dashboard-stat-grid">
      ${items.map(item => {
        const attrs = {
          ...(item.page ? { 'data-owner-page': item.page } : {}),
          ...(item.filter ? { 'data-dashboard-filter': item.filter } : {}),
          'data-ui-component': 'owner-dashboard-stat-card',
          'data-owner-stat-tone': item.tone || 'neutral'
        };
        if (ui?.renderMetricCard) {
          return ui.renderMetricCard({
            title: item.label,
            value: item.value,
            note: item.note || '',
            icon: icon(item.iconName || 'dashboard'),
            tone: item.tone || 'neutral',
            className: `owner-stat-card owner-stat-card--${h(item.tone || 'neutral')}`,
            attrs
          });
        }
        return `
          <button class="owner-stat-card owner-stat-card--${h(item.tone || 'neutral')}" type="button"${poOwnerAttrs(attrs)}>
            <span class="owner-stat-icon">${icon(item.iconName || 'dashboard')}</span>
            <span>${h(item.label)}</span>
            <strong>${h(item.value)}</strong>
            <small>${h(item.note || '')}</small>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function poOwnerEmptyState(title, text, component = 'owner-dashboard-empty-state') {
  const ui = poUI();
  if (ui?.renderEmptyState) {
    return `<div class="owner-empty-state-wrap" data-ui-component="${h(component)}">${ui.renderEmptyState({ title, text })}</div>`;
  }
  return `<div class="empty-panel dashboard-empty" data-ui-component="${h(component)}"><div><h2>${h(title)}</h2><p>${h(text)}</p></div></div>`;
}

function poOwnerTimelineItem({ iconName = 'clock', title = '', note = '', meta = '', page = '', action = '', tone = 'neutral' } = {}) {
  const ui = poUI();
  const attrs = {
    ...(page ? { 'data-owner-page': page } : {}),
    ...(action ? { 'data-owner-action': action } : {}),
    'data-ui-component': 'owner-dashboard-timeline-item',
    'data-owner-timeline-tone': tone
  };
  const children = `
    <span class="owner-timeline-icon" data-ui-component="owner-dashboard-timeline-icon">${icon(iconName)}</span>
    <span class="owner-timeline-text" data-ui-component="owner-dashboard-timeline-copy"><strong>${h(title)}</strong><small>${h(note)}</small></span>
    <em>${h(meta)}</em>
  `;
  if (ui?.renderButton) {
    return ui.renderButton({
      tone: ['danger', 'warning', 'success'].includes(tone) ? tone : 'neutral',
      className: `owner-timeline-item owner-timeline-item--${tone}`,
      attrs,
      children
    });
  }
  return `<button class="owner-timeline-item owner-timeline-item--${h(tone)}" type="button"${poOwnerAttrs(attrs)}>${children}</button>`;
}

function poGetDashboardMetrics() {
  const base = getDashboardMetrics();
  const hotels = readHotels().filter(hotel => hotel.status !== 'archived');
  const rooms = poRooms().filter(room => hotels.some(hotel => hotel.id === room.hotelId));
  const staff = poStaff().filter(item => hotels.some(hotel => hotel.id === item.hotelId));
  const reservations = poReservations().filter(item => hotels.some(hotel => hotel.id === item.hotelId));
  const trialHotels = hotels.filter(hotel => poHotelHealth(hotel).status === 'trial').length;
  const notSetHotels = hotels.filter(hotel => poHotelHealth(hotel).status === 'not_set').length;
  const newHotels = hotels
    .slice()
    .sort((a, b) => poRecentDateValue(b.createdAt) - poRecentDateValue(a.createdAt))
    .slice(0, 5);
  const activeSubscriptions = readSubscriptions().filter(subscription => ['active', 'trial'].includes(getSubscriptionStatus(subscription)));
  const expectedRevenue = sumSubscriptionAmounts(activeSubscriptions, ['paid', 'unpaid', 'partial']);
  return { ...base, roomsTotal: rooms.length, staffTotal: staff.length, reservationsTotal: reservations.length, trialHotels, notSetHotels, newHotels, expectedRevenue };
}

function renderPlatformDashboardPage() {
  const metrics = poGetDashboardMetrics();
  const requestsSummary = getPlatformSubscriptionRequestsSummary();
  const headerActions = [
    poOwnerActionButton({ label: t('hotel.actions.add', 'إضافة فندق'), iconName: 'building', action: 'add_hotel', className: 'btn primary small' }),
    poOwnerActionButton({ label: t('package.actions.add', 'إضافة باقة'), iconName: 'package', action: 'add_package', className: 'btn ghost small' }),
    poOwnerActionButton({ label: t('page.subscription_requests', 'طلبات الاشتراك'), iconName: 'receipt', page: 'subscription_requests', className: 'btn ghost small' })
  ].join('');

  const statCards = poOwnerStatCards([
    { iconName: 'building', label: t('dashboard.cards.hotelsTotal', 'إجمالي الفنادق'), value: poFormatNumber(metrics.hotelsTotal), note: t('dashboard.notes.allHotels', 'كل الفنادق'), page: 'hotels', filter: 'hotels_all', tone: 'primary' },
    { iconName: 'checkCircle', label: t('dashboard.cards.hotelsActive', 'فنادق فعالة'), value: poFormatNumber(metrics.hotelsActive), note: t('dashboard.notes.activeHotels', 'تعمل حاليًا'), page: 'hotels', filter: 'hotels_active', tone: 'success' },
    { iconName: 'clock', label: t('subscription.status.trial', 'تجريبي'), value: poFormatNumber(metrics.trialHotels), note: t('package.defaultTrial.name', 'باقة تجريبية مجانية'), page: 'subscriptions', filter: 'subscriptions_active', tone: 'warning' },
    { iconName: 'receipt', label: t('page.subscription_requests', 'طلبات الاشتراك'), value: poFormatNumber(metrics.subscriptionRequestsPending), note: t('dashboard.notes.subscriptionRequests', 'طلبات تنتظر قرارك'), page: 'subscription_requests', tone: 'warning' },
    { iconName: 'ban', label: t('dashboard.cards.expired', 'منتهية'), value: poFormatNumber(metrics.subscriptionsExpired), note: t('dashboard.notes.expiredSubscriptions', 'اشتراكات تحتاج متابعة'), page: 'subscriptions', filter: 'subscriptions_expired', tone: 'danger' },
    { iconName: 'creditCard', label: t('dashboard.cards.paidAmount', 'إيراد محصل'), value: formatDashboardMoney(metrics.paidTotal, metrics.currency), note: t('dashboard.notes.paidAmount', 'حسب الدفعات المسجلة'), page: 'subscriptions', filter: 'subscriptions_all', tone: 'success' },
    { iconName: 'receipt', label: t('dashboard.cards.unpaidAmount', 'مبالغ معلقة'), value: formatDashboardMoney(metrics.unpaidTotal, metrics.currency), note: t('dashboard.notes.unpaidAmount', 'غير مدفوعة أو جزئية'), page: 'subscriptions', filter: 'subscriptions_all', tone: 'warning' },
    { iconName: 'table', label: t('dashboard.cards.platformScale', 'حجم التشغيل'), value: poFormatNumber(metrics.roomsTotal), note: t('dashboard.notes.platformScale', 'غرف مسجلة عبر الفنادق'), page: 'hotels', filter: 'hotels_all', tone: 'neutral' }
  ]);

  const pendingRequests = getPlatformPendingSubscriptionRequests().slice(0, 4);
  const requestBody = pendingRequests.length ? `
    <div class="owner-queue-list">
      ${pendingRequests.map(request => {
        const hotel = getOwnerSubscriptionRequestHotel(request);
        return poOwnerTimelineItem({ iconName: 'receipt', title: hotel?.name || request.hotelName || '-', note: `${getOwnerSubscriptionRequestTypeLabel(request.type)} • ${request.requestedPackageName || getOwnerSubscriptionRequestPackage(request)?.name || '-'}`, meta: formatDateTime(request.createdAt), page: 'subscription_requests', tone: 'warning' });
      }).join('')}
    </div>
  ` : poOwnerEmptyState(t('subscription.requests.emptyTitle', 'لا توجد طلبات اشتراك واردة'), t('subscription.requests.emptyText', 'عندما يطلب مدير الفندق تغيير الباقة أو التجديد ستظهر الطلبات هنا مباشرة.'), 'owner-dashboard-requests-empty');

  const endingBody = metrics.endingSoon.length ? `
    <div class="owner-queue-list">
      ${metrics.endingSoon.slice(0, 5).map(row => poOwnerTimelineItem({ iconName: 'clock', title: row.hotel.name || '-', note: getSubscriptionPlanLabel(row.plan), meta: getSubscriptionRemainingLabel(row.subscription), page: 'subscriptions', tone: 'warning' })).join('')}
    </div>
  ` : poOwnerEmptyState(t('dashboard.empty.endingSoonTitle', 'لا توجد اشتراكات قريبة الانتهاء'), t('dashboard.empty.endingSoonText', 'كل الاشتراكات ضمن المدة الآمنة حاليًا.'), 'owner-dashboard-ending-empty');

  const hotelsBody = metrics.newHotels.length ? `
    <div class="owner-queue-list">
      ${metrics.newHotels.map(hotel => {
        const health = poHotelHealth(hotel);
        return poOwnerTimelineItem({ iconName: 'building', title: hotel.name || '-', note: `${hotel.managerName || '-'} • ${health.label}`, meta: poFormatDate(hotel.createdAt), page: 'hotels', tone: health.tone });
      }).join('')}
    </div>
  ` : poOwnerEmptyState(t('hotel.emptyTitle', 'لا توجد فنادق'), t('hotel.emptyText', 'ابدأ بإضافة أول فندق إلى المنصة.'), 'owner-dashboard-hotels-empty');

  return `
    <div class="dashboard-page owner-executive-page owner-central-dashboard-page" data-ui-page="platform-owner-dashboard" data-ui-centralized="phase109-platform-owner-dashboard">
      ${poOwnerPageHeader({
        iconName: 'dashboard',
        kicker: t('platformOwner.description', 'إدارة الفنادق والاشتراكات والباقات من مكان واحد'),
        title: t('dashboard.title', 'لوحة تحكم صاحب المنصة'),
        subtitle: t('dashboard.description', 'مركز قيادة واحد لمراقبة الفنادق، الاشتراكات، الطلبات، الإيرادات والتنبيهات التشغيلية.'),
        actions: headerActions,
        component: 'owner-dashboard-page-head',
        metrics: [
          { label: t('dashboard.cards.subscriptionsActive', 'اشتراكات فعالة'), value: poFormatNumber(metrics.subscriptionsActive), tone: 'success' },
          { label: t('dashboard.cards.endingSoon', 'تنتهي قريبًا'), value: poFormatNumber(metrics.subscriptionsEndingSoon), tone: 'warning' },
          { label: t('dashboard.cards.platformRevenue', 'إيراد متوقع'), value: formatDashboardMoney(metrics.expectedRevenue, metrics.currency), tone: 'primary' }
        ]
      })}

      ${statCards}

      <div class="owner-command-grid" data-ui-component="owner-dashboard-command-grid">
        ${poOwnerSection(t('dashboard.sections.ownerInbox', 'صندوق القرارات'), t('dashboard.sections.ownerInboxHint', 'طلبات تحتاج موافقة أو رفض من صاحب المنصة.'), requestBody, 'owner-section--queue', 'owner-dashboard-command-section')}
        ${poOwnerSection(t('dashboard.sections.endingSoon', 'اشتراكات قريبة الانتهاء'), `${t('dashboard.notes.within', 'خلال')} ${metrics.warningDays} ${t('dashboard.notes.days', 'أيام')}`, endingBody, 'owner-dashboard-command-section owner-section--queue', 'owner-dashboard-command-section')}
        ${poOwnerSection(t('dashboard.sections.newHotels', 'آخر الفنادق المسجلة'), t('dashboard.sections.newHotelsHint', 'متابعة التسجيلات الجديدة والتجارب التلقائية.'), hotelsBody, 'owner-dashboard-command-section owner-section--queue', 'owner-dashboard-command-section')}
      </div>
    </div>
  `;
}

function poOwnerHotelCard(hotel) {
  const location = [hotel.country, hotel.city].filter(Boolean).join(' / ') || '-';
  const managerName = hotel.managerName || '-';
  const status = hotel.status || 'active';
  const subscription = poSubscriptionForHotel(hotel.id);
  const packageItem = subscription ? getPackageById(subscription.packageId || subscription.plan) : null;
  const health = poHotelHealth(hotel);
  const counts = poHotelCounts(hotel.id);
  const badge = poStatusBadge(health.status, health.label, 'owner-hotel-status-badge');
  const body = `
    <div class="platform-owner-manager-strip" data-ui-component="owner-hotel-manager-strip">
      ${renderPersonAvatar(hotel.managerPhotoDataUrl || '', managerName || hotel.name || '', 'manager-table-avatar')}
      <div>
        <span>${h(t('hotel.columns.manager'))}</span>
        <strong>${h(managerName)}</strong>
        <small>${h(hotel.managerEmail || hotel.email || '-')}</small>
      </div>
    </div>

    <div class="owner-subscription-ribbon owner-subscription-ribbon--${h(health.status)}" data-ui-component="owner-hotel-subscription-ribbon">
      <span>${icon('shieldCheck')}${h(packageItem?.name || subscription?.packageName || getSubscriptionPlanLabel(subscription?.packageId || subscription?.plan) || t('subscription.plan.not_set', 'غير محدد'))}</span>
      <strong>${h(subscription ? getSubscriptionRemainingLabel(subscription) : t('subscription.status.not_set', 'غير مضبوط'))}</strong>
    </div>

    ${poOwnerMetaGrid([
      { iconName: 'table', label: t('owner.hotel.rooms', 'الغرف'), value: poFormatNumber(counts.rooms) },
      { iconName: 'users', label: t('owner.hotel.staff', 'الموظفون'), value: poFormatNumber(counts.staff) },
      { iconName: 'calendar', label: t('owner.hotel.reservations', 'الحجوزات'), value: poFormatNumber(counts.reservations) },
      { iconName: 'settings', label: t('owner.hotel.openTasks', 'مهام مفتوحة'), value: poFormatNumber(counts.maintenance) }
    ], 'owner-hotel-meta-grid')}
  `;
  const actions = `
    <div class="platform-owner-card-actions" data-ui-component="owner-hotel-card-actions">
      ${poOwnerEntityActionButton({ label: t('hotel.actions.view'), iconName: 'fileText', action: 'view-hotel', id: hotel.id, component: 'owner-hotel-card-action' })}
      ${poOwnerEntityActionButton({ label: t('hotel.actions.edit'), iconName: 'settings', action: 'edit-hotel', id: hotel.id, component: 'owner-hotel-card-action' })}
      ${poOwnerEntityActionButton({ label: t('hotel.actions.manager'), iconName: 'user', action: 'manager-hotel', id: hotel.id, component: 'owner-hotel-card-action' })}
      ${poOwnerEntityActionButton({ label: t('subscription.actions.setup'), iconName: 'shieldCheck', ownerModal: 'edit-subscription', id: hotel.id, component: 'owner-hotel-card-action' })}
      ${poOwnerEntityActionButton({ label: status === 'active' ? t('hotel.actions.suspend') : t('hotel.actions.activate'), action: 'toggle-hotel', id: hotel.id, component: 'owner-hotel-card-action' })}
      ${poOwnerEntityActionButton({ label: t('hotel.actions.archive'), action: 'archive-hotel', id: hotel.id, tone: 'danger', className: 'btn small danger', component: 'owner-hotel-card-action' })}
    </div>
  `;
  return poOwnerEntityCard({
    title: hotel.name || '-',
    subtitle: location,
    iconName: 'building',
    badge,
    body,
    actions,
    status: health.status,
    className: `platform-owner-card--hotel platform-owner-card--${h(health.status)} owner-hotel-card-v2`,
    component: 'owner-hotel-card'
  });
}

function renderHotelsTable(hotels) {
  if (!hotels.length) return poOwnerEmptyState(t('hotel.emptyTitle'), t('hotel.emptyText'), 'owner-hotels-empty-state');
  return `
    <div class="platform-owner-cards-grid platform-owner-hotel-cards owner-hotel-cards-v2" data-platform-owner-view="cards" data-ui-component="owner-hotels-cards-grid">
      ${hotels.map(poOwnerHotelCard).join('')}
    </div>
  `;
}

function renderHotelsPage() {
  const hotels = getFilteredHotels();
  const allHotels = readHotels().filter(hotel => hotel.status !== 'archived');
  const active = allHotels.filter(hotel => poHotelHealth(hotel).tone === 'success').length;
  const trial = allHotels.filter(hotel => poHotelHealth(hotel).status === 'trial').length;
  const attention = allHotels.filter(hotel => ['danger', 'warning'].includes(poHotelHealth(hotel).tone)).length;
  const addAction = poOwnerEntityActionButton({
    label: t('hotel.actions.add'),
    iconName: 'building',
    id: 'addHotelBtn',
    tone: 'primary',
    className: 'btn primary small',
    component: 'owner-hotels-add-action'
  }).replace('data-id="addHotelBtn"', 'id="addHotelBtn"');

  return `
    <div class="hotels-page owner-page-v2 owner-hotels-page-v2 owner-hotels-central-page" data-ui-page="platform-owner-hotels" data-ui-centralized="phase110-platform-owner-hotels-managers">
      ${poOwnerPageHeader({
        iconName: 'building',
        kicker: t('owner.hotels.kicker', 'إدارة عملاء المنصة'),
        title: t('page.hotels'),
        subtitle: t('owner.hotels.subtitle', 'ملفات الفنادق، حالة الاشتراك، المدير، وحجم التشغيل في كروت واضحة بدل الجداول.'),
        actions: addAction,
        component: 'owner-hotels-page-head',
        metrics: [
          { label: t('dashboard.cards.hotelsTotal', 'إجمالي الفنادق'), value: poFormatNumber(allHotels.length), tone: 'primary' },
          { label: t('dashboard.cards.hotelsActive', 'فنادق فعالة'), value: poFormatNumber(active), tone: 'success' },
          { label: t('subscription.status.trial', 'تجريبي'), value: poFormatNumber(trial), tone: 'warning' },
          { label: t('owner.common.needsAttention', 'تحتاج متابعة'), value: poFormatNumber(attention), tone: 'danger' }
        ]
      })}

      ${poOwnerFilterBar(`
        ${poOwnerFilterField({ label: t('hotel.filters.search'), iconName: 'search', id: 'hotelSearch', value: state.hotelFilters.search, component: 'owner-hotels-filter-field' })}
        ${poOwnerFilterField({ label: t('hotel.filters.status'), iconName: 'shieldCheck', id: 'hotelStatusFilter', value: state.hotelFilters.status, component: 'owner-hotels-filter-field', options: [
          { value: 'all', label: t('hotel.filters.all') },
          { value: 'active', label: t('hotel.status.active') },
          { value: 'suspended', label: t('hotel.status.suspended') },
          { value: 'archived', label: t('hotel.status.archived') }
        ] })}
        ${poOwnerFilterField({ label: t('hotel.filters.location'), iconName: 'mapPin', id: 'hotelLocationFilter', value: state.hotelFilters.location, component: 'owner-hotels-filter-field' })}
      `, 'owner-hotels-filter-panel', 'owner-hotels-filter-grid', 'owner-hotels-filter-surface')}

      <div id="hotelsTableSlot" data-ui-component="owner-hotels-table-slot">${renderHotelsTable(hotels)}</div>
      ${renderHotelModal()}
    </div>
  `;
}

function poOwnerManagerCard(manager) {
  const managerStatus = manager.managerStatus || 'active';
  const hotelStatus = manager.hotelStatus || 'active';
  const location = [manager.country, manager.city].filter(Boolean).join(' / ') || '-';
  const hotelHealth = { status: hotelStatus, label: getStatusLabel(hotelStatus) };
  const badge = poStatusBadge(managerStatus, t(`manager.status.${managerStatus}`), 'owner-manager-status-badge');
  const body = `
    <div class="platform-owner-manager-strip owner-manager-primary-strip" data-ui-component="owner-manager-primary-strip">
      ${renderPersonAvatar(manager.managerPhotoDataUrl || '', manager.managerName || '', 'platform-owner-card-avatar manager-table-avatar')}
      <div>
        <span>${h(t('manager.columns.manager'))}</span>
        <strong>${h(manager.managerName || '-')}</strong>
        <small>${h(manager.email || '-')}</small>
      </div>
    </div>

    ${poOwnerMetaGrid([
      { iconName: 'building', label: t('manager.columns.hotel'), value: manager.hotelName || '-' },
      { iconName: 'mapPin', label: t('manager.columns.location'), value: location },
      { iconName: 'shieldCheck', label: t('manager.columns.hotelStatus'), value: hotelHealth.label },
      { iconName: 'calendar', label: t('manager.columns.updatedAt'), value: manager.updatedAt || '-' }
    ], 'owner-manager-meta-grid')}

    <div class="platform-owner-card-status-row" data-ui-component="owner-manager-status-row">
      ${poStatusBadge(hotelStatus, getStatusLabel(hotelStatus), 'owner-manager-hotel-status-badge')}
      ${poStatusBadge(managerStatus, t(`manager.status.${managerStatus}`), 'owner-manager-account-status-badge')}
    </div>
  `;
  const actions = `
    <div class="platform-owner-card-actions platform-owner-card-actions--compact" data-ui-component="owner-manager-card-actions">
      ${poOwnerEntityActionButton({ label: t('hotel.actions.view'), action: 'view-hotel', id: manager.hotelId, component: 'owner-manager-card-action' })}
      ${poOwnerEntityActionButton({ label: t('manager.actions.edit'), action: 'manager-hotel', id: manager.hotelId, component: 'owner-manager-card-action' })}
      ${poOwnerEntityActionButton({ label: manager.managerStatus === 'active' ? t('manager.actions.suspend') : t('manager.actions.activate'), action: 'toggle-manager', id: manager.hotelId, component: 'owner-manager-card-action' })}
    </div>
  `;
  return poOwnerEntityCard({
    title: manager.managerName || '-',
    subtitle: manager.email || '-',
    iconName: 'users',
    badge,
    body,
    actions,
    status: managerStatus,
    className: `platform-owner-card--manager platform-owner-card--${h(managerStatus)} owner-manager-card-v2`,
    component: 'owner-manager-card'
  });
}

function renderManagersTable(managers) {
  if (!managers.length) return poOwnerEmptyState(t('manager.emptyTitle'), t('manager.emptyText'), 'owner-managers-empty-state');
  return `
    <div class="platform-owner-cards-grid platform-owner-manager-cards owner-manager-cards-v2" data-platform-owner-view="cards" data-ui-component="owner-managers-cards-grid">
      ${managers.map(poOwnerManagerCard).join('')}
    </div>
  `;
}

function renderManagersPage() {
  const managers = getFilteredManagers();
  const allManagers = getHotelManagers();
  const total = allManagers.filter(manager => manager.hotelStatus !== 'archived').length;
  const active = allManagers.filter(manager => manager.managerStatus === 'active' && manager.hotelStatus !== 'archived').length;
  const suspended = allManagers.filter(manager => manager.managerStatus === 'suspended' && manager.hotelStatus !== 'archived').length;
  return `
    <div class="hotels-page managers-page owner-page-v2 owner-managers-central-page" data-ui-page="platform-owner-managers" data-ui-centralized="phase110-platform-owner-hotels-managers">
      ${poOwnerPageHeader({
        iconName: 'users',
        kicker: t('owner.managers.kicker', 'إدارة مسؤولي الفنادق'),
        title: t('page.hotel_managers'),
        subtitle: t('owner.managers.subtitle', 'متابعة حسابات مدراء الفنادق وربط كل مدير بحالة الفندق والاشتراك.'),
        component: 'owner-managers-page-head',
        metrics: [
          { label: t('dashboard.cards.managers', 'المدراء'), value: poFormatNumber(total), tone: 'primary' },
          { label: t('manager.status.active', 'فعال'), value: poFormatNumber(active), tone: 'success' },
          { label: t('manager.status.suspended', 'موقوف'), value: poFormatNumber(suspended), tone: 'warning' }
        ]
      })}

      ${poOwnerFilterBar(`
        ${poOwnerFilterField({ label: t('manager.filters.search'), iconName: 'search', id: 'managerSearch', value: state.managerFilters.search, component: 'owner-managers-filter-field' })}
        ${poOwnerFilterField({ label: t('manager.filters.status'), iconName: 'shieldCheck', id: 'managerStatusFilter', value: state.managerFilters.status, component: 'owner-managers-filter-field', options: [
          { value: 'all', label: t('manager.filters.all') },
          { value: 'active', label: t('manager.status.active') },
          { value: 'suspended', label: t('manager.status.suspended') }
        ] })}
        ${poOwnerFilterField({ label: t('manager.filters.hotelStatus'), iconName: 'building', id: 'managerHotelStatusFilter', value: state.managerFilters.hotelStatus, component: 'owner-managers-filter-field', options: [
          { value: 'all', label: t('manager.filters.all') },
          { value: 'active', label: t('hotel.status.active') },
          { value: 'suspended', label: t('hotel.status.suspended') },
          { value: 'archived', label: t('hotel.status.archived') }
        ] })}
      `, 'owner-managers-filter-panel', 'owner-managers-filter-grid', 'owner-managers-filter-surface')}

      <div id="managersTableSlot" data-ui-component="owner-managers-table-slot">${renderManagersTable(managers)}</div>
      ${renderHotelModal()}
    </div>
  `;
}

function renderPackagesTable(packages) {
  if (!packages.length) return poOwnerEmptyState(t('package.emptyTitle'), t('package.emptyText'), 'owner-packages-empty-state');
  return `
    <div class="platform-owner-cards-grid platform-owner-package-cards owner-package-cards-v2" data-platform-owner-view="cards" data-ui-component="owner-packages-cards-grid">
      ${packages.map(poOwnerPackageCard).join('')}
    </div>
  `;
}

function renderPackagesPage() {
  const packages = getFilteredPackages();
  const allPackages = readPackages().filter(packageItem => packageItem.status !== 'archived');
  return `
    <div class="hotels-page packages-page owner-page-v2 owner-packages-central-page" data-ui-page="platform-owner-packages" data-ui-centralized="phase111-platform-owner-packages-subscriptions-requests">
      ${poOwnerPageHeader({
        iconName: 'package',
        kicker: t('owner.packages.kicker', 'تعريف خطط البيع'),
        title: t('page.packages'),
        subtitle: t('owner.packages.subtitle', 'الباقات هنا لتعريف الخطط فقط؛ أما طلبات الاشتراك فلها صندوق مستقل للمراجعة والقرار.'),
        actions: poOwnerCentralButton({ label: t('package.actions.add'), iconName: 'package', tone: 'primary', className: 'btn primary small', attrs: { id: 'addPackageBtn' }, component: 'owner-packages-add-action' }),
        component: 'owner-packages-page-head',
        metrics: [
          { label: t('package.filters.all', 'الكل'), value: poFormatNumber(allPackages.length), tone: 'primary' },
          { label: t('package.status.active', 'فعال'), value: poFormatNumber(allPackages.filter(item => item.status === 'active').length), tone: 'success' },
          { label: t('package.status.suspended', 'موقوف'), value: poFormatNumber(allPackages.filter(item => item.status === 'suspended').length), tone: 'warning' }
        ]
      })}
      ${poOwnerFilterBar(`
        ${poOwnerFilterField({ label: t('package.filters.search'), iconName: 'search', id: 'packageSearch', value: state.packageFilters.search, component: 'owner-packages-filter-field' })}
        ${poOwnerFilterField({ label: t('package.filters.status'), iconName: 'shieldCheck', id: 'packageStatusFilter', value: state.packageFilters.status, component: 'owner-packages-filter-field', options: [
          { value: 'all', label: t('package.filters.all') },
          { value: 'active', label: t('package.status.active') },
          { value: 'suspended', label: t('package.status.suspended') },
          { value: 'archived', label: t('package.status.archived') }
        ] })}
        ${poOwnerFilterNote(t('owner.packages.requestNote', 'طلبات الترقية والتجديد تظهر في صفحة طلبات الاشتراك وليس هنا.'), 'receipt', 'owner-packages-request-note')}
      `, 'owner-packages-filter-panel', 'owner-packages-filter-grid', 'owner-packages-filter-surface')}
      <div id="packagesTableSlot" data-ui-component="owner-packages-table-slot">${renderPackagesTable(packages)}</div>
      ${renderPackageModal()}
    </div>
  `;
}

function renderSubscriptionsTable(rows) {
  if (!readHotels().filter(hotel => hotel.status !== 'archived').length) return poOwnerEmptyState(t('subscription.emptyNoHotelsTitle'), t('subscription.emptyNoHotelsText'), 'owner-subscriptions-empty-no-hotels');
  if (!getActivePackages().length) return poOwnerEmptyState(t('subscription.emptyNoPackagesTitle'), t('subscription.emptyNoPackagesText'), 'owner-subscriptions-empty-no-packages');
  if (!rows.length) return poOwnerEmptyState(t('subscription.emptyFilteredTitle'), t('subscription.emptyFilteredText'), 'owner-subscriptions-empty-filtered');
  return `
    <div class="platform-owner-cards-grid platform-owner-subscription-cards owner-subscription-cards-v2" data-platform-owner-view="cards" data-ui-component="owner-subscriptions-cards-grid">
      ${rows.map(poOwnerSubscriptionCard).join('')}
    </div>
  `;
}

function renderSubscriptionsPage() {
  const rows = getFilteredSubscriptions();
  const hasHotels = readHotels().some(hotel => hotel.status !== 'archived');
  const hasPackages = getActivePackages().length > 0;
  const packages = readPackages().filter(packageItem => packageItem.status !== 'archived');
  const allRows = getSubscriptionRows();
  return `
    <div class="hotels-page subscriptions-page owner-page-v2 owner-subscriptions-central-page" data-ui-page="platform-owner-subscriptions" data-ui-centralized="phase111-platform-owner-packages-subscriptions-requests">
      ${poOwnerPageHeader({
        iconName: 'shieldCheck',
        kicker: t('owner.subscriptions.kicker', 'دورة حياة اشتراكات الفنادق'),
        title: t('page.subscriptions'),
        subtitle: t('owner.subscriptions.subtitle', 'متابعة حالة كل اشتراك، المدة المتبقية، الدفع، والتجديد من مركز واحد.'),
        actions: poOwnerCentralButton({ label: t('subscription.actions.add'), iconName: 'shieldCheck', tone: 'primary', className: 'btn primary small', attrs: { id: 'addSubscriptionBtn' }, disabled: !(hasHotels && hasPackages), component: 'owner-subscriptions-add-action' }),
        component: 'owner-subscriptions-page-head',
        metrics: [
          { label: t('subscription.filters.all', 'الكل'), value: poFormatNumber(allRows.length), tone: 'primary' },
          { label: t('subscription.status.active', 'فعال'), value: poFormatNumber(allRows.filter(row => row.status === 'active').length), tone: 'success' },
          { label: t('subscription.status.trial', 'تجريبي'), value: poFormatNumber(allRows.filter(row => row.status === 'trial').length), tone: 'warning' },
          { label: t('subscription.status.expired', 'منتهي'), value: poFormatNumber(allRows.filter(row => row.status === 'expired').length), tone: 'danger' }
        ]
      })}
      ${poOwnerFilterBar(`
        ${poOwnerFilterField({ label: t('subscription.filters.search'), iconName: 'search', id: 'subscriptionSearch', value: state.subscriptionFilters.search, component: 'owner-subscriptions-filter-field' })}
        ${poOwnerFilterField({ label: t('subscription.filters.status'), iconName: 'shieldCheck', id: 'subscriptionStatusFilter', value: state.subscriptionFilters.status, component: 'owner-subscriptions-filter-field', options: [
          { value: 'all', label: t('subscription.filters.all') },
          { value: 'trial', label: t('subscription.status.trial') },
          { value: 'active', label: t('subscription.status.active') },
          { value: 'expired', label: t('subscription.status.expired') },
          { value: 'suspended', label: t('subscription.status.suspended') },
          { value: 'not_set', label: t('subscription.status.not_set') }
        ] })}
        ${poOwnerFilterField({ label: t('subscription.filters.plan'), iconName: 'package', id: 'subscriptionPlanFilter', value: state.subscriptionFilters.plan, component: 'owner-subscriptions-filter-field', options: [
          { value: 'all', label: t('subscription.filters.all') },
          ...packages.map(packageItem => ({ value: packageItem.id, label: packageItem.name })),
          { value: 'not_set', label: t('subscription.plan.not_set') }
        ] })}
      `, 'owner-subscriptions-filter-panel', 'owner-subscriptions-filter-grid', 'owner-subscriptions-filter-surface')}
      <div id="subscriptionsTableSlot" data-ui-component="owner-subscriptions-table-slot">${renderSubscriptionsTable(rows)}</div>
      ${renderSubscriptionModal()}
    </div>
  `;
}

function renderOwnerSubscriptionRequestCard(request) {
  return poOwnerSubscriptionRequestCard(request);
}

function renderOwnerSubscriptionRequestsPanel() {
  const requests = getPlatformSubscriptionRequests();
  const selected = state.platformOwnerRequestStatusFilter || 'all';
  const visible = selected === 'all' ? requests : requests.filter(request => (request.status || 'pending') === selected);
  const summary = getPlatformSubscriptionRequestsSummary();
  const filters = [
    ['all', t('subscription.filters.all', 'الكل'), summary.total],
    ['pending', t('subscription.requests.pending', 'قيد الانتظار'), summary.pending],
    ['approved', t('subscription.status.active', 'تمت الموافقة'), summary.approved],
    ['rejected', t('subscription.requests.rejected', 'مرفوضة'), summary.rejected]
  ];
  const filtersHtml = `
    <div class="owner-request-filter-pills" data-ui-component="owner-request-filter-pills">
      ${filters.map(([value, label, count]) => poOwnerRequestFilterPill({ value, label, count, selected: selected === value })).join('')}
    </div>
  `;
  const cardsHtml = visible.length ? `
    <div class="platform-owner-cards-grid platform-owner-request-cards owner-request-cards-v2" data-ui-component="owner-requests-cards-grid">
      ${visible.map(renderOwnerSubscriptionRequestCard).join('')}
    </div>
  ` : '';
  const emptyHtml = visible.length ? '' : poOwnerEmptyState(t('subscription.requests.emptyTitle', 'لا توجد طلبات اشتراك واردة'), t('subscription.requests.emptyText', 'عندما يطلب مدير الفندق تغيير الباقة أو التجديد ستظهر الطلبات هنا مباشرة.'), 'owner-requests-empty-state');
  return poOwnerRequestsPanelSurface({ summary, filtersHtml, cardsHtml, emptyHtml });
}

function renderPlatformSubscriptionRequestsPage() {
  const summary = getPlatformSubscriptionRequestsSummary();
  return `
    <div class="hotels-page platform-subscription-requests-page owner-page-v2 owner-subscription-requests-central-page" data-ui-page="platform-owner-subscription-requests" data-ui-centralized="phase111-platform-owner-packages-subscriptions-requests">
      ${poOwnerPageHeader({
        iconName: 'receipt',
        kicker: t('owner.requests.kicker', 'صندوق معاملات مستقل'),
        title: t('page.subscription_requests', 'طلبات الاشتراك'),
        subtitle: t('subscription.requests.pageHint', 'صندوق مستقل لمراجعة طلبات التجديد أو تغيير الباقة القادمة من الفنادق بعيدًا عن تعريف الباقات.'),
        actions: poOwnerActionButton({ label: t('page.subscriptions', 'الاشتراكات'), iconName: 'shieldCheck', page: 'subscriptions', className: 'btn ghost small', component: 'owner-requests-subscriptions-action' }),
        component: 'owner-requests-page-head',
        metrics: [
          { label: t('subscription.requests.pending', 'قيد الانتظار'), value: poFormatNumber(summary.pending), tone: 'warning' },
          { label: t('subscription.status.active', 'تمت الموافقة'), value: poFormatNumber(summary.approved), tone: 'success' },
          { label: t('subscription.requests.rejected', 'مرفوضة'), value: poFormatNumber(summary.rejected), tone: 'danger' }
        ]
      })}
      ${renderOwnerSubscriptionRequestsPanel()}
    </div>
  `;
}

function renderHotelViewModal(hotel) {
  if (!hotel) return '';
  const subscription = poSubscriptionForHotel(hotel.id);
  const packageItem = subscription ? getPackageById(subscription.packageId || subscription.plan) : null;
  const health = poHotelHealth(hotel);
  const counts = poHotelCounts(hotel.id);
  const location = [hotel.country, hotel.city].filter(Boolean).join(' / ') || '-';
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card owner-hotel-profile-modal">
        <div class="modal-head owner-modal-head-v2">
          <div>
            <span class="owner-workspace-kicker">${icon('building')}${h(t('owner.hotel.profileKicker', 'ملف عميل المنصة'))}</span>
            <h2>${h(hotel.name || t('hotel.modal.viewTitle'))}</h2>
            <p>${h(location)}</p>
          </div>
          <button class="icon-btn" type="button" data-action="close-modal">${icon('x')}</button>
        </div>

        <div class="owner-profile-hero">
          <div class="owner-profile-main-card owner-profile-main-card--${h(health.status)}">
            <div class="platform-owner-identity">
              <div class="platform-owner-card-icon">${icon('building')}</div>
              <div>
                <span>${h(t('owner.hotel.health', 'حالة العميل'))}</span>
                <h3>${h(health.label)}</h3>
                <p>${h(subscription ? `${getSubscriptionPlanLabel(subscription.packageId || subscription.plan)} • ${getSubscriptionRemainingLabel(subscription)}` : t('subscription.status.not_set', 'الاشتراك غير مضبوط'))}</p>
              </div>
            </div>
            ${poStatusBadge(health.status, health.label)}
          </div>
          <div class="owner-profile-stat"><span>${h(t('owner.hotel.rooms', 'الغرف'))}</span><strong>${h(poFormatNumber(counts.rooms))}</strong></div>
          <div class="owner-profile-stat"><span>${h(t('owner.hotel.staff', 'الموظفون'))}</span><strong>${h(poFormatNumber(counts.staff))}</strong></div>
          <div class="owner-profile-stat"><span>${h(t('owner.hotel.reservations', 'الحجوزات'))}</span><strong>${h(poFormatNumber(counts.reservations))}</strong></div>
        </div>

        <div class="owner-profile-grid">
          <section class="owner-profile-panel">
            <h3>${h(t('hotel.form.hotelInfo'))}</h3>
            <div class="details-grid">
              <div class="detail-item"><span>${h(t('hotel.form.phone'))}</span><strong>${h(hotel.phone || '-')}</strong></div>
              <div class="detail-item"><span>${h(t('hotel.form.email'))}</span><strong>${h(hotel.email || hotel.managerEmail || '-')}</strong></div>
              <div class="detail-item"><span>${h(t('hotel.columns.createdAt'))}</span><strong>${h(hotel.createdAt || '-')}</strong></div>
              <div class="detail-item"><span>${h(t('hotel.details.updatedAt'))}</span><strong>${h(hotel.updatedAt || '-')}</strong></div>
            </div>
          </section>
          <section class="owner-profile-panel">
            <h3>${h(t('hotel.form.managerInfo'))}</h3>
            <div class="platform-owner-manager-strip owner-profile-manager">
              ${renderPersonAvatar(hotel.managerPhotoDataUrl || '', hotel.managerName || hotel.name || '', 'manager-table-avatar')}
              <div><span>${h(t('hotel.columns.manager'))}</span><strong>${h(hotel.managerName || '-')}</strong><small>${h(hotel.managerEmail || hotel.email || '-')}</small></div>
            </div>
          </section>
          <section class="owner-profile-panel owner-profile-panel--wide">
            <h3>${h(t('page.subscriptions'))}</h3>
            <div class="details-grid">
              <div class="detail-item"><span>${h(t('subscription.form.plan'))}</span><strong>${h(packageItem?.name || subscription?.packageName || getSubscriptionPlanLabel(subscription?.packageId || subscription?.plan) || '-')}</strong></div>
              <div class="detail-item"><span>${h(t('subscription.form.status'))}</span><strong>${h(subscription ? getSubscriptionStatusLabel(getSubscriptionStatus(subscription)) : getSubscriptionStatusLabel('not_set'))}</strong></div>
              <div class="detail-item"><span>${h(t('subscription.form.startDate'))}</span><strong>${h(subscription?.startDate || '-')}</strong></div>
              <div class="detail-item"><span>${h(t('subscription.form.endDate'))}</span><strong>${h(subscription?.endDate || '-')}</strong></div>
              <div class="detail-item"><span>${h(t('subscription.form.monthlyAmount'))}</span><strong>${h(formatSubscriptionPrice(subscription))}</strong></div>
              <div class="detail-item"><span>${h(t('subscription.form.paymentStatus'))}</span><strong>${h(subscription ? getPaymentStatusLabel(subscription.paymentStatus || 'unpaid') : '-')}</strong></div>
            </div>
          </section>
        </div>

        <div class="modal-actions owner-profile-actions">
          <button class="btn ghost" type="button" data-action="edit-hotel" data-id="${h(hotel.id)}">${icon('settings')}${h(t('hotel.actions.edit'))}</button>
          <button class="btn ghost" type="button" data-action="manager-hotel" data-id="${h(hotel.id)}">${icon('user')}${h(t('hotel.actions.manager'))}</button>
          <button class="btn primary" type="button" data-owner-modal="edit-subscription" data-id="${h(hotel.id)}">${icon('shieldCheck')}${h(t('subscription.actions.setup'))}</button>
          <button class="btn ghost" type="button" data-action="close-modal">${h(t('common.close'))}</button>
        </div>
      </div>
    </div>
  `;
}

function bindPlatformOwnerExecutiveDelegation() {
  if (window.__fandqiPlatformOwnerExecutiveDelegationBound) return;
  window.__fandqiPlatformOwnerExecutiveDelegationBound = true;
  document.addEventListener('click', event => {
    const filterButton = event.target?.closest?.('[data-owner-request-filter]');
    if (filterButton) {
      event.preventDefault();
      state.platformOwnerRequestStatusFilter = filterButton.dataset.ownerRequestFilter || 'all';
      writeStorageText(PLATFORM_OWNER_REQUEST_FILTER_KEY, state.platformOwnerRequestStatusFilter);
      render();
      return;
    }

    const pageButton = event.target?.closest?.('[data-owner-page]');
    if (pageButton) {
      event.preventDefault();
      applyDashboardFilter(pageButton.dataset.dashboardFilter || '');
      setActivePage(pageButton.dataset.ownerPage || 'dashboard');
      return;
    }

    const ownerModalButton = event.target?.closest?.('[data-owner-modal]');
    if (ownerModalButton) {
      event.preventDefault();
      const modal = ownerModalButton.dataset.ownerModal;
      const id = ownerModalButton.dataset.id || null;
      if (modal === 'edit-subscription') {
        state.activePage = 'subscriptions';
        state.subscriptionModal = { mode: 'edit', hotelId: id };
        writeStorageText('fandqi.activePage', state.activePage);
        render();
      }
      return;
    }

    const actionButton = event.target?.closest?.('[data-owner-action]');
    if (actionButton) {
      event.preventDefault();
      const action = actionButton.dataset.ownerAction;
      if (action === 'add_hotel') {
        state.activePage = 'hotels';
        state.hotelModal = { mode: 'add', id: null };
        writeStorageText('fandqi.activePage', state.activePage);
        render();
      }
      if (action === 'add_package') {
        state.activePage = 'packages';
        state.packageModal = { mode: 'add', id: null };
        writeStorageText('fandqi.activePage', state.activePage);
        render();
      }
      if (action === 'add_subscription') {
        state.activePage = 'subscriptions';
        state.subscriptionModal = { mode: 'edit', hotelId: null };
        writeStorageText('fandqi.activePage', state.activePage);
        render();
      }
    }
  });
}

bindPlatformOwnerExecutiveDelegation();
