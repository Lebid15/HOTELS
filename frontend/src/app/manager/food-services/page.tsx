"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Utensils, BookOpen, Plus, Pencil, Trash2, Printer, ClipboardList, Loader2, CheckCircle2, Home, Banknote, Search, CreditCard, Calendar, X, TrendingUp, XCircle, ChefHat, FileText, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";
import { escapeHtml as esc } from "@/lib/print";

function mapOrder(x: Record<string, unknown>): FoodOrder {
  return {
    id: String(x.id ?? ""), orderNo: String(x.order_no ?? ""), hotelId: String(x.hotel ?? ""),
    sourceType: String(x.source_type ?? "direct") as TSource,
    serviceType: String(x.service_type ?? "restaurant") as TService,
    roomId: x.room ? String(x.room) : undefined,
    roomNumber: x.room_number ? String(x.room_number) : undefined,
    reservationId: x.reservation ? String(x.reservation) : undefined,
    reservationNo: x.reservation_no ? String(x.reservation_no) : undefined,
    guestName: x.guest_name ? String(x.guest_name) : undefined,
    tableNumber: x.table_number ? String(x.table_number) : undefined,
    customerName: x.customer_name ? String(x.customer_name) : undefined,
    items: Array.isArray(x.items) ? (x.items as OrderItem[]) : [],
    amount: Number(x.amount ?? 0), currency: String(x.currency ?? "USD"),
    paymentMethod: String(x.payment_method ?? "cash") as TPayment,
    status: String(x.status ?? "new") as TStatus,
    notes: x.notes ? String(x.notes) : undefined,
    createdAt: String(x.created_at ?? ""), createdBy: String(x.created_by_name ?? ""),
    updatedAt: String(x.updated_at ?? ""),
    deliveredAt: x.delivered_at ? String(x.delivered_at) : undefined,
    cancelledAt: x.cancelled_at ? String(x.cancelled_at) : undefined,
    cancelReason: x.cancel_reason ? String(x.cancel_reason) : undefined,
  };
}
function mapMenu(x: Record<string, unknown>): MenuItem {
  return {
    id: String(x.id ?? ""), name: String(x.name ?? ""), category: String(x.category ?? ""),
    price: Number(x.price ?? 0), available: Boolean(x.available),
    notes: x.notes ? String(x.notes) : undefined, createdAt: String(x.created_at ?? ""),
  };
}
const SETTINGS_KEY = (h: string) => `fandqi.settings.${h}`;

// ─── types ────────────────────────────────────────────────────────────────────
type TStatus = "new" | "preparing" | "ready" | "delivered" | "cancelled";
type TSource  = "room" | "table" | "direct" | "room_service";
type TService = "restaurant" | "cafeteria" | "room_service";
type TPayment = "cash" | "electronic" | "room_account";
type TDateF   = "today" | "last7" | "month" | "all";
type TTab     = "all" | TStatus;

interface OrderItem { name: string; qty: number; price: number; }
interface FoodOrder {
  id: string; orderNo: string; hotelId: string;
  sourceType: TSource; serviceType: TService;
  roomId?: string; roomNumber?: string;
  reservationId?: string; reservationNo?: string; guestName?: string;
  tableNumber?: string; customerName?: string;
  items: OrderItem[]; amount: number; currency: string;
  paymentMethod: TPayment; status: TStatus; notes?: string;
  createdAt: string; createdBy: string; updatedAt: string;
  deliveredAt?: string; deliveredBy?: string;
  cancelledAt?: string; cancelledBy?: string; cancelReason?: string;
}
interface RoomItem { id: number; number: string; floor: number; status: string; }
interface ResItem  { id: number; booking_number: string; room: number | null; room_number: string | null; guest_first_name: string; guest_last_name: string; status: string; }

// ─── constants ────────────────────────────────────────────────────────────────
// STATUS_LABEL, PAY_LABEL, SRC_LABEL, SVC_LABEL, TABS, MENU_CATS moved inside component (use t())
const STATUS_STYLE: Record<TStatus, { background:string; color:string }> = {
  new:       { background:"#2563eb", color:"#fff" },
  preparing: { background:"#d97706", color:"#fff" },
  ready:     { background:"#16a34a", color:"#fff" },
  delivered: { background:"#059669", color:"#fff" },
  cancelled: { background:"#dc2626", color:"#fff" },
};
const PAY_STYLE: Record<TPayment, { background:string; color:string }> = {
  cash:         { background:"#16a34a", color:"#fff" },
  electronic:   { background:"#0369a1", color:"#fff" },
  room_account: { background:"#d97706", color:"#fff" },
};
const STATUS_ORDER: TStatus[] = ["new","preparing","ready","delivered","cancelled"];

// ─── menu items ───────────────────────────────────────────────────────────────
// PAY_LABEL, SRC_LABEL, SVC_LABEL, TABS, MENU_CATS moved inside component (use t())

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  notes?: string;
  createdAt: string;
}

function blankMenuForm() {
  return { name: "", category: "وجبات رئيسية", price: "", available: true, notes: "" };
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SA", { hour:"2-digit", minute:"2-digit" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-u-nu-latn", { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}
function todayISO() { return new Date().toISOString().slice(0,10); }
function now() { return new Date().toISOString(); }

function itemsTotal(items: OrderItem[]) {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}

function sortOrders(orders: FoodOrder[]) {
  return [...orders].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function inDateRange(iso: string, filter: TDateF) {
  const d = iso.slice(0,10);
  const today = todayISO();
  if (filter === "today") return d === today;
  if (filter === "last7") {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff.toISOString().slice(0,10);
  }
  if (filter === "month") return d.slice(0,7) === today.slice(0,7);
  return true;
}

function getDisplayName(o: FoodOrder, t: (s: string) => string) {
  if (o.guestName) return o.guestName;
  if (o.customerName) return o.customerName;
  return t("زبون مباشر");
}

function getLocation(o: FoodOrder, t: (s: string) => string) {
  if (o.roomNumber)  return `${t("غرفة")} ${o.roomNumber}`;
  if (o.tableNumber) return `${t("طاولة")} ${o.tableNumber}`;
  return t("خارجي / مباشر");
}

function printInvoice(o: FoodOrder, hotelName: string, currency: string, labels: { svc: Record<string,string>; pay: Record<string,string>; status: Record<string,string> }) {
  const win = window.open("", "_blank");
  if (!win) return;
  const itemsHtml = o.items.map(i => `
    <tr>
      <td style="padding:4px 8px;border:1px solid #e5e7eb;">${esc(i.name)}</td>
      <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center;">${i.qty}</td>
      <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left;">${i.price}</td>
      <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left;font-weight:600;">${(i.qty*i.price).toFixed(2)}</td>
    </tr>`).join("");
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
    <title>فاتورة طلب ${o.orderNo}</title>
    <style>body{font-family:Tajawal,Arial,sans-serif;margin:2cm;font-size:14px;color:#111;}
    h1{text-align:center;font-size:1.3rem;margin-bottom:4px;}
    .sub{text-align:center;color:#666;font-size:0.85rem;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;margin-top:12px;}
    th{background:#f3f4f6;padding:6px 8px;border:1px solid #e5e7eb;font-weight:700;}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
    .meta-item{background:#f9fafb;padding:6px 10px;border-radius:4px;}
    .meta-item span{font-size:0.75rem;color:#6b7280;display:block;}
    .total{text-align:left;margin-top:12px;font-size:1.1rem;font-weight:700;}
    @media print{button{display:none}}</style></head><body>
    <h1>${esc(hotelName)}</h1>
    <p class="sub">فاتورة طلب</p>
    <div class="meta">
      <div class="meta-item"><span>رقم الطلب</span>${o.orderNo}</div>
      <div class="meta-item"><span>التاريخ</span>${fmtDateTime(o.createdAt)}</div>
      <div class="meta-item"><span>النزيل / الزبون</span>${esc(getDisplayName(o, s => s))}</div>
      <div class="meta-item"><span>الموقع</span>${esc(getLocation(o, s => s))}</div>
      <div class="meta-item"><span>نوع الخدمة</span>${labels.svc[o.serviceType]??o.serviceType}</div>
      <div class="meta-item"><span>طريقة الدفع</span>${labels.pay[o.paymentMethod]??o.paymentMethod}</div>
      <div class="meta-item"><span>الموظف</span>${esc(o.createdBy)}</div>
      <div class="meta-item"><span>الحالة</span>${labels.status[o.status]??o.status}</div>
    </div>
    <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
    <tbody>${itemsHtml}</tbody></table>
    <div class="total">الإجمالي: ${o.amount.toFixed(2)} ${currency}</div>
    ${o.notes ? `<p style="margin-top:12px;color:#6b7280;font-size:0.85rem;">ملاحظات: ${esc(o.notes)}</p>` : ""}
    <script>window.onload=()=>window.print();</script></body></html>`);
  win.document.close();
}

// ─── blank form ───────────────────────────────────────────────────────────────
function blankForm() {
  return {
    sourceType: "room" as TSource,
    serviceType: "restaurant" as TService,
    roomId: "", roomNumber: "",
    guestName: "", reservationId: "", reservationNo: "",
    tableNumber: "", customerName: "",
    items: [{ name: "", qty: 1, price: 0 }] as OrderItem[],
    paymentMethod: "cash" as TPayment,
    notes: "",
  };
}

// ─── component ────────────────────────────────────────────────────────────────
export default function FoodServicesPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const STATUS_LABEL: Record<TStatus, string> = { new:t("جديد"), preparing:t("قيد التحضير"), ready:t("جاهز"), delivered:t("تم التسليم"), cancelled:t("ملغي") };
  const PAY_LABEL: Record<TPayment, string> = { cash:t("نقدي"), electronic:t("إلكتروني"), room_account:t("على حساب الغرفة") };
  const SRC_LABEL: Record<TSource,  string> = { room:t("غرفة"), table:t("طاولة"), direct:t("خارجي / مباشر"), room_service:t("خدمة غرف") };
  const SVC_LABEL: Record<TService, string> = { restaurant:t("مطعم"), cafeteria:t("كافتريا"), room_service:t("خدمة غرف") };
  const TABS: { key: TTab; label: string }[] = [
    { key:"all",       label:t("الكل") },
    { key:"new",       label:t("جديد") },
    { key:"preparing", label:t("قيد التحضير") },
    { key:"ready",     label:t("جاهز") },
    { key:"delivered", label:t("تم التسليم") },
    { key:"cancelled", label:t("ملغي") },
  ];
  const MENU_CATS = [t("مقبلات"), t("وجبات رئيسية"), t("حلويات"), t("مشروبات"), t("وجبات خفيفة"), t("أخرى")];
  const hotelId = typeof window !== "undefined" ? (localStorage.getItem("hotel_id") ?? "") : "";
  const username = typeof window !== "undefined" ? (localStorage.getItem("username") ?? t("موظف")) : t("موظف");

  const [orders,       setOrders]       = useState<FoodOrder[]>([]);
  const [rooms,        setRooms]        = useState<RoomItem[]>([]);
  const [reservations, setReservations] = useState<ResItem[]>([]);
  const [currency,     setCurrency]     = useState("USD");
  const [hasRest,      setHasRest]      = useState(true);
  const [hasCaf,       setHasCaf]       = useState(true);
  const [hasRS,        setHasRS]        = useState(true);
  const [tab,          setTab]          = useState<TTab>("all");
  const [search,       setSearch]       = useState("");
  const [srcFilter,    setSrcFilter]    = useState<TSource | "all">("all");
  const [payFilter,    setPayFilter]    = useState<TPayment | "all">("all");
  const [svcFilter,    setSvcFilter]    = useState<TService | "all">("all");
  const [dateFilter,   setDateFilter]   = useState<TDateF>("today");
  const [toast,        setToast]        = useState("");
  const [showAdd,      setShowAdd]      = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [viewOrder,    setViewOrder]    = useState<FoodOrder | null>(null);
  const [cancelModal,  setCancelModal]  = useState<{ id: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [form,         setForm]         = useState(blankForm());
  const [section,      setSection]      = useState<"orders" | "menu">("orders");
  const [menuItems,    setMenuItems]    = useState<MenuItem[]>([]);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editMenuId,   setEditMenuId]   = useState<string | null>(null);
  const [menuForm,     setMenuForm]     = useState(blankMenuForm());

  // load orders + menu من الـBackend
  const loadFoodData = async () => {
    if (!hotelId) return;
    const h = apiH();
    try {
      const [od, md] = await Promise.all([
        fetch(`${API}/food-orders/?hotel=${hotelId}`, { headers: h }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/menu-items/?hotel=${hotelId}`, { headers: h }).then(r => r.ok ? r.json() : []),
      ]);
      setOrders((Array.isArray(od) ? od : od.results ?? []).map(mapOrder));
      setMenuItems((Array.isArray(md) ? md : md.results ?? []).map(mapMenu));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!hotelId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
    loadFoodData();
    // إعدادات العملة/تفعيل الخدمات (لا تزال في fandqi.settings — بند مؤجّل)
    const sRaw = localStorage.getItem(SETTINGS_KEY(hotelId));
    if (sRaw) {
      try {
        const s = JSON.parse(sRaw);
        if (s.ops?.currency) setCurrency(s.ops.currency);
        if (s.rest) {
          setHasRest(s.rest.hasRestaurant ?? true);
          setHasCaf(s.rest.hasCafeteria ?? true);
          setHasRS(s.rest.hasRoomService ?? true);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  // fetch rooms + reservations
  useEffect(() => {
    if (!hotelId) return;
    const h = apiH();
    fetch(`${API}/rooms/?hotel=${hotelId}`, { headers: h })
      .then(r => r.ok ? r.json() : []).then(setRooms).catch(() => {});
    fetch(`${API}/reservations/?hotel=${hotelId}`, { headers: h })
      .then(r => r.ok ? r.json() : []).then(setReservations).catch(() => {});
  }, [hotelId]);

  // toast auto-dismiss
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3000); return () => clearTimeout(timer); }, [toast]);

  async function saveMenuItem() {
    if (!menuForm.name.trim()) { setToast(t("اسم الصنف مطلوب")); return; }
    const price = parseFloat(menuForm.price) || 0;
    const body = { name: menuForm.name.trim(), category: menuForm.category, price, available: menuForm.available, notes: menuForm.notes || "" };
    try {
      const r = await fetch(editMenuId ? `${API}/menu-items/${editMenuId}/` : `${API}/menu-items/`, {
        method: editMenuId ? "PATCH" : "POST", headers: apiHJ(), body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      setToast(editMenuId ? t("تم تحديث الصنف") : t("تم إضافة الصنف"));
      setShowMenuForm(false); setEditMenuId(null); setMenuForm(blankMenuForm());
      await loadFoodData();
    } catch { setToast(t("تعذّر حفظ الصنف")); }
  }

  async function deleteMenuItem(id: string) {
    try {
      const r = await fetch(`${API}/menu-items/${id}/`, { method: "DELETE", headers: apiH() });
      if (!r.ok && r.status !== 204) throw new Error();
      setToast(t("تم حذف الصنف"));
      await loadFoodData();
    } catch { setToast(t("تعذّر الحذف")); }
  }

  async function toggleMenuAvailable(item: MenuItem) {
    try {
      const r = await fetch(`${API}/menu-items/${item.id}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify({ available: !item.available }) });
      if (!r.ok) throw new Error();
      await loadFoodData();
    } catch { setToast(t("تعذّر التحديث")); }
  }

  function openMenuForm(item?: MenuItem) {
    if (item) {
      setMenuForm({ name: item.name, category: item.category, price: String(item.price), available: item.available, notes: item.notes ?? "" });
      setEditMenuId(item.id);
    } else {
      setMenuForm(blankMenuForm()); setEditMenuId(null);
    }
    setShowMenuForm(true);
  }

  function addFromMenu(item: MenuItem) {
    if (!item.available) { setToast(t("هذا الصنف غير متاح حالياً")); return; }
    setForm(prev => ({ ...prev, items: [...prev.items.filter(i => i.name.trim()), { name: item.name, qty: 1, price: item.price }] }));
  }

  // derive active reservation for a room
  const roomResMap = useMemo(() => {
    const m = new Map<number, ResItem>();
    reservations.filter(r => ["checked_in", "confirmed"].includes(r.status) && r.room !== null)
      .forEach(r => { if (r.room !== null) m.set(r.room, r); });
    return m;
  }, [reservations]);

  // when room is selected in form, auto-fill guest
  function onRoomSelect(roomId: string) {
    const rm = rooms.find(r => String(r.id) === roomId);
    if (!rm) { setForm(p => ({ ...p, roomId: "", roomNumber: "", guestName: "", reservationId: "", reservationNo: "" })); return; }
    const res = roomResMap.get(rm.id);
    setForm(p => ({
      ...p,
      roomId: String(rm.id),
      roomNumber: rm.number,
      guestName: res ? `${res.guest_first_name} ${res.guest_last_name}`.trim() : "",
      reservationId: res ? String(res.id) : "",
      reservationNo: res?.booking_number ?? "",
    }));
  }

  // form item helpers
  const setItem = (idx: number, patch: Partial<OrderItem>) =>
    setForm(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const addItem  = () => setForm(p => ({ ...p, items: [...p.items, { name:"", qty:1, price:0 }] }));
  const dropItem = (idx: number) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  const formTotal = useMemo(() => itemsTotal(form.items), [form.items]);

  function navToFolio() {
    router.push("/manager/folio");
  }
  function navToGuests(searchStr: string) {
    try { localStorage.setItem(`fandqi.nav.guests.${hotelId}`, JSON.stringify({search: searchStr, ts: Date.now()})); } catch {}
    router.push("/manager/guests");
  }

  // open add modal
  function openAdd() {
    const svc: TService = hasRest ? "restaurant" : hasCaf ? "cafeteria" : "room_service";
    setForm({ ...blankForm(), serviceType: svc });
    setEditId(null);
    setShowAdd(true);
  }

  // open edit modal
  function openEdit(o: FoodOrder) {
    setForm({
      sourceType: o.sourceType, serviceType: o.serviceType,
      roomId: o.roomId ?? "", roomNumber: o.roomNumber ?? "",
      guestName: o.guestName ?? "", reservationId: o.reservationId ?? "", reservationNo: o.reservationNo ?? "",
      tableNumber: o.tableNumber ?? "", customerName: o.customerName ?? "",
      items: o.items.length ? o.items : [{ name:"", qty:1, price:0 }],
      paymentMethod: o.paymentMethod, notes: o.notes ?? "",
    });
    setEditId(o.id);
    setShowAdd(true);
  }

  // save (add or edit)
  async function saveOrder() {
    if (form.items.every(i => !i.name.trim())) { setToast(t("أضف صنفًا واحدًا على الأقل.")); return; }
    const validItems = form.items.filter(i => i.name.trim());
    const total = itemsTotal(validItems);
    const body: Record<string, unknown> = {
      source_type: form.sourceType, service_type: form.serviceType,
      room: form.roomId ? Number(form.roomId) : null, room_number: form.roomNumber || "",
      reservation: form.reservationId ? Number(form.reservationId) : null, reservation_no: form.reservationNo || "",
      guest_name: form.guestName || "", table_number: form.tableNumber || "", customer_name: form.customerName || "",
      items: validItems, amount: total, currency, payment_method: form.paymentMethod, notes: form.notes || "",
    };
    // د‑4: تفصيل المقبوض حسب الطريقة (على حساب الغرفة → ذمّة تدخل الفوليو وتمنع الخروج)
    if (!editId) {
      const pm = String(form.paymentMethod);
      body.amount_cash       = pm === "cash"        ? total : 0;
      body.amount_electronic = pm === "electronic"  ? total : 0;
      body.amount_card       = pm === "card"        ? total : 0;
      body.amount_room       = pm === "room_account"? total : 0;
    }
    if (!editId) body.status = "new";
    try {
      const r = await fetch(editId ? `${API}/food-orders/${editId}/` : `${API}/food-orders/`, {
        method: editId ? "PATCH" : "POST", headers: apiHJ(), body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      setToast(editId ? t("تم تحديث الطلب بنجاح") : t("تم حفظ الطلب بنجاح"));
      setShowAdd(false);
      await loadFoodData();
    } catch { setToast(t("تعذّر حفظ الطلب")); }
  }

  // status transitions
  async function setStatus(id: string, status: TStatus, extra: Partial<FoodOrder> = {}) {
    const body: Record<string, unknown> = { status };
    if (extra.cancelledAt) body.cancelled_at = extra.cancelledAt;
    if (extra.cancelReason !== undefined) body.cancel_reason = extra.cancelReason ?? "";
    if (extra.deliveredAt) body.delivered_at = extra.deliveredAt;
    try {
      const r = await fetch(`${API}/food-orders/${id}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      const msgs: Partial<Record<TStatus, string>> = {
        preparing: t("تم نقل الطلب إلى قيد التحضير"),
        ready:     t("تم تحديد الطلب كجاهز للتسليم"),
        delivered: t("تم تسليم الطلب بنجاح"),
        cancelled: t("تم إلغاء الطلب"),
      };
      if (msgs[status]) setToast(msgs[status]!);
      await loadFoodData();
    } catch { setToast(t("تعذّر تحديث حالة الطلب")); }
  }

  function confirmCancel() {
    if (!cancelModal) return;
    setStatus(cancelModal.id, "cancelled", { cancelledAt: now(), cancelledBy: username, cancelReason: cancelReason || undefined });
    setCancelModal(null); setCancelReason("");
  }

  // ─── filtering ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortOrders(orders).filter(o => {
      if (!inDateRange(o.createdAt, dateFilter)) return false;
      if (tab !== "all" && o.status !== tab) return false;
      if (srcFilter !== "all" && o.sourceType !== srcFilter) return false;
      if (payFilter !== "all" && o.paymentMethod !== payFilter) return false;
      if (svcFilter !== "all" && o.serviceType !== svcFilter) return false;
      if (q) {
        const haystack = [
          o.orderNo, o.guestName, o.customerName, o.roomNumber, o.tableNumber,
          o.reservationNo, o.createdBy, o.notes,
          STATUS_LABEL[o.status], PAY_LABEL[o.paymentMethod],
          ...o.items.map(i => i.name),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- STATUS_LABEL/PAY_LABEL derive from t(); adding them to deps would invalidate every render since they're recreated each render
  }, [orders, tab, search, srcFilter, payFilter, svcFilter, dateFilter]);

  // ─── summary stats ────────────────────────────────────────────────────────
  const todayOrders = useMemo(() => orders.filter(o => inDateRange(o.createdAt, "today")), [orders]);
  const statsTotal     = todayOrders.length;
  const statsDelivered = todayOrders.filter(o => o.status === "delivered").length;
  const statsRoomAcc   = todayOrders.filter(o => o.paymentMethod === "room_account").reduce((s, o) => s + o.amount, 0);
  const statsRevenue   = todayOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.amount, 0);
  const statsCancelled = todayOrders.filter(o => o.status === "cancelled").length;
  const statsMonthRev  = orders.filter(o => inDateRange(o.createdAt,"month") && o.status !== "cancelled").reduce((s,o)=>s+o.amount,0);

  // ─── service check ────────────────────────────────────────────────────────
  if (!hasRest && !hasCaf && !hasRS) {
    return (
      <div className="ds-page" dir="rtl">
        <div className="ds-card-p" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
          <Utensils size={48} strokeWidth={1.2} style={{ color: "#d1d5db", marginBottom: "0.75rem" }} />
          <p style={{ fontWeight: 700, fontSize: "1rem", color: "#374151", marginBottom: "0.3rem" }}>{t("هذه الخدمة غير مفعّلة لهذا الفندق")}</p>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            {t("يمكن تفعيل المطعم أو الكافتريا من الإعدادات أو من خلال الباقة المناسبة.")}
          </p>
        </div>
      </div>
    );
  }

  const availableServices: { value: TService; label: string }[] = [
    ...(hasRest ? [{ value: "restaurant" as TService, label: t("مطعم") }] : []),
    ...(hasCaf  ? [{ value: "cafeteria"  as TService, label: t("كافتريا") }] : []),
    ...(hasRS   ? [{ value: "room_service" as TService, label: t("خدمة غرف") }] : []),
  ];

  return (
    <div className="ds-page" dir="rtl">
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", left:"50%", transform:"translateX(-50%)", background:"#1e293b", color:"#fff", padding:"0.7rem 1.5rem", borderRadius:"0.5rem", fontWeight:600, fontSize:"0.875rem", boxShadow:"0 4px 16px #0003", zIndex:9999 }}>
          {toast}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize:"0.75rem", color:"#4f46e5", fontWeight:600, marginBottom:"0.2rem", textTransform:"uppercase", letterSpacing:"0.05em" }}>{t("إدارة الطلبات")}</p>
          <h1 style={{ margin:0, fontSize:"1.6rem", fontWeight:700 }}>{t("المطعم والكافتريا")}</h1>
          <p style={{ margin:0, fontSize:"0.85rem", color:"#6b7280", marginTop:"0.2rem" }}>
            {t("إدارة طلبات المطعم والكافتريا وخدمة الغرف، مع ربط الدفع بالغرف وكشف حساب النزيل.")}
          </p>
        </div>
        <div className="page-actions">
          {section === "orders"
            ? <button className="ds-btn ds-btn-primary" onClick={openAdd} style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}><Plus size={15} /> {t("إضافة طلب")}</button>
            : <button className="ds-btn ds-btn-primary" onClick={() => openMenuForm()} style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}><Plus size={15} /> {t("إضافة صنف")}</button>
          }
        </div>
      </div>

      {/* ── Section switcher ───────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.5rem", borderBottom:"2px solid #f3f4f6", paddingBottom:"1rem" }}>
        <button
          className={`ds-btn${section === "orders" ? " ds-btn-primary" : " ds-btn-neutral"}`}
          onClick={() => setSection("orders")}
          style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}
        >
          <Utensils size={15} strokeWidth={2} />
          <span>{t("الطلبات")}</span>
          <span style={{ background: section==="orders" ? "#ffffff30" : "#e5e7eb", color: section==="orders" ? "#fff" : "#374151", borderRadius:"1rem", padding:"0 0.4rem", fontSize:"0.68rem", fontWeight:700 }}>{orders.length}</span>
        </button>
        <button
          className={`ds-btn${section === "menu" ? " ds-btn-primary" : " ds-btn-neutral"}`}
          onClick={() => setSection("menu")}
          style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}
        >
          <BookOpen size={15} strokeWidth={2} />
          <span>{t("الأصناف")}</span>
          <span style={{ background: section==="menu" ? "#ffffff30" : "#e5e7eb", color: section==="menu" ? "#fff" : "#374151", borderRadius:"1rem", padding:"0 0.4rem", fontSize:"0.68rem", fontWeight:700 }}>{menuItems.length}</span>
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      {section === "orders" && <>
      {/* ── KPI Row 1: Status filters ──────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"0.75rem" }}>
        {([
          { label:t("إجمالي اليوم"),  val: statsTotal,                                              note:t("كل طلبات اليوم"),         grad:"linear-gradient(135deg,#4f46e5,#6366f1)", Icon: ClipboardList as LucideIcon, active: tab==="all",        onClick: ()=>{ setTab("all"); setDateFilter("today"); } },
          { label:t("طلبات جديدة"),   val: todayOrders.filter(o=>o.status==="new").length,           note:t("تنتظر بدء التحضير"),      grad:"linear-gradient(135deg,#2563eb,#3b82f6)", Icon: ClipboardList as LucideIcon, active: tab==="new",        onClick: ()=>setTab("new") },
          { label:t("قيد التحضير"),   val: todayOrders.filter(o=>o.status==="preparing").length,     note:t("تحضيرها جارٍ الآن"),     grad:"linear-gradient(135deg,#d97706,#f59e0b)", Icon: Loader2      as LucideIcon, active: tab==="preparing",  onClick: ()=>setTab("preparing") },
          { label:t("تم التسليم"),    val: statsDelivered,                                           note:t("طلبات مكتملة"),           grad:"linear-gradient(135deg,#059669,#22c55e)", Icon: CheckCircle2 as LucideIcon, active: tab==="delivered", onClick: ()=>setTab("delivered") },
        ] as {label:string;val:number|string;note:string;grad:string;Icon:LucideIcon;active:boolean;onClick:()=>void}[]).map(c => (
          <div key={c.label} className="ds-kpi-card" onClick={c.onClick} style={{ background:c.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff", cursor:"pointer", position:"relative", transition:"transform .15s,box-shadow .15s", ...(c.active ? { transform:"translateY(-3px) scale(1.02)", boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)" } : {}) }}>
            {c.active && <span style={{ position:"absolute", top:"0.4rem", left:"0.5rem", fontSize:"0.55rem", fontWeight:700, background:"rgba(255,255,255,.25)", padding:"0.1rem 0.4rem", borderRadius:"1rem" }}>● {t("نشط")}</span>}
            <div className="ds-kpi-icon"><c.Icon size={26} strokeWidth={1.6} /></div>
            <p style={{ fontSize:13, fontWeight:700, opacity:.90, marginBottom:4 }}>{c.label}</p>
            <p style={{ fontSize:22, fontWeight:900, lineHeight:1.15, marginBottom:3 }}>{c.val}</p>
            <p style={{ fontSize:12, opacity:.80 }}>{c.note}</p>
          </div>
        ))}
      </div>
      {/* ── KPI Row 2: Revenue + payment filters ───────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"1.5rem" }}>
        {([
          { label:t("ملغية اليوم"),     val: statsCancelled,                          note:t("طلبات ألغيت"),            grad:"linear-gradient(135deg,#dc2626,#ef4444)", Icon: XCircle    as LucideIcon, active: tab==="cancelled",                                    onClick: ()=>setTab("cancelled") },
          { label:t("على حساب الغرفة"), val: `${statsRoomAcc.toFixed(0)} ${currency}`, note:t("مرحّلة على الفوليو"),    grad:"linear-gradient(135deg,#c2410c,#ea580c)", Icon: Home       as LucideIcon, active: payFilter==="room_account",                           onClick: ()=>{ setPayFilter("room_account"); setTab("all"); } },
          { label:t("إيراد اليوم"),     val: `${statsRevenue.toFixed(0)} ${currency}`, note:t("نقدي وإلكتروني ومضاف"), grad:"linear-gradient(135deg,#0369a1,#0891b2)", Icon: Banknote   as LucideIcon, active: dateFilter==="today" && tab==="all" && payFilter==="all", onClick: ()=>{ setDateFilter("today"); setTab("all"); setPayFilter("all"); } },
          { label:t("إيراد الشهر"),     val: `${statsMonthRev.toFixed(0)} ${currency}`, note:t("إجمالي الشهر الحالي"), grad:"linear-gradient(135deg,#0d9488,#14b8a6)", Icon: TrendingUp as LucideIcon, active: dateFilter==="month",                                  onClick: ()=>{ setDateFilter("month"); setTab("all"); } },
        ] as {label:string;val:number|string;note:string;grad:string;Icon:LucideIcon;active:boolean;onClick:()=>void}[]).map(c => (
          <div key={c.label} className="ds-kpi-card" onClick={c.onClick} style={{ background:c.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff", cursor:"pointer", position:"relative", transition:"transform .15s,box-shadow .15s", ...(c.active ? { transform:"translateY(-3px) scale(1.02)", boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)" } : {}) }}>
            {c.active && <span style={{ position:"absolute", top:"0.4rem", left:"0.5rem", fontSize:"0.55rem", fontWeight:700, background:"rgba(255,255,255,.25)", padding:"0.1rem 0.4rem", borderRadius:"1rem" }}>● {t("نشط")}</span>}
            <div className="ds-kpi-icon"><c.Icon size={26} strokeWidth={1.6} /></div>
            <p style={{ fontSize:13, fontWeight:700, opacity:.90, marginBottom:4 }}>{c.label}</p>
            <p style={{ fontSize:22, fontWeight:900, lineHeight:1.15, marginBottom:3 }}>{c.val}</p>
            <p style={{ fontSize:12, opacity:.80 }}>{c.note}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="ds-tabs" style={{ marginBottom:"1rem", flexWrap:"wrap" }}>
        {TABS.map(tab_item => {
          const cnt = tab_item.key === "all" ? orders.length : orders.filter(o => o.status === tab_item.key).length;
          return (
            <button key={tab_item.key} className={`ds-tab-btn${tab === tab_item.key ? " active" : ""}`} onClick={() => setTab(tab_item.key)}>
              {t(tab_item.label)}
              {cnt > 0 && <span style={{ marginRight:"0.35rem", background: tab===tab_item.key ? "#fff3" : "#e5e7eb", color: tab===tab_item.key ? "#fff" : "#374151", borderRadius:"1rem", padding:"0 0.35rem", fontSize:"0.68rem", fontWeight:700 }}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="ds-card-p" style={{ marginBottom:"1.25rem", padding:"0.85rem 1rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:"0.75rem" }}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث بالطلب أو النزيل أو الغرفة")}</p>
            <input className="input" placeholder={t("بحث بالطلب أو النزيل أو الغرفة...")} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Home size={13} strokeWidth={2.2} color="#4f46e5" /> {t("مصدر الطلب")}</p>
            <select className="select" value={srcFilter} onChange={e => setSrcFilter(e.target.value as TSource | "all")}>
              <option value="all">{t("كل المصادر")}</option>
              <option value="room">{t("غرفة")}</option>
              <option value="table">{t("طاولة")}</option>
              <option value="direct">{t("خارجي / مباشر")}</option>
              <option value="room_service">{t("خدمة غرف")}</option>
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><CreditCard size={13} strokeWidth={2.2} color="#4f46e5" /> {t("طريقة الدفع")}</p>
            <select className="select" value={payFilter} onChange={e => setPayFilter(e.target.value as TPayment | "all")}>
              <option value="all">{t("كل طرق الدفع")}</option>
              <option value="cash">{t("نقدي")}</option>
              <option value="electronic">{t("إلكتروني")}</option>
              <option value="room_account">{t("على حساب الغرفة")}</option>
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Calendar size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الفترة الزمنية")}</p>
            <select className="select" value={dateFilter} onChange={e => setDateFilter(e.target.value as TDateF)}>
              <option value="today">{t("اليوم")}</option>
              <option value="last7">{t("آخر 7 أيام")}</option>
              <option value="month">{t("هذا الشهر")}</option>
              <option value="all">{t("الكل")}</option>
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><ChefHat size={13} strokeWidth={2.2} color="#4f46e5" /> {t("نوع الخدمة")}</p>
            <select className="select" value={svcFilter} onChange={e => setSvcFilter(e.target.value as TService | "all")}>
              <option value="all">{t("كل الخدمات")}</option>
              {hasRest && <option value="restaurant">{t("مطعم")}</option>}
              {hasCaf  && <option value="cafeteria">{t("كافتريا")}</option>}
              {hasRS   && <option value="room_service">{t("خدمة غرف")}</option>}
            </select>
          </div>
        </div>
      </div>

      {/* ── Orders grid ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="ds-card-p" style={{ textAlign:"center", padding:"3rem 1.5rem" }}>
          <Utensils size={36} strokeWidth={1.2} style={{ color:"#d1d5db", marginBottom:"0.75rem" }} />
          <p style={{ fontWeight:600, color:"#374151", marginBottom:"0.25rem" }}>{t("لا توجد طلبات حالياً")}</p>
          <p style={{ fontSize:"0.82rem", color:"#9ca3af" }}>{t("ابدأ بإضافة أول طلب للمطعم أو الكافتريا أو خدمة الغرف.")}</p>
        </div>
      ) : (
        <div className="ds-cards-grid" style={{ gap:"1rem" }}>
          {filtered.map(o => {
            const sSt = STATUS_STYLE[o.status];
            const pSt = PAY_STYLE[o.paymentMethod];
            const isActive = o.status !== "delivered" && o.status !== "cancelled";
            return (
              <div key={o.id} className="ds-card-p" style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:"0.65rem", borderRight:`4px solid ${sSt.color}` }}>
                {/* Head */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.5rem" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                    <div style={{ width:"2.2rem", height:"2.2rem", borderRadius:"0.5rem", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", color:"#9ca3af" }}><Utensils size={16} strokeWidth={1.8} /></div>
                    <span style={{ fontWeight:700, fontSize:"0.9rem", color:"#111827" }}>{o.orderNo}</span>
                  </div>
                  <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap" }}>
                    <span style={{ ...sSt, borderRadius:"1rem", padding:"0.15rem 0.5rem", fontSize:"0.65rem", fontWeight:700 }}>{t(STATUS_LABEL[o.status])}</span>
                    <span style={{ ...pSt, borderRadius:"1rem", padding:"0.15rem 0.5rem", fontSize:"0.65rem", fontWeight:700 }}>{t(PAY_LABEL[o.paymentMethod])}</span>
                  </div>
                </div>
                {/* Location + guest */}
                <div style={{ fontSize:"0.82rem", color:"#374151" }}>
                  <div style={{ fontWeight:800, color:"#1e293b" }}>{getDisplayName(o, t)}</div>
                  <div style={{ color:"#1e293b", fontSize:"0.78rem", fontWeight:700 }}>{getLocation(o, t)} · {t(SVC_LABEL[o.serviceType])}</div>
                </div>
                {/* Items */}
                <div style={{ background:"#f9fafb", borderRadius:"0.4rem", padding:"0.5rem 0.65rem", fontSize:"0.78rem" }}>
                  {o.items.slice(0,3).map((it, idx) => (
                    <div key={idx} style={{ display:"flex", justifyContent:"space-between", color:"#374151" }}>
                      <span>{it.name} × {it.qty}</span>
                      <span style={{ color:"#1e293b", fontWeight:700 }}>{(it.qty * it.price).toFixed(0)}</span>
                    </div>
                  ))}
                  {o.items.length > 3 && <div style={{ color:"#64748b", fontSize:"0.72rem", fontWeight:700 }}>+ {lang === "ar" ? `${o.items.length - 3} أصناف أخرى` : `${o.items.length - 3} more items`}</div>}
                </div>
                {/* Meta */}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem", color:"#6b7280" }}>
                  <span style={{ fontWeight:700, color:"#111827", fontSize:"0.9rem" }}>{o.amount.toFixed(2)} {o.currency}</span>
                  <span style={{color:"#1e293b",fontWeight:700}}>{fmtTime(o.createdAt)} · {o.createdBy}</span>
                </div>
                {o.notes && <div style={{ fontSize:"0.75rem", color:"#1e293b", fontWeight:700, borderTop:"1px solid #f3f4f6", paddingTop:"0.4rem" }}>{o.notes}</div>}
                {/* Actions */}
                <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap", borderTop:"1px solid #f3f4f6", paddingTop:"0.5rem" }}>
                  <button onClick={() => setViewOrder(o)} className="ds-btn ds-btn-view ds-btn-sm">{t("عرض")}</button>
                  {isActive && <button onClick={() => openEdit(o)} className="ds-btn ds-btn-edit ds-btn-sm">{t("تعديل")}</button>}
                  <button onClick={() => printInvoice(o, t("الفندق"), currency, { svc: SVC_LABEL, pay: PAY_LABEL, status: STATUS_LABEL })} className="ds-btn ds-btn-print ds-btn-sm" title={t("طباعة الفاتورة")}><Printer size={14} strokeWidth={2} /></button>
                  {o.paymentMethod === "room_account" && (
                    <button onClick={navToFolio} className="ds-btn ds-btn-neutral ds-btn-sm" title={t("الفوليو")} style={{ display:"flex", alignItems:"center", gap:"0.2rem" }}><FileText size={13} strokeWidth={2} /> {t("الفوليو")}</button>
                  )}
                  {o.guestName && (
                    <button onClick={() => navToGuests(o.guestName!)} className="ds-btn ds-btn-neutral ds-btn-sm" title={t("ملف النزيل")} style={{ display:"flex", alignItems:"center", gap:"0.2rem" }}><UserCheck size={13} strokeWidth={2} /></button>
                  )}
                  {o.status === "new"       && <button onClick={() => setStatus(o.id,"preparing")} className="ds-btn ds-btn-warning ds-btn-sm">{t("بدء التحضير")}</button>}
                  {o.status === "preparing" && <button onClick={() => setStatus(o.id,"ready")}     className="ds-btn ds-btn-primary ds-btn-sm">{t("جاهز")}</button>}
                  {(o.status === "new" || o.status === "preparing" || o.status === "ready") && (
                    <button onClick={() => setStatus(o.id,"delivered",{deliveredAt:now(),deliveredBy:username})} className="ds-btn ds-btn-success ds-btn-sm">{t("تسليم")}</button>
                  )}
                  {isActive && <button onClick={() => { setCancelModal({id:o.id}); setCancelReason(""); }} className="ds-btn ds-btn-danger ds-btn-sm">{t("إلغاء")}</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>}

      {/* ── Menu items section ─────────────────────────────────────────────── */}
      {section === "menu" && (
        <div>
          {menuItems.length === 0 ? (
            <div className="ds-card-p" style={{ textAlign:"center", padding:"3rem 1.5rem" }}>
              <BookOpen size={40} strokeWidth={1.2} style={{ color:"#d1d5db", marginBottom:"0.75rem" }} />
              <p style={{ fontWeight:600, color:"#374151", marginBottom:"0.25rem" }}>{t("لا توجد أصناف في المنيو")}</p>
              <p style={{ fontSize:"0.82rem", color:"#9ca3af" }}>{t("أضف الأصناف التي تريد تقديمها وستظهر في نموذج الطلب للاختيار السريع.")}</p>
            </div>
          ) : (
            <div className="ds-cards-grid" style={{ gap:"1rem" }}>
              {menuItems.map(item => (
                <div key={item.id} className="ds-card-p" style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:"0.95rem", color:"#111827" }}>{item.name}</p>
                      <p style={{ margin:0, fontSize:"0.75rem", color:"#6b7280" }}>{item.category}</p>
                    </div>
                    <span style={{ padding:"0.15rem 0.5rem", borderRadius:"1rem", fontSize:"0.65rem", fontWeight:700, background: item.available ? "#f0fdf4" : "#f9fafb", color: item.available ? "#15803d" : "#6b7280", flexShrink:0 }}>
                      {item.available ? t("متاح") : t("غير متاح")}
                    </span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:"1.1rem", color:"#4f46e5" }}>
                    {item.price.toFixed(2)} {currency}
                  </div>
                  {item.notes && <p style={{ margin:0, fontSize:"0.75rem", color:"#9ca3af" }}>{item.notes}</p>}
                  <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap", borderTop:"1px solid #f3f4f6", paddingTop:"0.5rem", marginTop:"auto" }}>
                    <button onClick={() => openMenuForm(item)} className="ds-btn ds-btn-neutral ds-btn-sm" style={{ display:"flex", alignItems:"center", gap:"0.25rem" }}><Pencil size={12} /> {t("تعديل")}</button>
                    <button onClick={() => toggleMenuAvailable(item)} className="ds-btn ds-btn-neutral ds-btn-sm">
                      {item.available ? t("إخفاء") : t("إتاحة")}
                    </button>
                    <button onClick={() => deleteMenuItem(item.id)} className="ds-btn ds-btn-danger ds-btn-sm" style={{ display:"flex", alignItems:"center", gap:"0.25rem" }}><Trash2 size={12} /> {t("حذف")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           ADD / EDIT MODAL
         ════════════════════════════════════════════════════════════════════ */}
      {showAdd && (
        <div className="ds-modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="ds-modal-card" style={{ maxWidth:"680px", maxHeight:"90vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2>{editId ? t("تعديل طلب") : t("إضافة طلب")}</h2>
              <button className="icon-btn" onClick={() => setShowAdd(false)}><X size={16} strokeWidth={2.5} /></button>
            </div>
            <div className="ds-modal-body">
              {/* Section 1: source */}
              <p style={{ fontSize:"0.8rem", fontWeight:700, color:"#6b7280", marginBottom:"0.5rem" }}>{t("مصدر الطلب")}</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"0.75rem" }}>
                <div className="field" style={{ margin:0 }}>
                  <label className="field-label">{t("نوع الخدمة")}</label>
                  <select className="select" value={form.serviceType} onChange={e => setForm(p => ({ ...p, serviceType: e.target.value as TService }))}>
                    {availableServices.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="field" style={{ margin:0 }}>
                  <label className="field-label">{t("مصدر الطلب")}</label>
                  <select className="select" value={form.sourceType} onChange={e => setForm(p => ({ ...p, sourceType: e.target.value as TSource }))}>
                    <option value="room">{t("غرفة")}</option>
                    <option value="table">{t("طاولة")}</option>
                    <option value="direct">{t("خارجي / مباشر")}</option>
                    <option value="room_service">{t("خدمة غرف")}</option>
                  </select>
                </div>
              </div>
              {/* Conditional fields */}
              {(form.sourceType === "room" || form.sourceType === "room_service") && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"0.75rem" }}>
                  <div className="field" style={{ margin:0 }}>
                    <label className="field-label">{t("الغرفة")}</label>
                    <select className="select" value={form.roomId} onChange={e => onRoomSelect(e.target.value)}>
                      <option value="">{t("اختر الغرفة...")}</option>
                      {rooms.map(r => {
                        const res = roomResMap.get(r.id);
                        return <option key={r.id} value={String(r.id)}>{t("غرفة")} {r.number}{res ? ` - ${res.guest_first_name} ${res.guest_last_name}` : ""}</option>;
                      })}
                    </select>
                  </div>
                  <div className="field" style={{ margin:0 }}>
                    <label className="field-label">{t("اسم النزيل")}</label>
                    <input className="input" value={form.guestName} onChange={e => setForm(p => ({ ...p, guestName: e.target.value }))} placeholder={t("يملأ تلقائيًا")} />
                  </div>
                </div>
              )}
              {form.sourceType === "table" && (
                <div style={{ marginBottom:"0.75rem" }}>
                  <div className="field" style={{ margin:0, maxWidth:"220px" }}>
                    <label className="field-label">{t("رقم الطاولة")}</label>
                    <input className="input" value={form.tableNumber} onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))} placeholder={t("مثال: 5")} />
                  </div>
                </div>
              )}
              {form.sourceType === "direct" && (
                <div style={{ marginBottom:"0.75rem" }}>
                  <div className="field" style={{ margin:0, maxWidth:"320px" }}>
                    <label className="field-label">{t("اسم الزبون")}</label>
                    <input className="input" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder={t("اسم الزبون")} />
                  </div>
                </div>
              )}

              {/* Section 2: items */}
              <p style={{ fontSize:"0.8rem", fontWeight:700, color:"#6b7280", marginBottom:"0.5rem", marginTop:"0.25rem" }}>{t("الأصناف")}</p>
              {menuItems.filter(m => m.available).length > 0 && (
                <div style={{ marginBottom:"0.6rem", padding:"0.5rem 0.75rem", background:"#f0fdf4", borderRadius:"0.5rem", border:"1px solid #bbf7d0" }}>
                  <p style={{ margin:"0 0 0.35rem", fontSize:"0.72rem", fontWeight:700, color:"#15803d" }}>{t("إضافة سريعة من المنيو")}</p>
                  <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap" }}>
                    {menuItems.filter(m => m.available).map(m => (
                      <button key={m.id} onClick={() => addFromMenu(m)} className="ds-btn ds-btn-neutral ds-btn-sm" style={{ fontSize:"0.72rem", padding:"0.2rem 0.55rem" }}>
                        {m.name} <span style={{ color:"#6b7280" }}>({m.price})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom:"0.75rem" }}>
                {form.items.map((it, idx) => (
                  <div key={idx} style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr auto", gap:"0.5rem", alignItems:"center", marginBottom:"0.4rem" }}>
                    <input className="input" value={it.name} onChange={e => setItem(idx,{name:e.target.value})} placeholder={t("اسم الصنف")} />
                    <input className="input" type="number" min="1" value={it.qty} onChange={e => setItem(idx,{qty:Math.max(1,parseInt(e.target.value)||1)})} placeholder={t("كمية")} />
                    <input className="input" type="number" min="0" step="0.01" value={it.price} onChange={e => setItem(idx,{price:parseFloat(e.target.value)||0})} placeholder={t("سعر")} />
                    <button onClick={() => dropItem(idx)} style={{ background:"none", border:"none", color:"#dc2626", cursor:"pointer", padding:"0 0.25rem", display:"flex", alignItems:"center" }} disabled={form.items.length===1}><X size={15} strokeWidth={2.5} /></button>
                  </div>
                ))}
                <button onClick={addItem} className="ds-btn ds-btn-neutral ds-btn-sm" style={{ marginTop:"0.25rem" }}>+ {t("إضافة صنف")}</button>
                <div style={{ textAlign:"left", fontWeight:700, fontSize:"0.95rem", color:"#111827", marginTop:"0.5rem" }}>
                  {t("الإجمالي")}: {formTotal.toFixed(2)} {currency}
                </div>
              </div>

              {/* Section 3: payment + notes */}
              <p style={{ fontSize:"0.8rem", fontWeight:700, color:"#6b7280", marginBottom:"0.5rem" }}>{t("الدفع والملاحظات")}</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"0.75rem" }}>
                <div className="field" style={{ margin:0 }}>
                  <label className="field-label">{t("طريقة الدفع")}</label>
                  <select className="select" value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value as TPayment }))}>
                    <option value="cash">{t("نقدي")}</option>
                    <option value="electronic">{t("إلكتروني")}</option>
                    <option value="room_account" disabled={form.sourceType === "direct" || form.sourceType === "table"}>
                      {t("على حساب الغرفة")}{(form.sourceType==="direct"||form.sourceType==="table") ? ` (${t("غير متاح")})` : ""}
                    </option>
                  </select>
                </div>
              </div>
              <div className="field" style={{ margin:0 }}>
                <label className="field-label">{t("ملاحظات")}</label>
                <textarea className="textarea" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t("أي تعليمات خاصة...")} />
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setShowAdd(false)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={saveOrder}>{t("حفظ الطلب")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           VIEW MODAL
         ════════════════════════════════════════════════════════════════════ */}
      {viewOrder && (
        <div className="ds-modal-backdrop" onClick={() => setViewOrder(null)}>
          <div className="ds-modal-card" style={{ maxWidth:"600px", maxHeight:"90vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2>{t("تفاصيل الطلب")}</h2>
              <button className="icon-btn" onClick={() => setViewOrder(null)}><X size={16} strokeWidth={2.5} /></button>
            </div>
            <div className="ds-modal-body">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem", marginBottom:"1rem" }}>
                {[
                  [t("رقم الطلب"), viewOrder.orderNo],
                  [t("الحالة"),    t(STATUS_LABEL[viewOrder.status])],
                  [t("طريقة الدفع"), t(PAY_LABEL[viewOrder.paymentMethod])],
                  [t("نوع الخدمة"),  t(SVC_LABEL[viewOrder.serviceType])],
                  [t("مصدر الطلب"),  t(SRC_LABEL[viewOrder.sourceType])],
                  [t("النزيل / الزبون"), getDisplayName(viewOrder, t)],
                  [t("الموقع"),      getLocation(viewOrder, t)],
                  [t("رقم الحجز"),  viewOrder.reservationNo || "—"],
                  [t("وقت الإنشاء"), fmtDateTime(viewOrder.createdAt)],
                  [t("الموظف"),     viewOrder.createdBy],
                  ...(viewOrder.deliveredAt ? [[t("وقت التسليم"), fmtDateTime(viewOrder.deliveredAt)], [t("من سلّم"), viewOrder.deliveredBy ?? "—"]] : []),
                  ...(viewOrder.cancelReason ? [[t("سبب الإلغاء"), viewOrder.cancelReason]] : []),
                ].map(([k,v]) => (
                  <div key={k} style={{ background:"#f9fafb", borderRadius:"0.4rem", padding:"0.5rem 0.75rem" }}>
                    <p style={{ margin:0, fontSize:"0.68rem", color:"#9ca3af" }}>{k}</p>
                    <p style={{ margin:0, fontWeight:600, fontSize:"0.85rem", color:"#374151" }}>{v}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:"0.8rem", fontWeight:700, color:"#6b7280", marginBottom:"0.4rem" }}>{t("الأصناف")}</p>
              <div className="ds-table-wrap" style={{ marginBottom:"0.75rem" }}>
                <table className="ds-table">
                  <thead><tr><th>{t("الصنف")}</th><th>{t("الكمية")}</th><th>{t("السعر")}</th><th>{t("الإجمالي")}</th></tr></thead>
                  <tbody>
                    {viewOrder.items.map((it,idx)=>(
                      <tr key={idx}>
                        <td>{it.name}</td><td>{it.qty}</td>
                        <td>{it.price} {viewOrder.currency}</td>
                        <td style={{fontWeight:600}}>{(it.qty*it.price).toFixed(2)} {viewOrder.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign:"left", fontWeight:700, fontSize:"1rem" }}>
                {t("الإجمالي")}: {viewOrder.amount.toFixed(2)} {viewOrder.currency}
              </div>
              {viewOrder.notes && <p style={{ marginTop:"0.75rem", fontSize:"0.82rem", color:"#6b7280" }}>{t("ملاحظات")}: {viewOrder.notes}</p>}
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setViewOrder(null)}>{t("إغلاق")}</button>
              {viewOrder.paymentMethod === "room_account" && (
                <button className="ds-btn ds-btn-neutral" onClick={navToFolio} style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}><FileText size={14} strokeWidth={2} /> {t("الفوليو")}</button>
              )}
              {viewOrder.guestName && (
                <button className="ds-btn ds-btn-neutral" onClick={() => navToGuests(viewOrder.guestName!)} style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}><UserCheck size={14} strokeWidth={2} /> {t("ملف النزيل")}</button>
              )}
              <button className="ds-btn ds-btn-print" onClick={() => { printInvoice(viewOrder, t("الفندق"), currency, { svc: SVC_LABEL, pay: PAY_LABEL, status: STATUS_LABEL }); }}><Printer size={15} strokeWidth={2} /> {t("طباعة الفاتورة")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           CANCEL MODAL
         ════════════════════════════════════════════════════════════════════ */}
      {cancelModal && (
        <div className="ds-modal-backdrop" onClick={() => setCancelModal(null)}>
          <div className="ds-modal-card" style={{ maxWidth:"420px" }} onClick={e => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2>{t("إلغاء الطلب")}</h2>
              <button className="icon-btn" onClick={() => setCancelModal(null)}><X size={16} strokeWidth={2.5} /></button>
            </div>
            <div className="ds-modal-body">
              <div className="field">
                <label className="field-label">{t("سبب الإلغاء (اختياري)")}</label>
                <textarea className="textarea" rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder={t("سبب إلغاء الطلب...")} />
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setCancelModal(null)}>{t("رجوع")}</button>
              <button className="ds-btn ds-btn-danger" onClick={confirmCancel}>{t("تأكيد الإلغاء")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           MENU ITEM FORM MODAL
         ════════════════════════════════════════════════════════════════════ */}
      {showMenuForm && (
        <div className="ds-modal-backdrop" onClick={() => { setShowMenuForm(false); setEditMenuId(null); setMenuForm(blankMenuForm()); }}>
          <div className="ds-modal-card" style={{ maxWidth:"480px" }} onClick={e => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2>{editMenuId ? t("تعديل صنف") : t("إضافة صنف جديد")}</h2>
              <button className="icon-btn" onClick={() => { setShowMenuForm(false); setEditMenuId(null); setMenuForm(blankMenuForm()); }}><X size={16} strokeWidth={2.5} /></button>
            </div>
            <div className="ds-modal-body">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"0.75rem" }}>
                <div className="field" style={{ margin:0, gridColumn:"span 2" }}>
                  <label className="field-label">{t("اسم الصنف *")}</label>
                  <input className="input" value={menuForm.name} onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))} placeholder={t("مثال: برجر دجاج")} />
                </div>
                <div className="field" style={{ margin:0 }}>
                  <label className="field-label">{t("الفئة")}</label>
                  <select className="select" value={menuForm.category} onChange={e => setMenuForm(p => ({ ...p, category: e.target.value }))}>
                    {MENU_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field" style={{ margin:0 }}>
                  <label className="field-label">{t("السعر")} ({currency})</label>
                  <input className="input" type="number" min="0" step="0.01" value={menuForm.price} onChange={e => setMenuForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="field" style={{ margin:0, marginBottom:"0.75rem" }}>
                <label className="field-label">{t("ملاحظات (اختياري)")}</label>
                <textarea className="textarea" rows={2} value={menuForm.notes} onChange={e => setMenuForm(p => ({ ...p, notes: e.target.value }))} placeholder={t("وصف الصنف أو تعليمات خاصة...")} />
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer", userSelect:"none" }}>
                <input type="checkbox" checked={menuForm.available} onChange={e => setMenuForm(p => ({ ...p, available: e.target.checked }))} />
                <span style={{ fontSize:"0.875rem", fontWeight:500 }}>{t("متاح للطلب الآن")}</span>
              </label>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => { setShowMenuForm(false); setEditMenuId(null); setMenuForm(blankMenuForm()); }}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={saveMenuItem}>{editMenuId ? t("حفظ التعديلات") : t("إضافة الصنف")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
