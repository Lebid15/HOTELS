"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, Settings, BedDouble, Printer, FileText, Bell, Archive, Palette, Check, X, Download, AlertTriangle, Trash2 } from "lucide-react";
import { useLang } from "../LangContext";

import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";
const LS_KEY = (hid: string) => `fandqi.settings.${hid}`;

function loadLS(hid: string) {
  try { return JSON.parse(localStorage.getItem(LS_KEY(hid)) ?? "{}"); } catch { return {}; }
}
function saveLS(hid: string, patch: object) {
  const cur = loadLS(hid);
  localStorage.setItem(LS_KEY(hid), JSON.stringify({ ...cur, ...patch }));
}

// ─── types ───────────────────────────────────────────────────────────────────
type TTab = "identity" | "operations" | "rooms" | "printing" | "documents" | "notifications" | "backup" | "appearance";

interface IIdentity { name: string; ownerName: string; city: string; address: string; phone: string; email: string; website: string; logo: string | null; }
interface IOps { currency: string; resPrefix: string; lastRes: string; resDigits: string; autoClean: boolean; blockCheckout: boolean; }
interface IRooms { floors: string; roomTypes: string[]; defaultCapacity: string; }
interface IPrinting { showLogo: boolean; showContact: boolean; resTitle: string; accountTitle: string; terms: string; footer: string; numLang: string; }
interface IDocs { docTypes: string[]; requireGuest: boolean; requireCompanion: boolean; requireRelation: boolean; scannerUrl: string; scannerEnabled: boolean; scannerError: string; }
interface INotifs { arrivals: boolean; departures: boolean; balanceDue: boolean; cleaning: boolean; maintenance: boolean; roomAccount: boolean; balanceThreshold: string; showBell: boolean; }
interface IAppearance { language: string; density: string; animations: boolean; }

const DEFAULT_IDENTITY: IIdentity = { name: "", ownerName: "", city: "", address: "", phone: "", email: "", website: "", logo: null };
const DEFAULT_OPS: IOps = { currency: "USD", resPrefix: "RES", lastRes: "0", resDigits: "4", autoClean: true, blockCheckout: true };
const DEFAULT_ROOMS: IRooms = { floors: "1", roomTypes: ["مفردة", "مزدوجة", "ثلاثية", "سويت", "عائلية", "جناح", "غرفة مميزة"], defaultCapacity: "2" };
const DEFAULT_PRINTING: IPrinting = {
  showLogo: true, showContact: true,
  resTitle: "ملخص الحجز", accountTitle: "كشف حساب النزيل",
  terms: "يرجى إبراز هذه الورقة عند الوصول. يتم اعتماد بيانات الحجز حسب سياسة الفندق، وتخضع أوقات الدخول والمغادرة والتعديلات لشروط الإدارة. يقر الضيف بصحة المعلومات المقدمة ويوافق على الالتزام بسياسات الفندق والتعليمات المعمول بها أثناء الإقامة.",
  footer: "", numLang: "en",
};
const DEFAULT_DOCS: IDocs = {
  docTypes: ["هوية شخصية", "جواز سفر", "دفتر عائلة", "إقامة", "إثبات قرابة", "أخرى"],
  requireGuest: true, requireCompanion: true, requireRelation: true,
  scannerUrl: "http://127.0.0.1:18189", scannerEnabled: false,
  scannerError: "تعذر الاتصال بخدمة الماسح الضوئي. تأكد من تشغيل خدمة الماسح المحلي ثم حاول مرة أخرى.",
};
const DEFAULT_NOTIFS: INotifs = { arrivals: true, departures: true, balanceDue: true, cleaning: true, maintenance: true, roomAccount: true, balanceThreshold: "0", showBell: true };
const DEFAULT_APPEARANCE: IAppearance = { language: "ar", density: "comfortable", animations: true };


// ─── shared sub-components ───────────────────────────────────────────────────
function FLD({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint && <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>{hint}</p>}
    </div>
  );
}

function SW({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.6rem 0", borderBottom: "1px solid var(--color-border)" }}>
      <label style={{ position: "relative", width: "2.2rem", height: "1.2rem", flexShrink: 0, marginTop: "0.1rem" }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
        <span style={{
          position: "absolute", inset: 0, borderRadius: "1rem", cursor: "pointer",
          background: checked ? "var(--color-primary)" : "var(--color-border-strong)",
          transition: "background 0.2s",
        }} />
        <span style={{
          position: "absolute", top: "0.1rem",
          right: checked ? "0.1rem" : "1rem",
          width: "1rem", height: "1rem",
          borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px #0002",
          transition: "right 0.2s",
        }} />
      </label>
      <div>
        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text)", margin: 0 }}>{label}</p>
        {hint && <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", margin: 0, marginTop: "0.15rem" }}>{hint}</p>}
      </div>
    </div>
  );
}

function SaveBtn({ label, saving, saved, onClick }: { label: string; saving: boolean; saved: boolean; onClick: () => void }) {
  const { t } = useLang();
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`ds-btn ds-btn-sm ${saved ? "ds-btn-success" : "ds-btn-primary"}`}
      style={{ opacity: saving ? 0.7 : 1 }}
    >
      {saving ? t("جارٍ الحفظ...") : saved ? <><Check size={13}/> {t("تم الحفظ")}</> : label}
    </button>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="ds-toast-stack">
      <div className="ds-toast ds-toast-success">
        <span>{msg}</span>
        <button className="ds-toast-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

function CardSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="ds-card-p" style={{ marginBottom: "1rem" }}>
      <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-heading)", marginBottom: "0.2rem" }}>{title}</p>
      {desc && <p style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginBottom: "1rem" }}>{desc}</p>}
      {children}
    </div>
  );
}

const G2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.25rem" };
const G3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "0.25rem" };

// ─── main component ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t, lang } = useLang();

  const TABS: { key: TTab; label: string; Icon: LucideIcon }[] = [
    { key: "identity",      label: t("الهوية العامة"),        Icon: Building2 },
    { key: "operations",    label: t("التشغيل والحجوزات"),    Icon: Settings },
    { key: "rooms",         label: t("الغرف والطوابق"),       Icon: BedDouble },
    { key: "printing",      label: t("الطباعة والفواتير"),    Icon: Printer },
    { key: "documents",     label: t("الوثائق والماسح"),      Icon: FileText },
    { key: "notifications", label: t("التنبيهات"),             Icon: Bell },
    { key: "backup",        label: t("النسخ الاحتياطي"),      Icon: Archive },
    { key: "appearance",    label: t("الواجهة"),               Icon: Palette },
  ];

  const hotelId = typeof window !== "undefined" ? (localStorage.getItem("hotel_id") ?? "") : "";
  const [tab, setTab]       = useState<TTab>("identity");
  const [toast, setToast]   = useState("");
  const [error, setError]   = useState("");
  const fileRef              = useRef<HTMLInputElement>(null);
  const importRef            = useRef<HTMLInputElement>(null);
  const [maxFloor, setMaxFloor] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newDocType, setNewDocType]     = useState("");
  const [newRoomType, setNewRoomType]   = useState("");

  const [saving, setSaving] = useState(false);

  // State per section
  const [identity,  setIdentity]  = useState<IIdentity>(DEFAULT_IDENTITY);
  const [ops,       setOps]       = useState<IOps>(DEFAULT_OPS);
  const [rooms,     setRooms]     = useState<IRooms>(DEFAULT_ROOMS);
  const [printing,  setPrinting]  = useState<IPrinting>(DEFAULT_PRINTING);
  const [docs,      setDocs]      = useState<IDocs>(DEFAULT_DOCS);
  const [notifs,    setNotifs]    = useState<INotifs>(DEFAULT_NOTIFS);
  const [appearance,setAppearance]= useState<IAppearance>(DEFAULT_APPEARANCE);

  // Load from backend + localStorage
  useEffect(() => {
    if (!hotelId) return;

    const loadLocal = async () => {
      // load from localStorage first (sync, wrapped async to avoid set-state-in-effect)
      const ls = loadLS(hotelId);
      if (ls.identity)   setIdentity(prev => ({ ...prev, ...ls.identity }));
      if (ls.ops)        setOps(prev => ({ ...prev, ...ls.ops }));
      if (ls.rooms)      setRooms(prev => ({ ...prev, ...ls.rooms }));
      if (ls.printing)   setPrinting(prev => ({ ...prev, ...ls.printing }));
      if (ls.docs)       setDocs(prev => ({ ...prev, ...ls.docs }));
      if (ls.notifs)     setNotifs(prev => ({ ...prev, ...ls.notifs }));
      if (ls.appearance) setAppearance(prev => ({ ...prev, ...ls.appearance }));
    };
    loadLocal();

    // fetch hotel from backend (async, non-blocking)
    fetch(`${API}/hotels/${hotelId}/`, { headers: apiH() })
      .then(r => r.ok ? r.json() : null).then(d => {
        if (!d) return;
        setIdentity(prev => ({ ...prev, name: d.name ?? "", city: d.city ?? "", address: d.address ?? "", phone: d.phone ?? "", email: d.email ?? "" }));
        if (d.floors_count) setRooms(prev => ({ ...prev, floors: String(d.floors_count) }));
      }).catch(() => {});
    // fetch rooms to compute max floor
    fetch(`${API}/rooms/?hotel=${hotelId}`, { headers: apiH() })
      .then(r => r.ok ? r.json() : []).then((rs: { floor?: number }[]) => {
        const max = rs.reduce((acc, r) => Math.max(acc, r.floor ?? 0), 0);
        setMaxFloor(max);
      }).catch(() => {});
  }, [hotelId]);

  const showToast = useCallback((msg: string) => { setToast(msg); setError(""); }, []);

  // ── Per-tab save ─────────────────────────────────────────────────────────
  async function doSaveIdentity() {
    if (!identity.name.trim()) { setError(t("اسم الفندق لا يجب أن يكون فارغًا.")); return; }
    if (identity.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) { setError(t("البريد الإلكتروني غير صحيح.")); return; }
    setSaving(true); setError("");
    try {
      const body = { name: identity.name, city: identity.city, address: identity.address, phone: identity.phone, email: identity.email };
      await fetch(`${API}/hotels/${hotelId}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify(body) });
    } catch { /* backend might not support PATCH — ok */ }
    saveLS(hotelId, { identity });
    setSaving(false);
    showToast(t("تم حفظ بيانات الهوية العامة بنجاح."));
  }

  async function doSaveOps() {
    const digits = parseInt(ops.resDigits, 10);
    if (!ops.resPrefix.trim()) { setError(t("بادئة رقم الحجز لا يجب أن تكون فارغة.")); return; }
    if (isNaN(digits) || digits < 3 || digits > 8) { setError(t("عدد خانات رقم الحجز يجب أن يكون بين 3 و 8.")); return; }
    saveLS(hotelId, { ops });
    showToast(t("تم حفظ إعدادات التشغيل والحجوزات بنجاح."));
  }

  async function doSaveRooms() {
    const fl = parseInt(rooms.floors, 10);
    if (isNaN(fl) || fl < 1) { setError(t("عدد الطوابق يجب أن يكون أكبر من صفر.")); return; }
    if (fl < maxFloor) { setError(lang === "ar" ? `لا يمكن تقليل الطوابق عن ${maxFloor} (أعلى طابق مستخدم حالياً).` : `Cannot reduce floors below ${maxFloor} (highest floor currently in use).`); return; }
    if (rooms.roomTypes.length === 0) { setError(t("لا يجب حفظ قائمة أنواع غرف فارغة.")); return; }
    try {
      await fetch(`${API}/hotels/${hotelId}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify({ floors_count: fl }) });
    } catch { /* ok */ }
    saveLS(hotelId, { rooms });
    showToast(t("تم حفظ إعدادات الغرف والطوابق بنجاح."));
  }

  async function doSavePrinting() {
    saveLS(hotelId, { printing });
    showToast(t("تم حفظ إعدادات الطباعة والفواتير بنجاح."));
  }

  async function doSaveDocs() {
    if (docs.docTypes.length === 0) { setError(t("يجب أن تحتوي أنواع الوثائق على نوع واحد على الأقل.")); return; }
    if (docs.scannerEnabled && !docs.scannerUrl.trim()) { setError(t("عنوان خدمة الماسح مطلوب عند تفعيله.")); return; }
    saveLS(hotelId, { docs });
    showToast(t("تم حفظ إعدادات الوثائق والماسح بنجاح."));
  }

  async function doSaveNotifs() {
    saveLS(hotelId, { notifs });
    window.dispatchEvent(new Event("fandqi:settings-update"));
    showToast(t("تم حفظ إعدادات التنبيهات بنجاح."));
  }

  async function doSaveAppearance() {
    saveLS(hotelId, { appearance });
    showToast(t("تم حفظ إعدادات الواجهة بنجاح."));
  }

  // ── Backup ─────────────────────────────────────────────────────────────────
  async function doExport() {
    setSaving(true);
    const h = apiH();
    const [hotel, roomsData, reservations, staff, maintenance, ls] = await Promise.all([
      fetch(`${API}/hotels/${hotelId}/`, { headers: h }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${API}/rooms/?hotel=${hotelId}`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/reservations/?hotel=${hotelId}`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/staff/?hotel=${hotelId}`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/maintenance/?hotel=${hotelId}`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
      Promise.resolve(loadLS(hotelId)),
    ]);
    const data = { exportedAt: new Date().toISOString(), hotelId, hotel, rooms: roomsData, reservations, staff, maintenance, settings: ls };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fandqi-backup-${hotelId}-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setSaving(false);
    showToast(t("تم تصدير النسخة الاحتياطية بنجاح."));
  }

  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) { setError(t("يجب اختيار ملف JSON صحيح.")); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.hotelId || !data.settings) throw new Error(t("ملف غير صحيح"));
        if (String(data.hotelId) !== String(hotelId)) {
          if (!window.confirm(lang === "ar" ? "هذه النسخة لفندق مختلف. هل تريد المتابعة؟" : "This backup belongs to a different hotel. Do you want to continue?")) return;
        }
        localStorage.setItem(LS_KEY(hotelId), JSON.stringify(data.settings));
        window.location.reload();
      } catch {
        setError(t("الملف غير صحيح أو تالف. يُرجى اختيار ملف نسخة احتياطية صحيح."));
      }
    };
    reader.readAsText(file);
    if (importRef.current) importRef.current.value = "";
  }

  function doReset() {
    localStorage.removeItem(LS_KEY(hotelId));
    window.location.reload();
  }

  // ── Logo ────────────────────────────────────────────────────────────────────
  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setIdentity(prev => ({ ...prev, logo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }

  // ─── room type helpers ────────────────────────────────────────────────────
  function addRoomType() {
    const val = newRoomType.trim();
    if (val && !rooms.roomTypes.includes(val)) {
      setRooms(prev => ({ ...prev, roomTypes: [...prev.roomTypes, val] }));
    }
    setNewRoomType("");
  }
  function removeRoomType(idx: number) {
    setRooms(prev => ({ ...prev, roomTypes: prev.roomTypes.filter((_, i) => i !== idx) }));
  }

  // ─── doc type helpers ─────────────────────────────────────────────────────
  function addDocType() {
    const val = newDocType.trim();
    if (val && !docs.docTypes.includes(val)) {
      setDocs(prev => ({ ...prev, docTypes: [...prev.docTypes, val] }));
    }
    setNewDocType("");
  }
  function removeDocType(idx: number) {
    setDocs(prev => ({ ...prev, docTypes: prev.docTypes.filter((_, i) => i !== idx) }));
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="ds-page" dir="rtl">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.75rem", color: "#4f46e5", fontWeight: 600, marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("لوحة التحكم")}
          </p>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>{t("الإعدادات")}</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280", marginTop: "0.2rem" }}>
            {t("إدارة بيانات الفندق، التشغيل، الطباعة، الوثائق، التنبيهات، والنسخ الاحتياطي من مكان واحد.")}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "0.5rem", padding: "0.6rem 1rem", marginBottom: "1rem", color: "#dc2626", fontSize: "0.875rem" }}>
          {error}
          <button onClick={() => setError("")} style={{ float: "left", background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}><X size={15} strokeWidth={2.5}/></button>
        </div>
      )}

      {/* Tabs */}
      <div className="ds-tabs" style={{ marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(tb => (
          <button
            key={tb.key}
            className={`ds-tab-btn${tab === tb.key ? " active" : ""}`}
            onClick={() => { setTab(tb.key); setError(""); }}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <tb.Icon size={15} strokeWidth={1.8} />
            <span>{tb.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 1: الهوية العامة
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "identity" && (
        <>
          <CardSection title={t("شعار الفندق")} desc={t("الشعار يظهر في الطباعة والفواتير وملخص الحجز.")}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {identity.logo
                /* eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded logo from localStorage; next/image requires configured external domains */
                ? <img src={identity.logo} alt="logo" style={{ width: 72, height: 72, borderRadius: "0.5rem", objectFit: "cover", border: "1px solid #e5e7eb" }} />
                : <div style={{ width: 72, height: 72, borderRadius: "0.5rem", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #c7d2fe" }}><Building2 size={32} strokeWidth={1.4} color="#6366f1"/></div>
              }
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => fileRef.current?.click()}>{t("رفع شعار")}</button>
                {identity.logo && (
                  <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={() => setIdentity(p => ({ ...p, logo: null }))}>{t("إزالة الشعار")}</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogo} />
            </div>
          </CardSection>

          <CardSection title={t("بيانات الهوية العامة")} desc={t("بيانات الفندق الأساسية التي تظهر في التوب بار والطباعة والتقارير.")}>
            <div style={G2}>
              <FLD label={t("اسم الفندق")}>
                <input className="input" value={identity.name} onChange={e => setIdentity(p => ({ ...p, name: e.target.value }))} placeholder={t("اسم الفندق")} />
              </FLD>
              <FLD label={t("اسم صاحب الفندق")} hint={t("يظهر في التوب بار ويُطبع في التقارير والفواتير")}>
                <input className="input" value={identity.ownerName ?? ""} onChange={e => setIdentity(p => ({ ...p, ownerName: e.target.value }))} placeholder={t("اسم المالك أو المسؤول")} />
              </FLD>
            </div>
            <div style={G3}>
              <FLD label={t("المدينة")}>
                <input className="input" value={identity.city} onChange={e => setIdentity(p => ({ ...p, city: e.target.value }))} placeholder={t("المدينة")} />
              </FLD>
              <FLD label={t("العنوان")}>
                <input className="input" value={identity.address} onChange={e => setIdentity(p => ({ ...p, address: e.target.value }))} placeholder={t("العنوان التفصيلي")} />
              </FLD>
              <FLD label={t("رقم الهاتف")}>
                <input className="input" value={identity.phone} onChange={e => setIdentity(p => ({ ...p, phone: e.target.value }))} placeholder="05XXXXXXXX" />
              </FLD>
            </div>
            <div style={G3}>
              <FLD label={t("البريد الإلكتروني")}>
                <input className="input" type="email" value={identity.email} onChange={e => setIdentity(p => ({ ...p, email: e.target.value }))} placeholder="hotel@example.com" />
              </FLD>
              <FLD label={t("الموقع الإلكتروني")}>
                <input className="input" value={identity.website} onChange={e => setIdentity(p => ({ ...p, website: e.target.value }))} placeholder="https://hotel.com" />
              </FLD>
              <div />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <SaveBtn label={t("حفظ الهوية العامة")} saving={saving} saved={false} onClick={doSaveIdentity} />
            </div>
          </CardSection>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 2: التشغيل والحجوزات
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "operations" && (
        <CardSection title={t("التشغيل والحجوزات")} desc={t("إعدادات تؤثر على أرقام الحجوزات، العملة، وسياسات التشغيل الأساسية.")}>
          <div style={G3}>
            <FLD label={t("العملة الافتراضية")}>
              <select className="select" value={ops.currency} onChange={e => setOps(p => ({ ...p, currency: e.target.value }))}>
                {["USD", "EUR", "TRY", "SAR", "AED", "SYP"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FLD>
            <FLD label={t("بادئة رقم الحجز")} hint={`${t("مثال")}: ${ops.resPrefix || "RES"}-0001`}>
              <input className="input" value={ops.resPrefix} onChange={e => setOps(p => ({ ...p, resPrefix: e.target.value.toUpperCase() }))} placeholder="RES" />
            </FLD>
            <FLD label={t("آخر رقم حجز")} hint={t("يُستخدم لتوليد الرقم التالي تلقائيًا")}>
              <input className="input" type="number" min="0" value={ops.lastRes} onChange={e => setOps(p => ({ ...p, lastRes: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ ...G3, marginTop: "0.25rem" }}>
            <FLD label={t("عدد خانات رقم الحجز")} hint={t("بين 3 و 8 خانات")}>
              <input className="input" type="number" min="3" max="8" value={ops.resDigits} onChange={e => setOps(p => ({ ...p, resDigits: e.target.value }))} />
            </FLD>
            <div />
            <div style={{ display: "flex", alignItems: "center", paddingTop: "1.2rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                {t("رقم الحجز التالي")}: <strong style={{ color: "#4f46e5" }}>{ops.resPrefix}-{String(parseInt(ops.lastRes, 10) + 1).padStart(parseInt(ops.resDigits, 10) || 4, "0")}</strong>
              </span>
            </div>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <SW label={t("تحويل الغرفة للتنظيف بعد تسجيل الخروج")} checked={ops.autoClean} onChange={v => setOps(p => ({ ...p, autoClean: v }))} hint={t("بعد الخروج تصبح الغرفة في حالة تنظيف تلقائيًا")} />
            <SW label={t("منع تسجيل الخروج عند وجود متبقي مالي")} checked={ops.blockCheckout} onChange={v => setOps(p => ({ ...p, blockCheckout: v }))} hint={t("يمنع إتمام الخروج حتى يُسوَّى الرصيد المستحق")} />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات التشغيل")} saving={saving} saved={false} onClick={doSaveOps} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 3: الغرف والطوابق
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "rooms" && (
        <CardSection title={t("الغرف والطوابق")} desc={t("إعدادات تستخدمها صفحة الغرف والطوابق عند إنشاء الغرف وتنظيمها.")}>
          <div style={G3}>
            <FLD label={t("عدد الطوابق المفعلة")} hint={maxFloor > 0 ? (lang === "ar" ? `أعلى طابق مستخدم حالياً: ${maxFloor}` : `Highest floor in use: ${maxFloor}`) : undefined}>
              <input className="input" type="number" min="1" value={rooms.floors} onChange={e => setRooms(p => ({ ...p, floors: e.target.value }))} />
            </FLD>
            <FLD label={t("السعة الافتراضية للغرف الجديدة")}>
              <select className="select" value={rooms.defaultCapacity} onChange={e => setRooms(p => ({ ...p, defaultCapacity: e.target.value }))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {lang === "ar" ? (n === 1 ? "شخص" : "أشخاص") : (n === 1 ? "person" : "people")}</option>)}
              </select>
            </FLD>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>{t("أنواع الغرف")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
              {rooms.roomTypes.map((rt, i) => (
                <span key={rt + i} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.7rem", borderRadius: "2rem", background: "#eef2ff", color: "#4f46e5", fontSize: "0.82rem", fontWeight: 600 }}>
                  {rt}
                  <button onClick={() => removeRoomType(i)} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: 0, lineHeight: 1, display:"flex" }}><X size={12} strokeWidth={2.5}/></button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", maxWidth: "400px" }}>
              <input className="input" value={newRoomType} onChange={e => setNewRoomType(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addRoomType()}
                placeholder={t("نوع غرفة جديد...")} style={{ flex: 1 }} />
              <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={addRoomType}>+ {t("إضافة")}</button>
              <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => setRooms(prev => ({ ...prev, roomTypes: DEFAULT_ROOMS.roomTypes }))}>{t("استعادة الافتراضية")}</button>
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات الغرف")} saving={saving} saved={false} onClick={doSaveRooms} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 4: الطباعة والفواتير
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "printing" && (
        <CardSection title={t("الطباعة والفواتير")} desc={t("إعدادات تتحكم بشكل مستندات الطباعة مثل ملخص الحجز، الفاتورة، وكشف الحساب.")}>
          <div style={{ marginBottom: "0.75rem" }}>
            <SW label={t("إظهار شعار الفندق في الطباعة")} checked={printing.showLogo} onChange={v => setPrinting(p => ({ ...p, showLogo: v }))} />
            <SW label={t("إظهار بيانات التواصل في الطباعة")} checked={printing.showContact} onChange={v => setPrinting(p => ({ ...p, showContact: v }))} />
          </div>
          <div style={G2}>
            <FLD label={t("عنوان ملخص الحجز")}>
              <input className="input" value={printing.resTitle} onChange={e => setPrinting(p => ({ ...p, resTitle: e.target.value }))} />
            </FLD>
            <FLD label={t("عنوان كشف الحساب")}>
              <input className="input" value={printing.accountTitle} onChange={e => setPrinting(p => ({ ...p, accountTitle: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ ...G2, marginTop: "0.5rem" }}>
            <FLD label={t("لغة الأرقام في الطباعة")}>
              <select className="select" value={printing.numLang} onChange={e => setPrinting(p => ({ ...p, numLang: e.target.value }))}>
                <option value="en">{t("أرقام إنجليزية")}</option>
                <option value="ar">{t("أرقام عربية")}</option>
              </select>
            </FLD>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <FLD label={t("ملاحظات وشروط الحجز")}>
              <textarea className="textarea" rows={4} value={printing.terms} onChange={e => setPrinting(p => ({ ...p, terms: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <FLD label={t("تذييل الطباعة")}>
              <textarea className="textarea" rows={2} value={printing.footer} onChange={e => setPrinting(p => ({ ...p, footer: e.target.value }))} placeholder={t("نص يظهر في أسفل كل مطبوع...")} />
            </FLD>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات الطباعة")} saving={saving} saved={false} onClick={doSavePrinting} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 5: الوثائق والماسح
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "documents" && (
        <CardSection title={t("الوثائق والماسح")} desc={t("إعدادات الوثائق المطلوبة داخل الحجوزات وربط الماسح الضوئي.")}>
          <div style={{ marginBottom: "0.75rem" }}>
            <SW label={t("وثيقة صاحب الحجز مطلوبة")} checked={docs.requireGuest} onChange={v => setDocs(p => ({ ...p, requireGuest: v }))} />
            <SW label={t("وثيقة كل مرافق بالغ مطلوبة")} checked={docs.requireCompanion} onChange={v => setDocs(p => ({ ...p, requireCompanion: v }))} />
            <SW label={t("إثبات القرابة مطلوب للعائلة")} checked={docs.requireRelation} onChange={v => setDocs(p => ({ ...p, requireRelation: v }))} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>{t("أنواع وثائق النزلاء")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
              {docs.docTypes.map((dt, i) => (
                <span key={dt + i} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.7rem", borderRadius: "2rem", background: "#f0fdf4", color: "#15803d", fontSize: "0.82rem", fontWeight: 600, border: "1px solid #bbf7d0" }}>
                  {dt}
                  <button onClick={() => removeDocType(i)} style={{ background: "none", border: "none", color: "#15803d", cursor: "pointer", padding: 0, display:"flex" }}><X size={12} strokeWidth={2.5}/></button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", maxWidth: "380px" }}>
              <input className="input" value={newDocType} onChange={e => setNewDocType(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addDocType()}
                placeholder={t("نوع وثيقة جديد...")} style={{ flex: 1 }} />
              <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={addDocType}>+ {t("إضافة")}</button>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", marginTop: "0.5rem" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>{t("إعدادات الماسح الضوئي")}</p>
            <SW label={t("تفعيل أزرار الماسح الضوئي")} checked={docs.scannerEnabled} onChange={v => setDocs(p => ({ ...p, scannerEnabled: v }))} />
            <div style={{ ...G2, marginTop: "0.75rem" }}>
              <FLD label={t("عنوان خدمة الماسح المحلي")}>
                <input className="input" value={docs.scannerUrl} onChange={e => setDocs(p => ({ ...p, scannerUrl: e.target.value }))} placeholder="http://127.0.0.1:18189" />
              </FLD>
            </div>
            <FLD label={t("رسالة عدم توفر الماسح")}>
              <textarea className="textarea" rows={2} value={docs.scannerError} onChange={e => setDocs(p => ({ ...p, scannerError: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات الوثائق")} saving={saving} saved={false} onClick={doSaveDocs} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 6: التنبيهات
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "notifications" && (
        <CardSection title={t("التنبيهات")} desc={t("إعدادات التنبيهات التي تظهر في جرس الإشعارات ولوحة التحكم.")}>
          <SW label={t("إشعارات وصول اليوم")}                   checked={notifs.arrivals}     onChange={v => setNotifs(p => ({ ...p, arrivals: v }))} />
          <SW label={t("إشعارات مغادرة اليوم")}                  checked={notifs.departures}   onChange={v => setNotifs(p => ({ ...p, departures: v }))} />
          <SW label={t("إشعارات المتبقي المالي")}                 checked={notifs.balanceDue}   onChange={v => setNotifs(p => ({ ...p, balanceDue: v }))} />
          <SW label={t("إشعارات غرف التنظيف")}                   checked={notifs.cleaning}     onChange={v => setNotifs(p => ({ ...p, cleaning: v }))} />
          <SW label={t("إشعارات الصيانة")}                       checked={notifs.maintenance}  onChange={v => setNotifs(p => ({ ...p, maintenance: v }))} />
          <SW label={t("إشعارات طلبات على حساب الغرفة")}         checked={notifs.roomAccount}  onChange={v => setNotifs(p => ({ ...p, roomAccount: v }))} />
          <SW label={t("إظهار عداد الإشعارات في التوببار")}      checked={notifs.showBell}     onChange={v => setNotifs(p => ({ ...p, showBell: v }))} hint={t("إذا عطّلت هذا الخيار لن يظهر العداد الأحمر على جرس التوببار")} />
          <div style={{ marginTop: "0.75rem", maxWidth: "320px" }}>
            <FLD label={t("حد تنبيه المتبقي المالي")} hint={t("لا يظهر إشعار المتبقي إلا إذا كان المبلغ أكبر من هذه القيمة")}>
              <input className="input" type="number" min="0" value={notifs.balanceThreshold} onChange={e => setNotifs(p => ({ ...p, balanceThreshold: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات التنبيهات")} saving={saving} saved={false} onClick={doSaveNotifs} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 7: النسخ الاحتياطي
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "backup" && (
        <div>
          {/* Export */}
          <CardSection title={t("تصدير نسخة احتياطية")} desc={t("قم بتنزيل نسخة من بيانات الفندق الحالية للاحتفاظ بها خارج المتصفح.")}>
            <button className="ds-btn ds-btn-primary" onClick={doExport} disabled={saving}>
              {saving ? t("جارٍ التصدير...") : <><Download size={13}/> {t("تصدير البيانات")}</>}
            </button>
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: "0.5rem" }}>
              {t("يشمل التصدير: الفندق، الغرف، الحجوزات، الموظفين، الصيانة، والإعدادات.")}
            </p>
          </CardSection>

          {/* Import */}
          <CardSection title={t("استيراد نسخة احتياطية")} desc={t("استعد نسخة محفوظة مسبقًا. تأكد من صحة الملف قبل الاستيراد.")}>
            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "0.5rem", padding: "0.65rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#92400e" }}>
              <AlertTriangle size={13} style={{display:"inline",marginLeft:4}}/> {t("استيراد نسخة احتياطية قد يستبدل الإعدادات الحالية. تأكد من أنك تستخدم ملفًا صحيحًا.")}
            </div>
            <input ref={importRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={doImport} />
            <button className="ds-btn ds-btn-neutral" onClick={() => importRef.current?.click()}>
              📂 {t("اختيار ملف JSON")}
            </button>
          </CardSection>

          {/* Reset */}
          <CardSection title={t("إعادة ضبط البيانات المحلية")} desc={t("استخدم هذا الخيار فقط في بيئة التجربة لمسح الإعدادات المحفوظة وإعادة تهيئة النظام.")}>
            {!confirmReset ? (
              <button
                style={{ padding: "0.5rem 1.2rem", borderRadius: "0.5rem", border: "1px solid #dc2626", background: "#fef2f2", color: "#dc2626", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
                onClick={() => setConfirmReset(true)}
              >
                <Trash2 size={13}/> {t("إعادة الضبط")}
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <p style={{ fontSize: "0.875rem", color: "#dc2626", fontWeight: 600, margin: 0 }}>{t("هل أنت متأكد؟ سيتم مسح جميع الإعدادات المحفوظة.")}</p>
                <button style={{ padding: "0.4rem 1rem", borderRadius: "0.5rem", background: "#dc2626", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }} onClick={doReset}>{t("نعم، إعادة الضبط")}</button>
                <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => setConfirmReset(false)}>{t("إلغاء")}</button>
              </div>
            )}
          </CardSection>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 8: الواجهة
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "appearance" && (
        <CardSection title={t("الواجهة")} desc={t("تفضيلات عرض النظام. المشروع يستخدم ثيمًا أساسيًا ثابتًا واحدًا.")}>
          <div style={G2}>
            <FLD label={t("اللغة الافتراضية")}>
              <select className="select" value={appearance.language} onChange={e => setAppearance(p => ({ ...p, language: e.target.value }))}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </FLD>
            <FLD label={t("كثافة العرض")}>
              <select className="select" value={appearance.density} onChange={e => setAppearance(p => ({ ...p, density: e.target.value }))}>
                <option value="comfortable">{t("مريحة")}</option>
                <option value="compact">{t("مدمجة")}</option>
              </select>
            </FLD>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <SW label={t("تفعيل الحركات الناعمة")} checked={appearance.animations} onChange={v => setAppearance(p => ({ ...p, animations: v }))} hint={t("تحريك العناصر عند الانتقال والتفاعل")} />
          </div>
          <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: "#f0f9ff", borderRadius: "0.5rem", border: "1px solid #bae6fd", fontSize: "0.82rem", color: "#0369a1" }}>
            {t("اتجاه الواجهة")}: <strong>RTL ({t("يمين إلى يسار")})</strong> — {t("يُطبَّق تلقائيًا للغة العربية.")}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات الواجهة")} saving={saving} saved={false} onClick={doSaveAppearance} />
          </div>
        </CardSection>
      )}
    </div>
  );
}
