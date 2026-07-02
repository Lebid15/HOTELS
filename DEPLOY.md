# نشر funduqii على الإنتاج

دليل تشغيل النسخة الإنتاجية (PostgreSQL + Gunicorn + WhiteNoise خلف Reverse Proxy).

## 1) المتطلّبات
- Python 3.12، PostgreSQL 14+، Node 20+ (لبناء الواجهة)، Reverse Proxy (Nginx/Caddy) ينهي TLS.

## 2) الواجهة الخلفية (Backend)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt

# اضبط متغيّرات البيئة (انظر backend/.env.example) — الإلزامية على الإنتاج:
export DJANGO_DEBUG=false
export DJANGO_SECRET_KEY="<مفتاح عشوائي طويل ≥50 حرفًا>"
export DJANGO_ALLOWED_HOSTS="funduqii.com,api.funduqii.com"
export DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/funduqii"
export CORS_ALLOW_ALL_ORIGINS=false
export CORS_ALLOWED_ORIGINS="https://funduqii.com"
export CSRF_TRUSTED_ORIGINS="https://funduqii.com,https://api.funduqii.com"

python manage.py check --deploy      # يجب أن تكون النتيجة: 0 issues (انظر الأمر الكامل أدناه)
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py create_platform_owner   # إنشاء مالك المنصّة بأمان (كلمة المرور من env أو تفاعليًا)

gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

> **توليد SECRET_KEY:** `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
>
> **ملاحظات أمنية مطبّقة:** الإقلاع **يفشل** إن غاب `DJANGO_SECRET_KEY` مع `DEBUG=false`. WhiteNoise يخدم الملفات الثابتة مضغوطة. `SECURE_PROXY_SSL_HEADER` مضبوط للعمل خلف بروكسي HTTPS. **ممنوع** تشغيل `seed_users`/`seed_*` على الإنتاج.

### 2.1) أمان الإنتاج (م9) — يُفعَّل تلقائيًا عند `DEBUG=false`
عند `DJANGO_DEBUG=false` تُضبط تلقائيًا وبقيَم آمنة: `SECURE_SSL_REDIRECT` و`SESSION_COOKIE_SECURE` و`CSRF_COOKIE_SECURE` و`SECURE_HSTS_SECONDS=31536000` (+ `INCLUDE_SUBDOMAINS` + `PRELOAD`) و`X_FRAME_OPTIONS=DENY`. كلّها **قابلة للتجاوز** عبر متغيّرات `DJANGO_SECURE_*` (انظر `backend/.env.example`) — مثلاً بيئة staging دون HTTPS. **لا تُعطّلها على إنتاج HTTPS حقيقيّ.** `HSTS_PRELOAD` لا يُفعَّل إلا بعد تأكيد HTTPS لكل النطاقات الفرعية (قرار يصعب التراجع عنه).

### 2.2) فحص إعدادات الإنتاج (`check --deploy`) — يجب أن يكون **صفر تحذيرات**
شغّله بإعدادات إنتاجية حقيقية من env (لا يكفي تشغيله بإعدادات التطوير):

```bash
DJANGO_DEBUG=false \
DJANGO_SECRET_KEY="<مفتاح عشوائي طويل ≥50 حرفًا>" \
DJANGO_ALLOWED_HOSTS="funduqii.com,api.funduqii.com" \
CORS_ALLOW_ALL_ORIGINS=false \
CORS_ALLOWED_ORIGINS="https://funduqii.com" \
CSRF_TRUSTED_ORIGINS="https://funduqii.com,https://api.funduqii.com" \
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/funduqii" \
python manage.py check --deploy
# النتيجة المتوقّعة: System check identified no issues (0 silenced).
```

### 2.3) الملفات الثابتة والوسائط (Static / Media)
- **Static:** `collectstatic --noinput` يجمع الملفات إلى `backend/staticfiles/` (`STATIC_ROOT`)، ويخدمها **WhiteNoise** مضغوطةً وبتخزين مؤقّت (`CompressedManifestStaticFilesStorage` عند `DEBUG=false`) — لا حاجة لخادم static منفصل. شغّل `collectstatic` عند كل نشر.
- **Media (وسائط المستخدم):** حاليًا التخزين افتراضيّ (`FileSystemStorage`) على القرص المحلّي؛ لا يوجد `MEDIA_ROOT`/`MEDIA_URL` مخصّص بعد (الصور تُحفظ كـ data-url/روابط في الحقول). **المتطلّب الإنتاجيّ المؤجَّل:** نقل الوسائط إلى Object Storage (S3/R2) عند التوسّع — لم يُنفَّذ الآن (خارج نطاق م9).

## 3) الواجهة الأمامية (Frontend)

```bash
cd frontend
npm ci
# frontend/.env.local:
#   NEXT_PUBLIC_API_URL=https://api.funduqii.com/api
npm run build
npm run start    # أو انشرها على Vercel/Node server
```

## 4) Reverse Proxy (مثال Nginx)
- `funduqii.com` → الواجهة الأمامية (Next.js:3000).
- `api.funduqii.com` → الواجهة الخلفية (Gunicorn:8000) مع تمرير `X-Forwarded-Proto https`.
- **Throttling حسب IP:** مرّر `X-Forwarded-For` من البروكسي واضبط `NUM_PROXIES` (أو middleware موثوق) كي يعمل الـthrottling العام على IP الزائر الحقيقي لا IP الوسيط. (بدون ذلك قد تُحسب كل الطلبات من IP واحد.)

## 5) قاعدة البيانات
- على الإنتاج **PostgreSQL إلزامي** (SQLite للتطوير فقط) — يُضبط عبر `DATABASE_URL`، لا تغيير كود.

## 6) بوّابة CI (م13)
- `.github/workflows/ci.yml` يشغّل بوّابة الجودة على كل دفع/طلب دمج نحو `main`:
  الخلفية (`check` + `makemigrations --check` + `test api`) والواجهة (`lint` + `typecheck` + `build`).
- **اجعل الوظيفتين إلزاميتين** في حماية الفرع (Branch protection → Require status checks) — فلا يُدمَج ما يكسر البوّابة.

## 7) العمليات — نسخ احتياطي · مراقبة · تراجع (Runbook)
- **النسخ الاحتياطي:** `pg_dump` يوميًّا مجدوَل (cron) إلى تخزين خارج الخادم مع احتفاظ ≥7 أيام؛
  **اختبر الاستعادة** دوريًّا على قاعدة منفصلة (`pg_restore`). الوسائط المرفوعة تُنسَخ مع القاعدة.
- **المراقبة والتنبيهات:** فحص توفّر خارجي (uptime) على `GET /api/` + جمع أخطاء 5xx (Sentry/سجلّات)؛
  تنبيه على ارتفاع 5xx أو توقّف الخدمة. راقب امتلاء القرص/الاتصالات على PostgreSQL.
- **التراجع (Rollback):** انشر بوسم إصدار (tag) ثابت؛ للتراجع أعِد نشر الوسم السابق.
  ترحيلات القاعدة **متوافقة للأمام** قدر الإمكان؛ لأي ترحيل هدّام احتفظ بنسخة `pg_dump` قبله مباشرة
  واستعِدها عند الحاجة. لا تُشغَّل ترحيلات هدّامة بلا نسخة احتياطية طازجة.

## 8) قائمة التحقّق قبل الإطلاق
انظر `RELEASE_CHECKLIST.md` و`plan.md` (السجلّ الحيّ لموانع الإطلاق).
