"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        return;
      }
      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      const userRes = await fetch("http://localhost:8000/api/current-user/", {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      const user = await userRes.json();
      localStorage.setItem("role", user.role);

      const redirectMap: Record<string, string> = {
        platform_owner: "/platform",
        manager: "/manager",
        reception: "/reception",
      };
      router.push(redirectMap[user.role] ?? "/");
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-slate-900 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
            Fandqi Central
          </p>
          <h1 className="text-3xl font-semibold text-white">
            نظام إدارة الفنادق
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-8 shadow-2xl"
        >
          <h2 className="mb-6 text-xl font-semibold text-slate-800">
            تسجيل الدخول
          </h2>

          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-600">
              اسم المستخدم
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="platform / manager / reception"
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block mb-1 text-sm font-medium text-slate-600">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="••••••"
              required
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "جارٍ الدخول..." : "دخول"}
          </button>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600 mb-2">حسابات تجريبية:</p>
            <p><span className="font-mono bg-white px-1 rounded">platform</span> — صاحب المنصة</p>
            <p><span className="font-mono bg-white px-1 rounded">manager</span> — مدير الفندق</p>
            <p><span className="font-mono bg-white px-1 rounded">reception</span> — موظف الاستقبال</p>
            <p className="mt-1">كلمة المرور لجميع الحسابات: <span className="font-mono bg-white px-1 rounded">123456</span></p>
          </div>
        </form>
      </div>
    </main>
  );
}
