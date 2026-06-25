function renderWorkspace(page, role) {
  if (role === 'platform_owner' && page === 'dashboard') return renderPlatformDashboardPage();
  if (role === 'platform_owner' && page === 'hotels') return renderHotelsPage();
  if (role === 'platform_owner' && page === 'hotel_managers') return renderManagersPage();
  if (role === 'platform_owner' && page === 'packages') return renderPackagesPage();
  if (role === 'platform_owner' && page === 'subscriptions') return renderSubscriptionsPage();
  if (role === 'platform_owner' && page === 'subscription_requests') return renderPlatformSubscriptionRequestsPage();
  if (role === 'platform_owner' && page === 'platform_settings') return renderPlatformSettingsPage();
  if (role === 'hotel_manager' && page === 'dashboard') return renderHotelManagerDashboardPage();
  if (isHotelStaffRole(role) && page === 'dashboard') return renderStaffOperationalDashboardPage();
  if (isHotelOperationalRole(role) && page === 'front_desk') return renderFrontDeskPage();
  if (role === 'hotel_manager' && page === 'hotel_settings') return renderHotelSettingsPage();
  if (role === 'hotel_manager' && page === 'staff') return renderStaffPage();
  if (isHotelOperationalRole(role) && page === 'rooms') return renderRoomsPage();
  if (isHotelOperationalRole(role) && page === 'reservations') return renderReservationsPage();
  if (role === 'hotel_manager' && page === 'guests') return renderGuestsPage();
  if (isHotelOperationalRole(role) && page === 'check_in_out') return renderCheckInOutPage();
  if (isHotelOperationalRole(role) && page === 'housekeeping') return renderHousekeepingPage();
  if (isHotelOperationalRole(role) && page === 'maintenance') return renderMaintenancePage();
  if (role === 'hotel_manager' && page === 'subscription_plan') return renderHotelSubscriptionPlanPage();
  if (isHotelOperationalRole(role) && page === 'payments') return renderPaymentsPage();
  if (isHotelOperationalRole(role) && page === 'room_service') return renderFoodServicesPage();
  if ((isHotelOperationalRole(role) || role === 'platform_owner') && page === 'notifications') return renderNotificationsPage();
  if (isHotelOperationalRole(role) && page === 'reports') return renderReportsPage();
  return `
    <div class="workspace-page" data-page="${h(page)}">
      <div class="workspace-title">
        <h2>${h(t(`page.${page}`))}</h2>
      </div>
    </div>
  `;
}

function bindNotificationsPageEvents() {
  const role = state.currentUser?.role || 'hotel_manager';
  const refreshBtn = document.getElementById('refreshNotificationsPageBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => render());

  const markAllBtn = document.getElementById('markAllNotificationsReadBtn');
  if (markAllBtn) markAllBtn.addEventListener('click', () => {
    markAllCurrentNotificationsAsRead(role);
    toast(t('notifications.toast.allRead', 'تم تعليم كل الإشعارات كمقروءة'));
    render();
  });

  document.querySelectorAll('[data-notification-status-filter]').forEach(button => {
    button.addEventListener('click', () => {
      state.notificationFilters.status = button.dataset.notificationStatusFilter || 'all';
      render();
    });
  });

  document.querySelectorAll('[data-notification-mark-read]').forEach(button => {
    button.addEventListener('click', () => {
      markNotificationAsRead(button.dataset.notificationMarkRead || '', role);
      render();
    });
  });

  document.querySelectorAll('[data-notification-open-page]').forEach(button => {
    button.addEventListener('click', () => {
      markNotificationAsRead(button.dataset.notificationId || '', role);
      if (isHotelOperationalRole(role)) applyManagerDashboardFilters(button);
      setActivePage(button.dataset.notificationOpenPage || 'dashboard');
    });
  });
}

function setAuthMode(mode) {
  state.authMode = ['register', 'forgot'].includes(mode) ? mode : 'login';
  writeStorageText('fandqi.authMode', state.authMode);
  render();
}

const AUTH_CENTRAL_AUDIT_MARKERS = Object.freeze([
  'phase113-auth-access-centralization',
  'auth-shell-central-page',
  'auth-visual-central-surface',
  'auth-card-central-surface',
  'auth-field-central',
  'auth-password-field-central',
  'auth-action-central'
]);

function authUi() {
  return window.FandqiUI || null;
}

function authAttrs(attrs = {}) {
  return {
    'data-ui-centralized': 'phase113-auth-access-centralization',
    ...attrs
  };
}

function renderAuthButton({ id, label, iconHtml = '', tone = 'ghost', className = '', type = 'button', attrs = {} }) {
  const ui = authUi();
  const safeLabel = h(label || '');
  const children = `${iconHtml || ''}${safeLabel}`;
  if (ui?.renderButton) {
    return ui.renderButton({
      type,
      tone,
      children,
      className: ['auth-action-central', className].filter(Boolean).join(' '),
      attrs: authAttrs({ id, 'data-ui-component': 'auth-action-button', ...attrs })
    });
  }
  return `<button class="btn ${h(tone)} auth-action-central ${h(className)}" type="${h(type)}" id="${h(id || '')}" data-ui-component="auth-action-button" data-ui-centralized="phase113-auth-access-centralization">${children}</button>`;
}

function renderAuthIconButton({ id, iconHtml, label, className = '', attrs = {} }) {
  const ui = authUi();
  if (ui?.renderIconButton) {
    return ui.renderIconButton({
      children: iconHtml || '',
      className: ['auth-icon-action-central', className].filter(Boolean).join(' '),
      ariaLabel: label,
      title: label,
      attrs: authAttrs({ id, 'data-ui-component': 'auth-icon-button', ...attrs })
    });
  }
  return `<button class="icon-btn auth-icon-action-central ${h(className)}" type="button" id="${h(id || '')}" aria-label="${h(label || '')}" title="${h(label || '')}" data-ui-component="auth-icon-button" data-ui-centralized="phase113-auth-access-centralization">${iconHtml || ''}</button>`;
}

function renderAuthToolbar() {
  const ui = authUi();
  const languageButton = renderAuthIconButton({
    id: 'languageBtn',
    iconHtml: icons.globe,
    label: t('login.languageIconLabel'),
    className: 'auth-language-btn-v3',
    attrs: { 'data-auth-action': 'language-toggle' }
  });
  if (ui?.renderActions) {
    return ui.renderActions({
      className: 'auth-toolbar auth-toolbar-v3 auth-toolbar-central',
      attrs: authAttrs({ 'data-ui-component': 'auth-toolbar' }),
      children: languageButton
    });
  }
  return `<div class="auth-toolbar auth-toolbar-v3 auth-toolbar-central" data-ui-component="auth-toolbar" data-ui-centralized="phase113-auth-access-centralization">${languageButton}</div>`;
}

function renderAuthHead({ eyebrow, title, description, className = '', component = 'auth-card-head' }) {
  const ui = authUi();
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      kicker: eyebrow,
      title,
      text: description,
      className: ['auth-card-head auth-card-head-v3 auth-card-head-central', className].filter(Boolean).join(' '),
      attrs: authAttrs({ 'data-ui-component': component })
    });
  }
  return `
    <div class="auth-card-head auth-card-head-v3 auth-card-head-central ${h(className)}" data-ui-component="${h(component)}" data-ui-centralized="phase113-auth-access-centralization">
      <span class="auth-eyebrow auth-eyebrow-v3">${h(eyebrow)}</span>
      <h2>${h(title)}</h2>
      <p class="helper">${h(description)}</p>
    </div>
  `;
}

function renderAuthPills({ items = [], className = '', label = '' }) {
  const ui = authUi();
  const body = items.map(item => `<span data-ui-component="auth-benefit-pill">${item.icon || ''}${h(item.label)}</span>`).join('');
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag: 'div',
      className: ['auth-mini-pills-v3 auth-pills-central-surface', className].filter(Boolean).join(' '),
      attrs: authAttrs({ 'data-ui-component': 'auth-benefit-pills', 'aria-label': label }),
      body
    });
  }
  return `<div class="auth-mini-pills-v3 auth-pills-central-surface ${h(className)}" aria-label="${h(label)}" data-ui-component="auth-benefit-pills" data-ui-centralized="phase113-auth-access-centralization">${body}</div>`;
}

function renderAuthField({ id, name, label, type = 'text', autocomplete = '', required = false, minlength = '', className = '', attrs = {} }) {
  const ui = authUi();
  const controlAttrs = [
    `class="input"`,
    `id="${h(id)}"`,
    `name="${h(name || id)}"`,
    type ? `type="${h(type)}"` : '',
    autocomplete ? `autocomplete="${h(autocomplete)}"` : '',
    required ? 'required' : '',
    minlength ? `minlength="${h(minlength)}"` : ''
  ].filter(Boolean).join(' ');
  const control = `<input ${controlAttrs}>`;
  const labelHtml = `<label for="${h(id)}">${h(label)}</label>`;
  if (ui?.renderField) {
    return ui.renderField({
      labelHtml,
      control,
      className: ['auth-field-central', className].filter(Boolean).join(' '),
      attrs: authAttrs({ 'data-ui-component': 'auth-field', ...attrs })
    });
  }
  return `<div class="field auth-field-central ${h(className)}" data-ui-component="auth-field" data-ui-centralized="phase113-auth-access-centralization">${labelHtml}${control}</div>`;
}

function renderAuthPasswordField({ id, name, label, autocomplete, buttonId, required = true, minlength = '', className = '' }) {
  const toggle = renderAuthIconButton({
    id: buttonId,
    iconHtml: icons.eye,
    label: t('login.showPassword'),
    className: 'password-toggle auth-password-toggle-central',
    attrs: { 'data-auth-password-toggle': id, 'data-ui-component': 'auth-password-toggle' }
  });
  const control = `
    <div class="password-field auth-password-control-central" data-ui-component="auth-password-control" data-ui-centralized="phase113-auth-access-centralization">
      <input class="input" id="${h(id)}" name="${h(name || id)}" type="password" autocomplete="${h(autocomplete || 'current-password')}"${required ? ' required' : ''}${minlength ? ` minlength="${h(minlength)}"` : ''}>
      ${toggle}
    </div>
  `;
  const ui = authUi();
  const labelHtml = `<label for="${h(id)}">${h(label)}</label>`;
  if (ui?.renderField) {
    return ui.renderField({
      labelHtml,
      control,
      className: ['auth-password-field-central', className].filter(Boolean).join(' '),
      attrs: authAttrs({ 'data-ui-component': 'auth-password-field' })
    });
  }
  return `<div class="field auth-password-field-central ${h(className)}" data-ui-component="auth-password-field" data-ui-centralized="phase113-auth-access-centralization">${labelHtml}${control}</div>`;
}

function renderAuthRememberCheck() {
  const ui = authUi();
  if (ui?.renderCheckField) {
    return ui.renderCheckField({
      name: 'remember',
      checked: true,
      label: t('login.remember'),
      className: 'auth-remember-check-central',
      attrs: authAttrs({ 'data-ui-component': 'auth-remember-check' })
    });
  }
  return `<label class="check-row auth-remember-check-central" data-ui-component="auth-remember-check" data-ui-centralized="phase113-auth-access-centralization"><input type="checkbox" name="remember" checked><span>${h(t('login.remember'))}</span></label>`;
}

function renderAuthSwitch({ text, buttonId, buttonLabel, className = '', component = 'auth-switch-row' }) {
  return `
    <div class="auth-switch-inline-v3 auth-switch-central-row ${h(className)}" data-ui-component="${h(component)}" data-ui-centralized="phase113-auth-access-centralization">
      <span>${h(text)}</span>
      ${renderAuthButton({ id: buttonId, label: buttonLabel, tone: 'link', className: 'link-btn auth-switch-btn', attrs: { 'data-auth-action': buttonId } })}
    </div>
  `;
}

function renderAuthSubmit({ label, iconHtml = '', className = '' }) {
  return renderAuthButton({
    label,
    iconHtml,
    tone: 'primary',
    className: ['login-submit auth-main-submit-v3 auth-submit-central', className].filter(Boolean).join(' '),
    type: 'submit',
    attrs: { 'data-ui-component': 'auth-submit-button' }
  });
}

function renderAuthFormSurface({ id, className, body, component }) {
  const ui = authUi();
  const formClass = ['auth-card pro-auth-card auth-card-v3 auth-card-central-surface', className].filter(Boolean).join(' ');
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag: 'form',
      className: formClass,
      attrs: authAttrs({ id, 'data-ui-component': component }),
      body
    });
  }
  return `<form class="${h(formClass)}" id="${h(id)}" data-ui-component="${h(component)}" data-ui-centralized="phase113-auth-access-centralization">${body}</form>`;
}

function renderAuthVisual() {
  const ui = authUi();
  const body = `
    <div class="auth-visual-orb auth-visual-orb--one"></div>
    <div class="auth-visual-orb auth-visual-orb--two"></div>

    <div class="auth-brand-v3" data-ui-component="auth-brand-block" data-ui-centralized="phase113-auth-access-centralization">
      <div class="auth-brand-mark-v3">${h(t('app.initial', 'ف'))}</div>
      <div>
        <h1>${h(getPlatformBrandName())}</h1>
        <p>${h(getPlatformBrandSubtitle())}</p>
      </div>
    </div>

    <div class="auth-hero-v3" data-ui-component="auth-visual-copy" data-ui-centralized="phase113-auth-access-centralization">
      <span>${h(t('login.eyebrow'))}</span>
      <h2>${h(t('login.visualTitle'))}</h2>
      <p>${h(t('login.visualDescription'))}</p>
    </div>

    <div class="auth-insight-grid-v3" aria-hidden="true" data-ui-component="auth-visual-metrics" data-ui-centralized="phase113-auth-access-centralization">
      <div><b>${icon('calendar')}</b><strong>${h(t('login.visualMetricBookings', 'حجوزات'))}</strong><small>${h(t('login.visualMetricBookingsNote', 'متابعة يومية'))}</small></div>
      <div><b>${icon('building')}</b><strong>${h(t('login.visualMetricRooms', 'الغرف'))}</strong><small>${h(t('login.visualMetricRoomsNote', 'إشغال وتنظيف'))}</small></div>
      <div><b>${icon('bell')}</b><strong>${h(t('login.visualMetricAlerts', 'تنبيهات'))}</strong><small>${h(t('login.visualMetricAlertsNote', 'تشغيل فوري'))}</small></div>
    </div>
  `;
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag: 'aside',
      className: 'auth-visual auth-visual-v3 auth-visual-central-surface',
      attrs: authAttrs({ 'data-ui-component': 'auth-visual', 'aria-label': t('login.visualLabel', 'تعريف منصة فندقي') }),
      body
    });
  }
  return `<aside class="auth-visual auth-visual-v3 auth-visual-central-surface" aria-label="${h(t('login.visualLabel', 'تعريف منصة فندقي'))}" data-ui-component="auth-visual" data-ui-centralized="phase113-auth-access-centralization">${body}</aside>`;
}

function renderAuthLoginForm() {
  return renderAuthFormSurface({
    id: 'loginForm',
    className: 'auth-login-card-v3',
    component: 'auth-login-card',
    body: `
      ${renderAuthToolbar()}
      ${renderAuthHead({ eyebrow: t('login.security'), title: t('login.title'), description: t('login.description'), component: 'auth-login-head' })}
      ${renderAuthPills({
        label: t('login.loginBenefitsLabel', 'ميزات تسجيل الدخول'),
        items: [
          { icon: icon('shieldCheck'), label: t('login.loginBenefitSecure', 'دخول آمن') },
          { icon: icon('bell'), label: t('login.loginBenefitAlerts', 'تنبيهات فورية') },
          { icon: icon('building'), label: t('login.loginBenefitHotel', 'إدارة الفندق') }
        ]
      })}
      <div class="auth-form-v3 auth-login-form-v3 auth-form-central-grid" data-ui-component="auth-login-form-fields" data-ui-centralized="phase113-auth-access-centralization">
        ${renderAuthField({ id: 'email', name: 'email', type: 'email', autocomplete: 'username', required: true, label: t('login.email'), attrs: { 'data-auth-field': 'email' } })}
        ${renderAuthPasswordField({ id: 'password', name: 'password', autocomplete: 'current-password', buttonId: 'passwordToggle', label: t('login.password') })}
        <div class="auth-inline-row-v3 auth-inline-central-row" data-ui-component="auth-login-options" data-ui-centralized="phase113-auth-access-centralization">
          ${renderAuthRememberCheck()}
          ${renderAuthButton({ id: 'forgotBtn', label: t('login.forgot'), tone: 'link', className: 'link-btn auth-text-btn-v3', attrs: { 'data-auth-action': 'forgot' } })}
        </div>
        ${renderAuthSubmit({ label: t('login.button') })}
        ${renderAuthSwitch({ text: t('register.haveNoAccount', 'لا تملك حساب فندق؟'), buttonId: 'showRegisterBtn', buttonLabel: t('register.createAccount', 'إنشاء حساب جديد') })}
      </div>
    `
  });
}

function renderAuthRegisterForm() {
  return renderAuthFormSurface({
    id: 'registerForm',
    className: 'auth-register-card-v3',
    component: 'auth-register-card',
    body: `
      ${renderAuthToolbar()}
      ${renderAuthHead({
        eyebrow: t('register.eyebrow', 'تسجيل فندق جديد'),
        title: t('register.title', 'إنشاء حساب جديد'),
        description: t('register.description', 'افتح حساب فندق محلي للتجربة، ثم ادخل مباشرة إلى لوحة إدارة الفندق.'),
        className: 'auth-register-head-v3',
        component: 'auth-register-head'
      })}
      ${renderAuthPills({
        className: 'auth-register-pills-v3',
        label: t('register.benefitsLabel', 'ميزات الحساب الجديد'),
        items: [
          { icon: icon('building'), label: t('register.benefitHotel', 'حساب فندق') },
          { icon: icon('user'), label: t('register.benefitManager', 'مدير أساسي') },
          { icon: icon('shieldCheck'), label: t('register.benefitLocal', 'تخزين محلي') }
        ]
      })}
      <div class="auth-form-v3 auth-register-form-v3 auth-form-central-grid" data-ui-component="auth-register-form-fields" data-ui-centralized="phase113-auth-access-centralization">
        ${renderAuthField({ id: 'registerHotelName', name: 'hotelName', autocomplete: 'organization', required: true, label: t('register.hotelName', 'اسم الفندق') })}
        ${renderAuthField({ id: 'registerManagerName', name: 'managerName', autocomplete: 'name', required: true, label: t('register.managerName', 'اسم المدير') })}
        ${renderAuthField({ id: 'registerEmail', name: 'email', type: 'email', autocomplete: 'username', required: true, label: t('register.email', 'البريد الإلكتروني') })}
        ${renderAuthField({ id: 'registerPhone', name: 'phone', autocomplete: 'tel', label: t('register.phone', 'رقم الهاتف') })}
        ${renderAuthField({ id: 'registerCountry', name: 'country', autocomplete: 'country-name', label: t('register.country', 'الدولة') })}
        ${renderAuthField({ id: 'registerCity', name: 'city', autocomplete: 'address-level2', label: t('register.city', 'المدينة') })}
        ${renderAuthPasswordField({ id: 'registerPassword', name: 'password', autocomplete: 'new-password', buttonId: 'registerPasswordToggle', minlength: 6, label: t('register.password', 'كلمة المرور') })}
        ${renderAuthPasswordField({ id: 'registerPasswordConfirm', name: 'passwordConfirm', autocomplete: 'new-password', buttonId: 'registerPasswordConfirmToggle', minlength: 6, label: t('register.passwordConfirm', 'تأكيد كلمة المرور') })}
        ${renderAuthSubmit({ label: t('register.submit', 'إنشاء الحساب والدخول'), iconHtml: icon('building'), className: 'auth-register-submit-v3' })}
        ${renderAuthSwitch({ text: t('register.alreadyHaveAccount', 'لديك حساب بالفعل؟'), buttonId: 'showLoginBtn', buttonLabel: t('register.backToLogin', 'العودة لتسجيل الدخول'), className: 'auth-register-switch-v3' })}
      </div>
    `
  });
}

function renderAuthForgotForm() {
  const ui = authUi();
  const safeIllustration = `
    <span>${icon('shieldCheck')}</span>
    <div>
      <strong>${h(t('forgot.safeTitle', 'حماية حساب الفندق'))}</strong>
      <small>${h(t('forgot.safeText', 'في النسخة الإنتاجية سيتم إرسال رابط عبر البريد الإلكتروني.'))}</small>
    </div>
  `;
  const illustration = ui?.renderSurface
    ? ui.renderSurface({ tag: 'div', className: 'auth-reset-illustration-v3 auth-reset-central-surface', attrs: authAttrs({ 'data-ui-component': 'auth-reset-illustration', 'aria-hidden': 'true' }), body: safeIllustration })
    : `<div class="auth-reset-illustration-v3 auth-reset-central-surface" aria-hidden="true" data-ui-component="auth-reset-illustration" data-ui-centralized="phase113-auth-access-centralization">${safeIllustration}</div>`;
  return renderAuthFormSurface({
    id: 'forgotForm',
    className: 'auth-forgot-card-v3',
    component: 'auth-forgot-card',
    body: `
      ${renderAuthToolbar()}
      ${renderAuthHead({
        eyebrow: t('forgot.eyebrow', 'استعادة آمنة'),
        title: t('forgot.title', 'استعادة كلمة المرور'),
        description: t('forgot.description', 'أدخل بريد حساب الفندق، وسنعرض رسالة استعادة تجريبية مناسبة للنسخة المحلية.'),
        component: 'auth-forgot-head'
      })}
      ${illustration}
      <div class="auth-form-v3 auth-forgot-form-v3 auth-form-central-grid" data-ui-component="auth-forgot-form-fields" data-ui-centralized="phase113-auth-access-centralization">
        ${renderAuthField({ id: 'forgotEmail', name: 'email', type: 'email', autocomplete: 'username', required: true, label: t('login.email') })}
        ${renderAuthSubmit({ label: t('forgot.submit', 'إرسال تعليمات الاستعادة') })}
        ${renderAuthSwitch({ text: t('forgot.remembered', 'تذكرت كلمة المرور؟'), buttonId: 'forgotBackToLoginBtn', buttonLabel: t('register.backToLogin', 'العودة لتسجيل الدخول') })}
      </div>
    `
  });
}

function bindAuthPasswordToggle(buttonId, inputId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;
  button.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    button.innerHTML = isPassword ? icons.eyeOff : icons.eye;
    button.setAttribute('aria-label', isPassword ? t('login.hidePassword') : t('login.showPassword'));
    button.setAttribute('title', isPassword ? t('login.hidePassword') : t('login.showPassword'));
  });
}

function bindAuthLanguageButton() {
  const languageBtn = document.getElementById('languageBtn');
  if (!languageBtn) return;
  languageBtn.addEventListener('click', async () => {
    await i18n.toggle();
    render();
  });
}


function activateNewHotelTrialSubscription(hotel) {
  if (!hotel?.id || typeof readSubscriptions !== 'function' || typeof writeSubscriptions !== 'function') return;
  const trialPackage = typeof ensurePlatformTrialPackage === 'function'
    ? ensurePlatformTrialPackage()
    : { id: 'trial', name: t('package.defaultTrial.name', 'باقة تجريبية مجانية'), durationDays: 7, price: 0, currency: readPlatformSettings().defaultCurrency || 'USD' };
  const startDate = todayISO();
  const durationDays = 7;
  const endDate = typeof calculateSubscriptionEndDate === 'function'
    ? calculateSubscriptionEndDate(startDate, durationDays)
    : startDate;
  const subscriptions = readSubscriptions();
  const existingIndex = subscriptions.findIndex(subscription => subscription.hotelId === hotel.id);
  const trialSubscription = {
    id: existingIndex >= 0 ? subscriptions[existingIndex].id : createId('subscription'),
    hotelId: hotel.id,
    packageId: trialPackage.id || 'trial',
    packageName: trialPackage.name || t('package.defaultTrial.name', 'باقة تجريبية مجانية'),
    plan: trialPackage.id || 'trial',
    durationDays,
    status: 'trial',
    startDate,
    endDate,
    monthlyAmount: trialPackage.price || 0,
    currency: trialPackage.currency || readPlatformSettings().defaultCurrency || 'USD',
    paymentStatus: 'trial',
    notes: t('subscription.trial.autoNotes', 'اشتراك تجريبي تلقائي لمدة 7 أيام عند إنشاء الحساب.'),
    createdAt: todayISO(),
    updatedAt: todayISO()
  };
  if (existingIndex >= 0) subscriptions[existingIndex] = { ...subscriptions[existingIndex], ...trialSubscription };
  else subscriptions.push(trialSubscription);
  writeSubscriptions(subscriptions);
}

function registerNewHotelAccount(data) {
  const email = normalizeEmail(data.email);
  const password = normalizePassword(data.password);
  const passwordConfirm = normalizePassword(data.passwordConfirm);
  const hotelName = String(data.hotelName || '').trim();
  const managerName = String(data.managerName || '').trim();
  if (!hotelName || !managerName || !email || !password) {
    toast(t('register.validationRequired', 'يرجى تعبئة الحقول الأساسية'));
    return;
  }
  if (password.length < 6) {
    toast(t('register.validationPasswordLength', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'));
    return;
  }
  if (password !== passwordConfirm) {
    toast(t('register.validationPasswordMatch', 'كلمتا المرور غير متطابقتين'));
    return;
  }
  if (findLoginUser(email, password) || readHotels().some(hotel => normalizeEmail(hotel.managerEmail || hotel.email) === email)) {
    toast(t('register.validationDuplicateEmail', 'يوجد حساب بهذا البريد الإلكتروني بالفعل'));
    return;
  }
  const hotels = readHotels();
  const id = createId('hotel');
  const hotel = {
    id,
    name: hotelName,
    country: String(data.country || '').trim(),
    city: String(data.city || '').trim(),
    address: '',
    phone: String(data.phone || '').trim(),
    email,
    status: 'active',
    createdAt: todayISO(),
    updatedAt: todayISO(),
    managerName,
    managerEmail: email,
    managerPassword: password,
    managerStatus: 'active',
    managerPhotoDataUrl: '',
    managerPhotoFileName: ''
  };
  writeHotels([...hotels, hotel]);
  activateNewHotelTrialSubscription(hotel);
  const user = {
    email,
    name: managerName,
    role: 'hotel_manager',
    hotelId: id,
    hotelName,
    photoDataUrl: ''
  };
  persistUser(user);
  toast(t('register.toastCreated', 'تم إنشاء الحساب وتسجيل الدخول بنجاح'));
  removeStorageKey('fandqi.authMode');
  render();
}

function renderLogin() {
  const mode = ['register', 'forgot'].includes(state.authMode) ? state.authMode : 'login';
  const authTitle = mode === 'register'
    ? t('register.title', 'إنشاء حساب جديد')
    : (mode === 'forgot' ? t('forgot.title', 'استعادة كلمة المرور') : t('login.title'));
  const authForm = mode === 'register'
    ? renderAuthRegisterForm()
    : (mode === 'forgot' ? renderAuthForgotForm() : renderAuthLoginForm());
  app.innerHTML = `
    <main class="auth-shell pro-auth-shell auth-shell--${h(mode)} auth-shell-v3 auth-shell-central-page" data-ui-page="auth-${h(mode)}" data-ui-component="auth-shell" data-ui-centralized="phase113-auth-access-centralization">
      <section class="auth-layout auth-layout--${h(mode)} auth-layout-v3 auth-layout-central" aria-label="${h(authTitle)}" data-ui-component="auth-layout" data-ui-centralized="phase113-auth-access-centralization">
        ${renderAuthVisual()}
        ${authForm}
      </section>
    </main>
  `;

  bindAuthLanguageButton();
  bindAuthPasswordToggle('passwordToggle', 'password');
  bindAuthPasswordToggle('registerPasswordToggle', 'registerPassword');
  bindAuthPasswordToggle('registerPasswordConfirmToggle', 'registerPasswordConfirm');

  const forgotBtn = document.getElementById('forgotBtn');
  if (forgotBtn) forgotBtn.addEventListener('click', () => setAuthMode('forgot'));

  const forgotBackToLoginBtn = document.getElementById('forgotBackToLoginBtn');
  if (forgotBackToLoginBtn) forgotBackToLoginBtn.addEventListener('click', () => setAuthMode('login'));

  const showRegisterBtn = document.getElementById('showRegisterBtn');
  if (showRegisterBtn) showRegisterBtn.addEventListener('click', () => setAuthMode('register'));

  const showLoginBtn = document.getElementById('showLoginBtn');
  if (showLoginBtn) showLoginBtn.addEventListener('click', () => setAuthMode('login'));

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const user = findLoginUser(data.email, data.password);
    if (!user) {
      toast(t('login.error'));
      return;
    }
    persistUser(user);
    toast(t('toast.loginSuccess'));
    removeStorageKey('fandqi.authMode');
    render();
  });

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', event => {
    event.preventDefault();
    registerNewHotelAccount(Object.fromEntries(new FormData(event.currentTarget).entries()));
  });

  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) forgotForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const email = normalizeEmail(data.email);
    const exists = findLoginUser(email, '') || readHotels().some(hotel => normalizeEmail(hotel.managerEmail || hotel.email) === email);
    toast(exists
      ? t('forgot.toastSent', 'تم تجهيز تعليمات الاستعادة لهذا البريد في النسخة المحلية')
      : t('forgot.toastCheckEmail', 'إذا كان البريد موجودًا ستصلك تعليمات الاستعادة'));
    setAuthMode('login');
  });
}

function renderShell() {
  const user = state.currentUser;
  const role = user?.role || 'platform_owner';
  const hotel = isHotelOperationalRole(role) ? getManagerHotel() : null;
  const currentStaff = user?.staffId ? getStaffById(user.staffId) : null;
  const userPhotoDataUrl = user?.staffId
    ? (currentStaff?.photoDataUrl || user?.photoDataUrl || '')
    : (role === 'hotel_manager' ? (getManagerHotel()?.managerPhotoDataUrl || user?.photoDataUrl || '') : (user?.photoDataUrl || ''));
  const navItems = getRoleNavItems(role);
  const activePage = getActivePage(role);

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="brand sidebar-brand">
            ${getBrandMarkMarkup()}
            <div>
              <h2 class="brand-title">${h(getPlatformBrandName())}</h2>
              <p class="brand-subtitle">${h(getRoleLabel(role))}</p>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="${h(getRoleLabel(role))}">
          ${navItems.map((item, index) => `
            <button class="nav-item ${item === activePage ? 'active' : ''}" type="button" data-page="${h(item)}">
              <span class="nav-icon">${getNavIcon(item)}</span>
              <span>${h(t(`nav.${item}`))}</span>
            </button>
          `).join('')}
        </nav>
      </aside>

      <button class="mobile-sidebar-backdrop" type="button" id="mobileSidebarBackdrop" aria-label="${h(t('topbar.closeNavigation', 'إغلاق القائمة'))}"></button>

      <main class="main">
        <header class="topbar">
          <button class="icon-btn mobile-menu-btn" type="button" id="mobileNavBtn" aria-label="${h(t('topbar.openNavigation', 'فتح القائمة'))}" title="${h(t('topbar.openNavigation', 'فتح القائمة'))}">${icons.menu}</button>
          <div class="topbar-title topbar-title--logo-only">
            ${renderTopbarMainLogo(hotel, role)}
          </div>
          <div class="topbar-actions">
            <button class="icon-btn topbar-refresh-btn" type="button" id="refreshAppBtn" aria-label="${h(t('topbar.refresh', 'تحديث'))}" title="${h(t('topbar.refresh', 'تحديث'))}">${icons.refreshCw}</button>
            ${renderTopbarNotifications(role)}
            <button class="icon-btn" type="button" id="languageBtn" aria-label="${h(t('topbar.languageIconLabel'))}" title="${h(t('topbar.languageIconLabel'))}">${icons.globe}</button>
            <button class="btn danger small" id="logoutBtn">${h(t('topbar.logout'))}</button>
          </div>
        </header>

        <section class="content">
          <div class="page-shell workspace-blank">${renderWorkspace(activePage, role)}</div>
        </section>
      </main>
    </div>
  `;

  const closeMobileNavigation = () => document.body.classList.remove('mobile-nav-open');
  const mobileNavBtn = document.getElementById('mobileNavBtn');
  const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');
  if (mobileNavBtn) {
    mobileNavBtn.addEventListener('click', () => {
      document.body.classList.toggle('mobile-nav-open');
    });
  }
  if (mobileSidebarBackdrop) mobileSidebarBackdrop.addEventListener('click', closeMobileNavigation);

  document.querySelectorAll('.nav-item[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      closeMobileNavigation();
      setActivePage(button.dataset.page);
    });
  });

  document.getElementById('languageBtn').addEventListener('click', async () => {
    await i18n.toggle();
    render();
  });
  const refreshAppBtn = document.getElementById('refreshAppBtn');
  if (refreshAppBtn) refreshAppBtn.addEventListener('click', () => { state.topbarNotificationsOpen = false; render(); toast(t('topbar.refreshDone', 'تم تحديث الواجهة')); });
  document.getElementById('logoutBtn').addEventListener('click', () => { closeMobileNavigation(); logout(); });
  bindTopbarNotificationEvents(role);
  bindWorkspaceEvents(activePage, role);
}


function refreshHotelsTable() {
  const slot = document.getElementById('hotelsTableSlot');
  if (!slot) return;
  slot.innerHTML = renderHotelsTable(getFilteredHotels());
  applyCentralDesignSystem(slot);
  bindHotelRowActions();
}

function bindHotelRowActions() {
  document.querySelectorAll('[data-action="view-hotel"]').forEach(button => {
    button.addEventListener('click', () => openHotelModal('view', button.dataset.id));
  });
  document.querySelectorAll('[data-action="edit-hotel"]').forEach(button => {
    button.addEventListener('click', () => openHotelModal('edit', button.dataset.id));
  });
  document.querySelectorAll('[data-action="manager-hotel"]').forEach(button => {
    button.addEventListener('click', () => openHotelModal('manager', button.dataset.id));
  });
  document.querySelectorAll('[data-action="toggle-hotel"]').forEach(button => {
    button.addEventListener('click', () => {
      const hotels = readHotels().map(hotel => {
        if (hotel.id !== button.dataset.id) return hotel;
        return { ...hotel, status: hotel.status === 'active' ? 'suspended' : 'active', updatedAt: todayISO() };
      });
      writeHotels(hotels);
      refreshHotelsTable();
    });
  });
  document.querySelectorAll('[data-action="archive-hotel"]').forEach(button => {
    button.addEventListener('click', () => {
      const hotels = readHotels().map(hotel => hotel.id === button.dataset.id ? { ...hotel, status: 'archived', updatedAt: todayISO() } : hotel);
      writeHotels(hotels);
      refreshHotelsTable();
    });
  });
}

