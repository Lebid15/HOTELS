"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Calendar, Building2, Phone, User, Printer, MessageCircle, Copy, Check } from "lucide-react";

function BookingSuccessInner() {
  const sp = useSearchParams();

  const bookingNo = sp.get("no")       ?? "";
  const guestName = sp.get("name")     ?? "";
  const hotelName = sp.get("hotel")    ?? "";
  const hotelCity = sp.get("city")     ?? "";
  const checkIn   = sp.get("check_in") ?? "";
  const checkOut  = sp.get("check_out")?? "";
  const nights    = sp.get("nights")   ?? "";
  const roomType  = sp.get("room")     ?? "";
  const total     = sp.get("total")    ?? "";
  const currency  = sp.get("currency") ?? "";
  const phone     = sp.get("phone")    ?? "";

  const [copied, setCopied] = useState(false);

  function formatDate(d: string) {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("ar-SY", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  }

  // نص ملخّص الحجز — يُستخدم لمشاركة واتساب والنسخ
  const summaryText =
`تفاصيل حجزي 🏨
رقم الحجز: ${bookingNo}
الفندق: ${hotelName}${hotelCity ? ` — ${hotelCity}` : ""}
نوع الغرفة: ${roomType}
الوصول: ${checkIn}
المغادرة: ${checkOut}
عدد الليالي: ${nights}
الإجمالي: ${total ? `${parseFloat(total).toLocaleString("ar")} ${currency}` : ""}
طريقة الدفع: الدفع عند الوصول`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;

  function copyDetails() {
    navigator.clipboard?.writeText(summaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="pub-shell">
      {/* Header */}
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href="/" className="pub-logo">funduqii</Link>
          <nav>
            <ul className="pub-nav-links">
              <li><Link href="/" className="pub-nav-link">الرئيسية</Link></li>
              <li><Link href="/hotels" className="pub-nav-link">الفنادق</Link></li>
              <li><Link href="/manage-booking" className="pub-nav-link">إدارة حجزي</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, padding: "2rem 1.5rem" }}>
        <div className="pub-container">
          <div className="pub-success-card">
            {/* Success icon */}
            <div className="pub-success-icon">
              <CheckCircle size={38} strokeWidth={1.8} />
            </div>

            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-heading)", marginBottom: ".5rem" }}>
              تم تأكيد حجزك بنجاح!
            </h1>
            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginBottom: "1rem" }}>
              احتفظ برقم الحجز التالي — ستحتاجه عند الوصول للفندق
            </p>

            {/* Booking number */}
            <div className="pub-booking-no-box">{bookingNo || "—"}</div>

            {/* Details table */}
            <div style={{ textAlign: "right", marginBottom: "1.5rem" }}>
              {guestName && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label"><User size={14} style={{ display: "inline", marginLeft: 4 }} />الضيف</span>
                  <span className="pub-detail-value">{guestName}</span>
                </div>
              )}
              {phone && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label"><Phone size={14} style={{ display: "inline", marginLeft: 4 }} />الهاتف</span>
                  <span className="pub-detail-value">{phone}</span>
                </div>
              )}
              {hotelName && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label"><Building2 size={14} style={{ display: "inline", marginLeft: 4 }} />الفندق</span>
                  <span className="pub-detail-value">{hotelName}{hotelCity ? ` — ${hotelCity}` : ""}</span>
                </div>
              )}
              {roomType && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label">نوع الغرفة</span>
                  <span className="pub-detail-value">{roomType}</span>
                </div>
              )}
              {checkIn && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label"><Calendar size={14} style={{ display: "inline", marginLeft: 4 }} />تاريخ الوصول</span>
                  <span className="pub-detail-value">{formatDate(checkIn)}</span>
                </div>
              )}
              {checkOut && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label"><Calendar size={14} style={{ display: "inline", marginLeft: 4 }} />تاريخ المغادرة</span>
                  <span className="pub-detail-value">{formatDate(checkOut)}</span>
                </div>
              )}
              {nights && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label">مدة الإقامة</span>
                  <span className="pub-detail-value">{nights} {parseInt(nights) === 1 ? "ليلة" : "ليالٍ"}</span>
                </div>
              )}
              {total && (
                <div className="pub-detail-row" style={{ background: "var(--color-success-soft)", borderRadius: 8, padding: ".75rem", border: "none" }}>
                  <span className="pub-detail-label" style={{ fontWeight: 700, color: "var(--color-heading)" }}>الإجمالي</span>
                  <span className="pub-detail-value" style={{ color: "var(--color-success)", fontSize: "var(--text-lg)" }}>
                    {parseFloat(total).toLocaleString("ar")} {currency}
                  </span>
                </div>
              )}
            </div>

            {/* Pay at hotel notice */}
            <div className="ds-alert ds-alert-info" style={{ marginBottom: "1.5rem" }}>
              <strong>الدفع عند الوصول</strong> — سيتم تحصيل المبلغ عند وصولك للفندق. لا يُشترط أي دفع مسبق.
            </div>

            {/* Share + Copy */}
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "1rem" }}>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="ds-btn ds-btn-success" style={{ gap: 6 }}>
                <MessageCircle size={16} /> مشاركة عبر واتساب
              </a>
              <button onClick={copyDetails} className="ds-btn ds-btn-neutral" style={{ gap: 6 }}>
                {copied ? <><Check size={16} /> تم النسخ</> : <><Copy size={16} /> نسخ التفاصيل</>}
              </button>
              <button onClick={() => window.print()}
                className="ds-btn ds-btn-neutral" style={{ gap: 6 }}>
                <Printer size={16} /> طباعة
              </button>
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <Link href="/manage-booking" className="ds-btn ds-btn-primary" style={{ gap: 6 }}>
                إدارة حجزي
              </Link>
              <Link href="/hotels" className="ds-btn ds-btn-neutral">
                البحث عن فندق آخر
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="pub-footer">
        <div className="pub-container">
          <p>© funduqii — منصة فندقي للحجز الفندقي</p>
        </div>
      </footer>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", fontFamily: "var(--font-main)" }}>
        <p style={{ color: "var(--color-muted)" }}>جارٍ التحميل...</p>
      </div>
    }>
      <BookingSuccessInner />
    </Suspense>
  );
}
