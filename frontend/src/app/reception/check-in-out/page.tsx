"use client";

import { useEffect, useState } from "react";
import { apiUrl, getAuthHeaders as apiHeaders, getAuthJsonHeaders } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

interface Room {
  id: number;
  room_number: string;
  room_type?: string;
  status: string;
  price_per_night?: number;
}

interface GuestRow {
  id: number;
  room: string;
  guestName: string;
  checkInDate: string;
  nights: number;
  amount: number;
}

interface CheckedInRes {
  id: number;
  room_number?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  check_in_date?: string;
  nights_count?: number;
  total?: string | number;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export default function CheckInOutPage() {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<"checkin" | "checkout">("checkin");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Check-in form state
  const [guestName, setGuestName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [checkInDate, setCheckInDate] = useState(todayStr());
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr());
  const [notes, setNotes] = useState("");
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInError, setCheckInError] = useState("");

  // Check-out state
  const [searchQuery, setSearchQuery] = useState("");
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<number | null>(null);
  // م3: نافذة تسوية الرصيد عند منع الخروج بالدين (402) بدل خطأ عام
  const [settleFor, setSettleFor] = useState<{ id: number; guestName: string; room: string; balance: number; currency: string } | null>(null);
  const [settleMethod, setSettleMethod] = useState("cash");
  const [settleBusy, setSettleBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const hotelId = localStorage.getItem("hotel_id");
      if (!hotelId) { setLoadingRooms(false); return; }

      // Load available rooms for check-in form
      fetch(apiUrl(`/rooms/?hotel_id=${hotelId}`), { headers: apiHeaders() })
        .then((r) => r.json())
        .then((data) => setRooms(Array.isArray(data) ? data : data.results ?? []))
        .catch(() => setRooms([]))
        .finally(() => setLoadingRooms(false));

      // Load currently checked-in guests for check-out tab
      setLoadingGuests(true);
      fetch(apiUrl(`/reservations/?hotel=${hotelId}&status=checked_in`), { headers: apiHeaders() })
        .then((r) => r.json())
        .then((data) => {
          const list: CheckedInRes[] = Array.isArray(data) ? data : data.results ?? [];
          setGuests(list.map(r => ({
            id: r.id,
            room: r.room_number ?? "—",
            guestName: `${r.guest_first_name ?? ""} ${r.guest_last_name ?? ""}`.trim() || "—",
            checkInDate: r.check_in_date ?? "",
            nights: r.nights_count ?? 0,
            amount: Number(r.total) || 0,
          })));
        })
        .catch(() => setGuests([]))
        .finally(() => setLoadingGuests(false));
    };
    load();
  }, []);

  const availableRooms = rooms.filter((r) => r.status === "available");
  const availableCount = availableRooms.length;

  const nights = calcNights(checkInDate, checkOutDate);

  function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    setCheckInError("");
    if (!guestName.trim()) {
      setCheckInError(t("يرجى إدخال اسم الضيف."));
      return;
    }
    if (!selectedRoom) {
      setCheckInError(t("يرجى اختيار الغرفة."));
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setCheckInError(t("يرجى تحديد تاريخ الوصول والمغادرة."));
      return;
    }
    if (nights <= 0) {
      setCheckInError(t("تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول."));
      return;
    }
    void doCheckIn();
  }

  async function doCheckIn() {
    const parts = guestName.trim().split(/\s+/);
    const first = parts[0];
    const last = parts.slice(1).join(" ");
    const fullNotes = [notes, nationality && `الجنسية: ${nationality}`].filter(Boolean).join(" — ");
    try {
      const createRes = await fetch(apiUrl("/reservations/"), {
        method: "POST",
        headers: getAuthJsonHeaders(),
        body: JSON.stringify({
          guest_first_name: first, guest_last_name: last,
          guest_id_number: idNumber, guest_phone: phone,
          room: Number(selectedRoom), check_in_date: checkInDate, check_out_date: checkOutDate,
          nights_count: nights, status: "confirmed", source: "direct", notes: fullNotes,
        }),
      });
      if (!createRes.ok) throw new Error();
      const created = await createRes.json();
      // تسجيل دخول ذرّي (يحدّث الحجز + الغرفة معًا)
      await fetch(apiUrl(`/reservations/${created.id}/check_in/`), { method: "POST", headers: getAuthJsonHeaders() });
      setCheckInSuccess(true);
      setGuestName(""); setIdNumber(""); setNationality(""); setPhone("");
      setSelectedRoom(""); setCheckInDate(todayStr()); setCheckOutDate(tomorrowStr()); setNotes("");
      setTimeout(() => setCheckInSuccess(false), 4000);
      // إعادة تحميل الغرف (الغرفة صارت مشغولة الآن)
      const hotelId = localStorage.getItem("hotel_id");
      const rr = await fetch(apiUrl(`/rooms/?hotel_id=${hotelId}`), { headers: apiHeaders() });
      const rd = await rr.json();
      setRooms(Array.isArray(rd) ? rd : rd.results ?? []);
    } catch {
      setCheckInError(t("تعذّر تسجيل الوصول، حاول مرة أخرى."));
    }
  }

  async function handleCheckOut(guestId: number) {
    try {
      const r = await fetch(apiUrl(`/reservations/${guestId}/check_out/`), {
        method: "POST",
        headers: getAuthJsonHeaders(),
      });
      if (r.status === 402) {
        // م3: دين مستحق — افتح نافذة تسوية بدل رسالة خطأ عامة
        const data = await r.json().catch(() => ({}));
        const g = guests.find((x) => x.id === guestId);
        setSettleFor({
          id: guestId,
          guestName: g?.guestName ?? "",
          room: g?.room ?? "",
          balance: Number(data.balance_due ?? 0),
          currency: data.currency ?? "",
        });
        return;
      }
      if (!r.ok) throw new Error();
      setCheckoutSuccess(guestId);
      setGuests((prev) => prev.filter((g) => g.id !== guestId));
      setTimeout(() => setCheckoutSuccess(null), 3000);
    } catch {
      setCheckInError(t("تعذّر تسجيل المغادرة، حاول مرة أخرى."));
    }
  }

  async function handleSettleAndCheckout() {
    if (!settleFor) return;
    setSettleBusy(true);
    try {
      const r = await fetch(apiUrl(`/reservations/${settleFor.id}/settle_and_checkout/`), {
        method: "POST", headers: getAuthJsonHeaders(),
        body: JSON.stringify({ method: settleMethod }),
      });
      if (!r.ok) throw new Error();
      const id = settleFor.id;
      setSettleFor(null);
      setCheckoutSuccess(id);
      setGuests((prev) => prev.filter((g) => g.id !== id));
      setTimeout(() => setCheckoutSuccess(null), 3000);
    } catch {
      setCheckInError(t("تعذّر إتمام الدفع والخروج، حاول مرة أخرى."));
    } finally {
      setSettleBusy(false);
    }
  }

  const filteredGuests = guests.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.room.toLowerCase().includes(q) || g.guestName.toLowerCase().includes(q);
  });

  return (
    <div className="ds-page">
      {/* م3: نافذة تسوية الرصيد قبل الخروج (بدل منع الاستقبال بخطأ عام) */}
      {settleFor && (
        <div className="ds-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !settleBusy) setSettleFor(null); }}>
          <div className="ds-modal" style={{ maxWidth: 440 }}>
            <div className="ds-modal-header">
              <h3>{t("تسوية الحساب قبل الخروج")}</h3>
              <button className="ds-modal-close" onClick={() => !settleBusy && setSettleFor(null)}>✕</button>
            </div>
            <div className="ds-modal-body">
              <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "0.75rem" }}>
                {t("لا يمكن تسجيل الخروج قبل تسوية الرصيد المستحق.")}
              </p>
              <div style={{ display: "grid", gap: "0.4rem", fontSize: "0.9rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--color-muted)" }}>{t("النزيل")}</span><strong>{settleFor.guestName}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--color-muted)" }}>{t("الغرفة")}</span><strong>{settleFor.room}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--color-muted)" }}>{t("المتبقي")}</span><strong style={{ color: "var(--color-danger)", fontSize: "1.05rem" }}>{settleFor.currency} {settleFor.balance.toLocaleString("en-US")}</strong></div>
              </div>
              <label className="field-label">{t("طريقة الدفع")}</label>
              <select className="select" value={settleMethod} onChange={e => setSettleMethod(e.target.value)} style={{ marginBottom: "1rem" }}>
                <option value="cash">{t("نقدي")}</option>
                <option value="electronic">{t("إلكتروني")}</option>
                <option value="card">{t("كرت / بطاقة بنكية")}</option>
              </select>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="ds-btn ds-btn-success" disabled={settleBusy} onClick={handleSettleAndCheckout} style={{ flex: 1, justifyContent: "center" }}>
                  {settleBusy ? t("جارٍ المعالجة...") : t("دفع وإغلاق الحساب")}
                </button>
                <button className="ds-btn ds-btn-neutral" disabled={settleBusy} onClick={() => setSettleFor(null)}>{t("إلغاء")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{t("الاستقبال والمغادرة")}</h1>
          <p>{t("إدارة تسجيل وصول ومغادرة الضيوف")}</p>
        </div>
        <div className="page-actions">
          <span className="ds-badge ds-badge-success">
            {loadingRooms ? "..." : `${availableCount} ${t("غرفة متاحة")}`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="ds-tabs">
        <button
          className={`ds-tab-btn${activeTab === "checkin" ? " active" : ""}`}
          onClick={() => setActiveTab("checkin")}
        >
          {t("تسجيل وصول")}
        </button>
        <button
          className={`ds-tab-btn${activeTab === "checkout" ? " active" : ""}`}
          onClick={() => setActiveTab("checkout")}
        >
          {t("تسجيل مغادرة")}
        </button>
      </div>

      {/* CHECK-IN TAB */}
      {activeTab === "checkin" && (
        <div className="ds-card-p">
          <h2 style={{ marginBottom: "1.25rem" }}>{t("تسجيل وصول ضيف جديد")}</h2>

          {checkInSuccess && (
            <div className="ds-alert ds-alert-success" style={{ marginBottom: "1rem" }}>
              {t("تم تسجيل الوصول بنجاح!")}
            </div>
          )}

          {checkInError && (
            <div
              className="ds-badge ds-badge-danger"
              style={{ display: "block", marginBottom: "1rem", padding: "0.75rem 1rem", fontSize: "0.95rem" }}
            >
              {checkInError}
            </div>
          )}

          <form onSubmit={handleCheckIn}>
            {/* Row 1: guest name + ID */}
            <div className="modal-grid">
              <div className="field">
                <label className="field-label">{t("اسم الضيف")}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={t("الاسم الكامل")}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">{t("رقم الهوية / الجواز")}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={t("رقم الهوية أو جواز السفر")}
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: nationality + phone */}
            <div className="modal-grid">
              <div className="field">
                <label className="field-label">{t("الجنسية")}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={t("الجنسية")}
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">{t("رقم الهاتف")}</label>
                <input
                  className="input"
                  type="tel"
                  placeholder={t("رقم الهاتف")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: room selection */}
            <div className="modal-grid">
              <div className="field">
                <label className="field-label">
                  {t("الغرفة")}
                  {!loadingRooms && (
                    <span
                      className="ds-badge ds-badge-success"
                      style={{ marginRight: "0.5rem", fontSize: "0.75rem" }}
                    >
                      {availableCount} {t("متاحة")}
                    </span>
                  )}
                </label>
                <select
                  className="select"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="">{t("-- اختر غرفة --")}</option>
                  {loadingRooms ? (
                    <option disabled>{t("جارٍ التحميل...")}</option>
                  ) : availableRooms.length === 0 ? (
                    <option disabled>{t("لا توجد غرف متاحة")}</option>
                  ) : (
                    availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {t("غرفة")} {r.room_number}
                        {r.room_type ? ` — ${r.room_type}` : ""}
                        {r.price_per_night ? ` — ${r.price_per_night}/${t("ليلة")}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Row 4: check-in / check-out dates */}
            <div className="modal-grid">
              <div className="field">
                <label className="field-label">{t("تاريخ الوصول")}</label>
                <input
                  className="input"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">{t("تاريخ المغادرة")}</label>
                <input
                  className="input"
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>
            </div>

            {nights > 0 && (
              <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                {t("مدة الإقامة")}: <strong className="text-primary">{nights} {t("ليلة")}</strong>
              </p>
            )}

            {/* Notes */}
            <div className="field">
              <label className="field-label">{t("ملاحظات")}</label>
              <textarea
                className="textarea"
                placeholder={t("ملاحظات إضافية (اختياري)")}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.5rem" }}>
              <button type="submit" className="ds-btn ds-btn-success">
                {t("تسجيل الوصول")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHECK-OUT TAB */}
      {activeTab === "checkout" && (
        <div className="ds-card-p">
          <h2 style={{ marginBottom: "1.25rem" }}>{t("تسجيل مغادرة الضيوف")}</h2>

          {checkoutSuccess !== null && (
            <div className="ds-alert ds-alert-success" style={{ marginBottom: "1rem" }}>
              {t("تم تسجيل المغادرة بنجاح!")}
            </div>
          )}

          {/* Search */}
          <div className="ds-filters" style={{ marginBottom: "1.25rem" }}>
            <input
              className="input"
              type="text"
              placeholder={t("ابحث برقم الغرفة أو اسم الضيف...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Guests Table */}
          {loadingGuests ? (
            <p className="text-muted" style={{ textAlign: "center", padding: "2rem 0" }}>{t("جارٍ تحميل قائمة النزلاء...")}</p>
          ) : filteredGuests.length === 0 ? (
            <p className="text-muted" style={{ textAlign: "center", padding: "2rem 0" }}>
              {guests.length === 0
                ? t("لا يوجد نزلاء حاليون داخل الفندق.")
                : t("لا توجد نتائج مطابقة للبحث.")}
            </p>
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>{t("الغرفة")}</th>
                    <th>{t("اسم الضيف")}</th>
                    <th>{t("تاريخ الوصول")}</th>
                    <th>{t("عدد الليالي")}</th>
                    <th>{t("المبلغ")}</th>
                    <th>{t("الإجراء")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <span className="ds-badge ds-badge-info">{g.room}</span>
                      </td>
                      <td>{g.guestName}</td>
                      <td>{g.checkInDate}</td>
                      <td>{g.nights}</td>
                      <td>
                        <strong>{g.amount.toLocaleString("en-US")}</strong>
                      </td>
                      <td>
                        <button
                          className="ds-btn ds-btn-danger ds-btn-sm"
                          onClick={() => handleCheckOut(g.id)}
                        >
                          {t("تسجيل المغادرة")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
