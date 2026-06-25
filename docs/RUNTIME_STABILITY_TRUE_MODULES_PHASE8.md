# Runtime Stability & True Modules — Phase 8

## Central UI Migration — Staff Page

This phase continues the gradual migration from hand-written page markup to the central `FandqiUI` component layer.

## What changed

- Migrated the staff page shell with `data-ui-migrated="staff"`.
- Added staff-specific central UI helpers:
  - `staffUi()`
  - `renderStaffButton()`
  - `renderStaffBadge()`
  - `renderStaffEmptyState()`
- Replaced staff card action buttons with central button rendering.
- Replaced staff role and status badges with central badge rendering.
- Replaced staff empty state with central empty-state rendering.
- Strengthened `ui-adapter.js` fallback to preserve `attrs` such as `id`, `data-id`, `title`, and accessibility attributes before the ES module runtime becomes available.

## Why this matters

The staff page previously had several button and status-state issues. Migrating its cards/actions to `FandqiUI` reduces the chance that a future change in staff status, hover style, or button sizing will drift away from the rest of the system.

## Safety rule

This phase intentionally keeps staff modals in the classic markup path for now. The cards/actions were migrated first because they are the most visible and historically most fragile area.

## New audit

```powershell
npm run staff-ui-migration:audit
```

This audit is included in:

```powershell
npm run quality:full
```
