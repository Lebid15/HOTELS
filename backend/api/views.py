from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Q
from django.utils import timezone

from .models import Hotel, Package, Subscription, SubscriptionRequest, Room, Staff
from .serializers import (
    HotelSerializer, PackageSerializer, SubscriptionSerializer,
    SubscriptionRequestSerializer, RoomSerializer, StaffSerializer,
)

ROLE_MAP = {
    'platform': 'platform_owner',
    'manager': 'manager',
    'reception': 'reception',
}


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role = ROLE_MAP.get(user.username, 'manager')
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': role,
        })


class PlatformStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        hotels = Hotel.objects.all()
        today = timezone.now().date()
        warning_days = 7

        active_subs = Subscription.objects.filter(status__in=['active', 'trial'])
        ending_soon = Subscription.objects.filter(
            status__in=['active', 'trial'],
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=today + timezone.timedelta(days=warning_days),
        )

        return Response({
            'hotels_total': hotels.count(),
            'hotels_active': hotels.filter(status='active').count(),
            'hotels_suspended': hotels.filter(status='suspended').count(),
            'packages_active': Package.objects.filter(status='active').count(),
            'subscriptions_active': active_subs.count(),
            'subscriptions_ending_soon': ending_soon.count(),
            'subscriptions_expired': Subscription.objects.filter(status='expired').count(),
            'subscription_requests_pending': SubscriptionRequest.objects.filter(status='pending').count(),
        })


class HotelViewSet(viewsets.ModelViewSet):
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        hotel = self.get_object()
        new_status = request.data.get('status')
        if new_status not in [Hotel.STATUS_ACTIVE, Hotel.STATUS_SUSPENDED, Hotel.STATUS_ARCHIVED]:
            return Response({'error': 'حالة غير صالحة'}, status=status.HTTP_400_BAD_REQUEST)
        hotel.status = new_status
        hotel.save()
        return Response(HotelSerializer(hotel).data)


class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.all()
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        package = self.get_object()
        new_status = request.data.get('status')
        if new_status not in [Package.STATUS_ACTIVE, Package.STATUS_SUSPENDED, Package.STATUS_ARCHIVED]:
            return Response({'error': 'حالة غير صالحة'}, status=status.HTTP_400_BAD_REQUEST)
        package.status = new_status
        package.save()
        return Response(PackageSerializer(package).data)


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.select_related('hotel', 'package').all()
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        sub = self.get_object()
        if not sub.package:
            return Response({'error': 'لا توجد باقة مرتبطة'}, status=status.HTTP_400_BAD_REQUEST)
        today = timezone.now().date()
        sub.start_date = today
        sub.end_date = today + timezone.timedelta(days=sub.package.duration_days)
        sub.status = Subscription.STATUS_ACTIVE
        sub.save()
        return Response(SubscriptionSerializer(sub).data)


class SubscriptionRequestViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionRequest.objects.select_related('hotel', 'package').all()
    serializer_class = SubscriptionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        req = self.get_object()
        if req.status != SubscriptionRequest.STATUS_PENDING:
            return Response({'error': 'تمت معالجة هذا الطلب سابقًا'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = SubscriptionRequest.STATUS_APPROVED
        req.save()
        if req.package:
            today = timezone.now().date()
            sub, _ = Subscription.objects.get_or_create(hotel=req.hotel)
            sub.package = req.package
            sub.status = Subscription.STATUS_ACTIVE
            sub.start_date = today
            sub.end_date = today + timezone.timedelta(days=req.package.duration_days)
            sub.save()
        return Response(SubscriptionRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        if req.status != SubscriptionRequest.STATUS_PENDING:
            return Response({'error': 'تمت معالجة هذا الطلب سابقًا'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = SubscriptionRequest.STATUS_REJECTED
        req.save()
        return Response(SubscriptionRequestSerializer(req).data)


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        hotel_id = self.request.query_params.get('hotel')
        qs = Room.objects.all()
        if hotel_id:
            qs = qs.filter(hotel_id=hotel_id)
        return qs

    def perform_create(self, serializer):
        hotel_id = self.request.data.get('hotel') or self.request.query_params.get('hotel')
        serializer.save(hotel_id=hotel_id)


class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        hotel_id = self.request.query_params.get('hotel')
        qs = Staff.objects.all()
        if hotel_id:
            qs = qs.filter(hotel_id=hotel_id)
        return qs

    def perform_create(self, serializer):
        hotel_id = self.request.data.get('hotel') or self.request.query_params.get('hotel')
        serializer.save(hotel_id=hotel_id)
