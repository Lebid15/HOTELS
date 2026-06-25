# Fandqi — Reports Section Build

## Run on Windows PowerShell

```powershell
cd D:\fandqi-central-core
npm install
npm run check
npm run ui:audit
npm run smoke:test
npm run dev
```

Open:

```text
http://localhost:4000
```

Login:

```text
manager@fandqi.com / 123456
```

Open **التقارير** from the hotel manager sidebar.

## Technical Closure قبل لوحة التحكم

- توسيع النسخ الاحتياطي ليشمل بيانات التشغيل الأساسية.
- إضافة مفاتيح الترجمة الناقصة.
- تنظيف تكرار زر حذف الصورة الشخصية.
- إضافة طبقة مركزية لقوالب الطباعة.
- إضافة اختبار `npm run closure:test`.
- إضافة توثيق `docs/TECHNICAL_CLOSURE.md` و `docs/BACKEND_ROADMAP.md`.


## بعد التقسيم الاحترافي

شغّل المشروع كالمعتاد:

```powershell
npm install
npm run dev
```

ولفحص النسخة كاملة:

```powershell
npm run quality:full
```


## Phase: Runtime Stability & True Modules

تمت إضافة طبقة تنظيم احترافية جديدة:

```text
apps/web/public/assets/js/professional/
```

وأصبح الفحص الشامل:

```powershell
npm run quality:full
```

يشمل فحوصات الاستقرار والمعمارية الجديدة.


## Professional Runtime Phase 2

تمت إضافة طبقة Runtime مركزية آمنة للتخزين والطباعة ومستودعات الدومين. بعد أي تعديل شغّل:

```powershell
npm run quality:full
```


## فحص المرحلة الاحترافية

بعد التشغيل أو قبل أي تسليم نفذ:

```powershell
npm run quality:full
```

لفحص طبقات التخزين والطباعة فقط:

```powershell
npm run adapters:audit
```


## Runtime Stability & True Modules — Phase 4

تم فصل نظام الطباعة إلى ES Modules حقيقية. بعد أي تعديل شغّل:

```powershell
npm run quality:full
```

ويتضمن الفحص الآن `print-system:audit`.


## Runtime Stability & True Modules — Phase 5

تمت إضافة طبقة تخزين وRepositories احترافية داخل `apps/web/public/assets/js/professional/storage/` مع فحص جديد:

```powershell
npm run storage-system:audit
```

ويتم تشغيله تلقائيًا ضمن:

```powershell
npm run quality:full
```


## Phase 6 — Central UI Components System

تمت إضافة طبقة مكونات مركزية للواجهة داخل:

```text
apps/web/public/assets/js/professional/ui/
```

مع واجهة توافق:

```js
window.FandqiUI
```

وأصبح الفحص الكامل يشمل:

```powershell
npm run ui-components:audit
npm run quality:full
```

## Phase 7 — Central UI Migration

بعد هذه المرحلة، عند تعديل صفحة الاشتراك أو الباقات، يجب استخدام مكونات `FandqiUI` للأزرار والشارات وحالات الفراغ بدل كتابة HTML يدوي جديد.

أمر الفحص:

```powershell
npm run quality:full
```


## Runtime Stability & True Modules — Phase 8
- Staff page cards/actions now use the central `FandqiUI` helpers.
- New audit: `npm run staff-ui-migration:audit`.
- Full validation remains: `npm run quality:full`.


## Phase 9 - Rooms Central UI Migration

تمت إضافة فحص صفحة الغرف:

```powershell
npm run rooms-ui-migration:audit
```

والفحص الكامل يبقى:

```powershell
npm run quality:full
```


## Phase 10 - Reservations Central UI Migration

تمت إضافة فحص صفحة الحجوزات:

```powershell
npm run reservations-ui-migration:audit
```

والفحص الكامل يبقى:

```powershell
npm run quality:full
```


## Phase 11 - Food Services Central UI Migration

تمت إضافة فحص صفحة المطعم والكافتريا / طلبات الغرف:

```powershell
npm run food-ui-migration:audit
```

والفحص الكامل يبقى:

```powershell
npm run quality:full
```


## Phase 12 - Maintenance & Housekeeping Central UI Migration

تمت إضافة فحص صفحتي الصيانة والتنظيف:

```powershell
npm run maintenance-housekeeping-ui-migration:audit
```

والفحص الكامل يبقى:

```powershell
npm run quality:full
```


## Phase 13 - Reports & Payments Central UI Migration

تمت إضافة فحص صفحتي التقارير والمدفوعات:

```powershell
npm run reports-payments-ui-migration:audit
```

والفحص الكامل يبقى:

```powershell
npm run quality:full
```


## Phase 14 - Guests & Check-in/out Central UI Migration

تمت إضافة فحص صفحتي النزلاء والدخول/المغادرة:

```powershell
npm run guests-checkio-ui-migration:audit
```

والفحص الكامل يبقى:

```powershell
npm run quality:full
```


## Phase 15 - UI Migration Closure Audit

تمت إضافة فحص إغلاق مرحلة UI Migration:

```powershell
npm run ui-migration:closure-audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 16 - Feature Modules Deep Refactor: Rooms

تمت إضافة Feature Module لقسم الغرف وفحصه:

```powershell
npm run feature-modules-rooms:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 17 - Feature Modules Reservations

تمت إضافة Feature Module لقسم الحجوزات وفحصه:

```powershell
npm run feature-modules-reservations:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 18 - Feature Modules Staff

تمت إضافة Feature Module لقسم الموظفين وفحصه:

```powershell
npm run feature-modules-staff:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 19 - Feature Modules Food Services

تمت إضافة Feature Module لقسم المطعم والكافتريا / طلبات الغرف وفحصه:

```powershell
npm run feature-modules-food:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 20 - Feature Modules Maintenance & Housekeeping

تمت إضافة Feature Modules للصيانة والتنظيف وفحصها:

```powershell
npm run feature-modules-maintenance-housekeeping:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 21 - Feature Modules Guests & Check-in/out

تمت إضافة Feature Modules للنزلاء والدخول/المغادرة وفحصها:

```powershell
npm run feature-modules-guests-checkio:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 22 - Feature Modules Reports, Payments & Notifications

تمت إضافة Feature Modules للتقارير والمدفوعات والإشعارات وفحصها:

```powershell
npm run feature-modules-reports-payments-notifications:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 23 - Feature Modules Closure Audit

تمت إضافة فحص إغلاق Feature Modules:

```powershell
npm run feature-modules:closure-audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 24 - Production Readiness Audit

تمت إضافة فحص جاهزية Production:

```powershell
npm run production-readiness:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```

ملاحظة: نتيجة الفحص توضح أن المشروع Local MVP منظم، وليس Production SaaS كاملًا بعد.

## Final Local MVP Closure - Unified Workspace Tabs

تم توحيد ستايل تبويبات إعدادات الفندق والدخول/المغادرة والتقارير.

فحص التبويبات:

```powershell
npm run workspace-tabs-consistency:audit
```

الفحص الكامل:

```powershell
npm run quality:full
```


## Final Local MVP Closure — Phase 26

تم إصلاح تبويبات صفحة الدخول والمغادرة بعد توحيد ستايل التبويبات، عبر جعل `FandqiUI.renderTabs` fallback يحافظ على `tab.attrs` مثل `data-checkio-tab`.

```powershell
npm run quality:full
```


## Phase 27 - Global Filters Layout Fix

تمت إضافة فحص منع تداخل شريط الفلتر مع المحتوى:

```powershell
npm run workspace-filters-layout:audit
```

والفحص الكامل:

```powershell
npm run quality:full
```


## Phase 28 - Strict Compact Unified Filters Fix

تم تشديد إصلاح الفلاتر وتوحيد شكلها المضغوط في صفحات الغرف والموظفين وباقي الصفحات.

```powershell
npm run workspace-filters-layout:audit
npm run quality:full
```


## Phase 31 - Outer Content Card Removed

تم إلغاء الشكل البصري لكرت المحتوى الخارجي الكبير مع الحفاظ على البنية والتمرير:

```powershell
npm run workspace-outer-card-removal:audit
npm run quality:full
```


## Phase 32 - Rooms Filter Independent Bar

تم إصلاح بنية فلتر صفحة الغرف ليكون شريطًا مستقلًا تمامًا عن كروت الطوابق:

```powershell
npm run workspace-filters-layout:audit
npm run quality:full
```


## Phase 33 - Rooms Filter Vertical Stack

تم إصلاح فلتر صفحة الغرف بجعل الصفحة تخطيطًا عموديًا واضحًا بدل grid العام:

```powershell
npm run workspace-filters-layout:audit
npm run quality:full
```


## Phase 34 - Manager Pages Filter Vertical Stack

تم إصلاح تداخل فلاتر النزلاء وباقي صفحات المدير عبر تحويلها لتخطيط عمودي مستقل:

```powershell
npm run workspace-filters-layout:audit
npm run quality:full
```


## Phase 35 - Payments Layout & Cards Fixed

تم إصلاح صفحة المدفوعات وتوحيد كروت الملخص والفلتر:

```powershell
npm run workspace-payments-layout:audit
npm run quality:full
```


## Phase 36 - Reports Actions Outside Filters

تم نقل أزرار التقارير إلى أعلى الصفحة وإخراجها من شريط الفلتر:

```powershell
npm run workspace-reports-actions-layout:audit
npm run quality:full
```


## Phase 37 - Subscription Packages Redesign

تمت إعادة تنسيق صفحة الاشتراك والباقات وضبط منطق التجديد والتمديد:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 38 - Subscription Packages Visible First

تم جعل الباقات المتاحة تظهر مباشرة بعد كروت الملخص وقبل تفاصيل الاشتراك:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 39 - Subscription Package Cards Force Visible

تم إجبار كروت الباقات أن تظهر مباشرة بعد عنوان الصفحة وقبل الملخص والتفاصيل:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 40 - Subscription Page Rebuilt Packages First

تم إعادة بناء صفحة الاشتراك والباقات لتظهر كروت الباقات أولًا بشكل واضح:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 41 - Subscription Summary Cards Removed

تم حذف كروت ملخص الاشتراك المكررة من صفحة الاشتراك والباقات:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```

## Phase 42 - Subscription Packages Final Rebuild

تم تثبيت صفحة الاشتراك والباقات كصفحة باقات أولًا، بدون كروت ملخص مكررة:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 43 - Current Subscription Compact

تم تصغير قسم الباقة الحالية حتى تبقى كروت الباقات هي العنصر الأساسي والواضح:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 44 - Platform Packages Visible as Cards

تم إصلاح مصدر عرض الباقات بحيث تظهر باقات مدير المنصة ككروت داخل صفحة الفندق:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 45 - Subscription Page Empty

تم تفريغ صفحة الاشتراك والباقات بالكامل:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 46 - Platform Package Offer Cards

تم إضافة كروت عروض الباقات القادمة من لوحة صاحب المنصة داخل صفحة الاشتراك والباقات:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 47 - Subscription Package Header Removed

تم حذف رأس قسم الباقات والنصوص التوضيحية، وأصبحت الصفحة تعرض كروت الباقات فقط:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 48 - Compact Cards Active Package Details

تم تصغير كروت الباقات وإضافة تفاصيل الباقة المفعلة أسفلها:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 49 - Subscription Requests Table

تم إضافة جدول طلبات تغيير الباقة أو التمديد أسفل صفحة الاشتراك والباقات:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 50 - Large Subscription Cards Scroll

تم تكبير كروت الباقات وجعل الصفحة تعتمد على السكرول بدل ضغط الكروت:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 51 - Balanced Professional Subscription Cards

تم تعديل كروت الباقات لتكون أصغر ومنظمة واحترافية أكثر:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 52 - One Request Renewal Warning

تم منع تكرار طلب نفس الباقة وإضافة تحذير تجديد قبل 3 أيام من انتهاء الاشتراك:

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```


## Phase 53 - Stable Hotel Settings Tabs

تم تثبيت شريط تبويبات إعدادات الفندق حتى يبقى بنفس الشكل عند التنقل بين التبويبات:

```powershell
npm run workspace-tabs-consistency:audit
npm run quality:full
```


## Phase 54 - Hotel Settings Tabbar Fixed Height

تم تثبيت ارتفاع حاوية شريط تبويبات إعدادات الفندق حتى لا يتغير حجمه بين التبويبات:

```powershell
npm run workspace-tabs-consistency:audit
npm run quality:full
```


## Phase 55 - Hotel Settings Title-only Header

تم جعل رأس إعدادات الفندق فوق شريط الأزرار عنوانًا فقط وبارتفاع ثابت:

```powershell
npm run workspace-tabs-consistency:audit
npm run quality:full
```


## Phase 56 - Staff Card Actions Fixed

تم تحسين كروت الموظفين وتثبيت حجم وترتيب وألوان أزرار الإجراءات:

```powershell
npm run staff-ui-migration:audit
npm run quality:full
```


## Phase 57 - Guest Cards Three Per Row

تم تعديل كروت النزلاء لتظهر 3 كروت في السطر على الشاشات الكبيرة:

```powershell
npm run guests-checkio-ui-migration:audit
npm run quality:full
```


## Phase 58 - Checkio Three Per Row Global Headers

تم تعديل كروت الدخول والمغادرة إلى 3 كروت بالسطر، وتوحيد هيدر الصفحات ليعرض اسم القسم فقط مع الأزرار إن وجدت:

```powershell
npm run quality:full
```


## Phase 62 - Hotel Settings Header Tabs Locked

تم تثبيت هيدر إعدادات الفندق وشريط التبويبات بشكل صارم بدون تغيّر في البادينغ أو أماكن العناصر:

```powershell
npm run workspace-tabs-consistency:audit
npm run quality:full
```

## Phase 114 - Staff Operational + Front Desk Central Closure

تم إغلاق صفحة الاستقبال ولوحة الموظف التشغيلية مركزيًا 100%.

```powershell
npm run staff-frontdesk-central:closure-audit
npm run quality:full
```

## Phase 115 — Notifications Page

بعد تشغيل المشروع، افتح صفحة الإشعارات من رمز الجرس في التوببار. الإشعارات لم تعد تظهر في السايدبار حسب قرار الإغلاق السابق.

فحص سريع:

```powershell
npm run check
npm run notifications-central:closure-audit
npm run dev
```
