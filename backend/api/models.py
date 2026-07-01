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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


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
    # Public fields
    public_description = models.TextField(blank=True)
    show_in_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['hotel', 'number']
        ordering = ['floor', 'number']

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

    def save(self, *args, **kwargs):
        if not self.booking_number and self.hotel_id:
            count = Reservation.objects.filter(hotel_id=self.hotel_id).count()
            self.booking_number = f'BK-{count + 1:04d}'
        if self.public_booking and not self.public_booking_no:
            from django.utils import timezone as _tz
            year = _tz.now().year
            seq = Reservation.objects.filter(public_booking=True).count() + 1
            self.public_booking_no = f'WEB-{year}-{seq:05d}'
        super().save(*args, **kwargs)

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
        if not self.ticket_no and self.hotel_id:
            count = MaintenanceTicket.objects.filter(hotel_id=self.hotel_id).count()
            self.ticket_no = f'MT-{count + 1:04d}'
        super().save(*args, **kwargs)

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
