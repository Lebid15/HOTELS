# Runtime Stability & True Modules — Phase 22

## Feature Modules Deep Refactor — Reports, Payments & Notifications

تم في هذه المرحلة تحويل التقارير والمدفوعات والإشعارات إلى Feature Modules مستقلة، مع ربطها تدريجيًا بالملفات الحالية بدون تغيير منطق التشغيل.

## الملفات الجديدة

### Reports

- `apps/web/public/assets/js/professional/features/reports/constants.mjs`
- `apps/web/public/assets/js/professional/features/reports/repository.mjs`
- `apps/web/public/assets/js/professional/features/reports/validators.mjs`
- `apps/web/public/assets/js/professional/features/reports/render.mjs`
- `apps/web/public/assets/js/professional/features/reports/actions.mjs`
- `apps/web/public/assets/js/professional/features/reports/index.mjs`
- `apps/web/public/assets/js/professional/adapters/reports-feature-adapter.js`

### Payments

- `apps/web/public/assets/js/professional/features/payments/constants.mjs`
- `apps/web/public/assets/js/professional/features/payments/repository.mjs`
- `apps/web/public/assets/js/professional/features/payments/validators.mjs`
- `apps/web/public/assets/js/professional/features/payments/render.mjs`
- `apps/web/public/assets/js/professional/features/payments/actions.mjs`
- `apps/web/public/assets/js/professional/features/payments/index.mjs`
- `apps/web/public/assets/js/professional/adapters/payments-feature-adapter.js`

### Notifications

- `apps/web/public/assets/js/professional/features/notifications/constants.mjs`
- `apps/web/public/assets/js/professional/features/notifications/repository.mjs`
- `apps/web/public/assets/js/professional/features/notifications/validators.mjs`
- `apps/web/public/assets/js/professional/features/notifications/render.mjs`
- `apps/web/public/assets/js/professional/features/notifications/actions.mjs`
- `apps/web/public/assets/js/professional/features/notifications/index.mjs`
- `apps/web/public/assets/js/professional/adapters/notifications-feature-adapter.js`

## ما تم فصله في التقارير

- `constants`: أنواع التقارير والفترات الافتراضية.
- `repository`: قراءة الغرف والحجوزات وطلبات الطعام وبلاغات الصيانة من منظور التقارير.
- `validators`: تنظيف تاريخ التقرير والتحقق من نطاق التقرير.
- `render/selectors`: نطاق التقرير، فلترة التاريخ، تنسيق المال، الجمع، العد، تلخيص التقارير، أعلى عناصر الطعام.
- `actions`: تحويل الصفوف إلى CSV وتوليد اسم ملف التصدير.

## ما تم فصله في المدفوعات

- `constants`: طرق الدفع وفلاتر المدفوعات.
- `repository`: قراءة طلبات الطعام من منظور المدفوعات.
- `validators`: تنظيف البحث والتحقق من الفلاتر.
- `render/selectors`: تلخيص المدفوعات، فلترة الطلبات، وبناء كروت ملخص المدفوعات.
- `actions`: تحديث فلاتر البحث وطريقة الدفع.

## ما تم فصله في الإشعارات

- `constants`: نغمات/حالات الإشعارات.
- `repository`: قراءة الإشعارات من provider خارجي.
- `validators`: تنظيف نغمة الإشعار والتحقق من الإشعار.
- `render/selectors`: تلخيص الإشعارات، بناء خصائص زر الفتح، وبناء كروت ملخص الإشعارات.
- `actions`: تحديد هدف فتح الإشعار.

## الربط المرحلي

تم ربط الملفات التالية تدريجيًا:

- `apps/web/public/assets/js/modules/10b-reports.js`
- `apps/web/public/assets/js/modules/10c-payments-notifications.js`
- `apps/web/public/assets/js/modules/09c-housekeeping-payment-orders.js`

وأصبحت تستخدم:

```js
window.FandqiReportsFeature
window.FandqiPaymentsFeature
window.FandqiNotificationsFeature
```

## الفحص الجديد

```powershell
npm run feature-modules-reports-payments-notifications:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```

## الهدف

إخراج منطق التقارير والمدفوعات والإشعارات من الملفات الكلاسيكية تدريجيًا، وتجهيزها لاحقًا للانتقال إلى Backend/API مع الحفاظ على نفس واجهات الإدارة الحالية.
