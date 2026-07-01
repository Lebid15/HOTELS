"use client";

import { useEffect, useMemo, useState } from "react";
import { ScrollText, RefreshCw, Filter } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { authFetch } from "@/lib/api";

interface AuditRow {
  id: number;
  hotel: number | null;
  hotel_name: string | null;
  action: string;
  actor_name: string;
  actor_role: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  "reservation.check_in": "تسجيل دخول",
  "reservation.check_out": "تسجيل خروج",
  "payment.create": "تسجيل دفعة",
  "hotel.create": "إنشاء فندق",
  "hotel.status.active": "تفعيل فندق",
  "hotel.status.suspended": "إيقاف فندق",
  "hotel.status.archived": "أرشفة فندق",
  "hotel.manager_password_reset": "إعادة تعيين كلمة مرور مدير",
  "subscription.approve": "اعتماد اشتراك",
  "subscription.reject": "رفض اشتراك",
  "commission.mark_paid": "تعليم عمولة كمدفوعة",
  "commission.mark_partial": "عمولة جزئية",
  "commission.waive": "إعفاء عمولة",
  "commission.mark_due": "تعليم عمولة كمستحقة",
};

const ROLE_LABEL: Record<string, string> = {
  platform_owner: "صاحب المنصة",
  manager: "مدير الفندق",
  reception: "موظف استقبال",
};

function actionBadgeClass(action: string): string {
  if (action.startsWith("payment") || action.startsWith("commission.mark_paid") || action === "hotel.status.active") return "ds-badge-success";
  if (action.includes("reject") || action.includes("suspended") || action.includes("waive")) return "ds-badge-warning";
  if (action.startsWith("hotel")) return "ds-badge-info";
  return "ds-badge-neutral";
}

export default function PlatformAuditPage() {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [filterHotel, setFilterHotel] = useState("all");

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل بيانات عند الإقلاع
    setLoading(true);
    authFetch("/audit-logs/")
      .then(r => (r.ok ? r.json() : []))
      .then((d: AuditRow[]) => { if (alive) { setRows(Array.isArray(d) ? d : []); setLoading(false); } })
      .catch(() => { if (alive) { setRows([]); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const actions = useMemo(() => [...new Set(rows.map(r => r.action))], [rows]);
  const hotels = useMemo(() => {
    const m = new Map<number, string>();
    rows.forEach(r => { if (r.hotel != null) m.set(r.hotel, r.hotel_name ?? `#${r.hotel}`); });
    return [...m.entries()];
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r =>
    (filterAction === "all" || r.action === filterAction) &&
    (filterHotel === "all" || String(r.hotel) === filterHotel),
  ), [rows, filterAction, filterHotel]);

  const fmtTime = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(lang === "ar" ? "ar" : "en-US", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  };
  const actionLabel = (a: string) => (ACTION_LABEL[a] ? t(ACTION_LABEL[a]) : a);

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.3rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--btn-luxury-bg)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ScrollText size={18} color="#fff" strokeWidth={2} />
            </div>
            <h1>{t("سجلّ التدقيق")}</h1>
          </div>
          <p>{t("أثر ثابت لكل عملية حسّاسة عبر جميع الفنادق والمنصّة: من فعل ماذا ومتى.")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral" onClick={() => location.reload()}>
            <RefreshCw size={16} strokeWidth={2.5} /> {t("تحديث")}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        <Filter size={16} className="text-muted" />
        <select className="input" style={{ maxWidth: 220 }} value={filterHotel} onChange={e => setFilterHotel(e.target.value)}>
          <option value="all">{t("كل الفنادق")}</option>
          {hotels.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 240 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="all">{t("كل الأفعال")}</option>
          {actions.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <span className="text-muted" style={{ fontSize: 13 }}>
          {lang === "ar" ? `${filtered.length} حدث` : `${filtered.length} event${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="ds-card-p" style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--color-surface-2, #f8fafc)" }}>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("الوقت")}</th>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("الفعل")}</th>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("الفندق")}</th>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("الفاعل")}</th>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("التفاصيل")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="text-muted">{t("جارٍ التحميل...")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="text-muted">{t("لا توجد أحداث مسجّلة")}</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                <td style={{ padding: "9px 14px", whiteSpace: "nowrap", color: "var(--color-muted)" }}>{fmtTime(r.created_at)}</td>
                <td style={{ padding: "9px 14px" }}>
                  <span className={`ds-badge ${actionBadgeClass(r.action)}`}>{actionLabel(r.action)}</span>
                </td>
                <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>{r.hotel_name || (lang === "ar" ? "المنصّة" : "Platform")}</td>
                <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
                  {r.actor_name || "—"}
                  {r.actor_role && <span className="text-muted" style={{ fontSize: 11, marginInlineStart: 6 }}>{t(ROLE_LABEL[r.actor_role] ?? r.actor_role)}</span>}
                </td>
                <td style={{ padding: "9px 14px" }}>{r.summary || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
