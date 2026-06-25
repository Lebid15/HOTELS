# Runtime Stability & True Modules — Phase 16

## Feature Modules Deep Refactor — Rooms Feature

بدأت هذه المرحلة نقل المشروع من مجرد مكونات UI مركزية إلى **Feature Modules** حقيقية، وتم اختيار قسم الغرف كبداية لأنه من أكثر الأقسام التشغيلية اعتمادًا على التخزين والكروت والحالات.

## الملفات الجديدة

تمت إضافة مجلد Feature مستقل:

```text
apps/web/public/assets/js/professional/features/rooms/
```

ويحتوي على:

```text
constants.mjs
repository.mjs
validators.mjs
render.mjs
actions.mjs
index.mjs
```

كما تمت إضافة Classic Adapter:

```text
apps/web/public/assets/js/professional/adapters/rooms-feature-adapter.js
```

## ما تم فصله داخل Rooms Feature

### constants

- مفاتيح التخزين
- حالات الغرف
- حالات الانتباه
- حالات الحجوزات المؤثرة على عرض الغرفة
- القيم الافتراضية للغرفة

### repository

- قراءة الغرف
- كتابة الغرف
- جلب غرفة بالمعرف
- جلب غرف الفندق
- تحديث حالة الغرفة

### validators

- `normalizeRoom`
- `validateRoom`

### render / selectors

- `getRoomDisplayStatus`
- `sortRoomsByFloorAndNumber`
- `groupRoomsByFloor`
- `summarizeRooms`

### actions

- أرشفة غرفة
- استعادة غرفة
- تحويل غرفة إلى تنظيف
- تحويل غرفة إلى صيانة
- جعل غرفة متاحة

## الدمج مع النظام القديم

تم ربط `06-rooms-dashboard.js` تدريجيًا مع:

```js
window.FandqiRoomsFeature
```

بدل إبقاء كل منطق الغرف داخل ملف الصفحة فقط.

تم تحويل:

- `readRooms`
- `writeRooms`
- `getHotelRooms`
- `getHotelRoomsIncludingArchived`
- `getRoomById`
- `getRoomDisplayStatus`
- تجميع الغرف حسب الطابق

ليستخدموا طبقة Feature عند توفرها مع fallback آمن.

## الدمج مع Professional Runtime

تم تحديث:

```text
apps/web/public/assets/js/professional/app-entry.mjs
```

ليصدر:

```js
FandqiProfessional.features.rooms
```

## الفحص الجديد

```powershell
npm run feature-modules-rooms:audit
```

ودخل ضمن:

```powershell
npm run quality:full
```

## الهدف

هذه المرحلة تفتح الطريق لتحويل بقية الأقسام إلى نفس النمط:

```text
features/
  reservations/
    constants.mjs
    repository.mjs
    validators.mjs
    render.mjs
    actions.mjs
    index.mjs
```

بدل تضخم ملفات الصفحات واعتمادها على دوال عامة كثيرة.
