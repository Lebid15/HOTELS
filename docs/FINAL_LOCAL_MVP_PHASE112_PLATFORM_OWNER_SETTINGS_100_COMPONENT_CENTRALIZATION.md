# Phase 112 — Platform Owner Settings 100% Component Centralization

## Scope

Closed the **Platform Owner Settings** page as a page-scoped 100% central component closure after Phase 111.

## Files changed

- `apps/web/public/assets/js/modules/03a-platform-settings-auth-hotels-managers.js`
- `apps/web/public/assets/js/modules/03e-platform-owner-settings-centralization.js`
- `apps/web/public/assets/css/patches/final-regression-fixes.css`
- `apps/web/public/assets/js/modules/manifest.json`
- `apps/web/public/index.html`
- `apps/web/public/locales/ar.json`
- `apps/web/public/locales/en.json`
- `scripts/platform-owner-settings-central-closure-audit.mjs`
- `package.json`

## What was centralized

- Platform settings page head through `FandqiUI.renderSectionHead`.
- Settings tabs through `FandqiUI.renderTabs` while preserving `data-settings-tab` events.
- Settings panels through `FandqiUI.renderSurface`.
- Form grids through `FandqiUI.renderFormGrid`.
- Fields through `FandqiUI.renderField`.
- Checkbox rows through `FandqiUI.renderCheckField`.
- Password toggle actions through `FandqiUI.renderButton` while preserving `data-toggle-password`.
- Logo upload/remove actions through centralized button/file-action helpers while preserving `platformLogoInput`, `platformLogoDataUrl`, and `removePlatformLogoBtn`.
- Invoice preview wrapped in a central surface.
- Backup/export/import/clear-demo actions through centralized action helpers while preserving `exportBackupBtn`, `importBackupInput`, and `clearDemoDataBtn`.

## Protection markers

- Page: `data-ui-centralized="phase112-platform-owner-settings"`
- Page scope: `data-ui-page="platform-owner-settings"`
- Components:
  - `owner-settings-page-head`
  - `owner-settings-tabs`
  - `owner-settings-form`
  - `owner-settings-panel`
  - `owner-settings-field`
  - `owner-settings-check-field`
  - `owner-settings-logo-row`
  - `owner-settings-invoice-preview`
  - `owner-settings-backup-actions`

## Audit added

```powershell
npm run platform-owner-settings-central:closure-audit
```

The audit is linked into:

```powershell
npm run quality:full
```

## Validation

Passed:

- `npm run check`
- `npm run smoke:test`
- `npm run ui:audit`
- `npm run i18n:closure-audit`
- `npm run central-ui-system:closure-audit`
- `npm run ui-components:audit`
- `npm run platform-owner-dashboard-central:closure-audit`
- `npm run platform-owner-hotels-managers-central:closure-audit`
- `npm run platform-owner-packages-subscriptions-central:closure-audit`
- `npm run platform-owner-settings-central:closure-audit`
- `npm run modular:audit`
- Remaining `quality:full` audits were continued manually from the timeout point and all passed.

## Notes

- `03b-platform-packages-subscriptions-dashboard.js` was intentionally kept below the modular audit limit by adding Phase 112 in a separate ordered module: `03e-platform-owner-settings-centralization.js`.
- Existing platform settings save logic, tab switching, logo upload/remove, password change, backup import/export, and demo-data clear workflows were preserved.
