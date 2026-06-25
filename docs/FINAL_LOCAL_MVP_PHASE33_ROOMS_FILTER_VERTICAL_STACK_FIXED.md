# Final Local MVP Closure — Phase 33

## Rooms Filter Independent Vertical Stack Fix

تم إصلاح السبب الحقيقي لظهور فلتر الغرف مدموجًا مع كرت الطابق.

## السبب

صفحة الغرف تستخدم نفس class العام:

```css
.hotels-page
```

وهذا الكلاس كان يفرض تخطيط Grid عام بثلاثة صفوف:

```css
grid-template-rows: auto auto minmax(0, 1fr)
```

ومع إضافة فلتر مستقل قبل محتوى الطوابق، صار التخطيط العام يسبب ظهور الفلتر وكأنه جزء من كرت الطابق.

## الحل

تم جعل صفحة الغرف فقط تعمل كتخطيط عمودي واضح:

```css
.content .rooms-page.hotels-page,
.rooms-page.hotels-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  grid-template-rows: none;
}
```

والترتيب أصبح:

```text
عنوان الصفحة
ملاحظة الصفحة
شريط فلتر مستقل
كروت الطوابق والغرف
```

## الفحص

تم تحديث:

```powershell
npm run workspace-filters-layout:audit
```

حتى يمنع رجوع صفحة الغرف إلى grid العام في هذه الحالة.

## النتيجة المطلوبة

- الفلتر شريط مستقل تمامًا.
- لا يوجد كرت طابق داخل الفلتر.
- لا يوجد تداخل بين نص الفلتر وعنوان الطابق.
- الطابق الأول يبدأ أسفل شريط الفلتر بمسافة واضحة.
