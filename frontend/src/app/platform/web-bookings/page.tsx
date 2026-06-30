"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Download, Monitor, FileBarChart, SlidersHorizontal } from "lucide-react";
import { apiUrl, getAuthHeaders } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────
interface WebBooking {
  id: number;
  public_booking_no: string;
  hotel_id: number;
  hotel_name: string;
  hotel_city: string;
  guest_name: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  room_type_label: string;
  total: string | number;
  currency: string;
  status: string;
  arrival_status: string;
  payment_method: string;
  commission_status: string;
  commission_amount: string | number;
  commission_currency: string;
  created_at: string;
}

interface Summary {
  total: number;
  awaiting: number;
  checked_in: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

interface Filters {
  cities: string[];
  currencies: string[];
  hotels: { id: number; name: string }[];
}

interface WebBookingsData {
  bookings: WebBooking[];
  summary: Summary;
  filters: Filters;
}

// ─── Labels ─────────────────────────────────────────────────────────────────
const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending:     { label: "قيد الانتظار", cls: "ds-badge ds-badge-neutral" },
  confirmed:   { label: "مؤكد",         cls: "ds-badge ds-badge-info" },
  checked_in:  { label: "تم الدخول",    cls: "ds-badge ds-badge-success" },
  checked_out: { label: "تم الخروج",    cls: "ds-badge ds-badge-neutral" },
  cancelled:   { label: "ملغى",         cls: "ds-badge ds-badge-danger" },
  no_show:     { label: "لم يحضر",      cls: "ds-badge ds-badge-warning" },
};

const COMMISSION_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "قيد الانتظار", cls: "ds-badge ds-badge-neutral" },
  due:       { label: "مستحقة",       cls: "ds-badge ds-badge-warning" },
  paid:      { label: "مدفوعة",       cls: "ds-badge ds-badge-success" },
  partial:   { label: "جزئية",        cls: "ds-badge ds-badge-info" },
  waived:    { label: "معفاة",        cls: "ds-badge ds-badge-neutral" },
  cancelled: { label: "ملغاة",        cls: "ds-badge ds-badge-danger" },
};

const PERIODS: { key: string; label: string }[] = [
  { key: "",       label: "كل الفترات" },
  { key: "today",  label: "اليوم" },
  { key: "week",   label: "هذا الأسبوع" },
  { key: "month",  label: "هذا الشهر" },
  { key: "year",   label: "هذا العام" },
  { key: "custom", label: "فترة مخصصة" },
];

const ARRIVAL_STATUS: { key: string; label: string }[] = [
  { key: "",                   label: "الكل" },
  { key: "awaiting_arrival",   label: "بانتظار الوصول" },
  { key: "checked_in_w",       label: "تم الدخول" },
  { key: "completed_w",        label: "مكتمل" },
  { key: "cancelled_by_guest", label: "ملغى من الزبون" },
  { key: "cancelled_by_hotel", label: "ملغى من الفندق" },
  { key: "no_show_w",          label: "لم يحضر" },
];

const COMMISSION_FILTER: { key: string; label: string }[] = [
  { key: "",          label: "الكل" },
  { key: "pending",   label: "قيد الانتظار" },
  { key: "due",       label: "مستحقة" },
  { key: "paid",      label: "مدفوعة" },
  { key: "partial",   label: "جزئية" },
  { key: "waived",    label: "معفاة" },
  { key: "cancelled", label: "ملغاة" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const money = (n: string | number) =>
  Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

function formatDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export default function PlatformWebBookingsPage() {
  const [data, setData]       = useState<WebBookingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // filters
  const [period, setPeriod]                 = useState("");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");
  const [hotel, setHotel]                   = useState("");
  const [city, setCity]                     = useState("");
  const [currency, setCurrency]             = useState("");
  const [arrivalStatus, setArrivalStatus]   = useState("");
  const [commissionStatus, setCommission]   = useState("");

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (period) p.set("period", period);
    if (period === "custom") {
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo) p.set("date_to", dateTo);
    }
    if (hotel) p.set("hotel", hotel);
    if (city) p.set("city", city);
    if (currency) p.set("currency", currency);
    if (arrivalStatus) p.set("status", arrivalStatus);
    if (commissionStatus) p.set("commission_status", commissionStatus);
    return p.toString();
  }, [period, dateFrom, dateTo, hotel, city, currency, arrivalStatus, commissionStatus]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(apiUrl(`/platform/web-bookings/?${buildQuery()}`), { headers: getAuthHeaders() })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: WebBookingsData) => { setData(d); setLoading(false); })
      .catch(() => { setError("تعذّر تحميل حجوزات الموقع"); setLoading(false); });
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const rows = data?.bookings ?? [];
    const headers = [
      "رقم الحجز", "الفندق", "المدينة", "الزبون", "الهاتف", "الدخول", "الخروج",
      "نوع الغرفة", "القيمة", "العملة", "حالة الحجز", "العمولة", "عملة العمولة",
      "حالة العمولة", "التاريخ",
    ];
    const escape = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map(b => [
      b.public_booking_no,
      b.hotel_name,
      b.hotel_city,
      b.guest_name,
      b.guest_phone,
      b.check_in_date,
      b.check_out_date,
      b.room_type_label,
      money(b.total),
      b.currency,
      BOOKING_STATUS[b.status]?.label ?? b.status,
      money(b.commission_amount),
      b.commission_currency,
      COMMISSION_STATUS[b.commission_status]?.label ?? b.commission_status,
      formatDate(b.created_at),
    ].map(escape).join(","));
    const csv = "﻿" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `web-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summary = data?.summary;
  const filters = data?.filters;
  const bookings = data?.bookings ?? [];

  return (
    <div className="ds-page" dir="rtl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>حجوزات الموقع</h1>
          <p>كل الحجوزات الواردة من الموقع العام عبر جميع الفنادق</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> تحديث
          </button>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={exportCsv} disabled={!bookings.length}>
            <Download size={15} /> تصدير CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="pf-grid-3">
        <div className="ds-summary-card">
          <p className="ds-summary-label">إجمالي الحجوزات</p>
          <div className="ds-summary-value">{summary?.total ?? 0}</div>
          <p className="ds-summary-note">كل حجوزات الموقع</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">بانتظار الوصول</p>
          <div className="ds-summary-value text-warning">{summary?.awaiting ?? 0}</div>
          <p className="ds-summary-note">حجوزات لم تصل بعد</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">تم الدخول</p>
          <div className="ds-summary-value text-success">{summary?.checked_in ?? 0}</div>
          <p className="ds-summary-note">ضيوف سجّلوا الدخول</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">مكتملة</p>
          <div className="ds-summary-value text-success">{summary?.completed ?? 0}</div>
          <p className="ds-summary-note">حجوزات منتهية</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">ملغاة</p>
          <div className="ds-summary-value text-danger">{summary?.cancelled ?? 0}</div>
          <p className="ds-summary-note">حجوزات ملغاة</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">لم يحضر</p>
          <div className="ds-summary-value text-warning">{summary?.no_show ?? 0}</div>
          <p className="ds-summary-note">ضيوف لم يحضروا</p>
        </div>
      </div>

      {/* Filters — single bar */}
      <div className="pf-filter-bar">
        <span className="pf-filter-bar-icon"><SlidersHorizontal size={16} /></span>
        <select className="select" value={period} onChange={e => setPeriod(e.target.value)}>
          {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        {period === "custom" && (
          <>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </>
        )}
        <select className="select" value={hotel} onChange={e => setHotel(e.target.value)}>
          <option value="">كل الفنادق</option>
          {(filters?.hotels ?? []).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select className="select" value={city} onChange={e => setCity(e.target.value)}>
          <option value="">كل المدن</option>
          {(filters?.cities ?? []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
          <option value="">كل العملات</option>
          {(filters?.currencies ?? []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={arrivalStatus} onChange={e => setArrivalStatus(e.target.value)}>
          {ARRIVAL_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="select" value={commissionStatus} onChange={e => setCommission(e.target.value)}>
          {COMMISSION_FILTER.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Body */}
      {error ? (
        <div className="ds-alert ds-alert-danger">{error}</div>
      ) : loading ? (
        <p className="text-muted">جارٍ التحميل...</p>
      ) : bookings.length === 0 ? (
        <div className="ds-empty-state">
          <Monitor size={48} className="ds-empty-icon" />
          <h3>لا توجد حجوزات مطابقة</h3>
          <p>لم يتم العثور على حجوزات موقع تطابق الفلاتر المحددة.</p>
        </div>
      ) : (
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>رقم الحجز</th>
                <th>الفندق</th>
                <th>المدينة</th>
                <th>الزبون</th>
                <th>الهاتف</th>
                <th>الدخول</th>
                <th>الخروج</th>
                <th>نوع الغرفة</th>
                <th>القيمة</th>
                <th>حالة الحجز</th>
                <th>العمولة</th>
                <th>حالة العمولة</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const bs = BOOKING_STATUS[b.status] ?? { label: b.status, cls: "ds-badge ds-badge-neutral" };
                const cs = COMMISSION_STATUS[b.commission_status] ?? { label: b.commission_status, cls: "ds-badge ds-badge-neutral" };
                return (
                  <tr key={b.id}>
                    <td>{b.public_booking_no}</td>
                    <td>{b.hotel_name}</td>
                    <td>{b.hotel_city || "—"}</td>
                    <td>{b.guest_name}</td>
                    <td>{b.guest_phone || "—"}</td>
                    <td>{formatDate(b.check_in_date)}</td>
                    <td>{formatDate(b.check_out_date)}</td>
                    <td>{b.room_type_label || "—"}</td>
                    <td>{money(b.total)} {b.currency}</td>
                    <td><span className={bs.cls}>{bs.label}</span></td>
                    <td>
                      {b.commission_amount != null && Number(b.commission_amount) > 0
                        ? <>{money(b.commission_amount)} {b.commission_currency}</>
                        : "—"}
                    </td>
                    <td><span className={cs.cls}>{cs.label}</span></td>
                    <td>{formatDate(b.created_at)}</td>
                    <td>
                      <Link href={`/platform/earnings/${b.hotel_id}`} className="ds-btn ds-btn-neutral ds-btn-xs">
                        <FileBarChart size={13} /> تقرير الفندق
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
