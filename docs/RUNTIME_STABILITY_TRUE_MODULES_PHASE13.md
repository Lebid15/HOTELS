# Runtime Stability & True Modules — Phase 13

## Reports & Payments Central UI Migration

تم في هذه المرحلة تحويل صفحتي التقارير والمدفوعات تدريجيًا لاستخدام طبقة المكونات المركزية `FandqiUI` بدون تغيير منطق التقارير أو حسابات المدفوعات.

## الملفات الأساسية

- `apps/web/public/assets/js/modules/10b-reports.js`
- `apps/web/public/assets/js/modules/10c-payments-notifications.js`
- `scripts/reports-payments-ui-migration-audit.mjs`

## ما تم تحويله في التقارير

- أزرار الطباعة والتصدير عبر `renderReportButton`.
- تبويبات التقرير عبر `renderReportTabButton` مع الحفاظ على `data-report-type`.
- حالة الفراغ في جداول التقارير عبر `renderReportEmptyState`.
- كروت ملخص التقارير عبر `renderReportSummaryCard`.
- علامات migration:
  - `data-ui-migrated="reports"`
  - `data-ui-migrated="reports-summary"`
  - `data-ui-migrated="reports-tabs"`
  - `data-ui-migrated="reports-actions"`

## ما تم تحويله في المدفوعات

- كروت ملخص المدفوعات عبر `renderPaymentSummaryCard`.
- وسم لوحة طلبات المدفوعات.
- علامات migration:
  - `data-ui-migrated="payments"`
  - `data-ui-migrated="payments-summary"`
  - `data-ui-migrated="payments-orders-panel"`

## تحسينات مرتبطة بنفس ملف المدفوعات

- تحويل زر تحديث الإشعارات عبر `renderNotificationsRefreshButton`.
- تحويل شارات الإشعارات عبر `renderNotificationBadge`.
- تحويل زر فتح القسم في الإشعارات عبر `renderNotificationButton`.

## الفحص الجديد

```powershell
npm run reports-payments-ui-migration:audit
```

ويدخل ضمن:

```powershell
npm run quality:full
```
