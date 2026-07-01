"use client";
// Re-export shim — the real i18n context now lives in the shared module so all
// roles (manager / reception / platform) share ONE context object. Existing
// manager imports of "./LangContext" keep working unchanged.
export * from "@/lib/i18n/LangContext";
