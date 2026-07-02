"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Moon, Calendar, TrendingUp, Building2, Users, Banknote,
  CreditCard, CheckCircle2, Clock, FileText, Printer,
  RefreshCw, AlertTriangle,
} from "lucide-react";
import { getHotelCurrency } from "../../../lib/hotel";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";
import { escapeHtml as esc } from "@/lib/print";

/* ─── LocalStorage Keys ────────────────────────────────────────────────────── */
const FOOD_KEY  = (h: string) => `fandqi.foodOrders.${h}`;
const FOLIO_KEY = (h: string) => `fandqi.folio.${h}`;
const AUDIT_KEY = (h: string) => `fandqi.nightaudit.${h}`;

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface Reservation {
  id: number;
  booking_number: string;
  guest_first_name: string;
  guest_last_name: string;
  room: number | null;
  room_number: string | null;
  check_in_date: string;
  check_out_date: string;
  total: string | number;
  paid: string | number;
  currency: string;
  status: string;
  payment_method?: string;
}

interface RoomItem {
  id: number;
  number: string;
  status: string;
}

interface FoodOrderItem { name: string; quantity?: number; price?: number; }

interface FoodOrder {
  id: number;
  payment_method: string;
  status: string;
  amount: number;
  items?: FoodOrderItem[] | string;
  created_at: string;
  room_number?: string | null;
  guest_name?: string | null;
}

interface FolioCharge {
  reservationId: number | string;
  type: string;
  amount: number;
  desc: string;
  date: string;
}

interface AuditEntry {
  date: string;
  occupancy: number;
  occupancyPct: number;
  revenue: number;
  roomRevenue: number;
  foodRevenue: number;
  folioRevenue: number;
  cashTotal: number;
  electronicTotal: number;
  roomAccountTotal: number;
  activeCount: number;
  arrivalsCount: number;
  departuresCount: number;
  closedAt: string;
  closedBy: string;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function todayIso(): string { return new Date().toISOString().split("T")[0]; }
function n(v: string | number | undefined | null): number { return Number(v) || 0; }

function fmtMoney(v: number, cur: string): string {
  return `${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${cur}`;
}

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString("ar-SA"); } catch { return d || "—"; }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-SA", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function guestName(r: Reservation): string {
  return `${r.guest_first_name ?? ""} ${r.guest_last_name ?? ""}`.trim() || "نزيل";
}


/* ══════════════════════════════════════════════════════════════════════════════ */
export default function NightAuditPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const hotelId  = typeof window !== "undefined" ? (localStorage.getItem("hotel_id") ?? "") : "";
  const username = typeof window !== "undefined" ? (localStorage.getItem("username") ?? "مدير") : "مدير";

  const today = todayIso();

  /* ── State ── */
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms,        setRooms]        = useState<RoomItem[]>([]);
  const [foodOrders,   setFoodOrders]   = useState<FoodOrder[]>([]);
  const [folioCharges, setFolioCharges] = useState<FolioCharge[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [currency,     setCurrency]     = useState("USD");
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);

  /* ── Cross-page navigation ── */
  function navToReservations(day: "arrivals" | "departures") {
    localStorage.setItem(`fandqi.nav.reservations.${hotelId}`, JSON.stringify({day, ts: Date.now()}));
    router.push("/manager/reservations");
  }

  /* ── Toast helper ── */
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  /* ── Load data ── */
  const loadData = useCallback(() => {
    if (!hotelId) { setLoading(false); return; }

    setLoading(true);

    // Currency from settings
    try {
      setCurrency(getHotelCurrency(hotelId));
    } catch {}

    // LocalStorage data
    try {
      const raw = localStorage.getItem(FOOD_KEY(hotelId));
      if (raw) setFoodOrders(JSON.parse(raw));
    } catch {}

    try {
      const raw = localStorage.getItem(FOLIO_KEY(hotelId));
      if (raw) setFolioCharges(JSON.parse(raw));
    } catch {}

    try {
      const raw = localStorage.getItem(AUDIT_KEY(hotelId));
      if (raw) {
        const arr: AuditEntry[] = JSON.parse(raw);
        setAuditHistory([...arr].sort((a, b) => b.date.localeCompare(a.date)));
      }
    } catch {}

    // API: reservations + rooms
    Promise.all([
      fetch(`${API}/reservations/?hotel=${hotelId}`, { headers: apiH() })
        .then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/rooms/?hotel=${hotelId}`, { headers: apiH() })
        .then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([rd, rmd]) => {
      const resArr: Reservation[] = Array.isArray(rd) ? rd : (rd?.results ?? []);
      const roomArr: RoomItem[]   = Array.isArray(rmd) ? rmd : (rmd?.results ?? []);
      setReservations(resArr);
      setRooms(roomArr.filter(r => r.status !== "archived"));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hotelId]);

  useEffect(() => { const exec = async () => { await loadData(); }; exec(); }, [loadData]);

  /* ════════════════════════════════════════════════
     COMPUTED VALUES
  ════════════════════════════════════════════════ */

  /* Active (checked-in) reservations */
  const activeRes = useMemo(
    () => reservations.filter(r => r.status === "checked_in"),
    [reservations]
  );

  /* Today's arrivals: check_in_date === today AND status confirmed or checked_in */
  const arrivalsToday = useMemo(
    () => reservations.filter(r =>
      r.check_in_date === today &&
      ["confirmed", "checked_in"].includes(r.status)
    ),
    [reservations, today]
  );

  /* Today's departures: check_out_date === today AND status checked_in or checked_out */
  const departuresToday = useMemo(
    () => reservations.filter(r =>
      r.check_out_date === today &&
      ["checked_in", "checked_out"].includes(r.status)
    ),
    [reservations, today]
  );

  /* Occupancy */
  const totalRooms   = rooms.length;
  const occupiedCount = activeRes.length;
  const occupancyPct = totalRooms > 0 ? Math.round(occupiedCount / totalRooms * 100) : 0;

  /* Room revenue: sum of total amounts for active reservations */
  const roomRevenue = useMemo(
    () => activeRes.reduce((s, r) => s + n(r.total), 0),
    [activeRes]
  );

  /* Food revenue: today's food orders */
  const todayFoodOrders = useMemo(
    () => foodOrders.filter(o => (o.created_at ?? "").slice(0, 10) === today),
    [foodOrders, today]
  );
  const foodRevenue = useMemo(
    () => todayFoodOrders.reduce((s, o) => s + n(o.amount), 0),
    [todayFoodOrders]
  );

  /* Folio revenue: today's folio charges */
  const todayFolios = useMemo(
    () => folioCharges.filter(f => (f.date ?? "").slice(0, 10) === today),
    [folioCharges, today]
  );
  const folioRevenue = useMemo(
    () => todayFolios.reduce((s, f) => s + n(f.amount), 0),
    [todayFolios]
  );

  const totalRevenue = roomRevenue + foodRevenue + folioRevenue;

  /* Payment method breakdowns for today's reservations */
  const todayResForPayments = useMemo(
    () => reservations.filter(r =>
      (r.check_in_date === today || r.check_out_date === today) &&
      r.status !== "cancelled"
    ),
    [reservations, today]
  );

  const resCash = useMemo(
    () => todayResForPayments
      .filter(r => r.payment_method === "cash")
      .reduce((s, r) => s + n(r.paid), 0),
    [todayResForPayments]
  );
  const resElectronic = useMemo(
    () => todayResForPayments
      .filter(r => r.payment_method === "electronic")
      .reduce((s, r) => s + n(r.paid), 0),
    [todayResForPayments]
  );
  const resRoomAccount = useMemo(
    () => todayResForPayments
      .filter(r => r.payment_method === "room_account")
      .reduce((s, r) => s + n(r.paid), 0),
    [todayResForPayments]
  );

  const foodCash = useMemo(
    () => todayFoodOrders.filter(o => o.payment_method === "cash").reduce((s, o) => s + n(o.amount), 0),
    [todayFoodOrders]
  );
  const foodElectronic = useMemo(
    () => todayFoodOrders.filter(o => o.payment_method === "electronic").reduce((s, o) => s + n(o.amount), 0),
    [todayFoodOrders]
  );
  const foodRoomAccount = useMemo(
    () => todayFoodOrders.filter(o => o.payment_method === "room_account").reduce((s, o) => s + n(o.amount), 0),
    [todayFoodOrders]
  );

  const totalCash        = resCash + foodCash;
  const totalElectronic  = resElectronic + foodElectronic;
  const totalRoomAccount = resRoomAccount + foodRoomAccount;
  const grandPaymentTotal = totalCash + totalElectronic + totalRoomAccount;

  /* ════════════════════════════════════════════════
     CLOSE DAY (Save Audit)
  ════════════════════════════════════════════════ */
  async function closeDay(force = false) {
    if (!hotelId) { showToast(t("لم يتم تحديد هوية الفندق."), "error"); return; }

    // م7: إغلاق فعلي — الخادم يمنع الإغلاق عند وجود أخطاء (409) ما لم يُجبِره المدير
    try {
      const r = await fetch(`${API}/day-close/`, { method: "POST", headers: apiHJ(),
        body: JSON.stringify({ date: today, force }) });
      if (r.status === 409) {
        const d = await r.json().catch(() => ({}));
        const codes: Record<string, string> = {
          arrivals_pending: t("وصول اليوم لم يُسجَّل دخوله"),
          departures_pending: t("مغادرة اليوم لم تُسجَّل خروجها"),
          unpaid_folios: t("فواتير غير مدفوعة"),
        };
        const lines = (d.blocking ?? []).map((b: { code: string; count?: number; amount?: number }) =>
          `• ${codes[b.code] ?? b.code}${b.count != null ? ` (${b.count})` : ""}${b.amount ? ` — ${b.amount}` : ""}`).join("\n");
        if (confirm(`${t("لا يمكن إغلاق اليوم قبل معالجة:")}\n${lines}\n\n${t("هل تريد الإغلاق القسري رغم ذلك؟")}`)) {
          return closeDay(true);
        }
        return;
      }
      if (!r.ok) { showToast(t("تعذّر إغلاق اليوم على الخادم."), "error"); return; }
    } catch { showToast(t("خطأ في الاتصال بالخادم."), "error"); return; }

    const entry: AuditEntry = {
      date: today,
      occupancy: occupiedCount,
      occupancyPct,
      revenue: totalRevenue,
      roomRevenue,
      foodRevenue,
      folioRevenue,
      cashTotal: totalCash,
      electronicTotal: totalElectronic,
      roomAccountTotal: totalRoomAccount,
      activeCount: activeRes.length,
      arrivalsCount: arrivalsToday.length,
      departuresCount: departuresToday.length,
      closedAt: new Date().toISOString(),
      closedBy: username,
    };

    // Overwrite same-day entry if exists
    const existing = auditHistory.filter(a => a.date !== today);
    const next = [entry, ...existing].sort((a, b) => b.date.localeCompare(a.date));

    localStorage.setItem(AUDIT_KEY(hotelId), JSON.stringify(next));
    setAuditHistory(next);
    showToast(t("تم إغلاق اليوم وحفظ التقرير بنجاح."));
  }

  /* ════════════════════════════════════════════════
     PRINT
  ════════════════════════════════════════════════ */
  function printReport() {
    const hotelName = typeof window !== "undefined"
      ? (() => {
          try {
            const s = JSON.parse(localStorage.getItem(`fandqi.settings.${hotelId}`) ?? "{}");
            return s?.identity?.name ?? "الفندق";
          } catch { return "الفندق"; }
        })()
      : "الفندق";

    const now = new Date().toLocaleString("ar-SA");

    const arrivalRows = arrivalsToday.map(r =>
      `<tr><td>${esc(guestName(r))}</td><td>${esc(String(r.room_number ?? "—"))}</td><td>${fmtDate(r.check_in_date)}</td><td>${fmtDate(r.check_out_date)}</td></tr>`
    ).join("");

    const departureRows = departuresToday.map(r =>
      `<tr><td>${esc(guestName(r))}</td><td>${esc(String(r.room_number ?? "—"))}</td><td>${fmtDate(r.check_in_date)}</td><td>${fmtDate(r.check_out_date)}</td></tr>`
    ).join("");

    const activeRows = activeRes.map(r => {
      const rem = Math.max(0, n(r.total) - n(r.paid));
      return `<tr>
        <td>${esc(guestName(r))}</td>
        <td>${esc(String(r.room_number ?? "—"))}</td>
        <td>${fmtDate(r.check_in_date)}</td>
        <td>${fmtDate(r.check_out_date)}</td>
        <td>${n(r.total).toLocaleString("en-US")} ${currency}</td>
        <td>${n(r.paid).toLocaleString("en-US")} ${currency}</td>
        <td style="color:${rem > 0 ? "#dc2626" : "#15803d"};font-weight:700">${rem > 0 ? rem.toLocaleString("en-US") + " " + currency : "مسدد"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير التدقيق الليلي — ${today}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:28px;color:#1e293b;direction:rtl;font-size:13px}
    .hdr{border-bottom:3px solid #1e293b;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start}
    .hotel-name{font-size:22px;font-weight:900;color:#1e293b;margin-bottom:3px}
    .sub{font-size:12px;color:#64748b}
    .title{font-size:17px;font-weight:800;color:#1d4ed8;margin-bottom:3px}
    .section-title{font-size:14px;font-weight:800;color:#1e293b;border-right:4px solid #1d4ed8;padding-right:8px;margin:18px 0 10px}
    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
    .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px}
    .kpi-label{font-size:11px;color:#64748b;margin-bottom:3px}
    .kpi-value{font-size:16px;font-weight:900;color:#1e293b}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
    th{padding:7px 10px;text-align:right;background:#f1f5f9;border-bottom:2px solid #e2e8f0;font-weight:800;color:#475569}
    td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#1e293b}
    tr:nth-child(even) td{background:#f8fafc}
    .pay-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
    .pay-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;text-align:center}
    .pay-label{font-size:11px;color:#64748b;margin-bottom:4px}
    .pay-value{font-size:15px;font-weight:900;color:#1e293b}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .col-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
    .col-box h4{font-size:12px;font-weight:800;color:#1e293b;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    .list-item{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:11px}
    .foot{text-align:center;font-size:11px;color:#94a3b8;border-top:2px solid #e2e8f0;margin-top:20px;padding-top:12px}
    .badge-green{background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
    @media print{body{padding:14px}}
  </style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="hotel-name">${esc(hotelName)}</div>
    <div class="title">تقرير التدقيق الليلي</div>
    <div class="sub">تاريخ التقرير: ${fmtDate(today)} | وقت الطباعة: ${now}</div>
  </div>
  <div style="text-align:left;color:#64748b;font-size:12px">
    <div>أُعدّ بواسطة: ${esc(username)}</div>
    <div>التاريخ: ${today}</div>
  </div>
</div>

<div class="section-title">ملخص إشغال اليوم</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">الغرف المشغولة</div><div class="kpi-value">${occupiedCount} / ${totalRooms}</div></div>
  <div class="kpi"><div class="kpi-label">نسبة الإشغال</div><div class="kpi-value">${occupancyPct}%</div></div>
  <div class="kpi"><div class="kpi-label">وصول اليوم</div><div class="kpi-value">${arrivalsToday.length}</div></div>
  <div class="kpi"><div class="kpi-label">مغادرة اليوم</div><div class="kpi-value">${departuresToday.length}</div></div>
  <div class="kpi"><div class="kpi-label">إيراد الغرف</div><div class="kpi-value">${roomRevenue.toLocaleString("en-US")} ${currency}</div></div>
  <div class="kpi"><div class="kpi-label">إجمالي الإيراد</div><div class="kpi-value">${totalRevenue.toLocaleString("en-US")} ${currency}</div></div>
</div>

<div class="section-title">ملخص المدفوعات</div>
<div class="pay-grid">
  <div class="pay-box"><div class="pay-label">نقدي</div><div class="pay-value">${totalCash.toLocaleString("en-US")} ${currency}</div></div>
  <div class="pay-box"><div class="pay-label">إلكتروني</div><div class="pay-value">${totalElectronic.toLocaleString("en-US")} ${currency}</div></div>
  <div class="pay-box"><div class="pay-label">على حساب الغرفة</div><div class="pay-value">${totalRoomAccount.toLocaleString("en-US")} ${currency}</div></div>
  <div class="pay-box" style="border:2px solid #1d4ed8"><div class="pay-label" style="color:#1d4ed8;font-weight:700">الإجمالي</div><div class="pay-value" style="color:#1d4ed8">${grandPaymentTotal.toLocaleString("en-US")} ${currency}</div></div>
</div>

${activeRes.length > 0 ? `
<div class="section-title">الحجوزات النشطة (${activeRes.length})</div>
<table>
  <thead><tr><th>النزيل</th><th>الغرفة</th><th>الدخول</th><th>المغادرة</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
  <tbody>${activeRows}</tbody>
</table>` : ""}

<div class="two-col">
  <div class="col-box">
    <h4>وصول اليوم (${arrivalsToday.length})</h4>
    ${arrivalsToday.length === 0 ? `<p style="font-size:11px;color:#94a3b8">لا يوجد وصول اليوم.</p>` : `
    <table style="margin:0">
      <thead><tr><th>النزيل</th><th>الغرفة</th><th>الدخول</th><th>الخروج</th></tr></thead>
      <tbody>${arrivalRows}</tbody>
    </table>`}
  </div>
  <div class="col-box">
    <h4>مغادرة اليوم (${departuresToday.length})</h4>
    ${departuresToday.length === 0 ? `<p style="font-size:11px;color:#94a3b8">لا توجد مغادرات اليوم.</p>` : `
    <table style="margin:0">
      <thead><tr><th>النزيل</th><th>الغرفة</th><th>الدخول</th><th>الخروج</th></tr></thead>
      <tbody>${departureRows}</tbody>
    </table>`}
  </div>
</div>

<div class="foot">
  <div>هذا تقرير سري مخصص للإدارة فقط</div>
  <div style="margin-top:4px">نظام فندقي — ${esc(hotelName)} — ${now}</div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=950");
    if (w) { w.document.write(html); w.document.close(); }
  }

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  const todayAudit = auditHistory.find(a => a.date === today);

  return (
    <div className="ds-page" dir="rtl">

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          background: toast.type === "success" ? "#15803d" : "#dc2626",
          color: "#fff", padding: "0.75rem 1.6rem", borderRadius: 12,
          fontWeight: 700, fontSize: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          zIndex: 9999, display: "flex", alignItems: "center", gap: 8,
        }}>
          {toast.type === "success"
            ? <CheckCircle2 size={16} strokeWidth={2.5} />
            : <AlertTriangle size={16} strokeWidth={2.5} />}
          {toast.msg}
        </div>
      )}

      {/* ══ HEADER ════════════════════════════════════════════════ */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.35rem" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11,
                background: "linear-gradient(135deg,#1e293b,#0f172a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(15,23,42,0.3)",
              }}>
                <Moon size={20} color="#e2e8f0" strokeWidth={2} />
              </div>
              <div>
                <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "var(--color-heading)", lineHeight: 1.2 }}>
                  {t("التدقيق الليلي")}
                </h1>
                <p style={{ fontSize: 12, color: "var(--color-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={11} strokeWidth={2} />
                  {new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-muted)", paddingRight: "0.25rem" }}>
              {t("مراجعة يومية شاملة للإشغال والإيرادات والحجوزات قبل نهاية اليوم.")}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={loadData}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#4f46e5", color: "#fff", border: "none",
                borderRadius: 9, padding: "0.5rem 0.9rem", fontSize: 13, fontWeight: 700,
                cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
              }}>
              <RefreshCw size={14} strokeWidth={2.5} />
              {t("تحديث البيانات")}
            </button>
            <button
              onClick={printReport}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#2563eb", color: "#fff", border: "none",
                borderRadius: 9, padding: "0.5rem 0.9rem", fontSize: 13, fontWeight: 700,
                cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
              }}>
              <Printer size={14} strokeWidth={2.5} />
              {t("طباعة تقرير الليلة")}
            </button>
            <button
              onClick={() => closeDay()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#16a34a", color: "#fff", border: "none",
                borderRadius: 9, padding: "0.5rem 1rem", fontSize: 13, fontWeight: 700,
                cursor: "pointer", boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
              }}>
              <CheckCircle2 size={14} strokeWidth={2.5} />
              {t("إغلاق اليوم وحفظ التقرير")}
            </button>
          </div>
        </div>

        {/* Closed-day badge */}
        {todayAudit && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: "0.75rem",
            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
            padding: "0.4rem 0.9rem", fontSize: 12, fontWeight: 700, color: "#15803d",
          }}>
            <CheckCircle2 size={13} strokeWidth={2.5} />
            {lang === "ar" ? `تم إغلاق هذا اليوم في ${fmtDateTime(todayAudit.closedAt)} بواسطة ${todayAudit.closedBy}` : `Day closed at ${fmtDateTime(todayAudit.closedAt)} by ${todayAudit.closedBy}`}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-muted)" }}>
          <Clock size={36} strokeWidth={1.2} style={{ color: "#d1d5db", marginBottom: 10 }} />
          <p style={{ fontWeight: 700, fontSize: 14 }}>{t("جاري تحميل بيانات التدقيق...")}</p>
        </div>
      ) : (
        <>

          {/* ══ SECTION A: TODAY'S SUMMARY (KPI CARDS) ════════════ */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontWeight: 800, fontSize: 13, color: "var(--color-heading)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={15} strokeWidth={2.5} color="#4f46e5" />
              {t("ملخص اليوم")} — {new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
              {([
                { label:t("الغرف المشغولة"), value:String(occupiedCount),            sub:lang === "ar" ? `من أصل ${totalRooms} غرفة` : `of ${totalRooms} rooms`,                                         Icon:Building2  as LucideIcon, grad:"linear-gradient(135deg,#2563eb,#1d4ed8)", onClick:()=>router.push("/manager/rooms") },
                { label:t("نسبة الإشغال"),  value:`${occupancyPct}%`,               sub:lang === "ar" ? `${occupiedCount} غرفة نشطة` : `${occupiedCount} active rooms`,                                          Icon:TrendingUp as LucideIcon, grad:"linear-gradient(135deg,#06b6d4,#0891b2)", onClick:()=>router.push("/manager/rooms") },
                { label:t("وصول اليوم"),    value:String(arrivalsToday.length),     sub:t("مؤكد أو داخل الفندق"),                                                 Icon:Users      as LucideIcon, grad:"linear-gradient(135deg,#22c55e,#16a34a)", onClick:()=>navToReservations("arrivals") },
                { label:t("مغادرة اليوم"), value:String(departuresToday.length),    sub:t("مسجل خروجه أو مستحق"),                                                  Icon:Clock      as LucideIcon, grad:"linear-gradient(135deg,#f59e0b,#d97706)", onClick:()=>navToReservations("departures") },
                { label:t("إيراد الغرف"),  value:fmtMoney(roomRevenue,currency),    sub:t("إجمالي قيمة الإقامات"),                                                Icon:Banknote   as LucideIcon, grad:"linear-gradient(135deg,#8b5cf6,#7c3aed)", onClick:()=>router.push("/manager/payments") },
                { label:t("إجمالي الإيراد"),value:fmtMoney(totalRevenue,currency),  sub:lang === "ar" ? `غرف + طعام (${fmtMoney(foodRevenue,currency)}) + إضافات` : `Rooms + Food (${fmtMoney(foodRevenue,currency)}) + Extras`,              Icon:TrendingUp as LucideIcon, grad:"linear-gradient(135deg,#1e293b,#0f172a)", onClick:()=>router.push("/manager/reports") },
              ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;onClick:()=>void}[]).map(card => (
                <div key={card.label} className="ds-kpi-card" onClick={card.onClick}
                  style={{ background:card.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff", boxShadow:"0 2px 10px rgba(0,0,0,0.15)", cursor:"pointer", transition:"transform .15s,box-shadow .15s" }}
                  onMouseEnter={e=>(e.currentTarget.style.transform="translateY(-2px)")}
                  onMouseLeave={e=>(e.currentTarget.style.transform="")}>
                  <div className="ds-kpi-icon">
                    <card.Icon size={26} strokeWidth={1.6} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, opacity: 0.88, marginBottom: 4 }}>{card.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2, marginBottom: 3, wordBreak: "break-word" }}>{card.value}</p>
                  <p style={{ fontSize: 10, opacity: 0.72 }}>{card.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ══ SECTION B: PAYMENTS BREAKDOWN ══════════════════════ */}
          <div className="ds-card-p" style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontWeight: 800, fontSize: 13, color: "var(--color-heading)", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
              <CreditCard size={15} strokeWidth={2.5} color="#2563eb" />
              {t("المدفوعات")} — {t("تفصيل طرق الدفع")}
            </p>
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>{t("المصدر")}</th>
                    <th style={{ color: "#16a34a" }}>{t("نقدي")}</th>
                    <th style={{ color: "#1d4ed8" }}>{t("إلكتروني")}</th>
                    <th style={{ color: "#854d0e" }}>{t("على حساب الغرفة")}</th>
                    <th>{t("الإجمالي")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{t("الحجوزات")}</td>
                    <td style={{ fontWeight: 700, color: "#16a34a" }}>{fmtMoney(resCash, currency)}</td>
                    <td style={{ fontWeight: 700, color: "#1d4ed8" }}>{fmtMoney(resElectronic, currency)}</td>
                    <td style={{ fontWeight: 700, color: "#854d0e" }}>{fmtMoney(resRoomAccount, currency)}</td>
                    <td style={{ fontWeight: 900 }}>{fmtMoney(resCash + resElectronic + resRoomAccount, currency)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{t("الطعام والخدمات")}</td>
                    <td style={{ fontWeight: 700, color: "#16a34a" }}>{fmtMoney(foodCash, currency)}</td>
                    <td style={{ fontWeight: 700, color: "#1d4ed8" }}>{fmtMoney(foodElectronic, currency)}</td>
                    <td style={{ fontWeight: 700, color: "#854d0e" }}>{fmtMoney(foodRoomAccount, currency)}</td>
                    <td style={{ fontWeight: 900 }}>{fmtMoney(foodCash + foodElectronic + foodRoomAccount, currency)}</td>
                  </tr>
                  <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                    <td style={{ fontWeight: 900, color: "var(--color-heading)" }}>{t("الإجمالي")}</td>
                    <td style={{ fontWeight: 900, color: "#15803d", fontSize: 14 }}>{fmtMoney(totalCash, currency)}</td>
                    <td style={{ fontWeight: 900, color: "#1e40af", fontSize: 14 }}>{fmtMoney(totalElectronic, currency)}</td>
                    <td style={{ fontWeight: 900, color: "#92400e", fontSize: 14 }}>{fmtMoney(totalRoomAccount, currency)}</td>
                    <td style={{ fontWeight: 900, fontSize: 15, color: "#4f46e5" }}>{fmtMoney(grandPaymentTotal, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Visual bar */}
            {grandPaymentTotal > 0 && (
              <div style={{ marginTop: "0.85rem" }}>
                <div style={{ display: "flex", height: 14, borderRadius: 20, overflow: "hidden", gap: 2 }}>
                  {totalCash > 0 && (
                    <div style={{ flex: totalCash, background: "#16a34a", minWidth: 30,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: "#fff" }}>
                      {Math.round(totalCash / grandPaymentTotal * 100)}%
                    </div>
                  )}
                  {totalElectronic > 0 && (
                    <div style={{ flex: totalElectronic, background: "#2563eb", minWidth: 30,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: "#fff" }}>
                      {Math.round(totalElectronic / grandPaymentTotal * 100)}%
                    </div>
                  )}
                  {totalRoomAccount > 0 && (
                    <div style={{ flex: totalRoomAccount, background: "#f59e0b", minWidth: 30,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: "#fff" }}>
                      {Math.round(totalRoomAccount / grandPaymentTotal * 100)}%
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", fontSize: 11, fontWeight: 700, flexWrap: "wrap" }}>
                  <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#16a34a", display: "inline-block" }} />
                    {t("نقدي")}
                  </span>
                  <span style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#2563eb", display: "inline-block" }} />
                    {t("إلكتروني")}
                  </span>
                  <span style={{ color: "#d97706", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b", display: "inline-block" }} />
                    {t("على حساب الغرفة")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ══ SECTION C: ACTIVE RESERVATIONS ════════════════════ */}
          <div className="ds-card-p" style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
              <p style={{ fontWeight: 800, fontSize: 13, color: "var(--color-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                <Users size={15} strokeWidth={2.5} color="#7c3aed" />
                {t("الحجوزات النشطة")}
              </p>
              <span style={{
                background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
                borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700,
              }}>
                {lang === "ar" ? `${activeRes.length} نزيل` : `${activeRes.length} guests`}
              </span>
            </div>

            {activeRes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--color-muted)" }}>
                <Building2 size={38} strokeWidth={1.1} style={{ color: "#d1d5db", marginBottom: 10 }} />
                <p style={{ fontWeight: 700 }}>{t("لا يوجد نزلاء داخل الفندق حاليًا.")}</p>
              </div>
            ) : (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>{t("النزيل")}</th>
                      <th>{t("الغرفة")}</th>
                      <th>{t("الدخول")}</th>
                      <th>{t("المغادرة")}</th>
                      <th>{t("المبلغ")}</th>
                      <th>{t("المدفوع")}</th>
                      <th>{t("المتبقي")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRes.map(r => {
                      const remaining = Math.max(0, n(r.total) - n(r.paid));
                      return (
                        <tr key={r.id}>
                          <td>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{guestName(r)}</span>
                            <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{r.booking_number}</div>
                          </td>
                          <td>
                            {r.room_number
                              ? <span style={{ fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: 6, fontSize: 12 }}>
                                  {r.room_number}
                                </span>
                              : <span style={{ color: "var(--color-muted)" }}>—</span>}
                          </td>
                          <td style={{ fontSize: 12 }}>{fmtDate(r.check_in_date)}</td>
                          <td style={{ fontSize: 12 }}>{fmtDate(r.check_out_date)}</td>
                          <td style={{ fontWeight: 700 }}>{fmtMoney(n(r.total), currency)}</td>
                          <td style={{ fontWeight: 700, color: "#15803d" }}>{fmtMoney(n(r.paid), currency)}</td>
                          <td>
                            {remaining > 0
                              ? <span style={{ fontWeight: 900, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                                  <AlertTriangle size={12} strokeWidth={2.5} />
                                  {fmtMoney(remaining, currency)}
                                </span>
                              : <span style={{ fontWeight: 700, color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                                  <CheckCircle2 size={12} strokeWidth={2.5} />
                                  {t("مسدد")}
                                </span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ══ SECTION D: ARRIVALS & DEPARTURES ═════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>

            {/* Arrivals */}
            <div className="ds-card-p">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                <p style={{ fontWeight: 800, fontSize: 13, color: "var(--color-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={14} strokeWidth={2.5} color="#16a34a" />
                  {t("وصول اليوم")}
                </p>
                <span style={{
                  background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                  borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                }}>
                  {arrivalsToday.length}
                </span>
              </div>

              {arrivalsToday.length === 0 ? (
                <p style={{ color: "var(--color-muted)", fontSize: 12, textAlign: "center", padding: "1rem 0" }}>
                  {t("لا يوجد وصول اليوم.")}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {arrivalsToday.map(r => (
                    <div key={r.id} style={{
                      background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
                      padding: "0.6rem 0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{guestName(r)}</p>
                        <p style={{ fontSize: 11, color: "#15803d", fontWeight: 700 }}>
                          {lang === "ar" ? `غرفة ${r.room_number ?? "—"}` : `Room ${r.room_number ?? "—"}`} · {fmtDate(r.check_out_date)}
                        </p>
                      </div>
                      <span style={{
                        background: r.status === "checked_in" ? "#16a34a" : "#0891b2",
                        color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                      }}>
                        {r.status === "checked_in" ? t("دخل") : t("مؤكد")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Departures */}
            <div className="ds-card-p">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                <p style={{ fontWeight: 800, fontSize: 13, color: "var(--color-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} strokeWidth={2.5} color="#d97706" />
                  {t("مغادرة اليوم")}
                </p>
                <span style={{
                  background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a",
                  borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                }}>
                  {departuresToday.length}
                </span>
              </div>

              {departuresToday.length === 0 ? (
                <p style={{ color: "var(--color-muted)", fontSize: 12, textAlign: "center", padding: "1rem 0" }}>
                  {t("لا توجد مغادرات اليوم.")}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {departuresToday.map(r => {
                    const rem = Math.max(0, n(r.total) - n(r.paid));
                    return (
                      <div key={r.id} style={{
                        background: rem > 0 ? "#fef2f2" : "#fffbeb",
                        border: `1px solid ${rem > 0 ? "#fecaca" : "#fde68a"}`,
                        borderRadius: 8, padding: "0.6rem 0.75rem",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{guestName(r)}</p>
                          <p style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>
                            {lang === "ar" ? `غرفة ${r.room_number ?? "—"}` : `Room ${r.room_number ?? "—"}`} · {fmtDate(r.check_in_date)}
                          </p>
                          {rem > 0 && (
                            <p style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                              <AlertTriangle size={10} strokeWidth={2.5} />
                              {lang === "ar" ? `متبقي: ${fmtMoney(rem, currency)}` : `Remaining: ${fmtMoney(rem, currency)}`}
                            </p>
                          )}
                        </div>
                        <span style={{
                          background: r.status === "checked_out" ? "#64748b" : "#f59e0b",
                          color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                        }}>
                          {r.status === "checked_out" ? t("غادر") : t("مستحق")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══ AUDIT HISTORY ═══════════════════════════════════════ */}
          <div className="ds-card-p">
            <p style={{ fontWeight: 800, fontSize: 13, color: "var(--color-heading)", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={15} strokeWidth={2.5} color="#475569" />
              {t("سجل التدقيق الليلي السابق")}
            </p>

            {auditHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-muted)" }}>
                <Moon size={36} strokeWidth={1.1} style={{ color: "#d1d5db", marginBottom: 10 }} />
                <p style={{ fontWeight: 700 }}>{t("لم يُغلق أي يوم بعد.")}</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>{t("سيظهر هنا سجل الأيام المغلقة بعد استخدام زر \"إغلاق اليوم\".")}</p>
              </div>
            ) : (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>{t("التاريخ")}</th>
                      <th>{t("الإشغال")}</th>
                      <th>{t("نسبة الإشغال")}</th>
                      <th>{t("إيراد الغرف")}</th>
                      <th>{t("الإيراد الكلي")}</th>
                      <th>{t("نقدي")}</th>
                      <th>{t("إلكتروني")}</th>
                      <th>{t("الوصول")}</th>
                      <th>{t("المغادرة")}</th>
                      <th>{t("وقت الإغلاق")}</th>
                      <th>{t("حالة الإغلاق")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditHistory.map(a => (
                      <tr key={a.date}>
                        <td style={{ fontWeight: 800, color: "var(--color-heading)" }}>
                          {fmtDate(a.date)}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {lang === "ar" ? `${a.occupancy} غرفة` : `${a.occupancy} rooms`}
                        </td>
                        <td>
                          <span style={{
                            background: a.occupancyPct >= 80 ? "#dcfce7" : a.occupancyPct >= 50 ? "#fef9c3" : "#f1f5f9",
                            color:      a.occupancyPct >= 80 ? "#15803d" : a.occupancyPct >= 50 ? "#854d0e" : "#475569",
                            borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700,
                          }}>
                            {a.occupancyPct}%
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{fmtMoney(a.roomRevenue ?? 0, currency)}</td>
                        <td style={{ fontWeight: 900, color: "#4f46e5" }}>{fmtMoney(a.revenue, currency)}</td>
                        <td style={{ color: "#15803d", fontWeight: 700 }}>{fmtMoney(a.cashTotal, currency)}</td>
                        <td style={{ color: "#1d4ed8", fontWeight: 700 }}>{fmtMoney(a.electronicTotal, currency)}</td>
                        <td style={{ textAlign: "center" }}>{a.arrivalsCount}</td>
                        <td style={{ textAlign: "center" }}>{a.departuresCount}</td>
                        <td style={{ fontSize: 11, color: "var(--color-muted)" }}>
                          {fmtDateTime(a.closedAt)}
                          <div style={{ fontSize: 10 }}>{lang === "ar" ? `بواسطة: ${a.closedBy}` : `By: ${a.closedBy}`}</div>
                        </td>
                        <td>
                          <span style={{
                            background: "#f0fdf4", color: "#15803d",
                            border: "1px solid #bbf7d0",
                            borderRadius: 20, padding: "3px 10px",
                            fontSize: 11, fontWeight: 700,
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                            <CheckCircle2 size={11} strokeWidth={2.5} />
                            {t("مُغلق")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
}
