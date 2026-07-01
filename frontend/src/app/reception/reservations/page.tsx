"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl, getAuthHeaders } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

type ReservationStatus = "confirmed" | "pending" | "cancelled";

interface Reservation {
  id: string;
  guestName: string;
  room: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  amount: number;
  status: ReservationStatus;
}

type TabKey = "all" | "today" | "confirmed" | "pending" | "cancelled";

function todayStr() { return new Date().toISOString().split("T")[0]; }

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function weekEndStr() {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

function mapStatus(raw: string): ReservationStatus {
  if (raw === "confirmed" || raw === "checked_in") return "confirmed";
  if (raw === "cancelled" || raw === "no_show") return "cancelled";
  return "pending";
}

function mapReservation(r: Record<string, unknown>): Reservation {
  const guestName = r.guest_name
    ? String(r.guest_name)
    : `${r.guest_first_name ?? ""} ${r.guest_last_name ?? ""}`.trim() || "—";
  return {
    id: String(r.booking_number ?? r.id ?? ""),
    guestName,
    room: String(r.room_number ?? r.room ?? "—"),
    checkIn: String(r.check_in_date ?? ""),
    checkOut: String(r.check_out_date ?? ""),
    nights: Number(r.nights_count ?? 0),
    amount: Number(r.total ?? 0),
    status: mapStatus(String(r.status ?? "pending")),
  };
}

function countToday(list: Reservation[]): number {
  const today = todayStr();
  return list.filter((r) => r.checkIn === today || r.checkOut === today).length;
}

function countTomorrow(list: Reservation[]): number {
  const tomorrow = tomorrowStr();
  return list.filter((r) => r.checkIn === tomorrow).length;
}

function countThisWeek(list: Reservation[]): number {
  const today = todayStr();
  const weekEnd = weekEndStr();
  return list.filter((r) => r.checkIn >= today && r.checkIn <= weekEnd).length;
}

function countPending(list: Reservation[]): number {
  return list.filter((r) => r.status === "pending").length;
}

function statusBadge(status: ReservationStatus, t: (s: string) => string) {
  if (status === "confirmed") {
    return <span className="ds-badge ds-badge-success">{t("مؤكدة")}</span>;
  }
  if (status === "pending") {
    return <span className="ds-badge ds-badge-warning">{t("معلقة")}</span>;
  }
  return <span className="ds-badge ds-badge-danger">{t("ملغاة")}</span>;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function ReservationsPage() {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hotelId = localStorage.getItem("hotel_id");

    const load = async () => {
      if (!hotelId) return;
      try {
        const r = await fetch(apiUrl(`/reservations/?hotel=${hotelId}`), { headers: getAuthHeaders() });
        const data = await r.json();
        const list: Record<string, unknown>[] = Array.isArray(data) ? data : data.results ?? [];
        setReservations(list.map(mapReservation));
      } catch {
        setReservations([]);
      }
    };

    load().finally(() => setLoading(false));
  }, []);

  const today = todayStr();

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "today", label: "اليوم" },
    { key: "confirmed", label: "مؤكدة" },
    { key: "pending", label: "معلقة" },
    { key: "cancelled", label: "ملغاة" },
  ];

  const filtered = useMemo(() => reservations.filter((r) => {
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "today"
        ? r.checkIn === today || r.checkOut === today
        : r.status === activeTab;

    const matchesSearch =
      search.trim() === ""
        ? true
        : r.guestName.includes(search.trim()) ||
          r.id.toLowerCase().includes(search.trim().toLowerCase());

    const matchesFrom = dateFrom === "" ? true : r.checkIn >= dateFrom;
    const matchesTo = dateTo === "" ? true : r.checkIn <= dateTo;

    return matchesTab && matchesSearch && matchesFrom && matchesTo;
  }), [reservations, activeTab, today, search, dateFrom, dateTo]);

  return (
    <div className="ds-page">
      <div className="page-header">
        <div>
          <h1>{t("الحجوزات")}</h1>
          <p>{t("إدارة حجوزات الضيوف ومتابعة حالاتها")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-primary">{t("+ حجز جديد")}</button>
        </div>
      </div>

      <div className="ds-summary-grid">
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("اليوم")}</p>
          <p className="ds-summary-value">{loading ? "..." : countToday(reservations)}</p>
          <p className="ds-summary-note">{t("وصول ومغادرة")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("غداً")}</p>
          <p className="ds-summary-value">{loading ? "..." : countTomorrow(reservations)}</p>
          <p className="ds-summary-note">{t("حجز قادم")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("هذا الأسبوع")}</p>
          <p className="ds-summary-value">{loading ? "..." : countThisWeek(reservations)}</p>
          <p className="ds-summary-note">{t("حجز مجدول")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("معلقة")}</p>
          <p className="ds-summary-value">{loading ? "..." : countPending(reservations)}</p>
          <p className="ds-summary-note">{t("بانتظار التأكيد")}</p>
        </div>
      </div>

      <div className="ds-card-p">
        <div className="ds-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`ds-tab-btn${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        <div className="ds-filters">
          <input
            className="input"
            type="text"
            placeholder={t("بحث باسم الضيف أو رقم الحجز")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            className="input"
            type="date"
            placeholder={t("من تاريخ")}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            className="input"
            type="date"
            placeholder={t("إلى تاريخ")}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <button
            className="ds-btn ds-btn-neutral ds-btn-sm"
            onClick={() => {
              setSearch("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            {t("مسح")}
          </button>
        </div>

        {loading ? (
          <div className="ds-card-p" style={{ textAlign: "center", marginTop: "1rem" }}>
            <p className="text-muted">{t("جارٍ تحميل الحجوزات...")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ds-card-p" style={{ textAlign: "center", marginTop: "1rem" }}>
            <p className="text-muted">{t("لا توجد حجوزات")}</p>
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>{t("رقم الحجز")}</th>
                  <th>{t("الضيف")}</th>
                  <th>{t("الغرفة")}</th>
                  <th>{t("تاريخ الوصول")}</th>
                  <th>{t("تاريخ المغادرة")}</th>
                  <th>{t("الليالي")}</th>
                  <th>{t("المبلغ")}</th>
                  <th>{t("الحالة")}</th>
                  <th>{t("الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.guestName}</td>
                    <td>{r.room}</td>
                    <td>{formatDate(r.checkIn)}</td>
                    <td>{formatDate(r.checkOut)}</td>
                    <td>{r.nights}</td>
                    <td>{r.amount.toLocaleString("en-US")} {t("ر.س")}</td>
                    <td>{statusBadge(r.status, t)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button className="ds-btn ds-btn-neutral ds-btn-sm">{t("عرض")}</button>
                        {r.status === "pending" && (
                          <button className="ds-btn ds-btn-success ds-btn-sm">{t("تأكيد")}</button>
                        )}
                        {r.status !== "cancelled" && (
                          <button className="ds-btn ds-btn-danger ds-btn-sm">{t("إلغاء")}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
