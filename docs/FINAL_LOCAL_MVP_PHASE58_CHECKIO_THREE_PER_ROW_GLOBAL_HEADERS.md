# Final Local MVP Closure — Phase 58

## Check-in/out Cards Three Per Row + Global Title-only Headers

تم تطبيق ملاحظتين أساسيتين:

1. كروت صفحة الدخول والمغادرة تظهر 3 كروت في السطر على الشاشات الكبيرة.
2. هيدر الصفحات أصبح موحدًا وبسيطًا: اسم القسم فقط + الأزرار إن وجدت.

## كروت الدخول والمغادرة

- 3 كروت في السطر على الشاشات الكبيرة.
- كرتان على الشاشات المتوسطة.
- كرت واحد على الشاشات الصغيرة.
- تم الحفاظ على وضوح المعلومات داخل الكرت.

## الهيدر العام للصفحات

الهيدر أعلى كل صفحة يجب أن يحتوي على:

```text
اسم القسم
أزرار الصفحة إن وجدت
```

ولا يحتوي على:

```text
عبارات شرح
وصف طويل
فراغات عشوائية تحت العنوان
```

## الملفات المعدلة

```text
apps/web/public/assets/js/modules/09b-check-in-out.js
apps/web/public/assets/css/patches/final-regression-fixes.css
scripts/guests-checkio-ui-migration-audit.mjs
scripts/ui-migration-closure-audit.mjs
FANDQI_CHANGE_NOTES.md
```

## الفحص

```powershell
npm run guests-checkio-ui-migration:audit
npm run ui-migration:closure-audit
npm run quality:full
```
