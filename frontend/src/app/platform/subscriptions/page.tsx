"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X, Pencil, RefreshCw, PlayCircle, PauseCircle, FileBarChart } from "lucide-react";
import { BASE_URL as API_BASE, getAuthHeaders, getAuthJsonHeaders } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

interface HotelOption  { id: number; name: string; }
interface PackageOption { id: number; name: string; }

interface Subscription {
  id: number;
  hotel: number;
  hotel_name: string;
  package: number | null;
  package_name: string | null;
  status: "trial" | "active" | "expired" | "suspended" | "not_set";
  payment_status: "paid" | "unpaid" | "partial";
  start_date: string | null;
  end_date: string | null;
  monthly_amount: string | number;
  currency: string;
  notes: string;
  remaining_days: number | null;
  created_at: string;
  updated_at: string;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */
function isEndingSoon(end_date: string | null): boolean {
  if (!end_date) return false;
  const diff = (new Date(end_date).getTime() - Date.now()) / 86_400_000;
  return diff >= 0 && diff <= 30;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-SA");
}

function fmtAmount(amount: string | number, currency: string) {
  if (!amount && amount !== 0) return "—";
  return `${Number(amount).toLocaleString("en-US")} ${currency || "ر.س"}`;
}

/* ── badge maps ───────────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  active:    "فعال",
  trial:     "تجريبي",
  expired:   "منتهي",
  suspended: "موقوف",
  not_set:   "غير مضبوط",
};
const STATUS_BADGE: Record<string, string> = {
  active:    "ds-badge ds-badge-success",
  trial:     "ds-badge ds-badge-info",
  expired:   "ds-badge ds-badge-danger",
  suspended: "ds-badge ds-badge-neutral",
  not_set:   "ds-badge ds-badge-neutral",
};
const PAYMENT_LABEL: Record<string, string> = {
  paid:    "مدفوع",
  unpaid:  "غير مدفوع",
  partial: "جزئي",
};
const PAYMENT_BADGE: Record<string, string> = {
  paid:    "ds-badge ds-badge-success",
  unpaid:  "ds-badge ds-badge-warning",
  partial: "ds-badge ds-badge-info",
};

/* ── RenewModal ───────────────────────────────────────────────────────────── */
function RenewModal({
  sub, onClose, onDone,
}: { sub: Subscription; onClose: () => void; onDone: (msg: string) => void }) {
  const { t } = useLang();
  const [months,  setMonths]  = useState(1);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  async function handle() {
    if (months < 1 || months > 60) return setErr(t("عدد الأشهر يجب أن يكون بين 1 و 60"));
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${sub.id}/renew/`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.error || t("فشل تجديد الاشتراك"));
      }
      onDone(`${t("تم تجديد اشتراك")} "${sub.hotel_name}" ${t("بنجاح لمدة")} ${months} ${months === 1 ? t("شهر") : t("أشهر")}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t("حدث خطأ"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className="ds-modal-card narrow" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h2>{t("تجديد الاشتراك")}</h2>
          <button className="icon-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div className="ds-modal-body">
          <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
            {t("الفندق")}: <strong style={{ color: "var(--color-heading)" }}>{sub.hotel_name}</strong>
            {sub.package_name && <> — {t("الباقة")}: <strong>{sub.package_name}</strong></>}
          </p>
          {sub.end_date && (
            <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
              {t("تاريخ الانتهاء الحالي")}: <strong>{fmtDate(sub.end_date)}</strong>
              {sub.remaining_days !== null && sub.remaining_days >= 0 && (
                <span style={{ color: "var(--color-warning)", marginRight: "0.5rem" }}>
                  ({sub.remaining_days} {t("يوم متبقٍ")})
                </span>
              )}
            </p>
          )}
          <div className="field">
            <label className="field-label">{t("عدد الأشهر (1 – 60)")}</label>
            <input className="input" type="number" min={1} max={60} value={months}
              onChange={e => setMonths(Number(e.target.value))} autoFocus />
          </div>
          {err && <div className="ds-alert ds-alert-danger" style={{ marginTop: "0.75rem" }}>{err}</div>}
        </div>
        <div className="ds-modal-foot">
          <button className="ds-btn ds-btn-neutral" onClick={onClose} disabled={loading}>{t("إلغاء")}</button>
          <button className="ds-btn ds-btn-success" onClick={handle} disabled={loading || months < 1}>
            {loading ? t("جارٍ التجديد...") : t("تجديد")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── EditSubModal ─────────────────────────────────────────────────────────── */
function EditSubModal({
  sub, packages, onClose, onDone,
}: { sub: Subscription; packages: PackageOption[]; onClose: () => void; onDone: (msg: string) => void }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    package:        sub.package ?? "",
    status:         sub.status,
    payment_status: sub.payment_status,
    monthly_amount: String(sub.monthly_amount ?? "0"),
    currency:       sub.currency || "SAR",
    start_date:     sub.start_date ?? "",
    end_date:       sub.end_date   ?? "",
    notes:          sub.notes      ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  async function handle() {
    setLoading(true); setErr("");
    try {
      const body = {
        ...form,
        package:        form.package        || null,
        start_date:     form.start_date     || null,
        end_date:       form.end_date       || null,
        monthly_amount: Number(form.monthly_amount),
      };
      const res = await fetch(`${API_BASE}/subscriptions/${sub.id}/`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.error || t("فشل التعديل"));
      }
      onDone(`${t("تم تحديث اشتراك")} "${sub.hotel_name}" ${t("بنجاح")}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t("حدث خطأ"));
    } finally {
      setLoading(false);
    }
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className="ds-modal-card wide" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h2>{t("تعديل الاشتراك")} — {sub.hotel_name}</h2>
          <button className="icon-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div className="ds-modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem" }}>
            <div className="field">
              <label className="field-label">{t("الباقة")}</label>
              <select className="select" value={form.package} onChange={f("package")}>
                <option value="">{t("— بدون باقة —")}</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("الحالة")}</label>
              <select className="select" value={form.status} onChange={f("status")}>
                <option value="trial">{t("تجريبي")}</option>
                <option value="active">{t("فعال")}</option>
                <option value="expired">{t("منتهي")}</option>
                <option value="suspended">{t("موقوف")}</option>
                <option value="not_set">{t("غير مضبوط")}</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("حالة الدفع")}</label>
              <select className="select" value={form.payment_status} onChange={f("payment_status")}>
                <option value="unpaid">{t("غير مدفوع")}</option>
                <option value="paid">{t("مدفوع")}</option>
                <option value="partial">{t("جزئي")}</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("المبلغ الشهري")}</label>
              <input className="input" type="number" min={0} step="0.01"
                value={form.monthly_amount} onChange={f("monthly_amount")} />
            </div>
            <div className="field">
              <label className="field-label">{t("العملة")}</label>
              <select className="select" value={form.currency} onChange={f("currency")}>
                <option value="SAR">{t("ريال سعودي (SAR)")}</option>
                <option value="USD">{t("دولار (USD)")}</option>
                <option value="AED">{t("درهم (AED)")}</option>
                <option value="KWD">{t("دينار كويتي (KWD)")}</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("تاريخ البداية")}</label>
              <input className="input" type="date" value={form.start_date} onChange={f("start_date")} />
            </div>
            <div className="field">
              <label className="field-label">{t("تاريخ الانتهاء")}</label>
              <input className="input" type="date" value={form.end_date} onChange={f("end_date")} />
            </div>
          </div>
          <div className="field" style={{ marginTop: "1rem" }}>
            <label className="field-label">{t("ملاحظات")}</label>
            <textarea className="textarea" rows={2} value={form.notes} onChange={f("notes")} />
          </div>
          {err && <div className="ds-alert ds-alert-danger" style={{ marginTop: "0.75rem" }}>{err}</div>}
        </div>
        <div className="ds-modal-foot">
          <button className="ds-btn ds-btn-neutral" onClick={onClose} disabled={loading}>{t("إلغاء")}</button>
          <button className="ds-btn ds-btn-primary" onClick={handle} disabled={loading}>
            {loading ? t("جارٍ الحفظ...") : t("حفظ التعديلات")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── CreateSubModal ───────────────────────────────────────────────────────── */
function CreateSubModal({
  hotels, packages, onClose, onDone,
}: { hotels: HotelOption[]; packages: PackageOption[]; onClose: () => void; onDone: (msg: string) => void }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    hotel:          "",
    package:        "",
    status:         "trial",
    payment_status: "unpaid",
    monthly_amount: "0",
    currency:       "SAR",
    start_date:     "",
    end_date:       "",
    notes:          "",
  });
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  async function handle() {
    if (!form.hotel) return setErr(t("اختر الفندق أولاً"));
    setLoading(true); setErr("");
    try {
      const body = {
        hotel:          Number(form.hotel),
        package:        form.package    ? Number(form.package) : null,
        status:         form.status,
        payment_status: form.payment_status,
        monthly_amount: Number(form.monthly_amount),
        currency:       form.currency,
        start_date:     form.start_date || null,
        end_date:       form.end_date   || null,
        notes:          form.notes,
      };
      const res = await fetch(`${API_BASE}/subscriptions/create_for_hotel/`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || data?.detail || t("فشل إنشاء الاشتراك"));
      }
      const hotelName = hotels.find(h => h.id === Number(form.hotel))?.name ?? "";
      onDone(`${t("تم إنشاء اشتراك")} "${hotelName}" ${t("بنجاح")}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t("حدث خطأ"));
    } finally {
      setLoading(false);
    }
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className="ds-modal-card wide" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h2>{t("إنشاء اشتراك جديد")}</h2>
          <button className="icon-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div className="ds-modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem" }}>
            <div className="field">
              <label className="field-label">{t("الفندق *")}</label>
              <select className="select" value={form.hotel} onChange={f("hotel")} autoFocus>
                <option value="">{t("— اختر الفندق —")}</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("الباقة")}</label>
              <select className="select" value={form.package} onChange={f("package")}>
                <option value="">{t("— بدون باقة —")}</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("الحالة")}</label>
              <select className="select" value={form.status} onChange={f("status")}>
                <option value="trial">{t("تجريبي")}</option>
                <option value="active">{t("فعال")}</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("حالة الدفع")}</label>
              <select className="select" value={form.payment_status} onChange={f("payment_status")}>
                <option value="unpaid">{t("غير مدفوع")}</option>
                <option value="paid">{t("مدفوع")}</option>
                <option value="partial">{t("جزئي")}</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("المبلغ الشهري")}</label>
              <input className="input" type="number" min={0} step="0.01"
                value={form.monthly_amount} onChange={f("monthly_amount")} />
            </div>
            <div className="field">
              <label className="field-label">{t("العملة")}</label>
              <select className="select" value={form.currency} onChange={f("currency")}>
                <option value="SAR">{t("ريال سعودي (SAR)")}</option>
                <option value="USD">{t("دولار (USD)")}</option>
                <option value="AED">{t("درهم (AED)")}</option>
                <option value="KWD">{t("دينار كويتي (KWD)")}</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">{t("تاريخ البداية")}</label>
              <input className="input" type="date" value={form.start_date} onChange={f("start_date")} />
            </div>
            <div className="field">
              <label className="field-label">{t("تاريخ الانتهاء")}</label>
              <input className="input" type="date" value={form.end_date} onChange={f("end_date")} />
            </div>
          </div>
          <div className="field" style={{ marginTop: "1rem" }}>
            <label className="field-label">{t("ملاحظات")}</label>
            <textarea className="textarea" rows={2} value={form.notes} onChange={f("notes")} />
          </div>
          {err && <div className="ds-alert ds-alert-danger" style={{ marginTop: "0.75rem" }}>{err}</div>}
        </div>
        <div className="ds-modal-foot">
          <button className="ds-btn ds-btn-neutral" onClick={onClose} disabled={loading}>{t("إلغاء")}</button>
          <button className="ds-btn ds-btn-primary" onClick={handle} disabled={loading}>
            {loading ? t("جارٍ الإنشاء...") : t("إنشاء الاشتراك")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── SubscriptionsPage ────────────────────────────────────────────────────── */
function SubscriptionsPage() {
  const { t } = useLang();
  const sp = useSearchParams();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatusFilter] = useState(() => sp.get("status") ?? "all");
  const [renewTarget,    setRenewTarget]    = useState<Subscription | null>(null);
  const [editTarget,     setEditTarget]     = useState<Subscription | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);
  const [, setCancelling]   = useState<number | null>(null);
  const [, setActivatingId] = useState<number | null>(null);
  const [hotelOptions,   setHotelOptions]   = useState<HotelOption[]>([]);
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function fetchSubscriptions() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/subscriptions/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(t("فشل تحميل الاشتراكات"));
      const data = await res.json();
      setSubscriptions(Array.isArray(data) ? data : data.results ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("حدث خطأ"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
    fetchSubscriptions();
    fetch(`${API_BASE}/hotels/`,   { headers: getAuthHeaders() }).then(r => r.json()).then(d => setHotelOptions(Array.isArray(d) ? d.map((h: {id:number;name:string}) => ({id:h.id,name:h.name})) : [])).catch(() => {});
    fetch(`${API_BASE}/packages/`, { headers: getAuthHeaders() }).then(r => r.json()).then(d => setPackageOptions(Array.isArray(d) ? d.filter((p: {status:string}) => p.status === "active").map((p: {id:number;name:string}) => ({id:p.id,name:p.name})) : [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleActivateTrial(sub: Subscription) {
    setActivatingId(sub.id);
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${sub.id}/activate_trial/`, {
        method: "POST", headers: getAuthJsonHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t("فشل التفعيل"));
      }
      showToast(`${t("تم تفعيل اشتراك")} "${sub.hotel_name}"`);
      fetchSubscriptions();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : t("حدث خطأ"), "error");
    } finally {
      setActivatingId(null);
    }
  }

  async function handleCancel(sub: Subscription) {
    if (!confirm(`${t("هل تريد إيقاف اشتراك")} "${sub.hotel_name}"؟`)) return;
    setCancelling(sub.id);
    try {
      const res = await fetch(`${API_BASE}/subscriptions/${sub.id}/cancel/`, {
        method: "POST", headers: getAuthJsonHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t("فشل الإيقاف"));
      }
      showToast(`${t("تم إيقاف اشتراك")} "${sub.hotel_name}"`);
      fetchSubscriptions();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : t("حدث خطأ"), "error");
    } finally {
      setCancelling(null);
    }
  }

  /* stats */
  const totalCount    = subscriptions.length;
  const activeCount   = subscriptions.filter(s => s.status === "active").length;
  const trialCount    = subscriptions.filter(s => s.status === "trial").length;
  const expiredCount  = subscriptions.filter(s => s.status === "expired").length;

  /* filter */
  const filtered = subscriptions.filter(s => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      s.hotel_name.toLowerCase().includes(q) ||
      (s.package_name ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  function handleRenewDone(msg: string) {
    setRenewTarget(null);
    showToast(msg);
    fetchSubscriptions();
  }

  function handleEditDone(msg: string) {
    setEditTarget(null);
    showToast(msg);
    fetchSubscriptions();
  }

  function handleCreateDone(msg: string) {
    setShowCreate(false);
    showToast(msg);
    fetchSubscriptions();
  }

  return (
    <div className="ds-page" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="ds-toast-stack">
          <div className={`ds-toast ds-toast-${toast.type === "success" ? "success" : "error"}`}>
            <span>{toast.msg}</span>
            <button className="ds-toast-close" onClick={() => setToast(null)}><X size={14} strokeWidth={2.5} /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{t("الاشتراكات")}</h1>
          <p>{t("إدارة اشتراكات الفنادق ومتابعة حالتها وتجديدها")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={fetchSubscriptions}>
            {t("تحديث")}
          </button>
          <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={() => setShowCreate(true)}>
            + {t("إنشاء اشتراك")}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="pf-grid-3">
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("إجمالي الاشتراكات")}</p>
          <p className="ds-summary-value">{totalCount}</p>
          <p className="ds-summary-note">{t("جميع الاشتراكات")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("فعالة")}</p>
          <p className="ds-summary-value text-success">{activeCount}</p>
          <p className="ds-summary-note">{t("اشتراكات نشطة")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("تجريبية")}</p>
          <p className="ds-summary-value text-primary">{trialCount}</p>
          <p className="ds-summary-note">{t("في فترة التجربة")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("منتهية")}</p>
          <p className="ds-summary-value text-danger">{expiredCount}</p>
          <p className="ds-summary-note">{t("انتهت صلاحيتها")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="ds-filters">
        <input
          className="input"
          placeholder={t("بحث باسم الفندق أو الباقة...")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ width: 160 }}>
          <option value="all">{t("كل الحالات")}</option>
          <option value="active">{t("فعال")}</option>
          <option value="trial">{t("تجريبي")}</option>
          <option value="expired">{t("منتهي")}</option>
          <option value="suspended">{t("موقوف")}</option>
          <option value="not_set">{t("غير مضبوط")}</option>
        </select>
      </div>

      {/* Cards */}
      {loading && <div className="ds-card-p"><p className="text-muted">{t("جارٍ التحميل...")}</p></div>}
      {error   && <div className="ds-card-p"><div className="ds-alert ds-alert-danger">{error}</div></div>}
      {!loading && !error && (
        filtered.length === 0 ? (
          <div className="ds-card-p"><p className="pf-empty-inline">{t("لا توجد اشتراكات")}</p></div>
        ) : (
          <div className="pf-entity-grid">
            {filtered.map(sub => (
              <div key={sub.id} className="pf-entity-card">
                <div className="pf-entity-head">
                  <div>
                    <div className="pf-entity-title">{sub.hotel_name}</div>
                    <div className="pf-entity-sub">{sub.package_name ?? "—"}</div>
                  </div>
                  <div className="pf-entity-badges">
                    <span className={STATUS_BADGE[sub.status] ?? "ds-badge ds-badge-neutral"}>
                      {STATUS_LABEL[sub.status] ? t(STATUS_LABEL[sub.status]) : sub.status}
                    </span>
                    {sub.end_date && isEndingSoon(sub.end_date) && sub.status === "active" && (
                      <span className="ds-badge ds-badge-warning">{t("تنتهي قريباً")}</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="pf-kv">
                    <span className="pf-kv-label">{t("الدفع")}</span>
                    <span className="pf-kv-value">
                      <span className={PAYMENT_BADGE[sub.payment_status] ?? "ds-badge ds-badge-neutral"}>
                        {PAYMENT_LABEL[sub.payment_status] ? t(PAYMENT_LABEL[sub.payment_status]) : sub.payment_status}
                      </span>
                    </span>
                  </div>
                  <div className="pf-kv">
                    <span className="pf-kv-label">{t("المبلغ الشهري")}</span>
                    <span className="pf-kv-value">{fmtAmount(sub.monthly_amount, sub.currency)}</span>
                  </div>
                  <div className="pf-kv">
                    <span className="pf-kv-label">{t("تاريخ الانتهاء")}</span>
                    <span className="pf-kv-value">{fmtDate(sub.end_date)}</span>
                  </div>
                  <div className="pf-kv">
                    <span className="pf-kv-label">{t("المتبقّي")}</span>
                    <span className="pf-kv-value">
                      {sub.remaining_days !== null
                        ? <span className={`pf-strong ${sub.remaining_days <= 7 ? "text-danger" : sub.remaining_days <= 30 ? "text-warning" : "text-success"}`}>
                            {sub.remaining_days > 0 ? `${sub.remaining_days} ${t("يوم")}` : t("منتهي")}
                          </span>
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="pf-entity-actions">
                  <button onClick={() => setEditTarget(sub)} className="ds-btn ds-btn-primary ds-btn-sm"><Pencil size={14} /> {t("تعديل")}</button>
                  <button onClick={() => setRenewTarget(sub)} className="ds-btn ds-btn-success ds-btn-sm"><RefreshCw size={14} /> {t("تجديد")}</button>
                  {sub.status === "trial" && <button onClick={() => handleActivateTrial(sub)} className="ds-btn ds-btn-teal ds-btn-sm"><PlayCircle size={14} /> {t("تفعيل")}</button>}
                  {(sub.status === "active" || sub.status === "trial") && <button onClick={() => handleCancel(sub)} className="ds-btn ds-btn-warning ds-btn-sm"><PauseCircle size={14} /> {t("إيقاف")}</button>}
                  <Link href={`/platform/earnings/${sub.hotel}`} className="ds-btn ds-btn-neutral ds-btn-sm"><FileBarChart size={14} /> {t("الفندق")}</Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Renew Modal */}
      {renewTarget && (
        <RenewModal
          sub={renewTarget}
          onClose={() => setRenewTarget(null)}
          onDone={handleRenewDone}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditSubModal
          sub={editTarget}
          packages={packageOptions}
          onClose={() => setEditTarget(null)}
          onDone={handleEditDone}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateSubModal
          hotels={hotelOptions}
          packages={packageOptions}
          onClose={() => setShowCreate(false)}
          onDone={handleCreateDone}
        />
      )}
    </div>
  );
}

export default function SubscriptionsPageWrapper() {
  return <Suspense><SubscriptionsPage /></Suspense>;
}
