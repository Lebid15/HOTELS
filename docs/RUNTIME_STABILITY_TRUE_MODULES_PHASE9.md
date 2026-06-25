# Runtime Stability & True Modules — Phase 9

## Rooms Central UI Migration

تم في هذه المرحلة تحويل صفحة الغرف تدريجيًا لاستخدام طبقة المكونات المركزية `FandqiUI` بدون تغيير منطق الغرف أو حذف أي ميزة.

## الملفات الأساسية

- `apps/web/public/assets/js/modules/06-rooms-dashboard.js`
- `apps/web/public/assets/js/professional/adapters/ui-adapter.js`
- `scripts/rooms-ui-migration-audit.mjs`

## ما تم تحويله

- زر إضافة غرفة عبر `FandqiUI.renderButton`.
- أزرار كروت الغرف عبر helper مركزي `renderRoomButton`.
- شارات حالة الغرف عبر helper مركزي `renderRoomBadge`.
- حالة الفراغ في صفحة الغرف عبر `renderRoomEmptyState`.
- إضافة علامات migration:
  - `data-ui-migrated="rooms"`
  - `data-ui-migrated="rooms-list"`
  - `data-ui-migrated="room-card"`

## الهدف

تثبيت صفحة الغرف ضمن نفس روح التصميم المركزي حتى لا تتكرر مشاكل اختلاف الأزرار والكروت والـ hover والحالات بين الصفحات.

## الفحص الجديد

```powershell
npm run rooms-ui-migration:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```
