# Final Local MVP Closure — Phase 38

## Subscription Packages Visible First Layout

تم تصحيح ترتيب صفحة الاشتراك والباقات حتى تظهر الباقات المتاحة مباشرة مثل باقي صفحات النظام.

## المشكلة

الباقات كانت موجودة في الصفحة لكنها أسفل تفاصيل الاشتراك وطلبات الاشتراك، لذلك تبدو وكأنها لا تظهر للمستخدم إلا بعد التمرير.

## الحل

تم تعديل:

```text
apps/web/public/assets/js/modules/11a-subscription-plan.js
```

بحيث أصبح الترتيب:

```text
عنوان الصفحة
كروت الملخص
الباقات المتاحة
تفاصيل الباقة الحالية + طلبات الاشتراك
```

## العلامات الجديدة

```html
subscription-packages-primary-panel
data-layout-fixed="packages-visible-before-details"
subscription-details-layout
data-layout-fixed="subscription-details-after-packages"
```

## الفحص

تم تحديث:

```powershell
npm run workspace-subscription-packages:audit
```

ليتحقق من أن الباقات تظهر قبل تفاصيل الاشتراك.

والفحص الكامل:

```powershell
npm run quality:full
```
