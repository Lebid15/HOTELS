from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Hotel, Package, Subscription
from ._seedguard import ensure_seed_allowed


class Command(BaseCommand):
    help = 'Seed demo packages and subscriptions (development only)'

    def handle(self, *args, **options):
        ensure_seed_allowed()
        # Packages
        packages_data = [
            {
                'name': 'باقة تجريبية مجانية',
                'description': 'باقة تلقائية لمدة 7 أيام لكل فندق جديد.',
                'duration_days': 7,
                'price': 0,
                'max_users': 3,
                'max_rooms': 10,
                'trial_support': True,
                'status': 'active',
            },
            {
                'name': 'الباقة الأساسية',
                'description': 'مناسبة للفنادق الصغيرة.',
                'duration_days': 30,
                'price': 199,
                'max_users': 5,
                'max_rooms': 30,
                'restaurant_support': False,
                'reports_support': True,
                'trial_support': False,
                'status': 'active',
            },
            {
                'name': 'الباقة الاحترافية',
                'description': 'للفنادق المتوسطة مع دعم المطعم.',
                'duration_days': 30,
                'price': 399,
                'max_users': 15,
                'max_rooms': 80,
                'restaurant_support': True,
                'reports_support': True,
                'trial_support': False,
                'status': 'active',
            },
            {
                'name': 'الباقة المميزة',
                'description': 'للفنادق الكبيرة بلا حدود.',
                'duration_days': 30,
                'price': 699,
                'max_users': 50,
                'max_rooms': 500,
                'restaurant_support': True,
                'reports_support': True,
                'trial_support': False,
                'status': 'active',
            },
        ]

        trial_pkg = None
        for p in packages_data:
            pkg, created = Package.objects.get_or_create(
                name=p['name'],
                defaults=p,
            )
            if p['trial_support']:
                trial_pkg = pkg
            if created:
                self.stdout.write(f"  + باقة: {pkg.name}")

        # Subscriptions for existing hotels
        if trial_pkg:
            today = timezone.now().date()
            for hotel in Hotel.objects.all():
                sub, created = Subscription.objects.get_or_create(
                    hotel=hotel,
                    defaults={
                        'package': trial_pkg,
                        'status': 'trial',
                        'start_date': today,
                        'end_date': today + timezone.timedelta(days=7),
                    }
                )
                if created:
                    self.stdout.write(f"  + اشتراك تجريبي: {hotel.name}")

        self.stdout.write(self.style.SUCCESS('تم تهيئة البيانات التجريبية بنجاح'))
