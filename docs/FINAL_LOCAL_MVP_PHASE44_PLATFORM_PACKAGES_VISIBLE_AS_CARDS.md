# Final Local MVP Closure — Phase 44

## Platform Packages Visible as Cards

تم إصلاح صفحة الاشتراك والباقات بحيث تعرض الباقات التي أضافها مدير المنصة فعليًا ككروت.

## المشكلة

كانت صفحة الفندق تعتمد على الباقات النشطة فقط أو على حالة غير مضمونة، لذلك قد لا تظهر الباقات التي أنشأها مدير المنصة.

## الحل

تم تعديل:

```text
apps/web/public/assets/js/modules/11a-subscription-plan.js
```

بحيث تقرأ الصفحة من مصدر مدير المنصة:

```text
fandqi.subscriptionPackages
```

وتعرض كل الباقات غير المؤرشفة ككروت.

## قواعد العرض

- تظهر كل الباقات غير المؤرشفة.
- الباقة الحالية تظهر أولًا.
- الباقات النشطة تظهر قبل المعلقة.
- الباقات المؤرشفة لا تظهر.
- كل باقة تظهر ككرت واضح داخل `subscription-offer-card`.

## الفحص

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```
