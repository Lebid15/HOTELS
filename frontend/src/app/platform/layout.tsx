"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Building2, UserCog, Package, BadgeCheck,
  ClipboardList, CalendarCheck, TrendingUp, FileBarChart, Bell,
  Settings, LogOut, ChevronLeft, ChevronRight, Menu, X,
} from "lucide-react";
import { apiUrl, getToken, getAuthHeaders, clearTokens } from "@/lib/api";

interface NavItem { href: string; label: string; Icon: LucideIcon; }

const NAV: NavItem[] = [
  { href: "/platform",                       label: "لوحة تحكم المنصة", Icon: LayoutDashboard },
  { href: "/platform/hotels",                label: "الفنادق",          Icon: Building2 },
  { href: "/platform/managers",              label: "مديرو الفنادق",    Icon: UserCog },
  { href: "/platform/packages",              label: "الباقات",          Icon: Package },
  { href: "/platform/subscriptions",         label: "الاشتراكات",       Icon: BadgeCheck },
  { href: "/platform/subscription-requests", label: "طلبات الاشتراك",   Icon: ClipboardList },
  { href: "/platform/web-bookings",          label: "حجوزات الموقع",    Icon: CalendarCheck },
  { href: "/platform/earnings",              label: "أرباحي",           Icon: TrendingUp },
  { href: "/platform/reports",               label: "تقارير المنصة",    Icon: FileBarChart },
  { href: "/platform/notifications",         label: "إشعارات المنصة",   Icon: Bell },
  { href: "/platform/settings",              label: "إعدادات المنصة",   Icon: Settings },
];

const PLATFORM_KEY = "fandqi.platform";
const NOTIF_READ_KEY = "fandqi.platform.notifs.read";

interface Branding { platformName: string; platformSubtitle: string; platformLogo: string; }

function readBranding(): Branding {
  const fallback: Branding = { platformName: "Fandqi", platformSubtitle: "نظام إدارة الفنادق", platformLogo: "" };
  if (typeof window === "undefined") return fallback;
  try {
    const p = JSON.parse(localStorage.getItem(PLATFORM_KEY) ?? "{}");
    return {
      platformName: p.platformName || fallback.platformName,
      platformSubtitle: p.platformSubtitle || fallback.platformSubtitle,
      platformLogo: p.platformLogo || "",
    };
  } catch { return fallback; }
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [username, setUsername]   = useState("");
  const [branding, setBranding]   = useState<Branding>({ platformName: "Fandqi", platformSubtitle: "نظام إدارة الفنادق", platformLogo: "" });
  const [compact, setCompact]     = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [unread, setUnread]       = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

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
    setBranding(readBranding());

    fetch(apiUrl("/current-user/"), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(u => {
        if (u.role !== "platform_owner") { router.push("/login"); return; }
        setUsername(u.username ?? "");
        setAuthReady(true);
        loadNotifCount();
      })
      .catch(() => router.push("/login"));
  }, [router, loadNotifCount]);

  // refresh branding + notif count on navigation
  useEffect(() => {
    setMobileOpen(false);
    setBranding(readBranding());
    if (authReady) loadNotifCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const logout = () => {
    clearTokens();
    ["role", "hotel_id"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const platformLetter = branding.platformName ? branding.platformName.charAt(0).toUpperCase() : "F";
  const avatarLetter   = username ? username.charAt(0).toUpperCase() : "م";

  if (!authReady) {
    return (
      <div className="auth-loading-screen">
        <p className="text-muted">جارٍ التحقق...</p>
      </div>
    );
  }

  return (
    <div className={`app-shell${compact ? " sidebar-compact" : ""}`} dir="rtl">

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside className={`sidebar${compact ? " compact" : ""}${mobileOpen ? " drawer-open" : ""}`} aria-label="القائمة الرئيسية">
        <div className="sidebar-header">
          {branding.platformLogo ? (
            <span className="pf-logo-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={branding.platformLogo} alt={branding.platformName} />
            </span>
          ) : (
            <div className="sidebar-brand-mark">{platformLetter}</div>
          )}
          {!compact && (
            <div className="sidebar-brand-meta">
              <p className="sidebar-brand-title">{branding.platformName}</p>
              <p className="sidebar-brand-sub">صاحب المنصة</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="تنقل">
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
                {!compact && <span className="nav-label">{item.label}</span>}
                {!compact && item.href === "/platform/notifications" && unread > 0 && (
                  <span className="ds-badge ds-badge-hot nav-count">{unread > 9 ? "9+" : unread}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-toggle" onClick={() => setCompact(c => !c)}
            aria-label={compact ? "توسيع القائمة" : "طي القائمة"}>
            {compact
              ? <ChevronLeft size={16} />
              : <><ChevronRight size={16} /><span>طي القائمة</span></>
            }
          </button>
        </div>
      </aside>

      <header className="topbar" role="banner">
        <button
          className="topbar-hamburger"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
        </button>
        <div className="topbar-title">
          <div className="topbar-title-strong">{branding.platformName}</div>
          <p>المنصة المركزية</p>
        </div>
        <div className="topbar-actions">
          <Link
            href="/platform/notifications"
            className="topbar-icon-btn"
            title="إشعارات المنصة"
            aria-label={unread > 0 ? `إشعارات المنصة · ${unread}` : "إشعارات المنصة"}
          >
            <Bell size={22} strokeWidth={1.8} />
            {unread > 0 && <span className="topbar-badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
          </Link>

          <div className="user-chip">
            <span className="user-chip-avatar">{avatarLetter}</span>
            <span className="user-chip-name">{username || "المستخدم"}</span>
          </div>

          <button onClick={logout} className="ds-btn ds-btn-neutral ds-btn-sm" title="تسجيل الخروج">
            <LogOut size={16} strokeWidth={2} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      <main className="page-shell" role="main">
        {children}
      </main>
    </div>
  );
}
