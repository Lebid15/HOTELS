# Runtime Stability & True Modules — Phase 2

## الهدف

هذه المرحلة تكمل مرحلة التقسيم الاحترافي، وتركز على تقليل الاعتماد على الدوال العامة المباشرة داخل الملفات القديمة بدون تغيير الواجهة أو حذف أي ميزة.

## ما تم إنجازه

### 1. Classic Runtime Bridge

تمت إضافة طبقة ربط مركزية تعمل قبل كل ملفات الواجهة:

```text
apps/web/public/assets/js/professional/adapters/classic-runtime-bridge.js
```

وظيفتها توفير خدمات مركزية آمنة للملفات القديمة أثناء الانتقال التدريجي إلى ES Modules:

- التخزين `storage`
- التاريخ `dates`
- الطباعة وفتح النوافذ `print`
- الأحداث الداخلية `events`

### 2. Storage Adapter

تم إنشاء دوال مركزية في ملف الحالة:

```text
readStorageText
writeStorageText
removeStorageKey
readStorageJson
writeStorageJson
```

ثم تم تحويل ملفات الموديولات لاستخدام هذه الدوال بدل التعامل المباشر مع `localStorage`.

هذا يجعل الانتقال لاحقًا من LocalStorage إلى API/Backend أسهل، لأن نقطة الاستبدال أصبحت مركزية.

### 3. Print Adapter

تم إنشاء دالة مركزية:

```text
openRuntimePrintWindow
```

ثم تم ربط أوامر الطباعة الأساسية بها بدل تكرار `window.open` داخل كل صفحة.

يشمل ذلك:

- فاتورة طلب المطعم والكافتريا
- سند/فاتورة الحجز
- كشف الحساب
- طباعة التقارير
- معاينة وثائق الحجز

### 4. Domain Repositories

تمت إضافة طبقة مستودعات أولية:

```text
apps/web/public/assets/js/professional/data/repositories/domain-repositories.mjs
```

وتحتوي على مستودعات للأقسام الأساسية:

- الفنادق
- الباقات
- الاشتراكات
- إعدادات الفندق
- الموظفون
- الغرف
- الحجوزات
- المنيو
- طلبات المطعم والكافتريا
- الصيانة
- طلبات تغيير الباقة

### 5. Professional Layer Audit

تمت إضافة فحص جديد:

```powershell
npm run professional:audit
```

ويتحقق من:

- وجود طبقة الربط المركزية.
- تحميلها قبل ملفات الواجهة.
- عدم وجود `localStorage` مباشر داخل ملفات الميزات بعد ملف الحالة.
- عدم وجود `window.open` مباشر داخل ملفات الميزات بعد ملف الطباعة المركزي.
- وجود مستودعات الدومين وربطها بالمدخل الاحترافي.

### 6. Quality Full

تم تحديث الفحص الكامل:

```powershell
npm run quality:full
```

ليتضمن الآن:

```text
check
smoke:test
ui:audit
modular:audit
runtime:audit
architecture:audit
professional:audit
closure:test
```

## قواعد مهمة بعد هذه المرحلة

- ممنوع إضافة قراءة/كتابة مباشرة على `localStorage` داخل ملفات الميزات.
- ممنوع إضافة `window.open` مباشر للطباعة داخل ملفات الميزات.
- أي تخزين جديد يجب أن يمر من Storage Adapter أو Domain Repository.
- أي طباعة جديدة يجب أن تمر من Print Adapter.
- أي تعديل يجب أن يجتاز `npm run quality:full`.

## المرحلة التالية المقترحة

Phase 3 يجب أن تركز على تحويل الأقسام تدريجيًا إلى ES Modules فعلية باستخدام `import/export`، بدءًا من:

1. الطباعة.
2. التخزين.
3. مكونات UI المركزية.
4. ثم الأقسام التشغيلية: الغرف، الحجوزات، الموظفين.
