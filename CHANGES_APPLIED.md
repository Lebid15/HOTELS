# Fandqi — Applied UI Patch

## التعديلات المطبقة

1. ضغط تبويب الوثائق داخل مودال الحجز:
   - تحويل الوثيقة الأساسية إلى كرت Compact.
   - تحويل وثائق المرافقين إلى Accordion مغلق افتراضيًا.
   - إخفاء وثائق المرافقين عند عدم وجود مرافقين بالغين.
   - تحويل إثبات القرابة إلى Accordion مغلق افتراضيًا ويظهر فقط عند الحاجة.
   - تقليل ارتفاع الحقول والأزرار والمسافات داخل تبويب الوثائق.
   - اختصار أسماء الملفات داخل شارة صغيرة مع ellipsis.

2. تصغير فلاتر الحجوزات:
   - تقليل ارتفاع حقول الفلترة إلى 38px تقريبًا.
   - تقليل padding والمسافات.
   - الحفاظ على تجاوب الموبايل عبر شبكة عمودية.

3. إضافة صور المدير والموظفين:
   - مكون AvatarUploader مركزي.
   - رفع صورة شخصية اختيارية للمدير داخل نموذج الفندق/المدير.
   - رفع صورة شخصية اختيارية لكل موظف داخل نموذج الموظف.
   - معاينة مباشرة للصورة.
   - زر حذف الصورة.
   - fallback بالأحرف الأولى عند عدم وجود صورة.
   - تخزين الصور محليًا في نسخة Prototype.

4. عرض الصور داخل الواجهات:
   - صورة الموظف تظهر كبيرة وواضحة داخل كرت الموظف.
   - صورة الموظف تظهر في نافذة العرض السريع ونوافذ تغيير كلمة المرور/الدوام/الصلاحيات.
   - صورة المدير تظهر داخل جدول الفنادق وجدول مدراء الفنادق.
   - صورة المستخدم تظهر داخل شريط المستخدم العلوي عند توفرها.

## الفحوصات المنفذة

- npm run check ✅
- npm run ui:audit ✅
- npm run smoke:test ✅

## Patch 2 — ملاحظات المستخدم الأخيرة على الحجوزات والطباعة

- ضغط كروت الحجوزات أكثر حتى تظهر أزرار العرض/الطباعة/التعديل داخل الكرت بدون الحاجة للنزول قدر الإمكان.
- تصغير ملخصات الحجوزات والفلاتر والمسافات داخل صفحة الحجوزات.
- إضافة Scrollbar احترافي مخصص بدل الشكل الافتراضي البدائي، ويعمل على الصفحة، السايدبار، الجداول، والمودالات.
- إعادة بناء قالب طباعة الحجز للزبون بشكل احترافي وفاخر.
- إزالة أسماء/صور ملفات الوثائق من نسخة الزبون المطبوعة.
- إضافة قسم واضح باسم "الوثائق المقدمة" يعرض أنواع الوثائق فقط مثل: هوية شخصية، جواز سفر، دفتر عائلة، إقامة.
- تحسين قسم الشروط والتوقيع داخل قالب الطباعة ليظهر كوثيقة فندقية رسمية.

### فحص بعد التعديل

```powershell
npm run check
npm run ui:audit
npm run smoke:test
```

> ملاحظة: `smoke:test` يحتاج أن يكون السيرفر يعمل على `http://localhost:4000`.

## Patch — One Page Customer Print Template

- Removed customer and hotel signature/stamp boxes from the customer print receipt.
- Converted the reservation print template into a strict one-page A4 layout.
- Reduced print padding, header height, cards, panels, table rows, document chips, terms area, and footer spacing.
- Kept the customer document section text-only: it prints submitted document types only without document images, previews, or file names.
- Fixed invalid CSS fragments inside the receipt print stylesheet and kept print color adjustment enabled.
- Verified with `npm run check`, `npm run ui:audit`, and `npm run smoke:test`.

## Patch — Guests Section

- Added a full **النزلاء** page for the hotel manager.
- Guests are generated automatically from reservation data:
  - booking owner,
  - adult companions,
  - children/minors group when present.
- Added compact summary cards for total guests, in-house guests, arrivals today, upcoming stays, and remaining balances.
- Added professional compact filters by search, stay status, guest type, and room.
- Added professional guest cards with room, reservation number, stay dates, phone/ID, relationship, and remaining amount.
- Document display in guest profiles is text-only by document type, without showing document photos or file names to the customer-facing view.
- Added guest detail modal with personal data, reservation/stay data, submitted document types, open reservation, and print reservation actions.
- Kept guest data centralized and derived from reservations to avoid duplicate manual entry.
- Verified with `npm run check`, `npm run ui:audit`, and `npm run smoke:test`.

## Guests responsive containment patch

- Fixed guests filters bar layering so it stays above guest cards and never appears behind them.
- Converted guests page layout from inherited grid behavior to a safe vertical flex layout.
- Reduced guests summary cards and guest cards spacing to improve fit on common laptop screens.
- Made guest profile modal responsive with viewport-bound height and internal professional scrolling.
- Made reservation details modal responsive with compact fields, wrapped text, and viewport-bound height.
- Prevented long document/file labels from stretching modal content outside the screen.
- Reservation details now show document status by document type instead of long file names in the main details grid.

## Guests room-color grouping patch

- Added deterministic room-based coloring for guest cards.
- Guests assigned to the same room now receive the same soft card color, making room groups visually clear.
- Different rooms receive different light tones using a central palette and CSS variable `--guest-room-hue`.
- Kept stay-status badges readable while the main card color follows the room.
- Updated guest-card action buttons to match the project action color system:
  - View profile: primary.
  - Open reservation: accent.
  - Print: luxury.
- Kept the implementation centralized in guest rendering helpers and CSS tokens instead of hardcoding colors per card.

## تصحيح ألوان غرف النزلاء — Strict Room Color Grouping
- تم تصحيح منطق ألوان كروت النزلاء ليكون اللون مرتبطًا بالغرفة فعليًا وليس بالحالة أو نوع النزيل.
- كل غرفة تحصل على لون فاتح مختلف وواضح بصريًا داخل قسم النزلاء.
- كل النزلاء الموجودين في نفس الغرفة يحصلون على نفس لون الكرت تلقائيًا.
- تم بناء خريطة ألوان مركزية من جميع النزلاء حتى لا يتغير لون الغرفة عند استخدام الفلاتر.
- تم توسيع لوحة الألوان إلى 72 لونًا لتقليل تكرار الألوان بين الغرف.
- تم تعزيز وضوح لون الكرت والخط الجانبي والأيقونات مع الحفاظ على هدوء التصميم.
- تم الحفاظ على ألوان أزرار قسم النزلاء وفق نظام ألوان المشروع المركزي.

## تعديل ترتيب النزلاء حسب الغرفة
- تم تعديل منطق عرض كروت النزلاء ليتم ترتيبها حسب الغرفة أولًا.
- أي نزلاء داخل نفس الغرفة يظهرون بجانب بعض أو وراء بعض بشكل متسلسل حسب شبكة العرض.
- داخل نفس الغرفة يتم ترتيب صاحب الحجز أولًا ثم المرافقين ثم الأطفال/القاصرون.
- تم تثبيت خريطة ألوان الغرف عند البحث أو تغيير الفلاتر حتى لا تتبدل ألوان الغرف أثناء الفلترة.

## إضافة قسم الدخول والمغادرة — Daily Operations
- تم بناء صفحة **الدخول والمغادرة** كقسم تشغيلي يومي للفندق.
- أضيفت تبويبات عملية: وصول اليوم، مقيمون حاليًا، مغادرة اليوم، بحاجة متابعة، والسجل.
- أضيفت كروت ملخص للعمليات: وصول مستحق، داخل الفندق، مغادرة مستحقة، والمتبقي المالي.
- أضيفت فلاتر مضغوطة ومتجاوبة: بحث، تاريخ التشغيل، والغرفة.
- أضيفت كروت تشغيل للحجوزات تعرض صاحب الحجز، الغرفة، عدد الأشخاص، حالة الغرفة، التواريخ، الوقت الفعلي، والمتبقي المالي.
- زر **تسجيل دخول** يحول الحجز إلى داخل الفندق ويحدث حالة الغرفة إلى مشغولة.
- زر **تسجيل خروج** يحول الحجز إلى مكتمل ويحدث حالة الغرفة إلى تنظيف.
- عند وجود متبقي مالي تظهر إشارة تنبيه واضحة داخل كرت العملية.
- تم ربط ألوان كروت التشغيل بنفس ألوان الغرف المستخدمة في قسم النزلاء، بحيث تبقى الغرفة مميزة بصريًا.
- أزرار العمليات ملتزمة بألوان ونظام أزرار المشروع المركزي.
- تم دعم القسم لمدير الفندق وموظف الاستقبال.
- تم الفحص عبر `npm run check`, `npm run ui:audit`, و `npm run smoke:test`.

## تحديث دورة التنظيف بعد المغادرة

- عند تسجيل المغادرة يتم تحويل الغرفة تلقائيًا إلى حالة **تنظيف** مع حفظ وقت بدء التنظيف وبيانات آخر حجز/نزيل.
- لا تعود الغرفة متاحة مباشرة بعد المغادرة، بل تبقى غير قابلة للحجز حتى يؤكد الموظف انتهاء التنظيف.
- تم تفعيل صفحة **التنظيف** بشكل تشغيلي بدل أن تكون صفحة فارغة.
- صفحة التنظيف تعرض غرف التنظيف أولًا مع فلاتر بحث وحالة وطابق.
- تم إضافة زر **تم التنظيف** لتحويل الغرفة من تنظيف إلى **متاحة**.
- تم إضافة زر **إرسال للصيانة** عند الحاجة.
- تم توحيد ألوان أزرار التنظيف مع Design System الخاص بالمشروع.

## Strict central design cleanup

- تنظيف `app.css` من استخدامات `!important`.
- منع الألوان الخام داخل `app.css` واستبدالها بـ Tokens و `color-mix`.
- إضافة Design System مركزي ببادئة `ds-*` لكل الكروت، الفلاتر، الحقول، الأزرار، المودالات، الجداول، الشارات، ومناطق السكرول.
- إضافة `DESIGN_SYSTEM` داخل `app.js`.
- إضافة `applyCentralDesignSystem()` لتوحيد كل العناصر بعد كل Render.
- توحيد ألوان الأزرار حسب نوع الإجراء بدل تكرارها داخل كل صفحة.
- تنظيف ألوان الغرف بحيث توجد في مكان مركزي واحد فقط.
- تطوير `ui-audit` لمنع inline style و hard-coded colors و `!important` و raw rgb/rgba.
- إضافة توثيق جديد: `docs/STRICT_DESIGN_SYSTEM.md`.


## منع تسجيل الخروج عند وجود متبقي مالي

- تم إيقاف عملية **تسجيل الخروج** نهائيًا إذا كان على الحجز أي مبلغ مالي متبقٍ.
- عند الضغط على تسجيل خروج لحجز عليه دفعات مالية تظهر رسالة تحذير واضحة بقيمة المتبقي.
- لا يتم تحويل حالة الحجز إلى مكتمل ولا يتم تحويل الغرفة إلى تنظيف إلا بعد أن يصبح المتبقي المالي صفرًا.
- زر تسجيل الخروج للحالات التي عليها رصيد يظهر بلون تحذيري مركزي من Design System، بدون كسر ألوان المشروع.
- تم الحفاظ على دورة الغرفة الصحيحة: بعد الخروج المسموح فقط تتحول الغرفة إلى تنظيف، ثم تعود متاحة بعد تم التنظيف.

## Restaurant/Café order guest binding and room-account financial tracking

- Removed free manual guest-name entry from the food order flow.
- Food orders now require selecting an in-house guest from an occupied room.
- Room and guest selections are linked so table orders remain tied to the correct room/reservation.
- Added payment methods: cash, electronic, and room/table account.
- Room/table account orders are posted to financial tracking and included in the reservation balance calculation.
- Checkout balance guard now considers room-account food orders before allowing departure.
- Added a payments page view with filtering by payment method, including room-account orders.


## إصلاح الحجوزات بعد إضافة الطلبات والحسابات

- تم إصلاح سبب تعطّل فتح حجز جديد عندما تكون كل الغرف عليها حجوزات نشطة أو نزلاء داخل الفندق.
- لم تعد قائمة الغرف في نموذج الحجز تمنع الغرفة بشكل دائم لمجرد وجود حجز قديم أو حالي عليها.
- أصبح منع الحجز يعتمد على تداخل تواريخ الدخول والمغادرة فقط.
- إذا كانت الغرفة مشغولة اليوم يمكن حجزها لتاريخ لاحق لا يتداخل مع الحجز الحالي.
- تم تفعيل صفحة الحجوزات وربط أحداثها أيضًا لموظف الاستقبال وليس المدير فقط.

## 2026-06-23 — تصحيح منطق طلبات المطعم والكافتريا للزوار والضيافة

- إلغاء القيد الخاطئ الذي كان يمنع تسجيل الطلب إذا لم يوجد نزيل داخل غرفة.
- جعل تسجيل الطلب مفتوحًا للحالات التالية:
  - طلب من غرفة: يتم اختيار النزيل من الغرفة وجلب الغرفة والحجز تلقائيًا.
  - طلب من طاولة: يمكن ربطه بنزيل/غرفة أو تسجيله كزائر/ضيافة.
  - زائر / ضيافة: يمكن كتابة اسم الزائر يدويًا بدون ربطه بغرفة.
  - طلب خارجي: يمكن ربطه بغرفة أو تسجيله كطلب لزائر.
- إضافة حقل مركزي لاسم الزائر/الضيافة عند عدم وجود غرفة.
- إبقاء الدفع بثلاث طرق: نقدي، إلكتروني، على حساب الغرفة / الطاولة.
- طلبات الغرفة المرتبطة بحجز فقط هي التي تُرحّل إلى متبقي الحجز وتمنع تسجيل الخروج عند وجود مبلغ.
- الطلبات غير المرتبطة بغرفة تبقى ظاهرة في الحسابات المالية ضمن طريقة الدفع المناسبة ولا تكسر منطق الحجز.
- تحديث النصوص العربية والإنكليزية لتوضيح الفرق بين نزيل غرفة وزائر/ضيافة.


## إصلاح فتح الحجز الجديد
- إصلاح خطأ JavaScript داخل مودال الحجز الجديد سببه استخدام متغير غير موجود باسم `employee` داخل كرت موظف الحجز.
- تم ربط الصورة والاسم داخل كرت موظف الحجز بالمتغير المركزي الصحيح `bookingEmployeeInfo`.
- النتيجة: زر إضافة حجز يفتح النافذة بشكل طبيعي، والحفظ يعمل بدون كسر صفحة الحجوزات.


## إصلاح ظهور تحذير الحجز قبل الإدخال

- إصلاح سبب ظهور رسالة التحقق الحمراء داخل نافذة إضافة الحجز قبل تعبئة البيانات.
- السبب كان أن class `hidden` يتم كسره بصريًا بسبب قواعد `display` اللاحقة للأزرار والتنبيهات في CSS.
- تم إضافة حماية مركزية للرؤية حتى تبقى العناصر المخفية مخفية فعليًا: أزرار السابق/الحفظ، تنبيهات التحقق، وخطوات النموذج غير النشطة.
- أصبح زر الحفظ لا يظهر إلا في الخطوة الأخيرة فقط.
- أصبح التحذير يظهر فقط عند محاولة الانتقال للخطوة التالية أو الحفظ مع وجود بيانات ناقصة.
- تم تعديل نص التحذير من صيغة "لا يمكن حفظ الحجز" إلى صيغة أدق: "يرجى إكمال بيانات الحجز".

## Restaurant & Café Menu System

- Added a centralized food menu storage layer for restaurant/café items.
- Added a menu section inside Restaurant & Café for drinks, food, desserts/snacks, hospitality, and extras.
- Added a modal to create menu items with service type, category, price, availability, and description.
- Updated order registration to select items from the menu instead of typing order details manually.
- Added quantity per item and automatic total calculation.
- Stored order item lines on each order and kept backward compatibility with old free-text orders.
- Kept room-order logic linked to current room guests so room charges are posted to the reservation.
- Kept visitor, hospitality, table, and external orders open for manual guest names when they are not tied to a room.
- Updated payments search and tables to display menu item lines and continue filtering room-account orders.
- Added centralized CSS classes for menu cards and order item rows without inline styles or hard-coded colors.

## قسم الصيانة — Maintenance Section

- إضافة صفحة الصيانة كقسم مستقل داخل لوحة مدير الفندق.
- إضافة بلاغات صيانة مرتبطة بالغرف أو بمرفق عام.
- إضافة حالات البلاغ: مفتوح، قيد المعالجة، بانتظار قطع، تم الإنجاز، ملغي.
- إضافة أولويات البلاغ: منخفضة، متوسطة، مرتفعة، عاجلة.
- إضافة أنواع مشاكل الصيانة: كهرباء، سباكة، تكييف، إنترنت، أثاث، أجهزة، أبواب وأقفال، ملاحظة تنظيف/تلف، أخرى.
- ربط زر “إرسال للصيانة” من قسم التنظيف بإنشاء بلاغ صيانة تلقائي للغرفة.
- عند إنهاء الصيانة لغرفة مرتبطة، لا تعود الغرفة متاحة مباشرة، بل تتحول إلى التنظيف أولًا.
- بعد انتهاء التنظيف فقط تعود الغرفة متاحة للحجز.
- إضافة فلاتر الصيانة: بحث، الحالة، الأولوية، الغرفة.
- إضافة كروت ملخص الصيانة: بلاغات مفتوحة، قيد المعالجة، أولوية عالية، تم إنجازها.
- تطبيق مكونات التصميم المركزي على كروت وفلاتر ومودال الصيانة.

## تحديث المطعم والكافتريا وكشف الحساب

- تحويل طلبات المطعم والكافتريا إلى طلبات مسلّمة مباشرة بدون دورة متابعة طويلة.
- تحويل سجل الطلبات من جدول إلى كروت احترافية متجاوبة من نفس Design System.
- إضافة زر طباعة فاتورة لكل طلب مطعم/كافتريا/ضيافة/غرفة.
- إضافة قالب طباعة فاتورة مستقل مناسب للمطبخ أو الكافتريا.
- إضافة كشف حساب للنزيل عند الخروج يشمل:
  - قيمة الإقامة.
  - المدفوع من الحجز.
  - طلبات المطعم والكافتريا المدفوعة نقدًا أو إلكترونيًا.
  - الطلبات المرحلة على حساب الغرفة.
  - المتبقي النهائي.
- إضافة زر كشف حساب داخل عرض الحجز وداخل كروت الدخول والمغادرة.
- عند تسجيل خروج ناجح يتم فتح كشف الحساب للطباعة قبل تحويل الغرفة إلى التنظيف.
- تحديث صفحة الحسابات المالية لتعرض الطلبات ككروت احترافية مع إمكانية طباعة الفاتورة من نفس الكرت.
- الحفاظ على منع تسجيل خروج النزيل إذا بقي عليه أي مبلغ من الحجز أو طلبات الغرفة.

## Reports Section Final Addition

- Added a complete hotel manager **Reports** section.
- Added report categories:
  - Overview
  - Reservations
  - Financial
  - Rooms & Occupancy
  - Restaurant & Cafeteria
  - Maintenance
- Added centralized report filters:
  - Today
  - Last 7 days
  - This month
  - Custom date range
- Added report summary cards for reservations, revenue, occupancy, active guests, room-account orders, and pending operations.
- Added printable A4 report output.
- Added CSV export for the active report.
- Added financial report support for room-account restaurant/cafeteria orders.
- Added rooms report with status, floor, guest, and linked reservation.
- Added restaurant/cafeteria report with payment breakdown and top ordered items.
- Added maintenance report by status, priority, and ticket list.
- Applied strict central UI patterns to report filters, cards, tables, tabs, and actions.

## Technical Closure قبل لوحة التحكم

- توسيع النسخ الاحتياطي ليشمل بيانات التشغيل الأساسية.
- إضافة مفاتيح الترجمة الناقصة.
- تنظيف تكرار زر حذف الصورة الشخصية.
- إضافة طبقة مركزية لقوالب الطباعة.
- إضافة اختبار `npm run closure:test`.
- إضافة توثيق `docs/TECHNICAL_CLOSURE.md` و `docs/BACKEND_ROADMAP.md`.


## Manager dashboard smart access layer

- Rebuilt the hotel manager dashboard into a practical daily-control screen.
- Added a top quick-action bar for:
  - New reservation
  - Today arrivals
  - Restaurant / cafeteria order
  - Housekeeping
  - New maintenance ticket
  - Reports
- Added smart dashboard cards below the action bar for direct access to:
  - Today reservations
  - Today arrivals
  - Current in-house reservations
  - Today departures
  - Available rooms
  - Occupied rooms
  - Rooms under cleaning
  - Open maintenance tickets
  - Active guests
  - Today food orders
  - Room-account charges
  - Financial balance due
  - Financial report
  - Hotel settings
  - Staff management
- Each smart card applies the correct destination filter before navigation.
- Dashboard quick actions can open the new reservation, new food order, and new maintenance ticket modals directly.
- Added Arabic and English i18n keys for the new dashboard content.
- Added responsive styles for desktop, tablet, and mobile without inline styling.

## Sidebar No Scroll Compact Fix
- Reduced sidebar vertical spacing and navigation item height by one visual degree.
- Disabled the internal sidebar navigation scrollbar.
- Kept labels readable while ensuring all navigation items fit in standard desktop viewport heights.
- Added a compact rule for shorter screens under 820px height.

- Dashboard visual upgrade: luxury SaaS dashboard, improved smart cards, compact sidebar without scroll.

- Added a professional topbar with contextual subtitle and notifications bell with smart dropdown.

- Synchronized sidebar colors with topbar/content and strengthened nav hover/active states.

- Applied strict centralized button and status systems: unified button sizes/tokens and deterministic status badge tones across the app.

- Increased central button/status contrast for the light theme: action buttons are now filled, readable, and consistent.

- Removed dark theme and theme toggle from login/topbar/settings; project is now light-only.
- Rebuilt central interactive action colors for all buttons: primary/accent/luxury/warning/danger/neutral are filled, visible, and consistent across the light UI.
- Rebuilt central status badges with unified filled colors for success/warning/danger/info/neutral.

## Strict final centralization of all buttons and statuses
- Expanded the central action engine to classify all operational buttons by intent, not by page.
- Added separate visual tones for: primary actions, view/open actions, edit/update actions, print/invoice/export actions, warning/maintenance/checkout actions, and danger/destructive actions.
- Expanded status classification to cover current and expected hotel statuses: available, occupied, reserved, cleaning, maintenance, departed, in-house, pending, paid, unpaid, active, suspended, archived, and priority states.
- Added central styling for extra button families: compact buttons, link buttons, avatar buttons, modal close buttons, password toggles, room type remove buttons, and tab buttons.
- Preserved the original background gradients and hover spirit; only the action/status styling was centralized.
- UI audit, closure test, syntax check, and smoke test passed.

- Added hotel manager sidebar section for subscription & packages with current plan details and extension/renewal/change requests.

- Topbar title and hotel name text replaced with a large hotel identity logo pulled from hotel settings.

## Fix — Delete chip hover background clarity
- Fixed room type delete button hover behavior inside hotel settings chips.
- Removed `.room-type-remove` from the global strong danger hover selector so its background stays soft/light on hover.
- Kept the icon/text color unchanged; the fix changes the hover background only.
- Verified JavaScript syntax with `npm run check` and server smoke with `npm run smoke:test`.

## Fix — Settings tabs hover background clarity
- Fixed the hover state of hotel/settings tab buttons so the button background clearly changes on hover.
- Added the missing centralized token aliases used by tab gradients so the browser can apply the hover background correctly.
- Kept the text/icon color behavior unchanged; this fix targets the button background state.

## 2026-06-23 — استعادة التدرجات وحماية التعديلات المتتالية

- تم استعادة الخلفيات المتدرجة للـ Sidebar والـ Topbar وخلفية منطقة المحتوى.
- تم تثبيت طبقة CSS أخيرة مخصصة للخلفيات العامة حتى لا تؤثر عليها إصلاحات الأزرار أو Hover لاحقًا.
- تم الحفاظ على إصلاحات زر العين السابقة بدون الرجوع لشكل الزر القديم.
- تم الحفاظ على إصلاح Hover تبويبات إعدادات الفندق.
- تم الحفاظ على إصلاح Hover زر حذف نوع الغرفة.
- تمت إضافة ملف `FANDQI_CHANGE_NOTES.md` في جذر المشروع لتوثيق التعديلات المحمية ومنع حذفها في النسخ القادمة.

## Patch — Phase 63 Premium Gradient + Sidebar Hover

- Added centralized premium mixed-color gradient tokens.
- Improved the main layout, sidebar, topbar, and content backgrounds with a professional blended light gradient.
- Made sidebar item hover clearly visible using a full gradient background.
- Made active sidebar item more visible with a stronger gradient background.
- Forced sidebar hover/active text and icons to white for clear readability.
- Prevented hover movement by locking sidebar nav transforms.

### فحص بعد التعديل

```powershell
npm run check
npm run smoke:test
npm run ui:audit
npm run quality:full
```

<!-- Phase 63 test status: npm run check ✅ | npm run smoke:test ✅ | npm run ui:audit ✅ | npm run quality:full ✅ -->

## Phase 64 — Hotel Settings Vertical Rhythm Lock
- Fixed the hotel settings tab-switch padding drift reported in screenshots.
- Locked the title header, tabbar, tab buttons, and panel start line to stable dimensions.
- Ensured active/hover tab styles change color only and never change size or spacing.
- Added a safe scroll reset when switching hotel setting tabs so previous tab scroll position cannot visually move the layout.
- Scope kept limited to hotel settings layout/styling; no save logic or field data changes.

## Patch — Subscription & Packages Phase 107 Central Closure

- Closed the **الاشتراك والباقات** page with 100% component centralization.
- Added central page head, package surfaces, package cards, active subscription panel, requests table, badges, buttons, and empty states.
- Added `subscription-plan-central:closure-audit` and linked it into `quality:full`.
- Extended the central `FandqiUI` adapter with `renderTable` for table-based page sections.
- Added synchronized Arabic/English i18n keys for the new subscription header counters and default package description.
- Preserved all existing subscription logic and request workflows.

## Patch — Reports Phase 108 Central Closure

- Closed the **التقارير** page with 100% page-scoped component centralization.
- Added central report page head, top actions, report summary metric cards, filter panel, period buttons, tabs, table panels, chart panels, and empty states.
- Added `reports-central:closure-audit` and linked it into `quality:full`.
- Preserved the existing report business logic: date range filters, report tabs, CSV export, print report, financial summaries, room status, food orders, and maintenance tickets.
- Verified syntax, smoke, UI, i18n, report migration, report feature modules, and the new central closure audit.
- `quality:full` passed all checks up to the tool timeout, then the remaining audits were run manually and all passed.

## Patch — Platform Owner Dashboard Phase 109 Central Closure

- Closed the **لوحة تحكم صاحب المنصة** page with page-scoped 100% component centralization.
- Added central owner dashboard helpers for the head, mini metrics, metric cards, command sections, timeline items, action buttons, and empty states.
- Rebuilt the platform owner dashboard head through `FandqiUI.renderSectionHead`.
- Rebuilt owner dashboard counters through `FandqiUI.renderMetricCard`.
- Rebuilt owner dashboard decision/ending/latest sections through `FandqiUI.renderSurface`.
- Extended `FandqiUI.renderButton` with safe `children` support for structured timeline buttons while preserving older button behavior.
- Removed the duplicate **notifications** item from sidebar navigation arrays because the topbar notification icon opens the page directly.
- Added `platform-owner-dashboard-central:closure-audit` and linked it into `quality:full`.


## Phase 110 — Platform Owner Hotels & Managers 100% Component Centralization

- Closed platform owner Hotels page with central page head, filter fields, hotel cards, card actions, meta grid, and empty state.
- Closed platform owner Hotel Managers page with central page head, filter fields, manager cards, card actions, meta grid, and empty state.
- Added `PLATFORM_OWNER_HOTELS_MANAGERS_CENTRAL_AUDIT_MARKERS` and page markers: `data-ui-centralized="phase110-platform-owner-hotels-managers"`.
- Added `poOwnerFilterField`, `poOwnerEntityActionButton`, `poOwnerEntityCard`, `poOwnerMetaGrid`, `poOwnerHotelCard`, and `poOwnerManagerCard`.
- Added `platform-owner-hotels-managers-central:closure-audit` and linked it into `quality:full`.
- Strengthened `FandqiUI.renderButton` adapter handling so composed `children` buttons remain safe after the professional module facade is available.

Validation passed: `check`, `smoke:test`, `ui:audit`, `i18n:closure-audit`, `central-ui-system:closure-audit`, `ui-components:audit`, `ui-migration:audit`, `platform-owner-dashboard-central:closure-audit`, and `platform-owner-hotels-managers-central:closure-audit`.

## Phase 111 — Platform Owner Packages, Subscriptions & Requests 100% Component Centralization

- Closed platform owner Packages, Subscriptions, and Subscription Requests pages with a shared Phase 111 centralization marker.
- Rebuilt packages cards through `poOwnerPackageCard` + `poOwnerEntityCard` + `FandqiUI.renderCard`.
- Rebuilt subscriptions cards through `poOwnerSubscriptionCard` with centralized status badges, progress panel, meta grid, and action buttons.
- Rebuilt incoming subscription request cards and filter pills through centralized buttons and surfaces.
- Converted package and subscription filters to `poOwnerFilterField` and `FandqiUI.renderField` while preserving existing DOM IDs and event bindings.
- Added `platform-owner-packages-subscriptions-central:closure-audit` and linked it into `quality:full`.
- Preserved all package, subscription, renewal, approval, rejection, and request-filter workflows.

Validation target: `check`, smoke/UI/i18n audits, previous platform owner audits, and the new Phase 111 central closure audit.

## Phase 112 — Platform Owner Settings 100% Component Centralization

- Closed the **Platform Owner Settings** page with page-scoped 100% component centralization.
- Added `03e-platform-owner-settings-centralization.js` as a separate ordered module to avoid growing `03b` beyond the modular audit limit.
- Rebuilt the settings page head through `FandqiUI.renderSectionHead`.
- Rebuilt platform settings tabs through `FandqiUI.renderTabs` while preserving `data-settings-tab` events.
- Rebuilt settings panels through `FandqiUI.renderSurface` and centralized form grids through `FandqiUI.renderFormGrid`.
- Rebuilt fields, password controls, checkboxes, logo actions, invoice preview, and backup actions through central helpers backed by `FandqiUI`.
- Preserved all platform settings behavior: save, password update, logo upload/remove, tab switching, backup export/import, and clear demo data.
- Added `platform-owner-settings-central:closure-audit` and linked it into `quality:full`.

Validation passed: `check`, `smoke:test`, `ui:audit`, `i18n:closure-audit`, all previous platform owner central audits, `platform-owner-settings-central:closure-audit`, `modular:audit`, and the remaining quality audits continued manually after timeout.

## Phase 113 — Auth Access 100% Component Centralization

- Closed the **Login / Register / Forgot Password** access flow with page-scoped 100% component centralization.
- Added `AUTH_CENTRAL_AUDIT_MARKERS` and the shared marker `data-ui-centralized="phase113-auth-access-centralization"`.
- Rebuilt the auth shell and layout with central page/component markers while preserving the current login/register/forgot route mode.
- Rebuilt the auth visual side through a central `FandqiUI.renderSurface` backed helper.
- Rebuilt login, register, and forgot forms through central form-surface helpers while preserving form IDs: `loginForm`, `registerForm`, and `forgotForm`.
- Rebuilt card heads through `FandqiUI.renderSectionHead` and centralized all auth benefit pills.
- Rebuilt all email/text/password fields through `FandqiUI.renderField` and centralized password toggle buttons through `FandqiUI.renderIconButton`.
- Rebuilt remember-me, switch links, submit buttons, and language button through central helpers backed by `FandqiUI`.
- Preserved all behavior: language switching, password show/hide, login, registration validation, automatic trial subscription, forgot-password local message, and auth-mode persistence.
- Added `auth-central:closure-audit` and linked it into `quality:full` immediately after platform owner settings closure.

Validation passed: `check`, `smoke:test`, `ui:audit`, `i18n:closure-audit`, `central-ui-system:closure-audit`, all previous page central audits through Phase 112, `auth-central:closure-audit`, `modular:audit`, and all remaining quality audits after the long `quality:full` timeout point.

## Phase 114 — Staff Operational Dashboard & Front Desk 100% Component Centralization

- Closed the **Staff Operational Dashboard** and **Front Desk Center** with page-scoped 100% component centralization.
- Added `STAFF_FRONTDESK_CENTRAL_AUDIT_MARKERS` and the shared marker `data-ui-centralized="phase114-staff-frontdesk-centralization"`.
- Rebuilt the staff operational page head through `FandqiUI.renderSectionHead` while preserving hotel chip, staff role, and shift display.
- Rebuilt role-based quick actions through `FandqiUI.renderActions` and `FandqiUI.renderButton` while preserving all navigation/action data attributes.
- Rebuilt staff operational task cards through `FandqiUI.renderMetricCard` with the same manager-dashboard navigation attributes.
- Rebuilt the daily work panel through `FandqiUI.renderSurface`.
- Rebuilt the front desk page head and top actions through central head/action/button helpers.
- Rebuilt front desk metric cards through `FandqiUI.renderMetricCard`.
- Rebuilt arrivals, in-house, and departures queue panels through `FandqiUI.renderSurface` and `FandqiUI.renderPanelTitle`.
- Rebuilt reservation queue rows through centralized surfaces and centralized empty states through `FandqiUI.renderEmptyState`.
- Added `staff-frontdesk-central:closure-audit` and linked it into `quality:full` immediately after `auth-central:closure-audit`.
- Preserved all behavior: new reservation shortcut, page jumps, check-in/out tab targeting, room/account/payment/report filters, and staff role-specific dashboard content.

Validation passed: `check`, `smoke:test`, `ui:audit`, `i18n:closure-audit`, `central-ui-system:closure-audit`, `staff-central:closure-audit`, `auth-central:closure-audit`, previous platform owner audits, `staff-frontdesk-central:closure-audit`, and `modular:audit`.

## Phase 115 — Notifications Page 100% Component Centralization

- Closed the **Notifications** page with page-scoped 100% component centralization.
- Preserved the previous sidebar decision: notifications are not listed in sidebar navigation and remain reachable from the topbar bell icon.
- Added `NOTIFICATIONS_CENTRAL_AUDIT_MARKERS` and the shared marker `data-ui-centralized="phase115-notifications-centralization"`.
- Rebuilt the notifications page head through `FandqiUI.renderSectionHead`.
- Rebuilt mark-all-read and refresh actions through `FandqiUI.renderActions` and `FandqiUI.renderButton`.
- Rebuilt status filters through centralized structured buttons while preserving `data-notification-status-filter`.
- Rebuilt the notifications feed through `FandqiUI.renderSurface` and centralized panel-title/badge helpers.
- Rebuilt notification cards through centralized surfaces, centralized status/read badges, and central open/mark-read buttons.
- Rebuilt empty states through `FandqiUI.renderEmptyState`.
- Added `notifications.kicker` to Arabic and English locales.
- Added `notifications-central:closure-audit` and linked it into `quality:full` immediately after `staff-frontdesk-central:closure-audit`.
- Preserved all behavior: topbar bell routing, read-state storage, mark all read, per-notification mark read, status filters, and target page navigation.

Validation passed: `check`, `smoke:test`, `ui:audit`, `i18n:closure-audit`, all previous central closure audits, `notifications-central:closure-audit`, `modular:audit`, and all remaining quality audits after the long `quality:full` timeout point.
