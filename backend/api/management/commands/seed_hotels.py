from django.core.management.base import BaseCommand
from api.models import Hotel


class Command(BaseCommand):
    help = 'Seed initial hotel data'

    def handle(self, *args, **options):
        hotels = [
            {'name': 'Hotel Fandqi Central', 'city': 'Cairo', 'country': 'Egypt', 'is_active': True},
            {'name': 'Grand Nile Hotel', 'city': 'Cairo', 'country': 'Egypt', 'is_active': True},
            {'name': 'Luxury Oasis', 'city': 'Dubai', 'country': 'UAE', 'is_active': False},
        ]

        for hotel_data in hotels:
            Hotel.objects.update_or_create(name=hotel_data['name'], defaults=hotel_data)

        self.stdout.write(self.style.SUCCESS('Seeded hotel data'))
