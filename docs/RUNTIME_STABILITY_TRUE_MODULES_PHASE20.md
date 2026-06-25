# Runtime Stability & True Modules — Phase 20

## Feature Modules Deep Refactor — Maintenance & Housekeeping

تم في هذه المرحلة تحويل الصيانة والتنظيف إلى Feature Modules مستقلة، مع ربطها تدريجيًا بالملفات الكلاسيكية وبحالة الغرف والتشغيل اليومي.

## الملفات الجديدة

### Maintenance

- `apps/web/public/assets/js/professional/features/maintenance/constants.mjs`
- `apps/web/public/assets/js/professional/features/maintenance/repository.mjs`
- `apps/web/public/assets/js/professional/features/maintenance/validators.mjs`
- `apps/web/public/assets/js/professional/features/maintenance/render.mjs`
- `apps/web/public/assets/js/professional/features/maintenance/actions.mjs`
- `apps/web/public/assets/js/professional/features/maintenance/index.mjs`
- `apps/web/public/assets/js/professional/adapters/maintenance-feature-adapter.js`

### Housekeeping

- `apps/web/public/assets/js/professional/features/housekeeping/constants.mjs`
- `apps/web/public/assets/js/professional/features/housekeeping/repository.mjs`
- `apps/web/public/assets/js/professional/features/housekeeping/validators.mjs`
- `apps/web/public/assets/js/professional/features/housekeeping/render.mjs`
- `apps/web/public/assets/js/professional/features/housekeeping/actions.mjs`
- `apps/web/public/assets/js/professional/features/housekeeping/index.mjs`
- `apps/web/public/assets/js/professional/adapters/housekeeping-feature-adapter.js`

## ما تم فصله في الصيانة

- `constants`: حالات الصيانة، الحالات النشطة، الأولويات، الأنواع، القيم الافتراضية.
- `repository`: قراءة/كتابة بلاغات الصيانة، جلب بلاغ، جلب بلاغات الفندق، تحديث الحالة.
- `validators`: تنظيف بلاغ الصيانة والتحقق من بياناته الأساسية.
- `render/selectors`: الحالات النشطة، توليد رقم البلاغ، تلخيص البلاغات، ترتيبها.
- `actions`: تحديث حالة البلاغ، إنشاء بلاغ تلقائي لغرفة، إنشاء بلاغات تلقائية للغرف التي حالتها صيانة.

## ما تم فصله في التنظيف

- `constants`: فلاتر التنظيف الافتراضية، حالات الانتباه، ترتيب حالات الغرف.
- `repository`: قراءة/كتابة الغرف من منظور التنظيف، وتحديث حالة الغرفة.
- `validators`: تنظيف نص البحث والتحقق من تغيير حالة الغرفة.
- `render/selectors`: حجوزات الغرفة، آخر حجز، تلخيص الغرف، ترتيبها، فلترتها.
- `actions`: تعليم الغرفة نظيفة، إرسال الغرفة للصيانة، جعل الغرفة قيد التنظيف، وتحديث حالة الغرفة.

## الربط المرحلي

تم ربط الملفات التالية تدريجيًا:

- `apps/web/public/assets/js/modules/10a-maintenance.js`
- `apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js`

وأصبحت تستخدم:

```js
window.FandqiMaintenanceFeature
window.FandqiHousekeepingFeature
```

## الفحص الجديد

```powershell
npm run feature-modules-maintenance-housekeeping:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```

## الهدف

تقليل تشابك الصيانة والتنظيف مع الملفات الكلاسيكية، وتجهيز القسمين للتحويل لاحقًا إلى Backend/API مع المحافظة على منطق التشغيل الحالي.
