from rest_framework import permissions


def _get_user_role(user) -> str:
    """Return user's role from UserProfile.

    H‑6: عند غياب UserProfile، الافتراض هو **بلا دور** (الأكثر تقييدًا) — لا 'manager'.
    يُبقى تعيينٌ صريح للحسابات التجريبية الثلاثة فقط للتوافق الخلفي.
    """
    try:
        return user.profile.role
    except AttributeError:
        _MAP = {'platform': 'platform_owner', 'manager': 'manager', 'reception': 'reception'}
        return _MAP.get(user.username, '')


def _get_user_hotel_id(user):
    """Return the hotel_id this user belongs to, or None for platform owners."""
    try:
        hotel_id = user.profile.hotel_id
        if hotel_id is not None:
            return hotel_id
    except AttributeError:
        pass
    managed = getattr(getattr(user, 'managed_hotel', None), 'id', None)
    return managed


class IsPlatformOwner(permissions.BasePermission):
    message = 'هذه العملية متاحة لمالك المنصة فقط.'

    def has_permission(self, request, view):
        return (
            bool(request.user)
            and request.user.is_authenticated
            and _get_user_role(request.user) == 'platform_owner'
        )


class IsHotelStaff(permissions.BasePermission):
    """
    Allows access only to resources belonging to the authenticated user's hotel.
    Platform owners bypass this check entirely.
    When no hotel_id filter is present, the permission is granted and queryset
    enforcement in the view scopes the data correctly.
    """
    message = 'ليس لديك صلاحية الوصول إلى بيانات هذا الفندق.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = _get_user_role(request.user)
        if role == 'platform_owner':
            return True
        hotel_id = (
            request.query_params.get('hotel')
            or request.data.get('hotel')
        )
        if not hotel_id:
            return True
        user_hotel_id = _get_user_hotel_id(request.user)
        if user_hotel_id is None:
            return False
        return str(user_hotel_id) == str(hotel_id)


def _user_hotel_active(user) -> bool:
    """H‑5: هل فندق الموظّف فعّال (غير موقوف/مؤرشف)؟ يُستخدم لحجب الوصول عند الإيقاف."""
    hid = _get_user_hotel_id(user)
    if hid is None:
        return False
    from .models import Hotel
    status = Hotel.objects.filter(id=hid).values_list('status', flat=True).first()
    return status == Hotel.STATUS_ACTIVE


class BaseHotelResourcePermission(permissions.BasePermission):
    """B‑8/H‑5: تصنيف الوصول حسب الدور للموارد المرتبطة بفندق.

    - مالك المنصّة: كل شيء.
    - بلا دور صالح (H‑6): لا وصول.
    - مدير/استقبال: يُحجبان إن كان فندقهما موقوفًا (H‑5).
    - المدير: وصول كامل. الاستقبال: محدود بالطرق في `reception_methods` (افتراضيًا قراءة فقط).
    """
    reception_methods = permissions.SAFE_METHODS
    message = 'ليس لديك صلاحية لهذه العملية.'

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        role = _get_user_role(u)
        if role == 'platform_owner':
            return True
        if role not in ('manager', 'reception'):
            self.message = 'حسابك لا يملك دورًا صالحًا للوصول.'
            return False
        if not _user_hotel_active(u):
            self.message = 'حساب الفندق موقوف حاليًا. يرجى التواصل مع إدارة المنصّة.'
            return False
        if role == 'manager':
            return True
        if request.method in self.reception_methods:
            return True
        self.message = 'هذه العملية متاحة لمدير الفندق فقط.'
        return False


class RoomPermission(BaseHotelResourcePermission):
    reception_methods = permissions.SAFE_METHODS                     # الاستقبال: قراءة فقط


class ReservationPermission(BaseHotelResourcePermission):
    reception_methods = ('GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'PUT')  # بلا حذف


class MaintenancePermission(BaseHotelResourcePermission):
    reception_methods = ('GET', 'HEAD', 'OPTIONS', 'POST')           # إبلاغ + قراءة


class StaffPermission(BaseHotelResourcePermission):
    reception_methods = ()                                           # لا وصول للاستقبال


class SubscriptionRequestPermission(BaseHotelResourcePermission):
    reception_methods = ()                                           # الاشتراكات لمدير الفندق فقط


class PaymentPermission(BaseHotelResourcePermission):
    reception_methods = ('GET', 'HEAD', 'OPTIONS', 'POST')           # الاستقبال يسجّل الدفعات


class ExpensePermission(BaseHotelResourcePermission):
    reception_methods = permissions.SAFE_METHODS                     # الاستقبال قراءة فقط


class LostFoundPermission(BaseHotelResourcePermission):
    reception_methods = ('GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'PUT')  # الاستقبال يدير المفقودات (بلا حذف)


class ShiftHandoverPermission(BaseHotelResourcePermission):
    reception_methods = ('GET', 'HEAD', 'OPTIONS', 'POST')           # الاستقبال يسلّم الوردية


class MenuItemPermission(BaseHotelResourcePermission):
    reception_methods = permissions.SAFE_METHODS                     # الاستقبال يرى القائمة فقط


class FoodOrderPermission(BaseHotelResourcePermission):
    reception_methods = ('GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'PUT')  # الاستقبال ينشئ/يحدّث الطلبات (بلا حذف)


class FolioPermission(BaseHotelResourcePermission):
    reception_methods = ('GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'PUT')  # الاستقبال يضيف رسومًا/يسوّي (بلا حذف)


class GuestProfilePermission(BaseHotelResourcePermission):
    reception_methods = ('GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH')   # الاستقبال يعدّل أعلام/ملاحظات النزلاء
