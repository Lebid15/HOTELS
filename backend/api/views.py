import calendar as _cal
from datetime import date as _date
from decimal import Decimal

from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView as _BaseTokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.cache import cache
import secrets


def _add_months(d, months: int) -> _date:
    month = d.month - 1 + months
    year  = d.year + month // 12
    month = month % 12 + 1
    day   = min(d.day, _cal.monthrange(year, month)[1])
    return _date(year, month, day)

from .models import (
    Hotel, HotelSettings, Package, Subscription, SubscriptionRequest,
    Room, Staff, Reservation, MaintenanceTicket, UserProfile, Payment, Expense, LostFoundItem, ShiftHandover, MenuItem, FoodOrder, FolioCharge, GuestProfile, AuditLog, LoginChallenge, DayClose, HotelAgreementAcceptance, PlatformSettings,
)
from .serializers import (
    HotelSerializer, HotelSettingsSerializer, PackageSerializer, SubscriptionSerializer,
    SubscriptionRequestSerializer, RoomSerializer, StaffSerializer,
    ReservationSerializer, ReservationListSerializer, MaintenanceTicketSerializer,
    PaymentSerializer, ExpenseSerializer, LostFoundItemSerializer, ShiftHandoverSerializer,
    MenuItemSerializer, FoodOrderSerializer, FolioChargeSerializer, GuestProfileSerializer, AuditLogSerializer, DayCloseSerializer,
)
from .permissions import (
    _get_user_role, _get_user_hotel_id, IsPlatformOwner,
    RoomPermission, ReservationPermission, MaintenancePermission,
    StaffPermission, SubscriptionRequestPermission, PaymentPermission, ExpensePermission,
    LostFoundPermission, ShiftHandoverPermission, MenuItemPermission, FoodOrderPermission, FolioPermission,
    GuestProfilePermission,
)
from .audit import record_audit
from .validators import UsernameValidator

User = get_user_model()


# ── B‑1: throttling للنقاط العامة الحسّاسة ────────────────────────────────
class PublicLookupThrottle(AnonRateThrottle):
    scope = 'public_lookup'


class PublicWriteThrottle(AnonRateThrottle):
    scope = 'public_write'


class PublicBookingThrottle(AnonRateThrottle):
    scope = 'public_booking'


class LogoutView(APIView):
    """إبطال refresh token عند الخروج (B‑3) — يضعه في القائمة السوداء."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response({'error': 'حقل refresh مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            pass  # توكن منتهٍ/غير صالح أصلًا — يُعامَل كخروج ناجح
        return Response({'detail': 'تم تسجيل الخروج'}, status=status.HTTP_200_OK)


class LogoutAllView(APIView):
    """م6: تسجيل الخروج من كل الأجهزة — يضع كل توكنات التحديث القائمة للمستخدم
    في القائمة السوداء."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        n = 0
        for tok in OutstandingToken.objects.filter(user=request.user):
            _, created = BlacklistedToken.objects.get_or_create(token=tok)
            if created:
                n += 1
        _log_security('auth.logout_all', request.user.get_username(),
                      _get_user_hotel_id(request.user), actor=request.user)
        return Response({'detail': 'تم تسجيل الخروج من كل الأجهزة.', 'revoked': n})


# ── Throttles ────────────────────────────────────────────────────────────────

class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'


_LOGIN_MAX_FAILS = 5
_LOGIN_LOCK_SECONDS = 900   # 15 دقيقة


def _log_security(action, username='', hotel_id=None, actor=None):
    """د‑6: تسجيل حدث أمني في Audit Log (نجاح/فشل دخول، خروج، 2FA…)."""
    try:
        record_audit(actor, hotel_id=hotel_id, action=action,
                     entity_type='auth', entity_id=username or '',
                     summary=f'{action} · {username}'.strip(' ·'))
    except Exception:
        pass


def _shift_login_blocked(user):
    """م5: هل يُمنع دخول هذا المستخدم لأنه خارج نافذة ورديته؟
    المدير/المالك مُستثنيان دائمًا. لا منع ما لم يُفعّل الفندق الميزة وللموظف
    نافذة وردية محدّدة. تدعم الوردية العابرة لمنتصف الليل."""
    role = _get_user_role(user)
    if role in ('platform_owner', 'manager'):
        return False
    hid = _get_user_hotel_id(user)
    if not hid:
        return False
    from .models import Staff
    if not Hotel.objects.filter(id=hid, enforce_shift_login=True).exists():
        return False
    staff = Staff.objects.filter(user=user).only('shift_start', 'shift_end').first()
    if not staff or not staff.shift_start or not staff.shift_end:
        return False   # بلا نافذة محدّدة → لا منع
    now_t = timezone.localtime().time()
    s, e = staff.shift_start, staff.shift_end
    within = (s <= now_t <= e) if s <= e else (now_t >= s or now_t <= e)
    return not within


def _two_factor_required(user, hotel_id):
    """م6: هل يلزم التحقق بخطوتين لهذا المستخدم؟ = تفعيله ذاتيًّا، أو سياسة الفندق
    (إلزامي للمدير / إلزامي للجميع) تشمل دوره."""
    if getattr(getattr(user, 'profile', None), 'two_factor_enabled', False):
        return True
    if not hotel_id:
        return False
    policy = Hotel.objects.filter(id=hotel_id).values_list('two_factor_policy', flat=True).first()
    if policy == Hotel.TFA_ALL:
        return True
    if policy == Hotel.TFA_MANAGERS and _get_user_role(user) == 'manager':
        return True
    return False


class TokenObtainPairView(_BaseTokenObtainPairView):
    """JWT login مع: حدّ معدّل + قفل بعد محاولات فاشلة + تسجيل أمني + تحقّق بخطوتين اختياري (د‑6)."""
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        username = (request.data.get('username') or '').strip()
        ukey = username.lower()
        lock_key = f'login_lock:{ukey}'
        fail_key = f'login_fails:{ukey}'
        if ukey and cache.get(lock_key):
            _log_security('auth.login_locked', username)
            return Response({'detail': 'تم قفل الحساب مؤقتًا بسبب محاولات دخول فاشلة متكرّرة. حاول بعد قليل.'},
                            status=status.HTTP_423_LOCKED)
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            fails = (cache.get(fail_key) or 0) + 1
            cache.set(fail_key, fails, _LOGIN_LOCK_SECONDS)
            if fails >= _LOGIN_MAX_FAILS:
                cache.set(lock_key, True, _LOGIN_LOCK_SECONDS)
            _log_security('auth.login_failed', username)
            return Response({'detail': 'بيانات الدخول غير صحيحة.'}, status=status.HTTP_401_UNAUTHORIZED)
        cache.delete(fail_key)
        user = serializer.user
        hotel_id = _get_user_hotel_id(user)
        # م5: منع الدخول خارج نافذة الوردية (إن فعّلها الفندق) — المدير مُستثنى
        if _shift_login_blocked(user):
            _log_security('auth.shift_blocked', username, hotel_id)
            return Response({'detail': 'لا يمكنك تسجيل الدخول، أنت خارج وقت ورديتك المحددة.'},
                            status=status.HTTP_403_FORBIDDEN)
        # م6: التحقق بخطوتين — ذاتيّ أو مفروض بسياسة الفندق
        if _two_factor_required(user, hotel_id):
            LoginChallenge.objects.filter(user=user, consumed=False).update(consumed=True)
            ticket = secrets.token_urlsafe(24)
            code = f'{secrets.randbelow(1000000):06d}'
            LoginChallenge.objects.create(user=user, hotel_id=hotel_id, ticket=ticket, code=code)
            _log_security('auth.2fa_challenge', username, hotel_id)
            return Response({'2fa_required': True, 'ticket': ticket}, status=status.HTTP_200_OK)
        _log_security('auth.login_success', username, hotel_id, actor=user)
        return Response(serializer.validated_data)


class Login2FAVerifyView(APIView):
    """د‑6: التحقق من كود الخطوة الثانية وإصدار التوكنات."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        ticket = (request.data.get('ticket') or '').strip()
        code = (request.data.get('code') or '').strip()
        ch = LoginChallenge.objects.filter(ticket=ticket, consumed=False).select_related('user').first()
        if not ch:
            return Response({'detail': 'طلب غير صالح أو منتهٍ.'}, status=400)
        # صلاحية الكود 5 دقائق
        if (timezone.now() - ch.created_at).total_seconds() > 300:
            ch.consumed = True; ch.save(update_fields=['consumed'])
            return Response({'detail': 'انتهت صلاحية الكود.'}, status=400)
        if code != ch.code:
            _log_security('auth.2fa_failed', ch.user.username, ch.hotel_id)
            return Response({'detail': 'الكود غير صحيح.'}, status=400)
        ch.consumed = True; ch.save(update_fields=['consumed'])
        refresh = RefreshToken.for_user(ch.user)
        _log_security('auth.2fa_success', ch.user.username, ch.hotel_id, actor=ch.user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})


class Pending2FAView(APIView):
    """د‑6: القناة داخل النظام — المدير يرى أكواد التحقق النشطة لموظّفي فندقه."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = _get_user_role(request.user)
        from datetime import timedelta
        cutoff = timezone.now() - timedelta(minutes=5)
        qs = LoginChallenge.objects.filter(consumed=False, created_at__gte=cutoff).select_related('user')
        if role == 'platform_owner':
            pass
        elif role == 'manager':
            hid = _get_user_hotel_id(request.user)
            qs = qs.filter(hotel_id=hid)
        else:
            return Response([])
        return Response([
            {'username': c.user.username, 'code': c.code, 'created_at': c.created_at}
            for c in qs.order_by('-created_at')[:20]
        ])


class TwoFactorToggleView(APIView):
    """د‑6: تفعيل/تعطيل التحقق بخطوتين للحساب الحالي."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        enabled = bool(request.data.get('enabled'))
        profile = getattr(request.user, 'profile', None)
        if profile is None:
            return Response({'error': 'لا يوجد ملف تعريف'}, status=400)
        profile.two_factor_enabled = enabled
        profile.save(update_fields=['two_factor_enabled'])
        _log_security('auth.2fa_' + ('enabled' if enabled else 'disabled'),
                      request.user.username, _get_user_hotel_id(request.user), actor=request.user)
        return Response({'two_factor_enabled': enabled})


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

def _user_granular_permissions(user, role):
    """د‑5: صلاحيات الموظف الدقيقة. المدير/المالك = ['*'] (كل شيء).
    موظف الاستقبال = قائمة صلاحياته من سجلّ Staff المرتبط."""
    if role in ('manager', 'platform_owner'):
        return ['*']
    try:
        staff = Staff.objects.filter(user=user).values_list('permissions', flat=True).first()
        return staff if isinstance(staff, list) else []
    except Exception:
        return []


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role = _get_user_role(user)
        hotel_id = _get_user_hotel_id(user)
        hotel_name = Hotel.objects.filter(pk=hotel_id).values_list('name', flat=True).first() if hotel_id else None
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'hotel_id': hotel_id,
            'hotel_name': hotel_name,
            # د‑5: صلاحيات الموظف الدقيقة (المدير له كل الصلاحيات ضمنيًا)
            'permissions': _user_granular_permissions(user, role),
            # د‑6: حالة التحقق بخطوتين
            'two_factor_enabled': getattr(getattr(user, 'profile', None), 'two_factor_enabled', False),
            # م(عابر): بيانات البروفايل الشخصية
            'phone': getattr(getattr(user, 'profile', None), 'phone', ''),
            'avatar': getattr(getattr(user, 'profile', None), 'avatar', ''),
            'last_login': user.last_login,
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
        # م(عابر): تحديث الهاتف/الصورة على الملف الشخصي
        prof = getattr(user, 'profile', None)
        if prof is not None:
            if 'phone' in request.data:
                prof.phone = (request.data.get('phone') or '').strip()
            if 'avatar' in request.data:
                prof.avatar = request.data.get('avatar') or ''
            prof.save()
        hotel_id = _get_user_hotel_id(user)
        hotel_name = Hotel.objects.filter(pk=hotel_id).values_list('name', flat=True).first() if hotel_id else None
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': _get_user_role(user),
            'hotel_id': hotel_id,
            'hotel_name': hotel_name,
            'phone': getattr(prof, 'phone', ''),
            'avatar': getattr(prof, 'avatar', ''),
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

class HotelSettingsView(APIView):
    """م1: إعدادات تشغيل الفندق المركزية (طباعة/وثائق/تنبيهات) — مصدر خادمي واحد.
    GET يعيد الحِزم لفندق المستخدم؛ PATCH يدمج المفاتيح المُرسَلة (دمج ضحل، لا
    يمسح ما لم يُذكَر) — للمدير/مالك المنصّة فقط. الحقول المُلزَمة خادميًّا
    (أوقات/تنظيف/عرض عام) تبقى على /hotels/{id}/."""
    permission_classes = [permissions.IsAuthenticated]

    def _hotel(self, request):
        role = _get_user_role(request.user)
        if role == 'platform_owner':
            hid = request.query_params.get('hotel') or request.data.get('hotel')
            return Hotel.objects.filter(id=hid).first() if hid else None
        hid = _get_user_hotel_id(request.user)
        return Hotel.objects.filter(id=hid).first() if hid else None

    def get(self, request):
        hotel = self._hotel(request)
        if not hotel:
            return Response({'detail': 'غير مرتبط بأي فندق.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(HotelSettingsSerializer(HotelSettings.get_for(hotel)).data)

    def patch(self, request):
        if _get_user_role(request.user) not in ('platform_owner', 'manager'):
            return Response({'detail': 'هذه العملية متاحة لمدير الفندق فقط.'}, status=status.HTTP_403_FORBIDDEN)
        hotel = self._hotel(request)
        if not hotel:
            return Response({'detail': 'غير مرتبط بأي فندق.'}, status=status.HTTP_404_NOT_FOUND)
        s = HotelSettings.get_for(hotel)
        for key in ('printing', 'documents', 'notifications'):
            val = request.data.get(key)
            if isinstance(val, dict):
                setattr(s, key, {**(getattr(s, key) or {}), **val})   # دمج ضحل حفاظًا على غير المُرسَل
        s.save()
        record_audit(request.user, hotel_id=hotel.id, action='hotel.settings.update',
                     entity_type='hotel', entity_id=hotel.id, summary='تحديث إعدادات تشغيل الفندق')
        return Response(HotelSettingsSerializer(s).data)


class ShiftReportView(APIView):
    """م5: تقرير وردية موظّف — يجمع نشاط موظّف خلال يوم: الحجوزات المُنشأة،
    تسجيلات الدخول/الخروج (من سجلّ التدقيق)، المدفوعات (إجمالي + نقدي/إلكتروني/كرت)،
    وطلبات المطعم. للمدير/مالك المنصّة فقط، مقيّد بفندق المستخدم."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = _get_user_role(request.user)
        if role not in ('platform_owner', 'manager'):
            return Response({'detail': 'هذا التقرير متاح لمدير الفندق فقط.'}, status=status.HTTP_403_FORBIDDEN)
        hid = _get_user_hotel_id(request.user) if role == 'manager' else request.query_params.get('hotel')
        if not hid:
            return Response({'detail': 'غير مرتبط بأي فندق.'}, status=status.HTTP_404_NOT_FOUND)
        uid = request.query_params.get('user')
        if not uid:
            return Response({'detail': 'مُعرّف الموظف (user) مطلوب.'}, status=status.HTTP_400_BAD_REQUEST)
        d = request.query_params.get('date') or str(timezone.localdate())
        from django.db.models import Sum, Count
        pay = Payment.objects.filter(hotel_id=hid, created_by_id=uid, voided=False, created_at__date=d)
        pagg = pay.aggregate(total=Sum('amount'), cash=Sum('amount_cash'),
                             electronic=Sum('amount_electronic'), card=Sum('amount_card'), count=Count('id'))
        res_created = Reservation.objects.filter(hotel_id=hid, created_by_id=uid, created_at__date=d).count()
        food = FoodOrder.objects.filter(hotel_id=hid, created_by_id=uid, created_at__date=d).aggregate(
            total=Sum('amount'), count=Count('id'))
        acts = AuditLog.objects.filter(hotel_id=hid, actor_id=uid, created_at__date=d)
        uname = User.objects.filter(id=uid).values_list('username', flat=True).first() or ''
        return Response({
            'user_id': int(uid), 'username': uname, 'date': d,
            'reservations_created': res_created,
            'check_ins': acts.filter(action='reservation.check_in').count(),
            'check_outs': acts.filter(action__in=['reservation.check_out', 'reservation.settle_checkout']).count(),
            'payments': {
                'count': pagg['count'] or 0,
                'total': str(pagg['total'] or 0), 'cash': str(pagg['cash'] or 0),
                'electronic': str(pagg['electronic'] or 0), 'card': str(pagg['card'] or 0),
            },
            'food_orders': {'count': food['count'] or 0, 'total': str(food['total'] or 0)},
        })


class HotelDuesView(APIView):
    """م8: مستحقات المنصّة كما يراها مدير الفندق (للقراءة فقط — لا يعدّل النسبة).
    يجمع عمولات حجوزات الموقع: العدد/القيمة/العمولة/المدفوع/المتبقي + توزيع الحالة."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = _get_user_role(request.user)
        if role not in ('platform_owner', 'manager'):
            return Response({'detail': 'متاح لمدير الفندق فقط.'}, status=status.HTTP_403_FORBIDDEN)
        hid = _get_user_hotel_id(request.user) if role == 'manager' else request.query_params.get('hotel')
        if not hid:
            return Response({'detail': 'غير مرتبط بأي فندق.'}, status=status.HTTP_404_NOT_FOUND)
        from django.db.models import Sum, Count
        from .models import BookingCommission
        active = BookingCommission.objects.filter(hotel_id=hid).exclude(
            commission_status__in=[BookingCommission.STATUS_CANCELLED, BookingCommission.STATUS_WAIVED])
        agg = active.aggregate(count=Count('id'), value=Sum('calculation_base_amount'),
                               commission=Sum('commission_amount'), paid=Sum('paid_amount'))
        commission = agg['commission'] or 0
        paid = agg['paid'] or 0
        by_status = {row['commission_status']: row['n'] for row in
                     BookingCommission.objects.filter(hotel_id=hid).values('commission_status').annotate(n=Count('id'))}
        cur = BookingCommission.objects.filter(hotel_id=hid).values_list('commission_currency', flat=True).first() or ''
        return Response({
            'bookings_count': agg['count'] or 0,
            'bookings_value': str(agg['value'] or 0),
            'commission_total': str(commission),
            'paid_total': str(paid),
            'remaining': str(commission - paid),
            'currency': cur,
            'by_status': by_status,
        })


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
        obj = serializer.save()
        record_audit(self.request.user, hotel_id=obj.pk, action='hotel.create',
                     entity_type='hotel', entity_id=obj.pk, summary=f'إنشاء فندق: {obj.name}')

    def perform_update(self, serializer):
        # Platform owner can update everything. Manager may update only
        # identity/public-facing fields on their own hotel.
        role = _get_user_role(self.request.user)
        if role == 'platform_owner':
            prev_status = serializer.instance.status
            obj = serializer.save()
            if obj.status != prev_status:
                record_audit(self.request.user, hotel_id=obj.pk, action=f'hotel.status.{obj.status}',
                             entity_type='hotel', entity_id=obj.pk,
                             summary=f'تغيير حالة الفندق «{obj.name}» → {obj.get_status_display()}')
            return
        if role == 'manager':
            user_hotel_id = _get_user_hotel_id(self.request.user)
            if not user_hotel_id or str(user_hotel_id) != str(serializer.instance.id):
                raise PermissionDenied('غير مسموح بتعديل بيانات هذا الفندق.')
            allowed = {'name', 'country', 'governorate', 'city', 'address', 'phone', 'email',
                       'currency', 'logo', 'owner_name', 'website', 'food_settings',
                       'floors_count', 'cover_image', 'map_url',
                       'latitude', 'longitude',
                       # د‑8: حضور الفندق على موقع الحجز (مشروط بقبول الاتفاقية)
                       'public_listing_enabled', 'public_booking_enabled', 'web_booking_needs_confirmation',
                       'public_description_short', 'public_description_full',
                       'gallery_images', 'amenities', 'stars', 'hotel_type', 'is_featured',
                       'cancellation_policy', 'check_in_policy', 'check_out_policy',
                       'payment_policy', 'show_contact_info',
                       # م1: الحقول التشغيلية المركزية
                       'check_in_time', 'check_out_time',
                       'cleaning_mode', 'cleaning_duration_minutes',
                       'enforce_shift_login', 'two_factor_policy'}   # م5/م6
            payload = {k: v for k, v in serializer.validated_data.items() if k in allowed}
            # د‑8: لا يُفعَّل حضور الموقع/الحجوزات إلا بعد قبول اتفاقية المنصّة
            enabling = payload.get('public_booking_enabled') or payload.get('public_listing_enabled')
            if enabling and not _hotel_accepted_agreement(serializer.instance.id):
                raise ValidationError({'agreement': 'يجب قبول اتفاقية حجوزات الموقع قبل تفعيل الظهور/الحجز.'})
            serializer.save(**payload) if payload else serializer.save()
            return
        raise PermissionDenied('غير مسموح بهذه العملية.')

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
        record_audit(request.user, hotel_id=hotel.pk, action='hotel.manager_password_reset',
                     entity_type='hotel', entity_id=hotel.pk,
                     summary=f'إعادة تعيين كلمة مرور مدير «{hotel.name}»')
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
    permission_classes = [SubscriptionRequestPermission]

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
        # H‑7: منع اعتماد طلب بلا باقة (كان يُعلَّم "موافق" دون إنشاء اشتراك بصمت).
        if not req.package:
            return Response({'error': 'لا يمكن اعتماد الطلب بلا باقة محدّدة'}, status=status.HTTP_400_BAD_REQUEST)
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
        record_audit(request.user, hotel_id=req.hotel_id, action='subscription.approve',
                     entity_type='subscription_request', entity_id=req.pk,
                     summary=f'اعتماد اشتراك «{req.hotel.name}» · باقة {req.package.name} · {months} شهر')
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
        record_audit(request.user, hotel_id=req.hotel_id, action='subscription.reject',
                     entity_type='subscription_request', entity_id=req.pk,
                     summary=f'رفض طلب اشتراك «{req.hotel.name}»' + (f' · {req.rejection_reason}' if req.rejection_reason else ''))
        return Response(SubscriptionRequestSerializer(req).data)


# ── Room ViewSet ──────────────────────────────────────────────────────────────

def _auto_return_cleaned_rooms(hotel_id):
    """م1: عند cleaning_mode=auto تُعاد الغرف من «تنظيف» إلى «متاحة» بعد انقضاء
    المدة — تقييم كسول بلا cron (يُستدعى عند قراءة الغرف/التوفّر)."""
    if hotel_id is None:
        return
    hotel = Hotel.objects.filter(id=hotel_id).only('cleaning_mode', 'cleaning_duration_minutes').first()
    if not hotel or hotel.cleaning_mode != Hotel.CLEANING_AUTO:
        return
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(minutes=hotel.cleaning_duration_minutes or 0)
    Room.objects.filter(hotel_id=hotel_id, status=Room.STATUS_CLEANING,
                        cleaning_started_at__isnull=False,
                        cleaning_started_at__lte=cutoff).update(
        status=Room.STATUS_AVAILABLE, cleaning_started_at=None)


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [RoomPermission]

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.query_params.get('hotel')
        if role == 'platform_owner':
            _auto_return_cleaned_rooms(hotel_id)
            qs = Room.objects.all()
            if hotel_id:
                qs = qs.filter(hotel_id=hotel_id)
            return qs
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            return Room.objects.none()
        _auto_return_cleaned_rooms(user_hotel_id)
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

def _validate_reservation_documents(hotel_id, data):
    """م2: التحقق الخادمي من الوثائق الإلزامية للحجز المباشر (لا الواجهة فقط).

    يقرأ إعدادات الوثائق من `HotelSettings.documents` (المصدر المركزي). يُلزَم
    فقط عند تفعيل المفاتيح صراحةً (توافق خلفي: بلا إعداد → لا إلزام). يعيد قائمة
    الوثائق الناقصة (تسميات عربية) لعرضها للمستخدم."""
    cfg = (HotelSettings.get_for(Hotel.objects.get(id=hotel_id)).documents or {})
    missing = []
    if cfg.get('requireGuest') and not (data.get('guest_doc_image') or '').strip():
        missing.append('وثيقة صاحب الحجز')
    companions = data.get('companions') or []
    if cfg.get('requireCompanion') and data.get('has_companions') and not (data.get('companion_docs') or []):
        missing.append('وثائق المرافقين')
    # إثبات زواج عند وجود زوجة ضمن المرافقين
    def _has_wife():
        rel = (data.get('companion_children_relation') or '')
        if 'زوج' in rel:
            return True
        for c in companions:
            if isinstance(c, dict) and 'زوج' in str(c.get('relation', '')):
                return True
        return False
    if cfg.get('requireRelation') and _has_wife() and not (data.get('family_doc_image') or '').strip():
        missing.append('دفتر العائلة / إثبات الزواج')
    return missing


def _price_override_denied(user, room, room_price):
    """م5: تعديل سعر الغرفة يدويًّا (قيمة تختلف عن سعر الغرفة) يتطلب صلاحية
    `price.edit` لغير المدير/المالك. لا تدخّل عند غياب الغرفة أو السعر أو تساويهما."""
    if room is None or room_price is None:
        return False
    role = _get_user_role(user)
    if role in ('platform_owner', 'manager'):
        return False
    from decimal import Decimal as _D
    try:
        if _D(str(room_price)) == _D(str(room.price)):
            return False
    except Exception:
        return False
    from .models import Staff
    perms = Staff.objects.filter(user=user).values_list('permissions', flat=True).first()
    return 'price.edit' not in (perms if isinstance(perms, list) else [])


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [ReservationPermission]

    def get_serializer_class(self):
        # B‑6: القائمة بلا صور وثائق؛ التفصيل/الإنشاء/التعديل بالكامل.
        if self.action == 'list':
            return ReservationListSerializer
        return ReservationSerializer

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.query_params.get('hotel')
        # prefetch علاقات سلسلة المال (فوليو/طعام) لحساب المشتقّات بلا N+1.
        qs = Reservation.objects.select_related('room').prefetch_related('folio_charges', 'food_orders')
        if role == 'platform_owner':
            if hotel_id:
                qs = qs.filter(hotel_id=hotel_id)
        else:
            user_hotel_id = _get_user_hotel_id(self.request.user)
            if user_hotel_id is None:
                return qs.none()
            qs = qs.filter(hotel_id=user_hotel_id)
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        return qs

    def _auto_confirm_kwargs(self, serializer):
        """د‑2: الحجز المباشر (غير العام) يُؤكَّد تلقائيًا — لا يبقى «قيد الانتظار».
        يحترم الحالات الأبعد (checked_in/out) إن أُرسلت صراحةً."""
        data = serializer.validated_data
        is_public = data.get('public_booking', False)
        status_val = data.get('status', Reservation.STATUS_PENDING)
        if not is_public and status_val in ('', Reservation.STATUS_PENDING):
            return {'status': Reservation.STATUS_CONFIRMED}
        return {}

    def perform_create(self, serializer):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.data.get('hotel') or self.request.query_params.get('hotel')
        extra = self._auto_confirm_kwargs(serializer)
        if role == 'platform_owner':
            serializer.save(hotel_id=hotel_id, created_by=self.request.user, **extra)
            return
        user_hotel_id = _get_user_hotel_id(self.request.user)
        if user_hotel_id is None:
            raise PermissionDenied('غير مرتبط بأي فندق.')
        if hotel_id and str(hotel_id) != str(user_hotel_id):
            raise PermissionDenied('ليس لديك صلاحية الإنشاء في هذا الفندق.')
        # م2: إلزام الوثائق خادميًّا للحجز المباشر (يحترم إعدادات الفندق؛ الحجز العام مُستثنى)
        if not serializer.validated_data.get('public_booking', False):
            missing = _validate_reservation_documents(user_hotel_id, serializer.validated_data)
            if missing:
                raise ValidationError({'documents': missing,
                                       'detail': 'لا يكتمل الحجز قبل رفع الوثائق الإلزامية: ' + '، '.join(missing)})
        # م5: تعديل السعر يدويًّا يتطلب صلاحية خاصة
        if _price_override_denied(self.request.user, serializer.validated_data.get('room'),
                                  serializer.validated_data.get('room_price')):
            raise ValidationError({'room_price': 'تعديل السعر يدويًا يتطلب صلاحية خاصة (price.edit).'})
        serializer.save(hotel_id=user_hotel_id, created_by=self.request.user, **extra)

    def perform_update(self, serializer):
        # م5: بوّابة تعديل السعر يدويًّا عند التحديث كذلك
        if _price_override_denied(self.request.user,
                                  serializer.validated_data.get('room') or serializer.instance.room,
                                  serializer.validated_data.get('room_price')):
            raise ValidationError({'room_price': 'تعديل السعر يدويًا يتطلب صلاحية خاصة (price.edit).'})
        serializer.save()

    @action(detail=False, methods=['get'], url_path='guest_lookup')
    def guest_lookup(self, request):
        """م2/د‑2: استدعاء نزيل سابق من سجلّ الحجوزات (مصدر مركزي بدل localStorage).
        يبحث بالرقم الوطني/الجواز أو الهاتف أو **الاسم** داخل فندق المستخدم، ويعيد
        قائمة مطابقات فريدة مع **عدد الإقامات** و**آخر إقامة** لتسهيل إعادة الاستخدام
        (ومن ثمّ منع إدخال نزيل مكرّر يدويًّا)."""
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 2:
            return Response([])
        qs = self.get_queryset()
        from django.db.models import Q
        matches = qs.filter(
            Q(guest_id_number__iexact=q) | Q(guest_phone__icontains=q)
            | Q(guest_first_name__icontains=q) | Q(guest_last_name__icontains=q)
        ).order_by('-created_at')
        seen, out = set(), []
        for r in matches:
            key = (r.guest_id_number or '').lower() or f'phone:{r.guest_phone}'
            if key in seen:
                continue
            seen.add(key)
            stays = qs.filter(guest_id_number__iexact=r.guest_id_number).count() if r.guest_id_number else 1
            out.append({
                'guest_id_number': r.guest_id_number, 'guest_first_name': r.guest_first_name,
                'guest_last_name': r.guest_last_name, 'guest_phone': r.guest_phone,
                'guest_email': r.guest_email, 'guest_father_name': r.guest_father_name,
                'guest_dob': r.guest_dob, 'last_stay': r.check_in_date, 'stays_count': stays,
            })
            if len(out) >= 8:
                break
        return Response(out)

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

    @action(detail=True, methods=['post'], url_path='check_in')
    def check_in(self, request, pk=None):
        """تسجيل دخول ذرّي (مدير/استقبال) — يحدّث الحجز والغرفة معًا (B‑10)."""
        from django.db import transaction
        res = self.get_object()
        if res.status in [Reservation.STATUS_CANCELLED, Reservation.STATUS_CHECKED_OUT]:
            return Response({'error': 'لا يمكن تسجيل الدخول لهذا الحجز'}, status=400)
        with transaction.atomic():
            res.status = Reservation.STATUS_CHECKED_IN
            res.checked_in_at = timezone.now()
            res.save()
            if res.room:
                res.room.status = Room.STATUS_OCCUPIED
                res.room.save()
        _sync_commission(res)
        record_audit(request.user, hotel_id=res.hotel_id, action='reservation.check_in',
                     entity_type='reservation', entity_id=res.pk,
                     summary=f'تسجيل دخول: {res.guest_first_name} {res.guest_last_name} · حجز {res.booking_number}')
        return Response(ReservationSerializer(res).data)

    @action(detail=True, methods=['post'], url_path='check_out')
    def check_out(self, request, pk=None):
        """تسجيل خروج ذرّي — يحدّث الحجز ويحوّل الغرفة إلى تنظيف (B‑10)."""
        from django.db import transaction
        res = self.get_object()
        if res.status != Reservation.STATUS_CHECKED_IN:
            return Response({'error': 'لا يمكن تسجيل الخروج قبل تسجيل الدخول'}, status=400)
        # د‑3: منع الخروج عند وجود دين (فوليو غير مسوّى / طعام على الغرفة / رصيد غرفة) — مُلزَم خادمًا.
        balance = _reservation_balance_due(res)
        if balance > 0:
            return Response({
                'error': 'لا يمكن تسجيل الخروج قبل تسوية الرصيد المستحق.',
                'code': 'balance_due',
                'balance_due': str(balance), 'currency': res.currency,
            }, status=status.HTTP_402_PAYMENT_REQUIRED)
        with transaction.atomic():
            res.status = Reservation.STATUS_CHECKED_OUT
            res.save()
            if res.room and res.room.status != Room.STATUS_MAINTENANCE:
                res.room.status = Room.STATUS_CLEANING
                res.room.cleaning_started_at = timezone.now()   # م1: بدء عدّاد التنظيف
                res.room.save()
        _sync_commission(res)
        record_audit(request.user, hotel_id=res.hotel_id, action='reservation.check_out',
                     entity_type='reservation', entity_id=res.pk,
                     summary=f'تسجيل خروج: {res.guest_first_name} {res.guest_last_name} · حجز {res.booking_number}')
        return Response(ReservationSerializer(res).data)

    @action(detail=True, methods=['post'], url_path='settle_and_checkout')
    def settle_and_checkout(self, request, pk=None):
        """د‑3: «دفع وإغلاق الحساب» ذرّيًا ثم تسجيل الخروج — مصدر واحد لإغلاق الذمّة.
        يُسجّل دفعة الغرفة، يسوّي الفوليو، يعلّم طلبات الطعام على الغرفة كمدفوعة، ثم يُخرج."""
        from django.db import transaction
        res = self.get_object()
        if res.status != Reservation.STATUS_CHECKED_IN:
            return Response({'error': 'لا يمكن تسجيل الخروج قبل تسجيل الدخول'}, status=400)
        from decimal import Decimal as _D
        method = request.data.get('method', Payment.METHOD_CASH)
        cash = _D(str(request.data.get('amount_cash') or 0))
        elec = _D(str(request.data.get('amount_electronic') or 0))
        card = _D(str(request.data.get('amount_card') or 0))
        split_sum = cash + elec + card
        with transaction.atomic():
            room_bal = (res.total or 0) - (res.paid or 0)
            if room_bal > 0:
                if split_sum > 0:   # م3: دفع مختلط — تفصيل نقدي/إلكتروني/كرت
                    nonzero = sum(1 for x in (cash, elec, card) if x)
                    m = (Payment.METHOD_MIXED if nonzero > 1
                         else Payment.METHOD_CASH if cash
                         else Payment.METHOD_ELECTRONIC if elec else Payment.METHOD_CARD)
                    Payment.objects.create(hotel_id=res.hotel_id, reservation=res, amount=split_sum,
                                           amount_cash=cash, amount_electronic=elec, amount_card=card,
                                           currency=res.currency, method=m, source='booking',
                                           created_by=request.user)
                else:
                    Payment.objects.create(hotel_id=res.hotel_id, reservation=res, amount=room_bal,
                                           currency=res.currency, method=method, source='booking',
                                           created_by=request.user)
            res.folio_charges.filter(settled=False, voided=False).update(settled=True)   # م1: لا تمسّ المبطلة
            # د‑4: تسوية جزء حساب الغرفة لطلبات الطعام (بدل تعديل وسيلة الدفع)
            res.food_orders.exclude(status=FoodOrder.STATUS_CANCELLED).filter(
                room_settled=False).update(room_settled=True)
            _recompute_reservation_paid(res)
            res.refresh_from_db()
            res.status = Reservation.STATUS_CHECKED_OUT
            res.save()
            if res.room and res.room.status != Room.STATUS_MAINTENANCE:
                res.room.status = Room.STATUS_CLEANING
                res.room.cleaning_started_at = timezone.now()   # م1: بدء عدّاد التنظيف
                res.room.save()
        _sync_commission(res)
        record_audit(request.user, hotel_id=res.hotel_id, action='reservation.settle_checkout',
                     entity_type='reservation', entity_id=res.pk,
                     summary=f'دفع وإغلاق حساب + خروج: {res.guest_first_name} {res.guest_last_name} · حجز {res.booking_number}')
        return Response(ReservationSerializer(res).data)


# ── Staff ViewSet ─────────────────────────────────────────────────────────────

class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [StaffPermission]

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

    def _provision_login(self, staff, username, password):
        """د‑5: إنشاء حساب دخول حقيقي للموظف (User + UserProfile بدور reception)."""
        username = (username or '').strip()
        password = password or ''
        if not username or not password:
            return
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError({'username': 'اسم المستخدم مستخدم مسبقًا.'})
        try:
            validate_password(password, User(username=username))
        except DjangoValidationError as e:
            raise ValidationError({'password': list(e.messages)})
        u = User.objects.create_user(username=username, password=password, email=staff.email or '')
        u.is_active = (staff.status == Staff.STATUS_ACTIVE)
        u.save()
        UserProfile.objects.update_or_create(
            user=u, defaults={'role': UserProfile.ROLE_RECEPTION, 'hotel_id': staff.hotel_id})
        staff.user = u
        staff.save(update_fields=['user'])

    def perform_create(self, serializer):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.data.get('hotel') or self.request.query_params.get('hotel')
        if role == 'platform_owner':
            staff = serializer.save(hotel_id=hotel_id)
        else:
            user_hotel_id = _get_user_hotel_id(self.request.user)
            if user_hotel_id is None:
                raise PermissionDenied('غير مرتبط بأي فندق.')
            if hotel_id and str(hotel_id) != str(user_hotel_id):
                raise PermissionDenied('ليس لديك صلاحية الإنشاء في هذا الفندق.')
            staff = serializer.save(hotel_id=user_hotel_id)
        self._provision_login(staff, self.request.data.get('username'), self.request.data.get('password'))
        record_audit(self.request.user, hotel_id=staff.hotel_id, action='staff.create',
                     entity_type='staff', entity_id=staff.pk,
                     summary=f'إضافة موظف: {staff.full_name} ({staff.get_role_display()})')

    def perform_update(self, serializer):
        staff = serializer.save()
        # مزامنة حالة الحساب: موقوف/مؤرشف → تعطيل الدخول
        if staff.user_id:
            active = (staff.status == Staff.STATUS_ACTIVE)
            if staff.user.is_active != active:
                staff.user.is_active = active
                staff.user.save(update_fields=['is_active'])

    @action(detail=True, methods=['post'], url_path='set_password')
    def set_password(self, request, pk=None):
        """د‑5: تعيين/إعادة تعيين كلمة مرور حساب الموظف (أو إنشاؤه إن لم يوجد)."""
        staff = self.get_object()
        password = request.data.get('password', '')
        if not password:
            return Response({'error': 'كلمة المرور مطلوبة'}, status=400)
        if not staff.user_id:
            username = request.data.get('username', '')
            self._provision_login(staff, username, password)
            return Response({'message': 'تم إنشاء حساب الموظف'})
        try:
            validate_password(password, staff.user)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=400)
        staff.user.set_password(password)
        staff.user.save()
        record_audit(request.user, hotel_id=staff.hotel_id, action='staff.password_reset',
                     entity_type='staff', entity_id=staff.pk, summary=f'إعادة تعيين كلمة مرور: {staff.full_name}')
        return Response({'message': 'تم تحديث كلمة المرور'})


# ── Maintenance Ticket ViewSet ────────────────────────────────────────────────

class MaintenanceTicketViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceTicketSerializer
    permission_classes = [MaintenancePermission]

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


# ── Payment / Expense ViewSets (سلسلة المال) ─────────────────────────────────

def _recompute_reservation_paid(reservation):
    """سلسلة المال: المبلغ المدفوع للحجز = مجموع دفعاته (قيمة مشتقّة تُحدَّث ذرّيًا)."""
    if reservation is None:
        return
    total = reservation.payments.filter(voided=False).aggregate(s=Sum('amount'))['s'] or 0
    Reservation.objects.filter(pk=reservation.pk).update(paid=total)


def _reservation_balance_due(res):
    """د‑3/د‑4: الدين المتبقّي = رصيد الغرفة + الفوليو غير المسوّى + جزء الطعام على حساب الغرفة.
    نفس منطق المشتقّ في الـSerializer — يُستخدم لإلزام منع الخروج بالدين خادمًا."""
    from decimal import Decimal
    from .serializers import ReservationSerializer
    folio_out = sum((c.amount for c in res.folio_charges.all() if not c.settled and not c.voided), Decimal('0'))
    food_out = sum((ReservationSerializer._food_room_charge(o) for o in res.food_orders.all()), Decimal('0'))
    room_bal = (res.total or Decimal('0')) - (res.paid or Decimal('0'))
    return room_bal + folio_out + food_out


def _compute_day_snapshot(hotel_id, day):
    """د‑7: يحسب فحوصات وأرقام إغلاق اليوم (لقطة). يُستخدم للمعاينة وللإغلاق الفعلي."""
    from decimal import Decimal
    res_qs = Reservation.objects.filter(hotel_id=hotel_id).prefetch_related('folio_charges', 'food_orders')
    arrivals_due = res_qs.filter(check_in_date=day, status=Reservation.STATUS_CONFIRMED).count()
    departures_due = res_qs.filter(check_out_date=day, status=Reservation.STATUS_CHECKED_IN).count()
    in_house = res_qs.filter(status=Reservation.STATUS_CHECKED_IN)
    in_house_count = in_house.count()
    unpaid = [r for r in in_house if _reservation_balance_due(r) > 0]
    unpaid_total = sum((_reservation_balance_due(r) for r in unpaid), Decimal('0'))
    rooms_cleaning = Room.objects.filter(hotel_id=hotel_id, status=Room.STATUS_CLEANING).count()
    rooms_maint = Room.objects.filter(hotel_id=hotel_id, status=Room.STATUS_MAINTENANCE).count()
    # مدفوعات اليوم حسب الطريقة (م6: تُستثنى الملغاة)
    pays = Payment.objects.filter(hotel_id=hotel_id, created_at__date=day, voided=False)
    by_method = {}
    for p in pays:
        by_method[p.method] = float(by_method.get(p.method, 0)) + float(p.amount or 0)
    payments_total = float(pays.aggregate(s=Sum('amount'))['s'] or 0)
    food_sales = float(FoodOrder.objects.filter(hotel_id=hotel_id, created_at__date=day)
                       .exclude(status=FoodOrder.STATUS_CANCELLED).aggregate(s=Sum('amount'))['s'] or 0)
    # أخطاء تمنع الإغلاق النظيف
    blocking = []
    if arrivals_due:
        blocking.append({'code': 'arrivals_pending', 'count': arrivals_due})
    if departures_due:
        blocking.append({'code': 'departures_pending', 'count': departures_due})
    if unpaid:
        blocking.append({'code': 'unpaid_folios', 'count': len(unpaid), 'amount': float(unpaid_total)})
    return {
        'business_date': str(day),
        'arrivals_due': arrivals_due,
        'departures_due': departures_due,
        'in_house': in_house_count,
        'unpaid_folios': len(unpaid),
        'unpaid_total': float(unpaid_total),
        'rooms_cleaning': rooms_cleaning,
        'rooms_maintenance': rooms_maint,
        'payments_total': payments_total,
        'payments_by_method': by_method,
        'food_sales': food_sales,
        'blocking': blocking,
        'can_close_clean': len(blocking) == 0,
    }


class DayCloseViewSet(viewsets.ModelViewSet):
    """د‑7: إغلاق اليوم الحقيقي — معاينة الفحوصات ثم الإغلاق المُخزَّن (بصلاحية المدير)."""
    serializer_class = DayCloseSerializer
    permission_classes = [ExpensePermission]   # مدير كامل، الاستقبال قراءة فقط

    def get_queryset(self):
        role = _get_user_role(self.request.user)
        qs = DayClose.objects.all()
        if role == 'platform_owner':
            hid = self.request.query_params.get('hotel')
            return qs.filter(hotel_id=hid) if hid else qs
        uid = _get_user_hotel_id(self.request.user)
        return qs.filter(hotel_id=uid) if uid else qs.none()

    def _hotel_id(self):
        role = _get_user_role(self.request.user)
        if role == 'platform_owner':
            return self.request.data.get('hotel') or self.request.query_params.get('hotel')
        return _get_user_hotel_id(self.request.user)

    @action(detail=False, methods=['get'], url_path='preview')
    def preview(self, request):
        hid = self._hotel_id()
        if not hid:
            return Response({'error': 'الفندق غير محدّد'}, status=400)
        day = request.query_params.get('date') or str(timezone.localdate())
        return Response(_compute_day_snapshot(hid, day))

    def create(self, request, *args, **kwargs):
        hid = self._hotel_id()
        if not hid:
            return Response({'error': 'الفندق غير محدّد'}, status=400)
        day = request.data.get('date') or str(timezone.localdate())
        snapshot = _compute_day_snapshot(hid, day)
        # م7: إغلاق يوم حقيقي — يُمنع عند وجود أخطاء ما لم يُجبِره المدير صراحةً (force)
        force = str(request.data.get('force', '')).lower() in ('1', 'true', 'yes')
        if snapshot['blocking'] and not force:
            return Response({'error': 'لا يمكن إغلاق اليوم قبل معالجة الأخطاء التالية (أو الإغلاق القسري).',
                             'code': 'blocking', 'blocking': snapshot['blocking'], 'snapshot': snapshot},
                            status=status.HTTP_409_CONFLICT)
        obj, _created = DayClose.objects.update_or_create(
            hotel_id=hid, business_date=day,
            defaults={'closed_by': request.user, 'closed_by_name': request.user.get_username(),
                      'snapshot': snapshot, 'notes': request.data.get('notes', '')})
        record_audit(request.user, hotel_id=hid, action='day.close',
                     entity_type='day_close', entity_id=obj.pk, summary=f'إغلاق يوم {day}')
        return Response(DayCloseSerializer(obj).data, status=status.HTTP_201_CREATED)


class _HotelScopedViewSet(viewsets.ModelViewSet):
    """أساس مشترك: تصفية حسب فندق المستخدم + ضبط الفندق من المستخدم عند الإنشاء."""
    def get_queryset(self):
        role = _get_user_role(self.request.user)
        hotel_id = self.request.query_params.get('hotel')
        qs = self.queryset
        if role == 'platform_owner':
            return qs.filter(hotel_id=hotel_id) if hotel_id else qs
        uid = _get_user_hotel_id(self.request.user)
        return qs.filter(hotel_id=uid) if uid is not None else qs.none()

    def _resolve_hotel_id(self):
        role = _get_user_role(self.request.user)
        if role == 'platform_owner':
            return self.request.data.get('hotel') or self.request.query_params.get('hotel')
        uid = _get_user_hotel_id(self.request.user)
        if uid is None:
            raise PermissionDenied('غير مرتبط بأي فندق.')
        body_hotel = self.request.data.get('hotel')
        if body_hotel and str(body_hotel) != str(uid):
            raise PermissionDenied('ليس لديك صلاحية الإنشاء في هذا الفندق.')
        return uid


class PaymentViewSet(_HotelScopedViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [PaymentPermission]
    queryset = Payment.objects.select_related('reservation', 'created_by')
    http_method_names = ['get', 'post', 'head', 'options']   # م6: لا حذف/تعديل مالي مباشر

    def perform_create(self, serializer):
        hotel_id = self._resolve_hotel_id()
        res = serializer.validated_data.get('reservation')
        if res is not None and str(res.hotel_id) != str(hotel_id):
            raise PermissionDenied('الحجز لا يخصّ هذا الفندق.')
        obj = serializer.save(hotel_id=hotel_id, created_by=self.request.user)
        _recompute_reservation_paid(obj.reservation)
        record_audit(self.request.user, hotel_id=hotel_id, action='payment.create',
                     entity_type='payment', entity_id=obj.pk,
                     summary=f'دفعة {obj.amount} {obj.currency} · {obj.method}')

    @action(detail=True, methods=['post'], url_path='void')
    def void(self, request, pk=None):
        """م6: إبطال الدفعة (بدل الحذف) — سبب إلزامي + تسجيل تدقيق + إعادة احتساب."""
        from django.db import transaction
        pay = self.get_object()
        if pay.voided:
            return Response({'error': 'الدفعة ملغاة بالفعل'}, status=400)
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'سبب الإبطال مطلوب'}, status=400)
        with transaction.atomic():
            pay.voided = True
            pay.voided_at = timezone.now()
            pay.voided_by = request.user
            pay.void_reason = reason
            pay.save()
            _recompute_reservation_paid(pay.reservation)
        record_audit(request.user, hotel_id=pay.hotel_id, action='payment.void',
                     entity_type='payment', entity_id=pay.pk,
                     summary=f'إبطال دفعة {pay.amount} {pay.currency} · السبب: {reason}')
        return Response(PaymentSerializer(pay).data)


class ExpenseViewSet(_HotelScopedViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [ExpensePermission]
    queryset = Expense.objects.select_related('created_by')
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']   # م6: لا حذف (يُستبدَل بإبطال)

    def perform_create(self, serializer):
        serializer.save(hotel_id=self._resolve_hotel_id(), created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='void')
    def void(self, request, pk=None):
        """م6: إبطال مصروف (بدل الحذف) — سبب إلزامي + تسجيل تدقيق."""
        exp = self.get_object()
        if exp.voided:
            return Response({'error': 'المصروف ملغى بالفعل'}, status=400)
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'سبب الإبطال مطلوب'}, status=400)
        exp.voided = True
        exp.voided_at = timezone.now()
        exp.voided_by = request.user
        exp.void_reason = reason
        exp.save()
        record_audit(request.user, hotel_id=exp.hotel_id, action='expense.void',
                     entity_type='expense', entity_id=exp.pk,
                     summary=f'إبطال مصروف {exp.amount} {exp.currency} · السبب: {reason}')
        return Response(ExpenseSerializer(exp).data)


class LostFoundViewSet(_HotelScopedViewSet):
    serializer_class = LostFoundItemSerializer
    permission_classes = [LostFoundPermission]
    queryset = LostFoundItem.objects.select_related('created_by')

    def perform_create(self, serializer):
        serializer.save(hotel_id=self._resolve_hotel_id(), created_by=self.request.user)


class ShiftHandoverViewSet(_HotelScopedViewSet):
    serializer_class = ShiftHandoverSerializer
    permission_classes = [ShiftHandoverPermission]
    queryset = ShiftHandover.objects.select_related('created_by')

    def perform_create(self, serializer):
        serializer.save(hotel_id=self._resolve_hotel_id(), created_by=self.request.user)


class MenuItemViewSet(_HotelScopedViewSet):
    serializer_class = MenuItemSerializer
    permission_classes = [MenuItemPermission]
    queryset = MenuItem.objects.all()

    def perform_create(self, serializer):
        serializer.save(hotel_id=self._resolve_hotel_id())


class FoodOrderViewSet(_HotelScopedViewSet):
    serializer_class = FoodOrderSerializer
    permission_classes = [FoodOrderPermission]
    queryset = FoodOrder.objects.select_related('created_by')

    def perform_create(self, serializer):
        hotel_id = self._resolve_hotel_id()
        # د‑4: بلا موظف مطعم مستقل → الطلب يُعتبر مُسلَّمًا مباشرة (لا مراحل تجهيز/تسليم).
        extra = {}
        fs = Hotel.objects.filter(id=hotel_id).values_list('food_settings', flat=True).first() or {}
        if not fs.get('dedicated_staff', False):
            extra['status'] = FoodOrder.STATUS_DELIVERED
            extra['delivered_at'] = timezone.now()
        serializer.save(hotel_id=hotel_id, created_by=self.request.user, **extra)


class FolioChargeViewSet(_HotelScopedViewSet):
    serializer_class = FolioChargeSerializer
    permission_classes = [FolioPermission]
    queryset = FolioCharge.objects.select_related('created_by', 'voided_by')
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']   # م1: لا حذف نهائي (يُستبدَل بإبطال)

    def perform_create(self, serializer):
        serializer.save(hotel_id=self._resolve_hotel_id(), created_by=self.request.user)

    def perform_update(self, serializer):
        # م1: لا يُعدَّل رسمٌ مبطل
        if serializer.instance.voided:
            raise ValidationError({'detail': 'لا يمكن تعديل رسم مبطل.'})
        serializer.save()

    @action(detail=True, methods=['post'], url_path='void')
    def void(self, request, pk=None):
        """م1: إبطال رسم الفوليو (بدل الحذف) — سبب إلزامي + تسجيل تدقيق.
        يُستثنى المبطل من حساب الرصيد المستحق ولا يُحذف من النظام."""
        charge = self.get_object()   # get_queryset مُقيَّد بفندق المستخدم (عزل المستأجرين)
        if charge.voided:
            return Response({'error': 'الرسم ملغى بالفعل'}, status=400)
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'سبب الإبطال مطلوب'}, status=400)
        charge.voided = True
        charge.voided_at = timezone.now()
        charge.voided_by = request.user
        charge.void_reason = reason
        charge.save()
        record_audit(request.user, hotel_id=charge.hotel_id, action='folio_charge.void',
                     entity_type='folio_charge', entity_id=charge.pk,
                     summary=f'إبطال رسم فوليو {charge.amount} {charge.currency} · حجز {charge.booking_number or "—"} · السبب: {reason}')
        return Response(FolioChargeSerializer(charge).data)


class GuestProfileViewSet(_HotelScopedViewSet):
    """أعلام/ملاحظات النزلاء — POST يعمل upsert حسب (الفندق، مفتاح النزيل)."""
    serializer_class = GuestProfileSerializer
    permission_classes = [GuestProfilePermission]
    queryset = GuestProfile.objects.all()

    def create(self, request, *args, **kwargs):
        hotel_id = self._resolve_hotel_id()
        gk = (request.data.get('guest_key') or '').strip()
        if not gk:
            return Response({'error': 'guest_key مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        obj, _ = GuestProfile.objects.update_or_create(
            hotel_id=hotel_id, guest_key=gk,
            defaults={'flag': request.data.get('flag', 'normal'), 'notes': request.data.get('notes', '')},
        )
        return Response(GuestProfileSerializer(obj).data, status=status.HTTP_201_CREATED)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """سجلّ التدقيق — للقراءة فقط (append‑only). مُعزّل بالدور:
    - مالك المنصّة: كل السجلّات (مع فلتر ?hotel= اختياري).
    - مدير الفندق: سجلّات فندقه فقط.
    - الاستقبال/بلا دور: لا وصول.
    يدعم فلاتر ?action= و ?entity_type=.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        role = _get_user_role(u)
        qs = AuditLog.objects.select_related('hotel')
        if role == 'platform_owner':
            hid = self.request.query_params.get('hotel')
            if hid:
                qs = qs.filter(hotel_id=hid)
        elif role == 'manager':
            uid = _get_user_hotel_id(u)
            if uid is None:
                return AuditLog.objects.none()
            qs = qs.filter(hotel_id=uid)
        else:
            return AuditLog.objects.none()
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        etype = self.request.query_params.get('entity_type')
        if etype:
            qs = qs.filter(entity_type=etype)
        return qs[:500]  # حدّ أعلى للحماية من الحمل


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC WEBSITE API  (no authentication required)
# ─────────────────────────────────────────────────────────────────────────────

from django.db import transaction as _transaction
from .serializers import PublicHotelCardSerializer, PublicHotelDetailSerializer, PublicBookingDetailSerializer


def _public_hotels_qs():
    """المرحلة 2 (ضبط الظهور العام) — مصدر مركزي واحد لشروط ظهور الفندق للعامّة.
    لا يظهر الفندق إلا إذا تحقّقت **كل** الشروط:
      1) الحالة = فعّال (تلقائيًا: غير موقوف من المنصّة وغير مؤرشف)
      2) `public_listing_enabled` مفعّل
      3) بيانات أساسية مكتملة (اسم + مدينة)
      4) اشتراك فعّال/تجريبي، باقته تسمح بالظهور، وغير منتهٍ
    يُستخدم في قائمة/تفاصيل الفنادق + التوفّر + التقييمات (لا يظهر ما هو مخفيّ)."""
    today = timezone.localdate()
    return (
        Hotel.objects
        .filter(status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        .exclude(name='').exclude(city='')
        .filter(subscription__status__in=[Subscription.STATUS_ACTIVE, Subscription.STATUS_TRIAL],
                subscription__package__allow_public_listing=True)
        .filter(Q(subscription__end_date__isnull=True) | Q(subscription__end_date__gte=today))
        .select_related('subscription', 'subscription__package')
        .distinct()
    )


def _get_bookable_hotel(hotel_id):
    """م3: الفندق يقبل حجزًا عامًّا فقط إذا: فعّال + `public_booking_enabled` +
    اشتراك فعّال/تجريبي غير منتهٍ + باقته تسمح باستقبال حجوزات الموقع."""
    today = timezone.localdate()
    return (
        Hotel.objects
        .filter(pk=hotel_id, status=Hotel.STATUS_ACTIVE, public_booking_enabled=True)
        .filter(subscription__status__in=[Subscription.STATUS_ACTIVE, Subscription.STATUS_TRIAL],
                subscription__package__allow_public_booking=True)
        .filter(Q(subscription__end_date__isnull=True) | Q(subscription__end_date__gte=today))
        .first()
    )


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
        # H‑1: الـslug يُضبط لحظة حفظ الفندق — لا حاجة لتوليده هنا (بلا كتابة داخل القراءة).
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
    throttle_classes = [PublicBookingThrottle]

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

        # م3: بوّابة أهلية الفندق (فعّال + حجز مفعّل + اشتراك صالح يسمح بالحجز)
        hotel = _get_bookable_hotel(hotel_id)
        if hotel is None:
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
                manage_token=secrets.token_urlsafe(24),   # م3: رمز إدارة آمن
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


def _resolve_public_reservation(booking_no, token='', phone='', extra_select=()):
    """م3: يُرجع الحجز العام عبر (رقم + رمز إدارة آمن) — المسار القوي — أو
    (رقم + هاتف) كتوافق خلفي. الرمز الآمن يمنع التخمين برقم الحجز والهاتف فقط."""
    if not booking_no:
        return None
    qs = Reservation.objects.filter(public_booking_no=booking_no, public_booking=True)
    if extra_select:
        qs = qs.select_related(*extra_select)
    if token:
        return qs.filter(manage_token=token).first()
    if phone:
        return qs.filter(guest_phone=phone).first()
    return None


class PublicBookingManageView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicLookupThrottle]

    def get(self, request):
        booking_no = request.query_params.get('no', '').strip()
        token      = request.query_params.get('token', '').strip()
        phone      = request.query_params.get('phone', '').strip()
        if not booking_no or (not token and not phone):
            return Response({'error': 'يرجى إدخال رقم الحجز مع رمز الإدارة أو رقم الهاتف'}, status=400)
        res = _resolve_public_reservation(booking_no, token, phone, extra_select=('hotel',))
        if res is None:
            return Response({'error': 'لم يتم العثور على حجز مطابق'}, status=404)
        return Response(PublicBookingDetailSerializer(res).data)


class PublicBookingCancelView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicWriteThrottle]

    def post(self, request, booking_no):
        token  = (request.data.get('token') or '').strip()
        phone  = (request.data.get('phone') or '').strip()
        reason = (request.data.get('reason') or '').strip()
        if not token and not phone:
            return Response({'error': 'رمز الإدارة أو رقم الهاتف مطلوب للتحقق'}, status=400)
        res = _resolve_public_reservation(booking_no, token, phone, extra_select=('room',))
        if res is None:
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
        from .models import PlatformSettings
        s = PlatformSettings.get_solo()
        return Response({
            'name': s.site_name or 'funduqii',
            'description': s.subtitle or 'نظام إدارة الفنادق',
            'default_country': s.default_country or 'سوريا',
            'logo_url': s.logo_url,
        })


class PlatformSettingsView(APIView):
    """هوية المنصّة الديناميكية — قراءة/تحديث من لوحة صاحب المنصّة (بدل localStorage)."""
    permission_classes = [IsPlatformOwner]

    def get(self, request):
        from .models import PlatformSettings
        from .serializers import PlatformSettingsSerializer
        return Response(PlatformSettingsSerializer(PlatformSettings.get_solo()).data)

    def put(self, request):
        from .models import PlatformSettings
        from .serializers import PlatformSettingsSerializer
        s = PlatformSettings.get_solo()
        ser = PlatformSettingsSerializer(s, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


def _agreement_state(hotel_id):
    """د‑8: حالة اتفاقية حجوزات الموقع للفندق (النصّ/النسخة الحالية + هل قُبِلت)."""
    s = PlatformSettings.get_solo()
    accepted = None
    if hotel_id:
        accepted = HotelAgreementAcceptance.objects.filter(
            hotel_id=hotel_id, version=s.agreement_version).first()
    return {
        'text': s.web_booking_agreement,
        'version': s.agreement_version,
        'accepted': accepted is not None,
        'accepted_at': accepted.accepted_at if accepted else None,
        'accepted_by_name': accepted.accepted_by_name if accepted else '',
    }


def _hotel_accepted_agreement(hotel_id):
    s = PlatformSettings.get_solo()
    if not (s.web_booking_agreement or '').strip():
        return True   # لا اتفاقية مضبوطة → لا حجب
    return HotelAgreementAcceptance.objects.filter(hotel_id=hotel_id, version=s.agreement_version).exists()


class WebBookingAgreementView(APIView):
    """د‑8: اتفاقية تفعيل حجوزات الموقع — عرض للمدير + قبولها لفندقه."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = _get_user_role(request.user)
        hid = _get_user_hotel_id(request.user) if role == 'manager' else request.query_params.get('hotel')
        return Response(_agreement_state(hid))

    def post(self, request):
        if _get_user_role(request.user) != 'manager':
            raise PermissionDenied('قبول الاتفاقية من صلاحية مدير الفندق.')
        hid = _get_user_hotel_id(request.user)
        if not hid:
            raise PermissionDenied('غير مرتبط بأي فندق.')
        s = PlatformSettings.get_solo()
        obj, _ = HotelAgreementAcceptance.objects.update_or_create(
            hotel_id=hid, version=s.agreement_version,
            defaults={'accepted_by': request.user, 'accepted_by_name': request.user.get_username(),
                      'agreement_text': s.web_booking_agreement})
        record_audit(request.user, hotel_id=hid, action='agreement.accept',
                     entity_type='agreement', entity_id=obj.pk,
                     summary=f'قبول اتفاقية حجوزات الموقع v{s.agreement_version}')
        return Response(_agreement_state(hid), status=status.HTTP_201_CREATED)


class PublicHotelRatingsView(APIView):
    """GET: قائمة تقييمات فندق + متوسط + توزيع النجوم.
    POST: إضافة تقييم جديد (يتطلّب رقم حجز + هاتف يطابقان حجزاً صحيحاً)."""
    permission_classes = [permissions.AllowAny]

    def get_throttles(self):
        # التقييم (POST) محدود لمنع الإغراق؛ قراءة القائمة (GET) حرّة.
        return [PublicWriteThrottle()] if self.request.method == 'POST' else []

    def _get_hotel(self, slug):
        qs = _public_hotels_qs()
        try:
            return qs.get(pk=int(slug)) if slug.isdigit() else qs.get(slug=slug)
        except (Hotel.DoesNotExist, ValueError):
            return None

    def get(self, request, slug):
        from django.db.models import Avg
        from .models import HotelRating
        from .serializers import PublicHotelRatingSerializer
        hotel = self._get_hotel(slug)
        if not hotel:
            return Response({'error': 'الفندق غير متاح'}, status=404)
        qs = HotelRating.objects.filter(hotel=hotel, is_approved=True).order_by('-created_at')
        avg = qs.aggregate(a=Avg('rating'))['a']
        distribution = {i: qs.filter(rating=i).count() for i in range(1, 6)}
        return Response({
            'avg': round(float(avg), 2) if avg is not None else None,
            'count': qs.count(),
            'distribution': distribution,
            'items': PublicHotelRatingSerializer(qs[:50], many=True).data,
        })

    def post(self, request, slug):
        from .models import HotelRating
        hotel = self._get_hotel(slug)
        if not hotel:
            return Response({'error': 'الفندق غير متاح'}, status=404)
        d = request.data
        booking_no = (d.get('booking_no') or '').strip()
        phone      = (d.get('phone') or '').strip()
        try:
            rating = int(d.get('rating') or 0)
        except (TypeError, ValueError):
            rating = 0
        comment = (d.get('comment') or '').strip()
        if not booking_no or not phone:
            return Response({'error': 'يرجى إدخال رقم الحجز ورقم الهاتف'}, status=400)
        if rating < 1 or rating > 5:
            return Response({'error': 'التقييم يجب أن يكون بين 1 و 5'}, status=400)
        try:
            reservation = Reservation.objects.get(
                hotel=hotel, public_booking_no=booking_no,
                guest_phone=phone, public_booking=True,
            )
        except Reservation.DoesNotExist:
            return Response({'error': 'لم يتم العثور على حجز مطابق لهذا الفندق'}, status=404)
        if reservation.status == Reservation.STATUS_CANCELLED:
            return Response({'error': 'لا يمكن تقييم حجز ملغى'}, status=400)
        if HotelRating.objects.filter(reservation=reservation).exists():
            return Response({'error': 'تم تقييم هذا الحجز مسبقاً'}, status=400)
        guest_name = f'{reservation.guest_first_name} {reservation.guest_last_name}'.strip()
        HotelRating.objects.create(
            hotel=hotel, reservation=reservation,
            guest_name=guest_name, guest_phone=phone,
            rating=rating, comment=comment,
        )
        return Response({'message': 'تم استلام تقييمك، شكراً لك!'}, status=201)


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
        from .commissions import EARNED_STATUSES
        # H‑1: العمولات تُنشأ عند حدث الحجز؛ لا backfill عند القراءة (استخدم أمر backfill_commissions).

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
        from .commissions import EARNED_STATUSES
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
        if action in ('mark_paid', 'mark_partial', 'waive', 'mark_due'):
            record_audit(request.user, hotel_id=bc.reservation.hotel_id if bc.reservation_id else None,
                         action=f'commission.{action}', entity_type='commission', entity_id=bc.pk,
                         summary=f'عمولة #{bc.pk} → {bc.get_commission_status_display()} ({bc.commission_amount} {bc.commission_currency})')
        return Response(_commission_dict(bc))


# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM WEB BOOKINGS  (كل حجوزات الموقع عبر الفنادق — لصاحب المنصة)
# ─────────────────────────────────────────────────────────────────────────────

class PlatformWebBookingsView(APIView):
    permission_classes = [IsPlatformOwner]

    def get(self, request):
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
