"use client";

/**
 * م4: حارس الجلسة العام (اعتراض موحّد) — يعترض نداءات الـAPI المصادَقة فقط،
 * فعند 401 يجدّد التوكن ويعيد الطلب مرّة واحدة، وعند فشل التجديد يُطلق معالجة
 * انتهاء الجلسة الموحّدة (بدل الفشل الصامت). يغطّي كل نداءات `fetch` الخام في
 * الصفحات المحميّة دون تعديل كل ملف. لا يمسّ النداءات العامة أو نداءات Next.
 */
import { useEffect } from "react";
import { BASE_URL, refreshAccess, onSessionExpired } from "@/lib/api";

function hasAuthHeader(init?: RequestInit): boolean {
  const h = init?.headers;
  if (!h) return false;
  if (h instanceof Headers) return h.has("Authorization");
  if (Array.isArray(h)) return h.some(([k]) => k.toLowerCase() === "authorization");
  return Object.keys(h as Record<string, string>).some(k => k.toLowerCase() === "authorization");
}

function withToken(init: RequestInit | undefined, token: string): RequestInit {
  const base = init ?? {};
  const merged: Record<string, string> = {};
  const h = base.headers;
  if (h instanceof Headers) h.forEach((v, k) => { merged[k] = v; });
  else if (Array.isArray(h)) h.forEach(([k, v]) => { merged[k] = v; });
  else if (h) Object.assign(merged, h as Record<string, string>);
  merged["Authorization"] = `Bearer ${token}`;
  return { ...base, headers: merged };
}

export default function SessionGuard() {
  useEffect(() => {
    const orig = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      // يعمل فقط على نداءات الـAPI التي تحمل توكن مصادقة
      if (!url || !url.startsWith(BASE_URL) || !hasAuthHeader(init)) return orig(input, init);
      const res = await orig(input, init);
      if (res.status !== 401) return res;
      const token = await refreshAccess();
      if (token && typeof input === "string") return orig(input, withToken(init, token));
      if (token) return orig(input, init);   // Request object — أعِد المحاولة كما هي
      onSessionExpired();
      return res;
    };
    return () => { window.fetch = orig; };
  }, []);
  return null;
}
