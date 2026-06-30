"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck, LogIn, LogOut, BedDouble, Banknote, Sparkles, Wrench,
  Bell, Users, KeyRound, Utensils, BarChart3, Calendar,
  CheckCircle2, AlertTriangle, Building2,
} from "lucide-react";
import { useLang } from "./LangContext";
import { BASE_URL as API, getAuthHeaders as apiH } from "@/lib/api";
const ORDERS_KEY   = (h: string) => `fandqi.foodOrders.${h}`;
const SETTINGS_KEY = (h: string) => `fandqi.settings.${h}`;

// ─── types ────────────────────────────────────────────────────────────────────
interface Room         { id: number; number: string; floor: number; status: string; is_archived: boolean; }
interface Reservation  { id: number; booking_number: string; guest_first_name: string; guest_last_name: string; room: number | null; check_in_date: string; check_out_date: string; status: string; total_amount: number; paid_amount: number; remaining_balance: number; }
interface Ticket       { id: number; status: string; priority: string; }
interface StaffItem    { id: number; is_active: boolean; }
interface Subscription { hotel: number; package_name: string; status: string; end_date: string; remaining_days: number | null; }
interface FoodOrder    { id: string; amount: number; paymentMethod: string; status: string; createdAt: string; }

// ─── helpers ──────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmt(n: number) { return n.toFixed(0); }
function norm<T>(raw: unknown): T[] { return Array.isArray(raw) ? raw as T[] : ((raw as { results?: T[] })?.results ?? []); }

// ─── main ─────────────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { t, lang } = useLang();

  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tickets,      setTickets]      = useState<Ticket[]>([]);
  const [staff,        setStaff]        = useState<StaffItem[]>([]);
  const [sub,          setSub]          = useState<Subscription | null>(null);
  const [foodOrders,   setFoodOrders]   = useState<FoodOrder[]>([]);
  const [currency,     setCurrency]     = useState("USD");
  const [hotelName,    setHotelName]    = useState("");
  const [hasRest,      setHasRest]      = useState(true);
  const [isManager,    setIsManager]    = useState(false);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const hotelId = localStorage.getItem("hotel_id") ?? "";
    const role    = localStorage.getItem("role") ?? "";

    const load = async () => {
      setIsManager(role === "manager");
      if (!hotelId) { setLoading(false); return; }

      // LocalStorage sources
      const foRaw = localStorage.getItem(ORDERS_KEY(hotelId));
      if (foRaw) { try { setFoodOrders(JSON.parse(foRaw)); } catch {} }
      const sRaw = localStorage.getItem(SETTINGS_KEY(hotelId));
    if (sRaw) {
      try {
        const s = JSON.parse(sRaw);
        if (s.ops?.currency)  setCurrency(s.ops.currency);
        if (s.identity?.name) setHotelName(s.identity.name);
        if (s.rest) setHasRest(!!(s.rest.hasRestaurant || s.rest.hasCafeteria || s.rest.hasRoomService));
      } catch {}
    }

    const h = apiH();
    const base: Promise<unknown>[] = [
      fetch(`${API}/rooms/?hotel=${hotelId}`,       { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/reservations/?hotel=${hotelId}`,{ headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/maintenance/?hotel=${hotelId}`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/staff/?hotel=${hotelId}`,       { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
    ];
    if (role === "manager") {
      base.push(
        fetch(`${API}/subscriptions/`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => [])
      );
    }
    Promise.all(base).then(([r0, r1, r2, r3, r4]) => {
      setRooms(norm<Room>(r0));
      setReservations(norm<Reservation>(r1));
      setTickets(norm<Ticket>(r2));
      setStaff(norm<StaffItem>(r3));
      if (r4) {
        const active = norm<Subscription>(r4)
          .find(s => String(s.hotel) === hotelId && s.status === "active");
        setSub(active ?? null);
      }
      setLoading(false);
    });
    };
    load();
  }, []);

  // ─── computed metrics ──────────────────────────────────────────────────────
  const today = todayISO();

  const activeRooms     = useMemo(() => rooms.filter(r => !r.is_archived), [rooms]);
  const totalRooms      = activeRooms.length;
  const availableRooms  = useMemo(() => activeRooms.filter(r => r.status === "available").length,    [activeRooms]);
  const occupiedRooms   = useMemo(() => activeRooms.filter(r => r.status === "occupied").length,     [activeRooms]);
  const cleaningRooms   = useMemo(() => activeRooms.filter(r => r.status === "cleaning").length,     [activeRooms]);
  const maintRooms      = useMemo(() => activeRooms.filter(r => r.status === "maintenance").length,  [activeRooms]);
  const outRooms        = useMemo(() => activeRooms.filter(r => r.status === "out_of_service").length,[activeRooms]);
  const bookedRooms     = useMemo(() => reservations.filter(r => ["pending","confirmed"].includes(r.status)).length, [reservations]);
  const occupancyRate   = totalRooms > 0 ? Math.round(occupiedRooms / totalRooms * 100) : 0;

  const activeRes       = useMemo(() => reservations.filter(r => ["confirmed","checked_in"].includes(r.status)).length, [reservations]);
  const arrivalsToday   = useMemo(() => reservations.filter(r => r.check_in_date === today && ["pending","confirmed"].includes(r.status)).length, [reservations, today]);
  const departuresToday = useMemo(() => reservations.filter(r => r.check_out_date <= today && r.status === "checked_in").length, [reservations, today]);
  const balanceDue      = useMemo(() => reservations.filter(r => ["confirmed","checked_in"].includes(r.status)).reduce((s, r) => s + (r.remaining_balance || 0), 0), [reservations]);
  const totalValue      = useMemo(() => reservations.filter(r => r.status !== "cancelled").reduce((s, r) => s + (r.total_amount || 0), 0), [reservations]);
  const totalPaid       = useMemo(() => reservations.filter(r => r.status !== "cancelled").reduce((s, r) => s + (r.paid_amount || 0), 0), [reservations]);

  const maintOpen       = useMemo(() => tickets.filter(t => ["open","in_progress"].includes(t.status)).length, [tickets]);
  const activeStaff     = useMemo(() => staff.filter(s => s.is_active !== false).length, [staff]);

  const todayFoods      = useMemo(() => foodOrders.filter(o => o.createdAt.slice(0, 10) === today), [foodOrders, today]);
  const roomAccTotal    = useMemo(() => todayFoods.filter(o => o.paymentMethod === "room_account" && o.status !== "cancelled").reduce((s, o) => s + o.amount, 0), [todayFoods]);
  const foodRevenue     = useMemo(() => todayFoods.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.amount, 0), [todayFoods]);

  const todayStr = new Date().toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // ─── alerts ───────────────────────────────────────────────────────────────
  type Tone = "warning" | "danger" | "info";
  const alerts = [
    arrivalsToday  > 0 ? { text: lang === "ar" ? `يوجد ${arrivalsToday} حجز بانتظار تسجيل الدخول.` : `${arrivalsToday} reservation(s) awaiting check-in.`,            href: "/manager/check-in-out", tone: "warning" as Tone } : null,
    departuresToday > 0 ? { text: lang === "ar" ? `يوجد ${departuresToday} حجز يحتاج استكمال المغادرة.` : `${departuresToday} reservation(s) need checkout completion.`,  href: "/manager/check-in-out", tone: "danger"  as Tone } : null,
    balanceDue     > 0 ? { text: lang === "ar" ? `يوجد متبقي مالي بقيمة ${fmt(balanceDue)} ${currency}.` : `Outstanding balance of ${fmt(balanceDue)} ${currency}.`,     href: "/manager/payments",    tone: "danger"  as Tone } : null,
    cleaningRooms  > 0 ? { text: lang === "ar" ? `يوجد ${cleaningRooms} غرفة بانتظار التنظيف.` : `${cleaningRooms} room(s) awaiting cleaning.`,                          href: "/manager/housekeeping",tone: "info"    as Tone } : null,
    maintOpen      > 0 ? { text: lang === "ar" ? `يوجد ${maintOpen} بلاغ صيانة مفتوح.` : `${maintOpen} open maintenance ticket(s).`,                                     href: "/manager/maintenance", tone: "warning" as Tone } : null,
    (hasRest && roomAccTotal > 0) ? { text: lang === "ar" ? `طلبات على حساب الغرف بقيمة ${fmt(roomAccTotal)} ${currency}.` : `Room account orders worth ${fmt(roomAccTotal)} ${currency}.`, href: "/manager/food-services", tone: "info" as Tone } : null,
  ].filter(Boolean) as { text: string; href: string; tone: Tone }[];

  const TONE_STYLE: Record<Tone, { bg: string; bar: string; color: string; }> = {
    warning: { bg: "var(--color-warning-soft)", bar: "var(--color-warning)", color: "var(--color-warning)" },
    danger:  { bg: "var(--color-danger-soft)",  bar: "var(--color-danger)",  color: "var(--color-danger)"  },
    info:    { bg: "var(--color-primary-soft)", bar: "var(--color-primary)", color: "var(--color-primary)" },
  };

  // ─── KPI cards ───────────────────────────────────────────────────────────
  const KPI = [
    { label:t("الحجوزات النشطة"),      sub:t("مؤكدة أو داخل الإقامة"),         val: activeRes,                 note: lang === "ar" ? `${reservations.length} إجمالي` : `${reservations.length} total`,                     Icon: CalendarCheck, color:"#4f46e5", bg:"#eef2ff", href:"/manager/reservations" },
    { label:t("وصول اليوم"),            sub:t("حجوزات جاهزة لتسجيل الدخول"),   val: arrivalsToday,             note: t("اضغط لعرض قائمة الوصول"),                            Icon: LogIn,         color:"#d97706", bg:"#fffbeb", href:"/manager/check-in-out" },
    { label:t("مغادرة اليوم"),          sub:t("نزلاء يجب متابعة خروجهم"),       val: departuresToday,           note: t("تحقق من السداد قبل الخروج"),                         Icon: LogOut,        color:"#dc2626", bg:"#fef2f2", href:"/manager/check-in-out" },
    { label:t("إشغال الغرف"),           sub:t("الغرف المشغولة من الإجمالي"),    val: `${occupancyRate}%`,       note: lang === "ar" ? `${occupiedRooms} / ${totalRooms} غرفة` : `${occupiedRooms} / ${totalRooms} rooms`,              Icon: BedDouble,     color:"#0369a1", bg:"#f0f9ff", href:"/manager/rooms" },
    { label:t("المتبقي المالي"),         sub:t("مبالغ يجب تحصيلها"),             val: `${fmt(balanceDue)}`,      note: currency,                                             Icon: Banknote,      color:"#dc2626", bg:"#fef2f2", href:"/manager/payments" },
    { label:t("غرف تحت التنظيف"),       sub:t("بانتظار التجهيز"),               val: cleaningRooms,             note: lang === "ar" ? `${availableRooms} غرفة متاحة` : `${availableRooms} rooms available`,                      Icon: Sparkles,      color:"#0891b2", bg:"#ecfeff", href:"/manager/housekeeping" },
    { label:t("بلاغات الصيانة"),        sub:t("مفتوحة أو قيد المعالجة"),        val: maintOpen,                 note: lang === "ar" ? `${tickets.length} إجمالي البلاغات` : `${tickets.length} total tickets`,                  Icon: Wrench,        color:"#d97706", bg:"#fffbeb", href:"/manager/maintenance" },
    ...(hasRest
      ? [{ label:t("طلبات على حساب الغرف"), sub:t("مطعم وكافتريا مرحلة على النزلاء"), val:`${fmt(roomAccTotal)}`, note: lang === "ar" ? `${currency} · ${todayFoods.length} طلب اليوم` : `${currency} · ${todayFoods.length} orders today`, Icon: Bell,   color:"#c2410c", bg:"#fff7ed", href:"/manager/food-services" }]
      : [{ label:t("الموظفون الفعّالون"), sub:t("حسابات نشطة في النظام"),       val: activeStaff,               note: lang === "ar" ? `${staff.length} إجمالي` : `${staff.length} total`,                             Icon: Users,  color:"#7c3aed", bg:"#f5f3ff", href:"/manager/staff" }]
    ),
  ] as { label:string; sub:string; val:string|number; note:string; Icon:LucideIcon; color:string; bg:string; href:string }[];

  // ─── quick actions ────────────────────────────────────────────────────────
  const quickActions = [
    { label:t("إدارة الحجوزات"),         href:"/manager/reservations",  Icon: CalendarCheck, color:"#4f46e5" },
    { label:t("تسجيل دخول / خروج"),      href:"/manager/check-in-out",  Icon: KeyRound,      color:"#0284c7" },
    { label:t("متابعة الغرف"),            href:"/manager/rooms",          Icon: BedDouble,     color:"#059669" },
    { label:t("ملفات النزلاء"),           href:"/manager/guests",         Icon: Users,         color:"#7c3aed" },
    { label:t("متابعة التنظيف"),          href:"/manager/housekeeping",   Icon: Sparkles,      color:"#0891b2" },
    { label:t("بلاغات الصيانة"),          href:"/manager/maintenance",    Icon: Wrench,        color:"#d97706" },
    ...(hasRest ? [{ label:t("طلبات المطعم والكافتريا"), href:"/manager/food-services", Icon: Utensils, color:"#c2410c" }] : []),
    { label:t("عرض التقارير"),            href:"/manager/reports",        Icon: BarChart3,     color:"#374151" },
  ] as { label:string; href:string; Icon:LucideIcon; color:string }[];

  // ─── rooms status ─────────────────────────────────────────────────────────
  const roomStatus = [
    { label:t("متاحة"),       count:availableRooms, color:"#10b981", href:"/manager/rooms" },
    { label:t("محجوزة"),      count:bookedRooms,    color:"#6366f1", href:"/manager/reservations" },
    { label:t("مشغولة"),      count:occupiedRooms,  color:"#ef4444", href:"/manager/rooms" },
    { label:t("تنظيف"),       count:cleaningRooms,  color:"#06b6d4", href:"/manager/housekeeping" },
    { label:t("صيانة"),       count:maintRooms,     color:"#f59e0b", href:"/manager/maintenance" },
    { label:t("خارج الخدمة"), count:outRooms,       color:"#1e293b", href:"/manager/rooms" },
  ];

  // subscription alert
  const subAlertColor = sub && sub.remaining_days !== null && sub.remaining_days <= 3
    ? "#dc2626" : sub && sub.remaining_days !== null && sub.remaining_days <= 10
    ? "#d97706" : "#059669";

  const L = loading;

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="ds-page" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>
            {hotelName
              ? (lang === "ar" ? `إدارة تشغيل ${hotelName}` : `Operations — ${hotelName}`)
              : t("لوحة التحكم")}
          </h1>
          <p>{t("نظرة سريعة على حالة الفندق اليوم: الحجوزات، الغرف، النزلاء، المدفوعات، والتنبيهات التشغيلية.")}</p>
        </div>
        <div className="page-actions">
          <span className="ds-date-chip">
            <Calendar size={15} strokeWidth={2} /> {t("اليوم")}: {todayStr}
          </span>
        </div>
      </div>

      {/* ── Today Strip ────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
        {[
          { label:t("وصول اليوم"),    val: L ? "…" : arrivalsToday,   color:"#d97706", bg:"#fffbeb", href:"/manager/check-in-out" },
          { label:t("مغادرة اليوم"),  val: L ? "…" : departuresToday, color:"#dc2626", bg:"#fef2f2", href:"/manager/check-in-out" },
          { label:t("غرف مشغولة"),    val: L ? "…" : occupiedRooms,   color:"#0369a1", bg:"#eff6ff", href:"/manager/rooms" },
          { label:t("متبقي مالي"),    val: L ? "…" : `${fmt(balanceDue)} ${currency}`, color:"#dc2626", bg:"#fef2f2", href:"/manager/payments" },
          { label:t("تنبيهات عاجلة"), val: L ? "…" : alerts.length,   color:"#7c3aed", bg:"#f5f3ff", href:"/manager/notifications" },
        ].map(chip => (
          <Link key={chip.label} href={chip.href} style={{
            display:"inline-flex", alignItems:"center", gap:"0.4rem",
            padding:"0.4rem 0.85rem", borderRadius:"2rem",
            background: chip.bg, border: `1px solid ${chip.color}30`,
            textDecoration:"none", transition:"box-shadow 0.12s",
          }}>
            <span style={{ fontWeight:700, color:chip.color, fontSize:"0.88rem" }}>{chip.val}</span>
            <span style={{ fontSize:"0.75rem", color:chip.color, opacity:0.8 }}>{chip.label}</span>
          </Link>
        ))}
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="ds-cards-grid" style={{ gap:"0.875rem" }}>
        {KPI.map(c => (
          <Link key={c.label} href={c.href} style={{ textDecoration:"none" }}>
            <div className="ds-card-p" style={{
              padding:"1rem 1.1rem", background:c.bg,
              borderRight:`4px solid ${c.color}`,
              cursor:"pointer", display:"flex", flexDirection:"column", gap:"0.3rem",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"0.75rem", color:c.color, fontWeight:700, opacity:0.85, display:"flex", alignItems:"center", gap:"0.3rem" }}>
                  <c.Icon size={14} strokeWidth={2} /> {c.label}
                </span>
              </div>
              <div style={{ fontSize:"1.8rem", fontWeight:800, color:c.color, lineHeight:1 }}>
                {L ? "…" : c.val}
              </div>
              <div style={{ fontSize:"0.75rem", color:"var(--color-text)", fontWeight:700 }}>{c.sub}</div>
              <div style={{ fontSize:"0.72rem", color:c.color, fontWeight:700, marginTop:"0.1rem" }}>{c.note}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div className="ds-card-p">
        <div style={{ marginBottom:"0.85rem" }}>
          <p style={{ margin:0, fontWeight:700, fontSize:"0.9rem", color:"var(--color-heading)" }}>{t("التشغيل السريع")}</p>
          <p style={{ margin:0, fontSize:"0.75rem", color:"var(--color-muted)", fontWeight:600 }}>{t("اختصارات لأهم الإجراءات اليومية")}</p>
        </div>
        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          {quickActions.map(a => (
            <Link key={a.href + a.label} href={a.href} style={{
              display:"inline-flex", alignItems:"center", gap:"0.35rem",
              padding:"0.5rem 1rem", borderRadius:"0.5rem",
              background:`${a.color}12`, border:`1px solid ${a.color}30`,
              textDecoration:"none", color:a.color, fontWeight:700, fontSize:"0.82rem",
              whiteSpace:"nowrap", transition:"background 0.12s",
            }}>
              <a.Icon size={15} strokeWidth={2} /> {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main two-column area ─────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:isManager && sub ? "1fr 280px" : "1fr", gap:"1rem" }}>

        {/* Alerts */}
        <div className="ds-card-p">
          <div style={{ marginBottom:"0.85rem" }}>
            <p style={{ margin:0, fontWeight:700, fontSize:"0.9rem", color:"var(--color-heading)" }}>{t("تنبيهات تحتاج متابعة")}</p>
          </div>
          {L ? (
            <p style={{ color:"var(--color-muted)", fontSize:"0.85rem" }}>{t("جارٍ التحميل…")}</p>
          ) : alerts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"1.5rem 1rem" }}>
              <CheckCircle2 size={32} style={{ color:"var(--color-success)", marginBottom:"0.35rem" }} />
              <p style={{ fontWeight:700, color:"var(--color-heading)", marginBottom:"0.2rem", fontSize:"0.9rem" }}>{t("لا توجد تنبيهات عاجلة")}</p>
              <p style={{ fontSize:"0.78rem", color:"var(--color-muted)" }}>{t("كل شيء تحت السيطرة حاليًا.")}</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {alerts.map((a, i) => {
                const st = TONE_STYLE[a.tone];
                return (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:st.bg, borderRight:`3px solid ${st.bar}`, borderRadius:"0.4rem", padding:"0.65rem 0.85rem" }}>
                    <p style={{ margin:0, fontSize:"0.82rem", color:st.color, fontWeight:700 }}>{a.text}</p>
                    <Link href={a.href} style={{ flexShrink:0, marginRight:"0.75rem", padding:"0.25rem 0.7rem", borderRadius:"0.3rem", background:st.bar, color:"#fff", fontSize:"0.72rem", fontWeight:700, textDecoration:"none" }}>{t("فتح")}</Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subscription card — manager only */}
        {isManager && (
          <div className="ds-card-p" style={{ alignSelf:"start" }}>
            <p style={{ margin:0, fontWeight:700, fontSize:"0.9rem", color:"var(--color-heading)", marginBottom:"0.75rem" }}>{t("حالة الاشتراك")}</p>
            {L ? (
              <p style={{ color:"var(--color-muted)", fontSize:"0.82rem" }}>{t("جارٍ التحميل…")}</p>
            ) : sub ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem" }}>
                  <span style={{ color:"var(--color-text)" }}>{t("الباقة")}</span>
                  <span style={{ fontWeight:700, color:"var(--color-heading)" }}>{sub.package_name}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem" }}>
                  <span style={{ color:"var(--color-text)" }}>{t("الانتهاء")}</span>
                  <span style={{ fontWeight:700, color:"var(--color-heading)" }}>{sub.end_date}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem", alignItems:"center" }}>
                  <span style={{ color:"var(--color-text)" }}>{t("المتبقي")}</span>
                  <span style={{ fontWeight:700, color:subAlertColor }}>
                    {sub.remaining_days !== null
                      ? (lang === "ar" ? `${sub.remaining_days} يوم` : `${sub.remaining_days} days`)
                      : "—"}
                  </span>
                </div>
                {sub.remaining_days !== null && sub.remaining_days <= 3 && (
                  <div className="ds-alert ds-alert-danger" style={{ fontSize:"0.75rem" }}>
                    <AlertTriangle size={14} /> {t("اشتراكك يقترب من الانتهاء")}
                  </div>
                )}
                <Link href="/manager/subscription" className="ds-btn ds-btn-primary" style={{ display:"block", textAlign:"center", fontSize:"0.78rem", marginTop:"0.25rem", textDecoration:"none" }}>
                  {t("إدارة الاشتراك")}
                </Link>
              </div>
            ) : (
              <div style={{ textAlign:"center" }}>
                <p style={{ fontSize:"0.78rem", color:"var(--color-muted)", marginBottom:"0.5rem" }}>{t("لا يوجد اشتراك نشط حاليًا.")}</p>
                <Link href="/manager/subscription" className="ds-btn ds-btn-primary ds-btn-sm" style={{ textDecoration:"none" }}>
                  {t("عرض الباقات")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Rooms Status ───────────────────────────────────────────────────── */}
      <div className="ds-card-p">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
          <div>
            <p style={{ margin:0, fontWeight:700, fontSize:"0.9rem", color:"var(--color-heading)" }}>{t("حالة الغرف")}</p>
            <p style={{ margin:0, fontSize:"0.72rem", color:"var(--color-muted)" }}>
              {L ? "…" : (lang === "ar" ? `${totalRooms} غرفة إجمالاً` : `${totalRooms} rooms total`)}
            </p>
          </div>
          <Link href="/manager/rooms" style={{ fontSize:"0.78rem", color:"var(--color-primary)", textDecoration:"none", fontWeight:700 }}>{t("عرض الكل")} ←</Link>
        </div>
        {totalRooms === 0 && !L ? (
          <div style={{ textAlign:"center", padding:"1.5rem" }}>
            <Building2 size={36} style={{ color:"var(--color-muted)", marginBottom:"0.35rem" }} />
            <p style={{ fontWeight:700, color:"var(--color-heading)", marginBottom:"0.2rem", fontSize:"0.9rem" }}>{t("لا توجد غرف بعد")}</p>
            <p style={{ fontSize:"0.78rem", color:"var(--color-muted)", marginBottom:"0.75rem" }}>{t("ابدأ من صفحة الغرف والطوابق لإضافة غرف الفندق.")}</p>
            <Link href="/manager/rooms" className="ds-btn ds-btn-primary ds-btn-sm" style={{ textDecoration:"none" }}>
              {t("فتح الغرف والطوابق")}
            </Link>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:"0.5rem" }}>
            {roomStatus.map(rs => {
              const pct = totalRooms > 0 ? Math.round(rs.count / totalRooms * 100) : 0;
              return (
                <Link key={rs.label} href={rs.href} style={{ textDecoration:"none" }}>
                  <div style={{ padding:"0.7rem 0.85rem", borderRadius:"0.5rem", border:"1px solid var(--color-border)", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
                      <span style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--color-text)" }}>{rs.label}</span>
                      <span style={{ fontWeight:700, color:rs.color, fontSize:"0.9rem" }}>{L ? "…" : rs.count}</span>
                    </div>
                    <div style={{ height:"4px", borderRadius:"2px", background:"var(--color-border)", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:rs.color, borderRadius:"2px", transition:"width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize:"0.65rem", color:"var(--color-muted)", marginTop:"0.25rem" }}>
                      {lang === "ar" ? `${pct}% من الإجمالي` : `${pct}% of total`}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Financial Summary ──────────────────────────────────────────────── */}
      <div className="ds-card-p">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
          <div>
            <p style={{ margin:0, fontWeight:700, fontSize:"0.9rem", color:"var(--color-heading)" }}>{t("الحركة المالية المختصرة")}</p>
            <p style={{ margin:0, fontSize:"0.72rem", color:"var(--color-muted)" }}>{t("ملخص الحجوزات والمدفوعات حسب الحالة الحالية")}</p>
          </div>
          <div className="table-actions">
            <Link href="/manager/payments" className="ds-btn ds-btn-neutral ds-btn-sm" style={{ textDecoration:"none" }}>{t("المدفوعات")}</Link>
            <Link href="/manager/reports"  className="ds-btn ds-btn-primary ds-btn-sm" style={{ textDecoration:"none" }}>{t("التقارير")}</Link>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:"0.6rem" }}>
          {[
            { label:t("قيمة الحجوزات"),       val: L ? "…" : `${fmt(totalValue)} ${currency}`,  color:"var(--color-primary)", bg:"var(--color-primary-soft)" },
            { label:t("المدفوع"),              val: L ? "…" : `${fmt(totalPaid)} ${currency}`,   color:"var(--color-success)", bg:"var(--color-success-soft)" },
            { label:t("المتبقي"),              val: L ? "…" : `${fmt(balanceDue)} ${currency}`,  color:"var(--color-danger)",  bg:"var(--color-danger-soft)"  },
            ...(hasRest ? [
              { label:t("إيراد المطعم اليوم"), val: L ? "…" : `${fmt(foodRevenue)} ${currency}`, color:"var(--color-warning)", bg:"var(--color-warning-soft)" },
              { label:t("على حساب الغرف"),    val: L ? "…" : `${fmt(roomAccTotal)} ${currency}`, color:"var(--color-warning)", bg:"var(--color-warning-soft)" },
            ] : []),
            { label:t("الموظفون الفعّالون"),   val: L ? "…" : activeStaff,                       color:"var(--color-luxury)", bg:"var(--color-luxury-soft)"  },
          ].map(item => (
            <div key={item.label} style={{ background:item.bg, borderRadius:"0.5rem", padding:"0.7rem 0.85rem" }}>
              <p style={{ margin:0, fontSize:"0.7rem", color:"var(--color-text)", marginBottom:"0.25rem" }}>{item.label}</p>
              <p style={{ margin:0, fontWeight:700, fontSize:"0.95rem", color:item.color }}>{item.val}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
