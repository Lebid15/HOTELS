// Fandqi Phase 78 — Platform owner incoming subscription requests inbox and approval workflow.
function readPlatformSubscriptionRequests() {
  if (typeof readManagerSubscriptionRequests === 'function') return readManagerSubscriptionRequests();
  try {
    const value = readStorageJson('fandqi.managerSubscriptionRequests', []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writePlatformSubscriptionRequests(requests) {
  if (typeof writeManagerSubscriptionRequests === 'function') return writeManagerSubscriptionRequests(requests);
  writeStorageJson('fandqi.managerSubscriptionRequests', Array.isArray(requests) ? requests : []);
}

function getPlatformSubscriptionRequests() {
  return readPlatformSubscriptionRequests()
    .filter(request => request && request.hotelId)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function getPlatformPendingSubscriptionRequests() {
  return getPlatformSubscriptionRequests().filter(request => (request.status || 'pending') === 'pending');
}

function getPlatformSubscriptionRequestsSummary() {
  const requests = getPlatformSubscriptionRequests();
  const pending = requests.filter(request => (request.status || 'pending') === 'pending');
  const latestPending = pending.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
  return {
    total: requests.length,
    pending: pending.length,
    approved: requests.filter(request => request.status === 'approved').length,
    rejected: requests.filter(request => request.status === 'rejected').length,
    latestPendingAt: latestPending?.createdAt || ''
  };
}

function getOwnerSubscriptionRequestTypeLabel(type) {
  if (typeof getSubscriptionRequestTypeLabel === 'function') return getSubscriptionRequestTypeLabel(type);
  return t(`subscriptionPlan.requestType.${type}`, type || '-');
}

function getOwnerSubscriptionRequestStatusLabel(status) {
  if (typeof getSubscriptionRequestStatusLabel === 'function') return getSubscriptionRequestStatusLabel(status || 'pending');
  return t(`subscriptionPlan.requestStatus.${status || 'pending'}`, status || '-');
}

function getOwnerSubscriptionRequestHotel(request) {
  return getHotelById(request?.hotelId) || readHotels().find(hotel => hotel.id === request?.hotelId) || null;
}

function getOwnerSubscriptionRequestPackage(request) {
  const requestedId = request?.requestedPackageId || '';
  return requestedId ? getPackageById(requestedId) : null;
}

function getOwnerSubscriptionRequestCurrentPackage(request) {
  const currentId = request?.currentPackageId || '';
  return currentId ? getPackageById(currentId) : null;
}

function getOwnerSubscriptionRequestStatusClass(status = 'pending') {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
}


function handlePlatformSubscriptionRequestAction(action, requestId) {
  if (!requestId) return;
  if (action === 'approve-subscription-request') return applySubscriptionRequestApproval(requestId, true);
  if (action === 'reject-subscription-request') return applySubscriptionRequestApproval(requestId, false);
}

function bindPlatformSubscriptionRequestActions() {
  if (window.__fandqiPlatformSubscriptionRequestActionsBound) return;
  window.__fandqiPlatformSubscriptionRequestActionsBound = true;
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('[data-action="approve-subscription-request"], [data-action="reject-subscription-request"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    handlePlatformSubscriptionRequestAction(button.dataset.action || '', button.dataset.id || '');
  }, true);
}

function renderOwnerSubscriptionRequestCard(request) {
  const hotel = getOwnerSubscriptionRequestHotel(request);
  const requestedPackage = getOwnerSubscriptionRequestPackage(request);
  const currentPackage = getOwnerSubscriptionRequestCurrentPackage(request);
  const status = request.status || 'pending';
  const isPending = status === 'pending';
  return `
    <article class="platform-owner-card platform-owner-card--subscription-request platform-owner-card--${h(status)}">
      <div class="platform-owner-card-top">
        <div class="platform-owner-identity">
          <div class="platform-owner-card-icon">${icon('receipt')}</div>
          <div>
            <span class="platform-owner-kicker">${h(getOwnerSubscriptionRequestTypeLabel(request.type))}</span>
            <h3>${h(hotel?.name || request.hotelName || '-')}</h3>
            <p>${h(request.managerName || hotel?.managerName || '-')}</p>
          </div>
        </div>
        <span class="status-badge ${h(getOwnerSubscriptionRequestStatusClass(status))}">${h(getOwnerSubscriptionRequestStatusLabel(status))}</span>
      </div>

      <div class="platform-owner-meta-grid platform-owner-request-meta">
        <div>${icon('package')}<span>${h(t('subscriptionPlan.requestsTable.requestedPackage', 'الباقة المطلوبة'))}</span><strong>${h(requestedPackage?.name || request.requestedPackageName || '-')}</strong></div>
        <div>${icon('shieldCheck')}<span>${h(t('subscriptionPlan.requestsTable.currentPackage', 'الباقة الحالية'))}</span><strong>${h(currentPackage?.name || request.currentPackageName || '-')}</strong></div>
        <div>${icon('calendar')}<span>${h(t('subscriptionPlan.requestsTable.createdAt', 'تاريخ الطلب'))}</span><strong>${h(formatDateTime(request.createdAt))}</strong></div>
        <div>${icon('clock')}<span>${h(t('subscription.columns.updatedAt'))}</span><strong>${h(request.resolvedAt ? formatDateTime(request.resolvedAt) : '-')}</strong></div>
      </div>

      <div class="platform-owner-card-actions platform-owner-card-actions--compact">
        ${isPending ? `<button class="btn small primary" type="button" data-action="approve-subscription-request" data-id="${h(request.id)}">${icon('checkCircle')}${h(t('subscription.requests.approve', 'موافقة وتفعيل'))}</button>` : ''}
        ${isPending ? `<button class="btn small danger" type="button" data-action="reject-subscription-request" data-id="${h(request.id)}">${icon('x')}${h(t('subscription.requests.reject', 'رفض'))}</button>` : ''}
        ${hotel ? `<button class="btn small ghost" type="button" data-action="edit-subscription" data-id="${h(hotel.id)}">${icon('settings')}${h(t('subscription.actions.setup'))}</button>` : ''}
      </div>
    </article>
  `;
}

function renderOwnerSubscriptionRequestsPanel() {
  const requests = getPlatformSubscriptionRequests();
  const summary = getPlatformSubscriptionRequestsSummary();
  const visible = requests;
  return `
    <section class="platform-owner-requests-panel" id="subscriptionRequestsSlot" data-platform-owner-view="subscription-requests">
      <div class="platform-owner-requests-head">
        <div>
          <span>${h(t('subscription.requests.kicker', 'متابعة صاحب المنصة'))}</span>
          <h3>${h(t('subscription.requests.title', 'طلبات الاشتراك الواردة'))}</h3>
          <p>${h(t('subscription.requests.note', 'طلبات تغيير أو تجديد أو تمديد الباقات التي يرسلها مدراء الفنادق تظهر هنا مباشرة.'))}</p>
        </div>
        <div class="platform-owner-requests-summary">
          <strong>${h(String(summary.pending))}</strong>
          <small>${h(t('subscription.requests.pending', 'قيد الانتظار'))}</small>
        </div>
      </div>
      ${visible.length ? `
        <div class="platform-owner-cards-grid platform-owner-request-cards">
          ${visible.map(renderOwnerSubscriptionRequestCard).join('')}
        </div>
      ` : `
        <div class="empty-panel hotels-empty platform-owner-requests-empty">
          <div>
            <h2>${h(t('subscription.requests.emptyTitle', 'لا توجد طلبات اشتراك واردة'))}</h2>
            <p>${h(t('subscription.requests.emptyText', 'عندما يطلب مدير الفندق تغيير الباقة أو التجديد ستظهر الطلبات هنا مباشرة.'))}</p>
          </div>
        </div>
      `}
    </section>
  `;
}


function renderPlatformSubscriptionRequestsPage() {
  const summary = getPlatformSubscriptionRequestsSummary();
  return `
    <div class="hotels-page platform-subscription-requests-page">
      <div class="section-head">
        <div>
          <h2>${h(t('page.subscription_requests', 'طلبات الاشتراك'))}</h2>
          <p class="helper">${h(t('subscription.requests.pageHint', 'صندوق مستقل لمراجعة طلبات التجديد أو تغيير الباقة القادمة من الفنادق.'))}</p>
        </div>
        <div class="platform-owner-requests-summary platform-owner-requests-summary--head">
          <strong>${h(String(summary.pending))}</strong>
          <small>${h(t('subscription.requests.pending', 'قيد الانتظار'))}</small>
        </div>
      </div>
      ${renderOwnerSubscriptionRequestsPanel()}
    </div>
  `;
}

function applySubscriptionRequestApproval(requestId, approve = true) {
  const requests = readPlatformSubscriptionRequests();
  const requestIndex = requests.findIndex(request => request.id === requestId);
  if (requestIndex < 0) return;
  const request = requests[requestIndex];
  if ((request.status || 'pending') !== 'pending') {
    toast(t('subscription.requests.toast.alreadyResolved', 'تمت معالجة هذا الطلب سابقًا'));
    return;
  }

  if (!approve) {
    requests[requestIndex] = { ...request, status: 'rejected', resolvedAt: new Date().toISOString(), resolvedBy: state.currentUser?.email || 'platform_owner' };
    writePlatformSubscriptionRequests(requests);
    toast(t('subscription.requests.toast.rejected', 'تم رفض طلب الاشتراك'));
    render();
    return;
  }

  const hotel = getOwnerSubscriptionRequestHotel(request);
  if (!hotel) {
    toast(t('subscription.requests.toast.hotelMissing', 'تعذر العثور على الفندق المرتبط بالطلب'));
    return;
  }
  const requestedPackage = getOwnerSubscriptionRequestPackage(request) || getPackageById(request.currentPackageId || '');
  if (!requestedPackage) {
    toast(t('subscription.requests.toast.packageMissing', 'تعذر العثور على الباقة المطلوبة'));
    return;
  }

  const subscriptions = readSubscriptions();
  const existingIndex = subscriptions.findIndex(subscription => subscription.hotelId === hotel.id);
  const existing = existingIndex >= 0 ? subscriptions[existingIndex] : null;
  const durationDays = Math.max(1, Number(requestedPackage.durationDays || existing?.durationDays || 30));
  const startDate = todayISO();
  const endDate = calculateSubscriptionEndDate(startDate, durationDays);
  const nextSubscription = {
    id: existing?.id || createId('subscription'),
    hotelId: hotel.id,
    packageId: requestedPackage.id,
    packageName: requestedPackage.name,
    plan: requestedPackage.id,
    durationDays,
    status: 'active',
    startDate,
    endDate,
    monthlyAmount: requestedPackage.price || existing?.monthlyAmount || '',
    currency: requestedPackage.currency || existing?.currency || readPlatformSettings().defaultCurrency || 'USD',
    paymentStatus: existing?.paymentStatus || 'unpaid',
    notes: existing?.notes || '',
    createdAt: existing?.createdAt || todayISO(),
    updatedAt: todayISO()
  };
  if (existingIndex >= 0) subscriptions[existingIndex] = nextSubscription;
  else subscriptions.push(nextSubscription);
  writeSubscriptions(subscriptions);

  requests[requestIndex] = {
    ...request,
    status: 'approved',
    approvedPackageId: requestedPackage.id,
    approvedPackageName: requestedPackage.name,
    resolvedAt: new Date().toISOString(),
    resolvedBy: state.currentUser?.email || 'platform_owner'
  };
  writePlatformSubscriptionRequests(requests);
  toast(t('subscription.requests.toast.approved', 'تمت الموافقة على الطلب وتفعيل الاشتراك'));
  render();
}

bindPlatformSubscriptionRequestActions();
