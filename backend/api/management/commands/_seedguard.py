"""حارس مشترك لأوامر البذر — يمنع تشغيلها عرَضًا على الإنتاج.

الملفّات التي تبدأ بـ`_` لا يعاملها Django كأوامر، فيصلح كوحدة مساعدة.
"""
import os
from django.conf import settings
from django.core.management.base import CommandError


def ensure_seed_allowed():
    """يرفع CommandError إن كان DEBUG=false ولم يُضبط ALLOW_SEED=1 صراحةً."""
    if not settings.DEBUG and os.environ.get('ALLOW_SEED') != '1':
        raise CommandError(
            'البذر معطّل على الإنتاج (DEBUG=false). '
            'اضبط ALLOW_SEED=1 لتجاوزٍ متعمَّد، أو استخدم أمر create_platform_owner لإنشاء المالك بأمان.'
        )
