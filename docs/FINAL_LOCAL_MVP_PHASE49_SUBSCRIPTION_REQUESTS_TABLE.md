# Final Local MVP Closure — Phase 49

## Subscription Requests Table

تم إضافة جدول طلبات تغيير الباقة أو التمديد في أسفل صفحة الاشتراك والباقات.

## مكان الجدول

الترتيب الحالي:

```text
كروت الباقات
الباقة المفعلة
جدول الطلبات
```

## أعمدة الجدول

- نوع الطلب.
- الباقة المطلوبة.
- الباقة الحالية.
- الحالة.
- تاريخ الطلب.

## مصدر البيانات

```text
fandqi.managerSubscriptionRequests
```

ويتم فلترتها حسب الفندق الحالي.

## الفحص

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```
