# Runtime Stability & True Modules — Phase 7

## Central UI Migration — Subscription & Packages

هذه المرحلة بدأت بتحويل أول صفحات فعلية في المشروع لاستخدام طبقة المكونات المركزية `FandqiUI` بدل بناء الأزرار والشارات وحالات الفراغ بشكل يدوي داخل الصفحة.

## ما تم تحويله

### 1. صفحة الاشتراك والباقات للفندق
الملف:

```text
apps/web/public/assets/js/modules/11a-subscription-plan.js
```

تم ربط الصفحة بالمكوّنات المركزية التالية:

```text
FandqiUI.renderButton
FandqiUI.renderBadge
FandqiUI.renderEmptyState
```

وتم وضع علامة واضحة داخل الصفحة:

```html
<div data-ui-migrated="subscription-plan">
```

### 2. صفحة إدارة الباقات لدى صاحب المنصة
الملف:

```text
apps/web/public/assets/js/modules/03b-platform-packages-subscriptions-dashboard.js
```

تم ربط أجزاء إدارة الباقات بالمكونات المركزية للأزرار، الشارات، وحالات الفراغ، مع الحفاظ على نفس السلوك القديم.

### 3. تحسين مركزي للشارات
الملف:

```text
apps/web/public/assets/js/professional/ui/badge.mjs
```

تم توسيع دعم حالات الاشتراك والباقات مثل:

```text
not_set
trial
suspended
expired
pending
active
```

حتى لا يتم التعامل معها كلها كنصوص عشوائية، بل تحصل على Tone مركزي مناسب.

## فحص جديد

تمت إضافة أمر:

```powershell
npm run ui-migration:audit
```

وتم إدخاله ضمن:

```powershell
npm run quality:full
```

## هدف المرحلة

الهدف ليس تغيير شكل الصفحة جذريًا، بل بدء الانتقال الآمن من HTML يدوي متكرر إلى مكونات مركزية قابلة للتطوير والتعديل بدون كسر الصفحات القديمة.
