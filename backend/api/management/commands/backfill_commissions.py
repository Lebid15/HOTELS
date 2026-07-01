"""إنشاء سجلات عمولة لكل الحجوزات العامة التي تفتقدها.

H‑1: نُقل هذا من مسارات القراءة (كان يُستدعى في كل GET) إلى أمر يُشغَّل يدويًا
أو عبر مجدول (cron) عند الحاجة. العمولات تُنشأ أصلًا عند حدث الحجز/تغيّر حالته.

الاستخدام:  python manage.py backfill_commissions
"""
from django.core.management.base import BaseCommand

from api.commissions import backfill_commissions


class Command(BaseCommand):
    help = 'إنشاء سجلات العمولة المفقودة للحجوزات العامة (يُشغَّل يدويًا/مجدوَلًا).'

    def handle(self, *args, **options):
        result = backfill_commissions()
        count = result if isinstance(result, int) else ''
        self.stdout.write(self.style.SUCCESS(f'تمّت مزامنة العمولات {count}'))
