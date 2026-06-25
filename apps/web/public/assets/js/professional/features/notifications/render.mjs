export function summarizeNotifications(notifications = []) {
  return {
    total: notifications.length,
    actionable: notifications.filter(item => item.tone !== 'success').length,
    urgent: notifications.filter(item => ['danger', 'warning'].includes(item.tone)).length,
    safe: notifications.filter(item => item.tone === 'success').length
  };
}

export function buildNotificationOpenAttrs(item = {}) {
  return {
    'data-notification-open-page': item.page || 'dashboard',
    ...(item.tab ? { 'data-manager-checkio-tab': item.tab } : {}),
    ...(item.housekeepingStatus ? { 'data-manager-housekeeping-status': item.housekeepingStatus } : {}),
    ...(item.maintenanceStatus ? { 'data-manager-maintenance-status': item.maintenanceStatus } : {}),
    ...(item.paymentMethod ? { 'data-manager-payment-method': item.paymentMethod } : {})
  };
}

export function buildNotificationSummaryCards(summary = {}, labels = {}) {
  return [
    { iconName: 'bell', key: 'total', value: String(summary.total || 0), label: labels.total || 'Total notifications', note: labels.totalNote || '' },
    { iconName: 'alertCircle', key: 'actionable', value: String(summary.actionable || 0), label: labels.urgent || 'Actionable notifications', note: labels.urgentNote || '' },
    { iconName: 'shieldAlert', key: 'priority', value: String(summary.urgent || 0), label: labels.priority || 'Priority notifications', note: labels.priorityNote || '' },
    { iconName: 'checkCircle', key: 'safe', value: String(summary.safe || 0), label: labels.safe || 'Safe notifications', note: labels.safeNote || '' }
  ];
}
