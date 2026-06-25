# Runtime Stability & True Modules — Phase 21

## Feature Modules Deep Refactor — Guests & Check-in/out

تم في هذه المرحلة تحويل النزلاء والدخول/المغادرة إلى Feature Modules مستقلة، مع ربطها تدريجيًا بالحجوزات والغرف وحركة التشغيل اليومية.

## الملفات الجديدة

### Guests

- `apps/web/public/assets/js/professional/features/guests/constants.mjs`
- `apps/web/public/assets/js/professional/features/guests/repository.mjs`
- `apps/web/public/assets/js/professional/features/guests/validators.mjs`
- `apps/web/public/assets/js/professional/features/guests/render.mjs`
- `apps/web/public/assets/js/professional/features/guests/actions.mjs`
- `apps/web/public/assets/js/professional/features/guests/index.mjs`
- `apps/web/public/assets/js/professional/adapters/guests-feature-adapter.js`

### Check-in/out

- `apps/web/public/assets/js/professional/features/checkio/constants.mjs`
- `apps/web/public/assets/js/professional/features/checkio/repository.mjs`
- `apps/web/public/assets/js/professional/features/checkio/validators.mjs`
- `apps/web/public/assets/js/professional/features/checkio/render.mjs`
- `apps/web/public/assets/js/professional/features/checkio/actions.mjs`
- `apps/web/public/assets/js/professional/features/checkio/index.mjs`
- `apps/web/public/assets/js/professional/adapters/checkio-feature-adapter.js`

## ما تم فصله في النزلاء

- `constants`: أنواع النزلاء، حالات الإقامة، ترتيب الأنواع، وعدد ألوان الغرف.
- `repository`: قراءة الحجوزات من منظور النزلاء وتجميع حجوزات الفندق.
- `validators`: تنظيف نصوص البحث وأجزاء ألوان الغرف والتحقق من مدخل النزيل.
- `render/selectors`: حالة إقامة النزيل، الرصيد المتبقي، وثائق النزيل، ألوان الغرف، ترتيب النزلاء، تلخيص النزلاء، وفلترتهم.
- `actions`: فتح الحجز وطباعة الحجز كنقاط تمدد لاحقة.

## ما تم فصله في الدخول والمغادرة

- `constants`: تبويبات الدخول والمغادرة وحالات الجدول الزمني.
- `repository`: قراءة/كتابة الحجوزات والغرف وتحديث حالة الحجز والغرفة.
- `validators`: تنظيف نصوص البحث والتحقق من إجراءات الدخول/الخروج.
- `render/selectors`: الرصيد المتبقي، حالة الجدول الزمني، ملخص الأشخاص، فلترة الحجوزات، وتلخيص لوحة الدخول والمغادرة.
- `actions`: تسجيل الدخول، تسجيل الخروج، وتحديث حالة الغرفة.

## الربط المرحلي

تم ربط الملفات التالية تدريجيًا:

- `apps/web/public/assets/js/modules/09a-guests.js`
- `apps/web/public/assets/js/modules/09b-check-in-out.js`

وأصبحت تستخدم:

```js
window.FandqiGuestsFeature
window.FandqiCheckioFeature
```

## الفحص الجديد

```powershell
npm run feature-modules-guests-checkio:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```

## الهدف

تقليل تشابك النزلاء والدخول/المغادرة مع ملفات الحجوزات والغرف، وتجهيز هذه الحركة التشغيلية اليومية للتحويل لاحقًا إلى Backend/API دون إعادة بناء الواجهة.
