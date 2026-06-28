"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReceptionDashboard() {
  const [username, setUsername] = useState("");
  const router = useRouter();

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
    <main className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Fandqi Central</p>
          <h1 className="text-lg font-semibold text-slate-800">لوحة موظف الاستقبال</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{username}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { label: "تسجيلات الوصول اليوم", value: "—" },
            { label: "تسجيلات المغادرة اليوم", value: "—" },
            { label: "الحجوزات المعلقة", value: "—" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-500 text-sm">
            هذه لوحة موظف الاستقبال — ستظهر هنا الحجوزات القادمة وطلبات الضيوف.
          </p>
        </div>
      </div>
    </main>
  );
}
