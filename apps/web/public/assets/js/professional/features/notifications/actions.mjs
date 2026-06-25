export function createNotificationActions() {
  return Object.freeze({
    resolveOpenTarget(item = {}) {
      return {
        page: item.page || 'dashboard',
        tab: item.tab || '',
        housekeepingStatus: item.housekeepingStatus || '',
        maintenanceStatus: item.maintenanceStatus || '',
        paymentMethod: item.paymentMethod || ''
      };
    }
  });
}
