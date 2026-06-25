// Fandqi Modular Refactor — DOM anchors, SVG icon registry, field labels, and central design-system tone application helpers.
const app = document.getElementById('app');
const toastBox = document.getElementById('toast');
const i18n = window.FandqiI18n;

const icons = {
  globe: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.2 3.3 5.2 3.3 9S14.2 18.8 12 21c-2.2-2.2-3.3-5.2-3.3-9S9.8 5.2 12 3Z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.2A5.2 5.2 0 1 0 12 6.8a5.2 5.2 0 0 0 0 10.4Z"/><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 14.8A8.4 8.4 0 0 1 9.2 3a7.8 7.8 0 1 0 11.8 11.8Z"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><path d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4Z"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a3.2 3.2 0 0 0 4.5 4.5"/><path d="M9.5 5.4A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a16.4 16.4 0 0 1-3.2 4.1"/><path d="M6.1 6.8A16 16 0 0 0 2.5 12s3.5 7 9.5 7c1.2 0 2.3-.3 3.3-.7"/></svg>`,
  x: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>`,
  building: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14"/><path d="M9 21v-4h2v4"/><path d="M8 9h1M11 9h1M8 12h1M11 12h1"/><path d="M16 21V11a2 2 0 0 1 2-2h1a1 1 0 0 1 1 1v11"/></svg>`,
  user: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21a7 7 0 0 0-14 0"/><circle cx="12" cy="8" r="4"/></svg>`,
  users: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21a4 4 0 0 0-8 0"/><circle cx="12" cy="11" r="3"/><path d="M22 21a4 4 0 0 0-5-3.87"/><path d="M2 21a4 4 0 0 1 5-3.87"/><path d="M16 4.13a3 3 0 0 1 0 5.74"/><path d="M8 4.13a3 3 0 0 0 0 5.74"/></svg>`,
  package: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  restaurant: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v8"/><path d="M4 2v8a3 3 0 0 0 6 0V2"/><path d="M7 13v9"/><path d="M17 2v20"/><path d="M17 2c-2.2 1.7-3.5 4.2-3.5 7.2V12H17"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M16 10h2a3 3 0 0 1 0 6h-2"/><path d="M6 2v2M10 2v2M14 2v2"/><path d="M3 21h16"/></svg>`,
  table: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16"/><path d="M6 8v12"/><path d="M18 8v12"/><path d="M8 12h8"/><path d="M5 4h14l1 4H4l1-4Z"/></svg>`,
  delivery: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3Z"/><path d="M14 10h4l3 3v3h-7Z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>`,
  badgePercent: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 2.5 15 5l3.5.5.5 3.5L21.5 12 19 15l-.5 3.5-3.5.5-2.5 2.5L9 19l-3.5-.5L5 15 2.5 12 5 9l.5-3.5L9 5l3.5-2.5Z"/><path d="m15 9-6 6"/><path d="M9.5 9.5h.01"/><path d="M14.5 14.5h.01"/></svg>`,
  shieldCheck: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.76l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-.97-1.47 1.6 1.6 0 0 0-1.76.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.13A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.76l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 8.87 4.6a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.13a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.76-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9c.64.26 1.06.88 1.06 1.56V10a2 2 0 1 1 0 4v.13c0 .68-.42 1.3-1.06 1.56Z"/></svg>`,
  mapPin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.33-6-11a6 6 0 1 1 12 0c0 5.67-6 11-6 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.88.33 1.73.61 2.55a2 2 0 0 1-.45 2.11L8 9.66a16 16 0 0 0 6.34 6.34l1.28-1.27a2 2 0 0 1 2.11-.45c.82.28 1.67.49 2.55.61A2 2 0 0 1 22 16.92Z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>`,
  status: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v4"/><path d="M14 3v4"/><rect x="6" y="7" width="12" height="14" rx="2"/><path d="M9 11h6M9 15h6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>`,
  lockKeyhole: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/><path d="M12 15v2"/><circle cx="12" cy="15" r="1"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  calculator: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2"/></svg>`,
  currency: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></svg>`,
  notes: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/></svg>`,
  creditCard: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>`,
  pauseCircle: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>`,
  alertCircle: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>`,
  ban: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m7 17 10-10"/></svg>`,
  receipt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16v18l-2-1.5L16 21l-2-1.5L12 21l-2-1.5L8 21l-2-1.5L4 21V3Z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
  refreshCw: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.36 6.36"/><path d="M3 12A9 9 0 0 1 18.36 5.64"/><path d="M3 17v-5h5"/><path d="M21 7v5h-5"/></svg>`,
  shieldAlert: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  messageSquare: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>`,
  externalLink: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3V3Z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5"/></svg>`,
  fileArchive: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16v18H4z"/><path d="M9 3v5h6V3"/><path d="M9 12h6"/><path d="M10 16h4"/></svg>`,
  erase: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 21 10-10-7-7L2 12l7 9Z"/><path d="M22 21H7"/></svg>`,
  type: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>`,
  languages: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h6"/><path d="M4 12h5"/><path d="M7 16h2"/><path d="M13 5h7"/><path d="M16.5 5c0 6-2 10-5.5 13"/><path d="M18 11c-1.2 3.6-3.4 6.7-6.5 9"/><path d="M14 14c1.5 0 4.5-.2 6.5-1"/></svg>`,
  palette: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1a3 3 0 0 0 0-6h-1a1.5 1.5 0 0 1 0-3h3a4 4 0 0 0 0-8h-3Z"/><path d="M7 10h.01M9.5 7h.01M14.5 7h.01M17 10h.01"/></svg>`,
  hash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16M3 15h16M10 3 8 21M16 3l-2 18"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>`,
  save: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>`,
  print: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/></svg>`,
  download: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/></svg>`,
  clipboardCheck: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6"/><path d="M9 3h6v4H9z"/><path d="M5 5h3M16 5h3v16H5V5"/><path d="m8 14 2 2 5-5"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0 5 5L11 20a2 2 0 0 1-3-3l8.7-8.7Z"/><path d="m7 17-4-4"/></svg>`,
  bed: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7v14"/><path d="M21 12v9"/><path d="M3 14h18"/><path d="M6 10h5a3 3 0 0 1 3 3v1H3v-4a3 3 0 0 1 3-3Z"/><path d="M14 10h4a3 3 0 0 1 3 3v1h-7Z"/></svg>`,
  key: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.5" cy="14.5" r="4.5"/><path d="M11 11 21 1"/><path d="m16 6 2 2"/><path d="m19 3 2 2"/></svg>`,
  logOut: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17 15 12 10 7"/><path d="M15 12H3"/><path d="M21 3v18h-8"/></svg>`
};

function icon(name, className = '') {
  const classes = ['svg-icon'];
  if (className) classes.push(className);
  return `<span class="${classes.join(' ')}">${icons[name] || ''}</span>`;
}

function fieldLabel(iconName, label) {
  return `<label class="field-label">${icon(iconName, 'label-icon')}<span>${label}</span></label>`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '-');
  const lang = i18n?.state?.lang || 'ar';
  return date.toLocaleString(lang === 'ar' ? 'ar' : 'en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}


const DESIGN_SYSTEM = Object.freeze({
  filterSelectors: [
    '.filters-bar', '.compact-filters-bar', '.rooms-filters-bar', '.staff-filters-bar',
    '.reservations-filters-bar', '.guests-filters-bar', '.checkio-filters-bar', '.housekeeping-filters-bar', '.maintenance-filters-bar', '.payments-filters-bar', '.reports-filters-bar',
    '.platform-owner-filters', '.owner-filters-v2', '.owner-request-filter-pills', '.subscription-plan-actions', '.report-period-buttons'
  ],
  cardSelectors: [
    '.table-card', '.empty-panel', '.dashboard-panel', '.dashboard-card', '.quick-action-card',
    '.settings-logo-card', '.invoice-preview-card', '.room-card', '.staff-card', '.reservation-card',
    '.guest-card', '.checkio-card', '.housekeeping-room-card', '.maintenance-ticket-card', '.food-service-card', '.floor-overview-card',
    '.room-floor-section', '.panel', '.report-table-card', '.report-insight-card', '.report-chart-card', '.report-list-card', '.report-breakdown-card',
    '.platform-owner-card', '.platform-owner-requests-panel', '.owner-profile-panel', '.owner-profile-main-card', '.owner-profile-stat', '.owner-stat-card', '.owner-timeline-item', '.owner-dashboard-panel', '.owner-alert-card', '.auth-v3-card'
  ],
  summarySelectors: ['[class*="summary-card"]', '.dashboard-card', '.quick-action-card', '.owner-stat-card', '.owner-profile-stat', '.platform-owner-meta-item'],
  gridSelectors: [
    '[class*="summary-grid"]', '.dashboard-grid', '.quick-actions-grid', '.floor-overview-grid',
    '.room-cards-grid', '.staff-cards-grid', '.reservation-cards-grid', '.guest-cards-grid',
    '.checkio-cards-grid', '.housekeeping-cards-grid', '.maintenance-cards-grid', '.reports-grid', '.report-sections-grid',
    '.platform-owner-cards-grid', '.owner-dashboard-grid', '.owner-stats-grid', '.owner-profile-grid', '.owner-request-cards-v2', '.subscription-platform-packages-grid'
  ],
  primaryActions: ['save', 'add', 'view', 'open', 'check-in', 'mark-clean', 'confirm'],
  accentActions: ['edit', 'reservation', 'check-out', 'assign', 'renew'],
  luxuryActions: ['print', 'invoice', 'receipt', 'export'],
  warningActions: ['maintenance', 'suspend', 'cleaning', 'start-maintenance', 'waiting-parts'],
  dangerActions: ['delete', 'remove', 'cancel', 'trash', 'logout']
});

function addCentralClassToSelector(root, selectors, className) {
  selectors.forEach(selector => {
    root.querySelectorAll(selector).forEach(element => element.classList.add(className));
  });
}

function centralText(value) {
  return String(value || '').toLowerCase().trim();
}

function centralHasAny(value, terms) {
  const text = centralText(value);
  return terms.some(term => text.includes(centralText(term)));
}

function getCentralButtonSemanticText(button) {
  return [
    button.dataset.action,
    button.dataset.managerDashboardAction,
    button.dataset.ownerModal,
    button.dataset.ownerAction,
    button.dataset.ownerPage,
    button.dataset.ownerRequestFilter,
    button.dataset.tab,
    button.id,
    button.getAttribute('aria-label'),
    button.getAttribute('title'),
    button.textContent
  ].filter(Boolean).join(' ');
}

function getCentralButtonTone(button) {
  const action = getCentralButtonSemanticText(button);
  const id = button.id || '';
  if (button.classList.contains('password-toggle')) return 'primary';
  if (['languageBtn', 'notificationsBtn', 'refreshAppBtn', 'openNotificationsPageBtn'].includes(id)) return 'neutral';

  const luxuryTerms = [
    'print', 'invoice', 'receipt', 'export', 'account-statement', 'statement', 'voucher', 'bill', 'pdf', 'csv', 'download', 'backup',
    'طباعة', 'فاتورة', 'كشف', 'تصدير', 'سند', 'إيصال', 'ايصال', 'وصل', 'نسخة', 'تنزيل', 'تحميل', 'نسخ احتياطي', 'csv', 'pdf'
  ];
  const dangerTerms = [
    'delete', 'remove', 'cancel', 'trash', 'archive', 'logout', 'disable', 'reject', 'decline', 'void', 'close-reservation', 'clear', 'erase', 'block',
    'حذف', 'إلغاء', 'الغاء', 'أرشفة', 'ارشفة', 'تسجيل الخروج', 'تعطيل', 'رفض', 'إلغاء الحجز', 'الغاء الحجز', 'مسح', 'حظر'
  ];
  const warningTerms = [
    'maintenance', 'suspend', 'cleaning', 'check-out', 'checkout', 'waiting', 'parts', 'hold', 'follow', 'send-maintenance', 'filter', 'search',
    'تنظيف', 'صيانة', 'إيقاف', 'ايقاف', 'تعليق', 'مغادرة', 'تسجيل خروج', 'بانتظار', 'متابعة', 'قطع', 'إرسال للصيانة', 'فلترة', 'بحث'
  ];
  const primaryTerms = [
    'save', 'add', 'new', 'create', 'confirm', 'check-in', 'checkin', 'mark-clean', 'activate', 'submit', 'login', 'next', 'approve', 'accept',
    'حفظ', 'إضافة', 'اضافة', 'جديد', 'تأكيد', 'تاكيد', 'تسجيل دخول', 'تم التنظيف', 'تفعيل', 'إرسال', 'ارسال', 'دخول', 'التالي', 'موافقة', 'قبول'
  ];
  const successTerms = [
    'edit', 'update', 'change', 'assign', 'renew', 'permission', 'shift', 'pay', 'paid', 'settle', 'restore', 'enable',
    'تعديل', 'تحديث', 'تغيير', 'تعيين', 'تجديد', 'صلاحيات', 'وردية', 'دفع', 'تسديد', 'تحصيل', 'استعادة', 'تمكين'
  ];
  const accentTerms = [
    'view', 'open', 'show', 'details', 'profile', 'preview', 'browse', 'file', 'scan', 'settings', 'setup', 'manage', 'go',
    'عرض', 'فتح', 'اظهار', 'إظهار', 'التفاصيل', 'الملف', 'معاينة', 'استعراض', 'سحب', 'إعداد', 'اعداد', 'إدارة', 'ادارة', 'انتقال'
  ];

  if (centralHasAny(action, luxuryTerms) || button.classList.contains('luxury')) return 'luxury';
  if (button.id === 'logoutBtn' || centralHasAny(action, dangerTerms) || button.classList.contains('danger')) return 'danger';
  if (centralHasAny(action, warningTerms) || button.classList.contains('warning')) return 'warning';
  if (centralHasAny(action, primaryTerms) || button.classList.contains('primary')) return 'primary';
  if (centralHasAny(action, successTerms) || button.classList.contains('success')) return 'success';
  if (centralHasAny(action, accentTerms) || button.classList.contains('accent')) return 'accent';
  return 'neutral';
}


function getCentralButtonIconKey(button) {
  const action = getCentralButtonSemanticText(button);
  const text = centralText(action);
  if (!text) return '';

  const iconRules = [
    [['logout', 'تسجيل الخروج'], 'logOut'],
    [['delete', 'trash', 'حذف'], 'trash'],
    [['archive', 'أرشفة', 'ارشفة'], 'fileArchive'],
    [['reject', 'decline', 'cancel', 'void', 'إلغاء', 'الغاء', 'رفض'], 'x'],
    [['print', 'طباعة'], 'print'],
    [['invoice', 'receipt', 'voucher', 'bill', 'فاتورة', 'إيصال', 'ايصال', 'سند', 'وصل'], 'receipt'],
    [['export', 'download', 'backup', 'csv', 'pdf', 'تصدير', 'تحميل', 'تنزيل', 'نسخ احتياطي'], 'download'],
    [['save', 'حفظ'], 'save'],
    [['add', 'new', 'create', 'إضافة', 'اضافة', 'جديد', 'إنشاء', 'انشاء'], 'plus'],
    [['approve', 'accept', 'confirm', 'activate', 'check-in', 'تأكيد', 'تاكيد', 'تفعيل', 'موافقة', 'قبول', 'دخول'], 'checkCircle'],
    [['edit', 'update', 'change', 'تعديل', 'تحديث', 'تغيير'], 'edit'],
    [['renew', 'restore', 'refresh', 'تجديد', 'استعادة', 'تحديث'], 'refreshCw'],
    [['pay', 'paid', 'settle', 'payment', 'دفع', 'تسديد', 'تحصيل'], 'creditCard'],
    [['permission', 'role', 'shield', 'صلاحيات'], 'shieldCheck'],
    [['settings', 'setup', 'manage', 'إعداد', 'اعداد', 'إدارة', 'ادارة'], 'settings'],
    [['view', 'show', 'details', 'profile', 'open', 'عرض', 'فتح', 'التفاصيل', 'الملف'], 'eye'],
    [['search', 'بحث'], 'search'],
    [['filter', 'فلترة'], 'filter'],
    [['scan', 'upload', 'file', 'browse', 'مسح', 'رفع', 'ملف', 'استعراض'], 'upload'],
    [['maintenance', 'wrench', 'صيانة'], 'wrench'],
    [['clean', 'housekeeping', 'تنظيف', 'نظافة'], 'bed'],
    [['key', 'password', 'كلمة المرور'], 'key'],
    [['language', 'lang', 'لغة'], 'languages'],
    [['notification', 'bell', 'إشعار', 'اشعار'], 'bell'],
    [['next', 'التالي'], document.dir === 'ltr' ? 'arrowRight' : 'arrowLeft'],
    [['back', 'previous', 'رجوع', 'عودة', 'السابق'], document.dir === 'ltr' ? 'arrowLeft' : 'arrowRight']
  ];

  const rule = iconRules.find(([terms]) => centralHasAny(text, terms));
  return rule ? rule[1] : 'clipboardCheck';
}

function ensureCentralButtonIcon(button) {
  if (!button || button.dataset.dsIconLocked === 'true') return;
  const isDecoratedButton = button.classList.contains('ds-btn') || button.classList.contains('btn') || button.classList.contains('link-btn') || button.classList.contains('compact-action-btn') || button.classList.contains('manager-dashboard-quick-button');
  if (!isDecoratedButton) return;
  if (button.querySelector('svg')) return;
  const text = button.textContent.trim();
  if (!text || text === '×' || text === '✕') return;
  const key = getCentralButtonIconKey(button);
  if (!key || !icons[key]) return;
  const wrapper = document.createElement('span');
  wrapper.className = 'ds-btn-icon';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = icon(key);
  button.prepend(wrapper);
  button.dataset.dsIconGenerated = key;
}

function normalizeCentralActionButton(button) {
  button.classList.add('ds-btn');
  if (button.classList.contains('small') || button.classList.contains('compact-action-btn')) button.classList.add('ds-btn-small');
  const tone = getCentralButtonTone(button);
  ['primary', 'accent', 'success', 'luxury', 'warning', 'danger', 'neutral'].forEach(item => button.classList.remove(`ds-btn-${item}`));
  button.classList.add(`ds-btn-${tone}`);
  ensureCentralButtonIcon(button);
}

function getCentralStatusTone(element) {
  const value = [element.className, element.dataset.status, element.dataset.state, element.dataset.priority, element.textContent].join(' ');
  const dangerTerms = [
    'cancelled', 'canceled', 'expired', 'danger', 'suspended', 'archived', 'overdue', 'out_of_service', 'maintenance',
    'urgent', 'unpaid', 'occupied', 'checked_out', 'departed', 'failed', 'rejected', 'blocked', 'inactive', 'closed',
    'غادر', 'غادرت', 'مغادر', 'ملغي', 'ملغى', 'منتهي', 'موقوف', 'مؤرشف', 'خارج الخدمة', 'صيانة', 'عاجل',
    'غير مدفوع', 'مشغولة', 'مرفوض', 'محظور', 'غير فعال', 'مغلق', 'دين', 'متأخر'
  ];
  const warningTerms = [
    'pending', 'trial', 'partial', 'warning', 'booked', 'cleaning', 'waiting', 'in_progress', 'arriving', 'upcoming',
    'open', 'reserved', 'room_account', 'medium', 'high', 'follow', 'due', 'قيد', 'تجريبي', 'جزئي', 'محجوزة',
    'محجوز', 'تنظيف', 'بانتظار', 'وصول', 'قادمة', 'مفتوح', 'على حساب', 'متابعة', 'متوسطة', 'مرتفعة', 'مستحقة'
  ];
  const successTerms = [
    'success', 'available', 'confirmed', 'completed', 'paid', 'delivered', 'done', 'clean', 'checked_in', 'in_house',
    'resident', 'active', 'ready', 'low', 'enabled', 'متاحة', 'مؤكد', 'مكتمل', 'مدفوع', 'مسلم', 'تم الإنجاز',
    'جاهزة', 'مقيم', 'تم الدخول', 'نشط', 'فعال', 'منخفضة', 'متوفر', 'نظيفة'
  ];
  const infoTerms = [
    'info', 'inside', 'scheduled', 'cash', 'card', 'electronic', 'neutral-info', 'داخل', 'مجدول', 'نقدي', 'إلكتروني', 'الكتروني', 'معلومة'
  ];

  if (centralHasAny(value, dangerTerms)) return 'danger';
  if (centralHasAny(value, warningTerms)) return 'warning';
  if (centralHasAny(value, successTerms)) return 'success';
  if (centralHasAny(value, infoTerms)) return 'info';
  return 'neutral';
}

function applyCentralDesignSystem(root = document) {
  const scope = root === document ? document : root;
  scope.querySelectorAll('.page-shell').forEach(element => element.classList.add('ds-page'));
  addCentralClassToSelector(scope, DESIGN_SYSTEM.filterSelectors, 'ds-filters');
  addCentralClassToSelector(scope, DESIGN_SYSTEM.cardSelectors, 'ds-card');
  addCentralClassToSelector(scope, DESIGN_SYSTEM.summarySelectors, 'ds-summary-card');
  addCentralClassToSelector(scope, DESIGN_SYSTEM.gridSelectors, 'ds-summary-grid');

  scope.querySelectorAll('.field').forEach(element => element.classList.add('ds-field'));
  scope.querySelectorAll('.input, .select, .textarea').forEach(element => element.classList.add('ds-control'));
  scope.querySelectorAll('.modal-backdrop').forEach(element => element.classList.add('ds-modal-backdrop'));
  scope.querySelectorAll('.modal-card').forEach(element => element.classList.add('ds-modal-card'));
  scope.querySelectorAll('.modal-grid, .compact-modal-grid').forEach(element => element.classList.add('ds-modal-grid'));
  scope.querySelectorAll('.modal-actions, .row-actions').forEach(element => element.classList.add('ds-modal-actions'));
  scope.querySelectorAll('.status-badge, .guest-stay-badge, .guest-type-chip, .staff-role-chip, .reservation-number-chip, .room-number-chip, .floor-overview-badge, .guest-doc-chip, .document-file-pill, .topbar-notify-badge, .food-order-item-chip, .permission-chip, .room-type-chip, .maintenance-priority-chip, .manager-dashboard-date-chip, .platform-owner-status, .platform-owner-pill, .owner-health-badge, .owner-workspace-kicker, .subscription-request-table-badge, .notification-status-badge').forEach(element => {
    element.classList.add('ds-badge');
    ['success', 'warning', 'danger', 'info', 'neutral'].forEach(item => element.classList.remove(`ds-status-${item}`));
    element.classList.add(`ds-status-${getCentralStatusTone(element)}`);
  });
  scope.querySelectorAll('.table-scroll').forEach(element => element.classList.add('ds-scroll-area'));
  scope.querySelectorAll('.data-table').forEach(element => element.classList.add('ds-table'));
  scope.querySelectorAll('.settings-tab-btn, .report-tab, .checkio-tab, .reservation-step-tab, .owner-request-filter, .report-period-btn, .notification-filter-btn').forEach(button => button.classList.add('ds-tab-btn'));

  scope.querySelectorAll('.btn, .icon-btn, .link-btn, .compact-action-btn, .avatar-clear-button, .avatar-upload-button, .password-toggle, .modal-close, .room-type-remove, .manager-dashboard-quick-button, .notification-open-btn, .notification-mark-read-btn, .notifications-refresh-btn, .auth-main-submit-v3, .auth-register-submit-v3, .auth-switch-btn, .auth-text-btn-v3, .auth-language-btn-v3, .mobile-menu-btn, .topbar-refresh-btn').forEach(normalizeCentralActionButton);
}


