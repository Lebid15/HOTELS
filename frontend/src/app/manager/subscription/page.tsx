"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Check, X, Clock, Star, ClipboardList, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";

// ─── types ────────────────────────────────────────────────────────────────────
interface Package {
  id: number;
  name: string;
  description: string;
  duration_days: number;
  price: string | number;
  currency: string;
  max_users: number;
  max_rooms: number;
  restaurant_support: boolean;
  reports_support: boolean;
  trial_support: boolean;
  status: string;
}

interface Subscription {
  id: number;
  hotel: number;
  hotel_name: string;
  package: number | null;
  package_name: string | null;
  status: string;
  payment_status: string;
  start_date: string | null;
  end_date: string | null;
  monthly_amount: string | number | null;
  currency: string;
  remaining_days: number | null;
}

interface SubRequest {
  id: number;
  hotel: number;
  hotel_name: string;
  package: number | null;
  package_name: string | null;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function parseRequestType(notes: string, t: (s: string) => string): string {
  if (!notes) return t("تغيير باقة");
  if (notes.startsWith("نوع:تجديد")) return t("تجديد");
  if (notes.startsWith("نوع:تمديد")) return t("تمديد");
  return t("تغيير باقة");
}

function RemainingBadge({ days, t }: { days: number | null; t: (s: string) => string }) {
  if (days === null) return <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>{t("لا يوجد تاريخ انتهاء")}</span>;
  if (days < 0)  return <span style={{ background: "#fef2f2", color: "#dc2626", padding: "0.2rem 0.6rem", borderRadius: "1rem", fontSize: "0.75rem", fontWeight: 700 }}>{t("منتهي")}</span>;
  if (days === 0) return <span style={{ background: "#fef2f2", color: "#dc2626", padding: "0.2rem 0.6rem", borderRadius: "1rem", fontSize: "0.75rem", fontWeight: 700 }}>{t("ينتهي اليوم")}</span>;
  if (days <= 3)  return <span style={{ background: "#fffbeb", color: "#d97706", padding: "0.2rem 0.6rem", borderRadius: "1rem", fontSize: "0.75rem", fontWeight: 700 }}>{t("باقي {days} أيام").replace("{days}", String(days))}</span>;
  return <span style={{ background: "#ecfdf5", color: "#059669", padding: "0.2rem 0.6rem", borderRadius: "1rem", fontSize: "0.75rem", fontWeight: 700 }}>{t("باقي {days} يومًا").replace("{days}", String(days))}</span>;
}

function FeatureChip({ yes, label }: { yes: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.25rem",
      padding: "0.2rem 0.55rem", borderRadius: "1rem", fontSize: "0.72rem", fontWeight: 600,
      background: yes ? "#f0fdf4" : "#f9fafb",
      color: yes ? "#15803d" : "#9ca3af",
      border: `1px solid ${yes ? "#bbf7d0" : "#e5e7eb"}`,
    }}>
      {yes ? <Check size={11} strokeWidth={2.5}/> : <X size={11} strokeWidth={2.5}/>} {label}
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const { t, lang } = useLang();

  const SUB_STATUS: Record<string, { label: string; bg: string; color: string }> = {
    trial:    { label: t("تجريبي"),   bg: "#eff6ff", color: "#1d4ed8" },
    active:   { label: t("نشط"),      bg: "#ecfdf5", color: "#059669" },
    expired:  { label: t("منتهي"),   bg: "#fef2f2", color: "#dc2626" },
    suspended:{ label: t("موقوف"),   bg: "#fff7ed", color: "#c2410c" },
    not_set:  { label: t("غير محدد"), bg: "#f3f4f6", color: "#6b7280" },
  };

  const PAY_STATUS: Record<string, { label: string; color: string }> = {
    paid:    { label: t("مدفوع"),     color: "#059669" },
    unpaid:  { label: t("غير مدفوع"), color: "#dc2626" },
    partial: { label: t("جزئي"),     color: "#d97706" },
  };

  const REQ_STATUS: Record<string, { label: string; bg: string; color: string }> = {
    pending:  { label: t("قيد الانتظار"), bg: "#fffbeb", color: "#d97706" },
    approved: { label: t("مقبول"),        bg: "#ecfdf5", color: "#059669" },
    rejected: { label: t("مرفوض"),       bg: "#fef2f2", color: "#dc2626" },
  };

  const PKG_STATUS: Record<string, { label: string; bg: string; color: string }> = {
    active:   { label: t("نشطة"),    bg: "#ecfdf5", color: "#059669" },
    suspended:{ label: t("موقوفة"),  bg: "#fff7ed", color: "#c2410c" },
    archived: { label: t("مؤرشفة"),  bg: "#f3f4f6", color: "#6b7280" },
  };

  const hotelId   = typeof window !== "undefined" ? parseInt(localStorage.getItem("hotel_id") ?? "0", 10) : 0;
  const [packages,    setPackages]    = useState<Package[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [requests,    setRequests]    = useState<SubRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState("");
  const [sending,     setSending]     = useState<number | "renew" | null>(null);

  // load all data
  const load = useCallback(async () => {
    setLoading(true);
    const h = apiH();
    const [pkgs, subs, reqs] = await Promise.all([
      fetch(`${API}/packages/`, { headers: h }).then(r => r.ok ? r.json() as Promise<Package[]> : []).catch((): Package[] => []),
      fetch(`${API}/subscriptions/`, { headers: h }).then(r => r.ok ? r.json() as Promise<Subscription[]> : []).catch((): Subscription[] => []),
      fetch(`${API}/subscription-requests/`, { headers: h }).then(r => r.ok ? r.json() as Promise<SubRequest[]> : []).catch((): SubRequest[] => []),
    ]);
    setPackages(pkgs);
    // find this hotel's subscription
    const mySub = (subs as Subscription[]).find(s => s.hotel === hotelId) ?? null;
    setSubscription(mySub);
    // filter requests for this hotel
    setRequests((reqs as SubRequest[]).filter(r => r.hotel === hotelId));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { const exec = async () => { await load(); }; exec(); }, [load]);

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // derived
  const visiblePackages = useMemo(() => packages.filter(p => p.status !== "archived"), [packages]);

  // find pending requests for a package
  const pendingForPackage = useCallback((pkgId: number) =>
    requests.find(r => r.package === pkgId && r.status === "pending"),
  [requests]);

  const pendingRenew = useMemo(() =>
    subscription?.package
      ? requests.find(r => r.package === subscription.package && r.status === "pending" && r.notes.startsWith("نوع:تجديد"))
      : undefined,
  [requests, subscription]);

  // renewal window: last 3 days or expired
  const canRenew = useMemo(() => {
    if (!subscription) return false;
    const days = subscription.remaining_days;
    if (days === null) return false;
    return days <= 3;
  }, [subscription]);

  // send change request
  async function sendChangeRequest(pkg: Package) {
    if (!hotelId || sending !== null) return;
    // duplicate check
    if (pendingForPackage(pkg.id)) {
      setToast(t("تم إرسال طلب لهذه الباقة سابقًا ولا يمكن إرسال طلب آخر لنفس الباقة."));
      return;
    }
    setSending(pkg.id);
    const body = {
      hotel: hotelId,
      package: pkg.id,
      status: "pending",
      notes: `نوع:تغيير\nالباقة المطلوبة: ${pkg.name}\nالباقة الحالية: ${subscription?.package_name ?? "—"}`,
    };
    const res = await fetch(`${API}/subscription-requests/`, { method: "POST", headers: apiHJ(), body: JSON.stringify(body) })
      .catch(() => null);
    if (res?.ok) {
      await load();
      setToast(t("تم إرسال الطلب لصاحب المنصة"));
    } else {
      setToast(t("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى."));
    }
    setSending(null);
  }

  // send renew request
  async function sendRenewRequest() {
    if (!hotelId || !subscription?.package || sending !== null) return;
    if (!canRenew) {
      setToast(t("لا يمكن طلب التجديد أو التمديد الآن لأن حسابك ما زال فعالًا. يتفعل الطلب قبل 3 أيام من انتهاء الاشتراك فقط. يمكنك تغيير الباقة في أي وقت."));
      return;
    }
    if (pendingRenew) {
      setToast(t("تم إرسال طلب تجديد سابقًا ولا يمكن إرسال طلب تجديد آخر لنفس الباقة."));
      return;
    }
    setSending("renew");
    const body = {
      hotel: hotelId,
      package: subscription.package,
      status: "pending",
      notes: `نوع:تجديد\nالباقة الحالية: ${subscription.package_name ?? "—"}`,
    };
    const res = await fetch(`${API}/subscription-requests/`, { method: "POST", headers: apiHJ(), body: JSON.stringify(body) })
      .catch(() => null);
    if (res?.ok) {
      await load();
      setToast(t("تم إرسال طلب التجديد لصاحب المنصة"));
    } else {
      setToast(t("حدث خطأ أثناء إرسال الطلب."));
    }
    setSending(null);
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  const subSt  = SUB_STATUS[subscription?.status ?? "not_set"] ?? SUB_STATUS.not_set;
  const paySt  = PAY_STATUS[subscription?.payment_status ?? "unpaid"] ?? PAY_STATUS.unpaid;

  return (
    <div className="ds-page" dir="rtl">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff",
          padding: "0.7rem 1.5rem", borderRadius: "0.5rem",
          fontWeight: 600, fontSize: "0.875rem",
          boxShadow: "0 4px 16px #0003", zIndex: 9999,
        }}>
          {toast}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.75rem", color: "#4f46e5", fontWeight: 600, marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("لوحة التحكم")}
          </p>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>{t("الاشتراك والباقات")}</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280", marginTop: "0.2rem" }}>
            {t("تابع الباقة المفعلة على فندقك واطلب تمديد أو تجديد أو تغيير الباقة من نفس الصفحة.")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.75rem", padding: "0.5rem 1rem", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1d4ed8" }}>{visiblePackages.length}</p>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "#6b7280" }}>{t("باقة")}</p>
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.75rem", padding: "0.5rem 1rem", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#15803d" }}>{requests.length}</p>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "#6b7280" }}>{t("طلب")}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="ds-card-p" style={{ textAlign: "center", padding: "2.5rem", color: "#9ca3af" }}>
          <Clock size={36} strokeWidth={1.2} style={{marginBottom:"0.5rem"}}/>
          <p>{t("جاري تحميل البيانات...")}</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ── Available packages ──────────────────────────────────────────── */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: "0.3rem" }}>{t("الباقات المتاحة")}</p>
            <p style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "1rem" }}>
              {t("الباقات التي يقدمها صاحب المنصة — يمكنك طلب أي باقة نشطة.")}
            </p>

            {visiblePackages.length === 0 ? (
              <div className="ds-card-p" style={{ textAlign: "center", padding: "2.5rem" }}>
                <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</p>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>{t("لا توجد باقات اشتراك بعد")}</p>
                <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>
                  {t("عندما يضيف صاحب المنصة باقات اشتراك، ستظهر هنا مباشرة على شكل كروت عروض.")}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {visiblePackages.map(pkg => {
                  const isCurrent   = subscription?.package === pkg.id;
                  const hasPending  = !!pendingForPackage(pkg.id);
                  const pkgSt       = PKG_STATUS[pkg.status] ?? PKG_STATUS.active;
                  return (
                    <div
                      key={pkg.id}
                      className="ds-card-p"
                      style={{
                        padding: "1.25rem",
                        borderTop: isCurrent ? "3px solid #4f46e5" : hasPending ? "3px solid #f59e0b" : "3px solid transparent",
                        display: "flex", flexDirection: "column", gap: "0.75rem",
                      }}
                    >
                      {/* Head */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                            📦
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{pkg.name}</p>
                            <span style={{ background: pkgSt.bg, color: pkgSt.color, borderRadius: "1rem", padding: "0.1rem 0.45rem", fontSize: "0.65rem", fontWeight: 700 }}>
                              {pkgSt.label}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                          {isCurrent  && <span style={{ background: "#eef2ff", color: "#4f46e5", borderRadius: "1rem", padding: "0.15rem 0.55rem", fontSize: "0.65rem", fontWeight: 700, whiteSpace: "nowrap" }}>{t("الباقة الحالية")}</span>}
                          {hasPending && <span style={{ background: "#fffbeb", color: "#d97706", borderRadius: "1rem", padding: "0.15rem 0.55rem", fontSize: "0.65rem", fontWeight: 700, whiteSpace: "nowrap" }}>{t("قيد الانتظار")}</span>}
                        </div>
                      </div>

                      {/* Description */}
                      {pkg.description && (
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.55 }}>{pkg.description}</p>
                      )}

                      {/* Price */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                        <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#111827" }}>{pkg.price}</span>
                        <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600 }}>{pkg.currency}</span>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>/ {t("شهر")}</span>
                      </div>

                      {/* Meta grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
                        {[
                          { label: t("المدة"), val: lang === "ar" ? `${pkg.duration_days} يوم` : `${pkg.duration_days} days` },
                          { label: t("المستخدمون"), val: pkg.max_users },
                          { label: t("الغرف"), val: pkg.max_rooms },
                        ].map(m => (
                          <div key={m.label} style={{ background: "#f9fafb", borderRadius: "0.4rem", padding: "0.35rem 0.5rem", textAlign: "center" }}>
                            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>{m.val}</p>
                            <p style={{ margin: 0, fontSize: "0.65rem", color: "#9ca3af" }}>{m.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Features */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                        <FeatureChip yes={pkg.restaurant_support} label={t("المطعم")} />
                        <FeatureChip yes={pkg.reports_support}    label={t("التقارير")} />
                        <FeatureChip yes={pkg.trial_support}      label={t("تجريبية")} />
                      </div>

                      {/* Action button */}
                      <div style={{ marginTop: "auto" }}>
                        {isCurrent ? (
                          <button disabled style={{ width: "100%", padding: "0.5rem", borderRadius: "0.4rem", border: "1px solid #a5b4fc", background: "#eef2ff", color: "#6366f1", fontWeight: 600, fontSize: "0.82rem", cursor: "default" }}>
                            {t("الباقة الحالية")}
                          </button>
                        ) : hasPending ? (
                          <button disabled style={{ width: "100%", padding: "0.5rem", borderRadius: "0.4rem", border: "1px solid #fcd34d", background: "#fffbeb", color: "#d97706", fontWeight: 600, fontSize: "0.82rem", cursor: "default" }}>
                            <CheckCircle2 size={13}/> {t("تم إرسال الطلب")}
                          </button>
                        ) : pkg.status !== "active" ? (
                          <button disabled style={{ width: "100%", padding: "0.5rem", borderRadius: "0.4rem", border: "1px solid #e5e7eb", background: "#f9fafb", color: "#9ca3af", fontWeight: 600, fontSize: "0.82rem", cursor: "not-allowed" }}>
                            {t("غير متاحة حاليًا")}
                          </button>
                        ) : (
                          <button
                            onClick={() => sendChangeRequest(pkg)}
                            disabled={sending !== null}
                            style={{
                              width: "100%", padding: "0.5rem",
                              borderRadius: "0.4rem", border: "none",
                              background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
                              color: "#fff", fontWeight: 700, fontSize: "0.82rem",
                              cursor: sending !== null ? "default" : "pointer",
                              opacity: sending === pkg.id ? 0.7 : 1,
                            }}
                          >
                            {sending === pkg.id ? t("جارٍ الإرسال...") : t("طلب هذه الباقة")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Current subscription ────────────────────────────────────────── */}
          <div className="ds-card-p" style={{ marginBottom: "1.5rem", padding: 0, overflow: "hidden" }}>
            {/* Panel head */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Star size={18} strokeWidth={1.8} color="#d97706"/>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem", color: "#111827" }}>{t("الباقة المفعلة")}</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280" }}>{subscription?.package_name ?? t("لا توجد باقة مفعلة")}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {subscription && (
                  <span style={{ background: subSt.bg, color: subSt.color, borderRadius: "1rem", padding: "0.2rem 0.7rem", fontSize: "0.72rem", fontWeight: 700 }}>
                    {subSt.label}
                  </span>
                )}
                <RemainingBadge days={subscription?.remaining_days ?? null} t={t} />
              </div>
            </div>

            {!subscription ? (
              <div style={{ textAlign: "center", padding: "2.5rem" }}>
                <ClipboardList size={36} strokeWidth={1.2} style={{marginBottom:"0.5rem",color:"#9ca3af"}}/>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>{t("لا توجد باقة مفعلة")}</p>
                <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>{t("اختر باقة من الباقات المتاحة أعلاه وأرسل طلب تفعيل.")}</p>
              </div>
            ) : (
              <div style={{ padding: "1.25rem" }}>
                {/* Renewal alert */}
                {canRenew && (
                  <div style={{
                    background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "0.5rem",
                    padding: "0.85rem 1rem", marginBottom: "1rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem", color: "#92400e" }}>
                        <AlertTriangle size={13} style={{display:"inline",marginLeft:4}}/> {lang === "ar" ? `باقي ${subscription.remaining_days !== null ? subscription.remaining_days : "—"} أيام لانتهاء الباقة` : `${subscription.remaining_days !== null ? subscription.remaining_days : "—"} days left until subscription expires`}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "#b45309", marginTop: "0.2rem" }}>
                        {t("يمكنك إرسال طلب تجديد الآن قبل انتهاء الاشتراك.")}
                      </p>
                    </div>
                    <button
                      onClick={sendRenewRequest}
                      disabled={!!pendingRenew || sending !== null}
                      style={{
                        padding: "0.4rem 1rem", borderRadius: "0.4rem",
                        border: "none",
                        background: pendingRenew ? "#fef9c3" : "#f59e0b",
                        color: pendingRenew ? "#d97706" : "#fff",
                        fontWeight: 700, fontSize: "0.82rem",
                        cursor: pendingRenew ? "default" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pendingRenew ? <><CheckCircle2 size={13}/> {t("تم إرسال طلب التجديد")}</> : sending === "renew" ? t("جارٍ...") : <><RefreshCw size={13}/> {t("تجديد الآن")}</>}
                    </button>
                  </div>
                )}

                {/* Details grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                  {[
                    { label: t("تاريخ البداية"),  val: fmtDate(subscription.start_date) },
                    { label: t("تاريخ الانتهاء"), val: fmtDate(subscription.end_date) },
                    { label: t("السعر"),           val: subscription.monthly_amount ? `${subscription.monthly_amount} ${subscription.currency}` : "—" },
                    { label: t("حالة الدفع"),     val: null, render: () => (
                        <span style={{ color: paySt.color, fontWeight: 700 }}>{paySt.label}</span>
                      )},
                  ].map(d => (
                    <div key={d.label} style={{ background: "#f9fafb", borderRadius: "0.5rem", padding: "0.6rem 0.85rem" }}>
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.2rem" }}>{d.label}</p>
                      {d.render ? d.render() : <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>{d.val}</p>}
                    </div>
                  ))}
                </div>

                {/* Features of current package */}
                {(() => {
                  const curPkg = packages.find(p => p.id === subscription.package);
                  if (!curPkg) return null;
                  return (
                    <div>
                      <p style={{ fontSize: "0.78rem", color: "#9ca3af", marginBottom: "0.5rem" }}>{t("ميزات الباقة الحالية")}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        <FeatureChip yes={curPkg.restaurant_support} label={t("دعم المطعم والكافتريا")} />
                        <FeatureChip yes={curPkg.reports_support}    label={t("دعم التقارير")} />
                        <FeatureChip yes={curPkg.trial_support}      label={t("باقة تجريبية")} />
                        <span style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: "1rem", padding: "0.2rem 0.55rem", fontSize: "0.72rem", fontWeight: 600 }}>
                          {lang === "ar" ? `${curPkg.max_users} مستخدم` : `${curPkg.max_users} users`}
                        </span>
                        <span style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: "1rem", padding: "0.2rem 0.55rem", fontSize: "0.72rem", fontWeight: 600 }}>
                          {lang === "ar" ? `${curPkg.max_rooms} غرفة` : `${curPkg.max_rooms} rooms`}
                        </span>
                        <span style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: "1rem", padding: "0.2rem 0.55rem", fontSize: "0.72rem", fontWeight: 600 }}>
                          {lang === "ar" ? `${curPkg.duration_days} يوم` : `${curPkg.duration_days} days`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── Requests table ──────────────────────────────────────────────── */}
          <div className="ds-card-p" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem", color: "#111827" }}>{t("طلبات الاشتراك")}</p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>{t("طلبات تغيير الباقة أو التمديد تظهر هنا")}</p>
              </div>
              {requests.filter(r => r.status === "pending").length > 0 && (
                <span style={{ background: "#fffbeb", color: "#d97706", borderRadius: "1rem", padding: "0.2rem 0.6rem", fontSize: "0.72rem", fontWeight: 700 }}>
                  {lang === "ar" ? `${requests.filter(r => r.status === "pending").length} قيد الانتظار` : `${requests.filter(r => r.status === "pending").length} pending`}
                </span>
              )}
            </div>

            {requests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem" }}>
                <ClipboardList size={36} strokeWidth={1.2} style={{marginBottom:"0.5rem",color:"#9ca3af"}}/>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>{t("لا توجد طلبات بعد")}</p>
                <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>{t("طلبات تغيير الباقة أو التمديد ستظهر هنا بعد إرسالها.")}</p>
              </div>
            ) : (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>{t("نوع الطلب")}</th>
                      <th>{t("الباقة المطلوبة")}</th>
                      <th>{t("الباقة الحالية")}</th>
                      <th>{t("الحالة")}</th>
                      <th>{t("تاريخ الطلب")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(req => {
                      const reqSt = REQ_STATUS[req.status] ?? REQ_STATUS.pending;
                      const reqType = parseRequestType(req.notes, t);
                      return (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 600 }}>{reqType}</td>
                          <td>{req.package_name ?? "—"}</td>
                          <td style={{ color: "#6b7280" }}>
                            {req.notes.split("\n").find(l => l.startsWith("الباقة الحالية:"))?.replace("الباقة الحالية:", "").trim() ?? t("—")}
                          </td>
                          <td>
                            <span style={{ background: reqSt.bg, color: reqSt.color, borderRadius: "1rem", padding: "0.2rem 0.65rem", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                              {reqSt.label}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(req.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
