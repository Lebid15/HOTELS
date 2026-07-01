import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* Tajawal — خط عربي محلّي (مرحلة 1: بلا اعتماد Google Fonts وقت البناء).
   ملفات woff2 مُضمَّنة في المستودع (src/app/fonts) → بناء معزول قابل للتكرار. */
const tajawal = localFont({
  src: [
    { path: "./fonts/tajawal-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/tajawal-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/tajawal-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/tajawal-800.woff2", weight: "800", style: "normal" },
    { path: "./fonts/tajawal-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-tajawal",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "فندقي — funduqii",
  description: "نظام إدارة الفنادق الاحترافي",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
