# Runtime Stability & True Modules — Phase 10

## Reservations Central UI Migration

تم في هذه المرحلة تحويل صفحة الحجوزات تدريجيًا لاستخدام طبقة المكونات المركزية `FandqiUI` بدون تغيير منطق الحجوزات أو حذف أي ميزة.

## الملفات الأساسية

- `apps/web/public/assets/js/modules/08b-reservation-modal-print.js`
- `apps/web/public/assets/js/modules/08c-reservation-page-events.js`
- `scripts/reservations-ui-migration-audit.mjs`

## ما تم تحويله

- زر إضافة حجز عبر `FandqiUI.renderButton`.
- أزرار كروت الحجوزات عبر helper مركزي `renderReservationButton`.
- شارات حالة الحجوزات عبر helper مركزي `renderReservationBadge`.
- حالة الفراغ في صفحة الحجوزات عبر `renderReservationEmptyState`.
- أزرار الإجراءات في كرت الحجز عبر `renderReservationActionButtons`.
- إضافة علامات migration:
  - `data-ui-migrated="reservations"`
  - `data-ui-migrated="reservations-list"`
  - `data-ui-migrated="reservation-card"`

## الهدف

تثبيت صفحة الحجوزات ضمن نفس روح التصميم المركزي، لأن هذه الصفحة تحتوي على عدد كبير من الكروت والأزرار والحالات والطباعة.

## الفحص الجديد

```powershell
npm run reservations-ui-migration:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```
