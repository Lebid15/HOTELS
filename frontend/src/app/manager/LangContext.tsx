"use client";
import { createContext, useContext } from "react";
import { EN } from "./translations";

export type Lang = "ar" | "en";

export interface LangCtx {
  lang: Lang;
  dir: "rtl" | "ltr";
  /** Translate: returns Arabic as-is (ar mode) or English lookup (en mode). Fallback = input. */
  t: (s: string) => string;
}

export const LangContext = createContext<LangCtx>({
  lang: "ar",
  dir: "rtl",
  t: (s) => s,
});

export function useLang(): LangCtx {
  return useContext(LangContext);
}

/** Build a t() function bound to the given lang — call in layout to create the context value. */
export function makeLangCtx(lang: Lang): LangCtx {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = lang === "ar"
    ? (s: string) => s
    : (s: string) => EN[s] ?? s;
  return { lang, dir, t };
}
