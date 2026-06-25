// Fandqi Phase 112 — Platform owner settings 100% component centralization.
const PLATFORM_OWNER_SETTINGS_CENTRAL_AUDIT_MARKERS = Object.freeze([
  'phase112-platform-owner-settings',
  'owner-settings-page-head',
  'owner-settings-tabs',
  'owner-settings-panel',
  'owner-settings-field',
  'owner-settings-action'
]);

function platformSettingsUi() {
  return window.FandqiUI || null;
}

function renderPlatformSettingsAttrs(attrs = {}) {
  const ui = platformSettingsUi();
  if (ui?.renderAttributes) return ui.renderAttributes(attrs);
  return Object.entries(attrs || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${h(name)}` : ` ${h(name)}="${h(value)}"`)
    .join('');
}

function renderPlatformSettingsHead() {
  const ui = platformSettingsUi();
  const actions = renderPlatformSettingsButton({
    label: t('settings.actions.save'),
    tone: 'primary',
    iconName: 'checkCircle',
    type: 'submit',
    className: 'owner-settings-save-action',
    attrs: { form: 'platformSettingsForm', 'data-ui-component': 'owner-settings-save-action' }
  });
  if (ui?.renderSectionHead) {
    return ui.renderSectionHead({
      kicker: t('roles.platform_owner'),
      kickerIcon: icon('settings'),
      title: t('page.platform_settings'),
      text: t('settings.pageSubtitle', 'إعدادات مركزية لهوية المنصة، الاشتراكات، الفواتير، الأمان، الدعم، والنسخ الاحتياطي.'),
      actions,
      className: 'owner-workspace-hero owner-central-hero platform-settings-title-head',
      attrs: {
        'data-layout-fixed': 'platform-settings-title-only-head',
        'data-ui-component': 'owner-settings-page-head',
        'data-ui-owner-central': 'page-head'
      }
    });
  }
  return `
    <div class="section-head owner-workspace-hero owner-central-hero platform-settings-title-head" data-layout-fixed="platform-settings-title-only-head" data-ui-component="owner-settings-page-head" data-ui-owner-central="page-head">
      <div class="section-head-main fandqi-ui-section-copy">
        <span class="fandqi-ui-section-kicker">${icon('settings')}${h(t('roles.platform_owner'))}</span>
        <h2>${h(t('page.platform_settings'))}</h2>
        <p class="helper">${h(t('settings.pageSubtitle', 'إعدادات مركزية لهوية المنصة، الاشتراكات، الفواتير، الأمان، الدعم، والنسخ الاحتياطي.'))}</p>
      </div>
      <div class="section-head-actions fandqi-ui-section-actions ds-actions">${actions}</div>
    </div>
  `;
}

function renderPlatformSettingsButton({ label = '', tone = 'primary', iconName = '', size = '', className = '', attrs = {}, type = 'button', disabled = false } = {}) {
  const ui = platformSettingsUi();
  const iconHtml = iconName ? icon(iconName) : '';
  const finalAttrs = { 'data-ui-component': 'owner-settings-action', disabled, ...attrs };
  if (ui?.renderButton) {
    return ui.renderButton({ label, tone, size, icon: iconHtml, className, attrs: finalAttrs, type, disabled });
  }
  return `<button class="btn ${h(tone)} ${h(size)} ds-btn ${h(size ? 'ds-btn-small' : '')} ${h(className)}" type="${h(type)}"${renderPlatformSettingsAttrs(finalAttrs)}>${iconHtml}${h(label)}</button>`;
}

function renderPlatformSettingsFileAction({ label = '', tone = 'ghost', iconName = 'upload', size = 'small', className = '', forId = '', attrs = {} } = {}) {
  const classes = ['btn', tone, size, 'ds-btn', size ? 'ds-btn-small' : '', 'owner-settings-file-action', className].filter(Boolean).join(' ');
  return `<label class="${h(classes)}" for="${h(forId)}"${renderPlatformSettingsAttrs({ 'data-ui-component': 'owner-settings-file-action', ...attrs })}>${icon(iconName)}${h(label)}</label>`;
}

function renderPlatformSettingsPanelTitle(title, iconName = '') {
  const ui = platformSettingsUi();
  const attrs = { 'data-ui-component': 'owner-settings-panel-title' };
  if (ui?.renderPanelTitle) return ui.renderPanelTitle({ title, icon: iconName ? icon(iconName) : '', attrs });
  return `<div class="form-section-title ds-form-section-title fandqi-ui-panel-title"${renderPlatformSettingsAttrs(attrs)}>${iconName ? icon(iconName) : ''}<span>${h(title)}</span></div>`;
}

function renderPlatformSettingsFormGrid(children, component = 'owner-settings-form-grid', className = '') {
  const ui = platformSettingsUi();
  const attrs = { 'data-ui-component': component };
  if (ui?.renderFormGrid) return ui.renderFormGrid({ children, className, attrs });
  return `<div class="modal-grid compact-modal-grid ds-form-grid fandqi-ui-form-grid ${h(className)}"${renderPlatformSettingsAttrs(attrs)}>${children}</div>`;
}

function renderPlatformSettingsField({ label = '', iconName = '', control = '', helper = '', className = '', component = 'owner-settings-field' } = {}) {
  const ui = platformSettingsUi();
  const labelHtml = label ? fieldLabel(iconName, h(label)) : '';
  const attrs = { 'data-ui-component': component };
  if (ui?.renderField) return ui.renderField({ labelHtml, control, helper, className: `owner-settings-field ${className}`, attrs });
  return `<div class="field ds-field fandqi-ui-field owner-settings-field ${h(className)}"${renderPlatformSettingsAttrs(attrs)}>${labelHtml}${control}${helper ? `<p class="helper">${h(helper)}</p>` : ''}</div>`;
}

function renderPlatformSettingsInput({ name, value = '', type = 'text', id = '', required = false, attrs = {} } = {}) {
  return `<input class="input"${id ? ` id="${h(id)}"` : ''} name="${h(name)}" type="${h(type)}" value="${h(value)}"${renderPlatformSettingsAttrs({ required, ...attrs })}>`;
}

function renderPlatformSettingsTextarea({ name, value = '', rows = 3, attrs = {} } = {}) {
  return `<textarea class="input textarea" name="${h(name)}" rows="${h(rows)}"${renderPlatformSettingsAttrs(attrs)}>${h(value)}</textarea>`;
}

function renderPlatformSettingsSelect({ name, value = '', options = [], attrs = {} } = {}) {
  return `<select class="select" name="${h(name)}"${renderPlatformSettingsAttrs(attrs)}>${options.map(option => {
    const optionValue = typeof option === 'string' ? option : option.value;
    const optionLabel = typeof option === 'string' ? option : option.label;
    return `<option value="${h(optionValue)}" ${String(value) === String(optionValue) ? 'selected' : ''}>${h(optionLabel)}</option>`;
  }).join('')}</select>`;
}

function renderPlatformSettingsPasswordField({ label = '', iconName = 'lock', name = '', id = '', autocomplete = 'new-password' } = {}) {
  return renderPlatformSettingsField({
    label,
    iconName,
    component: 'owner-settings-password-field',
    control: `
      <div class="password-field" data-ui-component="owner-settings-password-control">
        <input class="input" id="${h(id)}" name="${h(name)}" type="password" autocomplete="${h(autocomplete)}">
        ${renderPlatformSettingsButton({
          label: '',
          tone: 'neutral',
          iconName: 'eye',
          className: 'password-toggle icon-btn owner-settings-password-toggle',
          attrs: { 'data-toggle-password': id, 'aria-label': t('login.showPassword'), title: t('login.showPassword'), 'data-ui-component': 'owner-settings-password-toggle' }
        })}
      </div>
    `
  });
}

function renderPlatformSettingsCheck({ name = '', checked = false, label = '', iconName = 'checkCircle', component = 'owner-settings-check-field' } = {}) {
  const ui = platformSettingsUi();
  const attrs = { 'data-ui-component': component };
  if (ui?.renderCheckField) {
    return ui.renderCheckField({ name, checked, label, icon: icon(iconName, 'check-icon'), attrs });
  }
  return `<label class="check-row settings-check ds-check-field fandqi-ui-check-field"${renderPlatformSettingsAttrs(attrs)}><input type="checkbox" name="${h(name)}" ${checked ? 'checked' : ''}><span class="check-label">${icon(iconName, 'check-icon')}<span>${h(label)}</span></span></label>`;
}

function renderPlatformSettingsPanel({ tab = '', iconName = '', title = '', body = '', className = '' } = {}) {
  const ui = platformSettingsUi();
  const active = tab === getActiveSettingsTab();
  const attrs = {
    'data-settings-panel': tab,
    'data-ui-component': 'owner-settings-panel',
    'data-ui-settings-panel': tab,
    role: 'tabpanel'
  };
  const content = `${renderPlatformSettingsPanelTitle(title, iconName)}${body}`;
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag: 'section',
      className: `settings-card settings-tab-panel owner-settings-panel owner-central-section ${active ? 'active' : ''} ${className}`,
      body: content,
      attrs
    });
  }
  return `<section class="settings-card settings-tab-panel owner-settings-panel owner-central-section ${active ? 'active' : ''} ${h(className)}"${renderPlatformSettingsAttrs(attrs)}>${content}</section>`;
}

function renderPlatformSettingsLogoPreview(settings) {
  const image = settings.logoDataUrl
    ? `<img src="${h(settings.logoDataUrl)}" alt="${h(getPlatformBrandName())}">`
    : `<span>${h(t('app.initial', 'ف'))}</span>`;
  return `<div class="settings-logo-preview ${settings.logoDataUrl ? 'has-logo' : ''}" id="platformLogoPreview" data-ui-component="owner-settings-logo-preview">${image}</div>`;
}

function renderPlatformSettingsLogoBlock(settings) {
  return `
    <div class="settings-logo-row owner-settings-logo-row" data-ui-component="owner-settings-logo-row">
      ${renderPlatformSettingsLogoPreview(settings)}
      <div class="settings-logo-actions ds-actions" data-ui-component="owner-settings-logo-actions">
        ${renderPlatformSettingsFileAction({ label: t('settings.actions.uploadLogo'), iconName: 'upload', forId: 'platformLogoInput', attrs: { 'data-ui-component': 'owner-settings-logo-upload-action' } })}
        ${renderPlatformSettingsButton({ label: t('settings.actions.removeLogo'), tone: 'danger', size: 'small', iconName: 'trash', className: 'owner-settings-logo-remove-action', attrs: { id: 'removePlatformLogoBtn', 'data-ui-component': 'owner-settings-logo-remove-action' } })}
        <input class="sr-only-file" id="platformLogoInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
        <input type="hidden" name="logoDataUrl" id="platformLogoDataUrl" value="${h(settings.logoDataUrl || '')}">
      </div>
    </div>
  `;
}

function renderPlatformSettingsInvoicePreview(settings) {
  const body = renderInvoicePreview(settings).replace('invoice-preview-card settings-full', 'invoice-preview-card settings-full owner-settings-invoice-preview');
  const ui = platformSettingsUi();
  if (ui?.renderSurface) {
    return ui.renderSurface({
      tag: 'div',
      className: 'settings-full owner-settings-preview-surface',
      body,
      attrs: { 'data-ui-component': 'owner-settings-invoice-preview' }
    });
  }
  return `<div class="settings-full owner-settings-preview-surface" data-ui-component="owner-settings-invoice-preview">${body}</div>`;
}

function renderPlatformSettingsPage() {
  const settings = readPlatformSettings();
  const identityPanel = renderPlatformSettingsPanel({
    tab: 'identity', iconName: 'type', title: t('settings.sections.identity'), className: 'settings-logo-card owner-settings-identity-panel',
    body: `${renderPlatformSettingsLogoBlock(settings)}${renderPlatformSettingsFormGrid(`
      ${renderPlatformSettingsField({ label: t('settings.fields.platformName'), iconName: 'type', control: renderPlatformSettingsInput({ name: 'platformName', value: settings.platformName, required: true }) })}
      ${renderPlatformSettingsField({ label: t('settings.fields.platformNameEn'), iconName: 'type', control: renderPlatformSettingsInput({ name: 'platformNameEn', value: settings.platformNameEn }) })}
      ${renderPlatformSettingsField({ label: t('settings.fields.platformEmail'), iconName: 'mail', control: renderPlatformSettingsInput({ name: 'platformEmail', type: 'email', value: settings.platformEmail }) })}
      ${renderPlatformSettingsField({ label: t('settings.fields.platformPhone'), iconName: 'phone', control: renderPlatformSettingsInput({ name: 'platformPhone', value: settings.platformPhone }) })}
    `, 'owner-settings-identity-grid')}`
  });
  const defaultsPanel = renderPlatformSettingsPanel({ tab: 'defaults', iconName: 'settings', title: t('settings.sections.defaults'), body: renderPlatformSettingsFormGrid(`
    ${renderPlatformSettingsField({ label: t('settings.fields.defaultCurrency'), iconName: 'currency', control: renderPlatformSettingsSelect({ name: 'defaultCurrency', value: settings.defaultCurrency, options: ['USD','EUR','TRY','SAR','AED','SYP'] }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.defaultCountry'), iconName: 'globe', control: renderPlatformSettingsInput({ name: 'defaultCountry', value: settings.defaultCountry }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.timezone'), iconName: 'clock', control: renderPlatformSettingsSelect({ name: 'timezone', value: settings.timezone, options: ['Europe/Istanbul','Asia/Damascus','Asia/Riyadh','Asia/Dubai','UTC'] }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.dateFormat'), iconName: 'calendar', control: renderPlatformSettingsSelect({ name: 'dateFormat', value: settings.dateFormat, options: ['YYYY-MM-DD','DD-MM-YYYY','MM-DD-YYYY'] }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.timeFormat'), iconName: 'clock', control: renderPlatformSettingsSelect({ name: 'timeFormat', value: settings.timeFormat, options: [{ value: '24', label: t('settings.timeFormat.twentyFour') }, { value: '12', label: t('settings.timeFormat.twelve') }] }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.defaultLanguage'), iconName: 'languages', control: renderPlatformSettingsSelect({ name: 'defaultLanguage', value: settings.defaultLanguage, options: [{ value: 'ar', label: t('settings.language.arabic', 'العربية') }, { value: 'en', label: t('settings.language.english', 'English') }] }) })}
  `, 'owner-settings-defaults-grid') });
  const securityPanel = renderPlatformSettingsPanel({ tab: 'security', iconName: 'lockKeyhole', title: t('settings.sections.security'), body: renderPlatformSettingsFormGrid(`
    ${renderPlatformSettingsPasswordField({ label: t('settings.fields.currentPassword'), iconName: 'lockKeyhole', name: 'currentPassword', id: 'settingsCurrentPassword', autocomplete: 'current-password' })}
    ${renderPlatformSettingsPasswordField({ label: t('settings.fields.newPassword'), iconName: 'lock', name: 'newPassword', id: 'settingsNewPassword', autocomplete: 'new-password' })}
    ${renderPlatformSettingsPasswordField({ label: t('settings.fields.confirmPassword'), iconName: 'lockKeyhole', name: 'confirmPassword', id: 'settingsConfirmPassword', autocomplete: 'new-password' })}
  `, 'owner-settings-security-grid') });
  const billingPanel = renderPlatformSettingsPanel({ tab: 'billing', iconName: 'receipt', title: t('settings.sections.billing'), body: renderPlatformSettingsFormGrid(`
    ${renderPlatformSettingsField({ label: t('settings.fields.invoiceTitle'), iconName: 'receipt', control: renderPlatformSettingsInput({ name: 'invoiceTitle', value: settings.invoiceTitle }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.invoiceFooter'), iconName: 'fileText', control: renderPlatformSettingsInput({ name: 'invoiceFooter', value: settings.invoiceFooter }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.invoicePrefix'), iconName: 'hash', control: renderPlatformSettingsInput({ name: 'invoicePrefix', value: settings.invoicePrefix }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.invoiceLastNumber'), iconName: 'calculator', control: renderPlatformSettingsInput({ name: 'invoiceLastNumber', type: 'number', value: settings.invoiceLastNumber, attrs: { min: 0 } }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.subscriptionPrefix'), iconName: 'hash', control: renderPlatformSettingsInput({ name: 'subscriptionPrefix', value: settings.subscriptionPrefix }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.subscriptionLastNumber'), iconName: 'calculator', control: renderPlatformSettingsInput({ name: 'subscriptionLastNumber', type: 'number', value: settings.subscriptionLastNumber, attrs: { min: 0 } }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.taxRate'), iconName: 'badgePercent', control: renderPlatformSettingsInput({ name: 'taxRate', type: 'number', value: settings.taxRate, attrs: { min: 0, max: 100, step: '0.01' } }) })}
    ${renderPlatformSettingsInvoicePreview(settings)}
  `, 'owner-settings-billing-grid') });
  const notificationsPanel = renderPlatformSettingsPanel({ tab: 'notifications', iconName: 'bell', title: t('settings.sections.notifications'), body: renderPlatformSettingsFormGrid(`
    ${renderPlatformSettingsField({ label: t('settings.fields.subscriptionExpireBeforeDays'), iconName: 'clock', control: renderPlatformSettingsInput({ name: 'subscriptionExpireBeforeDays', type: 'number', value: settings.subscriptionExpireBeforeDays, attrs: { min: 1, max: 365 } }) })}
    ${renderPlatformSettingsCheck({ name: 'notifySubscriptionExpired', checked: settings.notifySubscriptionExpired, label: t('settings.fields.notifySubscriptionExpired'), iconName: 'bell' })}
    ${renderPlatformSettingsCheck({ name: 'notifyNewHotel', checked: settings.notifyNewHotel, label: t('settings.fields.notifyNewHotel'), iconName: 'building' })}
    ${renderPlatformSettingsCheck({ name: 'notifyHotelSuspended', checked: settings.notifyHotelSuspended, label: t('settings.fields.notifyHotelSuspended'), iconName: 'shieldAlert' })}
    ${renderPlatformSettingsField({ label: t('settings.fields.subscriptionWarningMessage'), iconName: 'messageSquare', className: 'settings-full', control: renderPlatformSettingsTextarea({ name: 'subscriptionWarningMessage', value: settings.subscriptionWarningMessage, rows: 3 }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.subscriptionExpiredMessage'), iconName: 'ban', className: 'settings-full', control: renderPlatformSettingsTextarea({ name: 'subscriptionExpiredMessage', value: settings.subscriptionExpiredMessage, rows: 3 }) })}
  `, 'owner-settings-notifications-grid') });
  const supportPanel = renderPlatformSettingsPanel({ tab: 'support', iconName: 'messageSquare', title: t('settings.sections.support'), body: renderPlatformSettingsFormGrid(`
    ${renderPlatformSettingsField({ label: t('settings.fields.supportEmail'), iconName: 'mail', control: renderPlatformSettingsInput({ name: 'supportEmail', type: 'email', value: settings.supportEmail }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.supportPhone'), iconName: 'phone', control: renderPlatformSettingsInput({ name: 'supportPhone', value: settings.supportPhone }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.supportWhatsapp'), iconName: 'messageSquare', control: renderPlatformSettingsInput({ name: 'supportWhatsapp', value: settings.supportWhatsapp }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.supportWhatsappLink'), iconName: 'externalLink', control: renderPlatformSettingsInput({ name: 'supportWhatsappLink', value: settings.supportWhatsappLink }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.websiteUrl'), iconName: 'globe', control: renderPlatformSettingsInput({ name: 'websiteUrl', value: settings.websiteUrl }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.facebookUrl'), iconName: 'facebook', control: renderPlatformSettingsInput({ name: 'facebookUrl', value: settings.facebookUrl }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.instagramUrl'), iconName: 'instagram', control: renderPlatformSettingsInput({ name: 'instagramUrl', value: settings.instagramUrl }) })}
  `, 'owner-settings-support-grid') });
  const termsPanel = renderPlatformSettingsPanel({ tab: 'terms', iconName: 'fileText', title: t('settings.sections.terms'), body: renderPlatformSettingsFormGrid(`
    ${renderPlatformSettingsField({ label: t('settings.fields.subscriptionTerms'), iconName: 'fileText', className: 'settings-full', control: renderPlatformSettingsTextarea({ name: 'subscriptionTerms', value: settings.subscriptionTerms, rows: 3 }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.suspensionPolicy'), iconName: 'shieldAlert', className: 'settings-full', control: renderPlatformSettingsTextarea({ name: 'suspensionPolicy', value: settings.suspensionPolicy, rows: 3 }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.legalNote'), iconName: 'receipt', className: 'settings-full', control: renderPlatformSettingsTextarea({ name: 'legalNote', value: settings.legalNote, rows: 3 }) })}
    ${renderPlatformSettingsField({ label: t('settings.fields.notes'), iconName: 'notes', className: 'settings-full', control: renderPlatformSettingsTextarea({ name: 'notes', value: settings.notes, rows: 4 }) })}
  `, 'owner-settings-terms-grid') });
  const backupPanel = renderPlatformSettingsPanel({ tab: 'backup', iconName: 'fileArchive', title: t('settings.sections.backup'), className: 'settings-backup-card owner-settings-backup-panel', body: `
    <div class="settings-action-row ds-actions owner-settings-backup-actions" data-ui-component="owner-settings-backup-actions">
      ${renderPlatformSettingsButton({ label: t('settings.actions.exportBackup'), tone: 'ghost', iconName: 'upload', className: 'owner-settings-backup-action', attrs: { id: 'exportBackupBtn', 'data-ui-component': 'owner-settings-export-backup-action' } })}
      ${renderPlatformSettingsFileAction({ label: t('settings.actions.importBackup'), tone: 'ghost', size: '', iconName: 'fileArchive', forId: 'importBackupInput', className: 'owner-settings-backup-action', attrs: { 'data-ui-component': 'owner-settings-import-backup-action' } })}
      <input class="sr-only-file" id="importBackupInput" type="file" accept="application/json,.json">
      ${renderPlatformSettingsButton({ label: t('settings.actions.clearDemoData'), tone: 'danger', iconName: 'erase', className: 'owner-settings-backup-action', attrs: { id: 'clearDemoDataBtn', 'data-ui-component': 'owner-settings-clear-demo-action' } })}
    </div>
    <p class="helper" data-ui-component="owner-settings-backup-helper">${h(t('settings.backup.helper'))}</p>` });
  return `
    <div class="settings-page owner-settings-central-page" data-ui-page="platform-owner-settings" data-ui-centralized="phase112-platform-owner-settings">
      ${renderPlatformSettingsHead()}
      ${renderSettingsTabs()}
      <form class="settings-layout settings-tab-layout owner-settings-form" id="platformSettingsForm" data-ui-component="owner-settings-form">
        ${identityPanel}${defaultsPanel}${securityPanel}${billingPanel}${notificationsPanel}${supportPanel}${termsPanel}${backupPanel}
      </form>
    </div>
  `;
}
