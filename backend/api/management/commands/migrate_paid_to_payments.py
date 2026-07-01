"""ترحيل أرصدة `paid` القديمة إلى سجلّات Payment (لمرّة واحدة عند الانتقال لسلسلة المال).

بعد أن أصبح `paid` مشتقًّا من مجموع الدفعات، أي رصيد `paid` قديم غير مدعوم بسجلّ
Payment سيُفقَد عند أول دفعة عبر السلسلة. هذا الأمر يُنشئ دفعة تعويضية للفارق.

    python manage.py migrate_paid_to_payments
"""
from django.core.management.base import BaseCommand
from django.db.models import Sum

from api.models import Reservation, Payment


class Command(BaseCommand):
    help = 'ينشئ Payment للفارق بين paid ومجموع الدفعات (ترحيل لمرّة واحدة).'

    def handle(self, *args, **options):
        n = 0
        for res in Reservation.objects.filter(paid__gt=0):
            existing = res.payments.aggregate(s=Sum('amount'))['s'] or 0
            gap = float(res.paid) - float(existing)
            if gap > 0.001:
                Payment.objects.create(
                    hotel_id=res.hotel_id, reservation=res, amount=gap,
                    currency=res.currency, method=Payment.METHOD_CASH, note='ترحيل رصيد سابق',
                )
                n += 1
        self.stdout.write(self.style.SUCCESS(f'أُنشئت {n} دفعة ترحيلية'))
