"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

const LANG_KEY = "fandqi.lang";
type Lang = "ar" | "en";
type Mode = "login" | "register" | "forgot";

const EN: Record<string, string> = {
  "فندقي":                                              "funduqii",
  "نظام إدارة الفنادق الاحترافي":                     "Professional Hotel Management System",
  "تسجيل الدخول":                                      "Sign In",
  "إنشاء حساب جديد":                                   "Create New Account",
  "نسيت كلمة المرور":                                  "Forgot Password",
  "أدخل بيانات حسابك للمتابعة":                       "Enter your account details to continue",
  "سجّل فندقك وابدأ إدارته الآن":                      "Register your hotel and start managing it now",
  "أدخل بريدك الإلكتروني لاستعادة الدخول":            "Enter your email to recover your access",
  "اسم المستخدم":                                      "Username",
  "كلمة المرور":                                       "Password",
  "البريد الإلكتروني":                                 "Email address",
  "تذكر بيانات الدخول":                                "Remember me",
  "نسيت كلمة المرور؟":                                 "Forgot password?",
  "جارٍ الدخول...":                                    "Signing in...",
  "دخول":                                              "Sign In",
  "ليس لديك حساب؟":                                   "Don't have an account?",
  "اسم الفندق":                                        "Hotel Name",
  "مثال: فندق النخيل":                                 "e.g. Palm Hotel",
  "اسم مستخدم فريد للدخول":                            "Unique login username",
  "٦ أحرف على الأقل":                                 "At least 6 characters",
  "تأكيد كلمة المرور":                                 "Confirm Password",
  "أعد كتابة كلمة المرور":                             "Re-enter your password",
  "جارٍ إنشاء الحساب...":                              "Creating account...",
  "إنشاء الحساب":                                      "Create Account",
  "لديك حساب بالفعل؟":                                "Already have an account?",
  "تم إرسال رابط الاستعادة":                           "Recovery link sent",
  "تحقق من بريدك الإلكتروني واتبع التعليمات":         "Check your email and follow the instructions",
  "العودة لتسجيل الدخول":                              "Back to Sign In",
  "جارٍ الإرسال...":                                   "Sending...",
  "إرسال رابط الاستعادة":                              "Send Recovery Link",
  "اسم المستخدم أو كلمة المرور غير صحيحة":            "Incorrect username or password",
  "خطأ في الاتصال بالخادم":                            "Server connection error",
  "اسم الفندق مطلوب":                                  "Hotel name is required",
  "اسم المستخدم مطلوب":                                "Username is required",
  "كلمة المرور مطلوبة":                                "Password is required",
  "كلمة المرور ٦ أحرف على الأقل":                     "Password must be at least 6 characters",
  "كلمتا المرور غير متطابقتين":                        "Passwords do not match",
  "حدث خطأ أثناء إنشاء الحساب":                       "An error occurred while creating the account",
  "الحجوزات":                                          "Reservations",
  "الغرف والطوابق":                                    "Rooms & Floors",
  "التقارير المالية":                                  "Financial Reports",
  "الخدمات الفندقية":                                  "Hotel Services",
  "تم قفل الحساب مؤقتًا بسبب محاولات فاشلة. حاول لاحقًا.": "Account temporarily locked due to failed attempts. Try again later.",
  "الكود غير صحيح أو منتهٍ.":                          "The code is incorrect or expired.",
  "تم تفعيل التحقق بخطوتين — أدخل الكود المُرسَل (يظهر لمدير الفندق داخل النظام).": "Two-factor authentication is enabled — enter the code (shown to the hotel manager in-system).",
  "كود التحقق":                                        "Verification code",
  "جارٍ التحقق...":                                    "Verifying...",
  "تأكيد الكود":                                       "Confirm code",
};

const FEATURES = [
  {
    ar: "الحجوزات", en: "Reservations",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    ar: "الغرف والطوابق", en: "Rooms & Floors",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    ar: "التقارير المالية", en: "Financial Reports",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    ar: "الخدمات الفندقية", en: "Hotel Services",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
  },
];

/* ── Eye icons ─────────────────────────────────────────────── */
function EyeOpen() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

/* ── Globe icon ────────────────────────────────────────────── */
function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function LoginPage() {
  const [lang, setLang]             = useState<Lang>(() => {
    if (typeof window === "undefined") return "ar";
    return (localStorage.getItem(LANG_KEY) as Lang | null) === "en" ? "en" : "ar";
  });
  const [mode, setMode]             = useState<Mode>("login");
  const [username, setUsername]     = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginErr, setLoginErr]     = useState("");
  const [loginLoad, setLoginLoad]   = useState(false);
  const [tfaTicket, setTfaTicket]   = useState<string|null>(null);   // د‑6: تحقّق بخطوتين
  const [tfaCode, setTfaCode]       = useState("");
  const [regHotel, setRegHotel]     = useState("");
  const [regUser, setRegUser]       = useState("");
  const [regEmail, setRegEmail]     = useState("");
  const [regPass, setRegPass]       = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRP, setShowRP]         = useState(false);
  const [showRC, setShowRC]         = useState(false);
  const [regErr, setRegErr]         = useState("");
  const [regLoad, setRegLoad]       = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent]   = useState(false);
  const [forgotLoad, setForgotLoad]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  function toggleLang() {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.dir  = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
  }

  function t(s: string): string { return lang === "ar" ? s : (EN[s] ?? s); }

  /* ── Auth ─────────────────────────────────────────────────── */
  function storeAuth(access: string, refresh: string) {
    // rememberMe=true → localStorage (persists across browser sessions)
    // rememberMe=false → sessionStorage (cleared when tab/browser closes)
    const storage = rememberMe ? localStorage : sessionStorage;
    if (!rememberMe) {
      // Clear any previous persistent tokens
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    storage.setItem("access_token", access);
    storage.setItem("refresh_token", refresh);
  }

  async function doLoginFlow(access: string, refresh: string) {
    storeAuth(access, refresh);
    const res  = await fetch(apiUrl("/current-user/"), { headers: { Authorization: `Bearer ${access}` } });
    const user = await res.json();
    localStorage.setItem("role", user.role);
    if (user.hotel_id) localStorage.setItem("hotel_id", String(user.hotel_id));
    const dest: Record<string, string> = { platform_owner: "/platform", manager: "/manager", reception: "/reception" };
    router.push(dest[user.role] ?? "/");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErr(""); setLoginLoad(true);
    try {
      const res = await fetch(apiUrl("/token/"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (res.status === 423) { setLoginErr(t("تم قفل الحساب مؤقتًا بسبب محاولات فاشلة. حاول لاحقًا.")); return; }
      if (!res.ok) { setLoginErr(t("اسم المستخدم أو كلمة المرور غير صحيحة")); return; }
      const d = await res.json();
      if (d["2fa_required"]) { setTfaTicket(d.ticket); setTfaCode(""); return; }   // د‑6: خطوة الكود
      await doLoginFlow(d.access, d.refresh);
    } catch { setLoginErr(t("خطأ في الاتصال بالخادم")); }
    finally   { setLoginLoad(false); }
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault(); setLoginErr(""); setLoginLoad(true);
    try {
      const res = await fetch(apiUrl("/auth/2fa/verify/"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: tfaTicket, code: tfaCode }) });
      if (!res.ok) { setLoginErr(t("الكود غير صحيح أو منتهٍ.")); return; }
      const d = await res.json();
      setTfaTicket(null);
      await doLoginFlow(d.access, d.refresh);
    } catch { setLoginErr(t("خطأ في الاتصال بالخادم")); }
    finally   { setLoginLoad(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setRegErr("");
    if (!regHotel.trim())       return setRegErr(t("اسم الفندق مطلوب"));
    if (!regUser.trim())        return setRegErr(t("اسم المستخدم مطلوب"));
    if (!regPass)               return setRegErr(t("كلمة المرور مطلوبة"));
    if (regPass.length < 6)     return setRegErr(t("كلمة المرور ٦ أحرف على الأقل"));
    if (regPass !== regConfirm) return setRegErr(t("كلمتا المرور غير متطابقتين"));
    setRegLoad(true);
    try {
      const r = await fetch(apiUrl("/register/"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: regUser.trim(), hotel_name: regHotel.trim(), email: regEmail.trim(), password: regPass }) });
      const d = await r.json();
      if (!r.ok) { setRegErr(d.error || t("حدث خطأ أثناء إنشاء الحساب")); return; }
      const t2 = await fetch(apiUrl("/token/"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: regUser.trim(), password: regPass }) });
      if (!t2.ok) { setMode("login"); setUsername(regUser.trim()); return; }
      const td = await t2.json();
      await doLoginFlow(td.access, td.refresh);
    } catch { setRegErr(t("خطأ في الاتصال بالخادم")); }
    finally   { setRegLoad(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setForgotLoad(true);
    await new Promise(r => setTimeout(r, 700));
    setForgotSent(true); setForgotLoad(false);
  }

  const isRtl = lang === "ar";

  const modeLabel: Record<Mode, { title: string; sub: string }> = {
    login:    { title: t("تسجيل الدخول"),    sub: t("أدخل بيانات حسابك للمتابعة") },
    register: { title: t("إنشاء حساب جديد"), sub: t("سجّل فندقك وابدأ إدارته الآن") },
    forgot:   { title: t("نسيت كلمة المرور"), sub: t("أدخل بريدك الإلكتروني لاستعادة الدخول") },
  };

  const eyePad  = isRtl ? { paddingLeft: "2.6rem" } : { paddingRight: "2.6rem" };
  const eyeSide: React.CSSProperties = { position: "absolute", top: "50%", transform: "translateY(-50%)", ...(isRtl ? { left: "0.75rem" } : { right: "0.75rem" }), background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex", alignItems: "center" };
  const linkBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 700, padding: 0, fontFamily: "inherit", fontSize: "inherit" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "var(--layout-bg)", backgroundAttachment: "fixed" }}>

      {/* ── Language toggle — always top-right, never moves ── */}
      <button
        onClick={toggleLang}
        title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
        style={{
          position: "fixed", top: 16, right: 16, zIndex: 200,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.90)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(79,70,229,0.18)", borderRadius: 20,
          padding: "6px 14px", cursor: "pointer",
          fontWeight: 700, fontSize: 13, color: "#4f46e5",
          boxShadow: "0 2px 10px rgba(79,70,229,0.12)",
          fontFamily: "inherit", transition: "box-shadow .15s",
        }}
      >
        <GlobeIcon />
        {lang === "ar" ? "English" : "العربية"}
      </button>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 60, height: 60, borderRadius: 16, marginBottom: 12,
          background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
          boxShadow: "0 8px 24px rgba(79,70,229,.30)",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-heading)", marginBottom: 3, letterSpacing: -0.3 }}>
          {t("فندقي")}
        </h1>
        <p style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 600, opacity: 0.75 }}>
          {t("نظام إدارة الفنادق الاحترافي")}
        </p>
      </div>

      {/* ── Card ─────────────────────────────────────────────── */}
      <div className="ds-card" style={{ width: "100%", maxWidth: mode === "register" ? 440 : 400, padding: 0 }}>

        {/* Card header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--color-heading)", marginBottom: 3 }}>
            {modeLabel[mode].title}
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 600 }}>
            {modeLabel[mode].sub}
          </p>
        </div>

        {/* ── 2FA CODE STEP (د‑6) ── */}
        {mode === "login" && tfaTicket && (
          <form onSubmit={handleVerify2FA} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--color-primary-soft)", border: "1px solid rgba(79,70,229,.2)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--color-text)", fontWeight: 600 }}>
              {t("تم تفعيل التحقق بخطوتين — أدخل الكود المُرسَل (يظهر لمدير الفندق داخل النظام).")}
            </div>
            <div className="field">
              <label className="field-label">{t("كود التحقق")}</label>
              <input className="input" value={tfaCode} onChange={e => setTfaCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" inputMode="numeric" maxLength={6} required autoFocus style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: 18, fontWeight: 800 }} />
            </div>
            {loginErr && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>{loginErr}</div>
            )}
            <button type="submit" disabled={loginLoad} className="ds-btn ds-btn-view" style={{ width: "100%", justifyContent: "center" }}>
              {loginLoad ? t("جارٍ التحقق...") : t("تأكيد الكود")}
            </button>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
              <button type="button" style={linkBtn} onClick={() => { setTfaTicket(null); setLoginErr(""); }}>{t("العودة لتسجيل الدخول")}</button>
            </p>
          </form>
        )}

        {/* ── LOGIN ── */}
        {mode === "login" && !tfaTicket && (
          <form onSubmit={handleLogin} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label className="field-label">{t("اسم المستخدم")}</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder={t("اسم المستخدم")} required autoFocus />
            </div>

            <div className="field">
              <label className="field-label">{t("كلمة المرور")}</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required style={eyePad} />
                <button type="button" style={eyeSide} tabIndex={-1} onClick={() => setShowPass(p => !p)}>
                  {showPass ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text)", cursor: "pointer", fontWeight: 600 }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: "var(--color-primary)", width: 14, height: 14 }} />
                {t("تذكر بيانات الدخول")}
              </label>
              <button type="button" style={{ ...linkBtn, fontSize: 13 }} onClick={() => { setMode("forgot"); setLoginErr(""); }}>
                {t("نسيت كلمة المرور؟")}
              </button>
            </div>

            {loginErr && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>
                {loginErr}
              </div>
            )}

            <button type="submit" disabled={loginLoad} className="ds-btn ds-btn-view" style={{ width: "100%", marginTop: 2, justifyContent: "center" }}>
              {loginLoad ? t("جارٍ الدخول...") : t("دخول")}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
              {t("ليس لديك حساب؟")}{" "}
              <button type="button" style={linkBtn} onClick={() => { setMode("register"); setLoginErr(""); }}>
                {t("إنشاء حساب جديد")}
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER ── */}
        {mode === "register" && (
          <form onSubmit={handleRegister} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 13 }}>
            <div className="field">
              <label className="field-label">{t("اسم الفندق")} <span style={{ color: "#ef4444" }}>*</span></label>
              <input className="input" value={regHotel} onChange={e => setRegHotel(e.target.value)} placeholder={t("مثال: فندق النخيل")} required autoFocus />
            </div>
            <div className="field">
              <label className="field-label">{t("اسم المستخدم")} <span style={{ color: "#ef4444" }}>*</span></label>
              <input className="input" value={regUser} onChange={e => setRegUser(e.target.value)} placeholder={t("اسم مستخدم فريد للدخول")} required />
            </div>
            <div className="field">
              <label className="field-label">{t("البريد الإلكتروني")}</label>
              <input className="input" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="example@email.com" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label className="field-label">{t("كلمة المرور")} <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input className="input" type={showRP ? "text" : "password"} value={regPass} onChange={e => setRegPass(e.target.value)} placeholder={t("٦ أحرف على الأقل")} required style={eyePad} />
                  <button type="button" style={eyeSide} tabIndex={-1} onClick={() => setShowRP(p => !p)}>{showRP ? <EyeOff /> : <EyeOpen />}</button>
                </div>
              </div>
              <div className="field">
                <label className="field-label">{t("تأكيد كلمة المرور")} <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input className="input" type={showRC ? "text" : "password"} value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder={t("أعد كتابة كلمة المرور")} required style={eyePad} />
                  <button type="button" style={eyeSide} tabIndex={-1} onClick={() => setShowRC(p => !p)}>{showRC ? <EyeOff /> : <EyeOpen />}</button>
                </div>
              </div>
            </div>

            {regErr && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>
                {regErr}
              </div>
            )}

            <button type="submit" disabled={regLoad} className="ds-btn ds-btn-view" style={{ width: "100%", marginTop: 2, justifyContent: "center" }}>
              {regLoad ? t("جارٍ إنشاء الحساب...") : t("إنشاء الحساب")}
            </button>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
              {t("لديك حساب بالفعل؟")}{" "}
              <button type="button" style={linkBtn} onClick={() => { setMode("login"); setRegErr(""); }}>
                {t("تسجيل الدخول")}
              </button>
            </p>
          </form>
        )}

        {/* ── FORGOT ── */}
        {mode === "forgot" && (
          <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            {forgotSent ? (
              <>
                <div style={{ background: "var(--color-primary-soft)", border: "1px solid rgba(79,70,229,.2)", borderRadius: 10, padding: "18px 16px", textAlign: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "var(--color-primary)", marginBottom: 5 }}>{t("تم إرسال رابط الاستعادة")}</p>
                  <p style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 600 }}>{t("تحقق من بريدك الإلكتروني واتبع التعليمات")}</p>
                </div>
                <button className="ds-btn ds-btn-neutral" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setMode("login"); setForgotSent(false); setForgotEmail(""); }}>
                  {t("العودة لتسجيل الدخول")}
                </button>
              </>
            ) : (
              <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="field">
                  <label className="field-label">{t("البريد الإلكتروني")}</label>
                  <input className="input" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="example@email.com" required autoFocus />
                </div>
                <button type="submit" disabled={forgotLoad} className="ds-btn ds-btn-view" style={{ width: "100%", justifyContent: "center" }}>
                  {forgotLoad ? t("جارٍ الإرسال...") : t("إرسال رابط الاستعادة")}
                </button>
                <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
                  <button type="button" style={linkBtn} onClick={() => setMode("login")}>{t("العودة لتسجيل الدخول")}</button>
                </p>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Feature chips ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
        {FEATURES.map(f => (
          <div key={f.ar} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(79,70,229,0.15)",
            borderRadius: 20, padding: "5px 12px",
            fontSize: 12, fontWeight: 700, color: "#4f46e5",
          }}>
            {f.icon}
            {lang === "ar" ? f.ar : f.en}
          </div>
        ))}
      </div>
    </div>
  );
}
