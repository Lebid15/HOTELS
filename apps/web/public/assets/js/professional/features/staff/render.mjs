export function sortStaffByName(staffList = []) {
  return [...staffList].sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || ''), undefined, { sensitivity: 'base' }));
}

export function summarizeStaff(staffList = []) {
  return staffList.reduce((summary, staff) => {
    summary.total += 1;
    if ((staff.status || 'active') === 'active') summary.active += 1;
    if ((staff.status || 'active') === 'suspended') summary.suspended += 1;
    summary.roles[staff.role || 'unknown'] = (summary.roles[staff.role || 'unknown'] || 0) + 1;
    return summary;
  }, { total: 0, active: 0, suspended: 0, roles: {} });
}

export function filterStaff(staffList = [], { search = '', role = 'all', status = 'all', getRoleLabel = role => role } = {}) {
  const query = String(search || '').trim().toLowerCase();
  return staffList.filter(staff => {
    const matchesSearch = !query || [staff.fullName, staff.email, staff.phone, getRoleLabel(staff.role), staff.notes]
      .some(value => String(value || '').toLowerCase().includes(query));
    const matchesRole = role === 'all' || staff.role === role;
    const matchesStatus = status === 'all' || staff.status === status;
    return matchesSearch && matchesRole && matchesStatus;
  });
}

export function getStaffBookingEmployeeKey(staff = {}) {
  return [staff.id, staff.fullName, staff.email, staff.role].filter(Boolean).join('|');
}
