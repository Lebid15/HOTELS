// Fandqi Payments Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiPaymentsFeature(window) {
  if (window.FandqiPaymentsFeature) return;

  function normalizeSearch(value) {
    return String(value || '').trim().toLowerCase();
  }

  function summarizePaymentOrders(orders = []) {
    return orders.reduce((acc, order) => {
      const amount = Number(order.amount || 0);
      acc.total += amount;
      if ((order.paymentMethod || 'cash') === 'cash') acc.cash += amount;
      if ((order.paymentMethod || 'cash') === 'electronic') acc.electronic += amount;
      if ((order.paymentMethod || 'cash') === 'room_account') acc.roomAccount += amount;
      return acc;
    }, { total: 0, cash: 0, electronic: 0, roomAccount: 0 });
  }

  function filterPaymentOrders(orders = [], filters = {}, helpers = {}) {
    const {
      formatFoodOrderItems = order => order?.itemsText || '',
      getPaymentMethodLabel = method => method || ''
    } = helpers;
    const method = filters.method || 'all';
    const search = normalizeSearch(filters.search || '');
    return orders
      .filter(order => method === 'all' || (order.paymentMethod || 'cash') === method)
      .filter(order => {
        if (!search) return true;
        return [
          order.guestName,
          order.roomNumber,
          order.tableNumber,
          order.reservationNo,
          formatFoodOrderItems(order),
          order.externalVendor,
          getPaymentMethodLabel(order.paymentMethod || 'cash')
        ].some(value => normalizeSearch(value).includes(search));
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function buildPaymentSummaryCards(summary = {}, currency = '', labels = {}) {
    return [
      { iconName: 'receipt', key: 'totalOrders', value: `${summary.total || 0} ${currency}`.trim(), label: labels.totalOrders || 'Total orders', note: labels.totalOrdersNote || '' },
      { iconName: 'currency', key: 'roomAccount', value: `${summary.roomAccount || 0} ${currency}`.trim(), label: labels.roomAccount || 'Room account', note: labels.roomAccountNote || '' },
      { iconName: 'creditCard', key: 'cashElectronic', value: `${Number(summary.cash || 0) + Number(summary.electronic || 0)} ${currency}`.trim(), label: labels.cashElectronic || 'Cash/electronic', note: labels.cashElectronicNote || '' },
      { iconName: 'restaurant', key: 'ordersCount', value: String(summary.ordersCount || 0), label: labels.ordersCount || 'Orders count', note: labels.ordersCountNote || '' }
    ];
  }

  window.FandqiPaymentsFeature = Object.freeze({
    version: 'payments-feature-adapter-v1',
    selectors: Object.freeze({
      summarizePaymentOrders,
      filterPaymentOrders,
      buildPaymentSummaryCards
    }),
    validators: Object.freeze({
      normalizePaymentSearch: normalizeSearch
    }),
    actions: Object.freeze({
      setMethodFilter: (filters = {}, method = 'all') => ({ ...filters, method }),
      setSearchFilter: (filters = {}, search = '') => ({ ...filters, search })
    })
  });
})(window);
