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
