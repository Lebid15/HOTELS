"use client";
// م10: غلاف الموقع العام — يوفّر سياق اللغة (عربي/إنجليزي) لكل الصفحات العامة
// عبر مجموعة مسارات (public) دون تغيير الروابط، مع مبدّل لغة عائم ثابت.
import { useState, useEffect, useMemo } from "react";
import { Globe } from "lucide-react";
import { LangContext, makeLangCtx, readLang, applyLang, type Lang } from "@/lib/i18n/LangContext";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => readLang());

  // طبّق اتجاه/لغة المستند عند التحميل وعند كل تبديل
  useEffect(() => { applyLang(lang); }, [lang]);

  const ctx = useMemo(() => makeLangCtx(lang), [lang]);

  function toggle() {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    applyLang(next);
  }

  return (
    <LangContext.Provider value={ctx}>
      {children}
      <button
        type="button"
        onClick={toggle}
        className="public-lang-toggle"
        title={lang === "ar" ? "English" : "العربية"}
        aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      >
        <Globe size={18} strokeWidth={1.9} />
        <span>{lang === "ar" ? "EN" : "ع"}</span>
      </button>
    </LangContext.Provider>
  );
}
