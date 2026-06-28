"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  hotels_total: number;
  hotels_active: number;
  hotels_suspended: number;
  packages_active: number;
  subscriptions_active: number;
  subscriptions_ending_soon: number;
  subscriptions_expired: number;
  subscription_requests_pending: number;
}

function StatCard({
  label,
  value,
  note,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  note?: string;
  href?: string;
  accent?: string;
}) {
  const inner = (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-colors ${
        href ? "hover:border-indigo-600/50 cursor-pointer" : ""
      }`}
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold ${accent ?? "text-white"}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function PlatformDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("http://localhost:8000/api/platform/stats/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-slate-400">
          ملخص ذكي لحالة المنصة بناءً على الفنادق والباقات والاشتراكات الحالية.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400">جارٍ التحميل...</p>
      ) : stats ? (
        <>
          {/* Hotels */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">الفنادق</p>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="إجمالي الفنادق" value={stats.hotels_total} note="اضغط لعرض الكل" href="/platform/hotels" />
            <StatCard label="فنادق فعالة" value={stats.hotels_active} accent="text-emerald-400" note="اضغط لعرض الفعالة" href="/platform/hotels?status=active" />
            <StatCard label="فنادق موقوفة" value={stats.hotels_suspended} accent={stats.hotels_suspended > 0 ? "text-amber-400" : "text-white"} href="/platform/hotels?status=suspended" />
          </div>

          {/* Subscriptions */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">الاشتراكات</p>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="باقات فعالة" value={stats.packages_active} href="/platform/packages" />
            <StatCard label="اشتراكات فعالة" value={stats.subscriptions_active} accent="text-emerald-400" href="/platform/subscriptions" />
            <StatCard label="تنتهي قريبًا" value={stats.subscriptions_ending_soon} accent={stats.subscriptions_ending_soon > 0 ? "text-amber-400" : "text-white"} note="خلال 7 أيام" href="/platform/subscriptions?status=ending" />
            <StatCard label="اشتراكات منتهية" value={stats.subscriptions_expired} accent={stats.subscriptions_expired > 0 ? "text-red-400" : "text-white"} href="/platform/subscriptions?status=expired" />
          </div>

          {/* Quick actions */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">اختصارات سريعة</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { href: "/platform/hotels", label: "إضافة فندق", note: "فتح نموذج فندق جديد" },
              { href: "/platform/packages", label: "إضافة باقة", note: "إنشاء باقة اشتراك" },
              { href: "/platform/subscription-requests", label: `طلبات الاشتراك (${stats.subscription_requests_pending})`, note: "طلبات بانتظار موافقتك" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-600/50 transition-colors"
              >
                <p className="text-sm font-medium text-white">{a.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{a.note}</p>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p className="text-red-400">تعذر تحميل الإحصائيات</p>
      )}
    </div>
  );
}
