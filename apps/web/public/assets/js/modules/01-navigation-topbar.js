// Fandqi Modular Refactor — User role navigation, topbar identity, and topbar notifications rendering/events.
const USERS = [
  { email: 'platform@fandqi.com', password: '123456', name: 'Platform Owner', role: 'platform_owner' },
  { email: 'manager@fandqi.com', password: '123456', name: 'Hotel Manager', role: 'hotel_manager' },
  { email: 'reception@fandqi.com', password: '123456', name: 'Receptionist', role: 'receptionist' },
  { email: 'cashier@fandqi.com', password: '123456', name: 'Cashier', role: 'cashier' },
  { email: 'housekeeping@fandqi.com', password: '123456', name: 'Housekeeping', role: 'housekeeping' },
  { email: 'maintenance@fandqi.com', password: '123456', name: 'Maintenance', role: 'maintenance' },
  { email: 'service@fandqi.com', password: '123456', name: 'Room Service', role: 'room_service' },
  { email: 'supervisor@fandqi.com', password: '123456', name: 'Supervisor', role: 'supervisor' }
];

const HOTEL_STAFF_ROLES = ['receptionist', 'cashier', 'housekeeping', 'maintenance', 'restaurant', 'room_service', 'supervisor'];

function isHotelStaffRole(role) {
  return HOTEL_STAFF_ROLES.includes(role);
}

function isHotelOperationalRole(role) {
  return role === 'hotel_manager' || isHotelStaffRole(role);
}

const ROLE_NAV = {
  platform_owner: ['dashboard', 'hotels', 'hotel_managers', 'packages', 'subscriptions', 'subscription_requests', 'platform_settings'],
  hotel_manager: ['dashboard', 'hotel_settings', 'rooms', 'staff', 'reservations', 'guests', 'check_in_out', 'room_service', 'housekeeping', 'maintenance', 'payments', 'subscription_plan', 'reports'],
  receptionist: ['dashboard', 'front_desk', 'reservations', 'check_in_out', 'payments'],
  cashier: ['dashboard', 'payments', 'room_service', 'reports'],
  housekeeping: ['dashboard', 'housekeeping', 'rooms'],
  maintenance: ['dashboard', 'maintenance', 'rooms'],
  restaurant: ['dashboard', 'room_service', 'payments'],
  room_service: ['dashboard', 'room_service', 'payments'],
  supervisor: ['dashboard', 'front_desk', 'reservations', 'check_in_out', 'rooms', 'housekeeping', 'maintenance', 'room_service', 'payments', 'reports']
};

const NAV_ICONS = {
  dashboard: 'dashboard',
  hotels: 'building',
  hotel_managers: 'users',
  packages: 'package',
  subscriptions: 'shieldCheck',
  subscription_requests: 'receipt',
  platform_settings: 'settings',
  rooms: 'building',
  staff: 'users',
  reservations: 'calendar',
  guests: 'user',
  hotel_settings: 'settings',
  check_in_out: 'clock',
  room_service: 'restaurant',
  housekeeping: 'checkCircle',
  maintenance: 'shieldAlert',
  payments: 'creditCard',
  subscription_plan: 'badgePercent',
  reports: 'fileText',
  notifications: 'bell',
  front_desk: 'dashboard'
};

function getNavIcon(page) {
  return icon(NAV_ICONS[page] || 'dashboard', 'nav-svg-icon');
}

function getTopbarSubtitle(role, activePage) {
  const hotel = isHotelOperationalRole(role) ? getManagerHotel() : null;
  if (hotel?.name) return hotel.name;
  if (role === 'platform_owner') return t('platformOwner.description', 'إدارة الفنادق والاشتراكات والباقات من مكان واحد');
  return t(`page.${activePage}`);
}

function getTopbarHotelLogoDataUrl(hotel = null, role = '') {
  if (hotel?.id) {
    const settings = readHotelSettings(hotel.id);
    return settings.logoDataUrl || hotel.logoDataUrl || '';
  }
  if (role === 'platform_owner') {
    const platformSettings = readPlatformSettings();
    return platformSettings.logoDataUrl || '';
  }
  return '';
}

function renderTopbarMainLogo(hotel = null, role = '') {
  const logoDataUrl = getTopbarHotelLogoDataUrl(hotel, role);
  const hotelName = hotel?.name || getPlatformBrandName();
  const managerName = role === 'hotel_manager'
    ? (hotel?.managerName || getRoleLabel(role))
    : (role === 'receptionist' ? getRoleLabel(role) : getRoleLabel(role));
  const fallback = String(hotelName || 'F').trim().slice(0, 1) || 'F';
  return `
    <div class="topbar-brand-identity" aria-label="${h(hotelName)}">
      <div class="topbar-main-logo">
        ${logoDataUrl ? `<img src="${h(logoDataUrl)}" alt="${h(hotelName)}">` : `<span>${h(fallback)}</span>`}
      </div>
      <div class="topbar-brand-copy">
        <strong>${h(managerName)}</strong>
        <small>${h(hotelName)}</small>
      </div>
    </div>
  `;
}

const NOTIFICATIONS_READ_STORAGE_KEY = 'fandqi.notifications.read.v1';

function getNotificationScopeKey(role = state.currentUser?.role || 'hotel_manager') {
  const hotel = isHotelOperationalRole(role) ? getManagerHotel() : null;
  return `${role}:${hotel?.id || 'platform'}`;
}

function readNotificationReadStore() {
  const value = readStorageJson(NOTIFICATIONS_READ_STORAGE_KEY, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function writeNotificationReadStore(value) {
  writeStorageJson(NOTIFICATIONS_READ_STORAGE_KEY, value || {});
}

function getReadNotificationIds(role = state.currentUser?.role || 'hotel_manager') {
  const store = readNotificationReadStore();
  const scope = getNotificationScopeKey(role);
  return Array.isArray(store[scope]) ? store[scope] : [];
}

function getNotificationStableId(item = {}, index = 0) {
  if (item.id) return String(item.id);
  const raw = [item.key || index, item.page || 'dashboard', item.tab || '', item.title || '', item.note || ''].join('|');
  return encodeURIComponent(raw).slice(0, 220);
}

function enrichNotificationsWithReadState(items = [], role = state.currentUser?.role || 'hotel_manager') {
  const readIds = new Set(getReadNotificationIds(role));
  return items.map((item, index) => {
    const id = getNotificationStableId(item, index);
    const read = (item.kind === 'clear' || item.tone === 'success') ? true : readIds.has(id);
    return {
      ...item,
      id,
      read,
      status: read ? 'read' : 'unread',
      createdAt: item.createdAt || todayISO()
    };
  });
}

function isNotificationActionable(item = {}) {
  return item.kind !== 'clear' && item.tone !== 'success';
}

function isNotificationUnread(item = {}) {
  return isNotificationActionable(item) && !item.read;
}

function markNotificationAsRead(notificationId, role = state.currentUser?.role || 'hotel_manager') {
  const id = String(notificationId || '').trim();
  if (!id) return;
  const store = readNotificationReadStore();
  const scope = getNotificationScopeKey(role);
  const ids = new Set(Array.isArray(store[scope]) ? store[scope] : []);
  ids.add(id);
  store[scope] = Array.from(ids).slice(-250);
  writeNotificationReadStore(store);
}

function markAllCurrentNotificationsAsRead(role = state.currentUser?.role || 'hotel_manager') {
  const notifications = getTopbarNotifications(role).filter(isNotificationActionable);
  const store = readNotificationReadStore();
  const scope = getNotificationScopeKey(role);
  const ids = new Set(Array.isArray(store[scope]) ? store[scope] : []);
  notifications.forEach(item => ids.add(item.id));
  store[scope] = Array.from(ids).slice(-250);
  writeNotificationReadStore(store);
}

function getUnreadNotifications(role = state.currentUser?.role || 'hotel_manager') {
  return getTopbarNotifications(role).filter(isNotificationUnread);
}

function getNotificationsByStatus(role = state.currentUser?.role || 'hotel_manager', status = 'all') {
  const notifications = getTopbarNotifications(role).filter(isNotificationActionable);
  if (status === 'unread') return notifications.filter(item => !item.read);
  if (status === 'read') return notifications.filter(item => item.read);
  if (status === 'urgent') return notifications.filter(item => !item.read && ['danger', 'warning'].includes(item.tone));
  return notifications;
}

function getNotificationsReadSummary(role = state.currentUser?.role || 'hotel_manager') {
  const notifications = getTopbarNotifications(role).filter(isNotificationActionable);
  return {
    total: notifications.length,
    unread: notifications.filter(item => !item.read).length,
    read: notifications.filter(item => item.read).length,
    urgentUnread: notifications.filter(item => !item.read && ['danger', 'warning'].includes(item.tone)).length
  };
}

function renderNoUnreadTopbarNotification() {
  return {
    id: 'notifications-clear-state',
    icon: 'checkCircle',
    tone: 'success',
    kind: 'clear',
    read: true,
    status: 'read',
    title: t('topbar.notifications.clearTitle', 'لا توجد تنبيهات حالياً'),
    note: t('topbar.notifications.clearNote', 'كل شيء تحت السيطرة'),
    page: 'notifications'
  };
}

function getTopbarNotifications(role) {
  if (role === 'platform_owner') {
    const metrics = getDashboardMetrics();
    const items = [];
    const requestSummary = typeof getPlatformSubscriptionRequestsSummary === 'function'
      ? getPlatformSubscriptionRequestsSummary()
      : { pending: 0, latestPendingAt: '' };
    if (requestSummary.pending > 0) {
      items.push({
        id: `platform:subscription-requests:${requestSummary.pending}:${requestSummary.latestPendingAt || ''}`,
        icon: 'receipt',
        tone: 'warning',
        createdAt: requestSummary.latestPendingAt || todayISO(),
        title: t('topbar.notifications.subscriptionRequestsTitle', 'طلبات اشتراك واردة'),
        note: `${requestSummary.pending} ${t('topbar.notifications.subscriptionRequestsNote', 'طلب بانتظار موافقة صاحب المنصة')}`,
        page: 'subscription_requests'
      });
    }
    if (metrics.subscriptionsEndingSoon > 0) {
      items.push({
        id: `platform:subscriptions-ending-soon:${metrics.subscriptionsEndingSoon}`,
        icon: 'clock',
        tone: 'warning',
        title: t('topbar.notifications.endingSoonTitle', 'اشتراكات قاربت على الانتهاء'),
        note: `${metrics.subscriptionsEndingSoon} ${t('topbar.notifications.endingSoonNote', 'اشتراك يحتاج متابعة')}`,
        page: 'subscriptions'
      });
    }
    if (metrics.subscriptionsExpired > 0) {
      items.push({
        id: `platform:subscriptions-expired:${metrics.subscriptionsExpired}`,
        icon: 'alertCircle',
        tone: 'danger',
        title: t('topbar.notifications.expiredTitle', 'اشتراكات منتهية'),
        note: `${metrics.subscriptionsExpired} ${t('topbar.notifications.expiredNote', 'اشتراك منتهي')}`,
        page: 'subscriptions'
      });
    }
    if (metrics.hotelsSuspended > 0) {
      items.push({
        id: `platform:hotels-suspended:${metrics.hotelsSuspended}`,
        icon: 'ban',
        tone: 'warning',
        title: t('topbar.notifications.suspendedHotelsTitle', 'فنادق موقوفة'),
        note: `${metrics.hotelsSuspended} ${t('topbar.notifications.suspendedHotelsNote', 'فندق يحتاج مراجعة')}`,
        page: 'hotels'
      });
    }
    if (!items.length) {
      items.push({
        id: 'platform:clear-state',
        kind: 'clear',
        icon: 'checkCircle',
        tone: 'success',
        title: t('topbar.notifications.clearTitle', 'لا توجد تنبيهات حالياً'),
        note: t('topbar.notifications.clearNote', 'كل شيء تحت السيطرة'),
        page: 'dashboard'
      });
    }
    return enrichNotificationsWithReadState(items.slice(0, 6), role);
  }

  const hotel = getManagerHotel();
  if (!hotel) {
    return enrichNotificationsWithReadState([{
      id: `${role}:no-hotel-clear-state`,
      kind: 'clear',
      icon: 'checkCircle',
      tone: 'success',
      title: t('topbar.notifications.clearTitle', 'لا توجد تنبيهات حالياً'),
      note: t('topbar.notifications.clearNote', 'كل شيء تحت السيطرة'),
      page: 'dashboard'
    }], role);
  }

  const metrics = getManagerDashboardMetrics(hotel);
  const items = [];
  if (metrics.arrivalsToday > 0) {
    items.push({ id: `hotel:${hotel.id}:arrivals:${todayISO()}:${metrics.arrivalsToday}`, icon: 'clock', tone: 'warning', title: t('topbar.notifications.arrivalsTitle', 'وصول اليوم'), note: `${metrics.arrivalsToday} ${t('topbar.notifications.arrivalsNote', 'حجز بانتظار تسجيل الدخول')}`, page: 'check_in_out', tab: 'arrivals' });
  }
  if (metrics.departuresToday > 0) {
    items.push({ id: `hotel:${hotel.id}:departures:${todayISO()}:${metrics.departuresToday}`, icon: 'externalLink', tone: 'warning', title: t('topbar.notifications.departuresTitle', 'مغادرة اليوم'), note: `${metrics.departuresToday} ${t('topbar.notifications.departuresNote', 'حجز يحتاج استكمال المغادرة')}`, page: 'check_in_out', tab: 'departures' });
  }
  if (metrics.balanceDue > 0) {
    items.push({ id: `hotel:${hotel.id}:balance:${metrics.withBalance}:${Math.round(Number(metrics.balanceDue || 0) * 100)}`, icon: 'alertCircle', tone: 'danger', title: t('topbar.notifications.balanceTitle', 'مبالغ مستحقة'), note: `${moneyValue(metrics.balanceDue, metrics.currency)} • ${metrics.withBalance} ${t('topbar.notifications.balanceNote', 'حجز عليه متبقي')}`, page: 'payments', paymentMethod: 'all' });
  }
  if (metrics.roomsCleaning > 0) {
    items.push({ id: `hotel:${hotel.id}:cleaning:${metrics.roomsCleaning}`, icon: 'checkCircle', tone: 'accent', title: t('topbar.notifications.cleaningTitle', 'غرف تحت التنظيف'), note: `${metrics.roomsCleaning} ${t('topbar.notifications.cleaningNote', 'غرفة بانتظار التجهيز')}`, page: 'housekeeping', housekeepingStatus: 'cleaning' });
  }
  if (metrics.maintenanceOpen > 0) {
    items.push({ id: `hotel:${hotel.id}:maintenance:${metrics.maintenanceOpen}:${metrics.maintenanceUrgent}`, icon: 'shieldAlert', tone: 'warning', title: t('topbar.notifications.maintenanceTitle', 'بلاغات صيانة مفتوحة'), note: metrics.maintenanceUrgent ? `${metrics.maintenanceUrgent} ${t('topbar.notifications.maintenanceUrgent', 'عاجلة')} • ${metrics.maintenanceOpen} ${t('topbar.notifications.maintenanceNote', 'إجمالي البلاغات')}` : `${metrics.maintenanceOpen} ${t('topbar.notifications.maintenanceNote', 'بلاغ يحتاج متابعة')}`, page: 'maintenance', maintenanceStatus: 'open' });
  }
  if (metrics.roomAccountTotal > 0) {
    items.push({ id: `hotel:${hotel.id}:room-account:${Math.round(Number(metrics.roomAccountTotal || 0) * 100)}`, icon: 'receipt', tone: 'luxury', title: t('topbar.notifications.roomAccountTitle', 'طلبات على حساب الغرف'), note: `${moneyValue(metrics.roomAccountTotal, metrics.currency)} ${t('topbar.notifications.roomAccountNote', 'مرحلة على حساب النزلاء')}`, page: 'payments', paymentMethod: 'room_account' });
  }
  if (!items.length) {
    items.push({
      id: `hotel:${hotel.id}:clear-state`,
      kind: 'clear',
      icon: 'checkCircle',
      tone: 'success',
      title: t('topbar.notifications.clearTitle', 'لا توجد تنبيهات حالياً'),
      note: t('topbar.notifications.clearNote', 'كل شيء تحت السيطرة'),
      page: 'dashboard'
    });
  }
  return enrichNotificationsWithReadState(items.slice(0, 6), role);
}

function renderTopbarNotifications(role) {
  const notifications = getTopbarNotifications(role);
  const unreadNotifications = notifications.filter(isNotificationUnread);
  const visibleNotifications = unreadNotifications.length ? unreadNotifications : [renderNoUnreadTopbarNotification()];
  const alertCount = unreadNotifications.length;
  return `
    <div class="topbar-notifications ${state.topbarNotificationsOpen ? 'open' : ''}">
      <button class="icon-btn topbar-notify-btn" type="button" id="notificationsBtn" aria-label="${h(t('topbar.notifications.label', 'الإشعارات'))}" title="${h(t('topbar.notifications.label', 'الإشعارات'))}" aria-expanded="${state.topbarNotificationsOpen ? 'true' : 'false'}">
        ${icons.bell}
        ${alertCount ? `<span class="topbar-notify-badge">${h(String(alertCount > 9 ? '9+' : alertCount))}</span>` : ''}
      </button>
      <div class="topbar-notify-panel" ${state.topbarNotificationsOpen ? '' : 'hidden'}>
        <div class="topbar-notify-head">
          <div>
            <strong>${h(t('topbar.notifications.title', 'الإشعارات'))}</strong>
            <small>${h(t('topbar.notifications.subtitle', 'متابعة سريعة لأهم ما يحتاج انتباهك'))}</small>
          </div>
          <div class="topbar-notify-head-actions">
            <button class="btn neutral small" type="button" id="openNotificationsPageBtn">${icon('bell')}${h(t('topbar.notifications.openPage', 'كل الإشعارات'))}</button>
            <span class="topbar-notify-count">${h(String(alertCount))}</span>
          </div>
        </div>
        <div class="topbar-notify-list">
          ${visibleNotifications.map(item => `
            <button class="topbar-notify-item ${h(item.tone || '')} ${item.read ? 'is-read' : 'is-unread'}" type="button"
              data-topbar-notification-id="${h(item.id || '')}"
              data-topbar-page="${h(item.page || 'dashboard')}"
              ${item.tab ? `data-manager-checkio-tab="${h(item.tab)}"` : ''}
              ${item.housekeepingStatus ? `data-manager-housekeeping-status="${h(item.housekeepingStatus)}"` : ''}
              ${item.maintenanceStatus ? `data-manager-maintenance-status="${h(item.maintenanceStatus)}"` : ''}
              ${item.paymentMethod ? `data-manager-payment-method="${h(item.paymentMethod)}"` : ''}>
              <span class="topbar-notify-item-icon">${icon(item.icon || 'bell')}</span>
              <span class="topbar-notify-item-text">
                <strong>${h(item.title || '')}</strong>
                <small>${h(item.note || '')}</small>
              </span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function bindTopbarNotificationEvents(role) {
  const button = document.getElementById('notificationsBtn');
  if (button) {
    button.addEventListener('click', event => {
      event.stopPropagation();
      state.topbarNotificationsOpen = !state.topbarNotificationsOpen;
      render();
    });
  }

  const openPageBtn = document.getElementById('openNotificationsPageBtn');
  if (openPageBtn) {
    openPageBtn.addEventListener('click', event => {
      event.stopPropagation();
      state.topbarNotificationsOpen = false;
      setActivePage('notifications');
    });
  }

  document.querySelectorAll('[data-topbar-page]').forEach(item => {
    item.addEventListener('click', event => {
      event.stopPropagation();
      state.topbarNotificationsOpen = false;
      if (item.dataset.topbarNotificationId) markNotificationAsRead(item.dataset.topbarNotificationId, role);
      if (isHotelOperationalRole(role)) applyManagerDashboardFilters(item);
      setActivePage(item.dataset.topbarPage || 'dashboard');
    });
  });

  const panel = document.querySelector('.topbar-notify-panel');
  if (panel) panel.addEventListener('click', event => event.stopPropagation());
  document.addEventListener('click', () => {
    if (!state.topbarNotificationsOpen) return;
    state.topbarNotificationsOpen = false;
    render();
  }, { once: true });
}

