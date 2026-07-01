from django.urls import include, path
from rest_framework import routers
from .views import (
    CurrentUserView, ChangePasswordView, PlatformStatsView, PlatformDashboardView, RegisterView,
    HotelViewSet, PackageViewSet,
    SubscriptionViewSet, SubscriptionRequestViewSet,
    RoomViewSet, StaffViewSet, ReservationViewSet,
    MaintenanceTicketViewSet,
    PublicHotelListView, PublicHotelDetailView, PublicRoomAvailabilityView,
    PublicBookingCreateView, PublicBookingManageView, PublicBookingCancelView,
    PublicPlatformInfoView, PublicHotelRatingsView,
    PlatformEarningsView, PlatformHotelEarningsView, PlatformRevenueSettingsView,
    HotelCommissionSettingView, BookingCommissionActionView,
    PlatformWebBookingsView, PlatformNotificationsView,
)

router = routers.DefaultRouter()
router.register(r'hotels', HotelViewSet, basename='hotel')
router.register(r'packages', PackageViewSet, basename='package')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'subscription-requests', SubscriptionRequestViewSet, basename='subscription-request')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'maintenance', MaintenanceTicketViewSet, basename='maintenance')

urlpatterns = [
    path('', include(router.urls)),
    path('current-user/', CurrentUserView.as_view(), name='current-user'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('register/', RegisterView.as_view(), name='register'),
    path('platform/stats/', PlatformStatsView.as_view(), name='platform-stats'),
    path('platform/dashboard/', PlatformDashboardView.as_view(), name='platform-dashboard'),
    # Earnings (أرباحي)
    path('platform/earnings/', PlatformEarningsView.as_view(), name='platform-earnings'),
    path('platform/earnings/hotels/<int:hotel_id>/', PlatformHotelEarningsView.as_view(), name='platform-hotel-earnings'),
    path('platform/revenue-settings/', PlatformRevenueSettingsView.as_view(), name='platform-revenue-settings'),
    path('platform/hotels/<int:hotel_id>/commission/', HotelCommissionSettingView.as_view(), name='hotel-commission-setting'),
    path('platform/commissions/<int:pk>/action/', BookingCommissionActionView.as_view(), name='booking-commission-action'),
    path('platform/web-bookings/', PlatformWebBookingsView.as_view(), name='platform-web-bookings'),
    path('platform/notifications/', PlatformNotificationsView.as_view(), name='platform-notifications'),
    # Public website (no auth)
    path('public/hotels/', PublicHotelListView.as_view(), name='public-hotels'),
    path('public/hotels/<str:slug>/', PublicHotelDetailView.as_view(), name='public-hotel-detail'),
    path('public/hotels/<str:slug>/availability/', PublicRoomAvailabilityView.as_view(), name='public-room-availability'),
    path('public/bookings/', PublicBookingCreateView.as_view(), name='public-booking-create'),
    path('public/manage-booking/', PublicBookingManageView.as_view(), name='public-manage-booking'),
    path('public/bookings/<str:booking_no>/cancel/', PublicBookingCancelView.as_view(), name='public-booking-cancel'),
    path('public/hotels/<str:slug>/ratings/', PublicHotelRatingsView.as_view(), name='public-hotel-ratings'),
    path('public/platform-info/', PublicPlatformInfoView.as_view(), name='public-platform-info'),
]
