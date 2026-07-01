"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bell, LogIn, LogOut, CreditCard, Sparkles, Wrench, Receipt, ClipboardList, Clock, XCircle, AlertTriangle, CheckCircle2, RefreshCw, Globe } from "lucide-react";
import { useLang } from "../LangContext";

import { BASE_URL as API, getAuthHeaders as apiH } from "@/lib/api";
const READ_KEY = "fandqi.notifications.read.v1";
const UNREAD_COUNT_KEY = "fandqi.notifications.unread.v1";

type TNotifTone = "danger" | "warning" | "accent" | "success";
type TNotifType =
  | "arrivals" | "departures" | "balance_due" | "cleaning"
  | "maintenance_open" | "room_account" | "web_bookings"
  | "pending_subs" | "ending_soon" | "expired_subs" | "suspended_hotels";
type TFilter = "all" | "unread" | "read" | "urgent";

interface Notif {
  id: string;
  type: TNotifType;
  tone: TNotifTone;
  title: string;
  note: string;
  date: string;
  count: number;
  targetUrl: string;
}

const NOTIF_ICONS: Record<TNotifType, LucideIcon> = {
  arrivals:          LogIn         as LucideIcon,
  departures:        LogOut        as LucideIcon,
  balance_due:       CreditCard    as LucideIcon,
  cleaning:          Sparkles      as LucideIcon,
  maintenance_open:  Wrench        as LucideIcon,
  room_account:      Receipt       as LucideIcon,
  web_bookings:      Globe         as LucideIcon,
  pending_subs:      ClipboardList as LucideIcon,
  ending_soon:       Clock         as LucideIcon,
  expired_subs:      XCircle       as LucideIcon,
  suspended_hotels:  AlertTriangle as LucideIcon,
};

interface Reservation {
  id: number;
  check_in_date: string;
  check_out_date: string;
  status: string;
  total: string | number;
  paid: string | number;
  public_booking?: boolean;
  public_booking_no?: string | null;
  created_at?: string;
}

interface RoomItem {
  id: number;
  number: string;
  status: string;
}

interface Ticket {
  id: number;
  status: string;
}

interface FoodOrder {
  id: number;
  payment_method: string;
  status: string;
}

interface PlatformStats {
  subscription_requests_pending: number;
  subscriptions_ending_soon: number;
  subscriptions_expired: number;
  hotels_suspended: number;
}

const TONE_STYLES: Record<TNotifTone, { bg: string; color: string; border: string }> = {
  danger:  { bg: "#fef2f2",  color: "#dc2626", border: "#fca5a5" },
  warning: { bg: "#fffbeb",  color: "#d97706", border: "#fcd34d" },
  accent:  { bg: "#eef2ff",  color: "#4f46e5", border: "#a5b4fc" },
  success: { bg: "#ecfdf5",  color: "#059669", border: "#6ee7b7" },
};

// FILTERS moved inside component (uses t())

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

function buildHotelNotifs(
  hotelId: number,
  reservations: Reservation[],
  rooms: RoomItem[],
  tickets: Ticket[],
  orders: FoodOrder[],
  today: string,
  t: (s: string) => string
): Notif[] {
  const notifs: Notif[] = [];

  const arrivals = reservations.filter(
    r => r.check_in_date === today && ["confirmed", "checked_in"].includes(r.status)
  );
  if (arrivals.length > 0) {
    notifs.push({
      id: `hotel:${hotelId}:arrivals:${today}:${arrivals.length}`,
      type: "arrivals", tone: "warning",
      title: `${arrivals.length} ${t("وصول متوقع اليوم")}`,
      note: t("تحقق من قائمة الوصول وجاهزية الغرف لاستقبال النزلاء."),
      date: today, count: arrivals.length,
      targetUrl: "/manager/check-in-out?tab=arrivals",
    });
  }

  const departures = reservations.filter(
    r => r.check_out_date === today && r.status === "checked_in"
  );
  if (departures.length > 0) {
    notifs.push({
      id: `hotel:${hotelId}:departures:${today}:${departures.length}`,
      type: "departures", tone: "warning",
      title: `${departures.length} ${t("مغادرة متوقعة اليوم")}`,
      note: t("تأكد من إتمام عمليات المغادرة واسترداد المفاتيح."),
      date: today, count: departures.length,
      targetUrl: "/manager/check-in-out?tab=departures",
    });
  }

  const balanceDue = reservations.filter(r => {
    if (!["checked_in", "confirmed"].includes(r.status)) return false;
    const total = parseFloat(String(r.total)) || 0;
    const paid  = parseFloat(String(r.paid))  || 0;
    return paid < total;
  });
  if (balanceDue.length > 0) {
    notifs.push({
      id: `hotel:${hotelId}:balance_due:${today}:${balanceDue.length}`,
      type: "balance_due", tone: "danger",
      title: `${balanceDue.length} ${t("حجز برصيد معلق")}`,
      note: t("توجد حجوزات لم يُسدَّد رصيدها بالكامل. يُرجى المراجعة."),
      date: today, count: balanceDue.length,
      targetUrl: "/manager/reservations?status=balance_due",
    });
  }

  const cleaningRooms = rooms.filter(r => r.status === "cleaning" || r.status === "dirty");
  if (cleaningRooms.length > 0) {
    notifs.push({
      id: `hotel:${hotelId}:cleaning:${today}:${cleaningRooms.length}`,
      type: "cleaning", tone: "accent",
      title: `${cleaningRooms.length} ${t("غرفة تحتاج إلى تنظيف")}`,
      note: t("يُرجى إحالة مهام التنظيف لفريق التدبير الفندقي."),
      date: today, count: cleaningRooms.length,
      targetUrl: "/manager/housekeeping?status=cleaning",
    });
  }

  const openTickets = tickets.filter(t => ["open", "in_progress"].includes(t.status));
  if (openTickets.length > 0) {
    notifs.push({
      id: `hotel:${hotelId}:maintenance_open:${today}:${openTickets.length}`,
      type: "maintenance_open", tone: "warning",
      title: `${openTickets.length} ${t("بلاغ صيانة مفتوح")}`,
      note: t("توجد بلاغات صيانة لم تُغلق بعد. تابع مع فريق الصيانة."),
      date: today, count: openTickets.length,
      targetUrl: "/manager/maintenance?status=open",
    });
  }

  const roomAccOrders = orders.filter(
    o => o.payment_method === "room_account" && o.status !== "cancelled"
  );
  if (roomAccOrders.length > 0) {
    notifs.push({
      id: `hotel:${hotelId}:room_account:${today}:${roomAccOrders.length}`,
      type: "room_account", tone: "warning",
      title: `${roomAccOrders.length} ${t("طلب مرحَّل على حساب الغرفة")}`,
      note: t("طلبات طعام مرحَّلة على الغرف، تأكد من تسويتها عند المغادرة."),
      date: today, count: roomAccOrders.length,
      targetUrl: "/manager/payments?method=room_account",
    });
  }

  // حجوزات جديدة من الموقع العام خلال آخر 24 ساعة
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const newWebBookings = reservations.filter(r => {
    if (!r.public_booking || r.status === "cancelled") return false;
    if (!r.created_at) return false;
    return new Date(r.created_at).getTime() >= cutoff;
  });
  if (newWebBookings.length > 0) {
    notifs.push({
      id: `hotel:${hotelId}:web_bookings:${today}:${newWebBookings.length}`,
      type: "web_bookings", tone: "success",
      title: `${newWebBookings.length} ${t("حجز جديد من الموقع")}`,
      note: t("تم استلام حجوزات جديدة عبر موقعك العام خلال آخر 24 ساعة."),
      date: today, count: newWebBookings.length,
      targetUrl: "/manager/web-bookings",
    });
  }

  return notifs;
}

function buildPlatformNotifs(stats: PlatformStats, today: string, t: (s: string) => string): Notif[] {
  const notifs: Notif[] = [];
  if (stats.subscription_requests_pending > 0) {
    notifs.push({
      id: `platform:pending_subs:${today}:${stats.subscription_requests_pending}`,
      type: "pending_subs", tone: "warning",
      title: `${stats.subscription_requests_pending} ${t("طلب اشتراك معلق")}`,
      note: t("توجد طلبات اشتراك جديدة تنتظر المراجعة والموافقة."),
      date: today, count: stats.subscription_requests_pending,
      targetUrl: "/platform/subscriptions?status=pending",
    });
  }
  if (stats.subscriptions_ending_soon > 0) {
    notifs.push({
      id: `platform:ending_soon:${today}:${stats.subscriptions_ending_soon}`,
      type: "ending_soon", tone: "warning",
      title: `${stats.subscriptions_ending_soon} ${t("اشتراك ينتهي قريبًا")}`,
      note: t("اشتراكات ستنتهي خلال 7 أيام. تواصل مع العملاء للتجديد."),
      date: today, count: stats.subscriptions_ending_soon,
      targetUrl: "/platform/subscriptions?status=ending_soon",
    });
  }
  if (stats.subscriptions_expired > 0) {
    notifs.push({
      id: `platform:expired_subs:${today}:${stats.subscriptions_expired}`,
      type: "expired_subs", tone: "danger",
      title: `${stats.subscriptions_expired} ${t("اشتراك منتهي الصلاحية")}`,
      note: t("فنادق لا تمتلك اشتراكًا سارياً. راجع الحالة وأرسل تذكيرات."),
      date: today, count: stats.subscriptions_expired,
      targetUrl: "/platform/subscriptions?status=expired",
    });
  }
  if (stats.hotels_suspended > 0) {
    notifs.push({
      id: `platform:suspended_hotels:${today}:${stats.hotels_suspended}`,
      type: "suspended_hotels", tone: "warning",
      title: `${stats.hotels_suspended} ${t("فندق موقوف")}`,
      note: t("فنادق موقوف نشاطها حاليًا في المنصة."),
      date: today, count: stats.hotels_suspended,
      targetUrl: "/platform/hotels?status=suspended",
    });
  }
  return notifs;
}

export default function NotificationsPage() {
  const { t, lang } = useLang();
  const FILTERS: { key: TFilter; label: string }[] = [
    { key: "all",    label: t("الكل") },
    { key: "unread", label: t("غير مقروءة") },
    { key: "read",   label: t("مقروءة") },
    { key: "urgent", label: t("عاجلة") },
  ];
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifs,  setNotifs]  = useState<Notif[]>([]);
  const [reads,   setReads]   = useState<Set<string>>(new Set());
  const [filter,  setFilter]  = useState<TFilter>("all");
  const [tick,    setTick]    = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    const today  = todayStr();
    const hid    = localStorage.getItem("hotel_id");
    const role   = localStorage.getItem("role");
    const h      = apiH();
    const hotelId = hid ? parseInt(hid, 10) : 0;
    let built: Notif[] = [];

    if (hotelId) {
      const [reservations, rooms, tickets, orders] = await Promise.all([
        fetch(`${API}/reservations/?hotel=${hotelId}`, { headers: h })
          .then(r => r.ok ? r.json() as Promise<Reservation[]> : []).catch((): Reservation[] => []),
        fetch(`${API}/rooms/?hotel=${hotelId}`, { headers: h })
          .then(r => r.ok ? r.json() as Promise<RoomItem[]> : []).catch((): RoomItem[] => []),
        fetch(`${API}/maintenance/?hotel=${hotelId}`, { headers: h })
          .then(r => r.ok ? r.json() as Promise<Ticket[]> : []).catch((): Ticket[] => []),
        fetch(`${API}/food-orders/?hotel=${hotelId}`, { headers: h })
          .then(r => r.ok ? r.json() as Promise<FoodOrder[]> : []).catch((): FoodOrder[] => []),
      ]);
      built = buildHotelNotifs(hotelId, reservations, rooms, tickets, orders, today, t);
    }

    if (role === "platform_owner") {
      const stats = await fetch(`${API}/platform/stats/`, { headers: h })
        .then(r => r.ok ? r.json() as Promise<PlatformStats> : null).catch(() => null);
      if (stats && typeof stats.subscription_requests_pending === "number") {
        built = [...built, ...buildPlatformNotifs(stats, today, t)];
      }
    }

    const ids = loadReadIds();
    const unreadCnt = built.filter(n => !ids.has(n.id)).length;
    localStorage.setItem(UNREAD_COUNT_KEY, String(unreadCnt));
    window.dispatchEvent(new Event("fandqi:notif-update"));

    setNotifs(built);
    setReads(ids);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is a version counter to trigger refresh; not directly used by the function body
  }, [tick, t]);

  useEffect(() => { const exec = async () => { await loadData(); }; exec(); }, [loadData]);

  const markAsRead = useCallback((id: string) => {
    setReads(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      setNotifs(ns => {
        const unread = ns.filter(n => !next.has(n.id)).length;
        localStorage.setItem(UNREAD_COUNT_KEY, String(unread));
        window.dispatchEvent(new Event("fandqi:notif-update"));
        return ns;
      });
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReads(prev => {
      const next = new Set(prev);
      setNotifs(ns => {
        ns.forEach(n => next.add(n.id));
        saveReadIds(next);
        localStorage.setItem(UNREAD_COUNT_KEY, "0");
        window.dispatchEvent(new Event("fandqi:notif-update"));
        return ns;
      });
      return next;
    });
  }, []);

  const openNotif = useCallback((n: Notif) => {
    markAsRead(n.id);
    router.push(n.targetUrl);
  }, [markAsRead, router]);

  const filtered = useMemo(() => {
    return notifs.filter(n => {
      const isRead = reads.has(n.id);
      if (filter === "unread") return !isRead;
      if (filter === "read")   return isRead;
      if (filter === "urgent") return !isRead && (n.tone === "danger" || n.tone === "warning");
      return true;
    });
  }, [notifs, reads, filter]);

  const unreadCount = useMemo(() => notifs.filter(n => !reads.has(n.id)).length, [notifs, reads]);
  const urgentCount = useMemo(() => notifs.filter(n => !reads.has(n.id) && (n.tone === "danger" || n.tone === "warning")).length, [notifs, reads]);

  return (
    <div className="ds-page" dir="rtl">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p style={{
            fontSize: "0.75rem", color: "var(--color-primary,#4f46e5)",
            fontWeight: 600, marginBottom: "0.2rem",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {t("مركز التنبيهات")}
          </p>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>{t("الإشعارات")}</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280", marginTop: "0.2rem" }}>
            {t("تنبيهات مولَّدة تلقائيًا من بيانات الفندق الحالية")}
          </p>
        </div>
        <div className="page-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="ds-btn ds-btn-neutral ds-btn-sm"
            onClick={() => setTick(t => t + 1)}
            disabled={loading}
          >
            {loading ? t("جاري التحديث...") : <><RefreshCw size={13}/> {t("تحديث")}</>}
          </button>
          <button
            className="ds-btn ds-btn-primary ds-btn-sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            {t("تعليم الكل كمقروء")}
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {([
          { label: t("إجمالي التنبيهات"), val: notifs.length, bg: "#f0f9ff", color: "#0369a1" },
          { label: t("غير مقروءة"),        val: unreadCount,   bg: "#fffbeb", color: "#d97706" },
          { label: t("عاجلة"),              val: urgentCount,   bg: "#fef2f2", color: "#dc2626" },
          { label: t("مقروءة"),             val: notifs.length - unreadCount, bg: "#ecfdf5", color: "#059669" },
        ] as { label: string; val: number; bg: string; color: string }[]).map(c => (
          <div key={c.label} style={{
            background: c.bg, border: `1px solid ${c.color}33`,
            borderRadius: "0.75rem", padding: "0.6rem 1.2rem",
            minWidth: "7.5rem", textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, color: c.color }}>{c.val}</p>
            <p style={{ margin: 0, fontSize: "0.71rem", color: "#6b7280", marginTop: "0.1rem" }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filter strip */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "2rem",
                border: active ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                background: active ? "#4f46e5" : "#fff",
                color: active ? "#fff" : "#374151",
                fontSize: "0.82rem",
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.4rem",
              }}
            >
              {f.label}
              {f.key === "unread" && unreadCount > 0 && (
                <span style={{
                  background: "#f59e0b", color: "#fff",
                  borderRadius: "1rem", padding: "0 0.35rem",
                  fontSize: "0.66rem", fontWeight: 700,
                }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {f.key === "urgent" && urgentCount > 0 && (
                <span style={{
                  background: "#dc2626", color: "#fff",
                  borderRadius: "1rem", padding: "0 0.35rem",
                  fontSize: "0.66rem", fontWeight: 700,
                }}>
                  {urgentCount > 9 ? "9+" : urgentCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="ds-card-p" style={{ padding: 0, overflow: "hidden" }}>
        {/* Panel header */}
        <div style={{
          padding: "1rem 1.25rem", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Bell size={18} strokeWidth={1.8} color="#4f46e5"/>
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{t("سجل تنبيهات الفندق")}</span>
            {unreadCount > 0 && (
              <span style={{
                background: "#dc2626", color: "#fff",
                borderRadius: "1rem", padding: "0.1rem 0.55rem",
                fontSize: "0.7rem", fontWeight: 700,
              }}>
                {lang === "ar" ? `${unreadCount} غير مقروء` : `${unreadCount} unread`}
              </span>
            )}
          </div>
          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{lang === "ar" ? `${filtered.length} تنبيه` : `${filtered.length} notifications`}</span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "#9ca3af" }}>
            <Clock size={36} strokeWidth={1.2} style={{marginBottom:"0.5rem"}}/>
            <p>{t("جاري تحميل التنبيهات...")}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
            <CheckCircle2 size={44} strokeWidth={1.2} style={{marginBottom:"0.75rem",color:"#059669"}}/>
            <p style={{ fontWeight: 600, fontSize: "1rem", color: "#374151", marginBottom: "0.3rem" }}>
              {filter === "all" ? t("لا توجد تنبيهات حالياً") : t("لا توجد تنبيهات في هذا الفلتر")}
            </p>
            <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
              {filter === "all"
                ? t("سيتم عرض التنبيهات تلقائيًا عند وجود بيانات تستدعي الاهتمام.")
                : t("جرب فلترًا مختلفًا أو انقر على \"الكل\" لرؤية جميع التنبيهات.")}
            </p>
          </div>
        )}

        {/* Notification cards */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((n, idx) => {
              const isRead = reads.has(n.id);
              const ts = TONE_STYLES[n.tone];
              return (
                <div
                  key={n.id}
                  style={{
                    display: "flex", gap: "1rem",
                    padding: "1rem 1.25rem",
                    borderBottom: idx < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                    background: isRead ? "#fafafa" : "#fff",
                    borderRight: `4px solid ${isRead ? "transparent" : ts.color}`,
                    transition: "background 0.15s",
                  }}
                >
                  {/* Icon */}
                  {(()=>{const NIcon = NOTIF_ICONS[n.type] ?? Bell; return (
                  <div style={{
                    width: "2.8rem", height: "2.8rem", borderRadius: "50%",
                    background: ts.bg, border: `1px solid ${ts.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, alignSelf: "flex-start", color: ts.color,
                  }}>
                    <NIcon size={20} strokeWidth={1.8}/>
                  </div>
                  );})()}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.45rem",
                      flexWrap: "wrap", marginBottom: "0.3rem",
                    }}>
                      <span style={{
                        fontWeight: isRead ? 500 : 700,
                        fontSize: "0.95rem", color: "#111827",
                      }}>
                        {n.title}
                      </span>
                      {!isRead && (
                        <span style={{
                          background: ts.color, color: "#fff",
                          borderRadius: "1rem", padding: "0.05rem 0.45rem",
                          fontSize: "0.64rem", fontWeight: 700,
                        }}>
                          {t("جديد")}
                        </span>
                      )}
                      {(n.tone === "danger" || (n.tone === "warning" && !isRead)) && (
                        <span style={{
                          background: ts.bg, color: ts.color,
                          border: `1px solid ${ts.border}`,
                          borderRadius: "1rem", padding: "0.05rem 0.45rem",
                          fontSize: "0.64rem", fontWeight: 600,
                        }}>
                          {n.tone === "danger" ? t("عاجل") : t("تنبيه")}
                        </span>
                      )}
                    </div>

                    {/* Note */}
                    <p style={{
                      margin: 0, fontSize: "0.855rem",
                      color: "#6b7280", lineHeight: 1.65, marginBottom: "0.65rem",
                    }}>
                      {n.note}
                    </p>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => openNotif(n)}
                        style={{
                          padding: "0.3rem 0.9rem", borderRadius: "0.4rem",
                          border: `1px solid ${ts.color}`,
                          background: ts.bg, color: ts.color,
                          fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {t("فتح الإشعار")} ←
                      </button>
                      {!isRead && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          style={{
                            padding: "0.3rem 0.9rem", borderRadius: "0.4rem",
                            border: "1px solid #e5e7eb",
                            background: "#fff", color: "#6b7280",
                            fontSize: "0.78rem", cursor: "pointer",
                          }}
                        >
                          {t("تعليم كمقروء")}
                        </button>
                      )}
                      <span style={{ fontSize: "0.72rem", color: "#9ca3af", marginRight: "auto" }}>
                        {fmtDate(n.date)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
