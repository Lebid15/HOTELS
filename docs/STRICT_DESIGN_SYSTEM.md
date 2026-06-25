# Fandqi Strict Design System Cleanup

تم تنظيف المشروع وتثبيت مركزية التصميم بشكل صارم حتى لا يتم بناء كرت أو زر أو حقل أو فلتر أو مودال بشكل منفصل داخل صفحة.

## القاعدة الرئيسية

أي عنصر بصري متكرر يجب أن يمر عبر واحد من هذه الطبقات المركزية:

- `tokens.css` للقيم الأساسية: ألوان، مسافات، حواف، ظلال، ارتفاعات، أحجام خطوط، أبعاد المودالات.
- `app.css` لطبقة مكونات موحدة تبدأ ببادئة `ds-`.
- `app.js` لدالة `applyCentralDesignSystem()` التي تطبق نفس قواعد المكونات على كل الصفحات بعد كل Render.
- `scripts/ui-audit.mjs` لفحص الالتزام ومنع الرجوع للعشوائية.

## مكونات التصميم المركزية

```text
ds-card
ds-summary-card
ds-filters
ds-field
ds-control
ds-btn
ds-modal-card
ds-modal-grid
ds-modal-actions
ds-badge
ds-table
ds-scroll-area
```

## ما الذي يمنعه الفحص الآن؟

```text
inline style
hard-coded hex خارج tokens.css
!important
raw rgb/rgba داخل app.css
غياب دوال ومكونات التصميم المركزي
```

## قاعدة الألوان

- الألوان الأساسية موجودة فقط داخل `tokens.css`.
- الصفحات تستخدم `var(...)` و `color-mix(...)` فقط.
- ألوان أزرار المشروع مركزية:
  - Primary
  - Accent
  - Luxury
  - Warning
  - Danger
  - Neutral

## قاعدة الغرف والنزلاء

ألوان الغرف أصبحت في مكان مركزي واحد فقط داخل طبقة Design System.
كل غرفة تحصل على hue ثابت، وكل النزلاء داخل نفس الغرفة يأخذون نفس اللون.
ترتيب النزلاء حسب الغرفة بقي محفوظًا منطقياً داخل JavaScript، أما لون الكرت فهو من طبقة CSS المركزية.

## طريقة إضافة صفحة جديدة لاحقًا

1. لا تضف ألوان مباشرة.
2. لا تستخدم `style="..."`.
3. لا تستخدم `!important`.
4. لا تبني زر جديد بكلاس خاص منفصل.
5. استخدم:
   - `.btn`
   - `.input`
   - `.select`
   - `.filters-bar`
   - `.modal-card`
   - `.table-card`
   - أو كلاس `ds-*` المناسب.
6. شغل الفحص قبل التسليم:

```powershell
npm run check
npm run ui:audit
npm run smoke:test
```
