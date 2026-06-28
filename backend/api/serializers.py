from rest_framework import serializers
from .models import Hotel, Package, Subscription, SubscriptionRequest, Room, Staff


class HotelSerializer(serializers.ModelSerializer):
    subscription_status = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'country', 'city', 'address', 'phone', 'email',
            'status', 'floors_count', 'manager_name', 'manager_email',
            'subscription_status', 'created_at', 'updated_at',
        ]

    def get_subscription_status(self, obj):
        try:
            return obj.subscription.status
        except Subscription.DoesNotExist:
            return None


class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = [
            'id', 'name', 'description', 'duration_days', 'price', 'currency',
            'max_users', 'max_rooms', 'restaurant_support', 'reports_support',
            'trial_support', 'status', 'notes', 'created_at', 'updated_at',
        ]


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
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True, allow_null=True)

    class Meta:
        model = SubscriptionRequest
        fields = [
            'id', 'hotel', 'hotel_name', 'package', 'package_name',
            'status', 'notes', 'created_at', 'updated_at',
        ]


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            'id', 'hotel', 'number', 'floor', 'type', 'capacity',
            'status', 'price', 'currency', 'notes', 'created_at', 'updated_at',
        ]


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            'id', 'hotel', 'full_name', 'role', 'phone', 'email',
            'shift', 'status', 'permissions', 'notes', 'created_at', 'updated_at',
        ]
        extra_kwargs = {'hotel': {'required': False}}
