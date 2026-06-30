"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "../LangContext";
import type { LucideIcon } from "lucide-react";
import {
  Banknote, CreditCard, AlertCircle,
  Search, Printer, Plus, CheckCircle2, X, Utensils,
  Home, Clock, Receipt, TrendingDown, Calendar,
} from "lucide-react";

import { BASE_URL as API, getAuthHeaders as apiH } from "@/lib/api";
import { escapeHtml as esc } from "@/lib/print";

const DEBTS_KEY = (h: string) => `fandqi.debts.${h}`;
const RES_KEY   = (h: string) => `fandqi.reservations.${h}`;
const FOOD_KEY  = (h: string) => `fandqi.foodOrders.${h}`;
const SET_KEY   = (h: string) => `fandqi.settings.${h}`;

/* ─── Types ─────────────────────────────────────────────────────────────── */
type TPayMethod = "cash" | "electronic" | "room_account";
type TTab = "reservations" | "food" | "debts";

interface Reservation {
  id: string | number;
  guestName?: string; guest_name?: string;
  roomNumber?: string; room_number?: string;
  checkIn?: string; check_in?: string;
  checkOut?: string; check_out?: string;
  totalAmount?: number; total_amount?: number; total?: number;
  paidAmount?: number; paid_amount?: number;
  paymentMethod?: TPayMethod; payment_method?: TPayMethod;
  status?: string;
  currency?: string;
  createdAt?: string; created_at?: string;
}

interface FoodOrderRaw {
  guestName?: string; roomNumber?: string; tableNumber?: string;
  paymentMethod?: string; status?: string;
  items?: { name: string; price: number; qty: number }[];
  total?: number; createdAt?: string; orderType?: string;
}

interface NormalOrder {
  id: string | number;
  guestName: string; location: string;
  method: TPayMethod;
  amount: number;
  status: string;
  date: string;
  items: string[];
  source: "food";
}

interface NormalRes {
  id: string | number;
  guestName: string; room: string;
  method: TPayMethod;
  totalAmount: number;
  paidAmount: number;
  checkIn: string; checkOut: string;
  status: string;
  source: "reservation";
}

interface Debt {
  id: string;
  debtor: string;
  amount: number;
  paidAmount: number;
  description: string;
  dueDate: string;
  createdAt: string;
  notes?: string;
  source?: string;
}

interface HotelInfo { id: number; name: string; city?: string; phone?: string; }

/* ─── Constants ─────────────────────────────────────────────────────────── */
// PM_LABEL moved inside component (uses t())
const PM_STYLE: Record<TPayMethod, React.CSSProperties> = {
  cash:         { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" },
  electronic:   { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  room_account: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" },
};
const PM_STRIP: Record<TPayMethod, string> = {
  cash: "#22c55e", electronic: "#2563eb", room_account: "#f59e0b",
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
  } catch { return d; }
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function gStr(r: Reservation, ...keys: (keyof Reservation)[]) {
  for (const k of keys) { const v = r[k]; if (v) return String(v); }
  return "";
}
function gNum(r: Reservation, ...keys: (keyof Reservation)[]) {
  for (const k of keys) { const v = r[k]; if (v != null) return Number(v); }
  return 0;
}

/* ─── Print invoice for food order ─────────────────────────────────────── */
function printFoodInvoice(o: NormalOrder, hotel: HotelInfo | null, currency: string, pmLabel: Record<TPayMethod, string>) {
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
  <title>فاتورة طلب</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:28px;color:#1e293b;direction:rtl;font-size:14px}.hdr{text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px}.hotel{font-size:21px;font-weight:900}.ono{font-size:18px;font-weight:900;color:#4f46e5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.cell{background:#f8fafc;border-radius:6px;padding:7px 10px}.cl{font-size:11px;color:#94a3b8}.cv{font-size:13px;font-weight:700}.total{text-align:center;background:#eff6ff;border-radius:8px;padding:12px;margin:12px 0}.tv{font-size:24px;font-weight:900;color:#1d4ed8}.foot{text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:18px;padding-top:10px}.pm{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700}.pm-cash{background:#dcfce7;color:#15803d}.pm-el{background:#dbeafe;color:#1d4ed8}.pm-room{background:#fef9c3;color:#854d0e}@media print{body{padding:14px}}</style></head><body>
  <div class="hdr"><div class="hotel">${esc(hotel?.name)||"الفندق"}</div>${hotel?.phone ? `<div style="font-size:12px;color:#64748b">هاتف: ${esc(hotel.phone)}</div>` : ""}<div class="ono">فاتورة طلب مطعم</div></div>
  <div class="grid"><div class="cell"><div class="cl">الزبون</div><div class="cv">${esc(o.guestName)}</div></div><div class="cell"><div class="cl">الموقع</div><div class="cv">${esc(o.location)}</div></div><div class="cell"><div class="cl">الأصناف</div><div class="cv">${o.items.join("، ") || "—"}</div></div><div class="cell"><div class="cl">طريقة الدفع</div><div class="cv"><span class="pm ${o.method === "cash" ? "pm-cash" : o.method === "electronic" ? "pm-el" : "pm-room"}">${pmLabel[o.method]}</span></div></div></div>
  <div class="total"><div style="font-size:12px;color:#64748b">إجمالي المبلغ</div><div class="tv">${Number(o.amount).toLocaleString("en-US")} ${currency}</div></div>
  <div class="foot"><div>تاريخ الطباعة: ${new Date().toLocaleString("en-US")}</div><div>شكرًا لاختياركم ${esc(hotel?.name)||"فندقنا"}</div></div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`;
  const w = window.open("", "_blank", "width=820,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

function printResInvoice(r: NormalRes, hotel: HotelInfo | null, currency: string, pmLabel: Record<TPayMethod, string>) {
  const remaining = r.totalAmount - r.paidAmount;
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف حجز</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:28px;color:#1e293b;direction:rtl;font-size:14px}.hdr{text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px}.hotel{font-size:21px;font-weight:900}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.cell{background:#f8fafc;border-radius:6px;padding:7px 10px}.cl{font-size:11px;color:#94a3b8}.cv{font-size:13px;font-weight:700}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9}.foot{text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:18px;padding-top:10px}.pm{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700}.pm-cash{background:#dcfce7;color:#15803d}.pm-el{background:#dbeafe;color:#1d4ed8}@media print{body{padding:14px}}</style></head><body>
  <div class="hdr"><div class="hotel">${esc(hotel?.name)||"الفندق"}</div><div style="font-size:16px;font-weight:800;margin-top:6px">كشف حساب حجز</div></div>
  <div class="grid"><div class="cell"><div class="cl">اسم النزيل</div><div class="cv">${esc(r.guestName)}</div></div><div class="cell"><div class="cl">رقم الغرفة</div><div class="cv">${esc(r.room)}</div></div><div class="cell"><div class="cl">تاريخ الوصول</div><div class="cv">${fmtDate(r.checkIn)}</div></div><div class="cell"><div class="cl">تاريخ المغادرة</div><div class="cv">${fmtDate(r.checkOut)}</div></div></div>
  <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin:12px 0">
    <div class="row"><span>إجمالي الحجز</span><strong>${r.totalAmount.toLocaleString("en-US")} ${currency}</strong></div>
    <div class="row"><span>المبلغ المدفوع <span class="pm ${r.method === "cash" ? "pm-cash" : "pm-el"}">${pmLabel[r.method]}</span></span><strong style="color:#16a34a">${r.paidAmount.toLocaleString("en-US")} ${currency}</strong></div>
    <div class="row" style="border:none"><span style="font-weight:800">المتبقي / الدين</span><strong style="color:${remaining > 0 ? "#dc2626" : "#16a34a"}">${remaining.toLocaleString("en-US")} ${currency}</strong></div>
  </div>
  <div class="foot"><div>تاريخ الطباعة: ${new Date().toLocaleString("en-US")}</div><div>شكرًا لاختياركم ${esc(hotel?.name)||"فندقنا"}</div></div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`;
  const w = window.open("", "_blank", "width=820,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ══════════════════════════════════════════════════════════════════════════ */
function PaymentsInner() {
  const { t, lang } = useLang();
  const sp = useSearchParams();

  /* Payment method labels — must be inside component to use t() */
  const PM_LABEL: Record<TPayMethod, string> = {
    cash: t("نقدي"), electronic: t("إلكتروني"), room_account: t("على حساب الغرفة"),
  };

  const hotelId  = typeof window !== "undefined" ? (localStorage.getItem("hotel_id") ?? "") : "";
  const [activeTab,    setActiveTab]    = useState<TTab>("reservations");
  const [hotel,        setHotel]        = useState<HotelInfo | null>(null);
  const [currency,     setCurrency]     = useState("USD");
  const [search,       setSearch]       = useState("");
  const [fMethod,      setFMethod]      = useState<TPayMethod | "all">("all");
  const [reservations, setReservations] = useState<NormalRes[]>([]);
  const [foodOrders,   setFoodOrders]   = useState<NormalOrder[]>([]);
  const [debts,        setDebts]        = useState<Debt[]>([]);
  const [toast,        setToast]        = useState("");

  /* Debt modal */
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editDebtId,   setEditDebtId]   = useState<string | null>(null);
  const [debtForm,     setDebtForm]     = useState({
    debtor: "", amount: "", description: "", dueDate: todayISO(), notes: "", paidAmount: "",
  });
  const [debtFormErr,  setDebtFormErr]  = useState("");

  /* Pay partial modal */
  const [payingDebt,   setPayingDebt]   = useState<Debt | null>(null);
  const [payAmt,       setPayAmt]       = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  /* ── Load data ── */
  useEffect(() => {
    if (!hotelId) return;

    const loadLocal = async () => {
    // Settings / currency
    try {
      const s = JSON.parse(localStorage.getItem(SET_KEY(hotelId)) ?? "{}");
      if (s?.ops?.currency) setCurrency(s.ops.currency);
    } catch {}

    // Reservations from localStorage
    try {
      const raw = localStorage.getItem(RES_KEY(hotelId));
      if (raw) {
        const arr: Reservation[] = JSON.parse(raw);
        const mapped: NormalRes[] = arr
          .filter(r => {
            const st = (r.status ?? "").toLowerCase();
            return st !== "cancelled";
          })
          .map(r => {
            const mRaw = (r.paymentMethod ?? r.payment_method ?? "cash") as TPayMethod;
            const method: TPayMethod = ["cash","electronic","room_account"].includes(mRaw) ? mRaw : "cash";
            return {
              id: r.id,
              guestName: gStr(r, "guestName", "guest_name") || t("نزيل"),
              room: gStr(r, "roomNumber", "room_number") || "—",
              method,
              totalAmount: gNum(r, "totalAmount", "total_amount", "total"),
              paidAmount:  gNum(r, "paidAmount",  "paid_amount"),
              checkIn:  gStr(r, "checkIn",  "check_in"),
              checkOut: gStr(r, "checkOut", "check_out"),
              status: r.status ?? "confirmed",
              source: "reservation",
            };
          });
        setReservations(mapped);
      }
    } catch {}

    // Food orders
    try {
      const raw = localStorage.getItem(FOOD_KEY(hotelId));
      if (raw) {
        const arr: FoodOrderRaw[] = JSON.parse(raw);
        const mapped: NormalOrder[] = arr.map((o, i) => ({
          id: `food-${i}`,
          guestName: o.guestName || t("زبون مباشر"),
          location: o.roomNumber ? (lang === "ar" ? `غرفة ${o.roomNumber}` : `Room ${o.roomNumber}`) : o.tableNumber ? (lang === "ar" ? `طاولة ${o.tableNumber}` : `Table ${o.tableNumber}`) : "—",
          method: (["cash","electronic","room_account"].includes(o.paymentMethod ?? "") ? o.paymentMethod : "cash") as TPayMethod,
          amount: Number(o.total) || 0,
          status: o.status === "ready" ? "delivered" : (o.status ?? "pending"),
          date: o.createdAt ?? "",
          items: (o.items ?? []).map(it => it.name),
          source: "food",
        }));
        setFoodOrders(mapped);
      }
    } catch {}

    // Debts
    try {
      const raw = localStorage.getItem(DEBTS_KEY(hotelId));
      if (raw) setDebts(JSON.parse(raw));
    } catch {}

    // Hotel info from API (non-blocking)
    fetch(`${API}/hotels/${hotelId}/`, { headers: apiH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHotel(d); })
      .catch(() => {});

    // URL param
    const tabParam = sp.get("tab") as TTab | null;
    if (tabParam && ["reservations","food","debts"].includes(tabParam)) setActiveTab(tabParam);
    const m = sp.get("method") as TPayMethod | "all" | null;
    if (m) setFMethod(m);
    };
    loadLocal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  function saveDebts(next: Debt[]) {
    setDebts(next);
    if (hotelId) localStorage.setItem(DEBTS_KEY(hotelId), JSON.stringify(next));
  }

  /* ── KPI calculations ── */
  const allCash = useMemo(() => {
    const r = reservations.filter(r => r.method === "cash").reduce((s, r) => s + r.paidAmount, 0);
    const f = foodOrders.filter(o => o.method === "cash").reduce((s, o) => s + o.amount, 0);
    return r + f;
  }, [reservations, foodOrders]);

  const allElectronic = useMemo(() => {
    const r = reservations.filter(r => r.method === "electronic").reduce((s, r) => s + r.paidAmount, 0);
    const f = foodOrders.filter(o => o.method === "electronic").reduce((s, o) => s + o.amount, 0);
    return r + f;
  }, [reservations, foodOrders]);

  const totalDebts = useMemo(() =>
    debts.reduce((s, d) => s + (d.amount - d.paidAmount), 0), [debts]);

  const resDebtTotal = useMemo(() =>
    reservations.reduce((s, r) => s + Math.max(0, r.totalAmount - r.paidAmount), 0), [reservations]);

  /* ── Filtered lists ── */
  const q = search.trim().toLowerCase();

  const filteredRes = useMemo(() => reservations.filter(r => {
    if (fMethod !== "all" && r.method !== fMethod) return false;
    if (q) return [r.guestName, r.room, r.status].join(" ").toLowerCase().includes(q);
    return true;
  }), [reservations, fMethod, q]);

  const filteredFood = useMemo(() => foodOrders.filter(o => {
    if (fMethod !== "all" && o.method !== fMethod) return false;
    if (q) return [o.guestName, o.location, ...o.items].join(" ").toLowerCase().includes(q);
    return true;
  }), [foodOrders, fMethod, q]);

  const filteredDebts = useMemo(() => debts.filter(d => {
    if (q) return [d.debtor, d.description, d.notes ?? ""].join(" ").toLowerCase().includes(q);
    return true;
  }), [debts, q]);

  /* ── Debt CRUD ── */
  function openAddDebt() {
    setDebtForm({ debtor:"", amount:"", description:"", dueDate: todayISO(), notes:"", paidAmount:"0" });
    setEditDebtId(null); setDebtFormErr(""); setShowDebtForm(true);
  }
  function openEditDebt(d: Debt) {
    setDebtForm({ debtor: d.debtor, amount: String(d.amount), description: d.description,
      dueDate: d.dueDate, notes: d.notes ?? "", paidAmount: String(d.paidAmount) });
    setEditDebtId(d.id); setDebtFormErr(""); setShowDebtForm(true);
  }
  function saveDebt() {
    if (!debtForm.debtor.trim()) { setDebtFormErr(t("اسم المدين مطلوب.")); return; }
    const amt  = parseFloat(debtForm.amount);
    const paid = parseFloat(debtForm.paidAmount || "0");
    if (!amt || amt <= 0) { setDebtFormErr(t("المبلغ يجب أن يكون أكبر من صفر.")); return; }
    if (paid < 0 || paid > amt) { setDebtFormErr(t("المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الدين.")); return; }
    if (editDebtId) {
      saveDebts(debts.map(d => d.id === editDebtId ? ({
        ...d, debtor: debtForm.debtor.trim(), amount: amt, paidAmount: paid,
        description: debtForm.description.trim(), dueDate: debtForm.dueDate,
        notes: debtForm.notes.trim() || undefined,
      }) : d));
      showToast(t("تم تحديث الدين."));
    } else {
      const entry: Debt = {
        id: `dbt-${Date.now()}`, debtor: debtForm.debtor.trim(), amount: amt,
        paidAmount: paid, description: debtForm.description.trim(),
        dueDate: debtForm.dueDate, createdAt: new Date().toISOString(),
        notes: debtForm.notes.trim() || undefined,
      };
      saveDebts([entry, ...debts]);
      showToast(t("تم تسجيل الدين."));
    }
    setShowDebtForm(false);
  }
  function deleteDebt(id: string) {
    saveDebts(debts.filter(d => d.id !== id));
    showToast(t("تم حذف الدين."));
  }
  function payDebt() {
    if (!payingDebt) return;
    const add = parseFloat(payAmt);
    if (!add || add <= 0) return;
    const maxPay = payingDebt.amount - payingDebt.paidAmount;
    const actual = Math.min(add, maxPay);
    saveDebts(debts.map(d => d.id === payingDebt.id
      ? { ...d, paidAmount: d.paidAmount + actual } : d));
    setPayingDebt(null); setPayAmt("");
    showToast(lang === "ar" ? `تم تسجيل دفعة ${actual.toLocaleString("en-US")} ${currency}.` : `Payment of ${actual.toLocaleString("en-US")} ${currency} recorded.`);
  }

  /* ── Tab counts ── */
  const TABS: { key: TTab; label: string; count: number; Icon: LucideIcon }[] = [
    { key: "reservations", label: "مدفوعات الحجوزات", count: reservations.length, Icon: Home as LucideIcon },
    { key: "food",         label: "مدفوعات الطعام",   count: foodOrders.length,   Icon: Utensils as LucideIcon },
    { key: "debts",        label: "الديون المستحقة",  count: debts.length,        Icon: AlertCircle as LucideIcon },
  ];

  /* ═════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="ds-page">

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", left:"50%", transform:"translateX(-50%)",
          background:"#1e293b", color:"#fff", padding:"0.7rem 1.5rem", borderRadius:10,
          fontWeight:700, fontSize:13, boxShadow:"0 4px 20px #0003", zIndex:9999 }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem" }}>
        <div>
          <h1 style={{ fontSize:"var(--text-2xl)", fontWeight:900, color:"var(--color-heading)" }}>{t("المدفوعات")}</h1>
          <p style={{ fontSize:13, color:"var(--color-muted)", marginTop:"0.25rem" }}>
            {t("تتبع مدفوعات الحجوزات (نقدي وإلكتروني)، الطعام والخدمات، والديون المستحقة.")}
          </p>
        </div>
        {activeTab === "debts" && (
          <button className="ds-btn ds-btn-danger" onClick={openAddDebt}
            style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Plus size={15} /> {t("إضافة دين")}
          </button>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"1.5rem" }}>
        {([
          { label:"إجمالي النقدي",     value:`${allCash.toLocaleString("en-US")} ${currency}`,      sub:"حجوزات + طعام نقداً",              Icon:Banknote    as LucideIcon, grad:"linear-gradient(135deg,#16a34a,#15803d)", active:fMethod==="cash",            onClick:()=>setFMethod("cash") },
          { label:"إجمالي الإلكتروني", value:`${allElectronic.toLocaleString("en-US")} ${currency}`, sub:"مجموع المدفوعات الإلكترونية",      Icon:CreditCard  as LucideIcon, grad:"linear-gradient(135deg,#2563eb,#1d4ed8)", active:fMethod==="electronic",       onClick:()=>setFMethod("electronic") },
          { label:"ديون الحجوزات",      value:`${resDebtTotal.toLocaleString("en-US")} ${currency}`,  sub:"مبالغ غير مدفوعة من النزلاء",     Icon:Home        as LucideIcon, grad:"linear-gradient(135deg,#f59e0b,#d97706)", active:activeTab==="reservations",   onClick:()=>setActiveTab("reservations") },
          { label:"الديون الأخرى",      value:`${totalDebts.toLocaleString("en-US")} ${currency}`,    sub:`${debts.filter(d=>d.paidAmount<d.amount).length} دين مستحق`, Icon:TrendingDown as LucideIcon, grad:"linear-gradient(135deg,#dc2626,#b91c1c)", active:activeTab==="debts", onClick:()=>setActiveTab("debts") },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;onClick:()=>void}[]).map(s => (
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick}
            style={{ background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff", cursor:"pointer", position:"relative", transition:"transform .15s,box-shadow .15s", ...(s.active?{transform:"translateY(-3px) scale(1.02)",boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)"}:{}) }}>
            {s.active&&<span style={{position:"absolute",top:"0.4rem",left:"0.5rem",fontSize:"0.55rem",fontWeight:700,background:"rgba(255,255,255,.25)",padding:"0.1rem 0.4rem",borderRadius:"1rem"}}>{t("● نشط")}</span>}
            <div className="ds-kpi-icon"><s.Icon size={26} strokeWidth={1.6} /></div>
            <p style={{ fontSize:13, fontWeight:700, opacity:.90, marginBottom:4 }}>{t(s.label)}</p>
            <p style={{ fontSize:18, fontWeight:900, lineHeight:1.2, marginBottom:3, wordBreak:"break-all" }}>{s.value}</p>
            <p style={{ fontSize:11, opacity:.78 }}>
              {s.label === "الديون الأخرى"
                ? (lang === "ar" ? `${debts.filter(d=>d.paidAmount<d.amount).length} دين مستحق` : `${debts.filter(d=>d.paidAmount<d.amount).length} debt(s)`)
                : t(s.sub)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Cash vs Electronic visual bar ── */}
      {(allCash + allElectronic) > 0 && (
        <div className="ds-card-p" style={{ marginBottom:"1.25rem" }}>
          <p style={{ fontWeight:800, fontSize:13, color:"var(--color-heading)", marginBottom:"0.6rem" }}>
            {t("توزيع طرق الدفع — نقدي مقابل إلكتروني")}
          </p>
          <div style={{ display:"flex", height:20, borderRadius:20, overflow:"hidden", gap:2 }}>
            <div style={{
              flex: allCash, background:"#16a34a",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:800, color:"#fff", minWidth:40,
            }}>
              {Math.round(allCash / (allCash + allElectronic) * 100)}%
            </div>
            <div style={{
              flex: allElectronic, background:"#2563eb",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:800, color:"#fff", minWidth:40,
            }}>
              {Math.round(allElectronic / (allCash + allElectronic) * 100)}%
            </div>
          </div>
          <div style={{ display:"flex", gap:"1.5rem", marginTop:"0.45rem", fontSize:12, fontWeight:700 }}>
            <span style={{ color:"#16a34a", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:12, height:12, borderRadius:3, background:"#16a34a", display:"inline-block" }} />
              {`${t("نقدي")} — ${allCash.toLocaleString("en-US")} ${currency}`}
            </span>
            <span style={{ color:"#2563eb", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:12, height:12, borderRadius:3, background:"#2563eb", display:"inline-block" }} />
              {`${t("إلكتروني")} — ${allElectronic.toLocaleString("en-US")} ${currency}`}
            </span>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="ds-card-p" style={{ marginBottom:"1.25rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"0.6rem" }}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث")}</p>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("اسم النزيل، الغرفة، الأصناف، المدين...")} />
          </div>
          {activeTab !== "debts" && (
            <div className="ds-filter-group">
              <p className="ds-filter-label"><CreditCard size={13} strokeWidth={2.2} color="#4f46e5" /> {t("طريقة الدفع")}</p>
              <select className="select" value={fMethod}
                onChange={e => setFMethod(e.target.value as TPayMethod | "all")}>
                <option value="all">{t("الكل")}</option>
                <option value="cash">{t("نقدي")}</option>
                <option value="electronic">{t("إلكتروني")}</option>
                <option value="room_account">{t("على حساب الغرفة")}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1rem" }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"0.5rem 1rem",
              borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
              transition:"all 0.15s",
              background: activeTab === tab.key ? "#4f46e5" : "#f1f5f9",
              color: activeTab === tab.key ? "#fff" : "#64748b",
              boxShadow: activeTab === tab.key ? "0 2px 8px rgba(79,70,229,.28)" : "none",
            }}>
            <tab.Icon size={14} strokeWidth={2} /> {t(tab.label)}
            <span style={{
              background: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "#e2e8f0",
              color: activeTab === tab.key ? "#fff" : "#64748b",
              padding:"1px 7px", borderRadius:20, fontSize:11, fontWeight:900,
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: RESERVATIONS */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "reservations" && (
        <>
          {/* Cash vs Electronic summary for reservations */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"1rem" }}>
            {(["cash","electronic"] as TPayMethod[]).map(m => {
              const total = reservations.filter(r => r.method === m).reduce((s,r) => s + r.paidAmount, 0);
              const count = reservations.filter(r => r.method === m).length;
              return (
                <div key={m} style={{
                  background: m === "cash" ? "#f0fdf4" : "#eff6ff",
                  border: `2px solid ${m === "cash" ? "#bbf7d0" : "#bfdbfe"}`,
                  borderRadius:12, padding:"0.85rem 1rem",
                  display:"flex", alignItems:"center", gap:"0.75rem",
                }}>
                  <div style={{
                    width:44, height:44, borderRadius:10, flexShrink:0,
                    background: m === "cash" ? "#16a34a" : "#2563eb",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {m === "cash"
                      ? <Banknote size={22} strokeWidth={1.8} color="#fff" />
                      : <CreditCard size={22} strokeWidth={1.8} color="#fff" />}
                  </div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color: m === "cash" ? "#15803d" : "#1d4ed8" }}>
                      {m === "cash" ? t("مدفوعات نقدية") : t("مدفوعات إلكترونية")}
                    </p>
                    <p style={{ fontSize:20, fontWeight:900, color:"#1e293b" }}>
                      {total.toLocaleString("en-US")} {currency}
                    </p>
                    <p style={{ fontSize:11, color:"#64748b" }}>{lang === "ar" ? `${count} حجز` : `${count} booking(s)`}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRes.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-muted)" }}>
              <Home size={42} strokeWidth={1.1} style={{ color:"#d1d5db", marginBottom:10 }} />
              <p style={{ fontWeight:800, color:"var(--color-heading)" }}>{t("لا توجد حجوزات مطابقة")}</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"0.85rem" }}>
              {filteredRes.map(r => {
                const remaining = r.totalAmount - r.paidAmount;
                const isFullyPaid = remaining <= 0;
                const strip = PM_STRIP[r.method];
                return (
                  <div key={r.id} style={{
                    background:"#fff", border:"1px solid #e2e8f0",
                    borderRight:`4px solid ${strip}`,
                    borderRadius:12, padding:"0.9rem",
                    display:"flex", flexDirection:"column", gap:"0.45rem",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                  }}>
                    {/* Top */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <p style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>{r.guestName}</p>
                        <p style={{ fontSize:12, color:"#64748b", fontWeight:700 }}>{`${t("غرفة")} ${r.room}`}</p>
                      </div>
                      <span style={{ ...PM_STYLE[r.method], padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>
                        {PM_LABEL[r.method]}
                      </span>
                    </div>

                    {/* Dates */}
                    <div style={{ display:"flex", gap:"0.4rem" }}>
                      <div style={{ flex:1, background:"#f8fafc", borderRadius:6, padding:"4px 8px", fontSize:11 }}>
                        <p style={{ color:"#94a3b8", marginBottom:1, display:"flex", alignItems:"center", gap:3 }}>
                          <Calendar size={10} /> {t("وصول")}</p>
                        <p style={{ fontWeight:700, color:"#1e293b" }}>{fmtDate(r.checkIn)}</p>
                      </div>
                      <div style={{ flex:1, background:"#f8fafc", borderRadius:6, padding:"4px 8px", fontSize:11 }}>
                        <p style={{ color:"#94a3b8", marginBottom:1, display:"flex", alignItems:"center", gap:3 }}>
                          <Calendar size={10} /> {t("مغادرة")}</p>
                        <p style={{ fontWeight:700, color:"#1e293b" }}>{fmtDate(r.checkOut)}</p>
                      </div>
                    </div>

                    {/* Amounts — key section: clearly separated */}
                    <div style={{ background:"#f8fafc", borderRadius:8, padding:"0.6rem 0.75rem" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, paddingBottom:5, borderBottom:"1px solid #e2e8f0" }}>
                        <span style={{ fontSize:12, color:"#64748b", fontWeight:700 }}>{t("إجمالي الحجز")}</span>
                        <span style={{ fontSize:13, fontWeight:900, color:"#1e293b" }}>
                          {r.totalAmount.toLocaleString("en-US")} {currency}
                        </span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, paddingBottom:5, borderBottom:"1px solid #e2e8f0" }}>
                        <span style={{ fontSize:12, color:"#16a34a", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                          <CheckCircle2 size={12} /> {t("المدفوع")} ({PM_LABEL[r.method]})
                        </span>
                        <span style={{ fontSize:13, fontWeight:900, color:"#16a34a" }}>
                          {r.paidAmount.toLocaleString("en-US")} {currency}
                        </span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:12, color: isFullyPaid ? "#16a34a" : "#dc2626", fontWeight:700 }}>
                          {isFullyPaid ? <><CheckCircle2 size={12} style={{display:"inline",marginLeft:3}}/> {t("مسدد بالكامل")}</> : t("المتبقي (دين)")}
                        </span>
                        <span style={{ fontSize:13, fontWeight:900, color: isFullyPaid ? "#16a34a" : "#dc2626" }}>
                          {remaining > 0 ? remaining.toLocaleString("en-US") : "0"} {currency}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display:"flex", gap:"0.4rem", borderTop:"1px solid rgba(0,0,0,0.06)", paddingTop:"0.5rem" }}>
                      <button onClick={() => printResInvoice(r, hotel, currency, PM_LABEL)}
                        style={{ flex:1, background:"#2563eb", color:"#fff", border:"none", borderRadius:8,
                          padding:"0.4rem 0.5rem", fontSize:12, fontWeight:700, cursor:"pointer",
                          display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                        <Printer size={12} /> {t("طباعة الكشف")}
                      </button>
                      {remaining > 0 && (
                        <span style={{ background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca",
                          borderRadius:8, padding:"0.4rem 0.65rem", fontSize:11, fontWeight:800 }}>
                          {t("دين")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: FOOD */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "food" && (
        <>
          {/* Cash vs Electronic summary for food */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"1rem" }}>
            {(["cash","electronic"] as TPayMethod[]).map(m => {
              const total = foodOrders.filter(o => o.method === m).reduce((s,o) => s + o.amount, 0);
              const count = foodOrders.filter(o => o.method === m).length;
              return (
                <div key={m} style={{
                  background: m === "cash" ? "#f0fdf4" : "#eff6ff",
                  border: `2px solid ${m === "cash" ? "#bbf7d0" : "#bfdbfe"}`,
                  borderRadius:12, padding:"0.85rem 1rem",
                  display:"flex", alignItems:"center", gap:"0.75rem",
                }}>
                  <div style={{
                    width:44, height:44, borderRadius:10, flexShrink:0,
                    background: m === "cash" ? "#16a34a" : "#2563eb",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {m === "cash"
                      ? <Banknote size={22} strokeWidth={1.8} color="#fff" />
                      : <CreditCard size={22} strokeWidth={1.8} color="#fff" />}
                  </div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color: m === "cash" ? "#15803d" : "#1d4ed8" }}>
                      {m === "cash" ? t("طلبات نقدية") : t("طلبات إلكترونية")}
                    </p>
                    <p style={{ fontSize:20, fontWeight:900, color:"#1e293b" }}>
                      {total.toLocaleString("en-US")} {currency}
                    </p>
                    <p style={{ fontSize:11, color:"#64748b" }}>{lang === "ar" ? `${count} طلب` : `${count} order(s)`}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFood.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-muted)" }}>
              <Utensils size={42} strokeWidth={1.1} style={{ color:"#d1d5db", marginBottom:10 }} />
              <p style={{ fontWeight:800, color:"var(--color-heading)" }}>{t("لا توجد طلبات طعام مطابقة")}</p>
              <p style={{ fontSize:13 }}>{t("أضف طلبات من قسم المطعم والكافتريا.")}</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"0.85rem" }}>
              {filteredFood.map(o => (
                <div key={o.id} style={{
                  background:"#fff", border:"1px solid #e2e8f0",
                  borderRight:`4px solid ${PM_STRIP[o.method]}`,
                  borderRadius:12, padding:"0.9rem",
                  display:"flex", flexDirection:"column", gap:"0.45rem",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <p style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>{o.guestName}</p>
                      <p style={{ fontSize:12, color:"#64748b", fontWeight:700 }}>{o.location}</p>
                    </div>
                    <span style={{ ...PM_STYLE[o.method], padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>
                      {PM_LABEL[o.method]}
                    </span>
                  </div>
                  {o.items.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                      {o.items.slice(0, 4).map((it, i) => (
                        <span key={i} style={{ background:"#f1f5f9", color:"#1e293b", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:700 }}>
                          {it}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    background:"#f8fafc", borderRadius:8, padding:"0.5rem 0.75rem" }}>
                    <span style={{ fontSize:12, color:"#64748b", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                      <Clock size={12} /> {fmtDate(o.date)}
                    </span>
                    <span style={{ fontSize:16, fontWeight:900, color:"#1e293b" }}>
                      {o.amount.toLocaleString("en-US")} {currency}
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:"0.4rem", borderTop:"1px solid rgba(0,0,0,0.06)", paddingTop:"0.5rem" }}>
                    <button onClick={() => printFoodInvoice(o, hotel, currency, PM_LABEL)}
                      style={{ flex:1, background:"#2563eb", color:"#fff", border:"none", borderRadius:8,
                        padding:"0.4rem 0.5rem", fontSize:12, fontWeight:700, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                      <Printer size={12} /> {t("طباعة الفاتورة")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: DEBTS */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "debts" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.75rem", marginBottom:"1rem" }}>
            {[
              { label:"إجمالي الديون", value: debts.reduce((s,d) => s + d.amount, 0), color:"#dc2626" },
              { label:"إجمالي المحصّل", value: debts.reduce((s,d) => s + d.paidAmount, 0), color:"#16a34a" },
              { label:"المتبقي غير محصّل", value: totalDebts, color:"#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"0.85rem" }}>
                <p style={{ fontSize:12, color:"#64748b", fontWeight:700, marginBottom:4 }}>{t(s.label)}</p>
                <p style={{ fontSize:18, fontWeight:900, color:s.color }}>
                  {s.value.toLocaleString("en-US")} {currency}
                </p>
              </div>
            ))}
          </div>

          {filteredDebts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-muted)" }}>
              <Receipt size={42} strokeWidth={1.1} style={{ color:"#d1d5db", marginBottom:10 }} />
              <p style={{ fontWeight:800, color:"var(--color-heading)" }}>{t("لا توجد ديون مسجلة")}</p>
              <p style={{ fontSize:13 }}>{t('استخدم زر "إضافة دين" لتسجيل دين جديد.')}</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"0.85rem" }}>
              {filteredDebts.map(d => {
                const remaining = d.amount - d.paidAmount;
                const pct = Math.round((d.paidAmount / d.amount) * 100);
                const paid = remaining <= 0;
                const overdue = !paid && d.dueDate < todayISO();
                return (
                  <div key={d.id} style={{
                    background:"#fff", border:`1px solid ${paid ? "#bbf7d0" : overdue ? "#fecaca" : "#e2e8f0"}`,
                    borderRight:`4px solid ${paid ? "#16a34a" : overdue ? "#dc2626" : "#f59e0b"}`,
                    borderRadius:12, padding:"0.9rem",
                    display:"flex", flexDirection:"column", gap:"0.45rem",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <p style={{ fontWeight:800, fontSize:14, color:"#1e293b" }}>{d.debtor}</p>
                        <p style={{ fontSize:12, color:"#64748b" }}>{d.description}</p>
                      </div>
                      <span style={{
                        padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, border:"none",
                        background: paid ? "#dcfce7" : overdue ? "#fef2f2" : "#fef9c3",
                        color: paid ? "#15803d" : overdue ? "#dc2626" : "#92400e",
                      }}>
                        {paid ? t("مسدد") : overdue ? t("متأخر") : t("جارٍ")}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:700, marginBottom:4, color:"#64748b" }}>
                        <span>{`${t("المحصّل")}: ${d.paidAmount.toLocaleString("en-US")} ${currency}`}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height:8, background:"#f1f5f9", borderRadius:20, overflow:"hidden" }}>
                        <div style={{
                          height:"100%", borderRadius:20, transition:"width 0.3s",
                          width:`${pct}%`,
                          background: paid ? "#16a34a" : pct > 50 ? "#f59e0b" : "#dc2626",
                        }} />
                      </div>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.35rem" }}>
                      <div style={{ background:"#f8fafc", borderRadius:6, padding:"5px 8px", fontSize:11 }}>
                        <p style={{ color:"#94a3b8", marginBottom:1 }}>{t("إجمالي الدين")}</p>
                        <p style={{ fontWeight:800, color:"#dc2626" }}>{d.amount.toLocaleString("en-US")} {currency}</p>
                      </div>
                      <div style={{ background:"#f8fafc", borderRadius:6, padding:"5px 8px", fontSize:11 }}>
                        <p style={{ color:"#94a3b8", marginBottom:1 }}>{t("المتبقي")}</p>
                        <p style={{ fontWeight:800, color: remaining > 0 ? "#dc2626" : "#16a34a" }}>
                          {remaining > 0 ? remaining.toLocaleString("en-US") : "0"} {currency}
                        </p>
                      </div>
                      <div style={{ background:"#f8fafc", borderRadius:6, padding:"5px 8px", fontSize:11, gridColumn:"1/-1" }}>
                        <p style={{ color:"#94a3b8", marginBottom:1 }}>{t("تاريخ الاستحقاق")}</p>
                        <p style={{ fontWeight:700, color: overdue ? "#dc2626" : "#1e293b" }}>{fmtDate(d.dueDate)}</p>
                      </div>
                    </div>

                    {d.notes && (
                      <div style={{ background:"#fef9c3", borderRadius:6, padding:"5px 8px", fontSize:11, color:"#78350f" }}>
                        {d.notes}
                      </div>
                    )}

                    <div style={{ display:"flex", gap:"0.35rem", borderTop:"1px solid rgba(0,0,0,0.06)", paddingTop:"0.5rem" }}>
                      {!paid && (
                        <button onClick={() => { setPayingDebt(d); setPayAmt(""); }}
                          style={{ flex:1, background:"#16a34a", color:"#fff", border:"none", borderRadius:8,
                            padding:"0.4rem 0.5rem", fontSize:12, fontWeight:700, cursor:"pointer",
                            display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                          <Banknote size={12} /> {t("تسجيل دفعة")}
                        </button>
                      )}
                      <button onClick={() => openEditDebt(d)}
                        style={{ flex: paid ? 1 : 0, background:"#1e293b", color:"#fff", border:"none", borderRadius:8,
                          padding:"0.4rem 0.65rem", fontSize:12, fontWeight:700, cursor:"pointer",
                          display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                        {paid && t("تعديل")}
                        {!paid && <Receipt size={12} />}
                      </button>
                      <button onClick={() => deleteDebt(d.id)}
                        style={{ background:"#dc2626", color:"#fff", border:"none", borderRadius:8,
                          padding:"0.4rem 0.65rem", fontSize:12, fontWeight:700, cursor:"pointer",
                          display:"flex", alignItems:"center", gap:4 }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════ ADD / EDIT DEBT MODAL ═══════════════════════════════════════════ */}
      {showDebtForm && (
        <div className="ds-modal-backdrop" onClick={() => setShowDebtForm(false)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth:500 }}>
            <div className="ds-modal-head">
              <div>
                <p style={{ fontSize:11, color:"var(--color-primary)", fontWeight:700, marginBottom:2 }}>
                  {editDebtId ? t("تعديل") : t("تسجيل دين جديد")}
                </p>
                <h2>{editDebtId ? t("تعديل بيانات الدين") : t("إضافة دين")}</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowDebtForm(false)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              {debtFormErr && (
                <p style={{ color:"#dc2626", fontSize:13, marginBottom:"0.75rem",
                  background:"#fef2f2", padding:"0.5rem 0.75rem", borderRadius:8 }}>
                  {debtFormErr}
                </p>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.65rem" }}>
                <div className="field" style={{ gridColumn:"1/-1" }}>
                  <label className="field-label">{t("اسم المدين *")}</label>
                  <input className="input" value={debtForm.debtor}
                    onChange={e => setDebtForm(p => ({ ...p, debtor: e.target.value }))}
                    placeholder={t("اسم الشخص أو الجهة المدينة")} />
                </div>
                <div className="field" style={{ gridColumn:"1/-1" }}>
                  <label className="field-label">{t("وصف الدين *")}</label>
                  <input className="input" value={debtForm.description}
                    onChange={e => setDebtForm(p => ({ ...p, description: e.target.value }))}
                    placeholder={t("سبب الدين أو وصفه")} />
                </div>
                <div className="field">
                  <label className="field-label">إجمالي المبلغ ({currency}) *</label>
                  <input className="input" type="number" min="0.01" step="0.01"
                    value={debtForm.amount}
                    onChange={e => setDebtForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div className="field">
                  <label className="field-label">{t("المدفوع حتى الآن")} ({currency})</label>
                  <input className="input" type="number" min="0" step="0.01"
                    value={debtForm.paidAmount}
                    onChange={e => setDebtForm(p => ({ ...p, paidAmount: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div className="field" style={{ gridColumn:"1/-1" }}>
                  <label className="field-label">{t("تاريخ الاستحقاق *")}</label>
                  <input className="input" type="date" value={debtForm.dueDate}
                    onChange={e => setDebtForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div className="field" style={{ gridColumn:"1/-1" }}>
                  <label className="field-label">{t("ملاحظات")}</label>
                  <textarea className="input" rows={2} value={debtForm.notes}
                    onChange={e => setDebtForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder={t("أي تفاصيل إضافية...")}
                    style={{ resize:"vertical" }} />
                </div>
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setShowDebtForm(false)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-danger" onClick={saveDebt}>
                {editDebtId ? t("حفظ التعديلات") : t("تسجيل الدين")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ PAY PARTIAL MODAL ═══════════════════════════════════════════════ */}
      {payingDebt && (
        <div className="ds-modal-backdrop" onClick={() => setPayingDebt(null)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth:380 }}>
            <div className="ds-modal-head">
              <h2>{t("تسجيل دفعة")}</h2>
              <button className="icon-btn" onClick={() => setPayingDebt(null)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              <p style={{ fontSize:13, fontWeight:700, marginBottom:"0.75rem", color:"#1e293b" }}>
                {lang === "ar" ? `${payingDebt.debtor} — متبقٍ ${(payingDebt.amount - payingDebt.paidAmount).toLocaleString("en-US")} ${currency}` : `${payingDebt.debtor} — Remaining ${(payingDebt.amount - payingDebt.paidAmount).toLocaleString("en-US")} ${currency}`}
              </p>
              <div className="field">
                <label className="field-label">{t("مبلغ الدفعة")} ({currency}) *</label>
                <input className="input" type="number" min="0.01" step="0.01"
                  value={payAmt} onChange={e => setPayAmt(e.target.value)}
                  placeholder="0.00" autoFocus />
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setPayingDebt(null)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-success" onClick={payDebt}>{t("تأكيد الدفعة")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
function PaymentsFallback() {
  const { t } = useLang();
  return <div style={{ padding:"2rem", color:"var(--color-muted)" }}>{t("جاري التحميل...")}</div>;
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<PaymentsFallback />}>
      <PaymentsInner />
    </Suspense>
  );
}
