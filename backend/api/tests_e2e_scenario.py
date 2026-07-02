"""المرحلة 12 — سيناريو التشغيل الشامل E2E (قابل للتنفيذ = دليل حقيقي).

ينفّذ سلسلة تشغيل كاملة عبر test client (API حقيقيّة): تهيئة صاحب المنصّة →
مدير الفندق → زائر/حجز عام → استقبال (دخول) → مطعم → فوليو (إبطال) → منع الخروج
بالدين → دفع → خروج → عمولة/مستحقات → إغلاق يوم → سجلّ تدقيق، مع حالات سلبية.

كل PASS مسنودٌ بـ assert فعليّ (تشغيل الاختبار = حدوث النتيجة فعلًا).
"""
from datetime import date, timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from .models import (
    Hotel, Room, Reservation, Package, Subscription, UserProfile,
    Payment, FolioCharge, FoodOrder, AuditLog, BookingCommission,
    PlatformRevenueSettings, PlatformSettings, HotelAgreementAcceptance,
    COMMISSION_PERCENTAGE,
)
from .permissions import _get_user_role

User = get_user_model()
PWD = 'Testpass123!'


class FullE2EScenarioTests(TestCase):
    def setUp(self):
        cache.clear()
        # ── (1) صاحب المنصّة يهيّئ المنصّة والفندق ─────────────────────────
        self.owner = User.objects.create_user('e2e_owner', password=PWD)
        UserProfile.objects.create(user=self.owner, role=UserProfile.ROLE_PLATFORM_OWNER)

        # عمولة منصّة فعّالة: 10% تُحتسب لحظة الإنشاء
        s = PlatformRevenueSettings.get_solo()
        s.enable_booking_commission = True
        s.allow_hotel_override = False
        s.default_commission_type = COMMISSION_PERCENTAGE
        s.default_commission_value = Decimal('10')
        s.default_commission_currency = 'USD'
        s.calculate_commission_on_status = PlatformRevenueSettings.CALC_ON_CREATED
        s.save()

        self.hotel = Hotel.objects.create(
            name='E2E Grand', city='Damascus', address='وسط المدينة',
            phone='0111', show_contact_info=True, status=Hotel.STATUS_ACTIVE,
            public_listing_enabled=True, public_booking_enabled=True, currency='USD',
            check_in_policy='من 14:00', check_out_policy='حتى 12:00')
        pkg = Package.objects.create(name='E2E Pkg', status=Package.STATUS_ACTIVE,
                                     allow_public_listing=True, allow_public_booking=True)
        Subscription.objects.create(hotel=self.hotel, package=pkg, status=Subscription.STATUS_ACTIVE)
        self.hotel.refresh_from_db()

        # ── (2) مدير الفندق + غرفة ────────────────────────────────────────
        self.mgr = User.objects.create_user('e2e_mgr', password=PWD)
        UserProfile.objects.create(user=self.mgr, role=UserProfile.ROLE_MANAGER, hotel=self.hotel)
        self.rec = User.objects.create_user('e2e_rec', password=PWD)
        UserProfile.objects.create(user=self.rec, role=UserProfile.ROLE_RECEPTION, hotel=self.hotel)
        self.room = Room.objects.create(hotel=self.hotel, number='101', floor=1, type='single',
                                        capacity=2, price=Decimal('100'), currency='USD',
                                        status=Room.STATUS_AVAILABLE, show_in_public=True)
        self.ci = (date.today() + timedelta(days=3)).isoformat()
        self.co = (date.today() + timedelta(days=5)).isoformat()   # ليلتان × 100 = 200

    # أدوات
    def _pub(self):
        return APIClient()

    def _mgr(self):
        c = APIClient(); c.force_authenticate(self.mgr); return c

    def _rec(self):
        c = APIClient(); c.force_authenticate(self.rec); return c

    def _balance(self, res_id):
        return float(self._mgr().get(f'/api/reservations/{res_id}/').json()['balance_due'])

    def _book(self, phone='+963 944 123 456'):
        return self._pub().post('/api/public/bookings/', {
            'hotel_id': self.hotel.id, 'room_type': 'single',
            'check_in_date': self.ci, 'check_out_date': self.co, 'guests_count': 1,
            'guest_first_name': 'زائر', 'guest_last_name': 'اختبار', 'guest_phone': phone,
            'guest_email': 'visitor@example.com'}, format='json')

    # ── السيناريو الكامل (المسار الناجح) ──────────────────────────────────
    def test_full_operational_scenario(self):
        pub = self._pub(); mgr = self._mgr(); rec = self._rec()

        # (1) أدوار رسمية
        self.assertEqual(_get_user_role(self.owner), 'platform_owner')
        self.assertEqual(_get_user_role(self.mgr), 'manager')
        self.assertEqual(_get_user_role(self.rec), 'reception')
        self.assertEqual(self.mgr.profile.hotel_id, self.hotel.id)

        # (2)+(3) ظهور الفندق العام + التفاصيل + التوفّر
        listing = pub.get('/api/public/hotels/').json()
        self.assertIn(self.hotel.id, [h['id'] for h in listing])
        self.assertEqual(pub.get(f'/api/public/hotels/{self.hotel.slug}/').status_code, 200)
        avail = pub.get(f'/api/public/hotels/{self.hotel.slug}/availability/'
                        f'?check_in={self.ci}&check_out={self.co}&guests=1').json()
        self.assertTrue(any(rt['room_type'] == 'single' for rt in avail))

        # (3) حجز عام
        bk = self._book()
        self.assertEqual(bk.status_code, 201)
        d = bk.json()
        self.assertTrue(d['public_booking_no'] and d['manage_token'] and d['manage_url'])
        self.assertIn(d['manage_token'], d['manage_url'])
        no, tok = d['public_booking_no'], d['manage_token']
        res = Reservation.objects.get(public_booking_no=no)
        self.assertEqual(float(res.total), 200.0)

        # (3.8) lookup لا يكشف الرمز/الرابط + الهاتف مقنّع
        lk = pub.get(f'/api/public/manage-booking/?no={no}&phone=0944123456')  # صيغة مختلفة (م5)
        self.assertEqual(lk.status_code, 200)
        self.assertNotIn('manage_token', lk.json())
        self.assertNotIn('manage_url', lk.json())
        self.assertIn('*', lk.json()['guest_phone'])

        # (3.10) الحجز يظهر في لوحة الفندق الداخلية
        internal = mgr.get('/api/reservations/').json()
        self.assertIn(res.id, [x['id'] for x in internal])

        # (4) الاستقبال: check-in
        r = rec.post(f'/api/reservations/{res.id}/check_in/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        res.refresh_from_db(); self.room.refresh_from_db()
        self.assertEqual(res.status, Reservation.STATUS_CHECKED_IN)
        self.assertEqual(self.room.status, Room.STATUS_OCCUPIED)

        # (6) FolioCharge: يدخل الرصيد ثم يُبطَل فيُستثنى ويبقى ظاهرًا + Audit
        bal0 = self._balance(res.id)                       # = 200 (الغرفة)
        fc = mgr.post('/api/folio-charges/', {'reservation': res.id, 'amount': '50',
                                              'charge_type': 'service', 'description': 'ميني‑بار'}, format='json')
        self.assertEqual(fc.status_code, 201)
        fid = fc.json()['id']
        self.assertEqual(self._balance(res.id), bal0 + 50)
        vr = mgr.post(f'/api/folio-charges/{fid}/void/', {'reason': 'شطب خاطئ'}, format='json')
        self.assertEqual(vr.status_code, 200)
        self.assertTrue(vr.json()['voided'])
        self.assertEqual(self._balance(res.id), bal0)      # مُستثنى
        self.assertTrue(FolioCharge.objects.get(id=fid).voided)  # باقٍ كسجلّ مبطل
        self.assertTrue(AuditLog.objects.filter(action='folio_charge.void', hotel=self.hotel).exists())

        # (5) FoodOrder نقديّ كامل — متّسق ولا يؤثّر في الرصيد (ليس على الغرفة)
        fo = rec.post('/api/food-orders/', {'amount': '40', 'currency': 'USD',
                                            'payment_method': 'cash', 'amount_cash': '40',
                                            'reservation': res.id, 'items': [{'name': 'عصير', 'price': 40}]},
                      format='json')
        self.assertEqual(fo.status_code, 201)
        self.assertEqual(self._balance(res.id), bal0)      # النقديّ لا يدخل الذمّة

        # (7) منع الخروج بالدين (رصيد الغرفة 200 غير مدفوع)
        blocked = rec.post(f'/api/reservations/{res.id}/check_out/', {}, format='json')
        self.assertEqual(blocked.status_code, 402)
        self.assertEqual(blocked.json().get('code'), 'balance_due')

        # (7) دفعة تسوية = 200 → الرصيد 0
        pay = rec.post('/api/payments/', {'reservation': res.id, 'amount': '200',
                                          'method': 'cash', 'currency': 'USD'}, format='json')
        self.assertEqual(pay.status_code, 201)
        self.assertEqual(self._balance(res.id), 0.0)

        # (8) الخروج ينجح + الغرفة → تنظيف
        out = rec.post(f'/api/reservations/{res.id}/check_out/', {}, format='json')
        self.assertEqual(out.status_code, 200)
        res.refresh_from_db(); self.room.refresh_from_db()
        self.assertEqual(res.status, Reservation.STATUS_CHECKED_OUT)
        self.assertEqual(self.room.status, Room.STATUS_CLEANING)

        # (9) عمولة المنصّة = 200 × 10% = 20 (snapshot) + تظهر لصاحب المنصّة
        bc = BookingCommission.objects.get(reservation=res)
        self.assertEqual(float(bc.commission_amount), 20.0)
        self.assertEqual(bc.commission_currency, 'USD')
        res.refresh_from_db()
        self.assertEqual(float(res.platform_commission_amount), 20.0)
        owner = APIClient(); owner.force_authenticate(self.owner)
        self.assertEqual(owner.get('/api/platform/earnings/').status_code, 200)

        # (10) إغلاق اليوم (المدير) — بلا أخطاء حاجزة بعد الخروج
        dc = mgr.post('/api/day-close/', {}, format='json')
        self.assertEqual(dc.status_code, 201)
        self.assertGreaterEqual(float(dc.json()['snapshot']['payments_total']), 200.0)

        # (11) سجلّ التدقيق يحوي الأحداث الحسّاسة
        actions = set(AuditLog.objects.filter(hotel=self.hotel).values_list('action', flat=True))
        for a in ('reservation.check_in', 'folio_charge.void', 'payment.create',
                  'reservation.check_out', 'day.close'):
            self.assertIn(a, actions)

    # ── (5.3) طلب على حساب الغرفة يظهر كرصيد مستحق ─────────────────────────
    def test_room_account_food_enters_balance(self):
        rec = self._rec()
        res = Reservation.objects.create(hotel=self.hotel, room=self.room, guest_first_name='ن',
                                         guest_last_name='ن', total=Decimal('100'), currency='USD',
                                         status=Reservation.STATUS_CHECKED_IN)
        before = self._balance(res.id)
        fo = rec.post('/api/food-orders/', {'amount': '30', 'currency': 'USD',
                                            'payment_method': 'room_account', 'amount_room': '30',
                                            'reservation': res.id, 'room': self.room.id,
                                            'items': [{'name': 'عشاء', 'price': 30}]}, format='json')
        self.assertEqual(fo.status_code, 201)
        self.assertEqual(self._balance(res.id), before + 30)   # دخل الذمّة (رصيد مستحق)

    # ── حالات سلبية ───────────────────────────────────────────────────────
    def test_neg_hidden_hotel_not_bookable(self):
        self.hotel.public_listing_enabled = False; self.hotel.save()
        self.assertEqual(self._book().status_code, 400)

    def test_neg_agreement_required_then_accepted(self):
        s = PlatformSettings.get_solo()
        s.web_booking_agreement = 'اتفاقية فعّالة'; s.agreement_version = 1; s.save()
        self.assertEqual(self._book().status_code, 400)            # قبل القبول
        HotelAgreementAcceptance.objects.create(hotel=self.hotel, version=1)
        self.assertEqual(self._book().status_code, 201)            # بعد القبول

    def test_neg_non_public_room_hidden_in_availability(self):
        self.room.show_in_public = False; self.room.save()
        avail = self._pub().get(f'/api/public/hotels/{self.hotel.slug}/availability/'
                                f'?check_in={self.ci}&check_out={self.co}&guests=1').json()
        self.assertEqual(avail, [])

    def test_neg_folio_void_without_reason_rejected(self):
        res = Reservation.objects.create(hotel=self.hotel, guest_first_name='x', guest_last_name='y', total=10)
        mgr = self._mgr()
        fid = mgr.post('/api/folio-charges/', {'reservation': res.id, 'amount': '5'}, format='json').json()['id']
        self.assertEqual(mgr.post(f'/api/folio-charges/{fid}/void/', {}, format='json').status_code, 400)

    def test_neg_no_profile_user_forbidden(self):
        u = User.objects.create_user('e2e_noprofile', password=PWD)
        c = APIClient(); c.force_authenticate(u)
        self.assertEqual(c.get('/api/rooms/').status_code, 403)

    def test_neg_throttling_returns_429(self):
        with mock.patch.dict(SimpleRateThrottle.THROTTLE_RATES, {'public_booking': '2/minute'}):
            cache.clear()
            self.assertNotEqual(self._pub().post('/api/public/bookings/', {}, format='json').status_code, 429)
            self.assertNotEqual(self._pub().post('/api/public/bookings/', {}, format='json').status_code, 429)
            self.assertEqual(self._pub().post('/api/public/bookings/', {}, format='json').status_code, 429)
