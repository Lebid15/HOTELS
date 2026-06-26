from django.urls import include, path
from rest_framework import routers
from .views import HotelViewSet, CurrentUserView

router = routers.DefaultRouter()
router.register(r'hotels', HotelViewSet, basename='hotel')

urlpatterns = [
    path('', include(router.urls)),
    path('current-user/', CurrentUserView.as_view(), name='current-user'),
]