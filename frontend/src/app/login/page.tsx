"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/hotels/', '/token/') : 'http://localhost:8000/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError('فشل تسجيل الدخول');
        return;
      }
      const data = await res.json();
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      router.push('/');
    } catch (err) {
      setError('خطأ في الشبكة');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-semibold">تسجيل الدخول</h2>
        <label className="block mb-2">
          <span className="text-sm text-slate-600">اسم المستخدم</span>
          <input value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
        </label>
        <label className="block mb-4">
          <span className="text-sm text-slate-600">كلمة المرور</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
        </label>
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        <button type="submit" className="w-full rounded bg-slate-900 py-2 text-white">دخول</button>
      </form>
    </main>
  );
}
