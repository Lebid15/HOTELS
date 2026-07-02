// م1: أداة مركزية لإعدادات تشغيل الفندق — مصدر خادمي واحد عبر /api/hotel-settings/.
// الحِزم الثلاث (printing/documents/notifications) تُحفَظ على الخادم؛ نبقي نسخة
// مخبّأة في localStorage لقراءةٍ سريعة من الصفحات المستهلِكة (تنبيهات/طباعة).
import { BASE_URL as API, getAuthHeaders, getAuthJsonHeaders } from "@/lib/api";

export interface OpSettings {
  printing: Record<string, unknown>;
  documents: Record<string, unknown>;
  notifications: Record<string, unknown>;
}

const CACHE_KEY = "fandqi.opsettings";
const EMPTY: OpSettings = { printing: {}, documents: {}, notifications: {} };

function normalize(d: Partial<OpSettings> | null | undefined): OpSettings {
  return {
    printing: (d?.printing as Record<string, unknown>) ?? {},
    documents: (d?.documents as Record<string, unknown>) ?? {},
    notifications: (d?.notifications as Record<string, unknown>) ?? {},
  };
}

function writeCache(s: OpSettings) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

/** القراءة المخبّأة الفورية (بلا شبكة) — للصفحات المستهلِكة. */
export function cachedOpSettings(): OpSettings {
  try { return normalize(JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}")); }
  catch { return { ...EMPTY }; }
}

/** جلب الإعدادات من الخادم (المصدر) وتحديث المخبّأ. */
export async function fetchOpSettings(): Promise<OpSettings | null> {
  try {
    const r = await fetch(`${API}/hotel-settings/`, { headers: getAuthHeaders() });
    if (!r.ok) return null;
    const s = normalize(await r.json());
    writeCache(s);
    return s;
  } catch { return null; }
}

/** دمج ضحل خادمي لحزمة/حزم (لا يمسح المفاتيح غير المُرسَلة) + تحديث المخبّأ. */
export async function patchOpSettings(patch: Partial<OpSettings>): Promise<boolean> {
  try {
    const r = await fetch(`${API}/hotel-settings/`, {
      method: "PATCH", headers: getAuthJsonHeaders(), body: JSON.stringify(patch),
    });
    if (!r.ok) return false;
    writeCache(normalize(await r.json()));
    return true;
  } catch { return false; }
}
