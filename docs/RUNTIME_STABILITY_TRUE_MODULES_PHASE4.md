# Runtime Stability & True Modules — Phase 4

## الهدف
تحويل نظام الطباعة إلى طبقة ES Modules حقيقية مع إبقاء واجهات المشروع القديمة تعمل عبر Adapter آمن.

## الملفات الجديدة

- `apps/web/public/assets/js/professional/print/print-actions.mjs`
- `apps/web/public/assets/js/professional/print/print-document.mjs`
- `apps/web/public/assets/js/professional/print/print-window.mjs`
- `apps/web/public/assets/js/professional/print/print-service.mjs`

## ما تغير

- أصبح `FandqiProfessional.print` هو المصدر الاحترافي المركزي للطباعة.
- أصبح `FandqiPrint` مجرد واجهة توافق للملفات القديمة، ويفضل خدمة الطباعة الحقيقية عند توفرها.
- لم يعد `classic-runtime-bridge.js` يفتح نوافذ طباعة أو يكتب HTML مباشرة.
- تم إضافة فحص `print-system:audit` لمنع رجوع الطباعة المباشرة داخل ملفات الصفحات.

## قواعد المرحلة

- لا تكتب `window.open` داخل ملفات الصفحات.
- لا تكتب `document.write` داخل ملفات الصفحات.
- أي طباعة جديدة يجب أن تمر عبر `FandqiPrint.openHtml` أو `FandqiProfessional.print.openHtml`.
- أي سكربت طباعة تلقائية يجب أن يأتي من `autoPrintScript`.
