"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight, Building2, User, Phone, BadgeCheck, CalendarCheck, HandCoins,
  Printer, Download, Percent, X, CircleCheck, Ban, AlertCircle, FileBarChart, MapPin,
} from "lucide-react";
import { apiUrl, getAuthJsonHeaders } from "@/lib/api";
import { subStatus, payStatus } from "@/lib/status";
import { useLang } from "@/lib/i18n/LangContext";

type Money = Record<string, number>;

interface CommissionRow {
  id: number; public_booking_no: string; guest_name: string; guest_phone: string;
  created_at: string; check_in_date: string | null; check_out_date: string | null;
  room_type_label: string; booking_total: number; booking_currency: string;
  booking_status: string; arrival_status: string;
  commission_type: string; commission_value: number; commission_amount: number; commission_currency: string;
  commission_status: string; paid_amount: number; notes: string;
}

interface HotelEarnings {
  hotel: { id: number; name: string; city: string; governorate: string; status: string; manager_name: string; phone: string; currency: string; };
  subscription: { package_name: string | null; status: string | null; payment_status: string | null; amount: number; currency: string | null; start_date: string | null; end_date: string | null; };
  bookings_summary: {
    total: number; awaiting: number; checked_in: number; completed: number;
    cancelled_by_guest: number; cancelled_by_hotel: number; no_show: number;
    value_by_currency: Money; profit_by_currency: Money;
  };
  commission_setting: {
    hotel_id: number; has_override: boolean; commission_enabled: boolean;
    commission_type: string; commission_value: number; commission_currency: string;
    commission_notes: string; effective_from: string | null; effective_to: string | null; is_active: boolean;
    effective: { enabled: boolean; type: string; value: number; currency: string; source: string };
  };
  commissions: CommissionRow[];
}

const nf = (n: number) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

const COMMISSION_TYPE_LABEL: Record<string, string> = {
  percentage: "نسبة مئوية", fixed_per_booking: "مبلغ / حجز", fixed_per_guest: "مبلغ / زبون", "": "—",
};
const COMM_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending:   { label: "قيد الانتظار", bg: "var(--color-border)",       fg: "var(--color-muted)" },
  due:       { label: "مستحقة",       bg: "var(--color-warning-soft)", fg: "var(--color-warning)" },
  paid:      { label: "مدفوعة",       bg: "var(--color-success-soft)", fg: "var(--color-success)" },
  partial:   { label: "جزئية",        bg: "var(--color-primary-soft)", fg: "var(--color-primary)" },
  waived:    { label: "معفاة",        bg: "var(--color-border)",       fg: "var(--color-muted)" },
  cancelled: { label: "ملغاة",        bg: "var(--color-danger-soft)",  fg: "var(--color-danger)" },
};
const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار", confirmed: "مؤكد", checked_in: "تم الدخول",
  checked_out: "تم الخروج", cancelled: "ملغى", no_show: "لم يحضر",
};

function MoneyLines({ map, empty = "—" }: { map: Money; empty?: string }) {
  const entries = Object.entries(map || {}).filter(([, v]) => v != null);
  if (!entries.length) return <span style={{ color: "var(--color-muted)" }}>{empty}</span>;
  return <>{entries.map(([cur, val]) => <span key={cur} className="earn-money-line">{nf(val)} <span className="earn-money-cur">{cur}</span></span>)}</>;
}

export default function HotelEarningsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { t } = useLang();

  const [data, setData]       = useState<HotelEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [toast, setToast]     = useState("");
  const [bookingStatus, setBookingStatus]       = useState("");
  const [commissionStatus, setCommissionStatus] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [edit, setEdit]         = useState<HotelEarnings["commission_setting"] | null>(null);
  const [saving, setSaving]     = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (bookingStatus) p.set("booking_status", bookingStatus);
    if (commissionStatus) p.set("commission_status", commissionStatus);
    fetch(apiUrl(`/platform/earnings/hotels/${hotelId}/?${p}`), { headers: getAuthJsonHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: HotelEarnings) => { setData(d); setEdit(d.commission_setting); setLoading(false); })
      .catch(() => { setError(t("تعذّر تحميل تقرير الفندق")); setLoading(false); });
  }, [hotelId, bookingStatus, commissionStatus, t]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل بيانات عند الإقلاع/تغيّر الفلاتر
  useEffect(() => { load(); }, [load]);

  function commissionAction(id: number, action: string, extra: Record<string, unknown> = {}) {
    fetch(apiUrl(`/platform/commissions/${id}/action/`), {
      method: "POST", headers: getAuthJsonHeaders(), body: JSON.stringify({ action, ...extra }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => { showToast(t("تم تحديث العمولة")); load(); })
      .catch(() => showToast(t("فشل تحديث العمولة")));
  }

  function saveCommissionSetting() {
    if (!edit) return;
    setSaving(true);
    fetch(apiUrl(`/platform/hotels/${hotelId}/commission/`), {
      method: "PUT", headers: getAuthJsonHeaders(),
      body: JSON.stringify({
        commission_enabled: edit.commission_enabled, commission_type: edit.commission_type,
        commission_value: edit.commission_value, commission_currency: edit.commission_currency,
        commission_notes: edit.commission_notes, is_active: edit.is_active,
      }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => { setSaving(false); setShowEdit(false); showToast(t("تم حفظ إعداد عمولة الفندق")); load(); })
      .catch(() => { setSaving(false); showToast(t("فشل الحفظ")); });
  }

  function exportCSV() {
    if (!data) return;
    const head = [t("رقم الحجز"), t("الزبون"), t("الهاتف"), t("تاريخ الحجز"), t("الدخول"), t("الخروج"), t("الغرفة"), t("قيمة الحجز"), t("العملة"), t("حالة الحجز"), t("نوع العمولة"), t("قيمة العمولة"), t("عملة العمولة"), t("حالة العمولة")];
    const rows = data.commissions.map(c => [
      c.public_booking_no, c.guest_name, c.guest_phone, c.created_at?.slice(0, 10),
      c.check_in_date, c.check_out_date, c.room_type_label, c.booking_total, c.booking_currency,
      BOOKING_STATUS_LABEL[c.booking_status] ?? c.booking_status,
      COMMISSION_TYPE_LABEL[c.commission_type], c.commission_amount, c.commission_currency,
      COMM_STATUS[c.commission_status]?.label ?? c.commission_status,
    ]);
    const csv = "﻿" + [head, ...rows].map(r => r.map(f => `"${String(f ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `earnings-${data.hotel.name}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !data) return <div className="ds-page" dir="rtl"><div className="ds-card-p"><p className="text-muted">{t("جارٍ تحميل تقرير الفندق...")}</p></div></div>;
  if (error || !data)  return <div className="ds-page" dir="rtl"><div className="ds-card-p"><div className="ds-alert ds-alert-danger">{error || t("خطأ")}</div></div></div>;

  const h = data.hotel; const s = data.subscription; const bs = data.bookings_summary; const eff = data.commission_setting.effective;

  return (
    <div className="ds-page" dir="rtl">
      {toast && <div className="ds-toast-stack"><div className="ds-toast ds-toast-success"><span>{toast}</span></div></div>}

      {/* Print header */}
      <div className="print-only" style={{ marginBottom: "1rem", textAlign: "center" }}>
        <h2 style={{ fontWeight: 800, fontSize: 22 }}>{t("تقرير أرباح الفندق")} — {h.name}</h2>
        <p style={{ color: "#555" }}>{t("تاريخ الإنشاء")}: {new Date().toLocaleDateString("ar-SY")}</p>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}><FileBarChart size={24} /> {t("تقرير أرباح الفندق")}</h1>
          <p>{h.name}</p>
        </div>
        <div className="page-actions">
          <Link href="/platform/earnings" className="ds-btn ds-btn-neutral ds-btn-sm" style={{ gap: 6 }}>
            <ArrowRight size={15} /> {t("رجوع")}
          </Link>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={exportCSV} style={{ gap: 6 }}><Download size={15} /> {t("تصدير CSV")}</button>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => window.print()} style={{ gap: 6 }}><Printer size={15} /> {t("طباعة")}</button>
          <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={() => setShowEdit(true)} style={{ gap: 6 }}><Percent size={15} /> {t("تعديل العمولة")}</button>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Hotel info */}
        <div className="ds-card ds-card-p">
          <h3 className="earn-section-title" style={{ marginTop: 0 }}><Building2 size={18} /> {t("معلومات الفندق")}</h3>
          <InfoRow label={t("الاسم")} value={h.name} />
          <InfoRow label={t("الموقع")} value={[h.city, h.governorate].filter(Boolean).join("، ") || "—"} icon={<MapPin size={13} />} />
          <InfoRow label={t("المدير")} value={h.manager_name ? h.manager_name : <span className="ds-badge ds-badge-neutral">{t("لا يوجد مدير")}</span>} icon={<User size={13} />} />
          <InfoRow label={t("الهاتف")} value={h.phone || "—"} icon={<Phone size={13} />} />
          <InfoRow label={t("عملة الفندق")} value={h.currency} />
        </div>

        {/* Subscription summary */}
        <div className="ds-card ds-card-p">
          <h3 className="earn-section-title" style={{ marginTop: 0 }}><BadgeCheck size={18} /> {t("ملخّص الاشتراك")}</h3>
          <InfoRow label={t("الباقة الحالية")} value={s.package_name ?? "—"} />
          <InfoRow label={t("حالة الاشتراك")} value={s.status ? <span className={subStatus(s.status).badge}>{subStatus(s.status).label}</span> : "—"} />
          <InfoRow label={t("حالة الدفع")} value={s.payment_status ? <span className={payStatus(s.payment_status).badge}>{payStatus(s.payment_status).label}</span> : "—"} />
          <InfoRow label={t("قيمة الاشتراك")} value={s.amount ? `${nf(s.amount)} ${s.currency ?? ""}` : "—"} />
          <InfoRow label={t("تاريخ الانتهاء")} value={s.end_date ? new Date(s.end_date).toLocaleDateString("ar-SY") : "—"} />
        </div>

        {/* Commission config */}
        <div className="ds-card ds-card-p">
          <h3 className="earn-section-title" style={{ marginTop: 0 }}><Percent size={18} /> {t("إعداد العمولة الفعّال")}</h3>
          <InfoRow label={t("الحالة")} value={eff.enabled ? t("مفعّلة") : t("معطّلة")} />
          <InfoRow label={t("النوع")} value={COMMISSION_TYPE_LABEL[eff.type] ? t(COMMISSION_TYPE_LABEL[eff.type]) : "—"} />
          <InfoRow label={t("القيمة")} value={eff.type === "percentage" ? `${eff.value}%` : `${nf(eff.value)} ${eff.currency}`} />
          <InfoRow label={t("المصدر")} value={eff.source === "hotel" ? t("إعداد خاص بالفندق") : eff.source === "platform" ? t("الإعداد العام") : t("معطّل")} />
          {data.commission_setting.commission_notes && <InfoRow label={t("ملاحظات")} value={data.commission_setting.commission_notes} />}
        </div>
      </div>

      {/* Web bookings summary */}
      <h2 className="earn-section-title"><CalendarCheck size={18} /> {t("ملخّص حجوزات الموقع")}</h2>
      <div className="ds-card ds-card-p" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <Stat label={t("إجمالي الحجوزات")} value={bs.total} />
        <Stat label={t("بانتظار الوصول")} value={bs.awaiting} />
        <Stat label={t("تم الدخول")} value={bs.checked_in} color="text-success" />
        <Stat label={t("مكتملة")} value={bs.completed} color="text-success" />
        <Stat label={t("ملغاة (زبون)")} value={bs.cancelled_by_guest} color="text-danger" />
        <Stat label={t("ملغاة (فندق)")} value={bs.cancelled_by_hotel} color="text-danger" />
        <Stat label={t("لم يحضر")} value={bs.no_show} color="text-warning" />
        <div>
          <p className="ds-summary-label"><HandCoins size={12} style={{ display: "inline", marginLeft: 3 }} />{t("قيمة الحجوزات")}</p>
          <div style={{ fontWeight: 800, fontSize: "var(--text-lg)" }}><MoneyLines map={bs.value_by_currency} empty="0" /></div>
        </div>
        <div>
          <p className="ds-summary-label"><HandCoins size={12} style={{ display: "inline", marginLeft: 3 }} />{t("ربح المنصة")}</p>
          <div style={{ fontWeight: 800, fontSize: "var(--text-lg)" }} className="text-primary"><MoneyLines map={bs.profit_by_currency} empty="0" /></div>
        </div>
      </div>

      {/* Filters */}
      <div className="ds-filters no-print" style={{ marginBottom: "1rem" }}>
        <select className="select" value={bookingStatus} onChange={e => setBookingStatus(e.target.value)} style={{ width: 160 }}>
          <option value="">{t("كل حالات الحجز")}</option>
          {Object.entries(BOOKING_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
        </select>
        <select className="select" value={commissionStatus} onChange={e => setCommissionStatus(e.target.value)} style={{ width: 160 }}>
          <option value="">{t("كل حالات العمولة")}</option>
          {Object.entries(COMM_STATUS).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
        </select>
      </div>

      {/* Commissions table */}
      <h2 className="earn-section-title"><FileBarChart size={18} /> {t("تفاصيل الحجوزات وعمولاتها")}</h2>
      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead>
            <tr>
              <th>{t("رقم الحجز")}</th><th>{t("الزبون")}</th><th>{t("الهاتف")}</th><th>{t("الدخول")}</th><th>{t("الخروج")}</th>
              <th>{t("الغرفة")}</th><th>{t("قيمة الحجز")}</th><th>{t("حالة الحجز")}</th><th>{t("العمولة")}</th>
              <th>{t("قيمة العمولة")}</th><th>{t("حالة العمولة")}</th><th>{t("إجراءات")}</th>
            </tr>
          </thead>
          <tbody>
            {data.commissions.map(c => {
              const cs = COMM_STATUS[c.commission_status] ?? { label: c.commission_status, bg: "var(--color-border)", fg: "var(--color-muted)" };
              const actionable = !["paid", "cancelled"].includes(c.commission_status);
              return (
                <tr key={c.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)", fontSize: 12 }}>{c.public_booking_no}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{c.guest_name}</td>
                  <td style={{ fontSize: 12, color: "var(--color-muted)" }}>{c.guest_phone}</td>
                  <td style={{ fontSize: 12 }}>{c.check_in_date ? new Date(c.check_in_date).toLocaleDateString("ar-SY") : "—"}</td>
                  <td style={{ fontSize: 12 }}>{c.check_out_date ? new Date(c.check_out_date).toLocaleDateString("ar-SY") : "—"}</td>
                  <td style={{ fontSize: 12 }}>{c.room_type_label}</td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{nf(c.booking_total)} {c.booking_currency}</td>
                  <td style={{ fontSize: 12 }}>{BOOKING_STATUS_LABEL[c.booking_status] ? t(BOOKING_STATUS_LABEL[c.booking_status]) : c.booking_status}</td>
                  <td style={{ fontSize: 11 }}>{COMMISSION_TYPE_LABEL[c.commission_type] ? t(COMMISSION_TYPE_LABEL[c.commission_type]) : ""}<br /><strong>{c.commission_type === "percentage" ? `${c.commission_value}%` : `${nf(c.commission_value)}`}</strong></td>
                  <td style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: 13 }}>{nf(c.commission_amount)} {c.commission_currency}</td>
                  <td><span className="earn-mini-badge" style={{ background: cs.bg, color: cs.fg }}>{t(cs.label)}</span></td>
                  <td>
                    {actionable ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <button className="ds-btn ds-btn-success ds-btn-xs" title={t("تعليم كمدفوعة")} onClick={() => commissionAction(c.id, "mark_paid")}><CircleCheck size={12} /></button>
                        <button className="ds-btn ds-btn-warning ds-btn-xs" title={t("تعليم كمستحقة")} onClick={() => commissionAction(c.id, "mark_due")}><AlertCircle size={12} /></button>
                        <button className="ds-btn ds-btn-neutral ds-btn-xs" title={t("إعفاء")} onClick={() => commissionAction(c.id, "waive")}><Ban size={12} /></button>
                        <button className="ds-btn ds-btn-neutral ds-btn-xs" title={t("إضافة ملاحظة")} onClick={() => { const n = window.prompt(t("ملاحظة على العمولة:"), c.notes); if (n !== null) commissionAction(c.id, "note", { notes: n }); }}>+</button>
                      </div>
                    ) : <span style={{ fontSize: 11, color: "var(--color-muted)" }}>—</span>}
                  </td>
                </tr>
              );
            })}
            {data.commissions.length === 0 && (
              <tr><td colSpan={12} style={{ textAlign: "center", padding: "2rem", color: "var(--color-muted)" }}>{t("لا توجد حجوزات مطابقة")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit commission modal */}
      {showEdit && edit && (
        <div className="ds-modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="ds-modal-card narrow" onClick={e => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><Percent size={18} /> {t("إعداد عمولة خاص")} — {h.name}</h2>
              <button className="icon-btn" onClick={() => setShowEdit(false)}><X size={16} strokeWidth={2.5} /></button>
            </div>
            <div className="ds-modal-body" style={{ display: "grid", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <input type="checkbox" checked={edit.commission_enabled} onChange={e => setEdit({ ...edit, commission_enabled: e.target.checked })} />
                {t("تفعيل العمولة لهذا الفندق")}
              </label>
              <div className="field">
                <label className="field-label">{t("نوع العمولة")}</label>
                <select className="select" value={edit.commission_type} onChange={e => setEdit({ ...edit, commission_type: e.target.value })}>
                  <option value="percentage">{t("نسبة مئوية")}</option>
                  <option value="fixed_per_booking">{t("مبلغ مقطوع لكل حجز")}</option>
                  <option value="fixed_per_guest">{t("مبلغ مقطوع لكل زبون")}</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="field">
                  <label className="field-label">{edit.commission_type === "percentage" ? t("النسبة (%)") : t("القيمة")}</label>
                  <input type="number" className="input" value={edit.commission_value} onChange={e => setEdit({ ...edit, commission_value: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label className="field-label">{t("العملة")}</label>
                  <input type="text" className="input" value={edit.commission_currency} disabled={edit.commission_type === "percentage"}
                    onChange={e => setEdit({ ...edit, commission_currency: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">{t("ملاحظات")}</label>
                <textarea className="textarea" rows={2} value={edit.commission_notes} onChange={e => setEdit({ ...edit, commission_notes: e.target.value })} />
              </div>
              <p style={{ fontSize: 12, color: "var(--color-muted)" }}>
                {t("ملاحظة: تغيير العمولة لا يؤثّر على الحجوزات القديمة — تحتفظ كل عمولة بقيمتها وقت إنشائها (snapshot).")}
              </p>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setShowEdit(false)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={saveCommissionSetting} disabled={saving}>{saving ? t("جارٍ الحفظ...") : t("حفظ")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-border)", fontSize: 14, gap: 12 }}>
      <span style={{ color: "var(--color-muted)", display: "flex", alignItems: "center", gap: 4 }}>{icon}{label}</span>
      <span style={{ fontWeight: 700, color: "var(--color-heading)", textAlign: "left" }}>{value}</span>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className="ds-summary-label">{label}</p>
      <div className={`ds-summary-value ${color ?? ""}`} style={{ fontSize: "var(--text-2xl)" }}>{value}</div>
    </div>
  );
}
