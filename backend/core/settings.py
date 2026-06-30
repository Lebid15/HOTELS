import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY: In production set DJANGO_SECRET_KEY env variable to a strong random value
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-yw2t=5w)2n3*i2yjn*si6v0y^t26=27@uoxc@kg_nz3@1m-p=k',
)

# SECURITY: Set DJANGO_DEBUG=false in production
DEBUG = os.environ.get('DJANGO_DEBUG', 'true').lower() == 'true'

_allowed_hosts = os.environ.get('DJANGO_ALLOWED_HOSTS', '')
ALLOWED_HOSTS = (
    [h.strip() for h in _allowed_hosts.split(',') if h.strip()]
    if _allowed_hosts
    else (['localhost', '127.0.0.1'] if DEBUG else [])
)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS — in production set CORS_ALLOW_ALL_ORIGINS=false and CORS_ALLOWED_ORIGINS=https://yourdomain.com
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'true' if DEBUG else 'false').lower() == 'true'
if not CORS_ALLOW_ALL_ORIGINS:
    _origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _origins.split(',') if o.strip()]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/hour',
        'user': '1000/hour',
        'login': '5/minute',
        'register': '5/hour',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ── Email (booking confirmations) ──────────────────────────────────────────
# يُفعَّل الإرسال الفعلي تلقائيًا عند ضبط EMAIL_HOST_USER/PASSWORD.
# بدونها تُطبع الرسائل في الطرفية (console backend) فلا يتعطّل شيء أثناء التطوير.
EMAIL_HOST          = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT          = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS       = os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true'
EMAIL_HOST_USER     = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.environ.get('DEFAULT_FROM_EMAIL', 'Fandqi <no-reply@fandqi.com>')

if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ── SMS gateway (booking confirmations) ────────────────────────────────────
# بنية قابلة للتوصيل. اضبط SMS_PROVIDER + المفاتيح لتفعيل الإرسال الفعلي.
# القيم: '' (معطّل) | 'twilio' | 'generic_http' (بوابة محلية).
SMS_PROVIDER       = os.environ.get('SMS_PROVIDER', '')
SMS_FROM           = os.environ.get('SMS_FROM', 'Fandqi')
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN  = os.environ.get('TWILIO_AUTH_TOKEN', '')
SMS_HTTP_URL       = os.environ.get('SMS_HTTP_URL', '')
SMS_HTTP_API_KEY   = os.environ.get('SMS_HTTP_API_KEY', '')

PLATFORM_NAME      = os.environ.get('PLATFORM_NAME', 'Fandqi')

# ── WhatsApp Business Cloud API (إرسال تلقائي للضيف دون نقر) ────────────────
# يُفعَّل تلقائيًا عند ضبط PHONE_NUMBER_ID + ACCESS_TOKEN + TEMPLATE_NAME.
# تأكيد الحجز رسالة يبدأها النشاط التجاري → تتطلّب قالبًا معتمدًا من Meta.
# نص القالب الموصى به (body بـ6 معاملات، لغة عربية):
#   مرحبًا {{1}}، تم تأكيد حجزك في {{2}}.
#   رقم الحجز: {{3}}
#   الوصول: {{4}} — المغادرة: {{5}}
#   الإجمالي: {{6}} — الدفع عند الوصول.
WHATSAPP_PHONE_NUMBER_ID      = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')
WHATSAPP_ACCESS_TOKEN         = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')
WHATSAPP_TEMPLATE_NAME        = os.environ.get('WHATSAPP_TEMPLATE_NAME', '')
WHATSAPP_TEMPLATE_LANG        = os.environ.get('WHATSAPP_TEMPLATE_LANG', 'ar')
WHATSAPP_API_VERSION          = os.environ.get('WHATSAPP_API_VERSION', 'v21.0')
WHATSAPP_DEFAULT_COUNTRY_CODE = os.environ.get('WHATSAPP_DEFAULT_COUNTRY_CODE', '963')  # سوريا

# Production-only security headers
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = 'DENY'
