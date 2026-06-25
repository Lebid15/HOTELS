# FANDQI Phase 106 — Payments 100% Component Centralization

## النطاق
تم تنفيذ هذه المرحلة على صفحة **المدفوعات** فقط، انطلاقًا من نسخة Phase 105، مع الحفاظ على كل إغلاقات الصفحات السابقة.

## ما تم توحيده
- هيدر صفحة المدفوعات عبر `FandqiUI.renderSectionHead`.
- كروت الملخص عبر `FandqiUI.renderMetricCard`.
- فلاتر البحث وطريقة الدفع عبر `renderPaymentSurface` و `renderPaymentField`.
- بانل الطلبات عبر `renderPaymentSurface`.
- قائمة الطلبات عبر `renderPaymentOrdersList` مع الاعتماد على كروت طلبات المطعم والكافتريا المركزية.
- حالات الفراغ عبر `renderPaymentEmptyState`.

## عناصر الحماية
- إضافة وسم مركزي للصفحة: `data-ui-centralized="phase106-payments"`.
- إضافة وسوم `data-ui-component` لعناصر الصفحة الأساسية.
- إضافة فحص خاص يمنع رجوع العشوائية: `npm run payments-central:closure-audit`.
- ربط الفحص الخاص داخل `npm run quality:full`.
- تحديث فحص تخطيط المدفوعات لقبول البنية المركزية الجديدة.

## ما لم يتغير
- منطق حساب إجمالي الطلبات.
- منطق الطلبات المرحّلة على حساب الغرف.
- فلاتر البحث وطريقة الدفع.
- طباعة فواتير المطعم والكافتريا.
- تكامل المدفوعات مع الإشعارات ولوحة التحكم.

## الفحوصات
تم تشغيل:

```powershell
npm run quality:full
```

والنتيجة: نجح الفحص الكامل.
