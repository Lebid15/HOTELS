"""المرحلة 2 — بوّابة أهلية الظهور والحجز العام (مصدر مركزي واحد).

كل قرار يخصّ «هل يَظهر الفندق للعامّة؟» و«هل يقبل حجزًا عامًّا؟» و«أيّ الغرف
قابلة للحجز العام في فترة معيّنة؟» يُتّخذ هنا فقط. يُمنع تكرار هذه الشروط داخل
أيّ View — الـViews تستدعي هذه الدوال ولا تُعيد صياغة المنطق.

القاعدتان الأساسيتان:
  • can_show_publicly(hotel)         → الظهور العام (القائمة/التفاصيل/التوفّر/التقييمات).
  • can_accept_public_booking(hotel) → قبول حجز عام (كل شروط الظهور + شروط الحجز + الاتفاقية).
القرار كلّه خادميّ؛ لا تعتمد الواجهة في الإخفاء/المنع. أيّ طلب مباشر بـ hotel_id
لفندق غير مؤهّل يرفضه الخادم.

مصدر الحقائق (models.py):
  • حالة الفندق  : Hotel.status (active/suspended/archived) — «موقوف» = تعطيل من المنصّة، «مؤرشف» = مؤرشف.
  • تفعيل عامّ   : Hotel.public_listing_enabled / Hotel.public_booking_enabled.
  • الباقة       : Package.allow_public_listing / Package.allow_public_booking.
  • الاشتراك     : Subscription.status (active/trial قائم) + end_date (فارغ = بلا انتهاء).
  • الاتفاقية    : PlatformSettings.web_booking_agreement (+ agreement_version) و HotelAgreementAcceptance.
  • الغرفة       : Room.show_in_public / Room.status / Room.capacity / Room.hotel.
ملاحظة: نقص صورة الفندق لا يمنع الظهور (الواجهة تستخدم صورة/أيقونة افتراضية)؛
البيانات الأساسية المطلوبة للعرض = الاسم + المدينة.
"""
from django.db.models import Q
from django.utils import timezone

from .models import (
    Hotel, Subscription, Room, Reservation,
    PlatformSettings, HotelAgreementAcceptance,
)

# اشتراك يُعدّ «قائمًا» إذا كانت حالته ضمن هذه القيم (فعّال/تجريبي).
SUB_LIVE_STATUSES = [Subscription.STATUS_ACTIVE, Subscription.STATUS_TRIAL]

# حالات الغرفة التي تمنع العرض/الحجز العام بغضّ النظر عن التوفّر الزمني.
# ملاحظة مقصودة: «مشغولة/تنظيف» تبقى قابلة للبيع العام (يحسمها تداخل التواريخ فقط).
ROOM_PUBLIC_EXCLUDED_STATUSES = [
    Room.STATUS_ARCHIVED, Room.STATUS_OUT_OF_SERVICE, Room.STATUS_MAINTENANCE,
]

# حالات الحجز التي لا تحجز الغرفة (ملغى/لم يحضر) → تُستثنى من فحص التداخل.
NON_BLOCKING_RESERVATION_STATUSES = [
    Reservation.STATUS_CANCELLED, Reservation.STATUS_NO_SHOW,
]


# ─────────────────────────── ظهور الفندق العام ────────────────────────────
def public_visible_hotels_qs():
    """QuerySet الفنادق المؤهّلة للظهور العام — التعريف الوحيد لشروط الظهور:
      1) الحالة = فعّال  (تلقائيًا: غير موقوف من المنصّة وغير مؤرشف).
      2) public_listing_enabled = true.
      3) بيانات عرض أساسية مكتملة (اسم + مدينة).
      4) اشتراك قائم (فعّال/تجريبي) غير منتهٍ، وباقته تسمح بالظهور العام.
    (فارغ end_date = بلا انتهاء. distinct لازم بسبب وصلات الاشتراك/الباقة.)"""
    today = timezone.localdate()
    return (
        Hotel.objects
        .filter(status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        .exclude(name='').exclude(city='')
        .filter(subscription__status__in=SUB_LIVE_STATUSES,
                subscription__package__allow_public_listing=True)
        .filter(Q(subscription__end_date__isnull=True) | Q(subscription__end_date__gte=today))
        .select_related('subscription', 'subscription__package')
        .distinct()
    )


def can_show_publicly(hotel):
    """هل يَظهر هذا الفندق للعامّة؟ يُقيَّم عبر public_visible_hotels_qs نفسه كي
    لا يتباعد الفحص المفرد عن منطق القائمة (مصدر واحد لا يُكرَّر)."""
    if hotel is None or not getattr(hotel, 'pk', None):
        return False
    return public_visible_hotels_qs().filter(pk=hotel.pk).exists()


def get_public_hotel_or_none(slug_or_id):
    """جلب فندق مؤهّل للظهور العام عبر slug أو رقم — أو None إن لم يكن مؤهّلًا/
    موجودًا. يُستخدم في التفاصيل/التوفّر/التقييمات (بدل تكرار get + try/except)."""
    qs = public_visible_hotels_qs()
    try:
        return qs.get(pk=int(slug_or_id)) if str(slug_or_id).isdigit() else qs.get(slug=slug_or_id)
    except (Hotel.DoesNotExist, ValueError):
        return None


# ─────────────────────────── الاتفاقية القانونية ──────────────────────────
def agreement_enforced():
    """هل اتفاقية حجوزات الموقع مفعّلة أصلًا من المنصّة؟ (نصّ غير فارغ)."""
    s = PlatformSettings.get_solo()
    return bool((s.web_booking_agreement or '').strip())


def hotel_accepted_agreement(hotel):
    """هل قَبِل الفندق النسخة الحالية من الاتفاقية؟ إن لم تكن هناك اتفاقية مفعّلة
    (نصّها فارغ) فلا حجب — تُعدّ مقبولة. يقبل كائن Hotel أو رقمه."""
    if hotel is None:
        return False
    s = PlatformSettings.get_solo()
    if not (s.web_booking_agreement or '').strip():
        return True   # لا اتفاقية مضبوطة → لا حجب
    hid = getattr(hotel, 'pk', hotel)
    return HotelAgreementAcceptance.objects.filter(
        hotel_id=hid, version=s.agreement_version).exists()


# ─────────────────────────── قبول الحجز العام ─────────────────────────────
def bookable_hotels_qs():
    """QuerySet الفنادق التي تقبل حجزًا عامًّا — تُبنى **فوق** شروط الظهور
    (مجموعة فائقة، م§3: «كل شروط الظهور بالإضافة إلى»): كل شروط الظهور +
    public_booking_enabled + الباقة تسمح بالحجز العام. (قبول الاتفاقية يُفحص
    بايثونيًّا لأنّه يعتمد على إعداد المنصّة المفرد.)"""
    return public_visible_hotels_qs().filter(
        public_booking_enabled=True,
        subscription__package__allow_public_booking=True,
    )


def can_accept_public_booking(hotel):
    """هل يقبل هذا الفندق حجزًا عامًّا الآن؟ = كل شروط الظهور + شروط الحجز +
    قبول الاتفاقية الحالية (إن كانت مفعّلة). فحص على مستوى الفندق؛ فحوص الغرفة/
    التواريخ في public_available_rooms_qs."""
    if hotel is None or not getattr(hotel, 'pk', None):
        return False
    if not bookable_hotels_qs().filter(pk=hotel.pk).exists():
        return False
    return hotel_accepted_agreement(hotel)


def bookable_hotel_or_none(hotel_id):
    """جلب فندق يقبل الحجز العام عبر رقمه — أو None إن لم يكن مؤهّلًا. هذه هي
    البوّابة التي تمنع تجاوزها بتمرير hotel_id مباشرةً في إنشاء الحجز."""
    hotel = bookable_hotels_qs().filter(pk=hotel_id).first()
    if hotel is None or not hotel_accepted_agreement(hotel):
        return None
    return hotel


# ─────────────────────────── الغرف العامة والتوفّر ────────────────────────
def conflicting_room_ids(hotel_id, check_in, check_out):
    """أرقام غرف الفندق المحجوزة (تداخل زمنيّ نصف‑مفتوح) خلال الفترة — تُستثنى
    الحجوزات الملغاة/التي لم تحضر. قاعدة التداخل: existing.in < new.out و
    existing.out > new.in."""
    return list(
        Reservation.objects.filter(
            hotel_id=hotel_id, room__isnull=False,
            check_in_date__lt=check_out, check_out_date__gt=check_in,
        ).exclude(status__in=NON_BLOCKING_RESERVATION_STATUSES)
        .values_list('room_id', flat=True)
    )


def public_available_rooms_qs(hotel, check_in, check_out, guests=1,
                              room_type=None, for_update=False):
    """غرف الفندق القابلة للحجز العام خلال الفترة المطلوبة (م§3 قواعد 5–8):
      • تابعة لنفس الفندق (عبر hotel.rooms).
      • ظاهرة للعامّة (show_in_public).
      • ليست مؤرشفة/خارج الخدمة/صيانة.
      • سعتها تكفي عدد الضيوف.
      • لا تتداخل مع حجز حاجز خلال الفترة.
    مصدر واحد يستخدمه التوفّر العام وإنشاء الحجز العام معًا (بلا تكرار).
    عند for_update=True (داخل معاملة) تُقفل الصفوف المرشّحة لحسم السباق."""
    busy = set(conflicting_room_ids(hotel.id, check_in, check_out))
    qs = (
        hotel.rooms
        .filter(show_in_public=True, capacity__gte=guests)
        .exclude(status__in=ROOM_PUBLIC_EXCLUDED_STATUSES)
        .exclude(id__in=busy)
    )
    if room_type:
        qs = qs.filter(type=room_type)
    if for_update:
        qs = qs.select_for_update()
    return qs
