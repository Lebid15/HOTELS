// Centralized API base URL — reads from .env.local; falls back to local dev server.
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const apiUrl = (path: string) =>
  `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

/** Reads the token from localStorage first, then sessionStorage (supports rememberMe=false). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") ?? sessionStorage.getItem("access_token");
}

/** Clears the auth token from both storages (call on logout). */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  ["access_token", "refresh_token"].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

export function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  return { Authorization: `Bearer ${getToken() ?? ""}` };
}

export function getAuthJsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...getAuthHeaders() };
}

/** Reads the refresh token from localStorage first, then sessionStorage. */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token") ?? sessionStorage.getItem("refresh_token");
}

// يُخزّن التوكن الجديد في نفس المخزن الذي أتى منه refresh (localStorage أو sessionStorage).
function tokenStore(): Storage | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("refresh_token")) return localStorage;
  if (sessionStorage.getItem("refresh_token")) return sessionStorage;
  return null;
}

/** م4: معالجة انتهاء الجلسة موحّدة — لا فشل صامت. تمسح الجلسة، تُطلق حدثًا
 *  عامًّا (لعرض تنبيه فوري)، وتوجّه إلى /login?expired=1 مرّة واحدة. */
let sessionExpiredHandled = false;
export function onSessionExpired(): void {
  if (typeof window === "undefined") return;
  clearTokens();
  window.dispatchEvent(new CustomEvent("session-expired"));
  if (!sessionExpiredHandled && !window.location.pathname.startsWith("/login")) {
    sessionExpiredHandled = true;
    window.location.href = "/login?expired=1";
  }
}

// طلب تجديد واحد مشترك (single-flight) لتفادي "عاصفة التجديد" عند تزامن عدّة طلبات.
let refreshing: Promise<string | null> | null = null;

export function refreshAccess(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return Promise.resolve(null);
  if (!refreshing) {
    refreshing = fetch(apiUrl("/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { access?: string; refresh?: string } | null) => {
        const store = tokenStore();
        if (d?.access && store) {
          store.setItem("access_token", d.access);
          if (d.refresh) store.setItem("refresh_token", d.refresh); // تدوير التوكن
          return d.access;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

/**
 * fetch موحّد مع مصادقة (B‑3): يُرفق التوكن، وعند 401 يجدّده مرّة واحدة ويعيد الطلب،
 * وعند فشل التجديد يمسح الجلسة ويوجّه إلى /login. استخدمه بدل fetch الخام في الصفحات المحميّة.
 */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : apiUrl(path);
  const build = (token: string | null): RequestInit => ({
    ...options,
    headers: { ...(options.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const res = await fetch(url, build(getToken()));
  if (res.status !== 401) return res;
  const newAccess = await refreshAccess();
  if (newAccess) return fetch(url, build(newAccess));
  onSessionExpired();   // م4: معالجة موحّدة بدل التوجيه الصامت
  return res;
}

/** تسجيل الخروج: يُبطل refresh على الخادم (blacklist) ثم يمسح التوكنات محليًا. */
export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await fetch(apiUrl("/logout/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ refresh }),
      });
    } catch { /* تجاهل أخطاء الشبكة عند الخروج */ }
  }
  clearTokens();
}
