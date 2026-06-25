# Runtime Stability & True Modules — Phase 12

## Maintenance & Housekeeping Central UI Migration

تم في هذه المرحلة تحويل صفحتي الصيانة والتنظيف تدريجيًا لاستخدام طبقة المكونات المركزية `FandqiUI` بدون تغيير منطق الصيانة أو تنظيف الغرف.

## الملفات الأساسية

- `apps/web/public/assets/js/modules/10a-maintenance.js`
- `apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js`
- `scripts/maintenance-housekeeping-ui-migration-audit.mjs`

## ما تم تحويله في الصيانة

- زر إضافة بلاغ صيانة عبر helper مركزي يستخدم `FandqiUI.renderButton`.
- أزرار كرت بلاغ الصيانة:
  - بدء المعالجة
  - تم الحل
  - انتظار قطع
  - تعديل
  - إلغاء
- شارة حالة بلاغ الصيانة عبر `renderMaintenanceBadge`.
- شارة أولوية الصيانة عبر `renderMaintenancePriorityBadge`.
- حالة الفراغ عبر `renderMaintenanceEmptyState`.
- علامات migration:
  - `data-ui-migrated="maintenance"`
  - `data-ui-migrated="maintenance-list"`
  - `data-ui-migrated="maintenance-card"`

## ما تم تحويله في التنظيف

- أزرار كرت تنظيف الغرفة:
  - تم التنظيف
  - إرسال للصيانة
  - عرض الغرفة
- شارة حالة الغرفة عبر `renderHousekeepingBadge`.
- حالة الفراغ عبر `renderHousekeepingEmptyState`.
- علامات migration:
  - `data-ui-migrated="housekeeping"`
  - `data-ui-migrated="housekeeping-list"`
  - `data-ui-migrated="housekeeping-card"`

## الفحص الجديد

```powershell
npm run maintenance-housekeeping-ui-migration:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```
