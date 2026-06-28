"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/platform", label: "لوحة التحكم", icon: "⊞" },
  { href: "/platform/hotels", label: "الفنادق", icon: "🏨" },
  { href: "/platform/managers", label: "مديرو الفنادق", icon: "👤" },
  { href: "/platform/packages", label: "الباقات", icon: "📦" },
  { href: "/platform/subscriptions", label: "الاشتراكات", icon: "💳" },
  { href: "/platform/subscription-requests", label: "طلبات الاشتراك", icon: "📋" },
  { href: "/platform/settings", label: "إعدادات المنصة", icon: "⚙️" },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    fetch("http://localhost:8000/api/current-user/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => setUsername(u.username))
      .catch(() => router.push("/login"));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-l border-slate-800 bg-slate-900 transition-all duration-200 ${
          sidebarOpen ? "w-56" : "w-16"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold">
            ف
          </span>
          {sidebarOpen && (
            <div>
              <p className="text-sm font-semibold text-white">فندقي</p>
              <p className="text-xs text-slate-400">صاحب المنصة</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2 pt-3">
          {NAV.map((item) => {
            const active =
              item.href === "/platform"
                ? pathname === "/platform"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="shrink-0 text-base">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="border-t border-slate-800 p-4 text-xs text-slate-500 hover:text-white text-right"
        >
          {sidebarOpen ? "◀ طي" : "▶"}
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
          <p className="text-xs uppercase tracking-widest text-slate-400">Fandqi Central</p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{username}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
