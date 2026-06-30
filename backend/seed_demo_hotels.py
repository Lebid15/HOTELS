# -*- coding: utf-8 -*-
"""
سكربت تعبئة فنادق تجريبية للموقع العام ولوحة تحكم المنصة.
التشغيل:  python manage.py shell < seed_demo_hotels.py
أو:       python seed_demo_hotels.py   (يضبط DJANGO_SETTINGS تلقائيًا)
آمن للتكرار (idempotent) — يعتمد على update_or_create بالاسم.
"""
import os
import django
from datetime import timedelta

# إعداد بيئة Django عند التشغيل المباشر
if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
    django.setup()

from django.utils import timezone
from api.models import Hotel, Package, Subscription, Room

U = lambda pid: f"https://images.unsplash.com/photo-{pid}?w=900&q=80&auto=format&fit=crop"

# ── باقة تجريبية ───────────────────────────────────────────────────────────
package, _ = Package.objects.get_or_create(
    name="الباقة الذهبية",
    defaults=dict(
        description="باقة شاملة لإدارة الفندق مع الإدراج العام والحجز الإلكتروني",
        price_monthly=200, price_yearly=2000,
        max_rooms=200, max_staff=50, max_users=20,
        features="إدراج عام، حجز إلكتروني، تقارير، دعم فني",
        status=Package.STATUS_ACTIVE,
        allow_public_listing=True, allow_public_booking=True, allow_featured_placement=True,
    ),
)

today = timezone.now().date()

# ── مواصفات الفنادق ────────────────────────────────────────────────────────
HOTELS = [
    dict(
        name="فندق الشام الكبير", hotel_type="hotel", stars=5,
        country="سوريا", governorate="دمشق", city="دمشق",
        address="شارع شكري القوتلي، وسط المدينة",
        phone="+963 11 223 4567", email="info@shamhotel.sy",
        cover=U("1566073771259-6a8506099945"),
        gallery=[U("1582719478250-c89cae4dc85b"), U("1611892440504-42a792e24d32"), U("1631049307264-da0ec9d70304")],
        amenities=["واي فاي", "موقف سيارات", "مطعم", "مسبح", "صالة رياضية"],
        short="فندق فاخر خمس نجوم في قلب دمشق القديمة بإطلالات ساحرة.",
        full="يقع فندق الشام الكبير في موقع استراتيجي وسط العاصمة دمشق، يوفّر غرفًا فاخرة ومرافق متكاملة تشمل مسبحًا وصالة رياضية ومطعمًا يقدّم أشهى المأكولات الشرقية والعالمية. خدمة على مدار الساعة وموظفون محترفون لراحتكم.",
        featured=True, currency="USD",
        rooms=[("double", 2, 60, 6), ("suite", 3, 120, 3), ("family", 4, 95, 4)],
    ),
    dict(
        name="منتجع اللاذقية الساحلي", hotel_type="resort", stars=5,
        country="سوريا", governorate="اللاذقية", city="اللاذقية",
        address="الكورنيش البحري، شاطئ الرمل الذهبي",
        phone="+963 41 333 1100", email="booking@latakiaresort.sy",
        cover=U("1571003123894-1f0594d2b5d9"),
        gallery=[U("1582719508461-905c673771fd"), U("1520250497591-112f2f40a3f4"), U("1540541338287-41700207dee6")],
        amenities=["واي فاي", "مسبح", "مطعم", "شاطئ خاص", "موقف سيارات"],
        short="منتجع ساحلي على شاطئ المتوسط مع شاطئ خاص ومسابح.",
        full="استمتع بإقامة لا تُنسى في منتجع اللاذقية الساحلي المطلّ مباشرة على البحر المتوسط. يوفّر المنتجع شاطئًا خاصًا، ومسابح خارجية، وأجنحة فاخرة بإطلالة بحرية، إضافة إلى مطاعم متنوعة وأنشطة ترفيهية للعائلات.",
        featured=True, currency="USD",
        rooms=[("double", 2, 75, 8), ("suite", 3, 150, 4), ("deluxe", 2, 110, 5)],
    ),
    dict(
        name="فندق حلب بلازا", hotel_type="hotel", stars=4,
        country="سوريا", governorate="حلب", city="حلب",
        address="شارع الجامعة، حي الفرقان",
        phone="+963 21 555 7788", email="reception@aleppoplaza.sy",
        cover=U("1551882547-ff40c63fe5fa"),
        gallery=[U("1611892440504-42a792e24d32"), U("1618773928121-c32242e63f39")],
        amenities=["واي فاي", "مطعم", "موقف سيارات", "قاعة اجتماعات"],
        short="فندق أربع نجوم عملي قرب جامعة حلب ومراكز الأعمال.",
        full="فندق حلب بلازا خيار مثالي لرجال الأعمال والزوّار، يتميّز بموقعه القريب من المرافق الحيوية، ويضم قاعات اجتماعات مجهّزة ومطعمًا داخليًا وغرفًا مريحة بأسعار تنافسية.",
        featured=False, currency="USD",
        rooms=[("single", 1, 35, 5), ("double", 2, 50, 6), ("family", 4, 80, 3)],
    ),
    dict(
        name="شقق طرطوس الفندقية", hotel_type="apart_hotel", stars=3,
        country="سوريا", governorate="طرطوس", city="طرطوس",
        address="حي الثورة، مقابل الحديقة العامة",
        phone="+963 43 222 9090", email="stay@tartousapart.sy",
        cover=U("1502672260266-1c1ef2d93688"),
        gallery=[U("1505693416388-ac5ce068fe85"), U("1560448204-e02f11c3d0e2")],
        amenities=["واي فاي", "مطبخ مجهّز", "موقف سيارات"],
        short="شقق فندقية مفروشة بالكامل للإقامات الطويلة والعائلات.",
        full="شقق طرطوس الفندقية توفّر وحدات سكنية مفروشة بمطابخ مجهّزة بالكامل، مثالية للعائلات والإقامات الطويلة. موقع هادئ قريب من البحر والخدمات الأساسية.",
        featured=False, currency="USD",
        rooms=[("double", 2, 40, 4), ("family", 5, 70, 5)],
    ),
    dict(
        name="نزل حمص الضيافة", hotel_type="guesthouse", stars=3,
        country="سوريا", governorate="حمص", city="حمص",
        address="شارع الحضارة، قرب الساعة القديمة",
        phone="+963 31 444 6655", email="info@homsguest.sy",
        cover=U("1564501049412-61c2a3083791"),
        gallery=[U("1566665797739-1674de7a421a")],
        amenities=["واي فاي", "إفطار مجاني"],
        short="نزل اقتصادي مريح في وسط مدينة حمص مع إفطار مجاني.",
        full="نزل حمص الضيافة يقدّم إقامة بسيطة ومريحة بأسعار اقتصادية، مع إفطار مجاني يوميًا وموقع مركزي يسهّل التنقّل إلى معالم المدينة.",
        featured=False, currency="USD",
        rooms=[("single", 1, 20, 4), ("double", 2, 30, 5)],
    ),
    dict(
        name="فندق حماة السياحي", hotel_type="hotel", stars=4,
        country="سوريا", governorate="حماة", city="حماة",
        address="ضفاف نهر العاصي، قرب النواعير",
        phone="+963 33 211 3344", email="contact@hamatourism.sy",
        cover=U("1542314831-068cd1dbfeeb"),
        gallery=[U("1445019980597-93fa8acb246c"), U("1631049035182-249067d7618e")],
        amenities=["واي فاي", "مطعم", "موقف سيارات", "إطلالة على النهر"],
        short="فندق بإطلالة على نهر العاصي ونواعير حماة الشهيرة.",
        full="يتميّز فندق حماة السياحي بإطلالته الفريدة على نهر العاصي والنواعير التاريخية. غرف مريحة ومطعم يقدّم المأكولات المحلية في أجواء تراثية أصيلة.",
        featured=True, currency="USD",
        rooms=[("double", 2, 45, 6), ("suite", 3, 90, 3), ("deluxe", 2, 65, 4)],
    ),
]


def seed():
    created, updated = 0, 0
    for spec in HOTELS:
        hotel, was_created = Hotel.objects.update_or_create(
            name=spec["name"],
            defaults=dict(
                status=Hotel.STATUS_ACTIVE,
                hotel_type=spec["hotel_type"], stars=spec["stars"],
                country=spec["country"], governorate=spec["governorate"], city=spec["city"],
                address=spec["address"], phone=spec["phone"], email=spec["email"],
                cover_image=spec["cover"], gallery_images=spec["gallery"],
                amenities=spec["amenities"],
                public_description_short=spec["short"], public_description_full=spec["full"],
                public_listing_enabled=True, public_booking_enabled=True,
                is_featured=spec["featured"], show_contact_info=True,
                floors_count=4,
                check_in_policy="تسجيل الدخول من الساعة 2:00 ظهرًا.",
                check_out_policy="تسجيل المغادرة حتى الساعة 12:00 ظهرًا.",
                cancellation_policy="إلغاء مجاني حتى 24 ساعة قبل موعد الوصول.",
                payment_policy="الدفع عند الوصول نقدًا أو ببطاقة. لا يُشترط دفع مسبق.",
            ),
        )
        created += was_created
        updated += (not was_created)

        # توليد الـ slug
        if not hotel.slug:
            hotel.slug = f"hotel-{hotel.id}"
            hotel.save(update_fields=["slug"])

        # اشتراك فعّال
        Subscription.objects.update_or_create(
            hotel=hotel,
            defaults=dict(
                package=package, status=Subscription.STATUS_ACTIVE,
                payment_status=Subscription.PAYMENT_PAID,
                start_date=today, end_date=today + timedelta(days=365),
                monthly_amount=200, currency="USD",
            ),
        )

        # الغرف — تُنشأ فقط إن لم تكن موجودة (تجنّب التكرار)
        if hotel.rooms.exists():
            continue
        room_no = 100
        for rtype, capacity, price, count in spec["rooms"]:
            for i in range(count):
                room_no += 1
                floor = (room_no // 100)
                Room.objects.create(
                    hotel=hotel, number=str(room_no), floor=floor,
                    type=rtype, capacity=capacity,
                    status=Room.STATUS_AVAILABLE,
                    price=price, currency=spec["currency"],
                    show_in_public=True,
                    public_description=f"غرفة {dict(Room.TYPE_CHOICES).get(rtype, rtype)} مجهّزة بالكامل.",
                )

    total_hotels = Hotel.objects.count()
    total_rooms = Room.objects.count()
    print(f"✅ تم: {created} فندق جديد، {updated} محدّث.")
    print(f"📊 إجمالي الفنادق: {total_hotels} | إجمالي الغرف: {total_rooms}")
    print(f"🌐 الفنادق المُدرجة عامًّا: {Hotel.objects.filter(public_listing_enabled=True).count()}")


seed()
