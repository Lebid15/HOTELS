// Fandqi Staff Feature Adapter
// Classic-script facade used while feature modules are migrated gradually.
(function installFandqiStaffFeature(window) {
  if (window.FandqiStaffFeature) return;

  const STAFF_STORAGE_KEY = 'fandqi.hotelStaff';
  const STAFF_ROLES = Object.freeze(['receptionist', 'cashier', 'housekeeping', 'maintenance', 'restaurant', 'room_service', 'supervisor']);
  const STAFF_STATUSES = Object.freeze(['active', 'suspended', 'archived']);
  const STAFF_VISIBLE_STATUSES = Object.freeze(['active', 'suspended']);
  const STAFF_SHIFTS = Object.freeze(['morning', 'evening', 'night', 'flexible']);
  const STAFF_PERMISSIONS = Object.freeze(['reservations', 'check_in_out', 'payments', 'rooms', 'room_service', 'housekeeping', 'maintenance', 'reports']);
  const STAFF_DEFAULTS = Object.freeze({
    role: 'receptionist',
    status: 'active',
    shift: 'flexible',
    permissions: ['reservations', 'check_in_out']
  });

  function readJson(key, fallback = []) {
    try {
      if (window.FandqiStorage?.read) return window.FandqiStorage.read(key, fallback);
      if (typeof window.readStorageJson === 'function') return window.readStorageJson(key, fallback);
      const raw = window.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (window.FandqiStorage?.write) return window.FandqiStorage.write(key, value);
    if (typeof window.writeStorageJson === 'function') return window.writeStorageJson(key, value);
    window.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  }

  function readStaff() {
    const staff = readJson(STAFF_STORAGE_KEY, []);
    return Array.isArray(staff) ? staff : [];
  }

  function writeStaff(staff) {
    return writeJson(STAFF_STORAGE_KEY, Array.isArray(staff) ? staff : []);
  }

  function byId(id) {
    return readStaff().find(staff => staff.id === id) || null;
  }

  function forHotel(hotelId, { includeArchived = false } = {}) {
    return readStaff().filter(staff => staff.hotelId === hotelId && (includeArchived || staff.status !== 'archived'));
  }

  function update(id, patch = {}) {
    let updated = null;
    const next = readStaff().map(staff => {
      if (staff.id !== id) return staff;
      updated = { ...staff, ...patch, updatedAt: patch.updatedAt || new Date().toISOString().slice(0, 10) };
      return updated;
    });
    writeStaff(next);
    return updated;
  }

  function upsert(staff) {
    const staffList = readStaff();
    const index = staffList.findIndex(item => item.id === staff.id);
    const next = index >= 0 ? staffList.map(item => item.id === staff.id ? { ...item, ...staff } : item) : [...staffList, staff];
    writeStaff(next);
    return staff;
  }

  function updateStatus(id, status) {
    return update(id, { status });
  }

  function normalizeStaffMember(staff = {}) {
    const permissions = Array.isArray(staff.permissions)
      ? staff.permissions.filter(permission => STAFF_PERMISSIONS.includes(permission))
      : STAFF_DEFAULTS.permissions;
    return {
      ...STAFF_DEFAULTS,
      ...staff,
      hotelId: String(staff.hotelId || '').trim(),
      fullName: String(staff.fullName || '').trim(),
      email: String(staff.email || '').trim().toLowerCase(),
      phone: String(staff.phone || '').trim(),
      role: STAFF_ROLES.includes(staff.role) ? staff.role : STAFF_DEFAULTS.role,
      status: STAFF_STATUSES.includes(staff.status) ? staff.status : STAFF_DEFAULTS.status,
      shift: STAFF_SHIFTS.includes(staff.shift) ? staff.shift : STAFF_DEFAULTS.shift,
      permissions
    };
  }

  function validateStaffMember(staff = {}) {
    const value = normalizeStaffMember(staff);
    const errors = [];
    if (!value.hotelId) errors.push({ field: 'hotelId', code: 'required' });
    if (!value.fullName) errors.push({ field: 'fullName', code: 'required' });
    if (!value.role) errors.push({ field: 'role', code: 'required' });
    if (!value.status) errors.push({ field: 'status', code: 'required' });
    if (!value.shift) errors.push({ field: 'shift', code: 'required' });
    return Object.freeze({ valid: errors.length === 0, errors, value });
  }

  function sortStaffByName(staffList = []) {
    return [...staffList].sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || ''), undefined, { sensitivity: 'base' }));
  }

  function summarizeStaff(staffList = []) {
    return staffList.reduce((summary, staff) => {
      summary.total += 1;
      if ((staff.status || 'active') === 'active') summary.active += 1;
      if ((staff.status || 'active') === 'suspended') summary.suspended += 1;
      summary.roles[staff.role || 'unknown'] = (summary.roles[staff.role || 'unknown'] || 0) + 1;
      return summary;
    }, { total: 0, active: 0, suspended: 0, roles: {} });
  }

  function filterStaff(staffList = [], { search = '', role = 'all', status = 'all', getRoleLabel = value => value } = {}) {
    const query = String(search || '').trim().toLowerCase();
    return staffList.filter(staff => {
      const matchesSearch = !query || [staff.fullName, staff.email, staff.phone, getRoleLabel(staff.role), staff.notes]
        .some(value => String(value || '').toLowerCase().includes(query));
      const matchesRole = role === 'all' || staff.role === role;
      const matchesStatus = status === 'all' || staff.status === status;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  function getStaffBookingEmployeeKey(staff = {}) {
    return [staff.id, staff.fullName, staff.email, staff.role].filter(Boolean).join('|');
  }

  window.FandqiStaffFeature = Object.freeze({
    version: 'staff-feature-adapter-v1',
    constants: Object.freeze({
      storageKey: STAFF_STORAGE_KEY,
      roles: STAFF_ROLES,
      statuses: STAFF_STATUSES,
      visibleStatuses: STAFF_VISIBLE_STATUSES,
      shifts: STAFF_SHIFTS,
      permissions: STAFF_PERMISSIONS
    }),
    repository: Object.freeze({
      read: readStaff,
      write: writeStaff,
      byId,
      forHotel,
      upsert,
      update,
      updateStatus
    }),
    selectors: Object.freeze({
      sortStaffByName,
      summarizeStaff,
      filterStaff,
      getStaffBookingEmployeeKey
    }),
    validators: Object.freeze({
      normalizeStaffMember,
      validateStaffMember
    }),
    actions: Object.freeze({
      activate: id => updateStatus(id, 'active'),
      suspend: id => updateStatus(id, 'suspended'),
      toggleStatus: id => {
        const staff = byId(id);
        return updateStatus(id, staff?.status === 'active' ? 'suspended' : 'active');
      },
      archive: id => updateStatus(id, 'archived'),
      updatePassword: (id, password) => update(id, { password }),
      updateShift: (id, shift) => update(id, { shift }),
      updatePermissions: (id, permissions = []) => update(id, { permissions })
    })
  });
})(window);
