"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, Phone, User, Calendar, RefreshCw, CheckCircle,
  XCircle, AlertCircle, Clock, Search,
} from "lucide-react";
import { apiUrl, getAuthJsonHeaders } from "@/lib/api";

interface WebBooking {
  id: number;
  public_booking_no: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_phone: string;
  guest_email: string;
  room_type_label: string;
  check_in_date: string;
  check_out_date: string;
  nights_count: number;
  persons_count: number;
  total: string | number;
  currency: string;
  payment_method: string;
  arrival_status: string;
  status: string;
  notes: string;
  created_at: string;
}

const ARRIVAL_LABELS: Record<string, { label: string; badge: string }> = {
  awaiting_arrival:  { label: "بانتظار الوصول", badge: "ds-badge ds-badge-info" },
  arrived:           { label: "وصل",             badge: "ds-badge ds-badge-success" },
  checked_in_w:      { label: "دخل",             badge: "ds-badge ds-badge-success" },
  completed_w:       { label: "غادر",            badge: "ds-badge ds-badge-neutral" },
  cancelled_by_guest:{ label: "ملغى (ضيف)",      badge: "ds-badge ds-badge-danger" },
  cancelled_by_hotel:{ label: "ملغى (فندق)",     badge: "ds-badge ds-badge-danger" },
  no_show_w:         { label: "لم يصل",          badge: "ds-badge ds-badge-warning" },
};

const STATUS_FILTERS = [
  { key: "all",     label: "الكل" },
  { key: "active",  label: "النشطة" },
  { key: "arrived", label: "الواصلون" },
  { key: "done",    label: "المنتهية" },
  { key: "cancelled", label: "الملغاة" },
];

function formatDate(d: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("ar-SY", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

export default function WebBookingsPage() {
  const [all,     setAll]     = useState<WebBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [acting,  setActing]  = useState<number | null>(null);
  const [toast,   setToast]   = useState("");

  const hotelId = typeof window !== "undefined" ? localStorage.getItem("hotel_id") ?? "" : "";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const load = useCallback(() => {
    if (!hotelId) return;
    setLoading(true);
    fetch(apiUrl(`/reservations/?hotel=${hotelId}`), { headers: getAuthJsonHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list: WebBooking[] = Array.isArray(data) ? data : (data.results ?? []);
        setAll(list.filter((r: WebBooking) => r.public_booking_no));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [hotelId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
  useEffect(() => { load(); }, [load]);

  async function doAction(id: number, action: "web_checkin" | "web_noshow" | "hotel_cancel", reason = "") {
    setActing(id);
    const body = action === "hotel_cancel" ? JSON.stringify({ reason }) : "{}";
    try {
      const r = await fetch(apiUrl(`/reservations/${id}/${action}/`), {
        method: "POST",
        headers: getAuthJsonHeaders(),
        body,
      });
      const d = await r.json();
      if (!r.ok) { showToast(d.error ?? "فشل الإجراء"); }
      else {
        const msgs: Record<string, string> = {
          web_checkin: "تم تسجيل الدخول بنجاح",
          web_noshow:  "تم تسجيل غياب الضيف",
          hotel_cancel:"تم إلغاء الحجز",
        };
        showToast(msgs[action]);
        load();
      }
    } catch {
      showToast("حدث خطأ في الاتصال");
    }
    setActing(null);
  }

  const displayed = all
    .filter(b => {
      if (filter === "active")    return ["awaiting_arrival","arrived"].includes(b.arrival_status);
      if (filter === "arrived")   return ["arrived","checked_in_w"].includes(b.arrival_status);
      if (filter === "done")      return ["completed_w"].includes(b.arrival_status);
      if (filter === "cancelled") return ["cancelled_by_guest","cancelled_by_hotel","no_show_w"].includes(b.arrival_status);
      return true;
    })
    .filter(b => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        b.public_booking_no?.toLowerCase().includes(q) ||
        b.guest_first_name?.toLowerCase().includes(q) ||
        b.guest_last_name?.toLowerCase().includes(q) ||
        b.guest_phone?.includes(q)
      );
    });

  return (
    <div className="ds-page">
      {/* Toast */}
      {toast && (
        <div className="ds-toast-stack" style={{ bottom: "1.5rem", left: "1.5rem", right: "auto" }}>
          <div className="ds-toast ds-toast-success">{toast}</div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            <Globe size={22} strokeWidth={1.8} />
            حجوزات الموقع
          </h1>
          <p className="page-header-sub">الحجوزات الواردة من الموقع العام لفندقي</p>
        </div>
        <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={load} disabled={loading} style={{ gap: 6 }}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="ds-summary-grid" style={{ marginBottom: "1.5rem" }}>
        {[
          { label: "الكل",       count: all.length,                                                icon: <Globe size={20} />, cls: "" },
          { label: "بانتظار الوصول", count: all.filter(b => b.arrival_status === "awaiting_arrival").length, icon: <Clock size={20} />, cls: "info" },
          { label: "الواصلون",   count: all.filter(b => ["arrived","checked_in_w"].includes(b.arrival_status)).length, icon: <CheckCircle size={20} />, cls: "success" },
          { label: "الملغاة",    count: all.filter(b => ["cancelled_by_guest","cancelled_by_hotel","no_show_w"].includes(b.arrival_status)).length, icon: <XCircle size={20} />, cls: "danger" },
        ].map(s => (
          <div key={s.label} className={`ds-summary-card${s.cls ? ` ${s.cls}` : ""}`}>
            <div className="ds-summary-card-icon">{s.icon}</div>
            <div>
              <div className="ds-summary-card-num">{s.count}</div>
              <div className="ds-summary-card-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="ds-card-p" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div className="ds-tabs" style={{ flex: "none" }}>
            {STATUS_FILTERS.map(f => (
              <button key={f.key} className={`ds-tab${filter === f.key ? " active" : ""}`}
                onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginRight: "auto" }}>
            <Search size={16} style={{ color: "var(--color-muted)" }} />
            <input
              type="text"
              placeholder="بحث باسم الضيف أو رقم الحجز..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: ".45rem .85rem", border: "1.5px solid var(--color-border)", borderRadius: 8,
                fontSize: "var(--text-sm)", fontFamily: "var(--font-main)", outline: "none", minWidth: 240 }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-muted)" }}>
          جارٍ التحميل...
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <Globe size={48} style={{ color: "#c7d2fe", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--color-muted)", fontSize: "var(--text-md)" }}>لا توجد حجوزات مطابقة</p>
        </div>
      ) : (
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>رقم الحجز</th>
                <th>الضيف</th>
                <th>الغرفة</th>
                <th>الوصول</th>
                <th>المغادرة</th>
                <th>الليالي</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(b => {
                const statusInfo = ARRIVAL_LABELS[b.arrival_status] ?? { label: b.arrival_status, badge: "ds-badge ds-badge-neutral" };
                const isActing   = acting === b.id;
                const isActive   = ["awaiting_arrival","arrived"].includes(b.arrival_status);
                const isCancelled = ["cancelled_by_guest","cancelled_by_hotel","no_show_w"].includes(b.arrival_status);
                return (
                  <tr key={b.id}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)",
                        fontSize: "var(--text-xs)" }}>
                        {b.public_booking_no}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--color-heading)", fontSize: "var(--text-sm)" }}>
                        <User size={12} style={{ display: "inline", marginLeft: 4 }} />
                        {b.guest_first_name} {b.guest_last_name}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        <Phone size={11} style={{ display: "inline", marginLeft: 3 }} />{b.guest_phone}
                      </div>
                    </td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{b.room_type_label}</td>
                    <td style={{ fontSize: "var(--text-sm)" }}>
                      <Calendar size={12} style={{ display: "inline", marginLeft: 4, color: "var(--color-muted)" }} />
                      {formatDate(b.check_in_date)}
                    </td>
                    <td style={{ fontSize: "var(--text-sm)" }}>{formatDate(b.check_out_date)}</td>
                    <td style={{ textAlign: "center", fontSize: "var(--text-sm)" }}>{b.nights_count}</td>
                    <td style={{ fontWeight: 700, color: "var(--color-success)", fontSize: "var(--text-sm)" }}>
                      {parseFloat(String(b.total)).toLocaleString("ar")} {b.currency}
                    </td>
                    <td><span className={statusInfo.badge}>{statusInfo.label}</span></td>
                    <td>
                      {isActive && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="ds-btn ds-btn-success ds-btn-xs"
                            disabled={isActing}
                            onClick={() => doAction(b.id, "web_checkin")}
                            title="تسجيل دخول الضيف"
                          >
                            <CheckCircle size={13} /> دخول
                          </button>
                          <button
                            className="ds-btn ds-btn-warning ds-btn-xs"
                            disabled={isActing}
                            onClick={() => doAction(b.id, "web_noshow")}
                            title="لم يصل الضيف"
                          >
                            <AlertCircle size={13} /> لم يصل
                          </button>
                          <button
                            className="ds-btn ds-btn-danger ds-btn-xs"
                            disabled={isActing}
                            onClick={() => {
                              const reason = window.prompt("سبب الإلغاء (اختياري):") ?? "";
                              doAction(b.id, "hotel_cancel", reason);
                            }}
                            title="إلغاء الحجز"
                          >
                            <XCircle size={13} /> إلغاء
                          </button>
                        </div>
                      )}
                      {isCancelled && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)" }}>ملغى</span>
                      )}
                      {b.arrival_status === "completed_w" && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>مكتمل</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
