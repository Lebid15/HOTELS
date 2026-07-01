"""إنشاء/تحديث حساب مالك المنصّة بأمان على الإنتاج.

كلمة المرور تُقرأ من متغيّر البيئة PLATFORM_OWNER_PASSWORD، وإلا تُطلب تفاعليًا،
وتُفحَص عبر validate_password قبل الإنشاء.

الاستخدام:
    python manage.py create_platform_owner --username platform --email owner@funduqii.com
"""
import getpass
import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from api.models import UserProfile


class Command(BaseCommand):
    help = 'إنشاء أو تحديث حساب مالك المنصّة بكلمة مرور قوية.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default=os.environ.get('PLATFORM_OWNER_USERNAME', 'platform'))
        parser.add_argument('--email', default=os.environ.get('PLATFORM_OWNER_EMAIL', ''))

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']
        email = options['email']

        password = os.environ.get('PLATFORM_OWNER_PASSWORD')
        if not password:
            password = getpass.getpass('Platform owner password: ')
            if password != getpass.getpass('Confirm password: '):
                raise CommandError('كلمتا المرور غير متطابقتين.')

        existing = User.objects.filter(username=username).first()
        try:
            validate_password(password, existing)
        except ValidationError as exc:
            raise CommandError('كلمة مرور ضعيفة: ' + ' | '.join(exc.messages))

        user, created = User.objects.get_or_create(username=username, defaults={'email': email})
        user.set_password(password)
        if email:
            user.email = email
        user.save()
        UserProfile.objects.update_or_create(
            user=user,
            defaults={'role': UserProfile.ROLE_PLATFORM_OWNER, 'hotel': None},
        )
        verb = 'أُنشئ' if created else 'حُدِّث'
        self.stdout.write(self.style.SUCCESS(f'مالك المنصّة "{username}" {verb} بنجاح.'))
