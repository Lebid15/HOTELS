"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Printer, Download, SlidersHorizontal,
  Building2, BadgeCheck, ClipboardList, CalendarCheck, TrendingUp,
  CircleDollarSign, Activity, AlertTriangle, Package, Coins,
} from "lucide-react";
import { apiUrl, getAuthHeaders } from "@/lib/api";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Money = Record<string, number>;

interface DashKpis {
  hotels_total: number; hotels_active: number; hotels_suspended: number;
  hotels_without_subscription: number; subscriptions_active: number;
  subscriptions_trial: number; subscriptions_expired: number;
  subscriptions_ending_soon: number; subscriptions_unpaid: number;
  subscription_requests_pending: number;
}
interface RevenueItem {
  currency: string; total_paid: number; total_unpaid: number;
  total_partial?: number; count_paid?: number; count_unpaid?: number;
}
interface RecentRequest {
  id: number; hotel_name: string; package_name: string | null;
  status: string; requested_by_name: string | null;
  notes?: string; created_at: string;
}
interface PackageItem {
  id: number; name: string; status: string;
  price_monthly: number | null; subscription_count: number;
}
interface DashboardData {
  kpis: DashKpis;
  revenue: RevenueItem[];
  recent_requests: RecentRequest[];
  package_distribution: PackageItem[];
}

interface HotelRow {
  hotel_id: number; hotel_name: string; city: string; governorate: string; status: string;
  package_name: string | null; subscription_status: string | null;
  subscription_amount: number; subscription_currency: string | null;
  web_bookings_count: number; completed_count: number; cancelled_count: number; no_show_count: number;
  booking_value_by_currency: Money;
  commission_type: string; commission_value: number; commission_currency: string;
  profit_by_currency: Money; commission_status_breakdown: Record<string, number>;
  last_booking_at: string | null;
}
interface EarningsData {
  kpis: { hotels_total: number; hotels_active: number; subscriptions_sold: number; web_bookings_count: number; customers_count: number };
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
  filters: { period: string; currencies: string[]; governorates: string[] };
}

/* ── Labels ────────────────────────────────────────────────────────────────── */
const HOTEL_STATUS_LABEL: Record<string, string> = { active: "فعال", suspended: "موقوف", archived: "مؤرشف" };
const SUB_STATUS_LABEL: Record<string, string> = {
  active: "فعال", trial: "تجريبي", expired: "منتهي", suspended: "موقوف", not_set: "غير مضبوط",
};
const REQ_STATUS_LABEL: Record<string, string> = { pending: "معلق", approved: "مقبول", rejected: "مرفوض" };
const PKG_STATUS_LABEL: Record<string, string> = { active: "نشطة", archived: "مؤرشفة", suspended: "موقوفة" };
const COMMISSION_TYPE_LABEL: Record<string, string> = {
  percentage: "نسبة مئوية", fixed_per_booking: "مبلغ / حجز", fixed_per_guest: "مبلغ / زبون", "": "—",
};
const COMM_STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار", due: "مستحقة", paid: "مدفوعة", partial: "جزئية", waived: "معفاة", cancelled: "ملغاة",
};
const CURRENCY_NAME: Record<string, string> = {
  SAR: "ريال سعودي", USD: "دولار أمريكي", EUR: "يورو", AED: "درهم إماراتي", SYP: "ليرة سورية", TRY: "ليرة تركية",
};

const PERIODS: { key: string; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "today", label: "اليوم" },
  { key: "week", label: "هذا الأسبوع" },
  { key: "month", label: "هذا الشهر" },
  { key: "year", label: "هذا العام" },
];

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const nf = (n: number) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Plain-text per-currency rendering for CSV cells (never summed across currencies). */
function moneyText(map: Money): string {
  const entries = Object.entries(map || {}).filter(([, v]) => v != null && v !== 0);
  if (!entries.length) return "—";
  return entries.map(([cur, v]) => `${nf(v)} ${cur}`).join(" | ");
}

/** Plain-text status breakdown for CSV cells. */
function breakdownText(map: Record<string, number>): string {
  const entries = Object.entries(map || {}).filter(([, c]) => c > 0);
  if (!entries.length) return "—";
  return entries.map(([st, c]) => `${COMM_STATUS_LABEL[st] ?? st}: ${c}`).join(" | ");
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
}

/** Renders a money map as one block line per currency (never summed). */
function MoneyLines({ map, empty = "—" }: { map: Money; empty?: string }) {
  const entries = Object.entries(map || {}).filter(([, v]) => v != null && v !== 0);
  if (!entries.length) return <span className="text-muted">{empty}</span>;
  return (
    <>
      {entries.map(([cur, val]) => (
        <span key={cur} className="earn-money-line">
          {nf(val)} <span className="earn-money-cur">{cur}</span>
        </span>
      ))}
    </>
  );
}

/* ── Report registry ───────────────────────────────────────────────────────── */
type ReportKey =
  | "hotels" | "subscriptions" | "requests" | "web_bookings" | "earnings"
  | "commissions" | "active_hotels" | "attention" | "packages" | "revenue";

interface ReportMeta {
  key: ReportKey;
  title: string;
  desc: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const REPORTS: ReportMeta[] = [
  { key: "hotels",        title: "تقرير الفنادق",          desc: "جميع الفنادق مع الحالة والباقة والأرباح",      Icon: Building2 },
  { key: "subscriptions", title: "تقرير الاشتراكات",       desc: "حالات الاشتراكات وأرباحها حسب العملة",         Icon: BadgeCheck },
  { key: "requests",      title: "طلبات الاشتراك",         desc: "أحدث طلبات الاشتراك وحالتها",                  Icon: ClipboardList },
  { key: "web_bookings",  title: "تقرير حجوزات الموقع",     desc: "حجوزات الموقع العام وحالاتها",                 Icon: CalendarCheck },
  { key: "earnings",      title: "تقرير الأرباح",          desc: "أرباح المنصة حسب العملة (غير مجمّعة)",          Icon: TrendingUp },
  { key: "commissions",   title: "تقرير العمولات",         desc: "عمولات حجوزات الموقع وحالات تحصيلها",          Icon: CircleDollarSign },
  { key: "active_hotels", title: "الفنادق الأكثر نشاطًا",   desc: "أعلى الفنادق من حيث حجوزات الموقع",            Icon: Activity },
  { key: "attention",     title: "فنادق تحتاج متابعة",      desc: "فنادق موقوفة أو بلا اشتراك أو بإلغاءات",        Icon: AlertTriangle },
  { key: "packages",      title: "الباقات الأكثر مبيعًا",   desc: "ترتيب الباقات حسب عدد الاشتراكات",             Icon: Package },
  { key: "revenue",       title: "الإيرادات حسب العملة",    desc: "المدفوع وغير المدفوع لكل عملة",                Icon: Coins },
];

/** A derived table: column headers + string rows (rows are CSV-ready). */
interface TableModel {
  columns: string[];
  rows: string[][];
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function PlatformReportsPage() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [earn, setEarn] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [active, setActive] = useState<ReportKey>("hotels");
  const [period, setPeriod] = useState("all");
  const [currency, setCurrency] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    if (currency) params.set("currency", currency);
    const qs = params.toString();

    Promise.all([
      fetch(apiUrl("/platform/dashboard/"), { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(apiUrl(`/platform/earnings/${qs ? `?${qs}` : ""}`), { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([d, e]: [DashboardData, EarningsData]) => { setDash(d); setEarn(e); setLoading(false); })
      .catch(() => { setError("تعذّر تحميل تقارير المنصة"); setLoading(false); });
  }, [period, currency]);

  useEffect(() => { load(); }, [load]);

  const currencyOptions = earn?.filters?.currencies ?? [];

  /* ── Build the model for the currently-selected report ─────────────────── */
  const model: TableModel | null = useMemo(() => {
    if (!dash || !earn) return null;

    switch (active) {
      case "hotels":
        return {
          columns: ["الفندق", "المدينة", "الحالة", "الباقة", "الاشتراك", "حجوزات الموقع", "ربح المنصة"],
          rows: earn.hotels.map(h => [
            h.hotel_name,
            h.city || "—",
            HOTEL_STATUS_LABEL[h.status] ?? h.status,
            h.package_name ?? "—",
            h.subscription_amount ? `${nf(h.subscription_amount)} ${h.subscription_currency ?? ""}`.trim() : "—",
            String(h.web_bookings_count),
            moneyText(h.profit_by_currency),
          ]),
        };

      case "subscriptions":
        return {
          columns: ["المؤشر", "القيمة"],
          rows: [
            ["اشتراكات فعالة", String(dash.kpis.subscriptions_active)],
            ["اشتراكات تجريبية", String(dash.kpis.subscriptions_trial)],
            ["اشتراكات منتهية", String(dash.kpis.subscriptions_expired)],
            ["اشتراكات غير مدفوعة", String(dash.kpis.subscriptions_unpaid)],
            ["تنتهي قريبًا (30 يوم)", String(dash.kpis.subscriptions_ending_soon)],
            ["اشتراكات مباعة", String(earn.subscriptions.sold)],
            ["أرباح الاشتراكات", moneyText(earn.subscriptions.earnings_by_currency)],
            ["غير المحصّل من الاشتراكات", moneyText(earn.subscriptions.unpaid_by_currency)],
            ["أفضل باقة مبيعًا", earn.subscriptions.best_selling_package ?? "—"],
            ["أكثر فندق دفعًا", earn.subscriptions.top_paying_hotel ?? "—"],
          ],
        };

      case "requests":
        return {
          columns: ["الفندق", "الباقة", "مقدم الطلب", "الحالة", "التاريخ"],
          rows: dash.recent_requests.map(r => [
            r.hotel_name,
            r.package_name ?? "—",
            r.requested_by_name || "—",
            REQ_STATUS_LABEL[r.status] ?? r.status,
            shortDate(r.created_at),
          ]),
        };

      case "web_bookings":
        return {
          columns: ["المؤشر", "القيمة"],
          rows: [
            ["إجمالي الحجوزات", String(earn.web_bookings.count)],
            ["زبائن فريدون", String(earn.web_bookings.customers)],
            ["مكتملة", String(earn.web_bookings.completed)],
            ["ملغاة", String(earn.web_bookings.cancelled)],
            ["لم يحضر", String(earn.web_bookings.no_show)],
            ["فنادق لها حجوزات", String(earn.web_bookings.hotels_with_bookings)],
            ["عمولات مدفوعة", moneyText(earn.web_bookings.paid_by_currency)],
            ["عمولات قيد الانتظار", moneyText(earn.web_bookings.pending_by_currency)],
            ["إجمالي أرباح حجوزات الموقع", moneyText(earn.booking_earnings_by_currency)],
          ],
        };

      case "earnings":
        return {
          columns: ["المصدر", "الأرباح (لكل عملة)"],
          rows: [
            ["أرباح الاشتراكات", moneyText(earn.subscription_earnings_by_currency)],
            ["أرباح حجوزات الموقع", moneyText(earn.booking_earnings_by_currency)],
            ["إجمالي أرباح المنصة", moneyText(earn.total_by_currency)],
          ],
        };

      case "commissions": {
        const statusRows: string[][] = Object.entries(earn.web_bookings.commission_status_counts || {})
          .filter(([, c]) => c > 0)
          .map(([st, c]) => [COMM_STATUS_LABEL[st] ?? st, "—", String(c)]);
        const hotelRows: string[][] = earn.hotels
          .filter(h => h.web_bookings_count > 0)
          .map(h => [
            h.hotel_name,
            h.commission_type
              ? (h.commission_type === "percentage"
                  ? `${COMMISSION_TYPE_LABEL[h.commission_type]} ${h.commission_value}%`
                  : `${COMMISSION_TYPE_LABEL[h.commission_type]} ${nf(h.commission_value)} ${h.commission_currency}`)
              : "—",
            breakdownText(h.commission_status_breakdown),
          ]);
        return {
          columns: ["البند", "العمولة", "الحالة / العدد"],
          rows: [...statusRows, ...hotelRows],
        };
      }

      case "active_hotels":
        return {
          columns: ["الفندق", "المدينة", "حجوزات الموقع", "مكتملة", "ملغاة", "ربح المنصة"],
          rows: [...earn.hotels]
            .sort((a, b) => b.web_bookings_count - a.web_bookings_count)
            .slice(0, 10)
            .map(h => [
              h.hotel_name,
              h.city || "—",
              String(h.web_bookings_count),
              String(h.completed_count),
              String(h.cancelled_count),
              moneyText(h.profit_by_currency),
            ]),
        };

      case "attention": {
        const flagged = earn.hotels.filter(h =>
          h.status === "suspended" || h.cancelled_count > 0 || !h.subscription_status || h.subscription_status === "not_set",
        );
        return {
          columns: ["الفندق", "المدينة", "الحالة", "الاشتراك", "ملغاة", "سبب المتابعة"],
          rows: flagged.map(h => {
            const reasons: string[] = [];
            if (h.status === "suspended") reasons.push("فندق موقوف");
            if (!h.subscription_status || h.subscription_status === "not_set") reasons.push("بلا اشتراك");
            if (h.cancelled_count > 0) reasons.push("حجوزات ملغاة");
            return [
              h.hotel_name,
              h.city || "—",
              HOTEL_STATUS_LABEL[h.status] ?? h.status,
              h.subscription_status ? (SUB_STATUS_LABEL[h.subscription_status] ?? h.subscription_status) : "—",
              String(h.cancelled_count),
              reasons.join("، ") || "—",
            ];
          }),
        };
      }

      case "packages":
        return {
          columns: ["الباقة", "الحالة", "السعر الشهري", "عدد الاشتراكات"],
          rows: [...dash.package_distribution]
            .sort((a, b) => b.subscription_count - a.subscription_count)
            .map(p => [
              p.name,
              PKG_STATUS_LABEL[p.status] ?? p.status,
              p.price_monthly != null ? nf(p.price_monthly) : "—",
              String(p.subscription_count),
            ]),
        };

      case "revenue":
        return {
          columns: ["العملة", "مدفوع", "غير مدفوع"],
          rows: dash.revenue.map(r => [
            `${CURRENCY_NAME[r.currency] ?? r.currency} (${r.currency})`,
            nf(r.total_paid),
            nf(r.total_unpaid + (r.total_partial ?? 0)),
          ]),
        };

      default:
        return null;
    }
  }, [active, dash, earn]);

  const activeMeta = REPORTS.find(r => r.key === active)!;

  /* ── CSV export of the currently-selected report ───────────────────────── */
  function exportCsv() {
    if (!model) return;
    const escape = (cell: string) => {
      const v = (cell ?? "").replace(/ /g, " ");
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    };
    const lines = [
      model.columns.map(escape).join(","),
      ...model.rows.map(row => row.map(escape).join(",")),
    ];
    // BOM so Excel reads Arabic (UTF-8) correctly.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeMeta.key}-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ── Cell rendering: money / breakdown strings become block lines ──────── */
  function renderCell(value: string) {
    if (value.includes(" | ")) {
      return (
        <>
          {value.split(" | ").map((part, i) => (
            <span key={i} className="earn-money-line">{part}</span>
          ))}
        </>
      );
    }
    return value;
  }

  const isCardReport = active === "revenue";

  /* ── States ────────────────────────────────────────────────────────────── */
  if (loading && !dash) {
    return (
      <div className="ds-page" dir="rtl">
        <div className="ds-card ds-card-p"><p className="text-muted">جارٍ تحميل تقارير المنصة...</p></div>
      </div>
    );
  }
  if (error || !dash || !earn) {
    return (
      <div className="ds-page" dir="rtl">
        <div className="ds-card ds-card-p"><div className="ds-alert ds-alert-danger">{error || "حدث خطأ غير متوقع"}</div></div>
      </div>
    );
  }

  return (
    <div className="ds-page" dir="rtl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>تقارير المنصة</h1>
          <p className="text-muted">تقارير إدارية شاملة عن الفنادق والاشتراكات والأرباح</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> تحديث
          </button>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => window.print()}>
            <Printer size={15} /> طباعة
          </button>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={exportCsv}>
            <Download size={15} /> تصدير CSV
          </button>
        </div>
      </div>

      {/* Report picker */}
      <div className="pf-report-grid no-print">
        {REPORTS.map(({ key, title, desc, Icon }) => (
          <button
            key={key}
            type="button"
            className={`pf-report-card${active === key ? " active" : ""}`}
            onClick={() => setActive(key)}
          >
            <span className="pf-report-icon"><Icon size={22} strokeWidth={2} /></span>
            <span className="pf-report-title">{title}</span>
            <span className="pf-report-desc">{desc}</span>
          </button>
        ))}
      </div>

      {/* Filters — single bar */}
      <div className="pf-filter-bar no-print">
        <span className="pf-filter-bar-icon"><SlidersHorizontal size={16} /></span>
        <select className="select" value={period} onChange={e => setPeriod(e.target.value)}>
          {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
          <option value="">كل العملات</option>
          {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Selected report content */}
      <div className="ds-card ds-card-p">
        <h2 className="pf-block-title">
          <activeMeta.Icon size={18} strokeWidth={2} /> {activeMeta.title}
        </h2>

        {!model || model.rows.length === 0 ? (
          <p className="text-muted">لا توجد بيانات مطابقة لعرض هذا التقرير.</p>
        ) : isCardReport ? (
          <div className="pf-grid-3">
            {dash.revenue.map(r => (
              <div key={r.currency} className="ds-card ds-card-p">
                <p className="pf-block-title">{CURRENCY_NAME[r.currency] ?? r.currency} ({r.currency})</p>
                <div className="pf-kv">
                  <span className="pf-kv-label">مدفوع</span>
                  <span className="pf-kv-value text-success">{nf(r.total_paid)} {r.currency}</span>
                </div>
                <div className="pf-kv">
                  <span className="pf-kv-label">غير مدفوع</span>
                  <span className="pf-kv-value text-danger">{nf(r.total_unpaid + (r.total_partial ?? 0))} {r.currency}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>{model.columns.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {model.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => <td key={ci}>{renderCell(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
