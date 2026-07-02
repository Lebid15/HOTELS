"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, Search, SlidersHorizontal } from "lucide-react";
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
  avg_rating: number | null;
  ratings_count: number;
}

const STARS_OPTS = [
  { value: "", label: "كل التقييمات" },
  { value: "5", label: "★★★★★ خمس نجوم" },
  { value: "4", label: "★★★★ أربع نجوم" },
  { value: "3", label: "★★★ ثلاث نجوم" },
  { value: "2", label: "★★ نجمتان" },
  { value: "1", label: "★ نجمة" },
];

function HotelsPageInner() {
  const { t } = useLang();
  const sp     = useSearchParams();
  const router = useRouter();

  const [hotels, setHotels]   = useState<HotelCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityInput, setCityInput] = useState(sp.get("city") ?? "");
  const [filters, setFilters] = useState({
    city:       sp.get("city")       ?? "",
    stars:      sp.get("stars")      ?? "",
  });

  function loadHotels(f = filters) {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.city)       params.set("city", f.city);
    if (f.stars)      params.set("stars", f.stars);
    fetch(apiUrl(`/public/hotels/?${params}`))
      .then(r => r.ok ? r.json() : [])
      .then(data => { setHotels(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
  useEffect(() => { loadHotels(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const f = { ...filters, city: cityInput };
    setFilters(f);
    loadHotels(f);
    const params = new URLSearchParams();
    if (f.city)       params.set("city", f.city);
    if (f.stars)      params.set("stars", f.stars);
    router.replace(`/hotels?${params}`, { scroll: false });
  }

  return (
    <div className="pub-shell">
      {/* Header */}
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href="/" className="pub-logo">funduqii</Link>
          <nav>
            <ul className="pub-nav-links">
              <li><Link href="/" className="pub-nav-link">{t("الرئيسية")}</Link></li>
              <li><Link href="/hotels" className="pub-nav-link" style={{ color: "var(--color-primary)" }}>{t("الفنادق")}</Link></li>
              <li><Link href="/manage-booking" className="pub-nav-link">{t("إدارة حجزي")}</Link></li>
            </ul>
          </nav>
          <Link href="/manage-booking" className="ds-btn ds-btn-primary ds-btn-sm">{t("إدارة حجزي")}</Link>
        </div>
      </header>

      {/* Filter Bar */}
      <form onSubmit={applyFilters} className="pub-filter-bar">
        <SlidersHorizontal size={16} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
        <input
          className="pub-filter-input"
          type="text"
          placeholder={t("اسم المدينة...")}
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <select
          className="pub-filter-select"
          value={filters.stars}
          onChange={e => setFilters(f => ({ ...f, stars: e.target.value }))}
        >
          {STARS_OPTS.map(o => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
        </select>
        <button type="submit" className="ds-btn ds-btn-primary ds-btn-sm" style={{ gap: 6 }}>
          <Search size={15} /> {t("بحث")}
        </button>
        {(filters.city || filters.stars) && (
          <button type="button" className="ds-btn ds-btn-neutral ds-btn-sm"
            onClick={() => {
              const f = { city: "", stars: "" };
              setCityInput("");
              setFilters(f);
              loadHotels(f);
              router.replace("/hotels", { scroll: false });
            }}>
            {t("مسح الفلاتر")}
          </button>
        )}
      </form>

      {/* Main */}
      <main style={{ flex: 1, padding: "2rem 1.5rem" }}>
        <div className="pub-container">
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-muted)" }}>
              {t("جارٍ تحميل الفنادق...")}
            </div>
          ) : hotels.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem" }}>
              <Building2 size={64} style={{ color: "#c7d2fe", margin: "0 auto 1rem" }} />
              <p style={{ color: "var(--color-heading)", fontWeight: 700, fontSize: "var(--text-lg)" }}>
                {t("لا توجد فنادق مطابقة")}
              </p>
              <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginTop: ".5rem" }}>
                {t("جرب تغيير معايير البحث أو تصفح جميع الفنادق")}
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginBottom: "1.25rem" }}>
                {hotels.length} {t("فندق متاح")}
              </p>
              <div className="pub-hotel-grid">
                {hotels.map(h => (
                  <Link key={h.id} href={`/hotels/${h.slug}`} className="pub-hotel-card">
                    {h.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.cover_image} alt={h.name} className="pub-hotel-card-img" />
                    ) : (
                      <div className="pub-hotel-card-img-placeholder">
                        <Building2 size={48} />
                      </div>
                    )}
                    <div className="pub-hotel-card-body">
                      {h.is_featured && (
                        <span className="ds-badge ds-badge-accent" style={{ marginBottom: ".5rem" }}>{t("مميز")}</span>
                      )}
                      {h.stars != null && (
                        <div className="pub-stars">{"★".repeat(h.stars)}{"☆".repeat(Math.max(0, 5 - h.stars))}</div>
                      )}
                      {h.avg_rating != null && h.ratings_count > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "#f59e0b", fontWeight: 700, marginBottom: ".3rem" }}>
                          <span>★ {h.avg_rating.toFixed(1)}</span>
                          <span style={{ color: "var(--color-muted)", fontWeight: 500 }}>({h.ratings_count} {t("تقييم")})</span>
                        </div>
                      )}
                      <div className="pub-hotel-card-name">{h.name}</div>
                      <div className="pub-hotel-card-loc">
                        <MapPin size={12} />
                        {[h.city, h.governorate, h.country].filter(Boolean).join("، ")}
                      </div>
                      {h.amenities?.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: ".75rem" }}>
                          {h.amenities.slice(0, 3).map(a => (
                            <span key={a} className="pub-amenity-chip">{a}</span>
                          ))}
                        </div>
                      )}
                      {h.public_description_short && (
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)",
                          marginBottom: ".75rem", lineHeight: "1.5",
                          display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {h.public_description_short}
                        </p>
                      )}
                      <div className="pub-hotel-card-footer">
                        {h.min_price != null ? (
                          <div className="pub-price">
                            {h.min_price.toLocaleString("ar")}
                            {" "}<span className="pub-price-label">{h.min_currency} / {t("ليلة")}</span>
                          </div>
                        ) : <div />}
                        <span className="ds-btn ds-btn-primary ds-btn-sm" style={{ pointerEvents: "none" }}>{t("عرض التفاصيل")}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="pub-footer">
        <div className="pub-container">
          <p>© funduqii — {t("منصة فندقي للحجز الفندقي")}</p>
        </div>
      </footer>
    </div>
  );
}

export default function HotelsPage() {
  const { t } = useLang();
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", fontFamily: "var(--font-main)" }}>
        <p style={{ color: "var(--color-muted)" }}>{t("جارٍ التحميل...")}</p>
      </div>
    }>
      <HotelsPageInner />
    </Suspense>
  );
}
