# Fandqi Hotel System — Engineering Fix Plan

## Phase 1 — Critical Launch Fixes ✅ COMPLETE

### Summary
Addressed the 7 critical categories identified in the audit (score 4.7/10).

### 1. API Centralization
- Created `src/lib/api.ts` as the single source of truth
- Exports: `BASE_URL`, `apiUrl()`, `getToken()`, `clearTokens()`, `getAuthHeaders()`, `getAuthJsonHeaders()`
- Removed `const API = "http://localhost:8000/api"` from **30+ files**
- All manager/, platform/, reception/ pages now import from `@/lib/api`
- API URL controlled via `NEXT_PUBLIC_API_URL` env variable

### 2. XSS Fix (print functions)
- Created `src/lib/print.ts` with `escapeHtml(value: unknown): string`
- Applied `esc()` to all user-controlled fields in print templates:
  - `manager/reservations/page.tsx` — guest names, booking number, hotel info, companions, notes
  - `manager/check-in-out/page.tsx` — (import added, no print functions found)
  - `manager/payments/page.tsx` — guest names, hotel name/phone, locations
  - `manager/folio/page.tsx` — guest name, room/booking numbers, charge descriptions, hotel info
  - `manager/food-services/page.tsx` — hotel name, guest name, location, employee, notes, item names

### 3. Reception Pages — Real API
- `reception/payments/page.tsx`: Removed `MOCK_PAYMENTS`, connected to `/payments/?hotel={id}`
- `reception/reservations/page.tsx`: Removed `MOCK_RESERVATIONS`, removed static `TODAY = "2026-06-28"`, connected to `/reservations/?hotel={id}`, all date calculations now use `new Date()`

### 4. Translation Function Shadowing Fix (`maintenance/page.tsx`)
- `tks.filter(t=>...)` → `tks.filter(tk=>...)` in `fetchAll()`
- `const filtered = [...tickets].filter(t=>{...})` → `filter(ticket=>{...})`
- `function openEdit(t:Ticket)` → `function openEdit(tk:Ticket)`

### 5. fetchAll Side Effect Fix (`maintenance/page.tsx`)
- Added `const autoCreatedRef = useRef(false)` to prevent duplicate ticket creation on refresh
- Ticket auto-creation wrapped in `if (!autoCreatedRef.current)` guard

### 6. Auth Guard (`manager/layout.tsx`, `reception/layout.tsx`, `platform/layout.tsx`)
- Added `authReady` state to all 3 layouts
- Children render only after successful role check (`setAuthReady(true)`)
- Shows "Verifying access..." loading message while auth check is in progress

### 7. rememberMe Fix (`login/page.tsx`)
- `storeAuth()` now uses `sessionStorage` when `rememberMe = false`
- Clears localStorage tokens when rememberMe is false
- `getToken()` checks both storages (localStorage → sessionStorage fallback)
- `clearTokens()` clears both storages on logout

### Build Results
- ✅ TypeScript: 0 errors
- ✅ Build: 36/36 pages compiled
- ⚠️ ESLint: 78 pre-existing issues (42 errors, 36 warnings) — all existed before Phase 1

---

## Phase 2 — Shared Components & Navigation ✅ COMPLETE

### Done
- Created `src/components/`: Toast, KpiCard, PageHeader, EmptyState, ConfirmDialog, LoadingState, ErrorState (with barrel export `index.ts`)
- Unified navigation: all 20 `window.location.href` calls replaced with `router.push()` across 8 files (food-services, guests, maintenance, rooms, night-audit, reservations, housekeeping, check-in-out)
  - Added `import { useRouter }` + `const router = useRouter()` to 6 files that were missing it
- Replaced emoji in JSX with Lucide icons:
  - `manager/page.tsx`: ✅ → CheckCircle2, ⚠️ → AlertTriangle, 🏨 → Building2
  - `manager/reservations/page.tsx`: ⚠️ JSX → AlertTriangle, ⚠️ in error string removed
- Audit found no double-translation patterns `t(t(...))`

### Not done (acceptable tradeoffs)
- Silent catches: localStorage JSON.parse silences are intentional (fallback to default state) — kept as-is. Fetch error catches already set error state.
- AbortController: left for Phase 3 (affects 30+ fetches, needs shared hook)
- Translation string fixes: no typos found by audit
- ● bullet in reservations KPI active badge: non-emoji Unicode, acceptable

---

## Phase 3 — Architecture & Performance ✅ COMPLETE

### Shared Types (`src/types/index.ts`)
- 11 domain interfaces: Room, Guest, Reservation, HotelInfo, Staff, MaintenanceTicket, FoodOrder, FolioCharge, Subscription, PaginatedResponse<T>, Language, LoadState
- Replaces 30+ duplicate local interface definitions across pages

### API Service Layer (`src/services/api.service.ts`)
- Generic helpers: `get<T>()`, `post<T>()`, `patch<T>()`, `del()`
- Named services: RoomsService, ReservationsService, GuestsService, MaintenanceService, FoodService, HotelService
- All use AbortSignal support for request cancellation
- Barrel export via `src/services/index.ts`

### Shared Hooks (`src/hooks/`)
- `useHotel()` — reads hotelId + settings from localStorage (lazy initializer, no effect needed)
- `useFetch<T>(url)` — async fetch with AbortController, loading/error/refetch states
- `useToast()` — toast queue management (addToast/removeToast with useCallback)
- Barrel export via `src/hooks/index.ts`
- All hooks: 0 ESLint errors (setState-in-effect pattern fixed)

### Performance — useMemo
- `manager/rooms/page.tsx`: Wrapped `roomsWithStatus`, all KPI computations (`kpi` memo), `filtered` array, `floorGroups`/`sortedFloors`, `usedFloors`, `allFloors`, `extraTypes`, `allTypes` — 7 useMemo calls on arrays that previously recalculated every render
- `reception/page.tsx`: Wrapped 5 status counts in a single useMemo (available, occupied, maintenance, cleaning, reserved)
- `reception/reservations/page.tsx`: Wrapped `filtered` array with all 6 filter deps properly declared

### Accessibility
- Added `aria-label={t("إغلاق")}` to all icon-only close buttons:
  - `manager/rooms/page.tsx` — 3 modal close buttons
  - `manager/check-in-out/page.tsx` — payment modal close button
  - `manager/maintenance/page.tsx` — form modal close button
  - `manager/reservations/page.tsx` — reservation form close button
- Added `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), `aria-pressed` to KPI filter cards in `manager/rooms/page.tsx`

### Build Results
- ✅ TypeScript: 0 errors
- ✅ ESLint: 41 issues (down from 77 at Phase 2 end — 36 issues resolved)
- All remaining issues are pre-existing patterns in untouched legacy pages
