# Central Foundation

هذه هي المرحلة الأولى فقط.

## لا يوجد في هذه النسخة

- لا غرف
- لا حجوزات
- لا نزلاء
- لا مدفوعات
- لا مطعم
- لا إشعارات
- لا قاعدة بيانات

## يوجد في هذه النسخة

- Auth UI تجريبي
- Admin Shell فارغ
- Theme System
- Language System
- RTL / LTR
- Responsive Layout
- Central CSS Tokens

## الملفات المركزية

```text
apps/web/public/assets/css/tokens.css
apps/web/public/assets/css/app.css
apps/web/public/assets/js/i18n.js
apps/web/public/assets/js/app.js
apps/web/public/locales/ar.json
apps/web/public/locales/en.json
```


## Professional Login

تم تجهيز صفحة الدخول كجزء من النواة المركزية، بدون إضافة أي أقسام تشغيلية.

المكونات:

```text
pro-auth-shell
auth-layout
auth-visual
pro-auth-card
password-field
login-options
auth-tools
```


## Delivery Login Cleanup

- الجانب التعريفي في صفحة الدخول يشرح ميزات المنصة وليس طريقة بناء المنصة.
- زر اللغة أيقونة فقط، وتم إلغاء تبديل الثيم لاستخدام واجهة فاتحة ثابتة.
- زر إظهار/إخفاء كلمة المرور أيقونة عين.
- واجهة الدخول لا تعرض حساب التجربة أو معلومات تقنية.


## Theme Upgrade

- اعتماد `Tajawal` كخط أساسي للمشروع.
- استخدام أوزان 700 / 800 / 900.
- اعتماد ثيم فاتح ثابت عبر Tokens مركزية بدون ثيم غامق.
- إضافة تدرجات وتفاعلات حديثة دون كسر مركزية التصميم.

## Strict Design System Enforcement

تمت إضافة طبقة مركزية صارمة للمشروع:

```text
tokens.css        القيم المركزية
app.css           مكونات ds-* المركزية
app.js            DESIGN_SYSTEM + applyCentralDesignSystem
ui-audit.mjs      فحص الالتزام ومنع العشوائية
```

لا يسمح بعد الآن باستخدام:

```text
style="..."
!important
hard-coded hex خارج tokens.css
raw rgb/rgba داخل app.css
```
