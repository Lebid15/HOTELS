# Runtime Stability & True Modules — Phase 18

## Feature Modules Deep Refactor — Staff

تم في هذه المرحلة تحويل قسم الموظفين إلى Feature Module مستقل بنفس نمط الغرف والحجوزات، مع الحفاظ على الواجهة القديمة عبر Adapter مرحلي.

## الملفات الجديدة

- `apps/web/public/assets/js/professional/features/staff/constants.mjs`
- `apps/web/public/assets/js/professional/features/staff/repository.mjs`
- `apps/web/public/assets/js/professional/features/staff/validators.mjs`
- `apps/web/public/assets/js/professional/features/staff/render.mjs`
- `apps/web/public/assets/js/professional/features/staff/actions.mjs`
- `apps/web/public/assets/js/professional/features/staff/index.mjs`
- `apps/web/public/assets/js/professional/adapters/staff-feature-adapter.js`
- `scripts/feature-modules-staff-audit.mjs`

## ما تم فصله

### constants
- أدوار الموظفين.
- حالات الموظفين.
- الشفتات.
- الصلاحيات.
- القيم الافتراضية.

### repository
- قراءة الموظفين.
- كتابة الموظفين.
- جلب موظف بالمعرف.
- جلب موظفي الفندق.
- تحديث بيانات الموظف.
- تحديث حالة الموظف.
- upsert للإضافة أو التعديل.

### validators
- تنظيف بيانات الموظف.
- التحقق من الفندق، الاسم، الدور، الحالة، والشفت.

### render/selectors
- ترتيب الموظفين حسب الاسم.
- تلخيص الموظفين.
- فلترة الموظفين.
- مفتاح الموظف المستخدم في ربط الحجوزات.

### actions
- تفعيل الموظف.
- إيقاف الموظف.
- تبديل الحالة.
- أرشفة الموظف.
- تحديث كلمة المرور.
- تحديث الشفت.
- تحديث الصلاحيات.

## الربط المرحلي

تمت إضافة Adapter كلاسيكي:

```text
apps/web/public/assets/js/professional/adapters/staff-feature-adapter.js
```

ويتيح للملفات القديمة استخدام:

```js
window.FandqiStaffFeature
```

## الملفات القديمة التي تم ربطها تدريجيًا

- `apps/web/public/assets/js/modules/05-staff.js`
- `apps/web/public/assets/js/modules/06-rooms-dashboard.js`

## الفحص الجديد

```powershell
npm run feature-modules-staff:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```

## الهدف

إخراج منطق الموظفين تدريجيًا من الملفات الكلاسيكية إلى Feature Module قابل للتطوير، وتجهيز القسم لاحقًا للربط مع Backend/API وصلاحيات حقيقية بدون إعادة تصميم الواجهة.
