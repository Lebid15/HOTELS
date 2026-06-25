function paymentsFeature() {
  return window.FandqiPaymentsFeature || null;
}

function notificationsFeature() {
  return window.FandqiNotificationsFeature || null;
}

function paymentsUi() {
  return window.FandqiUI || null;
}

// Fandqi Phase 115 — Notifications page 100% component centralization.
const NOTIFICATIONS_CENTRAL_AUDIT_MARKERS = Object.freeze([
  'phase115-notifications-centralization',
  'notifications-page-head',
  'notifications-page-actions',
  'notifications-status-strip',
  'notifications-status-filter',
  'notifications-feed-panel',
  'notifications-feed-title',
  'notifications-feed-grid',
  'notifications-card',
  'notifications-empty-state'
]);

function notificationAttrs(attrs = {}) {
  const ui = paymentsUi();
  if (ui?.renderAttributes) return ui.renderAttributes(attrs);
  return Object.entries(attrs || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${h(name)}` : ` ${h(name)}="${h(value)}"`)
    .join('');
}

function getPaymentSummaryTone(card = {}) {
  const key = String(card.key || card.iconName || card.label || '').toLowerCase();
  if (key.includes('room') || key.includes('currency') || key.includes('الغرفة')) return 'warning';
  if (key.includes('credit') || key.includes('cash') || key.includes('electronic') || key.includes('نقدي')) return 'success';
  if (key.includes('restaurant') || key.includes('orders') || key.includes('عدد')) return 'accent';
  return 'luxury';
}

function renderPaymentSectionHead({ title, text = '', actions = '' } = {}) {
  const ui = paymentsUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title,
      text,
      actions,
      className: 'payments-central-head',
      attrs: { 'data-ui-component': 'payments-page-head' }
    });
  }
  return `<div class="section-head payments-central-head" data-ui-component="payments-page-head"><div><h2>${h(title)}</h2>${text ? `<p class="helper">${h(text)}</p>` : ''}</div>${actions ? `<div class="ds-actions">${actions}</div>` : ''}</div>`;
}

function renderPaymentSummaryCard(card) {
  const ui = paymentsUi();
  const tone = getPaymentSummaryTone(card);
  if (ui?.renderMetricCard) {
    return ui.renderMetricCard({
      tag: 'article',
      title: card.label,
      value: card.value,
      note: card.note,
      icon: icon(card.iconName || 'receipt'),
      tone,
      className: `payment-summary-card payment-summary-card--${tone}`,
      attrs: { 'data-ui-component': 'payments-summary-card', 'data-payment-summary-tone': tone }
    });
  }
  return `
    <article class="guest-summary-card payment-summary-card payment-summary-card--${h(tone)}" data-ui-component="payments-summary-card" data-payment-summary-tone="${h(tone)}">
      <div class="guest-summary-icon">${icon(card.iconName || 'receipt')}</div>
      <div class="guest-summary-content">
        <span class="guest-summary-label">${h(card.label)}</span>
        <strong class="guest-summary-value">${h(card.value)}</strong>
        <small class="guest-summary-note">${h(card.note)}</small>
      </div>
    </article>
  `;
}

function renderPaymentSurface({ title = '', count = '', iconName = '', body = '', className = '', component = 'payments-surface', tag = 'section', attrs = {} } = {}) {
  const ui = paymentsUi();
  const head = title ? `<div class="dashboard-panel-head payments-panel-head" data-ui-component="payments-panel-head"><h3>${iconName ? icon(iconName) : ''}${h(title)}</h3>${count !== '' ? `<span class="ds-badge ds-status-info">${h(String(count))}</span>` : ''}</div>` : '';
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag,
      head,
      body,
      className: ['payments-central-surface', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component, ...attrs }
    });
  }
  return `<${tag} class="dashboard-panel payments-central-surface ${h(className)}" data-ui-component="${h(component)}"${Object.entries(attrs).map(([key, value]) => ` ${h(key)}="${h(value)}"`).join('')}>${head}${body}</${tag}>`;
}

function renderPaymentField({ label = '', iconName = '', control = '', className = '', component = 'payments-field', attrs = {} } = {}) {
  const ui = paymentsUi();
  const labelHtml = `<span class="field-label">${iconName ? icon(iconName) : ''}${h(label)}</span>`;
  if (ui?.renderField) {
    return ui.renderField({
      labelHtml,
      control,
      className: ['payments-central-field', className].filter(Boolean).join(' '),
      attrs: { 'data-ui-component': component, ...attrs }
    });
  }
  return `<div class="field payments-central-field ${h(className)}" data-ui-component="${h(component)}"${Object.entries(attrs).map(([key, value]) => ` ${h(key)}="${h(value)}"`).join('')}>${labelHtml}${control}</div>`;
}

function renderPaymentEmptyState({ title = '', text = '', iconName = 'receipt' } = {}) {
  const ui = paymentsUi();
  if (ui?.renderEmptyState) {
    return ui.renderEmptyState({
      title,
      text,
      icon: icon(iconName),
      className: 'payments-empty-state',
      attrs: { 'data-ui-component': 'payments-empty-state' }
    });
  }
  return `<div class="empty-panel payments-empty-state" data-ui-component="payments-empty-state"><div>${icon(iconName)}<h2>${h(title)}</h2><p>${h(text)}</p></div></div>`;
}

function renderPaymentFilters(methods = []) {
  const methodOptions = `
    <option value="all" ${state.paymentFilters.method === 'all' ? 'selected' : ''}>${h(t('payments.filters.all'))}</option>
    ${methods.map(method => `<option value="${h(method)}" ${state.paymentFilters.method === method ? 'selected' : ''}>${h(getFoodOrderPaymentMethodLabel(method))}</option>`).join('')}
  `;
  const body = `
    <div class="payments-central-filter-grid ds-form-grid" data-ui-component="payments-filter-grid">
      ${renderPaymentField({
        label: t('payments.filters.search'),
        iconName: 'search',
        className: 'field-search payments-search-field',
        component: 'payments-search-field',
        control: `<input class="input ds-control" id="paymentsSearch" value="${h(state.paymentFilters.search)}" autocomplete="off">`
      })}
      ${renderPaymentField({
        label: t('payments.filters.method'),
        iconName: 'creditCard',
        component: 'payments-method-field',
        control: `<select class="select ds-control" id="paymentsMethodFilter">${methodOptions}</select>`
      })}
    </div>
  `;
  return renderPaymentSurface({
    title: t('payments.filters.title', 'فلترة المدفوعات'),
    iconName: 'filter',
    body: `<p class="payments-filter-note">${h(t('payments.filters.note', 'ابحث أو اختر طريقة الدفع بدون تداخل مع كروت الطلبات.'))}</p>${body}`,
    className: 'payments-filter-panel payments-central-filter-panel',
    component: 'payments-filter-panel'
  });
}

function renderPaymentOrdersList(orders, currency) {
  if (!orders.length) {
    return renderPaymentEmptyState({
      title: t('payments.emptyTitle'),
      text: t('payments.emptyText'),
      iconName: 'receipt'
    });
  }
  return `<div class="payments-orders-list-wrap" data-ui-component="payments-orders-list">${renderFoodOrdersCards(orders, currency, { compact: true })}</div>`;
}

function renderNotificationActions(children = '', className = '', component = 'notifications-page-actions') {
  const ui = paymentsUi();
  const attrs = {
    'data-ui-component': component,
    'data-ui-centralized': 'phase115-notifications-centralization'
  };
  if (ui?.renderActions) {
    return ui.renderActions({
      children,
      className: ['notifications-central-actions', className].filter(Boolean).join(' '),
      attrs
    });
  }
  return `<div class="ds-actions notifications-central-actions ${h(className)}"${notificationAttrs(attrs)}>${children || ''}</div>`;
}

function renderNotificationSectionHead({ title = '', text = '', actions = '' } = {}) {
  const ui = paymentsUi();
  const attrs = {
    'data-ui-component': 'notifications-page-head',
    'data-ui-centralized': 'phase115-notifications-centralization'
  };
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title,
      text,
      kicker: t('notifications.kicker', 'مركز التنبيهات'),
      kickerIcon: icon('bell'),
      actions,
      className: 'notifications-central-head notifications-page-head',
      attrs
    });
  }
  return `<div class="section-head ds-section-head notifications-central-head notifications-page-head"${notificationAttrs(attrs)}><div><span class="fandqi-ui-section-kicker">${icon('bell')}${h(t('notifications.kicker', 'مركز التنبيهات'))}</span><h2>${h(title)}</h2>${text ? `<p class="helper">${h(text)}</p>` : ''}</div>${actions ? `<div class="ds-actions">${actions}</div>` : ''}</div>`;
}

function renderNotificationPanelTitle({ title = '', text = '', badge = '', iconName = 'bell' } = {}) {
  const ui = paymentsUi();
  const attrs = {
    'data-ui-component': 'notifications-feed-title',
    'data-ui-centralized': 'phase115-notifications-centralization'
  };
  const titleNode = ui?.renderPanelTitle
    ? ui.renderPanelTitle({
      title,
      icon: icon(iconName),
      className: 'notifications-central-panel-title',
      attrs: {
        'data-ui-component': 'notifications-feed-panel-title',
        'data-ui-centralized': 'phase115-notifications-centralization'
      }
    })
    : `<div class="form-section-title notifications-central-panel-title" data-ui-component="notifications-feed-panel-title" data-ui-centralized="phase115-notifications-centralization">${icon(iconName)}<span>${h(title)}</span></div>`;
  const copy = `<div>${titleNode}${text ? `<small>${h(text)}</small>` : ''}</div>${badge || ''}`;
  return `<div class="notifications-page-head notifications-central-panel-head"${notificationAttrs(attrs)}>${copy}</div>`;
}

function renderNotificationSurface({ body = '', head = '', className = '', component = 'notifications-surface', tag = 'section', attrs = {} } = {}) {
  const ui = paymentsUi();
  const finalAttrs = {
    'data-ui-component': component,
    'data-ui-centralized': 'phase115-notifications-centralization',
    ...attrs
  };
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag,
      head,
      body,
      className: ['notifications-central-surface', className].filter(Boolean).join(' '),
      attrs: finalAttrs
    });
  }
  return `<${tag} class="ds-card ds-surface notifications-central-surface ${h(className)}"${notificationAttrs(finalAttrs)}>${head}${body}</${tag}>`;
}

function renderNotificationButton(item) {
  const ui = paymentsUi();
  const feature = notificationsFeature();
  const attrs = {
    ...(feature?.selectors?.buildNotificationOpenAttrs ? feature.selectors.buildNotificationOpenAttrs(item) : {
      'data-notification-open-page': item.page || 'dashboard',
      ...(item.tab ? { 'data-manager-checkio-tab': item.tab } : {}),
      ...(item.housekeepingStatus ? { 'data-manager-housekeeping-status': item.housekeepingStatus } : {}),
      ...(item.maintenanceStatus ? { 'data-manager-maintenance-status': item.maintenanceStatus } : {}),
      ...(item.paymentMethod ? { 'data-manager-payment-method': item.paymentMethod } : {})
    }),
    'data-notification-id': item.id || '',
    'data-ui-component': 'notifications-open-button',
    'data-ui-centralized': 'phase115-notifications-centralization'
  };
  if (ui?.renderButton) {
    return ui.renderButton({
      label: t('notifications.actions.openNotification', 'فتح الإشعار'),
      tone: item.read ? 'ghost' : 'accent',
      size: 'small',
      icon: icon('externalLink'),
      className: 'notification-open-btn notifications-central-button',
      attrs
    });
  }
  return `<button class="btn ${item.read ? 'ghost' : 'accent'} small notification-open-btn notifications-central-button" type="button"${notificationAttrs(attrs)}>${icon('externalLink')}${h(t('notifications.actions.openNotification', 'فتح الإشعار'))}</button>`;
}

function renderNotificationMarkReadButton(item) {
  const ui = paymentsUi();
  const attrs = {
    'data-notification-mark-read': item.id || '',
    'data-ui-component': 'notifications-mark-read-button',
    'data-ui-centralized': 'phase115-notifications-centralization'
  };
  if (ui?.renderButton) {
    return ui.renderButton({
      label: t('notifications.actions.markRead', 'تعليم كمقروء'),
      tone: 'ghost',
      size: 'small',
      icon: icon('checkCircle'),
      className: 'notification-mark-read-btn notifications-central-button',
      attrs
    });
  }
  return `<button class="btn ghost small notification-mark-read-btn notifications-central-button" type="button"${notificationAttrs(attrs)}>${icon('checkCircle')}${h(t('notifications.actions.markRead', 'تعليم كمقروء'))}</button>`;
}

function renderNotificationBadge(item) {
  const ui = paymentsUi();
  const status = item.tone || 'neutral';
  if (ui?.renderBadge) {
    return ui.renderBadge({
      label: item.title || '',
      status,
      className: 'notification-status-badge notifications-central-badge',
      attrs: {
        'data-status': status,
        'data-ui-component': 'notifications-status-badge',
        'data-ui-centralized': 'phase115-notifications-centralization'
      }
    });
  }
  return `<span class="status-badge ${h(status)} notification-status-badge notifications-central-badge" data-status="${h(status)}" data-ui-component="notifications-status-badge" data-ui-centralized="phase115-notifications-centralization">${h(item.title || '')}</span>`;
}

function renderNotificationReadBadge(item) {
  const ui = paymentsUi();
  const status = item.read ? 'read' : 'unread';
  const label = item.read ? t('notifications.status.read', 'مقروء') : t('notifications.status.unread', 'غير مقروء');
  if (ui?.renderBadge) {
    return ui.renderBadge({
      label,
      status: item.read ? 'neutral' : 'info',
      className: `notification-read-badge ${status} notifications-central-badge`,
      attrs: {
        'data-read-status': status,
        'data-ui-component': 'notifications-read-badge',
        'data-ui-centralized': 'phase115-notifications-centralization'
      }
    });
  }
  return `<span class="notification-read-badge ${h(status)} notifications-central-badge" data-read-status="${h(status)}" data-ui-component="notifications-read-badge" data-ui-centralized="phase115-notifications-centralization">${h(label)}</span>`;
}

function renderNotificationCounterBadge(label, status = 'info', component = 'notifications-counter-badge') {
  const ui = paymentsUi();
  if (ui?.renderBadge) {
    return ui.renderBadge({
      label,
      status,
      className: 'notifications-unread-counter notifications-central-counter',
      attrs: {
        'data-ui-component': component,
        'data-ui-centralized': 'phase115-notifications-centralization'
      }
    });
  }
  return `<span class="notifications-unread-counter notifications-central-counter" data-ui-component="${h(component)}" data-ui-centralized="phase115-notifications-centralization">${h(label)}</span>`;
}

function renderNotificationFilterButton(status, label, count) {
  const ui = paymentsUi();
  const active = (state.notificationFilters.status || 'all') === status;
  const attrs = {
    'data-notification-status-filter': status,
    'aria-pressed': active ? 'true' : 'false',
    role: 'tab',
    'aria-selected': active ? 'true' : 'false',
    'data-ui-component': 'notifications-status-filter',
    'data-ui-centralized': 'phase115-notifications-centralization'
  };
  const children = `<span>${h(label)}</span><strong>${h(String(count))}</strong>`;
  if (ui?.renderButton) {
    return ui.renderButton({
      tone: active ? 'primary' : 'neutral',
      className: `notification-filter-btn notifications-central-filter-btn ${active ? 'active' : ''}`,
      attrs,
      children
    });
  }
  return `<button class="notification-filter-btn notifications-central-filter-btn ${active ? 'active' : ''}" type="button"${notificationAttrs(attrs)}>${children}</button>`;
}

function renderNotificationEmptyState(status) {
  const ui = paymentsUi();
  const title = status === 'unread'
    ? t('notifications.emptyUnreadTitle', 'لا توجد إشعارات غير مقروءة')
    : status === 'read'
      ? t('notifications.emptyReadTitle', 'لا توجد إشعارات مقروءة')
      : t('notifications.emptyTitle', 'لا توجد إشعارات حالية');
  const text = status === 'unread'
    ? t('notifications.emptyUnreadText', 'كل التنبيهات الحالية تمت قراءتها أو لا يوجد ما يحتاج متابعة الآن.')
    : t('notifications.emptyText', 'عندما يحدث شيء مهم داخل الفندق ستظهر التنبيهات هنا تلقائيًا.');
  if (ui?.renderEmptyState) {
    return `<div class="notifications-empty-state notifications-central-empty-state" data-ui-component="notifications-empty-state" data-ui-centralized="phase115-notifications-centralization">${ui.renderEmptyState({
      title,
      text,
      icon: icon('checkCircle'),
      className: 'notifications-central-empty-inner'
    })}</div>`;
  }
  return `<div class="empty-panel notifications-empty-state notifications-central-empty-state" data-ui-component="notifications-empty-state" data-ui-centralized="phase115-notifications-centralization"><div class="notifications-empty-icon">${icon('checkCircle')}</div><h3>${h(title)}</h3><p>${h(text)}</p></div>`;
}

function renderNotificationCard(item) {
  const cardBody = `
    <div class="notification-card-icon" data-ui-component="notifications-card-icon">${icon(item.icon || 'bell')}</div>
    <div class="notification-card-body" data-ui-component="notifications-card-body">
      <div class="notification-card-top" data-ui-component="notifications-card-meta">
        ${renderNotificationReadBadge(item)}
        <span class="notification-card-time" data-ui-component="notifications-card-time">${h(item.createdAt || todayISO())}</span>
      </div>
      <h4>${h(item.title || '')}</h4>
      <p>${h(item.note || '')}</p>
      ${renderNotificationActions(`${renderNotificationButton(item)}${!item.read ? renderNotificationMarkReadButton(item) : ''}`, 'notification-card-actions', 'notifications-card-actions')}
    </div>
  `;
  return renderNotificationSurface({
    tag: 'article',
    body: cardBody,
    className: `notification-card notifications-central-card notification-card--${h(item.tone || 'neutral')} ${item.read ? 'is-read' : 'is-unread'}`,
    component: 'notifications-card',
    attrs: { 'data-notification-card-id': item.id || '' }
  });
}

function renderNotificationsRefreshButton() {
  const ui = paymentsUi();
  const attrs = {
    id: 'refreshNotificationsPageBtn',
    'data-ui-component': 'notifications-refresh-button',
    'data-ui-centralized': 'phase115-notifications-centralization'
  };
  if (ui?.renderButton) {
    return ui.renderButton({
      label: t('notifications.actions.refresh', 'تحديث'),
      tone: 'neutral',
      size: 'small',
      icon: icon('refreshCw'),
      className: 'notifications-refresh-btn notifications-central-button',
      attrs
    });
  }
  return `<button class="btn ghost small notifications-refresh-btn notifications-central-button" type="button"${notificationAttrs(attrs)}>${icon('refreshCw')}${h(t('notifications.actions.refresh', 'تحديث'))}</button>`;
}


// data-ui-migrated="payments-orders-panel"
function renderPaymentsPage() {
  const hotel = getManagerHotel();
  if (!hotel) return renderManagerNoHotel();
  const settings = readHotelSettings(hotel.id);
  const currency = settings.defaultCurrency || readPlatformSettings().defaultCurrency || 'USD';
  const allOrders = getHotelFoodOrders(hotel.id);
  const filteredOrders = getFilteredPaymentOrders(hotel.id);
  const summary = getPaymentOrdersSummary(allOrders);
  const paymentLabels = {
    totalOrders: t('payments.cards.totalOrders'),
    totalOrdersNote: t('payments.cards.totalOrdersNote'),
    roomAccount: t('payments.cards.roomAccount'),
    roomAccountNote: t('payments.cards.roomAccountNote'),
    cashElectronic: t('payments.cards.cashElectronic'),
    cashElectronicNote: t('payments.cards.cashElectronicNote'),
    ordersCount: t('payments.cards.ordersCount'),
    ordersCountNote: t('payments.cards.ordersCountNote')
  };
  const feature = paymentsFeature();
  const cards = feature?.selectors?.buildPaymentSummaryCards
    ? feature.selectors.buildPaymentSummaryCards({ ...summary, ordersCount: allOrders.length }, currency, paymentLabels)
    : [
      { iconName: 'receipt', label: t('payments.cards.totalOrders'), value: `${summary.total} ${currency}`, note: t('payments.cards.totalOrdersNote') },
      { iconName: 'currency', label: t('payments.cards.roomAccount'), value: `${summary.roomAccount} ${currency}`, note: t('payments.cards.roomAccountNote') },
      { iconName: 'creditCard', label: t('payments.cards.cashElectronic'), value: `${summary.cash + summary.electronic} ${currency}`, note: t('payments.cards.cashElectronicNote') },
      { iconName: 'restaurant', label: t('payments.cards.ordersCount'), value: String(allOrders.length), note: t('payments.cards.ordersCountNote') }
    ];
  return `
    <div class="workspace-page payments-page payments-central-page" data-ui-centralized="phase106-payments" data-ui-migrated="payments">
      ${renderPaymentSectionHead({ title: t('page.payments'), text: t('payments.description') })}
      <div class="guest-summary-grid payments-summary-grid payments-central-summary-grid ds-grid" data-ui-component="payments-summary-grid" data-ui-migrated="payments-summary">
        ${cards.map(card => renderPaymentSummaryCard(card)).join('')}
      </div>
      ${renderPaymentFilters(FOOD_PAYMENT_METHODS)}
      ${renderPaymentSurface({
        title: t('payments.roomChargeOrdersTitle'),
        count: filteredOrders.length,
        iconName: 'receipt',
        body: renderPaymentOrdersList(filteredOrders, currency),
        className: 'food-orders-panel payments-orders-panel payments-central-orders-panel payments-content-after-filter',
        component: 'payments-orders-panel',
        attrs: { 'data-ui-migrated': 'payments-orders-panel' }
      })}
    </div>
  `;
}

function renderNotificationsPage() {
  const role = state.currentUser?.role || 'hotel_manager';
  const feature = notificationsFeature();
  const legacySummary = feature?.selectors?.summarizeNotifications ? feature.selectors.summarizeNotifications(getTopbarNotifications(role)) : null;
  void legacySummary;
  const summary = getNotificationsReadSummary(role);
  const activeStatus = state.notificationFilters.status || 'all';
  const notifications = getNotificationsByStatus(role, activeStatus);
  const headActions = renderNotificationActions(`
    ${paymentsUi()?.renderButton
      ? paymentsUi().renderButton({
        label: t('notifications.actions.markAllRead', 'تعليم الكل كمقروء'),
        tone: 'primary',
        size: 'small',
        icon: icon('checkCircle'),
        className: 'notifications-mark-all-read-btn notifications-central-button',
        disabled: !summary.unread,
        attrs: {
          id: 'markAllNotificationsReadBtn',
          'data-ui-component': 'notifications-mark-all-read-button',
          'data-ui-centralized': 'phase115-notifications-centralization'
        }
      })
      : `<button class="btn primary small notifications-mark-all-read-btn notifications-central-button" type="button" id="markAllNotificationsReadBtn" data-ui-component="notifications-mark-all-read-button" data-ui-centralized="phase115-notifications-centralization" ${summary.unread ? '' : 'disabled'}>${icon('checkCircle')}${h(t('notifications.actions.markAllRead', 'تعليم الكل كمقروء'))}</button>`}
    ${renderNotificationsRefreshButton()}
  `);
  const filters = renderNotificationSurface({
    tag: 'nav',
    className: 'notifications-status-strip notifications-central-status-strip',
    component: 'notifications-status-strip',
    attrs: {
      role: 'tablist',
      'aria-label': t('notifications.filters.statusLabel', 'فلترة الإشعارات حسب القراءة')
    },
    body: `
      ${renderNotificationFilterButton('all', t('notifications.filters.all', 'الكل'), summary.total)}
      ${renderNotificationFilterButton('unread', t('notifications.filters.unread', 'غير مقروء'), summary.unread)}
      ${renderNotificationFilterButton('read', t('notifications.filters.read', 'مقروء'), summary.read)}
      ${renderNotificationFilterButton('urgent', t('notifications.filters.urgent', 'عاجل غير مقروء'), summary.urgentUnread)}
    `
  });
  const feedHead = renderNotificationPanelTitle({
    title: t('notifications.feedTitle', 'سجل تنبيهات الفندق'),
    text: t('notifications.pageNote', 'هذه الصفحة للقراءة والمتابعة فقط، وليست لإدارة أو إنشاء إشعارات يدويًا.'),
    iconName: 'bell',
    badge: renderNotificationCounterBadge(`${summary.unread} ${t('notifications.status.unread', 'غير مقروء')}`, summary.unread ? 'info' : 'neutral', 'notifications-unread-counter')
  });
  const feedGrid = `<div class="notifications-page-grid notifications-central-feed-grid" data-ui-component="notifications-feed-grid" data-ui-centralized="phase115-notifications-centralization">
    ${notifications.length ? notifications.map(item => renderNotificationCard(item)).join('') : renderNotificationEmptyState(activeStatus)}
  </div>`;
  return `
    <div class="workspace-page notifications-page notifications-central-page" data-page="notifications" data-ui-migrated="notifications" data-ui-centralized="phase115-notifications-centralization" data-ui-page="notifications">
      ${renderNotificationSectionHead({ title: t('page.notifications', 'الإشعارات'), text: t('notifications.truePageSubtitle', 'تنبيهات تشغيلية حقيقية لما يحدث داخل الفندق. فتح الإشعار يجعله مقروءًا ويزيله من عداد الجرس.'), actions: headActions })}
      ${filters}
      ${renderNotificationSurface({
        head: feedHead,
        body: feedGrid,
        className: 'notifications-page-panel notifications-central-feed-panel',
        component: 'notifications-feed-panel'
      })}
    </div>
  `;
}
