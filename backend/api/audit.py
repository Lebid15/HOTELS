"""سجلّ التدقيق — واجهة كتابة واحدة (record_audit).

الاستدعاء آمن بذاته: أي خطأ في التسجيل لا يجب أن يُفشل العملية الأساسية،
لذا نلتقط الاستثناءات بصمت (السجلّ مساعد، وليس مصدر الحقيقة للعملية).
"""
from .models import AuditLog
from .permissions import _get_user_role


def record_audit(actor, *, hotel_id=None, action='', entity_type='', entity_id='', summary=''):
    """يكتب مدخلة سجلّ تدقيق واحدة. actor = المستخدم الفاعل (قد يكون None)."""
    try:
        actor_name = ''
        actor_role = ''
        actor_obj = actor if getattr(actor, 'is_authenticated', False) else None
        if actor_obj is not None:
            actor_name = actor_obj.get_username()
            actor_role = _get_user_role(actor_obj)
        AuditLog.objects.create(
            hotel_id=hotel_id,
            actor=actor_obj,
            actor_name=actor_name,
            actor_role=actor_role,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id != '' else '',
            summary=summary[:300],
        )
    except Exception:
        # لا نُفشل العملية الأساسية بسبب فشل التسجيل.
        pass
