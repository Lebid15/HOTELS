# Final Local MVP Closure — Phase 36

## Reports Actions Outside Filters

تم تصحيح صفحة التقارير بحيث لا تظهر أزرار الإجراءات داخل شريط الفلتر.

## المشكلة

أزرار:

- طباعة التقرير
- تصدير CSV

كانت موجودة داخل `reports-filters-bar`، وهذا مخالف لأسلوب المشروع لأن شريط الفلتر يجب أن يحتوي على الفلاتر فقط.

## الحل

تم تعديل:

```text
apps/web/public/assets/js/modules/10b-reports.js
```

بحيث أصبحت الأزرار داخل:

```html
<div class="reports-top-actions" data-layout-fixed="reports-actions-outside-filter">
```

داخل رأس الصفحة، بينما بقي شريط الفلتر يحتوي فقط على:

- الفترة
- من تاريخ
- إلى تاريخ

## الفحص

```powershell
npm run workspace-reports-actions-layout:audit
npm run quality:full
```
