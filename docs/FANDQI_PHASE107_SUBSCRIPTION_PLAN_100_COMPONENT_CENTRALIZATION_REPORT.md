# FANDQI Phase 107 — Subscription & Packages 100% Component Centralization

## النطاق
تم تنفيذ هذه المرحلة على صفحة **الاشتراك والباقات** فقط، انطلاقًا من نسخة Phase 106، مع الحفاظ على إغلاقات الصفحات السابقة وعدم تعديل منطق الصفحات الأخرى.

## ما تم توحيده
- هيدر صفحة الاشتراك والباقات عبر `FandqiUI.renderSectionHead`.
- الغلاف العام للصفحة عبر وسم حماية: `data-ui-centralized="phase107-subscription-plan"`.
- سطح كروت الباقات عبر `renderSubscriptionSurface` و `FandqiUI.renderSurface`.
- كرت كل باقة عبر helper مركزي `renderSubscriptionPackageCard` بدل بناء الكرت داخل `map` مباشرة.
- ميتاداتا الباقة عبر `renderSubscriptionPackageMeta`.
- ميزات الباقة عبر `renderSubscriptionPackageFeatures`.
- أزرار طلب الباقة والتجديد عبر `FandqiUI.renderButton` مع الحفاظ على `data-subscription-plan-request`.
- شارات الحالة عبر `FandqiUI.renderBadge`.
- تفاصيل الباقة الحالية عبر `renderSubscriptionActivePackagePanel` ووسوم `data-ui-component`.
- جدول طلبات الاشتراك عبر `FandqiUI.renderTable` مع fallback مركزي داخل adapter.
- حالات الفراغ عبر `FandqiUI.renderEmptyState`.

## عناصر الحماية
- إضافة فحص خاص: `npm run subscription-plan-central:closure-audit`.
- ربط الفحص الجديد داخل `npm run quality:full` بعد فحص المدفوعات مباشرة.
- توسيع `FandqiUI` adapter بدعم `renderTable` حتى تستخدم صفحة الاشتراك والباقات جدولًا مركزيًا بدل جدول خام.
- إضافة CSS خاص بالمرحلة داخل `final-regression-fixes.css` تحت عنوان Phase 107، بدون `!important` وبدون ألوان خام.
- إضافة مفاتيح ترجمة عربية/إنجليزية جديدة متزامنة للعدادات ووصف الباقة الافتراضي.

## ما لم يتغير
- منطق قراءة الباقات من `fandqi.subscriptionPackages`.
- ترتيب إظهار الباقة الحالية أولًا.
- منع إرسال طلب مكرر لنفس الباقة.
- منطق السماح بالتجديد داخل آخر 3 أيام فقط.
- إرسال الطلبات إلى صاحب المنصة عبر `fandqi.managerSubscriptionRequests`.
- جدول طلبات تغيير/تجديد/تمديد الاشتراك.

## الفحوصات
تم تشغيل:

```powershell
npm run check
npm run smoke:test
npm run ui:audit
npm run i18n:closure-audit
npm run subscription-plan-central:closure-audit
npm run workspace-subscription-packages:audit
```

كما تم تشغيل سلسلة `quality:full`؛ وصلت إلى حد المهلة بسبب طول السلسلة بعد نجاح الفحوصات الأولى، ثم تم تشغيل بقية الفحوصات يدويًا من نقطة التوقف وكلها نجحت.

## النتيجة
صفحة **الاشتراك والباقات** مغلقة مركزيًا 100% ضمن Phase 107، مع فحص حماية يمنع رجوع البناء العشوائي داخل الصفحة.
