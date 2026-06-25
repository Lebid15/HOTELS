// Fandqi Reports Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiReportsFeature(window) {
  if (window.FandqiReportsFeature) return;

  function addDaysToISO(iso, days) {
    const base = new Date(`${iso}T00:00:00`);
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  }

  function getReportRange(filters = {}, today = new Date().toISOString().slice(0, 10)) {
    if (filters.period === 'today') return { from: today, to: today };
    if (filters.period === 'last7') return { from: addDaysToISO(today, -6), to: today };
    if (filters.period === 'custom') return { from: filters.from || '', to: filters.to || '' };
    return { from: `${today.slice(0, 8)}01`, to: today };
  }

  function normalizeReportDate(value) {
    const raw = String(value || '').trim();
    const match = raw.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
    return '';
  }

  function isReportDateInRange(value, range = {}) {
    const date = normalizeReportDate(value);
    if (!date) return true;
    if (range.from && date < range.from) return false;
    if (range.to && date > range.to) return false;
    return true;
  }

  function moneyValue(amount, currency = '') {
    const number = Number(amount || 0);
    const formatted = Number.isInteger(number) ? String(number) : number.toFixed(2);
    return `${formatted} ${currency || ''}`.trim();
  }

  function sumBy(items = [], getter = item => item) {
    return items.reduce((sum, item) => sum + Number(getter(item) || 0), 0);
  }

  function countBy(items = [], getter = item => item) {
    return items.reduce((acc, item) => {
      const key = getter(item) || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function summarizeReports(ctx = {}, helpers = {}) {
    const {
      getReservationAmountDue = reservation => Math.max(0, Number(reservation?.totalAmount || reservation?.amount || 0) - Number(reservation?.paidAmount || 0)),
      getPaymentOrdersSummary = orders => ({ total: sumBy(orders, order => order.amount), roomAccount: 0, cash: 0, electronic: 0 }),
      getRoomDisplayStatus = room => room?.status,
    } = helpers;
    const reservations = ctx.reservations || [];
    const allReservations = ctx.allReservations || [];
    const rooms = ctx.rooms || [];
    const guests = ctx.guests || [];
    const maintenanceTickets = ctx.maintenanceTickets || [];
    const foodOrders = ctx.foodOrders || [];
    const reservationTotal = sumBy(reservations, reservation => reservation.totalAmount);
    const bookingPaid = sumBy(reservations, reservation => reservation.paidAmount);
    const dueTotal = sumBy(allReservations, reservation => getReservationAmountDue(reservation));
    const foodSummary = getPaymentOrdersSummary(foodOrders);
    const occupied = rooms.filter(room => getRoomDisplayStatus(room) === 'occupied').length;
    const activeGuests = guests.filter(entry => entry.stayStatus === 'active').length;
    const cleaningRooms = rooms.filter(room => getRoomDisplayStatus(room) === 'cleaning').length;
    const maintenanceRooms = rooms.filter(room => getRoomDisplayStatus(room) === 'maintenance').length;
    return {
      reservationsCount: reservations.length,
      completedReservations: reservations.filter(reservation => reservation.status === 'completed').length,
      checkedInReservations: allReservations.filter(reservation => reservation.status === 'checked_in').length,
      reservationTotal,
      bookingPaid,
      dueTotal,
      foodTotal: foodSummary.total,
      foodRoomAccount: foodSummary.roomAccount,
      foodPaid: foodSummary.cash + foodSummary.electronic,
      grandTotal: reservationTotal + foodSummary.total,
      roomsCount: rooms.length,
      occupied,
      occupancyRate: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0,
      activeGuests,
      cleaningRooms,
      maintenanceRooms,
      maintenanceOpen: maintenanceTickets.filter(ticket => !['resolved', 'cancelled'].includes(ticket.status)).length
    };
  }

  function getFoodTopItems(orders = []) {
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

  function toCsv(rows = []) {
    return rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  window.FandqiReportsFeature = Object.freeze({
    version: 'reports-feature-adapter-v1',
    selectors: Object.freeze({
      addDaysToISO,
      getReportRange,
      isReportDateInRange,
      moneyValue,
      sumBy,
      countBy,
      summarizeReports,
      getFoodTopItems
    }),
    validators: Object.freeze({
      normalizeReportDate
    }),
    actions: Object.freeze({
      toCsv,
      getExportFilename: (type = 'report', today = new Date().toISOString().slice(0, 10)) => `fandqi-${type || 'report'}-${today}.csv`
    })
  });
})(window);
