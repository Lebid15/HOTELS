from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Seed demo users'

    def handle(self, *args, **options):
        User = get_user_model()
        users = [
            {'username': 'platform', 'email': 'platform@fandqi.com', 'password': '123456'},
            {'username': 'manager', 'email': 'manager@fandqi.com', 'password': '123456'},
            {'username': 'reception', 'email': 'reception@fandqi.com', 'password': '123456'},
        ]

        for u in users:
            if not User.objects.filter(username=u['username']).exists():
                User.objects.create_user(username=u['username'], email=u['email'], password=u['password'])

        self.stdout.write(self.style.SUCCESS('Seeded demo users'))
