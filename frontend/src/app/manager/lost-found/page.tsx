"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import RoomServicesTabs from "../RoomServicesTabs";
import {
  Archive, Plus, X, Search, Tag, MapPin, User, Calendar,
  CheckCircle2, Clock, AlertTriangle, Package, Trash2,
} from "lucide-react";
import { useLang } from "../LangContext";

/* ─── Types ──────────────────────────────────────────────────── */
type TStatus = "found" | "returned" | "unclaimed";
type TCategory =
  | "electronics" | "clothing" | "accessories" | "documents"
  | "money" | "keys" | "bags" | "other";

interface LostItem {
  id: string;
  itemName: string;
  category: TCategory;
  location: string;
  status: TStatus;
  guestName: string;
  roomNumber: string;
  notes: string;
  foundDate: string;
  returnedDate: string;
}

/* ─── Constants ──────────────────────────────────────────────── */
const STATUS_STYLE: Record<TStatus, React.CSSProperties> = {
  found:     { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  returned:  { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" },
  unclaimed: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" },
};

const STATUS_ICON: Record<TStatus, LucideIcon> = {
  found:     Clock         as LucideIcon,
  returned:  CheckCircle2  as LucideIcon,
  unclaimed: AlertTriangle as LucideIcon,
};

const BLANK: Omit<LostItem, "id"> = {
  itemName: "", category: "other", location: "",
  status: "found", guestName: "", roomNumber: "",
  notes: "", foundDate: new Date().toISOString().split("T")[0], returnedDate: "",
};

import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";

interface ResLookup {
  room_number: string | null;
  guest_first_name: string;
  guest_last_name: string;
  status: string;
}

function mapItem(x: Record<string, unknown>): LostItem {
  return {
    id: String(x.id ?? ""),
    itemName: String(x.item_name ?? ""),
    category: String(x.category ?? "other") as TCategory,
    location: String(x.location ?? ""),
    status: String(x.status ?? "found") as TStatus,
    guestName: String(x.guest_name ?? ""),
    roomNumber: String(x.room_number ?? ""),
    notes: String(x.notes ?? ""),
    foundDate: String(x.found_date ?? "").slice(0, 10),
    returnedDate: String(x.returned_date ?? "").slice(0, 10),
  };
}
function toBody(f: Omit<LostItem, "id">) {
  return {
    item_name: f.itemName, category: f.category, location: f.location, status: f.status,
    guest_name: f.guestName, room_number: f.roomNumber, notes: f.notes,
    found_date: f.foundDate || null, returned_date: f.returnedDate || null,
  };
}
function todayIso() { return new Date().toISOString().split("T")[0]; }
function daysDiff(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  return Math.floor(ms / 86400000);
}

/* ══════════════════════════════════════════════════════════════ */
export default function LostFoundPage() {
  const { t, lang } = useLang();

  const CATEGORY_LABELS: Record<TCategory, string> = {
    electronics: t("إلكترونيات"),
    clothing: t("ملابس"),
    accessories: t("إكسسوارات"),
    documents: t("وثائق ومستندات"),
    money: t("أموال"),
    keys: t("مفاتيح"),
    bags: t("حقائب"),
    other: t("أخرى"),
  };

  const STATUS_LABELS: Record<TStatus, string> = {
    found: t("موجود — بانتظار المطالبة"),
    returned: t("تم التسليم للنزيل"),
    unclaimed: t("غير مطالب به"),
  };

  const hotelId =
    typeof window !== "undefined"
      ? (localStorage.getItem("hotel_id") ?? "")
      : "";

  const [items,        setItems]        = useState<LostItem[]>([]);
  const [reservations, setReservations] = useState<ResLookup[]>([]);
  const [search,    setSearch]    = useState("");
  const [fStatus,   setFStatus]   = useState<TStatus | "all">("all");
  const [fCategory, setFCategory] = useState<TCategory | "all">("all");
  const [modal,     setModal]     = useState<"add" | "view" | "delete" | null>(null);
  const [form,      setForm]      = useState<Omit<LostItem, "id">>(BLANK);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [viewItem,  setViewItem]  = useState<LostItem | null>(null);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);

  /* ── Load (من الـBackend) ── */
  const loadItems = async () => {
    if (!hotelId) return;
    try {
      const r = await fetch(`${API}/lost-found/?hotel=${hotelId}`, { headers: apiH() });
      const d = await r.json();
      setItems((Array.isArray(d) ? d : (d.results ?? [])).map(mapItem));
    } catch { setItems([]); }
  };

  useEffect(() => {
    if (!hotelId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
    loadItems();
    /* fetch reservations for guest-name lookup */
    fetch(`${API}/reservations/?hotel=${hotelId}`, { headers: apiH() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setReservations(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  /* ── Room → Guest lookup ── */
  function onRoomChange(val: string) {
    const match = reservations.find(
      r => r.room_number === val && r.status === "checked_in"
    );
    setForm(f => ({
      ...f,
      roomNumber: val,
      guestName: match
        ? `${match.guest_first_name} ${match.guest_last_name}`.trim()
        : f.guestName,
    }));
  }

  /* ── KPIs ── */
  const total     = items.length;
  const foundCnt  = items.filter(i => i.status === "found").length;
  const returnedCnt = items.filter(i => i.status === "returned").length;
  const oldCnt    = items.filter(i => i.status === "found" && daysDiff(i.foundDate) > 30).length;

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (fStatus !== "all" && i.status !== fStatus) return false;
      if (fCategory !== "all" && i.category !== fCategory) return false;
      if (q && !i.itemName.toLowerCase().includes(q) &&
          !i.location.toLowerCase().includes(q) &&
          !i.guestName.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.foundDate.localeCompare(a.foundDate));
  }, [items, fStatus, fCategory, search]);

  /* ── CRUD ── */
  function openAdd() {
    setForm({ ...BLANK, foundDate: todayIso() });
    setEditId(null);
    setModal("add");
  }
  function openEdit(item: LostItem) {
    setForm({
      itemName: item.itemName, category: item.category, location: item.location,
      status: item.status, guestName: item.guestName, roomNumber: item.roomNumber,
      notes: item.notes, foundDate: item.foundDate, returnedDate: item.returnedDate,
    });
    setEditId(item.id);
    setModal("add");
  }
  async function submitForm() {
    if (!form.itemName.trim()) return;
    try {
      const r = await fetch(editId ? `${API}/lost-found/${editId}/` : `${API}/lost-found/`, {
        method: editId ? "PATCH" : "POST",
        headers: apiHJ(),
        body: JSON.stringify(toBody(form)),
      });
      if (!r.ok) throw new Error();
      setModal(null);
      await loadItems();
    } catch { /* أبقِ النموذج مفتوحًا عند الفشل */ }
  }
  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const r = await fetch(`${API}/lost-found/${deleteId}/`, { method: "DELETE", headers: apiH() });
      if (!r.ok && r.status !== 204) throw new Error();
    } catch { /* ignore */ }
    setDeleteId(null);
    setModal(null);
    await loadItems();
  }
  async function markReturned(id: string) {
    try {
      const r = await fetch(`${API}/lost-found/${id}/`, {
        method: "PATCH", headers: apiHJ(),
        body: JSON.stringify({ status: "returned", returned_date: todayIso() }),
      });
      if (!r.ok) throw new Error();
      await loadItems();
    } catch { /* ignore */ }
  }

  /* ─── KPI cards ─── */
  type KpiCard = { label: string; value: string | number; sub: string; Icon: LucideIcon; grad: string; active: boolean; onClick: () => void };
  const kpiCards: KpiCard[] = [
    {
      label: t("إجمالي المفقودات"),
      value: total,
      sub: t("منذ بداية التسجيل"),
      Icon: Archive as LucideIcon,
      grad: "linear-gradient(135deg,#6366f1,#4f46e5)",
      active: fStatus === "all" && fCategory === "all",
      onClick: () => { setFStatus("all"); setFCategory("all"); },
    },
    {
      label: t("بانتظار المطالبة"),
      value: foundCnt,
      sub: t("موجودة ولم تُسلَّم"),
      Icon: Clock as LucideIcon,
      grad: "linear-gradient(135deg,#2563eb,#1d4ed8)",
      active: fStatus === "found",
      onClick: () => setFStatus("found"),
    },
    {
      label: t("تم التسليم"),
      value: returnedCnt,
      sub: t("سُلِّمت لأصحابها"),
      Icon: CheckCircle2 as LucideIcon,
      grad: "linear-gradient(135deg,#22c55e,#16a34a)",
      active: fStatus === "returned",
      onClick: () => setFStatus("returned"),
    },
    {
      label: t("قديمة +30 يوم"),
      value: oldCnt,
      sub: t("تحتاج مراجعة أو تصرف"),
      Icon: AlertTriangle as LucideIcon,
      grad: "linear-gradient(135deg,#f59e0b,#d97706)",
      active: false,
      onClick: () => {},
    },
  ];

  /* ═══════════════════════════════════════════ RENDER ═════════ */
  return (
    <div className="ds-page">
      <RoomServicesTabs />

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.3rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: "var(--btn-luxury-bg)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Archive size={18} color="#fff" strokeWidth={2} />
            </div>
            <h1>{t("المفقودات والموجودات")}</h1>
          </div>
          <p>{t("تسجيل الأشياء المفقودة والموجودة في الفندق، ومتابعة حالة تسليمها لأصحابها.")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-primary" onClick={openAdd}>
            <Plus size={16} strokeWidth={2.5} /> {t("تسجيل موجودة جديدة")}
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
            <p style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.3, marginBottom: 2 }}>{s.value}</p>
            <p style={{ fontSize: 9, opacity: 0.75 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="ds-card-p" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p className="ds-filter-label">{t("بحث")}</p>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", color: "var(--color-muted)" }} />
              <input className="input" placeholder={t("اسم الغرض، الموقع، اسم النزيل…")}
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingRight: 32, fontSize: 12 }} />
            </div>
          </div>
          <div>
            <p className="ds-filter-label">{t("الحالة")}</p>
            <select className="input" value={fStatus} onChange={e => setFStatus(e.target.value as TStatus | "all")}
              style={{ fontSize: 12 }}>
              <option value="all">{t("الكل")}</option>
              <option value="found">{t("بانتظار المطالبة")}</option>
              <option value="returned">{t("تم التسليم")}</option>
              <option value="unclaimed">{t("غير مطالب به")}</option>
            </select>
          </div>
          <div>
            <p className="ds-filter-label">{t("الفئة")}</p>
            <select className="input" value={fCategory} onChange={e => setFCategory(e.target.value as TCategory | "all")}
              style={{ fontSize: 12 }}>
              <option value="all">{t("الكل")}</option>
              {(Object.keys(CATEGORY_LABELS) as TCategory[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="ds-card-p">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: "var(--color-heading)" }}>{t("سجل المفقودات والموجودات")}</p>
          <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
            borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
            {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <Package size={44} strokeWidth={1.2} style={{ marginBottom: 8, color: "var(--color-muted)" }} />
            <p style={{ fontWeight: 800, fontSize: 15, color: "var(--color-heading)", marginBottom: 6 }}>{t("لا توجد سجلات")}</p>
            <p style={{ fontSize: 13, color: "var(--color-muted)" }}>{t("سجّل أول غرض موجود بالضغط على الزر أعلاه.")}</p>
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>{t("الغرض")}</th>
                  <th>{t("الفئة")}</th>
                  <th>{t("الموقع")}</th>
                  <th>{t("تاريخ الاكتشاف")}</th>
                  <th>{t("النزيل")}</th>
                  <th>{t("الحالة")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const SIcon = STATUS_ICON[item.status];
                  const age = daysDiff(item.foundDate);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{item.itemName}</div>
                        {item.notes && <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{item.notes.slice(0, 40)}{item.notes.length > 40 ? "…" : ""}</div>}
                        {item.status === "found" && age > 30 && (
                          <span style={{ fontSize: 10, background: "#fef9c3", color: "#854d0e", borderRadius: 20, padding: "1px 6px", marginTop: 2, display: "inline-block" }}>
                            {lang === "ar" ? `${age} يوم` : `${age} days`}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-muted)" }}>{item.location || "—"}</td>
                      <td style={{ fontSize: 11, color: "var(--color-muted)" }}>{item.foundDate}</td>
                      <td style={{ fontSize: 12 }}>
                        {item.guestName ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.guestName}</div>
                            {item.roomNumber && <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{t("غرفة")} {item.roomNumber}</div>}
                          </div>
                        ) : "—"}
                      </td>
                      <td>
                        <span style={{ ...STATUS_STYLE[item.status], padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <SIcon size={10} strokeWidth={2.5} />
                          {STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="ds-btn ds-btn-sm" onClick={() => { setViewItem(item); setModal("view"); }}
                            style={{ fontSize: 11, padding: "3px 10px" }}>{t("عرض")}</button>
                          <button className="ds-btn ds-btn-sm" onClick={() => openEdit(item)}
                            style={{ fontSize: 11, padding: "3px 10px", background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" }}>
                            {t("تعديل")}
                          </button>
                          {item.status === "found" && (
                            <button className="ds-btn ds-btn-sm" onClick={() => markReturned(item.id)}
                              style={{ fontSize: 11, padding: "3px 10px", background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
                              {t("تسليم")}
                            </button>
                          )}
                          <button onClick={() => { setDeleteId(item.id); setModal("delete"); }}
                            style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8,
                              padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Modal: Add / Edit ══ */}
      {modal === "add" && (
        <div className="ds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="ds-modal-head">
              <span style={{ fontWeight: 800 }}>{editId ? t("تعديل السجل") : t("تسجيل غرض موجود")}</span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="ds-modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <p className="ds-filter-label">{t("اسم الغرض")} *</p>
                  <div style={{ position: "relative" }}>
                    <Tag size={13} style={{ position: "absolute", top: "50%", right: 9, transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                    <input className="input" placeholder={t("مثل: هاتف، محفظة، مفتاح…")}
                      value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                      style={{ paddingRight: 30, fontSize: 12 }} />
                  </div>
                </div>
                <div>
                  <p className="ds-filter-label">{t("الفئة")}</p>
                  <select className="input" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as TCategory }))}
                    style={{ fontSize: 12 }}>
                    {(Object.keys(CATEGORY_LABELS) as TCategory[]).map(c => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <p className="ds-filter-label">{t("موقع الاكتشاف")}</p>
                  <div style={{ position: "relative" }}>
                    <MapPin size={13} style={{ position: "absolute", top: "50%", right: 9, transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                    <input className="input" placeholder={t("غرفة 101، اللوبي، المطعم…")}
                      value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      style={{ paddingRight: 30, fontSize: 12 }} />
                  </div>
                </div>
                <div>
                  <p className="ds-filter-label">{t("تاريخ الاكتشاف")}</p>
                  <div style={{ position: "relative" }}>
                    <Calendar size={13} style={{ position: "absolute", top: "50%", right: 9, transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                    <input className="input" type="date"
                      value={form.foundDate} onChange={e => setForm(f => ({ ...f, foundDate: e.target.value }))}
                      style={{ paddingRight: 30, fontSize: 12 }} />
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <p className="ds-filter-label">
                    {t("اسم النزيل (إن عُرف)")}
                    {form.guestName && reservations.some(r => r.room_number === form.roomNumber && r.status === "checked_in") && (
                      <span style={{ marginRight: 6, fontSize: 10, background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "1px 7px" }}>{t("مُعبأ تلقائياً")}</span>
                    )}
                  </p>
                  <div style={{ position: "relative" }}>
                    <User size={13} style={{ position: "absolute", top: "50%", right: 9, transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                    <input className="input" placeholder={t("اسم النزيل")}
                      value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                      style={{ paddingRight: 30, fontSize: 12 }} />
                  </div>
                </div>
                <div>
                  <p className="ds-filter-label">{t("رقم الغرفة")}</p>
                  <input className="input" placeholder="101"
                    value={form.roomNumber} onChange={e => onRoomChange(e.target.value)}
                    style={{ fontSize: 12 }} />
                </div>
              </div>
              <div>
                <p className="ds-filter-label">{t("الحالة")}</p>
                <select className="input" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as TStatus }))}
                  style={{ fontSize: 12 }}>
                  <option value="found">{t("بانتظار المطالبة")}</option>
                  <option value="returned">{t("تم التسليم للنزيل")}</option>
                  <option value="unclaimed">{t("غير مطالب به")}</option>
                </select>
              </div>
              {form.status === "returned" && (
                <div>
                  <p className="ds-filter-label">{t("تاريخ التسليم")}</p>
                  <input className="input" type="date"
                    value={form.returnedDate || todayIso()}
                    onChange={e => setForm(f => ({ ...f, returnedDate: e.target.value }))}
                    style={{ fontSize: 12 }} />
                </div>
              )}
              <div>
                <p className="ds-filter-label">{t("ملاحظات")}</p>
                <textarea className="input" rows={2} placeholder={t("وصف إضافي للغرض…")}
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ fontSize: 12, resize: "vertical" }} />
              </div>
            </div>
            <div className="ds-modal-foot" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="ds-btn ds-btn-sm" onClick={() => setModal(null)}
                style={{ background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" }}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-sm" onClick={submitForm}
                disabled={!form.itemName.trim()}>
                {editId ? t("حفظ التعديلات") : t("تسجيل الغرض")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: View ══ */}
      {modal === "view" && viewItem && (
        <div className="ds-modal-backdrop" onClick={() => setModal(null)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="ds-modal-head">
              <span style={{ fontWeight: 800 }}>{t("تفاصيل الغرض")}</span>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="ds-modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {([
                  { l: t("اسم الغرض"),       v: viewItem.itemName,                     Icon: Tag as LucideIcon },
                  { l: t("الفئة"),            v: CATEGORY_LABELS[viewItem.category],    Icon: Archive as LucideIcon },
                  { l: t("موقع الاكتشاف"),   v: viewItem.location || "—",              Icon: MapPin as LucideIcon },
                  { l: t("تاريخ الاكتشاف"),  v: viewItem.foundDate,                    Icon: Calendar as LucideIcon },
                  { l: t("النزيل"),           v: viewItem.guestName || "—",             Icon: User as LucideIcon },
                  { l: t("رقم الغرفة"),       v: viewItem.roomNumber ? (lang === "ar" ? `غرفة ${viewItem.roomNumber}` : `Room ${viewItem.roomNumber}`) : "—", Icon: MapPin as LucideIcon },
                ] as { l: string; v: string; Icon: LucideIcon }[]).map(row => (
                  <div key={row.l} style={{ display: "flex", alignItems: "center", gap: 10,
                    background: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>
                    <row.Icon size={14} strokeWidth={1.8} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--color-muted)", width: 110, flexShrink: 0 }}>{row.l}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-heading)" }}>{row.v}</span>
                  </div>
                ))}
                <div style={{ ...STATUS_STYLE[viewItem.status], borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  {(()=>{ const SIcon = STATUS_ICON[viewItem.status]; return <SIcon size={14} strokeWidth={2.5}/>; })()}
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{STATUS_LABELS[viewItem.status]}</span>
                  {viewItem.returnedDate && <span style={{ fontSize: 11, marginRight: "auto" }}>{lang === "ar" ? `في ${viewItem.returnedDate}` : `on ${viewItem.returnedDate}`}</span>}
                </div>
                {viewItem.notes && (
                  <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0", fontSize: 12, color: "var(--color-muted)" }}>
                    {viewItem.notes}
                  </div>
                )}
              </div>
            </div>
            <div className="ds-modal-foot" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              {viewItem.status === "found" && (
                <button className="ds-btn ds-btn-sm" onClick={() => { markReturned(viewItem.id); setModal(null); }}
                  style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
                  <CheckCircle2 size={13} strokeWidth={2.5} /> {t("تسليم للنزيل")}
                </button>
              )}
              <button className="ds-btn ds-btn-sm" onClick={() => { openEdit(viewItem); }}
                style={{ background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0" }}>
                {t("تعديل")}
              </button>
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
              <span style={{ fontWeight: 800 }}>{t("حذف السجل")}</span>
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
