"""المرحلة 11 — اختبارات سلسلة تحصين الإنتاج (المراحل 1–8).

تغطّي البنود المؤجّلة: FolioCharge void (م1)، بوّابة الظهور/الحجز العام (م2)،
تحصين manage_token (م3)، اتساق الدفع المقسّم Payment (م4)، تطبيع الهاتف (م5)،
إغلاق احتياطي دور اسم المستخدم (م6)، throttling العام (م7)، اتساق FoodOrder (م8).
"""
from datetime import date, timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from .models import (
    Hotel, Room, Reservation, Package, Subscription, UserProfile,
    Payment, FolioCharge, FoodOrder, AuditLog, PlatformSettings, HotelAgreementAcceptance,
)

User = get_user_model()
PWD = 'Testpass123!'


def mk_user(username, role, hotel=None):
    u = User.objects.create_user(username=username, password=PWD)
    UserProfile.objects.create(user=u, role=role, hotel=hotel)
    return u


def make_public_hotel(name='PubH', **extra):
    """فندق مؤهّل بالكامل للظهور والحجز العام (كل شروط م2)."""
    hotel = Hotel.objects.create(
        name=name, city='Damascus', status=Hotel.STATUS_ACTIVE,
        public_listing_enabled=True, public_booking_enabled=True, **extra)
    pkg = Package.objects.create(name=name + 'Pkg', status=Package.STATUS_ACTIVE,
                                 allow_public_listing=True, allow_public_booking=True)
    Subscription.objects.create(hotel=hotel, package=pkg, status=Subscription.STATUS_ACTIVE)
    hotel.refresh_from_db()
    return hotel


def _low_rate(scope, rate='2/minute'):
    """يخفّض معدّل throttle لنطاق معيّن مؤقّتًا (تعديل قاموس الفئة المشترك)."""
    return mock.patch.dict(SimpleRateThrottle.THROTTLE_RATES, {scope: rate})


# ── م1: سلامة FolioCharge (إبطال بدل حذف) ─────────────────────────────────
class FolioChargeHardeningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = Hotel.objects.create(name='FC', city='D', status=Hotel.STATUS_ACTIVE)
        self.mgr = mk_user('fc_mgr', UserProfile.ROLE_MANAGER, self.hotel)
        self.res = Reservation.objects.create(hotel=self.hotel, guest_first_name='G',
                                              guest_last_name='X', total=100)
        self.client.force_authenticate(self.mgr)

    def _charge(self, amount='50'):
        return self.client.post('/api/folio-charges/', {
            'reservation': self.res.id, 'amount': amount,
            'charge_type': 'service', 'description': 'خدمة'}, format='json')

    def test_create_folio_charge(self):
        r = self._charge()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(FolioCharge.objects.get(id=r.json()['id']).hotel_id, self.hotel.id)

    def test_void_with_reason(self):
        cid = self._charge().json()['id']
        r = self.client.post(f'/api/folio-charges/{cid}/void/', {'reason': 'خطأ'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['voided'])
        self.assertTrue(FolioCharge.objects.get(id=cid).voided)   # لا يُحذف — يُبطَل فقط

    def test_void_without_reason_rejected(self):
        cid = self._charge().json()['id']
        self.assertEqual(self.client.post(f'/api/folio-charges/{cid}/void/', {}, format='json').status_code, 400)

    def test_void_twice_rejected(self):
        cid = self._charge().json()['id']
        self.client.post(f'/api/folio-charges/{cid}/void/', {'reason': 'x'}, format='json')
        self.assertEqual(self.client.post(f'/api/folio-charges/{cid}/void/', {'reason': 'y'}, format='json').status_code, 400)

    def test_cannot_edit_voided_charge(self):
        cid = self._charge().json()['id']
        self.client.post(f'/api/folio-charges/{cid}/void/', {'reason': 'x'}, format='json')
        self.assertEqual(self.client.patch(f'/api/folio-charges/{cid}/', {'amount': '999'}, format='json').status_code, 400)

    def test_voided_excluded_from_balance_due(self):
        before = float(self.client.get(f'/api/reservations/{self.res.id}/').json()['balance_due'])
        cid = self._charge(amount='50').json()['id']
        with_charge = float(self.client.get(f'/api/reservations/{self.res.id}/').json()['balance_due'])
        self.assertEqual(with_charge, before + 50)
        self.client.post(f'/api/folio-charges/{cid}/void/', {'reason': 'x'}, format='json')
        after = float(self.client.get(f'/api/reservations/{self.res.id}/').json()['balance_due'])
        self.assertEqual(after, before)   # المبطل مُستثنى من الرصيد

    def test_void_records_audit(self):
        cid = self._charge().json()['id']
        self.client.post(f'/api/folio-charges/{cid}/void/', {'reason': 'x'}, format='json')
        self.assertTrue(AuditLog.objects.filter(action='folio_charge.void', hotel=self.hotel).exists())

    def test_delete_not_allowed(self):
        cid = self._charge().json()['id']
        self.assertEqual(self.client.delete(f'/api/folio-charges/{cid}/').status_code, 405)   # لا حذف نهائي


# ── م2: بوّابة الظهور والحجز العام ─────────────────────────────────────────
class EligibilityGateTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = make_public_hotel('Elig')
        self.room = Room.objects.create(hotel=self.hotel, number='1', type='single',
                                        price=100, show_in_public=True)
        self.ci = (date.today() + timedelta(days=3)).isoformat()
        self.co = (date.today() + timedelta(days=5)).isoformat()

    def _book(self, hotel_id=None):
        return self.client.post('/api/public/bookings/', {
            'hotel_id': hotel_id or self.hotel.id, 'room_type': 'single',
            'check_in_date': self.ci, 'check_out_date': self.co, 'guests_count': 1,
            'guest_first_name': 'G', 'guest_last_name': 'X', 'guest_phone': '0999111222'}, format='json')

    def _list_ids(self):
        return [h['id'] for h in self.client.get('/api/public/hotels/').json()]

    def _avail(self):
        return self.client.get(
            f'/api/public/hotels/{self.hotel.slug}/availability/'
            f'?check_in={self.ci}&check_out={self.co}&guests=1')

    def test_eligible_hotel_lists_and_books(self):
        self.assertIn(self.hotel.id, self._list_ids())
        self.assertEqual(self._book().status_code, 201)

    def test_hidden_hotel_not_listed_and_not_bookable(self):
        self.hotel.public_listing_enabled = False
        self.hotel.save()
        self.assertNotIn(self.hotel.id, self._list_ids())
        self.assertEqual(self._book().status_code, 400)   # م2: المخفيّ لا يقبل حجزًا

    def test_expired_subscription_not_bookable(self):
        Subscription.objects.filter(hotel=self.hotel).update(status=Subscription.STATUS_EXPIRED)
        self.assertEqual(self._book().status_code, 400)

    def test_package_disallows_listing(self):
        pkg = self.hotel.subscription.package
        pkg.allow_public_listing = False
        pkg.save()
        self.assertNotIn(self.hotel.id, self._list_ids())

    def test_package_disallows_booking(self):
        pkg = self.hotel.subscription.package
        pkg.allow_public_booking = False
        pkg.save()
        self.assertEqual(self._book().status_code, 400)

    def test_room_not_public_hidden_in_availability(self):
        self.room.show_in_public = False
        self.room.save()
        self.assertEqual(self._avail().json(), [])

    def test_availability_empty_for_non_bookable_hotel(self):
        self.hotel.public_booking_enabled = False
        self.hotel.save()
        self.assertEqual(self._avail().json(), [])   # ظاهر لكن لا يقبل الحجز → لا غرف

    def test_direct_hotel_id_bypass_rejected(self):
        self.hotel.public_listing_enabled = False
        self.hotel.save()
        self.assertEqual(self._book(hotel_id=self.hotel.id).status_code, 400)

    def test_agreement_required_when_active(self):
        s = PlatformSettings.get_solo()
        s.web_booking_agreement = 'اتفاقية فعّالة'
        s.agreement_version = 1
        s.save()
        self.assertEqual(self._book().status_code, 400)   # لم تُقبَل بعد
        HotelAgreementAcceptance.objects.create(hotel=self.hotel, version=1)
        self.assertEqual(self._book().status_code, 201)   # بعد القبول


# ── م3: تحصين manage_token ────────────────────────────────────────────────
class ManageTokenHardeningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = make_public_hotel('Tok')
        Room.objects.create(hotel=self.hotel, number='1', type='single', price=100, show_in_public=True)
        self.ci = (date.today() + timedelta(days=4)).isoformat()
        self.co = (date.today() + timedelta(days=6)).isoformat()

    def _book(self, phone='0999111222'):
        return self.client.post('/api/public/bookings/', {
            'hotel_id': self.hotel.id, 'room_type': 'single',
            'check_in_date': self.ci, 'check_out_date': self.co, 'guests_count': 1,
            'guest_first_name': 'G', 'guest_last_name': 'X', 'guest_phone': phone}, format='json')

    def test_create_returns_token_and_url(self):
        d = self._book().json()
        self.assertTrue(d.get('manage_token'))
        self.assertTrue(d.get('manage_url'))
        self.assertIn(d['manage_token'], d['manage_url'])

    def test_lookup_by_phone_hides_token_and_url(self):
        d = self._book(phone='0999111222').json()
        no = d['public_booking_no']
        r = self.client.get(f'/api/public/manage-booking/?no={no}&phone=0999111222')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('manage_token', r.json())
        self.assertNotIn('manage_url', r.json())
        self.assertIn('*', r.json()['guest_phone'])   # يبقى مقنّعًا

    def test_lookup_by_token_hides_token(self):
        d = self._book().json()
        r = self.client.get(f'/api/public/manage-booking/?no={d["public_booking_no"]}&token={d["manage_token"]}')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('manage_token', r.json())
        self.assertNotIn('manage_url', r.json())

    def test_cancel_with_correct_token_succeeds(self):
        d = self._book().json()
        r = self.client.post(f'/api/public/bookings/{d["public_booking_no"]}/cancel/',
                             {'token': d['manage_token'], 'reason': 'x'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_cancel_with_wrong_token_fails(self):
        d = self._book().json()
        r = self.client.post(f'/api/public/bookings/{d["public_booking_no"]}/cancel/',
                             {'token': 'WRONG', 'reason': 'x'}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_lookup_not_found_is_generic(self):
        d = self._book(phone='0999111222').json()
        # رقم صحيح + هاتف خاطئ → نفس رسالة «غير موجود» (لا يكشف أيّ الحقلين خاطئ)
        r = self.client.get(f'/api/public/manage-booking/?no={d["public_booking_no"]}&phone=0000000000')
        self.assertEqual(r.status_code, 404)
        self.assertNotIn('manage_token', r.json())


# ── م4: اتساق الدفع المقسّم (Payment) ──────────────────────────────────────
class PaymentSplitConsistencyTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = Hotel.objects.create(name='Pay', city='D', status=Hotel.STATUS_ACTIVE)
        self.mgr = mk_user('pay_mgr', UserProfile.ROLE_MANAGER, self.hotel)
        self.res = Reservation.objects.create(hotel=self.hotel, guest_first_name='G',
                                              guest_last_name='X', total=100, room=None)
        self.client.force_authenticate(self.mgr)

    def _pay(self, **body):
        body.setdefault('reservation', self.res.id)
        body.setdefault('currency', 'USD')
        return self.client.post('/api/payments/', body, format='json')

    def test_single_method_valid(self):
        self.assertEqual(self._pay(amount='100', method='cash').status_code, 201)

    def test_split_valid(self):
        self.assertEqual(self._pay(amount='100', amount_cash='40', amount_electronic='30', amount_card='30').status_code, 201)

    def test_reject_sum_less_than_amount(self):
        self.assertEqual(self._pay(amount='100', amount_cash='50', amount_electronic='20').status_code, 400)

    def test_reject_sum_more_than_amount(self):
        self.assertEqual(self._pay(amount='100', amount_cash='80', amount_electronic='50').status_code, 400)

    def test_reject_negative(self):
        self.assertEqual(self._pay(amount='100', amount_cash='-10', amount_electronic='110').status_code, 400)

    def test_reject_zero_amount(self):
        self.assertEqual(self._pay(amount='0', method='cash').status_code, 400)

    def test_voided_payment_excluded_from_paid(self):
        p = self._pay(amount='60', method='cash')
        self.assertEqual(p.status_code, 201)
        pid = p.json()['id']
        self.assertEqual(float(self.client.get(f'/api/reservations/{self.res.id}/').json()['paid']), 60)
        self.client.post(f'/api/payments/{pid}/void/', {'reason': 'خطأ'}, format='json')
        self.assertEqual(float(self.client.get(f'/api/reservations/{self.res.id}/').json()['paid']), 0)

    def test_settle_and_checkout_creates_consistent_payment(self):
        room = Room.objects.create(hotel=self.hotel, number='9', type='single', price=100)
        res = Reservation.objects.create(hotel=self.hotel, guest_first_name='S', guest_last_name='X',
                                         total=100, room=room, status=Reservation.STATUS_CHECKED_IN)
        r = self.client.post(f'/api/reservations/{res.id}/settle_and_checkout/',
                             {'amount_cash': '60', 'amount_electronic': '40'}, format='json')
        self.assertEqual(r.status_code, 200)
        pay = Payment.objects.filter(reservation=res, voided=False).first()
        self.assertIsNotNone(pay)
        self.assertEqual(float(pay.amount), float(pay.amount_cash + pay.amount_electronic + pay.amount_card))  # متّسق
        self.assertEqual(float(pay.amount), 100)


# ── م5: تطبيع الهاتف ──────────────────────────────────────────────────────
class PhoneNormalizationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = make_public_hotel('Phone')
        Room.objects.create(hotel=self.hotel, number='1', type='single', price=100, show_in_public=True)
        self.ci = (date.today() + timedelta(days=3)).isoformat()
        self.co = (date.today() + timedelta(days=5)).isoformat()

    def _book(self, phone):
        return self.client.post('/api/public/bookings/', {
            'hotel_id': self.hotel.id, 'room_type': 'single',
            'check_in_date': self.ci, 'check_out_date': self.co, 'guests_count': 1,
            'guest_first_name': 'G', 'guest_last_name': 'X', 'guest_phone': phone}, format='json').json()

    def _lookup(self, no, phone):
        return self.client.get(f'/api/public/manage-booking/?no={no}&phone={phone}')

    def test_find_with_different_format(self):
        no = self._book('+963 944 123 456')['public_booking_no']
        self.assertEqual(self._lookup(no, '00963944123456').status_code, 200)
        self.assertEqual(self._lookup(no, '0944123456').status_code, 200)

    def test_arabic_digits_normalized(self):
        no = self._book('0944123456')['public_booking_no']
        self.assertEqual(self._lookup(no, '٠٩٤٤١٢٣٤٥٦').status_code, 200)

    def test_wrong_phone_not_found(self):
        no = self._book('0944123456')['public_booking_no']
        self.assertEqual(self._lookup(no, '0500000000').status_code, 404)

    def test_lookup_hides_normalized_and_masks(self):
        d = self._book('0944123456')
        r = self._lookup(d['public_booking_no'], '0944123456')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('guest_phone_normalized', r.json())
        self.assertIn('*', r.json()['guest_phone'])

    def test_fallback_for_unbackfilled_row(self):
        # محاكاة سجلّ قديم بلا قيمة مطبّعة → يجب أن يجده fallback المطبّع في بايثون
        d = self._book('+963 944 123 456')
        Reservation.objects.filter(public_booking_no=d['public_booking_no']).update(guest_phone_normalized='')
        self.assertEqual(self._lookup(d['public_booking_no'], '0944123456').status_code, 200)


# ── م6: إغلاق احتياطي دور اسم المستخدم ─────────────────────────────────────
class PermissionRoleFallbackTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = Hotel.objects.create(name='Perm', city='D', status=Hotel.STATUS_ACTIVE)

    def test_no_profile_gets_403(self):
        u = User.objects.create_user(username='noprofile', password=PWD)
        self.client.force_authenticate(u)
        self.assertEqual(self.client.get('/api/rooms/').status_code, 403)   # fail-closed

    def test_username_matching_old_map_gives_no_role(self):
        from .permissions import _get_user_role
        for name in ('manager', 'platform', 'reception'):
            u = User.objects.create_user(username=name, password=PWD)   # بلا Profile
            self.assertEqual(_get_user_role(u), '')   # لا استنتاج من الاسم

    def test_profile_roles_resolve(self):
        from .permissions import _get_user_role
        m = mk_user('real_mgr', UserProfile.ROLE_MANAGER, self.hotel)
        r = mk_user('real_rec', UserProfile.ROLE_RECEPTION, self.hotel)
        p = mk_user('real_plat', UserProfile.ROLE_PLATFORM_OWNER)
        self.assertEqual(_get_user_role(m), 'manager')
        self.assertEqual(_get_user_role(r), 'reception')
        self.assertEqual(_get_user_role(p), 'platform_owner')

    def test_manager_profile_can_access_rooms(self):
        m = mk_user('perm_mgr', UserProfile.ROLE_MANAGER, self.hotel)
        self.client.force_authenticate(m)
        self.assertEqual(self.client.get('/api/rooms/').status_code, 200)


# ── م7: throttling النقاط العامة الحسّاسة ──────────────────────────────────
class PublicThrottlingTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = make_public_hotel('Thr')
        Room.objects.create(hotel=self.hotel, number='1', type='single', price=100, show_in_public=True)
        self.ci = (date.today() + timedelta(days=3)).isoformat()
        self.co = (date.today() + timedelta(days=5)).isoformat()

    def _avail(self):
        return self.client.get(
            f'/api/public/hotels/{self.hotel.slug}/availability/'
            f'?check_in={self.ci}&check_out={self.co}&guests=1')

    def _assert_429_after_two(self, scope, call):
        with _low_rate(scope, '2/minute'):
            cache.clear()
            self.assertNotEqual(call().status_code, 429)
            self.assertNotEqual(call().status_code, 429)
            self.assertEqual(call().status_code, 429)

    def test_availability_throttled(self):
        self._assert_429_after_two('public_availability', self._avail)

    def test_booking_throttled(self):
        self._assert_429_after_two('public_booking',
                                   lambda: self.client.post('/api/public/bookings/', {}, format='json'))

    def test_lookup_throttled(self):
        self._assert_429_after_two('public_lookup',
                                   lambda: self.client.get('/api/public/manage-booking/?no=X&phone=Y'))

    def test_cancel_throttled(self):
        self._assert_429_after_two('public_cancel',
                                   lambda: self.client.post('/api/public/bookings/NOPE/cancel/', {'phone': '1'}, format='json'))

    def test_review_throttled(self):
        self._assert_429_after_two('public_review',
                                   lambda: self.client.post(f'/api/public/hotels/{self.hotel.slug}/ratings/', {}, format='json'))

    def test_normal_usage_within_limit_ok(self):
        cache.clear()
        for _ in range(3):
            self.assertNotEqual(self._avail().status_code, 429)   # الحدّ الافتراضي 30/دقيقة لا يتأثّر


# ── م8: اتساق الدفع المقسّم في FoodOrder ───────────────────────────────────
class FoodOrderSplitConsistencyTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = Hotel.objects.create(name='Food', city='D', status=Hotel.STATUS_ACTIVE)
        self.mgr = mk_user('food_mgr', UserProfile.ROLE_MANAGER, self.hotel)
        self.client.force_authenticate(self.mgr)

    def _order(self, **body):
        body.setdefault('currency', 'USD')
        return self.client.post('/api/food-orders/', body, format='json')

    def test_cash_full(self):
        self.assertEqual(self._order(amount='100', payment_method='cash', amount_cash='100').status_code, 201)

    def test_electronic_full(self):
        self.assertEqual(self._order(amount='100', payment_method='electronic', amount_electronic='100').status_code, 201)

    def test_card_full(self):
        self.assertEqual(self._order(amount='100', payment_method='card', amount_card='100').status_code, 201)

    def test_room_account_full(self):
        self.assertEqual(self._order(amount='100', payment_method='room_account', amount_room='100').status_code, 201)

    def test_split_valid(self):
        self.assertEqual(self._order(amount='100', amount_cash='40', amount_electronic='30', amount_card='30').status_code, 201)

    def test_reject_sum_less(self):
        self.assertEqual(self._order(amount='100', amount_cash='50', amount_electronic='20').status_code, 400)

    def test_reject_sum_more(self):
        self.assertEqual(self._order(amount='100', amount_cash='80', amount_electronic='50').status_code, 400)

    def test_reject_negative(self):
        self.assertEqual(self._order(amount='100', amount_cash='-10', amount_electronic='110').status_code, 400)

    def test_edit_items_without_splits_ok(self):
        oid = self._order(amount='100', payment_method='cash', amount_cash='100').json()['id']
        r = self.client.patch(f'/api/food-orders/{oid}/', {'amount': '150'}, format='json')
        self.assertEqual(r.status_code, 200)                      # لا يُكسَر تعديل الأصناف
        self.assertEqual(float(FoodOrder.objects.get(id=oid).amount), 150)   # المصدر المالي محدَّث

    def test_patch_wrong_split_rejected(self):
        oid = self._order(amount='100', payment_method='cash', amount_cash='100').json()['id']
        r = self.client.patch(f'/api/food-orders/{oid}/', {'amount_cash': '40', 'amount_electronic': '40'}, format='json')
        self.assertEqual(r.status_code, 400)   # 80 ≠ 100


# ── حجوزات المدير: تحصين المخاطر الحرجة (منع الحجز المزدوج/الحذف/التواريخ/الحالة) ──
class ReservationManagerHardeningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.hotel = Hotel.objects.create(name='RH', city='D', status=Hotel.STATUS_ACTIVE)
        self.mgr = mk_user('rh_mgr', UserProfile.ROLE_MANAGER, self.hotel)
        self.room = Room.objects.create(hotel=self.hotel, number='101', type='single', price=100)
        self.client.force_authenticate(self.mgr)
        self.ci = date.today() + timedelta(days=3)
        self.co = date.today() + timedelta(days=6)

    def _mk(self, status=Reservation.STATUS_CONFIRMED):
        return Reservation.objects.create(
            hotel=self.hotel, room=self.room, guest_first_name='G', guest_last_name='X',
            check_in_date=self.ci, check_out_date=self.co, status=status, total=300)

    def _post(self, **over):
        body = {'guest_first_name': 'زبون', 'guest_last_name': 'ب', 'room': self.room.id,
                'check_in_date': self.ci.isoformat(), 'check_out_date': self.co.isoformat(),
                'room_price': 100, 'nights_count': 3, 'total': 300, 'public_booking': False}
        body.update(over)
        return self.client.post('/api/reservations/', body, format='json')

    def test_double_booking_blocked_on_manager_create(self):
        self._mk()                              # حجز قائم يشغل الغرفة في الفترة
        r = self._post()                        # تداخل كامل
        self.assertEqual(r.status_code, 400)
        self.assertIn('room', r.json())

    def test_non_overlapping_dates_allowed(self):
        self._mk()
        r = self._post(check_in_date=(self.co + timedelta(days=1)).isoformat(),
                       check_out_date=(self.co + timedelta(days=3)).isoformat())
        self.assertEqual(r.status_code, 201)

    def test_cancelled_reservation_frees_room(self):
        self._mk(status=Reservation.STATUS_CANCELLED)   # حالة غير حاجزة
        r = self._post()
        self.assertEqual(r.status_code, 201)

    def test_manager_cannot_hard_delete_reservation(self):
        res = self._mk()
        r = self.client.delete(f'/api/reservations/{res.id}/')
        self.assertEqual(r.status_code, 400)            # إبطال لا حذف
        self.assertTrue(Reservation.objects.filter(id=res.id).exists())

    def test_checkout_before_checkin_rejected(self):
        r = self._post(check_in_date=self.co.isoformat(), check_out_date=self.ci.isoformat())
        self.assertEqual(r.status_code, 400)
        self.assertIn('check_out_date', r.json())

    def test_guarded_status_transition_blocked_on_patch(self):
        res = self._mk()
        r = self.client.patch(f'/api/reservations/{res.id}/', {'status': 'checked_in'}, format='json')
        self.assertEqual(r.status_code, 400)            # يجب استخدام الإجراء المخصّص
        res.refresh_from_db()
        self.assertNotEqual(res.status, Reservation.STATUS_CHECKED_IN)
        ok = self.client.post(f'/api/reservations/{res.id}/check_in/', {}, format='json')
        self.assertEqual(ok.status_code, 200)           # الإجراء ينجح

    def test_confirm_via_patch_still_allowed(self):
        res = self._mk(status=Reservation.STATUS_PENDING)
        r = self.client.patch(f'/api/reservations/{res.id}/', {'status': 'confirmed'}, format='json')
        self.assertEqual(r.status_code, 200)            # pending→confirmed مسموح

    def test_update_does_not_conflict_with_self(self):
        res = self._mk()
        r = self.client.patch(f'/api/reservations/{res.id}/', {'notes': 'ملاحظة'}, format='json')
        self.assertEqual(r.status_code, 200)            # لا يتعارض الحجز مع نفسه

    def test_hotel_cancel_audits_and_frees_room(self):
        self.room.status = Room.STATUS_OCCUPIED
        self.room.save()
        res = self._mk()
        r = self.client.post(f'/api/reservations/{res.id}/hotel_cancel/', {'reason': 'اختبار'}, format='json')
        self.assertEqual(r.status_code, 200)
        res.refresh_from_db()
        self.assertEqual(res.status, Reservation.STATUS_CANCELLED)
        self.assertEqual(res.cancel_reason, 'اختبار')
        self.room.refresh_from_db()
        self.assertEqual(self.room.status, Room.STATUS_AVAILABLE)
        self.assertTrue(AuditLog.objects.filter(action='reservation.cancel', hotel_id=self.hotel.id).exists())
