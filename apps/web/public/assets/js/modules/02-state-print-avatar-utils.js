// Fandqi Modular Refactor — Global state, i18n helpers, toast, print core, avatar uploader, theme, and role helpers.
function todayISO() {
  return window.FandqiRuntime?.dates?.todayISO?.() || new Date().toISOString().slice(0, 10);
}

function readStorageText(key, fallback = '') {
  return window.FandqiStorage?.readText?.(key, fallback) ?? fallback;
}

function writeStorageText(key, value) {
  return window.FandqiStorage?.writeText?.(key, value) ?? value;
}

function removeStorageKey(key) {
  return window.FandqiStorage?.remove?.(key);
}

function readStorageJson(key, fallback = null) {
  return window.FandqiStorage?.readJson?.(key, fallback) ?? fallback;
}

function writeStorageJson(key, value) {
  return window.FandqiStorage?.writeJson?.(key, value) ?? value;
}

function openRuntimePrintWindow(html, options = {}) {
  return window.FandqiPrint?.openHtml?.(html, options) ?? false;
}

const state = {
  authenticated: readStorageText('fandqi.auth') === 'true',
  currentUser: readStorageJson('fandqi.user', null),
  authMode: readStorageText('fandqi.authMode', 'login') || 'login',
  activePage: readStorageText('fandqi.activePage', 'dashboard') || 'dashboard',
  hotelFilters: { search: '', status: 'all', location: '' },
  managerFilters: { search: '', status: 'all', hotelStatus: 'all' },
  packageFilters: { search: '', status: 'all' },
  subscriptionFilters: { search: '', status: 'all', plan: 'all' },
  roomFilters: { search: '', status: 'all', type: 'all', floor: '' },
  staffFilters: { search: '', role: 'all', status: 'all' },
  reservationFilters: { search: '', status: 'all', room: 'all', employee: 'all' },
  guestFilters: { search: '', stayStatus: 'all', type: 'all', room: 'all' },
  checkInOutFilters: { tab: 'arrivals', search: '', room: 'all', date: todayISO() },
  housekeepingFilters: { search: '', status: 'cleaning', floor: '' },
  maintenanceFilters: { search: '', status: 'all', priority: 'all', room: 'all' },
  paymentFilters: { method: 'all', search: '' },
  notificationFilters: { status: 'all' },
  reportFilters: { type: 'overview', period: 'month', from: '', to: '' },
  settingsTab: readStorageText('fandqi.settingsTab', 'identity') || 'identity',
  hotelSettingsTab: readStorageText('fandqi.hotelSettingsTab', 'identity') || 'identity',
  hotelModal: null,
  packageModal: null,
  subscriptionModal: null,
  roomModal: null,
  staffModal: null,
  reservationModal: null,
  guestModal: null,
  foodOrderModal: null,
  foodMenuModal: null,
  maintenanceModal: null,
  topbarNotificationsOpen: false
};

function h(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;'
  })[char]);
}

function t(key, fallback = '') {
  return i18n.t(key, fallback);
}

function getCentralPrintStyles(variant = 'a4') {
  const direction = document.documentElement.dir || 'rtl';
  const pageSize = variant === 'food-invoice' ? '90mm auto' : 'A4';
  const pageWidth = variant === 'food-invoice' ? '90mm' : '210mm';
  const pageMinHeight = variant === 'food-invoice' ? '120mm' : '297mm';
  const pagePadding = variant === 'food-invoice' ? '8mm' : '8mm';
  return `
*{box-sizing:border-box}
body{margin:0;background:rgb(238 243 251);color:rgb(23 33 58);font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif;font-weight:700;direction:${direction}}
h1,h2,h3,p{margin:0}.page,.paper{width:${pageWidth};min-height:${pageMinHeight};margin:0 auto;background:rgb(255 255 255);padding:${pagePadding};position:relative}.paper{margin:10mm auto;border:1px solid rgb(205 216 235);border-radius:18px;box-shadow:0 18px 42px rgba(15,23,42,.12)}.sheet{border:1px solid rgb(203 215 236);border-radius:16px;padding:6mm 6.5mm;background:rgb(255 255 255);box-shadow:0 14px 38px rgba(15,23,42,.08);min-height:calc(${pageMinHeight} - 22mm);display:flex;flex-direction:column;overflow:hidden}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding-bottom:10px;border-bottom:1px solid rgb(217 227 243)}.brand{display:flex;align-items:center;gap:10px;min-width:0}.logo{width:46px;height:46px;border-radius:15px;border:1px solid rgb(201 214 235);display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgb(245 248 255);font-size:21px;font-weight:950;color:rgb(23 51 111)}.logo img{width:100%;height:100%;object-fit:cover}.brand h1,h1{font-size:18px;font-weight:950;color:rgb(20 33 74)}.brand p,.top p{margin-top:3px;color:rgb(93 107 133);font-size:10px;line-height:1.45}.doc-title{text-align:end;display:grid;gap:4px;justify-items:end}.doc-title h2,h2{font-size:23px;font-weight:950;color:rgb(15 42 95);letter-spacing:-.02em}.doc-title p{color:rgb(57 70 92);font-size:10.5px;line-height:1.45}.num{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:3px 11px;border-radius:999px;background:rgb(238 245 255);color:rgb(15 59 130);border:1px solid rgb(194 216 245);font-size:10.5px;font-weight:950}.meta,.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}.summary{grid-template-columns:repeat(4,minmax(0,1fr));margin:12px 0}.box,.hero-card{border:1px solid rgb(216 226 241);border-radius:13px;padding:8px 10px;background:rgb(250 252 255)}.box span,.hero-card span{display:block;color:rgb(91 106 132);font-size:10px}.box strong,.hero-card strong{display:block;color:rgb(20 31 57);font-size:12.5px;margin-top:3px}.box.due{background:rgb(255 248 238);border-color:rgb(232 199 145)}.panel{border:1px solid rgb(214 224 239);border-radius:13px;background:rgb(255 255 255);overflow:hidden;margin-top:4mm;break-inside:avoid}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;background:rgb(248 251 255);border-bottom:1px solid rgb(220 229 242)}.panel-head h3{font-size:13px;font-weight:950;color:rgb(16 44 99)}.panel-head small{color:rgb(102 117 142);font-size:9.5px;font-weight:800}.panel-icon{width:25px;height:25px;border-radius:9px;background:rgb(21 58 122);color:rgb(255 255 255);display:inline-flex;align-items:center;justify-content:center;font-size:13px}.split{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:4mm}.kv-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}.kv{min-height:32px;padding:6px 8px;border-bottom:1px solid rgb(227 235 246);border-inline-end:1px solid rgb(227 235 246)}.kv:nth-child(2n){border-inline-end:0}.kv span{display:block;color:rgb(107 120 145);font-size:9.5px;font-weight:850;margin-bottom:2px}.kv strong{display:block;color:rgb(17 27 54);font-size:10.8px;font-weight:950;line-height:1.3;word-break:break-word}.kv.full{grid-column:1/-1;border-inline-end:0}.hero{display:grid;grid-template-columns:1.12fr .88fr .7fr;gap:7px;margin-top:4mm}.hero-card.balance{background:rgb(244 248 255);border-color:rgb(196 215 243)}.documents-copy,.terms{padding:8px 10px}.documents-copy p{margin:0 0 7px;color:rgb(76 91 115);font-size:10px;line-height:1.5}.doc-chips{display:flex;flex-wrap:wrap;gap:6px}.doc-chip{min-height:27px;padding:5px 10px;border:1px solid rgb(203 218 240);border-radius:11px;background:rgb(244 248 255);color:rgb(16 44 99);font-weight:950;font-size:10.5px;display:inline-flex;align-items:center;gap:5px}.chip-icon{width:16px;height:16px;border-radius:6px;background:rgb(229 240 255);color:rgb(20 59 128);display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:950}.terms-box{border:1px dashed rgb(185 201 227);border-radius:11px;background:rgb(251 253 255);padding:8px 10px;color:rgb(55 67 90);line-height:1.6;font-size:10.2px;text-align:center}.child-line{padding:7px 9px;color:rgb(28 41 66);font-size:10px;font-weight:850}table{width:100%;border-collapse:collapse;margin-top:9px}th,td{border-bottom:1px solid rgb(226 234 246);padding:7px 6px;text-align:start;font-size:11px;vertical-align:top}th{background:rgb(246 249 255);color:rgb(68 82 106);font-weight:950}td{font-weight:850;color:rgb(28 41 66)}.total{margin-top:12px;border:1px solid rgb(188 207 238);background:rgb(244 248 255);border-radius:14px;padding:10px;display:flex;justify-content:space-between;align-items:center;color:rgb(15 42 95);font-weight:950}.note{margin-top:10px;color:rgb(85 100 126);font-size:10px;line-height:1.6;text-align:center}.footer{margin-top:auto;padding-top:12px;border-top:1px solid rgb(217 227 243);display:flex;justify-content:space-between;align-items:center;gap:12px;color:rgb(83 98 123);font-size:10px;font-weight:850}.no-print{position:fixed;top:12px;inset-inline-end:12px;display:flex;gap:8px;z-index:10}.no-print button{border:0;border-radius:12px;padding:10px 14px;background:rgb(21 58 122);color:white;font-weight:950;cursor:pointer;box-shadow:0 12px 28px rgba(15,23,42,.18)}.no-print button.close,.no-print .close{background:rgb(71 85 105)}
@page{size:${pageSize};margin:0}@media print{body{background:white}.page,.paper{margin:0;width:${pageWidth};min-height:${pageMinHeight};box-shadow:none;padding:${pagePadding};border:0}.sheet{box-shadow:none}.no-print{display:none}.panel,.hero-card{break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `;
}

function renderPrintWindowActions(printLabel) {
  return `<div class="no-print"><button onclick="window.print()">${h(printLabel)}</button><button class="close" onclick="window.close()">${h(t('common.close'))}</button></div>`;
}

function renderAutoPrintScript() {
  return window.FandqiPrint?.autoPrintScript?.(300) || '';
}


function getPersonInitials(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const letters = (parts.length >= 2 ? [parts[0], parts[parts.length - 1]] : [parts[0] || 'F'])
    .map(part => part.charAt(0))
    .join('');
  return (letters || 'F').slice(0, 2).toUpperCase();
}

function renderPersonAvatar(photoDataUrl = '', name = '', className = '') {
  const safeName = h(name || t('common.user', 'User'));
  const classes = ['person-avatar'];
  if (className) classes.push(className);
  if (photoDataUrl) {
    return `<span class="${classes.join(' ')} person-avatar--image"><img src="${h(photoDataUrl)}" alt="${safeName}"></span>`;
  }
  return `<span class="${classes.join(' ')} person-avatar--fallback" aria-label="${safeName}">${h(getPersonInitials(name))}</span>`;
}

function renderAvatarUploader(prefix, photoDataUrl = '', photoFileName = '', name = '') {
  const inputId = `${prefix}File`;
  const previewId = `${prefix}Preview`;
  const dataId = `${prefix}DataUrl`;
  const fileNameId = `${prefix}FileName`;
  const safeFileName = photoFileName || t('avatar.noFile', 'لم يتم اختيار صورة');
  return `
    <div class="field field-full avatar-uploader-field">
      ${fieldLabel('user', h(t('avatar.label', 'الصورة الشخصية')))}
      <div class="avatar-uploader" data-avatar-uploader="${h(prefix)}">
        <div class="avatar-uploader-preview" id="${h(previewId)}">
          ${renderPersonAvatar(photoDataUrl, name, 'avatar-uploader-avatar')}
        </div>
        <div class="avatar-uploader-body">
          <strong>${h(t('avatar.title', 'صورة شخصية اختيارية'))}</strong>
          <small>${h(t('avatar.helper', 'ارفع صورة واضحة لتظهر في كرت المدير أو الموظف.'))}</small>
          <div class="avatar-uploader-actions">
            <label class="btn ghost avatar-upload-button" for="${h(inputId)}">${icon('upload')}${h(t('avatar.choose', 'اختيار صورة'))}</label>
            <button class="btn ghost avatar-clear-button" type="button" data-avatar-clear="${h(prefix)}">${icon('trash')}${h(t('avatar.remove', 'حذف الصورة'))}</button>
          </div>
          <span class="avatar-file-name" id="${h(fileNameId)}">${h(safeFileName)}</span>
        </div>
        <input class="avatar-file-input" id="${h(inputId)}" type="file" accept="image/png,image/jpeg,image/webp" data-avatar-file="${h(prefix)}">
        <input type="hidden" name="${h(prefix)}DataUrl" id="${h(dataId)}" value="${h(photoDataUrl || '')}">
        <input type="hidden" name="${h(prefix)}FileName" id="${h(prefix)}FileNameHidden" value="${h(photoFileName || '')}">
      </div>
    </div>
  `;
}

const AVATAR_FILE_DATA_MAX_BYTES = 650000;

function readAvatarFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!String(file.type || '').startsWith('image/')) return resolve('');
    if (Number(file.size || 0) > AVATAR_FILE_DATA_MAX_BYTES) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Avatar file read failed'));
    reader.readAsDataURL(file);
  });
}

async function getAvatarPayload(prefix, fallbackDataUrl = '', fallbackFileName = '') {
  const fileInput = document.getElementById(`${prefix}File`);
  const file = fileInput?.files?.[0] || null;
  if (file) {
    const dataUrl = await readAvatarFileAsDataUrl(file);
    if (!dataUrl) {
      toast(t('avatar.tooLarge', 'تعذر حفظ الصورة. استخدم صورة أصغر من 650KB.'));
      return { dataUrl: fallbackDataUrl || '', fileName: fallbackFileName || '' };
    }
    return { dataUrl, fileName: file.name };
  }
  return {
    dataUrl: document.getElementById(`${prefix}DataUrl`)?.value || fallbackDataUrl || '',
    fileName: document.getElementById(`${prefix}FileNameHidden`)?.value || fallbackFileName || ''
  };
}

function bindAvatarUploaders() {
  document.querySelectorAll('[data-avatar-file]').forEach(input => {
    if (input.dataset.boundAvatar === '1') return;
    input.dataset.boundAvatar = '1';
    input.addEventListener('change', async () => {
      const prefix = input.dataset.avatarFile;
      const file = input.files?.[0] || null;
      const preview = document.getElementById(`${prefix}Preview`);
      const hiddenData = document.getElementById(`${prefix}DataUrl`);
      const hiddenName = document.getElementById(`${prefix}FileNameHidden`);
      const fileName = document.getElementById(`${prefix}FileName`);
      if (!file) return;
      const dataUrl = await readAvatarFileAsDataUrl(file);
      if (!dataUrl) {
        toast(t('avatar.tooLarge', 'تعذر حفظ الصورة. استخدم صورة أصغر من 650KB.'));
        input.value = '';
        return;
      }
      if (hiddenData) hiddenData.value = dataUrl;
      if (hiddenName) hiddenName.value = file.name;
      if (fileName) fileName.textContent = file.name;
      if (preview) {
        preview.innerHTML = renderPersonAvatar(dataUrl, file.name, 'avatar-uploader-avatar');
        applyCentralDesignSystem(preview);
      }
    });
  });

  document.querySelectorAll('[data-avatar-clear]').forEach(button => {
    if (button.dataset.boundAvatarClear === '1') return;
    button.dataset.boundAvatarClear = '1';
    button.addEventListener('click', () => {
      const prefix = button.dataset.avatarClear;
      const preview = document.getElementById(`${prefix}Preview`);
      const hiddenData = document.getElementById(`${prefix}DataUrl`);
      const hiddenName = document.getElementById(`${prefix}FileNameHidden`);
      const fileInput = document.getElementById(`${prefix}File`);
      const fileName = document.getElementById(`${prefix}FileName`);
      if (hiddenData) hiddenData.value = '';
      if (hiddenName) hiddenName.value = '';
      if (fileInput) fileInput.value = '';
      if (fileName) fileName.textContent = t('avatar.noFile', 'لم يتم اختيار صورة');
      if (preview) {
        preview.innerHTML = renderPersonAvatar('', '', 'avatar-uploader-avatar');
        applyCentralDesignSystem(preview);
      }
    });
  });
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePassword(value) {
  return String(value || '').trim();
}

function getTheme() {
  return 'light';
}

function setTheme() {
  document.documentElement.dataset.theme = 'light';
  removeStorageKey('fandqi.theme');
}

function toast(message) {
  toastBox.textContent = message;
  toastBox.classList.remove('hidden');
  setTimeout(() => toastBox.classList.add('hidden'), 2600);
}

function persistUser(user) {
  state.currentUser = user;
  state.authenticated = true;
  state.activePage = 'dashboard';
  writeStorageText('fandqi.auth', 'true');
  writeStorageJson('fandqi.user', user);
  writeStorageText('fandqi.activePage', state.activePage);
}

function logout() {
  removeStorageKey('fandqi.auth');
  removeStorageKey('fandqi.user');
  removeStorageKey('fandqi.activePage');
  state.authenticated = false;
  state.currentUser = null;
  state.activePage = 'dashboard';
  toast(t('toast.logoutSuccess'));
  render();
}

function getRoleLabel(role) {
  return t(`roles.${role}`);
}

function getStaffPermissionPages(permissions = []) {
  const allowed = new Set(['dashboard', 'notifications']);
  const map = {
    reservations: ['front_desk', 'reservations'],
    check_in_out: ['front_desk', 'check_in_out'],
    payments: ['payments'],
    rooms: ['rooms'],
    room_service: ['room_service', 'payments'],
    housekeeping: ['housekeeping', 'rooms'],
    maintenance: ['maintenance', 'rooms'],
    reports: ['reports']
  };
  permissions.forEach(permission => (map[permission] || []).forEach(page => allowed.add(page)));
  return allowed;
}

function getCurrentUserStaffPermissions() {
  const user = state.currentUser || {};
  if (!isHotelStaffRole(user.role)) return [];
  const fromUser = Array.isArray(user.permissions) ? user.permissions : [];
  if (fromUser.length) return fromUser;
  const staff = user.staffId && typeof getStaffById === 'function' ? getStaffById(user.staffId) : null;
  return Array.isArray(staff?.permissions) ? staff.permissions : [];
}

function getRoleNavItems(role) {
  const baseItems = ROLE_NAV[role] || ['dashboard'];
  let navItems = [...baseItems];
  if (isHotelStaffRole(role) && role !== 'supervisor') {
    const permissions = getCurrentUserStaffPermissions();
    if (permissions.length) {
      const allowedPages = getStaffPermissionPages(permissions);
      navItems = navItems.filter(item => allowedPages.has(item));
    }
  }
  if (!isHotelOperationalRole(role)) return navItems;
  const hotel = getManagerHotel();
  if (!hotel) return navItems.filter(item => item !== 'room_service');
  const settings = readHotelSettings(hotel.id);
  const hasFoodService = boolFromFormValue(settings.hasRestaurant) || boolFromFormValue(settings.hasCafeteria);
  return hasFoodService ? navItems : navItems.filter(item => item !== 'room_service');
}

function getActivePage(role) {
  const navItems = getRoleNavItems(role);
  if (state.activePage === 'notifications') return 'notifications';
  return navItems.includes(state.activePage) ? state.activePage : 'dashboard';
}

function setActivePage(page) {
  state.topbarNotificationsOpen = false;
  state.activePage = page;
  writeStorageText('fandqi.activePage', page);
  render();
}


