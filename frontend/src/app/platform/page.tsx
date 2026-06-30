"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2, Users, Package, CreditCard, FileText, Clock, Settings,
  Plus, AlertTriangle, CheckCircle2, XCircle, RefreshCw, TrendingUp,
  BarChart3, ArrowLeft, X, Globe, ExternalLink, CalendarCheck, ClipboardList,
  Hourglass, BadgeCheck, FlaskConical, CircleSlash, Wallet, Layers, ChevronLeft,
} from "lucide-react";
import { apiUrl, getAuthJsonHeaders as apiH } from "@/lib/api";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface PlatformOwner { first_name: string; last_name: string; username: string }
interface KPIs {
  hotels_total: number; hotels_active: number; hotels_suspended: number;
  hotels_without_subscription: number; subscriptions_active: number;
  subscriptions_trial: number; subscriptions_expired: number;
  subscriptions_ending_soon: number; subscriptions_unpaid: number;
  subscription_requests_pending: number;
}
interface HotelBreakdown {
  active: number; suspended: number; without_subscription: number;
  trial: number; expired: number;
}
interface RevenueItem {
  currency: string; total_paid: number; total_unpaid: number;
  total_partial: number; count_paid: number; count_unpaid: number;
}
interface RecentRequest {
  id: number; hotel_name: string; package_name: string | null;
  status: string; requested_by_name: string | null;
  notes: string; created_at: string;
}
interface EndingSoonItem {
  id: number; hotel_id: number; hotel_name: string; package_name: string | null;
  end_date: string | null; remaining_days: number | null;
  payment_status: string; status: string; monthly_amount: number; currency: string;
}
interface RecentHotel {
  id: number; name: string; city: string; manager_name: string;
  status: string; subscription_status: string | null; package_name: string | null;
  created_at: string;
}
interface PackageItem {
  id: number; name: string; status: string;
  price_monthly: number | null; subscription_count: number;
}
interface WebBookingsSummary {
  today: number; month: number; total: number;
  awaiting: number; cancelled_by_guest: number; no_show: number;
}
interface RecentWebBooking {
  id: number; public_booking_no: string; hotel_name: string; guest_name: string;
  total: number; currency: string; status: string; arrival_status: string; created_at: string;
}
interface DashboardData {
  platform_owner: PlatformOwner; kpis: KPIs; hotel_breakdown: HotelBreakdown;
  revenue: RevenueItem[]; recent_requests: RecentRequest[];
  ending_soon: EndingSoonItem[]; recent_hotels: RecentHotel[];
  package_distribution: PackageItem[];
  web_bookings: WebBookingsSummary; recent_web_bookings: RecentWebBooking[];
}

/* ── Badge/Label maps ──────────────────────────────────────────────────────── */
const HOTEL_BADGE: Record<string, string> = {
  active: "ds-badge ds-badge-success", suspended: "ds-badge ds-badge-danger",
  archived: "ds-badge ds-badge-neutral",
};
const HOTEL_LABEL: Record<string, string> = { active: "فعال", suspended: "موقوف", archived: "مؤرشف" };
const SUB_BADGE: Record<string, string> = {
  active: "ds-badge ds-badge-success", trial: "ds-badge ds-badge-info",
  expired: "ds-badge ds-badge-danger", suspended: "ds-badge ds-badge-warning",
  not_set: "ds-badge ds-badge-neutral",
};
const SUB_LABEL: Record<string, string> = {
  active: "فعال", trial: "تجريبي", expired: "منتهي", suspended: "موقوف", not_set: "غير مضبوط",
};
const REQ_BADGE: Record<string, string> = {
  pending: "ds-badge ds-badge-warning", approved: "ds-badge ds-badge-success",
  rejected: "ds-badge ds-badge-danger",
};
const REQ_LABEL: Record<string, string> = { pending: "معلق", approved: "مقبول", rejected: "مرفوض" };
const PAY_BADGE: Record<string, string> = {
  paid: "ds-badge ds-badge-success", unpaid: "ds-badge ds-badge-danger",
  partial: "ds-badge ds-badge-warning",
};
const PAY_LABEL: Record<string, string> = { paid: "مدفوع", unpaid: "غير مدفوع", partial: "جزئي" };
const RES_BADGE: Record<string, string> = {
  pending: "ds-badge ds-badge-neutral", confirmed: "ds-badge ds-badge-info",
  checked_in: "ds-badge ds-badge-success", checked_out: "ds-badge ds-badge-neutral",
  cancelled: "ds-badge ds-badge-danger", no_show: "ds-badge ds-badge-warning",
};
const RES_LABEL: Record<string, string> = {
  pending: "قيد الانتظار", confirmed: "مؤكد", checked_in: "تم الدخول",
  checked_out: "تم الخروج", cancelled: "ملغى", no_show: "لم يحضر",
};
const PKG_STATUS_BADGE: Record<string, string> = {
  active: "ds-badge ds-badge-success", archived: "ds-badge ds-badge-neutral", suspended: "ds-badge ds-badge-warning",
};
const PKG_STATUS_LABEL: Record<string, string> = { active: "نشطة", archived: "مؤرشفة", suspended: "موقوفة" };

/* ── LocalStorage helpers ──────────────────────────────────────────────────── */
interface PlatformLocalSettings { platformName: string; platformEmail: string; platformPhone: string; platformLogo: string; }
interface SubLocalSettings { trialDays: number; reminderDays: number; autoRenewal: boolean; }
function readLocal<T>(key: string, defaults: T): T {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch { return defaults; }
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function todayArabic() {
  return new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}
function currencyLabel(c: string) {
  const map: Record<string, string> = { SAR: "ريال سعودي", USD: "دولار أمريكي", EUR: "يورو", AED: "درهم إماراتي", SYP: "ليرة سورية" };
  return map[c] ?? c;
}
function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* ── Sub-components ────────────────────────────────────────────────────────── */
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  // dynamic width + color are data-driven → set via CSS custom values on the fill only
  return (
    <div className="pf-bar">
      <div className="pf-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SectionHead({ icon, title, count, linkHref, linkLabel }: {
  icon: React.ReactNode; title: string; count?: number; linkHref?: string; linkLabel?: string;
}) {
  return (
    <div className="pf-section-head">
      <div className="pf-section-head-l">
        <span className="pf-section-head-icon">{icon}</span>
        <h2>{title}</h2>
        {count !== undefined && <span className="ds-badge ds-badge-neutral">{count}</span>}
      </div>
      {linkHref && (
        <Link href={linkHref} className="ds-btn ds-btn-neutral ds-btn-sm">
          <ArrowLeft size={13} strokeWidth={2} /> {linkLabel ?? "عرض الكل"}
        </Link>
      )}
    </div>
  );
}

/* Iconified, clickable KPI card */
type KpiTone = "primary" | "success" | "danger" | "warning" | "accent" | "luxury";
const TONE_VALUE: Record<KpiTone, string> = {
  primary: "text-primary", success: "text-success", danger: "text-danger",
  warning: "text-warning", accent: "text-accent", luxury: "text-luxury",
};
function KpiCard({ href, icon, tone, label, value, note }: {
  href: string; icon: React.ReactNode; tone: KpiTone; label: string; value: number; note: string;
}) {
  return (
    <Link href={href} className="pf-card-link">
      <div className="ds-summary-card pf-clickable pf-kpi">
        <div className="pf-kpi-top">
          <span className={`pf-kpi-chip tone-${tone}`}>{icon}</span>
          <ChevronLeft className="pf-kpi-go" size={18} strokeWidth={2.5} />
        </div>
        <p className="ds-summary-label">{label}</p>
        <p className={`ds-summary-value ${TONE_VALUE[tone]}`}>{value}</p>
        <p className="ds-summary-note">{note}</p>
      </div>
    </Link>
  );
}

function MoneyLines({ map }: { map: Record<string, number> }) {
  const entries = Object.entries(map || {}).filter(([, v]) => v != null);
  if (!entries.length) return <span className="text-muted">0</span>;
  return (
    <>
      {entries.map(([c, v]) => (
        <span key={c} className="earn-money-line">
          {fmt(v)} <span className="earn-money-cur">{c}</span>
        </span>
      ))}
    </>
  );
}

/* ── Earnings summary card ──────────────────────────────────────────────────── */
function EarningsSummaryCard() {
  type Money = Record<string, number>;
  const [d, setD] = useState<{
    subscription_earnings_by_currency: Money;
    booking_earnings_by_currency: Money;
    total_by_currency: Money;
    web_bookings: { count: number; hotels_with_bookings: number };
  } | null>(null);

  useEffect(() => {
    fetch(apiUrl("/platform/earnings/"), { headers: apiH() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setD)
      .catch(() => {});
  }, []);

  return (
    <div className="ds-card-p">
      <SectionHead icon={<TrendingUp size={16} strokeWidth={2} />} title="أرباح المنصة" linkHref="/platform/earnings" linkLabel="فتح تقرير الأرباح" />
      {!d ? (
        <p className="pf-empty-inline">جارٍ التحميل...</p>
      ) : (
        <div className="pf-grid-3">
          <div className="pf-fin-block">
            <p className="ds-summary-label">أرباح الاشتراكات</p>
            <div className="pf-money-stack pf-money-big text-success"><MoneyLines map={d.subscription_earnings_by_currency} /></div>
          </div>
          <div className="pf-fin-block">
            <p className="ds-summary-label">أرباح حجوزات الموقع</p>
            <div className="pf-money-stack pf-money-big text-success"><MoneyLines map={d.booking_earnings_by_currency} /></div>
          </div>
          <div className="pf-fin-block pf-fin-total">
            <p className="ds-summary-label">إجمالي أرباح المنصة</p>
            <div className="pf-money-stack pf-money-big text-primary"><MoneyLines map={d.total_by_currency} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */
export default function PlatformDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [platformCfg, setPlatformCfg] = useState<PlatformLocalSettings | null>(null);
  const [subCfg, setSubCfg] = useState<SubLocalSettings | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(apiUrl("/platform/dashboard/"), { headers: apiH() });
      if (!res.ok) throw new Error("فشل تحميل لوحة التحكم");
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setPlatformCfg(readLocal<PlatformLocalSettings>("fandqi.platform", {
      platformName: "Fandqi", platformEmail: "", platformPhone: "", platformLogo: "",
    }));
    setSubCfg(readLocal<SubLocalSettings>("fandqi.sub_settings", { trialDays: 14, reminderDays: 7, autoRenewal: false }));
  }, [load]);

  async function quickApprove(reqId: number) {
    setActingId(reqId);
    try {
      const res = await fetch(apiUrl(`/subscription-requests/${reqId}/approve/`), {
        method: "POST", headers: apiH(), body: JSON.stringify({ months: 1 }),
      });
      if (!res.ok) throw new Error();
      showToast("تم قبول الطلب بنجاح"); load();
    } catch { showToast("فشل قبول الطلب", "error"); }
    finally { setActingId(null); }
  }

  async function quickReject(reqId: number) {
    setActingId(reqId);
    try {
      const res = await fetch(apiUrl(`/subscription-requests/${reqId}/reject/`), {
        method: "POST", headers: apiH(), body: JSON.stringify({ reason: "" }),
      });
      if (!res.ok) throw new Error();
      showToast("تم رفض الطلب"); load();
    } catch { showToast("فشل رفض الطلب", "error"); }
    finally { setActingId(null); }
  }

  /* ── Derived ─────────────────────────────────────────────────────── */
  const kpis = data?.kpis;
  const bd   = data?.hotel_breakdown;
  const web  = data?.web_bookings;

  const healthChecks = platformCfg ? [
    { label: "اسم المنصة مخصص",          ok: !!platformCfg.platformName && platformCfg.platformName !== "Fandqi" },
    { label: "البريد الإلكتروني للتواصل", ok: !!platformCfg.platformEmail },
    { label: "رقم الهاتف",               ok: !!platformCfg.platformPhone },
    { label: "شعار المنصة",              ok: !!platformCfg.platformLogo },
    { label: "مدة الفترة التجريبية",      ok: !!subCfg && subCfg.trialDays > 0 },
    { label: "أيام التذكير بالتجديد",     ok: !!subCfg && subCfg.reminderDays > 0 },
  ] : [];
  const healthOk = healthChecks.length > 0 && healthChecks.every(h => h.ok);
  const maxPkgSubs = data?.package_distribution.reduce((m, p) => Math.max(m, p.subscription_count), 0) ?? 0;

  /* ── Alerts ─────────────────────────────────────────────────────── */
  const alerts: Array<{ type: "warning" | "danger" | "info"; msg: string; href: string }> = [];
  if (kpis) {
    if (kpis.subscription_requests_pending > 0)
      alerts.push({ type: "warning", msg: `يوجد ${kpis.subscription_requests_pending} طلب اشتراك معلق بانتظار المراجعة`, href: "/platform/subscription-requests" });
    if (kpis.subscriptions_ending_soon > 0)
      alerts.push({ type: "warning", msg: `${kpis.subscriptions_ending_soon} اشتراك تنتهي خلال 30 يوماً`, href: "/platform/subscriptions" });
    if (kpis.subscriptions_unpaid > 0)
      alerts.push({ type: "danger", msg: `${kpis.subscriptions_unpaid} اشتراك غير مدفوع أو مدفوع جزئياً`, href: "/platform/subscriptions" });
    if (kpis.hotels_suspended > 0)
      alerts.push({ type: "danger", msg: `${kpis.hotels_suspended} فندق موقوف يحتاج مراجعة`, href: "/platform/hotels" });
    if (web && web.cancelled_by_guest > 0)
      alerts.push({ type: "info", msg: `${web.cancelled_by_guest} حجز موقع أُلغي من الزبائن`, href: "/platform/web-bookings" });
    if (!healthOk && platformCfg)
      alerts.push({ type: "info", msg: "إعدادات المنصة غير مكتملة — بعض الحقول تحتاج ضبطاً", href: "/platform/settings" });
  }

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="ds-page" dir="rtl">

      {toast && (
        <div className="ds-toast-stack">
          <div className={`ds-toast ds-toast-${toast.type === "success" ? "success" : "error"}`}>
            <span>{toast.msg}</span>
            <button className="ds-toast-close" onClick={() => setToast(null)}><X size={14} strokeWidth={2.5} /></button>
          </div>
        </div>
      )}

      {/* ── Header + toolbar ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>لوحة تحكم المنصة</h1>
          <p className="text-muted">
            {todayArabic()}
            {data?.platform_owner && (
              <> &mdash; مرحباً، <strong className="pf-cell-title">{data.platform_owner.first_name || data.platform_owner.username}</strong></>
            )}
          </p>
        </div>
        <div className="page-actions">
          <a href="/" target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-teal ds-btn-sm">
            <Globe size={14} strokeWidth={2} /> فتح الموقع العام <ExternalLink size={12} strokeWidth={2} />
          </a>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} strokeWidth={2} className={loading ? "spin" : ""} /> تحديث
          </button>
          <Link href="/platform/settings" className="ds-btn ds-btn-neutral ds-btn-sm">
            <Settings size={14} strokeWidth={2} /> الإعدادات
          </Link>
        </div>
      </div>

      {loading && <div className="ds-card-p"><p className="pf-empty-inline">جارٍ تحميل لوحة التحكم...</p></div>}
      {error && (
        <div className="ds-alert ds-alert-danger pf-alert-row">
          <span><AlertTriangle size={15} strokeWidth={2.5} /> {error}</span>
          <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={load}>إعادة المحاولة</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── Command band: top-line metrics at a glance ──────────── */}
          <div className="pf-command-band">
            <Link href="/platform/hotels" className="pf-card-link">
              <div className="pf-cmd-tile">
                <span className="pf-cmd-icon"><Building2 size={22} strokeWidth={2} /></span>
                <div className="pf-cmd-body">
                  <div className="pf-cmd-value">{kpis!.hotels_total}</div>
                  <div className="pf-cmd-label">إجمالي الفنادق</div>
                </div>
              </div>
            </Link>
            <Link href="/platform/subscriptions?status=active" className="pf-card-link">
              <div className="pf-cmd-tile">
                <span className="pf-cmd-icon tone-success"><BadgeCheck size={22} strokeWidth={2} /></span>
                <div className="pf-cmd-body">
                  <div className="pf-cmd-value">{kpis!.subscriptions_active}</div>
                  <div className="pf-cmd-label">اشتراكات فعالة</div>
                </div>
              </div>
            </Link>
            <Link href="/platform/subscription-requests" className="pf-card-link">
              <div className="pf-cmd-tile">
                <span className="pf-cmd-icon tone-warning"><ClipboardList size={22} strokeWidth={2} /></span>
                <div className="pf-cmd-body">
                  <div className="pf-cmd-value">{kpis!.subscription_requests_pending}</div>
                  <div className="pf-cmd-label">طلبات معلقة</div>
                </div>
              </div>
            </Link>
          </div>

          {/* ── Quick actions ──────────────────────────────────────── */}
          <div className="ds-card-p">
            <p className="pf-section-label">إجراءات سريعة</p>
            <div className="pf-actions-row">
              <Link href="/platform/hotels" className="ds-btn ds-btn-primary ds-btn-sm"><Building2 size={13} /><Plus size={11} strokeWidth={3} /> فندق جديد</Link>
              <Link href="/platform/managers" className="ds-btn ds-btn-neutral ds-btn-sm"><Users size={13} /> المديرون</Link>
              <Link href="/platform/packages" className="ds-btn ds-btn-luxury ds-btn-sm"><Package size={13} /><Plus size={11} strokeWidth={3} /> باقة جديدة</Link>
              <Link href="/platform/subscriptions" className="ds-btn ds-btn-teal ds-btn-sm"><CreditCard size={13} /><Plus size={11} strokeWidth={3} /> اشتراك جديد</Link>
              <Link href="/platform/subscription-requests" className="ds-btn ds-btn-warning ds-btn-sm">
                <ClipboardList size={13} /> طلبات الاشتراك
                {(kpis?.subscription_requests_pending ?? 0) > 0 && (
                  <span className="ds-badge ds-badge-hot nav-count">{kpis!.subscription_requests_pending}</span>
                )}
              </Link>
              <Link href="/platform/web-bookings" className="ds-btn ds-btn-edit ds-btn-sm"><CalendarCheck size={13} /> حجوزات الموقع</Link>
              <Link href="/platform/earnings" className="ds-btn ds-btn-success ds-btn-sm"><TrendingUp size={13} /> تقرير أرباحي</Link>
              <Link href="/platform/settings" className="ds-btn ds-btn-neutral ds-btn-sm"><Settings size={13} /> الإعدادات</Link>
            </div>
          </div>

          {/* ── Smart alerts ───────────────────────────────────────── */}
          {alerts.length === 0 ? (
            <div className="ds-alert ds-alert-success"><CheckCircle2 size={16} strokeWidth={2.5} /> كل شيء على ما يرام — لا تنبيهات مطلوبة حالياً.</div>
          ) : (
            <div className="pf-alert-stack">
              {alerts.map((a, i) => (
                <div key={i} className={`ds-alert ds-alert-${a.type} pf-alert-row`}>
                  <span><AlertTriangle size={15} strokeWidth={2.5} /> {a.msg}</span>
                  <Link href={a.href} className="ds-btn ds-btn-neutral ds-btn-sm"><ArrowLeft size={12} /> معالجة</Link>
                </div>
              ))}
            </div>
          )}

          {/* ── KPI cluster: hotels ─────────────────────────────────── */}
          <p className="pf-cluster-label"><Building2 size={14} strokeWidth={2.5} /> مؤشرات الفنادق</p>
          <div className="pf-grid-3">
            <KpiCard href="/platform/hotels" icon={<Building2 size={20} strokeWidth={2} />} tone="primary"
              label="إجمالي الفنادق" value={kpis!.hotels_total} note="جميع الفنادق المسجلة في المنصة" />
            <KpiCard href="/platform/hotels?status=active" icon={<CheckCircle2 size={20} strokeWidth={2} />} tone="success"
              label="فنادق فعالة" value={kpis!.hotels_active} note="تعمل حالياً بشكل طبيعي" />
            <KpiCard href="/platform/hotels?status=suspended" icon={<CircleSlash size={20} strokeWidth={2} />} tone="danger"
              label="فنادق موقوفة" value={kpis!.hotels_suspended} note="موقوفة وتحتاج مراجعة" />
          </div>

          {/* ── KPI cluster: subscriptions ──────────────────────────── */}
          <p className="pf-cluster-label"><CreditCard size={14} strokeWidth={2.5} /> مؤشرات الاشتراكات</p>
          <div className="pf-grid-3">
            <KpiCard href="/platform/subscriptions?status=active" icon={<BadgeCheck size={20} strokeWidth={2} />} tone="success"
              label="اشتراكات فعالة" value={kpis!.subscriptions_active} note="اشتراكات سارية ومدفوعة" />
            <KpiCard href="/platform/subscriptions?status=trial" icon={<FlaskConical size={20} strokeWidth={2} />} tone="primary"
              label="اشتراكات تجريبية" value={kpis!.subscriptions_trial} note="في فترة التجربة المجانية" />
            <KpiCard href="/platform/subscriptions" icon={<Clock size={20} strokeWidth={2} />} tone="warning"
              label="تنتهي خلال 30 يوم" value={kpis!.subscriptions_ending_soon} note="تحتاج تجديداً قريباً" />
            <KpiCard href="/platform/subscriptions?status=expired" icon={<XCircle size={20} strokeWidth={2} />} tone="danger"
              label="اشتراكات منتهية" value={kpis!.subscriptions_expired} note="منتهية وتحتاج تجديد أو إغلاق" />
            <KpiCard href="/platform/subscriptions" icon={<Wallet size={20} strokeWidth={2} />} tone="warning"
              label="فنادق بلا اشتراك" value={kpis!.hotels_without_subscription} note="لم يُنشأ لها اشتراك بعد" />
            <KpiCard href="/platform/subscription-requests" icon={<Hourglass size={20} strokeWidth={2} />} tone="accent"
              label="طلبات معلقة" value={kpis!.subscription_requests_pending} note="طلبات بانتظار المراجعة" />
          </div>

          {/* ── Earnings summary ───────────────────────────────────── */}
          <EarningsSummaryCard />

          {/* ── Financial split: web bookings + revenue ────────────── */}
          <div className="pf-two-col">
            {/* Web bookings (recent + summary) */}
            <div className="ds-card-p">
              <SectionHead icon={<CalendarCheck size={16} strokeWidth={2} />} title="حجوزات الموقع الحديثة" linkHref="/platform/web-bookings" linkLabel="كل الحجوزات" />
              {web && (
                <div className="pf-stat-strip">
                  <div className="pf-stat-pill"><div className="pf-stat-num">{web.today}</div><div className="pf-stat-cap">اليوم</div></div>
                  <div className="pf-stat-pill"><div className="pf-stat-num">{web.month}</div><div className="pf-stat-cap">هذا الشهر</div></div>
                  <div className="pf-stat-pill"><div className="pf-stat-num">{web.awaiting}</div><div className="pf-stat-cap">بانتظار الوصول</div></div>
                  <div className="pf-stat-pill"><div className="pf-stat-num">{web.cancelled_by_guest}</div><div className="pf-stat-cap">ملغاة من الزبون</div></div>
                  <div className="pf-stat-pill"><div className="pf-stat-num">{web.no_show}</div><div className="pf-stat-cap">لم يحضر</div></div>
                </div>
              )}
              {data.recent_web_bookings.length === 0 ? (
                <p className="pf-empty-inline">لا توجد حجوزات من الموقع بعد.</p>
              ) : (
                <div className="ds-table-wrap">
                  <table className="ds-table">
                    <thead><tr><th>رقم الحجز</th><th>الفندق</th><th>الزبون</th><th>القيمة</th><th>الحالة</th><th>التاريخ</th></tr></thead>
                    <tbody>
                      {data.recent_web_bookings.map(b => (
                        <tr key={b.id}>
                          <td className="pf-cell-title">{b.public_booking_no}</td>
                          <td>{b.hotel_name}</td>
                          <td className="text-muted">{b.guest_name}</td>
                          <td className="pf-cell-title">{fmt(b.total)} {b.currency}</td>
                          <td><span className={RES_BADGE[b.status] ?? "ds-badge ds-badge-neutral"}>{RES_LABEL[b.status] ?? b.status}</span></td>
                          <td className="text-muted">{shortDate(b.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Revenue summary (by currency) */}
            <div className="ds-card-p">
              <SectionHead icon={<TrendingUp size={16} strokeWidth={2} />} title="ملخص الإيرادات (حسب العملة)" linkHref="/platform/subscriptions" linkLabel="الاشتراكات" />
              {data.revenue.length === 0 ? (
                <p className="pf-empty-inline">لا توجد بيانات إيرادات حتى الآن.</p>
              ) : (
                <div className="pf-revenue-grid">
                  {data.revenue.map(r => (
                    <div key={r.currency} className="pf-revenue-card">
                      <p className="pf-revenue-title">{currencyLabel(r.currency)} ({r.currency})</p>
                      <div className="pf-revenue-row">
                        <span className="text-muted">مدفوع ({r.count_paid} اشتراك)</span>
                        <span className="text-success pf-cell-title">{fmt(r.total_paid)} {r.currency}</span>
                      </div>
                      <div className="pf-revenue-row">
                        <span className="text-muted">غير مدفوع ({r.count_unpaid} اشتراك)</span>
                        <span className="text-danger pf-cell-title">{fmt(r.total_unpaid + r.total_partial)} {r.currency}</span>
                      </div>
                      <div className="pf-revenue-total">
                        <span>الإجمالي المتوقع</span>
                        <span>{fmt(r.total_paid + r.total_unpaid + r.total_partial)} {r.currency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent subscription requests ───────────────────────── */}
          <div className="ds-card-p">
            <SectionHead icon={<FileText size={16} strokeWidth={2} />} title="أحدث طلبات الاشتراك" count={data.recent_requests.length} linkHref="/platform/subscription-requests" linkLabel="إدارة الطلبات" />
            {data.recent_requests.length === 0 ? (
              <p className="pf-empty-inline">لا توجد طلبات حتى الآن.</p>
            ) : (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead><tr><th>الفندق</th><th>الباقة</th><th>مقدم الطلب</th><th>الحالة</th><th>التاريخ</th><th>إجراء سريع</th></tr></thead>
                  <tbody>
                    {data.recent_requests.map(req => (
                      <tr key={req.id}>
                        <td className="pf-cell-title">{req.hotel_name}</td>
                        <td>{req.package_name ?? <span className="text-muted">—</span>}</td>
                        <td className="text-muted">{req.requested_by_name || "—"}</td>
                        <td><span className={REQ_BADGE[req.status] ?? "ds-badge ds-badge-neutral"}>{REQ_LABEL[req.status] ?? req.status}</span></td>
                        <td className="text-muted">{shortDate(req.created_at)}</td>
                        <td>
                          {req.status === "pending" ? (
                            <div className="table-actions">
                              <button className="ds-btn ds-btn-success ds-btn-sm" onClick={() => quickApprove(req.id)} disabled={actingId === req.id}>قبول</button>
                              <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={() => quickReject(req.id)} disabled={actingId === req.id}>رفض</button>
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Subscriptions ending soon ──────────────────────────── */}
          {data.ending_soon.length > 0 && (
            <div className="ds-card-p">
              <SectionHead icon={<Clock size={16} strokeWidth={2} />} title="اشتراكات تنتهي قريباً" count={data.ending_soon.length} linkHref="/platform/subscriptions" linkLabel="إدارة الاشتراكات" />
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead><tr><th>الفندق</th><th>الباقة</th><th>تاريخ الانتهاء</th><th>المتبقي</th><th>المبلغ</th><th>الدفع</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {data.ending_soon.map(sub => (
                      <tr key={sub.id}>
                        <td className="pf-cell-title">{sub.hotel_name}</td>
                        <td>{sub.package_name ?? <span className="text-muted">—</span>}</td>
                        <td className="text-muted">{sub.end_date ? shortDate(sub.end_date) : "—"}</td>
                        <td>{sub.remaining_days !== null ? (
                          <span className={`ds-badge ${sub.remaining_days <= 7 ? "ds-badge-danger" : "ds-badge-warning"}`}>{sub.remaining_days} يوم</span>
                        ) : "—"}</td>
                        <td>{sub.monthly_amount > 0 ? `${fmt(sub.monthly_amount)} ${sub.currency}` : <span className="text-muted">—</span>}</td>
                        <td><span className={PAY_BADGE[sub.payment_status] ?? "ds-badge ds-badge-neutral"}>{PAY_LABEL[sub.payment_status] ?? sub.payment_status}</span></td>
                        <td><span className={SUB_BADGE[sub.status] ?? "ds-badge ds-badge-neutral"}>{SUB_LABEL[sub.status] ?? sub.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Hotel status (2-col) ───────────────────────────────── */}
          <div className="pf-two-col">
            <div className="ds-card-p">
              <SectionHead icon={<BarChart3 size={16} strokeWidth={2} />} title="توزيع حالة الفنادق" linkHref="/platform/hotels" linkLabel="إدارة الفنادق" />
              {bd && kpis && kpis.hotels_total > 0 ? (
                <div className="pf-progress-list">
                  {[
                    { label: "فعالة", value: bd.active, color: "var(--color-success)" },
                    { label: "تجريبية", value: bd.trial, color: "var(--color-primary)" },
                    { label: "موقوفة", value: bd.suspended, color: "var(--color-danger)" },
                    { label: "منتهي الاشتراك", value: bd.expired, color: "var(--color-warning)" },
                    { label: "بلا اشتراك", value: bd.without_subscription, color: "var(--color-muted)" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="pf-progress-head">
                        <span className="text-muted">{row.label}</span>
                        <span className="pf-progress-val">{row.value} / {kpis.hotels_total}</span>
                      </div>
                      <ProgressBar value={row.value} max={kpis.hotels_total} color={row.color} />
                    </div>
                  ))}
                </div>
              ) : <p className="pf-empty-inline">لا توجد فنادق مسجلة.</p>}
            </div>

            <div className="ds-card-p">
              <SectionHead icon={<Building2 size={16} strokeWidth={2} />} title="أحدث الفنادق المضافة" count={data.recent_hotels.length} linkHref="/platform/hotels" linkLabel="جميع الفنادق" />
              {data.recent_hotels.length === 0 ? (
                <p className="pf-empty-inline">لا توجد فنادق.</p>
              ) : (
                <div className="ds-table-wrap">
                  <table className="ds-table">
                    <thead><tr><th>الفندق</th><th>الحالة</th><th>الاشتراك</th></tr></thead>
                    <tbody>
                      {data.recent_hotels.map(h => (
                        <tr key={h.id}>
                          <td>
                            <div className="pf-cell-title">{h.name}</div>
                            <div className="pf-mini-meta">{h.city || "—"}</div>
                          </td>
                          <td><span className={HOTEL_BADGE[h.status] ?? "ds-badge ds-badge-neutral"}>{HOTEL_LABEL[h.status] ?? h.status}</span></td>
                          <td>{h.subscription_status ? (
                            <span className={SUB_BADGE[h.subscription_status] ?? "ds-badge ds-badge-neutral"}>{SUB_LABEL[h.subscription_status] ?? h.subscription_status}</span>
                          ) : <span className="text-muted">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Package distribution ───────────────────────────────── */}
          {data.package_distribution.length > 0 && (
            <div className="ds-card-p">
              <SectionHead icon={<Layers size={16} strokeWidth={2} />} title="توزيع الباقات" count={data.package_distribution.length} linkHref="/platform/packages" linkLabel="إدارة الباقات" />
              <div className="pf-progress-list">
                {data.package_distribution.map(pkg => (
                  <div key={pkg.id} className="pf-pkg-row">
                    <div className="pf-pkg-name">
                      <div className="pf-pkg-title">{pkg.name}</div>
                      <div className="pf-pkg-meta">
                        <span className={PKG_STATUS_BADGE[pkg.status] ?? "ds-badge ds-badge-neutral"}>{PKG_STATUS_LABEL[pkg.status] ?? pkg.status}</span>
                        {pkg.price_monthly !== null && <span className="pf-mini-meta">{fmt(pkg.price_monthly)}/شهر</span>}
                      </div>
                    </div>
                    <ProgressBar value={pkg.subscription_count} max={Math.max(maxPkgSubs, 1)} color="var(--color-primary)" />
                    <span className="pf-pkg-count">{pkg.subscription_count}</span>
                    <span className="pf-mini-meta">اشتراك</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Platform health ────────────────────────────────────── */}
          {healthChecks.length > 0 && (
            <div className="ds-card-p">
              <SectionHead icon={<Settings size={16} strokeWidth={2} />} title="صحة إعدادات المنصة" linkHref="/platform/settings" linkLabel="فتح الإعدادات" />
              {healthOk ? (
                <div className="ds-alert ds-alert-success"><CheckCircle2 size={15} strokeWidth={2.5} /> جميع إعدادات المنصة مكتملة ومضبوطة.</div>
              ) : (
                <div className="ds-alert ds-alert-warning"><AlertTriangle size={15} strokeWidth={2.5} /> بعض الإعدادات تحتاج إلى ضبط لتكتمل هوية المنصة.</div>
              )}
              <div className="pf-health-grid">
                {healthChecks.map((h, i) => (
                  <div key={i} className={`pf-health-chip ${h.ok ? "ok" : "warn"}`}>
                    {h.ok ? <CheckCircle2 size={15} strokeWidth={2.5} /> : <XCircle size={15} strokeWidth={2.5} />}
                    <span>{h.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
