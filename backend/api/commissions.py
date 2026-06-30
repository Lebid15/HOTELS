# -*- coding: utf-8 -*-
"""
خدمة احتساب عمولات المنصة من حجوزات الموقع العام.

مبادئ الدقة المالية:
- لا تُجمع العملات المختلفة في رقم واحد (التجميع دائمًا حسب العملة).
- لا تُحتسب الحجوزات الملغاة ضمن الأرباح.
- no_show يُعالَج حسب سياسة المنصة (إعفاء أو إبقاء مستحقًا).
- snapshot: تُحفظ قيم العمولة وقت إنشاء الحجز فلا تتغيّر التقارير القديمة عند تغيير الإعدادات.
"""
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from .models import (
    PlatformRevenueSettings, BookingCommission, Reservation,
    COMMISSION_PERCENTAGE, COMMISSION_FIXED_BOOKING, COMMISSION_FIXED_GUEST,
)

_CENT = Decimal('0.01')


def _q(amount):
    return Decimal(str(amount or 0)).quantize(_CENT, rounding=ROUND_HALF_UP)


def resolve_commission_config(hotel):
    """
    يحدّد إعداد العمولة الفعّال لفندق: إعداد الفندق الخاص يتجاوز العام عند تفعيله.
    يُرجع dict: {enabled, type, value, currency, source}.
    source ∈ {'platform', 'hotel', 'disabled_global', 'disabled_hotel'}
    """
    s = PlatformRevenueSettings.get_solo()
    if not s.enable_booking_commission:
        return {'enabled': False, 'type': '', 'value': Decimal('0'),
                'currency': s.default_commission_currency, 'source': 'disabled_global'}

    if s.allow_hotel_override:
        hc = getattr(hotel, 'commission_setting', None)
        if hc is not None and hc.is_active:
            if not hc.commission_enabled:
                return {'enabled': False, 'type': '', 'value': Decimal('0'),
                        'currency': hc.commission_currency, 'source': 'disabled_hotel'}
            return {'enabled': True, 'type': hc.commission_type,
                    'value': Decimal(str(hc.commission_value)),
                    'currency': hc.commission_currency, 'source': 'hotel'}

    return {'enabled': True, 'type': s.default_commission_type,
            'value': Decimal(str(s.default_commission_value)),
            'currency': s.default_commission_currency, 'source': 'platform'}


def compute_commission_amount(ctype, value, base_total, base_currency, commission_currency, guests=1):
    """
    يحسب مبلغ العمولة وعملته.
    - percentage      → المبلغ بعملة الحجز نفسها.
    - fixed_per_booking → مبلغ ثابت بعملة العمولة المحدّدة.
    - fixed_per_guest   → المبلغ الثابت × عدد الضيوف، بعملة العمولة.
    يُرجع (amount: Decimal, currency: str).
    """
    value = Decimal(str(value or 0))
    base_total = Decimal(str(base_total or 0))
    if ctype == COMMISSION_PERCENTAGE:
        return _q(base_total * value / Decimal('100')), base_currency
    if ctype == COMMISSION_FIXED_BOOKING:
        return _q(value), commission_currency
    if ctype == COMMISSION_FIXED_GUEST:
        return _q(value * Decimal(str(max(1, int(guests or 1))))), commission_currency
    return Decimal('0.00'), commission_currency


def _due_now(reservation, settings_obj):
    """هل يجب أن تصبح العمولة مستحقة الآن بناءً على إعداد توقيت الاحتساب؟"""
    trigger = settings_obj.calculate_commission_on_status
    st = reservation.status
    arrival = reservation.arrival_status
    if trigger == PlatformRevenueSettings.CALC_ON_CREATED:
        return True
    if trigger == PlatformRevenueSettings.CALC_ON_ARRIVED:
        return (arrival in (Reservation.ARRIVAL_ARRIVED, Reservation.ARRIVAL_CHECKED_IN, Reservation.ARRIVAL_COMPLETED)
                or st in (Reservation.STATUS_CHECKED_IN, Reservation.STATUS_CHECKED_OUT))
    if trigger == PlatformRevenueSettings.CALC_ON_CHECKIN:
        return st in (Reservation.STATUS_CHECKED_IN, Reservation.STATUS_CHECKED_OUT)
    if trigger == PlatformRevenueSettings.CALC_ON_COMPLETED:
        return st == Reservation.STATUS_CHECKED_OUT or arrival == Reservation.ARRIVAL_COMPLETED
    return False


def ensure_commission(reservation):
    """
    يُنشئ سجل عمولة للحجز العام إن لم يوجد (idempotent)، ويحفظ snapshot القيم.
    لا يرفع استثناءً يوقف التدفق الأساسي للحجز.
    """
    if not getattr(reservation, 'public_booking', False):
        return None
    existing = BookingCommission.objects.filter(reservation=reservation).first()
    if existing:
        return existing

    cfg = resolve_commission_config(reservation.hotel)
    base_total = reservation.total or 0
    base_currency = reservation.currency or 'USD'

    if cfg['enabled']:
        amount, ccur = compute_commission_amount(
            cfg['type'], cfg['value'], base_total, base_currency,
            cfg['currency'], reservation.persons_count,
        )
        ctype, cvalue = cfg['type'], cfg['value']
        status = BookingCommission.STATUS_PENDING
    else:
        amount, ccur = Decimal('0.00'), base_currency
        ctype, cvalue = '', Decimal('0')
        status = BookingCommission.STATUS_WAIVED

    bc = BookingCommission.objects.create(
        reservation=reservation, hotel=reservation.hotel,
        public_booking_no=reservation.public_booking_no or '',
        # snapshot
        commission_type_at_booking=ctype,
        commission_value_at_booking=cvalue,
        commission_currency_at_booking=ccur,
        calculated_amount_at_booking=amount,
        calculation_base_amount=_q(base_total),
        calculation_base_currency=base_currency,
        # effective (مجمّدة)
        commission_type=ctype,
        commission_value=cvalue,
        commission_amount=amount,
        commission_currency=ccur,
        commission_status=status,
        calculated_at=timezone.now(),
    )

    # مزامنة حقول العمولة على الحجز نفسه
    update_fields = ['platform_commission_amount']
    reservation.platform_commission_amount = amount
    if cfg['enabled'] and ctype == COMMISSION_PERCENTAGE:
        reservation.platform_commission_rate = cvalue
        update_fields.append('platform_commission_rate')
    try:
        reservation.save(update_fields=update_fields)
    except Exception:
        pass

    # قد تصبح مستحقة فورًا (مثلاً إعداد on_booking_created)
    update_commission_on_status_change(reservation, commission=bc)
    return bc


def update_commission_on_status_change(reservation, commission=None):
    """
    يحدّث حالة العمولة عند تغيّر حالة الحجز:
    - ملغى    → cancelled (ما لم تكن مدفوعة/جزئية).
    - no_show → waive أو due حسب سياسة المنصة.
    - تسجيل دخول/اكتمال → due (حسب إعداد التوقيت).
    """
    bc = commission or BookingCommission.objects.filter(reservation=reservation).first()
    if bc is None:
        return None

    s = PlatformRevenueSettings.get_solo()
    locked = (bc.commission_status in (BookingCommission.STATUS_PAID, BookingCommission.STATUS_PARTIAL))

    # الإلغاء يلغي العمولة (إن لم تُدفع)
    if reservation.status == Reservation.STATUS_CANCELLED:
        if not locked and bc.commission_status != BookingCommission.STATUS_CANCELLED:
            bc.commission_status = BookingCommission.STATUS_CANCELLED
            bc.save(update_fields=['commission_status', 'updated_at'])
        return bc

    # عدم الحضور
    if reservation.status == Reservation.STATUS_NO_SHOW:
        if locked:
            return bc
        if s.no_show_policy == PlatformRevenueSettings.NOSHOW_WAIVE:
            bc.commission_status = BookingCommission.STATUS_WAIVED
            bc.save(update_fields=['commission_status', 'updated_at'])
        else:
            bc.commission_status = BookingCommission.STATUS_DUE
            if bc.due_at is None:
                bc.due_at = timezone.now()
            bc.save(update_fields=['commission_status', 'due_at', 'updated_at'])
        return bc

    # حالة معفاة سابقًا أو ملغاة لا نعيد تفعيلها تلقائيًا، إلا إن عاد الحجز نشطًا
    if bc.commission_status in (BookingCommission.STATUS_WAIVED, BookingCommission.STATUS_CANCELLED):
        # عاد الحجز إلى حالة فعّالة → أعد ضبطها كـ pending ثم احتسب الاستحقاق
        if not locked:
            bc.commission_status = BookingCommission.STATUS_PENDING

    # تصبح مستحقة حسب التوقيت
    if bc.commission_status == BookingCommission.STATUS_PENDING and _due_now(reservation, s):
        bc.commission_status = BookingCommission.STATUS_DUE
        if bc.due_at is None:
            bc.due_at = timezone.now()
        bc.save(update_fields=['commission_status', 'due_at', 'updated_at'])
    elif bc.commission_status == BookingCommission.STATUS_PENDING:
        bc.save(update_fields=['commission_status', 'updated_at'])

    return bc


def backfill_commissions():
    """ينشئ سجلات عمولة لأي حجوزات عامة سابقة لا تملك سجلًا، ويزامن حالاتها."""
    qs = Reservation.objects.filter(public_booking=True)
    created = 0
    for res in qs.select_related('hotel'):
        if not BookingCommission.objects.filter(reservation=res).exists():
            ensure_commission(res)
            created += 1
        else:
            update_commission_on_status_change(res)
    return created


# حالات العمولة المعتبرة "ربحًا محقّقًا" (تدخل في إجمالي الأرباح)
EARNED_STATUSES = (
    BookingCommission.STATUS_DUE,
    BookingCommission.STATUS_PAID,
    BookingCommission.STATUS_PARTIAL,
)
