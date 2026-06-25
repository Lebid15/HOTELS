# Runtime Stability & True Modules — Phase 15

## UI Migration Closure Audit

تم في هذه المرحلة إغلاق مرحلة تحويل الواجهات التشغيلية الثقيلة إلى `FandqiUI` عبر فحص شامل يراجع علامات التحويل، سكربتات الفحص، وقدرات الواجهة المركزية، وبقايا HTML اليدوي.

## الملفات الجديدة

- `scripts/ui-migration-closure-audit.mjs`
- `docs/UI_MIGRATION_MANUAL_HTML_INVENTORY.json`
- `docs/RUNTIME_STABILITY_TRUE_MODULES_PHASE15.md`

## أمر الفحص الجديد

```powershell
npm run ui-migration:closure-audit
```

ودخل ضمن:

```powershell
npm run quality:full
```

## ماذا يغطي الفحص؟

- التأكد من وجود واجهة `FandqiUI` وقدراتها الأساسية:
  - `renderButton`
  - `renderBadge`
  - `renderCard`
  - `renderTabs`
  - `renderEmptyState`
- التأكد من وجود علامات `data-ui-migrated` في الصفحات التشغيلية:
  - الاشتراك والباقات
  - الموظفين
  - الغرف
  - الحجوزات
  - المطعم والكافتريا
  - الصيانة
  - التنظيف
  - التقارير
  - المدفوعات
  - النزلاء
  - الدخول والمغادرة
- التأكد من ربط كل فحوصات UI Migration داخل `quality:full`.
- منع رجوع الأزرار التشغيلية القديمة في الكروت المهمة.
- إنشاء جرد موثق لبقايا HTML اليدوي التي ما زالت انتقالية أو داخل مودالات/نماذج/أجزاء عامة.

## جرد بقايا HTML اليدوي

> هذا الجرد لا يعني خطأ. هو خط أساس للمرحلة القادمة، لأن بعض الأزرار اليدوية ما زالت داخل مودالات ونماذج عامة أو أجزاء غير محولة بعد إلى Feature Modules كاملة.

| الملف | أزرار btn يدوية | status-badge يدوية | empty-panel يدوية | علامات التحويل |
|---|---:|---:|---:|---|
| `apps/web/public/assets/js/modules/01-navigation-topbar.js` | 2 | 0 | 0 | - |
| `apps/web/public/assets/js/modules/02-state-print-avatar-utils.js` | 1 | 0 | 0 | - |
| `apps/web/public/assets/js/modules/03a-platform-settings-auth-hotels-managers.js` | 18 | 3 | 2 | - |
| `apps/web/public/assets/js/modules/03b-platform-packages-subscriptions-dashboard.js` | 18 | 5 | 5 | - |
| `apps/web/public/assets/js/modules/04-hotel-settings.js` | 3 | 0 | 0 | - |
| `apps/web/public/assets/js/modules/05-staff.js` | 19 | 1 | 1 | staff |
| `apps/web/public/assets/js/modules/06-rooms-dashboard.js` | 7 | 1 | 2 | room-card, rooms, rooms-list |
| `apps/web/public/assets/js/modules/07-food-services.js` | 9 | 1 | 2 | food-menu-card, food-menu-list, food-order-card, food-order-item-chip, food-orders-list, food-services |
| `apps/web/public/assets/js/modules/08a-reservation-core.js` | 2 | 0 | 0 | - |
| `apps/web/public/assets/js/modules/08b-reservation-modal-print.js` | 17 | 2 | 1 | reservation-card, reservations-list |
| `apps/web/public/assets/js/modules/08c-reservation-page-events.js` | 1 | 0 | 1 | reservations |
| `apps/web/public/assets/js/modules/09a-guests.js` | 5 | 0 | 1 | guest-card, guests, guests-list |
| `apps/web/public/assets/js/modules/09b-check-in-out.js` | 1 | 0 | 1 | checkio, checkio-card, checkio-list, checkio-tabs |
| `apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js` | 1 | 1 | 1 | housekeeping, housekeeping-card, housekeeping-list |
| `apps/web/public/assets/js/modules/10a-maintenance.js` | 5 | 1 | 1 | maintenance, maintenance-card, maintenance-list |
| `apps/web/public/assets/js/modules/10b-reports.js` | 1 | 0 | 1 | reports, reports-actions, reports-summary, reports-tabs |
| `apps/web/public/assets/js/modules/10c-payments-notifications.js` | 1 | 1 | 0 | notifications, payments, payments-orders-panel, payments-summary |
| `apps/web/public/assets/js/modules/11a-subscription-plan.js` | 1 | 1 | 1 | subscription-plan |
| `apps/web/public/assets/js/modules/11b-workspace-login-shell-core.js` | 7 | 0 | 0 | - |

## الخلاصة

مرحلة UI Migration التشغيلية أصبحت مغلقة بفحص مستقل. الخطوة التالية المنطقية هي الانتقال إلى **Feature Modules Deep Refactor**، أي تفكيك كل قسم إلى `render/actions/repository/validators/constants` بدل الاكتفاء بمكونات UI مركزية.
