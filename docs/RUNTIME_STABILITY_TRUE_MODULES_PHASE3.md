# Runtime Stability & True Modules — Phase 3

## الهدف

هذه المرحلة لا تغيّر شكل الواجهة ولا تضيف ميزات تشغيلية جديدة. هدفها رفع الاستقرار البرمجي عبر فصل طبقتي التخزين والطباعة عن ملفات الصفحات القديمة، وتجهيز المشروع للتحويل التدريجي إلى ES Modules كاملة بدون كسر النسخة الحالية.

## ما تم تنفيذه

### 1. Storage Adapter مركزي

تمت إضافة الملف:

```text
apps/web/public/assets/js/professional/adapters/storage-adapter.js
```

هذا الملف يثبت الكائن:

```js
window.FandqiStorage
```

ويحتوي على واجهة مركزية للتخزين:

```js
readText()
writeText()
readJson()
writeJson()
remove()
snapshot()
restore()
clear()
createRepository()
```

تم تعديل ملف الحالة المركزي حتى لا يتعامل مباشرة مع `localStorage`، بل يمر عبر `FandqiStorage`.

### 2. Print Adapter مركزي

تمت إضافة الملف:

```text
apps/web/public/assets/js/professional/adapters/print-adapter.js
```

هذا الملف يثبت الكائن:

```js
window.FandqiPrint
```

ويحتوي على:

```js
openHtml()
autoPrintScript()
```

تم تعديل أوامر فتح نوافذ الطباعة حتى تمر عبر `FandqiPrint` بدل الاعتماد المباشر داخل ملفات الصفحات.

### 3. منع الأخطاء القديمة

تم إصلاح خطر تكرار دالة `writeStorageJson` لنفسها في fallback.

الآن أي كتابة JSON تمر بشكل آمن عبر:

```js
window.FandqiStorage.writeJson()
```

### 4. ترتيب تحميل آمن

ترتيب التحميل في `index.html` أصبح:

```text
classic-runtime-bridge.js
storage-adapter.js
print-adapter.js
i18n.js
legacy modules
```

بهذا الشكل تكون طبقات التخزين والطباعة جاهزة قبل تشغيل أي صفحة.

### 5. فحص جديد

تمت إضافة الأمر:

```powershell
npm run adapters:audit
```

ويتحقق من:

- وجود Storage Adapter.
- وجود Print Adapter.
- ترتيب التحميل الصحيح.
- عدم استخدام `localStorage` مباشرة داخل ملفات legacy modules.
- عدم استخدام `window.open` مباشرة داخل ملفات legacy modules.
- عدم وجود recursion في `writeStorageJson`.

تمت إضافة هذا الفحص إلى:

```powershell
npm run quality:full
```

## نتيجة الفحص

```text
JS syntax check passed ✅
Server smoke test passed ✅
UI audit passed ✅
Modular audit passed ✅
Runtime stability audit passed ✅
Architecture audit passed ✅
Professional layer audit passed ✅
Adapter audit passed ✅
Technical closure test passed ✅
```

## ما بقي للمرحلة التالية

- البدء بتحويل أول Feature إلى ES Module حقيقي باستخدام `import/export`.
- الأفضل أن نبدأ بملف آمن مثل `print-service` أو `storage repositories`، ثم ننتقل إلى صفحات صغيرة.
- إضافة اختبار متصفح حقيقي لاحقًا عند توفر Playwright أو بيئة Browser Automation.
