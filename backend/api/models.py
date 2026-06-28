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

    name = models.CharField(max_length=200)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
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

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_days = models.PositiveIntegerField(default=30)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='SAR')
    max_users = models.PositiveIntegerField(default=10)
    max_rooms = models.PositiveIntegerField(default=50)
    restaurant_support = models.BooleanField(default=True)
    reports_support = models.BooleanField(default=True)
    trial_support = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['hotel', 'number']
        ordering = ['floor', 'number']

    def __str__(self):
        return f"{self.hotel.name} - {self.number}"


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
