from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Hotel(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_SUSPENDED = 'suspended'
    STATUS_ARCHIVED = 'archived'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'فعال'),
        (STATUS_SUSPENDED, 'موقوف'),
        (STATUS_ARCHIVED, 'مؤرشف'),
    ]

    HOTEL_TYPE_CHOICES = [
        ('hotel', 'فندق'), ('apart_hotel', 'شقق فندقية'),
        ('resort', 'منتجع'), ('guesthouse', 'نزل'), ('motel', 'موتيل'),
    ]

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=160, blank=True, null=True, unique=True)
    country = models.CharField(max_length=100, blank=True)
    governorate = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    map_url = models.URLField(blank=True, max_length=1000)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    floors_count = models.PositiveIntegerField(default=1)
    manager_user = models.OneToOneField(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='managed_hotel'
    )
    manager_name = models.CharField(max_length=200, blank=True)
    manager_email = models.EmailField(blank=True)

    # ── Hotel identity & operations (dynamic, source of truth) ─────────────
    currency = models.CharField(max_length=10, default='USD')   # عملة الفندق الافتراضية (سلسلة المال)
    logo = models.TextField(blank=True)                          # شعار الفندق (data-url/رابط)
    owner_name = models.CharField(max_length=200, blank=True)    # اسم المالك/المسؤول
    website = models.URLField(blank=True, max_length=500)
    # د‑4: إعدادات المطعم/الكافتريا (مصدر Backend بدل localStorage). المفاتيح:
    #   restaurant_enabled, cafeteria_enabled, dedicated_staff,
    #   allow_cash, allow_electronic, allow_card, allow_room_account, print_receipt
    food_settings = models.JSONField(default=dict, blank=True)

    # ── Public listing fields ──────────────────────────────────────────────
    stars = models.PositiveSmallIntegerField(null=True, blank=True)
    hotel_type = models.CharField(max_length=30, blank=True, choices=HOTEL_TYPE_CHOICES)
    cover_image = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    gallery_images = models.JSONField(default=list)
    amenities = models.JSONField(default=list)
    public_description_short = models.TextField(blank=True)
    public_description_full = models.TextField(blank=True)
    public_listing_enabled = models.BooleanField(default=False)
    public_booking_enabled = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    cancellation_policy = models.TextField(blank=True)
    check_in_policy = models.TextField(blank=True)
    check_out_policy = models.TextField(blank=True)
    payment_policy = models.TextField(blank=True)
    show_contact_info = models.BooleanField(default=False)

    # ── م1 (الإعدادات المركزية): حقول تشغيلية مُلزَمة خادميًّا ────────────────
    CLEANING_AUTO = 'auto'
    CLEANING_MANUAL = 'manual'
    CLEANING_MODE_CHOICES = [(CLEANING_AUTO, 'تلقائي'), (CLEANING_MANUAL, 'يدوي')]
    code = models.CharField(max_length=20, blank=True, null=True, unique=True)   # كود فندق داخلي فريد (للعرض؛ يُولَّد تلقائيًا)
    check_in_time = models.TimeField(null=True, blank=True)                      # وقت الدخول الافتراضي
    check_out_time = models.TimeField(null=True, blank=True)                     # وقت المغادرة الافتراضي
    cleaning_mode = models.CharField(max_length=10, choices=CLEANING_MODE_CHOICES, default=CLEANING_MANUAL)
    cleaning_duration_minutes = models.PositiveIntegerField(default=60)          # مدة التنظيف قبل الرجوع التلقائي (auto)
    web_booking_needs_confirmation = models.BooleanField(default=True)           # هل حجوزات الموقع تحتاج تأكيدًا؟

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # H‑1/م1: تعيين الـslug والكود الداخلي الفريد لحظة الحفظ.
        updates = {}
        if not self.slug:
            self.slug = f'hotel-{self.pk}'
            updates['slug'] = self.slug
        if not self.code:
            self.code = f'FND-{self.pk:04d}'
            updates['code'] = self.code
        if updates:
            Hotel.objects.filter(pk=self.pk).update(**updates)

    def __str__(self):
        return self.name


class HotelSettings(models.Model):
    """م1: مصدر مركزي واحد لإعدادات تشغيل الفندق (بدل localStorage المتصفّح).

    حِزم JSON مرنة للواجهة (طباعة/وثائق/تنبيهات)، بينما الحقول التي تُلزَم
    خادميًّا (أوقات الدخول/الخروج، وضع/مدة التنظيف، إعدادات المطعم) تبقى على
    نموذج Hotel نفسه كي تُقرأ وتُنفَّذ من الخادم. يُنشأ سجلّ واحد لكل فندق.
    """
    hotel = models.OneToOneField(Hotel, on_delete=models.CASCADE, related_name='op_settings')
    printing = models.JSONField(default=dict, blank=True)       # showLogo/showContact/عناوين/شروط/تذييل/لغة الأرقام/قوالب
    documents = models.JSONField(default=dict, blank=True)      # أنواع الوثائق/إلزامية النزيل والمرافق/إثبات الزواج/الماسح
    notifications = models.JSONField(default=dict, blank=True)  # لكل تنبيه: تفعيل/مستلم/أهمية/طريقة ظهور + عتبة الرصيد/إظهار الجرس
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_for(cls, hotel):
        obj, _ = cls.objects.get_or_create(hotel=hotel)
        return obj

    def __str__(self):
        return f"HotelSettings<{self.hotel_id}>"


class Package(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_SUSPENDED = 'suspended'
    STATUS_ARCHIVED = 'archived'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'فعالة'),
        (STATUS_SUSPENDED, 'موقوفة'),
        (STATUS_ARCHIVED, 'مؤرشفة'),
    ]

    name          = models.CharField(max_length=200)
    description   = models.TextField(blank=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_yearly  = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_rooms     = models.PositiveIntegerField(default=50)
    max_staff     = models.PositiveIntegerField(default=10)
    max_users     = models.PositiveIntegerField(default=10)
    features      = models.TextField(blank=True)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    notes         = models.TextField(blank=True)
    allow_public_listing      = models.BooleanField(default=True)
    allow_public_booking      = models.BooleanField(default=True)
    allow_featured_placement  = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Subscription(models.Model):
    STATUS_TRIAL = 'trial'
    STATUS_ACTIVE = 'active'
    STATUS_EXPIRED = 'expired'
    STATUS_SUSPENDED = 'suspended'
    STATUS_NOT_SET = 'not_set'
    STATUS_CHOICES = [
        (STATUS_TRIAL, 'تجريبي'),
        (STATUS_ACTIVE, 'فعال'),
        (STATUS_EXPIRED, 'منتهي'),
        (STATUS_SUSPENDED, 'موقوف'),
        (STATUS_NOT_SET, 'غير مضبوط'),
    ]
    PAYMENT_PAID = 'paid'
    PAYMENT_UNPAID = 'unpaid'
    PAYMENT_PARTIAL = 'partial'
    PAYMENT_CHOICES = [
        (PAYMENT_PAID, 'مدفوع'),
        (PAYMENT_UNPAID, 'غير مدفوع'),
        (PAYMENT_PARTIAL, 'جزئي'),
    ]

    hotel = models.OneToOneField(Hotel, on_delete=models.CASCADE, related_name='subscription')
    package = models.ForeignKey(Package, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TRIAL)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default=PAYMENT_UNPAID)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    monthly_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='SAR')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.hotel.name} - {self.status}"


class SubscriptionRequest(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'قيد الانتظار'),
        (STATUS_APPROVED, 'موافق'),
        (STATUS_REJECTED, 'مرفوض'),
    ]

    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='subscription_requests')
    package = models.ForeignKey(Package, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.hotel.name} - {self.status}"


class Room(models.Model):
    STATUS_AVAILABLE = 'available'
    STATUS_OCCUPIED = 'occupied'
    STATUS_CLEANING = 'cleaning'
    STATUS_MAINTENANCE = 'maintenance'
    STATUS_OUT_OF_SERVICE = 'out_of_service'
    STATUS_ARCHIVED = 'archived'
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, 'متاحة'),
        (STATUS_OCCUPIED, 'مشغولة'),
        (STATUS_CLEANING, 'تنظيف'),
        (STATUS_MAINTENANCE, 'صيانة'),
        (STATUS_OUT_OF_SERVICE, 'خارج الخدمة'),
        (STATUS_ARCHIVED, 'مؤرشفة'),
    ]
    TYPE_SINGLE = 'single'
    TYPE_DOUBLE = 'double'
    TYPE_TRIPLE = 'triple'
    TYPE_SUITE = 'suite'
    TYPE_FAMILY = 'family'
    TYPE_DELUXE = 'deluxe'
    TYPE_CHOICES = [
        (TYPE_SINGLE, 'مفردة'),
        (TYPE_DOUBLE, 'مزدوجة'),
        (TYPE_TRIPLE, 'ثلاثية'),
        (TYPE_SUITE, 'سويت'),
        (TYPE_FAMILY, 'عائلية'),
        (TYPE_DELUXE, 'مميزة'),
    ]

    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='rooms')
    number = models.CharField(max_length=20)
    floor = models.PositiveIntegerField(default=1)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_SINGLE)
    capacity = models.PositiveIntegerField(default=2)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='SAR')
    notes = models.TextField(blank=True)
    # م1: لحظة بدء التنظيف — تُستخدم للرجوع التلقائي بعد المدة عند cleaning_mode=auto
    cleaning_started_at = models.DateTimeField(null=True, blank=True)
    # Public fields
    public_description = models.TextField(blank=True)
    show_in_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['hotel', 'number']
        ordering = ['floor', 'number']
        indexes = [models.Index(fields=['hotel', 'status'])]

    def __str__(self):
        return f"{self.hotel.name} - {self.number}"


class Reservation(models.Model):
    STATUS_PENDING     = 'pending'
    STATUS_CONFIRMED   = 'confirmed'
    STATUS_CHECKED_IN  = 'checked_in'
    STATUS_CHECKED_OUT = 'checked_out'
    STATUS_CANCELLED   = 'cancelled'
    STATUS_NO_SHOW     = 'no_show'
    STATUS_CHOICES = [
        (STATUS_PENDING,     'قيد الانتظار'),
        (STATUS_CONFIRMED,   'مؤكد'),
        (STATUS_CHECKED_IN,  'تم تسجيل الدخول'),
        (STATUS_CHECKED_OUT, 'تم تسجيل الخروج'),
        (STATUS_CANCELLED,   'ملغي'),
        (STATUS_NO_SHOW,     'لم يحضر'),
    ]
    SOURCE_DIRECT  = 'direct'
    SOURCE_PHONE   = 'phone'
    SOURCE_WEBSITE = 'website'
    SOURCE_OTA     = 'ota'
    SOURCE_PUBLIC  = 'public_website'
    SOURCE_CHOICES = [
        (SOURCE_DIRECT,  'مباشر'),
        (SOURCE_PHONE,   'هاتف'),
        (SOURCE_WEBSITE, 'موقع إلكتروني'),
        (SOURCE_OTA,     'منصة حجز'),
        (SOURCE_PUBLIC,  'الموقع العام'),
    ]
    ARRIVAL_AWAITING   = 'awaiting_arrival'
    ARRIVAL_ARRIVED    = 'arrived'
    ARRIVAL_CHECKED_IN = 'checked_in_w'
    ARRIVAL_COMPLETED  = 'completed_w'
    ARRIVAL_CANCEL_G   = 'cancelled_by_guest'
    ARRIVAL_CANCEL_H   = 'cancelled_by_hotel'
    ARRIVAL_NO_SHOW    = 'no_show_w'
    ARRIVAL_CHOICES = [
        (ARRIVAL_AWAITING,   'بانتظار الوصول'),
        (ARRIVAL_ARRIVED,    'وصل إلى الفندق'),
        (ARRIVAL_CHECKED_IN, 'تم تسجيل الدخول'),
        (ARRIVAL_COMPLETED,  'مكتمل'),
        (ARRIVAL_CANCEL_G,   'ملغى من الزبون'),
        (ARRIVAL_CANCEL_H,   'ملغى من الفندق'),
        (ARRIVAL_NO_SHOW,    'لم يحضر'),
    ]

    hotel      = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='reservations')
    room       = models.ForeignKey(Room,  null=True, blank=True, on_delete=models.SET_NULL, related_name='reservations')
    created_by = models.ForeignKey(User,  null=True, blank=True, on_delete=models.SET_NULL)

    booking_number = models.CharField(max_length=30, blank=True)

    # Guest personal data
    guest_id_number  = models.CharField(max_length=50,  blank=True)
    guest_first_name = models.CharField(max_length=100, blank=True)
    guest_last_name  = models.CharField(max_length=100, blank=True)
    guest_father_name= models.CharField(max_length=100, blank=True)
    guest_mother_name= models.CharField(max_length=100, blank=True)
    guest_dob        = models.DateField(null=True, blank=True)
    guest_phone      = models.CharField(max_length=50,  blank=True)
    guest_email      = models.EmailField(blank=True)

    # Companions
    has_companions            = models.BooleanField(default=False)
    companion_type            = models.CharField(max_length=20,  blank=True)
    companion_adults_count    = models.PositiveIntegerField(default=0)
    companion_children_count  = models.PositiveIntegerField(default=0)
    companion_children_relation = models.CharField(max_length=50, blank=True)
    companions = models.JSONField(default=list)

    # Documents (base64 images)
    guest_doc_type   = models.CharField(max_length=50, blank=True)
    guest_doc_image  = models.TextField(blank=True)
    family_doc_type  = models.CharField(max_length=50, blank=True)
    family_doc_image = models.TextField(blank=True)
    companion_docs   = models.JSONField(default=list)

    # Booking figures
    check_in_date  = models.DateField(null=True, blank=True)
    check_out_date = models.DateField(null=True, blank=True)
    nights_count   = models.PositiveIntegerField(default=1)
    persons_count  = models.PositiveIntegerField(default=1)
    room_price     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid           = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency       = models.CharField(max_length=10, default='SAR')
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    source         = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_DIRECT)
    notes          = models.TextField(blank=True)

    # ── Public / Website booking fields ──────────────────────────────────
    public_booking    = models.BooleanField(default=False)
    public_booking_no = models.CharField(max_length=30, blank=True, null=True, unique=True)
    manage_token      = models.CharField(max_length=48, blank=True)   # م3: رمز إدارة آمن (بدل الاعتماد على الهاتف فقط)
    room_type_label   = models.CharField(max_length=50, blank=True)
    payment_method    = models.CharField(max_length=30, default='direct', blank=True)
    documents_status  = models.CharField(max_length=30, default='pending_on_arrival', blank=True)
    arrival_status    = models.CharField(max_length=30, choices=ARRIVAL_CHOICES, default=ARRIVAL_AWAITING, blank=True)
    cancelled_at      = models.DateTimeField(null=True, blank=True)
    cancelled_by_type = models.CharField(max_length=20, blank=True)
    cancel_reason     = models.TextField(blank=True)
    no_show_at        = models.DateTimeField(null=True, blank=True)
    checked_in_at     = models.DateTimeField(null=True, blank=True)
    platform_commission_rate   = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    platform_commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['hotel', 'status']),
            models.Index(fields=['hotel', 'check_in_date', 'check_out_date']),
            models.Index(fields=['public_booking']),
        ]

    def save(self, *args, **kwargs):
        if self.public_booking and not self.public_booking_no:
            self.public_booking_no = self._generate_public_booking_no()
        super().save(*args, **kwargs)
        # H‑2: رقم حجز داخلي ذرّي مبني على المفتاح الأساسي (بلا سباق count()).
        if not self.booking_number:
            Reservation.objects.filter(pk=self.pk).update(booking_number=f'BK-{self.pk:05d}')
            self.booking_number = f'BK-{self.pk:05d}'

    @staticmethod
    def _generate_public_booking_no() -> str:
        """B‑1: رقم حجز عام **غير قابل للتخمين** (عشوائي)، بلا أحرف ملتبسة، مع ضمان التفرّد."""
        import secrets
        from django.utils import timezone as _tz
        year = _tz.now().year
        alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # بلا 0/O/1/I/L
        for _ in range(12):
            candidate = f"WEB-{year}-{''.join(secrets.choice(alphabet) for _ in range(6))}"
            if not Reservation.objects.filter(public_booking_no=candidate).exists():
                return candidate
        # احتياط نادر جدًا: أطل الجزء العشوائي
        return f"WEB-{year}-{''.join(secrets.choice(alphabet) for _ in range(10))}"

    def __str__(self):
        return f'{self.booking_number} - {self.guest_first_name} {self.guest_last_name}'


class Staff(models.Model):
    ROLE_RECEPTIONIST = 'receptionist'
    ROLE_CASHIER = 'cashier'
    ROLE_HOUSEKEEPING = 'housekeeping'
    ROLE_MAINTENANCE = 'maintenance'
    ROLE_RESTAURANT = 'restaurant'
    ROLE_ROOM_SERVICE = 'room_service'
    ROLE_SUPERVISOR = 'supervisor'
    ROLE_CHOICES = [
        (ROLE_RECEPTIONIST, 'موظف استقبال'),
        (ROLE_CASHIER, 'كاشير'),
        (ROLE_HOUSEKEEPING, 'تنظيف'),
        (ROLE_MAINTENANCE, 'صيانة'),
        (ROLE_RESTAURANT, 'مطعم'),
        (ROLE_ROOM_SERVICE, 'خدمة غرف'),
        (ROLE_SUPERVISOR, 'مشرف'),
    ]
    SHIFT_MORNING = 'morning'
    SHIFT_EVENING = 'evening'
    SHIFT_NIGHT = 'night'
    SHIFT_FLEXIBLE = 'flexible'
    SHIFT_CHOICES = [
        (SHIFT_MORNING, 'صباحية'),
        (SHIFT_EVENING, 'مسائية'),
        (SHIFT_NIGHT, 'ليلية'),
        (SHIFT_FLEXIBLE, 'حسب الحاجة'),
    ]
    STATUS_ACTIVE = 'active'
    STATUS_SUSPENDED = 'suspended'
    STATUS_ARCHIVED = 'archived'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'فعال'),
        (STATUS_SUSPENDED, 'موقوف'),
        (STATUS_ARCHIVED, 'مؤرشف'),
    ]

    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='staff')
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL)
    full_name = models.CharField(max_length=200)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES, default=SHIFT_MORNING)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    permissions = models.JSONField(default=list)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} - {self.hotel.name}"


class MaintenanceTicket(models.Model):
    STATUS_OPEN          = 'open'
    STATUS_IN_PROGRESS   = 'in_progress'
    STATUS_WAITING_PARTS = 'waiting_parts'
    STATUS_RESOLVED      = 'resolved'
    STATUS_CANCELLED     = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_OPEN,          'مفتوح'),
        (STATUS_IN_PROGRESS,   'قيد المعالجة'),
        (STATUS_WAITING_PARTS, 'بانتظار قطع'),
        (STATUS_RESOLVED,      'تم الإنجاز'),
        (STATUS_CANCELLED,     'ملغي'),
    ]

    PRIORITY_LOW    = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH   = 'high'
    PRIORITY_URGENT = 'urgent'
    PRIORITY_CHOICES = [
        (PRIORITY_LOW,    'منخفضة'),
        (PRIORITY_MEDIUM, 'متوسطة'),
        (PRIORITY_HIGH,   'مرتفعة'),
        (PRIORITY_URGENT, 'عاجلة'),
    ]

    TYPE_ELECTRIC        = 'electric'
    TYPE_PLUMBING        = 'plumbing'
    TYPE_AC              = 'ac'
    TYPE_INTERNET        = 'internet'
    TYPE_FURNITURE       = 'furniture'
    TYPE_APPLIANCE       = 'appliance'
    TYPE_DOOR            = 'door'
    TYPE_CLEANING_DAMAGE = 'cleaning_damage'
    TYPE_OTHER           = 'other'
    TYPE_CHOICES = [
        (TYPE_ELECTRIC,        'كهرباء'),
        (TYPE_PLUMBING,        'سباكة'),
        (TYPE_AC,              'تكييف'),
        (TYPE_INTERNET,        'إنترنت'),
        (TYPE_FURNITURE,       'أثاث'),
        (TYPE_APPLIANCE,       'جهاز/معدات'),
        (TYPE_DOOR,            'أبواب وأقفال'),
        (TYPE_CLEANING_DAMAGE, 'ملاحظة تنظيف/تلف'),
        (TYPE_OTHER,           'أخرى'),
    ]

    SOURCE_MANUAL      = 'manual'
    SOURCE_HOUSEKEEPING = 'housekeeping'
    SOURCE_ROOM_STATUS = 'room_status'
    SOURCE_CHOICES = [
        (SOURCE_MANUAL,       'يدوي'),
        (SOURCE_HOUSEKEEPING, 'من التنظيف'),
        (SOURCE_ROOM_STATUS,  'من حالة الغرفة'),
    ]

    hotel       = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='maintenance_tickets')
    ticket_no   = models.CharField(max_length=20, blank=True)
    room        = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_tickets')
    issue_type  = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_OTHER)
    priority    = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_maintenance')
    source      = models.CharField(max_length=30, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    created_by  = models.CharField(max_length=200, blank=True)
    started_at  = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.CharField(max_length=200, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # H‑2: رقم تذكرة ذرّي مبني على المفتاح الأساسي (بلا سباق count()).
        if not self.ticket_no:
            MaintenanceTicket.objects.filter(pk=self.pk).update(ticket_no=f'MT-{self.pk:05d}')
            self.ticket_no = f'MT-{self.pk:05d}'

    def __str__(self):
        return f'{self.ticket_no} - {self.hotel.name}'


class UserProfile(models.Model):
    ROLE_PLATFORM_OWNER = 'platform_owner'
    ROLE_MANAGER = 'manager'
    ROLE_RECEPTION = 'reception'
    ROLE_CHOICES = [
        (ROLE_PLATFORM_OWNER, 'مالك المنصة'),
        (ROLE_MANAGER, 'مدير فندق'),
        (ROLE_RECEPTION, 'موظف استقبال'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MANAGER)
    hotel = models.ForeignKey(
        Hotel, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='staff_profiles',
    )
    two_factor_enabled = models.BooleanField(default=False)   # د‑6: التحقق بخطوتين

    def __str__(self):
        return f'{self.user.username} — {self.role}'


# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM EARNINGS / COMMISSIONS
# ─────────────────────────────────────────────────────────────────────────────

# أنواع العمولة (مشتركة بين الإعداد العام وإعداد الفندق وسجل العمولة)
COMMISSION_PERCENTAGE    = 'percentage'
COMMISSION_FIXED_BOOKING = 'fixed_per_booking'
COMMISSION_FIXED_GUEST   = 'fixed_per_guest'
COMMISSION_TYPE_CHOICES = [
    (COMMISSION_PERCENTAGE,    'نسبة مئوية'),
    (COMMISSION_FIXED_BOOKING, 'مبلغ مقطوع لكل حجز'),
    (COMMISSION_FIXED_GUEST,   'مبلغ مقطوع لكل زبون'),
]


class PlatformRevenueSettings(models.Model):
    """إعدادات احتساب ربح المنصة من حجوزات الموقع (سجل واحد singleton)."""
    CALC_ON_CREATED   = 'on_booking_created'
    CALC_ON_ARRIVED   = 'on_guest_arrived'
    CALC_ON_CHECKIN   = 'on_check_in'
    CALC_ON_COMPLETED = 'on_completed'
    CALC_ON_CHOICES = [
        (CALC_ON_CREATED,   'عند إنشاء الحجز'),
        (CALC_ON_ARRIVED,   'عند وصول الزبون'),
        (CALC_ON_CHECKIN,   'عند تسجيل الدخول'),
        (CALC_ON_COMPLETED, 'عند اكتمال الحجز'),
    ]
    NOSHOW_WAIVE = 'waive'
    NOSHOW_KEEP  = 'keep'
    NOSHOW_CHOICES = [
        (NOSHOW_WAIVE, 'إعفاء العمولة'),
        (NOSHOW_KEEP,  'إبقاؤها مستحقة'),
    ]

    enable_booking_commission      = models.BooleanField(default=True)
    default_commission_type        = models.CharField(max_length=30, choices=COMMISSION_TYPE_CHOICES, default=COMMISSION_PERCENTAGE)
    default_commission_value       = models.DecimalField(max_digits=10, decimal_places=2, default=10)
    default_commission_currency    = models.CharField(max_length=10, default='USD')
    calculate_commission_on_status = models.CharField(max_length=30, choices=CALC_ON_CHOICES, default=CALC_ON_CHECKIN)
    allow_hotel_override           = models.BooleanField(default=True)
    no_show_policy                 = models.CharField(max_length=10, choices=NOSHOW_CHOICES, default=NOSHOW_WAIVE)
    updated_at                     = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'إعدادات أرباح المنصة'

    @classmethod
    def get_solo(cls):
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create()
        return obj

    def __str__(self):
        return 'إعدادات أرباح المنصة'


class HotelCommissionSetting(models.Model):
    """إعداد عمولة خاص بفندق معيّن — يتجاوز الإعداد العام عند تفعيله."""
    hotel               = models.OneToOneField(Hotel, on_delete=models.CASCADE, related_name='commission_setting')
    commission_enabled  = models.BooleanField(default=True)
    commission_type     = models.CharField(max_length=30, choices=COMMISSION_TYPE_CHOICES, default=COMMISSION_PERCENTAGE)
    commission_value    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_currency = models.CharField(max_length=10, default='USD')
    commission_notes    = models.TextField(blank=True)
    effective_from      = models.DateField(null=True, blank=True)
    effective_to        = models.DateField(null=True, blank=True)
    is_active           = models.BooleanField(default=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'عمولة {self.hotel.name}'


class BookingCommission(models.Model):
    """سجل عمولة المنصة لكل حجز قادم من الموقع العام — مع snapshot يحفظ القيم وقت الإنشاء."""
    STATUS_PENDING   = 'pending'
    STATUS_DUE       = 'due'
    STATUS_PAID      = 'paid'
    STATUS_PARTIAL   = 'partial'
    STATUS_WAIVED    = 'waived'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING,   'قيد الانتظار'),
        (STATUS_DUE,       'مستحقة'),
        (STATUS_PAID,      'مدفوعة'),
        (STATUS_PARTIAL,   'مدفوعة جزئيًا'),
        (STATUS_WAIVED,    'معفاة'),
        (STATUS_CANCELLED, 'ملغاة'),
    ]

    reservation       = models.OneToOneField(Reservation, on_delete=models.CASCADE, related_name='commission')
    hotel             = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='booking_commissions')
    public_booking_no = models.CharField(max_length=30, blank=True)

    # ── Snapshot وقت إنشاء الحجز (لا يتغيّر أبدًا) ───────────────────────────
    commission_type_at_booking     = models.CharField(max_length=30, blank=True)
    commission_value_at_booking    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_currency_at_booking = models.CharField(max_length=10, default='USD')
    calculated_amount_at_booking   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    calculation_base_amount        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    calculation_base_currency      = models.CharField(max_length=10, default='USD')

    # ── القيم الفعّالة المستخدمة في التقارير (مجمّدة من الـ snapshot) ────────
    commission_type     = models.CharField(max_length=30, blank=True)
    commission_value    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    commission_currency = models.CharField(max_length=10, default='USD')
    commission_status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)

    calculated_at = models.DateTimeField(null=True, blank=True)
    due_at        = models.DateTimeField(null=True, blank=True)
    paid_at       = models.DateTimeField(null=True, blank=True)
    paid_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes         = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.public_booking_no} — {self.commission_amount} {self.commission_currency} ({self.commission_status})'


# ─── Hotel Ratings (تقييمات الفنادق من قِبَل الضيوف) ───────────────────────
class HotelRating(models.Model):
    hotel        = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='ratings')
    reservation  = models.OneToOneField(Reservation, on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name='rating')
    guest_name   = models.CharField(max_length=120, blank=True)
    guest_phone  = models.CharField(max_length=30, blank=True)
    rating       = models.PositiveSmallIntegerField()  # 1..5
    comment      = models.TextField(blank=True)
    is_approved  = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.hotel.name} — {self.rating}/5 — {self.guest_name or "—"}'


# ─── Payment (سلسلة المال — مصدر الحقيقة للمدفوعات) ───────────────────────
class Payment(models.Model):
    METHOD_CASH = 'cash'
    METHOD_CARD = 'card'
    METHOD_TRANSFER = 'transfer'
    METHOD_OTHER = 'other'
    METHOD_CHOICES = [
        (METHOD_CASH, 'نقدًا'), (METHOD_CARD, 'بطاقة'),
        (METHOD_TRANSFER, 'تحويل'), (METHOD_OTHER, 'أخرى'),
    ]
    # د‑3: مصدر الدفعة (لتتبّع «من أين دخل المبلغ» في المدفوعات والتقارير)
    SOURCE_CHOICES = [
        ('booking', 'حجز/إقامة'), ('folio', 'فوليو غرفة'), ('restaurant', 'مطعم'),
        ('cafeteria', 'كافتريا'), ('extra_service', 'خدمة إضافية'),
        ('debt_settlement', 'تسوية ذمة'), ('room_account', 'حساب غرفة'), ('other', 'أخرى'),
    ]
    hotel       = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='payments')
    reservation = models.ForeignKey(Reservation, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments')
    amount      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency    = models.CharField(max_length=10, default='SAR')
    method      = models.CharField(max_length=20, choices=METHOD_CHOICES, default=METHOD_CASH)
    source      = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='booking')
    note        = models.CharField(max_length=300, blank=True)
    # م6: الإبطال بدل الحذف (لا يختفي سجلّ مالي — يُعلَّم ملغى مع سبب وفاعل ووقت)
    voided      = models.BooleanField(default=False)
    voided_at   = models.DateTimeField(null=True, blank=True)
    voided_by   = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='voided_payments')
    void_reason = models.CharField(max_length=300, blank=True)
    receipt_no  = models.CharField(max_length=30, blank=True)
    created_by  = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['hotel', 'created_at']), models.Index(fields=['reservation'])]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.receipt_no:
            Payment.objects.filter(pk=self.pk).update(receipt_no=f'RC-{self.pk:06d}')
            self.receipt_no = f'RC-{self.pk:06d}'

    def __str__(self):
        return f'{self.receipt_no or self.pk} — {self.amount} {self.currency}'


# ─── Expense (مصاريف الفندق — تغذّي التقارير) ─────────────────────────────
class Expense(models.Model):
    hotel       = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='expenses')
    category    = models.CharField(max_length=80, blank=True)
    description = models.CharField(max_length=300, blank=True)
    amount      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency    = models.CharField(max_length=10, default='SAR')
    spent_on    = models.DateField(null=True, blank=True)
    paid_to     = models.CharField(max_length=200, blank=True)
    notes       = models.CharField(max_length=500, blank=True)
    # م6: الإبطال بدل الحذف
    voided      = models.BooleanField(default=False)
    voided_at   = models.DateTimeField(null=True, blank=True)
    voided_by   = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='voided_expenses')
    void_reason = models.CharField(max_length=300, blank=True)
    created_by  = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['hotel', 'spent_on'])]

    def __str__(self):
        return f'{self.category or "expense"} — {self.amount} {self.currency}'


# ─── PlatformSettings (هوية المنصّة الديناميكية — سجل واحد) ────────────────
class PlatformSettings(models.Model):
    """اسم/لوغو/هوية المنصّة — يديرها صاحب المنصّة من لوحته (بدل localStorage)."""
    site_name       = models.CharField(max_length=120, default='funduqii')
    subtitle        = models.CharField(max_length=200, blank=True, default='نظام إدارة الفنادق')
    logo_url        = models.URLField(max_length=1000, blank=True)
    favicon_url     = models.URLField(max_length=1000, blank=True)
    email           = models.EmailField(blank=True)
    phone           = models.CharField(max_length=40, blank=True)
    website         = models.URLField(max_length=500, blank=True)
    address         = models.CharField(max_length=300, blank=True)
    default_country = models.CharField(max_length=80, blank=True, default='سوريا')
    # د‑8: اتفاقية تفعيل حجوزات الموقع (نصّها ونسختها يديرها صاحب المنصّة)
    web_booking_agreement = models.TextField(blank=True)
    agreement_version     = models.PositiveIntegerField(default=1)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'إعدادات المنصّة'

    @classmethod
    def get_solo(cls):
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create()
        return obj

    def __str__(self):
        return 'إعدادات المنصّة'


# ─── LostFoundItem (المفقودات — سجلّ تشغيلي) ──────────────────────────────
class LostFoundItem(models.Model):
    STATUS_FOUND = 'found'
    STATUS_RETURNED = 'returned'
    STATUS_UNCLAIMED = 'unclaimed'
    STATUS_CHOICES = [
        (STATUS_FOUND, 'موجود'), (STATUS_RETURNED, 'أُعيد'), (STATUS_UNCLAIMED, 'غير مُطالَب'),
    ]
    hotel         = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='lost_found_items')
    item_name     = models.CharField(max_length=200)
    category      = models.CharField(max_length=40, blank=True)
    location      = models.CharField(max_length=200, blank=True)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_FOUND)
    guest_name    = models.CharField(max_length=200, blank=True)
    room_number   = models.CharField(max_length=20, blank=True)
    notes         = models.CharField(max_length=500, blank=True)
    found_date    = models.DateField(null=True, blank=True)
    returned_date = models.DateField(null=True, blank=True)
    created_by    = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['hotel', 'status'])]

    def __str__(self):
        return f'{self.item_name} — {self.status}'


# ─── ShiftHandover (تسليم الورديات — سجلّ تشغيلي) ─────────────────────────
class ShiftHandover(models.Model):
    SHIFT_MORNING = 'morning'
    SHIFT_EVENING = 'evening'
    SHIFT_NIGHT = 'night'
    SHIFT_CHOICES = [(SHIFT_MORNING, 'صباح'), (SHIFT_EVENING, 'مساء'), (SHIFT_NIGHT, 'ليل')]
    hotel             = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='shift_handovers')
    shift             = models.CharField(max_length=20, choices=SHIFT_CHOICES, default=SHIFT_MORNING)
    staff_name        = models.CharField(max_length=200, blank=True)
    handover_date     = models.DateField(null=True, blank=True)
    occupied_rooms    = models.PositiveIntegerField(default=0)
    arrivals          = models.PositiveIntegerField(default=0)
    departures        = models.PositiveIntegerField(default=0)
    pending_issues    = models.TextField(blank=True)
    guest_complaints  = models.TextField(blank=True)
    maintenance_notes = models.TextField(blank=True)
    cash_amount       = models.CharField(max_length=50, blank=True)
    general_notes     = models.TextField(blank=True)
    created_by        = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['hotel', 'handover_date'])]

    def __str__(self):
        return f'{self.shift} — {self.handover_date} — {self.staff_name}'


# ─── MenuItem / FoodOrder (خدمات الطعام) ──────────────────────────────────
class MenuItem(models.Model):
    hotel      = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='menu_items')
    name       = models.CharField(max_length=200)
    category   = models.CharField(max_length=80, blank=True)
    price      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    available  = models.BooleanField(default=True)
    notes      = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category', 'name']
        indexes = [models.Index(fields=['hotel'])]

    def __str__(self):
        return f'{self.name} — {self.price}'


class FoodOrder(models.Model):
    STATUS_NEW = 'new'
    STATUS_PREPARING = 'preparing'
    STATUS_READY = 'ready'
    STATUS_DELIVERED = 'delivered'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_NEW, 'جديد'), (STATUS_PREPARING, 'قيد التحضير'), (STATUS_READY, 'جاهز'),
        (STATUS_DELIVERED, 'مُسلَّم'), (STATUS_CANCELLED, 'ملغى'),
    ]
    hotel          = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='food_orders')
    order_no       = models.CharField(max_length=30, blank=True)
    source_type    = models.CharField(max_length=20, blank=True)
    service_type   = models.CharField(max_length=20, blank=True)
    room           = models.ForeignKey(Room, null=True, blank=True, on_delete=models.SET_NULL, related_name='food_orders')
    room_number    = models.CharField(max_length=20, blank=True)
    reservation    = models.ForeignKey(Reservation, null=True, blank=True, on_delete=models.SET_NULL, related_name='food_orders')
    reservation_no = models.CharField(max_length=30, blank=True)
    guest_name     = models.CharField(max_length=200, blank=True)
    table_number   = models.CharField(max_length=20, blank=True)
    customer_name  = models.CharField(max_length=200, blank=True)
    items          = models.JSONField(default=list)
    amount         = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency       = models.CharField(max_length=10, default='SAR')
    payment_method = models.CharField(max_length=20, blank=True)
    # د‑4: تفصيل المقبوض عند إنشاء الطلب (نقدي/إلكتروني/كرت/على حساب الغرفة)
    amount_cash       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_electronic = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_card       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_room       = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # على حساب الغرفة (ذمّة)
    room_settled      = models.BooleanField(default=False)   # هل سُوِّي جزء حساب الغرفة؟
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW)
    notes          = models.CharField(max_length=500, blank=True)
    delivered_at   = models.DateTimeField(null=True, blank=True)
    cancelled_at   = models.DateTimeField(null=True, blank=True)
    cancel_reason  = models.CharField(max_length=300, blank=True)
    created_by     = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['hotel', 'status'])]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.order_no:
            FoodOrder.objects.filter(pk=self.pk).update(order_no=f'ORD-{self.pk:05d}')
            self.order_no = f'ORD-{self.pk:05d}'

    def __str__(self):
        return f'{self.order_no or self.pk} — {self.amount} {self.currency}'


# ─── FolioCharge (كشف حساب النزيل — رسوم إضافية) ───────────────────────────
class FolioCharge(models.Model):
    hotel          = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='folio_charges')
    reservation    = models.ForeignKey(Reservation, null=True, blank=True, on_delete=models.SET_NULL, related_name='folio_charges')
    guest_name     = models.CharField(max_length=200, blank=True)
    room_number    = models.CharField(max_length=20, blank=True)
    booking_number = models.CharField(max_length=30, blank=True)
    charge_type    = models.CharField(max_length=40, blank=True)
    amount         = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency       = models.CharField(max_length=10, default='SAR')
    description    = models.CharField(max_length=300, blank=True)
    charge_date    = models.DateField(null=True, blank=True)
    settled        = models.BooleanField(default=False)
    created_by     = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['hotel', 'settled']), models.Index(fields=['reservation'])]

    def __str__(self):
        return f'{self.charge_type} — {self.amount} {self.currency}'


# ─── GuestProfile (أعلام/ملاحظات النزلاء — مفتاحها هوية النزيل) ─────────────
class GuestProfile(models.Model):
    FLAG_NORMAL = 'normal'
    FLAG_VIP = 'vip'
    FLAG_BLACKLIST = 'blacklist'
    FLAG_CHOICES = [(FLAG_NORMAL, 'عادي'), (FLAG_VIP, 'VIP'), (FLAG_BLACKLIST, 'محظور')]
    hotel      = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='guest_profiles')
    guest_key  = models.CharField(max_length=120)
    flag       = models.CharField(max_length=20, choices=FLAG_CHOICES, default=FLAG_NORMAL)
    notes      = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('hotel', 'guest_key')
        indexes = [models.Index(fields=['hotel'])]

    def __str__(self):
        return f'{self.guest_key} — {self.flag}'


# ─── AuditLog (سجلّ التدقيق — أثر ثابت لمن فعل ماذا ومتى) ────────────────────
class AuditLog(models.Model):
    """سجلّ أحداث ثابت (append‑only): من (actor) فعل أي إجراء على أي كيان، ومتى.

    - `hotel` فارغ للأحداث على مستوى المنصّة (فنادق/اشتراكات/باقات).
    - يُكتب عبر `record_audit()` فقط؛ لا تعديل/حذف من الـAPI (للقراءة فقط).
    """
    hotel        = models.ForeignKey(Hotel, null=True, blank=True, on_delete=models.CASCADE, related_name='audit_logs')
    actor        = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_actions')
    actor_name   = models.CharField(max_length=150, blank=True)   # لقطة (يبقى الاسم لو حُذف المستخدم)
    actor_role   = models.CharField(max_length=30, blank=True)
    action       = models.CharField(max_length=60)                # مثل: reservation.check_in
    entity_type  = models.CharField(max_length=40, blank=True)    # مثل: reservation / payment / hotel
    entity_id    = models.CharField(max_length=40, blank=True)
    summary      = models.CharField(max_length=300, blank=True)   # وصف بشري جاهز للعرض
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['hotel', '-created_at']),
            models.Index(fields=['action']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} · {self.action} · {self.actor_name}'


# ─── LoginChallenge (د‑6: تحدّي التحقق بخطوتين — كود يظهر للمدير داخل النظام) ─
class LoginChallenge(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_challenges')
    hotel      = models.ForeignKey(Hotel, null=True, blank=True, on_delete=models.CASCADE)
    ticket     = models.CharField(max_length=48, unique=True)
    code       = models.CharField(max_length=8)
    consumed   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['hotel', 'consumed', 'created_at'])]

    def __str__(self):
        return f'2FA {self.user_id} · {self.code}'


# ─── HotelAgreementAcceptance (د‑8: قبول الفندق لاتفاقية حجوزات الموقع) ──────
class HotelAgreementAcceptance(models.Model):
    hotel            = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='agreement_acceptances')
    version          = models.PositiveIntegerField()
    accepted_by      = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    accepted_by_name = models.CharField(max_length=150, blank=True)
    agreement_text   = models.TextField(blank=True)   # لقطة نصّ الاتفاقية وقت القبول
    accepted_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('hotel', 'version')
        indexes = [models.Index(fields=['hotel', 'version'])]

    def __str__(self):
        return f'Agreement v{self.version} · hotel {self.hotel_id}'


# ─── DayClose (د‑7: إغلاق اليوم الحقيقي — لقطة مُخزَّنة تُغلق بصلاحية المدير) ─
class DayClose(models.Model):
    hotel          = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='day_closes')
    business_date  = models.DateField()
    closed_by      = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    closed_by_name = models.CharField(max_length=150, blank=True)
    snapshot       = models.JSONField(default=dict)   # الأرقام والفحوصات وقت الإغلاق
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('hotel', 'business_date')
        ordering = ['-business_date']
        indexes = [models.Index(fields=['hotel', '-business_date'])]

    def __str__(self):
        return f'DayClose {self.hotel_id} · {self.business_date}'
