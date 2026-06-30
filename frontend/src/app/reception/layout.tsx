"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, KeyRound, CalendarCheck, CreditCard,
  LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { apiUrl, getToken, clearTokens } from "@/lib/api";

interface NavItem { href: string; label: string; Icon: LucideIcon; }

const NAV: NavItem[] = [
  { href: "/reception",              label: "لوحة التحكم",         Icon: LayoutDashboard },
  { href: "/reception/check-in-out", label: "الاستقبال والمغادرة", Icon: KeyRound },
  { href: "/reception/reservations", label: "الحجوزات",            Icon: CalendarCheck },
  { href: "/reception/payments",     label: "المدفوعات",           Icon: CreditCard },
];

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const [username,  setUsername]  = useState("");
  const [hotelName, setHotelName] = useState("فندقي");
  const [compact,   setCompact]   = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }

    fetch(apiUrl("/current-user/"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(u => {
        if (u.role !== "reception") { router.push("/login"); return; }
        setUsername(u.username ?? "");
        if (u.hotel_name) setHotelName(u.hotel_name);
        if (u.hotel_id)   localStorage.setItem("hotel_id", String(u.hotel_id));
        setAuthReady(true);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const logout = () => {
    clearTokens();
    ["role", "hotel_id"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const avatarLetter = username ? username.charAt(0).toUpperCase() : "ر";

  if (!authReady) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--layout-bg)", backgroundAttachment:"fixed" }}>
        <p style={{ color:"var(--color-muted)", fontSize:14, fontWeight:600 }}>جارٍ التحقق...</p>
      </div>
    );
  }

  return (
    <div className={`app-shell${compact ? " sidebar-compact" : ""}`} dir="rtl">

      <aside className={`sidebar${compact ? " compact" : ""}`} aria-label="القائمة الرئيسية">
        <div className="sidebar-header">
          <div className="sidebar-brand-mark">{avatarLetter}</div>
          {!compact && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="sidebar-brand-title">{hotelName}</p>
              <p className="sidebar-brand-sub">موظف استقبال</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="تنقل">
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
              >
                <span className="nav-icon"><item.Icon size={20} strokeWidth={1.8} /></span>
                {!compact && <span className="nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-toggle" onClick={() => setCompact(c => !c)}>
            {compact
              ? <ChevronLeft size={16} />
              : <><ChevronRight size={16} /><span>طي القائمة</span></>
            }
          </button>
        </div>
      </aside>

      <header className="topbar" role="banner">
        <div className="topbar-title">
          <h1>الاستقبال</h1>
          <p>{hotelName}</p>
        </div>
        <div className="topbar-actions">
          <div className="user-chip">
            <span className="user-chip-avatar">{avatarLetter}</span>
            <span className="user-chip-name">{username || "المستخدم"}</span>
          </div>
          <button onClick={logout} className="ds-btn ds-btn-neutral ds-btn-sm">
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
