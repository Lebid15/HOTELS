# Professional Modular Refactor — Fandqi

هذه المرحلة لا تغيّر منطق التشغيل ولا تحذف أي ميزة. الهدف هو تحويل المشروع من ملفين ضخمين إلى هيكل احترافي قابل للتطوير، مع الحفاظ على الستايل والتدرجات والإصلاحات التراكمية السابقة.

## ماذا تغيّر؟

### JavaScript

تم تحويل الملف الضخم:

```text
apps/web/public/assets/js/app.js
```

إلى نقطة توافق صغيرة فقط، بينما انتقل الكود التشغيلي إلى:

```text
apps/web/public/assets/js/modules/
```

الملفات الحالية:

```text
00-bootstrap-icons-design.js
01-navigation-topbar.js
02-state-print-avatar-utils.js
03-platform-owner.js
04-hotel-settings.js
05-staff.js
06-rooms-dashboard.js
07-food-services.js
08-reservations.js
09-guests-checkio-housekeeping.js
10-maintenance-reports-payments.js
11-subscription-workspace-login-shell.js
```

قاعدة العمل الجديدة: أي ميزة جديدة تضاف داخل ملفها المناسب، ولا يجوز إعادة تضخيم `app.js`.

### CSS

تم تحويل الملف الضخم:

```text
apps/web/public/assets/css/app.css
```

إلى ملف دخول يعتمد على `@import` فقط، بينما تم تقسيم الستايل إلى:

```text
assets/css/base/
assets/css/components/
assets/css/layout/
assets/css/pages/
assets/css/patches/
```

قاعدة العمل الجديدة: أي زر أو كرت أو حقل أو تبويب مشترك يجب أن يكون داخل `components` أو نظام التصميم المركزي، وليس داخل صفحة منفردة.

## أوامر الفحص الجديدة

```powershell
npm run check
npm run smoke:test
npm run ui:audit
npm run modular:audit
npm run closure:test
npm run quality:full
```

أمر `modular:audit` يمنع رجوع المشروع إلى ملف JS أو CSS ضخم.

## قواعد ممنوعة بعد هذه المرحلة

- ممنوع إعادة وضع كل المنطق داخل `app.js`.
- ممنوع إعادة وضع كل CSS داخل `app.css`.
- ممنوع حذف التدرجات السابقة للسايدبار والتوب بار وخلفية المحتوى.
- ممنوع بناء زر أو كرت أو تبويب مختلف دون الرجوع لنظام التصميم المركزي.
- ممنوع استخدام `!important` أو ألوان مباشرة خارج `tokens.css`.
- ممنوع تعديل الطباعة داخل صفحة منفصلة؛ الطباعة تبقى ضمن منطقها المركزي.

## ملاحظات مهمة

هذا تقسيم احترافي آمن للمرحلة الحالية Local MVP. عند التحويل إلى SaaS حقيقي لاحقًا، يمكن نقل كل ملف feature تدريجيًا إلى بنية Framework حديثة أو Backend API بدون إعادة تصميم كاملة.
