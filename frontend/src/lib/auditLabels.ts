// تسميات سجلّ التدقيق: تحويل رموز الأفعال التقنية (مثل auth.login_success) إلى
// نصوص عربية بشرية مفهومة — مصدر واحد تشترك فيه لوحتا المدير والمنصّة.

export const AUDIT_ROLE_LABEL: Record<string, string> = {
  platform_owner: "صاحب المنصّة",
  manager: "مدير الفندق",
  reception: "موظف استقبال",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  // ── المصادقة والأمان ──────────────────────────────────────────────
  "auth.login_success": "تسجيل دخول ناجح",
  "auth.login_failed": "محاولة دخول فاشلة",
  "auth.login_locked": "قفل حساب (محاولات فاشلة)",
  "auth.logout_all": "خروج من كل الأجهزة",
  "auth.shift_blocked": "منع دخول خارج الوردية",
  "auth.2fa_challenge": "طلب تحقّق بخطوتين",
  "auth.2fa_success": "تحقّق بخطوتين ناجح",
  "auth.2fa_failed": "تحقّق بخطوتين فاشل",
  "auth.2fa_enabled": "تفعيل التحقّق بخطوتين",
  "auth.2fa_disabled": "إيقاف التحقّق بخطوتين",
  // ── الحجوزات ──────────────────────────────────────────────────────
  "reservation.check_in": "تسجيل دخول نزيل",
  "reservation.check_out": "تسجيل خروج نزيل",
  "reservation.settle_checkout": "دفع وإغلاق حساب + خروج",
  // ── المال ─────────────────────────────────────────────────────────
  "payment.create": "تسجيل دفعة",
  "payment.void": "إبطال دفعة",
  "expense.void": "إبطال مصروف",
  "folio_charge.void": "إبطال رسم فوليو",
  "day.close": "إغلاق اليوم",
  // ── الفندق ────────────────────────────────────────────────────────
  "hotel.create": "إنشاء فندق",
  "hotel.settings.update": "تحديث إعدادات الفندق",
  "hotel.manager_password_reset": "إعادة تعيين كلمة مرور المدير",
  "hotel.status.active": "تفعيل فندق",
  "hotel.status.suspended": "إيقاف فندق",
  "hotel.status.archived": "أرشفة فندق",
  // ── الموظفون ──────────────────────────────────────────────────────
  "staff.create": "إضافة موظف",
  "staff.password_reset": "إعادة تعيين كلمة مرور موظف",
  // ── الاشتراكات والاتفاقية ─────────────────────────────────────────
  "subscription.approve": "اعتماد اشتراك",
  "subscription.reject": "رفض اشتراك",
  "agreement.accept": "قبول اتفاقية حجوزات الموقع",
  // ── العمولة ───────────────────────────────────────────────────────
  "commission.mark_paid": "تعليم العمولة كمدفوعة",
  "commission.mark_partial": "تعليم العمولة كجزئية",
  "commission.mark_due": "تعليم العمولة كمستحقة",
  "commission.waive": "إعفاء العمولة",
};

/** تسمية بشرية للفعل عبر `t()`؛ مع بديل مقروء لأيّ رمز غير مُعرَّف. */
export function auditActionLabel(action: string, t: (s: string) => string): string {
  if (AUDIT_ACTION_LABEL[action]) return t(AUDIT_ACTION_LABEL[action]);
  if (action.startsWith("auth.")) return t("حدث أمني");
  if (action.startsWith("payment")) return t("عملية دفع");
  if (action.startsWith("hotel")) return t("عملية على الفندق");
  if (action.startsWith("commission")) return t("عملية عمولة");
  if (action.startsWith("subscription")) return t("عملية اشتراك");
  if (action.startsWith("reservation")) return t("عملية حجز");
  return action.replace(/[._]/g, " ");   // بديل مقروء بدل الرمز الخام
}

/** لون الشارة حسب طبيعة الحدث (نجاح/خطر/تحذير/معلومة). */
export function auditBadgeClass(action: string): string {
  if (/(failed|locked|blocked|void|reject)/.test(action)) return "ds-badge-danger";
  if (/(success|approve|mark_paid)/.test(action) || action === "payment.create" || action === "hotel.status.active") return "ds-badge-success";
  if (/(suspended|archived|waive)/.test(action)) return "ds-badge-warning";
  if (action.startsWith("hotel") || action.startsWith("reservation") || action.startsWith("agreement") || action.includes("2fa")) return "ds-badge-info";
  return "ds-badge-neutral";
}

/**
 * نصّ عمود «التفاصيل». الأحداث الأمنية تُخزَّن كملخّص خام «action · username»
 * (مكرّر مع عمودي الفعل/الفاعل) → نُنظّفه: عند وجود فاعل معروف (دخول ناجح) نُخفيه؛
 * وإلا (محاولة فاشلة بلا فاعل) نُظهر اسم المستخدم المُحاوَل فقط. غير ذلك = الملخّص كما هو.
 */
export function auditDetail(action: string, summary: string, actorName?: string): string {
  const s = (summary || "").trim();
  if (!s) return "—";
  if (s.startsWith(action)) {
    if (actorName && actorName.trim()) return "—";
    const rest = s.slice(action.length).replace(/^[\s·]+/, "").trim();
    return rest || "—";
  }
  return s;
}
