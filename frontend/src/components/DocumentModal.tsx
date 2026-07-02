"use client";
// عابر (§ثانيًا‑1): عرض الوثائق داخل نافذة منبثقة — لا صفحة/تبويب جديد.
// معاينة + إغلاق + تحميل + طباعة مباشرة (عبر iframe مخفيّ بلا فتح تبويب).
import { X, Download, Printer } from "lucide-react";

export interface DocModalInfo { label?: string; sub?: string }

export default function DocumentModal({
  src, title, info, onClose,
}: {
  src: string | null;
  title?: string;
  info?: DocModalInfo;
  onClose: () => void;
}) {
  if (!src) return null;

  const isPdf = src.startsWith("data:application/pdf") || src.toLowerCase().endsWith(".pdf");

  function download() {
    const a = document.createElement("a");
    a.href = src as string;
    a.download = (info?.label || "document").replace(/\s+/g, "_");
    document.body.appendChild(a); a.click(); a.remove();
  }

  function print() {
    // طباعة مباشرة عبر iframe مخفيّ — بلا فتح نافذة/تبويب جديد
    const frame = document.createElement("iframe");
    frame.style.position = "fixed"; frame.style.right = "-9999px"; frame.style.width = "0"; frame.style.height = "0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) { document.body.removeChild(frame); return; }
    doc.open();
    doc.write(isPdf
      ? `<embed src="${src}" type="application/pdf" style="width:100%;height:100vh">`
      : `<img src="${src}" style="max-width:100%" onload="setTimeout(function(){window.focus();window.print();},50)">`);
    doc.close();
    const cleanup = () => setTimeout(() => { try { document.body.removeChild(frame); } catch { /* gone */ } }, 1000);
    if (isPdf) { setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); cleanup(); }, 300); }
    else { frame.contentWindow?.addEventListener?.("afterprint", cleanup); setTimeout(cleanup, 8000); }
  }

  return (
    <div className="ds-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ds-modal" style={{ maxWidth: 720, width: "92vw" }}>
        <div className="ds-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>{title || info?.label || "الوثيقة"}</h3>
            {info?.sub && <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-muted)" }}>{info.sub}</p>}
          </div>
          <button className="ds-modal-close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="ds-modal-body" style={{ textAlign: "center", background: "#f8fafc" }}>
          {isPdf
            ? <embed src={src} type="application/pdf" style={{ width: "100%", height: "60vh", borderRadius: 8 }} />
            /* eslint-disable-next-line @next/next/no-img-element -- معاينة data-url ديناميكية */
            : <img src={src} alt={info?.label || "document"} style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 8, border: "1px solid var(--color-border)" }} />}
        </div>
        <div className="ds-modal-foot" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={download}><Download size={14} /> تحميل</button>
          <button className="ds-btn ds-btn-print ds-btn-sm" onClick={print}><Printer size={14} /> طباعة</button>
          <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
