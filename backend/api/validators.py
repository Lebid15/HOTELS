import re
from django.core.exceptions import ValidationError


class UsernameValidator:
    """
    Enforces username policy:
    - 4–32 characters
    - Only a-z, A-Z, 0-9, period, hyphen, underscore
    - No spaces, HTML metacharacters, or emoji
    """
    min_length = 4
    max_length = 32
    _pattern = re.compile(r'^[a-zA-Z0-9._-]+$')

    def __call__(self, username: str) -> None:
        if len(username) < self.min_length:
            raise ValidationError(
                f'اسم المستخدم يجب أن يكون {self.min_length} أحرف على الأقل.'
            )
        if len(username) > self.max_length:
            raise ValidationError(
                f'اسم المستخدم يجب ألا يتجاوز {self.max_length} حرفاً.'
            )
        if not self._pattern.match(username):
            raise ValidationError(
                'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية أو أرقام '
                'أو النقطة (.) أو الشرطة السفلية (_) أو الشرطة (-) فقط.'
            )
