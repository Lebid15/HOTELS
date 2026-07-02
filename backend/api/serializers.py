from decimal import Decimal
from rest_framework import serializers
from .models import Hotel, HotelSettings, Package, Subscription, SubscriptionRequest, Room, Staff, Reservation, MaintenanceTicket, Payment, Expense, PlatformSettings, LostFoundItem, ShiftHandover, MenuItem, FoodOrder, FolioCharge, GuestProfile, HotelRating, AuditLog, DayClose


class HotelSerializer(serializers.ModelSerializer):
    subscription_status = serializers.SerializerMethodField()
    manager_username    = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'country', 'governorate', 'city', 'address', 'phone', 'email',
            'currency', 'logo', 'owner_name', 'website', 'food_settings',
            'status', 'floors_count', 'manager_name', 'manager_email',
            'manager_username', 'subscription_status',
            'cover_image', 'map_url', 'latitude', 'longitude',
            # د‑8 + م1: حضور الفندق على موقع الحجز (قابل للحفظ من واجهة المدير)
            'public_listing_enabled', 'public_booking_enabled', 'web_booking_needs_confirmation',
            'public_description_short', 'public_description_full',
            'gallery_images', 'amenities', 'is_featured',
            'stars', 'hotel_type',
            'cancellation_policy', 'check_in_policy', 'check_out_policy', 'payment_policy',
            'show_contact_info',
            # م1: الحقول التشغيلية المركزية المُلزَمة خادميًّا
            'code', 'check_in_time', 'check_out_time',
            'cleaning_mode', 'cleaning_duration_minutes',
            'enforce_shift_login',   # م5
            'two_factor_policy',     # م6
            'created_at', 'updated_at',
        ]
        read_only_fields = ['code']

    def get_subscription_status(self, obj):
        try:
            return obj.subscription.status
        except Subscription.DoesNotExist:
            return None

    def get_manager_username(self, obj):
        return obj.manager_user.username if obj.manager_user_id else None


class HotelSettingsSerializer(serializers.ModelSerializer):
    """م1: حِزم إعدادات التشغيل المرنة (طباعة/وثائق/تنبيهات) — مصدر خادمي مركزي."""
    class Meta:
        model = HotelSettings
        fields = ['printing', 'documents', 'notifications', 'updated_at']
        read_only_fields = ['updated_at']


class PackageSerializer(serializers.ModelSerializer):
    subscription_count = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = [
            'id', 'name', 'description',
            'price_monthly', 'price_yearly',
            'max_rooms', 'max_staff', 'max_users',
            'features', 'status', 'notes',
            'subscription_count',
            'created_at', 'updated_at',
        ]

    def get_subscription_count(self, obj):
        return obj.subscription_set.filter(status__in=['active', 'trial']).count()


class SubscriptionSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True, allow_null=True)
    remaining_days = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'hotel', 'hotel_name', 'package', 'package_name',
            'status', 'payment_status', 'start_date', 'end_date',
            'monthly_amount', 'currency', 'notes', 'remaining_days',
            'created_at', 'updated_at',
        ]

    def get_remaining_days(self, obj):
        if not obj.end_date:
            return None
        from django.utils import timezone
        delta = obj.end_date - timezone.now().date()
        return delta.days


class SubscriptionRequestSerializer(serializers.ModelSerializer):
    hotel_name         = serializers.CharField(source='hotel.name', read_only=True)
    package_name       = serializers.CharField(source='package.name', read_only=True, allow_null=True)
    requested_by_name  = serializers.CharField(source='hotel.manager_name', read_only=True, allow_null=True)
    requested_by_email = serializers.CharField(source='hotel.manager_email', read_only=True, allow_null=True)

    class Meta:
        model = SubscriptionRequest
        fields = [
            'id', 'hotel', 'hotel_name', 'package', 'package_name',
            'status', 'notes', 'rejection_reason',
            'requested_by_name', 'requested_by_email',
            'created_at', 'updated_at',
        ]


class RoomSerializer(serializers.ModelSerializer):
    type = serializers.CharField(max_length=30)  # allow custom room type strings from hotel settings

    class Meta:
        model = Room
        fields = [
            'id', 'hotel', 'number', 'floor', 'type', 'capacity',
            'status', 'price', 'currency', 'notes', 'amenities', 'created_at', 'updated_at',
        ]
        extra_kwargs = {'hotel': {'read_only': True}}  # B‑7: يُضبط من الخادم فقط


class ReservationSerializer(serializers.ModelSerializer):
    guest_full_name  = serializers.SerializerMethodField()
    room_number      = serializers.CharField(source='room.number', read_only=True, allow_null=True)
    room_floor       = serializers.IntegerField(source='room.floor', read_only=True, allow_null=True)
    created_by_name  = serializers.SerializerMethodField()
    # ── سلسلة المال (مشتقّات محسوبة، لا تُخزَّن) ────────────────────────────
    # الإجمالي الكامل = الغرفة (total) + الخدمات (فوليو + طعام) والدين = ما تبقّى.
    folio_total      = serializers.SerializerMethodField()   # مجموع رسوم الفوليو
    food_total       = serializers.SerializerMethodField()   # مجموع طلبات الطعام غير الملغاة
    charges_total    = serializers.SerializerMethodField()   # folio + food (إجمالي الخدمات)
    grand_total      = serializers.SerializerMethodField()   # total (الغرفة) + charges_total
    balance_due      = serializers.SerializerMethodField()   # الدين المتبقّي (غرفة + خدمات − مدفوع)

    class Meta:
        model = Reservation
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'required': False, 'allow_null': True},
            'hotel': {'read_only': True},  # B‑7: يُضبط من الخادم فقط
        }

    def get_guest_full_name(self, obj):
        return f'{obj.guest_first_name} {obj.guest_last_name}'.strip()

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None

    # ── مشتقّات سلسلة المال ─────────────────────────────────────────────────
    # تُحسب فوق العلاقات المُسبقة الجلب (prefetch_related) في get_queryset
    # لتفادي N+1. كل رقم مشتقّ من مصدره الوحيد ولا يُكرَّر عدّه.
    @staticmethod
    def _folio_sum(obj):
        # م1: الرسوم المبطلة لا تدخل في الإجمالي المالي
        return sum((c.amount for c in obj.folio_charges.all() if not c.voided), Decimal('0'))

    @staticmethod
    def _folio_outstanding(obj):
        # م1: تُستثنى الرسوم المبطلة (لا تدخل في الرصيد المستحق)
        return sum((c.amount for c in obj.folio_charges.all() if not c.settled and not c.voided), Decimal('0'))

    @staticmethod
    def _food_sum(obj):
        return sum((o.amount for o in obj.food_orders.all()
                    if o.status != FoodOrder.STATUS_CANCELLED), Decimal('0'))

    @staticmethod
    def _food_room_charge(o):
        """د‑4: الجزء المحمَّل على حساب الغرفة (ذمّة) لطلب طعام واحد.
        الجديد: `amount_room` من التفصيل. القديم (توافق خلفي): كامل المبلغ إن كان بلا وسيلة دفع."""
        if o.status == FoodOrder.STATUS_CANCELLED or o.room_settled:
            return Decimal('0')
        breakdown = (o.amount_cash or 0) + (o.amount_electronic or 0) + (o.amount_card or 0) + (o.amount_room or 0)
        if breakdown > 0:
            return o.amount_room or Decimal('0')
        # توافق خلفي: طلب بلا تفصيل — يُعتبر على حساب الغرفة إن كان بلا وسيلة دفع أو «حساب غرفة».
        pm = (o.payment_method or '').strip().lower()
        if pm in ('', 'room_account', 'room', 'on_room', 'room_charge'):
            return o.amount or Decimal('0')
        return Decimal('0')

    @staticmethod
    def _food_outstanding(obj):
        return sum((ReservationSerializer._food_room_charge(o) for o in obj.food_orders.all()), Decimal('0'))

    def get_folio_total(self, obj):
        return self._folio_sum(obj)

    def get_food_total(self, obj):
        return self._food_sum(obj)

    def get_charges_total(self, obj):
        return self._folio_sum(obj) + self._food_sum(obj)

    def get_grand_total(self, obj):
        return (obj.total or Decimal('0')) + self._folio_sum(obj) + self._food_sum(obj)

    def get_balance_due(self, obj):
        room_balance = (obj.total or Decimal('0')) - (obj.paid or Decimal('0'))
        return room_balance + self._folio_outstanding(obj) + self._food_outstanding(obj)


class ReservationListSerializer(ReservationSerializer):
    """B‑6: نسخة القائمة تُسقط صور الوثائق (base64) لمنع التسريب/الحمل الضخم.
    تُجلَب الوثائق عند فتح سجلّ واحد (retrieve) فقط."""
    class Meta:
        model = Reservation
        exclude = ['guest_doc_image', 'family_doc_image', 'companion_docs']
        extra_kwargs = {
            'created_by': {'required': False, 'allow_null': True},
            'hotel': {'read_only': True},
        }


class PublicHotelCardSerializer(serializers.ModelSerializer):
    min_price = serializers.SerializerMethodField()
    min_currency = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'slug', 'name', 'stars', 'hotel_type', 'country', 'governorate', 'city',
            'cover_image', 'amenities', 'public_description_short',
            'is_featured', 'min_price', 'min_currency',
            'avg_rating', 'ratings_count',
        ]

    def get_min_price(self, obj):
        room = obj.rooms.filter(show_in_public=True, price__gt=0).order_by('price').first()
        return float(room.price) if room else None

    def get_min_currency(self, obj):
        room = obj.rooms.filter(show_in_public=True, price__gt=0).order_by('price').first()
        return room.currency if room else 'USD'

    def get_avg_rating(self, obj):
        from django.db.models import Avg
        v = obj.ratings.filter(is_approved=True).aggregate(a=Avg('rating'))['a']
        return round(float(v), 2) if v is not None else None

    def get_ratings_count(self, obj):
        return obj.ratings.filter(is_approved=True).count()


class PublicHotelDetailSerializer(serializers.ModelSerializer):
    min_price = serializers.SerializerMethodField()
    min_currency = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id', 'slug', 'name', 'stars', 'hotel_type', 'country', 'governorate', 'city', 'address',
            'map_url', 'latitude', 'longitude',
            'cover_image', 'gallery_images', 'amenities',
            'public_description_short', 'public_description_full',
            'is_featured', 'check_in_policy', 'check_out_policy',
            'cancellation_policy', 'payment_policy',
            'show_contact_info', 'phone',
            'min_price', 'min_currency',
            'avg_rating', 'ratings_count',
        ]

    def get_min_price(self, obj):
        room = obj.rooms.filter(show_in_public=True, price__gt=0).order_by('price').first()
        return float(room.price) if room else None

    def get_min_currency(self, obj):
        room = obj.rooms.filter(show_in_public=True, price__gt=0).order_by('price').first()
        return room.currency if room else 'USD'

    def get_avg_rating(self, obj):
        from django.db.models import Avg
        v = obj.ratings.filter(is_approved=True).aggregate(a=Avg('rating'))['a']
        return round(float(v), 2) if v is not None else None

    def get_ratings_count(self, obj):
        return obj.ratings.filter(is_approved=True).count()


class PublicHotelRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelRating
        fields = ['id', 'guest_name', 'rating', 'comment', 'created_at']


def _mask_email(email: str) -> str:
    if not email or '@' not in email:
        return ''
    name, _, domain = email.partition('@')
    masked = (name[0] + '*' * (len(name) - 1)) if len(name) > 1 else '*'
    return f'{masked}@{domain}'


def _mask_phone(phone: str) -> str:
    digits = ''.join(ch for ch in (phone or '') if ch.isdigit())
    if not digits:
        return ''
    if len(digits) <= 4:
        return '*' * len(digits)
    return '*' * (len(digits) - 4) + digits[-4:]


class PublicBookingLookupSerializer(serializers.ModelSerializer):
    """المرحلة 3: استجابة البحث/عرض الحجز العام (lookup برقم+هاتف أو رمز).

    **لا تتضمّن `manage_token` إطلاقًا** — الرمز القويّ يظهر مرّة واحدة فقط في
    استجابة إنشاء الحجز (PublicBookingCreateResponseSerializer). البريد/الهاتف
    مُقنّعان (B‑1). هذا هو المُسلسِل الآمن الافتراضي لأيّ عرض لاحق للحجز."""
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    hotel_city = serializers.CharField(source='hotel.city', read_only=True)
    hotel_phone = serializers.SerializerMethodField()
    cancellation_policy = serializers.CharField(source='hotel.cancellation_policy', read_only=True)
    guest_email = serializers.SerializerMethodField()
    guest_phone = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            'id', 'public_booking_no', 'hotel_name', 'hotel_city', 'hotel_phone',
            'guest_first_name', 'guest_last_name', 'guest_phone', 'guest_email',
            'room_type_label', 'check_in_date', 'check_out_date', 'nights_count',
            'persons_count', 'total', 'currency', 'payment_method', 'documents_status',
            'arrival_status', 'status', 'notes', 'cancellation_policy',
            'cancelled_at', 'cancel_reason', 'cancelled_by_type',
            'created_at',
        ]

    def get_hotel_phone(self, obj):
        return obj.hotel.phone if obj.hotel.show_contact_info else None

    def get_guest_email(self, obj):
        return _mask_email(obj.guest_email)

    def get_guest_phone(self, obj):
        return _mask_phone(obj.guest_phone)


class PublicBookingCreateResponseSerializer(PublicBookingLookupSerializer):
    """المرحلة 3: استجابة إنشاء الحجز الناجح **فقط** — تُظهر `manage_token` مرّةً
    واحدة (+ `manage_url` جاهز للحفظ) كي يحتفظ بهما العميل لإدارة/إلغاء حجزه لاحقًا.
    يُمنع استخدام هذا المُسلسِل في أيّ بحث/عرض لاحق (كي لا يُعاد كشف الرمز)."""
    manage_url = serializers.SerializerMethodField()

    class Meta(PublicBookingLookupSerializer.Meta):
        fields = PublicBookingLookupSerializer.Meta.fields + ['manage_token', 'manage_url']

    def get_manage_url(self, obj):
        # مسار نسبيّ يحمل الرمز — تبنيه الواجهة رابطًا مطلقًا للحفظ/المشاركة.
        return f"/manage-booking?no={obj.public_booking_no}&token={obj.manage_token}"


class StaffSerializer(serializers.ModelSerializer):
    username  = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    has_login = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = [
            'id', 'hotel', 'user', 'full_name', 'role', 'phone', 'email',
            'shift', 'shift_start', 'shift_end', 'status', 'permissions', 'notes',
            'username', 'has_login', 'created_at', 'updated_at',
        ]
        extra_kwargs = {'hotel': {'read_only': True}, 'user': {'read_only': True}}  # B‑7 / م5

    def get_has_login(self, obj):
        return obj.user_id is not None


class MaintenanceTicketSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    room_number      = serializers.SerializerMethodField()
    room_floor       = serializers.SerializerMethodField()
    room_status      = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceTicket
        fields = [
            'id', 'hotel', 'ticket_no', 'room', 'issue_type', 'priority',
            'status', 'description', 'assigned_to', 'source',
            'created_by', 'started_at', 'resolved_at', 'resolved_by',
            'created_at', 'updated_at',
            'assigned_to_name', 'room_number', 'room_floor', 'room_status',
        ]
        extra_kwargs = {'hotel': {'read_only': True}, 'ticket_no': {'read_only': True}}  # B‑7

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None

    def get_room_number(self, obj):
        return obj.room.number if obj.room else None

    def get_room_floor(self, obj):
        return obj.room.floor if obj.room else None

    def get_room_status(self, obj):
        return obj.room.status if obj.room else None


class PaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    guest_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'hotel', 'reservation', 'amount',
            'amount_cash', 'amount_electronic', 'amount_card',
            'currency', 'method', 'source', 'note',
            'receipt_no', 'voided', 'voided_at', 'void_reason',
            'created_by', 'created_by_name', 'guest_name', 'created_at',
        ]
        extra_kwargs = {
            'hotel': {'read_only': True},
            'receipt_no': {'read_only': True},
            'created_by': {'read_only': True},
            'voided': {'read_only': True}, 'voided_at': {'read_only': True},
            'void_reason': {'read_only': True},
        }

    def validate(self, attrs):
        """م4 (اتساق الدفع المقسّم): يجب أن يساوي مجموعُ طرق الدفع مبلغَ الدفعة،
        بلا قيم سالبة، ومبلغٌ موجب. `amount` هو مصدر الحقيقة والأجزاء تفصيله.

        آمن للتحديث الجزئي: يدمج القيم المُرسَلة مع القائمة قبل الفحص (Decimal لا
        float). ملاحظة: `PaymentViewSet` يمنع PUT/PATCH أصلًا (إنشاء/إبطال فقط)،
        فالدمج احترازيّ لو فُعِّل التعديل مستقبلًا. الحقول الفارغة/None تُعامَل 0."""
        raw = getattr(self, 'initial_data', {}) or {}

        def eff(field):
            if field in attrs:
                v = attrs[field]
            elif self.instance is not None:
                v = getattr(self.instance, field)
            else:
                v = None
            return v if v is not None else Decimal('0')

        amount = eff('amount')
        cash   = eff('amount_cash')
        elec   = eff('amount_electronic')
        card   = eff('amount_card')

        # (3) منع القيم السالبة في أيّ حقل ماليّ
        for name, v in (('amount', amount), ('amount_cash', cash),
                        ('amount_electronic', elec), ('amount_card', card)):
            if v < 0:
                raise serializers.ValidationError({name: 'لا يجوز أن تكون القيمة سالبة.'})

        split_sum = cash + elec + card

        # توافق خلفيّ: إن أُرسلت الأجزاء دون إجمالي صريح، يُشتقّ الإجمالي منها
        if split_sum > 0 and 'amount' not in raw:
            attrs['amount'] = amount = split_sum

        # (3) مبلغ الدفعة يجب أن يكون أكبر من صفر
        if amount <= 0:
            raise serializers.ValidationError({'amount': 'مبلغ الدفعة يجب أن يكون أكبر من صفر.'})

        # (2) عند وجود تفصيل، يجب أن يطابق مجموعُه إجماليَّ الدفعة تمامًا
        if split_sum > 0 and split_sum != amount:
            raise serializers.ValidationError('مجموع طرق الدفع يجب أن يساوي مبلغ الدفعة.')

        # طريقة «مختلط» عند وجود أكثر من جزء غير صفريّ (يحافظ على السلوك القائم)
        if split_sum > 0 and sum(1 for x in (cash, elec, card) if x) > 1:
            attrs['method'] = Payment.METHOD_MIXED

        return attrs

    def get_guest_name(self, obj):
        r = obj.reservation
        return f'{r.guest_first_name} {r.guest_last_name}'.strip() if r else ''


class ExpenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'hotel', 'category', 'description', 'amount', 'currency',
            'spent_on', 'paid_to', 'notes', 'voided', 'voided_at', 'void_reason',
            'created_by', 'created_by_name', 'created_at',
        ]
        extra_kwargs = {'hotel': {'read_only': True}, 'created_by': {'read_only': True},
                        'voided': {'read_only': True}, 'voided_at': {'read_only': True},
                        'void_reason': {'read_only': True}}


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        exclude = ['id']


class LostFoundItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LostFoundItem
        fields = [
            'id', 'hotel', 'item_name', 'category', 'location', 'status',
            'guest_name', 'room_number', 'notes', 'found_date', 'returned_date',
            'received_by', 'created_by', 'created_at',
        ]
        extra_kwargs = {'hotel': {'read_only': True}, 'created_by': {'read_only': True}}


class ShiftHandoverSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ShiftHandover
        fields = [
            'id', 'hotel', 'shift', 'staff_name', 'handover_date',
            'occupied_rooms', 'arrivals', 'departures',
            'pending_issues', 'guest_complaints', 'maintenance_notes',
            'cash_amount', 'general_notes', 'created_by', 'created_by_name', 'created_at',
        ]
        extra_kwargs = {'hotel': {'read_only': True}, 'created_by': {'read_only': True}}


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['id', 'hotel', 'name', 'category', 'price', 'available', 'notes', 'created_at']
        extra_kwargs = {'hotel': {'read_only': True}}


class FoodOrderSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = FoodOrder
        fields = [
            'id', 'hotel', 'order_no', 'source_type', 'service_type',
            'room', 'room_number', 'reservation', 'reservation_no', 'guest_name',
            'table_number', 'customer_name', 'items', 'amount', 'currency',
            'payment_method', 'amount_cash', 'amount_electronic', 'amount_card', 'amount_room', 'room_settled',
            'status', 'notes', 'delivered_at', 'cancelled_at',
            'cancel_reason', 'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        extra_kwargs = {'hotel': {'read_only': True}, 'order_no': {'read_only': True}, 'created_by': {'read_only': True}}


class FolioChargeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    voided_by_name  = serializers.CharField(source='voided_by.username', read_only=True, allow_null=True)

    class Meta:
        model = FolioCharge
        fields = [
            'id', 'hotel', 'reservation', 'guest_name', 'room_number', 'booking_number',
            'charge_type', 'amount', 'currency', 'description', 'charge_date', 'settled',
            # م1: حقول الإبطال (للقراءة فقط — الإبطال عبر endpoint المخصّص، لا من الإنشاء/التعديل)
            'voided', 'voided_at', 'voided_by', 'voided_by_name', 'void_reason',
            'created_by', 'created_by_name', 'created_at',
        ]
        extra_kwargs = {
            'hotel': {'read_only': True}, 'created_by': {'read_only': True},
            'voided': {'read_only': True}, 'voided_at': {'read_only': True},
            'voided_by': {'read_only': True}, 'void_reason': {'read_only': True},
        }


class GuestProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestProfile
        fields = ['id', 'hotel', 'guest_key', 'flag', 'notes', 'updated_at']
        extra_kwargs = {'hotel': {'read_only': True}}


class DayCloseSerializer(serializers.ModelSerializer):
    class Meta:
        model = DayClose
        fields = ['id', 'hotel', 'business_date', 'closed_by', 'closed_by_name',
                  'snapshot', 'notes', 'created_at']
        extra_kwargs = {'hotel': {'read_only': True}, 'closed_by': {'read_only': True},
                        'closed_by_name': {'read_only': True}}


class AuditLogSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'hotel', 'hotel_name', 'actor', 'actor_name', 'actor_role',
            'action', 'entity_type', 'entity_id', 'summary', 'created_at',
        ]
