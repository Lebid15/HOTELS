// Central helpers for hotel identity, currency, and platform branding.
// Import from any page: import { getHotelCurrency, formatMoney, ... } from "../../lib/hotel";

const SETTINGS_KEY = (hid: string) => `fandqi.settings.${hid}`;
const PLATFORM_KEY = "fandqi.platform";

function safeJSON(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getHotelSettings(hotelId: string): Record<string, unknown> {
  if (typeof window === "undefined" || !hotelId) return {};
  return safeJSON(localStorage.getItem(SETTINGS_KEY(hotelId)));
}

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Returns the hotel's default currency.
 * Reads from fandqi.settings.{hotelId}.ops.currency (canonical).
 * Falls back to legacy hs_{hotelId}.op.currency key.
 * Ultimate fallback: "USD".
 */
export function getHotelCurrency(hotelId: string): string {
  const s = getHotelSettings(hotelId) as { ops?: { currency?: string } };
  if (s?.ops?.currency) return s.ops.currency;
  if (typeof window !== "undefined" && hotelId) {
    const old = safeJSON(localStorage.getItem(`hs_${hotelId}`)) as { op?: { currency?: string } };
    if (old?.op?.currency) return old.op.currency;
  }
  return "USD";
}

/**
 * Formats a monetary amount with its currency code.
 * Example: formatMoney(1500, "SAR") → "1,500 SAR"
 */
export function formatMoney(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return `0 ${currency}`;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

// ─── Hotel Identity ───────────────────────────────────────────────────────────

export interface HotelIdentity {
  name: string;
  ownerName: string;
  logo: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
}

/**
 * Returns the hotel's identity fields from localStorage settings.
 * All fields have empty-string / null fallbacks — never throws.
 */
export function getHotelIdentity(hotelId: string): HotelIdentity {
  const s = getHotelSettings(hotelId) as { identity?: Partial<HotelIdentity> };
  const id = s?.identity ?? {};
  return {
    name:      id.name      ?? "",
    ownerName: id.ownerName ?? "",
    logo:      id.logo      ?? null,
    phone:     id.phone     ?? "",
    email:     id.email     ?? "",
    address:   id.address   ?? "",
    city:      id.city      ?? "",
  };
}

// ─── Platform Branding ────────────────────────────────────────────────────────

export interface PlatformBranding {
  platformName: string;
  platformSubtitle: string;
  platformLogo: string | null;
}

/**
 * Returns platform branding from localStorage key "fandqi.platform".
 * Fallback: { platformName: "Fandqi", platformSubtitle: "نظام إدارة الفنادق", platformLogo: null }
 *
 * To set platform branding from an admin panel:
 *   localStorage.setItem("fandqi.platform", JSON.stringify({ platformName, platformSubtitle, platformLogo }))
 */
export function getPlatformBranding(): PlatformBranding {
  if (typeof window === "undefined") {
    return { platformName: "Fandqi", platformSubtitle: "نظام إدارة الفنادق", platformLogo: null };
  }
  const p = safeJSON(localStorage.getItem(PLATFORM_KEY)) as Partial<PlatformBranding>;
  return {
    platformName:     p.platformName     || "Fandqi",
    platformSubtitle: p.platformSubtitle || "نظام إدارة الفنادق",
    platformLogo:     p.platformLogo     || null,
  };
}
