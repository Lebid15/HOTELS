from django.urls import include, path
from rest_framework import routers
from .views import (
    CurrentUserView, PlatformStatsView,
    HotelViewSet, PackageViewSet,
    SubscriptionViewSet, SubscriptionRequestViewSet,
    RoomViewSet, StaffViewSet,
)

router = routers.DefaultRouter()
router.register(r'hotels', HotelViewSet, basename='hotel')
router.register(r'packages', PackageViewSet, basename='package')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'subscription-requests', SubscriptionRequestViewSet, basename='subscription-request')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'staff', StaffViewSet, basename='staff')

urlpatterns = [
    path('', include(router.urls)),
    path('current-user/', CurrentUserView.as_view(), name='current-user'),
    path('platform/stats/', PlatformStatsView.as_view(), name='platform-stats'),
]
