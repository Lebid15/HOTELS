from rest_framework import serializers
from .models import Hotel, Package, Subscription, SubscriptionRequest, Room, Staff, Reservation, MaintenanceTicket, HotelRating


class HotelSerializer(serializers.ModelSerializer):
    subscription_status = serializers.SerializerMethodField()
    manager_username    = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'country', 'city', 'address', 'phone', 'email',
            'status', 'floors_count', 'manager_name', 'manager_email',
            'manager_username', 'subscription_status',
            'cover_image', 'map_url', 'latitude', 'longitude',
            'created_at', 'updated_at',
        ]

    def get_subscription_status(self, obj):
        try:
            return obj.subscription.status
        except Subscription.DoesNotExist:
            return None

    def get_manager_username(self, obj):
        return obj.manager_user.username if obj.manager_user_id else None


class PackageSerializer(serializers.ModelSerializer):
    subscription_count = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = [
            'id', 'name', 'description',
            'price_monthly', 'price_yearly',
            'max_rooms', 'max_staff', 'max_users',
            'features', 'status', 'notes',
            'subscription_count',
            'created_at', 'updated_at',
        ]

    def get_subscription_count(self, obj):
        return obj.subscription_set.filter(status__in=['active', 'trial']).count()


class SubscriptionSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True, allow_null=True)
    remaining_days = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'hotel', 'hotel_name', 'package', 'package_name',
            'status', 'payment_status', 'start_date', 'end_date',
            'monthly_amount', 'currency', 'notes', 'remaining_days',
            'created_at', 'updated_at',
        ]

    def get_remaining_days(self, obj):
        if not obj.end_date:
            return None
        from django.utils import timezone
        delta = obj.end_date - timezone.now().date()
        return delta.days


class SubscriptionRequestSerializer(serializers.ModelSerializer):
    hotel_name         = serializers.CharField(source='hotel.name', read_only=True)
    package_name       = serializers.CharField(source='package.name', read_only=True, allow_null=True)
    requested_by_name  = serializers.CharField(source='hotel.manager_name', read_only=True, allow_null=True)
    requested_by_email = serializers.CharField(source='hotel.manager_email', read_only=True, allow_null=True)

    class Meta:
        model = SubscriptionRequest
        fields = [
            'id', 'hotel', 'hotel_name', 'package', 'package_name',
            'status', 'notes', 'rejection_reason',
            'requested_by_name', 'requested_by_email',
            'created_at', 'updated_at',
        ]


class RoomSerializer(serializers.ModelSerializer):
    type = serializers.CharField(max_length=30)  # allow custom room type strings from hotel settings

    class Meta:
        model = Room
        fields = [
            'id', 'hotel', 'number', 'floor', 'type', 'capacity',
            'status', 'price', 'currency', 'notes', 'created_at', 'updated_at',
        ]


class ReservationSerializer(serializers.ModelSerializer):
    guest_full_name  = serializers.SerializerMethodField()
    room_number      = serializers.CharField(source='room.number', read_only=True, allow_null=True)
    room_floor       = serializers.IntegerField(source='room.floor', read_only=True, allow_null=True)
    created_by_name  = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = '__all__'
        extra_kwargs = {'created_by': {'required': False, 'allow_null': True}}

    def get_guest_full_name(self, obj):
        return f'{obj.guest_first_name} {obj.guest_last_name}'.strip()

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None


class PublicHotelCardSerializer(serializers.ModelSerializer):
    min_price = serializers.SerializerMethodField()
    min_currency = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'slug', 'name', 'stars', 'hotel_type', 'country', 'governorate', 'city',
            'cover_image', 'amenities', 'public_description_short',
            'is_featured', 'min_price', 'min_currency',
            'avg_rating', 'ratings_count',
        ]

    def get_min_price(self, obj):
        room = obj.rooms.filter(show_in_public=True, price__gt=0).order_by('price').first()
        return float(room.price) if room else None

    def get_min_currency(self, obj):
        room = obj.rooms.filter(show_in_public=True, price__gt=0).order_by('price').first()
        return room.currency if room else 'USD'

    def get_avg_rating(self, obj):
        from django.db.models import Avg
        v = obj.ratings.filter(is_approved=True).aggregate(a=Avg('rating'))['a']
        return round(float(v), 2) if v is not None else None

    def get_ratings_count(self, obj):
        return obj.ratings.filter(is_approved=True).count()


class PublicHotelDetailSerializer(serializers.ModelSerializer):
    min_price = serializers.SerializerMethodField()
    min_currency = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'slug', 'name', 'stars', 'hotel_type', 'country', 'governorate', 'city', 'address',
            'map_url', 'latitude', 'longitude',
            'cover_image', 'gallery_images', 'amenities',
            'public_description_short', 'public_description_full',
            'is_featured', 'check_in_policy', 'check_out_policy',
            'cancellation_policy', 'payment_policy',
            'show_contact_info', 'phone',
            'min_price', 'min_currency',
            'avg_rating', 'ratings_count',
        ]

    def get_min_price(self, obj):
        room = obj.rooms.filter(show_in_public=True, price__gt=0).order_by('price').first()
        return float(room.price) if room else None

    def get_min_currency(self, obj):
        room = obj.rooms.filter(show_in_public=True, price__gt=0).order_by('price').first()
        return room.currency if room else 'USD'

    def get_avg_rating(self, obj):
        from django.db.models import Avg
        v = obj.ratings.filter(is_approved=True).aggregate(a=Avg('rating'))['a']
        return round(float(v), 2) if v is not None else None

    def get_ratings_count(self, obj):
        return obj.ratings.filter(is_approved=True).count()


class PublicHotelRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelRating
        fields = ['id', 'guest_name', 'rating', 'comment', 'created_at']


class PublicBookingDetailSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    hotel_city = serializers.CharField(source='hotel.city', read_only=True)
    hotel_phone = serializers.SerializerMethodField()
    cancellation_policy = serializers.CharField(source='hotel.cancellation_policy', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'public_booking_no', 'hotel_name', 'hotel_city', 'hotel_phone',
            'guest_first_name', 'guest_last_name', 'guest_phone', 'guest_email',
            'room_type_label', 'check_in_date', 'check_out_date', 'nights_count',
            'persons_count', 'total', 'currency', 'payment_method', 'documents_status',
            'arrival_status', 'status', 'notes', 'cancellation_policy',
            'cancelled_at', 'cancel_reason', 'cancelled_by_type',
            'created_at',
        ]

    def get_hotel_phone(self, obj):
        return obj.hotel.phone if obj.hotel.show_contact_info else None


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            'id', 'hotel', 'full_name', 'role', 'phone', 'email',
            'shift', 'status', 'permissions', 'notes', 'created_at', 'updated_at',
        ]
        extra_kwargs = {'hotel': {'required': False}}


class MaintenanceTicketSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    room_number      = serializers.SerializerMethodField()
    room_floor       = serializers.SerializerMethodField()
    room_status      = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceTicket
        fields = [
            'id', 'hotel', 'ticket_no', 'room', 'issue_type', 'priority',
            'status', 'description', 'assigned_to', 'source',
            'created_by', 'started_at', 'resolved_at', 'resolved_by',
            'created_at', 'updated_at',
            'assigned_to_name', 'room_number', 'room_floor', 'room_status',
        ]
        extra_kwargs = {'hotel': {'required': False}, 'ticket_no': {'read_only': True}}

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None

    def get_room_number(self, obj):
        return obj.room.number if obj.room else None

    def get_room_floor(self, obj):
        return obj.room.floor if obj.room else None

    def get_room_status(self, obj):
        return obj.room.status if obj.room else None
