"use client";

import { useEffect, useState } from "react";
import { apiUrl, getAuthHeaders as apiHeaders, getAuthJsonHeaders } from "@/lib/api";

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
      setCheckInError("يرجى إدخال اسم الضيف.");
      return;
    }
    if (!selectedRoom) {
      setCheckInError("يرجى اختيار الغرفة.");
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setCheckInError("يرجى تحديد تاريخ الوصول والمغادرة.");
      return;
    }
    if (nights <= 0) {
      setCheckInError("تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول.");
      return;
    }
    // Demo: show success, reset form
    setCheckInSuccess(true);
    setGuestName("");
    setIdNumber("");
    setNationality("");
    setPhone("");
    setSelectedRoom("");
    setCheckInDate(todayStr());
    setCheckOutDate(tomorrowStr());
    setNotes("");
    setTimeout(() => setCheckInSuccess(false), 4000);
  }

  function handleCheckOut(guestId: number) {
    // Fire API call to mark reservation as checked_out
    fetch(apiUrl(`/reservations/${guestId}/check_out/`), {
      method: "POST",
      headers: getAuthJsonHeaders(),
    }).catch(() => { /* ignore — UI already updated */ });
    setCheckoutSuccess(guestId);
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    setTimeout(() => setCheckoutSuccess(null), 3000);
  }

  const filteredGuests = guests.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.room.toLowerCase().includes(q) || g.guestName.toLowerCase().includes(q);
  });

  return (
    <div className="ds-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>الاستقبال والمغادرة</h1>
          <p>إدارة تسجيل وصول ومغادرة الضيوف</p>
        </div>
        <div className="page-actions">
          <span className="ds-badge ds-badge-success">
            {loadingRooms ? "..." : `${availableCount} غرفة متاحة`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="ds-tabs">
        <button
          className={`ds-tab-btn${activeTab === "checkin" ? " active" : ""}`}
          onClick={() => setActiveTab("checkin")}
        >
          تسجيل وصول
        </button>
        <button
          className={`ds-tab-btn${activeTab === "checkout" ? " active" : ""}`}
          onClick={() => setActiveTab("checkout")}
        >
          تسجيل مغادرة
        </button>
      </div>

      {/* CHECK-IN TAB */}
      {activeTab === "checkin" && (
        <div className="ds-card-p">
          <h2 style={{ marginBottom: "1.25rem" }}>تسجيل وصول ضيف جديد</h2>

          {checkInSuccess && (
            <div className="ds-alert ds-alert-success" style={{ marginBottom: "1rem" }}>
              تم تسجيل الوصول بنجاح!
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
                <label className="field-label">اسم الضيف</label>
                <input
                  className="input"
                  type="text"
                  placeholder="الاسم الكامل"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">رقم الهوية / الجواز</label>
                <input
                  className="input"
                  type="text"
                  placeholder="رقم الهوية أو جواز السفر"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: nationality + phone */}
            <div className="modal-grid">
              <div className="field">
                <label className="field-label">الجنسية</label>
                <input
                  className="input"
                  type="text"
                  placeholder="الجنسية"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">رقم الهاتف</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: room selection */}
            <div className="modal-grid">
              <div className="field">
                <label className="field-label">
                  الغرفة
                  {!loadingRooms && (
                    <span
                      className="ds-badge ds-badge-success"
                      style={{ marginRight: "0.5rem", fontSize: "0.75rem" }}
                    >
                      {availableCount} متاحة
                    </span>
                  )}
                </label>
                <select
                  className="select"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="">-- اختر غرفة --</option>
                  {loadingRooms ? (
                    <option disabled>جارٍ التحميل...</option>
                  ) : availableRooms.length === 0 ? (
                    <option disabled>لا توجد غرف متاحة</option>
                  ) : (
                    availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        غرفة {r.room_number}
                        {r.room_type ? ` — ${r.room_type}` : ""}
                        {r.price_per_night ? ` — ${r.price_per_night}/ليلة` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Row 4: check-in / check-out dates */}
            <div className="modal-grid">
              <div className="field">
                <label className="field-label">تاريخ الوصول</label>
                <input
                  className="input"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">تاريخ المغادرة</label>
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
                مدة الإقامة: <strong className="text-primary">{nights} ليلة</strong>
              </p>
            )}

            {/* Notes */}
            <div className="field">
              <label className="field-label">ملاحظات</label>
              <textarea
                className="textarea"
                placeholder="ملاحظات إضافية (اختياري)"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.5rem" }}>
              <button type="submit" className="ds-btn ds-btn-success">
                تسجيل الوصول
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHECK-OUT TAB */}
      {activeTab === "checkout" && (
        <div className="ds-card-p">
          <h2 style={{ marginBottom: "1.25rem" }}>تسجيل مغادرة الضيوف</h2>

          {checkoutSuccess !== null && (
            <div className="ds-alert ds-alert-success" style={{ marginBottom: "1rem" }}>
              تم تسجيل المغادرة بنجاح!
            </div>
          )}

          {/* Search */}
          <div className="ds-filters" style={{ marginBottom: "1.25rem" }}>
            <input
              className="input"
              type="text"
              placeholder="ابحث برقم الغرفة أو اسم الضيف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Guests Table */}
          {loadingGuests ? (
            <p className="text-muted" style={{ textAlign: "center", padding: "2rem 0" }}>جارٍ تحميل قائمة النزلاء...</p>
          ) : filteredGuests.length === 0 ? (
            <p className="text-muted" style={{ textAlign: "center", padding: "2rem 0" }}>
              {guests.length === 0
                ? "لا يوجد نزلاء حاليون داخل الفندق."
                : "لا توجد نتائج مطابقة للبحث."}
            </p>
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>الغرفة</th>
                    <th>اسم الضيف</th>
                    <th>تاريخ الوصول</th>
                    <th>عدد الليالي</th>
                    <th>المبلغ</th>
                    <th>الإجراء</th>
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
                          تسجيل المغادرة
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
