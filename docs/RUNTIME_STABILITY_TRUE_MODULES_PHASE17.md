# Runtime Stability & True Modules — Phase 17

## Feature Modules Deep Refactor — Reservations

تم في هذه المرحلة البدء بتحويل قسم الحجوزات إلى Feature Module مستقل بنفس نمط الغرف، مع الحفاظ على واجهة التشغيل القديمة عبر Adapter مرحلي.

## الملفات الجديدة

- `apps/web/public/assets/js/professional/features/reservations/constants.mjs`
- `apps/web/public/assets/js/professional/features/reservations/repository.mjs`
- `apps/web/public/assets/js/professional/features/reservations/validators.mjs`
- `apps/web/public/assets/js/professional/features/reservations/render.mjs`
- `apps/web/public/assets/js/professional/features/reservations/actions.mjs`
- `apps/web/public/assets/js/professional/features/reservations/index.mjs`
- `apps/web/public/assets/js/professional/adapters/reservations-feature-adapter.js`
- `scripts/feature-modules-reservations-audit.mjs`

## ما تم فصله

### constants
- حالات الحجز.
- مصادر الحجز.
- حالات الحجز النشطة التي تؤثر على توفر الغرف.
- القيم الافتراضية للحجز.

### repository
- قراءة الحجوزات.
- كتابة الحجوزات.
- جلب حجز بالمعرف.
- جلب حجوزات الفندق.
- تحديث حالة الحجز.

### validators
- تنظيف بيانات الحجز.
- التحقق من وجود الفندق، الغرفة، تاريخ الدخول، تاريخ الخروج، وبيانات النزيل.

### render/selectors
- حساب تداخل التواريخ.
- التحقق من انشغال الغرفة بحجز نشط.
- حساب عدد الليالي.
- حساب إجماليات الحجز.
- توليد رقم الحجز التالي.
- فلترة الغرف الصالحة للحجز.
- ترتيب الحجوزات من الأحدث.

### actions
- تأكيد الحجز.
- إلغاء الحجز.
- تسجيل الدخول.
- تسجيل الخروج.
- أرشفة الحجز.
- إعادة فتح الحجز.

## الربط المرحلي

تمت إضافة Adapter كلاسيكي:

```text
apps/web/public/assets/js/professional/adapters/reservations-feature-adapter.js
```

ويتيح للملفات القديمة استخدام:

```js
window.FandqiReservationsFeature
```

## الملفات القديمة التي تم ربطها تدريجيًا

- `apps/web/public/assets/js/modules/08a-reservation-core.js`
- `apps/web/public/assets/js/modules/08b-reservation-modal-print.js`
- `apps/web/public/assets/js/modules/08c-reservation-page-events.js`

## الفحص الجديد

```powershell
npm run feature-modules-reservations:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```

## الهدف

إخراج منطق الحجوزات تدريجيًا من الملفات الكلاسيكية إلى Feature Module قابل للتطوير، حتى يصبح الانتقال لاحقًا إلى Backend/API أسهل بدون إعادة كتابة الواجهات.
