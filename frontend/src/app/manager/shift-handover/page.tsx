"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck, Plus, X, Sun, Moon, Sunset, User,
  Calendar, FileText, AlertTriangle, CheckCircle2, Trash2, Clock,
} from "lucide-react";
import { useLang } from "../LangContext";

/* ─── Types ──────────────────────────────────────────────────── */
type TShift = "morning" | "evening" | "night";

interface HandoverNote {
  id: string;
  shift: TShift;
  staffName: string;
  handoverDate: string;
  occupiedRooms: number;
  arrivals: number;
  departures: number;
  pendingIssues: string;
  guestComplaints: string;
  maintenanceNotes: string;
  cashAmount: string;
  generalNotes: string;
  createdAt: string;
}

/* ─── Constants ──────────────────────────────────────────────── */
const STORAGE_KEY = (h: string) => `fandqi.shiftHandover.${h}`;

const SHIFT_ICON: Record<TShift, LucideIcon> = {
  morning: Sun    as LucideIcon,
  evening: Sunset as LucideIcon,
  night:   Moon   as LucideIcon,
};

const SHIFT_GRAD: Record<TShift, string> = {
  morning: "linear-gradient(135deg,#f59e0b,#d97706)",
  evening: "linear-gradient(135deg,#f97316,#ea580c)",
  night:   "linear-gradient(135deg,#6366f1,#4f46e5)",
};

import { BASE_URL as API, getAuthHeaders as apiH } from "@/lib/api";

function detectShift(): TShift {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 22) return "evening";
  return "night";
}

const BLANK: Omit<HandoverNote, "id" | "createdAt"> = {
  shift: "morning",
  staffName: "",
  handoverDate: new Date().toISOString().split("T")[0],
  occupiedRooms: 0,
  arrivals: 0,
  departures: 0,
  pendingIssues: "",
  guestComplaints: "",
  maintenanceNotes: "",
  cashAmount: "",
  generalNotes: "",
};

function uid() {
  return `sh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function todayIso() { return new Date().toISOString().split("T")[0]; }
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("ar-SA"); } catch { return d; }
}

/* ══════════════════════════════════════════════════════════════ */
export default function ShiftHandoverPage() {
  const { t, lang } = useLang();

  const SHIFT_SHORT: Record<TShift, string> = {
    morning: t("الصباح"),
    evening: t("المساء"),
    night:   t("الليل"),
  };

  const hotelId =
    typeof window !== "undefined"
      ? (localStorage.getItem("hotel_id") ?? "")
      : "";

  const [notes,       setNotes]       = useState<HandoverNote[]>([]);
  const [currentUser, setCurrentUser] = useState("");
  const [fShift,    setFShift]    = useState<TShift | "all">("all");
  const [modal,     setModal]     = useState<"add" | "view" | "delete" | null>(null);
  const [form,      setForm]      = useState<Omit<HandoverNote, "id" | "createdAt">>(BLANK);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [viewNote,  setViewNote]  = useState<HandoverNote | null>(null);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);

  /* ── Load / Save ── */
  useEffect(() => {
    if (!hotelId) return;
    const load = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY(hotelId));
        if (raw) setNotes(JSON.parse(raw));
      } catch { /* ignore */ }
    };
    load();
  }, [hotelId]);

  /* ── Current user (for staff name auto-fill) ── */
  useEffect(() => {
    fetch(`${API}/current-user/`, { headers: apiH() })
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u?.username) setCurrentUser(u.username); })
      .catch(() => {});
  }, []);

  function save(next: HandoverNote[]) {
    setNotes(next);
    if (hotelId) localStorage.setItem(STORAGE_KEY(hotelId), JSON.stringify(next));
  }

  /* ── KPIs ── */
  const total       = notes.length;
  const morningCnt  = notes.filter(n => n.shift === "morning").length;
  const eveningCnt  = notes.filter(n => n.shift === "evening").length;
  const nightCnt    = notes.filter(n => n.shift === "night").length;
  const todayNotes  = notes.filter(n => n.handoverDate === todayIso()).length;

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    return notes.filter(n => fShift === "all" || n.shift === fShift)
      .sort((a, b) => b.handoverDate.localeCompare(a.handoverDate) || b.createdAt.localeCompare(a.createdAt));
  }, [notes, fShift]);

  /* ── CRUD ── */
  function openAdd() {
    setForm({ ...BLANK, handoverDate: todayIso(), shift: detectShift(), staffName: currentUser });
    setEditId(null);
    setModal("add");
  }
  function openEdit(note: HandoverNote) {
    setForm({
      shift: note.shift, staffName: note.staffName,
      handoverDate: note.handoverDate, occupiedRooms: note.occupiedRooms,
      arrivals: note.arrivals, departures: note.departures,
      pendingIssues: note.pendingIssues, guestComplaints: note.guestComplaints,
      maintenanceNotes: note.maintenanceNotes, cashAmount: note.cashAmount,
      generalNotes: note.generalNotes,
    });
    setEditId(note.id);
    setModal("add");
  }
  function submitForm() {
    if (!form.staffName.trim()) return;
    const now = new Date().toISOString();
    if (editId) {
      save(notes.map(n => n.id === editId ? { ...form, id: editId, createdAt: n.createdAt } : n));
    } else {
      save([...notes, { ...form, id: uid(), createdAt: now }]);
    }
    setModal(null);
  }
  function confirmDelete() {
    if (!deleteId) return;
    save(notes.filter(n => n.id !== deleteId));
    setDeleteId(null);
    setModal(null);
  }

  /* ─── KPI cards ─── */
  type KpiCard = { label: string; value: number; sub: string; Icon: LucideIcon; grad: string; active: boolean; onClick: () => void };
  const kpiCards: KpiCard[] = [
    {
      label: t("إجمالي السجلات"),
      value: total,
      sub: t("جميع تسليمات الوردية"),
      Icon: ClipboardCheck as LucideIcon,
      grad: "linear-gradient(135deg,#6366f1,#4f46e5)",
      active: fShift === "all",
      onClick: () => setFShift("all"),
    },
    {
      label: t("وردية الصباح"),
      value: morningCnt,
      sub: "06:00 — 14:00",
      Icon: Sun as LucideIcon,
      grad: SHIFT_GRAD.morning,
      active: fShift === "morning",
      onClick: () => setFShift("morning"),
    },
    {
      label: t("وردية المساء"),
      value: eveningCnt,
      sub: "14:00 — 22:00",
      Icon: Sunset as LucideIcon,
      grad: SHIFT_GRAD.evening,
      active: fShift === "evening",
      onClick: () => setFShift("evening"),
    },
    {
      label: t("وردية الليل"),
      value: nightCnt,
      sub: "22:00 — 06:00",
      Icon: Moon as LucideIcon,
      grad: SHIFT_GRAD.night,
      active: fShift === "night",
      onClick: () => setFShift("night"),
    },
  ];

  /* ══════════════════════════════════════════ RENDER ═════════ */
  return (
    <div className="ds-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.3rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: "var(--btn-luxury-bg)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardCheck size={18} color="#fff" strokeWidth={2} />
            </div>
            <h1>{t("تسليم الوردية")}</h1>
          </div>
          <p>{t("توثيق حالة الفندق عند كل تسليم وردية — غرف مشغولة، أحداث، ملاحظات مالية وتشغيلية.")}</p>
        </div>
        <div className="page-actions">
          {todayNotes > 0 && (
            <span className="ds-badge ds-badge-success" style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px" }}>
              <CheckCircle2 size={13} strokeWidth={2.5} /> {lang === "ar" ? `${todayNotes} تسليم اليوم` : `${todayNotes} handover${todayNotes !== 1 ? "s" : ""} today`}
            </span>
          )}
          <button className="ds-btn ds-btn-primary" onClick={openAdd}>
            <Plus size={16} strokeWidth={2.5} /> {t("تسليم وردية جديد")}
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.65rem", marginBottom: "1.5rem" }}>
        {kpiCards.map(s => (
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick}
            style={{
              background: s.grad, borderRadius: 12, padding: "0.85rem 0.7rem",
              color: "#fff", cursor: "pointer", position: "relative",
              transition: "transform .15s,box-shadow .15s",
              ...(s.active ? { transform: "translateY(-3px) scale(1.02)", boxShadow: "0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)" } : {}),
            }}>
            {s.active && (
              <span style={{ position: "absolute", top: "0.4rem", left: "0.5rem", fontSize: "0.55rem",
                fontWeight: 700, background: "rgba(255,255,255,.25)", padding: "0.1rem 0.4rem", borderRadius: "1rem" }}>
                ● {t("نشط")}
              </span>
            )}
            <div className="ds-kpi-icon"><s.Icon size={24} strokeWidth={1.6} /></div>
            <p style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.3, marginBottom: 2 }}>{s.value}</p>
            <p style={{ fontSize: 9, opacity: 0.75 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filtered.length === 0 ? (
          <div className="ds-card-p" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <ClipboardCheck size={44} strokeWidth={1.2} style={{ marginBottom: 8, color: "var(--color-muted)" }} />
            <p style={{ fontWeight: 800, fontSize: 15, color: "var(--color-heading)", marginBottom: 6 }}>{t("لا توجد سجلات تسليم وردية")}</p>
            <p style={{ fontSize: 13, color: "var(--color-muted)" }}>{t("سجّل أول تسليم وردية بالضغط على الزر أعلاه.")}</p>
          </div>
        ) : (
          filtered.map(note => {
            const SIcon = SHIFT_ICON[note.shift];
            const hasIssues = note.pendingIssues.trim() || note.guestComplaints.trim() || note.maintenanceNotes.trim();
            return (
              <div key={note.id} className="ds-card-p"
                style={{ borderRight: `4px solid ${note.shift === "morning" ? "#f59e0b" : note.shift === "evening" ? "#f97316" : "#6366f1"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10,
                      background: SHIFT_GRAD[note.shift],
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <SIcon size={20} color="#fff" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 14, color: "var(--color-heading)" }}>
                        {SHIFT_SHORT[note.shift]} — {fmtDate(note.handoverDate)}
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: "var(--color-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                          <User size={11} /> {note.staffName}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--color-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={11} /> {note.createdAt.slice(11, 16)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
                      {[
                        { l: t("مشغولة"), v: note.occupiedRooms, c: "#2563eb" },
                        { l: t("وصول"), v: note.arrivals, c: "#16a34a" },
                        { l: t("مغادرة"), v: note.departures, c: "#dc2626" },
                      ].map(s => (
                        <span key={s.l} style={{ background: `${s.c}15`, color: s.c, border: `1px solid ${s.c}33`,
                          borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                          {s.v} {s.l}
                        </span>
                      ))}
                    </div>
                    {hasIssues && (
                      <span style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a",
                        borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                        display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={10} strokeWidth={2.5} /> {t("ملاحظات")}
                      </span>
                    )}
                    {note.cashAmount && (
                      <span style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0",
                        borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {lang === "ar" ? `نقدي: ${note.cashAmount}` : `Cash: ${note.cashAmount}`}
                      </span>
                    )}
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="ds-btn ds-btn-sm" onClick={() => { setViewNote(note); setModal("view"); }}
                        style={{ fontSize: 11, padding: "3px 10px" }}>{t("عرض")}</button>
                      <button className="ds-btn ds-btn-sm" onClick={() => openEdit(note)}
                        style={{ fontSize: 11, padding: "3px 10px", background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" }}>
                        {t("تعديل")}
                      </button>
                      <button onClick={() => { setDeleteId(note.id); setModal("delete"); }}
                        style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8,
                          padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
                {note.generalNotes && (
                  <div style={{ marginTop: "0.65rem", background: "#f8fafc", borderRadius: 8,
                    padding: "8px 12px", fontSize: 12, color: "var(--color-muted)", borderRight: "3px solid #e2e8f0" }}>
                    {note.generalNotes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ══ Modal: Add / Edit ══ */}
      {modal === "add" && (
        <div className="ds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="ds-modal-head">
              <span style={{ fontWeight: 800 }}>{editId ? t("تعديل التسليم") : t("تسليم وردية جديد")}</span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="ds-modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <p className="ds-filter-label">
                    {t("الوردية")}
                    {!editId && (
                      <span style={{ marginRight: 6, fontSize: 10, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "1px 7px" }}>{t("مُكتشفة من الساعة")}</span>
                    )}
                  </p>
                  <select className="input" value={form.shift}
                    onChange={e => setForm(f => ({ ...f, shift: e.target.value as TShift }))}
                    style={{ fontSize: 12 }}>
                    <option value="morning">{t("وردية الصباح")}</option>
                    <option value="evening">{t("وردية المساء")}</option>
                    <option value="night">{t("وردية الليل")}</option>
                  </select>
                </div>
                <div>
                  <p className="ds-filter-label">
                    {t("اسم الموظف")} *
                    {!editId && currentUser && (
                      <span style={{ marginRight: 6, fontSize: 10, background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "1px 7px" }}>{t("مُعبأ تلقائياً")}</span>
                    )}
                  </p>
                  <div style={{ position: "relative" }}>
                    <User size={13} style={{ position: "absolute", top: "50%", right: 9, transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                    <input className="input" placeholder={t("اسم الموظف")}
                      value={form.staffName} onChange={e => setForm(f => ({ ...f, staffName: e.target.value }))}
                      style={{ paddingRight: 30, fontSize: 12 }} />
                  </div>
                </div>
                <div>
                  <p className="ds-filter-label">{t("تاريخ الوردية")}</p>
                  <div style={{ position: "relative" }}>
                    <Calendar size={13} style={{ position: "absolute", top: "50%", right: 9, transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                    <input className="input" type="date"
                      value={form.handoverDate} onChange={e => setForm(f => ({ ...f, handoverDate: e.target.value }))}
                      style={{ paddingRight: 30, fontSize: 12 }} />
                  </div>
                </div>
              </div>

              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "0.85rem", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--color-heading)", marginBottom: "0.65rem" }}>{t("أرقام الوردية")}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.65rem" }}>
                  {[
                    { l: t("غرف مشغولة"), k: "occupiedRooms" as const },
                    { l: t("وصول اليوم"), k: "arrivals"      as const },
                    { l: t("مغادرات اليوم"), k: "departures"  as const },
                  ].map(f => (
                    <div key={f.k}>
                      <p className="ds-filter-label">{f.l}</p>
                      <input className="input" type="number" min={0}
                        value={form[f.k]} onChange={e => setForm(prev => ({ ...prev, [f.k]: parseInt(e.target.value) || 0 }))}
                        style={{ fontSize: 12 }} />
                    </div>
                  ))}
                  <div>
                    <p className="ds-filter-label">{t("النقدي الموجود")}</p>
                    <input className="input" placeholder={lang === "ar" ? "مثال: 2500 SAR" : "e.g. 2500 SAR"}
                      value={form.cashAmount} onChange={e => setForm(f => ({ ...f, cashAmount: e.target.value }))}
                      style={{ fontSize: 12 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <p className="ds-filter-label">{t("مشكلات معلقة / أحداث")}</p>
                  <textarea className="input" rows={3} placeholder={t("مشكلات تحتاج متابعة في الوردية القادمة…")}
                    value={form.pendingIssues} onChange={e => setForm(f => ({ ...f, pendingIssues: e.target.value }))}
                    style={{ fontSize: 12, resize: "vertical" }} />
                </div>
                <div>
                  <p className="ds-filter-label">{t("شكاوى النزلاء")}</p>
                  <textarea className="input" rows={3} placeholder={t("أي شكاوى أو طلبات خاصة من النزلاء…")}
                    value={form.guestComplaints} onChange={e => setForm(f => ({ ...f, guestComplaints: e.target.value }))}
                    style={{ fontSize: 12, resize: "vertical" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <p className="ds-filter-label">{t("ملاحظات الصيانة")}</p>
                  <textarea className="input" rows={2} placeholder={t("مشاكل صيانة تحتاج متابعة…")}
                    value={form.maintenanceNotes} onChange={e => setForm(f => ({ ...f, maintenanceNotes: e.target.value }))}
                    style={{ fontSize: 12, resize: "vertical" }} />
                </div>
                <div>
                  <p className="ds-filter-label">{t("ملاحظات عامة")}</p>
                  <textarea className="input" rows={2} placeholder={t("أي معلومات مهمة للوردية القادمة…")}
                    value={form.generalNotes} onChange={e => setForm(f => ({ ...f, generalNotes: e.target.value }))}
                    style={{ fontSize: 12, resize: "vertical" }} />
                </div>
              </div>
            </div>
            <div className="ds-modal-foot" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="ds-btn ds-btn-sm" onClick={() => setModal(null)}
                style={{ background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" }}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-sm" onClick={submitForm} disabled={!form.staffName.trim()}>
                <CheckCircle2 size={13} strokeWidth={2.5} />
                {editId ? t("حفظ التعديلات") : t("تسجيل التسليم")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: View ══ */}
      {modal === "view" && viewNote && (
        <div className="ds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="ds-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(()=>{ const SIcon = SHIFT_ICON[viewNote.shift]; return <SIcon size={18} strokeWidth={1.8}/>; })()}
                <span style={{ fontWeight: 800 }}>
                  {SHIFT_SHORT[viewNote.shift]} — {fmtDate(viewNote.handoverDate)}
                </span>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="ds-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {[
                  { l: t("مشغولة"), v: viewNote.occupiedRooms, c: "#2563eb" },
                  { l: t("وصول"), v: viewNote.arrivals, c: "#16a34a" },
                  { l: t("مغادرة"), v: viewNote.departures, c: "#dc2626" },
                ].map(s => (
                  <div key={s.l} style={{ background: `${s.c}15`, borderRadius: 8, padding: "0.65rem",
                    textAlign: "center", border: `1px solid ${s.c}33` }}>
                    <p style={{ fontSize: 11, color: s.c, fontWeight: 600 }}>{s.l}</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {([
                  { l: t("الموظف"), v: viewNote.staffName, Icon: User as LucideIcon },
                  { l: t("وقت التسجيل"), v: viewNote.createdAt.slice(11, 16), Icon: Clock as LucideIcon },
                  ...(viewNote.cashAmount ? [{ l: t("النقدي الموجود"), v: viewNote.cashAmount, Icon: FileText as LucideIcon }] : []),
                ] as { l: string; v: string; Icon: LucideIcon }[]).map(row => (
                  <div key={row.l} style={{ display: "flex", alignItems: "center", gap: 10,
                    background: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>
                    <row.Icon size={14} strokeWidth={1.8} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--color-muted)", width: 110, flexShrink: 0 }}>{row.l}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{row.v}</span>
                  </div>
                ))}
                {[
                  { l: t("مشكلات معلقة"), v: viewNote.pendingIssues },
                  { l: t("شكاوى النزلاء"), v: viewNote.guestComplaints },
                  { l: t("ملاحظات الصيانة"), v: viewNote.maintenanceNotes },
                  { l: t("ملاحظات عامة"), v: viewNote.generalNotes },
                ].filter(r => r.v.trim()).map(row => (
                  <div key={row.l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", marginBottom: 4 }}>{row.l}</p>
                    <p style={{ fontSize: 12, color: "var(--color-heading)", whiteSpace: "pre-wrap" }}>{row.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="ds-modal-foot" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="ds-btn ds-btn-sm" onClick={() => openEdit(viewNote)}
                style={{ background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" }}>{t("تعديل")}</button>
              <button className="ds-btn ds-btn-sm" onClick={() => setModal(null)}>{t("إغلاق")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Delete ══ */}
      {modal === "delete" && deleteId && (
        <div className="ds-modal-backdrop" onClick={() => { setModal(null); setDeleteId(null); }}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="ds-modal-head">
              <span style={{ fontWeight: 800 }}>{t("حذف سجل التسليم")}</span>
              <button onClick={() => { setModal(null); setDeleteId(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="ds-modal-body">
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <AlertTriangle size={40} strokeWidth={1.4} style={{ color: "#dc2626", marginBottom: 8 }} />
                <p style={{ fontWeight: 800, color: "var(--color-heading)", marginBottom: 6 }}>
                  {t("هل أنت متأكد من حذف هذا السجل؟")}
                </p>
                <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{t("لا يمكن التراجع عن هذه العملية.")}</p>
              </div>
            </div>
            <div className="ds-modal-foot" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="ds-btn ds-btn-sm" onClick={() => { setModal(null); setDeleteId(null); }}
                style={{ background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" }}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-sm" onClick={confirmDelete}
                style={{ background: "#dc2626", border: "none" }}>
                <Trash2 size={13} strokeWidth={2} /> {t("حذف")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
