import type { NextConfig } from "next";

/* م5 (تقوية الأمان): ترويسات أمان أساسية على مستوى الواجهة.
   CSP متساهلة عمدًا (`unsafe-inline` للأنماط/السكربت) لأن المشروع يحوي كتل
   inline-style كثيرة و Next يحقن سكربتات مضمّنة — تُشدَّد لاحقًا بعد تقليل
   inline-styles (المرحلة 9). مع ذلك تمنع object/التأطير وتضبط المصادر. */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "font-src 'self' data:",
  "connect-src 'self' https: http://localhost:8000",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
