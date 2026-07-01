"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound, DoorOpen } from "lucide-react";
import { apiUrl, getAuthHeaders as apiHeaders } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

interface Room {
  id: number;
  status: string;
  room_number: string;
  room_type?: string;
}

export default function ReceptionDashboard() {
  const { t } = useLang();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("ar-u-nu-latn", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const load = async () => {
      const hotelId = localStorage.getItem("hotel_id");
      if (!hotelId) { setLoading(false); return; }
      const r = await fetch(apiUrl(`/rooms/?hotel_id=${hotelId}`), { headers: apiHeaders() });
      const data = await r.json().catch(() => []);
      setRooms(Array.isArray(data) ? data : (data.results ?? []));
    };
    load().catch(() => setRooms([])).finally(() => setLoading(false));
  }, []);

  const { available, occupied, maintenance, cleaning, reserved, totalRooms } = useMemo(() => ({
    available:   rooms.filter((r) => r.status === "available").length,
    occupied:    rooms.filter((r) => r.status === "occupied").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
    cleaning:    rooms.filter((r) => r.status === "cleaning").length,
    reserved:    rooms.filter((r) => r.status === "reserved").length,
    totalRooms:  rooms.length,
  }), [rooms]);

  return (
    <div className="ds-page">
      <div className="page-header">
        <div>
          <h1>{t("لوحة الاستقبال")}</h1>
          <p>{today}</p>
        </div>
        <div className="page-actions">
          <Link href="/reception/reservations" className="ds-btn ds-btn-neutral ds-btn-sm">
            {t("الحجوزات")}
          </Link>
          <Link href="/reception/payments" className="ds-btn ds-btn-primary ds-btn-sm">
            {t("المدفوعات")}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="ds-card-p">
          <p className="text-muted">{t("جارٍ تحميل البيانات...")}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="ds-summary-grid">
            <div className="ds-summary-card">
              <p className="ds-summary-label">{t("غرف متاحة")}</p>
              <p className="ds-summary-value text-success">{available}</p>
              <p className="ds-summary-note">{t("من أصل")} {totalRooms} {t("غرفة")}</p>
            </div>
            <div className="ds-summary-card">
              <p className="ds-summary-label">{t("غرف مشغولة")}</p>
              <p className="ds-summary-value text-warning">{occupied}</p>
              <p className="ds-summary-note">{t("نسبة الإشغال")}</p>
            </div>
            <div className="ds-summary-card">
              <p className="ds-summary-label">{t("وصول اليوم")}</p>
              <p className="ds-summary-value text-primary">—</p>
              <p className="ds-summary-note">{t("قريباً")}</p>
            </div>
            <div className="ds-summary-card">
              <p className="ds-summary-label">{t("مغادرة اليوم")}</p>
              <p className="ds-summary-value text-danger">—</p>
              <p className="ds-summary-note">{t("قريباً")}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="ds-summary-grid">
            <Link href="/reception/check-in-out" style={{ textDecoration: "none" }}>
              <div className="ds-card-p" style={{ textAlign: "center", cursor: "pointer" }}>
                <KeyRound size={32} style={{ color: "var(--color-success)", marginBottom: "0.5rem" }} />
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-heading)" }}>
                  {t("تسجيل وصول سريع")}
                </p>
                <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  {t("استقبال ضيف جديد")}
                </p>
              </div>
            </Link>
            <Link href="/reception/check-in-out" style={{ textDecoration: "none" }}>
              <div className="ds-card-p" style={{ textAlign: "center", cursor: "pointer" }}>
                <DoorOpen size={32} style={{ color: "var(--color-warning)", marginBottom: "0.5rem" }} />
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-heading)" }}>
                  {t("تسجيل مغادرة سريع")}
                </p>
                <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  {t("إنهاء إقامة ضيف")}
                </p>
              </div>
            </Link>
          </div>

          {/* Room Status Section */}
          <div className="ds-card-p">
            <h2 style={{ marginBottom: "1rem", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-heading)" }}>{t("حالة الغرف")}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <div className="ds-summary-card">
                <p className="ds-summary-label">{t("متاحة")}</p>
                <p className="ds-summary-value text-success">{available}</p>
              </div>
              <div className="ds-summary-card">
                <p className="ds-summary-label">{t("مشغولة")}</p>
                <p className="ds-summary-value text-warning">{occupied}</p>
              </div>
              {reserved > 0 && (
                <div className="ds-summary-card">
                  <p className="ds-summary-label">{t("محجوزة")}</p>
                  <p className="ds-summary-value text-primary">{reserved}</p>
                </div>
              )}
              {maintenance > 0 && (
                <div className="ds-summary-card">
                  <p className="ds-summary-label">{t("صيانة")}</p>
                  <p className="ds-summary-value text-danger">{maintenance}</p>
                </div>
              )}
              {cleaning > 0 && (
                <div className="ds-summary-card">
                  <p className="ds-summary-label">{t("تنظيف")}</p>
                  <p className="ds-summary-value text-accent">{cleaning}</p>
                </div>
              )}
              <div className="ds-summary-card">
                <p className="ds-summary-label">{t("الإجمالي")}</p>
                <p className="ds-summary-value">{totalRooms}</p>
              </div>
            </div>

            {totalRooms === 0 && (
              <p className="text-muted" style={{ textAlign: "center", marginTop: "1rem" }}>
                {t("لا توجد غرف مسجلة")}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div className="ds-card-p">
            <h2 style={{ marginBottom: "1rem", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-heading)" }}>{t("روابط سريعة")}</h2>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/reception/reservations" className="ds-btn ds-btn-neutral">
                {t("الحجوزات")}
              </Link>
              <Link href="/reception/payments" className="ds-btn ds-btn-primary">
                {t("المدفوعات")}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
