import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import UserProfile
from ._seedguard import ensure_seed_allowed


class Command(BaseCommand):
    help = 'Seed demo users and their role profiles (development only)'

    def handle(self, *args, **options):
        ensure_seed_allowed()
        User = get_user_model()
        # كلمات المرور التجريبية من البيئة (افتراض للتطوير فقط) — لا قيمة ثابتة على الإنتاج.
        users_data = [
            {'username': 'platform', 'email': 'platform@funduqii.com', 'password': os.environ.get('SEED_PLATFORM_PASSWORD', '123456'),  'role': UserProfile.ROLE_PLATFORM_OWNER},
            {'username': 'manager',  'email': 'manager@funduqii.com',  'password': os.environ.get('SEED_MANAGER_PASSWORD', '123456'),   'role': UserProfile.ROLE_MANAGER},
            {'username': 'reception','email': 'reception@funduqii.com','password': os.environ.get('SEED_RECEPTION_PASSWORD', '123456'), 'role': UserProfile.ROLE_RECEPTION},
        ]

        for u in users_data:
            user, created = User.objects.get_or_create(
                username=u['username'],
                defaults={'email': u['email']},
            )
            if created:
                user.set_password(u['password'])
                user.save()
            UserProfile.objects.update_or_create(
                user=user,
                defaults={'role': u['role']},
            )

        self.stdout.write(self.style.SUCCESS('Seeded demo users and profiles'))
