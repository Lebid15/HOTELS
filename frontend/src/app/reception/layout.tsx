"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, KeyRound, CalendarCheck, CreditCard,
  LogOut, Globe, Menu, X,
} from "lucide-react";
import { getToken, authFetch, logout as apiLogout } from "@/lib/api";
import { LangContext, makeLangCtx, readLang, applyLang, type Lang } from "@/lib/i18n/LangContext";
import SidebarBrand from "@/components/SidebarBrand";
import { fetchPublicPlatformInfo, readCachedPlatformInfo, PLATFORM_INFO_DEFAULT, type PlatformInfo } from "@/lib/platformBranding";

interface NavItem { href: string; label: string; Icon: LucideIcon; }

// ترتيب منطقيّ للاستقبال: لوحة → الحجوزات (البيانات) → الاستقبال والمغادرة (الإجراء اليوميّ) → المدفوعات.
const NAV: NavItem[] = [
  { href: "/reception",              label: "لوحة التحكم",         Icon: LayoutDashboard },
  { href: "/reception/reservations", label: "الحجوزات",            Icon: CalendarCheck },
  { href: "/reception/check-in-out", label: "الاستقبال والمغادرة", Icon: KeyRound },
  { href: "/reception/payments",     label: "المدفوعات",           Icon: CreditCard },
];

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const [username,  setUsername]  = useState("");
  const [hotelName, setHotelName] = useState("فندقي");
  const [info,      setInfo]      = useState<PlatformInfo>(PLATFORM_INFO_DEFAULT);
  const [authReady, setAuthReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang,      setLang]      = useState<Lang>(() => readLang());
  const router   = useRouter();
  const pathname = usePathname();

  const langCtx = useMemo(() => makeLangCtx(lang), [lang]);
  const t = langCtx.t;

  function toggleLang() {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    applyLang(next);
  }

  // ── هوية المنصّة الموحّدة أعلى السايدبار (شعار/اسم/وصف) + تحديث فوريّ ──
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- عرض فوريّ من الكاش عند الإقلاع
    setInfo(readCachedPlatformInfo());
    fetchPublicPlatformInfo().then(setInfo).catch(() => {});
    const onInfo = (e: Event) => setInfo((e as CustomEvent).detail as PlatformInfo);
    window.addEventListener("platform-info-updated", onInfo);
    return () => window.removeEventListener("platform-info-updated", onInfo);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    if (lang === "en") { document.documentElement.dir = "ltr"; document.documentElement.lang = "en"; }

    authFetch("/current-user/")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(u => {
        if (u.role !== "reception") { router.push("/login"); return; }
        setUsername(u.username ?? "");
        if (u.hotel_name) setHotelName(u.hotel_name);
        if (u.hotel_id)   localStorage.setItem("hotel_id", String(u.hotel_id));
        setAuthReady(true);
      })
      .catch(() => router.push("/login"));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lang read once on mount from lazy state
  }, [router]);

  // إغلاق الدُرج عند التنقل
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- إغلاق الدُرج عند تغيّر المسار
    setMobileOpen(false);
  }, [pathname]);

  const logout = async () => {
    await apiLogout();
    ["role", "hotel_id"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const avatarLetter = username ? username.charAt(0).toUpperCase() : "ر";

  if (!authReady) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--layout-bg)", backgroundAttachment:"fixed" }}>
        <p style={{ color:"var(--color-muted)", fontSize:14, fontWeight:600 }}>{t("جارٍ التحقق...")}</p>
      </div>
    );
  }

  return (
    <LangContext.Provider value={langCtx}>
    <div className="app-shell" dir={langCtx.dir}>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside className={`sidebar${mobileOpen ? " drawer-open" : ""}`} aria-label={t("القائمة الرئيسية")}>
        <SidebarBrand logo={info.logo} name={info.name} description={info.description} />

        <nav className="sidebar-nav" aria-label={t("تنقل")}>
          {NAV.map(item => {
            const active = item.href === "/reception"
              ? pathname === "/reception"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-icon"><item.Icon size={20} strokeWidth={1.8} /></span>
                <span className="nav-label">{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="topbar" role="banner">
        <button
          className="topbar-hamburger"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? t("إغلاق القائمة") : t("فتح القائمة")}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
        </button>
        <div className="topbar-title">
          <h1>{t("الاستقبال")}</h1>
          <p>{hotelName}</p>
        </div>
        <div className="topbar-actions">
          <button className="topbar-icon-btn" onClick={toggleLang} title={lang === "ar" ? "English" : "عربي"} aria-label={lang === "ar" ? "English" : "عربي"}>
            <Globe size={22} strokeWidth={1.8} />
          </button>
          <div className="user-chip">
            <span className="user-chip-avatar">{avatarLetter}</span>
            <span className="user-chip-name">{username || t("المستخدم")}</span>
          </div>
          <button onClick={logout} className="ds-btn ds-btn-neutral ds-btn-sm">
            <LogOut size={16} strokeWidth={2} />
            <span>{t("خروج")}</span>
          </button>
        </div>
      </header>

      <main className="page-shell" role="main">
        {children}
      </main>
    </div>
    </LangContext.Provider>
  );
}
