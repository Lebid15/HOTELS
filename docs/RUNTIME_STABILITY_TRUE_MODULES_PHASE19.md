# Runtime Stability & True Modules — Phase 19

## Feature Modules Deep Refactor — Food Services

تم في هذه المرحلة تحويل قسم المطعم والكافتريا / طلبات الغرف إلى Feature Module مستقل بنفس نمط الغرف والحجوزات والموظفين، مع الحفاظ على واجهة التشغيل القديمة عبر Adapter مرحلي.

## الملفات الجديدة

- `apps/web/public/assets/js/professional/features/food/constants.mjs`
- `apps/web/public/assets/js/professional/features/food/repository.mjs`
- `apps/web/public/assets/js/professional/features/food/validators.mjs`
- `apps/web/public/assets/js/professional/features/food/render.mjs`
- `apps/web/public/assets/js/professional/features/food/actions.mjs`
- `apps/web/public/assets/js/professional/features/food/index.mjs`
- `apps/web/public/assets/js/professional/adapters/food-feature-adapter.js`
- `scripts/feature-modules-food-audit.mjs`

## ما تم فصله

### constants
- مفاتيح تخزين المنيو والطلبات.
- تصنيفات المنيو.
- حالات توفر عناصر المنيو.
- طرق الدفع.
- حالات الطلب.
- القيم الافتراضية لعناصر المنيو والطلبات.

### repository
- قراءة وكتابة عناصر المنيو.
- جلب عنصر منيو بالمعرف.
- جلب عناصر منيو الفندق.
- إضافة/تحديث عنصر منيو.
- قراءة وكتابة طلبات الطعام.
- جلب طلب بالمعرف.
- جلب طلبات الفندق.
- إضافة/تحديث طلب.

### validators
- تنظيف بيانات عنصر المنيو والتحقق منها.
- تنظيف بيانات طلب الطعام والتحقق منها.
- التحقق من الحقول الأساسية مثل الفندق، الخدمة، المصدر، النزيل، العناصر، والمبلغ.

### render/selectors
- ترتيب عناصر المنيو.
- فلترة عناصر المنيو المتاحة.
- حساب إجمالي عناصر الطلب.
- تحديد لون/نغمة طريقة الدفع.
- توليد رقم عرض الطلب.
- ترتيب الطلبات من الأحدث أو الأقدم.
- جلب طلبات حجز محدد.
- حساب المدفوعات المباشرة.
- حساب الطلبات المرحلة على حساب الغرفة.
- حساب إجمالي حركات المطعم المرتبطة بالحجز.
- حساب إجمالي الحجز المالي مع طلبات الغرفة.

### actions
- إنشاء المنيو الافتراضي للفندق.
- إضافة عنصر منيو.
- إضافة طلب طعام/كافتريا.
- أرشفة عنصر منيو.
- أرشفة طلب.

## الربط المرحلي

تمت إضافة Adapter كلاسيكي:

```text
apps/web/public/assets/js/professional/adapters/food-feature-adapter.js
```

ويتيح للملفات القديمة استخدام:

```js
window.FandqiFoodFeature
```

## الملفات القديمة التي تم ربطها تدريجيًا

- `apps/web/public/assets/js/modules/07-food-services.js`
- `apps/web/public/assets/js/modules/11d-backup-dashboard-workspace-events-init.js`

## الفحص الجديد

```powershell
npm run feature-modules-food:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```

## الهدف

إخراج منطق المطعم والكافتريا وطلبات الغرف تدريجيًا من الملفات الكلاسيكية إلى Feature Module قابل للتطوير، حتى يصبح لاحقًا ربطه بـ Backend/API أو نقطة بيع POS أسهل بدون إعادة كتابة الواجهات.
