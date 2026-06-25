# Final Local MVP Phase 80 — Subscription Requests Separation & 7-Day Trial Auto Activation

## الهدف
تنظيم منطق صاحب المنصة بشكل احترافي وفصل معاملات طلبات الاشتراك عن تعريف الباقات، مع ضمان أن أي فندق جديد لا يبدأ بحالة منتهية أو غير مفعلة.

## ما تم تنفيذه
- إضافة صفحة مستقلة لصاحب المنصة باسم **طلبات الاشتراك**.
- إزالة صندوق الطلبات من صفحة **الباقات** حتى تبقى الباقات مخصصة لتعريف الخطط فقط.
- ربط كرت لوحة التحكم وإشعار الجرس الخاص بطلبات الاشتراك بالصفحة الجديدة.
- إنشاء/ضمان وجود باقة تجريبية تلقائية `trial` بمدة 7 أيام.
- عند تسجيل فندق جديد ذاتيًا من صفحة إنشاء الحساب، يتم إنشاء اشتراك تجريبي فعّال لمدة 7 أيام مباشرة.

## قواعد التشغيل الجديدة
- الباقات = تعريف الخطط والأسعار والحدود.
- الاشتراكات = حالة كل فندق واشتراكه الحالي.
- طلبات الاشتراك = صندوق قرارات لصاحب المنصة للموافقة أو الرفض.
- التسجيل الذاتي لفندق جديد = فندق فعال + مدير فعال + اشتراك تجريبي 7 أيام.

## الملفات المعدلة
- `apps/web/public/assets/js/modules/01-navigation-topbar.js`
- `apps/web/public/assets/js/modules/03b-platform-packages-subscriptions-dashboard.js`
- `apps/web/public/assets/js/modules/03c-platform-subscription-requests.js`
- `apps/web/public/assets/js/modules/11b-workspace-login-shell-core.js`
- `apps/web/public/assets/js/modules/11c-platform-row-actions.js`
- `apps/web/public/assets/js/modules/11d-backup-dashboard-workspace-events-init.js`
- `apps/web/public/locales/ar.json`
- `apps/web/public/locales/en.json`
- `FANDQI_CHANGE_NOTES.md`
