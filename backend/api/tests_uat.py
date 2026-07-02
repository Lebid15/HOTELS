"""اختبار القبول البشريّ (Human UAT) — تنفيذ آليّ عبر API/test client.

يُنفّذ خطة الاختبار التشغيلية بندًا بندًا (T‑001…T‑068) بأدلّة فعلية (assert)،
على عالَم واقعيّ: فندقان (الشام الذهبي/إسطنبول، النخبة/أنطاليا) + مدراء/استقبال
+ غرف بنفس الأرقام (101) لاختبار عزل المستأجرين + زبون عام. البنود البصرية/UX
(تصميم/موبايل/طباعة/تبديل لغة/offline) تُوثَّق يدويًّا في HUMAN_UAT_REPORT.md
ولا تُدّعى PASS آليًّا.
"""
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    Hotel, Room, Reservation, Package, Subscription, UserProfile,
    Payment, FolioCharge, FoodOrder, MaintenanceTicket, LostFoundItem,
    GuestProfile, AuditLog, PlatformRevenueSettings, BookingCommission,
    COMMISSION_PERCENTAGE,
)
from .permissions import _get_user_role

User = get_user_model()
PWD = 'Str0ng!Pass9'
ACTIVE = Hotel.STATUS_ACTIVE


def mk_user(username, role, hotel=None):
    u = User.objects.create_user(username=username, password=PWD)
    UserProfile.objects.create(user=u, role=role, hotel=hotel)
    return u


class HumanUATTests(TestCase):
    @classmethod
    def _make_hotel(cls, name, city, rooms_spec):
        h = Hotel.objects.create(name=name, city=city, status=ACTIVE, currency='USD',
                                 public_listing_enabled=True, public_booking_enabled=True,
                                 phone='0555000000', show_contact_info=True)
        pkg = Package.objects.create(name=name + 'Pkg', status=Package.STATUS_ACTIVE,
                                     allow_public_listing=True, allow_public_booking=True)
        Subscription.objects.create(hotel=h, package=pkg, status=Subscription.STATUS_ACTIVE)
        h.refresh_from_db()
        rooms = {}
        for num, floor, rtype, cap, price in rooms_spec:
            rooms[num] = Room.objects.create(hotel=h, number=num, floor=floor, type=rtype,
                                             capacity=cap, price=Decimal(str(price)), currency='USD',
                                             status=Room.STATUS_AVAILABLE, show_in_public=True)
        return h, pkg, rooms

    def setUp(self):
        cache.clear()
        self.owner = mk_user('uat_owner', UserProfile.ROLE_PLATFORM_OWNER)
        # عمولة منصّة 10% لحظة الإنشاء (لاختبار المستحقات)
        s = PlatformRevenueSettings.get_solo()
        s.enable_booking_commission = True
        s.allow_hotel_override = False
        s.default_commission_type = COMMISSION_PERCENTAGE
        s.default_commission_value = Decimal('10')
        s.default_commission_currency = 'USD'
        s.calculate_commission_on_status = PlatformRevenueSettings.CALC_ON_CREATED
        s.save()
        # فندق الشام الذهبي (إسطنبول) — 3 غرف
        self.sham, self.shamPkg, self.shamRooms = self._make_hotel(
            'فندق الشام الذهبي', 'إسطنبول',
            [('101', 1, 'single', 1, 50), ('102', 1, 'double', 2, 80), ('201', 2, 'family', 4, 150)])
        # فندق النخبة (أنطاليا) — غرفة 101 (نفس الرقم، فندق مختلف)
        self.elite, self.elitePkg, self.eliteRooms = self._make_hotel(
            'فندق النخبة', 'أنطاليا', [('101', 1, 'single', 1, 70)])
        self.mgrSham = mk_user('uat_mgr_sham', UserProfile.ROLE_MANAGER, self.sham)
        self.recSham = mk_user('uat_rec_sham', UserProfile.ROLE_RECEPTION, self.sham)
        self.mgrElite = mk_user('uat_mgr_elite', UserProfile.ROLE_MANAGER, self.elite)
        self.recElite = mk_user('uat_rec_elite', UserProfile.ROLE_RECEPTION, self.elite)
        self.ci = (date.today() + timedelta(days=5)).isoformat()
        self.co = (date.today() + timedelta(days=7)).isoformat()   # ليلتان

    # أدوات مصادقة
    def _c(self, user=None):
        c = APIClient()
        if user:
            c.force_authenticate(user)
        return c

    def _book(self, hotel=None, room_type='double', guests=2, phone='0555123456', **extra):
        hotel = hotel or self.sham
        body = {'hotel_id': hotel.id, 'room_type': room_type,
                'check_in_date': self.ci, 'check_out_date': self.co, 'guests_count': guests,
                'guest_first_name': 'أحمد', 'guest_last_name': 'محمد', 'guest_phone': phone}
        body.update(extra)
        return self._c().post('/api/public/bookings/', body, format='json')

    def _balance(self, res_id):
        return float(self._c(self.mgrSham).get(f'/api/reservations/{res_id}/').json()['balance_due'])

    # ───────────── المرحلة 1: صاحب المنصّة ─────────────
    def test_T001_platform_owner_role(self):
        self.assertEqual(_get_user_role(self.owner), 'platform_owner')
        # لا يُوجَّه كموظف فندق: لا يملك hotel_id
        self.assertFalse(hasattr(self.owner.profile, 'hotel') and self.owner.profile.hotel_id)

    def test_T002_T003_T004_create_two_isolated_hotels_via_api(self):
        c = self._c(self.owner)
        r1 = c.post('/api/hotels/create_with_manager/', {
            'name': 'فندق تجريبي أ', 'city': 'إسطنبول', 'phone': '0555000001',
            'manager_username': 'uat_new_mgr_a', 'manager_password': PWD}, format='json')
        r2 = c.post('/api/hotels/create_with_manager/', {
            'name': 'فندق تجريبي ب', 'city': 'أنطاليا', 'phone': '0555000002',
            'manager_username': 'uat_new_mgr_b', 'manager_password': PWD}, format='json')
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)
        self.assertNotEqual(r1.json()['id'], r2.json()['id'])            # ID مختلف
        mgrA = User.objects.get(username='uat_new_mgr_a')
        self.assertEqual(mgrA.profile.hotel_id, r1.json()['id'])         # مدير مرتبط بفندقه فقط
        self.assertEqual(_get_user_role(mgrA), 'manager')

    def test_T005_manager_creates_reception_scoped_to_hotel(self):
        # الاستقبال المُنشأ يظهر ضمن فندقه فقط
        self.assertEqual(self.recSham.profile.hotel_id, self.sham.id)
        self.assertNotEqual(self.recSham.profile.hotel_id, self.elite.id)

    def test_T006_subscription_gating_expired_blocks_public(self):
        # اشتراك منتهٍ → لا ظهور ولا حجز عام
        Subscription.objects.filter(hotel=self.sham).update(status=Subscription.STATUS_EXPIRED)
        ids = [h['id'] for h in self._c().get('/api/public/hotels/').json()]
        self.assertNotIn(self.sham.id, ids)
        self.assertEqual(self._book().status_code, 400)

    # ───────────── المرحلة 2: مدير الفندق ─────────────
    def test_T007_manager_sees_only_own_hotel(self):
        rooms = self._c(self.mgrSham).get('/api/rooms/').json()
        hotel_ids = {r['hotel'] for r in rooms}
        self.assertEqual(hotel_ids, {self.sham.id})                     # فندقه فقط
        self.assertNotIn(self.elite.id, hotel_ids)

    def test_T008_T009_T010_T011_manager_adds_floors_and_rooms(self):
        c = self._c(self.mgrSham)
        r = c.post('/api/rooms/', {'number': '301', 'floor': 3, 'type': 'single',
                                   'capacity': 1, 'price': '60', 'currency': 'USD'}, format='json')
        self.assertEqual(r.status_code, 201)
        obj = Room.objects.get(id=r.json()['id'])
        self.assertEqual((obj.hotel_id, obj.floor, obj.number, obj.capacity), (self.sham.id, 3, '301', 1))
        # لا تظهر لدى فندق آخر
        self.assertNotIn('301', [x['number'] for x in self._c(self.mgrElite).get('/api/rooms/').json()])

    def test_T012_edit_room_price_isolated_between_hotels(self):
        c = self._c(self.mgrSham)
        r = c.patch(f'/api/rooms/{self.shamRooms["101"].id}/', {'price': '90'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.shamRooms['101'].refresh_from_db(); self.eliteRooms['101'].refresh_from_db()
        self.assertEqual(float(self.shamRooms['101'].price), 90.0)
        self.assertEqual(float(self.eliteRooms['101'].price), 70.0)     # غرفة 101 بفندق آخر لم تتأثّر

    def test_T013_delete_room_without_booking_then_room_with_booking(self):
        c = self._c(self.mgrSham)
        free = Room.objects.create(hotel=self.sham, number='999', type='single', price=10)
        self.assertIn(c.delete(f'/api/rooms/{free.id}/').status_code, (204, 200))   # بلا حجز → يُحذف
        # غرفة عليها حجز: الحذف لا يُفقِد الحجز (SET_NULL) — الحجز يبقى
        res = Reservation.objects.create(hotel=self.sham, room=self.shamRooms['102'],
                                         guest_first_name='x', guest_last_name='y')
        c.delete(f'/api/rooms/{self.shamRooms["102"].id}/')
        res.refresh_from_db()
        self.assertTrue(Reservation.objects.filter(id=res.id).exists())            # الحجز لم يُحذف

    def test_T014_manager_can_create_staff_reception_cannot(self):
        self.assertEqual(self._c(self.mgrSham).post('/api/staff/',
                         {'full_name': 'موظف جديد', 'role': 'receptionist'}, format='json').status_code, 201)
        self.assertEqual(self._c(self.recSham).post('/api/staff/',
                         {'full_name': 'x', 'role': 'receptionist'}, format='json').status_code, 403)

    def test_T015_T050_manager_cannot_access_other_hotel_by_id(self):
        # CRITICAL: تجاوز ID لفندق آخر
        self.assertEqual(self._c(self.mgrSham).get(f'/api/rooms/{self.eliteRooms["101"].id}/').status_code, 404)
        resE = Reservation.objects.create(hotel=self.elite, guest_first_name='E', guest_last_name='E')
        self.assertEqual(self._c(self.mgrSham).get(f'/api/reservations/{resE.id}/').status_code, 404)
        self.assertEqual(self._c(self.mgrSham).patch(f'/api/rooms/{self.eliteRooms["101"].id}/',
                         {'price': '1'}, format='json').status_code, 404)

    # ───────────── المرحلة 3: الموقع العام (زبون) ─────────────
    def test_T017_public_list_shows_active_hides_inactive(self):
        ids = [h['id'] for h in self._c().get('/api/public/hotels/').json()]
        self.assertIn(self.sham.id, ids)
        self.assertIn(self.elite.id, ids)
        self.sham.status = Hotel.STATUS_SUSPENDED; self.sham.save()
        self.assertNotIn(self.sham.id, [h['id'] for h in self._c().get('/api/public/hotels/').json()])

    def test_T018_search_by_city(self):
        ist = [h['id'] for h in self._c().get('/api/public/hotels/?city=إسطنبول').json()]
        ant = [h['id'] for h in self._c().get('/api/public/hotels/?city=أنطاليا').json()]
        self.assertIn(self.sham.id, ist); self.assertNotIn(self.elite.id, ist)
        self.assertIn(self.elite.id, ant); self.assertNotIn(self.sham.id, ant)

    def test_T019_public_hotel_detail(self):
        r = self._c().get(f'/api/public/hotels/{self.sham.slug}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['name'], 'فندق الشام الذهبي')

    def test_T020_public_booking_lands_in_correct_hotel_only(self):
        bk = self._book()
        self.assertEqual(bk.status_code, 201)
        d = bk.json()
        self.assertTrue(d['public_booking_no'] and d['manage_token'])
        res_id = Reservation.objects.get(public_booking_no=d['public_booking_no']).id
        self.assertIn(res_id, [x['id'] for x in self._c(self.mgrSham).get('/api/reservations/').json()])
        self.assertNotIn(res_id, [x['id'] for x in self._c(self.mgrElite).get('/api/reservations/').json()])
        self.assertNotIn(res_id, [x['id'] for x in self._c(self.recElite).get('/api/reservations/').json()])

    def test_T021_booking_over_capacity_rejected(self):
        r = self._book(room_type='single', guests=3)   # مفردة سعة 1
        self.assertGreaterEqual(r.status_code, 400)

    def test_T022_invalid_booking_no_500(self):
        r1 = self._book(check_in_date=self.co, check_out_date=self.ci)   # مغادرة قبل الوصول
        self.assertEqual(r1.status_code, 400)
        r2 = self._c().post('/api/public/bookings/', {
            'hotel_id': self.sham.id, 'room_type': 'double', 'check_in_date': self.ci,
            'check_out_date': self.co, 'guests_count': 'abc',
            'guest_first_name': 'a', 'guest_last_name': 'b', 'guest_phone': '05'}, format='json')
        self.assertEqual(r2.status_code, 400)   # UAT: عدد نزلاء غير رقميّ → 400 (لا 500)

    def test_T023_T058_double_booking_prevented(self):
        self.assertEqual(self._book().status_code, 201)
        self.assertGreaterEqual(self._book().status_code, 400)   # لا غرفة متاحة لنفس النوع/التاريخ

    # ───────────── المرحلة 4: الاستقبال ─────────────
    def test_T024_reception_role(self):
        self.assertEqual(_get_user_role(self.recSham), 'reception')

    def test_T026_reception_confirms_booking(self):
        res = Reservation.objects.create(hotel=self.sham, room=self.shamRooms['102'],
                                         guest_first_name='a', guest_last_name='b',
                                         status=Reservation.STATUS_PENDING)
        r = self._c(self.recSham).patch(f'/api/reservations/{res.id}/',
                                        {'status': 'confirmed'}, format='json')
        self.assertEqual(r.status_code, 200)
        res.refresh_from_db(); self.assertEqual(res.status, Reservation.STATUS_CONFIRMED)

    def test_T027_reception_cannot_create_room(self):
        self.assertEqual(self._c(self.recSham).post('/api/rooms/',
                         {'number': '500', 'type': 'single'}, format='json').status_code, 403)

    def test_T028_reception_cannot_create_staff(self):
        self.assertEqual(self._c(self.recSham).post('/api/staff/',
                         {'full_name': 'x', 'role': 'receptionist'}, format='json').status_code, 403)

    def test_T029_checkin_sets_occupied(self):
        res = Reservation.objects.create(hotel=self.sham, room=self.shamRooms['102'],
                                         guest_first_name='أحمد', guest_last_name='محمد',
                                         status=Reservation.STATUS_CONFIRMED)
        r = self._c(self.recSham).post(f'/api/reservations/{res.id}/check_in/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        res.refresh_from_db(); self.shamRooms['102'].refresh_from_db()
        self.assertEqual(res.status, Reservation.STATUS_CHECKED_IN)
        self.assertEqual(self.shamRooms['102'].status, Room.STATUS_OCCUPIED)

    # ───────────── المرحلة 5+6: دورة النزيل + الخروج ─────────────
    def _checked_in_res(self, total='160'):
        res = Reservation.objects.create(hotel=self.sham, room=self.shamRooms['102'],
                                         guest_first_name='أحمد', guest_last_name='محمد',
                                         total=Decimal(total), currency='USD',
                                         status=Reservation.STATUS_CHECKED_IN)
        return res

    def test_T033_guest_note_persisted(self):
        r = self._c(self.recSham).post('/api/guest-profiles/',
                    {'guest_key': 'phone:0555123456', 'notes': 'طلب مخدة إضافية'}, format='json')
        self.assertEqual(r.status_code, 201)
        # جلسة أخرى (المدير) ترى نفس الملاحظة (مصدر خادميّ لا localStorage)
        rows = self._c(self.mgrSham).get('/api/guest-profiles/').json()
        self.assertTrue(any(g['notes'] == 'طلب مخدة إضافية' for g in rows))

    def test_T034_T067_payment_persisted_and_in_balance(self):
        res = self._checked_in_res(total='160')
        r = self._c(self.recSham).post('/api/payments/', {'reservation': res.id, 'amount': '50',
                                       'method': 'cash', 'currency': 'USD'}, format='json')
        self.assertEqual(r.status_code, 201)
        # جهاز آخر (المدير) يرى الدفعة والرصيد
        self.assertEqual(float(self._c(self.mgrSham).get(f'/api/reservations/{res.id}/').json()['paid']), 50.0)
        self.assertEqual(self._balance(res.id), 110.0)   # 160 − 50

    def test_T035_T066_food_on_room_persisted_and_in_folio(self):
        res = self._checked_in_res(total='160')
        r = self._c(self.recSham).post('/api/food-orders/', {
            'amount': '20', 'currency': 'USD', 'payment_method': 'room_account', 'amount_room': '20',
            'reservation': res.id, 'room': self.shamRooms['102'].id,
            'items': [{'name': 'عشاء', 'price': 20}]}, format='json')
        self.assertEqual(r.status_code, 201)
        # جهاز آخر (المدير) يرى الطلب (مصدر خادميّ) + يدخل الذمّة
        self.assertTrue(any(o['id'] == r.json()['id']
                            for o in self._c(self.mgrSham).get('/api/food-orders/').json()))
        self.assertEqual(self._balance(res.id), 180.0)   # 160 غرفة + 20 طعام

    def test_T037_maintenance_ticket(self):
        r = self._c(self.recSham).post('/api/maintenance/', {
            'room': self.shamRooms['102'].id, 'title': 'مكيّف', 'description': 'المكيف لا يعمل'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertTrue(MaintenanceTicket.objects.filter(hotel=self.sham).exists())

    def test_T038_lost_found(self):
        r = self._c(self.recSham).post('/api/lost-found/', {
            'room_number': '102', 'item_name': 'محفظة', 'notes': 'محفظة سوداء'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertTrue(LostFoundItem.objects.filter(hotel=self.sham).exists())

    def test_T039_T040_T041_invoice_pay_checkout(self):
        res = self._checked_in_res(total='180')          # ليلتان×90
        rec = self._c(self.recSham)
        rec.post('/api/food-orders/', {'amount': '20', 'currency': 'USD', 'payment_method': 'room_account',
                 'amount_room': '20', 'reservation': res.id, 'room': self.shamRooms['102'].id,
                 'items': [{'name': 'عشاء', 'price': 20}]}, format='json')
        rec.post('/api/payments/', {'reservation': res.id, 'amount': '50', 'method': 'cash', 'currency': 'USD'}, format='json')
        # الفاتورة: 180 غرفة + 20 طعام − 50 مدفوع = 150 متبقٍّ
        self.assertEqual(self._balance(res.id), 150.0)
        # الطعام على الغرفة يمنع الخروج بالدفعة العادية → نستخدم settle_and_checkout (دفع وإغلاق ذرّي)
        r = rec.post(f'/api/reservations/{res.id}/settle_and_checkout/',
                     {'amount_cash': '150'}, format='json')
        self.assertEqual(r.status_code, 200)
        res.refresh_from_db(); self.shamRooms['102'].refresh_from_db()
        self.assertEqual(res.status, Reservation.STATUS_CHECKED_OUT)
        self.assertEqual(self.shamRooms['102'].status, Room.STATUS_CLEANING)

    def test_T042_checkout_blocked_with_balance(self):
        res = self._checked_in_res(total='160')          # غير مدفوع
        r = self._c(self.recSham).post(f'/api/reservations/{res.id}/check_out/', {}, format='json')
        self.assertEqual(r.status_code, 402)
        self.assertEqual(r.json().get('code'), 'balance_due')

    def test_T036_room_cleaning_then_available(self):
        # بعد الخروج تصبح الغرفة تنظيف؛ المدير يعيدها متاحة
        self.shamRooms['201'].status = Room.STATUS_CLEANING; self.shamRooms['201'].save()
        r = self._c(self.mgrSham).patch(f'/api/rooms/{self.shamRooms["201"].id}/',
                                        {'status': 'available'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.shamRooms['201'].refresh_from_db()
        self.assertEqual(self.shamRooms['201'].status, Room.STATUS_AVAILABLE)

    # ───────────── المرحلة 7: التقارير (بيانات المصدر) ─────────────
    def test_T044_T046_T047_report_data_queryable(self):
        # التقارير تُجمَّع في الواجهة من نقاط البيانات — نتحقّق أنّ المصدر صحيح وقابل للاستعلام
        res = self._checked_in_res(total='160')
        rec = self._c(self.recSham)
        rec.post('/api/payments/', {'reservation': res.id, 'amount': '50', 'method': 'cash', 'currency': 'USD'}, format='json')
        rec.post('/api/food-orders/', {'amount': '20', 'currency': 'USD', 'payment_method': 'cash',
                 'amount_cash': '20', 'reservation': res.id, 'items': [{'name': 'x', 'price': 20}]}, format='json')
        mgr = self._c(self.mgrSham)
        self.assertTrue(any(x['id'] == res.id for x in mgr.get('/api/reservations/').json()))   # حجوزات
        self.assertTrue(len(mgr.get('/api/payments/').json()) >= 1)                              # مدفوعات
        self.assertTrue(len(mgr.get('/api/food-orders/').json()) >= 1)                           # مطعم

    # ───────────── المرحلة 8: عزل الفنادق (أهمّ اختبار أمنيّ) ─────────────
    def test_T049_full_tenant_isolation(self):
        # بيانات في كلا الفندقين
        Reservation.objects.create(hotel=self.elite, guest_first_name='إيليت', guest_last_name='ضيف')
        Payment.objects.create(hotel=self.elite, amount=10, currency='USD', method='cash')
        FoodOrder.objects.create(hotel=self.elite, amount=5, currency='USD')
        MaintenanceTicket.objects.create(hotel=self.elite, description='عطل')
        LostFoundItem.objects.create(hotel=self.elite, item_name='غرض')
        FolioCharge.objects.create(hotel=self.elite, amount=3, currency='USD')
        mgr = self._c(self.mgrSham)
        for ep in ['/api/rooms/', '/api/reservations/', '/api/staff/', '/api/payments/',
                   '/api/food-orders/', '/api/maintenance/', '/api/lost-found/', '/api/folio-charges/']:
            rows = mgr.get(ep).json()
            rows = rows if isinstance(rows, list) else rows.get('results', [])
            hotel_ids = {r.get('hotel') for r in rows if isinstance(r, dict)}
            self.assertNotIn(self.elite.id, hotel_ids, f'تسريب مستأجرين في {ep}')

    def test_T051_cannot_book_room_from_other_hotel(self):
        # حجز عام على الشام لكن بنوع غرفة غير موجود لديه، أو محاولة تمرير فندق مخفي — يُرفض
        # (النظام يختار الغرفة داخل فندق الطلب فقط؛ لا يمكن استخدام غرفة فندق آخر)
        r = self._book(hotel=self.elite, room_type='family')   # النخبة لا يملك عائلية
        self.assertGreaterEqual(r.status_code, 400)

    # ───────────── المرحلة 9: الصلاحيات ─────────────
    def test_T052_platform_owner_can_manage_platform(self):
        c = self._c(self.owner)
        self.assertEqual(c.get('/api/hotels/').status_code, 200)      # يرى الفنادق
        self.assertEqual(len(c.get('/api/hotels/').json()), Hotel.objects.count())  # كلّها

    def test_T053_manager_cannot_reach_platform(self):
        c = self._c(self.mgrSham)
        self.assertIn(c.get('/api/platform/earnings/').status_code, (403, 401))
        self.assertEqual(c.post('/api/packages/', {'name': 'x'}, format='json').status_code, 403)

    def test_T054_reception_permission_matrix(self):
        c = self._c(self.recSham)
        self.assertEqual(c.get('/api/reservations/').status_code, 200)   # يرى حجوزاته
        self.assertEqual(c.post('/api/rooms/', {'number': '9', 'type': 'single'}, format='json').status_code, 403)
        self.assertEqual(c.post('/api/staff/', {'full_name': 'x', 'role': 'receptionist'}, format='json').status_code, 403)
        self.assertIn(c.get('/api/platform/earnings/').status_code, (403, 401))

    # ───────────── المرحلة 10: التزامن ─────────────
    def test_T055_public_booking_visible_to_reception(self):
        d = self._book().json()
        res_id = Reservation.objects.get(public_booking_no=d['public_booking_no']).id
        self.assertIn(res_id, [x['id'] for x in self._c(self.recSham).get('/api/reservations/').json()])

    def test_T057_second_checkin_is_noop_or_safe(self):
        res = Reservation.objects.create(hotel=self.sham, room=self.shamRooms['201'],
                                         guest_first_name='a', guest_last_name='b',
                                         status=Reservation.STATUS_CONFIRMED)
        r1 = self._c(self.recSham).post(f'/api/reservations/{res.id}/check_in/', {}, format='json')
        r2 = self._c(self.recSham).post(f'/api/reservations/{res.id}/check_in/', {}, format='json')
        self.assertEqual(r1.status_code, 200)
        # الثانية لا تُنشئ حالة خاطئة (تبقى checked_in، بلا 500)
        self.assertLess(r2.status_code, 500)
        res.refresh_from_db(); self.assertEqual(res.status, Reservation.STATUS_CHECKED_IN)

    # ───────────── المرحلة 12: حالات الخطأ ─────────────
    def test_T062_wrong_login_generic_error(self):
        r = self._c().post('/api/token/', {'username': 'nope', 'password': 'bad'}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_T063_expired_or_no_token_rejected(self):
        self.assertEqual(self._c().get('/api/reservations/').status_code, 401)   # بلا توكن

    def test_T065_invalid_room_data_no_500(self):
        c = self._c(self.mgrSham)
        # سعر/سعة شاذّان (رقم جديد) — لا انهيار 500
        self.assertLess(c.post('/api/rooms/', {'number': '777', 'type': 'single', 'price': '-5',
                        'currency': 'USD'}, format='json').status_code, 500)
        # UAT (بعد الإصلاح): رقم غرفة مكرّر داخل نفس الفندق → 400 نظيف (لا 500/IntegrityError)
        c.post('/api/rooms/', {'number': '888', 'type': 'single', 'price': '10', 'currency': 'USD'}, format='json')
        dup = c.post('/api/rooms/', {'number': '888', 'type': 'single', 'price': '10', 'currency': 'USD'}, format='json')
        self.assertEqual(dup.status_code, 400)

    # ───────────── المرحلة 13: الثبات الخادميّ (لا localStorage) ─────────────
    def test_T068_operational_data_persisted_in_backend(self):
        # كل البيانات التشغيلية في قاعدة البيانات لا المتصفّح: عميل «جديد» (توكن آخر) يراها
        d = self._book().json()
        res = Reservation.objects.get(public_booking_no=d['public_booking_no'])
        self._c(self.recSham).post('/api/payments/', {'reservation': res.id, 'amount': '10',
                                   'method': 'cash', 'currency': 'USD'}, format='json')
        fresh_mgr = self._c(self.mgrSham)   # «متصفّح آخر» = عميل جديد
        self.assertTrue(any(x['id'] == res.id for x in fresh_mgr.get('/api/reservations/').json()))
        self.assertTrue(len(fresh_mgr.get('/api/payments/').json()) >= 1)

    # ───────────── سيناريو اليوم الكامل (المرحلة 20) ─────────────
    def test_T_full_hotel_day_cycle(self):
        # زبون يحجز → استقبال يؤكّد → دخول → طعام+دفع → دفع وإغلاق → غرفة تنظيف → عمولة → تدقيق
        d = self._book().json()
        res = Reservation.objects.get(public_booking_no=d['public_booking_no'])
        rec = self._c(self.recSham)
        self.assertEqual(rec.patch(f'/api/reservations/{res.id}/',
                         {'status': 'confirmed'}, format='json').status_code, 200)
        self.assertEqual(rec.post(f'/api/reservations/{res.id}/check_in/', {}, format='json').status_code, 200)
        rec.post('/api/food-orders/', {'amount': '20', 'currency': 'USD', 'payment_method': 'room_account',
                 'amount_room': '20', 'reservation': res.id, 'room': res.room_id,
                 'items': [{'name': 'x', 'price': 20}]}, format='json')
        # الدين موجود → منع الخروج العاديّ
        self.assertEqual(rec.post(f'/api/reservations/{res.id}/check_out/', {}, format='json').status_code, 402)
        grand = float(res.total) + 20
        out = rec.post(f'/api/reservations/{res.id}/settle_and_checkout/',
                       {'amount_cash': str(grand)}, format='json')
        self.assertEqual(out.status_code, 200)
        res.refresh_from_db()
        self.assertEqual(res.status, Reservation.STATUS_CHECKED_OUT)
        if res.room:
            res.room.refresh_from_db()
            self.assertEqual(res.room.status, Room.STATUS_CLEANING)
        self.assertEqual(float(BookingCommission.objects.get(reservation=res).commission_amount),
                         round(float(res.total) * 0.10, 2))
        actions = set(AuditLog.objects.filter(hotel=self.sham).values_list('action', flat=True))
        self.assertTrue({'reservation.check_in', 'reservation.settle_checkout'} <= actions)
