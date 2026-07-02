"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, CheckCircle, XCircle, AlertCircle, Calendar, Building2, User, Phone, MessageCircle, Copy, Check } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

interface BookingDetail {
  id: number;
  public_booking_no: string;
  hotel_name: string;
  hotel_city: string;
  hotel_phone: string | null;
  guest_first_name: string;
  guest_last_name: string;
  guest_phone: string;
  guest_email: string;
  room_type_label: string;
  check_in_date: string;
  check_out_date: string;
  nights_count: number;
  persons_count: number;
  total: string;
  currency: string;
  payment_method: string;
  arrival_status: string;
  status: string;
  notes: string;
  cancellation_policy: string;
  cancelled_at: string | null;
  cancel_reason: string;
  cancelled_by_type: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  confirmed:         { label: "مؤكد",          badge: "ds-badge ds-badge-info" },
  checked_in:        { label: "مسجل الدخول",   badge: "ds-badge ds-badge-success" },
  checked_out:       { label: "تم المغادرة",   badge: "ds-badge ds-badge-neutral" },
  cancelled:         { label: "ملغى",           badge: "ds-badge ds-badge-danger" },
  no_show:           { label: "لم يصل",        badge: "ds-badge ds-badge-warning" },
  awaiting_arrival:  { label: "بانتظار الوصول", badge: "ds-badge ds-badge-info" },
  cancelled_by_guest:{ label: "ملغى من الضيف", badge: "ds-badge ds-badge-danger" },
  cancelled_by_hotel:{ label: "ملغى من الفندق", badge: "ds-badge ds-badge-danger" },
};

function formatDate(d: string, locale = "ar-SY") {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(locale, { weekday: "short", year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}

export default function ManageBookingPage() {
  const { t, locale } = useLang();
  const [bookingNo, setBookingNo] = useState("");
  const [phone,     setPhone]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [booking,   setBooking]   = useState<BookingDetail | null>(null);
  // المرحلة 3: رمز الإدارة القويّ يأتي حصراً من رابط الإنشاء الأصلي (لا من البحث)
  const [urlToken,  setUrlToken]  = useState("");

  const [showCancel,    setShowCancel]    = useState(false);
  const [cancelReason,  setCancelReason]  = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError,   setCancelError]   = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [copied,        setCopied]        = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);

  function buildSummary(b: BookingDetail) {
    return (
`${t("تفاصيل حجزي")} 🏨
${t("رقم الحجز")}: ${b.public_booking_no}
${t("الفندق")}: ${b.hotel_name}${b.hotel_city ? ` — ${b.hotel_city}` : ""}
${t("نوع الغرفة")}: ${b.room_type_label}
${t("الوصول")}: ${b.check_in_date}
${t("المغادرة")}: ${b.check_out_date}
${t("عدد الليالي")}: ${b.nights_count}
${t("الإجمالي")}: ${parseFloat(b.total).toLocaleString(locale)} ${b.currency}
${t("طريقة الدفع")}: ${t("الدفع عند الوصول")}`
    );
  }

  function copyDetails(b: BookingDetail) {
    navigator.clipboard?.writeText(buildSummary(b)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  // بحث موحّد — يُبنى استعلامه من (رقم+رمز) عبر الرابط أو (رقم+هاتف) عبر النموذج
  function runLookup(qs: string) {
    setLoading(true);
    setError("");
    setBooking(null);
    setCancelSuccess(false);
    setShowCancel(false);
    fetch(apiUrl(`/public/manage-booking/?${qs}`))
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) { setError(data.error ?? t("لم يتم العثور على الحجز")); setLoading(false); return; }
        setBooking(data);
        setLoading(false);
        // تمرير سلس إلى بطاقة تفاصيل الحجز بعد رسمها
        requestAnimationFrame(() => {
          setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        });
      })
      .catch(() => { setError(t("حدث خطأ في الاتصال")); setLoading(false); });
  }

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingNo.trim() || !phone.trim()) { setError(t("يرجى إدخال رقم الحجز ورقم الهاتف")); return; }
    setUrlToken("");   // بحث يدويّ بالهاتف — لا نعتمد رمزًا
    runLookup(`no=${encodeURIComponent(bookingNo.trim())}&phone=${encodeURIComponent(phone.trim())}`);
  }

  // المرحلة 3: القدوم عبر رابط الإدارة (no+token) → بحث بالرمز القويّ مباشرةً.
  // النموذج اليدويّ (رقم+هاتف) يبقى مسارًا بديلاً. لا يُؤخذ الرمز من نتيجة بحث.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const no = (p.get("no") || "").trim();
    const tok = (p.get("token") || "").trim();
    if (!no || !tok) return;
    /* eslint-disable react-hooks/set-state-in-effect -- تعبئة الحقول من الرابط مقصودة عند الإقلاع */
    setBookingNo(no);
    setUrlToken(tok);
    /* eslint-enable react-hooks/set-state-in-effect */
    runLookup(`no=${encodeURIComponent(no)}&token=${encodeURIComponent(tok)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- قراءة معاملات الرابط مرّة واحدة فقط عند الإقلاع
  }, []);

  function submitCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setCancelLoading(true);
    setCancelError("");
    fetch(apiUrl(`/public/bookings/${booking.public_booking_no}/cancel/`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // المرحلة 3: نُفضّل الرمز القويّ (إن جاء من الرابط)، وإلا الهاتف كبديل
      body: JSON.stringify(urlToken
        ? { token: urlToken, reason: cancelReason }
        : { phone: phone.trim(), reason: cancelReason }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) { setCancelError(data.error ?? t("فشل الإلغاء")); setCancelLoading(false); return; }
        setBooking(b => b ? { ...b, status: "cancelled", arrival_status: "cancelled_by_guest" } : b);
        setCancelSuccess(true);
        setShowCancel(false);
        setCancelLoading(false);
      })
      .catch(() => { setCancelError(t("حدث خطأ في الاتصال")); setCancelLoading(false); });
  }

  const canCancel = booking && !["cancelled","checked_in","checked_out","no_show"].includes(booking.status);
  const statusInfo = booking ? (STATUS_LABELS[booking.arrival_status] ?? STATUS_LABELS[booking.status] ?? { label: booking.status, badge: "ds-badge ds-badge-neutral" }) : null;

  return (
    <div className="pub-shell">
      {/* Header */}
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href="/" className="pub-logo">funduqii</Link>
          <nav>
            <ul className="pub-nav-links">
              <li><Link href="/" className="pub-nav-link">{t("الرئيسية")}</Link></li>
              <li><Link href="/hotels" className="pub-nav-link">{t("الفنادق")}</Link></li>
              <li><Link href="/manage-booking" className="pub-nav-link" style={{ color: "var(--color-primary)" }}>{t("إدارة حجزي")}</Link></li>
            </ul>
          </nav>
          <Link href="/hotels" className="ds-btn ds-btn-primary ds-btn-sm">{t("احجز الآن")}</Link>
        </div>
      </header>

      <main style={{ flex: 1, padding: "2rem 1.5rem" }}>
        <div className="pub-container">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-heading)", marginBottom: ".5rem" }}>
              {t("إدارة حجزك")}
            </h1>
            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
              {t("أدخل رقم الحجز ورقم هاتفك للوصول إلى بيانات حجزك")}
            </p>
          </div>

          {/* Lookup Form */}
          <div className="pub-lookup-card">
            <form onSubmit={lookup}>
              <div className="pub-form-field">
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-heading)", marginBottom: ".4rem" }}>
                  {t("رقم الحجز")}
                </label>
                <input
                  className="pub-filter-input"
                  type="text"
                  placeholder="WEB-2026-00001"
                  value={bookingNo}
                  onChange={e => setBookingNo(e.target.value.toUpperCase())}
                  style={{ width: "100%", boxSizing: "border-box", marginBottom: 0 }}
                />
              </div>
              <div className="pub-form-field" style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-heading)", marginBottom: ".4rem" }}>
                  {t("رقم الهاتف (المستخدم عند الحجز)")}
                </label>
                <input
                  className="pub-filter-input"
                  type="tel"
                  placeholder="+963..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", marginBottom: 0 }}
                />
              </div>
              {error && (
                <div className="ds-alert ds-alert-danger" style={{ marginTop: ".75rem", marginBottom: 0 }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <button type="submit" className="ds-btn ds-btn-primary" disabled={loading}
                style={{ width: "100%", justifyContent: "center", marginTop: "1.25rem", gap: 8 }}>
                {loading ? t("جارٍ البحث...") : <><Search size={18} /> {t("بحث عن الحجز")}</>}
              </button>
            </form>
          </div>

          {/* Booking Details */}
          {booking && (
            <div className="pub-booking-detail-card" ref={bookingRef}>
              {/* Status header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-heading)", margin: 0 }}>
                    {t("حجز رقم:")} <span style={{ color: "var(--color-primary)" }}>{booking.public_booking_no}</span>
                  </h2>
                </div>
                {statusInfo && <span className={statusInfo.badge}>{t(statusInfo.label)}</span>}
              </div>

              {cancelSuccess && (
                <div className="ds-alert ds-alert-success" style={{ marginBottom: "1rem" }}>
                  <CheckCircle size={16} /> {t("تم إلغاء الحجز بنجاح")}
                </div>
              )}

              {/* Details rows */}
              <div className="pub-detail-row">
                <span className="pub-detail-label"><User size={14} style={{ display: "inline", marginLeft: 4 }} />{t("الضيف")}</span>
                <span className="pub-detail-value">{booking.guest_first_name} {booking.guest_last_name}</span>
              </div>
              <div className="pub-detail-row">
                <span className="pub-detail-label"><Phone size={14} style={{ display: "inline", marginLeft: 4 }} />{t("الهاتف")}</span>
                <span className="pub-detail-value">{booking.guest_phone}</span>
              </div>
              <div className="pub-detail-row">
                <span className="pub-detail-label"><Building2 size={14} style={{ display: "inline", marginLeft: 4 }} />{t("الفندق")}</span>
                <span className="pub-detail-value">{booking.hotel_name}{booking.hotel_city ? ` — ${booking.hotel_city}` : ""}</span>
              </div>
              {booking.hotel_phone && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label"><Phone size={14} style={{ display: "inline", marginLeft: 4 }} />{t("هاتف الفندق")}</span>
                  <span className="pub-detail-value">{booking.hotel_phone}</span>
                </div>
              )}
              <div className="pub-detail-row">
                <span className="pub-detail-label">{t("نوع الغرفة")}</span>
                <span className="pub-detail-value">{booking.room_type_label}</span>
              </div>
              <div className="pub-detail-row">
                <span className="pub-detail-label"><Calendar size={14} style={{ display: "inline", marginLeft: 4 }} />{t("الوصول")}</span>
                <span className="pub-detail-value">{formatDate(booking.check_in_date, locale)}</span>
              </div>
              <div className="pub-detail-row">
                <span className="pub-detail-label"><Calendar size={14} style={{ display: "inline", marginLeft: 4 }} />{t("المغادرة")}</span>
                <span className="pub-detail-value">{formatDate(booking.check_out_date, locale)}</span>
              </div>
              <div className="pub-detail-row">
                <span className="pub-detail-label">{t("المدة")}</span>
                <span className="pub-detail-value">{booking.nights_count} {booking.nights_count === 1 ? t("ليلة") : t("ليالٍ")}</span>
              </div>
              <div className="pub-detail-row">
                <span className="pub-detail-label">{t("عدد الضيوف")}</span>
                <span className="pub-detail-value">{booking.persons_count}</span>
              </div>
              <div className="pub-detail-row">
                <span className="pub-detail-label">{t("الإجمالي")}</span>
                <span className="pub-detail-value" style={{ color: "var(--color-primary)", fontSize: "var(--text-lg)" }}>
                  {parseFloat(booking.total).toLocaleString(locale)} {booking.currency}
                </span>
              </div>
              <div className="pub-detail-row">
                <span className="pub-detail-label">{t("طريقة الدفع")}</span>
                <span className="pub-detail-value">{t("الدفع عند الوصول")}</span>
              </div>

              {booking.status === "cancelled" && (
                <div style={{ marginTop: "1rem" }}>
                  <div className="ds-alert ds-alert-danger">
                    <XCircle size={16} />
                    <span>
                      {booking.cancelled_by_type === "guest" ? t("تم الإلغاء من قِبَلك") : t("تم الإلغاء من قِبَل الفندق")}
                      {booking.cancel_reason ? ` — ${booking.cancel_reason}` : ""}
                    </span>
                  </div>
                </div>
              )}

              {/* Cancellation policy */}
              {booking.cancellation_policy && (
                <div className="pub-policy-block" style={{ marginTop: "1rem" }}>
                  <h4>{t("سياسة الإلغاء")}</h4>
                  <p>{booking.cancellation_policy}</p>
                </div>
              )}

              {/* Cancel button */}
              {canCancel && !cancelSuccess && (
                <div style={{ marginTop: "1.5rem" }}>
                  {!showCancel ? (
                    <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={() => setShowCancel(true)}>
                      <XCircle size={16} /> {t("إلغاء الحجز")}
                    </button>
                  ) : (
                    <div style={{ background: "var(--color-danger-soft)", borderRadius: 12, padding: "1.25rem",
                      border: "1.5px solid var(--color-danger)" }}>
                      <h4 style={{ fontWeight: 700, color: "var(--color-heading)", marginBottom: ".75rem", fontSize: "var(--text-md)" }}>
                        {t("تأكيد إلغاء الحجز")}
                      </h4>
                      <form onSubmit={submitCancel}>
                        <div style={{ marginBottom: ".75rem" }}>
                          <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600,
                            color: "var(--color-heading)", marginBottom: ".35rem" }}>
                            {t("سبب الإلغاء (اختياري)")}
                          </label>
                          <textarea rows={2}
                            style={{ width: "100%", padding: ".6rem .9rem", border: "1.5px solid var(--color-border)",
                              borderRadius: 8, fontSize: "var(--text-sm)", fontFamily: "var(--font-main)",
                              outline: "none", boxSizing: "border-box", resize: "vertical" }}
                            placeholder={t("سبب الإلغاء...")}
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)} />
                        </div>
                        {cancelError && (
                          <div className="ds-alert ds-alert-danger" style={{ marginBottom: ".75rem" }}>{cancelError}</div>
                        )}
                        <div style={{ display: "flex", gap: ".75rem" }}>
                          <button type="submit" className="ds-btn ds-btn-danger ds-btn-sm" disabled={cancelLoading}>
                            {cancelLoading ? t("جارٍ الإلغاء...") : t("تأكيد الإلغاء")}
                          </button>
                          <button type="button" className="ds-btn ds-btn-neutral ds-btn-sm"
                            onClick={() => setShowCancel(false)}>
                            {t("تراجع")}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Share + Copy */}
              <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)",
                display: "flex", gap: ".75rem", flexWrap: "wrap", justifyContent: "center" }}>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(buildSummary(booking))}`}
                  target="_blank" rel="noopener noreferrer"
                  className="ds-btn ds-btn-success ds-btn-sm" style={{ gap: 6 }}>
                  <MessageCircle size={15} /> {t("مشاركة عبر واتساب")}
                </a>
                <button onClick={() => copyDetails(booking)} className="ds-btn ds-btn-neutral ds-btn-sm" style={{ gap: 6 }}>
                  {copied ? <><Check size={15} /> {t("تم النسخ")}</> : <><Copy size={15} /> {t("نسخ التفاصيل")}</>}
                </button>
                <Link href="/hotels" className="ds-btn ds-btn-primary ds-btn-sm">
                  {t("البحث عن فندق آخر")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="pub-footer">
        <div className="pub-container">
          <p>© funduqii — {t("منصة فندقي للحجز الفندقي")}</p>
        </div>
      </footer>
    </div>
  );
}
