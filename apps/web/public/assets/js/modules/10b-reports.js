function reportsFeature() {
  return window.FandqiReportsFeature || null;
}

function getReportTypeLabel(type) {
  return t(`reports.types.${type || 'overview'}`, type || '-');
}

function getReportPeriodLabel(period) {
  return t(`reports.periods.${period || 'month'}`, period || '-');
}

function reportsUi() {
  return window.FandqiUI || null;
}


const REPORTS_CENTRAL_AUDIT_MARKERS = [
  'data-ui-migrated="reports-tabs"',
  'data-ui-migrated="reports-actions"',
  'data-ui-component="reports-actions"'
];


function renderReportAttrs(attrs = {}) {
  return Object.entries(attrs || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${h(name)}` : ` ${h(name)}="${h(value)}"`)
    .join('');
}

function renderReportActions(children = '', className = 'reports-top-actions', attrs = {}) {
  const ui = reportsUi();
  const finalAttrs = { 'data-ui-component': 'reports-actions', 'data-ui-migrated': 'reports-actions', 'data-layout-fixed': 'reports-actions-outside-filter', ...attrs };
  if (ui?.renderActions) return ui.renderActions({ children, className, attrs: finalAttrs });
  return `<div class="ds-actions ${h(className)}"${renderReportAttrs(finalAttrs)}>${children}</div>`;
}

function renderReportPageHead({ title = '', text = '', actions = '', stats = [] } = {}) {
  const ui = reportsUi();
  const statsHtml = stats.length ? `
    <div class="reports-head-stats" data-ui-component="reports-head-stats">
      ${stats.map(item => `<span data-report-head-stat="${h(item.key || '')}">${icon(item.iconName)}<b>${h(item.value)}</b><small>${h(item.label)}</small></span>`).join('')}
    </div>
  ` : '';
  const actionSlot = `${statsHtml}${actions}`;
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      title,
      text,
      actions: actionSlot,
      className: 'reports-section-head reports-central-head',
      attrs: { 'data-ui-component': 'reports-page-head' }
    });
  }
  return `<div class="section-head reports-section-head reports-central-head" data-ui-component="reports-page-head"><div><h2>${h(title)}</h2>${text ? `<p class="helper">${h(text)}</p>` : ''}</div><div class="fandqi-ui-section-actions ds-actions">${actionSlot}</div></div>`;
}

function renderReportSurface({ title = '', count = '', iconName = '', body = '', className = '', component = 'reports-surface', tag = 'section', attrs = {} } = {}) {
  const ui = reportsUi();
  const head = title ? `<div class="dashboard-panel-head reports-panel-head" data-ui-component="reports-panel-head"><h3>${iconName ? icon(iconName) : ''}${h(title)}</h3>${count !== '' ? `<span>${h(String(count))}</span>` : ''}</div>` : '';
  const finalAttrs = { 'data-ui-component': component, ...attrs };
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag,
      head,
      body,
      className: ['reports-central-surface', className].filter(Boolean).join(' '),
      attrs: finalAttrs
    });
  }
  return `<${tag} class="ds-card ds-surface reports-central-surface ${h(className)}"${renderReportAttrs(finalAttrs)}>${head}${body}</${tag}>`;
}

function renderReportField({ label = '', control = '', className = '', component = 'reports-field', attrs = {} } = {}) {
  const ui = reportsUi();
  const finalAttrs = { 'data-ui-component': component, ...attrs };
  if (ui?.renderField) return ui.renderField({ label, control, className, attrs: finalAttrs });
  return `<div class="field ds-field ${h(className)}"${renderReportAttrs(finalAttrs)}><span class="field-label">${h(label)}</span>${control}</div>`;
}

function renderReportButton({ action = '', label = '', tone = 'ghost', iconName = '', className = '', attrs = {} }) {
  const ui = reportsUi();
  const finalAttrs = { 'data-ui-component': 'reports-button', ...attrs };
  if (ui?.renderButton) {
    return ui.renderButton({
      label,
      tone,
      size: 'small',
      action,
      icon: iconName ? icon(iconName) : '',
      className,
      attrs: finalAttrs
    });
  }
  return `<button class="btn ${h(tone)} small ${h(className)}" type="button"${action ? ` data-action="${h(action)}"` : ''}${renderReportAttrs(finalAttrs)}>${iconName ? icon(iconName) : ''}${h(label)}</button>`;
}

function renderReportTabButton(type, active) {
  const ui = reportsUi();
  const isActive = active === type;
  if (ui?.renderButton) {
    return ui.renderButton({
      label: getReportTypeLabel(type),
      tone: isActive ? 'primary' : 'ghost',
      className: `report-tab ${isActive ? 'active' : ''}`,
      attrs: {
        'data-ui-component': 'reports-tab-button',
        'data-report-type': type,
        role: 'tab',
        'aria-selected': isActive ? 'true' : 'false'
      }
    });
  }
  return `<button class="report-tab ${isActive ? 'active' : ''}" type="button" data-ui-component="reports-tab-button" data-report-type="${h(type)}" role="tab" aria-selected="${isActive ? 'true' : 'false'}">${h(getReportTypeLabel(type))}</button>`;
}

function renderReportPeriodButton(period, active) {
  const ui = reportsUi();
  const isActive = (active || 'month') === period;
  if (ui?.renderButton) {
    return ui.renderButton({
      label: getReportPeriodLabel(period),
      tone: isActive ? 'primary' : 'ghost',
      className: `report-period-btn ${isActive ? 'active' : ''}`,
      attrs: {
        'data-ui-component': 'reports-period-button',
        'data-report-period': period,
        'aria-pressed': isActive ? 'true' : 'false'
      }
    });
  }
  return `
    <button class="report-period-btn ${isActive ? 'active' : ''}" type="button" data-ui-component="reports-period-button" data-report-period="${h(period)}" aria-pressed="${isActive ? 'true' : 'false'}">
      ${h(getReportPeriodLabel(period))}
    </button>
  `;
}

function renderReportPeriodButtons(active) {
  return `
    <div class="report-period-quick-filter" role="group" aria-label="${h(t('reports.filters.period'))}" data-ui-component="reports-period-quick-filter">
      ${REPORT_PERIODS.map(period => renderReportPeriodButton(period, active)).join('')}
    </div>
  `;
}

function renderReportEmptyState() {
  const ui = reportsUi();
  if (ui?.renderEmptyState) {
    return `<div data-ui-component="reports-empty-state" class="reports-empty-state-wrap">${ui.renderEmptyState({
      title: t('reports.emptyTitle'),
      text: t('reports.emptyText'),
      icon: icon('fileText'),
      className: 'reports-empty'
    })}</div>`;
  }
  return `<div class="empty-panel reports-empty" data-ui-component="reports-empty-state"><div>${icon('fileText')}<h2>${h(t('reports.emptyTitle'))}</h2><p>${h(t('reports.emptyText'))}</p></div></div>`;
}

function renderReportSummaryCard(card) {
  const ui = reportsUi();
  const attrs = { 'data-ui-component': 'reports-summary-card', 'data-report-summary': card.key || '' };
  if (ui?.renderMetricCard) {
    return ui.renderMetricCard({
      title: card.label,
      value: card.value,
      note: card.note,
      icon: icon(card.iconName),
      tone: card.tone || 'primary',
      className: 'guest-summary-card report-summary-card reports-central-summary-card',
      attrs
    });
  }
  if (ui?.renderCard) {
    return `<article class="guest-summary-card report-summary-card reports-central-summary-card"${renderReportAttrs(attrs)}>${ui.renderCard({
      title: card.label,
      subtitle: card.note,
      icon: icon(card.iconName),
      body: `<strong class="guest-summary-value">${h(card.value)}</strong>`,
      className: 'report-summary-card-inner',
      bodyClassName: 'guest-summary-content'
    })}</article>`;
  }
  return `
    <article class="guest-summary-card report-summary-card reports-central-summary-card"${renderReportAttrs(attrs)}>
      <div class="guest-summary-icon">${icon(card.iconName)}</div>
      <div class="guest-summary-content">
        <span class="guest-summary-label">${h(card.label)}</span>
        <strong class="guest-summary-value">${h(card.value)}</strong>
        <small class="guest-summary-note">${h(card.note)}</small>
      </div>
    </article>
  `;
}

function addDaysToISO(iso, days) {
  const feature = reportsFeature();
  if (feature?.selectors?.addDaysToISO) return feature.selectors.addDaysToISO(iso, days);
  const base = new Date(`${iso}T00:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function getReportRange() {
  const filters = state.reportFilters || { period: 'month', from: '', to: '' };
  const feature = reportsFeature();
  if (feature?.selectors?.getReportRange) return feature.selectors.getReportRange(filters, todayISO());
  const today = todayISO();
  if (filters.period === 'today') return { from: today, to: today };
  if (filters.period === 'last7') return { from: addDaysToISO(today, -6), to: today };
  if (filters.period === 'custom') return { from: filters.from || '', to: filters.to || '' };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

function normalizeReportDate(value) {
  const feature = reportsFeature();
  if (feature?.validators?.normalizeReportDate) return feature.validators.normalizeReportDate(value);
  const raw = String(value || '').trim();
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return '';
}

function isReportDateInRange(value, range = getReportRange()) {
  const feature = reportsFeature();
  if (feature?.selectors?.isReportDateInRange) return feature.selectors.isReportDateInRange(value, range);
  const date = normalizeReportDate(value);
  if (!date) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

function moneyValue(amount, currency = '') {
  const feature = reportsFeature();
  if (feature?.selectors?.moneyValue) return feature.selectors.moneyValue(amount, currency);
  const number = Number(amount || 0);
  const formatted = Number.isInteger(number) ? String(number) : number.toFixed(2);
  return `${formatted} ${currency || ''}`.trim();
}

function getReportsContext() {
  const hotel = getManagerHotel();
  if (!hotel) return null;
  const settings = readHotelSettings(hotel.id);
  const currency = settings.defaultCurrency || readPlatformSettings().defaultCurrency || hotel.currency || 'USD';
  const range = getReportRange();
  const rooms = getHotelRooms(hotel.id).filter(room => room.status !== 'archived');
  const reservations = getHotelReservations(hotel.id).filter(reservation => reservation.status !== 'archived' && isReportDateInRange(reservation.createdAt || reservation.checkInDate || reservation.updatedAt, range));
  const allReservations = getHotelReservations(hotel.id).filter(reservation => reservation.status !== 'archived');
  const foodOrders = getHotelFoodOrders(hotel.id).filter(order => isReportDateInRange(order.createdAt || order.updatedAt, range));
  const maintenanceTickets = getHotelMaintenanceTickets(hotel.id).filter(ticket => isReportDateInRange(ticket.createdAt || ticket.updatedAt, range));
  const guests = getHotelGuestEntries(hotel.id);
  return { hotel, settings, currency, range, rooms, reservations, allReservations, foodOrders, maintenanceTickets, guests };
}

function sumBy(items, getter) {
  const feature = reportsFeature();
  if (feature?.selectors?.sumBy) return feature.selectors.sumBy(items, getter);
  return items.reduce((sum, item) => sum + Number(getter(item) || 0), 0);
}

function countBy(items, getter) {
  const feature = reportsFeature();
  if (feature?.selectors?.countBy) return feature.selectors.countBy(items, getter);
  return items.reduce((acc, item) => {
    const key = getter(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function getReportsSummary(ctx) {
  const feature = reportsFeature();
  if (feature?.selectors?.summarizeReports) {
    return feature.selectors.summarizeReports(ctx, {
      getReservationAmountDue,
      getPaymentOrdersSummary,
      getRoomDisplayStatus
    });
  }
  const reservationTotal = sumBy(ctx.reservations, reservation => reservation.totalAmount);
  const bookingPaid = sumBy(ctx.reservations, reservation => reservation.paidAmount);
  const dueTotal = sumBy(ctx.allReservations, reservation => getReservationAmountDue(reservation));
  const foodSummary = getPaymentOrdersSummary(ctx.foodOrders);
  const occupied = ctx.rooms.filter(room => getRoomDisplayStatus(room) === 'occupied').length;
  const activeGuests = ctx.guests.filter(entry => entry.stayStatus === 'active').length;
  const cleaningRooms = ctx.rooms.filter(room => getRoomDisplayStatus(room) === 'cleaning').length;
  const maintenanceRooms = ctx.rooms.filter(room => getRoomDisplayStatus(room) === 'maintenance').length;
  return {
    reservationsCount: ctx.reservations.length,
    completedReservations: ctx.reservations.filter(reservation => reservation.status === 'completed').length,
    checkedInReservations: ctx.allReservations.filter(reservation => reservation.status === 'checked_in').length,
    reservationTotal,
    bookingPaid,
    dueTotal,
    foodTotal: foodSummary.total,
    foodRoomAccount: foodSummary.roomAccount,
    foodPaid: foodSummary.cash + foodSummary.electronic,
    grandTotal: reservationTotal + foodSummary.total,
    roomsCount: ctx.rooms.length,
    occupied,
    occupancyRate: ctx.rooms.length ? Math.round((occupied / ctx.rooms.length) * 100) : 0,
    activeGuests,
    cleaningRooms,
    maintenanceRooms,
    maintenanceOpen: ctx.maintenanceTickets.filter(ticket => !['resolved', 'cancelled'].includes(ticket.status)).length
  };
}

function renderReportSummaryCards(ctx) {
  const summary = getReportsSummary(ctx);
  const cards = [
    { key: 'reservations', iconName: 'calendar', label: t('reports.cards.reservations'), value: String(summary.reservationsCount), note: t('reports.cards.reservationsNote') },
    { key: 'revenue', iconName: 'currency', label: t('reports.cards.revenue'), value: moneyValue(summary.grandTotal, ctx.currency), note: t('reports.cards.revenueNote') },
    { key: 'occupancy', iconName: 'building', label: t('reports.cards.occupancy'), value: `${summary.occupancyRate}%`, note: `${summary.occupied}/${summary.roomsCount}` },
    { key: 'activeGuests', iconName: 'users', label: t('reports.cards.activeGuests'), value: String(summary.activeGuests), note: t('reports.cards.activeGuestsNote') },
    { key: 'roomAccount', iconName: 'receipt', label: t('reports.cards.roomAccount'), value: moneyValue(summary.foodRoomAccount, ctx.currency), note: t('reports.cards.roomAccountNote') },
    { key: 'pendingOps', iconName: 'shieldAlert', label: t('reports.cards.pendingOps'), value: String(summary.cleaningRooms + summary.maintenanceRooms + summary.maintenanceOpen), note: t('reports.cards.pendingOpsNote'), tone: 'warning' }
  ];
  return `
    <div class="guest-summary-grid reports-summary-grid reports-central-summary-grid" data-ui-migrated="reports-summary" data-ui-component="reports-summary-grid">
      ${cards.map(card => renderReportSummaryCard(card)).join('')}
    </div>
  `;
}

function renderReportTabs() {
  const active = state.reportFilters.type || 'overview';
  return renderReportSurface({
    tag: 'div',
    body: REPORT_TYPES.map(type => renderReportTabButton(type, active)).join(''),
    className: 'reports-tabs reports-central-tabs',
    component: 'reports-tabs',
    attrs: { role: 'tablist', 'aria-label': t('reports.tabsLabel'), 'data-ui-migrated': 'reports-tabs' }
  });
}

function renderReportTopActions() {
  return renderReportActions(`
      ${renderReportButton({ action: 'print-report', label: t('reports.actions.print'), tone: 'luxury', iconName: 'receipt', attrs: { 'data-ui-component': 'reports-print-button' } })}
      ${renderReportButton({ action: 'export-report-csv', label: t('reports.actions.export'), tone: 'accent', iconName: 'fileArchive', attrs: { 'data-ui-component': 'reports-export-button' } })}
    `, 'reports-top-actions');
}

function renderReportFilters(ctx) {
  const filters = state.reportFilters;
  const body = `
    <div class="filters-bar compact-filters-bar reports-filters-bar reports-filters-bar--quick-periods" data-ui-component="reports-filter-grid">
      ${renderReportField({
        label: t('reports.filters.period'),
        control: renderReportPeriodButtons(filters.period || 'month'),
        className: 'report-period-field',
        component: 'reports-period-field'
      })}
      ${renderReportField({
        label: t('reports.filters.from'),
        control: `<input class="input" id="reportFromFilter" type="date" value="${h(filters.from || ctx.range.from || '')}" data-ui-component="reports-from-input">`,
        component: 'reports-from-field'
      })}
      ${renderReportField({
        label: t('reports.filters.to'),
        control: `<input class="input" id="reportToFilter" type="date" value="${h(filters.to || ctx.range.to || '')}" data-ui-component="reports-to-input">`,
        component: 'reports-to-field'
      })}
    </div>
  `;
  return renderReportSurface({
    body,
    className: 'workspace-filter-panel reports-filter-panel',
    component: 'reports-filter-panel',
    attrs: { 'data-layout-fixed': 'reports-actions-outside-filter' }
  });
}

function renderReportMetricTable(title, rows, options = {}) {
  const headers = options.headers || [t('reports.table.item'), t('reports.table.value'), t('reports.table.note')];
  const columns = headers.map((label, index) => ({ key: `c${index}`, label }));
  const tableRows = rows.map(row => columns.reduce((acc, column, index) => {
    acc[column.key] = row[index] ?? '-';
    return acc;
  }, {}));
  const ui = reportsUi();
  const body = rows.length
    ? `<div class="report-table-scroll" data-ui-component="reports-table-scroll">${ui?.renderTable
      ? ui.renderTable({ columns, rows: tableRows, className: 'report-table', attrs: { 'data-ui-component': 'reports-table' } })
      : `<div class="table-scroll"><table class="data-table report-table" data-ui-component="reports-table"><thead><tr>${headers.map(header => `<th>${h(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${h(cell ?? '-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
    </div>`
    : renderReportEmptyState();
  return renderReportSurface({
    title,
    count: rows.length,
    iconName: options.iconName || 'fileText',
    body,
    className: 'report-table-card reports-table-panel',
    component: 'reports-table-panel'
  });
}

function renderReportBars(title, items, currency = '') {
  const max = Math.max(1, ...items.map(item => Number(item.value || 0)));
  const body = items.length ? `
    <div class="report-bars" data-ui-component="reports-bars">
      ${items.map(item => {
        const width = Math.max(6, Math.round((Number(item.value || 0) / max) * 100));
        return `
          <div class="report-bar-row" data-ui-component="reports-bar-row">
            <div class="report-bar-label"><span>${h(item.label)}</span><strong>${h(moneyValue(item.value, item.currency || currency))}</strong></div>
            <div class="report-bar-track"><span class="report-bar-fill report-bar-fill--w${h(String(Math.min(100, Math.max(0, width))))}"></span></div>
          </div>
        `;
      }).join('')}
    </div>
  ` : renderReportEmptyState();
  return renderReportSurface({
    title,
    count: items.length,
    iconName: 'dashboard',
    body,
    className: 'report-chart-card reports-chart-panel',
    component: 'reports-chart-panel'
  });
}

function renderOverviewReport(ctx) {
  const summary = getReportsSummary(ctx);
  const financialItems = [
    { label: t('reports.financial.bookingRevenue'), value: summary.reservationTotal },
    { label: t('reports.financial.foodRevenue'), value: summary.foodTotal },
    { label: t('reports.financial.roomAccount'), value: summary.foodRoomAccount },
    { label: t('reports.financial.dueTotal'), value: summary.dueTotal }
  ];
  const roomStatusItems = Object.entries(countBy(ctx.rooms, room => getRoomDisplayStatus(room))).map(([status, count]) => ({ label: getRoomStatusLabel(status), value: count, currency: '' }));
  const insights = [
    [t('reports.insights.bestArea'), summary.foodTotal > summary.reservationTotal ? t('reports.insights.food') : t('reports.insights.reservations'), t('reports.insights.bestAreaNote')],
    [t('reports.insights.checkoutRisk'), moneyValue(summary.dueTotal, ctx.currency), t('reports.insights.checkoutRiskNote')],
    [t('reports.insights.operationalLoad'), String(summary.cleaningRooms + summary.maintenanceRooms), t('reports.insights.operationalLoadNote')]
  ];
  return `
    <div class="report-sections-grid">
      ${renderReportBars(t('reports.sections.financialOverview'), financialItems, ctx.currency)}
      ${renderReportBars(t('reports.sections.roomStatus'), roomStatusItems)}
      ${renderReportMetricTable(t('reports.sections.smartInsights'), insights)}
    </div>
  `;
}

function renderReservationsReport(ctx) {
  const rows = ctx.reservations
    .slice()
    .sort((a, b) => String(b.createdAt || b.checkInDate || '').localeCompare(String(a.createdAt || a.checkInDate || '')))
    .map(reservation => {
      const room = getRoomById(reservation.roomId);
      return [
        reservation.reservationNo || '-',
        getReservationGuestDisplayName(reservation),
        getReservationRoomLabel(room),
        `${reservation.checkInDate || '-'} → ${reservation.checkOutDate || '-'}`,
        getReservationStatusLabel(reservation.status),
        moneyValue(reservation.totalAmount, reservation.currency || ctx.currency),
        moneyValue(reservation.paidAmount, reservation.currency || ctx.currency),
        moneyValue(getReservationAmountDue(reservation), reservation.currency || ctx.currency)
      ];
    });
  return renderReportMetricTable(t('reports.sections.reservations'), rows, { headers: [t('reports.columns.no'), t('reports.columns.guest'), t('reports.columns.room'), t('reports.columns.dates'), t('reports.columns.status'), t('reports.columns.total'), t('reports.columns.paid'), t('reports.columns.due')] });
}

function renderFinancialReport(ctx) {
  const summary = getReportsSummary(ctx);
  const foodSummary = getPaymentOrdersSummary(ctx.foodOrders);
  const rows = [
    [t('reports.financial.bookingRevenue'), moneyValue(summary.reservationTotal, ctx.currency), t('reports.financial.bookingRevenueNote')],
    [t('reports.financial.bookingPaid'), moneyValue(summary.bookingPaid, ctx.currency), t('reports.financial.bookingPaidNote')],
    [t('reports.financial.cashOrders'), moneyValue(foodSummary.cash, ctx.currency), t('reports.financial.cashOrdersNote')],
    [t('reports.financial.electronicOrders'), moneyValue(foodSummary.electronic, ctx.currency), t('reports.financial.electronicOrdersNote')],
    [t('reports.financial.roomAccount'), moneyValue(foodSummary.roomAccount, ctx.currency), t('reports.financial.roomAccountNote')],
    [t('reports.financial.dueTotal'), moneyValue(summary.dueTotal, ctx.currency), t('reports.financial.dueTotalNote')]
  ];
  const roomAccountOrders = ctx.foodOrders.filter(order => (order.paymentMethod || 'cash') === 'room_account');
  const orderRows = roomAccountOrders.map(order => [getFoodOrderDisplayNumber(order), order.guestName || '-', order.roomNumber || order.tableNumber || '-', formatFoodOrderItems(order), moneyValue(order.amount, order.currency || ctx.currency)]);
  return `
    <div class="report-sections-grid">
      ${renderReportMetricTable(t('reports.sections.financial'), rows)}
      ${renderReportMetricTable(t('reports.sections.roomAccountOrders'), orderRows, { headers: [t('reports.columns.no'), t('reports.columns.guest'), t('reports.columns.room'), t('reports.columns.item'), t('reports.columns.total')] })}
    </div>
  `;
}

function renderRoomsReport(ctx) {
  const rows = ctx.rooms
    .slice()
    .sort((a, b) => String(a.floor || '').localeCompare(String(b.floor || ''), 'ar', { numeric: true }) || String(a.number || '').localeCompare(String(b.number || ''), 'ar', { numeric: true }))
    .map(room => {
      const status = getRoomDisplayStatus(room);
      const activeReservation = ctx.allReservations.find(reservation => reservation.roomId === room.id && reservation.status === 'checked_in') || ctx.allReservations.find(reservation => reservation.roomId === room.id && ['pending','confirmed'].includes(reservation.status));
      return [room.number || '-', room.floor || '-', getRoomTypeLabel(room.type), getRoomStatusLabel(status), activeReservation ? getReservationGuestDisplayName(activeReservation) : '-', activeReservation?.reservationNo || '-'];
    });
  const floorItems = Object.entries(countBy(ctx.rooms, room => `${t('room.form.floorPrefix')} ${room.floor || '-'}`)).map(([label, value]) => ({ label, value, currency: '' }));
  return `
    <div class="report-sections-grid">
      ${renderReportBars(t('reports.sections.roomsByFloor'), floorItems)}
      ${renderReportMetricTable(t('reports.sections.rooms'), rows, { headers: [t('reports.columns.room'), t('reports.columns.floor'), t('reports.columns.type'), t('reports.columns.status'), t('reports.columns.guest'), t('reports.columns.reservation')] })}
    </div>
  `;
}

function getFoodTopItems(orders) {
  const feature = reportsFeature();
  if (feature?.selectors?.getFoodTopItems) return feature.selectors.getFoodTopItems(orders);
  const map = new Map();
  orders.forEach(order => {
    if (!Array.isArray(order.items)) return;
    order.items.forEach(item => {
      const key = item.name || '-';
      const current = map.get(key) || { name: key, quantity: 0, total: 0 };
      current.quantity += Number(item.quantity || 1);
      current.total += Number(item.total || (Number(item.price || 0) * Number(item.quantity || 1)));
      map.set(key, current);
    });
  });
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
}

function renderFoodReport(ctx) {
  const paymentItems = Object.entries(getPaymentOrdersSummary(ctx.foodOrders)).filter(([key]) => key !== 'total').map(([key, value]) => ({ label: key === 'roomAccount' ? getFoodOrderPaymentMethodLabel('room_account') : getFoodOrderPaymentMethodLabel(key), value }));
  const topRows = getFoodTopItems(ctx.foodOrders).map(item => [item.name, String(item.quantity), moneyValue(item.total, ctx.currency)]);
  const ordersRows = ctx.foodOrders.slice(0, 20).map(order => [getFoodOrderDisplayNumber(order), order.guestName || '-', getFoodOrderSourceLabel(order.sourceType), getFoodOrderPaymentMethodLabel(order.paymentMethod || 'cash'), formatFoodOrderItems(order), moneyValue(order.amount, order.currency || ctx.currency)]);
  return `
    <div class="report-sections-grid">
      ${renderReportBars(t('reports.sections.foodByPayment'), paymentItems, ctx.currency)}
      ${renderReportMetricTable(t('reports.sections.topFoodItems'), topRows, { headers: [t('reports.columns.item'), t('reports.columns.quantity'), t('reports.columns.total')] })}
      ${renderReportMetricTable(t('reports.sections.foodOrders'), ordersRows, { headers: [t('reports.columns.no'), t('reports.columns.guest'), t('reports.columns.source'), t('reports.columns.method'), t('reports.columns.item'), t('reports.columns.total')] })}
    </div>
  `;
}

function renderMaintenanceReport(ctx) {
  const statusItems = Object.entries(countBy(ctx.maintenanceTickets, ticket => getMaintenanceStatusLabel(ticket.status))).map(([label, value]) => ({ label, value, currency: '' }));
  const priorityItems = Object.entries(countBy(ctx.maintenanceTickets, ticket => getMaintenancePriorityLabel(ticket.priority))).map(([label, value]) => ({ label, value, currency: '' }));
  const rows = ctx.maintenanceTickets.map(ticket => [ticket.ticketNo || '-', getMaintenanceRoomLabel(ticket.roomId), getMaintenanceTypeLabel(ticket.type), getMaintenancePriorityLabel(ticket.priority), getMaintenanceStatusLabel(ticket.status), ticket.assignedTo || '-', ticket.createdAt || '-']);
  return `
    <div class="report-sections-grid">
      ${renderReportBars(t('reports.sections.maintenanceByStatus'), statusItems)}
      ${renderReportBars(t('reports.sections.maintenanceByPriority'), priorityItems)}
      ${renderReportMetricTable(t('reports.sections.maintenanceTickets'), rows, { headers: [t('reports.columns.no'), t('reports.columns.location'), t('reports.columns.type'), t('reports.columns.priority'), t('reports.columns.status'), t('reports.columns.assignedTo'), t('reports.columns.date')] })}
    </div>
  `;
}

function renderReportBody(ctx) {
  const type = state.reportFilters.type || 'overview';
  if (type === 'reservations') return renderReservationsReport(ctx);
  if (type === 'financial') return renderFinancialReport(ctx);
  if (type === 'rooms') return renderRoomsReport(ctx);
  if (type === 'food') return renderFoodReport(ctx);
  if (type === 'maintenance') return renderMaintenanceReport(ctx);
  return renderOverviewReport(ctx);
}

function renderReportsPage() {
  const ctx = getReportsContext();
  if (!ctx) return renderManagerNoHotel();
  const summary = getReportsSummary(ctx);
  return `
    <div class="workspace-page reports-page reports-central-page" data-ui-migrated="reports" data-ui-centralized="phase108-reports" data-layout-fixed="reports-actions-outside-filter">
      ${renderReportPageHead({
        title: t('page.reports'),
        text: t('reports.description'),
        actions: renderReportTopActions(),
        stats: [
          { key: 'reservations', iconName: 'calendar', value: String(summary.reservationsCount), label: t('reports.cards.reservations') },
          { key: 'revenue', iconName: 'currency', value: moneyValue(summary.grandTotal, ctx.currency), label: t('reports.cards.revenue') },
          { key: 'occupancy', iconName: 'building', value: `${summary.occupancyRate}%`, label: t('reports.cards.occupancy') }
        ]
      })}
      ${renderReportSummaryCards(ctx)}
      ${renderReportFilters(ctx)}
      ${renderReportTabs()}
      <div id="reportsBodySlot" class="reports-body-slot" data-ui-component="reports-body-slot">${renderReportBody(ctx)}</div>
    </div>
  `;
}

function getReportExportRows(ctx) {
  const type = state.reportFilters.type || 'overview';
  if (type === 'reservations') return ctx.reservations.map(reservation => [reservation.reservationNo || '-', getReservationGuestDisplayName(reservation), getReservationRoomLabel(getRoomById(reservation.roomId)), reservation.checkInDate || '-', reservation.checkOutDate || '-', getReservationStatusLabel(reservation.status), reservation.totalAmount || 0, reservation.paidAmount || 0, getReservationAmountDue(reservation)]);
  if (type === 'financial') return ctx.foodOrders.map(order => [getFoodOrderDisplayNumber(order), order.guestName || '-', getFoodOrderPaymentMethodLabel(order.paymentMethod || 'cash'), formatFoodOrderItems(order), order.amount || 0, order.createdAt || '-']);
  if (type === 'rooms') return ctx.rooms.map(room => [room.number || '-', room.floor || '-', getRoomTypeLabel(room.type), getRoomStatusLabel(getRoomDisplayStatus(room))]);
  if (type === 'food') return ctx.foodOrders.map(order => [getFoodOrderDisplayNumber(order), order.guestName || '-', getFoodOrderSourceLabel(order.sourceType), getFoodOrderPaymentMethodLabel(order.paymentMethod || 'cash'), formatFoodOrderItems(order), order.amount || 0]);
  if (type === 'maintenance') return ctx.maintenanceTickets.map(ticket => [ticket.ticketNo || '-', getMaintenanceRoomLabel(ticket.roomId), getMaintenanceTypeLabel(ticket.type), getMaintenancePriorityLabel(ticket.priority), getMaintenanceStatusLabel(ticket.status), ticket.createdAt || '-']);
  const summary = getReportsSummary(ctx);
  return Object.entries(summary).map(([key, value]) => [t(`reports.export.${key}`, key), value]);
}

function exportCurrentReportCsv() {
  const ctx = getReportsContext();
  if (!ctx) return;
  const rows = getReportExportRows(ctx);
  const feature = reportsFeature();
  const csv = feature?.actions?.toCsv
    ? feature.actions.toCsv(rows)
    : rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = feature?.actions?.getExportFilename ? feature.actions.getExportFilename(state.reportFilters.type || 'report', todayISO()) : `fandqi-${state.reportFilters.type || 'report'}-${todayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getReportPrintHtml(ctx) {
  const summary = getReportsSummary(ctx);
  const hotelName = ctx.settings.displayName || ctx.hotel.name || getPlatformBrandName();
  const printedAt = new Date().toLocaleString(i18n.state.lang === 'ar' ? 'ar' : 'en');
  const title = getReportTypeLabel(state.reportFilters.type || 'overview');
  const rangeLabel = `${ctx.range.from || '-'} → ${ctx.range.to || '-'}`;
  const rows = [
    [t('reports.cards.reservations'), summary.reservationsCount],
    [t('reports.cards.revenue'), moneyValue(summary.grandTotal, ctx.currency)],
    [t('reports.cards.occupancy'), `${summary.occupancyRate}%`],
    [t('reports.cards.activeGuests'), summary.activeGuests],
    [t('reports.cards.roomAccount'), moneyValue(summary.foodRoomAccount, ctx.currency)],
    [t('reports.financial.dueTotal'), moneyValue(summary.dueTotal, ctx.currency)]
  ].map(row => `<tr><td>${h(row[0])}</td><td>${h(row[1])}</td></tr>`).join('');
  return `<!doctype html><html lang="${h(i18n.state.lang || 'ar')}" dir="${h(document.documentElement.dir || 'rtl')}"><head><meta charset="utf-8"><title>${h(t('reports.printTitle'))}</title><style>${getCentralPrintStyles('report')}</style></head><body>${renderPrintWindowActions(t('reports.actions.print'))}<main class="page"><header class="top"><div><h1>${h(hotelName)}</h1><p>${h(printedAt)}</p></div><div><h2>${h(title)}</h2><p>${h(rangeLabel)}</p></div></header><section class="meta"><div class="box"><span>${h(t('reports.filters.period'))}</span><strong>${h(getReportPeriodLabel(state.reportFilters.period))}</strong></div><div class="box"><span>${h(t('reports.filters.from'))}</span><strong>${h(ctx.range.from || '-')}</strong></div><div class="box"><span>${h(t('reports.filters.to'))}</span><strong>${h(ctx.range.to || '-')}</strong></div></section><table><thead><tr><th>${h(t('reports.table.item'))}</th><th>${h(t('reports.table.value'))}</th></tr></thead><tbody>${rows}</tbody></table><footer class="footer">${h(t('reports.generatedAt'))}: ${h(printedAt)}</footer></main>${renderAutoPrintScript()}</body></html>`;
}

function printCurrentReport() {
  const ctx = getReportsContext();
  if (!ctx) return;
  openRuntimePrintWindow(getReportPrintHtml(ctx), { width: 900, height: 760, popupMessage: t('reservation.receipt.popupBlocked') });
}

function bindReportsEvents() {
  document.querySelectorAll('[data-report-type]').forEach(button => button.addEventListener('click', () => {
    state.reportFilters.type = button.dataset.reportType || 'overview';
    render();
  }));
  document.querySelectorAll('[data-report-period]').forEach(button => button.addEventListener('click', () => {
    state.reportFilters.period = button.dataset.reportPeriod || 'month';
    if (state.reportFilters.period !== 'custom') {
      state.reportFilters.from = '';
      state.reportFilters.to = '';
    }
    render();
  }));
  const from = document.getElementById('reportFromFilter');
  if (from) from.addEventListener('change', event => {
    state.reportFilters.period = 'custom';
    state.reportFilters.from = event.target.value;
    render();
  });
  const to = document.getElementById('reportToFilter');
  if (to) to.addEventListener('change', event => {
    state.reportFilters.period = 'custom';
    state.reportFilters.to = event.target.value;
    render();
  });
  document.querySelectorAll('[data-action="print-report"]').forEach(button => button.addEventListener('click', printCurrentReport));
  document.querySelectorAll('[data-action="export-report-csv"]').forEach(button => button.addEventListener('click', exportCurrentReportCsv));
}
