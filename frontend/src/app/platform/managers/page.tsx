"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, ExternalLink, X } from "lucide-react";
import { apiUrl, getAuthJsonHeaders as apiH } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

interface Hotel {
  id: number;
  name: string;
  manager_name: string;
  manager_email: string;
  manager_username: string | null;
  status: string;
  subscription_status: string | null;
}

const STATUS_LABEL: Record<string, string> = { active: "فعال", suspended: "موقوف", archived: "مؤرشف" };
const STATUS_BADGE: Record<string, string> = { active: "ds-badge ds-badge-success", suspended: "ds-badge ds-badge-warning", archived: "ds-badge ds-badge-neutral" };
const SUB_LABEL: Record<string, string> = { active: "فعال", trial: "تجريبي", expired: "منتهي", suspended: "موقوف", not_set: "غير مضبوط" };
const SUB_BADGE: Record<string, string> = { active: "ds-badge ds-badge-success", trial: "ds-badge ds-badge-info", expired: "ds-badge ds-badge-danger", suspended: "ds-badge ds-badge-warning", not_set: "ds-badge ds-badge-neutral" };

/* ── ResetPasswordModal ────────────────────────────────────────────────────── */
function ResetPasswordModal({
  hotel, onClose, onDone,
}: { hotel: Hotel; onClose: () => void; onDone: (msg: string) => void }) {
  const { t } = useLang();
  const [pass,   setPass]   = useState("");
  const [confirm,setConfirm]= useState("");
  const [showP,  setShowP]  = useState(false);
  const [showC,  setShowC]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  async function handle() {
    if (!pass)            return setErr(t("كلمة المرور مطلوبة"));
    if (pass.length < 8)  return setErr(t("كلمة المرور 8 أحرف على الأقل"));
    if (pass !== confirm)  return setErr(t("كلمتا المرور غير متطابقتين"));
    setSaving(true); setErr("");
    try {
      const res  = await fetch(apiUrl(`/hotels/${hotel.id}/reset_manager_password/`), {
        method: "POST", headers: apiH(), body: JSON.stringify({ new_password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? t("فشلت العملية")); return; }
      onDone(t("تم إعادة تعيين كلمة مرور المدير بنجاح"));
    } catch { setErr(t("خطأ في الاتصال")); }
    finally { setSaving(false); }
  }

  const eyeStyle: React.CSSProperties = {
    position: "absolute", top: "50%", left: "0.7rem",
    transform: "translateY(-50%)", background: "none", border: "none",
    cursor: "pointer", color: "var(--color-muted)", padding: 0, display: "flex",
  };

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className="ds-modal-card narrow" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h2>{t("إعادة تعيين كلمة المرور")}</h2>
          <button className="icon-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div className="ds-modal-body">
          <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
            {t("الفندق")}: <strong style={{ color: "var(--color-heading)" }}>{hotel.name}</strong>
            {hotel.manager_username && (
              <> — {t("المدير")}: <span style={{ color: "var(--color-primary)", fontFamily: "monospace", fontWeight: 700 }}>@{hotel.manager_username}</span></>
            )}
          </p>

          <div className="field">
            <label className="field-label">{t("كلمة المرور الجديدة")} *</label>
            <div style={{ position: "relative" }}>
              <input className="input" type={showP ? "text" : "password"} placeholder={t("8 أحرف على الأقل")}
                value={pass} onChange={e => setPass(e.target.value)} style={{ paddingLeft: "2.5rem" }} autoFocus />
              <button type="button" style={eyeStyle} onClick={() => setShowP(p => !p)}>
                {showP ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="field" style={{ marginTop: "0.75rem" }}>
            <label className="field-label">{t("تأكيد كلمة المرور")} *</label>
            <div style={{ position: "relative" }}>
              <input className="input" type={showC ? "text" : "password"} placeholder={t("أعد كتابة كلمة المرور")}
                value={confirm} onChange={e => setConfirm(e.target.value)} style={{ paddingLeft: "2.5rem" }} />
              <button type="button" style={eyeStyle} onClick={() => setShowC(p => !p)}>
                {showC ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {err && <div className="ds-alert ds-alert-danger" style={{ marginTop: "0.75rem" }}>{err}</div>}
        </div>
        <div className="ds-modal-foot">
          <button className="ds-btn ds-btn-neutral" onClick={onClose} disabled={saving}>{t("إلغاء")}</button>
          <button className="ds-btn ds-btn-warning" onClick={handle} disabled={saving}>
            <KeyRound size={14} strokeWidth={2.5} />
            {saving ? t("جارٍ الحفظ...") : t("إعادة تعيين")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ManagersPage ──────────────────────────────────────────────────────────── */
export default function ManagersPage() {
  const { t } = useLang();
  const [hotels,  setHotels]  = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [toast,   setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [resetTarget, setResetTarget] = useState<Hotel | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = () => {
    setLoading(true);
    fetch(apiUrl("/hotels/"), { headers: apiH() })
      .then(r => r.json())
      .then(data => setHotels(Array.isArray(data) ? data : []))
      .catch(() => setHotels([]))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
  useEffect(() => { load(); }, []);

  // Only show hotels that have a manager account
  const managers = hotels.filter(h => h.manager_username);

  const visible = managers.filter(h => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (h.manager_username ?? "").toLowerCase().includes(q) ||
      (h.manager_name     ?? "").toLowerCase().includes(q) ||
      h.name.toLowerCase().includes(q)
    );
  });

  const activeManagers  = managers.filter(h => h.status === "active").length;
  const suspendedHotels = managers.filter(h => h.status === "suspended").length;

  function handleDone(msg: string) {
    setResetTarget(null);
    showToast(msg);
    load();
  }

  return (
    <div className="ds-page">
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
          <h1>{t("مديرو الفنادق")}</h1>
          <p>{t("عرض حسابات مديري الفنادق وإعادة تعيين كلمات المرور عند الحاجة")}</p>
        </div>
        <div className="page-actions">
          <Link href="/platform/hotels" className="ds-btn ds-btn-neutral ds-btn-sm">
            <ExternalLink size={14} strokeWidth={2} /> {t("إدارة الفنادق")}
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="pf-grid-3">
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("إجمالي المديرين")}</p>
          <p className="ds-summary-value">{managers.length}</p>
          <p className="ds-summary-note">{t("مديرون لديهم حسابات دخول")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("فنادق فعالة")}</p>
          <p className="ds-summary-value text-success">{activeManagers}</p>
          <p className="ds-summary-note">{t("المدير يعمل في فندق فعّال")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("فنادق موقوفة")}</p>
          <p className="ds-summary-value text-warning">{suspendedHotels}</p>
          <p className="ds-summary-note">{t("الفندق موقوف مؤقتاً")}</p>
        </div>
      </div>

      {/* Table */}
      <div className="ds-card-p">
        <div className="ds-filters">
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("بحث باسم المستخدم أو الاسم أو الفندق...")}
          />
        </div>

        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>{t("الفندق")}</th>
                <th>{t("اسم المستخدم")}</th>
                <th>{t("الاسم المعروض")}</th>
                <th>{t("البريد الإلكتروني")}</th>
                <th>{t("حالة الفندق")}</th>
                <th>{t("الاشتراك")}</th>
                <th>{t("الإجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    {t("جارٍ التحميل...")}
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    {search ? t("لا توجد نتائج مطابقة.") : t("لا يوجد مديرون مسجلون بعد.")}
                  </td>
                </tr>
              ) : (
                visible.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 700 }}>{h.name}</td>
                    <td>
                      <span style={{ color: "var(--color-primary)", fontFamily: "monospace", fontWeight: 700 }}>
                        @{h.manager_username}
                      </span>
                    </td>
                    <td>{h.manager_name?.trim() || <span className="text-muted">—</span>}</td>
                    <td className="text-muted">{h.manager_email?.trim() || "—"}</td>
                    <td>
                      <span className={STATUS_BADGE[h.status] ?? "ds-badge ds-badge-neutral"}>
                        {STATUS_LABEL[h.status] ? t(STATUS_LABEL[h.status]) : h.status}
                      </span>
                    </td>
                    <td>
                      {h.subscription_status
                        ? <span className={SUB_BADGE[h.subscription_status] ?? "ds-badge ds-badge-neutral"}>
                            {SUB_LABEL[h.subscription_status] ? t(SUB_LABEL[h.subscription_status]) : h.subscription_status}
                          </span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <button
                        className="ds-btn ds-btn-warning ds-btn-sm"
                        onClick={() => setResetTarget(h)}
                      >
                        <KeyRound size={13} strokeWidth={2.5} /> {t("كلمة المرور")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resetTarget && (
        <ResetPasswordModal
          hotel={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
