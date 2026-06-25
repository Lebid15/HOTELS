# Fandqi Phase 83 — Platform Owner Sidebar & Settings Rhythm Lock

## الهدف
إغلاق ملاحظتين واضحتين في واجهة صاحب المنصة بعد Phase 82:

1. ظهور عنصر **طلبات الاشتراك** في السايدبار كأيقونة فقط بدون اسم.
2. تغير البادينك والتموضع داخل **إعدادات المنصة** عند تبديل التبويبات.

## التعديلات المنفذة

### 1. إصلاح اسم طلبات الاشتراك في السايدبار
- تمت إضافة مفتاح `nav.subscription_requests` في ملفات الترجمة:
  - `apps/web/public/locales/ar.json`
  - `apps/web/public/locales/en.json`
- تم تأمين عرض النص داخل السايدبار حتى لا يختفي أو يخرج من حدود الزر.

### 2. تثبيت إيقاع إعدادات المنصة
- أضيفت دالة `resetPlatformSettingsScrollLock()` لإعادة موضع السكرول عند تبديل تبويبات إعدادات المنصة.
- أضيفت `data-layout-fixed="stable-platform-settings-tabs"` لتبويبات إعدادات المنصة.
- أضيفت `data-layout-fixed="platform-settings-title-only-head"` لهيدر إعدادات المنصة.
- تم قفل ارتفاع الهيدر والتبويبات وأزرار التبويب حتى تبقى المسافات ثابتة بين:
  - هوية المنصة
  - الإعدادات الافتراضية
  - الأمان
  - الفواتير والترقيم
  - التنبيهات
  - الدعم ووسائل التواصل
  - شروط الاشتراك
  - النسخ الاحتياطي

## الملفات المعدلة
- `apps/web/public/locales/ar.json`
- `apps/web/public/locales/en.json`
- `apps/web/public/assets/js/modules/03a-platform-settings-auth-hotels-managers.js`
- `apps/web/public/assets/js/modules/03b-platform-packages-subscriptions-dashboard.js`
- `apps/web/public/assets/js/modules/11d-backup-dashboard-workspace-events-init.js`
- `apps/web/public/assets/css/patches/final-regression-fixes.css`
- `FANDQI_CHANGE_NOTES.md`

## الفحوصات
تم تنفيذ الفحوصات التالية بنجاح:

```powershell
npm run check
npm run smoke:test
npm run ui:audit
npm run quality:full
```
