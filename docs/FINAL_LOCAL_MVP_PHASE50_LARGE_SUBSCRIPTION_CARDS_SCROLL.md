# Final Local MVP Closure — Phase 50

## Large Subscription Cards + Page Scroll

تم تكبير كروت الباقات وجعل الصفحة تعتمد على السكرول العمودي بدل ضغط الكروت.

## التغييرات

- تكبير كروت الباقات.
- تكبير السعر والأيقونة.
- زيادة المسافات الداخلية.
- زيادة ارتفاع الأزرار.
- جعل الصفحة قابلة للتمدد والتمرير طبيعيًا.
- الحفاظ على ترتيب الصفحة:
  - كروت الباقات.
  - الباقة المفعّلة.
  - جدول الطلبات.

## الفحص

```powershell
npm run workspace-subscription-packages:audit
npm run quality:full
```
