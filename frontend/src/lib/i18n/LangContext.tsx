"use client";
// ── Shared i18n across all roles (manager / reception / platform) ──────────
// Arabic strings are the source keys. t(ar) returns Arabic (ar mode) or the
// English lookup (en mode); missing entries fall back to the Arabic input so
// coverage can grow incrementally without breaking the UI.
import { createContext, useContext } from "react";
import { EN } from "./translations";

export type Lang = "ar" | "en";
export const LANG_KEY = "fandqi.lang";

export interface LangCtx {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (s: string) => string;
  /** م11: لغة BCP‑47 لتنسيق الأرقام/التواريخ حسب اللغة (ar‑SY / en‑US). */
  locale: string;
}

export const LangContext = createContext<LangCtx>({
  lang: "ar",
  dir: "rtl",
  t: (s) => s,
  locale: "ar-SY",
});

export function useLang(): LangCtx {
  return useContext(LangContext);
}

/** Build a t() function bound to the given lang — call in a layout to create the context value. */
export function makeLangCtx(lang: Lang): LangCtx {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = lang === "ar"
    ? (s: string) => s
    : (s: string) => EN[s] ?? s;
  const locale = lang === "ar" ? "ar-SY" : "en-US";
  return { lang, dir, t, locale };
}

/** Read the persisted language (client only). Defaults to Arabic. */
export function readLang(): Lang {
  if (typeof window === "undefined") return "ar";
  return (localStorage.getItem(LANG_KEY) as Lang | null) === "en" ? "en" : "ar";
}

/** Persist + apply document direction for the given language. */
export function applyLang(lang: Lang): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}
