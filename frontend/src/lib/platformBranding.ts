// هوية المنصّة الموحّدة لكل السايدبارات (المدير/الاستقبال/صاحب المنصّة):
// الشعار + الاسم + الوصف — مصدرها لوحة صاحب المنصّة (PlatformSettings).
// نقرأ من نقطة عامّة (AllowAny) كي يتمكّن المدير والاستقبال من عرضها دون صلاحية
// صاحب منصّة. نُخزّن نسخة في localStorage لعرض فوريّ قبل وصول الشبكة.
import { apiUrl } from "@/lib/api";

export interface PlatformInfo {
  name: string;
  description: string;
  logo: string;       // رابط الشعار (URLField)؛ فارغ ⇒ يُستخدم حرف بديل
}

const CACHE_KEY = "fandqi.platform.info";

export const PLATFORM_INFO_DEFAULT: PlatformInfo = {
  name: "funduqii",
  description: "نظام إدارة الفنادق",
  logo: "",
};

/** قراءة النسخة المخزّنة محليًا (لعرض فوريّ قبل الشبكة). */
export function readCachedPlatformInfo(): PlatformInfo {
  if (typeof window === "undefined") return PLATFORM_INFO_DEFAULT;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        name: d.name || PLATFORM_INFO_DEFAULT.name,
        description: d.description || PLATFORM_INFO_DEFAULT.description,
        logo: d.logo || "",
      };
    }
  } catch { /* ignore */ }
  return PLATFORM_INFO_DEFAULT;
}

/** حفظ النسخة محليًا فقط (بلا بثّ). */
function cachePlatformInfo(info: PlatformInfo): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(info)); } catch { /* ignore */ }
}

/** حفظ + بثّ فوريّ لكل السايدبارات المفتوحة (يُستدعى بعد حفظ إعدادات المنصّة). */
export function broadcastPlatformInfo(info: PlatformInfo): void {
  cachePlatformInfo(info);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("platform-info-updated", { detail: info }));
  }
}

/** جلب هوية المنصّة من النقطة العامّة؛ عند الفشل يرجع للنسخة المخزّنة. */
export async function fetchPublicPlatformInfo(): Promise<PlatformInfo> {
  try {
    const r = await fetch(apiUrl("/public/platform-info/"));
    if (!r.ok) return readCachedPlatformInfo();
    const d = await r.json();
    const info: PlatformInfo = {
      name: d.name || PLATFORM_INFO_DEFAULT.name,
      description: d.description || PLATFORM_INFO_DEFAULT.description,
      logo: d.logo_url || "",
    };
    cachePlatformInfo(info);
    return info;
  } catch {
    return readCachedPlatformInfo();
  }
}
