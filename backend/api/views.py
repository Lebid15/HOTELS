import calendar as _cal
from datetime import date as _date
from decimal import Decimal

from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView as _BaseTokenObtainPairView
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError


def _add_months(d, months: int) -> _date:
    month = d.month - 1 + months
    year  = d.year + month // 12
    month = month % 12 + 1
    day   = min(d.day, _cal.monthrange(year, month)[1])
    return _date(year, month, day)

from .models import (
    Hotel, Package, Subscription, SubscriptionRequest,
    Room, Staff, Reservation, MaintenanceTicket, UserProfile,
)
from .serializers import (
    HotelSerializer, PackageSerializer, SubscriptionSerializer,
    SubscriptionRequestSerializer, RoomSerializer, StaffSerializer,
    ReservationSerializer, MaintenanceTicketSerializer,
)
from .permissions import _get_user_role, _get_user_hotel_id, IsPlatformOwner
from .validators import UsernameValidator

User = get_user_model()


# ── Throttles ────────────────────────────────────────────────────────────────

class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'


class TokenObtainPairView(_BaseTokenObtainPairView):
    """JWT login endpoint with rate limiting (5 requests/minute per IP)."""
    throttle_classes = [LoginRateThrottle]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _require_platform(user) -> None:
    """Raise PermissionDenied if user is not a platform owner."""
    if _get_user_role(user) != 'platform_owner':
        raise PermissionDenied('هذه العملية متاحة لمالك المنصة فقط.')


def _sync_commission(reservation) -> None:
    """يُحدّث/يُنشئ سجل عمولة المنصة لحجز عام عند تغيّر حالته. best-effort."""
    try:
        from .commissions import ensure_commission, update_commission_on_status_change
        ensure_commission(reservation)
        update_commission_on_status_change(reservation)
    except Exception:
        pass


# ── Auth Views ───────────────────────────────────────────────────────────────

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role = _get_user_role(user)
        hotel_id = _get_user_hotel_id(user)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'hotel_id': hotel_id,
        })

    def patch(self, request):
        user = request.user
        email = request.data.get('email', '').strip()
        first_name = request.data.get('first_name', user.first_name).strip()
        last_name  = request.data.get('last_name',  user.last_name).strip()
        if email and email != user.email:
            if len(email) > 254:
                return Response({'error': 'البريد الإلكتروني غير صالح'}, status=400)
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response({'error': 'البريد الإلكتروني مستخدم بالفعل'}, status=400)
            user.email = email
        user.first_name = first_name
        user.last_name  = last_name
        user.save()
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': _get_user_role(user),
            'hotel_id': _get_user_hotel_id(user),
        })


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        if not old_password or not new_password:
            return Response({'error': 'جميع الحقول مطلوبة'}, status=400)
        if not user.check_password(old_password):
            return Response({'error': 'كلمة المرور الحالية غير صحيحة'}, status=400)
        try:
            validate_password(new_password, user)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({'message': 'تم تغيير كلمة المرور بنجاح'})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        username = request.data.get('username', '').strip()
        hotel_name = request.data.get('hotel_name', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        if not username or not hotel_name or not password:
            return Response({'error': 'جميع الحقول الإلزامية مطلوبة'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate username format
        try:
            UsernameValidator()(username)
        except DjangoValidationError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        # Validate field lengths
        if len(hotel_name) > 200:
            return Response({'error': 'اسم الفندق يجب ألا يتجاوز 200 حرف'}, status=status.HTTP_400_BAD_REQUEST)
        if email and len(email) > 254:
            return Response({'error': 'البريد الإلكتروني غير صالح'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'error': 'اسم المستخدم مستخدم بالفعل'}, status=status.HTTP_400_BAD_REQUEST)
        if email and User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'البريد الإلكتروني مستخدم بالفعل'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate password against Django validators
        try:
            validate_password(password, User(username=username))
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        hotel = Hotel.objects.create(
            name=hotel_name,
            manager_user=user,
            manager_name=username,
            manager_email=email,
        )
        UserProfile.objects.create(user=user, role=UserProfile.ROLE_MANAGER, hotel=hotel)

        return Response({'message': 'تم إنشاء الحساب بنجاح', 'hotel_id': hotel.id}, status=status.HTTP_201_CREATED)


# ── Platform Views ────────────────────────────────────────────────────────────

class PlatformStatsView(APIView):
    permission_classes = [IsPlatformOwner]

    def get(self, request):
        hotels = Hotel.objects.all()
        today = timezone.now().date()
        warning_days = 30

        ending_soon = Subscription.objects.filter(
            status__in=['active', 'trial'],
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=today + timezone.timedelta(days=warning_days),
        )
        hotels_without_sub = hotels.filter(subscription__isnull=True).count()

        return Response({
            'hotels_total': hotels.count(),
            'hotels_active': hotels.filter(status='active').count(),
            'hotels_suspended': hotels.filter(status='suspended').count(),
            'hotels_without_subscription': hotels_without_sub,
            'packages_active': Package.objects.filter(status='active').count(),
            'subscriptions_active': Subscription.objects.filter(status='active').count(),
            'subscriptions_trial': Subscription.objects.filter(status='trial').count(),
            'subscriptions_ending_soon': ending_soon.count(),
            'subscriptions_expired': Subscription.objects.filter(status='expired').count(),
            'subscription_requests_pending': SubscriptionRequest.objects.filter(status='pending').count(),
        })


class PlatformDashboardView(APIView):
    permission_classes = [IsPlatformOwner]

    def get(self, request):
        today = timezone.now().date()
        warning_days = 30

        hotels = Hotel.objects.all()
        subs = Subscription.objects.select_related('hotel', 'package')

        ending_soon_qs = subs.filter(
            status__in=['active', 'trial'],
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=today + timezone.timedelta(days=warning_days),
        )

        # Revenue aggregated by currency
        revenue_qs = (
            subs
            .values('currency')
            .annotate(
                total_paid=Sum('monthly_amount', filter=Q(payment_status='paid')),
                total_unpaid=Sum('monthly_amount', filter=Q(payment_status='unpaid')),
                total_partial=Sum('monthly_amount', filter=Q(payment_status='partial')),
                count_paid=Count('id', filter=Q(payment_status='paid')),
                count_unpaid=Count('id', filter=Q(payment_status__in=['unpaid', 'partial'])),
            )
        )

        # Recent subscription requests (last 8)
        recent_requests = []
        for req in SubscriptionRequest.objects.select_related('hotel', 'package').order_by('-created_at')[:8]:
            recent_requests.append({
                'id': req.id,
                'hotel_name': req.hotel.name,
                'package_name': req.package.name if req.package else None,
                'status': req.status,
                'requested_by_name': req.hotel.manager_name or None,
                'notes': req.notes,
                'created_at': req.created_at.isoformat(),
            })

        # Subscriptions ending soon (detailed, up to 10)
        ending_soon_detail = []
        for sub in ending_soon_qs.order_by('end_date')[:10]:
            delta = (sub.end_date - today).days if sub.end_date else None
            ending_soon_detail.append({
                'id': sub.id,
                'hotel_id': sub.hotel_id,
                'hotel_name': sub.hotel.name,
                'package_name': sub.package.name if sub.package else None,
                'end_date': sub.end_date.isoformat() if sub.end_date else None,
                'remaining_days': delta,
                'payment_status': sub.payment_status,
                'status': sub.status,
                'monthly_amount': float(sub.monthly_amount) if sub.monthly_amount else 0,
                'currency': sub.currency,
            })

        # Recent hotels (last 8)
        recent_hotels_list = []
        for hotel in hotels.order_by('-created_at')[:8]:
            sub_status = None
            pkg_name = None
            try:
                sub_obj = hotel.subscription
                sub_status = sub_obj.status
                pkg_name = sub_obj.package.name if sub_obj.package else None
            except Exception:
                pass
            recent_hotels_list.append({
                'id': hotel.id,
                'name': hotel.name,
                'city': hotel.city or '',
                'manager_name': hotel.manager_name or '',
                'status': hotel.status,
                'subscription_status': sub_status,
                'package_name': pkg_name,
                'created_at': hotel.created_at.isoformat(),
            })

        # Package distribution
        package_dist = []
        for pkg in Package.objects.all():
            package_dist.append({
                'id': pkg.id,
                'name': pkg.name,
                'status': pkg.status,
                'price_monthly': float(pkg.price_monthly) if pkg.price_monthly else None,
                'subscription_count': pkg.subscription_set.filter(status__in=['active', 'trial']).count(),
            })
        package_dist.sort(key=lambda x: x['subscription_count'], reverse=True)

        # Web bookings (public website) summary + recent list
        pub = Reservation.objects.filter(public_booking=True)
        recent_web = []
        for r in pub.select_related('hotel').order_by('-created_at')[:6]:
            recent_web.append({
                'id': r.id,
                'public_booking_no': r.public_booking_no,
                'hotel_name': r.hotel.name,
                'guest_name': f'{r.guest_first_name} {r.guest_last_name}'.strip(),
                'total': float(r.total),
                'currency': r.currency,
                'status': r.status,
                'arrival_status': r.arrival_status,
                'created_at': r.created_at.isoformat(),
            })
        web_bookings_summary = {
            'today': pub.filter(created_at__date=today).count(),
            'month': pub.filter(created_at__date__gte=today.replace(day=1)).count(),
            'total': pub.count(),
            'awaiting': pub.filter(arrival_status=Reservation.ARRIVAL_AWAITING).count(),
            'cancelled_by_guest': pub.filter(arrival_status=Reservation.ARRIVAL_CANCEL_G).count(),
            'no_show': pub.filter(status=Reservation.STATUS_NO_SHOW).count(),
        }

        return Response({
            'platform_owner': {
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'username': request.user.username,
            },
            'kpis': {
                'hotels_total': hotels.count(),
                'hotels_active': hotels.filter(status='active').count(),
                'hotels_suspended': hotels.filter(status='suspended').count(),
                'hotels_without_subscription': hotels.filter(subscription__isnull=True).count(),
                'subscriptions_active': subs.filter(status='active').count(),
                'subscriptions_trial': subs.filter(status='trial').count(),
                'subscriptions_expired': subs.filter(status='expired').count(),
                'subscriptions_ending_soon': ending_soon_qs.count(),
                'subscriptions_unpaid': subs.filter(payment_status__in=['unpaid', 'partial']).count(),
                'subscription_requests_pending': SubscriptionRequest.objects.filter(status='pending').count(),
            },
            'hotel_breakdown': {
                'active': hotels.filter(status='active').count(),
                'suspended': hotels.filter(status='suspended').count(),
                'without_subscription': hotels.filter(subscription__isnull=True).count(),
                'trial': hotels.filter(subscription__status='trial').count(),
                'expired': hotels.filter(subscription__status='expired').count(),
            },
            'revenue': [
                {
                    'currency': r['currency'],
                    'total_paid': float(r['total_paid'] or 0),
                    'total_unpaid': float(r['total_unpaid'] or 0),
                    'total_partial': float(r['total_partial'] or 0),
                    'count_paid': r['count_paid'],
                    'count_unpaid': r['count_unpaid'],
                }
                for r in revenue_qs if r.get('currency')
            ],
            'recent_requests': recent_requests,
            'ending_soon': ending_soon_detail,
            'recent_hotels': recent_hotels_list,
            'package_distribution': package_dist,
            'web_bookings': web_bookings_summary,
            'recent_web_bookings': recent_web,
        })


# ── Hotel ViewSet ─────────────────────────────────────────────────────────────

class HotelViewSet(viewsets.ModelViewSet):
    serializer_class = HotelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        if role == 'platform_owner':
            return Hotel.objects.all()
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id:
            return Hotel.objects.filter(id=user_hotel_id)
        return Hotel.objects.none()

    def perform_create(self, serializer):
        _require_platform(self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        _require_platform(self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        _require_platform(self.request.user)
        instance.delete()

    @action(detail=True, methods=['post'], url_path='reset_manager_password')
    def reset_manager_password(self, request, pk=None):
        _require_platform(request.user)
        hotel = self.get_object()
        if not hotel.manager_user_id:
            return Response({'error': 'هذا الفندق ليس له مدير مُعيَّن'}, status=status.HTTP_400_BAD_REQUEST)
        new_password = request.data.get('new_password', '')
        if not new_password:
            return Response({'error': 'كلمة المرور الجديدة مطلوبة'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, hotel.manager_user)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        hotel.manager_user.set_password(new_password)
        hotel.manager_user.save()
        return Response({'message': 'تم إعادة تعيين كلمة المرور بنجاح'})

    @action(detail=True, methods=['post'], url_path='assign_manager')
    def assign_manager(self, request, pk=None):
        _require_platform(request.user)
        hotel = self.get_object()
        if hotel.manager_user_id:
            return Response({'error': 'الفندق لديه مدير بالفعل'}, status=status.HTTP_400_BAD_REQUEST)

        manager_username = request.data.get('manager_username', '').strip()
        manager_email    = request.data.get('manager_email', '').strip()
        manager_password = request.data.get('manager_password', '')

        if not manager_username or not manager_password:
            return Response({'error': 'اسم المستخدم وكلمة المرور مطلوبان'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            UsernameValidator()(manager_username)
        except DjangoValidationError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=manager_username).exists():
            return Response({'error': 'اسم المستخدم مستخدم بالفعل'}, status=status.HTTP_400_BAD_REQUEST)
        if manager_email and User.objects.filter(email__iexact=manager_email).exists():
            return Response({'error': 'البريد الإلكتروني مستخدم بالفعل'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(manager_password, User(username=manager_username))
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=manager_username, email=manager_email, password=manager_password)
        hotel.manager_user  = user
        hotel.manager_name  = manager_username
        hotel.manager_email = manager_email
        hotel.save()
        UserProfile.objects.create(user=user, role=UserProfile.ROLE_MANAGER, hotel=hotel)

        return Response(HotelSerializer(hotel).data)

    @action(detail=False, methods=['post'], url_path='create_with_manager')
    def create_with_manager(self, request):
        _require_platform(request.user)

        hotel_name       = request.data.get('name', '').strip()
        country          = request.data.get('country', '').strip()
        city             = request.data.get('city', '').strip()
        address          = request.data.get('address', '').strip()
        phone            = request.data.get('phone', '').strip()
        floors_count     = request.data.get('floors_count', 1)
        hotel_status     = request.data.get('status', Hotel.STATUS_ACTIVE)

        manager_username = request.data.get('manager_username', '').strip()
        manager_email    = request.data.get('manager_email', '').strip()
        manager_password = request.data.get('manager_password', '')

        if not hotel_name:
            return Response({'error': 'اسم الفندق مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        if not manager_username:
            return Response({'error': 'اسم مستخدم المدير مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        if not manager_password:
            return Response({'error': 'كلمة مرور المدير مطلوبة'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            UsernameValidator()(manager_username)
        except DjangoValidationError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=manager_username).exists():
            return Response({'error': 'اسم المستخدم مستخدم بالفعل'}, status=status.HTTP_400_BAD_REQUEST)
        if manager_email and User.objects.filter(email__iexact=manager_email).exists():
            return Response({'error': 'البريد الإلكتروني مستخدم بالفعل'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(manager_password, User(username=manager_username))
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=manager_username, email=manager_email, password=manager_password)
        hotel = Hotel.objects.create(
            name=hotel_name,
            country=country,
            city=city,
            address=address,
            phone=phone,
            floors_count=floors_count,
            status=hotel_status,
            manager_user=user,
            manager_name=manager_username,
            manager_email=manager_email,
        )
        UserProfile.objects.create(user=user, role=UserProfile.ROLE_MANAGER, hotel=hotel)

        return Response(HotelSerializer(hotel).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        _require_platform(request.user)
        hotel = self.get_object()
        new_status = request.data.get('status')
        if new_status not in [Hotel.STATUS_ACTIVE, Hotel.STATUS_SUSPENDED, Hotel.STATUS_ARCHIVED]:
            return Response({'error': 'حالة غير صالحة'}, status=status.HTTP_400_BAD_REQUEST)
        hotel.status = new_status
        hotel.save()
        return Response(HotelSerializer(hotel).data)


# ── Package ViewSet ───────────────────────────────────────────────────────────

class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.all()
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        _require_platform(self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        _require_platform(self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        _require_platform(self.request.user)
        instance.delete()

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        _require_platform(request.user)
        package = self.get_object()
        new_status = request.data.get('status')
        if new_status not in [Package.STATUS_ACTIVE, Package.STATUS_SUSPENDED, Package.STATUS_ARCHIVED]:
            return Response({'error': 'حالة غير صالحة'}, status=status.HTTP_400_BAD_REQUEST)
        package.status = new_status
        package.save()
        return Response(PackageSerializer(package).data)


# ── Subscription ViewSet ──────────────────────────────────────────────────────

class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        qs = Subscription.objects.select_related('hotel', 'package')
        if role == 'platform_owner':
            return qs.all()
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id:
            return qs.filter(hotel_id=user_hotel_id)
        return qs.none()

    def perform_create(self, serializer):
        _require_platform(self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        _require_platform(self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        _require_platform(self.request.user)
        instance.delete()

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        _require_platform(request.user)
        sub = self.get_object()
        months = int(request.data.get('months', 1))
        if months < 1 or months > 60:
            return Response({'error': 'عدد الأشهر يجب أن يكون بين 1 و 60'}, status=status.HTTP_400_BAD_REQUEST)
        today = timezone.now().date()
        base  = sub.end_date if sub.end_date and sub.end_date >= today else today
        sub.start_date = today
        sub.end_date   = _add_months(base, months)
        sub.status     = Subscription.STATUS_ACTIVE
        sub.save()
        return Response(SubscriptionSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        _require_platform(request.user)
        sub = self.get_object()
        if sub.status in [Subscription.STATUS_EXPIRED, Subscription.STATUS_SUSPENDED]:
            return Response({'error': 'الاشتراك غير فعّال بالفعل'}, status=status.HTTP_400_BAD_REQUEST)
        sub.status = Subscription.STATUS_SUSPENDED
        sub.save()
        return Response(SubscriptionSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def activate_trial(self, request, pk=None):
        _require_platform(request.user)
        sub = self.get_object()
        if sub.status != Subscription.STATUS_TRIAL:
            return Response({'error': 'الاشتراك ليس في حالة تجريبية'}, status=status.HTTP_400_BAD_REQUEST)
        sub.status = Subscription.STATUS_ACTIVE
        if not sub.end_date:
            sub.end_date = _add_months(timezone.now().date(), 1)
        sub.save()
        return Response(SubscriptionSerializer(sub).data)

    @action(detail=False, methods=['post'], url_path='create_for_hotel')
    def create_for_hotel(self, request):
        _require_platform(request.user)
        hotel_id = request.data.get('hotel')
        if not hotel_id:
            return Response({'error': 'الفندق مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            hotel = Hotel.objects.get(pk=hotel_id)
        except Hotel.DoesNotExist:
            return Response({'error': 'الفندق غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        package = None
        package_id = request.data.get('package') or None
        if package_id:
            try:
                package = Package.objects.get(pk=package_id)
            except Package.DoesNotExist:
                return Response({'error': 'الباقة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        sub, created = Subscription.objects.get_or_create(hotel=hotel)
        sub.package        = package
        sub.status         = request.data.get('status', Subscription.STATUS_TRIAL)
        sub.payment_status = request.data.get('payment_status', Subscription.PAYMENT_UNPAID)
        sub.start_date     = request.data.get('start_date') or None
        sub.end_date       = request.data.get('end_date')   or None
        sub.monthly_amount = request.data.get('monthly_amount', 0)
        sub.currency       = request.data.get('currency', 'SAR')
        sub.notes          = request.data.get('notes', '')
        sub.save()
        return Response(SubscriptionSerializer(sub).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ── Subscription Request ViewSet ──────────────────────────────────────────────

class SubscriptionRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        qs = SubscriptionRequest.objects.select_related('hotel', 'package')
        if role == 'platform_owner':
            return qs.all()
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id:
            return qs.filter(hotel_id=user_hotel_id)
        return qs.none()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        _require_platform(request.user)
        req = self.get_object()
        if req.status != SubscriptionRequest.STATUS_PENDING:
            return Response({'error': 'تمت معالجة هذا الطلب سابقًا'}, status=status.HTTP_400_BAD_REQUEST)
        months = int(request.data.get('months', 1))
        if months < 1 or months > 60:
            return Response({'error': 'عدد الأشهر يجب أن يكون بين 1 و 60'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = SubscriptionRequest.STATUS_APPROVED
        req.save()
        if req.package:
            today = timezone.now().date()
            sub, _ = Subscription.objects.get_or_create(hotel=req.hotel)
            sub.package    = req.package
            sub.status     = Subscription.STATUS_ACTIVE
            sub.start_date = today
            sub.end_date   = _add_months(today, months)
            sub.save()
        return Response(SubscriptionRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        _require_platform(request.user)
        req = self.get_object()
        if req.status != SubscriptionRequest.STATUS_PENDING:
            return Response({'error': 'تمت معالجة هذا الطلب سابقًا'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = SubscriptionRequest.STATUS_REJECTED
        req.rejection_reason = request.data.get('reason', '').strip()
        req.save()
        return Response(SubscriptionRequestSerializer(req).data)


# ── Room ViewSet ──────────────────────────────────────────────────────────────

class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.query_params.get('hotel')
        if role == 'platform_owner':
            qs = Room.objects.all()
            if hotel_id:
                qs = qs.filter(hotel_id=hotel_id)
            return qs
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            return Room.objects.none()
        return Room.objects.filter(hotel_id=user_hotel_id)

    def perform_create(self, serializer):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.data.get('hotel') or self.request.query_params.get('hotel')
        if role == 'platform_owner':
            serializer.save(hotel_id=hotel_id)
            return
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            raise PermissionDenied('غير مرتبط بأي فندق.')
        if hotel_id and str(hotel_id) != str(user_hotel_id):
            raise PermissionDenied('ليس لديك صلاحية الإنشاء في هذا الفندق.')
        serializer.save(hotel_id=user_hotel_id)


# ── Reservation ViewSet ───────────────────────────────────────────────────────

class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.query_params.get('hotel')
        qs = Reservation.objects.select_related('room')
        if role == 'platform_owner':
            if hotel_id:
                qs = qs.filter(hotel_id=hotel_id)
            return qs
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            return qs.none()
        return qs.filter(hotel_id=user_hotel_id)

    def perform_create(self, serializer):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.data.get('hotel') or self.request.query_params.get('hotel')
        if role == 'platform_owner':
            serializer.save(hotel_id=hotel_id, created_by=self.request.user)
            return
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            raise PermissionDenied('غير مرتبط بأي فندق.')
        if hotel_id and str(hotel_id) != str(user_hotel_id):
            raise PermissionDenied('ليس لديك صلاحية الإنشاء في هذا الفندق.')
        serializer.save(hotel_id=user_hotel_id, created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='web_checkin')
    def web_checkin(self, request, pk=None):
        res = self.get_object()
        if not res.public_booking:
            return Response({'error': 'هذا الحجز ليس من الموقع العام'}, status=400)
        if res.status in [Reservation.STATUS_CANCELLED, Reservation.STATUS_CHECKED_OUT]:
            return Response({'error': 'لا يمكن تسجيل الدخول لهذا الحجز'}, status=400)
        res.status = Reservation.STATUS_CHECKED_IN
        res.arrival_status = Reservation.ARRIVAL_CHECKED_IN
        res.checked_in_at = timezone.now()
        res.save()
        if res.room:
            res.room.status = Room.STATUS_OCCUPIED
            res.room.save()
        _sync_commission(res)
        return Response(ReservationSerializer(res).data)

    @action(detail=True, methods=['post'], url_path='web_noshow')
    def web_noshow(self, request, pk=None):
        res = self.get_object()
        if not res.public_booking:
            return Response({'error': 'هذا الحجز ليس من الموقع العام'}, status=400)
        if res.status in [Reservation.STATUS_CANCELLED, Reservation.STATUS_CHECKED_IN, Reservation.STATUS_CHECKED_OUT]:
            return Response({'error': 'لا يمكن تسجيل عدم الحضور'}, status=400)
        res.status = Reservation.STATUS_NO_SHOW
        res.arrival_status = Reservation.ARRIVAL_NO_SHOW
        res.no_show_at = timezone.now()
        res.save()
        if res.room:
            res.room.status = Room.STATUS_AVAILABLE
            res.room.save()
        _sync_commission(res)
        return Response(ReservationSerializer(res).data)

    @action(detail=True, methods=['post'], url_path='hotel_cancel')
    def hotel_cancel(self, request, pk=None):
        res = self.get_object()
        if res.status in [Reservation.STATUS_CHECKED_IN, Reservation.STATUS_CHECKED_OUT]:
            return Response({'error': 'لا يمكن إلغاء حجز بعد تسجيل الدخول'}, status=400)
        if res.status == Reservation.STATUS_CANCELLED:
            return Response({'error': 'الحجز ملغى بالفعل'}, status=400)
        res.status = Reservation.STATUS_CANCELLED
        res.arrival_status = Reservation.ARRIVAL_CANCEL_H
        res.cancelled_at = timezone.now()
        res.cancelled_by_type = 'hotel'
        res.cancel_reason = request.data.get('reason', '').strip()
        res.save()
        if res.room:
            res.room.status = Room.STATUS_AVAILABLE
            res.room.save()
        _sync_commission(res)
        return Response(ReservationSerializer(res).data)


# ── Staff ViewSet ─────────────────────────────────────────────────────────────

class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.query_params.get('hotel')
        qs = Staff.objects.all()
        if role == 'platform_owner':
            if hotel_id:
                qs = qs.filter(hotel_id=hotel_id)
            return qs
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            return qs.none()
        return qs.filter(hotel_id=user_hotel_id)

    def perform_create(self, serializer):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.data.get('hotel') or self.request.query_params.get('hotel')
        if role == 'platform_owner':
            serializer.save(hotel_id=hotel_id)
            return
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            raise PermissionDenied('غير مرتبط بأي فندق.')
        if hotel_id and str(hotel_id) != str(user_hotel_id):
            raise PermissionDenied('ليس لديك صلاحية الإنشاء في هذا الفندق.')
        serializer.save(hotel_id=user_hotel_id)


# ── Maintenance Ticket ViewSet ────────────────────────────────────────────────

class MaintenanceTicketViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.query_params.get('hotel')
        qs = MaintenanceTicket.objects.select_related('room', 'assigned_to')
        if role == 'platform_owner':
            if hotel_id:
                qs = qs.filter(hotel_id=hotel_id)
            return qs
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            return qs.none()
        return qs.filter(hotel_id=user_hotel_id)

    def perform_create(self, serializer):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.data.get('hotel') or self.request.query_params.get('hotel')
        if role == 'platform_owner':
            serializer.save(hotel_id=hotel_id)
            return
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            raise PermissionDenied('غير مرتبط بأي فندق.')
        if hotel_id and str(hotel_id) != str(user_hotel_id):
            raise PermissionDenied('ليس لديك صلاحية الإنشاء في هذا الفندق.')
        serializer.save(hotel_id=user_hotel_id)


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC WEBSITE API  (no authentication required)
# ─────────────────────────────────────────────────────────────────────────────

from django.db import transaction as _transaction
from .serializers import PublicHotelCardSerializer, PublicHotelDetailSerializer, PublicBookingDetailSerializer


def _public_hotels_qs():
    # كل فندق مسجّل يظهر في الموقع — يُستثنى فقط الفنادق المؤرشفة (المحذوفة).
    return Hotel.objects.exclude(status=Hotel.STATUS_ARCHIVED).select_related('subscription')


def _ensure_slug(hotel):
    if not hotel.slug:
        slug = f'hotel-{hotel.id}'
        Hotel.objects.filter(pk=hotel.pk).update(slug=slug)
        hotel.slug = slug
    return hotel.slug


def _get_conflicting_room_ids(hotel_id, check_in, check_out):
    return list(Reservation.objects.filter(
        hotel_id=hotel_id, room__isnull=False,
        check_in_date__lt=check_out, check_out_date__gt=check_in,
    ).exclude(
        status__in=[Reservation.STATUS_CANCELLED, Reservation.STATUS_NO_SHOW]
    ).values_list('room_id', flat=True))


class PublicHotelListView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []  # تصفّح عام حر — بلا حدّ طلبات

    def get(self, request):
        qs = _public_hotels_qs()
        for param, field in [('country', 'country__icontains'), ('governorate', 'governorate__icontains'), ('city', 'city__icontains')]:
            v = request.query_params.get(param)
            if v:
                qs = qs.filter(**{field: v})
        if request.query_params.get('stars'):
            try:
                qs = qs.filter(stars=int(request.query_params['stars']))
            except ValueError:
                pass
        if request.query_params.get('hotel_type'):
            qs = qs.filter(hotel_type=request.query_params['hotel_type'])
        for a in [x.strip() for x in request.query_params.get('amenities', '').split(',') if x.strip()]:
            qs = qs.filter(amenities__contains=a)
        if request.query_params.get('featured') == '1':
            qs = qs.filter(is_featured=True)
        hotels = list(qs.order_by('-is_featured', '-created_at'))
        for h in hotels:
            _ensure_slug(h)
        return Response(PublicHotelCardSerializer(hotels, many=True).data)


class PublicHotelDetailView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get(self, request, slug):
        try:
            qs = _public_hotels_qs()
            hotel = qs.get(pk=int(slug)) if slug.isdigit() else qs.get(slug=slug)
        except (Hotel.DoesNotExist, ValueError):
            return Response({'error': 'هذا الفندق غير متاح حاليًا'}, status=404)
        _ensure_slug(hotel)
        return Response(PublicHotelDetailSerializer(hotel).data)


class PublicRoomAvailabilityView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get(self, request, slug):
        try:
            qs = _public_hotels_qs()
            hotel = qs.get(pk=int(slug)) if slug.isdigit() else qs.get(slug=slug)
        except (Hotel.DoesNotExist, ValueError):
            return Response({'error': 'الفندق غير متاح'}, status=404)

        check_in_str  = request.query_params.get('check_in', '')
        check_out_str = request.query_params.get('check_out', '')
        guests = max(1, int(request.query_params.get('guests', 1)))
        if not check_in_str or not check_out_str:
            return Response({'error': 'يرجى تحديد تواريخ الدخول والخروج'}, status=400)

        from datetime import date
        try:
            check_in  = date.fromisoformat(check_in_str)
            check_out = date.fromisoformat(check_out_str)
        except ValueError:
            return Response({'error': 'تنسيق التاريخ غير صحيح'}, status=400)

        if check_in < date.today():
            return Response({'error': 'تاريخ الدخول لا يمكن أن يكون في الماضي'}, status=400)
        if check_out <= check_in:
            return Response({'error': 'تاريخ الخروج يجب أن يكون بعد تاريخ الدخول'}, status=400)

        nights   = (check_out - check_in).days
        busy_ids = set(_get_conflicting_room_ids(hotel.id, check_in, check_out))

        available = hotel.rooms.filter(show_in_public=True).exclude(
            status__in=[Room.STATUS_ARCHIVED, Room.STATUS_OUT_OF_SERVICE, Room.STATUS_MAINTENANCE]
        ).exclude(id__in=busy_ids).filter(capacity__gte=guests)

        from collections import defaultdict
        groups = defaultdict(list)
        for room in available:
            groups[room.type].append(room)

        TYPE_LABELS = dict(Room.TYPE_CHOICES)
        result = []
        for rtype, rooms in groups.items():
            cheapest = min(rooms, key=lambda r: float(r.price))
            result.append({
                'room_type': rtype,
                'room_type_label': TYPE_LABELS.get(rtype, rtype),
                'available_count': len(rooms),
                'capacity': max(r.capacity for r in rooms),
                'price_per_night': float(cheapest.price),
                'currency': cheapest.currency,
                'total_price': float(cheapest.price) * nights,
                'nights': nights,
                'description': cheapest.public_description,
            })
        result.sort(key=lambda x: x['price_per_night'])
        return Response(result)


class PublicBookingCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        d = request.data
        hotel_id      = d.get('hotel_id')
        room_type     = (d.get('room_type') or '').strip()
        check_in_str  = (d.get('check_in_date') or '').strip()
        check_out_str = (d.get('check_out_date') or '').strip()
        guests_count  = max(1, int(d.get('guests_count', 1)))
        first_name    = (d.get('guest_first_name') or '').strip()
        last_name     = (d.get('guest_last_name') or '').strip()
        phone         = (d.get('guest_phone') or '').strip()
        email         = (d.get('guest_email') or '').strip()
        notes         = (d.get('notes') or '').strip()

        if not all([hotel_id, room_type, check_in_str, check_out_str, first_name, last_name, phone]):
            return Response({'error': 'يرجى ملء جميع الحقول المطلوبة'}, status=400)

        from datetime import date
        try:
            check_in  = date.fromisoformat(check_in_str)
            check_out = date.fromisoformat(check_out_str)
        except ValueError:
            return Response({'error': 'تنسيق التاريخ غير صحيح'}, status=400)

        if check_in < date.today():
            return Response({'error': 'تاريخ الدخول لا يمكن أن يكون في الماضي'}, status=400)
        if check_out <= check_in:
            return Response({'error': 'تاريخ الخروج يجب أن يكون بعد تاريخ الدخول'}, status=400)

        try:
            hotel = Hotel.objects.exclude(status=Hotel.STATUS_ARCHIVED).get(pk=hotel_id)
        except Hotel.DoesNotExist:
            return Response({'error': 'الفندق غير متاح'}, status=404)

        if not hotel.public_booking_enabled:
            return Response({'error': 'الحجز من الموقع غير متاح لهذا الفندق حاليًا'}, status=400)

        nights = (check_out - check_in).days

        with _transaction.atomic():
            busy_ids = set(_get_conflicting_room_ids(hotel.id, check_in, check_out))
            room = (
                Room.objects.select_for_update()
                .filter(hotel=hotel, type=room_type, show_in_public=True, capacity__gte=guests_count)
                .exclude(status__in=[Room.STATUS_ARCHIVED, Room.STATUS_OUT_OF_SERVICE, Room.STATUS_MAINTENANCE])
                .exclude(id__in=busy_ids)
                .order_by('price')
                .first()
            )
            if not room:
                return Response({'error': 'عذرًا، لا توجد غرف متاحة من هذا النوع في التاريخ المحدد'}, status=409)

            reservation = Reservation.objects.create(
                hotel=hotel, room=room,
                guest_first_name=first_name, guest_last_name=last_name,
                guest_phone=phone, guest_email=email,
                check_in_date=check_in, check_out_date=check_out,
                nights_count=nights, persons_count=guests_count,
                room_price=room.price, total=float(room.price) * nights,
                currency=room.currency, status=Reservation.STATUS_CONFIRMED,
                source=Reservation.SOURCE_PUBLIC, notes=notes,
                public_booking=True,
                room_type_label=dict(Room.TYPE_CHOICES).get(room_type, room_type),
                payment_method='pay_at_hotel',
                documents_status='pending_on_arrival',
                arrival_status=Reservation.ARRIVAL_AWAITING,
            )
        # إشعارات best-effort (بريد + SMS + واتساب) — لا تُفشِل الحجز إن تعطّلت
        try:
            from .notifications import notify_booking_created
            notify_booking_created(reservation)
        except Exception:
            pass
        # إنشاء سجل عمولة المنصة (best-effort)
        try:
            from .commissions import ensure_commission
            ensure_commission(reservation)
        except Exception:
            pass
        return Response(PublicBookingDetailSerializer(reservation).data, status=201)


class PublicBookingManageView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get(self, request):
        booking_no = request.query_params.get('no', '').strip()
        phone      = request.query_params.get('phone', '').strip()
        if not booking_no or not phone:
            return Response({'error': 'يرجى إدخال رقم الحجز ورقم الهاتف'}, status=400)
        try:
            res = Reservation.objects.select_related('hotel').get(
                public_booking_no=booking_no, guest_phone=phone, public_booking=True,
            )
        except Reservation.DoesNotExist:
            return Response({'error': 'لم يتم العثور على حجز مطابق'}, status=404)
        return Response(PublicBookingDetailSerializer(res).data)


class PublicBookingCancelView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, booking_no):
        phone  = (request.data.get('phone') or '').strip()
        reason = (request.data.get('reason') or '').strip()
        if not phone:
            return Response({'error': 'رقم الهاتف مطلوب للتحقق'}, status=400)
        try:
            res = Reservation.objects.select_related('room').get(
                public_booking_no=booking_no, guest_phone=phone, public_booking=True,
            )
        except Reservation.DoesNotExist:
            return Response({'error': 'لم يتم العثور على الحجز'}, status=404)

        if res.status in [Reservation.STATUS_CHECKED_IN, Reservation.STATUS_CHECKED_OUT]:
            return Response({'error': 'لا يمكن إلغاء هذا الحجز من الموقع، يرجى التواصل مع الفندق مباشرةً'}, status=400)
        if res.status == Reservation.STATUS_CANCELLED:
            return Response({'error': 'هذا الحجز ملغى بالفعل'}, status=400)

        res.status        = Reservation.STATUS_CANCELLED
        res.arrival_status = Reservation.ARRIVAL_CANCEL_G
        res.cancelled_at  = timezone.now()
        res.cancelled_by_type = 'guest'
        res.cancel_reason = reason
        res.save()
        if res.room:
            res.room.status = Room.STATUS_AVAILABLE
            res.room.save()
        _sync_commission(res)
        return Response({'message': 'تم إلغاء الحجز بنجاح', 'booking_no': booking_no})


class PublicPlatformInfoView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get(self, request):
        return Response({'name': 'Fandqi', 'description': 'منصة فندقي للحجز الفندقي', 'default_country': 'سوريا'})


# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM EARNINGS  (أرباحي — مالك المنصة فقط)
# ─────────────────────────────────────────────────────────────────────────────

from .models import PlatformRevenueSettings, HotelCommissionSetting, BookingCommission


def _period_range(request):
    """يُرجع (start_date, end_date) أو (None, None) للكل، حسب فلتر الفترة."""
    period = request.query_params.get('period', 'all')
    today = timezone.now().date()
    if period == 'today':
        return today, today
    if period == 'week':
        return today - timezone.timedelta(days=today.weekday()), today
    if period == 'month':
        return today.replace(day=1), today
    if period == 'year':
        return today.replace(month=1, day=1), today
    if period == 'custom':
        def _parse(v):
            try:
                return _date.fromisoformat(v) if v else None
            except ValueError:
                return None
        return _parse(request.query_params.get('date_from')), _parse(request.query_params.get('date_to'))
    return None, None


def _merge_currency(*dicts):
    """يدمج عدّة قواميس {عملة: قيمة} دون جمع عملات مختلفة في رقم واحد."""
    out = {}
    for d in dicts:
        for cur, val in (d or {}).items():
            out[cur] = round(out.get(cur, 0) + float(val or 0), 2)
    return out


def _revenue_settings_dict(s):
    return {
        'enable_booking_commission': s.enable_booking_commission,
        'default_commission_type': s.default_commission_type,
        'default_commission_value': float(s.default_commission_value),
        'default_commission_currency': s.default_commission_currency,
        'calculate_commission_on_status': s.calculate_commission_on_status,
        'allow_hotel_override': s.allow_hotel_override,
        'no_show_policy': s.no_show_policy,
        'updated_at': s.updated_at.isoformat() if s.updated_at else None,
    }


def _hotel_commission_dict(hotel):
    from .commissions import resolve_commission_config
    hc = getattr(hotel, 'commission_setting', None)
    cfg = resolve_commission_config(hotel)
    return {
        'hotel_id': hotel.id,
        'hotel_name': hotel.name,
        'has_override': hc is not None,
        'commission_enabled': hc.commission_enabled if hc else True,
        'commission_type': hc.commission_type if hc else '',
        'commission_value': float(hc.commission_value) if hc else 0,
        'commission_currency': hc.commission_currency if hc else 'USD',
        'commission_notes': hc.commission_notes if hc else '',
        'effective_from': hc.effective_from.isoformat() if hc and hc.effective_from else None,
        'effective_to': hc.effective_to.isoformat() if hc and hc.effective_to else None,
        'is_active': hc.is_active if hc else True,
        # الإعداد الفعّال المطبَّق فعليًا
        'effective': {
            'enabled': cfg['enabled'], 'type': cfg['type'],
            'value': float(cfg['value']), 'currency': cfg['currency'], 'source': cfg['source'],
        },
    }


def _commission_dict(bc):
    r = bc.reservation
    return {
        'id': bc.id,
        'public_booking_no': bc.public_booking_no,
        'guest_name': f'{r.guest_first_name} {r.guest_last_name}'.strip(),
        'guest_phone': r.guest_phone,
        'created_at': r.created_at.isoformat(),
        'check_in_date': r.check_in_date.isoformat() if r.check_in_date else None,
        'check_out_date': r.check_out_date.isoformat() if r.check_out_date else None,
        'room_type_label': r.room_type_label,
        'booking_total': float(bc.calculation_base_amount),
        'booking_currency': bc.calculation_base_currency,
        'booking_status': r.status,
        'arrival_status': r.arrival_status,
        'commission_type': bc.commission_type,
        'commission_value': float(bc.commission_value),
        'commission_amount': float(bc.commission_amount),
        'commission_currency': bc.commission_currency,
        'commission_status': bc.commission_status,
        'paid_amount': float(bc.paid_amount),
        'notes': bc.notes,
    }


def _hotel_earnings_row(hotel, start, end, currency_f):
    from .commissions import resolve_commission_config, EARNED_STATUSES
    b = Reservation.objects.filter(public_booking=True, hotel=hotel)
    if start: b = b.filter(created_at__date__gte=start)
    if end:   b = b.filter(created_at__date__lte=end)
    if currency_f: b = b.filter(currency=currency_f)

    total_count = b.count()
    completed = b.filter(
        Q(status__in=[Reservation.STATUS_CHECKED_IN, Reservation.STATUS_CHECKED_OUT])
        | Q(arrival_status=Reservation.ARRIVAL_COMPLETED)
    ).count()
    cancelled = b.filter(status=Reservation.STATUS_CANCELLED).count()
    no_show   = b.filter(status=Reservation.STATUS_NO_SHOW).count()

    booking_value = {}
    for row in (b.exclude(status__in=[Reservation.STATUS_CANCELLED, Reservation.STATUS_NO_SHOW])
                  .values('currency').annotate(t=Sum('total'))):
        booking_value[row['currency']] = round(float(row['t'] or 0), 2)

    comm = BookingCommission.objects.filter(reservation__in=b)
    profit = {}
    for row in (comm.filter(commission_status__in=EARNED_STATUSES)
                    .values('commission_currency').annotate(t=Sum('commission_amount'))):
        profit[row['commission_currency']] = round(float(row['t'] or 0), 2)

    status_breakdown = {}
    for row in comm.values('commission_status').annotate(c=Count('id')):
        status_breakdown[row['commission_status']] = row['c']

    cfg = resolve_commission_config(hotel)
    last_b = b.order_by('-created_at').first()
    sub = getattr(hotel, 'subscription', None)

    return {
        'hotel_id': hotel.id,
        'hotel_name': hotel.name,
        'city': hotel.city or '',
        'governorate': hotel.governorate or '',
        'status': hotel.status,
        'package_name': sub.package.name if (sub and sub.package) else None,
        'subscription_status': sub.status if sub else None,
        'subscription_amount': float(sub.monthly_amount) if (sub and sub.monthly_amount) else 0,
        'subscription_currency': sub.currency if sub else None,
        'web_bookings_count': total_count,
        'completed_count': completed,
        'cancelled_count': cancelled,
        'no_show_count': no_show,
        'booking_value_by_currency': booking_value,
        'commission_enabled': cfg['enabled'],
        'commission_type': cfg['type'],
        'commission_value': float(cfg['value']),
        'commission_currency': cfg['currency'],
        'commission_source': cfg['source'],
        'profit_by_currency': profit,
        'commission_status_breakdown': status_breakdown,
        'last_booking_at': last_b.created_at.isoformat() if last_b else None,
    }


class PlatformEarningsView(APIView):
    """نظرة عامة على أرباح المنصة (اشتراكات + حجوزات موقع) + تقرير لكل فندق."""
    permission_classes = [IsPlatformOwner]

    def get(self, request):
        from .commissions import backfill_commissions, EARNED_STATUSES
        backfill_commissions()  # ضمان وجود سجلات عمولة لكل الحجوزات العامة

        start, end = _period_range(request)
        hotel_id    = request.query_params.get('hotel')
        governorate = request.query_params.get('governorate')
        currency_f  = request.query_params.get('currency')

        # ── الفنادق ──────────────────────────────────────────────────────────
        hotels = Hotel.objects.select_related('subscription', 'subscription__package',
                                              'commission_setting').all()
        if governorate:
            hotels = hotels.filter(governorate__icontains=governorate)
        if hotel_id:
            hotels = hotels.filter(id=hotel_id)

        # ── الاشتراكات ───────────────────────────────────────────────────────
        subs = Subscription.objects.select_related('hotel', 'package')
        if hotel_id:    subs = subs.filter(hotel_id=hotel_id)
        if governorate: subs = subs.filter(hotel__governorate__icontains=governorate)

        sub_earn_qs = subs.filter(payment_status='paid')
        if start: sub_earn_qs = sub_earn_qs.filter(start_date__gte=start)
        if end:   sub_earn_qs = sub_earn_qs.filter(start_date__lte=end)
        if currency_f: sub_earn_qs = sub_earn_qs.filter(currency=currency_f)

        sub_earnings = {}
        for row in sub_earn_qs.values('currency').annotate(t=Sum('monthly_amount')):
            sub_earnings[row['currency']] = round(float(row['t'] or 0), 2)
        sub_unpaid = {}
        for row in subs.filter(payment_status__in=['unpaid', 'partial']).values('currency').annotate(t=Sum('monthly_amount')):
            sub_unpaid[row['currency']] = round(float(row['t'] or 0), 2)

        best_pkg = (Subscription.objects.filter(payment_status='paid')
                    .values('package__name').annotate(c=Count('id')).order_by('-c').first())
        top_hotel = (subs.filter(payment_status='paid')
                     .values('hotel__name').annotate(c=Count('id')).order_by('-c').first())

        subscriptions = {
            'sold': subs.filter(payment_status='paid').count(),
            'active': subs.filter(status='active').count(),
            'expired': subs.filter(status='expired').count(),
            'unpaid': subs.filter(payment_status__in=['unpaid', 'partial']).count(),
            'trial': subs.filter(status='trial').count(),
            'earnings_by_currency': sub_earnings,
            'unpaid_by_currency': sub_unpaid,
            'best_selling_package': best_pkg['package__name'] if best_pkg else None,
            'top_paying_hotel': top_hotel['hotel__name'] if top_hotel else None,
        }

        # ── حجوزات الموقع ────────────────────────────────────────────────────
        bookings = Reservation.objects.filter(public_booking=True).select_related('hotel')
        if hotel_id:    bookings = bookings.filter(hotel_id=hotel_id)
        if governorate: bookings = bookings.filter(hotel__governorate__icontains=governorate)
        if start: bookings = bookings.filter(created_at__date__gte=start)
        if end:   bookings = bookings.filter(created_at__date__lte=end)
        if currency_f: bookings = bookings.filter(currency=currency_f)

        web_count = bookings.count()
        customers = bookings.exclude(guest_phone='').values('guest_phone').distinct().count()

        commissions = BookingCommission.objects.filter(reservation__in=bookings)
        booking_earnings = {}
        for row in (commissions.filter(commission_status__in=EARNED_STATUSES)
                    .values('commission_currency').annotate(t=Sum('commission_amount'))):
            booking_earnings[row['commission_currency']] = round(float(row['t'] or 0), 2)
        booking_pending = {}
        for row in (commissions.filter(commission_status=BookingCommission.STATUS_PENDING)
                    .values('commission_currency').annotate(t=Sum('commission_amount'))):
            booking_pending[row['commission_currency']] = round(float(row['t'] or 0), 2)
        booking_paid = {}
        for row in (commissions.filter(commission_status=BookingCommission.STATUS_PAID)
                    .values('commission_currency').annotate(t=Sum('commission_amount'))):
            booking_paid[row['commission_currency']] = round(float(row['t'] or 0), 2)

        comm_status_counts = {}
        for row in commissions.values('commission_status').annotate(c=Count('id')):
            comm_status_counts[row['commission_status']] = row['c']

        web_bookings = {
            'count': web_count,
            'customers': customers,
            'completed': bookings.filter(
                Q(status__in=[Reservation.STATUS_CHECKED_IN, Reservation.STATUS_CHECKED_OUT])
                | Q(arrival_status=Reservation.ARRIVAL_COMPLETED)).count(),
            'cancelled': bookings.filter(status=Reservation.STATUS_CANCELLED).count(),
            'no_show': bookings.filter(status=Reservation.STATUS_NO_SHOW).count(),
            'earnings_by_currency': booking_earnings,
            'pending_by_currency': booking_pending,
            'paid_by_currency': booking_paid,
            'commission_status_counts': comm_status_counts,
            'hotels_with_bookings': bookings.values('hotel_id').distinct().count(),
        }

        # ── الإجمالي حسب العملة ──────────────────────────────────────────────
        total_by_currency = _merge_currency(sub_earnings, booking_earnings)

        # ── تقرير الفنادق ────────────────────────────────────────────────────
        rows = [_hotel_earnings_row(h, start, end, currency_f) for h in hotels.order_by('name')]

        # ── خيارات الفلاتر ───────────────────────────────────────────────────
        all_currencies = sorted(set(
            list(Subscription.objects.values_list('currency', flat=True).distinct())
            + list(Reservation.objects.filter(public_booking=True).values_list('currency', flat=True).distinct())
        ))
        all_governorates = sorted(set(
            g for g in Hotel.objects.exclude(governorate='').values_list('governorate', flat=True).distinct()
        ))

        return Response({
            'kpis': {
                'hotels_total': Hotel.objects.count(),
                'hotels_active': Hotel.objects.filter(status='active').count(),
                'subscriptions_sold': subscriptions['sold'],
                'web_bookings_count': web_count,
                'customers_count': customers,
            },
            'subscriptions': subscriptions,
            'web_bookings': web_bookings,
            'total_by_currency': total_by_currency,
            'subscription_earnings_by_currency': sub_earnings,
            'booking_earnings_by_currency': booking_earnings,
            'hotels': rows,
            'filters': {
                'period': request.query_params.get('period', 'all'),
                'currencies': all_currencies,
                'governorates': all_governorates,
            },
            'revenue_settings': _revenue_settings_dict(PlatformRevenueSettings.get_solo()),
        })


class PlatformHotelEarningsView(APIView):
    """تقرير أرباح مفصّل لفندق واحد."""
    permission_classes = [IsPlatformOwner]

    def get(self, request, hotel_id):
        from .commissions import backfill_commissions, EARNED_STATUSES
        backfill_commissions()
        try:
            hotel = Hotel.objects.select_related('subscription', 'subscription__package',
                                                 'commission_setting').get(pk=hotel_id)
        except Hotel.DoesNotExist:
            return Response({'error': 'الفندق غير موجود'}, status=404)

        start, end = _period_range(request)
        booking_status_f    = request.query_params.get('booking_status')
        commission_status_f = request.query_params.get('commission_status')

        sub = getattr(hotel, 'subscription', None)
        sub_summary = {
            'package_name': sub.package.name if (sub and sub.package) else None,
            'status': sub.status if sub else None,
            'payment_status': sub.payment_status if sub else None,
            'amount': float(sub.monthly_amount) if (sub and sub.monthly_amount) else 0,
            'currency': sub.currency if sub else None,
            'start_date': sub.start_date.isoformat() if (sub and sub.start_date) else None,
            'end_date': sub.end_date.isoformat() if (sub and sub.end_date) else None,
        }

        b = Reservation.objects.filter(public_booking=True, hotel=hotel)
        if start: b = b.filter(created_at__date__gte=start)
        if end:   b = b.filter(created_at__date__lte=end)

        bookings_summary = {
            'total': b.count(),
            'awaiting': b.filter(arrival_status=Reservation.ARRIVAL_AWAITING).count(),
            'checked_in': b.filter(status=Reservation.STATUS_CHECKED_IN).count(),
            'completed': b.filter(Q(status=Reservation.STATUS_CHECKED_OUT)
                                  | Q(arrival_status=Reservation.ARRIVAL_COMPLETED)).count(),
            'cancelled_by_guest': b.filter(arrival_status=Reservation.ARRIVAL_CANCEL_G).count(),
            'cancelled_by_hotel': b.filter(arrival_status=Reservation.ARRIVAL_CANCEL_H).count(),
            'no_show': b.filter(status=Reservation.STATUS_NO_SHOW).count(),
        }
        booking_value = {}
        for row in (b.exclude(status__in=[Reservation.STATUS_CANCELLED, Reservation.STATUS_NO_SHOW])
                      .values('currency').annotate(t=Sum('total'))):
            booking_value[row['currency']] = round(float(row['t'] or 0), 2)
        bookings_summary['value_by_currency'] = booking_value

        comm = BookingCommission.objects.filter(reservation__in=b)
        profit = {}
        for row in (comm.filter(commission_status__in=EARNED_STATUSES)
                    .values('commission_currency').annotate(t=Sum('commission_amount'))):
            profit[row['commission_currency']] = round(float(row['t'] or 0), 2)
        bookings_summary['profit_by_currency'] = profit

        # تفاصيل الحجوزات
        detail_qs = b.order_by('-created_at')
        if booking_status_f:
            detail_qs = detail_qs.filter(status=booking_status_f)
        comm_map = {c.reservation_id: c for c in BookingCommission.objects.filter(reservation__in=detail_qs)}
        commission_rows = []
        for res in detail_qs:
            bc = comm_map.get(res.id)
            if not bc:
                continue
            if commission_status_f and bc.commission_status != commission_status_f:
                continue
            commission_rows.append(_commission_dict(bc))

        return Response({
            'hotel': {
                'id': hotel.id, 'name': hotel.name, 'city': hotel.city or '',
                'governorate': hotel.governorate or '', 'status': hotel.status,
                'manager_name': hotel.manager_name or '', 'phone': hotel.phone or '',
                'currency': sub.currency if sub else 'USD',
            },
            'subscription': sub_summary,
            'bookings_summary': bookings_summary,
            'commission_setting': _hotel_commission_dict(hotel),
            'commissions': commission_rows,
        })


class PlatformRevenueSettingsView(APIView):
    """قراءة/تحديث إعدادات احتساب ربح المنصة من حجوزات الموقع."""
    permission_classes = [IsPlatformOwner]

    def get(self, request):
        return Response(_revenue_settings_dict(PlatformRevenueSettings.get_solo()))

    def put(self, request):
        s = PlatformRevenueSettings.get_solo()
        d = request.data
        if 'enable_booking_commission' in d:
            s.enable_booking_commission = bool(d['enable_booking_commission'])
        if 'default_commission_type' in d:
            s.default_commission_type = str(d['default_commission_type'])
        if 'default_commission_value' in d:
            try: s.default_commission_value = Decimal(str(d['default_commission_value']))
            except Exception: pass
        if 'default_commission_currency' in d:
            s.default_commission_currency = str(d['default_commission_currency'])
        if 'calculate_commission_on_status' in d:
            s.calculate_commission_on_status = str(d['calculate_commission_on_status'])
        if 'allow_hotel_override' in d:
            s.allow_hotel_override = bool(d['allow_hotel_override'])
        if 'no_show_policy' in d:
            s.no_show_policy = str(d['no_show_policy'])
        s.save()
        return Response(_revenue_settings_dict(s))


class HotelCommissionSettingView(APIView):
    """قراءة/تحديث إعداد العمولة الخاص بفندق. لا يُعيد احتساب العمولات القديمة (snapshot محفوظ)."""
    permission_classes = [IsPlatformOwner]

    def get(self, request, hotel_id):
        try:
            hotel = Hotel.objects.select_related('commission_setting').get(pk=hotel_id)
        except Hotel.DoesNotExist:
            return Response({'error': 'الفندق غير موجود'}, status=404)
        return Response(_hotel_commission_dict(hotel))

    def put(self, request, hotel_id):
        try:
            hotel = Hotel.objects.get(pk=hotel_id)
        except Hotel.DoesNotExist:
            return Response({'error': 'الفندق غير موجود'}, status=404)
        hc, _created = HotelCommissionSetting.objects.get_or_create(hotel=hotel)
        d = request.data
        if 'commission_enabled' in d:  hc.commission_enabled = bool(d['commission_enabled'])
        if 'commission_type' in d:     hc.commission_type = str(d['commission_type'])
        if 'commission_value' in d:
            try: hc.commission_value = Decimal(str(d['commission_value']))
            except Exception: pass
        if 'commission_currency' in d: hc.commission_currency = str(d['commission_currency'])
        if 'commission_notes' in d:    hc.commission_notes = str(d['commission_notes'])
        if 'is_active' in d:           hc.is_active = bool(d['is_active'])
        if 'effective_from' in d:
            try: hc.effective_from = _date.fromisoformat(d['effective_from']) if d['effective_from'] else None
            except Exception: pass
        if 'effective_to' in d:
            try: hc.effective_to = _date.fromisoformat(d['effective_to']) if d['effective_to'] else None
            except Exception: pass
        hc.save()
        return Response(_hotel_commission_dict(Hotel.objects.select_related('commission_setting').get(pk=hotel_id)))


class BookingCommissionActionView(APIView):
    """إجراءات على سجل عمولة: تعليم كمدفوعة/جزئية/معفاة/مستحقة + ملاحظة."""
    permission_classes = [IsPlatformOwner]

    def post(self, request, pk):
        try:
            bc = BookingCommission.objects.select_related('reservation').get(pk=pk)
        except BookingCommission.DoesNotExist:
            return Response({'error': 'سجل العمولة غير موجود'}, status=404)

        action = request.data.get('action', '')
        now = timezone.now()
        if action == 'mark_paid':
            bc.commission_status = BookingCommission.STATUS_PAID
            bc.paid_amount = bc.commission_amount
            bc.paid_at = now
        elif action == 'mark_partial':
            try: bc.paid_amount = Decimal(str(request.data.get('paid_amount', 0)))
            except Exception: bc.paid_amount = bc.paid_amount
            bc.commission_status = BookingCommission.STATUS_PARTIAL
            bc.paid_at = now
        elif action == 'waive':
            bc.commission_status = BookingCommission.STATUS_WAIVED
        elif action == 'mark_due':
            bc.commission_status = BookingCommission.STATUS_DUE
            if bc.due_at is None:
                bc.due_at = now
        if 'notes' in request.data:
            bc.notes = str(request.data['notes'])
        bc.save()
        return Response(_commission_dict(bc))


# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM WEB BOOKINGS  (كل حجوزات الموقع عبر الفنادق — لصاحب المنصة)
# ─────────────────────────────────────────────────────────────────────────────

class PlatformWebBookingsView(APIView):
    permission_classes = [IsPlatformOwner]

    def get(self, request):
        from .commissions import backfill_commissions
        backfill_commissions()

        qs = Reservation.objects.filter(public_booking=True).select_related('hotel')
        hotel_id = request.query_params.get('hotel')
        if hotel_id:
            qs = qs.filter(hotel_id=hotel_id)
        city = request.query_params.get('city')
        if city:
            qs = qs.filter(hotel__city__icontains=city)
        currency = request.query_params.get('currency')
        if currency:
            qs = qs.filter(currency=currency)
        status_f = request.query_params.get('status')
        if status_f:
            qs = qs.filter(arrival_status=status_f)
        start, end = _period_range(request)
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)

        commission_status = request.query_params.get('commission_status')
        comm_map = {c.reservation_id: c for c in BookingCommission.objects.filter(reservation__in=qs)}

        rows = []
        for r in qs.order_by('-created_at'):
            bc = comm_map.get(r.id)
            if commission_status and (not bc or bc.commission_status != commission_status):
                continue
            rows.append({
                'id': r.id,
                'public_booking_no': r.public_booking_no,
                'hotel_id': r.hotel_id,
                'hotel_name': r.hotel.name,
                'hotel_city': r.hotel.city or '',
                'guest_name': f'{r.guest_first_name} {r.guest_last_name}'.strip(),
                'guest_phone': r.guest_phone,
                'check_in_date': r.check_in_date.isoformat() if r.check_in_date else None,
                'check_out_date': r.check_out_date.isoformat() if r.check_out_date else None,
                'room_type_label': r.room_type_label,
                'total': float(r.total),
                'currency': r.currency,
                'status': r.status,
                'arrival_status': r.arrival_status,
                'payment_method': r.payment_method,
                'commission_status': bc.commission_status if bc else None,
                'commission_amount': float(bc.commission_amount) if bc else 0,
                'commission_currency': bc.commission_currency if bc else r.currency,
                'created_at': r.created_at.isoformat(),
            })

        summary = {
            'total': len(rows),
            'awaiting': sum(1 for x in rows if x['arrival_status'] == Reservation.ARRIVAL_AWAITING),
            'checked_in': sum(1 for x in rows if x['status'] == Reservation.STATUS_CHECKED_IN),
            'completed': sum(1 for x in rows if x['arrival_status'] == Reservation.ARRIVAL_COMPLETED or x['status'] == Reservation.STATUS_CHECKED_OUT),
            'cancelled': sum(1 for x in rows if x['status'] == Reservation.STATUS_CANCELLED),
            'no_show': sum(1 for x in rows if x['status'] == Reservation.STATUS_NO_SHOW),
        }

        all_pub = Reservation.objects.filter(public_booking=True)
        cities = sorted({c for c in all_pub.values_list('hotel__city', flat=True) if c})
        currencies = sorted({c for c in all_pub.values_list('currency', flat=True) if c})
        hotels = list(Hotel.objects.filter(reservations__public_booking=True).distinct().values('id', 'name'))

        return Response({
            'bookings': rows,
            'summary': summary,
            'filters': {'cities': cities, 'currencies': currencies, 'hotels': hotels},
        })


# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM NOTIFICATIONS  (إشعارات إدارية للمنصة فقط — لا إشعارات فندق)
# ─────────────────────────────────────────────────────────────────────────────

class PlatformNotificationsView(APIView):
    permission_classes = [IsPlatformOwner]

    def get(self, request):
        from .commissions import backfill_commissions
        backfill_commissions()
        today = timezone.now().date()
        items = []

        def add(key, ntype, severity, title, description, count, link):
            if count and count > 0:
                items.append({
                    'id': key, 'type': ntype, 'severity': severity,
                    'title': title, 'description': description,
                    'count': count, 'link': link,
                })

        add('sub_requests_pending', 'subscription_request', 'warning',
            'طلبات اشتراك بانتظار المراجعة', 'طلبات جديدة تحتاج موافقة أو رفض',
            SubscriptionRequest.objects.filter(status='pending').count(),
            '/platform/subscription-requests')

        add('subs_expiring', 'subscription', 'warning',
            'اشتراكات تنتهي قريبًا', 'اشتراكات ستنتهي خلال 30 يومًا',
            Subscription.objects.filter(
                status__in=['active', 'trial'], end_date__isnull=False,
                end_date__gte=today, end_date__lte=today + timezone.timedelta(days=30)).count(),
            '/platform/subscriptions')

        add('subs_expired', 'subscription', 'danger',
            'اشتراكات منتهية', 'اشتراكات انتهت صلاحيتها وتحتاج إجراءً',
            Subscription.objects.filter(status='expired').count(),
            '/platform/subscriptions')

        add('hotels_suspended', 'hotel', 'warning',
            'فنادق موقوفة', 'فنادق موقوفة تحتاج مراجعة',
            Hotel.objects.filter(status='suspended').count(),
            '/platform/hotels')

        add('web_new', 'web_booking', 'info',
            'حجوزات موقع جديدة اليوم', 'حجوزات وردت من الموقع العام اليوم',
            Reservation.objects.filter(public_booking=True, created_at__date=today).count(),
            '/platform/web-bookings')

        add('web_cancels', 'web_booking', 'info',
            'إلغاءات حجوزات من الزبائن', 'حجوزات ألغاها الزبائن خلال 7 أيام',
            Reservation.objects.filter(
                public_booking=True, arrival_status=Reservation.ARRIVAL_CANCEL_G,
                cancelled_at__date__gte=today - timezone.timedelta(days=7)).count(),
            '/platform/web-bookings')

        add('commissions_due', 'commission', 'warning',
            'عمولات مستحقة', 'عمولات بانتظار التحصيل من الفنادق',
            BookingCommission.objects.filter(
                commission_status__in=[BookingCommission.STATUS_DUE, BookingCommission.STATUS_PARTIAL]).count(),
            '/platform/earnings')

        incomplete = 0
        for h in Hotel.objects.filter(public_listing_enabled=True).prefetch_related('rooms'):
            if (not h.cover_image or not h.public_description_short or not h.city
                    or not h.rooms.filter(show_in_public=True, price__gt=0).exists()):
                incomplete += 1
        add('hotels_incomplete', 'hotel', 'warning',
            'فنادق غير مكتملة للظهور العام', 'فنادق منشورة لكن تنقصها صور أو وصف أو غرف ظاهرة',
            incomplete, '/platform/hotels')

        sev_order = {'danger': 0, 'warning': 1, 'info': 2}
        items.sort(key=lambda x: sev_order.get(x['severity'], 3))
        return Response({'notifications': items, 'total': sum(i['count'] for i in items)})
