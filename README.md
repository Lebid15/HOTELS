# Fandqi Central Core

نسخة تأسيسية من مشروع فندقي.

## الموجود حاليًا

- تسجيل دخول بثلاث حسابات.
- واجهة صاحب المنصة.
- واجهة مدير الفندق.
- واجهة موظف الاستقبال.
- قسم الفنادق داخل حساب صاحب المنصة.

## قسم الفنادق

تم تجهيز القسم كأول قسم فعلي لصاحب المنصة، ويحتوي على:

- إضافة فندق جديد.
- جدول الفنادق.
- بحث باسم الفندق أو المدير.
- فلتر حسب الحالة.
- فلتر حسب الدولة أو المدينة.
- عرض تفاصيل الفندق.
- تعديل بيانات الفندق.
- تعيين مدير الفندق.
- تفعيل / إيقاف الفندق.
- أرشفة الفندق بدل الحذف النهائي.

لا توجد بيانات وهمية داخل القسم.

## الحسابات التجريبية

```text
platform@fandqi.com   / 123456
manager@fandqi.com    / 123456
reception@fandqi.com  / 123456
```

## التشغيل

```powershell
npm install
npm run dev
```

ثم افتح:

```text
http://localhost:4000
```

## الفحص

```powershell
npm run check
npm run ui:audit
npm run smoke:test
```


## تحديث نموذج الفندق

- حذف تكرار البريد الإلكتروني، والاعتماد على بريد إلكتروني واحد للفندق ومدير الفندق معًا.
- إضافة حقل تأكيد كلمة المرور.
- إضافة زر عين لإظهار/إخفاء كلمة المرور.
- إضافة رموز بصرية داخل عناوين الحقول.

- في نموذج إضافة/تعديل الفندق يوجد بريد إلكتروني واحد فقط بدون تكرار.


## تثبيت زر العين

تم تثبيت مكان زر إظهار/إخفاء كلمة المرور في كل حقول كلمة المرور داخل المشروع، ومنع تحركه عند hover أو focus أو تغيير اللغة أو تبديل الأيقونة.


## قسم مديرو الفنادق

تمت إضافة قسم مديرو الفنادق داخل واجهة صاحب المنصة.

القسم يعتمد على الفنادق التي تمت إضافتها سابقًا، ولا ينشئ بيانات وهمية.

الموجود حاليًا:

- عرض مديري الفنادق المرتبطين بالفنادق.
- بحث باسم المدير أو الفندق أو البريد الإلكتروني.
- فلترة حسب حالة حساب المدير.
- فلترة حسب حالة الفندق.
- تعديل بيانات المدير.
- تفعيل / إيقاف حساب المدير.
- عرض الفندق المرتبط بالمدير.


## قسم الاشتراكات

- إضافة قسم اشتراكات خاص بصاحب المنصة.
- كل اشتراك مرتبط بفندق موجود داخل قسم الفنادق.
- يدعم الباقة، حالة الاشتراك، تاريخ البداية والنهاية، المبلغ الشهري، العملة، حالة الدفع، والملاحظات.
- لا توجد بيانات وهمية؛ تظهر الفنادق الموجودة فقط.


## تحديث الاشتراكات

- إضافة عدد أيام الباقة.
- تاريخ البداية يتم تعبئته تلقائيًا بتاريخ اليوم عند إنشاء الاشتراك.
- تاريخ النهاية يتم حسابه تلقائيًا حسب تاريخ البداية وعدد أيام الباقة.
- عند تغيير الباقة يتم تحديث عدد الأيام الافتراضي وحساب تاريخ النهاية مباشرة.

## قسم الباقات

تمت إضافة قسم الباقات داخل واجهة صاحب المنصة قبل قسم الاشتراكات.

القسم يحتوي على:

- إضافة باقة جديدة.
- عرض الباقات في جدول.
- بحث باسم الباقة أو الوصف.
- فلترة حسب حالة الباقة.
- عرض تفاصيل الباقة.
- تعديل الباقة.
- تفعيل / إيقاف الباقة.
- أرشفة الباقة بدل الحذف النهائي.

حقول الباقة:

- اسم الباقة.
- وصف مختصر.
- عدد أيام الباقة.
- السعر.
- العملة.
- حالة الباقة.
- عدد المستخدمين المسموح.
- عدد الغرف المسموح.
- دعم المطعم / الكافتريا.
- دعم التقارير.
- دعم الوضع التجريبي.
- ملاحظات.

## ربط الباقات بالاشتراكات

تم تعديل قسم الاشتراكات ليعتمد على الباقات التي ينشئها صاحب المنصة بدل الباقات الثابتة داخل الكود.

عند اختيار باقة داخل الاشتراك يتم تعبئة القيم التالية تلقائيًا:

- عدد أيام الباقة.
- سعر الباقة.
- العملة.
- تاريخ النهاية حسب تاريخ البداية وعدد الأيام.

لا يمكن إنشاء اشتراك قبل وجود فندق وباقة فعالة.


## آخر تحديث: إعدادات المنصة

تم تجهيز قسم إعدادات المنصة داخل حساب صاحب المنصة، ويشمل:
- اسم المنصة بالعربي والإنكليزي.
- رفع شعار المنصة وإزالته.
- البريد الرسمي ورقم الهاتف الرسمي.
- العملة الافتراضية.
- اللغة الافتراضية.
- الواجهة تعمل بثيم فاتح ثابت بدون تبديل ثيم.
- إعدادات الفاتورة.
- بيانات الدعم.
- ملاحظات داخلية.

كل الإعدادات تحفظ محليًا في هذه النسخة التجريبية عبر localStorage.

## Platform Settings Expansion

The platform owner settings now include:

- Owner password change with current password, new password, confirmation, and fixed eye toggles.
- Invoice and subscription numbering prefixes and last used numbers.
- Subscription expiry notification preferences.
- Support WhatsApp, website, Facebook, and Instagram links.
- Subscription terms, suspension policy, and legal note fields.
- Local JSON backup export/import.
- Clear local operations data for hotels, packages, and subscriptions.



## تحديث إعدادات المنصة بنظام التبويبات

- تحويل صفحة إعدادات المنصة من صفحة طويلة إلى أزرار تبويب.
- التبويبات: هوية المنصة، الإعدادات الافتراضية، الأمان، الفواتير، التنبيهات، الدعم، الشروط، النسخ الاحتياطي.
- حفظ الإعدادات بقي مركزيًا من زر حفظ واحد.
- تبديل التبويبات لا يحذف القيم المكتوبة داخل النموذج قبل الحفظ.


## تحديث إعدادات المنصة الضرورية

تمت إضافة الإعدادات الضرورية لإغلاق قسم إعدادات المنصة مبدئيًا:

- المنطقة الزمنية.
- صيغة التاريخ.
- صيغة الوقت.
- الدولة الافتراضية.
- نسبة الضريبة.
- معاينة الفاتورة.
- رسالة التنبيه قبل انتهاء الاشتراك.
- رسالة انتهاء الاشتراك.


## لوحة التحكم الذكية

- إضافة كروت ذكية لصاحب المنصة تعتمد على الفنادق والمدراء والباقات والاشتراكات الحالية.
- إضافة اختصارات سريعة لإضافة فندق وباقة واشتراك.
- إضافة قائمة اشتراكات قريبة الانتهاء حسب إعدادات التنبيه.


## Modal and Icon System Correction

- Addition/edit modals were widened and compacted to avoid internal scrolling on desktop screens.
- Modal form fields now use three-column desktop layout and compact input heights.
- Form textareas were shortened to fit inside the modal without internal scroll.
- The premium icon system was normalized to a cleaner professional outline style.
- Heavy gradient icon badges were removed from form labels and reduced across sidebar, dashboard, tabs, and quick actions.

## تحديث واجهة مدير الفندق

- تثبيت ترتيب أقسام مدير الفندق في السايدبار.
- إضافة قسم إعدادات الفندق كأول قسم تأسيسي قبل الغرف والحجوزات.
- إعدادات الفندق تحفظ محليًا وترتبط بالفندق الذي يديره المدير.
- إضافة إعدادات الهوية، الشعار، التشغيل، الطوابق، أنواع الغرف، أوقات الدخول والمغادرة، السياسات، والفواتير.
- الأقسام التالية ظهرت بالسايدبار كهيكل جاهز للتنفيذ قسمًا قسمًا: الموظفون، الحجوزات، النزلاء، الدخول والمغادرة، خدمة الغرف، التنظيف، الصيانة، المدفوعات، التقارير.


## Manager Hotel Settings Tabs

- Hotel manager settings are now organized into tab buttons: identity, operation, policies, and billing.
- Values remain in the same form and are saved together from the central save button.


## تحديث إعدادات المطعم والكافتريا

- اسم المطعم والكافتريا يعتمد على اسم الفندق ولا يحتاج اسمًا منفصلًا.
- إزالة ورديات المطعم والكافتريا من الإعدادات؛ الورديات أصبحت مخصصة للاستقبال.
- إضافة إعدادات ورديات الاستقبال داخل إعدادات التشغيل.
- إضافة مصادر تسجيل الطلبات: طلب من غرفة، طلب من طاولة، وطلب خارجي للضيف.
- إضافة سجل طلبات داخل قسم المطعم والكافتريا.


## Manager hotel settings final additions

- Added hotel contact information tab.
- Added check-in/check-out guest policy times.
- Added deposit and security deposit settings.
- Added automatic room cleaning after checkout settings.
- Added tax/commercial registration fields.
- Added booking/invoice/service-order numbering settings.

## Technical Closure قبل لوحة التحكم

- توسيع النسخ الاحتياطي ليشمل بيانات التشغيل الأساسية.
- إضافة مفاتيح الترجمة الناقصة.
- تنظيف تكرار زر حذف الصورة الشخصية.
- إضافة طبقة مركزية لقوالب الطباعة.
- إضافة اختبار `npm run closure:test`.
- إضافة توثيق `docs/TECHNICAL_CLOSURE.md` و `docs/BACKEND_ROADMAP.md`.


## Latest update — Hotel manager dashboard

The hotel manager dashboard now includes a top quick-action bar and smart clickable cards. The manager can quickly reach reservations, arrivals, departures, rooms, guests, housekeeping, maintenance, food orders, room-account charges, financial reports, hotel settings, and staff management directly from the dashboard.

## Professional Modular Refactor

تم تقسيم واجهة المشروع إلى بنية احترافية:

- `assets/js/modules/` لمنطق الصفحات والميزات.
- `assets/css/base/` للأساسيات.
- `assets/css/components/` للمكونات المشتركة.
- `assets/css/layout/` للسايدبار والتوب بار والتخطيط.
- `assets/css/pages/` لستايل الصفحات.
- `assets/css/patches/` للإصلاحات التراكمية المحمية.

بعد أي تعديل شغّل:

```bash
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


## Runtime Stability & True Modules — Phase 3

تمت إضافة طبقتي adapters مركزيتين:

```text
apps/web/public/assets/js/professional/adapters/storage-adapter.js
apps/web/public/assets/js/professional/adapters/print-adapter.js
```

الأوامر المهمة:

```powershell
npm run quality:full
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

## Runtime Stability & True Modules — Phase 7

تمت إضافة بداية تحويل الصفحات الفعلية إلى مكونات واجهة مركزية عبر `FandqiUI`، ابتداءً من صفحة الاشتراك والباقات وإدارة الباقات.

أمر الفحص الجديد:

```powershell
npm run ui-migration:audit
```

الأمر الشامل بعد أي تعديل:

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

## Phase 114 — Staff Front Desk Central Closure

تم إغلاق لوحة الموظف التشغيلية ومركز الاستقبال اليومي بمركزية مكونات كاملة.

تشغيل الفحص الخاص:

```powershell
npm run staff-frontdesk-central:closure-audit
```

تشغيل النسخة:

```powershell
npm install
npm run check
npm run staff-frontdesk-central:closure-audit
npm run dev
```

## Phase 115 — Notifications Central Closure

تم إغلاق صفحة الإشعارات مركزيًا 100% مع بقاء الوصول إليها من رمز الجرس في التوببار فقط، دون إعادتها إلى السايدبار.

فحص المرحلة:

```powershell
npm run notifications-central:closure-audit
```
