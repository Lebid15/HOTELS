from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import UserProfile


class Command(BaseCommand):
    help = 'Seed demo users and their role profiles'

    def handle(self, *args, **options):
        User = get_user_model()
        users_data = [
            {'username': 'platform', 'email': 'platform@fandqi.com', 'password': '123456', 'role': UserProfile.ROLE_PLATFORM_OWNER},
            {'username': 'manager',  'email': 'manager@fandqi.com',  'password': '123456', 'role': UserProfile.ROLE_MANAGER},
            {'username': 'reception','email': 'reception@fandqi.com','password': '123456', 'role': UserProfile.ROLE_RECEPTION},
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
