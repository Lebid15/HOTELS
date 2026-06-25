# Runtime Stability & True Modules — Phase 11

## Food Services Central UI Migration

تم في هذه المرحلة تحويل صفحة المطعم والكافتريا / طلبات الغرف تدريجيًا لاستخدام طبقة المكونات المركزية `FandqiUI` بدون تغيير منطق الطلبات أو الفواتير.

## الملفات الأساسية

- `apps/web/public/assets/js/modules/07-food-services.js`
- `scripts/food-ui-migration-audit.mjs`

## ما تم تحويله

- زر إضافة عنصر منيو عبر helper مركزي يستخدم `FandqiUI.renderButton`.
- زر إضافة طلب عبر helper مركزي يستخدم `FandqiUI.renderButton`.
- زر طباعة فاتورة طلب المطعم والكافتريا عبر helper مركزي.
- شارات حالة الطلب وطريقة الدفع عبر helper مركزي يستخدم `FandqiUI.renderBadge`.
- شارات توفر عناصر المنيو عبر helper مركزي.
- حالات الفراغ لقوائم المنيو والطلبات ومصادر الطلب عبر `FandqiUI.renderEmptyState`.
- شرائح عناصر الطلب عبر helper مركزي يحافظ على وضوح النص داخل الخلفيات الداكنة.
- إضافة علامات migration:
  - `data-ui-migrated="food-services"`
  - `data-ui-migrated="food-menu-list"`
  - `data-ui-migrated="food-menu-card"`
  - `data-ui-migrated="food-orders-list"`
  - `data-ui-migrated="food-order-card"`
  - `data-ui-migrated="food-order-item-chip"`

## الهدف

تثبيت صفحة المطعم والكافتريا ضمن نفس روح التصميم المركزي لأنها تحتوي على كروت، شرائح، أزرار طباعة، وفواتير.

## الفحص الجديد

```powershell
npm run food-ui-migration:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```
