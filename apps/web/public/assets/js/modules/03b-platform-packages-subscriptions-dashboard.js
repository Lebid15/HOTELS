const PACKAGE_STORAGE_KEY = 'fandqi.subscriptionPackages';

const DEFAULT_TRIAL_PACKAGE_ID = 'trial';

function getDefaultTrialPackageTemplate() {
  const settings = typeof readPlatformSettings === 'function' ? readPlatformSettings() : {};
  return {
    id: DEFAULT_TRIAL_PACKAGE_ID,
    name: t('package.defaultTrial.name', 'باقة تجريبية مجانية'),
    description: t('package.defaultTrial.description', 'باقة تلقائية لمدة 7 أيام لكل فندق جديد حتى يبدأ العمل مباشرة دون إيقاف.'),
    status: 'active',
    durationDays: 7,
    price: 0,
    currency: settings.defaultCurrency || 'USD',
    maxUsers: 1,
    maxRooms: 20,
    restaurantSupport: 'yes',
    reportsSupport: 'yes',
    trialSupport: 'yes',
    notes: t('package.defaultTrial.notes', 'تُفعّل تلقائيًا عند تسجيل فندق جديد.'),
    createdAt: todayISO(),
    updatedAt: todayISO()
  };
}

function normalizePlatformTrialPackage(packages) {
  const source = Array.isArray(packages) ? [...packages] : [];
  const template = getDefaultTrialPackageTemplate();
  const index = source.findIndex(packageItem => packageItem?.id === DEFAULT_TRIAL_PACKAGE_ID);
  if (index < 0) return { packages: [template, ...source], changed: true, trialPackage: template };
  const current = source[index] || {};
  const next = {
    ...current,
    id: DEFAULT_TRIAL_PACKAGE_ID,
    name: current.name || template.name,
    description: current.description || template.description,
    status: 'active',
    durationDays: 7,
    price: Number(current.price || 0) > 0 ? current.price : 0,
    currency: current.currency || template.currency,
    maxUsers: current.maxUsers || template.maxUsers,
    maxRooms: current.maxRooms || template.maxRooms,
    restaurantSupport: current.restaurantSupport || template.restaurantSupport,
    reportsSupport: current.reportsSupport || template.reportsSupport,
    trialSupport: 'yes',
    notes: current.notes || template.notes,
    createdAt: current.createdAt || template.createdAt,
    updatedAt: todayISO()
  };
  const changed = JSON.stringify(current) !== JSON.stringify(next);
  if (changed) source[index] = next;
  return { packages: source, changed, trialPackage: next };
}

function ensurePlatformTrialPackage() {
  const raw = readStorageJson(PACKAGE_STORAGE_KEY, []);
  const normalized = normalizePlatformTrialPackage(Array.isArray(raw) ? raw : []);
  if (normalized.changed) writeStorageJson(PACKAGE_STORAGE_KEY, normalized.packages);
  return normalized.trialPackage;
}

function readPackages() {
  try {
    const value = readStorageJson(PACKAGE_STORAGE_KEY, []);
    const normalized = normalizePlatformTrialPackage(Array.isArray(value) ? value : []);
    if (normalized.changed) writeStorageJson(PACKAGE_STORAGE_KEY, normalized.packages);
    return normalized.packages;
  } catch {
    return [];
  }
}

function writePackages(packages) {
  const normalized = normalizePlatformTrialPackage(packages);
  writeStorageJson(PACKAGE_STORAGE_KEY, normalized.packages);
}

function getPackageById(id) {
  return readPackages().find(packageItem => packageItem.id === id) || null;
}

function getActivePackages() {
  return readPackages().filter(packageItem => packageItem.status === 'active');
}

function getFilteredPackages() {
  const filters = state.packageFilters;
  const search = filters.search.trim().toLowerCase();
  return readPackages().filter(packageItem => {
    const matchesSearch = !search || [packageItem.name, packageItem.description, packageItem.currency, packageItem.notes]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesStatus = filters.status === 'all' || packageItem.status === filters.status;
    return matchesSearch && matchesStatus;
  });
}

function getPackageStatusLabel(status) {
  return t(`package.status.${status}`, status);
}

function getPackageBooleanLabel(value) {
  return t(`package.boolean.${value === 'yes' ? 'yes' : 'no'}`);
}

function formatPackagePrice(packageItem) {
  if (!packageItem) return '-';
  return `${packageItem.price || 0} ${packageItem.currency || ''}`.trim();
}

function openPackageModal(mode, id = null) {
  state.packageModal = { mode, id };
  render();
}

function closePackageModal() {
  state.packageModal = null;
  render();
}

function platformPackagesUi() {
  return window.FandqiUI || null;
}

function renderPlatformPackageAttrs(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${h(name)}` : ` ${h(name)}="${h(value)}"`)
    .join('');
}

function renderPlatformPackageButton({ label = '', tone = 'primary', iconName = '', size = '', className = '', attrs = {}, disabled = false, type = 'button' } = {}) {
  const ui = platformPackagesUi();
  const iconHtml = iconName ? icon(iconName) : '';
  if (ui?.renderButton) {
    return ui.renderButton({ label, tone, size, icon: iconHtml, className, attrs, disabled, type });
  }
  return `<button class="btn ${h(tone)} ${h(size)} ${h(className)}" type="${h(type)}"${renderPlatformPackageAttrs({ disabled, ...attrs })}>${iconHtml}${h(label)}</button>`;
}

function renderPlatformPackageIconButton({ iconName = 'x', action = '', label = '', tone = 'neutral', className = '' } = {}) {
  const ui = platformPackagesUi();
  const iconHtml = icon(iconName);
  if (ui?.renderIconButton) return ui.renderIconButton({ icon: iconHtml, action, label, tone, className });
  return renderPlatformPackageButton({ label: '', tone, iconName, className: `icon-btn ${className}`, attrs: { 'data-action': action, 'aria-label': label } });
}

function renderPlatformPackageBadge(status, label, className = '') {
  const ui = platformPackagesUi();
  if (ui?.renderBadge) return ui.renderBadge({ status, label, className });
  return `<span class="status-badge ${h(status)} ${h(className)}" data-status="${h(status)}">${h(label)}</span>`;
}

function renderPlatformPackageEmptyState(title, text, className = 'hotels-empty') {
  const ui = platformPackagesUi();
  if (ui?.renderEmptyState) return ui.renderEmptyState({ title, text, className });
  return `<div class="empty-panel ${h(className)}"><div><h2>${h(title)}</h2><p>${h(text)}</p></div></div>`;
}

function renderPackagesTable(packages) {
  if (!packages.length) {
    return renderPlatformPackageEmptyState(t('package.emptyTitle'), t('package.emptyText'));
  }

  return `
    <div class="platform-owner-cards-grid platform-owner-package-cards" data-platform-owner-view="cards">
      ${packages.map(packageItem => {
        const status = packageItem.status || 'suspended';
        const limits = [
          `${t('package.form.maxUsers')}: ${packageItem.maxUsers || '-'}`,
          `${t('package.form.maxRooms')}: ${packageItem.maxRooms || '-'}`
        ];
        const features = [
          `${t('package.form.restaurantSupport')}: ${getPackageBooleanLabel(packageItem.restaurantSupport)}`,
          `${t('package.form.reportsSupport')}: ${getPackageBooleanLabel(packageItem.reportsSupport)}`,
          `${t('package.form.trialSupport')}: ${getPackageBooleanLabel(packageItem.trialSupport)}`
        ];
        return `
          <article class="platform-owner-card platform-owner-card--package platform-owner-card--${h(status)}">
            <div class="platform-owner-card-top">
              <div class="platform-owner-identity">
                <div class="platform-owner-card-icon">${icon('package')}</div>
                <div>
                  <span class="platform-owner-kicker">${h(t('package.columns.name'))}</span>
                  <h3>${h(packageItem.name || '-')}</h3>
                  <p>${h(packageItem.description || '-')}</p>
                </div>
              </div>
              ${renderPlatformPackageBadge(status, getPackageStatusLabel(status))}
            </div>

            <div class="platform-owner-package-price">
              <span>${h(t('package.columns.price'))}</span>
              <strong>${h(formatPackagePrice(packageItem))}</strong>
              <small>${h(packageItem.durationDays || '-')} ${h(t('package.units.days'))}</small>
            </div>

            <div class="platform-owner-pill-row">
              ${limits.map(item => `<span>${h(item)}</span>`).join('')}
            </div>

            <div class="platform-owner-feature-list">
              ${features.map(item => `<div>${icon('checkCircle')}<span>${h(item)}</span></div>`).join('')}
            </div>

            <div class="platform-owner-meta-grid platform-owner-meta-grid--single">
              <div>${icon('calendar')}<span>${h(t('package.columns.updatedAt'))}</span><strong>${h(packageItem.updatedAt || packageItem.createdAt || '-')}</strong></div>
            </div>

            <div class="platform-owner-card-actions">
              ${renderPlatformPackageButton({ label: t('package.actions.view'), tone: 'ghost', size: 'small', attrs: { 'data-action': 'view-package', 'data-id': packageItem.id } })}
              ${renderPlatformPackageButton({ label: t('package.actions.edit'), tone: 'ghost', size: 'small', attrs: { 'data-action': 'edit-package', 'data-id': packageItem.id } })}
              ${renderPlatformPackageButton({ label: packageItem.status === 'active' ? t('package.actions.suspend') : t('package.actions.activate'), tone: 'ghost', size: 'small', attrs: { 'data-action': 'toggle-package', 'data-id': packageItem.id } })}
              ${renderPlatformPackageButton({ label: t('package.actions.archive'), tone: 'danger', size: 'small', attrs: { 'data-action': 'archive-package', 'data-id': packageItem.id } })}
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderPackageFormModal(mode, packageItem) {
  const isEdit = mode === 'edit';
  const current = packageItem || {
    status: 'active',
    durationDays: 30,
    price: '',
    currency: 'USD',
    maxUsers: 1,
    maxRooms: '',
    restaurantSupport: 'no',
    reportsSupport: 'yes',
    trialSupport: 'no'
  };

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card" id="packageForm" data-mode="${h(mode)}" data-id="${h(current.id || '')}">
        <div class="modal-head">
          <h2>${h(isEdit ? t('package.modal.editTitle') : t('package.modal.addTitle'))}</h2>
          ${renderPlatformPackageIconButton({ iconName: 'x', action: 'close-package-modal', label: t('common.close') })}
        </div>

        <div class="form-section-title">${h(t('package.form.packageInfo'))}</div>
        <div class="modal-grid">
          <div class="field">${fieldLabel('package', h(t('package.form.name')))}<input class="input" name="name" value="${h(current.name || '')}" required></div>
          <div class="field">${fieldLabel('calculator', h(t('package.form.durationDays')))}<input class="input" type="number" min="1" step="1" name="durationDays" value="${h(current.durationDays || 30)}" required></div>
          <div class="field">${fieldLabel('creditCard', h(t('package.form.price')))}<input class="input" type="number" min="0" step="0.01" name="price" value="${h(current.price || '')}"></div>
          <div class="field">${fieldLabel('currency', h(t('package.form.currency')))}
            <select class="select" name="currency">
              ${['USD', 'TRY', 'EUR', 'SAR', 'AED'].map(currency => `<option value="${h(currency)}" ${current.currency === currency ? 'selected' : ''}>${h(currency)}</option>`).join('')}
            </select>
          </div>
          <div class="field">${fieldLabel('status', h(t('package.form.status')))}
            <select class="select" name="status">
              ${['active', 'suspended'].map(status => `<option value="${h(status)}" ${current.status === status ? 'selected' : ''}>${h(getPackageStatusLabel(status))}</option>`).join('')}
            </select>
          </div>
          <div class="field">${fieldLabel('users', h(t('package.form.maxUsers')))}<input class="input" type="number" min="1" step="1" name="maxUsers" value="${h(current.maxUsers || 1)}"></div>
          <div class="field">${fieldLabel('building', h(t('package.form.maxRooms')))}<input class="input" type="number" min="0" step="1" name="maxRooms" value="${h(current.maxRooms || '')}"></div>
          <div class="field">${fieldLabel('package', h(t('package.form.restaurantSupport')))}
            <select class="select" name="restaurantSupport">
              ${['yes', 'no'].map(value => `<option value="${h(value)}" ${current.restaurantSupport === value ? 'selected' : ''}>${h(getPackageBooleanLabel(value))}</option>`).join('')}
            </select>
          </div>
          <div class="field">${fieldLabel('dashboard', h(t('package.form.reportsSupport')))}
            <select class="select" name="reportsSupport">
              ${['yes', 'no'].map(value => `<option value="${h(value)}" ${current.reportsSupport === value ? 'selected' : ''}>${h(getPackageBooleanLabel(value))}</option>`).join('')}
            </select>
          </div>
          <div class="field">${fieldLabel('badgePercent', h(t('package.form.trialSupport')))}
            <select class="select" name="trialSupport">
              ${['yes', 'no'].map(value => `<option value="${h(value)}" ${current.trialSupport === value ? 'selected' : ''}>${h(getPackageBooleanLabel(value))}</option>`).join('')}
            </select>
          </div>
          <div class="field field-full">${fieldLabel('fileText', h(t('package.form.description')))}<textarea class="input textarea" name="description" rows="2">${h(current.description || '')}</textarea></div>
          <div class="field field-full">${fieldLabel('notes', h(t('package.form.notes')))}<textarea class="input textarea" name="notes" rows="3">${h(current.notes || '')}</textarea></div>
        </div>

        <div class="modal-actions">
          ${renderPlatformPackageButton({ label: t('common.cancel'), tone: 'ghost', attrs: { 'data-action': 'close-package-modal' } })}
          ${renderPlatformPackageButton({ label: t('common.save'), tone: 'primary', type: 'submit' })}
        </div>
      </form>
    </div>
  `;
}

function renderPackageViewModal(packageItem) {
  if (!packageItem) return '';
  const items = [
    ['package.form.name', packageItem.name],
    ['package.form.description', packageItem.description || '-'],
    ['package.form.durationDays', `${packageItem.durationDays || '-'} ${t('package.units.days')}`],
    ['package.form.price', formatPackagePrice(packageItem)],
    ['package.form.status', getPackageStatusLabel(packageItem.status)],
    ['package.form.maxUsers', packageItem.maxUsers || '-'],
    ['package.form.maxRooms', packageItem.maxRooms || '-'],
    ['package.form.restaurantSupport', getPackageBooleanLabel(packageItem.restaurantSupport)],
    ['package.form.reportsSupport', getPackageBooleanLabel(packageItem.reportsSupport)],
    ['package.form.trialSupport', getPackageBooleanLabel(packageItem.trialSupport)],
    ['package.columns.updatedAt', packageItem.updatedAt || packageItem.createdAt || '-'],
    ['package.form.notes', packageItem.notes || '-']
  ];

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-head">
          <h2>${h(t('package.modal.viewTitle'))}</h2>
          ${renderPlatformPackageIconButton({ iconName: 'x', action: 'close-package-modal', label: t('common.close') })}
        </div>
        <div class="details-grid">
          ${items.map(([label, value]) => `
            <div class="detail-item">
              <span>${h(t(label))}</span>
              <strong>${h(value || '-')}</strong>
            </div>
          `).join('')}
        </div>
        <div class="modal-actions">
          ${renderPlatformPackageButton({ label: t('common.close'), tone: 'primary', attrs: { 'data-action': 'close-package-modal' } })}
        </div>
      </div>
    </div>
  `;
}

function renderPackageModal() {
  if (!state.packageModal) return '';
  const { mode, id } = state.packageModal;
  const packageItem = id ? getPackageById(id) : null;
  if (mode === 'view') return renderPackageViewModal(packageItem);
  return renderPackageFormModal(mode, packageItem);
}

function renderPackagesPage() {
  const packages = getFilteredPackages();
  return `
    <div class="hotels-page packages-page">
      <div class="section-head">
        <div>
          <h2>${h(t('page.packages'))}</h2>
        </div>
        ${renderPlatformPackageButton({ label: t('package.actions.add'), tone: 'primary', iconName: 'package', attrs: { id: 'addPackageBtn' } })}
      </div>

      <div class="filters-bar">
        <div class="field"><label>${h(t('package.filters.search'))}</label><input class="input" id="packageSearch" value="${h(state.packageFilters.search)}" autocomplete="off"></div>
        <div class="field"><label>${h(t('package.filters.status'))}</label>
          <select class="select" id="packageStatusFilter">
            <option value="all" ${state.packageFilters.status === 'all' ? 'selected' : ''}>${h(t('package.filters.all'))}</option>
            <option value="active" ${state.packageFilters.status === 'active' ? 'selected' : ''}>${h(t('package.status.active'))}</option>
            <option value="suspended" ${state.packageFilters.status === 'suspended' ? 'selected' : ''}>${h(t('package.status.suspended'))}</option>
            <option value="archived" ${state.packageFilters.status === 'archived' ? 'selected' : ''}>${h(t('package.status.archived'))}</option>
          </select>
        </div>
      </div>

      <div id="packagesTableSlot">${renderPackagesTable(packages)}</div>
      ${renderPackageModal()}
    </div>
  `;
}

const SUBSCRIPTION_STORAGE_KEY = 'fandqi.subscriptions';
const LEGACY_SUBSCRIPTION_PLAN_DAYS = {
  trial: 7,
  basic: 30,
  professional: 30,
  premium: 30
};

function getSubscriptionPlanDays(packageId) {
  const packageItem = getPackageById(packageId);
  if (packageItem?.durationDays) return Number(packageItem.durationDays);
  return LEGACY_SUBSCRIPTION_PLAN_DAYS[packageId] || 30;
}

function calculateSubscriptionEndDate(startDate, durationDays) {
  if (!startDate) return '';
  const days = Math.max(1, Number(durationDays || 1));
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateOnly(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSubscriptionRemainingDays(subscription) {
  if (!subscription?.endDate) return null;
  const today = getDateOnly(todayISO());
  const endDate = getDateOnly(subscription.endDate);
  if (!today || !endDate) return null;
  return Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
}

function getSubscriptionRemainingLabel(subscription) {
  const days = getSubscriptionRemainingDays(subscription);
  if (days === null) return '-';
  if (days < 0) return t('subscription.remaining.expired');
  if (days === 0) return t('subscription.remaining.today');
  return `${days} ${t('subscription.remaining.day')}`;
}

function getSubscriptionRemainingClass(subscription, status) {
  if (!subscription) return 'not_set';
  if (status === 'suspended') return 'suspended';
  const days = getSubscriptionRemainingDays(subscription);
  if (days === null) return 'not_set';
  if (days < 0) return 'expired';
  return 'active';
}

function normalizeSubscriptionStatus(status, endDate) {
  if (status === 'suspended') return 'suspended';
  if (endDate && endDate < todayISO()) return 'expired';
  return status === 'trial' ? 'trial' : 'active';
}

function readSubscriptions() {
  try {
    const value = readStorageJson(SUBSCRIPTION_STORAGE_KEY, []);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeSubscriptions(subscriptions) {
  writeStorageJson(SUBSCRIPTION_STORAGE_KEY, subscriptions);
}

function getSubscriptionByHotelId(hotelId) {
  return readSubscriptions().find(subscription => subscription.hotelId === hotelId) || null;
}

function getSubscriptionStatus(subscription) {
  if (!subscription) return 'not_set';
  if (subscription.status === 'suspended') return 'suspended';
  if (subscription.endDate && subscription.endDate < todayISO()) return 'expired';
  if (subscription.status === 'trial') return 'trial';
  return 'active';
}

function getSubscriptionRows() {
  const subscriptions = readSubscriptions();
  return readHotels()
    .filter(hotel => hotel.status !== 'archived')
    .map(hotel => {
      const subscription = subscriptions.find(item => item.hotelId === hotel.id) || null;
      const packageItem = subscription ? getPackageById(subscription.packageId || subscription.plan) : null;
      const status = getSubscriptionStatus(subscription);
      return {
        hotel,
        subscription,
        packageItem,
        status,
        plan: subscription?.packageId || subscription?.plan || 'not_set',
        paymentStatus: subscription?.paymentStatus || 'unpaid'
      };
    });
}

function getFilteredSubscriptions() {
  const filters = state.subscriptionFilters;
  const search = filters.search.trim().toLowerCase();
  return getSubscriptionRows().filter(row => {
    const hotel = row.hotel;
    const subscription = row.subscription || {};
    const packageName = row.packageItem?.name || subscription.packageName || subscription.plan;
    const matchesSearch = !search || [hotel.name, hotel.country, hotel.city, hotel.managerName, hotel.email, packageName, subscription.currency]
      .some(value => String(value || '').toLowerCase().includes(search));
    const matchesStatus = filters.status === 'all' || row.status === filters.status;
    const matchesPlan = filters.plan === 'all' || row.plan === filters.plan;
    return matchesSearch && matchesStatus && matchesPlan;
  });
}

function openSubscriptionModal(mode, hotelId = null) {
  state.subscriptionModal = { mode, hotelId };
  render();
}

function closeSubscriptionModal() {
  state.subscriptionModal = null;
  render();
}

function getSubscriptionStatusLabel(status) {
  return t(`subscription.status.${status}`, status);
}

function getSubscriptionPlanLabel(packageId) {
  if (!packageId || packageId === 'not_set') return t('subscription.plan.not_set');
  const packageItem = getPackageById(packageId);
  return packageItem?.name || t(`subscription.plan.${packageId}`, packageId);
}

function getPaymentStatusLabel(status) {
  return t(`subscription.payment.${status}`, status);
}

function formatSubscriptionPrice(subscription) {
  if (!subscription || !subscription.monthlyAmount) return '-';
  return `${subscription.monthlyAmount} ${subscription.currency || ''}`.trim();
}

function renderSubscriptionsTable(rows) {
  if (!readHotels().filter(hotel => hotel.status !== 'archived').length) {
    return `
      <div class="empty-panel hotels-empty">
        <div>
          <h2>${h(t('subscription.emptyNoHotelsTitle'))}</h2>
          <p>${h(t('subscription.emptyNoHotelsText'))}</p>
        </div>
      </div>
    `;
  }

  if (!getActivePackages().length) {
    return `
      <div class="empty-panel hotels-empty">
        <div>
          <h2>${h(t('subscription.emptyNoPackagesTitle'))}</h2>
          <p>${h(t('subscription.emptyNoPackagesText'))}</p>
        </div>
      </div>
    `;
  }

  if (!rows.length) {
    return `
      <div class="empty-panel hotels-empty">
        <div>
          <h2>${h(t('subscription.emptyFilteredTitle'))}</h2>
          <p>${h(t('subscription.emptyFilteredText'))}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="platform-owner-cards-grid platform-owner-subscription-cards" data-platform-owner-view="cards">
      ${rows.map(row => {
        const hotel = row.hotel;
        const subscription = row.subscription;
        const planClass = subscription ? (row.packageItem?.status === 'active' ? 'active' : 'suspended') : 'not_set';
        const location = [hotel.country, hotel.city].filter(Boolean).join(' / ') || '-';
        const period = subscription ? `${subscription.startDate || '-'} → ${subscription.endDate || '-'}` : '-';
        return `
          <article class="platform-owner-card platform-owner-card--subscription platform-owner-card--${h(row.status)}">
            <div class="platform-owner-card-top">
              <div class="platform-owner-identity">
                <div class="platform-owner-card-icon">${icon('shieldCheck')}</div>
                <div>
                  <span class="platform-owner-kicker">${h(t('subscription.columns.hotel'))}</span>
                  <h3>${h(hotel.name || '-')}</h3>
                  <p>${h(location)}</p>
                </div>
              </div>
              <span class="status-badge ${h(row.status)}">${h(getSubscriptionStatusLabel(row.status))}</span>
            </div>

            <div class="platform-owner-subscription-plan">
              <span class="status-badge ${h(planClass)}">${h(getSubscriptionPlanLabel(row.plan))}</span>
              ${subscription ? `<span class="status-badge ${h(getSubscriptionRemainingClass(subscription, row.status))}">${h(getSubscriptionRemainingLabel(subscription))}</span>` : ''}
            </div>

            <div class="platform-owner-meta-grid">
              <div>${icon('calendar')}<span>${h(t('subscription.columns.period'))}</span><strong>${h(period)}</strong></div>
              <div>${icon('creditCard')}<span>${h(t('subscription.columns.amount'))}</span><strong>${h(formatSubscriptionPrice(subscription))}</strong></div>
              <div>${icon('receipt')}<span>${h(t('subscription.columns.payment'))}</span><strong>${h(subscription ? getPaymentStatusLabel(subscription.paymentStatus || 'unpaid') : '-')}</strong></div>
              <div>${icon('calendar')}<span>${h(t('subscription.columns.updatedAt'))}</span><strong>${h(subscription?.updatedAt || '-')}</strong></div>
            </div>

            <div class="platform-owner-card-actions platform-owner-card-actions--compact">
              <button class="btn small ghost" type="button" data-action="edit-subscription" data-id="${h(hotel.id)}">${h(subscription ? t('subscription.actions.edit') : t('subscription.actions.setup'))}</button>
              ${subscription ? `<button class="btn small ghost" type="button" data-action="view-subscription" data-id="${h(hotel.id)}">${h(t('subscription.actions.view'))}</button>` : ''}
              ${subscription ? `<button class="btn small ghost" type="button" data-action="renew-subscription" data-id="${h(hotel.id)}">${h(t('subscription.actions.renew'))}</button>` : ''}
              ${subscription && row.status !== 'expired' ? `<button class="btn small ghost" type="button" data-action="toggle-subscription" data-id="${h(hotel.id)}">${h(row.status === 'suspended' ? t('subscription.actions.activate') : t('subscription.actions.suspend'))}</button>` : ''}
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderSubscriptionFormModal(hotelId = null) {
  const hotels = readHotels().filter(hotel => hotel.status !== 'archived');
  const activePackages = getActivePackages();
  const selectedHotelId = hotelId || hotels[0]?.id || '';
  const current = getSubscriptionByHotelId(selectedHotelId) || { hotelId: selectedHotelId, status: 'active', currency: 'USD', paymentStatus: 'unpaid' };
  const currentPackage = getPackageById(current.packageId || current.plan);
  const packageOptions = [...activePackages];
  if (currentPackage && !packageOptions.some(packageItem => packageItem.id === currentPackage.id)) packageOptions.unshift(currentPackage);
  const selectedPackage = currentPackage || packageOptions[0] || null;
  const selectedPackageId = selectedPackage?.id || '';
  const durationDays = Number(current.durationDays || selectedPackage?.durationDays || 30);
  const selectedStatus = getSubscriptionStatus(current) === 'suspended' ? 'suspended' : current.status === 'trial' ? 'trial' : 'active';
  const startDate = current.startDate || todayISO();
  const endDate = calculateSubscriptionEndDate(startDate, durationDays);
  const amount = current.monthlyAmount ?? selectedPackage?.price ?? '';
  const currencyValue = current.currency || selectedPackage?.currency || 'USD';
  const currencies = [...new Set(['USD', 'TRY', 'EUR', 'SAR', 'AED', currencyValue, ...packageOptions.map(packageItem => packageItem.currency)].filter(Boolean))];

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal-card" id="subscriptionForm" data-id="${h(selectedHotelId)}">
        <div class="modal-head">
          <h2>${h(t('subscription.modal.formTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-subscription-modal">${icon('x')}</button>
        </div>

        <div class="form-section-title">${h(t('subscription.form.subscriptionInfo'))}</div>
        <div class="modal-grid">
          <div class="field">${fieldLabel('building', h(t('subscription.form.hotel')))}
            <select class="select" name="hotelId" id="subscriptionHotelSelect" required>
              ${hotels.map(hotel => `<option value="${h(hotel.id)}" ${hotel.id === selectedHotelId ? 'selected' : ''}>${h(hotel.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">${fieldLabel('package', h(t('subscription.form.plan')))}
            <select class="select" name="packageId" id="subscriptionPlanSelect" required>
              ${packageOptions.map(packageItem => `<option value="${h(packageItem.id)}" ${selectedPackageId === packageItem.id ? 'selected' : ''}>${h(packageItem.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">${fieldLabel('calculator', h(t('subscription.form.durationDays')))}<input class="input" type="number" min="1" step="1" name="durationDays" id="subscriptionDurationDays" value="${h(durationDays)}" readonly required></div>
          <div class="field">${fieldLabel('status', h(t('subscription.form.status')))}
            <select class="select" name="status" required>
              ${['trial', 'active', 'suspended'].map(status => `<option value="${h(status)}" ${selectedStatus === status ? 'selected' : ''}>${h(getSubscriptionStatusLabel(status))}</option>`).join('')}
            </select>
          </div>
          <div class="field">${fieldLabel('creditCard', h(t('subscription.form.paymentStatus')))}
            <select class="select" name="paymentStatus" required>
              ${['paid', 'unpaid', 'partial'].map(status => `<option value="${h(status)}" ${current.paymentStatus === status ? 'selected' : ''}>${h(getPaymentStatusLabel(status))}</option>`).join('')}
            </select>
          </div>
          <div class="field">${fieldLabel('calendar', h(t('subscription.form.startDate')))}<input class="input" type="date" name="startDate" id="subscriptionStartDate" value="${h(startDate)}" required></div>
          <div class="field">${fieldLabel('clock', h(t('subscription.form.endDate')))}<input class="input" type="date" name="endDate" id="subscriptionEndDate" value="${h(endDate)}" readonly required></div>
          <div class="field">${fieldLabel('creditCard', h(t('subscription.form.monthlyAmount')))}<input class="input" type="number" min="0" step="0.01" name="monthlyAmount" id="subscriptionMonthlyAmount" value="${h(amount)}" readonly></div>
          <div class="field">${fieldLabel('currency', h(t('subscription.form.currency')))}
            <select class="select" name="currency" id="subscriptionCurrency" disabled>
              ${currencies.map(currency => `<option value="${h(currency)}" ${currencyValue === currency ? 'selected' : ''}>${h(currency)}</option>`).join('')}
            </select>
            <input type="hidden" name="currency" id="subscriptionCurrencyHidden" value="${h(currencyValue)}">
          </div>
          <div class="field field-full">${fieldLabel('notes', h(t('subscription.form.notes')))}<textarea class="input textarea" name="notes" rows="3">${h(current.notes || '')}</textarea></div>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-action="close-subscription-modal">${h(t('common.cancel'))}</button>
          <button class="btn primary" type="submit">${h(t('common.save'))}</button>
        </div>
      </form>
    </div>
  `;
}

function renderSubscriptionViewModal(hotelId) {
  const hotel = getHotelById(hotelId);
  const subscription = getSubscriptionByHotelId(hotelId);
  if (!hotel || !subscription) return '';
  const packageItem = getPackageById(subscription.packageId || subscription.plan);
  const items = [
    ['subscription.form.hotel', hotel.name],
    ['hotel.form.managerName', hotel.managerName],
    ['subscription.form.plan', packageItem?.name || subscription.packageName || getSubscriptionPlanLabel(subscription.packageId || subscription.plan)],
    ['subscription.form.durationDays', subscription.durationDays || packageItem?.durationDays || getSubscriptionPlanDays(subscription.packageId || subscription.plan)],
    ['subscription.form.status', getSubscriptionStatusLabel(getSubscriptionStatus(subscription))],
    ['subscription.form.startDate', subscription.startDate],
    ['subscription.form.endDate', subscription.endDate],
    ['subscription.form.remainingDays', getSubscriptionRemainingLabel(subscription)],
    ['subscription.form.monthlyAmount', formatSubscriptionPrice(subscription)],
    ['subscription.form.paymentStatus', getPaymentStatusLabel(subscription.paymentStatus)],
    ['subscription.columns.updatedAt', subscription.updatedAt || '-'],
    ['subscription.form.notes', subscription.notes || '-']
  ];

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-head">
          <h2>${h(t('subscription.modal.viewTitle'))}</h2>
          <button class="icon-btn" type="button" data-action="close-subscription-modal">${icon('x')}</button>
        </div>
        <div class="details-grid">
          ${items.map(([label, value]) => `
            <div class="detail-item">
              <span>${h(t(label))}</span>
              <strong>${h(value || '-')}</strong>
            </div>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn primary" type="button" data-action="close-subscription-modal">${h(t('common.close'))}</button>
        </div>
      </div>
    </div>
  `;
}

function renderSubscriptionModal() {
  if (!state.subscriptionModal) return '';
  const { mode, hotelId } = state.subscriptionModal;
  if (mode === 'view') return renderSubscriptionViewModal(hotelId);
  return renderSubscriptionFormModal(hotelId);
}

function renderSubscriptionsPage() {
  const rows = getFilteredSubscriptions();
  const hasHotels = readHotels().some(hotel => hotel.status !== 'archived');
  const hasPackages = getActivePackages().length > 0;
  const packages = readPackages().filter(packageItem => packageItem.status !== 'archived');
  return `
    <div class="hotels-page subscriptions-page">
      <div class="section-head">
        <div>
          <h2>${h(t('page.subscriptions'))}</h2>
        </div>
        <button class="btn primary" type="button" id="addSubscriptionBtn" ${hasHotels && hasPackages ? '' : 'disabled'}>${icon('shieldCheck')}${h(t('subscription.actions.add'))}</button>
      </div>

      <div class="filters-bar">
        <div class="field"><label>${h(t('subscription.filters.search'))}</label><input class="input" id="subscriptionSearch" value="${h(state.subscriptionFilters.search)}" autocomplete="off"></div>
        <div class="field"><label>${h(t('subscription.filters.status'))}</label>
          <select class="select" id="subscriptionStatusFilter">
            <option value="all" ${state.subscriptionFilters.status === 'all' ? 'selected' : ''}>${h(t('subscription.filters.all'))}</option>
            <option value="trial" ${state.subscriptionFilters.status === 'trial' ? 'selected' : ''}>${h(t('subscription.status.trial'))}</option>
            <option value="active" ${state.subscriptionFilters.status === 'active' ? 'selected' : ''}>${h(t('subscription.status.active'))}</option>
            <option value="expired" ${state.subscriptionFilters.status === 'expired' ? 'selected' : ''}>${h(t('subscription.status.expired'))}</option>
            <option value="suspended" ${state.subscriptionFilters.status === 'suspended' ? 'selected' : ''}>${h(t('subscription.status.suspended'))}</option>
            <option value="not_set" ${state.subscriptionFilters.status === 'not_set' ? 'selected' : ''}>${h(t('subscription.status.not_set'))}</option>
          </select>
        </div>
        <div class="field"><label>${h(t('subscription.filters.plan'))}</label>
          <select class="select" id="subscriptionPlanFilter">
            <option value="all" ${state.subscriptionFilters.plan === 'all' ? 'selected' : ''}>${h(t('subscription.filters.all'))}</option>
            ${packages.map(packageItem => `<option value="${h(packageItem.id)}" ${state.subscriptionFilters.plan === packageItem.id ? 'selected' : ''}>${h(packageItem.name)}</option>`).join('')}
            <option value="not_set" ${state.subscriptionFilters.plan === 'not_set' ? 'selected' : ''}>${h(t('subscription.plan.not_set'))}</option>
          </select>
        </div>
      </div>

      <div id="subscriptionsTableSlot">${renderSubscriptionsTable(rows)}</div>
      ${renderSubscriptionModal()}
    </div>
  `;
}


function renderInvoicePreview(settings) {
  const nextInvoiceNumber = `${settings.invoicePrefix || 'INV'}-${String(Number(settings.invoiceLastNumber || 0) + 1).padStart(4, '0')}`;
  const sampleSubtotal = 100;
  const taxRate = Math.max(0, Number(settings.taxRate || 0));
  const sampleTax = sampleSubtotal * taxRate / 100;
  const sampleTotal = sampleSubtotal + sampleTax;
  return `
    <div class="invoice-preview-card settings-full" aria-label="${h(t('settings.preview.invoicePreview'))}">
      <div class="invoice-preview-head">
        <strong>${h(settings.invoiceTitle || getPlatformBrandName())}</strong>
        <span>${h(nextInvoiceNumber)}</span>
      </div>
      <div class="invoice-preview-line"><span>${h(t('settings.preview.currency'))}</span><strong>${h(settings.defaultCurrency || 'USD')}</strong></div>
      <div class="invoice-preview-line"><span>${h(t('settings.preview.subtotal'))}</span><strong>${sampleSubtotal.toFixed(2)}</strong></div>
      <div class="invoice-preview-line"><span>${h(t('settings.preview.tax'))} ${taxRate}%</span><strong>${sampleTax.toFixed(2)}</strong></div>
      <div class="invoice-preview-total"><span>${h(t('settings.preview.total'))}</span><strong>${sampleTotal.toFixed(2)} ${h(settings.defaultCurrency || 'USD')}</strong></div>
      <p>${h(settings.invoiceFooter || t('settings.preview.footerFallback'))}</p>
    </div>
  `;
}

function renderLogoPreview(settings) {
  if (settings.logoDataUrl) {
    return `<div class="settings-logo-preview has-logo" id="platformLogoPreview"><img src="${h(settings.logoDataUrl)}" alt="${h(getPlatformBrandName())}"></div>`;
  }
  return `<div class="settings-logo-preview" id="platformLogoPreview"><span>${h(t('app.initial', 'ف'))}</span></div>`;
}

function renderPlatformSettingsPage() {
  const settings = readPlatformSettings();
  const activeTab = getActiveSettingsTab();
  const panelClass = tab => `settings-card settings-tab-panel ${tab === activeTab ? 'active' : ''}`;

  return `
    <div class="settings-page">
      <div class="section-head platform-settings-title-head" data-layout-fixed="platform-settings-title-only-head">
        <div class="section-head-main">
          <h2>${h(t('page.platform_settings'))}</h2>
        </div>
        <div class="section-head-actions">
          <button class="btn primary" type="submit" form="platformSettingsForm">${icon('checkCircle')}${h(t('settings.actions.save'))}</button>
        </div>
      </div>

      ${renderSettingsTabs()}

      <form class="settings-layout settings-tab-layout" id="platformSettingsForm">
        <section class="${panelClass('identity')} settings-logo-card" data-settings-panel="identity" role="tabpanel">
          <div class="form-section-title">${h(t('settings.sections.identity'))}</div>
          <div class="settings-logo-row">
            ${renderLogoPreview(settings)}
            <div class="settings-logo-actions">
              <label class="btn ghost small" for="platformLogoInput">${icon('upload')}${h(t('settings.actions.uploadLogo'))}</label>
              <button class="btn small danger" type="button" id="removePlatformLogoBtn">${icon('trash')}${h(t('settings.actions.removeLogo'))}</button>
              <input class="sr-only-file" id="platformLogoInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
              <input type="hidden" name="logoDataUrl" id="platformLogoDataUrl" value="${h(settings.logoDataUrl || '')}">
            </div>
          </div>
          <div class="modal-grid">
            <div class="field">${fieldLabel('type', h(t('settings.fields.platformName')))}<input class="input" name="platformName" value="${h(settings.platformName)}" required></div>
            <div class="field">${fieldLabel('type', h(t('settings.fields.platformNameEn')))}<input class="input" name="platformNameEn" value="${h(settings.platformNameEn)}"></div>
            <div class="field">${fieldLabel('mail', h(t('settings.fields.platformEmail')))}<input class="input" type="email" name="platformEmail" value="${h(settings.platformEmail)}"></div>
            <div class="field">${fieldLabel('phone', h(t('settings.fields.platformPhone')))}<input class="input" name="platformPhone" value="${h(settings.platformPhone)}"></div>
          </div>
        </section>

        <section class="${panelClass('defaults')}" data-settings-panel="defaults" role="tabpanel">
          <div class="form-section-title">${h(t('settings.sections.defaults'))}</div>
          <div class="modal-grid">
            <div class="field">${fieldLabel('currency', h(t('settings.fields.defaultCurrency')))}
              <select class="select" name="defaultCurrency">
                ${['USD','EUR','TRY','SAR','AED','SYP'].map(currency => `<option value="${currency}" ${settings.defaultCurrency === currency ? 'selected' : ''}>${currency}</option>`).join('')}
              </select>
            </div>
            <div class="field">${fieldLabel('globe', h(t('settings.fields.defaultCountry')))}<input class="input" name="defaultCountry" value="${h(settings.defaultCountry)}"></div>
            <div class="field">${fieldLabel('clock', h(t('settings.fields.timezone')))}
              <select class="select" name="timezone">
                ${['Europe/Istanbul','Asia/Damascus','Asia/Riyadh','Asia/Dubai','UTC'].map(zone => `<option value="${zone}" ${settings.timezone === zone ? 'selected' : ''}>${zone}</option>`).join('')}
              </select>
            </div>
            <div class="field">${fieldLabel('calendar', h(t('settings.fields.dateFormat')))}
              <select class="select" name="dateFormat">
                ${['YYYY-MM-DD','DD-MM-YYYY','MM-DD-YYYY'].map(format => `<option value="${format}" ${settings.dateFormat === format ? 'selected' : ''}>${format}</option>`).join('')}
              </select>
            </div>
            <div class="field">${fieldLabel('clock', h(t('settings.fields.timeFormat')))}
              <select class="select" name="timeFormat">
                <option value="24" ${settings.timeFormat === '24' ? 'selected' : ''}>${h(t('settings.timeFormat.twentyFour'))}</option>
                <option value="12" ${settings.timeFormat === '12' ? 'selected' : ''}>${h(t('settings.timeFormat.twelve'))}</option>
              </select>
            </div>
            <div class="field">${fieldLabel('languages', h(t('settings.fields.defaultLanguage')))}
              <select class="select" name="defaultLanguage">
                <option value="ar" ${settings.defaultLanguage === 'ar' ? 'selected' : ''}>${h(t('settings.language.arabic', 'العربية'))}</option>
                <option value="en" ${settings.defaultLanguage === 'en' ? 'selected' : ''}>${h(t('settings.language.english', 'English'))}</option>
              </select>
            </div>
          </div>
        </section>

        <section class="${panelClass('security')}" data-settings-panel="security" role="tabpanel">
          <div class="form-section-title">${h(t('settings.sections.security'))}</div>
          <div class="modal-grid">
            <div class="field">${fieldLabel('lockKeyhole', h(t('settings.fields.currentPassword')))}
              <div class="password-field">
                <input class="input" id="settingsCurrentPassword" name="currentPassword" type="password" autocomplete="current-password">
                <button class="password-toggle icon-btn" type="button" data-toggle-password="settingsCurrentPassword" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
              </div>
            </div>
            <div class="field">${fieldLabel('lock', h(t('settings.fields.newPassword')))}
              <div class="password-field">
                <input class="input" id="settingsNewPassword" name="newPassword" type="password" autocomplete="new-password">
                <button class="password-toggle icon-btn" type="button" data-toggle-password="settingsNewPassword" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
              </div>
            </div>
            <div class="field">${fieldLabel('lockKeyhole', h(t('settings.fields.confirmPassword')))}
              <div class="password-field">
                <input class="input" id="settingsConfirmPassword" name="confirmPassword" type="password" autocomplete="new-password">
                <button class="password-toggle icon-btn" type="button" data-toggle-password="settingsConfirmPassword" aria-label="${h(t('login.showPassword'))}" title="${h(t('login.showPassword'))}">${icons.eye}</button>
              </div>
            </div>
          </div>
        </section>

        <section class="${panelClass('billing')}" data-settings-panel="billing" role="tabpanel">
          <div class="form-section-title">${h(t('settings.sections.billing'))}</div>
          <div class="modal-grid">
            <div class="field">${fieldLabel('receipt', h(t('settings.fields.invoiceTitle')))}<input class="input" name="invoiceTitle" value="${h(settings.invoiceTitle)}"></div>
            <div class="field">${fieldLabel('fileText', h(t('settings.fields.invoiceFooter')))}<input class="input" name="invoiceFooter" value="${h(settings.invoiceFooter)}"></div>
            <div class="field">${fieldLabel('hash', h(t('settings.fields.invoicePrefix')))}<input class="input" name="invoicePrefix" value="${h(settings.invoicePrefix)}"></div>
            <div class="field">${fieldLabel('calculator', h(t('settings.fields.invoiceLastNumber')))}<input class="input" type="number" min="0" name="invoiceLastNumber" value="${h(settings.invoiceLastNumber)}"></div>
            <div class="field">${fieldLabel('hash', h(t('settings.fields.subscriptionPrefix')))}<input class="input" name="subscriptionPrefix" value="${h(settings.subscriptionPrefix)}"></div>
            <div class="field">${fieldLabel('calculator', h(t('settings.fields.subscriptionLastNumber')))}<input class="input" type="number" min="0" name="subscriptionLastNumber" value="${h(settings.subscriptionLastNumber)}"></div>
            <div class="field">${fieldLabel('badgePercent', h(t('settings.fields.taxRate')))}<input class="input" type="number" min="0" max="100" step="0.01" name="taxRate" value="${h(settings.taxRate)}"></div>
            ${renderInvoicePreview(settings)}
          </div>
        </section>

        <section class="${panelClass('notifications')}" data-settings-panel="notifications" role="tabpanel">
          <div class="form-section-title">${h(t('settings.sections.notifications'))}</div>
          <div class="modal-grid">
            <div class="field">${fieldLabel('clock', h(t('settings.fields.subscriptionExpireBeforeDays')))}<input class="input" type="number" min="1" max="365" name="subscriptionExpireBeforeDays" value="${h(settings.subscriptionExpireBeforeDays)}"></div>
            <label class="check-row settings-check"><input type="checkbox" name="notifySubscriptionExpired" ${settings.notifySubscriptionExpired ? 'checked' : ''}><span class="check-label">${icon('bell', 'check-icon')}<span>${h(t('settings.fields.notifySubscriptionExpired'))}</span></span></label>
            <label class="check-row settings-check"><input type="checkbox" name="notifyNewHotel" ${settings.notifyNewHotel ? 'checked' : ''}><span class="check-label">${icon('building', 'check-icon')}<span>${h(t('settings.fields.notifyNewHotel'))}</span></span></label>
            <label class="check-row settings-check"><input type="checkbox" name="notifyHotelSuspended" ${settings.notifyHotelSuspended ? 'checked' : ''}><span class="check-label">${icon('shieldAlert', 'check-icon')}<span>${h(t('settings.fields.notifyHotelSuspended'))}</span></span></label>
            <div class="field settings-full">${fieldLabel('messageSquare', h(t('settings.fields.subscriptionWarningMessage')))}<textarea class="input textarea" name="subscriptionWarningMessage" rows="3">${h(settings.subscriptionWarningMessage)}</textarea></div>
            <div class="field settings-full">${fieldLabel('ban', h(t('settings.fields.subscriptionExpiredMessage')))}<textarea class="input textarea" name="subscriptionExpiredMessage" rows="3">${h(settings.subscriptionExpiredMessage)}</textarea></div>
          </div>
        </section>

        <section class="${panelClass('support')}" data-settings-panel="support" role="tabpanel">
          <div class="form-section-title">${h(t('settings.sections.support'))}</div>
          <div class="modal-grid">
            <div class="field">${fieldLabel('mail', h(t('settings.fields.supportEmail')))}<input class="input" type="email" name="supportEmail" value="${h(settings.supportEmail)}"></div>
            <div class="field">${fieldLabel('phone', h(t('settings.fields.supportPhone')))}<input class="input" name="supportPhone" value="${h(settings.supportPhone)}"></div>
            <div class="field">${fieldLabel('messageSquare', h(t('settings.fields.supportWhatsapp')))}<input class="input" name="supportWhatsapp" value="${h(settings.supportWhatsapp)}"></div>
            <div class="field">${fieldLabel('externalLink', h(t('settings.fields.supportWhatsappLink')))}<input class="input" name="supportWhatsappLink" value="${h(settings.supportWhatsappLink)}"></div>
            <div class="field">${fieldLabel('globe', h(t('settings.fields.websiteUrl')))}<input class="input" name="websiteUrl" value="${h(settings.websiteUrl)}"></div>
            <div class="field">${fieldLabel('facebook', h(t('settings.fields.facebookUrl')))}<input class="input" name="facebookUrl" value="${h(settings.facebookUrl)}"></div>
            <div class="field">${fieldLabel('instagram', h(t('settings.fields.instagramUrl')))}<input class="input" name="instagramUrl" value="${h(settings.instagramUrl)}"></div>
          </div>
        </section>

        <section class="${panelClass('terms')}" data-settings-panel="terms" role="tabpanel">
          <div class="form-section-title">${h(t('settings.sections.terms'))}</div>
          <div class="modal-grid">
            <div class="field settings-full">${fieldLabel('fileText', h(t('settings.fields.subscriptionTerms')))}<textarea class="input textarea" name="subscriptionTerms" rows="3">${h(settings.subscriptionTerms)}</textarea></div>
            <div class="field settings-full">${fieldLabel('shieldAlert', h(t('settings.fields.suspensionPolicy')))}<textarea class="input textarea" name="suspensionPolicy" rows="3">${h(settings.suspensionPolicy)}</textarea></div>
            <div class="field settings-full">${fieldLabel('receipt', h(t('settings.fields.legalNote')))}<textarea class="input textarea" name="legalNote" rows="3">${h(settings.legalNote)}</textarea></div>
            <div class="field settings-full">${fieldLabel('notes', h(t('settings.fields.notes')))}<textarea class="input textarea" name="notes" rows="4">${h(settings.notes)}</textarea></div>
          </div>
        </section>

        <section class="${panelClass('backup')} settings-backup-card" data-settings-panel="backup" role="tabpanel">
          <div class="form-section-title">${h(t('settings.sections.backup'))}</div>
          <div class="settings-action-row">
            <button class="btn ghost" type="button" id="exportBackupBtn">${icon('upload')}${h(t('settings.actions.exportBackup'))}</button>
            <label class="btn ghost" for="importBackupInput">${icon('fileArchive')}${h(t('settings.actions.importBackup'))}</label>
            <input class="sr-only-file" id="importBackupInput" type="file" accept="application/json,.json">
            <button class="btn danger" type="button" id="clearDemoDataBtn">${icon('erase')}${h(t('settings.actions.clearDemoData'))}</button>
          </div>
          <p class="helper">${h(t('settings.backup.helper'))}</p>
        </section>
      </form>
    </div>
  `;
}


function sumSubscriptionAmounts(subscriptions, paymentStatuses) {
  return subscriptions
    .filter(subscription => paymentStatuses.includes(subscription.paymentStatus || 'unpaid'))
    .reduce((sum, subscription) => sum + Number(subscription.monthlyAmount || 0), 0);
}

function formatDashboardMoney(amount, currency = '') {
  const value = Number(amount || 0);
  const display = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${display} ${currency || ''}`.trim();
}

function getDashboardMetrics() {
  const settings = readPlatformSettings();
  const hotels = readHotels();
  const visibleHotels = hotels.filter(hotel => hotel.status !== 'archived');
  const managers = getHotelManagers().filter(manager => manager.hotelStatus !== 'archived');
  const packages = readPackages();
  const activePackages = packages.filter(packageItem => packageItem.status === 'active');
  const subscriptions = readSubscriptions();
  const subscriptionRequestsSummary = getPlatformSubscriptionRequestsSummary();
  const rows = getSubscriptionRows();
  const configuredRows = rows.filter(row => row.subscription);
  const warningDays = Math.max(1, Number(settings.subscriptionExpireBeforeDays || 7));
  const endingSoon = configuredRows
    .filter(row => {
      const days = getSubscriptionRemainingDays(row.subscription);
      return ['active', 'trial'].includes(row.status) && days !== null && days >= 0 && days <= warningDays;
    })
    .sort((a, b) => (getSubscriptionRemainingDays(a.subscription) ?? 9999) - (getSubscriptionRemainingDays(b.subscription) ?? 9999));

  return {
    settings,
    warningDays,
    hotelsTotal: visibleHotels.length,
    hotelsActive: visibleHotels.filter(hotel => hotel.status === 'active').length,
    hotelsSuspended: visibleHotels.filter(hotel => hotel.status === 'suspended').length,
    managersTotal: managers.length,
    managersActive: managers.filter(manager => manager.managerStatus === 'active').length,
    packagesTotal: packages.filter(packageItem => packageItem.status !== 'archived').length,
    packagesActive: activePackages.length,
    subscriptionsConfigured: configuredRows.length,
    subscriptionsActive: configuredRows.filter(row => ['active', 'trial'].includes(row.status)).length,
    subscriptionsExpired: configuredRows.filter(row => row.status === 'expired').length,
    subscriptionsSuspended: configuredRows.filter(row => row.status === 'suspended').length,
    subscriptionsNotSet: rows.filter(row => !row.subscription).length,
    subscriptionsEndingSoon: endingSoon.length,
    subscriptionRequestsPending: subscriptionRequestsSummary.pending,
    subscriptionRequestsTotal: subscriptionRequestsSummary.total,
    subscriptionRequestsLatestPendingAt: subscriptionRequestsSummary.latestPendingAt,
    endingSoon,
    paidTotal: sumSubscriptionAmounts(subscriptions, ['paid']),
    unpaidTotal: sumSubscriptionAmounts(subscriptions, ['unpaid', 'partial']),
    currency: settings.defaultCurrency || 'USD'
  };
}

function renderDashboardCard({ icon: iconName, title, value, note, page, filterType, tone = '' }) {
  const pageAttr = page ? ` data-dashboard-page="${h(page)}"` : '';
  const filterAttr = filterType ? ` data-dashboard-filter="${h(filterType)}"` : '';
  return `
    <button class="dashboard-card ${h(tone)}" type="button"${pageAttr}${filterAttr}>
      <span class="dashboard-card-icon">${icon(iconName, 'dashboard-card-svg')}</span>
      <span class="dashboard-card-title">${h(title)}</span>
      <strong>${h(value)}</strong>
      <small>${h(note || '')}</small>
    </button>
  `;
}

function renderDashboardQuickAction({ icon: iconName, title, note, action }) {
  return `
    <button class="quick-action-card" type="button" data-dashboard-action="${h(action)}">
      <span class="quick-action-icon">${icon(iconName, 'quick-action-svg')}</span>
      <strong>${h(title)}</strong>
      <small>${h(note)}</small>
    </button>
  `;
}

function renderPlatformDashboardPage() {
  const metrics = getDashboardMetrics();
  const cards = [
    { icon: 'building', title: t('dashboard.cards.hotelsTotal'), value: metrics.hotelsTotal, note: t('dashboard.notes.allHotels'), page: 'hotels', filterType: 'hotels_all' },
    { icon: 'checkCircle', title: t('dashboard.cards.hotelsActive'), value: metrics.hotelsActive, note: t('dashboard.notes.activeHotels'), page: 'hotels', filterType: 'hotels_active', tone: 'success' },
    { icon: 'pauseCircle', title: t('dashboard.cards.hotelsSuspended'), value: metrics.hotelsSuspended, note: t('dashboard.notes.suspendedHotels'), page: 'hotels', filterType: 'hotels_suspended', tone: 'warning' },
    { icon: 'users', title: t('dashboard.cards.managers'), value: metrics.managersTotal, note: `${metrics.managersActive} ${t('dashboard.notes.activeManagers')}`, page: 'hotel_managers', filterType: 'managers_all' },
    { icon: 'package', title: t('dashboard.cards.packagesActive'), value: metrics.packagesActive, note: `${metrics.packagesTotal} ${t('dashboard.notes.totalPackages')}`, page: 'packages', filterType: 'packages_active', tone: 'success' },
    { icon: 'shieldCheck', title: t('dashboard.cards.subscriptionsActive'), value: metrics.subscriptionsActive, note: t('dashboard.notes.activeSubscriptions'), page: 'subscriptions', filterType: 'subscriptions_active', tone: 'success' },
    { icon: 'receipt', title: t('dashboard.cards.subscriptionRequests', 'طلبات الاشتراك'), value: metrics.subscriptionRequestsPending, note: t('dashboard.notes.subscriptionRequests', 'طلبات بانتظار موافقة صاحب المنصة'), page: 'subscription_requests', filterType: 'subscription_requests_all', tone: 'warning' },
    { icon: 'clock', title: t('dashboard.cards.endingSoon'), value: metrics.subscriptionsEndingSoon, note: `${t('dashboard.notes.within')} ${metrics.warningDays} ${t('dashboard.notes.days')}`, page: 'subscriptions', filterType: 'subscriptions_all', tone: 'warning' },
    { icon: 'ban', title: t('dashboard.cards.expired'), value: metrics.subscriptionsExpired, note: t('dashboard.notes.expiredSubscriptions'), page: 'subscriptions', filterType: 'subscriptions_expired', tone: 'danger' },
    { icon: 'creditCard', title: t('dashboard.cards.paidAmount'), value: formatDashboardMoney(metrics.paidTotal, metrics.currency), note: t('dashboard.notes.paidAmount'), page: 'subscriptions', filterType: 'subscriptions_all', tone: 'success' },
    { icon: 'receipt', title: t('dashboard.cards.unpaidAmount'), value: formatDashboardMoney(metrics.unpaidTotal, metrics.currency), note: t('dashboard.notes.unpaidAmount'), page: 'subscriptions', filterType: 'subscriptions_all', tone: 'warning' }
  ];

  const quickActions = [
    { icon: 'building', title: t('dashboard.quick.addHotel'), note: t('dashboard.quick.addHotelNote'), action: 'add_hotel' },
    { icon: 'package', title: t('dashboard.quick.addPackage'), note: t('dashboard.quick.addPackageNote'), action: 'add_package' },
    { icon: 'shieldCheck', title: t('dashboard.quick.addSubscription'), note: t('dashboard.quick.addSubscriptionNote'), action: 'add_subscription' }
  ];

  return `
    <div class="dashboard-page">
      <div class="section-head dashboard-head">
        <div>
          <h2>${h(t('dashboard.title'))}</h2>
          <p class="helper">${h(t('dashboard.description'))}</p>
        </div>
      </div>

      <div class="dashboard-grid">
        ${cards.map(renderDashboardCard).join('')}
      </div>

      <div class="dashboard-two-columns">
        <section class="dashboard-panel">
          <div class="dashboard-panel-head">
            <h3>${h(t('dashboard.sections.quickActions'))}</h3>
          </div>
          <div class="quick-actions-grid">
            ${quickActions.map(renderDashboardQuickAction).join('')}
          </div>
        </section>

        <section class="dashboard-panel">
          <div class="dashboard-panel-head">
            <h3>${h(t('dashboard.sections.endingSoon'))}</h3>
            <span>${h(metrics.warningDays)} ${h(t('dashboard.notes.days'))}</span>
          </div>
          ${metrics.endingSoon.length ? `
            <div class="dashboard-list">
              ${metrics.endingSoon.slice(0, 6).map(row => `
                <button class="dashboard-list-item" type="button" data-dashboard-subscription="${h(row.hotel.id)}">
                  <span>
                    <strong>${h(row.hotel.name || '-')}</strong>
                    <small>${h(getSubscriptionPlanLabel(row.plan))}</small>
                  </span>
                  <em>${h(getSubscriptionRemainingLabel(row.subscription))}</em>
                </button>
              `).join('')}
            </div>
          ` : `
            <div class="empty-panel dashboard-empty">
              <div>
                <h2>${h(t('dashboard.empty.endingSoonTitle'))}</h2>
                <p>${h(t('dashboard.empty.endingSoonText'))}</p>
              </div>
            </div>
          `}
        </section>
      </div>
    </div>
  `;
}


