"""تحرير الغرف من الحجوزات العامة الراكدة (H‑3).

الحجوزات العامة التي تجاوزت تاريخ الدخول ولم يصل صاحبها تُعلَّم "لم يحضر"،
فتُستبعَد من كشف التعارض ويتحرّر المخزون. يُشغَّل مجدوَلًا (cron يومي).

    python manage.py expire_pending_bookings --grace-days 1

ملاحظة: منع الحجوزات الوهمية *المستقبلية* يتطلّب تحقّقًا بشريًا (CAPTCHA/OTP)
عبر مزوّد خارجي بمفاتيح المالك — غير مُفعَّل هنا (يُنظر plan.md / H‑3).
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Reservation


class Command(BaseCommand):
    help = 'يعلّم الحجوزات العامة الراكدة (تجاوزت الدخول بلا وصول) كـ"لم يحضر" فيتحرّر المخزون.'

    def add_arguments(self, parser):
        parser.add_argument('--grace-days', type=int, default=1,
                            help='مهلة بالأيام بعد تاريخ الدخول قبل الإطلاق (افتراضي 1).')

    def handle(self, *args, **options):
        cutoff = timezone.now().date() - timedelta(days=options['grace_days'])
        stale = Reservation.objects.filter(
            public_booking=True,
            arrival_status=Reservation.ARRIVAL_AWAITING,
            status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_CONFIRMED],
            check_in_date__isnull=False,
            check_in_date__lt=cutoff,
        )
        n = 0
        for res in stale:
            res.status = Reservation.STATUS_NO_SHOW
            res.arrival_status = Reservation.ARRIVAL_NO_SHOW
            res.no_show_at = timezone.now()
            res.save()  # no_show يُستبعَد من كشف التعارض → الغرفة تعود متاحة للحجز
            try:
                from api.commissions import ensure_commission, update_commission_on_status_change
                ensure_commission(res)
                update_commission_on_status_change(res)
            except Exception:
                pass
            n += 1
        self.stdout.write(self.style.SUCCESS(f'حُرِّر {n} حجزًا راكدًا'))
