"use client";

import { useEffect, useMemo, useState } from "react";
import { ScrollText, RefreshCw, Filter } from "lucide-react";
import { useLang } from "../LangContext";
import { authFetch } from "@/lib/api";
import { AUDIT_ROLE_LABEL as ROLE_LABEL, auditActionLabel, auditBadgeClass, auditDetail } from "@/lib/auditLabels";

interface AuditRow {
  id: number;
  action: string;
  actor_name: string;
  actor_role: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  created_at: string;
}

export default function ManagerAuditPage() {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");

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
  const filtered = useMemo(
    () => (filterAction === "all" ? rows : rows.filter(r => r.action === filterAction)),
    [rows, filterAction],
  );

  const fmtTime = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(lang === "ar" ? "ar" : "en-US", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  };
  const actionLabel = (a: string) => auditActionLabel(a, t);

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
          <p>{t("أثر ثابت لكل عملية حسّاسة: من فعل ماذا ومتى — دخول/خروج، مدفوعات، وتغييرات الحساب.")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral" onClick={() => location.reload()}>
            <RefreshCw size={16} strokeWidth={2.5} /> {t("تحديث")}
          </button>
        </div>
      </div>

      {/* فلتر الفعل */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        <Filter size={16} className="text-muted" />
        <select className="input" style={{ maxWidth: 260 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
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
            <tr style={{ background: "var(--color-surface-2, #f8fafc)", textAlign: "start" }}>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("الوقت")}</th>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("الفعل")}</th>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("الفاعل")}</th>
              <th style={{ padding: "10px 14px", textAlign: "start" }}>{t("التفاصيل")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center" }} className="text-muted">{t("جارٍ التحميل...")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center" }} className="text-muted">{t("لا توجد أحداث مسجّلة")}</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                <td style={{ padding: "9px 14px", whiteSpace: "nowrap", color: "var(--color-muted)" }}>{fmtTime(r.created_at)}</td>
                <td style={{ padding: "9px 14px" }}>
                  <span className={`ds-badge ${auditBadgeClass(r.action)}`}>{actionLabel(r.action)}</span>
                </td>
                <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
                  {r.actor_name || "—"}
                  {r.actor_role && <span className="text-muted" style={{ fontSize: 11, marginInlineStart: 6 }}>{t(ROLE_LABEL[r.actor_role] ?? r.actor_role)}</span>}
                </td>
                <td style={{ padding: "9px 14px" }}>{auditDetail(r.action, r.summary, r.actor_name)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
