// Fandqi Modular Refactor — Hotel subscription plan, workspace, login, shell, global event binding, render, and init.
const MANAGER_SUBSCRIPTION_REQUESTS_STORAGE_KEY = 'fandqi.managerSubscriptionRequests';

function readManagerSubscriptionRequests() {
  try {
    const value = readStorageJson(MANAGER_SUBSCRIPTION_REQUESTS_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeManagerSubscriptionRequests(requests) {
  writeStorageJson(MANAGER_SUBSCRIPTION_REQUESTS_STORAGE_KEY, requests);
}

function getHotelSubscriptionRow(hotelId) {
  return getSubscriptionRows().find(row => row.hotel.id === hotelId) || null;
}

function getSubscriptionRequestTypeLabel(type) {
  return t(`subscriptionPlan.requestType.${type}`, type);
}

function getSubscriptionRequestStatusLabel(status) {
  return t(`subscriptionPlan.requestStatus.${status || 'pending'}`, status || 'pending');
}

function getManagerSubscriptionRequestsForHotel(hotelId) {
  return readManagerSubscriptionRequests()
    .filter(request => request.hotelId === hotelId)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function getSubscriptionRequestTargetPackageId(row, type, packageId = '') {
  if (packageId) return packageId;
  return row?.packageItem?.id || row?.subscription?.packageId || '';
}

function hasSubscriptionRequestAlreadySent(requests, hotelId, type, packageId = '') {
  return requests.some(request => {
    const requestPackageId = request.requestedPackageId || '';
    return request.hotelId === hotelId && request.type === type && requestPackageId === packageId;
  });
}

function getSubscriptionAlreadyRequestedMessage(type) {
  if (type === 'change') {
    return t('subscriptionPlan.toast.packageRequestAlreadySent', 'تم إرسال طلب لهذه الباقة سابقًا ولا يمكن إرسال طلب آخر لنفس الباقة.');
  }
  if (type === 'renew') {
    return t('subscriptionPlan.toast.renewRequestAlreadySent', 'تم إرسال طلب تجديد سابقًا ولا يمكن إرسال طلب تجديد آخر لنفس الباقة.');
  }
  if (type === 'extend') {
    return t('subscriptionPlan.toast.extendRequestAlreadySent', 'تم إرسال طلب تمديد سابقًا ولا يمكن إرسال طلب تمديد آخر لنفس الباقة.');
  }
  return t('subscriptionPlan.toast.requestAlreadySent', 'تم إرسال هذا الطلب سابقًا ولا يمكن تكراره.');
}

function getExistingPackageChangeRequest(requests, hotelId, packageId = '') {
  if (!packageId) return null;
  return requests.find(request => request.hotelId === hotelId && request.type === 'change' && (request.requestedPackageId || '') === packageId) || null;
}


function getVisibleSubscriptionPackages(currentPackageItem = null) {
  let packages = [];

  if (typeof readPackages === 'function') {
    try {
      packages = readPackages();
    } catch {
      packages = [];
    }
  }

  if (!packages.length) {
    try {
      const stored = readStorageJson('fandqi.subscriptionPackages', []);
      packages = Array.isArray(stored) ? stored : [];
    } catch {
      packages = [];
    }
  }

  packages = packages.filter(plan => plan && (plan.status || 'active') !== 'archived');

  if (currentPackageItem?.id && !packages.some(plan => plan.id === currentPackageItem.id)) {
    packages = [currentPackageItem, ...packages];
  }

  const seen = new Set();
  return packages
    .filter(plan => {
      const key = plan.id || plan.name || JSON.stringify(plan);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aCurrent = currentPackageItem?.id && a.id === currentPackageItem.id ? 0 : 1;
      const bCurrent = currentPackageItem?.id && b.id === currentPackageItem.id ? 0 : 1;
      const aActive = (a.status || 'active') === 'active' ? 0 : 1;
      const bActive = (b.status || 'active') === 'active' ? 0 : 1;
      return aCurrent - bCurrent || aActive - bActive || String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
}

const SUBSCRIPTION_RENEWAL_WINDOW_DAYS = 3;

function getSubscriptionRenewalGate(row) {
  const subscription = row?.subscription || null;
  const status = row?.status || subscription?.status || 'not_set';
  const remainingDays = subscription ? getSubscriptionRemainingDays(subscription) : null;
  const isActive = status === 'active';
  const isRenewalTypeAllowed = !isActive || (typeof remainingDays === 'number' && remainingDays >= 0 && remainingDays <= SUBSCRIPTION_RENEWAL_WINDOW_DAYS);
  const opensInDays = typeof remainingDays === 'number' ? Math.max(0, remainingDays - SUBSCRIPTION_RENEWAL_WINDOW_DAYS) : null;
  return {
    status,
    remainingDays,
    isActive,
    canRequestRenewal: isRenewalTypeAllowed,
    opensInDays,
    windowDays: SUBSCRIPTION_RENEWAL_WINDOW_DAYS
  };
}

function getSubscriptionRenewalLockedMessage(gate) {
  const days = gate?.windowDays || SUBSCRIPTION_RENEWAL_WINDOW_DAYS;
  if (typeof gate?.opensInDays === 'number' && gate.opensInDays > 0) {
    return t(
      'subscriptionPlan.toast.renewalLockedWithDays',
      `لا يمكن طلب التجديد أو التمديد الآن لأن حسابك ما زال فعالًا. يتفعل الطلب قبل ${days} أيام من انتهاء الاشتراك. يمكنك تغيير الباقة في أي وقت.`
    );
  }
  return t(
    'subscriptionPlan.toast.renewalLocked',
    `لا يمكن طلب التجديد أو التمديد الآن لأن حسابك ما زال فعالًا. يتفعل الطلب قبل ${days} أيام من انتهاء الاشتراك فقط. يمكنك تغيير الباقة في أي وقت.`
  );
}

function isSubscriptionRenewalRequestType(type) {
  return ['extend', 'renew'].includes(type);
}

function createManagerSubscriptionRequest(type, packageId = '') {
  const hotel = getManagerHotel();
  if (!hotel) return;
  const row = getHotelSubscriptionRow(hotel.id);
  const renewalGate = getSubscriptionRenewalGate(row);
  if (isSubscriptionRenewalRequestType(type) && !renewalGate.canRequestRenewal) {
    toast(getSubscriptionRenewalLockedMessage(renewalGate));
    return;
  }
  const targetPackageId = getSubscriptionRequestTargetPackageId(row, type, packageId);
  const packageItem = targetPackageId ? getPackageById(targetPackageId) : row?.packageItem;
  const requests = readManagerSubscriptionRequests();
  if (hasSubscriptionRequestAlreadySent(requests, hotel.id, type, targetPackageId)) {
    toast(getSubscriptionAlreadyRequestedMessage(type));
    return;
  }
  requests.unshift({
    id: createId('subscription-request'),
    hotelId: hotel.id,
    hotelName: hotel.name || '',
    managerName: hotel.managerName || state.currentUser?.name || '',
    type,
    requestedPackageId: targetPackageId,
    requestedPackageName: packageItem?.name || row?.packageItem?.name || row?.subscription?.packageName || '',
    currentPackageId: row?.packageItem?.id || row?.subscription?.packageId || '',
    currentPackageName: row?.packageItem?.name || row?.subscription?.packageName || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    note: ''
  });
  writeManagerSubscriptionRequests(requests);
  toast(t('subscriptionPlan.toast.requestSent', 'تم إرسال الطلب لصاحب المنصة'));
  render();
}

function getSubscriptionPlanSummaryCards(row, packageItem, subscription, requests) {
  const status = row?.status || 'not_set';
  const remainingDays = subscription ? getSubscriptionRemainingDays(subscription) : null;
  const remainingValue = remainingDays === null ? '-' : String(remainingDays);
  return [
    { iconName: 'shieldCheck', title: t('subscriptionPlan.cards.status', 'حالة الاشتراك'), value: getSubscriptionStatusLabel(status), note: t('subscriptionPlan.cards.statusNote', 'حالة الباقة الحالية') },
    { iconName: 'package', title: t('subscriptionPlan.cards.package', 'الباقة المفعلة'), value: packageItem?.name || t('subscription.plan.not_set'), note: packageItem?.description || t('subscriptionPlan.cards.packageNote', 'لم يتم اختيار باقة بعد') },
    { iconName: 'clock', title: t('subscriptionPlan.cards.remaining', 'الأيام المتبقية'), value: remainingValue, note: subscription?.endDate || t('subscriptionPlan.cards.noEndDate', 'لا يوجد تاريخ انتهاء') },
    { iconName: 'receipt', title: t('subscriptionPlan.cards.requests', 'طلباتك'), value: String(requests.length), note: t('subscriptionPlan.cards.requestsNote', 'طلبات تمديد أو تغيير أو تجديد') }
  ];
}

function renderSubscriptionFeatureItem(label, value) {
  return `<div class="subscription-feature-item">${icon(value === 'yes' ? 'checkCircle' : 'x')}<span>${h(label)}</span><strong>${h(getPackageBooleanLabel(value))}</strong></div>`;
}

function subscriptionUi() {
  return window.FandqiUI || null;
}

function renderSubscriptionAttrs(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${h(name)}` : ` ${h(name)}="${h(value)}"`)
    .join('');
}

function renderSubscriptionButton({ label = '', tone = 'primary', iconName = '', size = '', className = '', attrs = {}, disabled = false } = {}) {
  const ui = subscriptionUi();
  const iconHtml = iconName ? icon(iconName) : '';
  if (ui?.renderButton) {
    return ui.renderButton({ label, tone, size, icon: iconHtml, className, disabled, attrs });
  }
  return `<button class="btn ${h(tone)} ${h(size)} ${h(className)}" type="button"${renderSubscriptionAttrs({ disabled, ...attrs })}>${iconHtml}${h(label)}</button>`;
}

function renderSubscriptionBadge(status, label, className = '', attrs = {}) {
  const ui = subscriptionUi();
  if (ui?.renderBadge) return ui.renderBadge({ status, label, className, attrs });
  return `<span class="status-badge ${h(status)} ${h(className)}" data-status="${h(status)}"${renderSubscriptionAttrs(attrs)}>${h(label)}</span>`;
}

function renderSubscriptionEmptyState(title, text, className = '', options = {}) {
  const ui = subscriptionUi();
  const component = options.component || 'subscription-empty-state';
  const iconHtml = options.iconName ? icon(options.iconName) : '';
  const attrs = { 'data-ui-component': component, ...(options.attrs || {}) };
  if (ui?.renderEmptyState) return ui.renderEmptyState({
    title,
    text,
    icon: iconHtml,
    className: ['subscription-empty-state', className].filter(Boolean).join(' '),
    attrs
  });
  return `<div class="empty-panel subscription-empty-state ${h(className)}"${renderSubscriptionAttrs(attrs)}><div>${iconHtml}<h2>${h(title)}</h2><p>${h(text)}</p></div></div>`;
}

function renderSubscriptionPageHead({ title, text = '', packagesCount = 0, requestsCount = 0 } = {}) {
  const ui = subscriptionUi();
  const actions = `
    <div class="subscription-page-head-stats" data-ui-component="subscription-head-stats">
      <span>${icon('package')}<b>${h(String(packagesCount))}</b><small>${h(t('subscriptionPlan.head.packagesCount', 'باقة'))}</small></span>
      <span>${icon('receipt')}<b>${h(String(requestsCount))}</b><small>${h(t('subscriptionPlan.head.requestsCount', 'طلب'))}</small></span>
    </div>
  `;
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title,
      text,
      actions,
      className: 'subscription-central-head',
      attrs: { 'data-ui-component': 'subscription-page-head' }
    });
  }
  return `<div class="section-head subscription-central-head" data-ui-component="subscription-page-head"><div><h2>${h(title)}</h2>${text ? `<p class="helper">${h(text)}</p>` : ''}</div>${actions}</div>`;
}

function renderSubscriptionSurface({ title = '', count = '', iconName = '', body = '', className = '', component = 'subscription-surface', tag = 'section', attrs = {} } = {}) {
  const ui = subscriptionUi();
  const head = title ? `<div class="subscription-panel-head" data-ui-component="subscription-panel-head"><h3>${iconName ? icon(iconName) : ''}${h(title)}</h3>${count !== '' ? renderSubscriptionBadge('info', String(count), 'subscription-panel-counter') : ''}</div>` : '';
  const finalAttrs = { 'data-ui-component': component, ...attrs };
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag,
      head,
      body,
      className: ['subscription-central-surface', className].filter(Boolean).join(' '),
      attrs: finalAttrs
    });
  }
  return `<${tag} class="ds-card ds-surface subscription-central-surface ${h(className)}"${renderSubscriptionAttrs(finalAttrs)}>${head}${body}</${tag}>`;
}

function renderSubscriptionPackageMeta(plan) {
  const meta = [
    { iconName: 'clock', label: t('package.form.durationDays'), value: `${plan.durationDays || '-'} ${t('package.units.days')}` },
    { iconName: 'users', label: t('package.form.maxUsers'), value: plan.maxUsers || '-' },
    { iconName: 'building', label: t('package.form.maxRooms'), value: plan.maxRooms || '-' }
  ];
  return `<div class="subscription-platform-package-meta" data-ui-component="subscription-package-meta">${meta.map(item => `
    <span>${icon(item.iconName)}<b>${h(item.label)}</b><em>${h(item.value)}</em></span>
  `).join('')}</div>`;
}

function renderSubscriptionPackageFeatures(plan) {
  const features = [
    { iconName: plan.restaurantSupport === 'yes' ? 'checkCircle' : 'x', label: t('package.form.restaurantSupport') },
    { iconName: plan.reportsSupport === 'yes' ? 'checkCircle' : 'x', label: t('package.form.reportsSupport') },
    { iconName: plan.trialSupport === 'yes' ? 'checkCircle' : 'x', label: t('package.form.trialSupport') }
  ];
  return `<div class="subscription-platform-package-features" data-ui-component="subscription-package-features">${features.map(item => `
    <span>${icon(item.iconName)}${h(item.label)}</span>
  `).join('')}</div>`;
}

function renderSubscriptionPackageCard(plan, { currentPackage = null, subscription = null, subscriptionRequests = [], hotel = null } = {}) {
  const isCurrent = Boolean(
    (currentPackage?.id && plan.id === currentPackage.id) ||
    (subscription?.packageId && plan.id === subscription.packageId) ||
    (subscription?.packageName && plan.name === subscription.packageName)
  );
  const packageStatus = plan.status || 'active';
  const existingChangeRequest = getExistingPackageChangeRequest(subscriptionRequests, hotel.id, plan.id || '');
  const canRequest = packageStatus === 'active' && !isCurrent && !existingChangeRequest;
  const actionButton = renderSubscriptionButton({
    label: isCurrent
      ? t('subscriptionPlan.currentBadge', 'الباقة الحالية')
      : (existingChangeRequest
        ? t('subscriptionPlan.actions.requestSent', 'تم إرسال الطلب')
        : (canRequest ? t('subscriptionPlan.actions.requestThisPackage', 'طلب هذه الباقة') : t('subscriptionPlan.packageUnavailable', 'غير متاحة حاليًا'))),
    tone: isCurrent || existingChangeRequest ? 'neutral' : (canRequest ? 'accent' : 'neutral'),
    size: 'small',
    className: 'subscription-package-action-btn',
    iconName: isCurrent ? 'shieldCheck' : (existingChangeRequest ? 'checkCircle' : (canRequest ? 'package' : 'lock')),
    disabled: !canRequest,
    attrs: { 'data-ui-component': 'subscription-package-action', ...(canRequest ? { 'data-subscription-plan-request': 'change', 'data-package-id': plan.id || '' } : {}) }
  });

  const statusBadge = renderSubscriptionBadge(
    isCurrent ? 'success' : (existingChangeRequest ? 'pending' : packageStatus),
    isCurrent ? t('subscriptionPlan.currentBadge', 'الباقة الحالية') : (existingChangeRequest ? t('subscriptionPlan.requestStatus.pending', 'قيد الانتظار') : getPackageStatusLabel(packageStatus)),
    'subscription-platform-package-badge',
    { 'data-ui-component': 'subscription-package-badge' }
  );

  const body = `
    <div class="subscription-platform-package-card-head" data-ui-component="subscription-package-card-head">
      ${statusBadge}
      <div class="subscription-platform-package-icon" data-ui-component="subscription-package-icon">${icon('package')}</div>
    </div>
    <div class="subscription-platform-package-body" data-ui-component="subscription-package-body">
      <h3>${h(plan.name || '-')}</h3>
      ${plan.description ? `<p>${h(plan.description)}</p>` : `<p>${h(t('subscriptionPlan.packageManagedByPlatform', 'باقة تشغيلية معتمدة من صاحب المنصة.'))}</p>`}
      <strong>${h(formatPackagePrice(plan))}</strong>
    </div>
    ${renderSubscriptionPackageMeta(plan)}
    ${renderSubscriptionPackageFeatures(plan)}
    ${actionButton}
  `;

  return renderSubscriptionSurface({
    tag: 'article',
    body,
    className: `subscription-platform-package-card ${isCurrent ? 'is-current' : ''} ${existingChangeRequest ? 'is-requested' : ''} ${packageStatus !== 'active' ? 'is-muted' : ''}`,
    component: 'subscription-package-card',
    attrs: { 'data-layout-fixed': 'platform-package-offer-card' }
  });
}

function renderSubscriptionDetailItem(label, value, iconName = '') {
  return `<div class="subscription-active-detail" data-ui-component="subscription-active-detail">${iconName ? icon(iconName) : ''}<span>${h(label)}</span><strong>${h(value || '-')}</strong></div>`;
}

function renderSubscriptionActiveFeatures(currentPackage, subscription) {
  const features = [
    { iconName: currentPackage?.restaurantSupport === 'yes' ? 'checkCircle' : 'x', label: `${t('package.form.restaurantSupport')}: ${getPackageBooleanLabel(currentPackage?.restaurantSupport || 'no')}` },
    { iconName: currentPackage?.reportsSupport === 'yes' ? 'checkCircle' : 'x', label: `${t('package.form.reportsSupport')}: ${getPackageBooleanLabel(currentPackage?.reportsSupport || 'no')}` },
    { iconName: currentPackage?.trialSupport === 'yes' ? 'checkCircle' : 'x', label: `${t('package.form.trialSupport')}: ${getPackageBooleanLabel(currentPackage?.trialSupport || 'no')}` },
    { iconName: 'users', label: `${t('package.form.maxUsers')}: ${currentPackage?.maxUsers || '-'}` },
    { iconName: 'building', label: `${t('package.form.maxRooms')}: ${currentPackage?.maxRooms || '-'}` },
    { iconName: 'clock', label: `${t('package.form.durationDays')}: ${currentPackage?.durationDays || subscription?.durationDays || '-'} ${t('package.units.days')}` }
  ];
  return `<div class="subscription-active-package-features" data-ui-component="subscription-active-package-features">${features.map(item => `
    <span>${icon(item.iconName)}${h(item.label)}</span>
  `).join('')}</div>`;
}

function renderSubscriptionRenewalWarning(renewalGate, hasRenewRequest) {
  if (!(renewalGate.isActive && typeof renewalGate.remainingDays === 'number' && renewalGate.remainingDays >= 0 && renewalGate.remainingDays <= SUBSCRIPTION_RENEWAL_WINDOW_DAYS)) {
    return '';
  }
  return `
    <div class="subscription-renew-now-alert ${hasRenewRequest ? 'is-requested' : ''}" data-layout-fixed="renewal-warning-three-days" data-ui-component="subscription-renewal-warning">
      <div>
        <strong>${h(t('subscriptionPlan.renewalWarning.title', `باقي ${renewalGate.remainingDays} أيام لانتهاء الباقة`))}</strong>
        <p>${h(t('subscriptionPlan.renewalWarning.text', 'يمكنك إرسال طلب تجديد الآن قبل انتهاء الاشتراك.'))}</p>
      </div>
      ${renderSubscriptionButton({
        label: hasRenewRequest ? t('subscriptionPlan.actions.renewRequestSent', 'تم إرسال طلب التجديد') : t('subscriptionPlan.actions.renewNow', 'تجديد الآن'),
        tone: hasRenewRequest ? 'neutral' : 'warning',
        iconName: hasRenewRequest ? 'checkCircle' : 'refreshCw',
        size: 'small',
        disabled: hasRenewRequest,
        attrs: { 'data-ui-component': 'subscription-renewal-action', ...(hasRenewRequest ? {} : { 'data-subscription-plan-request': 'renew' }) }
      })}
    </div>
  `;
}

function renderSubscriptionActivePackagePanel({ row = null, currentPackage = null, subscription = null, renewalGate = {}, hasRenewRequest = false } = {}) {
  if (!currentPackage && !subscription) return '';
  const status = row?.status || subscription?.status || 'not_set';
  const body = `
    <div class="subscription-active-package-head" data-ui-component="subscription-active-package-head">
      <div>
        <span>${h(t('subscriptionPlan.activePackage', 'الباقة المفعلة'))}</span>
        <h3>${h(currentPackage?.name || subscription?.packageName || t('subscription.plan.not_set'))}</h3>
      </div>
      ${renderSubscriptionBadge(status, getSubscriptionStatusLabel(status), 'subscription-active-package-status', { 'data-ui-component': 'subscription-active-status' })}
    </div>
    ${renderSubscriptionRenewalWarning(renewalGate, hasRenewRequest)}
    <div class="subscription-active-package-details" data-ui-component="subscription-active-package-details">
      ${renderSubscriptionDetailItem(t('subscription.form.startDate'), subscription?.startDate || '-', 'calendar')}
      ${renderSubscriptionDetailItem(t('subscription.form.endDate'), subscription?.endDate || '-', 'clock')}
      ${renderSubscriptionDetailItem(t('subscription.form.price'), formatSubscriptionPrice(subscription) || formatPackagePrice(currentPackage), 'currency')}
      ${renderSubscriptionDetailItem(t('subscription.form.paymentStatus'), getPaymentStatusLabel(subscription?.paymentStatus || 'unpaid'), 'creditCard')}
    </div>
    ${renderSubscriptionActiveFeatures(currentPackage, subscription)}
  `;
  return renderSubscriptionSurface({
    title: '',
    body,
    className: 'subscription-active-package-panel',
    component: 'subscription-active-package-panel',
    attrs: { 'data-layout-fixed': 'active-package-details-under-cards' }
  });
}

function renderSubscriptionRequestsTable(subscriptionRequests) {
  const ui = subscriptionUi();
  const requestRows = subscriptionRequests.map(request => ({
    type: `<strong>${h(getSubscriptionRequestTypeLabel(request.type))}</strong>`,
    requestedPackage: h(request.requestedPackageName || '-'),
    currentPackage: h(request.currentPackageName || '-'),
    status: renderSubscriptionBadge(request.status || 'pending', getSubscriptionRequestStatusLabel(request.status || 'pending'), 'subscription-request-table-badge', { 'data-ui-component': 'subscription-request-status' }),
    createdAt: h(formatDateTime(request.createdAt))
  }));
  const columns = [
    { key: 'type', label: t('subscriptionPlan.requestsTable.type', 'نوع الطلب'), html: true },
    { key: 'requestedPackage', label: t('subscriptionPlan.requestsTable.requestedPackage', 'الباقة المطلوبة'), html: true },
    { key: 'currentPackage', label: t('subscriptionPlan.requestsTable.currentPackage', 'الباقة الحالية'), html: true },
    { key: 'status', label: t('subscriptionPlan.requestsTable.status', 'الحالة'), html: true },
    { key: 'createdAt', label: t('subscriptionPlan.requestsTable.createdAt', 'تاريخ الطلب'), html: true }
  ];
  if (ui?.renderTable) {
    return `<div class="subscription-requests-table-scroll" data-ui-component="subscription-requests-table-scroll">${ui.renderTable({ columns, rows: requestRows, className: 'subscription-requests-table' })}</div>`;
  }
  return `
    <div class="subscription-requests-table-scroll" data-ui-component="subscription-requests-table-scroll">
      <table class="data-table ds-table subscription-requests-table">
        <thead><tr>${columns.map(column => `<th>${h(column.label)}</th>`).join('')}</tr></thead>
        <tbody>${requestRows.map(row => `<tr>${columns.map(column => `<td>${row[column.key]}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  `;
}

function renderSubscriptionRequestsPanel(subscriptionRequests) {
  const body = subscriptionRequests.length
    ? renderSubscriptionRequestsTable(subscriptionRequests)
    : renderSubscriptionEmptyState(
      t('subscriptionPlan.noRequestsTitle', 'لا توجد طلبات بعد'),
      t('subscriptionPlan.noRequestsText', 'طلبات تغيير الباقة أو التمديد ستظهر هنا بعد إرسالها.'),
      'subscription-requests-empty',
      { component: 'subscription-requests-empty', iconName: 'receipt' }
    );
  return renderSubscriptionSurface({
    title: t('subscriptionPlan.requestsTitle', 'طلبات الاشتراك'),
    count: subscriptionRequests.length,
    iconName: 'receipt',
    body: `<p class="subscription-panel-note" data-ui-component="subscription-requests-hint">${h(t('subscriptionPlan.requestsHint', 'طلبات تغيير الباقة أو التمديد تظهر هنا'))}</p>${body}`,
    className: 'subscription-requests-table-panel',
    component: 'subscription-requests-table-panel',
    attrs: { 'data-layout-fixed': 'subscription-change-extend-requests-table' }
  });
}

function renderSubscriptionSummaryCard(card) {
  return `
    <article class="summary-card subscription-plan-summary-card">
      <div class="summary-icon">${icon(card.iconName)}</div>
      <div class="summary-body">
        <h3>${h(card.title)}</h3>
        <strong>${h(card.value)}</strong>
        <small>${h(card.note)}</small>
      </div>
    </article>
  `;
}

function renderHotelSubscriptionPlanPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();

  const row = getHotelSubscriptionRow(hotel.id);
  const subscription = row?.subscription || null;
  const currentPackage = row?.packageItem || null;
  const platformPackages = getVisibleSubscriptionPackages(currentPackage);
  const subscriptionRequests = getManagerSubscriptionRequestsForHotel(hotel.id);
  const renewalGate = getSubscriptionRenewalGate(row);
  const canShowRenewalWarning = renewalGate.isActive && typeof renewalGate.remainingDays === 'number' && renewalGate.remainingDays >= 0 && renewalGate.remainingDays <= SUBSCRIPTION_RENEWAL_WINDOW_DAYS;
  const currentPackageId = currentPackage?.id || subscription?.packageId || '';
  const hasRenewRequest = hasSubscriptionRequestAlreadySent(subscriptionRequests, hotel.id, 'renew', currentPackageId);

  const packageCards = platformPackages.length ? platformPackages.map(plan => renderSubscriptionPackageCard(plan, {
    currentPackage,
    subscription,
    subscriptionRequests,
    hotel
  })).join('') : `
    <div class="subscription-platform-packages-empty" data-layout-fixed="platform-packages-empty-state" data-ui-component="subscription-packages-empty">
      ${renderSubscriptionEmptyState(
        t('subscriptionPlan.noPackagesTitle', 'لا توجد باقات اشتراك بعد'),
        t('subscriptionPlan.noPackagesText', 'عندما يضيف صاحب المنصة باقات اشتراك، ستظهر هنا مباشرة على شكل كروت عروض.'),
        'subscription-packages-empty-state',
        { component: 'subscription-packages-empty-state', iconName: 'package' }
      )}
    </div>
  `;

  const packagesPanel = renderSubscriptionSurface({
    body: `<div class="subscription-platform-packages-grid" data-layout-fixed="platform-owner-compact-packages-cards-grid" data-ui-component="subscription-packages-grid">${packageCards}</div>`,
    className: 'subscription-platform-packages-section subscription-central-packages-section',
    component: 'subscription-packages-section',
    attrs: { id: 'subscriptionPackagesPanel', 'data-layout-fixed': 'platform-owner-compact-packages-cards-section' }
  });

  const activePackagePanel = renderSubscriptionActivePackagePanel({
    row,
    currentPackage,
    subscription,
    renewalGate,
    hasRenewRequest
  });

  const subscriptionRequestsTable = renderSubscriptionRequestsPanel(subscriptionRequests);

  return `
    <div class="workspace-page subscription-plan-page subscription-platform-packages-page subscription-central-page" data-ui-migrated="subscription-plan" data-ui-centralized="phase107-subscription-plan" data-layout-fixed="compact-platform-package-offers-with-active-details">
      ${renderSubscriptionPageHead({
        title: t('page.subscription_plan', 'الاشتراك والباقات'),
        text: t('subscriptionPlan.description', 'تابع الباقة المفعلة على فندقك واطلب تمديد أو تجديد أو تغيير الباقة من نفس الصفحة.'),
        packagesCount: platformPackages.length,
        requestsCount: subscriptionRequests.length
      })}
      ${packagesPanel}
      ${activePackagePanel}
      ${subscriptionRequestsTable}
    </div>
  `;
}

function bindHotelSubscriptionPlanEvents() {
  document.querySelectorAll('[data-subscription-plan-request]').forEach(button => {
    button.addEventListener('click', () => createManagerSubscriptionRequest(button.dataset.subscriptionPlanRequest, button.dataset.packageId || ''));
  });
  const scrollButton = document.querySelector('[data-scroll-to-packages]');
  if (scrollButton) {
    scrollButton.addEventListener('click', () => {
      const panel = document.getElementById('subscriptionPackagesPanel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
