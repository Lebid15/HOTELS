# Runtime Stability & True Modules — Phase 14

## Guests & Check-in/out Central UI Migration

تم في هذه المرحلة تحويل صفحتي النزلاء والدخول/المغادرة تدريجيًا لاستخدام طبقة المكونات المركزية `FandqiUI` بدون تغيير منطق النزلاء أو إجراءات الدخول والمغادرة.

## الملفات الأساسية

- `apps/web/public/assets/js/modules/09a-guests.js`
- `apps/web/public/assets/js/modules/09b-check-in-out.js`
- `scripts/guests-checkio-ui-migration-audit.mjs`

## ما تم تحويله في النزلاء

- أزرار كرت النزيل:
  - عرض
  - فتح الحجز
  - طباعة الحجز
- شارة حالة إقامة النزيل عبر helper مركزي.
- حالة الفراغ عبر `renderGuestsEmptyState`.
- علامات migration:
  - `data-ui-migrated="guests"`
  - `data-ui-migrated="guests-list"`
  - `data-ui-migrated="guest-card"`

## ما تم تحويله في الدخول والمغادرة

- تبويبات الدخول والمغادرة عبر `FandqiUI.renderTabs`.
- أزرار كرت الدخول والمغادرة:
  - تسجيل الدخول
  - تسجيل الخروج
  - منع الخروج عند وجود رصيد
  - عرض الحجز
  - طباعة الحجز
  - كشف حساب
- شارة حالة الجدول الزمني للحجز عبر helper مركزي.
- حالة الفراغ عبر `FandqiUI.renderEmptyState`.
- علامات migration:
  - `data-ui-migrated="checkio"`
  - `data-ui-migrated="checkio-tabs"`
  - `data-ui-migrated="checkio-list"`
  - `data-ui-migrated="checkio-card"`

## الفحص الجديد

```powershell
npm run guests-checkio-ui-migration:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```
