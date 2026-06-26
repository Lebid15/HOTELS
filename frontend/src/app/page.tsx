"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/hotels/', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          if (res.status === 401) router.push('/login');
          throw new Error('Failed to fetch hotels');
        }
        const data = await res.json();
        setHotels(data);
      } catch (err) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Fandqi Central</p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-900">قائمة الفنادق</h1>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-slate-600">Next.js + Django API</div>
        </header>

        <div className="overflow-x-auto">
          {loading ? (
            <p>جارٍ التحميل...</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">الاسم</th>
                  <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">المدينة</th>
                  <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">الدولة</th>
                  <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">الحالة</th>
                  <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">آخر تحديث</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {hotels.map((hotel: any) => (
                  <tr key={hotel.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 text-base font-medium text-slate-900">{hotel.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{hotel.city}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{hotel.country}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                      {hotel.is_active ? 'مفعل' : 'متوقف'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {new Date(hotel.updated_at).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
