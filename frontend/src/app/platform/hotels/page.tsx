"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Hotel {
  id: number;
  name: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  status: string;
  floors_count: number;
  manager_name: string;
  manager_email: string;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  active: "فعال",
  suspended: "موقوف",
  archived: "مؤرشف",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  suspended: "bg-amber-500/10 text-amber-400",
  archived: "bg-slate-500/10 text-slate-400",
};

function apiHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  };
}

const EMPTY: Partial<Hotel> = {
  name: "", country: "", city: "", address: "",
  phone: "", email: "", status: "active",
  floors_count: 1, manager_name: "", manager_email: "",
};

export default function HotelsPage() {
  const searchParams = useSearchParams();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [form, setForm] = useState<Partial<Hotel>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("http://localhost:8000/api/hotels/", { headers: apiHeaders() })
      .then((r) => r.json())
      .then(setHotels)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visible = hotels.filter((h) => {
    const matchSearch = !search || h.name.includes(search) || h.manager_name.includes(search) || h.city.includes(search);
    const matchStatus = !statusFilter || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setForm(EMPTY); setError(""); setModal("add"); };
  const openEdit = (h: Hotel) => { setForm({ ...h }); setError(""); setModal("edit"); };
  const openView = (h: Hotel) => { setForm({ ...h }); setModal("view"); };

  const save = async () => {
    if (!form.name?.trim()) { setError("اسم الفندق مطلوب"); return; }
    setSaving(true); setError("");
    try {
      const method = modal === "add" ? "POST" : "PUT";
      const url = modal === "add"
        ? "http://localhost:8000/api/hotels/"
        : `http://localhost:8000/api/hotels/${form.id}/`;
      const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      setModal(null);
      load();
    } catch {
      setError("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (hotel: Hotel, newStatus: string) => {
    await fetch(`http://localhost:8000/api/hotels/${hotel.id}/set_status/`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الفنادق</h1>
          <p className="mt-1 text-sm text-slate-400">إدارة الفنادق المسجلة على المنصة.</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          + إضافة فندق جديد
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم الفندق أو المدير أو المدينة"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">كل الحالات</option>
          <option value="active">فعال</option>
          <option value="suspended">موقوف</option>
          <option value="archived">مؤرشف</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-400">جارٍ التحميل...</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-slate-400">لا توجد فنادق.</p>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="border-b border-slate-800 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">اسم الفندق</th>
                <th className="px-4 py-3">الدولة / المدينة</th>
                <th className="px-4 py-3">مدير الفندق</th>
                <th className="px-4 py-3">الاشتراك</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((h) => (
                <tr key={h.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-white">{h.name}</td>
                  <td className="px-4 py-3 text-slate-400">{[h.country, h.city].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{h.manager_name || "—"}</td>
                  <td className="px-4 py-3">
                    {h.subscription_status ? (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {h.subscription_status === "trial" ? "تجريبي" : h.subscription_status === "active" ? "فعال" : h.subscription_status}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[h.status]}`}>
                      {STATUS_LABEL[h.status] ?? h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openView(h)} className="text-xs text-slate-400 hover:text-white">عرض</button>
                      <button onClick={() => openEdit(h)} className="text-xs text-indigo-400 hover:text-indigo-300">تعديل</button>
                      {h.status === "active" && (
                        <button onClick={() => setStatus(h, "suspended")} className="text-xs text-amber-400 hover:text-amber-300">إيقاف</button>
                      )}
                      {h.status === "suspended" && (
                        <button onClick={() => setStatus(h, "active")} className="text-xs text-emerald-400 hover:text-emerald-300">تفعيل</button>
                      )}
                      {h.status !== "archived" && (
                        <button onClick={() => setStatus(h, "archived")} className="text-xs text-slate-500 hover:text-slate-300">أرشفة</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {modal === "add" ? "إضافة فندق جديد" : modal === "edit" ? "تعديل فندق" : "تفاصيل الفندق"}
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pb-1">
              {[
                { key: "name", label: "اسم الفندق", required: true },
                { key: "country", label: "الدولة" },
                { key: "city", label: "المدينة" },
                { key: "address", label: "العنوان" },
                { key: "phone", label: "رقم الهاتف" },
                { key: "email", label: "البريد الإلكتروني" },
                { key: "manager_name", label: "اسم مدير الفندق" },
                { key: "manager_email", label: "بريد مدير الفندق" },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}{required && " *"}</label>
                  <input
                    value={(form as any)[key] ?? ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    disabled={modal === "view"}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
              ))}

              {modal !== "view" && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الحالة</label>
                  <select
                    value={form.status ?? "active"}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="active">فعال</option>
                    <option value="suspended">موقوف</option>
                    <option value="archived">مؤرشف</option>
                  </select>
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {modal !== "view" && (
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setModal(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                  إلغاء
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
