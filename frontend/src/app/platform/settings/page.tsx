"use client";

import { useEffect, useState } from "react";
import {
  Eye, EyeOff, User, KeyRound, Building2, Globe, CalendarCheck, CircleDollarSign,
  BadgeCheck, Bell, Plug, ShieldCheck, DatabaseBackup, X, Save, Download,
  AlertTriangle, CheckCircle2, ScrollText,
} from "lucide-react";
import { apiUrl, getAuthHeaders, getAuthJsonHeaders } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";
import { broadcastPlatformInfo } from "@/lib/platformBranding";
import AuditLogView from "@/components/AuditLogView";

const SUB_SETTINGS_KEY = "fandqi.sub_settings";
const PUBLIC_SETTINGS_KEY = "fandqi.public_settings";
const NOTIF_SETTINGS_KEY = "fandqi.notif_settings";
const SECURITY_KEY = "fandqi.security_settings";

function readLocal<T>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) ?? "{}") }; }
  catch { return defaults; }
}
function writeLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function show(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }
  return { toast, show, clear: () => setToast(null) };
}

/* ── Password input with eye toggle ─────────────────────────────────────────── */
function EyeInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  return (
    <div className="pf-eye-wrap">
      <input className="input" type={show ? "text" : "password"} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" className="pf-eye-btn" onClick={() => setShow(p => !p)} aria-label={t("إظهار/إخفاء")}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

const TABS = [
  { key: "identity",     label: "هوية المنصة",      Icon: Building2 },
  { key: "public",       label: "الموقع العام",      Icon: Globe },
  { key: "bookings",     label: "الحجوزات العامة",   Icon: CalendarCheck },
  { key: "commissions",  label: "العمولات والأرباح", Icon: CircleDollarSign },
  { key: "subscriptions",label: "الاشتراكات",        Icon: BadgeCheck },
  { key: "notifications",label: "الإشعارات",         Icon: Bell },
  { key: "integrations", label: "التكاملات",         Icon: Plug },
  { key: "security",     label: "الأمان",            Icon: ShieldCheck },
  { key: "backup",       label: "النسخ الاحتياطي",   Icon: DatabaseBackup },
  { key: "audit",        label: "سجل التدقيق",       Icon: ScrollText },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function PlatformSettingsPage() {
  const { t, lang } = useLang();
  const { toast, show: showToast, clear: clearToast } = useToast();
  const [tab, setTab] = useState<TabKey>("identity");

  // ── Owner account ──────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ username: "", email: "", first_name: "", last_name: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [oldPass, setOldPass] = useState(""); const [newPass, setNewPass] = useState(""); const [confPass, setConfPass] = useState("");
  const [passErr, setPassErr] = useState(""); const [passSaving, setPassSaving] = useState(false);

  // ── Platform identity (localStorage) ───────────────────────────────────
  const [identity, setIdentity] = useState({
    platformName: "funduqii", platformSubtitle: "نظام إدارة الفنادق",
    platformLogo: "", platformEmail: "", platformPhone: "", platformWebsite: "", platformAddress: "",
  });

  // ── Public site settings ────────────────────────────────────────────────
  const [pub, setPub] = useState({
    enablePublicSite: true, showHotels: true, allowBooking: true, defaultCountry: "سوريا",
    showFeatured: true, ordering: "featured", bookingPolicy: "", cancellationPolicy: "",
    payAtArrivalText: "الدفع عند الوصول — لا حاجة لبطاقة ائتمانية.", termsText: "", privacyText: "",
    payAtArrival: true, allowCancel: true, cancelWindowHours: "24", hideRoomNumber: true, createConfirmed: true,
  });

  // ── Commission settings (BACKEND) ───────────────────────────────────────
  const [rev, setRev] = useState({
    enable_booking_commission: true, default_commission_type: "percentage",
    default_commission_value: 10, default_commission_currency: "USD",
    calculate_commission_on_status: "on_check_in", allow_hotel_override: true, no_show_policy: "waive",
  });
  const [revSaving, setRevSaving] = useState(false);

  // ── Subscription settings ───────────────────────────────────────────────
  const [sub, setSub] = useState({
    trialDays: "14", reminderDays: "30", autoRenewal: false,
    suspendOnExpiry: true, publicRequiresActive: false,
  });

  // ── Notification settings ───────────────────────────────────────────────
  const [notif, setNotif] = useState({
    subRequests: true, subExpiry: true, webBookings: true, commissions: true, suspendedHotels: true,
    channelEmail: false, channelSms: false, channelWhatsapp: false,
  });

  // ── Security (local prefs) ──────────────────────────────────────────────
  const [security, setSecurity] = useState({ enableAuditLog: false });

  useEffect(() => {
    fetch(apiUrl("/platform/settings/"), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setIdentity({
        platformName: d.site_name ?? "funduqii", platformSubtitle: d.subtitle ?? "",
        platformLogo: d.logo_url ?? "", platformEmail: d.email ?? "",
        platformPhone: d.phone ?? "", platformWebsite: d.website ?? "", platformAddress: d.address ?? "",
      }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
    setPub(readLocal(PUBLIC_SETTINGS_KEY, pub));
    setSub(readLocal(SUB_SETTINGS_KEY, sub));
    setNotif(readLocal(NOTIF_SETTINGS_KEY, notif));
    setSecurity(readLocal(SECURITY_KEY, security));

    fetch(apiUrl("/current-user/"), { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setProfile({ username: d.username ?? "", email: d.email ?? "", first_name: d.first_name ?? "", last_name: d.last_name ?? "" }))
      .catch(() => {});

    fetch(apiUrl("/platform/revenue-settings/"), { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setRev(d))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save handlers ───────────────────────────────────────────────────────
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setProfileErr(""); setProfileSaving(true);
    try {
      const res = await fetch(apiUrl("/current-user/"), {
        method: "PATCH", headers: getAuthJsonHeaders(),
        body: JSON.stringify({ email: profile.email, first_name: profile.first_name, last_name: profile.last_name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setProfileErr(data.error ?? t("فشل الحفظ")); return; }
      showToast(t("تم حفظ معلومات الحساب"));
    } catch { setProfileErr(t("خطأ في الاتصال")); }
    finally { setProfileSaving(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault(); setPassErr("");
    if (!oldPass || !newPass || !confPass) return setPassErr(t("جميع الحقول مطلوبة"));
    if (newPass.length < 8) return setPassErr(t("كلمة المرور الجديدة 8 أحرف على الأقل"));
    if (newPass !== confPass) return setPassErr(t("كلمتا المرور غير متطابقتين"));
    setPassSaving(true);
    try {
      const res = await fetch(apiUrl("/change-password/"), {
        method: "POST", headers: getAuthJsonHeaders(),
        body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPassErr(data.error ?? t("فشل تغيير كلمة المرور")); return; }
      setOldPass(""); setNewPass(""); setConfPass(""); showToast(t("تم تغيير كلمة المرور"));
    } catch { setPassErr(t("خطأ في الاتصال")); }
    finally { setPassSaving(false); }
  }

  async function saveIdentity(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl("/platform/settings/"), {
        method: "PUT", headers: getAuthJsonHeaders(),
        body: JSON.stringify({
          site_name: identity.platformName, subtitle: identity.platformSubtitle,
          logo_url: identity.platformLogo, email: identity.platformEmail,
          phone: identity.platformPhone, website: identity.platformWebsite, address: identity.platformAddress,
        }),
      });
      if (!res.ok) throw new Error();
      // بثّ فوريّ للهوية إلى كل السايدبارات (شعار/اسم/وصف) بلا إعادة تحميل
      broadcastPlatformInfo({
        name: identity.platformName || "funduqii",
        description: identity.platformSubtitle || "نظام إدارة الفنادق",
        logo: identity.platformLogo || "",
      });
      showToast(t("تم حفظ هوية المنصة"));
    } catch { showToast(t("فشل حفظ هوية المنصة"), "error"); }
  }
  function savePublic(e: React.FormEvent) { e.preventDefault(); writeLocal(PUBLIC_SETTINGS_KEY, pub); showToast(t("تم حفظ إعدادات الموقع العام")); }
  function saveSub(e: React.FormEvent) { e.preventDefault(); writeLocal(SUB_SETTINGS_KEY, sub); showToast(t("تم حفظ إعدادات الاشتراكات")); }
  function saveNotif(e: React.FormEvent) { e.preventDefault(); writeLocal(NOTIF_SETTINGS_KEY, notif); showToast(t("تم حفظ إعدادات الإشعارات")); }
  function saveSecurity(e: React.FormEvent) { e.preventDefault(); writeLocal(SECURITY_KEY, security); showToast(t("تم حفظ إعدادات الأمان")); }

  async function saveRevenue(e: React.FormEvent) {
    e.preventDefault(); setRevSaving(true);
    try {
      const res = await fetch(apiUrl("/platform/revenue-settings/"), {
        method: "PUT", headers: getAuthJsonHeaders(), body: JSON.stringify(rev),
      });
      if (!res.ok) throw new Error();
      const d = await res.json(); setRev(d); showToast(t("تم حفظ إعدادات العمولات"));
    } catch { showToast(t("فشل حفظ إعدادات العمولات"), "error"); }
    finally { setRevSaving(false); }
  }

  async function exportCsv(endpoint: string, name: string, mapRow: (r: Record<string, unknown>) => (string | number)[], head: string[]) {
    try {
      const res = await fetch(apiUrl(endpoint), { headers: getAuthHeaders() });
      const data = await res.json();
      const list: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? data.hotels ?? []);
      const rows = list.map(mapRow);
      const csv = "﻿" + [head, ...rows].map(r => r.map(f => `"${String(f ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast(t("تم التصدير"));
    } catch { showToast(t("فشل التصدير"), "error"); }
  }

  return (
    <div className="ds-page" dir="rtl">
      {toast && (
        <div className="ds-toast-stack">
          <div className={`ds-toast ds-toast-${toast.type === "success" ? "success" : "error"}`}>
            <span>{toast.message}</span>
            <button className="ds-toast-close" onClick={clearToast}><X size={14} strokeWidth={2.5} /></button>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>{t("إعدادات المنصة")}</h1>
          <p>{t("إدارة هوية المنصة والموقع العام والعمولات والاشتراكات والتكاملات")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="ds-tabs">
        {TABS.map(tab_ => (
          <button key={tab_.key} className={`ds-tab-btn${tab === tab_.key ? " active" : ""}`} onClick={() => setTab(tab_.key)}>
            <tab_.Icon size={15} strokeWidth={2} /> {t(tab_.label)}
          </button>
        ))}
      </div>

      {/* ── Tab: Identity ────────────────────────────────────────────────── */}
      {tab === "identity" && (
        <>
          <div className="ds-card-p">
            <h2 className="pf-block-title"><User size={18} /> {t("معلومات الحساب الشخصي")}</h2>
            <form onSubmit={saveProfile}>
              <div className="pf-grid-auto">
                <div className="field">
                  <label className="field-label">{t("اسم المستخدم")}</label>
                  <input className="input" value={profile.username} readOnly />
                  <span className="pf-hint">{t("لا يمكن تغيير اسم المستخدم")}</span>
                </div>
                <div className="field">
                  <label className="field-label">{t("البريد الإلكتروني")}</label>
                  <input className="input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">{t("الاسم الأول")}</label>
                  <input className="input" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} placeholder={t("اختياري")} />
                </div>
                <div className="field">
                  <label className="field-label">{t("الاسم الأخير")}</label>
                  <input className="input" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} placeholder={t("اختياري")} />
                </div>
              </div>
              {profileErr && <div className="ds-alert ds-alert-danger pf-form-actions">{profileErr}</div>}
              <div className="pf-form-actions">
                <button type="submit" className="ds-btn ds-btn-primary" disabled={profileSaving}>
                  <Save size={15} /> {profileSaving ? t("جارٍ الحفظ...") : t("حفظ الحساب")}
                </button>
              </div>
            </form>
          </div>

          <div className="ds-card-p">
            <h2 className="pf-block-title"><KeyRound size={18} /> {t("تغيير كلمة المرور")}</h2>
            <form onSubmit={savePassword}>
              <div className="pf-grid-auto">
                <div className="field"><label className="field-label">{t("كلمة المرور الحالية")}</label><EyeInput value={oldPass} onChange={setOldPass} /></div>
                <div className="field"><label className="field-label">{t("كلمة المرور الجديدة")}</label><EyeInput value={newPass} onChange={setNewPass} placeholder={t("8 أحرف على الأقل")} /></div>
                <div className="field"><label className="field-label">{t("تأكيد كلمة المرور")}</label><EyeInput value={confPass} onChange={setConfPass} /></div>
              </div>
              {passErr && <div className="ds-alert ds-alert-danger pf-form-actions">{passErr}</div>}
              <div className="pf-form-actions">
                <button type="submit" className="ds-btn ds-btn-warning" disabled={passSaving}>
                  <KeyRound size={15} /> {passSaving ? t("جارٍ التغيير...") : t("تغيير كلمة المرور")}
                </button>
              </div>
            </form>
          </div>

          <div className="ds-card-p">
            <h2 className="pf-block-title"><Building2 size={18} /> {t("هوية المنصة")}</h2>
            <p className="pf-hint">{t("تُستخدم في السايدبار والموقع العام وصفحة الدخول والتقارير.")}</p>
            <form onSubmit={saveIdentity}>
              <div className="pf-grid-auto">
                <div className="field"><label className="field-label">{t("اسم المنصة")}</label><input className="input" value={identity.platformName} onChange={e => setIdentity(s => ({ ...s, platformName: e.target.value }))} placeholder="funduqii" /></div>
                <div className="field"><label className="field-label">{t("الوصف المختصر")}</label><input className="input" value={identity.platformSubtitle} onChange={e => setIdentity(s => ({ ...s, platformSubtitle: e.target.value }))} /></div>
                <div className="field"><label className="field-label">{t("رابط الشعار (Logo)")}</label><input className="input" type="url" value={identity.platformLogo} onChange={e => setIdentity(s => ({ ...s, platformLogo: e.target.value }))} placeholder="https://.../logo.png" /></div>
                <div className="field"><label className="field-label">{t("بريد التواصل")}</label><input className="input" type="email" value={identity.platformEmail} onChange={e => setIdentity(s => ({ ...s, platformEmail: e.target.value }))} /></div>
                <div className="field"><label className="field-label">{t("رقم الهاتف")}</label><input className="input" type="tel" value={identity.platformPhone} onChange={e => setIdentity(s => ({ ...s, platformPhone: e.target.value }))} /></div>
                <div className="field"><label className="field-label">{t("رابط الموقع")}</label><input className="input" type="url" value={identity.platformWebsite} onChange={e => setIdentity(s => ({ ...s, platformWebsite: e.target.value }))} /></div>
                <div className="field"><label className="field-label">{t("العنوان")}</label><input className="input" value={identity.platformAddress} onChange={e => setIdentity(s => ({ ...s, platformAddress: e.target.value }))} /></div>
              </div>
              <div className="pf-form-actions"><button type="submit" className="ds-btn ds-btn-primary"><Save size={15} /> {t("حفظ الهوية")}</button></div>
            </form>
          </div>
        </>
      )}

      {/* ── Tab: Public site ─────────────────────────────────────────────── */}
      {tab === "public" && (
        <div className="ds-card-p">
          <h2 className="pf-block-title"><Globe size={18} /> {t("إعدادات الموقع العام")}</h2>
          <form onSubmit={savePublic}>
            <div className="pf-grid-auto">
              <label className="pf-check-row"><input type="checkbox" checked={pub.enablePublicSite} onChange={e => setPub(s => ({ ...s, enablePublicSite: e.target.checked }))} /> {t("تفعيل الموقع العام")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={pub.showHotels} onChange={e => setPub(s => ({ ...s, showHotels: e.target.checked }))} /> {t("عرض الفنادق في الموقع")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={pub.allowBooking} onChange={e => setPub(s => ({ ...s, allowBooking: e.target.checked }))} /> {t("السماح بالحجز من الموقع")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={pub.showFeatured} onChange={e => setPub(s => ({ ...s, showFeatured: e.target.checked }))} /> {t("إظهار الفنادق المميزة")}</label>
            </div>
            <hr className="pf-divider" />
            <div className="pf-grid-auto">
              <div className="field"><label className="field-label">{t("الدولة الافتراضية")}</label><input className="input" value={pub.defaultCountry} onChange={e => setPub(s => ({ ...s, defaultCountry: e.target.value }))} /></div>
              <div className="field">
                <label className="field-label">{t("ترتيب الفنادق")}</label>
                <select className="select" value={pub.ordering} onChange={e => setPub(s => ({ ...s, ordering: e.target.value }))}>
                  <option value="featured">{t("المميزة أولًا")}</option>
                  <option value="newest">{t("الأحدث")}</option>
                  <option value="price">{t("السعر")}</option>
                </select>
              </div>
            </div>
            <div className="field"><label className="field-label">{t("سياسة الحجز العامة")}</label><textarea className="textarea" value={pub.bookingPolicy} onChange={e => setPub(s => ({ ...s, bookingPolicy: e.target.value }))} /></div>
            <div className="field"><label className="field-label">{t("سياسة الإلغاء العامة")}</label><textarea className="textarea" value={pub.cancellationPolicy} onChange={e => setPub(s => ({ ...s, cancellationPolicy: e.target.value }))} /></div>
            <div className="field"><label className="field-label">{t("نص الدفع عند الوصول")}</label><textarea className="textarea" value={pub.payAtArrivalText} onChange={e => setPub(s => ({ ...s, payAtArrivalText: e.target.value }))} /></div>
            <div className="field"><label className="field-label">{t("نص شروط الاستخدام")}</label><textarea className="textarea" value={pub.termsText} onChange={e => setPub(s => ({ ...s, termsText: e.target.value }))} /></div>
            <div className="field"><label className="field-label">{t("نص سياسة الخصوصية")}</label><textarea className="textarea" value={pub.privacyText} onChange={e => setPub(s => ({ ...s, privacyText: e.target.value }))} /></div>
            <div className="pf-form-actions"><button type="submit" className="ds-btn ds-btn-primary"><Save size={15} /> {t("حفظ إعدادات الموقع")}</button></div>
          </form>
        </div>
      )}

      {/* ── Tab: Public bookings ─────────────────────────────────────────── */}
      {tab === "bookings" && (
        <div className="ds-card-p">
          <h2 className="pf-block-title"><CalendarCheck size={18} /> {t("إعدادات الحجوزات العامة")}</h2>
          <form onSubmit={savePublic}>
            <div className="pf-grid-auto">
              <label className="pf-check-row"><input type="checkbox" checked={pub.payAtArrival} onChange={e => setPub(s => ({ ...s, payAtArrival: e.target.checked }))} /> {t("تفعيل الدفع عند الوصول")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={pub.allowCancel} onChange={e => setPub(s => ({ ...s, allowCancel: e.target.checked }))} /> {t("السماح بإلغاء الحجز من الموقع")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={pub.hideRoomNumber} onChange={e => setPub(s => ({ ...s, hideRoomNumber: e.target.checked }))} /> {t("إخفاء رقم الغرفة عن الزبون")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={pub.createConfirmed} onChange={e => setPub(s => ({ ...s, createConfirmed: e.target.checked }))} /> {t("إنشاء الحجز كمؤكد")}</label>
            </div>
            <hr className="pf-divider" />
            <div className="pf-grid-auto">
              <div className="field"><label className="field-label">{t("مدة السماح بالإلغاء قبل الوصول (ساعات)")}</label><input className="input" type="number" min={0} max={168} value={pub.cancelWindowHours} onChange={e => setPub(s => ({ ...s, cancelWindowHours: e.target.value }))} /></div>
            </div>
            <div className="ds-alert ds-alert-info pf-form-actions">{t("حالة الوثائق الافتراضية: عند الوصول · حالة الدفع الافتراضية: غير مدفوع.")}</div>
            <div className="pf-form-actions"><button type="submit" className="ds-btn ds-btn-primary"><Save size={15} /> {t("حفظ إعدادات الحجوزات")}</button></div>
          </form>
        </div>
      )}

      {/* ── Tab: Commissions (BACKEND) ───────────────────────────────────── */}
      {tab === "commissions" && (
        <div className="ds-card-p">
          <h2 className="pf-block-title"><CircleDollarSign size={18} /> {t("إعدادات العمولات والأرباح")}</h2>
          <p className="pf-hint">{t("هذه الإعدادات محفوظة في الخادم وتُطبَّق فعليًا على عمولات حجوزات الموقع.")}</p>
          <form onSubmit={saveRevenue}>
            <label className="pf-check-row"><input type="checkbox" checked={rev.enable_booking_commission} onChange={e => setRev(s => ({ ...s, enable_booking_commission: e.target.checked }))} /> {t("تفعيل عمولة حجوزات الموقع")}</label>
            <hr className="pf-divider" />
            <div className="pf-grid-auto">
              <div className="field">
                <label className="field-label">{t("نوع العمولة الافتراضي")}</label>
                <select className="select" value={rev.default_commission_type} onChange={e => setRev(s => ({ ...s, default_commission_type: e.target.value }))}>
                  <option value="percentage">{t("نسبة مئوية من قيمة الحجز")}</option>
                  <option value="fixed_per_booking">{t("مبلغ مقطوع لكل حجز")}</option>
                  <option value="fixed_per_guest">{t("مبلغ مقطوع لكل زبون")}</option>
                </select>
              </div>
              <div className="field"><label className="field-label">{rev.default_commission_type === "percentage" ? t("النسبة (%)") : t("القيمة")}</label><input className="input" type="number" value={rev.default_commission_value} onChange={e => setRev(s => ({ ...s, default_commission_value: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="field"><label className="field-label">{t("عملة المبلغ المقطوع")}</label><input className="input" value={rev.default_commission_currency} onChange={e => setRev(s => ({ ...s, default_commission_currency: e.target.value.toUpperCase() }))} disabled={rev.default_commission_type === "percentage"} /></div>
              <div className="field">
                <label className="field-label">{t("متى تستحق العمولة")}</label>
                <select className="select" value={rev.calculate_commission_on_status} onChange={e => setRev(s => ({ ...s, calculate_commission_on_status: e.target.value }))}>
                  <option value="on_booking_created">{t("عند إنشاء الحجز")}</option>
                  <option value="on_guest_arrived">{t("عند وصول الزبون")}</option>
                  <option value="on_check_in">{t("عند تسجيل الدخول")}</option>
                  <option value="on_completed">{t("عند اكتمال الحجز")}</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">{t("سياسة عدم الحضور")}</label>
                <select className="select" value={rev.no_show_policy} onChange={e => setRev(s => ({ ...s, no_show_policy: e.target.value }))}>
                  <option value="waive">{t("إعفاء العمولة")}</option>
                  <option value="keep">{t("إبقاؤها مستحقة")}</option>
                </select>
              </div>
            </div>
            <label className="pf-check-row pf-form-actions"><input type="checkbox" checked={rev.allow_hotel_override} onChange={e => setRev(s => ({ ...s, allow_hotel_override: e.target.checked }))} /> {t("السماح بإعداد عمولة خاص لكل فندق")}</label>
            <div className="pf-form-actions"><button type="submit" className="ds-btn ds-btn-primary" disabled={revSaving}><Save size={15} /> {revSaving ? t("جارٍ الحفظ...") : t("حفظ إعدادات العمولات")}</button></div>
          </form>
        </div>
      )}

      {/* ── Tab: Subscriptions ───────────────────────────────────────────── */}
      {tab === "subscriptions" && (
        <div className="ds-card-p">
          <h2 className="pf-block-title"><BadgeCheck size={18} /> {t("إعدادات الاشتراكات")}</h2>
          <form onSubmit={saveSub}>
            <div className="pf-grid-auto">
              <div className="field"><label className="field-label">{t("مدة الفترة التجريبية (أيام)")}</label><input className="input" type="number" min={1} max={90} value={sub.trialDays} onChange={e => setSub(s => ({ ...s, trialDays: e.target.value }))} /></div>
              <div className="field"><label className="field-label">{t("أيام التذكير قبل الانتهاء")}</label><input className="input" type="number" min={1} max={60} value={sub.reminderDays} onChange={e => setSub(s => ({ ...s, reminderDays: e.target.value }))} /></div>
            </div>
            <hr className="pf-divider" />
            <label className="pf-check-row"><input type="checkbox" checked={sub.autoRenewal} onChange={e => setSub(s => ({ ...s, autoRenewal: e.target.checked }))} /> {t("تفعيل التجديد التلقائي للاشتراكات")}</label>
            <label className="pf-check-row pf-form-actions"><input type="checkbox" checked={sub.suspendOnExpiry} onChange={e => setSub(s => ({ ...s, suspendOnExpiry: e.target.checked }))} /> {t("إيقاف الفندق عند انتهاء الاشتراك")}</label>
            <label className="pf-check-row pf-form-actions"><input type="checkbox" checked={sub.publicRequiresActive} onChange={e => setSub(s => ({ ...s, publicRequiresActive: e.target.checked }))} /> {t("اشتراط اشتراك نشط للظهور في الموقع العام")}</label>
            <div className="pf-form-actions"><button type="submit" className="ds-btn ds-btn-primary"><Save size={15} /> {t("حفظ إعدادات الاشتراكات")}</button></div>
          </form>
        </div>
      )}

      {/* ── Tab: Notifications ───────────────────────────────────────────── */}
      {tab === "notifications" && (
        <div className="ds-card-p">
          <h2 className="pf-block-title"><Bell size={18} /> {t("إعدادات الإشعارات")}</h2>
          <form onSubmit={saveNotif}>
            <p className="pf-section-label">{t("أنواع الإشعارات")}</p>
            <div className="pf-grid-auto">
              <label className="pf-check-row"><input type="checkbox" checked={notif.subRequests} onChange={e => setNotif(s => ({ ...s, subRequests: e.target.checked }))} /> {t("طلبات الاشتراك")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={notif.subExpiry} onChange={e => setNotif(s => ({ ...s, subExpiry: e.target.checked }))} /> {t("انتهاء الاشتراكات")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={notif.webBookings} onChange={e => setNotif(s => ({ ...s, webBookings: e.target.checked }))} /> {t("حجوزات الموقع")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={notif.commissions} onChange={e => setNotif(s => ({ ...s, commissions: e.target.checked }))} /> {t("العمولات")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={notif.suspendedHotels} onChange={e => setNotif(s => ({ ...s, suspendedHotels: e.target.checked }))} /> {t("الفنادق الموقوفة")}</label>
            </div>
            <hr className="pf-divider" />
            <p className="pf-section-label">{t("قنوات الإشعار")}</p>
            <div className="pf-grid-auto">
              <label className="pf-check-row"><input type="checkbox" checked={notif.channelEmail} onChange={e => setNotif(s => ({ ...s, channelEmail: e.target.checked }))} /> {t("البريد الإلكتروني")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={notif.channelSms} onChange={e => setNotif(s => ({ ...s, channelSms: e.target.checked }))} /> {t("رسائل SMS")}</label>
              <label className="pf-check-row"><input type="checkbox" checked={notif.channelWhatsapp} onChange={e => setNotif(s => ({ ...s, channelWhatsapp: e.target.checked }))} /> WhatsApp</label>
            </div>
            <div className="pf-form-actions"><button type="submit" className="ds-btn ds-btn-primary"><Save size={15} /> {t("حفظ إعدادات الإشعارات")}</button></div>
          </form>
        </div>
      )}

      {/* ── Tab: Integrations ────────────────────────────────────────────── */}
      {tab === "integrations" && (
        <div className="ds-card-p">
          <h2 className="pf-block-title"><Plug size={18} /> {t("التكاملات")}</h2>
          <p className="pf-hint">{t("تُضبط مفاتيح التكامل عبر متغيّرات البيئة في الخادم لأسباب أمنية.")}</p>
          <div className="pf-health-list">
            <div className="pf-health-row"><Globe size={16} /> <span className="pf-health-text">{t("البريد الإلكتروني (SMTP)")}</span><span className="pf-health-status"><span className="ds-badge ds-badge-neutral">{t("يُضبط عبر البيئة")}</span></span></div>
            <div className="pf-health-row"><Bell size={16} /> <span className="pf-health-text">{t("رسائل SMS (Twilio / بوابة محلية)")}</span><span className="pf-health-status"><span className="ds-badge ds-badge-neutral">{t("يُضبط عبر البيئة")}</span></span></div>
            <div className="pf-health-row"><CalendarCheck size={16} /> <span className="pf-health-text">WhatsApp Business API</span><span className="pf-health-status"><span className="ds-badge ds-badge-neutral">{t("يُضبط عبر البيئة")}</span></span></div>
            <div className="pf-health-row"><CircleDollarSign size={16} /> <span className="pf-health-text">{t("الدفع الإلكتروني")}</span><span className="pf-health-status"><span className="ds-badge ds-badge-warning">{t("قادم لاحقًا")}</span></span></div>
          </div>
          <div className="ds-alert ds-alert-info pf-form-actions">
            {t("متغيّرات البيئة المدعومة:")} EMAIL_HOST_USER/PASSWORD · SMS_PROVIDER + {t("مفاتيحه")} · WHATSAPP_PHONE_NUMBER_ID / ACCESS_TOKEN / TEMPLATE_NAME.
          </div>
        </div>
      )}

      {/* ── Tab: Security ────────────────────────────────────────────────── */}
      {tab === "security" && (
        <div className="ds-card-p">
          <h2 className="pf-block-title"><ShieldCheck size={18} /> {t("الأمان والصلاحيات")}</h2>
          <div className="pf-health-list">
            <div className="pf-health-row"><CheckCircle2 size={16} className="pf-health-icon-ok" /> <span className="pf-health-text">{t("سياسة كلمة المرور: 8 أحرف على الأقل + تحقق Django")}</span></div>
            <div className="pf-health-row"><CheckCircle2 size={16} className="pf-health-icon-ok" /> <span className="pf-health-text">{t("مدة جلسة الوصول: 30 دقيقة (JWT) · التحديث: 7 أيام")}</span></div>
            <div className="pf-health-row"><CheckCircle2 size={16} className="pf-health-icon-ok" /> <span className="pf-health-text">{t("صفحات المنصة محميّة بصلاحية صاحب المنصة فقط")}</span></div>
            <div className="pf-health-row"><AlertTriangle size={16} className="pf-health-icon-warn" /> <span className="pf-health-text">{t("إدارة أدوار أدمن المنصة المتعددين")}</span><span className="pf-health-status"><span className="ds-badge ds-badge-warning">{t("قادم لاحقًا")}</span></span></div>
          </div>
          <form onSubmit={saveSecurity}>
            <label className="pf-check-row pf-form-actions"><input type="checkbox" checked={security.enableAuditLog} onChange={e => setSecurity(s => ({ ...s, enableAuditLog: e.target.checked }))} /> {t("تفعيل تسجيل العمليات (سجل الأحداث)")}</label>
            <div className="pf-form-actions"><button type="submit" className="ds-btn ds-btn-primary"><Save size={15} /> {t("حفظ إعدادات الأمان")}</button></div>
          </form>
        </div>
      )}

      {/* ── Tab: Backup / Export ─────────────────────────────────────────── */}
      {tab === "backup" && (
        <div className="ds-card-p">
          <h2 className="pf-block-title"><DatabaseBackup size={18} /> {t("النسخ الاحتياطي والتصدير")}</h2>
          <p className="pf-hint">{t("تصدير بيانات المنصة بصيغة CSV من الخادم مباشرة.")}</p>
          <div className="pf-actions-row">
            <button className="ds-btn ds-btn-neutral" onClick={() => exportCsv("/hotels/", "hotels",
              (r) => [r.name as string, r.city as string, r.country as string, r.status as string], [t("الاسم"), t("المدينة"), t("الدولة"), t("الحالة")])}>
              <Download size={15} /> {t("تصدير الفنادق")}
            </button>
            <button className="ds-btn ds-btn-neutral" onClick={() => exportCsv("/subscriptions/", "subscriptions",
              (r) => [r.hotel_name as string, r.package_name as string, r.status as string, r.payment_status as string, r.monthly_amount as number, r.currency as string], [t("الفندق"), t("الباقة"), t("الحالة"), t("الدفع"), t("المبلغ"), t("العملة")])}>
              <Download size={15} /> {t("تصدير الاشتراكات")}
            </button>
            <button className="ds-btn ds-btn-neutral" onClick={() => exportCsv("/platform/earnings/", "earnings",
              (r) => [r.hotel_name as string, r.web_bookings_count as number, r.commission_type as string, JSON.stringify(r.profit_by_currency)], [t("الفندق"), t("حجوزات الموقع"), t("نوع العمولة"), t("ربح المنصة")])}>
              <Download size={15} /> {t("تصدير الأرباح")}
            </button>
          </div>
          <div className="ds-alert ds-alert-warning pf-form-actions">
            <AlertTriangle size={16} /> {t("أي عملية استيراد أو إعادة ضبط ستكون مصحوبة بتأكيد قبل التنفيذ.")}
          </div>
        </div>
      )}

      {/* ── Tab: سجلّ التدقيق (نُقل من السايدبار إلى داخل الإعدادات) ─────────── */}
      {tab === "audit" && (
        <div>
          <h2 className="pf-block-title"><ScrollText size={18} /> {t("سجلّ التدقيق")}</h2>
          <p className="pf-hint">{t("أثر ثابت لكل عملية حسّاسة عبر جميع الفنادق والمنصّة: من فعل ماذا ومتى.")}</p>
          <AuditLogView t={t} lang={lang} showHotel={true} />
        </div>
      )}
    </div>
  );
}
