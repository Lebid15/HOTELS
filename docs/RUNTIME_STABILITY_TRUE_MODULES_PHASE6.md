# Runtime Stability & True Modules — Phase 6

## Central UI Components System

هذه المرحلة لا تغيّر منطق المشروع ولا تحذف أي ميزة. الهدف هو إضافة طبقة مكونات واجهة مركزية قابلة لإعادة الاستخدام حتى لا يتم بناء الأزرار والكروت والتبويبات يدويًا داخل الصفحات في المراحل القادمة.

## الملفات المضافة

```text
apps/web/public/assets/js/professional/ui/
  html.mjs
  button.mjs
  badge.mjs
  card.mjs
  tabs.mjs
  modal.mjs
  form-field.mjs
  table.mjs
  empty-state.mjs
  index.mjs
  component-factory.mjs
```

كما تمت إضافة واجهة توافق للملفات القديمة:

```text
apps/web/public/assets/js/professional/adapters/ui-adapter.js
```

وتمت إضافة CSS مركزي للمكونات:

```text
apps/web/public/assets/css/components/ui-components.css
```

## الهدف البرمجي

- أي زر جديد يجب أن يخرج من `renderButton` أو `renderIconButton`.
- أي شارة جديدة يجب أن تخرج من `renderBadge`.
- أي كرت جديد يجب أن يخرج من `renderCard` أو `renderMetricCard`.
- أي تبويبات جديدة يجب أن تخرج من `renderTabs`.
- أي نافذة جديدة يجب أن تخرج من `renderModal`.
- أي جدول جديد يجب أن يخرج من `renderTable`.
- أي حالة فارغة جديدة يجب أن تخرج من `renderEmptyState`.

## طبقة التوافق

تمت إضافة:

```js
window.FandqiUI
```

هذه الواجهة تسمح للملفات القديمة باستخدام المكونات المركزية تدريجيًا بدون كسر النظام الحالي.

## الفحص الجديد

تمت إضافة:

```powershell
npm run ui-components:audit
```

ودخل ضمن:

```powershell
npm run quality:full
```

## قواعد المرحلة القادمة

- لا يتم بناء Button يدويًا داخل Feature جديد.
- لا يتم بناء Card يدويًا داخل Feature جديد.
- لا يتم بناء Tabs يدويًا داخل Feature جديد.
- لا يتم كسر التدرجات أو إصلاحات الهوفر السابقة.
- يتم تحويل الصفحات القديمة تدريجيًا إلى `FandqiUI` ثم إلى ES Modules كاملة.
