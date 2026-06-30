from rest_framework import permissions


def _get_user_role(user) -> str:
    """Return user's role from UserProfile, with username-based fallback for legacy users."""
    try:
        return user.profile.role
    except AttributeError:
        _MAP = {'platform': 'platform_owner', 'manager': 'manager', 'reception': 'reception'}
        return _MAP.get(user.username, 'manager')


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
