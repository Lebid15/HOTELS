export const MAINTENANCE_FEATURE_NAME = 'maintenance';

export const MAINTENANCE_STORAGE_KEY = 'fandqi.maintenanceTickets';

export const MAINTENANCE_STATUSES = Object.freeze([
  'open',
  'in_progress',
  'waiting_parts',
  'resolved',
  'cancelled',
  'archived'
]);

export const MAINTENANCE_ACTIVE_STATUSES = Object.freeze([
  'open',
  'in_progress',
  'waiting_parts'
]);

export const MAINTENANCE_PRIORITIES = Object.freeze([
  'low',
  'medium',
  'high',
  'urgent'
]);

export const MAINTENANCE_TYPES = Object.freeze([
  'electric',
  'plumbing',
  'ac',
  'internet',
  'furniture',
  'appliance',
  'door',
  'cleaning_damage',
  'other'
]);

export const MAINTENANCE_DEFAULTS = Object.freeze({
  type: 'other',
  priority: 'medium',
  status: 'open',
  source: 'manual',
  assignedTo: '',
  description: ''
});
