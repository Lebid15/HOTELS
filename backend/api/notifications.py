# -*- coding: utf-8 -*-
"""
إشعارات الحجز — بريد إلكتروني + SMS (ببنية قابلة للتوصيل).

كل الدوال best-effort: تُسجِّل الأخطاء في اللوغ ولا ترفع استثناءً يوقف الحجز.
- البريد: يعمل تلقائيًا عند ضبط EMAIL_HOST_USER/PASSWORD، وإلا يُطبع في الطرفية.
- SMS: يُتجاهَل بهدوء ما لم يُضبط SMS_PROVIDER + مفاتيح المزوّد.
"""
import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _platform_name():
    return getattr(settings, 'PLATFORM_NAME', 'funduqii')


def build_booking_summary(reservation):
    """نص ملخّص الحجز الكامل (يُستخدم في البريد)."""
    r = reservation
    hotel = r.hotel
    guest = f'{r.guest_first_name} {r.guest_last_name}'.strip()
    city = f' — {hotel.city}' if hotel.city else ''
    lines = [
        f'مرحبًا {guest}،',
        f'تم تأكيد حجزك في {hotel.name} بنجاح.',
        '',
        f'رقم الحجز: {r.public_booking_no}',
        f'الفندق: {hotel.name}{city}',
        f'نوع الغرفة: {r.room_type_label}',
        f'تاريخ الوصول: {r.check_in_date}',
        f'تاريخ المغادرة: {r.check_out_date}',
        f'عدد الليالي: {r.nights_count}',
        f'عدد الضيوف: {r.persons_count}',
        f'الإجمالي: {r.total} {r.currency}',
        'طريقة الدفع: الدفع عند الوصول',
        '',
        'احتفظ برقم الحجز لمتابعة حجزك أو إلغائه عبر صفحة «إدارة حجزي».',
        f'— {_platform_name()}',
    ]
    return '\n'.join(lines)


def build_sms_text(reservation):
    """نسخة مختصرة للرسائل القصيرة (SMS)."""
    r = reservation
    return (
        f'{_platform_name()}: تم تأكيد حجزك في {r.hotel.name}. '
        f'رقم الحجز {r.public_booking_no} | {r.check_in_date} ← {r.check_out_date} | '
        f'{r.total} {r.currency} | الدفع عند الوصول.'
    )


# م5: التطبيع صار في مصدر مركزي (api/phone.py) — يُعاد تصديره هنا للتوافق الخلفيّ
# مع الاستيرادات القائمة (from .notifications import normalize_phone).
from .phone import normalize_phone  # noqa: F401 (re-export)


# ── البريد الإلكتروني ───────────────────────────────────────────────────────
def send_email_confirmation(reservation):
    email = (reservation.guest_email or '').strip()
    if not email:
        return False
    try:
        send_mail(
            subject=f'تأكيد حجزك — {reservation.public_booking_no}',
            message=build_booking_summary(reservation),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info('تم إرسال بريد تأكيد الحجز %s', reservation.public_booking_no)
        return True
    except Exception as exc:
        logger.warning('فشل إرسال بريد تأكيد الحجز %s: %s', reservation.public_booking_no, exc)
        return False


# ── SMS (قابل للتوصيل) ──────────────────────────────────────────────────────
def send_sms_confirmation(reservation):
    provider = (getattr(settings, 'SMS_PROVIDER', '') or '').strip()
    phone = (reservation.guest_phone or '').strip()
    if not provider or not phone:
        return False  # لا مزوّد مضبوط أو لا رقم — تُتجاهل بهدوء
    text = build_sms_text(reservation)
    try:
        if provider == 'twilio':
            return _send_twilio(phone, text)
        if provider == 'generic_http':
            return _send_generic_http(phone, text)
        logger.warning('مزوّد SMS غير معروف: %s', provider)
        return False
    except Exception as exc:
        logger.warning('فشل إرسال SMS للحجز %s: %s', reservation.public_booking_no, exc)
        return False


def _send_twilio(phone, text):
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    sender = getattr(settings, 'SMS_FROM', 'funduqii')
    if not sid or not token:
        return False
    try:
        from twilio.rest import Client  # type: ignore
    except ImportError:
        logger.warning('مكتبة twilio غير مثبّتة — pip install twilio')
        return False
    Client(sid, token).messages.create(body=text, from_=sender, to=phone)
    return True


def _send_generic_http(phone, text):
    """بوابة HTTP عامة (لبوابة رسائل محلية). تتوقّع JSON POST."""
    import json
    from urllib import request as _req
    url = getattr(settings, 'SMS_HTTP_URL', '')
    api_key = getattr(settings, 'SMS_HTTP_API_KEY', '')
    if not url:
        return False
    payload = json.dumps({
        'to': phone, 'message': text,
        'sender': getattr(settings, 'SMS_FROM', 'funduqii'),
    }).encode('utf-8')
    req = _req.Request(url, data=payload, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
    })
    with _req.urlopen(req, timeout=10) as resp:
        return 200 <= resp.status < 300


# ── WhatsApp Business Cloud API (إرسال تلقائي) ──────────────────────────────
def _wa_template_params(reservation):
    """معاملات جسم القالب (6 معاملات، بالترتيب المتفق عليه مع قالب Meta)."""
    r = reservation
    guest = f'{r.guest_first_name} {r.guest_last_name}'.strip()
    hotel = r.hotel.name + (f' — {r.hotel.city}' if r.hotel.city else '')
    return [
        guest,                                  # {{1}}
        hotel,                                  # {{2}}
        str(r.public_booking_no),               # {{3}}
        str(r.check_in_date),                   # {{4}}
        str(r.check_out_date),                  # {{5}}
        f'{r.total} {r.currency}',              # {{6}}
    ]


def send_whatsapp_confirmation(reservation):
    """إرسال تأكيد الحجز تلقائيًا للضيف عبر WhatsApp Business Cloud API.
    يُتجاهَل بهدوء ما لم تُضبط بيانات الاعتماد + اسم القالب."""
    phone_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
    token    = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
    template = getattr(settings, 'WHATSAPP_TEMPLATE_NAME', '')
    if not phone_id or not token or not template:
        return False  # غير مُهيّأ — تجاهُل صامت

    to = normalize_phone(
        reservation.guest_phone,
        getattr(settings, 'WHATSAPP_DEFAULT_COUNTRY_CODE', '963'),
    )
    if not to:
        return False

    import json
    from urllib import request as _req, error as _err

    version = getattr(settings, 'WHATSAPP_API_VERSION', 'v21.0')
    lang    = getattr(settings, 'WHATSAPP_TEMPLATE_LANG', 'ar')
    url = f'https://graph.facebook.com/{version}/{phone_id}/messages'
    payload = json.dumps({
        'messaging_product': 'whatsapp',
        'to': to,
        'type': 'template',
        'template': {
            'name': template,
            'language': {'code': lang},
            'components': [{
                'type': 'body',
                'parameters': [{'type': 'text', 'text': p} for p in _wa_template_params(reservation)],
            }],
        },
    }, ensure_ascii=False).encode('utf-8')

    req = _req.Request(url, data=payload, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}',
    })
    try:
        with _req.urlopen(req, timeout=12) as resp:
            ok = 200 <= resp.status < 300
            if ok:
                logger.info('تم إرسال واتساب لتأكيد الحجز %s', reservation.public_booking_no)
            return ok
    except _err.HTTPError as exc:
        body = exc.read().decode('utf-8', 'replace') if hasattr(exc, 'read') else ''
        logger.warning('فشل إرسال واتساب للحجز %s: %s %s', reservation.public_booking_no, exc.code, body)
        return False
    except Exception as exc:
        logger.warning('فشل إرسال واتساب للحجز %s: %s', reservation.public_booking_no, exc)
        return False


# ── المجمِّع ────────────────────────────────────────────────────────────────
def send_hotel_email_notification(reservation):
    """إشعار صاحب الفندق بحجز جديد من الموقع العام."""
    r = reservation
    hotel = r.hotel
    to = (hotel.email or '').strip()
    if not to:
        return False
    guest = f'{r.guest_first_name} {r.guest_last_name}'.strip()
    body = '\n'.join([
        f'تم استلام حجز جديد عبر موقع {_platform_name()} لفندق {hotel.name}.',
        '',
        f'رقم الحجز: {r.public_booking_no}',
        f'الضيف: {guest}',
        f'الهاتف: {r.guest_phone}',
        f'البريد: {r.guest_email or "—"}',
        f'نوع الغرفة: {r.room_type_label}' + (f' (غرفة رقم {r.room.number})' if r.room else ''),
        f'تاريخ الوصول: {r.check_in_date}',
        f'تاريخ المغادرة: {r.check_out_date}',
        f'عدد الليالي: {r.nights_count}',
        f'عدد الضيوف: {r.persons_count}',
        f'الإجمالي: {r.total} {r.currency}',
        'طريقة الدفع: الدفع عند الوصول',
        '',
        'يرجى الدخول إلى لوحة التحكم لمراجعة الحجز ومتابعته من قسم «حجوزات الموقع».',
        f'— {_platform_name()}',
    ])
    try:
        send_mail(
            subject=f'حجز جديد من الموقع — {r.public_booking_no}',
            message=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[to],
            fail_silently=False,
        )
        logger.info('تم إرسال إشعار الفندق بالحجز %s', r.public_booking_no)
        return True
    except Exception as exc:
        logger.warning('فشل إرسال إشعار الفندق بالحجز %s: %s', r.public_booking_no, exc)
        return False


def notify_booking_created(reservation):
    """يرسل كل الإشعارات المتاحة. best-effort — لا يرفع استثناء."""
    return {
        'email': send_email_confirmation(reservation),
        'sms': send_sms_confirmation(reservation),
        'whatsapp': send_whatsapp_confirmation(reservation),
        'hotel_email': send_hotel_email_notification(reservation),
    }
