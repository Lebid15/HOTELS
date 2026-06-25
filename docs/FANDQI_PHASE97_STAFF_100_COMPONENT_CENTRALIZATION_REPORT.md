# FANDQI Phase 97 — Staff Page 100% Component Centralization

## الهدف

إغلاق صفحة **الموظفون** بنفس أسلوب الصفحات السابقة، لكن بشكل آمن ومقيد بالصفحة فقط، دون تكرار مشكلة المركزية الهجومية التي كسرت صفحات أخرى سابقًا.

## نطاق التعديل

تم العمل على صفحة الموظفين فقط:

- هيدر الصفحة.
- زر إضافة موظف.
- كروت ملخص الموظفين.
- فلاتر البحث والدور والحالة.
- كروت الموظفين.
- شارات الدور والحالة.
- معلومات التواصل والوردية.
- ملاحظات الموظف.
- أزرار كرت الموظف.
- مودالات الإضافة والتعديل والعرض وتغيير كلمة السر والوردية والصلاحيات.

## ما تم توحيده مركزيًا

- `renderStaffSectionHead` مبني فوق `FandqiUI.renderSectionHead`.
- `renderStaffButton` مبني فوق `FandqiUI.renderButton` مع أيقونات وألوان حسب الإجراء.
- `renderStaffBadge` مبني فوق `FandqiUI.renderBadge`.
- `renderStaffMetricCard` مبني فوق `FandqiUI.renderMetricCard`.
- `renderStaffField` مبني فوق `FandqiUI.renderField`.
- `renderStaffFormGrid` مبني فوق `FandqiUI.renderFormGrid`.
- `renderStaffPanelTitle` مبني فوق `FandqiUI.renderPanelTitle`.
- `renderStaffSurface` مبني فوق `FandqiUI.renderSurface`.
- `renderStaffCard` أصبح مصدر كرت الموظف بدل بناء القالب مباشرة داخل `renderStaffTable`.
- `renderStaffFilterPanel` أصبح مصدر فلاتر الصفحة بدل بناء الفلاتر اليدوي.

## تحسينات التصميم

- تقوية ألوان كروت الملخص بحيث لا تظهر الأيقونات أو الأرقام باهتة.
- ضبط حجم هيدر صفحة الموظفين وتوحيد البادينك.
- تحسين كرت الموظف لمنع تداخل الاسم والبريد والشارات والصورة.
- ترتيب أزرار الكرت داخل شبكة مركزية ثابتة مع أيقونات واضحة.
- الحفاظ على تنوع ألوان الأزرار: عرض، تعديل، كلمة السر، الوردية، الصلاحيات، إيقاف/تفعيل، أرشفة.
- تحسين مودالات الموظفين بإضافة classes مركزية دون تغيير المنطق.

## الفحوصات الجديدة

تمت إضافة:

```powershell
npm run staff-central:closure-audit
```

وتم ربطه داخل:

```powershell
npm run quality:full
```

## نتيجة الفحص

تم تشغيل:

```powershell
npm run quality:full
```

والنتيجة: نجح الفحص الكامل.

## الملفات المعدلة

- `apps/web/public/assets/js/modules/05-staff.js`
- `apps/web/public/assets/css/patches/final-regression-fixes.css`
- `apps/web/public/locales/ar.json`
- `apps/web/public/locales/en.json`
- `scripts/staff-central-closure-audit.mjs`
- `scripts/staff-ui-migration-audit.mjs`
- `package.json`
- `FANDQI_CHANGE_NOTES.md`
- `docs/FANDQI_PHASE97_STAFF_100_COMPONENT_CENTRALIZATION_REPORT.md`

## القرار

صفحة الموظفين أصبحت مغلقة كمركزية مكونات للصفحة نفسها، مع فحص خاص يمنع رجوع القوالب اليدوية الأساسية أو فقدان المركزية.
