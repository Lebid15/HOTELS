# Final Local MVP Closure — Phase 37

## Subscription Packages Professional Redesign

تمت إعادة تنسيق صفحة الاشتراك والباقات بشكل احترافي، مع ضبط منطق طلب التجديد والتمديد.

## التغييرات البصرية

تم تحسين:

- كروت ملخص الاشتراك.
- كرت الباقة الحالية.
- كرت سياسة التجديد والتمديد.
- قائمة طلبات الاشتراك.
- كروت الباقات المتاحة.
- شكل الباقة الحالية والحالة والحدود والظلال.

## منطق التجديد والتمديد

تمت إضافة قاعدة:

```text
لا يمكن طلب التجديد أو التمديد طالما الاشتراك فعالًا خارج آخر 3 أيام قبل الانتهاء.
```

إذا ضغط المستخدم على زر التجديد أو التمديد قبل الوقت المسموح تظهر رسالة:

```text
لا يمكن طلب التجديد أو التمديد الآن لأن حسابك ما زال فعالًا.
يتفعل الطلب قبل 3 أيام من انتهاء الاشتراك فقط.
يمكنك تغيير الباقة في أي وقت.
```

## تغيير الباقة

زر تغيير الباقة يبقى متاحًا في أي وقت، كما طلب المستخدم.

## الملفات المعدلة

```text
apps/web/public/assets/js/modules/11a-subscription-plan.js
apps/web/public/assets/css/patches/final-regression-fixes.css
scripts/workspace-subscription-packages-audit.mjs
```

## الفحص

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```
