"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, Search } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

interface HotelCard {
  id: number;
  slug: string;
  name: string;
  stars: number | null;
  hotel_type: string;
  country: string;
  governorate: string;
  city: string;
  cover_image: string;
  amenities: string[];
  public_description_short: string;
  is_featured: boolean;
  min_price: number | null;
  min_currency: string;
}

function HotelCardComp({ hotel }: { hotel: HotelCard }) {
  const { t, locale } = useLang();
  return (
    <Link href={`/hotels/${hotel.slug}`} className="pub-hotel-card">
      {hotel.cover_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hotel.cover_image} alt={hotel.name} className="pub-hotel-card-img" />
      ) : (
        <div className="pub-hotel-card-img-placeholder">
          <Building2 size={48} />
        </div>
      )}
      <div className="pub-hotel-card-body">
        {hotel.stars != null && (
          <div className="pub-stars">{"★".repeat(hotel.stars)}{"☆".repeat(Math.max(0, 5 - hotel.stars))}</div>
        )}
        <div className="pub-hotel-card-name">{hotel.name}</div>
        <div className="pub-hotel-card-loc">
          <MapPin size={12} />
          {[hotel.city, hotel.governorate, hotel.country].filter(Boolean).join("، ")}
        </div>
        {hotel.amenities?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: ".75rem" }}>
            {hotel.amenities.slice(0, 3).map(a => (
              <span key={a} className="pub-amenity-chip">{a}</span>
            ))}
          </div>
        )}
        <div className="pub-hotel-card-footer">
          {hotel.min_price != null ? (
            <div className="pub-price">
              {hotel.min_price.toLocaleString(locale)}
              {" "}<span className="pub-price-label">{hotel.min_currency} / {t("ليلة")}</span>
            </div>
          ) : <div />}
          <span className="ds-btn ds-btn-primary ds-btn-sm" style={{ pointerEvents: "none" }}>{t("عرض")}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const router = useRouter();
  const { t } = useLang();
  const [featured, setFeatured] = useState<HotelCard[]>([]);
  const [search, setSearch]     = useState({ city: "", check_in: "", check_out: "", guests: "1" });

  // صفحة الزوار مفصولة تمامًا عن تسجيل الدخول — مجرد عرض عام للفنادق.
  useEffect(() => {
    fetch(apiUrl("/public/hotels/?featured=1"))
      .then(r => r.ok ? r.json() : [])
      .then(data => setFeatured(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.city)      params.set("city", search.city);
    if (search.check_in)  params.set("check_in", search.check_in);
    if (search.check_out) params.set("check_out", search.check_out);
    if (search.guests !== "1") params.set("guests", search.guests);
    router.push(`/hotels?${params}`);
  }

  return (
    <div className="pub-shell">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href="/" className="pub-logo">funduqii</Link>
          <nav>
            <ul className="pub-nav-links">
              <li><Link href="/" className="pub-nav-link">{t("الرئيسية")}</Link></li>
              <li><Link href="/hotels" className="pub-nav-link">{t("الفنادق")}</Link></li>
              <li><Link href="/manage-booking" className="pub-nav-link">{t("إدارة حجزي")}</Link></li>
            </ul>
          </nav>
          <Link href="/hotels" className="ds-btn ds-btn-primary ds-btn-sm">{t("احجز الآن")}</Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pub-hero">
        <div className="pub-container">
          <h1>{t("ابحث عن فندقك المثالي")}</h1>
          <p>{t("آلاف الفنادق والشقق الفندقية في مكان واحد — احجز مجانًا وادفع عند الوصول")}</p>
          <form onSubmit={handleSearch} className="pub-search-box">
            <div className="pub-search-field">
              <label>{t("المدينة أو المنطقة")}</label>
              <input
                type="text"
                placeholder={t("دمشق، حلب، اللاذقية...")}
                value={search.city}
                onChange={e => setSearch(s => ({ ...s, city: e.target.value }))}
              />
            </div>
            <div className="pub-search-field">
              <label>{t("تاريخ الوصول")}</label>
              <input
                type="date"
                value={search.check_in}
                onChange={e => setSearch(s => ({ ...s, check_in: e.target.value }))}
              />
            </div>
            <div className="pub-search-field">
              <label>{t("تاريخ المغادرة")}</label>
              <input
                type="date"
                value={search.check_out}
                onChange={e => setSearch(s => ({ ...s, check_out: e.target.value }))}
              />
            </div>
            <button type="submit" className="ds-btn ds-btn-success"
              style={{ padding: ".7rem 1.5rem", borderRadius: 10, gap: 8, whiteSpace: "nowrap" }}>
              <Search size={18} />
              {t("بحث")}
            </button>
          </form>
        </div>
      </section>

      {/* ── Featured Hotels ───────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="pub-section" style={{ background: "#fff" }}>
          <div className="pub-container">
            <h2 className="pub-section-title">{t("الفنادق المميزة")}</h2>
            <p className="pub-section-sub">{t("اختيارات مميزة بتقييمات عالية وخدمات استثنائية")}</p>
            <div className="pub-hotel-grid">
              {featured.map(h => <HotelCardComp key={h.id} hotel={h} />)}
            </div>
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Link href="/hotels" className="ds-btn ds-btn-neutral">{t("عرض جميع الفنادق")}</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="pub-section">
        <div className="pub-container">
          <h2 className="pub-section-title" style={{ textAlign: "center" }}>{t("كيف تحجز مع فندقي؟")}</h2>
          <p className="pub-section-sub" style={{ textAlign: "center" }}>{t("ثلاث خطوات بسيطة لتأكيد إقامتك")}</p>
          <div className="pub-steps-grid">
            <div className="pub-step">
              <div className="pub-step-num">١</div>
              <h3>{t("اختر الفندق")}</h3>
              <p>{t("تصفح الفنادق وفلترها حسب المدينة والتقييم والمرافق")}</p>
            </div>
            <div className="pub-step">
              <div className="pub-step-num">٢</div>
              <h3>{t("حدد التواريخ والغرفة")}</h3>
              <p>{t("اختر تواريخ الإقامة ونوع الغرفة المناسبة وأكمل بياناتك")}</p>
            </div>
            <div className="pub-step">
              <div className="pub-step-num">٣</div>
              <h3>{t("ادفع عند الوصول")}</h3>
              <p>{t("لا حاجة لبطاقة ائتمانية — احجز مجانًا وادفع عند وصولك للفندق")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="pub-footer">
        <div className="pub-container">
          <p style={{ fontWeight: "700", fontSize: "1rem", color: "#fff", marginBottom: ".5rem" }}>funduqii</p>
          <p>{t("منصة فندقي — نظام الحجز الفندقي الاحترافي")}</p>
          <p style={{ marginTop: ".75rem" }}>
            <Link href="/hotels" style={{ color: "rgba(255,255,255,.6)", marginLeft: "1.5rem" }}>{t("الفنادق")}</Link>
            <Link href="/manage-booking" style={{ color: "rgba(255,255,255,.6)" }}>{t("إدارة حجزي")}</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
