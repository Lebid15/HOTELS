"use client";

import { ScrollText, RefreshCw } from "lucide-react";
import { useLang } from "../LangContext";
import AuditLogView from "@/components/AuditLogView";

export default function ManagerAuditPage() {
  const { t, lang } = useLang();

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

      <AuditLogView t={t} lang={lang} showHotel={false} />
    </div>
  );
}
