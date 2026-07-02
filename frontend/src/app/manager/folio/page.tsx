"use client";

import { useState, useEffect, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Receipt, Plus, Trash2, CheckCircle2, Search, Filter,
  Printer, Banknote, ShoppingCart, Shirt, Phone, Car,
  Sparkles, Utensils, Star, AlertTriangle, Package, X,
} from "lucide-react";

import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";
import { escapeHtml as esc, printHtml } from "@/lib/print";

const SET_KEY     = (h: string) => `fandqi.settings.${h}`;

/* ─── Types ──────────────────────────────────────────────────────────────── */
type TChargeType =
  | "minibar" | "laundry" | "phone" | "parking"
  | "spa" | "room_service" | "extra" | "damage" | "other";

interface FolioCharge {
  id: string;
  reservationId: number | string;
  guestName: string;
  roomNumber: string;
  bookingNumber: string;
  type: TChargeType;
  amount: number;
  currency: string;
  description: string;
  date: string;
  createdAt: string;
  createdBy: string;
  settled: boolean;
}

interface ActiveReservation {
  id: number | string;
  guestName: string;
  roomNumber: string;
  bookingNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

interface HotelInfo { id: number; name: string; city?: string; phone?: string; }

/* ─── Constants ──────────────────────────────────────────────────────────── */

/** Used only in the print template (intentionally Arabic-only). */
const PRINT_TYPE_LABELS: Record<TChargeType, string> = {
  minibar:      "مينيبار",
  laundry:      "غسيل ملابس",
  phone:        "هاتف",
  parking:      "موقف سيارة",
  spa:          "سبا",
  room_service: "خدمة غرف",
  extra:        "خدمة إضافية",
  damage:       "أضرار",
  other:        "أخرى",
};

const TYPE_COLORS: Record<TChargeType, string> = {
  minibar:      "#f59e0b",
  laundry:      "#2563eb",
  phone:        "#7c3aed",
  parking:      "#64748b",
  spa:          "#ec4899",
  room_service: "#16a34a",
  extra:        "#0891b2",
  damage:       "#dc2626",
  other:        "#94a3b8",
};

const TYPE_BG: Record<TChargeType, string> = {
  minibar:      "#fef9c3",
  laundry:      "#dbeafe",
  phone:        "#ede9fe",
  parking:      "#f1f5f9",
  spa:          "#fce7f3",
  room_service: "#dcfce7",
  extra:        "#cffafe",
  damage:       "#fee2e2",
  other:        "#f8fafc",
};

function mapCharge(x: Record<string, unknown>): FolioCharge {
  return {
    id: String(x.id ?? ""),
    reservationId: (x.reservation as number | string) ?? "",
    guestName: String(x.guest_name ?? ""),
    roomNumber: String(x.room_number ?? ""),
    bookingNumber: String(x.booking_number ?? ""),
    type: String(x.charge_type ?? "other") as TChargeType,
    amount: Number(x.amount ?? 0),
    currency: String(x.currency ?? "USD"),
    description: String(x.description ?? ""),
    date: String(x.charge_date ?? "").slice(0, 10),
    createdAt: String(x.created_at ?? ""),
    createdBy: String(x.created_by_name ?? ""),
    settled: Boolean(x.settled),
  };
}

const TYPE_ICONS: Record<TChargeType, LucideIcon> = {
  minibar:      ShoppingCart as LucideIcon,
  laundry:      Shirt as LucideIcon,
  phone:        Phone as LucideIcon,
  parking:      Car as LucideIcon,
  spa:          Sparkles as LucideIcon,
  room_service: Utensils as LucideIcon,
  extra:        Star as LucideIcon,
  damage:       AlertTriangle as LucideIcon,
  other:        Package as LucideIcon,
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function todayISO() { return new Date().toISOString().slice(0, 10); }

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return d; }
}

function fmtNum(n: number) { return n.toLocaleString("en-US"); }

function normalizeRes(r: Record<string, unknown>, tFn?: (s: string) => string): ActiveReservation {
  const gn   = String(r.guestName ?? r.guest_name ?? r.guest ?? (tFn ? tFn("نزيل") : "نزيل"));
  const room  = String(r.roomNumber ?? r.room_number ?? r.room ?? "—");
  const bkNum = String(r.bookingNumber ?? r.booking_number ?? r.id ?? "");
  const ci    = String(r.checkIn ?? r.check_in ?? "");
  const co    = String(r.checkOut ?? r.check_out ?? "");
  const st    = String(r.status ?? "checked_in");
  return { id: r.id as number | string, guestName: gn, roomNumber: room, bookingNumber: bkNum, checkIn: ci, checkOut: co, status: st };
}

/* ─── Print Folio ─────────────────────────────────────────────────────────── */
function printFolio(
  resId: number | string,
  charges: FolioCharge[],
  reservations: ActiveReservation[],
  hotel: HotelInfo | null,
  currency: string,
) {
  const res = reservations.find(r => String(r.id) === String(resId));
  const myCharges = charges.filter(c => String(c.reservationId) === String(resId));
  if (myCharges.length === 0) return;

  // Group by type
  const grouped: Partial<Record<TChargeType, FolioCharge[]>> = {};
  myCharges.forEach(c => {
    if (!grouped[c.type]) grouped[c.type] = [];
    grouped[c.type]!.push(c);
  });

  const grandTotal = myCharges.reduce((s, c) => s + c.amount, 0);
  const settled    = myCharges.filter(c => c.settled).reduce((s, c) => s + c.amount, 0);
  const pending    = grandTotal - settled;

  const rows = (Object.entries(grouped) as [TChargeType, FolioCharge[]][]).map(([type, items]) => {
    const sub = items.reduce((s, i) => s + i.amount, 0);
    const itemRows = items.map(i =>
      `<tr><td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(i.description) || PRINT_TYPE_LABELS[type]}</td>
       <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center">${fmtDate(i.date)}</td>
       <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:left;font-weight:700">${fmtNum(i.amount)} ${currency}</td>
       <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center">${i.settled ? "✓" : "—"}</td></tr>`
    ).join("");
    return `
      <tr style="background:#f8fafc">
        <td colspan="4" style="padding:6px 8px;font-weight:800;font-size:12px;color:#4f46e5">${PRINT_TYPE_LABELS[type]}</td>
      </tr>
      ${itemRows}
      <tr style="background:#eff6ff">
        <td colspan="3" style="padding:5px 8px;font-weight:800;font-size:12px;text-align:left">مجموع ${PRINT_TYPE_LABELS[type]}</td>
        <td style="padding:5px 8px;font-weight:900;font-size:13px;color:#4f46e5;text-align:left">${fmtNum(sub)} ${currency}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف فوليو</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:28px;color:#1e293b;direction:rtl;font-size:14px}.hdr{text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px}.hotel{font-size:22px;font-weight:900}.title{font-size:16px;font-weight:800;color:#4f46e5;margin-top:6px}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:12px 0}.cell{background:#f8fafc;border-radius:6px;padding:7px 10px}.cl{font-size:11px;color:#94a3b8}.cv{font-size:13px;font-weight:700}.table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#1e293b;color:#fff;padding:7px 8px;font-size:12px;text-align:right}.summary{margin:14px 0;background:#f8fafc;border-radius:8px;padding:12px}.srow{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:13px}.stotal{display:flex;justify-content:space-between;padding:8px 0;font-size:16px;font-weight:900;color:#4f46e5}.foot{text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:18px;padding-top:10px}@media print{body{padding:14px}}</style></head><body>
  <div class="hdr">
    <div class="hotel">${esc(hotel?.name)||"الفندق"}</div>
    ${hotel?.phone ? `<div style="font-size:12px;color:#64748b">هاتف: ${esc(hotel.phone)}</div>` : ""}
    <div class="title">كشف الفوليو — تفاصيل رسوم النزيل</div>
  </div>
  ${res ? `<div class="grid">
    <div class="cell"><div class="cl">اسم النزيل</div><div class="cv">${esc(res.guestName)}</div></div>
    <div class="cell"><div class="cl">رقم الغرفة</div><div class="cv">${esc(res.roomNumber)}</div></div>
    <div class="cell"><div class="cl">رقم الحجز</div><div class="cv">${esc(res.bookingNumber)}</div></div>
    <div class="cell"><div class="cl">تاريخ الوصول</div><div class="cv">${fmtDate(res.checkIn)}</div></div>
    <div class="cell"><div class="cl">تاريخ المغادرة</div><div class="cv">${fmtDate(res.checkOut)}</div></div>
    <div class="cell"><div class="cl">تاريخ الطباعة</div><div class="cv">${new Date().toLocaleDateString("ar-SA")}</div></div>
  </div>` : ""}
  <table class="table">
    <thead><tr><th>الوصف</th><th>التاريخ</th><th>المبلغ</th><th>مسدد</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <div class="srow"><span>إجمالي الرسوم</span><strong>${fmtNum(grandTotal)} ${currency}</strong></div>
    <div class="srow"><span style="color:#16a34a">مسدد</span><strong style="color:#16a34a">${fmtNum(settled)} ${currency}</strong></div>
    <div class="stotal"><span>المتبقي</span><span style="color:${pending > 0 ? "#dc2626" : "#16a34a"}">${fmtNum(pending)} ${currency}</span></div>
  </div>
  <div class="foot"><div>توقيع المستلم: _______________________</div><div style="margin-top:6px">شكرًا لاختياركم ${esc(hotel?.name)||"فندقنا"}</div></div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`;

  printHtml(html);
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function FolioPage() {
  const { t, lang } = useLang();

  const TYPE_LABELS: Record<TChargeType, string> = {
    minibar:      t("مينيبار"),
    laundry:      t("غسيل ملابس"),
    phone:        t("هاتف"),
    parking:      t("موقف سيارة"),
    spa:          t("سبا"),
    room_service: t("خدمة غرف"),
    extra:        t("خدمة إضافية"),
    damage:       t("أضرار"),
    other:        t("أخرى"),
  };
  const hotelId  = typeof window !== "undefined" ? (localStorage.getItem("hotel_id") ?? "") : "";

  const [charges,      setCharges]      = useState<FolioCharge[]>([]);
  const [reservations, setReservations] = useState<ActiveReservation[]>([]);
  const [currency,     setCurrency]     = useState("USD");
  const [hotel,        setHotel]        = useState<HotelInfo | null>(null);
  const [toast,        setToast]        = useState("");
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [printResId,   setPrintResId]   = useState<string>("");

  /* Filters */
  const [search,    setSearch]    = useState("");
  const [fType,     setFType]     = useState<TChargeType | "all">("all");
  const [fSettled,  setFSettled]  = useState<"all" | "yes" | "no">("all");
  const [fRoom,     setFRoom]     = useState<string>("all");

  /* Quick-add form */
  const blankForm = () => ({
    reservationId: "",
    type: "room_service" as TChargeType,
    amount: "",
    description: "",
    date: todayISO(),
  });
  const [form,    setForm]    = useState(blankForm());
  const [formErr, setFormErr] = useState("");

  /* ── Load data ── */
  useEffect(() => {
    if (!hotelId) return;

    const loadSync = async () => {
      // Settings / currency
      try {
        const s = JSON.parse(localStorage.getItem(SET_KEY(hotelId)) ?? "{}");
        if (s?.ops?.currency) setCurrency(s.ops.currency);
      } catch {}

      // الرسوم والحجوزات تُجلَب من الـBackend أدناه
    };
    loadSync();
    loadCharges();

    // Fetch checked-in reservations from API (non-blocking)
    fetch(`${API}/reservations/?hotel=${hotelId}&status=checked_in`, { headers: apiH() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          setReservations(data.map(r => normalizeRes(r as Record<string, unknown>, t)));
        } else if (data?.results && Array.isArray(data.results)) {
          setReservations(data.results.map((r: Record<string, unknown>) => normalizeRes(r, t)));
        }
      })
      .catch(() => {});

    // Hotel info
    fetch(`${API}/hotels/${hotelId}/`, { headers: apiH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHotel(d); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  async function loadCharges() {
    if (!hotelId) return;
    try {
      const r = await fetch(`${API}/folio-charges/?hotel=${hotelId}`, { headers: apiH() });
      const d = await r.json();
      setCharges((Array.isArray(d) ? d : (d.results ?? [])).map(mapCharge));
    } catch { setCharges([]); }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  /* ── KPIs ── */
  const totalAll      = useMemo(() => charges.reduce((s, c) => s + c.amount, 0), [charges]);
  const totalUnsettled= useMemo(() => charges.filter(c => !c.settled).reduce((s, c) => s + c.amount, 0), [charges]);
  const totalSettled  = useMemo(() => charges.filter(c => c.settled).reduce((s, c) => s + c.amount, 0), [charges]);
  const roomsWithCharges = useMemo(() => new Set(charges.map(c => c.roomNumber)).size, [charges]);

  /* ── Filtered & grouped ── */
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => charges.filter(c => {
    if (fType    !== "all" && c.type !== fType)          return false;
    if (fSettled === "yes" && !c.settled)                 return false;
    if (fSettled === "no"  && c.settled)                  return false;
    if (fRoom    !== "all" && c.roomNumber !== fRoom)     return false;
    if (q) {
      const hay = [c.guestName, c.roomNumber, c.bookingNumber, c.description, TYPE_LABELS[c.type]]
        .join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TYPE_LABELS derives from t(); adding it to deps would invalidate every render since it's recreated each render
  }), [charges, fType, fSettled, fRoom, q]);

  /* Group by reservationId then by room */
  const grouped = useMemo(() => {
    const map = new Map<string, FolioCharge[]>();
    filtered.forEach(c => {
      const key = String(c.reservationId);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [filtered]);

  const roomOptions = useMemo(() =>
    [...new Set(charges.map(c => c.roomNumber))].sort(),
  [charges]);

  /* ── Quick Add ── */
  function addCharge() {
    setFormErr("");
    if (!form.reservationId) { setFormErr(t("اختر حجزاً.")); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setFormErr(t("المبلغ يجب أن يكون أكبر من صفر.")); return; }
    if (!form.description.trim()) { setFormErr(t("الوصف مطلوب.")); return; }
    if (!form.date) { setFormErr(t("التاريخ مطلوب.")); return; }

    const res = reservations.find(r => String(r.id) === form.reservationId);
    if (!res) { setFormErr(t("الحجز غير موجود.")); return; }

    const body = {
      reservation: res.id ? Number(res.id) : null,
      guest_name: res.guestName, room_number: res.roomNumber, booking_number: res.bookingNumber,
      charge_type: form.type, amount: amt, currency,
      description: form.description.trim(), charge_date: form.date, settled: false,
    };
    (async () => {
      try {
        const r = await fetch(`${API}/folio-charges/`, { method: "POST", headers: apiHJ(), body: JSON.stringify(body) });
        if (!r.ok) throw new Error();
        setForm(blankForm());
        showToast(t("تم إضافة الرسمة بنجاح."));
        await loadCharges();
      } catch { setFormErr(t("تعذّر إضافة الرسمة.")); }
    })();
  }

  async function settleCharge(id: string) {
    try {
      const r = await fetch(`${API}/folio-charges/${id}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify({ settled: true }) });
      if (!r.ok) throw new Error();
      showToast(t("تمت التسوية."));
      await loadCharges();
    } catch { showToast(t("تعذّرت التسوية.")); }
  }

  async function deleteCharge(id: string) {
    try {
      const r = await fetch(`${API}/folio-charges/${id}/`, { method: "DELETE", headers: apiH() });
      if (!r.ok && r.status !== 204) throw new Error();
      setDeleteId(null);
      showToast(t("تم حذف الرسمة."));
      await loadCharges();
    } catch { setDeleteId(null); showToast(t("تعذّر الحذف.")); }
  }

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="ds-page">

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff", padding: "0.7rem 1.5rem",
          borderRadius: 10, fontWeight: 700, fontSize: 13,
          boxShadow: "0 4px 20px #0003", zIndex: 9999,
        }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "var(--color-heading)" }}>
            {t("فوليو الغرف")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: "0.25rem" }}>
            {t("إدارة رسوم النزلاء المسجلة على حساب الغرفة خلال فترة الإقامة.")}
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {([
          { label:t("إجمالي الرسوم المسجلة"), value:`${fmtNum(totalAll)} ${currency}`,       sub:`${charges.length} ${t("رسمة")}`,                              Icon:Receipt     as LucideIcon, grad:"linear-gradient(135deg,#4f46e5,#6366f1)", active:fSettled==="all",  clickable:true,  onClick:()=>setFSettled("all") },
          { label:t("رسوم غير مسددة"),       value:`${fmtNum(totalUnsettled)} ${currency}`, sub:`${charges.filter(c=>!c.settled).length} ${t("رسمة معلقة")}`,  Icon:Banknote    as LucideIcon, grad:"linear-gradient(135deg,#dc2626,#b91c1c)", active:fSettled==="no",   clickable:true,  onClick:()=>setFSettled("no") },
          { label:t("رسوم مسددة"),           value:`${fmtNum(totalSettled)} ${currency}`,   sub:`${charges.filter(c=>c.settled).length} ${t("رسمة مسددة")}`,   Icon:CheckCircle2 as LucideIcon,grad:"linear-gradient(135deg,#16a34a,#15803d)", active:fSettled==="yes",  clickable:true,  onClick:()=>setFSettled("yes") },
          { label:t("عدد الغرف مع رسوم"),    value:String(roomsWithCharges),                sub:t("غرفة نشطة بها رسوم"),                                  Icon:Star        as LucideIcon, grad:"linear-gradient(135deg,#0891b2,#0e7490)", active:false,             clickable:false, onClick:()=>{} },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;clickable:boolean;onClick:()=>void}[]).map(s => (
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick}
            style={{ background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff", cursor:s.clickable?"pointer":"default", position:"relative", transition:"transform .15s,box-shadow .15s", ...(s.active?{transform:"translateY(-3px) scale(1.02)",boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)"}:{}) }}>
            {s.active&&<span style={{position:"absolute",top:"0.4rem",left:"0.5rem",fontSize:"0.55rem",fontWeight:700,background:"rgba(255,255,255,.25)",padding:"0.1rem 0.4rem",borderRadius:"1rem"}}>{t("● نشط")}</span>}
            <div className="ds-kpi-icon"><s.Icon size={26} strokeWidth={1.6} /></div>
            <p style={{ fontSize:13, fontWeight:700, opacity:.90, marginBottom:4 }}>{s.label}</p>
            <p style={{ fontSize:18, fontWeight:900, lineHeight:1.2, marginBottom:3, wordBreak:"break-all" }}>{s.value}</p>
            <p style={{ fontSize:11, opacity:.78 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="ds-card-p" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0.6rem" }}>
          <div className="ds-filter-group">
            <p className="ds-filter-label">
              <Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث")}
            </p>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("اسم النزيل، رقم الغرفة، رقم الحجز، الوصف...")} />
          </div>

          <div className="ds-filter-group">
            <p className="ds-filter-label">
              <Filter size={13} strokeWidth={2.2} color="#4f46e5" /> {t("نوع الرسمة")}
            </p>
            <select className="select" value={fType} onChange={e => setFType(e.target.value as TChargeType | "all")}>
              <option value="all">{t("الكل")}</option>
              {(Object.entries(TYPE_LABELS) as [TChargeType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="ds-filter-group">
            <p className="ds-filter-label">
              <CheckCircle2 size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الحالة")}
            </p>
            <select className="select" value={fSettled} onChange={e => setFSettled(e.target.value as "all" | "yes" | "no")}>
              <option value="all">{t("الكل")}</option>
              <option value="no">{t("غير مسدد")}</option>
              <option value="yes">{t("مسدد")}</option>
            </select>
          </div>

          <div className="ds-filter-group">
            <p className="ds-filter-label">
              <Filter size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الغرفة")}
            </p>
            <select className="select" value={fRoom} onChange={e => setFRoom(e.target.value)}>
              <option value="all">{t("كل الغرف")}</option>
              {roomOptions.map(r => (
                <option key={r} value={r}>{lang === "ar" ? `${t("غرفة")} ${r}` : `Room ${r}`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Quick Add Charge ── */}
      <div className="ds-card-p" style={{ marginBottom: "1.5rem", border: "2px solid #dcfce7", borderRadius: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.85rem" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#16a34a,#15803d)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Plus size={16} strokeWidth={2.5} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: "#15803d" }}>{t("إضافة رسمة جديدة")}</p>
            <p style={{ fontSize: 11, color: "#64748b" }}>{t("سجّل رسمة على حساب أحد النزلاء المقيمين")}</p>
          </div>
        </div>

        {formErr && (
          <p style={{
            color: "#dc2626", fontSize: 13, marginBottom: "0.75rem",
            background: "#fef2f2", padding: "0.5rem 0.75rem", borderRadius: 8, fontWeight: 700,
          }}>
            {formErr}
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "0.65rem", alignItems: "flex-end" }}>
          {/* Reservation picker */}
          <div className="field">
            <label className="field-label">{t("الحجز / النزيل *")}</label>
            <select className="select" value={form.reservationId}
              onChange={e => setForm(p => ({ ...p, reservationId: e.target.value }))}>
              <option value="">{t("— اختر الحجز —")}</option>
              {reservations.map(r => (
                <option key={String(r.id)} value={String(r.id)}>
                  {lang === "ar" ? `${r.guestName} — غرفة ${r.roomNumber}` : `${r.guestName} — Room ${r.roomNumber}`}
                </option>
              ))}
              {reservations.length === 0 && (
                <option disabled>{t("لا يوجد نزلاء مقيمون حالياً")}</option>
              )}
            </select>
          </div>

          {/* Type */}
          <div className="field">
            <label className="field-label">{t("النوع *")}</label>
            <select className="select" value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value as TChargeType }))}>
              {(Object.entries(TYPE_LABELS) as [TChargeType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="field">
            <label className="field-label">{t("المبلغ")} ({currency}) *</label>
            <input className="input" type="number" min="0.01" step="0.01"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="0.00" />
          </div>

          {/* Date */}
          <div className="field">
            <label className="field-label">{t("التاريخ *")}</label>
            <input className="input" type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>

          {/* Description + button */}
          <div className="field">
            <label className="field-label">{t("الوصف *")}</label>
            <input className="input" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder={t("مثال: مشروبات مينيبار")} />
          </div>
        </div>

        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-start" }}>
          <button
            onClick={addCharge}
            style={{
              background: "#16a34a", color: "#fff", border: "none", borderRadius: 10,
              padding: "0.55rem 1.5rem", fontSize: 13, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 2px 8px rgba(22,163,74,.35)",
            }}>
            <Plus size={16} strokeWidth={2.5} /> {t("إضافة رسمة")}
          </button>
        </div>
      </div>

      {/* ── Print Folio Panel ── */}
      <div className="ds-card-p" style={{ marginBottom: "1.5rem", border: "1px solid #e0e7ff", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#4f46e5,#6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Printer size={16} color="#fff" strokeWidth={2} />
          </div>
          <p style={{ fontWeight: 800, fontSize: 13, color: "#4338ca" }}>{t("طباعة الفوليو")}</p>
          <select className="select" value={printResId}
            onChange={e => setPrintResId(e.target.value)}
            style={{ flex: 1, maxWidth: 320 }}>
            <option value="">{t("— اختر الحجز للطباعة —")}</option>
            {reservations.map(r => (
              <option key={String(r.id)} value={String(r.id)}>
                {lang === "ar" ? `${r.guestName} — غرفة ${r.roomNumber}` : `${r.guestName} — Room ${r.roomNumber}`}
              </option>
            ))}
          </select>
          <button
            disabled={!printResId}
            onClick={() => printFolio(printResId, charges, reservations, hotel, currency)}
            style={{
              background: printResId ? "#4f46e5" : "#e2e8f0",
              color: printResId ? "#fff" : "#94a3b8",
              border: "none", borderRadius: 9, padding: "0.5rem 1.25rem",
              fontSize: 13, fontWeight: 700, cursor: printResId ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all 0.15s",
            }}>
            <Printer size={14} /> {t("طباعة")}
          </button>
        </div>
      </div>

      {/* ── Charges List (grouped by reservation) ── */}
      {grouped.size === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-muted)" }}>
          <Receipt size={52} strokeWidth={1.1} style={{ color: "#d1d5db", marginBottom: 14 }} />
          <p style={{ fontWeight: 800, fontSize: 17, color: "var(--color-heading)", marginBottom: 6 }}>
            {charges.length === 0 ? t("لا توجد رسوم مسجلة بعد") : t("لا توجد نتائج مطابقة للفلاتر")}
          </p>
          <p style={{ fontSize: 13 }}>
            {charges.length === 0
              ? t("استخدم النموذج أعلاه لإضافة أول رسمة.")
              : t("غيّر الفلاتر أو كلمة البحث.")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {[...grouped.entries()].map(([resId, resCharges]) => {
            const res = reservations.find(r => String(r.id) === resId);
            const guestName   = res?.guestName   ?? resCharges[0]?.guestName   ?? t("نزيل");
            const roomNumber  = res?.roomNumber   ?? resCharges[0]?.roomNumber  ?? "—";
            const bookingNum  = res?.bookingNumber?? resCharges[0]?.bookingNumber ?? "—";
            const subtotal    = resCharges.reduce((s, c) => s + c.amount, 0);
            const unsettled   = resCharges.filter(c => !c.settled).reduce((s, c) => s + c.amount, 0);
            const allSettled  = resCharges.every(c => c.settled);

            return (
              <div key={resId} style={{
                background: "#fff", border: "1.5px solid #e2e8f0",
                borderRadius: 14, overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                {/* Group header */}
                <div style={{
                  background: allSettled
                    ? "linear-gradient(135deg,#f0fdf4,#dcfce7)"
                    : "linear-gradient(135deg,#eff6ff,#e0e7ff)",
                  padding: "0.9rem 1.1rem",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: allSettled ? "#16a34a" : "#4f46e5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Receipt size={18} color="#fff" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 900, fontSize: 15, color: "#1e293b" }}>{guestName}</p>
                      <p style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                        {lang === "ar" ? `غرفة ${roomNumber} · حجز #${bookingNum}` : `Room ${roomNumber} · Booking #${bookingNum}`}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "left", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div>
                      <p style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{t("إجمالي الغرفة")}</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: "#1e293b" }}>
                        {fmtNum(subtotal)} {currency}
                      </p>
                      {unsettled > 0 && (
                        <p style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>
                          {t("غير مسدد: ")}{fmtNum(unsettled)} {currency}
                        </p>
                      )}
                    </div>
                    <span style={{
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 800,
                      background: allSettled ? "#dcfce7" : "#fef2f2",
                      color: allSettled ? "#15803d" : "#dc2626",
                      border: `1px solid ${allSettled ? "#bbf7d0" : "#fecaca"}`,
                    }}>
                      {allSettled ? t("مسدد بالكامل") : (lang === "ar" ? `${resCharges.filter(c => !c.settled).length} ${t("رسمة معلقة")}` : `${resCharges.filter(c => !c.settled).length} pending`)}
                    </span>
                  </div>
                </div>

                {/* Charges rows */}
                <div style={{ padding: "0.5rem 0" }}>
                  {resCharges.map((charge, idx) => {
                    const TypeIcon = TYPE_ICONS[charge.type];
                    const typeColor = TYPE_COLORS[charge.type];
                    const typeBg    = TYPE_BG[charge.type];
                    return (
                      <div key={charge.id} style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        padding: "0.7rem 1.1rem",
                        borderBottom: idx < resCharges.length - 1 ? "1px solid #f1f5f9" : "none",
                        background: charge.settled ? "#fafffe" : "#fff",
                        opacity: charge.settled ? 0.75 : 1,
                        transition: "background 0.15s",
                      }}>
                        {/* Type icon badge */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: typeBg,
                          border: `1.5px solid ${typeColor}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <TypeIcon size={17} color={typeColor} strokeWidth={1.8} />
                        </div>

                        {/* Description + type badge */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: typeBg, color: typeColor,
                              border: `1px solid ${typeColor}25`,
                              flexShrink: 0,
                            }}>
                              {TYPE_LABELS[charge.type]}
                            </span>
                            {charge.settled && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 3,
                                padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0",
                              }}>
                                <CheckCircle2 size={11} /> {t("مسدد")}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#1e293b",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {charge.description}
                          </p>
                          <p style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(charge.date)}</p>
                        </div>

                        {/* Amount */}
                        <div style={{ textAlign: "left", flexShrink: 0 }}>
                          <p style={{ fontWeight: 900, fontSize: 16, color: charge.settled ? "#16a34a" : "#1e293b" }}>
                            {fmtNum(charge.amount)}
                          </p>
                          <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{charge.currency || currency}</p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                          {!charge.settled && (
                            <button
                              onClick={() => settleCharge(charge.id)}
                              title={t("تسوية")}
                              style={{
                                background: "#2563eb", color: "#fff", border: "none",
                                borderRadius: 8, padding: "0.38rem 0.6rem",
                                fontSize: 12, fontWeight: 700, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 4,
                              }}>
                              <CheckCircle2 size={13} strokeWidth={2} /> {t("تسوية")}
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteId(charge.id)}
                            title={t("حذف")}
                            style={{
                              background: "#dc2626", color: "#fff", border: "none",
                              borderRadius: 8, padding: "0.38rem 0.6rem",
                              fontSize: 12, fontWeight: 700, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                            }}>
                            <Trash2 size={13} strokeWidth={2} /> {t("حذف")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal footer */}
                <div style={{
                  background: "#f8fafc", borderTop: "1px solid #e2e8f0",
                  padding: "0.6rem 1.1rem",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
                    {lang === "ar" ? `${resCharges.length} ${t("رسمة")}` : `${resCharges.length} charge(s)`}
                  </span>
                  <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                    {unsettled > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>
                        {t("غير مسدد: ")}{fmtNum(unsettled)} {currency}
                      </span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#1e293b" }}>
                      {t("إجمالي: ")}{fmtNum(subtotal)} {currency}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ DELETE CONFIRM MODAL ════════════════════════════════════════════ */}
      {deleteId && (
        <div className="ds-modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="ds-modal-head">
              <div>
                <p style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginBottom: 2 }}>
                  {t("تأكيد الحذف")}
                </p>
                <h2>{t("حذف الرسمة")}</h2>
              </div>
              <button className="icon-btn" onClick={() => setDeleteId(null)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 8, padding: "0.75rem", fontSize: 13, color: "#991b1b", fontWeight: 700,
              }}>
                {t("هل أنت متأكد من حذف هذه الرسمة؟ لا يمكن التراجع عن هذا الإجراء.")}
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setDeleteId(null)}>{t("إلغاء")}</button>
              <button
                onClick={() => deleteCharge(deleteId)}
                style={{
                  background: "#dc2626", color: "#fff", border: "none",
                  borderRadius: 9, padding: "0.5rem 1.25rem",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                {t("نعم، حذف الرسمة")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
