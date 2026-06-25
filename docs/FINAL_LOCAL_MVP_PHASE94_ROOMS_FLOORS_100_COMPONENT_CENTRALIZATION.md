# Phase 94 — Rooms & Floors 100% Component Centralization

## الهدف
إغلاق صفحة الغرف والطوابق بشكل مركزي وآمن، صفحة بصفحة، بعد إغلاق لوحة التحكم وإعدادات الفندق.

## المنجزات
- إضافة زر **تعديل الطوابق** داخل هيدر صفحة الغرف.
- إضافة نافذة مستقلة لتعديل عدد الطوابق.
- منع تقليل عدد الطوابق عن أعلى طابق مستخدم فعليًا في الغرف.
- تحويل صفحة الغرف إلى بنية مركزية عبر:
  - `FandqiUI.renderSectionHead`
  - `FandqiUI.renderActions`
  - `FandqiUI.renderButton`
  - `FandqiUI.renderSurface`
  - `FandqiUI.renderMetricCard`
  - `FandqiUI.renderCard`
  - `FandqiUI.renderField`
  - `FandqiUI.renderFormGrid`
  - `FandqiUI.renderPanelTitle`
  - `FandqiUI.renderBadge`
- توحيد:
  - هيدر الصفحة
  - أزرار الصفحة
  - كروت الملخص
  - كروت الطوابق
  - فلاتر الغرف
  - كروت الغرف
  - نوافذ الإضافة والتعديل والعرض
  - نافذة تعديل الطوابق

## الملفات المهمة
- `apps/web/public/assets/js/modules/06-rooms-dashboard.js`
- `apps/web/public/assets/js/modules/06c-rooms-floors-centralization.js`
- `apps/web/public/assets/css/patches/final-regression-fixes.css`
- `apps/web/public/locales/ar.json`
- `apps/web/public/locales/en.json`
- `scripts/rooms-central-closure-audit.mjs`
- `package.json`

## الفحص
تم تنفيذ:

```bash
npm run quality:full
```

النتيجة: ناجح.

## ملاحظة تصميمية
تم اتباع أسلوب آمن صفحة بصفحة، وعدم تكرار خطأ Phase 89 الذي طبق قواعد عامة هجومية على كامل المشروع.
