"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, MapPin, Star, Wifi, Car, Utensils, Waves, Dumbbell,
  X, CheckCircle, AlertCircle, Calendar, Users, ChevronDown, ChevronUp,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

interface HotelDetail {
  id: number;
  slug: string;
  name: string;
  stars: number | null;
  hotel_type: string;
  country: string;
  governorate: string;
  city: string;
  address: string;
  map_url: string;
  cover_image: string;
  gallery_images: string[];
  amenities: string[];
  public_description_short: string;
  public_description_full: string;
  is_featured: boolean;
  check_in_policy: string;
  check_out_policy: string;
  cancellation_policy: string;
  payment_policy: string;
  show_contact_info: boolean;
  phone: string;
  min_price: number | null;
  min_currency: string;
}

interface RoomType {
  room_type: string;
  room_type_label: string;
  available_count: number;
  capacity: number;
  price_per_night: number;
  currency: string;
  total_price: number;
  nights: number;
  description: string;
}

interface BookingForm {
  guest_first_name: string;
  guest_last_name: string;
  guest_phone: string;
  guest_email: string;
  notes: string;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "واي فاي": <Wifi size={14} />,
  "موقف سيارات": <Car size={14} />,
  "مطعم": <Utensils size={14} />,
  "مسبح": <Waves size={14} />,
  "صالة رياضية": <Dumbbell size={14} />,
};

const HOTEL_TYPE_MAP: Record<string, string> = {
  hotel: "فندق", apart_hotel: "شقق فندقية", resort: "منتجع", guesthouse: "نزل", motel: "موتيل",
};

export default function HotelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router   = useRouter();

  const [hotel,    setHotel]    = useState<HotelDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const [checkIn,   setCheckIn]   = useState("");
  const [checkOut,  setCheckOut]  = useState("");
  const [guests,    setGuests]    = useState("1");
  const [searching, setSearching] = useState(false);
  const [rooms,     setRooms]     = useState<RoomType[] | null>(null);
  const [availErr,  setAvailErr]  = useState("");

  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [bookForm, setBookForm]     = useState<BookingForm>({
    guest_first_name: "", guest_last_name: "", guest_phone: "", guest_email: "", notes: "",
  });
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError,   setBookError]   = useState("");

  const [showFullDesc, setShowFullDesc] = useState(false);
  const [coverImg,     setCoverImg]     = useState("");

  useEffect(() => {
    fetch(apiUrl(`/public/hotels/${slug}/`))
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setHotel(data); setCoverImg(data.cover_image || ""); setLoading(false); })
      .catch(() => { setError("هذا الفندق غير متاح حاليًا"); setLoading(false); });
  }, [slug]);

  function searchAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (!checkIn || !checkOut) { setAvailErr("يرجى تحديد تواريخ الدخول والخروج"); return; }
    setAvailErr("");
    setSearching(true);
    setRooms(null);
    setSelectedRoom(null);
    fetch(apiUrl(`/public/hotels/${slug}/availability/?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`))
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) { setAvailErr(data.error ?? "حدث خطأ"); setSearching(false); return; }
        setRooms(Array.isArray(data) ? data : []);
        setSearching(false);
      })
      .catch(() => { setAvailErr("حدث خطأ في الاتصال"); setSearching(false); });
  }

  function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRoom || !hotel) return;
    const { guest_first_name, guest_last_name, guest_phone } = bookForm;
    if (!guest_first_name || !guest_last_name || !guest_phone) {
      setBookError("يرجى ملء الاسم الأول والأخير ورقم الهاتف"); return;
    }
    setBookLoading(true);
    setBookError("");
    fetch(apiUrl("/public/bookings/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotel_id:          hotel.id,
        room_type:         selectedRoom.room_type,
        check_in_date:     checkIn,
        check_out_date:    checkOut,
        guests_count:      parseInt(guests),
        ...bookForm,
      }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) { setBookError(data.error ?? "فشل الحجز"); setBookLoading(false); return; }
        const p = new URLSearchParams({
          no:        data.public_booking_no ?? "",
          name:      `${data.guest_first_name} ${data.guest_last_name}`,
          hotel:     hotel.name,
          city:      hotel.city,
          check_in:  data.check_in_date,
          check_out: data.check_out_date,
          nights:    String(data.nights_count),
          room:      data.room_type_label ?? selectedRoom.room_type_label,
          total:     String(data.total),
          currency:  data.currency,
          phone:     data.guest_phone,
        });
        router.push(`/booking/success?${p}`);
      })
      .catch(() => { setBookError("حدث خطأ في الاتصال"); setBookLoading(false); });
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f8fafc", fontFamily: "var(--font-main)" }}>
      <p style={{ color: "var(--color-muted)" }}>جارٍ تحميل بيانات الفندق...</p>
    </div>
  );

  if (error || !hotel) return (
    <div className="pub-shell">
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href="/" className="pub-logo">Fandqi</Link>
          <Link href="/hotels" className="ds-btn ds-btn-neutral ds-btn-sm">← الفنادق</Link>
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
        gap: "1rem", padding: "4rem" }}>
        <AlertCircle size={48} style={{ color: "var(--color-danger)" }} />
        <p style={{ color: "var(--color-heading)", fontSize: "var(--text-lg)", fontWeight: 700 }}>{error}</p>
        <Link href="/hotels" className="ds-btn ds-btn-primary">العودة لقائمة الفنادق</Link>
      </div>
    </div>
  );

  const nights = checkIn && checkOut
    ? Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  return (
    <div className="pub-shell">
      {/* Header */}
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href="/" className="pub-logo">Fandqi</Link>
          <nav>
            <ul className="pub-nav-links">
              <li><Link href="/" className="pub-nav-link">الرئيسية</Link></li>
              <li><Link href="/hotels" className="pub-nav-link">الفنادق</Link></li>
              <li><Link href="/manage-booking" className="pub-nav-link">إدارة حجزي</Link></li>
            </ul>
          </nav>
          <Link href="/manage-booking" className="ds-btn ds-btn-primary ds-btn-sm">إدارة حجزي</Link>
        </div>
      </header>

      {/* Cover Image */}
      <div className="pub-cover-wrap">
        {coverImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImg} alt={hotel.name} className="pub-cover-img" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#e0e7ff,#ede9fe)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={80} style={{ color: "#a5b4fc" }} />
          </div>
        )}
        <div className="pub-cover-overlay">
          <div className="pub-cover-info">
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: ".5rem", flexWrap: "wrap" }}>
              {hotel.hotel_type && (
                <span className="ds-badge ds-badge-info">{HOTEL_TYPE_MAP[hotel.hotel_type] ?? hotel.hotel_type}</span>
              )}
              {hotel.is_featured && <span className="ds-badge ds-badge-accent">مميز</span>}
            </div>
            <h1>{hotel.name}</h1>
            {hotel.stars != null && (
              <div style={{ color: "#fbbf24", fontSize: "1.2rem", marginBottom: ".4rem" }}>
                {"★".repeat(hotel.stars)}{"☆".repeat(Math.max(0, 5 - hotel.stars))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.85)", fontSize: "var(--text-sm)" }}>
              <MapPin size={14} />
              {[hotel.address, hotel.city, hotel.governorate, hotel.country].filter(Boolean).join("، ")}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      {hotel.gallery_images?.length > 0 && (
        <div className="pub-gallery">
          {hotel.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hotel.cover_image} alt={hotel.name} className="pub-gallery-thumb"
              style={{ outline: coverImg === hotel.cover_image ? "2px solid var(--color-primary)" : undefined }}
              onClick={() => setCoverImg(hotel.cover_image)} />
          )}
          {hotel.gallery_images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={img} alt={`${hotel.name} ${i + 1}`} className="pub-gallery-thumb"
              style={{ outline: coverImg === img ? "2px solid var(--color-primary)" : undefined }}
              onClick={() => setCoverImg(img)} />
          ))}
        </div>
      )}

      {/* Main 2-col layout */}
      <div className="pub-detail-layout">
        {/* LEFT: info */}
        <div>
          {/* Amenities */}
          {hotel.amenities?.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-heading)", marginBottom: ".75rem" }}>
                المرافق والخدمات
              </h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {hotel.amenities.map(a => (
                  <span key={a} className="pub-amenity-chip">
                    {AMENITY_ICONS[a] ?? <Star size={12} />} {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {(hotel.public_description_short || hotel.public_description_full) && (
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-heading)", marginBottom: ".75rem" }}>
                عن الفندق
              </h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", lineHeight: "var(--line-normal)", marginBottom: ".75rem" }}>
                {hotel.public_description_short}
              </p>
              {hotel.public_description_full && (
                <>
                  {showFullDesc && (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", lineHeight: "var(--line-normal)", marginBottom: ".75rem" }}>
                      {hotel.public_description_full}
                    </p>
                  )}
                  <button onClick={() => setShowFullDesc(v => !v)}
                    style={{ color: "var(--color-primary)", fontSize: "var(--text-sm)", fontWeight: 600,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", gap: 4 }}>
                    {showFullDesc ? <><ChevronUp size={16} /> عرض أقل</> : <><ChevronDown size={16} /> عرض المزيد</>}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Policies */}
          {(hotel.cancellation_policy || hotel.check_in_policy || hotel.check_out_policy || hotel.payment_policy) && (
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-heading)", marginBottom: ".75rem" }}>
                السياسات
              </h3>
              {hotel.check_in_policy && (
                <div className="pub-policy-block"><h4>سياسة الدخول</h4><p>{hotel.check_in_policy}</p></div>
              )}
              {hotel.check_out_policy && (
                <div className="pub-policy-block"><h4>سياسة المغادرة</h4><p>{hotel.check_out_policy}</p></div>
              )}
              {hotel.cancellation_policy && (
                <div className="pub-policy-block"><h4>سياسة الإلغاء</h4><p>{hotel.cancellation_policy}</p></div>
              )}
              {hotel.payment_policy && (
                <div className="pub-policy-block"><h4>سياسة الدفع</h4><p>{hotel.payment_policy}</p></div>
              )}
            </div>
          )}

          {/* Contact */}
          {hotel.show_contact_info && hotel.phone && (
            <div className="ds-alert ds-alert-info" style={{ marginBottom: "1.5rem" }}>
              <strong>التواصل مع الفندق:</strong> {hotel.phone}
            </div>
          )}

          {/* Map */}
          {hotel.map_url && (
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-heading)", marginBottom: ".75rem" }}>
                الموقع
              </h3>
              <a href={hotel.map_url} target="_blank" rel="noopener noreferrer"
                className="ds-btn ds-btn-neutral ds-btn-sm" style={{ gap: 6 }}>
                <MapPin size={16} /> عرض على الخريطة
              </a>
            </div>
          )}
        </div>

        {/* RIGHT: availability + booking */}
        <div>
          <div className="pub-avail-card">
            {hotel.min_price != null && (
              <div style={{ textAlign: "center", marginBottom: "1.25rem", paddingBottom: "1.25rem",
                borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>يبدأ من</span>
                <div className="pub-room-card-price" style={{ fontSize: "1.6rem" }}>
                  {hotel.min_price.toLocaleString("ar")} <span style={{ fontSize: "var(--text-sm)", fontWeight: 400, color: "var(--color-muted)" }}>{hotel.min_currency} / ليلة</span>
                </div>
              </div>
            )}

            <form onSubmit={searchAvailability}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="pub-avail-field">
                  <label><Calendar size={12} style={{ display: "inline", marginLeft: 4 }} />تاريخ الدخول</label>
                  <input type="date" value={checkIn}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setCheckIn(e.target.value)} required />
                </div>
                <div className="pub-avail-field">
                  <label><Calendar size={12} style={{ display: "inline", marginLeft: 4 }} />تاريخ الخروج</label>
                  <input type="date" value={checkOut}
                    min={checkIn || new Date().toISOString().split("T")[0]}
                    onChange={e => setCheckOut(e.target.value)} required />
                </div>
              </div>
              <div className="pub-avail-field">
                <label><Users size={12} style={{ display: "inline", marginLeft: 4 }} />عدد الضيوف</label>
                <select value={guests} onChange={e => setGuests(e.target.value)}>
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? "ضيف" : "ضيوف"}</option>
                  ))}
                </select>
              </div>
              {nights > 0 && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: ".75rem", textAlign: "center" }}>
                  {nights} {nights === 1 ? "ليلة" : "ليالٍ"}
                </p>
              )}
              {availErr && <div className="ds-alert ds-alert-danger" style={{ marginBottom: ".75rem" }}>{availErr}</div>}
              <button type="submit" className="ds-btn ds-btn-primary" disabled={searching}
                style={{ width: "100%", justifyContent: "center" }}>
                {searching ? "جارٍ البحث..." : "تحقق من التوفر"}
              </button>
            </form>

            {/* Available rooms */}
            {rooms !== null && (
              <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
                {rooms.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "1rem 0" }}>
                    <AlertCircle size={32} style={{ color: "var(--color-warning)", margin: "0 auto .5rem" }} />
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                      لا توجد غرف متاحة في التواريخ المحددة
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-heading)", marginBottom: "1rem" }}>
                      الغرف المتاحة
                    </p>
                    {rooms.map(r => (
                      <div key={r.room_type} className="pub-room-card">
                        <div>
                          <div className="pub-room-card-name">{r.room_type_label}</div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: ".4rem" }}>
                            حتى {r.capacity} ضيوف · {r.available_count} غرفة متاحة
                          </div>
                          {r.description && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{r.description}</div>
                          )}
                        </div>
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                          <div className="pub-room-card-price">{r.price_per_night.toLocaleString("ar")}</div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: ".5rem" }}>
                            {r.currency}/ليلة
                          </div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 600, marginBottom: ".5rem" }}>
                            المجموع: {r.total_price.toLocaleString("ar")} {r.currency}
                          </div>
                          <button className="ds-btn ds-btn-primary ds-btn-sm"
                            onClick={() => { setSelectedRoom(r); setBookError(""); }}>
                            احجز الآن
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {selectedRoom && (
        <div className="pub-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedRoom(null); }}>
          <div className="pub-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--color-heading)", margin: 0 }}>
                تأكيد الحجز
              </h2>
              <button onClick={() => setSelectedRoom(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={22} />
              </button>
            </div>

            {/* Summary box */}
            <div style={{ background: "var(--color-primary-soft)", borderRadius: 12, padding: "1rem", marginBottom: "1.5rem",
              border: "1px solid var(--color-primary)", fontSize: "var(--text-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".4rem" }}>
                <span style={{ color: "var(--color-muted)" }}>الفندق</span>
                <strong style={{ color: "var(--color-heading)" }}>{hotel.name}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".4rem" }}>
                <span style={{ color: "var(--color-muted)" }}>نوع الغرفة</span>
                <strong style={{ color: "var(--color-heading)" }}>{selectedRoom.room_type_label}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".4rem" }}>
                <span style={{ color: "var(--color-muted)" }}>الفترة</span>
                <strong style={{ color: "var(--color-heading)" }}>{checkIn} — {checkOut} ({selectedRoom.nights} {selectedRoom.nights === 1 ? "ليلة" : "ليالٍ"})</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-muted)" }}>الإجمالي</span>
                <strong style={{ color: "var(--color-primary)", fontSize: "var(--text-lg)" }}>
                  {selectedRoom.total_price.toLocaleString("ar")} {selectedRoom.currency}
                </strong>
              </div>
              <div style={{ marginTop: ".5rem", fontSize: "var(--text-xs)", color: "var(--color-muted)", textAlign: "center" }}>
                الدفع عند الوصول — لا حاجة لبطاقة ائتمانية
              </div>
            </div>

            <form onSubmit={submitBooking}>
              <div className="pub-form-row">
                <div className="pub-form-field">
                  <label>الاسم الأول *</label>
                  <input type="text" placeholder="أحمد" required
                    value={bookForm.guest_first_name}
                    onChange={e => setBookForm(f => ({ ...f, guest_first_name: e.target.value }))} />
                </div>
                <div className="pub-form-field">
                  <label>الاسم الأخير *</label>
                  <input type="text" placeholder="علي" required
                    value={bookForm.guest_last_name}
                    onChange={e => setBookForm(f => ({ ...f, guest_last_name: e.target.value }))} />
                </div>
              </div>
              <div className="pub-form-field">
                <label>رقم الهاتف *</label>
                <input type="tel" placeholder="+963..." required
                  value={bookForm.guest_phone}
                  onChange={e => setBookForm(f => ({ ...f, guest_phone: e.target.value }))} />
              </div>
              <div className="pub-form-field">
                <label>البريد الإلكتروني (اختياري)</label>
                <input type="email" placeholder="email@example.com"
                  value={bookForm.guest_email}
                  onChange={e => setBookForm(f => ({ ...f, guest_email: e.target.value }))} />
              </div>
              <div className="pub-form-field">
                <label>ملاحظات (اختياري)</label>
                <textarea rows={2} placeholder="أي طلبات خاصة..."
                  value={bookForm.notes}
                  onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ resize: "vertical" }} />
              </div>

              {bookError && <div className="ds-alert ds-alert-danger" style={{ marginBottom: ".75rem" }}>{bookError}</div>}

              <div style={{ display: "flex", gap: "1rem" }}>
                <button type="submit" className="ds-btn ds-btn-success" disabled={bookLoading}
                  style={{ flex: 1, justifyContent: "center" }}>
                  {bookLoading ? "جارٍ الحجز..." : <><CheckCircle size={18} /> تأكيد الحجز</>}
                </button>
                <button type="button" className="ds-btn ds-btn-neutral" onClick={() => setSelectedRoom(null)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="pub-footer">
        <div className="pub-container">
          <p>© Fandqi — منصة فندقي للحجز الفندقي</p>
        </div>
      </footer>
    </div>
  );
}
