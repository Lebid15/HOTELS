# RELEASE_CHECKLIST — قائمة الإطلاق الإنتاجي (funduqii)

> تُملأ خاناتها فعليًّا قبل كل إصدار. **لا يُنشَر ما لم تكتمل الخانات الإلزامية.**
> القرار النهائي Go/No‑Go في **المرحلة 13** بعد اجتياز المرحلتين 11 (الاختبارات) و12 (السيناريو التشغيلي).

---

## أ) قبل الاختبارات
- [ ] الترحيلات جاهزة — `makemigrations --check --dry-run` لا معلّقات (أحدث: **0038**).
- [ ] `env` مضبوط (انظر `backend/.env.example` و`frontend/.env.example`).
- [ ] التوثيق محدَّث ومطابق للواقع (`plan.md`/`TESTING.md`/`DEPLOY.md`/`SECURITY.md`).
- [ ] لا أسرار داخل الكود أو في Git.
- [ ] إعدادات الإنتاج جاهزة (م9 — `check --deploy` = 0 issues بإعدادات إنتاجية).

## ب) الاختبارات (المرحلة 11 — ✅ مُجتازة 2026‑07‑02)
- [x] `cd backend && python manage.py test api` — **208 اختبارًا خضراء** (152 قائم + 56 تحصين؛ 0 فشل/خطأ).
- [x] `python manage.py check` — 0 مشاكل.
- [x] `python manage.py makemigrations --check --dry-run` — لا معلّقات (أحدث 0038).
- [x] `python manage.py check --deploy` — نظيف **بمتغيّرات بيئة الإنتاج الحقيقية** (0 issues).
- [x] `cd frontend && npm run lint` — exit 0.
- [x] `npm run typecheck` — نظيف.
- [x] `npm run build` — ناجح (46/46 صفحة؛ خط محلّي عبر `next/font/local`).
- [x] `npm audit` — لا ثغرات عالية/حرجة؛ **ثغرتان متوسّطتان (postcss/Next) مؤجّلتان** (الإصلاح يكسر Next).
- [ ] **سيناريو E2E تشغيليّ شامل (المرحلة 12)** — منفَّذ وموثَّق.

## ج) قبل النشر (على الإنتاج)
- [ ] `DATABASE_URL` يشير إلى **PostgreSQL** الإنتاجي (لا SQLite).
- [ ] `python manage.py migrate` مُطبَّق على قاعدة الإنتاج.
- [ ] `python manage.py collectstatic --noinput` (WhiteNoise).
- [ ] `python manage.py create_platform_owner` لإنشاء المالك الأوّل بأمان.
- [ ] `DEBUG=false` + `SECRET_KEY` قويّ (الإقلاع يفشل بدونه) + `ALLOWED_HOSTS` للدومين.
- [ ] HTTPS + HSTS + Secure cookies مفعّلة (تلقائيًا عند `DEBUG=false` / متغيّرات `DJANGO_SECURE_*`).
- [ ] `CORS_ALLOWED_ORIGINS` + `CSRF_TRUSTED_ORIGINS` للدومين (لا CORS مفتوح).
- [ ] Reverse proxy يمرّر `X‑Forwarded‑Proto`/`X‑Forwarded‑For` (ليعمل throttling على IP الحقيقي).
- [ ] `NEXT_PUBLIC_API_URL` (في `frontend/.env`) يشير إلى API الإنتاج.
- [ ] نسخ احتياطي مجدوَل + اختبار استعادة *(الإجراء في `DEPLOY.md §7`)*.
- [ ] مراقبة (uptime/errors) + تنبيهات *(الإجراء في `DEPLOY.md §7`)*.
- [ ] خطة Rollback موثّقة *(في `DEPLOY.md §7`)*.
- [x] بوّابة CI تمنع الدمج عند فشل أي فحص *(`.github/workflows/ci.yml` كفحص إلزامي في حماية الفرع)*.

## د) بعد النشر (Smoke test)
- [ ] تسجيل دخول (مالك المنصّة/مدير/استقبال) يعمل.
- [ ] حجز عام ناجح (رقم + `manage_token`/`manage_url`) + ظهور الفندق بعد استيفاء الشروط.
- [ ] تسجيل دخول/خروج (check‑in/out).
- [ ] تسجيل دفعة (مفردة/مقسّمة).
- [ ] طلب مطعم (FoodOrder).
- [ ] التدقيق الليلي (night audit) + الإغلاق اليومي.
- [ ] مستحقات المنصّة (platform dues) تظهر.
- [ ] لا أخطاء 5xx في السجلّات.
