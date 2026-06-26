from rest_framework import serializers
from .models import Hotel


class HotelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hotel
        fields = ['id', 'name', 'city', 'country', 'is_active', 'created_at', 'updated_at']
