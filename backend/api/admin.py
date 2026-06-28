from django.contrib import admin
from .models import Hotel, Package, Subscription, SubscriptionRequest, Room, Staff

admin.site.register(Hotel)
admin.site.register(Package)
admin.site.register(Subscription)
admin.site.register(SubscriptionRequest)
admin.site.register(Room)
admin.site.register(Staff)
