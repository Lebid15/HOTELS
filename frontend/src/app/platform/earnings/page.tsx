"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Building2, BadgeCheck, CircleDollarSign, CalendarCheck,
  Users, HandCoins, Percent, FileBarChart, Settings as SettingsIcon,
  Printer, RefreshCw, X, CircleCheck, AlertCircle,
} from "lucide-react";
import { apiUrl, getAuthJsonHeaders } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────
type Money = Record<string, number>;

interface RevenueSettings {
  enable_booking_commission: boolean;
  default_commission_type: string;
  default_commission_value: number;
  default_commission_currency: string;
  calculate_commission_on_status: string;
  allow_hotel_override: boolean;
  no_show_policy: string;
}

interface HotelRow {
  hotel_id: number; hotel_name: string; city: string; governorate: string; status: string;
  package_name: string | null; subscription_status: string | null;
  subscription_amount: number; subscription_currency: string | null;
  web_bookings_count: number; completed_count: number; cancelled_count: number; no_show_count: number;
  booking_value_by_currency: Money; commission_enabled: boolean;
  commission_type: string; commission_value: number; commission_currency: string; commission_source: string;
  profit_by_currency: Money; commission_status_breakdown: Record<string, number>;
  last_booking_at: string | null;
}

interface EarningsData {
  kpis: { hotels_total: number; hotels_active: number; subscriptions_sold: number; web_bookings_count: number; customers_count: number; };
  subscriptions: {
    sold: number; active: number; expired: number; unpaid: number; trial: number;
    earnings_by_currency: Money; unpaid_by_currency: Money;
    best_selling_package: string | null; top_paying_hotel: string | null;
  };
  web_bookings: {
    count: number; customers: number; completed: number; cancelled: number; no_show: number;
    earnings_by_currency: Money; pending_by_currency: Money; paid_by_currency: Money;
    commission_status_counts: Record<string, number>; hotels_with_bookings: number;
  };
  total_by_currency: Money;
  subscription_earnings_by_currency: Money;
  booking_earnings_by_currency: Money;
  hotels: HotelRow[];
  filters: { period: string; currencies: string[]; governorates: string[]; };
  revenue_settings: RevenueSettings;
}

// ─── Labels ─────────────────────────────────────────────────────────────────
const COMMISSION_TYPE_LABEL: Record<string, string> = {
  percentage: "نسبة مئوية", fixed_per_booking: "مبلغ / حجز", fixed_per_guest: "مبلغ / زبون", "": "—",
};
const COMM_STATUS: Record<string, { label: string; cls: string; bg: string; fg: string }> = {
  pending:   { label: "قيد الانتظار", cls: "neutral", bg: "var(--color-border)",        fg: "var(--color-muted)" },
  due:       { label: "مستحقة",       cls: "warning", bg: "var(--color-warning-soft)",  fg: "var(--color-warning)" },
  paid:      { label: "مدفوعة",       cls: "success", bg: "var(--color-success-soft)",  fg: "var(--color-success)" },
  partial:   { label: "جزئية",        cls: "info",    bg: "var(--color-primary-soft)",  fg: "var(--color-primary)" },
  waived:    { label: "معفاة",        cls: "neutral", bg: "var(--color-border)",        fg: "var(--color-muted)" },
  cancelled: { label: "ملغاة",        cls: "danger",  bg: "var(--color-danger-soft)",   fg: "var(--color-danger)" },
};
const TRIGGER_LABEL: Record<string, string> = {
  on_booking_created: "عند إنشاء الحجز", on_guest_arrived: "عند وصول الزبون",
  on_check_in: "عند تسجيل الدخول", on_completed: "عند اكتمال الحجز",
};
const HOTEL_STATUS_LABEL: Record<string, string> = { active: "فعال", suspended: "موقوف", archived: "مؤرشف" };

// ─── Helpers ────────────────────────────────────────────────────────────────
const nf = (n: number) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

function MoneyLines({ map, empty = "—" }: { map: Money; empty?: string }) {
  const entries = Object.entries(map || {}).filter(([, v]) => v != null);
  if (!entries.length) return <span style={{ color: "var(--color-muted)" }}>{empty}</span>;
  return (
    <>
      {entries.map(([cur, val]) => (
        <span key={cur} className="earn-money-line"
          style={{ fontSize: entries.length > 1 ? "var(--text-xl)" : undefined }}>
          {nf(val)} <span className="earn-money-cur">{cur}</span>
        </span>
      ))}
    </>
  );
}

function StatusBadges({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown || {}).filter(([, c]) => c > 0);
  if (!entries.length) return <span style={{ color: "var(--color-muted)", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {entries.map(([st, c]) => {
        const s = COMM_STATUS[st] ?? { label: st, bg: "var(--color-border)", fg: "var(--color-muted)" };
        return <span key={st} className="earn-mini-badge" style={{ background: s.bg, color: s.fg }}>{s.label} {c}</span>;
      })}
    </div>
  );
}

const PERIODS = [
  { key: "all", label: "الكل" }, { key: "today", label: "اليوم" },
  { key: "week", label: "هذا الأسبوع" }, { key: "month", label: "هذا الشهر" },
  { key: "year", label: "هذا العام" }, { key: "custom", label: "فترة مخصصة" },
];

export default function EarningsPage() {
  const [data, setData]       = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [toast, setToast]     = useState("");

  // filters
  const [period, setPeriod]           = useState("all");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [hotelFilter, setHotelFilter] = useState("");
  const [govFilter, setGovFilter]     = useState("");
  const [currencyFilter, setCurrency] = useState("");
  const [profitType, setProfitType]   = useState<"all" | "subscriptions" | "web_bookings">("all");

  // settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<RevenueSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (period !== "all") p.set("period", period);
    if (period === "custom") { if (dateFrom) p.set("date_from", dateFrom); if (dateTo) p.set("date_to", dateTo); }
    if (hotelFilter) p.set("hotel", hotelFilter);
    if (govFilter) p.set("governorate", govFilter);
    if (currencyFilter) p.set("currency", currencyFilter);
    return p.toString();
  }, [period, dateFrom, dateTo, hotelFilter, govFilter, currencyFilter]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(apiUrl(`/platform/earnings/?${buildQuery()}`), { headers: getAuthJsonHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: EarningsData) => { setData(d); setSettings(d.revenue_settings); setLoading(false); })
      .catch(() => { setError("تعذّر تحميل تقرير الأرباح"); setLoading(false); });
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  function saveSettings() {
    if (!settings) return;
    setSavingSettings(true);
    fetch(apiUrl("/platform/revenue-settings/"), {
      method: "PUT", headers: getAuthJsonHeaders(), body: JSON.stringify(settings),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => { setSavingSettings(false); setShowSettings(false); showToast("تم حفظ الإعدادات"); load(); })
      .catch(() => { setSavingSettings(false); showToast("فشل حفظ الإعدادات"); });
  }

  const showSubs = profitType === "all" || profitType === "subscriptions";
  const showWeb  = profitType === "all" || profitType === "web_bookings";

  if (loading && !data) {
    return <div className="ds-page" dir="rtl"><div className="ds-card-p"><p className="text-muted">جارٍ تحميل تقرير الأرباح...</p></div></div>;
  }
  if (error || !data) {
    return <div className="ds-page" dir="rtl"><div className="ds-card-p"><div className="ds-alert ds-alert-danger">{error || "خطأ"}</div></div></div>;
  }

  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? "الكل";

  return (
    <div className="ds-page" dir="rtl">
      {toast && (
        <div className="ds-toast-stack">
          <div className="ds-toast ds-toast-success"><span>{toast}</span></div>
        </div>
      )}

      {/* Print-only header */}
      <div className="print-only" style={{ marginBottom: "1rem", textAlign: "center" }}>
        <h2 style={{ fontWeight: 800, fontSize: 22 }}>تقرير أرباح المنصة</h2>
        <p style={{ color: "#555" }}>الفترة: {periodLabel} · تاريخ الإنشاء: {new Date().toLocaleDateString("ar-SY")}</p>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}><TrendingUp size={24} /> أرباحي</h1>
          <p>مركز متابعة دخل المنصة من الاشتراكات وحجوزات الموقع</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={load} disabled={loading} style={{ gap: 6 }}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> تحديث
          </button>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => window.print()} style={{ gap: 6 }}>
            <Printer size={15} /> طباعة
          </button>
          <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={() => setShowSettings(true)} style={{ gap: 6 }}>
            <SettingsIcon size={15} /> إعدادات العمولة
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="ds-filters no-print" style={{ marginBottom: "1.25rem" }}>
        <select className="select" value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 150 }}>
          {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        {period === "custom" && (
          <>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
          </>
        )}
        <select className="select" value={hotelFilter} onChange={e => setHotelFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">كل الفنادق</option>
          {data.hotels.map(h => <option key={h.hotel_id} value={h.hotel_id}>{h.hotel_name}</option>)}
        </select>
        <select className="select" value={govFilter} onChange={e => setGovFilter(e.target.value)} style={{ width: 150 }}>
          <option value="">كل المحافظات</option>
          {data.filters.governorates.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="select" value={currencyFilter} onChange={e => setCurrency(e.target.value)} style={{ width: 120 }}>
          <option value="">كل العملات</option>
          {data.filters.currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ds-tabs" style={{ marginRight: "auto" }}>
          {([["all", "الكل"], ["subscriptions", "اشتراكات"], ["web_bookings", "حجوزات الموقع"]] as const).map(([k, l]) => (
            <button key={k} className={`ds-tab-btn${profitType === k ? " active" : ""}`} onClick={() => setProfitType(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Summary cards — 3 per row */}
      <div className="earn-cards">
        <div className="ds-summary-card">
          <p className="ds-summary-label"><Building2 size={14} style={{ display: "inline", marginLeft: 4 }} />إجمالي الفنادق</p>
          <div className="ds-summary-value">{data.kpis.hotels_total}</div>
          <p className="ds-summary-note">كل الفنادق المسجّلة</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label"><Building2 size={14} style={{ display: "inline", marginLeft: 4 }} />الفنادق النشطة</p>
          <div className="ds-summary-value text-success">{data.kpis.hotels_active}</div>
          <p className="ds-summary-note">فنادق فعّالة</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label"><BadgeCheck size={14} style={{ display: "inline", marginLeft: 4 }} />الاشتراكات المباعة</p>
          <div className="ds-summary-value">{data.kpis.subscriptions_sold}</div>
          <p className="ds-summary-note">اشتراكات مدفوعة</p>
        </div>

        {showSubs && (
          <div className="ds-summary-card">
            <p className="ds-summary-label"><CircleDollarSign size={14} style={{ display: "inline", marginLeft: 4 }} />أرباح الاشتراكات</p>
            <div className="ds-summary-value text-success"><MoneyLines map={data.subscription_earnings_by_currency} empty="0" /></div>
            <p className="ds-summary-note">من الاشتراكات المدفوعة</p>
          </div>
        )}
        {showWeb && (
          <div className="ds-summary-card">
            <p className="ds-summary-label"><CalendarCheck size={14} style={{ display: "inline", marginLeft: 4 }} />حجوزات الموقع</p>
            <div className="ds-summary-value">{data.web_bookings.count}</div>
            <p className="ds-summary-note">حجوزات من الموقع العام</p>
          </div>
        )}
        {showWeb && (
          <div className="ds-summary-card">
            <p className="ds-summary-label"><Users size={14} style={{ display: "inline", marginLeft: 4 }} />زبائن حجزوا عبر موقعنا</p>
            <div className="ds-summary-value text-primary">{data.web_bookings.customers}</div>
            <p className="ds-summary-note">زبائن فريدون (حسب الهاتف)</p>
          </div>
        )}
        {showWeb && (
          <div className="ds-summary-card">
            <p className="ds-summary-label"><HandCoins size={14} style={{ display: "inline", marginLeft: 4 }} />أرباح حجوزات الموقع</p>
            <div className="ds-summary-value text-success"><MoneyLines map={data.booking_earnings_by_currency} empty="0" /></div>
            <p className="ds-summary-note">عمولات مستحقة + مدفوعة</p>
          </div>
        )}
        <div className="ds-summary-card" style={{ borderColor: "var(--color-primary)", borderWidth: 2 }}>
          <p className="ds-summary-label"><TrendingUp size={14} style={{ display: "inline", marginLeft: 4 }} />إجمالي أرباح المنصة</p>
          <div className="ds-summary-value text-primary"><MoneyLines map={data.total_by_currency} empty="0" /></div>
          <p className="ds-summary-note">اشتراكات + حجوزات الموقع</p>
        </div>
      </div>

      {/* Subscriptions detail */}
      {showSubs && (
        <>
          <h2 className="earn-section-title"><CircleDollarSign size={18} /> أرباح الاشتراكات</h2>
          <div className="ds-card ds-card-p" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem" }}>
            <Stat label="مباعة" value={data.subscriptions.sold} />
            <Stat label="نشطة" value={data.subscriptions.active} color="text-success" />
            <Stat label="منتهية" value={data.subscriptions.expired} color="text-danger" />
            <Stat label="غير مدفوعة" value={data.subscriptions.unpaid} color="text-warning" />
            <Stat label="تجريبية" value={data.subscriptions.trial} />
            <div>
              <p className="ds-summary-label">غير المحصّل</p>
              <div style={{ fontWeight: 800, fontSize: "var(--text-lg)" }}><MoneyLines map={data.subscriptions.unpaid_by_currency} empty="0" /></div>
            </div>
            <div>
              <p className="ds-summary-label">أفضل باقة مبيعًا</p>
              <div style={{ fontWeight: 700 }}>{data.subscriptions.best_selling_package ?? "—"}</div>
            </div>
            <div>
              <p className="ds-summary-label">أكثر فندق دفعًا</p>
              <div style={{ fontWeight: 700 }}>{data.subscriptions.top_paying_hotel ?? "—"}</div>
            </div>
          </div>
        </>
      )}

      {/* Web bookings detail */}
      {showWeb && (
        <>
          <h2 className="earn-section-title"><CalendarCheck size={18} /> أرباح حجوزات الموقع</h2>
          <div className="ds-card ds-card-p" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
            <Stat label="إجمالي الحجوزات" value={data.web_bookings.count} />
            <Stat label="مكتملة" value={data.web_bookings.completed} color="text-success" />
            <Stat label="ملغاة" value={data.web_bookings.cancelled} color="text-danger" />
            <Stat label="لم يحضر" value={data.web_bookings.no_show} color="text-warning" />
            <Stat label="فنادق لها حجوزات" value={data.web_bookings.hotels_with_bookings} />
            <div>
              <p className="ds-summary-label"><CircleCheck size={12} style={{ display: "inline", marginLeft: 3 }} />عمولات مدفوعة</p>
              <div style={{ fontWeight: 800, fontSize: "var(--text-lg)" }} className="text-success"><MoneyLines map={data.web_bookings.paid_by_currency} empty="0" /></div>
            </div>
            <div>
              <p className="ds-summary-label"><AlertCircle size={12} style={{ display: "inline", marginLeft: 3 }} />عمولات قيد الانتظار</p>
              <div style={{ fontWeight: 800, fontSize: "var(--text-lg)" }} className="text-muted"><MoneyLines map={data.web_bookings.pending_by_currency} empty="0" /></div>
            </div>
          </div>
        </>
      )}

      {/* Hotels report table */}
      <h2 className="earn-section-title"><FileBarChart size={18} /> تقرير أرباح الفنادق</h2>
      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead>
            <tr>
              <th>الفندق</th>
              <th>الموقع</th>
              <th>الحالة</th>
              <th>الباقة</th>
              <th>الاشتراك</th>
              <th>حجوزات الموقع</th>
              <th>مكتملة</th>
              <th>ملغاة</th>
              <th>لم يحضر</th>
              <th>قيمة الحجوزات</th>
              <th>العمولة</th>
              <th>ربح المنصة</th>
              <th>حالة التحصيل</th>
              <th>آخر حجز</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.hotels.map(h => (
              <tr key={h.hotel_id}>
                <td style={{ fontWeight: 700, color: "var(--color-heading)" }}>{h.hotel_name}</td>
                <td style={{ fontSize: 13 }}>{[h.city, h.governorate].filter(Boolean).join("، ") || "—"}</td>
                <td><span className="earn-mini-badge" style={{ background: h.status === "active" ? "var(--color-success-soft)" : "var(--color-border)", color: h.status === "active" ? "var(--color-success)" : "var(--color-muted)" }}>{HOTEL_STATUS_LABEL[h.status] ?? h.status}</span></td>
                <td style={{ fontSize: 13 }}>{h.package_name ?? "—"}</td>
                <td style={{ fontSize: 13 }}>
                  {h.subscription_amount ? `${nf(h.subscription_amount)} ${h.subscription_currency ?? ""}` : "—"}
                </td>
                <td style={{ textAlign: "center", fontWeight: 700 }}>{h.web_bookings_count}</td>
                <td style={{ textAlign: "center", color: "var(--color-success)" }}>{h.completed_count}</td>
                <td style={{ textAlign: "center", color: "var(--color-danger)" }}>{h.cancelled_count}</td>
                <td style={{ textAlign: "center", color: "var(--color-warning)" }}>{h.no_show_count}</td>
                <td style={{ fontSize: 13 }}><MoneyLines map={h.booking_value_by_currency} /></td>
                <td style={{ fontSize: 12 }}>
                  {h.commission_enabled
                    ? <>{COMMISSION_TYPE_LABEL[h.commission_type]}<br /><strong>{h.commission_type === "percentage" ? `${h.commission_value}%` : `${nf(h.commission_value)} ${h.commission_currency}`}</strong>{h.commission_source === "hotel" && <span className="earn-mini-badge" style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", marginRight: 4 }}>خاص</span>}</>
                    : <span style={{ color: "var(--color-muted)" }}>معطّلة</span>}
                </td>
                <td style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: 13 }}><MoneyLines map={h.profit_by_currency} empty="0" /></td>
                <td><StatusBadges breakdown={h.commission_status_breakdown} /></td>
                <td style={{ fontSize: 12, color: "var(--color-muted)" }}>{h.last_booking_at ? new Date(h.last_booking_at).toLocaleDateString("ar-SY") : "—"}</td>
                <td>
                  <Link href={`/platform/earnings/${h.hotel_id}`} className="ds-btn ds-btn-neutral ds-btn-xs" style={{ gap: 4, whiteSpace: "nowrap" }}>
                    <FileBarChart size={13} /> التقرير
                  </Link>
                </td>
              </tr>
            ))}
            {data.hotels.length === 0 && (
              <tr><td colSpan={15} style={{ textAlign: "center", padding: "2rem", color: "var(--color-muted)" }}>لا توجد فنادق مطابقة للفلاتر</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Settings modal */}
      {showSettings && settings && (
        <div className="ds-modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="ds-modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><Percent size={18} /> إعدادات احتساب ربح حجوزات الموقع</h2>
              <button className="icon-btn" onClick={() => setShowSettings(false)}><X size={16} strokeWidth={2.5} /></button>
            </div>
            <div className="ds-modal-body" style={{ display: "grid", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <input type="checkbox" checked={settings.enable_booking_commission}
                  onChange={e => setSettings({ ...settings, enable_booking_commission: e.target.checked })} />
                تفعيل احتساب عمولة حجوزات الموقع
              </label>

              <div className="field">
                <label className="field-label">نوع العمولة الافتراضي</label>
                <select className="select" value={settings.default_commission_type}
                  onChange={e => setSettings({ ...settings, default_commission_type: e.target.value })}>
                  <option value="percentage">نسبة مئوية من قيمة الحجز</option>
                  <option value="fixed_per_booking">مبلغ مقطوع لكل حجز</option>
                  <option value="fixed_per_guest">مبلغ مقطوع لكل زبون</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="field">
                  <label className="field-label">{settings.default_commission_type === "percentage" ? "النسبة (%)" : "القيمة"}</label>
                  <input type="number" className="input" value={settings.default_commission_value}
                    onChange={e => setSettings({ ...settings, default_commission_value: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label className="field-label">عملة المبلغ المقطوع</label>
                  <input type="text" className="input" value={settings.default_commission_currency}
                    onChange={e => setSettings({ ...settings, default_commission_currency: e.target.value.toUpperCase() })}
                    disabled={settings.default_commission_type === "percentage"} />
                </div>
              </div>

              <div className="field">
                <label className="field-label">متى تُحتسب العمولة كمستحقة؟</label>
                <select className="select" value={settings.calculate_commission_on_status}
                  onChange={e => setSettings({ ...settings, calculate_commission_on_status: e.target.value })}>
                  {Object.entries(TRIGGER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>الأفضل: عند تسجيل الدخول أو الاكتمال، لأن الدفع يتم عند الوصول.</p>
              </div>

              <div className="field">
                <label className="field-label">سياسة عدم الحضور (no-show)</label>
                <select className="select" value={settings.no_show_policy}
                  onChange={e => setSettings({ ...settings, no_show_policy: e.target.value })}>
                  <option value="waive">إعفاء العمولة عند عدم الحضور</option>
                  <option value="keep">إبقاء العمولة مستحقة</option>
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <input type="checkbox" checked={settings.allow_hotel_override}
                  onChange={e => setSettings({ ...settings, allow_hotel_override: e.target.checked })} />
                السماح بإعداد عمولة خاص لكل فندق
              </label>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setShowSettings(false)}>إلغاء</button>
              <button className="ds-btn ds-btn-primary" onClick={saveSettings} disabled={savingSettings}>
                {savingSettings ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className="ds-summary-label">{label}</p>
      <div className={`ds-summary-value ${color ?? ""}`} style={{ fontSize: "var(--text-2xl)" }}>{value}</div>
    </div>
  );
}
