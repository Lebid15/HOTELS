from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Hotel, UserProfile


class Command(BaseCommand):
    help = 'Seed initial hotel data and link seed users'

    def handle(self, *args, **options):
        User = get_user_model()
        manager_user = User.objects.filter(username='manager').first()
        reception_user = User.objects.filter(username='reception').first()

        hotels = [
            {'name': 'Hotel Fandqi Central', 'city': 'Cairo', 'country': 'Egypt', 'status': 'active'},
            {'name': 'Grand Nile Hotel',      'city': 'Cairo', 'country': 'Egypt', 'status': 'active'},
            {'name': 'Luxury Oasis',          'city': 'Dubai', 'country': 'UAE',   'status': 'suspended'},
        ]

        first_hotel = None
        for i, hotel_data in enumerate(hotels):
            h, _ = Hotel.objects.update_or_create(name=hotel_data['name'], defaults=hotel_data)
            if i == 0:
                first_hotel = h

        # Link the seed manager user to the first hotel
        if first_hotel and manager_user:
            first_hotel.manager_user = manager_user
            first_hotel.save()
            UserProfile.objects.filter(user=manager_user).update(hotel=first_hotel)

        # Link reception to the same hotel
        if first_hotel and reception_user:
            UserProfile.objects.filter(user=reception_user).update(hotel=first_hotel)

        self.stdout.write(self.style.SUCCESS('Seeded hotel data and linked seed users'))
