"""شبكة اختبارات الأمان والقبول (B‑5).

تغطّي: عزل المستأجرين (B‑7)، فصل صلاحيات الأدوار (B‑8)، حجب الفندق الموقوف (H‑5)،
صلاحيات المنصّة، إبطال التوكن عند الخروج (B‑3)، خصوصية الوثائق الداخلية (B‑6)،
رقم الحجز العشوائي وتقنيع الاستجابة العامة (B‑1)، ومنع الحجز المزدوج والعمولة.
"""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    Hotel, Room, Reservation, Staff, Package, Subscription,
    SubscriptionRequest, UserProfile, Payment,
)

User = get_user_model()
PWD = 'Testpass123!'


def mk_user(username, role, hotel=None):
    u = User.objects.create_user(username=username, password=PWD)
    UserProfile.objects.create(user=u, role=role, hotel=hotel)
    return u


class BaseAPITest(TestCase):
    def setUp(self):
        cache.clear()  # يمنع تراكم عدّاد الـthrottle بين الاختبارات
        self.hotelA = Hotel.objects.create(name='Hotel A', status=Hotel.STATUS_ACTIVE)
        self.hotelB = Hotel.objects.create(name='Hotel B', status=Hotel.STATUS_ACTIVE)
        self.owner = mk_user('owner', UserProfile.ROLE_PLATFORM_OWNER)
        self.mgrA = mk_user('mgrA', UserProfile.ROLE_MANAGER, self.hotelA)
        self.mgrB = mk_user('mgrB', UserProfile.ROLE_MANAGER, self.hotelB)
        self.recA = mk_user('recA', UserProfile.ROLE_RECEPTION, self.hotelA)
        self.roomA = Room.objects.create(hotel=self.hotelA, number='101', type='single', price=100)
        self.roomB = Room.objects.create(hotel=self.hotelB, number='201', type='single', price=100)
        self.resA = Reservation.objects.create(hotel=self.hotelA, guest_first_name='Ali', guest_last_name='A', room=self.roomA)
        self.client = APIClient()

    def as_(self, user):
        self.client.force_authenticate(user=user)


# ── B‑7 + عزل المستأجرين ──────────────────────────────────────────────────
class TenantIsolationTests(BaseAPITest):
    def test_manager_lists_only_own_rooms(self):
        self.as_(self.mgrA)
        r = self.client.get('/api/rooms/')
        self.assertEqual(r.status_code, 200)
        ids = [x['id'] for x in r.json()]
        self.assertIn(self.roomA.id, ids)
        self.assertNotIn(self.roomB.id, ids)

    def test_manager_cannot_retrieve_other_hotel_room(self):
        self.as_(self.mgrA)
        self.assertEqual(self.client.get(f'/api/rooms/{self.roomB.id}/').status_code, 404)

    def test_manager_cannot_delete_other_hotel_room(self):
        self.as_(self.mgrA)
        self.assertEqual(self.client.delete(f'/api/rooms/{self.roomB.id}/').status_code, 404)

    def test_manager_cannot_edit_other_hotel_reservation(self):
        resB = Reservation.objects.create(hotel=self.hotelB, guest_first_name='B', guest_last_name='B')
        self.as_(self.mgrA)
        self.assertEqual(self.client.patch(f'/api/reservations/{resB.id}/', {'notes': 'x'}, format='json').status_code, 404)

    def test_create_room_with_foreign_hotel_rejected(self):
        # عزل الإنشاء: تمرير فندق آخر في الجسم يُرفض.
        self.as_(self.mgrA)
        r = self.client.post('/api/rooms/', {'number': '999', 'hotel': self.hotelB.id, 'type': 'single'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_create_room_in_own_hotel(self):
        self.as_(self.mgrA)
        r = self.client.post('/api/rooms/', {'number': '999', 'type': 'single'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Room.objects.get(number='999').hotel_id, self.hotelA.id)

    def test_patch_reservation_hotel_is_readonly(self):
        # B‑7: محاولة نقل الحجز لفندق آخر عبر PATCH لا تنجح.
        self.as_(self.mgrA)
        r = self.client.patch(f'/api/reservations/{self.resA.id}/', {'hotel': self.hotelB.id}, format='json')
        self.assertEqual(r.status_code, 200)
        self.resA.refresh_from_db()
        self.assertEqual(self.resA.hotel_id, self.hotelA.id)


# ── B‑8: فصل صلاحيات المدير/الاستقبال ─────────────────────────────────────
class VerticalRBACTests(BaseAPITest):
    def test_reception_cannot_create_staff(self):
        self.as_(self.recA)
        r = self.client.post('/api/staff/', {'full_name': 'X', 'role': 'reception'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_reception_cannot_create_room(self):
        self.as_(self.recA)
        self.assertEqual(self.client.post('/api/rooms/', {'number': '500', 'type': 'single'}, format='json').status_code, 403)

    def test_reception_cannot_create_subscription_request(self):
        self.as_(self.recA)
        self.assertEqual(self.client.post('/api/subscription-requests/', {}, format='json').status_code, 403)

    def test_reception_can_create_reservation(self):
        self.as_(self.recA)
        r = self.client.post('/api/reservations/', {'guest_first_name': 'G', 'guest_last_name': 'H'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Reservation.objects.get(id=r.json()['id']).hotel_id, self.hotelA.id)

    def test_reception_can_patch_reservation_status(self):
        self.as_(self.recA)
        self.assertEqual(self.client.patch(f'/api/reservations/{self.resA.id}/', {'status': 'confirmed'}, format='json').status_code, 200)

    def test_reception_cannot_delete_reservation(self):
        self.as_(self.recA)
        self.assertEqual(self.client.delete(f'/api/reservations/{self.resA.id}/').status_code, 403)

    def test_manager_can_create_staff(self):
        self.as_(self.mgrA)
        self.assertEqual(self.client.post('/api/staff/', {'full_name': 'S', 'role': 'receptionist'}, format='json').status_code, 201)


# ── صلاحيات المنصّة ───────────────────────────────────────────────────────
class PlatformScopeTests(BaseAPITest):
    def test_manager_cannot_access_platform_dashboard(self):
        self.as_(self.mgrA)
        self.assertEqual(self.client.get('/api/platform/dashboard/').status_code, 403)

    def test_manager_cannot_create_package(self):
        self.as_(self.mgrA)
        self.assertEqual(self.client.post('/api/packages/', {'name': 'P'}, format='json').status_code, 403)

    def test_anonymous_cannot_list_rooms(self):
        self.assertEqual(self.client.get('/api/rooms/').status_code, 401)

    def test_platform_owner_sees_all_hotels(self):
        self.as_(self.owner)
        r = self.client.get('/api/hotels/')
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(len(r.json()), 2)


# ── H‑5: حجب الفندق الموقوف ───────────────────────────────────────────────
class SuspendedHotelTests(BaseAPITest):
    def test_suspended_hotel_blocks_manager(self):
        self.hotelA.status = Hotel.STATUS_SUSPENDED
        self.hotelA.save()
        self.as_(self.mgrA)
        self.assertEqual(self.client.get('/api/rooms/').status_code, 403)

    def test_active_hotel_allows_manager(self):
        self.as_(self.mgrA)
        self.assertEqual(self.client.get('/api/rooms/').status_code, 200)


# ── B‑3: إبطال التوكن عند الخروج ──────────────────────────────────────────
class TokenBlacklistTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.u = mk_user('sess', UserProfile.ROLE_PLATFORM_OWNER)

    def test_logout_blacklists_refresh(self):
        tok = self.client.post('/api/token/', {'username': 'sess', 'password': PWD}, format='json').json()
        refresh = tok['refresh']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + tok['access'])
        self.assertEqual(self.client.post('/api/logout/', {'refresh': refresh}, format='json').status_code, 200)
        # بعد الخروج: التوكن مرفوض
        self.client.credentials()
        self.assertEqual(self.client.post('/api/token/refresh/', {'refresh': refresh}, format='json').status_code, 401)


# ── B‑6: خصوصية وثائق النزلاء ─────────────────────────────────────────────
class DocPrivacyTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.resA.guest_doc_image = 'data:image/png;base64,AAAA'
        self.resA.save()

    def test_list_omits_doc_images(self):
        self.as_(self.mgrA)
        row = self.client.get('/api/reservations/').json()[0]
        self.assertNotIn('guest_doc_image', row)

    def test_retrieve_includes_doc_images(self):
        self.as_(self.mgrA)
        data = self.client.get(f'/api/reservations/{self.resA.id}/').json()
        self.assertEqual(data['guest_doc_image'], 'data:image/png;base64,AAAA')

    def test_partial_update_preserves_docs(self):
        # اختبار انحدار: PATCH بلا حقول الوثائق لا يمسحها.
        self.as_(self.mgrA)
        self.client.patch(f'/api/reservations/{self.resA.id}/', {'notes': 'edited'}, format='json')
        self.resA.refresh_from_db()
        self.assertEqual(self.resA.guest_doc_image, 'data:image/png;base64,AAAA')


# ── B‑1 + الحجز العام ─────────────────────────────────────────────────────
class PublicVisibilityTests(TestCase):
    """المرحلة 2: ظهور الفنادق العامّة مضبوط خادميًا (كل الشروط)."""
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.pkg = Package.objects.create(name='Std', allow_public_listing=True)

    def _mk(self, **over):
        d = dict(name='Grand', city='Damascus', status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        d.update(over)
        h = Hotel.objects.create(**d)
        sub = over.pop('_sub', None)
        if sub != 'none':
            Subscription.objects.create(hotel=h, package=self.pkg,
                                        status=over.get('_sub_status', Subscription.STATUS_ACTIVE))
        return h

    def _visible_names(self):
        data = self.client.get('/api/public/hotels/').json()
        rows = data if isinstance(data, list) else data.get('results', [])
        return {r['name'] for r in rows}

    def test_eligible_hotel_shows(self):
        h = Hotel.objects.create(name='Eligible', city='Homs', status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        Subscription.objects.create(hotel=h, package=self.pkg, status=Subscription.STATUS_ACTIVE)
        self.assertIn('Eligible', self._visible_names())

    def test_archived_hidden(self):
        h = Hotel.objects.create(name='Archived', city='Homs', status=Hotel.STATUS_ARCHIVED, public_listing_enabled=True)
        Subscription.objects.create(hotel=h, package=self.pkg, status=Subscription.STATUS_ACTIVE)
        self.assertNotIn('Archived', self._visible_names())

    def test_suspended_hidden(self):
        h = Hotel.objects.create(name='Suspended', city='Homs', status=Hotel.STATUS_SUSPENDED, public_listing_enabled=True)
        Subscription.objects.create(hotel=h, package=self.pkg, status=Subscription.STATUS_ACTIVE)
        self.assertNotIn('Suspended', self._visible_names())

    def test_listing_disabled_hidden(self):
        h = Hotel.objects.create(name='NoListing', city='Homs', status=Hotel.STATUS_ACTIVE, public_listing_enabled=False)
        Subscription.objects.create(hotel=h, package=self.pkg, status=Subscription.STATUS_ACTIVE)
        self.assertNotIn('NoListing', self._visible_names())

    def test_no_subscription_hidden(self):
        Hotel.objects.create(name='NoSub', city='Homs', status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        self.assertNotIn('NoSub', self._visible_names())

    def test_expired_subscription_hidden(self):
        h = Hotel.objects.create(name='Expired', city='Homs', status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        Subscription.objects.create(hotel=h, package=self.pkg, status=Subscription.STATUS_EXPIRED)
        self.assertNotIn('Expired', self._visible_names())

    def test_end_date_past_hidden(self):
        h = Hotel.objects.create(name='EndedPast', city='Homs', status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        Subscription.objects.create(hotel=h, package=self.pkg, status=Subscription.STATUS_ACTIVE,
                                    end_date=date.today() - timedelta(days=1))
        self.assertNotIn('EndedPast', self._visible_names())

    def test_package_disallows_listing_hidden(self):
        pkg2 = Package.objects.create(name='NoPub', allow_public_listing=False)
        h = Hotel.objects.create(name='PkgNoPub', city='Homs', status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        Subscription.objects.create(hotel=h, package=pkg2, status=Subscription.STATUS_ACTIVE)
        self.assertNotIn('PkgNoPub', self._visible_names())

    def test_missing_city_hidden(self):
        h = Hotel.objects.create(name='NoCity', city='', status=Hotel.STATUS_ACTIVE, public_listing_enabled=True)
        Subscription.objects.create(hotel=h, package=self.pkg, status=Subscription.STATUS_ACTIVE)
        self.assertNotIn('NoCity', self._visible_names())

    def test_hidden_hotel_detail_404(self):
        h = Hotel.objects.create(name='HiddenD', city='Homs', status=Hotel.STATUS_ACTIVE, public_listing_enabled=False)
        r = self.client.get(f'/api/public/hotels/{h.id}/')
        self.assertEqual(r.status_code, 404)


class PublicBookingTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = Hotel.objects.create(name='Pub', city='Damascus', status=Hotel.STATUS_ACTIVE,
                                          public_booking_enabled=True)
        # م3: الحجز العام يتطلّب اشتراكًا صالحًا تسمح باقته بالحجز
        pkg = Package.objects.create(name='Pub', allow_public_booking=True)
        Subscription.objects.create(hotel=self.hotel, package=pkg, status=Subscription.STATUS_ACTIVE)
        self.room = Room.objects.create(hotel=self.hotel, number='1', type='single', price=100, show_in_public=True)
        self.ci = (date.today() + timedelta(days=5)).isoformat()
        self.co = (date.today() + timedelta(days=7)).isoformat()

    def _book(self, phone='0999111222'):
        return self.client.post('/api/public/bookings/', {
            'hotel_id': self.hotel.id, 'room_type': 'single',
            'check_in_date': self.ci, 'check_out_date': self.co, 'guests_count': 1,
            'guest_first_name': 'Guest', 'guest_last_name': 'One', 'guest_phone': phone,
            'guest_email': 'guest@example.com',
        }, format='json')

    def test_booking_number_is_random(self):
        r = self._book()
        self.assertEqual(r.status_code, 201)
        no = r.json()['public_booking_no']
        self.assertTrue(no.startswith('WEB-'))
        self.assertNotIn('00001', no)  # ليس تسلسليًا

    def test_double_booking_prevented(self):
        self.assertEqual(self._book().status_code, 201)
        self.assertGreaterEqual(self._book().status_code, 400)  # لا غرفة متاحة

    # ── م3: تحصين الحجز العام ──────────────────────────────────────────────
    def test_booking_issues_manage_token(self):
        r = self._book()
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json().get('manage_token'))          # رمز إدارة آمن يُصدَر

    def test_booking_rejected_for_suspended_hotel(self):
        self.hotel.status = Hotel.STATUS_SUSPENDED; self.hotel.save()
        self.assertEqual(self._book().status_code, 400)

    def test_booking_rejected_without_valid_subscription(self):
        from .models import Subscription
        Subscription.objects.filter(hotel=self.hotel).update(status=Subscription.STATUS_EXPIRED)
        self.assertEqual(self._book().status_code, 400)

    def test_manage_with_token_succeeds_wrong_token_fails(self):
        tok = self._book().json()['manage_token']
        no  = Reservation.objects.filter(public_booking=True).first().public_booking_no
        ok  = self.client.get(f'/api/public/manage-booking/?no={no}&token={tok}')
        self.assertEqual(ok.status_code, 200)
        bad = self.client.get(f'/api/public/manage-booking/?no={no}&token=WRONG')
        self.assertEqual(bad.status_code, 404)                 # التخمين بالرمز يفشل

    def test_manage_requires_credential(self):
        no = self._book().json()['public_booking_no']
        r  = self.client.get(f'/api/public/manage-booking/?no={no}')   # بلا رمز/هاتف
        self.assertEqual(r.status_code, 400)

    def test_cancel_with_token(self):
        j   = self._book().json()
        tok = j['manage_token']; no = j['public_booking_no']
        r   = self.client.post(f'/api/public/bookings/{no}/cancel/', {'token': tok, 'reason': 'x'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_invalid_dates_rejected(self):
        r = self.client.post('/api/public/bookings/', {
            'hotel_id': self.hotel.id, 'room_type': 'single',
            'check_in_date': self.co, 'check_out_date': self.ci, 'guests_count': 1,
            'guest_first_name': 'G', 'guest_last_name': 'O', 'guest_phone': '0999',
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_manage_lookup_masks_pii(self):
        self._book(phone='0999123456')
        r = self.client.get('/api/public/manage-booking/', {'no': Reservation.objects.first().public_booking_no, 'phone': '0999123456'})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertNotEqual(data['guest_email'], 'guest@example.com')  # مقنّع
        self.assertIn('*', data['guest_phone'])


# ── العمولة ──────────────────────────────────────────────────────────────
class CommissionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = Hotel.objects.create(name='Comm', city='Damascus', status=Hotel.STATUS_ACTIVE,
                                          public_booking_enabled=True)
        # م3: الحجز العام يتطلّب اشتراكًا صالحًا تسمح باقته بالحجز
        _pkg = Package.objects.create(name='Comm', allow_public_booking=True)
        Subscription.objects.create(hotel=self.hotel, package=_pkg, status=Subscription.STATUS_ACTIVE)
        Room.objects.create(hotel=self.hotel, number='1', type='single', price=100, show_in_public=True)

    def test_public_booking_creates_commission(self):
        from .models import BookingCommission
        r = self.client.post('/api/public/bookings/', {
            'hotel_id': self.hotel.id, 'room_type': 'single',
            'check_in_date': (date.today() + timedelta(days=3)).isoformat(),
            'check_out_date': (date.today() + timedelta(days=5)).isoformat(),
            'guests_count': 1, 'guest_first_name': 'C', 'guest_last_name': 'O', 'guest_phone': '0999',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        res = Reservation.objects.get(id=r.json()['id'])
        comm = BookingCommission.objects.filter(reservation=res).first()
        self.assertIsNotNone(comm)  # سجل عمولة أُنشئ للحجز العام


# ── H‑2 + H‑7 (المرحلة 6) ─────────────────────────────────────────────────
class Phase6Tests(BaseAPITest):
    def test_booking_numbers_unique_and_set(self):
        r1 = Reservation.objects.create(hotel=self.hotelA, guest_first_name='A', guest_last_name='1')
        r2 = Reservation.objects.create(hotel=self.hotelA, guest_first_name='B', guest_last_name='2')
        self.assertTrue(r1.booking_number and r2.booking_number)
        self.assertNotEqual(r1.booking_number, r2.booking_number)

    def test_approve_request_without_package_rejected(self):
        req = SubscriptionRequest.objects.create(hotel=self.hotelA, package=None)
        self.as_(self.owner)
        r = self.client.post(f'/api/subscription-requests/{req.id}/approve/', {'months': 1}, format='json')
        self.assertEqual(r.status_code, 400)
        req.refresh_from_db()
        self.assertEqual(req.status, SubscriptionRequest.STATUS_PENDING)  # لم يُعتمَد بلا باقة


# ── H‑3 (المرحلة 7) ───────────────────────────────────────────────────────
class Phase7Tests(BaseAPITest):
    def test_expire_releases_stale_public_booking(self):
        from django.core.management import call_command
        res = Reservation.objects.create(
            hotel=self.hotelA, room=self.roomA, public_booking=True,
            arrival_status=Reservation.ARRIVAL_AWAITING, status=Reservation.STATUS_CONFIRMED,
            check_in_date=date.today() - timedelta(days=3), check_out_date=date.today() - timedelta(days=1),
        )
        call_command('expire_pending_bookings', '--grace-days', '1')
        res.refresh_from_db()
        self.assertEqual(res.status, Reservation.STATUS_NO_SHOW)


# ── B‑9/B‑10: سلسلة المال (المرحلة 8) ─────────────────────────────────────
class MoneyChainTests(BaseAPITest):
    def test_payment_updates_reservation_paid(self):
        self.as_(self.mgrA)
        r = self.client.post('/api/payments/', {'reservation': self.resA.id, 'amount': '120', 'method': 'cash'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.resA.refresh_from_db()
        self.assertEqual(float(self.resA.paid), 120.0)
        self.client.post('/api/payments/', {'reservation': self.resA.id, 'amount': '80', 'method': 'cash'}, format='json')
        self.resA.refresh_from_db()
        self.assertEqual(float(self.resA.paid), 200.0)  # مشتقّ = مجموع الدفعات

    def test_reception_can_record_payment(self):
        self.as_(self.recA)
        self.assertEqual(self.client.post('/api/payments/', {'reservation': self.resA.id, 'amount': '50', 'method': 'cash'}, format='json').status_code, 201)

    def test_manager_cannot_see_other_hotel_payments(self):
        Payment.objects.create(hotel=self.hotelB, amount=10)
        self.as_(self.mgrA)
        self.assertEqual(len(self.client.get('/api/payments/').json()), 0)

    def test_payment_for_foreign_reservation_rejected(self):
        resB = Reservation.objects.create(hotel=self.hotelB, guest_first_name='B', guest_last_name='B')
        self.as_(self.mgrA)
        self.assertIn(self.client.post('/api/payments/', {'reservation': resB.id, 'amount': '10', 'method': 'cash'}, format='json').status_code, (400, 403))

    def test_migrate_paid_creates_payment(self):
        from django.core.management import call_command
        self.resA.total = 200
        self.resA.paid = 80
        self.resA.save()
        call_command('migrate_paid_to_payments')
        self.assertEqual(Payment.objects.filter(reservation=self.resA).count(), 1)
        self.assertEqual(float(Payment.objects.get(reservation=self.resA).amount), 80.0)


# ── B‑10: check-in/out حقيقي + فلترة الحالة ───────────────────────────────
class CheckInOutTests(BaseAPITest):
    def test_check_in_marks_room_occupied(self):
        self.as_(self.recA)
        r = self.client.post(f'/api/reservations/{self.resA.id}/check_in/')
        self.assertEqual(r.status_code, 200)
        self.resA.refresh_from_db(); self.roomA.refresh_from_db()
        self.assertEqual(self.resA.status, Reservation.STATUS_CHECKED_IN)
        self.assertEqual(self.roomA.status, Room.STATUS_OCCUPIED)

    def test_check_out_marks_room_cleaning(self):
        self.resA.status = Reservation.STATUS_CHECKED_IN
        self.resA.save()
        self.as_(self.recA)
        r = self.client.post(f'/api/reservations/{self.resA.id}/check_out/')
        self.assertEqual(r.status_code, 200)
        self.resA.refresh_from_db(); self.roomA.refresh_from_db()
        self.assertEqual(self.resA.status, Reservation.STATUS_CHECKED_OUT)
        self.assertEqual(self.roomA.status, Room.STATUS_CLEANING)

    def test_status_filter_applies(self):
        Reservation.objects.create(hotel=self.hotelA, status=Reservation.STATUS_CHECKED_IN,
                                   guest_first_name='In', guest_last_name='X')
        self.as_(self.mgrA)
        rows = self.client.get('/api/reservations/?status=checked_in').json()
        self.assertTrue(rows and all(x['status'] == 'checked_in' for x in rows))


# ── B‑9: مصاريف المدير (Expense API) ──────────────────────────────────────
class ExpenseTests(BaseAPITest):
    def test_manager_creates_and_lists_expense(self):
        self.as_(self.mgrA)
        r = self.client.post('/api/expenses/', {'category': 'utilities', 'amount': '75', 'description': 'كهرباء', 'spent_on': '2026-07-01'}, format='json')
        self.assertEqual(r.status_code, 201)
        rows = self.client.get('/api/expenses/').json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['hotel'], self.hotelA.id)

    def test_manager_cannot_see_other_hotel_expenses(self):
        from .models import Expense
        Expense.objects.create(hotel=self.hotelB, amount=10)
        self.as_(self.mgrA)
        self.assertEqual(len(self.client.get('/api/expenses/').json()), 0)

    def test_reception_cannot_create_expense(self):
        self.as_(self.recA)
        self.assertEqual(self.client.post('/api/expenses/', {'amount': '10'}, format='json').status_code, 403)


# ── M‑4/الهوية الديناميكية: إعدادات المنصّة ───────────────────────────────
class PlatformIdentityTests(BaseAPITest):
    def test_owner_updates_identity_and_public_reflects(self):
        self.as_(self.owner)
        r = self.client.put('/api/platform/settings/', {'site_name': 'MyHotels', 'subtitle': 'إدارة'}, format='json')
        self.assertEqual(r.status_code, 200)
        pub = self.client.get('/api/public/platform-info/').json()
        self.assertEqual(pub['name'], 'MyHotels')

    def test_manager_cannot_update_identity(self):
        self.as_(self.mgrA)
        self.assertEqual(self.client.put('/api/platform/settings/', {'site_name': 'X'}, format='json').status_code, 403)


# ── B‑9: سجلّ المفقودات (LostFound) ───────────────────────────────────────
class LostFoundTests(BaseAPITest):
    def test_manager_crud_lost_found(self):
        self.as_(self.mgrA)
        r = self.client.post('/api/lost-found/', {'item_name': 'محفظة', 'status': 'found'}, format='json')
        self.assertEqual(r.status_code, 201)
        iid = r.json()['id']
        self.assertEqual(len(self.client.get('/api/lost-found/').json()), 1)
        pr = self.client.patch(f'/api/lost-found/{iid}/', {'status': 'returned'}, format='json')
        self.assertEqual(pr.status_code, 200)
        self.assertEqual(pr.json()['status'], 'returned')

    def test_lost_found_tenant_isolation(self):
        from .models import LostFoundItem
        LostFoundItem.objects.create(hotel=self.hotelB, item_name='x')
        self.as_(self.mgrA)
        self.assertEqual(len(self.client.get('/api/lost-found/').json()), 0)


# ── B‑9: تسليم الورديات (ShiftHandover) ───────────────────────────────────
class ShiftHandoverTests(BaseAPITest):
    def test_reception_creates_manager_lists(self):
        self.as_(self.recA)
        r = self.client.post('/api/shift-handover/', {'shift': 'morning', 'staff_name': 'رنا', 'occupied_rooms': 5}, format='json')
        self.assertEqual(r.status_code, 201)
        self.as_(self.mgrA)
        rows = self.client.get('/api/shift-handover/').json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['occupied_rooms'], 5)

    def test_shift_handover_isolation(self):
        from .models import ShiftHandover
        ShiftHandover.objects.create(hotel=self.hotelB, staff_name='x')
        self.as_(self.mgrA)
        self.assertEqual(len(self.client.get('/api/shift-handover/').json()), 0)


# ── B‑9: خدمات الطعام (MenuItem + FoodOrder) ──────────────────────────────
class FoodServiceTests(BaseAPITest):
    def test_menu_and_order_crud(self):
        self.as_(self.mgrA)
        m = self.client.post('/api/menu-items/', {'name': 'برجر', 'price': '25', 'category': 'وجبات'}, format='json')
        self.assertEqual(m.status_code, 201)
        o = self.client.post('/api/food-orders/', {'items': [{'name': 'برجر', 'qty': 2, 'price': 25}], 'amount': '50', 'service_type': 'restaurant'}, format='json')
        self.assertEqual(o.status_code, 201)
        self.assertTrue(o.json()['order_no'].startswith('ORD-'))
        oid = o.json()['id']
        pr = self.client.patch(f'/api/food-orders/{oid}/', {'status': 'delivered'}, format='json')
        self.assertEqual(pr.json()['status'], 'delivered')

    def test_food_order_isolation(self):
        from .models import FoodOrder
        FoodOrder.objects.create(hotel=self.hotelB, amount=10)
        self.as_(self.mgrA)
        self.assertEqual(len(self.client.get('/api/food-orders/').json()), 0)

    def test_reception_can_create_order(self):
        self.as_(self.recA)
        self.assertEqual(self.client.post('/api/food-orders/', {'items': [], 'amount': '10'}, format='json').status_code, 201)


# ── B‑9: كشف حساب النزيل (Folio) ──────────────────────────────────────────
class FolioTests(BaseAPITest):
    def test_add_and_settle_charge(self):
        self.as_(self.mgrA)
        r = self.client.post('/api/folio-charges/', {'reservation': self.resA.id, 'charge_type': 'minibar', 'amount': '15', 'description': 'مياه', 'charge_date': '2026-07-01'}, format='json')
        self.assertEqual(r.status_code, 201)
        cid = r.json()['id']
        pr = self.client.patch(f'/api/folio-charges/{cid}/', {'settled': True}, format='json')
        self.assertTrue(pr.json()['settled'])

    def test_folio_isolation(self):
        from .models import FolioCharge
        FolioCharge.objects.create(hotel=self.hotelB, amount=10)
        self.as_(self.mgrA)
        self.assertEqual(len(self.client.get('/api/folio-charges/').json()), 0)


# ── B‑9: أعلام/ملاحظات النزلاء (GuestProfile upsert) ──────────────────────
class GuestProfileTests(BaseAPITest):
    def test_upsert_flag_notes(self):
        from .models import GuestProfile
        self.as_(self.mgrA)
        self.assertEqual(self.client.post('/api/guest-profiles/', {'guest_key': 'ID123', 'flag': 'vip', 'notes': 'مميز'}, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/guest-profiles/', {'guest_key': 'ID123', 'flag': 'blacklist', 'notes': 'x'}, format='json').status_code, 201)
        qs = GuestProfile.objects.filter(hotel=self.hotelA, guest_key='ID123')
        self.assertEqual(qs.count(), 1)  # upsert لا يكرّر
        self.assertEqual(qs.first().flag, 'blacklist')

    def test_guest_profile_isolation(self):
        from .models import GuestProfile
        GuestProfile.objects.create(hotel=self.hotelB, guest_key='X')
        self.as_(self.mgrA)
        self.assertEqual(len(self.client.get('/api/guest-profiles/').json()), 0)


# ── B‑9: عملة/هوية الفندق الديناميكية (Hotel.currency + identity) ─────────
class HotelIdentityDynamicTests(BaseAPITest):
    def test_currency_defaults_usd(self):
        self.assertEqual(self.hotelA.currency, 'USD')

    def test_manager_updates_currency_and_identity(self):
        self.as_(self.mgrA)
        r = self.client.patch(f'/api/hotels/{self.hotelA.id}/',
                              {'currency': 'SAR', 'owner_name': 'المالك',
                               'website': 'https://h.example', 'logo': 'data:image/png;base64,x'},
                              format='json')
        self.assertEqual(r.status_code, 200)
        self.hotelA.refresh_from_db()
        self.assertEqual(self.hotelA.currency, 'SAR')       # العملة تُخزَّن (سلسلة المال)
        self.assertEqual(self.hotelA.owner_name, 'المالك')
        body = self.client.get(f'/api/hotels/{self.hotelA.id}/').json()
        self.assertEqual(body['currency'], 'SAR')            # ويعيدها الـserializer
        self.assertEqual(body['website'], 'https://h.example')

    def test_manager_cannot_touch_other_hotel_currency(self):
        self.as_(self.mgrA)
        r = self.client.patch(f'/api/hotels/{self.hotelB.id}/', {'currency': 'EUR'}, format='json')
        self.assertIn(r.status_code, (403, 404))            # عزل: لا يصل لفندق آخر
        self.hotelB.refresh_from_db()
        self.assertEqual(self.hotelB.currency, 'USD')


# ── سلسلة المال: الفوليو + الطعام يغذّيان إجمالي/دين الحجز المشتقّ ─────────
class ReservationMoneyChainTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        from .models import FolioCharge, FoodOrder
        # الغرفة: 100 إجمالي، مدفوع 40 → رصيد الغرفة 60
        self.resA.total = 100
        self.resA.paid = 40
        self.resA.save()
        # فوليو: 30 غير مسوّى (دين) + 20 مسوّى (لا دين)
        FolioCharge.objects.create(hotel=self.hotelA, reservation=self.resA, amount=30, settled=False)
        FolioCharge.objects.create(hotel=self.hotelA, reservation=self.resA, amount=20, settled=True)
        # طعام: 15 غير ملغى بلا دفع (دين) + 99 ملغى (يُستبعد كليًّا)
        FoodOrder.objects.create(hotel=self.hotelA, reservation=self.resA, amount=15, status='delivered', payment_method='')
        FoodOrder.objects.create(hotel=self.hotelA, reservation=self.resA, amount=99, status='cancelled')

    def test_derived_totals(self):
        self.as_(self.mgrA)
        d = self.client.get(f'/api/reservations/{self.resA.id}/').json()
        self.assertEqual(float(d['folio_total']),   50)    # 30 + 20
        self.assertEqual(float(d['food_total']),    15)    # 15 (الملغى مستبعَد)
        self.assertEqual(float(d['charges_total']), 65)    # 50 + 15
        self.assertEqual(float(d['grand_total']),  165)    # 100 + 65
        # الدين = رصيد الغرفة 60 + فوليو غير مسوّى 30 + طعام غير مدفوع 15 = 105
        self.assertEqual(float(d['balance_due']),  105)

    def test_list_includes_derived_fields(self):
        self.as_(self.mgrA)
        rows = self.client.get(f'/api/reservations/?hotel={self.hotelA.id}').json()
        row = next(r for r in rows if r['id'] == self.resA.id)
        self.assertEqual(float(row['grand_total']), 165)
        self.assertEqual(float(row['balance_due']), 105)

    def test_paid_folio_settles_debt(self):
        # تسوية الفوليو غير المسوّى → ينخفض الدين تلقائيًا (مشتقّ)
        from .models import FolioCharge
        FolioCharge.objects.filter(reservation=self.resA, settled=False).update(settled=True)
        self.as_(self.mgrA)
        d = self.client.get(f'/api/reservations/{self.resA.id}/').json()
        self.assertEqual(float(d['grand_total']), 165)      # الإجمالي ثابت
        self.assertEqual(float(d['balance_due']),  75)      # 60 + 0 + 15


# ── د‑9: اختبار السيناريو الشامل (سلسلة العمليات end‑to‑end) ────────────────
class EndToEndScenarioTests(BaseAPITest):
    """يحاكي: حجز مباشر مؤكّد تلقائيًا → دخول → طلب مطعم على الغرفة + فوليو →
    محاولة خروج (تُمنع بالدين) → دفع وإغلاق → خروج → غرفة تنظيف → إغلاق يوم →
    ظهور كل ذلك في سجلّ التدقيق."""
    def test_full_operational_chain(self):
        from .models import Reservation, FoodOrder, FolioCharge, AuditLog, Room
        self.as_(self.mgrA)

        # 1) حجز مباشر → يُؤكَّد تلقائيًا (لا pending)
        r = self.client.post('/api/reservations/', {
            'guest_first_name': 'زبون', 'guest_last_name': 'مباشر', 'guest_id_number': 'NID777',
            'room': self.roomA.id, 'total': 200, 'currency': 'USD',
            'status': 'pending', 'public_booking': False,
        }, format='json')
        self.assertEqual(r.status_code, 201)
        res_id = r.json()['id']
        self.assertEqual(r.json()['status'], 'confirmed')

        # 2) تسجيل الدخول (ذرّي: الحجز + الغرفة)
        ci = self.client.post(f'/api/reservations/{res_id}/check_in/', {}, format='json')
        self.assertEqual(ci.status_code, 200)
        self.assertEqual(ci.json()['status'], 'checked_in')

        # 3) دفعة جزئية للغرفة (نقدي) عبر سجلّ Payment
        self.client.post('/api/payments/', {'reservation': res_id, 'amount': 120, 'currency': 'USD',
                                            'method': 'cash', 'source': 'booking'}, format='json')
        # 4) طلب مطعم على حساب الغرفة (ذمّة) + رسم فوليو
        FoodOrder.objects.create(hotel=self.hotelA, reservation_id=res_id, amount=30,
                                 status='delivered', amount_room=30)
        FolioCharge.objects.create(hotel=self.hotelA, reservation_id=res_id, amount=10, settled=False)

        # 5) الدين = (200−120) + 10 فوليو + 30 طعام = 120
        detail = self.client.get(f'/api/reservations/{res_id}/').json()
        self.assertEqual(float(detail['balance_due']), 120)

        # 6) محاولة الخروج تُمنع بالدين (402)
        blocked = self.client.post(f'/api/reservations/{res_id}/check_out/', {}, format='json')
        self.assertEqual(blocked.status_code, 402)

        # 7) دفع وإغلاق الحساب ذرّيًا ثم الخروج
        settle = self.client.post(f'/api/reservations/{res_id}/settle_and_checkout/', {'method': 'cash'}, format='json')
        self.assertEqual(settle.status_code, 200)
        self.assertEqual(settle.json()['status'], 'checked_out')
        self.assertEqual(float(settle.json()['balance_due']), 0)

        # 8) الغرفة تحوّلت إلى تنظيف
        self.roomA.refresh_from_db()
        self.assertEqual(self.roomA.status, Room.STATUS_CLEANING)

        # 9) سجلّ التدقيق يحوي أحداث السلسلة
        actions = set(AuditLog.objects.filter(hotel=self.hotelA).values_list('action', flat=True))
        self.assertIn('reservation.check_in', actions)
        self.assertIn('payment.create', actions)
        self.assertIn('reservation.settle_checkout', actions)

        # 10) إغلاق اليوم يُخزَّن ويعكس مدفوعات اليوم
        import datetime
        dc = self.client.post('/api/day-close/', {'date': str(datetime.date.today())}, format='json')
        self.assertEqual(dc.status_code, 201)
        self.assertGreater(dc.json()['snapshot']['payments_total'], 0)


# ── د‑8: اتفاقية تفعيل حجوزات الموقع ───────────────────────────────────────
class WebBookingAgreementTests(BaseAPITest):
    def _set_agreement(self, text='اتفاقية تجريبية', version=1):
        from .models import PlatformSettings
        s = PlatformSettings.get_solo()
        s.web_booking_agreement = text; s.agreement_version = version; s.save()

    def test_enabling_web_booking_blocked_without_acceptance(self):
        self._set_agreement()
        self.hotelA.public_booking_enabled = False; self.hotelA.save()
        self.as_(self.mgrA)
        r = self.client.patch(f'/api/hotels/{self.hotelA.id}/', {'public_booking_enabled': True}, format='json')
        self.assertEqual(r.status_code, 400)                # محجوب قبل القبول
        self.hotelA.refresh_from_db()
        self.assertFalse(self.hotelA.public_booking_enabled)

    def test_accept_then_enable_succeeds(self):
        self._set_agreement()
        self.hotelA.public_booking_enabled = False; self.hotelA.save()
        self.as_(self.mgrA)
        acc = self.client.post('/api/platform/web-booking-agreement/', {}, format='json')
        self.assertEqual(acc.status_code, 201)
        self.assertTrue(acc.json()['accepted'])
        r = self.client.patch(f'/api/hotels/{self.hotelA.id}/', {'public_booking_enabled': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.hotelA.refresh_from_db()
        self.assertTrue(self.hotelA.public_booking_enabled)

    def test_new_version_requires_reacceptance(self):
        self._set_agreement(version=1)
        self.as_(self.mgrA)
        self.client.post('/api/platform/web-booking-agreement/', {}, format='json')
        # المنصّة تحدّث الاتفاقية لنسخة جديدة
        self._set_agreement(text='اتفاقية محدّثة', version=2)
        state = self.client.get('/api/platform/web-booking-agreement/').json()
        self.assertEqual(state['version'], 2)
        self.assertFalse(state['accepted'])                 # يلزم قبول النسخة الجديدة


# ── د‑7: إغلاق اليوم الحقيقي (DayClose) ────────────────────────────────────
class DayCloseTests(BaseAPITest):
    def test_preview_reports_blocking_issues(self):
        from .models import Reservation
        today = str(__import__('datetime').date.today())
        # حجز مقيم عليه دين → يجب أن يظهر كمانع
        r = Reservation.objects.create(hotel=self.hotelA, room=self.roomA, guest_first_name='G',
                                       status='checked_in', total=100, paid=0, currency='USD')
        self.as_(self.mgrA)
        d = self.client.get(f'/api/day-close/preview/?date={today}').json()
        self.assertEqual(d['in_house'], 1)
        self.assertGreaterEqual(d['unpaid_folios'], 1)
        self.assertFalse(d['can_close_clean'])              # يوجد مانع (دين)
        self.assertTrue(any(b['code'] == 'unpaid_folios' for b in d['blocking']))
        r.delete()

    def test_close_persists_snapshot(self):
        today = str(__import__('datetime').date.today())
        self.as_(self.mgrA)
        r = self.client.post('/api/day-close/', {'date': today, 'notes': 'إغلاق تجريبي'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['business_date'], today)
        self.assertIn('payments_total', r.json()['snapshot'])
        from .models import DayClose
        dc = DayClose.objects.get(hotel=self.hotelA, business_date=today)
        self.assertEqual(dc.closed_by, self.mgrA)

    def test_reception_cannot_close(self):
        today = str(__import__('datetime').date.today())
        self.as_(self.recA)
        self.assertIn(self.client.post('/api/day-close/', {'date': today}, format='json').status_code, (403, 405))

    def test_day_close_isolation(self):
        from .models import DayClose
        DayClose.objects.create(hotel=self.hotelB, business_date='2026-06-30', snapshot={})
        self.as_(self.mgrA)
        self.assertEqual(len(self.client.get('/api/day-close/').json()), 0)


# ── د‑6: الأمان (قفل الدخول، سجل أمني، تحقّق بخطوتين داخل النظام) ────────────
class SecurityTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        # تعطيل حدّ المعدّل للدخول أثناء الاختبار (لا يتعارض مع قفل المحاولات)
        from .views import TokenObtainPairView, Login2FAVerifyView
        self._saved_throttles = TokenObtainPairView.throttle_classes
        TokenObtainPairView.throttle_classes = []
        Login2FAVerifyView.throttle_classes = []

    def tearDown(self):
        from .views import TokenObtainPairView
        TokenObtainPairView.throttle_classes = self._saved_throttles
        super().tearDown() if hasattr(super(), 'tearDown') else None

    def _mk_login_user(self, username='loginu', pw='Str0ng!Pass9', two_factor=False):
        from django.contrib.auth import get_user_model
        from .models import UserProfile
        U = get_user_model()
        u = U.objects.create_user(username=username, password=pw)
        UserProfile.objects.create(user=u, role='reception', hotel=self.hotelA, two_factor_enabled=two_factor)
        return u, pw

    def test_failed_login_locks_after_5(self):
        self._mk_login_user(username='lockme')
        for _ in range(5):
            r = self.client.post('/api/token/', {'username': 'lockme', 'password': 'wrong'}, format='json')
            self.assertEqual(r.status_code, 401)
        r = self.client.post('/api/token/', {'username': 'lockme', 'password': 'Str0ng!Pass9'}, format='json')
        self.assertEqual(r.status_code, 423)                # مقفول رغم كلمة المرور الصحيحة

    def test_successful_login_logs_event(self):
        from .models import AuditLog
        self._mk_login_user(username='goodu')
        r = self.client.post('/api/token/', {'username': 'goodu', 'password': 'Str0ng!Pass9'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.json())
        self.assertTrue(AuditLog.objects.filter(action='auth.login_success').exists())

    def test_2fa_flow_end_to_end(self):
        from .models import LoginChallenge
        self._mk_login_user(username='tfauser', two_factor=True)
        r = self.client.post('/api/token/', {'username': 'tfauser', 'password': 'Str0ng!Pass9'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get('2fa_required'))
        ticket = r.json()['ticket']
        self.assertNotIn('access', r.json())               # لا توكن قبل الكود
        ch = LoginChallenge.objects.get(ticket=ticket)
        # القناة داخل النظام: المدير يرى الكود
        self.as_(self.mgrA)
        pend = self.client.get('/api/auth/2fa/pending/').json()
        self.assertTrue(any(p['code'] == ch.code for p in pend))
        # التحقق (بلا مصادقة) يُصدر التوكنات
        self.client.force_authenticate(user=None)
        v = self.client.post('/api/auth/2fa/verify/', {'ticket': ticket, 'code': ch.code}, format='json')
        self.assertEqual(v.status_code, 200)
        self.assertIn('access', v.json())

    def test_2fa_wrong_code_rejected(self):
        from .models import LoginChallenge
        self._mk_login_user(username='tfa2', two_factor=True)
        r = self.client.post('/api/token/', {'username': 'tfa2', 'password': 'Str0ng!Pass9'}, format='json')
        ticket = r.json()['ticket']
        v = self.client.post('/api/auth/2fa/verify/', {'ticket': ticket, 'code': '000000'}, format='json')
        self.assertEqual(v.status_code, 400)

    def test_toggle_2fa(self):
        self.as_(self.mgrA)
        r = self.client.post('/api/auth/2fa/toggle/', {'enabled': True}, format='json')
        self.assertTrue(r.json()['two_factor_enabled'])
        self.mgrA.profile.refresh_from_db()
        self.assertTrue(self.mgrA.profile.two_factor_enabled)


# ── د‑5: الموظف كحساب دخول حقيقي + الصلاحيات الدقيقة ────────────────────────
class StaffLoginProvisionTests(BaseAPITest):
    def test_create_staff_provisions_login(self):
        from django.contrib.auth import get_user_model
        from .models import Staff
        User = get_user_model()
        self.as_(self.mgrA)
        r = self.client.post('/api/staff/', {
            'full_name': 'موظف جديد', 'role': 'receptionist', 'status': 'active',
            'permissions': ['reservations', 'payments'],
            'username': 'recep_new', 'password': 'Str0ng!Pass9',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        u = User.objects.filter(username='recep_new').first()
        self.assertIsNotNone(u)                                  # حساب دخول أُنشئ
        self.assertTrue(u.is_active)
        self.assertEqual(u.profile.role, 'reception')
        self.assertEqual(u.profile.hotel_id, self.hotelA.id)
        st = Staff.objects.get(user=u)
        self.assertEqual(st.permissions, ['reservations', 'payments'])

    def test_duplicate_username_rejected(self):
        self.as_(self.mgrA)
        self.client.post('/api/staff/', {'full_name': 'A', 'role': 'cashier', 'username': 'dupe1', 'password': 'Str0ng!Pass9'}, format='json')
        r2 = self.client.post('/api/staff/', {'full_name': 'B', 'role': 'cashier', 'username': 'dupe1', 'password': 'Str0ng!Pass9'}, format='json')
        self.assertEqual(r2.status_code, 400)

    def test_suspend_staff_disables_login(self):
        from django.contrib.auth import get_user_model
        from .models import Staff
        User = get_user_model()
        self.as_(self.mgrA)
        r = self.client.post('/api/staff/', {'full_name': 'C', 'role': 'cashier', 'status': 'active', 'username': 'susp1', 'password': 'Str0ng!Pass9'}, format='json')
        sid = r.json()['id']
        self.client.patch(f'/api/staff/{sid}/', {'status': 'suspended'}, format='json')
        self.assertFalse(User.objects.get(username='susp1').is_active)   # عُطِّل الدخول

    def test_current_user_returns_permissions(self):
        # المدير له كل الصلاحيات (['*'])
        self.as_(self.mgrA)
        self.assertEqual(self.client.get('/api/current-user/').json()['permissions'], ['*'])
        # الاستقبال يرى صلاحياته من سجلّ الموظف
        from .models import Staff
        Staff.objects.create(hotel=self.hotelA, user=self.recA, full_name='R', role='receptionist',
                             permissions=['checkout', 'payments'])
        self.as_(self.recA)
        self.assertEqual(set(self.client.get('/api/current-user/').json()['permissions']), {'checkout', 'payments'})


# ── د‑4: المطعم/الكافتريا (إعدادات، وضع الموظف، تفصيل الدفع على الغرفة) ─────
class FoodServiceSettingsTests(BaseAPITest):
    def test_no_dedicated_staff_auto_delivers(self):
        self.hotelA.food_settings = {'dedicated_staff': False}
        self.hotelA.save()
        self.as_(self.mgrA)
        r = self.client.post('/api/food-orders/', {'amount': 20, 'currency': 'USD'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['status'], 'delivered')    # يُسلَّم مباشرة

    def test_dedicated_staff_keeps_new(self):
        self.hotelA.food_settings = {'dedicated_staff': True}
        self.hotelA.save()
        self.as_(self.mgrA)
        r = self.client.post('/api/food-orders/', {'amount': 20, 'currency': 'USD', 'status': 'new'}, format='json')
        self.assertEqual(r.json()['status'], 'new')          # يمرّ بالمراحل

    def test_room_charged_food_blocks_checkout_by_amount_room(self):
        from .models import Reservation, FoodOrder
        r = Reservation.objects.create(hotel=self.hotelA, room=self.roomA, guest_first_name='G',
                                       status='checked_in', total=100, paid=100, currency='USD')
        # طلب 30: 20 نقدي + 10 على حساب الغرفة → الدين 10 فقط
        FoodOrder.objects.create(hotel=self.hotelA, reservation=r, amount=30, status='delivered',
                                 amount_cash=20, amount_room=10)
        self.as_(self.mgrA)
        d = self.client.get(f'/api/reservations/{r.id}/').json()
        self.assertEqual(float(d['balance_due']), 10)        # جزء الغرفة فقط
        resp = self.client.post(f'/api/reservations/{r.id}/check_out/', {}, format='json')
        self.assertEqual(resp.status_code, 402)

    def test_manager_saves_food_settings(self):
        self.as_(self.mgrA)
        resp = self.client.patch(f'/api/hotels/{self.hotelA.id}/',
                                {'food_settings': {'restaurant_enabled': True, 'dedicated_staff': True, 'allow_card': False}},
                                format='json')
        self.assertEqual(resp.status_code, 200)
        self.hotelA.refresh_from_db()
        self.assertTrue(self.hotelA.food_settings['restaurant_enabled'])
        self.assertFalse(self.hotelA.food_settings['allow_card'])


# ── د‑3: منع الخروج بالدين مُلزَم خادمًا + مصدر الدفعة ──────────────────────
class CheckoutDebtEnforcementTests(BaseAPITest):
    def _checked_in_res(self, total=100, paid=0):
        from .models import Reservation, Payment
        r = Reservation.objects.create(hotel=self.hotelA, room=self.roomA, guest_first_name='G',
                                       status='checked_in', total=total, currency='USD')
        if paid:
            # سلسلة المال: المدفوع مدعوم بسجلّ دفعة حقيقي (لا يُضبط مباشرةً)
            Payment.objects.create(hotel=self.hotelA, reservation=r, amount=paid,
                                   currency='USD', method='cash', source='booking')
            r.paid = paid
            r.save()
        return r

    def test_checkout_blocked_with_room_balance(self):
        r = self._checked_in_res(total=100, paid=40)   # دين 60
        self.as_(self.mgrA)
        resp = self.client.post(f'/api/reservations/{r.id}/check_out/', {}, format='json')
        self.assertEqual(resp.status_code, 402)
        self.assertEqual(resp.json()['code'], 'balance_due')
        r.refresh_from_db()
        self.assertEqual(r.status, 'checked_in')        # لم يُسجَّل الخروج

    def test_checkout_blocked_with_unsettled_folio(self):
        from .models import FolioCharge
        r = self._checked_in_res(total=100, paid=100)   # الغرفة مسدّدة
        FolioCharge.objects.create(hotel=self.hotelA, reservation=r, amount=25, settled=False)
        self.as_(self.mgrA)
        resp = self.client.post(f'/api/reservations/{r.id}/check_out/', {}, format='json')
        self.assertEqual(resp.status_code, 402)         # الفوليو يمنع الخروج

    def test_checkout_blocked_with_room_charged_food(self):
        from .models import FoodOrder
        r = self._checked_in_res(total=100, paid=100)
        FoodOrder.objects.create(hotel=self.hotelA, reservation=r, amount=15, status='delivered', payment_method='')
        self.as_(self.mgrA)
        self.assertEqual(self.client.post(f'/api/reservations/{r.id}/check_out/', {}, format='json').status_code, 402)

    def test_checkout_succeeds_when_settled(self):
        r = self._checked_in_res(total=100, paid=100)
        self.as_(self.mgrA)
        resp = self.client.post(f'/api/reservations/{r.id}/check_out/', {}, format='json')
        self.assertEqual(resp.status_code, 200)
        r.refresh_from_db()
        self.assertEqual(r.status, 'checked_out')

    def test_settle_and_checkout_closes_everything(self):
        from .models import FolioCharge, FoodOrder
        r = self._checked_in_res(total=100, paid=40)      # دين غرفة 60
        FolioCharge.objects.create(hotel=self.hotelA, reservation=r, amount=30, settled=False)
        FoodOrder.objects.create(hotel=self.hotelA, reservation=r, amount=15, status='delivered', payment_method='')
        self.as_(self.mgrA)
        resp = self.client.post(f'/api/reservations/{r.id}/settle_and_checkout/', {'method': 'cash'}, format='json')
        self.assertEqual(resp.status_code, 200)
        r.refresh_from_db()
        self.assertEqual(r.status, 'checked_out')          # خرج بعد الإغلاق
        self.assertEqual(float(resp.json()['balance_due']), 0)   # الذمّة صفر
        self.assertFalse(FolioCharge.objects.filter(reservation=r, settled=False).exists())
        self.assertFalse(FoodOrder.objects.filter(reservation=r, room_settled=False).exists())

    def test_payment_source_stored_and_returned(self):
        r = self._checked_in_res(total=100, paid=0)
        self.as_(self.mgrA)
        resp = self.client.post('/api/payments/',
                               {'reservation': r.id, 'amount': 50, 'currency': 'USD',
                                'method': 'cash', 'source': 'restaurant'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()['source'], 'restaurant')


# ── د‑2: الحجز المباشر يُؤكَّد تلقائيًا + استدعاء النزيل السابق ──────────────
class DirectBookingAndGuestLookupTests(BaseAPITest):
    def test_direct_booking_auto_confirmed(self):
        self.as_(self.mgrA)
        r = self.client.post('/api/reservations/',
                             {'guest_first_name': 'Sami', 'guest_last_name': 'X', 'room': self.roomA.id,
                              'status': 'pending', 'public_booking': False}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['status'], 'confirmed')   # المباشر لا يبقى قيد الانتظار

    def test_public_booking_stays_pending(self):
        self.as_(self.mgrA)
        r = self.client.post('/api/reservations/',
                             {'guest_first_name': 'Web', 'guest_last_name': 'Y', 'room': self.roomA.id,
                              'status': 'pending', 'public_booking': True}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['status'], 'pending')     # العام يحترم تدفّقه

    def test_guest_lookup_finds_previous_and_isolates(self):
        from .models import Reservation
        Reservation.objects.create(hotel=self.hotelA, guest_id_number='ID999',
                                   guest_first_name='Old', guest_last_name='Guest', guest_phone='0555000111')
        Reservation.objects.create(hotel=self.hotelB, guest_id_number='ID999', guest_first_name='Other')
        self.as_(self.mgrA)
        rows = self.client.get('/api/reservations/guest_lookup/?q=ID999').json()
        self.assertEqual(len(rows), 1)                       # عزل: فقط فندق المستخدم
        self.assertEqual(rows[0]['guest_first_name'], 'Old')
        self.assertEqual(rows[0]['guest_phone'], '0555000111')

    def test_guest_lookup_short_query_returns_empty(self):
        self.as_(self.mgrA)
        self.assertEqual(self.client.get('/api/reservations/guest_lookup/?q=ab').json(), [])


# ── م5 (C6): إلزام الصلاحيات الدقيقة خادميًا ────────────────────────────────
class GranularPermissionTests(BaseAPITest):
    def _staff_for(self, user, perms):
        from .models import Staff
        Staff.objects.create(hotel=self.hotelA, user=user, full_name='R', role='receptionist', permissions=perms)

    def _pay(self):
        return self.client.post('/api/payments/', {'reservation': self.resA.id, 'amount': 10,
                                                   'currency': 'USD', 'method': 'cash'}, format='json')

    def test_reception_without_section_perm_denied(self):
        self._staff_for(self.recA, ['reservations'])   # قائمة مضبوطة بلا payments
        self.as_(self.recA)
        self.assertEqual(self._pay().status_code, 403)

    def test_reception_with_section_perm_allowed(self):
        self._staff_for(self.recA, ['payments'])
        self.as_(self.recA)
        self.assertEqual(self._pay().status_code, 201)

    def test_reception_without_staff_record_backward_compatible(self):
        # بلا سجلّ Staff (أو قائمة فارغة) → يُحكَم بالدور فقط (لا يكسر السلوك القائم)
        self.as_(self.recA)
        self.assertEqual(self._pay().status_code, 201)

    def test_manager_unaffected_by_granular(self):
        self._staff_for(self.recA, ['reservations'])
        self.as_(self.mgrA)                            # المدير له كل شيء
        self.assertEqual(self._pay().status_code, 201)


# ── م6: حماية العمليات المالية (إبطال بدل حذف + تدقيق) ─────────────────────
class FinancialVoidTests(BaseAPITest):
    def _payment(self, amount=50):
        from .models import Payment
        from .views import _recompute_reservation_paid
        p = Payment.objects.create(hotel=self.hotelA, reservation=self.resA, amount=amount,
                                   currency='USD', method='cash', source='booking')
        _recompute_reservation_paid(p.reservation)
        return p

    def test_payment_hard_delete_blocked(self):
        p = self._payment()
        self.as_(self.mgrA)
        self.assertEqual(self.client.delete(f'/api/payments/{p.id}/').status_code, 405)  # لا حذف مالي

    def test_void_payment_records_audit_and_recomputes(self):
        from .models import AuditLog, Payment
        self.resA.total = 100; self.resA.save()
        p = self._payment(amount=60)
        # المدفوع مشتقّ = 60
        self.as_(self.mgrA)
        self.assertEqual(float(self.client.get(f'/api/reservations/{self.resA.id}/').json()['paid']), 60)
        r = self.client.post(f'/api/payments/{p.id}/void/', {'reason': 'دفعة خاطئة'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['voided'])
        p.refresh_from_db()
        self.assertTrue(p.voided and p.voided_by_id == self.mgrA.id)
        self.assertTrue(AuditLog.objects.filter(action='payment.void', hotel=self.hotelA).exists())
        # المدفوع أُعيد احتسابه صعودًا (تُستثنى الملغاة) → 0
        self.assertEqual(float(self.client.get(f'/api/reservations/{self.resA.id}/').json()['paid']), 0)

    def test_void_requires_reason(self):
        p = self._payment()
        self.as_(self.mgrA)
        self.assertEqual(self.client.post(f'/api/payments/{p.id}/void/', {}, format='json').status_code, 400)

    def test_void_twice_rejected(self):
        p = self._payment()
        self.as_(self.mgrA)
        self.client.post(f'/api/payments/{p.id}/void/', {'reason': 'x'}, format='json')
        self.assertEqual(self.client.post(f'/api/payments/{p.id}/void/', {'reason': 'y'}, format='json').status_code, 400)

    def test_cannot_void_other_hotel_payment(self):
        from .models import Payment, Reservation
        resB = Reservation.objects.create(hotel=self.hotelB, guest_first_name='B')
        pB = Payment.objects.create(hotel=self.hotelB, reservation=resB, amount=10, currency='USD', method='cash')
        self.as_(self.mgrA)
        self.assertEqual(self.client.post(f'/api/payments/{pB.id}/void/', {'reason': 'x'}, format='json').status_code, 404)

    def test_expense_delete_blocked_but_void_works(self):
        from .models import Expense
        e = Expense.objects.create(hotel=self.hotelA, amount=20, currency='USD', description='e')
        self.as_(self.mgrA)
        self.assertEqual(self.client.delete(f'/api/expenses/{e.id}/').status_code, 405)
        r = self.client.post(f'/api/expenses/{e.id}/void/', {'reason': 'مكرّر'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['voided'])


# ── المرحلة 11: سجلّ التدقيق (AuditLog) ────────────────────────────────────
class AuditLogTests(BaseAPITest):
    def test_check_in_records_audit(self):
        from .models import AuditLog
        self.as_(self.mgrA)
        r = self.client.post(f'/api/reservations/{self.resA.id}/check_in/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        log = AuditLog.objects.filter(hotel=self.hotelA, action='reservation.check_in').first()
        self.assertIsNotNone(log)                         # سُجِّل الحدث
        self.assertEqual(log.actor, self.mgrA)            # مع الفاعل
        self.assertEqual(log.entity_type, 'reservation')

    def test_manager_sees_only_own_hotel_logs(self):
        from .models import AuditLog
        AuditLog.objects.create(hotel=self.hotelA, action='payment.create', summary='A')
        AuditLog.objects.create(hotel=self.hotelB, action='payment.create', summary='B')
        self.as_(self.mgrA)
        rows = self.client.get('/api/audit-logs/').json()
        self.assertTrue(all(x['hotel'] == self.hotelA.id for x in rows))
        self.assertTrue(any(x['summary'] == 'A' for x in rows))
        self.assertFalse(any(x['summary'] == 'B' for x in rows))   # عزل مستأجرين

    def test_platform_owner_sees_all_and_can_filter(self):
        from .models import AuditLog
        AuditLog.objects.create(hotel=self.hotelA, action='hotel.create', summary='A')
        AuditLog.objects.create(hotel=self.hotelB, action='payment.create', summary='B')
        self.as_(self.owner)
        self.assertEqual(len(self.client.get('/api/audit-logs/').json()), 2)
        filtered = self.client.get('/api/audit-logs/?action=hotel.create').json()
        self.assertEqual(len(filtered), 1)

    def test_reception_denied_and_log_is_readonly(self):
        self.as_(self.recA)
        self.assertEqual(len(self.client.get('/api/audit-logs/').json()), 0)   # لا وصول للاستقبال
        self.as_(self.mgrA)
        # للقراءة فقط: لا إنشاء عبر الـAPI
        r = self.client.post('/api/audit-logs/', {'action': 'x'}, format='json')
        self.assertEqual(r.status_code, 405)
