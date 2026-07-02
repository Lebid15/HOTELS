from django.db import migrations


def create_missing_owner_profiles(apps, schema_editor):
    """إصلاح ثبات البيانات: كل مالك فندق (Hotel.manager_user) يجب أن يملك
    UserProfile بدور 'manager'. حساباتٌ قديمة فقدت ملفها الشخصي كانت تُعيد
    role=None فيُوجَّه صاحبها بعد الدخول إلى الموقع العام بدل لوحة التحكم.
    نُنشئ الملف الناقص (مالك الفندق = مديره تعريفًا؛ لا تصعيد صلاحيات)."""
    Hotel = apps.get_model('api', 'Hotel')
    UserProfile = apps.get_model('api', 'UserProfile')
    seen = set()
    for hotel in Hotel.objects.filter(manager_user__isnull=False).order_by('id'):
        uid = hotel.manager_user_id
        if uid in seen:
            continue
        seen.add(uid)
        if not UserProfile.objects.filter(user_id=uid).exists():
            UserProfile.objects.create(user_id=uid, role='manager', hotel=hotel)


def noop(apps, schema_editor):
    # لا تراجع: لا نحذف ملفات شخصية أُنشئت لإصلاح ثبات البيانات.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0038_reservation_guest_phone_normalized'),
    ]

    operations = [
        migrations.RunPython(create_missing_owner_profiles, noop),
    ]
