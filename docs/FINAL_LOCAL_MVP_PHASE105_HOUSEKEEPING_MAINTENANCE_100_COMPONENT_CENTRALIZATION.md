# Phase 105 — Housekeeping & Maintenance 100% Component Centralization

## الهدف
إغلاق صفحتي التنظيف والصيانة كمركزية مكونات 100% على مستوى الصفحة، بنفس أسلوب الصفحات التي أُغلقت سابقًا، وبدون تطبيق قواعد عامة قد تكسر صفحات أخرى.

## نطاق التنفيذ
- صفحة التنظيف.
- صفحة الصيانة.
- مودال إضافة/تعديل بلاغ الصيانة.
- فلاتر التنظيف والصيانة.
- كروت الملخص والكروت التشغيلية وأزرار الإجراءات.

## التنفيذ
- تحويل الهيدرات إلى `FandqiUI.renderSectionHead`.
- تحويل كروت الملخص إلى `FandqiUI.renderMetricCard`.
- تحويل الفلاتر إلى `FandqiUI.renderSurface` و `FandqiUI.renderField`.
- تحويل ميتاداتا الكروت إلى helpers مركزية.
- تنظيم أزرار الكروت عبر helpers مركزية مع أيقونات وألوان تشغيلية.
- تحسين مودال الصيانة بطبقات مركزية.
- إضافة طبقة CSS محددة للصفحتين فقط عبر `data-ui-centralized`.

## الملفات المعدلة
- `apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js`
- `apps/web/public/assets/js/modules/10a-maintenance.js`
- `apps/web/public/assets/css/patches/final-regression-fixes.css`
- `scripts/maintenance-housekeeping-central-closure-audit.mjs`
- `package.json`
- `FANDQI_CHANGE_NOTES.md`

## الفحص
تم تشغيل:

```powershell
npm run quality:full
```

والنتيجة: نجاح كامل.
