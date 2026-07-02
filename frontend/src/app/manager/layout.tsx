"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LangContext, makeLangCtx } from "./LangContext";
import { apiUrl, getToken, authFetch, logout as apiLogout } from "@/lib/api";
import { hydrateHotelCache } from "@/lib/hotel";
import {
  LayoutDashboard, CalendarCheck, Building2, Users, ArrowRightLeft,
  Utensils, CreditCard, BarChart3, UserCog,
  PackageCheck, Settings, Bell, Globe, Menu, X, LogOut,
  Receipt, Moon, BookOpen, ClipboardCheck, BellRing, ScrollText,
} from "lucide-react";

// ─── Navigation definition ────────────────────────────────────────────────────
// Ordered per spec. Notifications intentionally absent (accessed via bell only).
interface NavItem { href: string; label: string; Icon: LucideIcon; foodOnly?: true; activeOn?: string[]; }

const NAV: NavItem[] = [
  { href: "/manager",                label: "لوحة التحكم",        Icon: LayoutDashboard },
  { href: "/manager/reservations",   label: "الحجوزات",           Icon: CalendarCheck },
  { href: "/manager/rooms",          label: "الغرف والطوابق",     Icon: Building2 },
  { href: "/manager/guests",         label: "النزلاء",            Icon: Users },
  { href: "/manager/check-in-out",   label: "الدخول والمغادرة",   Icon: ArrowRightLeft },
  { href: "/manager/food-services",  label: "المطعم والكافتريا",    Icon: Utensils, foodOnly: true },
  { href: "/manager/housekeeping",   label: "خدمة الغرف",           Icon: BellRing,
    activeOn: ["/manager/maintenance", "/manager/lost-found"] },
  { href: "/manager/folio",          label: "فوليو الغرفة",          Icon: BookOpen },
  { href: "/manager/payments",       label: "المدفوعات",             Icon: CreditCard },
  { href: "/manager/expenses",       label: "المصاريف",              Icon: Receipt },
  { href: "/manager/night-audit",    label: "التدقيق الليلي",        Icon: Moon },
  { href: "/manager/shift-handover", label: "تسليم الوردية",         Icon: ClipboardCheck },
  { href: "/manager/reports",        label: "التقارير",              Icon: BarChart3 },
  { href: "/manager/audit",          label: "سجلّ التدقيق",          Icon: ScrollText },
  { href: "/manager/staff",           label: "الموظفون",             Icon: UserCog },
  { href: "/manager/subscription",   label: "الاشتراك والباقات",  Icon: PackageCheck },
  { href: "/manager/hotel-settings", label: "الإعدادات",          Icon: Settings },
  // د‑2: أُزيل «حجوزات الموقع» كعنصر مستقل — يُوصَل إليها عبر فلتر «مصدر الحجز» داخل صفحة الحجوزات.
];

const UNREAD_KEY   = "fandqi.notifications.unread.v1";
const SETTINGS_KEY = (hid: string) => `fandqi.settings.${hid}`;
const PLATFORM_KEY = "fandqi.platform";
const LANG_KEY     = "fandqi.lang";

// ─── Nav translations ─────────────────────────────────────────────────────────
const NAV_LABELS: Record<string, { ar: string; en: string }> = {
  "/manager":                { ar: "لوحة التحكم",       en: "Dashboard" },
  "/manager/reservations":   { ar: "الحجوزات",          en: "Reservations" },
  "/manager/rooms":          { ar: "الغرف والطوابق",    en: "Rooms & Floors" },
  "/manager/guests":         { ar: "النزلاء",           en: "Guests" },
  "/manager/check-in-out":   { ar: "الدخول والمغادرة",  en: "Check-in / Out" },
  "/manager/food-services":  { ar: "المطعم والكافتريا", en: "Restaurant" },
  "/manager/housekeeping":   { ar: "خدمة الغرف",        en: "Room Services" },
  "/manager/folio":          { ar: "فوليو الغرفة",      en: "Room Folio" },
  "/manager/payments":       { ar: "المدفوعات",         en: "Payments" },
  "/manager/expenses":       { ar: "المصاريف",          en: "Expenses" },
  "/manager/night-audit":     { ar: "التدقيق الليلي",       en: "Night Audit" },
  "/manager/lost-found":     { ar: "المفقودات والموجودات", en: "Lost & Found" },
  "/manager/shift-handover": { ar: "تسليم الوردية",        en: "Shift Handover" },
  "/manager/reports":         { ar: "التقارير",              en: "Reports" },
  "/manager/audit":          { ar: "سجلّ التدقيق",          en: "Audit Log" },
  "/manager/staff":           { ar: "الموظفون",              en: "Staff" },
  "/manager/subscription":   { ar: "الاشتراك والباقات", en: "Subscription" },
  "/manager/hotel-settings": { ar: "الإعدادات",         en: "Settings" },
  "/manager/web-bookings":   { ar: "حجوزات الموقع",    en: "Web Bookings" },
};

const UI: Record<string, { ar: string; en: string }> = {
  hotelFallback:   { ar: "اسم الفندق غير محدد",  en: "Hotel name not set" },
  panelSub:        { ar: "لوحة إدارة الفندق",    en: "Hotel Management" },
  manager:         { ar: "مدير الفندق",           en: "Hotel Manager" },
  collapse:        { ar: "طي القائمة",            en: "Collapse" },
  expand:          { ar: "توسيع القائمة",         en: "Expand" },
  notifications:   { ar: "الإشعارات",             en: "Notifications" },
  logout:          { ar: "خروج",                  en: "Logout" },
  openMenu:        { ar: "فتح القائمة",           en: "Open menu" },
  closeMenu:       { ar: "إغلاق القائمة",         en: "Close menu" },
  mainMenu:        { ar: "القائمة الرئيسية",      en: "Main Menu" },
  navigation:      { ar: "تنقل",                  en: "Navigation" },
  hotelLogo:       { ar: "شعار الفندق",           en: "Hotel Logo" },
  userFallback:    { ar: "المستخدم",              en: "User" },
  switchToEnglish: { ar: "English",               en: "عربي" },
  mgmtSystem:      { ar: "نظام إدارة الفنادق",    en: "Hotel Management System" },
};

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  // User & hotel
  const [username,         setUsername]         = useState("");
  const [displayName,      setDisplayName]      = useState("");        // الاسم الكامل للمدير (إن وُجد)
  const [userAvatar,       setUserAvatar]       = useState<string | null>(null); // الصورة الشخصية
  const [hotelName,        setHotelName]        = useState("");
  const [ownerName,        setOwnerName]        = useState("");
  const [hotelLogo,        setHotelLogo]        = useState<string | null>(null);
  // Platform branding (sidebar)
  const [platformName,     setPlatformName]     = useState("funduqii");
  const [platformSubtitle, setPlatformSubtitle] = useState("نظام إدارة الفنادق");
  // Shell state
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [unreadNotifs,     setUnreadNotifs]     = useState(0);
  const [showFoodServices, setShowFoodServices] = useState(true);
  const [lang,             setLang]             = useState<"ar"|"en">(() => {
    if (typeof window === "undefined") return "ar";
    return (localStorage.getItem(LANG_KEY) as "ar"|"en"|null) === "en" ? "en" : "ar";
  });
  const [authReady,        setAuthReady]        = useState(false);

  const t = (key: string) => UI[key]?.[lang] ?? UI[key]?.ar ?? key;
  const navLabel = (href: string) => NAV_LABELS[href]?.[lang] ?? NAV_LABELS[href]?.ar ?? href;

  function toggleLang() {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.dir  = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
  }

  const router   = useRouter();
  const pathname = usePathname();

  // تحديث فوريّ لشعار/اسم الفندق في التوب بار عند حفظه في صفحة الإعدادات (بلا إعادة تحميل)
  useEffect(() => {
    const onIdentity = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      if ("logo" in d) setHotelLogo(d.logo || null);
      if (d.name) setHotelName(d.name);
      if ("ownerName" in d) setOwnerName(d.ownerName || "");
    };
    window.addEventListener("hotel-identity-updated", onIdentity);
    return () => window.removeEventListener("hotel-identity-updated", onIdentity);
  }, []);

  // تحديث فوريّ للصورة الشخصية واسم المدير في التوب بار عند حفظه في الملف الشخصي
  useEffect(() => {
    const onUser = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      if ("avatar" in d) setUserAvatar(d.avatar || null);
      if ("name" in d)   setDisplayName((d.name || "").trim());
    };
    window.addEventListener("user-profile-updated", onUser);
    return () => window.removeEventListener("user-profile-updated", onUser);
  }, []);

  // ── Auth + hotel identity ────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }

    // Apply lang direction (lang is already initialized from localStorage via lazy useState)
    if (lang === "en") {
      document.documentElement.dir  = "ltr";
      document.documentElement.lang = "en";
    }

    // Read platform branding immediately (no network needed)
    const loadBranding = async () => {
      try {
        const pRaw = localStorage.getItem(PLATFORM_KEY);
        if (pRaw) {
          const p = JSON.parse(pRaw);
          if (p.platformName)     setPlatformName(p.platformName);
          if (p.platformSubtitle) setPlatformSubtitle(p.platformSubtitle);
        }
      } catch { /* ignore */ }
    };
    loadBranding();

    authFetch("/current-user/")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(u => {
        if (u.role !== "manager") { router.push("/login"); return; }
        setUsername(u.username ?? "");
        setUserAvatar(u.avatar || null);
        setDisplayName([u.first_name, u.last_name].filter(Boolean).join(" ").trim());
        if (u.hotel_name) setHotelName(u.hotel_name);

        if (u.hotel_id) {
          const hid = String(u.hotel_id);
          localStorage.setItem("hotel_id", hid);
          localStorage.setItem("role", u.role);

          // Read hotel identity + food flags from localStorage cache (fast, sync)
          try {
            const sRaw = localStorage.getItem(SETTINGS_KEY(hid));
            if (sRaw) {
              const s = JSON.parse(sRaw);
              if (s.identity?.name)      setHotelName(s.identity.name);
              if (s.identity?.ownerName) setOwnerName(s.identity.ownerName);
              if (s.identity?.logo)      setHotelLogo(s.identity.logo);
              const r = s.rest;
              if (r && !r.hasRestaurant && !r.hasCafeteria && !r.hasRoomService) {
                setShowFoodServices(false);
              }
            }
          } catch { /* ignore */ }

          // Backend Hotel record is the source of truth: refresh the local
          // settings cache (currency + identity) so it stays in sync across devices.
          authFetch(`/hotels/${hid}/`)
            .then(r => (r.ok ? r.json() : null))
            .then(h => {
              if (!h) return;
              hydrateHotelCache(hid, h);
              if (h.name)         setHotelName(h.name);
              if (h.owner_name)   setOwnerName(h.owner_name);
              if (h.logo != null) setHotelLogo(h.logo || null);
            })
            .catch(() => {});

          // ── Compute notification count from live API data ──────────
          const authH = { Authorization: `Bearer ${token}` };
          const today = new Date().toISOString().split("T")[0];
          Promise.all([
            fetch(apiUrl(`/reservations/?hotel=${hid}`), { headers: authH }).then(r => r.ok ? r.json() : []),
            fetch(apiUrl(`/maintenance/?hotel=${hid}`),  { headers: authH }).then(r => r.ok ? r.json() : []),
          ]).then(([resList, maintList]) => {
            const res  = Array.isArray(resList)  ? resList  : (resList.results  ?? []);
            const maint= Array.isArray(maintList) ? maintList: (maintList.results?? []);
            let count = 0;
            // Arrivals today (confirmed, check_in = today)
            count += res.filter((r: {status:string;check_in_date:string}) =>
              r.status === "confirmed" && r.check_in_date === today).length;
            // Departures today (checked_in, check_out = today)
            count += res.filter((r: {status:string;check_out_date:string}) =>
              r.status === "checked_in" && r.check_out_date === today).length;
            // Balance due (checked_in with remaining > 0)
            count += res.filter((r: {status:string;total:string|number;paid:string|number}) =>
              r.status === "checked_in" && (Number(r.total) - Number(r.paid)) > 0).length;
            // Open maintenance tickets
            count += maint.filter((t: {status:string}) =>
              ["open","in_progress","waiting_parts"].includes(t.status)).length;
            // Food orders pending
            try {
              const fo = JSON.parse(localStorage.getItem(`fandqi.foodOrders.${hid}`) ?? "[]");
              count += (fo as {status:string}[]).filter(o => o.status === "pending" || o.status === "preparing").length;
            } catch { /* ignore */ }
            localStorage.setItem(UNREAD_KEY, String(count));
            setUnreadNotifs(count);
            window.dispatchEvent(new Event("fandqi:notif-update"));
          }).catch(() => {});
        }
        setAuthReady(true);
      })
      .catch(() => router.push("/login"));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lang is read once on mount from lazy useState; re-running auth on lang change is undesired
  }, [router]);

  // ── Unread notifications counter (localStorage bridge) ───────────────────
  useEffect(() => {
    const sync = () => {
      const v = parseInt(localStorage.getItem(UNREAD_KEY) ?? "0", 10);
      setUnreadNotifs(isNaN(v) ? 0 : v);
    };
    sync();
    window.addEventListener("fandqi:notif-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("fandqi:notif-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // ── Close mobile drawer on navigation ───────────────────────────────────
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional UI reset on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    await apiLogout();
    ["role", "hotel_id"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  // ── Filter nav by feature flags ──────────────────────────────────────────
  const visibleNav = NAV.filter(item => !item.foodOnly || showFoodServices);

  // ── Avatar / brand letters ───────────────────────────────────────────────
  const userLabel      = (displayName || username).trim();
  const avatarLetter   = userLabel ? userLabel.charAt(0).toUpperCase() : "م";
  const platformLetter = platformName ? platformName.charAt(0).toUpperCase() : "F";

  // ─────────────────────────────────────────────────────────────────────────
  const langCtx = useMemo(() => makeLangCtx(lang), [lang]);

  // Block render until auth check is complete — prevents momentary content flash
  if (!authReady) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh",
        background:"var(--layout-bg)", backgroundAttachment:"fixed" }}>
        <p style={{ color:"var(--color-muted,#94a3b8)", fontSize:14, fontWeight:600 }}>
          {lang === "en" ? "Verifying access..." : "جارٍ التحقق من الصلاحيات..."}
        </p>
      </div>
    );
  }

  return (
    <LangContext.Provider value={langCtx}>
    <div className="app-shell" dir={langCtx.dir}>

      {/* ── Mobile overlay (behind open drawer) ─────────────────────────── */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
           SIDEBAR  — shows PLATFORM branding (not hotel identity)
         ════════════════════════════════════════════════════════════════ */}
      <aside
        className={["sidebar", mobileOpen ? "drawer-open" : ""].filter(Boolean).join(" ")}
        aria-label={t("mainMenu")}
      >
        {/* ── Brand area: platform identity ─────────────────────────── */}
        <div className="sidebar-header">
          <div className="sidebar-brand-mark manager">{platformLetter}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="sidebar-brand-title">{platformName}</p>
            <p className="sidebar-brand-sub">{platformSubtitle || t("mgmtSystem")}</p>
          </div>
        </div>

        {/* ── Navigation ────────────────────────────────────────────── */}
        <nav className="sidebar-nav" aria-label={t("navigation")}>
          {visibleNav.map(item => {
            const isActive = item.href === "/manager"
              ? pathname === "/manager"
              : pathname.startsWith(item.href) ||
                (item.activeOn?.some(p => pathname.startsWith(p)) ?? false);
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item${isActive ? " active-mgr" : ""}`}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? "page" : undefined}>
                <span className="nav-icon"><item.Icon size={20} strokeWidth={1.8} /></span>
                <span className="nav-label">{navLabel(item.href)}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* ══════════════════════════════════════════════════════════════════
           TOPBAR  — shows HOTEL identity + user actions
         ════════════════════════════════════════════════════════════════ */}
      <header className="topbar" role="banner">
        {/* Mobile hamburger ──────────────────────────────────────── */}
        <button
          className="topbar-hamburger"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={mobileOpen}
        >
          {mobileOpen
            ? <X size={22} strokeWidth={2} />
            : <Menu size={22} strokeWidth={2} />
          }
        </button>

        {/* Hotel logo + name + owner ─────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          {hotelLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded logo from localStorage; next/image requires configured external domains
            <img
              src={hotelLogo}
              alt={t("hotelLogo")}
              className="topbar-hotel-logo"
            />
          ) : (
            <span className="topbar-hotel-icon">
              <Building2 size={26} strokeWidth={1.6} />
            </span>
          )}
          <div className="topbar-title">
            <h1>{hotelName || t("hotelFallback")}</h1>
            <p>{ownerName || t("panelSub")}</p>
          </div>
        </div>

        {/* Actions strip ─────────────────────────────────────────── */}
        <div className="topbar-actions">

          {/* Language toggle — single click AR ↔ EN */}
          <button
            className="topbar-icon-btn"
            title={t("switchToEnglish")}
            aria-label={t("switchToEnglish")}
            onClick={toggleLang}
          >
            <Globe size={22} strokeWidth={1.8} />
          </button>

          {/* Notifications bell */}
          <Link
            href="/manager/notifications"
            className="topbar-icon-btn"
            title={t("notifications")}
            aria-label={unreadNotifs > 0 ? `${t("notifications")} · ${unreadNotifs}` : t("notifications")}
          >
            <Bell size={22} strokeWidth={1.8} />
            {unreadNotifs > 0 && (
              <span className="topbar-badge" aria-hidden="true">
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </span>
            )}
          </Link>

          {/* User chip → الملف الشخصي (د‑6/16) */}
          <Link href="/manager/profile" className="user-chip" title={t("الملف الشخصي")} style={{ textDecoration: "none", color: "inherit" }}>
            <span className="user-chip-avatar">
              {userAvatar
                /* eslint-disable-next-line @next/next/no-img-element -- صورة شخصية data-url صغيرة */
                ? <img src={userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : avatarLetter}
            </span>
            <span className="user-chip-name">{userLabel || t("userFallback")}</span>
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            className="ds-btn ds-btn-neutral ds-btn-sm"
            title={t("logout")}
            aria-label={t("logout")}
          >
            <LogOut size={16} strokeWidth={2} />
            <span>{t("logout")}</span>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
           CONTENT AREA
         ════════════════════════════════════════════════════════════════ */}
      <main className="page-shell" role="main">
        {children}
      </main>
    </div>
    </LangContext.Provider>
  );
}
