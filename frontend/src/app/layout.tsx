import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

/* Tajawal — Arabic font, self-hosted by Next.js (no render-blocking) */
const tajawal = Tajawal({
  weight: ["400", "500", "700", "800", "900"],
  subsets: ["arabic"],
  variable: "--font-tajawal",
  display: "swap",
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
