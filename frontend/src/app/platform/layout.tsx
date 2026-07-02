"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Building2, UserCog, Package, BadgeCheck,
  ClipboardList, CalendarCheck, TrendingUp, FileBarChart, Bell,
  Settings, LogOut, Menu, X, Globe,
} from "lucide-react";
import { apiUrl, getToken, getAuthHeaders, authFetch, logout as apiLogout } from "@/lib/api";
import { LangContext, makeLangCtx, readLang, applyLang, type Lang } from "@/lib/i18n/LangContext";
import SidebarBrand from "@/components/SidebarBrand";
import { fetchPublicPlatformInfo, readCachedPlatformInfo, PLATFORM_INFO_DEFAULT, type PlatformInfo } from "@/lib/platformBranding";

interface NavItem { href: string; label: string; Icon: LucideIcon; }

// ترتيب حسب الأولوية: لوحة → الكيانات (فنادق/مديرون) → المنظومة المالية
// (باقات/اشتراكات/طلبات/أرباح) → حجوزات الموقع → تحليلات (تقارير/تدقيق) → إشعارات → إعدادات.
const NAV: NavItem[] = [
  { href: "/platform",                       label: "لوحة تحكم المنصة", Icon: LayoutDashboard },
  { href: "/platform/hotels",                label: "الفنادق",          Icon: Building2 },
  { href: "/platform/managers",              label: "مديرو الفنادق",    Icon: UserCog },
  { href: "/platform/packages",              label: "الباقات",          Icon: Package },
  { href: "/platform/subscriptions",         label: "الاشتراكات",       Icon: BadgeCheck },
  { href: "/platform/subscription-requests", label: "طلبات الاشتراك",   Icon: ClipboardList },
  { href: "/platform/earnings",              label: "أرباحي",           Icon: TrendingUp },
  { href: "/platform/web-bookings",          label: "حجوزات الموقع",    Icon: CalendarCheck },
  { href: "/platform/reports",               label: "تقارير المنصة",    Icon: FileBarChart },
  { href: "/platform/notifications",         label: "إشعارات المنصة",   Icon: Bell },
  { href: "/platform/settings",              label: "إعدادات المنصة",   Icon: Settings },
];

const NOTIF_READ_KEY = "fandqi.platform.notifs.read";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [username, setUsername]   = useState("");
  const [info, setInfo]           = useState<PlatformInfo>(PLATFORM_INFO_DEFAULT);
  const [authReady, setAuthReady] = useState(false);
  const [unread, setUnread]       = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang]           = useState<Lang>(() => readLang());
  const router   = useRouter();
  const pathname = usePathname();

  const langCtx = useMemo(() => makeLangCtx(lang), [lang]);
  const t = langCtx.t;
  function toggleLang() {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    applyLang(next);
  }

  // ── هوية المنصّة الموحّدة (شعار/اسم/وصف) + تحديث فوريّ عند حفظ الإعدادات ──
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- عرض فوريّ من الكاش عند الإقلاع
    setInfo(readCachedPlatformInfo());
    fetchPublicPlatformInfo().then(setInfo).catch(() => {});
    const onInfo = (e: Event) => setInfo((e as CustomEvent).detail as PlatformInfo);
    window.addEventListener("platform-info-updated", onInfo);
    return () => window.removeEventListener("platform-info-updated", onInfo);
  }, []);

  // ── Platform notifications unread count (platform-only) ──────────────────
  const loadNotifCount = useCallback(() => {
    const token = getToken();
    if (!token) return;
    fetch(apiUrl("/platform/notifications/"), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { notifications: { id: string }[] }) => {
        let read: string[] = [];
        try { read = JSON.parse(localStorage.getItem(NOTIF_READ_KEY) ?? "[]"); } catch { /* ignore */ }
        const items = Array.isArray(d.notifications) ? d.notifications : [];
        setUnread(items.filter(n => !read.includes(n.id)).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    if (lang === "en") { document.documentElement.dir = "ltr"; document.documentElement.lang = "en"; }

    authFetch("/current-user/")
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(u => {
        if (u.role !== "platform_owner") { router.push("/login"); return; }
        setUsername(u.username ?? "");
        setAuthReady(true);
        loadNotifCount();
      })
      .catch(() => router.push("/login"));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lang read once on mount from lazy state
  }, [router, loadNotifCount]);

  // refresh notif count on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
    setMobileOpen(false);
    if (authReady) loadNotifCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const logout = async () => {
    await apiLogout();
    ["role", "hotel_id"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const avatarLetter = username ? username.charAt(0).toUpperCase() : "م";

  if (!authReady) {
    return (
      <div className="auth-loading-screen">
        <p className="text-muted">{t("جارٍ التحقق...")}</p>
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
            const active = item.href === "/platform"
              ? pathname === "/platform"
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
                {item.href === "/platform/notifications" && unread > 0 && (
                  <span className="ds-badge ds-badge-hot nav-count">{unread > 9 ? "9+" : unread}</span>
                )}
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
          <div className="topbar-title-strong">{info.name}</div>
          <p>{t("المنصة المركزية")}</p>
        </div>
        <div className="topbar-actions">
          <button className="topbar-icon-btn" onClick={toggleLang} title={lang === "ar" ? "English" : "عربي"} aria-label={lang === "ar" ? "English" : "عربي"}>
            <Globe size={22} strokeWidth={1.8} />
          </button>
          <Link
            href="/platform/notifications"
            className="topbar-icon-btn"
            title={t("إشعارات المنصة")}
            aria-label={unread > 0 ? `${t("إشعارات المنصة")} · ${unread}` : t("إشعارات المنصة")}
          >
            <Bell size={22} strokeWidth={1.8} />
            {unread > 0 && <span className="topbar-badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
          </Link>

          <div className="user-chip">
            <span className="user-chip-avatar">{avatarLetter}</span>
            <span className="user-chip-name">{username || t("المستخدم")}</span>
          </div>

          <button onClick={logout} className="ds-btn ds-btn-danger ds-btn-sm" title={t("تسجيل الخروج")}>
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
