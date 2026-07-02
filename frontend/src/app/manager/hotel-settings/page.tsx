"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, Settings, BedDouble, Printer, FileText, Bell, Globe, Utensils, Check, X } from "lucide-react";
import { useLang } from "../LangContext";

import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";
import { fetchOpSettings, patchOpSettings } from "@/lib/settings";
import HotelMap from "@/components/HotelMap";
const LS_KEY = (hid: string) => `fandqi.settings.${hid}`;

function loadLS(hid: string) {
  try { return JSON.parse(localStorage.getItem(LS_KEY(hid)) ?? "{}"); } catch { return {}; }
}
function saveLS(hid: string, patch: object) {
  const cur = loadLS(hid);
  localStorage.setItem(LS_KEY(hid), JSON.stringify({ ...cur, ...patch }));
}

// ─── types ───────────────────────────────────────────────────────────────────
type TTab = "identity" | "publish" | "operations" | "rooms" | "restaurant" | "printing" | "documents" | "notifications";

interface IIdentity { name: string; ownerName: string; city: string; address: string; phone: string; email: string; website: string; logo: string | null; coverImage: string | null; mapUrl: string; latitude: string; longitude: string; }
// م1: أوقات الدخول/الخروج ووضع/مدة التنظيف حقول تشغيلية مركزية مُلزَمة خادميًّا
interface IOps { currency: string; blockCheckout: boolean; checkInTime: string; checkOutTime: string; cleaningMode: string; cleaningDuration: string; enforceShiftLogin: boolean; twoFactorPolicy: string; }
// م1: قسم «العرض على موقع الحجز» — يُحفَظ على الفندق (يغذّي الموقع العام)
interface IPublish { listingEnabled: boolean; bookingEnabled: boolean; needsConfirmation: boolean; descShort: string; descFull: string; amenities: string; stars: string; hotelType: string; galleryImages: string[]; cancellation: string; checkInPolicy: string; checkOutPolicy: string; paymentPolicy: string; showContact: boolean; }
interface IRooms { floors: string; roomTypes: string[]; defaultCapacity: string; }
interface IPrinting { showLogo: boolean; showContact: boolean; resTitle: string; accountTitle: string; terms: string; footer: string; numLang: string; }
interface IDocs { docTypes: string[]; requireGuest: boolean; requireCompanion: boolean; requireRelation: boolean; scannerUrl: string; scannerEnabled: boolean; scannerError: string; }
interface INotifs { arrivals: boolean; departures: boolean; balanceDue: boolean; cleaning: boolean; maintenance: boolean; roomAccount: boolean; balanceThreshold: string; showBell: boolean; }
// م4: إعدادات المطعم/الكافتريا (مصدر Backend: Hotel.food_settings)
interface IFood { restaurant_enabled: boolean; cafeteria_enabled: boolean; dedicated_staff: boolean; allow_cash: boolean; allow_electronic: boolean; allow_card: boolean; allow_room_account: boolean; print_receipt: boolean; }

const DEFAULT_IDENTITY: IIdentity = { name: "", ownerName: "", city: "", address: "", phone: "", email: "", website: "", logo: null, coverImage: null, mapUrl: "", latitude: "", longitude: "" };
const DEFAULT_OPS: IOps = { currency: "USD", blockCheckout: true, checkInTime: "", checkOutTime: "", cleaningMode: "manual", cleaningDuration: "60", enforceShiftLogin: false, twoFactorPolicy: "off" };
const DEFAULT_PUBLISH: IPublish = { listingEnabled: false, bookingEnabled: false, needsConfirmation: true, descShort: "", descFull: "", amenities: "", stars: "", hotelType: "hotel", galleryImages: [], cancellation: "", checkInPolicy: "", checkOutPolicy: "", paymentPolicy: "", showContact: false };
const DEFAULT_ROOMS: IRooms = { floors: "1", roomTypes: ["مفردة", "مزدوجة", "ثلاثية", "سويت", "عائلية", "جناح", "غرفة مميزة"], defaultCapacity: "2" };
const DEFAULT_PRINTING: IPrinting = {
  showLogo: true, showContact: true,
  resTitle: "ملخص الحجز", accountTitle: "كشف حساب النزيل",
  terms: "يرجى إبراز هذه الورقة عند الوصول. يتم اعتماد بيانات الحجز حسب سياسة الفندق، وتخضع أوقات الدخول والمغادرة والتعديلات لشروط الإدارة. يقر الضيف بصحة المعلومات المقدمة ويوافق على الالتزام بسياسات الفندق والتعليمات المعمول بها أثناء الإقامة.",
  footer: "", numLang: "en",
};
const DEFAULT_DOCS: IDocs = {
  docTypes: ["هوية شخصية", "جواز سفر", "دفتر عائلة", "إقامة", "إثبات قرابة", "أخرى"],
  requireGuest: true, requireCompanion: true, requireRelation: true,
  scannerUrl: "http://127.0.0.1:18189", scannerEnabled: false,
  scannerError: "تعذر الاتصال بخدمة الماسح الضوئي. تأكد من تشغيل خدمة الماسح المحلي ثم حاول مرة أخرى.",
};
const DEFAULT_NOTIFS: INotifs = { arrivals: true, departures: true, balanceDue: true, cleaning: true, maintenance: true, roomAccount: true, balanceThreshold: "0", showBell: true };
const DEFAULT_FOOD: IFood = { restaurant_enabled: true, cafeteria_enabled: true, dedicated_staff: false, allow_cash: true, allow_electronic: true, allow_card: true, allow_room_account: true, print_receipt: true };


// ─── shared sub-components ───────────────────────────────────────────────────
function FLD({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint && <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>{hint}</p>}
    </div>
  );
}

function SW({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.6rem 0", borderBottom: "1px solid var(--color-border)" }}>
      <label style={{ position: "relative", width: "2.2rem", height: "1.2rem", flexShrink: 0, marginTop: "0.1rem" }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
        <span style={{
          position: "absolute", inset: 0, borderRadius: "1rem", cursor: "pointer",
          background: checked ? "var(--color-primary)" : "var(--color-border-strong)",
          transition: "background 0.2s",
        }} />
        <span style={{
          position: "absolute", top: "0.1rem",
          right: checked ? "0.1rem" : "1rem",
          width: "1rem", height: "1rem",
          borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px #0002",
          transition: "right 0.2s",
        }} />
      </label>
      <div>
        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text)", margin: 0 }}>{label}</p>
        {hint && <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", margin: 0, marginTop: "0.15rem" }}>{hint}</p>}
      </div>
    </div>
  );
}

function SaveBtn({ label, saving, saved, onClick }: { label: string; saving: boolean; saved: boolean; onClick: () => void }) {
  const { t } = useLang();
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`ds-btn ds-btn-sm ${saved ? "ds-btn-success" : "ds-btn-primary"}`}
      style={{ opacity: saving ? 0.7 : 1 }}
    >
      {saving ? t("جارٍ الحفظ...") : saved ? <><Check size={13}/> {t("تم الحفظ")}</> : label}
    </button>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="ds-toast-stack">
      <div className="ds-toast ds-toast-success">
        <span>{msg}</span>
        <button className="ds-toast-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

function CardSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="ds-card-p" style={{ marginBottom: "1rem" }}>
      <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-heading)", marginBottom: "0.2rem" }}>{title}</p>
      {desc && <p style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginBottom: "1rem" }}>{desc}</p>}
      {children}
    </div>
  );
}

const G2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.25rem" };
const G3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "0.25rem" };

// ─── main component ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t, lang } = useLang();

  const TABS: { key: TTab; label: string; Icon: LucideIcon }[] = [
    { key: "identity",      label: t("الهوية العامة"),        Icon: Building2 },
    { key: "publish",       label: t("العرض على موقع الحجز"),  Icon: Globe },
    { key: "operations",    label: t("التشغيل والحجوزات"),    Icon: Settings },
    { key: "rooms",         label: t("الغرف والطوابق"),       Icon: BedDouble },
    { key: "restaurant",    label: t("المطعم والكافتريا"),    Icon: Utensils },
    { key: "printing",      label: t("الطباعة والفواتير"),    Icon: Printer },
    { key: "documents",     label: t("الوثائق والماسح"),      Icon: FileText },
    { key: "notifications", label: t("التنبيهات"),             Icon: Bell },
    // د‑1: أُزيل تبويبا «النسخ الاحتياطي» (يخصّ إدارة المنصّة/السيرفر) و«الواجهة» (تفضيلات شخصية للمستخدم).
  ];

  const hotelId = typeof window !== "undefined" ? (localStorage.getItem("hotel_id") ?? "") : "";
  const [tab, setTab]       = useState<TTab>("identity");
  const [toast, setToast]   = useState("");
  const [error, setError]   = useState("");
  const fileRef              = useRef<HTMLInputElement>(null);
  const [maxFloor, setMaxFloor] = useState(0);
  const [newDocType, setNewDocType]     = useState("");
  const [newRoomType, setNewRoomType]   = useState("");

  const [saving, setSaving] = useState(false);

  // State per section
  const [identity,  setIdentity]  = useState<IIdentity>(DEFAULT_IDENTITY);
  const [ops,       setOps]       = useState<IOps>(DEFAULT_OPS);
  const [pub,       setPub]       = useState<IPublish>(DEFAULT_PUBLISH);
  const [food,      setFood]      = useState<IFood>(DEFAULT_FOOD);
  const [hotelCode, setHotelCode] = useState("");
  // م8: اتفاقية حجوزات الموقع (يجب قبولها قبل تفعيل الظهور/الحجز)
  const [agreement, setAgreement] = useState<{ text: string; accepted: boolean; accepted_by_name: string; accepted_at: string | null }>({ text: "", accepted: false, accepted_by_name: "", accepted_at: null });
  const [rooms,     setRooms]     = useState<IRooms>(DEFAULT_ROOMS);
  const [printing,  setPrinting]  = useState<IPrinting>(DEFAULT_PRINTING);
  const [docs,      setDocs]      = useState<IDocs>(DEFAULT_DOCS);
  const [notifs,    setNotifs]    = useState<INotifs>(DEFAULT_NOTIFS);

  // Load from backend + localStorage
  useEffect(() => {
    if (!hotelId) return;

    const loadLocal = async () => {
      // load from localStorage first (sync, wrapped async to avoid set-state-in-effect)
      const ls = loadLS(hotelId);
      if (ls.identity)   setIdentity(prev => ({ ...prev, ...ls.identity }));
      if (ls.ops)        setOps(prev => ({ ...prev, ...ls.ops }));
      if (ls.rooms)      setRooms(prev => ({ ...prev, ...ls.rooms }));
      if (ls.printing)   setPrinting(prev => ({ ...prev, ...ls.printing }));
      if (ls.docs)       setDocs(prev => ({ ...prev, ...ls.docs }));
      if (ls.notifs)     setNotifs(prev => ({ ...prev, ...ls.notifs }));
    };
    loadLocal();

    // fetch hotel from backend (async, non-blocking)
    fetch(`${API}/hotels/${hotelId}/`, { headers: apiH() })
      .then(r => r.ok ? r.json() : null).then(d => {
        if (!d) return;
        setIdentity(prev => ({
          ...prev,
          name: d.name ?? "",
          city: d.city ?? "",
          address: d.address ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
          ownerName: d.owner_name || prev.ownerName,
          logo: d.logo ? d.logo : prev.logo,
          website: d.website || prev.website,
          coverImage: d.cover_image ?? prev.coverImage,
          mapUrl: d.map_url ?? "",
          latitude: d.latitude != null ? String(d.latitude) : "",
          longitude: d.longitude != null ? String(d.longitude) : "",
        }));
        if (d.currency) setOps(prev => ({ ...prev, currency: d.currency }));
        setOps(prev => ({
          ...prev,
          checkInTime: d.check_in_time ? String(d.check_in_time).slice(0, 5) : prev.checkInTime,
          checkOutTime: d.check_out_time ? String(d.check_out_time).slice(0, 5) : prev.checkOutTime,
          cleaningMode: d.cleaning_mode || prev.cleaningMode,
          cleaningDuration: d.cleaning_duration_minutes != null ? String(d.cleaning_duration_minutes) : prev.cleaningDuration,
          enforceShiftLogin: !!d.enforce_shift_login,
          twoFactorPolicy: d.two_factor_policy || prev.twoFactorPolicy,
        }));
        if (d.code) setHotelCode(d.code);
        if (d.food_settings && typeof d.food_settings === "object") setFood(prev => ({ ...prev, ...d.food_settings }));
        // م1: قسم «العرض على موقع الحجز»
        setPub(prev => ({
          ...prev,
          listingEnabled: !!d.public_listing_enabled,
          bookingEnabled: !!d.public_booking_enabled,
          needsConfirmation: d.web_booking_needs_confirmation !== false,
          descShort: d.public_description_short ?? prev.descShort,
          descFull: d.public_description_full ?? prev.descFull,
          amenities: Array.isArray(d.amenities) ? d.amenities.join("، ") : prev.amenities,
          stars: d.stars != null ? String(d.stars) : prev.stars,
          hotelType: d.hotel_type || prev.hotelType,
          galleryImages: Array.isArray(d.gallery_images) ? d.gallery_images : prev.galleryImages,
          cancellation: d.cancellation_policy ?? prev.cancellation,
          checkInPolicy: d.check_in_policy ?? prev.checkInPolicy,
          checkOutPolicy: d.check_out_policy ?? prev.checkOutPolicy,
          paymentPolicy: d.payment_policy ?? prev.paymentPolicy,
          showContact: !!d.show_contact_info,
        }));
        if (d.floors_count) setRooms(prev => ({ ...prev, floors: String(d.floors_count) }));
      }).catch(() => {});
    // م8: حالة اتفاقية حجوزات الموقع
    fetch(`${API}/platform/web-booking-agreement/`, { headers: apiH() })
      .then(r => r.ok ? r.json() : null).then(a => { if (a) setAgreement(a); }).catch(() => {});
    // م1: جلب حِزم إعدادات التشغيل من الخادم (المصدر) — تتقدّم على المخبّأ المحلّي
    fetchOpSettings().then(s => {
      if (!s) return;
      if (Object.keys(s.printing).length)      setPrinting(prev => ({ ...prev, ...(s.printing as Partial<IPrinting>) }));
      if (Object.keys(s.documents).length)     setDocs(prev => ({ ...prev, ...(s.documents as Partial<IDocs>) }));
      if (Object.keys(s.notifications).length) setNotifs(prev => ({ ...prev, ...(s.notifications as Partial<INotifs>) }));
    });
    // fetch rooms to compute max floor
    fetch(`${API}/rooms/?hotel=${hotelId}`, { headers: apiH() })
      .then(r => r.ok ? r.json() : []).then((rs: { floor?: number }[]) => {
        const max = rs.reduce((acc, r) => Math.max(acc, r.floor ?? 0), 0);
        setMaxFloor(max);
      }).catch(() => {});
  }, [hotelId]);

  const showToast = useCallback((msg: string) => { setToast(msg); setError(""); }, []);

  // ── Per-tab save ─────────────────────────────────────────────────────────
  async function doSaveIdentity() {
    if (!identity.name.trim()) { setError(t("اسم الفندق لا يجب أن يكون فارغًا.")); return; }
    if (identity.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) { setError(t("البريد الإلكتروني غير صحيح.")); return; }
    const lat = identity.latitude.trim();
    const lng = identity.longitude.trim();
    if ((lat && !lng) || (!lat && lng)) { setError(t("يجب تحديد خط العرض وخط الطول معًا.")); return; }
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        name: identity.name,
        city: identity.city,
        address: identity.address,
        phone: identity.phone,
        email: identity.email,
        owner_name: identity.ownerName ?? "",
        logo: identity.logo ?? "",
        website: identity.website ?? "",
        cover_image: identity.coverImage ?? "",
        map_url: identity.mapUrl,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
      };
      await fetch(`${API}/hotels/${hotelId}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify(body) });
    } catch { /* backend might not support PATCH — ok */ }
    saveLS(hotelId, { identity });
    setSaving(false);
    showToast(t("تم حفظ بيانات الهوية العامة بنجاح."));
  }

  async function doSaveOps() {
    // د‑1: أُزيلت إعدادات توليد رقم الحجز (بادئة/آخر رقم/خانات) — الرقم يتولّد ذرّيًا من الخادم.
    // م1: العملة + الأوقات + وضع/مدة التنظيف = حقول تشغيلية مركزية تُلزَم خادميًّا (المصدر).
    const dur = parseInt(ops.cleaningDuration, 10);
    if (ops.cleaningMode === "auto" && (isNaN(dur) || dur < 1)) {
      setError(t("مدة التنظيف يجب أن تكون دقيقة واحدة على الأقل عند التنظيف التلقائي.")); return;
    }
    setSaving(true); setError("");
    try {
      await fetch(`${API}/hotels/${hotelId}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify({
        currency: ops.currency,
        check_in_time: ops.checkInTime || null,
        check_out_time: ops.checkOutTime || null,
        cleaning_mode: ops.cleaningMode,
        cleaning_duration_minutes: isNaN(dur) ? 60 : dur,
        enforce_shift_login: ops.enforceShiftLogin,
        two_factor_policy: ops.twoFactorPolicy,
      }) });
    } catch { /* ok */ }
    saveLS(hotelId, { ops });
    setSaving(false);
    showToast(t("تم حفظ إعدادات التشغيل والحجوزات بنجاح."));
  }

  async function doSaveFood() {
    setSaving(true); setError("");
    try {
      await fetch(`${API}/hotels/${hotelId}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify({ food_settings: food }) });
    } catch { /* ok */ }
    // مزامنة المخبّأ لصفحة الخدمات (تفعيل/تعطيل الأقسام)
    saveLS(hotelId, { rest: { hasRestaurant: food.restaurant_enabled, hasCafeteria: food.cafeteria_enabled, hasRoomService: true } });
    setSaving(false);
    showToast(t("تم حفظ إعدادات المطعم والكافتريا بنجاح."));
  }

  async function acceptAgreement() {
    setSaving(true); setError("");
    try {
      const r = await fetch(`${API}/platform/web-booking-agreement/`, { method: "POST", headers: apiHJ(), body: "{}" });
      if (r.ok) { setAgreement(await r.json()); showToast(t("تم قبول اتفاقية حجوزات الموقع.")); }
      else setError(t("تعذّر قبول الاتفاقية."));
    } catch { setError(t("خطأ في الاتصال.")); }
    setSaving(false);
  }

  async function doSavePublish() {
    const st = pub.stars.trim();
    if (st && (isNaN(Number(st)) || Number(st) < 1 || Number(st) > 5)) { setError(t("التصنيف يجب أن يكون بين 1 و5 نجوم.")); return; }
    setSaving(true); setError("");
    try {
      await fetch(`${API}/hotels/${hotelId}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify({
        public_listing_enabled: pub.listingEnabled,
        public_booking_enabled: pub.bookingEnabled,
        web_booking_needs_confirmation: pub.needsConfirmation,
        public_description_short: pub.descShort,
        public_description_full: pub.descFull,
        amenities: pub.amenities.split(/[،,]/).map(s => s.trim()).filter(Boolean),
        gallery_images: pub.galleryImages,
        stars: st ? Number(st) : null,
        hotel_type: pub.hotelType,
        cancellation_policy: pub.cancellation,
        check_in_policy: pub.checkInPolicy,
        check_out_policy: pub.checkOutPolicy,
        payment_policy: pub.paymentPolicy,
        show_contact_info: pub.showContact,
      }) });
    } catch { /* ok */ }
    setSaving(false);
    showToast(t("تم حفظ إعدادات العرض على موقع الحجز بنجاح."));
  }

  async function doSaveRooms() {
    const fl = parseInt(rooms.floors, 10);
    if (isNaN(fl) || fl < 1) { setError(t("عدد الطوابق يجب أن يكون أكبر من صفر.")); return; }
    if (fl < maxFloor) { setError(lang === "ar" ? `لا يمكن تقليل الطوابق عن ${maxFloor} (أعلى طابق مستخدم حالياً).` : `Cannot reduce floors below ${maxFloor} (highest floor currently in use).`); return; }
    if (rooms.roomTypes.length === 0) { setError(t("لا يجب حفظ قائمة أنواع غرف فارغة.")); return; }
    try {
      await fetch(`${API}/hotels/${hotelId}/`, { method: "PATCH", headers: apiHJ(), body: JSON.stringify({ floors_count: fl }) });
    } catch { /* ok */ }
    saveLS(hotelId, { rooms });
    showToast(t("تم حفظ إعدادات الغرف والطوابق بنجاح."));
  }

  async function doSavePrinting() {
    setSaving(true);
    await patchOpSettings({ printing: printing as unknown as Record<string, unknown> });   // م1: مصدر خادمي
    saveLS(hotelId, { printing });
    setSaving(false);
    showToast(t("تم حفظ إعدادات الطباعة والفواتير بنجاح."));
  }

  async function doSaveDocs() {
    if (docs.docTypes.length === 0) { setError(t("يجب أن تحتوي أنواع الوثائق على نوع واحد على الأقل.")); return; }
    if (docs.scannerEnabled && !docs.scannerUrl.trim()) { setError(t("عنوان خدمة الماسح مطلوب عند تفعيله.")); return; }
    setSaving(true);
    await patchOpSettings({ documents: docs as unknown as Record<string, unknown> });
    saveLS(hotelId, { docs });
    setSaving(false);
    showToast(t("تم حفظ إعدادات الوثائق والماسح بنجاح."));
  }

  async function doSaveNotifs() {
    setSaving(true);
    await patchOpSettings({ notifications: notifs as unknown as Record<string, unknown> });
    saveLS(hotelId, { notifs });
    setSaving(false);
    window.dispatchEvent(new Event("fandqi:settings-update"));
    showToast(t("تم حفظ إعدادات التنبيهات بنجاح."));
  }

  // د‑1: أُزيلت دوال النسخ الاحتياطي (export/import/reset) وحفظ الواجهة — تبويباتها حُذفت.

  // ── Logo ────────────────────────────────────────────────────────────────────
  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setIdentity(prev => {
        const next = { ...prev, logo: dataUrl };
        if (hotelId) saveLS(hotelId, { identity: next });
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  // ── Cover image ────────────────────────────────────────────────────────────────
  function handleCoverImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError(t("حجم الصورة كبير جدًا. الحد الأقصى 3 ميجابايت.")); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setIdentity(prev => ({ ...prev, coverImage: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  // ── Gallery images (م1: العرض على موقع الحجز) ───────────────────────────────
  function handleGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    files.forEach(file => {
      if (file.size > 3 * 1024 * 1024) { setError(t("حجم الصورة كبير جدًا. الحد الأقصى 3 ميجابايت.")); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        setPub(prev => ({ ...prev, galleryImages: [...prev.galleryImages, dataUrl] }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  // ─── room type helpers ────────────────────────────────────────────────────
  function addRoomType() {
    const val = newRoomType.trim();
    if (val && !rooms.roomTypes.includes(val)) {
      setRooms(prev => ({ ...prev, roomTypes: [...prev.roomTypes, val] }));
    }
    setNewRoomType("");
  }
  function removeRoomType(idx: number) {
    setRooms(prev => ({ ...prev, roomTypes: prev.roomTypes.filter((_, i) => i !== idx) }));
  }

  // ─── doc type helpers ─────────────────────────────────────────────────────
  function addDocType() {
    const val = newDocType.trim();
    if (val && !docs.docTypes.includes(val)) {
      setDocs(prev => ({ ...prev, docTypes: [...prev.docTypes, val] }));
    }
    setNewDocType("");
  }
  function removeDocType(idx: number) {
    setDocs(prev => ({ ...prev, docTypes: prev.docTypes.filter((_, i) => i !== idx) }));
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="ds-page" dir="rtl">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.75rem", color: "#4f46e5", fontWeight: 600, marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("لوحة التحكم")}
          </p>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>{t("الإعدادات")}</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280", marginTop: "0.2rem" }}>
            {t("إدارة بيانات الفندق، العرض على موقع الحجز، التشغيل، الطباعة، الوثائق، والتنبيهات من مكان واحد.")}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "0.5rem", padding: "0.6rem 1rem", marginBottom: "1rem", color: "#dc2626", fontSize: "0.875rem" }}>
          {error}
          <button onClick={() => setError("")} style={{ float: "left", background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}><X size={15} strokeWidth={2.5}/></button>
        </div>
      )}

      {/* Tabs */}
      <div className="ds-tabs" style={{ marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(tb => (
          <button
            key={tb.key}
            className={`ds-tab-btn${tab === tb.key ? " active" : ""}`}
            onClick={() => { setTab(tb.key); setError(""); }}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <tb.Icon size={15} strokeWidth={1.8} />
            <span>{tb.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 1: الهوية العامة
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "identity" && (
        <>
          <CardSection title={t("شعار الفندق")} desc={t("الشعار يظهر في الطباعة والفواتير وملخص الحجز.")}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {identity.logo
                /* eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded logo from localStorage; next/image requires configured external domains */
                ? <img src={identity.logo} alt="logo" style={{ width: 72, height: 72, borderRadius: "0.5rem", objectFit: "cover", border: "1px solid #e5e7eb" }} />
                : <div style={{ width: 72, height: 72, borderRadius: "0.5rem", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #c7d2fe" }}><Building2 size={32} strokeWidth={1.4} color="#6366f1"/></div>
              }
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => fileRef.current?.click()}>{t("رفع شعار")}</button>
                {identity.logo && (
                  <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={() => setIdentity(p => { const next = { ...p, logo: null }; if (hotelId) saveLS(hotelId, { identity: next }); return next; })}>{t("إزالة الشعار")}</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogo} />
            </div>
          </CardSection>

          <CardSection title={t("بيانات الهوية العامة")} desc={t("بيانات الفندق الأساسية التي تظهر في التوب بار والطباعة والتقارير.")}>
            <div style={G2}>
              <FLD label={t("اسم الفندق")}>
                <input className="input" value={identity.name} onChange={e => setIdentity(p => ({ ...p, name: e.target.value }))} placeholder={t("اسم الفندق")} />
              </FLD>
              <FLD label={t("اسم صاحب الفندق")} hint={t("يظهر في التوب بار ويُطبع في التقارير والفواتير")}>
                <input className="input" value={identity.ownerName ?? ""} onChange={e => setIdentity(p => ({ ...p, ownerName: e.target.value }))} placeholder={t("اسم المالك أو المسؤول")} />
              </FLD>
            </div>
            <div style={G3}>
              <FLD label={t("المدينة")}>
                <input className="input" value={identity.city} onChange={e => setIdentity(p => ({ ...p, city: e.target.value }))} placeholder={t("المدينة")} />
              </FLD>
              <FLD label={t("العنوان")}>
                <input className="input" value={identity.address} onChange={e => setIdentity(p => ({ ...p, address: e.target.value }))} placeholder={t("العنوان التفصيلي")} />
              </FLD>
              <FLD label={t("رقم الهاتف")}>
                <input className="input" value={identity.phone} onChange={e => setIdentity(p => ({ ...p, phone: e.target.value }))} placeholder="05XXXXXXXX" />
              </FLD>
            </div>
            <div style={G3}>
              <FLD label={t("البريد الإلكتروني")}>
                <input className="input" type="email" value={identity.email} onChange={e => setIdentity(p => ({ ...p, email: e.target.value }))} placeholder="hotel@example.com" />
              </FLD>
              <FLD label={t("الموقع الإلكتروني")}>
                <input className="input" value={identity.website} onChange={e => setIdentity(p => ({ ...p, website: e.target.value }))} placeholder="https://hotel.com" />
              </FLD>
              <div />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <SaveBtn label={t("حفظ الهوية العامة")} saving={saving} saved={false} onClick={doSaveIdentity} />
            </div>
          </CardSection>

          {/* صورة الغلاف ───────────────────────────────────────────────── */}
          <CardSection title={t("صورة الغلاف العامة")} desc={t("تظهر للزبائن في صفحة الفندق العامة. يُفضّل صورة عريضة بدقة عالية.")}>
            {identity.coverImage ? (
              <div style={{ marginBottom: "0.75rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded data URL */}
                <img src={identity.coverImage} alt="cover" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }} />
              </div>
            ) : (
              <div style={{ width: "100%", height: 180, borderRadius: "0.5rem", background: "#f3f4f6", border: "1px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                {t("لا توجد صورة غلاف محمّلة بعد.")}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input id="cover-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverImage} />
              <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => document.getElementById("cover-input")?.click()}>{identity.coverImage ? t("تغيير الصورة") : t("رفع صورة")}</button>
              {identity.coverImage && (
                <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={() => setIdentity(p => ({ ...p, coverImage: null }))}>{t("إزالة الصورة")}</button>
              )}
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.5rem" }}>
              {t("اضغط «حفظ الموقع والصورة» في الأسفل لحفظ التغييرات بشكل دائم.")}
            </p>
          </CardSection>

          {/* الخريطة التفاعلية ─────────────────────────────────────────── */}
          <CardSection title={t("موقع الفندق على الخريطة")} desc={t("اضغط على الخريطة لتحديد موقع الفندق. يمكن للزبائن استخدام هذا الموقع للوصول إليك مباشرةً.")}>
            <div style={G3}>
              <FLD label={t("خط العرض (Latitude)")} hint={t("مثال: 24.7136")}>
                <input className="input" value={identity.latitude} onChange={e => setIdentity(p => ({ ...p, latitude: e.target.value }))} placeholder="24.7136" inputMode="decimal" />
              </FLD>
              <FLD label={t("خط الطول (Longitude)")} hint={t("مثال: 46.6753")}>
                <input className="input" value={identity.longitude} onChange={e => setIdentity(p => ({ ...p, longitude: e.target.value }))} placeholder="46.6753" inputMode="decimal" />
              </FLD>
              <FLD label={t("رابط خرائط Google (اختياري)")} hint={t("رابط مساعد للزبائن للملاحة")}>
                <input className="input" value={identity.mapUrl} onChange={e => setIdentity(p => ({ ...p, mapUrl: e.target.value }))} placeholder="https://maps.google.com/?q=..." />
              </FLD>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <button
                type="button"
                className="ds-btn ds-btn-neutral ds-btn-sm"
                onClick={() => {
                  if (!navigator.geolocation) { setError(t("المتصفح لا يدعم تحديد الموقع.")); return; }
                  navigator.geolocation.getCurrentPosition(
                    pos => {
                      setIdentity(p => ({
                        ...p,
                        latitude: pos.coords.latitude.toFixed(7),
                        longitude: pos.coords.longitude.toFixed(7),
                      }));
                    },
                    () => setError(t("تعذّر الحصول على موقعك الحالي.")),
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }}
              >
                {t("استخدم موقعي الحالي")}
              </button>
              {(identity.latitude || identity.longitude) && (
                <button
                  type="button"
                  className="ds-btn ds-btn-danger ds-btn-sm"
                  onClick={() => setIdentity(p => ({ ...p, latitude: "", longitude: "" }))}
                >
                  {t("مسح الموقع")}
                </button>
              )}
            </div>
            <HotelMap
              lat={identity.latitude ? Number(identity.latitude) : null}
              lng={identity.longitude ? Number(identity.longitude) : null}
              editable
              height={360}
              onChange={(la, ln) => setIdentity(p => ({ ...p, latitude: String(la), longitude: String(ln) }))}
            />
            <div style={{ marginTop: "1rem" }}>
              <SaveBtn label={t("حفظ الموقع والصورة")} saving={saving} saved={false} onClick={doSaveIdentity} />
            </div>
          </CardSection>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 2: التشغيل والحجوزات
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "operations" && (
        <CardSection title={t("التشغيل والحجوزات")} desc={t("العملة الافتراضية وأوقات الدخول/الخروج وسياسة التنظيف.")}>
          <div style={G3}>
            <FLD label={t("العملة الافتراضية")}>
              <select className="select" value={ops.currency} onChange={e => setOps(p => ({ ...p, currency: e.target.value }))}>
                {["USD", "EUR", "TRY", "SAR", "AED", "SYP"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FLD>
            <FLD label={t("وقت الدخول الافتراضي")} hint={t("يظهر في ملخص الحجز والموقع العام")}>
              <input className="input" type="time" value={ops.checkInTime} onChange={e => setOps(p => ({ ...p, checkInTime: e.target.value }))} />
            </FLD>
            <FLD label={t("وقت المغادرة الافتراضي")}>
              <input className="input" type="time" value={ops.checkOutTime} onChange={e => setOps(p => ({ ...p, checkOutTime: e.target.value }))} />
            </FLD>
          </div>
          <div style={G3}>
            <FLD label={t("طريقة رجوع الغرفة بعد التنظيف")} hint={t("تلقائي: تعود متاحة بعد المدة · يدوي: بزر «تم التنظيف»")}>
              <select className="select" value={ops.cleaningMode} onChange={e => setOps(p => ({ ...p, cleaningMode: e.target.value }))}>
                <option value="manual">{t("يدوي")}</option>
                <option value="auto">{t("تلقائي")}</option>
              </select>
            </FLD>
            {ops.cleaningMode === "auto" && (
              <FLD label={t("مدة التنظيف (دقائق)")} hint={t("بعدها تعود الغرفة متاحة تلقائيًا")}>
                <input className="input" type="number" min={1} value={ops.cleaningDuration} onChange={e => setOps(p => ({ ...p, cleaningDuration: e.target.value }))} />
              </FLD>
            )}
          </div>
          <div className="ds-alert ds-alert-info" style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
            {t("رقم الحجز يتولّد تلقائيًا من النظام لكل فندق (بلا تضارب) — لا حاجة لضبط بادئة أو خانات.")}
          </div>
          {hotelCode && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
              {t("كود الفندق الداخلي")}: <strong style={{ color: "#4f46e5", letterSpacing: "0.05em" }}>{hotelCode}</strong>
              <span style={{ marginInlineStart: 8, fontSize: "0.78rem" }}>({t("للعرض فقط — لا يُعدَّل")})</span>
            </div>
          )}
          <div style={{ marginTop: "0.5rem" }}>
            <SW label={t("منع تسجيل الخروج عند وجود متبقي مالي")} checked={ops.blockCheckout} onChange={v => setOps(p => ({ ...p, blockCheckout: v }))} hint={t("يمنع إتمام الخروج حتى يُسوَّى الرصيد المستحق (مُلزَم خادميًّا)")} />
            <SW label={t("منع تسجيل دخول الموظفين خارج أوقات الورديات")} checked={ops.enforceShiftLogin} onChange={v => setOps(p => ({ ...p, enforceShiftLogin: v }))} hint={t("عند التفعيل: لا يستطيع الموظف الدخول خارج نافذة ورديته المحددة (المدير مُستثنى)")} />
          </div>
          <div style={{ marginTop: "0.75rem", maxWidth: 360 }}>
            <FLD label={t("سياسة التحقق بخطوتين (2FA)")} hint={t("فرض التحقق بخطوتين على الدخول — إضافةً إلى التفعيل الذاتي لكل مستخدم")}>
              <select className="select" value={ops.twoFactorPolicy} onChange={e => setOps(p => ({ ...p, twoFactorPolicy: e.target.value }))}>
                <option value="off">{t("اختياري (تفعيل ذاتي لكل مستخدم)")}</option>
                <option value="managers">{t("إلزامي للمدير")}</option>
                <option value="all">{t("إلزامي لكل الموظفين")}</option>
              </select>
            </FLD>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات التشغيل")} saving={saving} saved={false} onClick={doSaveOps} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB: العرض على موقع الحجز
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "publish" && (
        <>
          {/* م8: اتفاقية المنصّة — يجب قبولها قبل تفعيل الظهور/الحجز */}
          <CardSection title={t("اتفاقية حجوزات الموقع")} desc={t("يجب قبول هذه الاتفاقية قبل تفعيل ظهور الفندق أو استقبال حجوزات الموقع.")}>
            {agreement.accepted ? (
              <div className="ds-alert ds-alert-success" style={{ fontSize: "0.85rem" }}>
                <Check size={15} /> {t("الاتفاقية مقبولة")} — {agreement.accepted_by_name}{agreement.accepted_at ? ` · ${new Date(agreement.accepted_at).toLocaleDateString()}` : ""}
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 8, padding: "0.75rem", fontSize: "0.82rem", whiteSpace: "pre-wrap", marginBottom: "0.75rem", background: "#fafafa" }}>
                  {agreement.text || t("لم تُضبَط اتفاقية بعد من إدارة المنصّة.")}
                </div>
                <button className="ds-btn ds-btn-primary ds-btn-sm" disabled={saving || !agreement.text} onClick={acceptAgreement}>
                  {t("أوافق على الاتفاقية")}
                </button>
              </>
            )}
          </CardSection>
          <CardSection title={t("الظهور على موقع الحجز")} desc={t("تحكّم بظهور فندقك واستقبال حجوزات الموقع. يتطلب التفعيل قبول اتفاقية المنصّة.")}>
            {!agreement.accepted && (
              <div className="ds-alert ds-alert-warning" style={{ fontSize: "0.82rem", marginBottom: "0.6rem" }}>
                {t("فعّل التبديلات بعد قبول الاتفاقية أعلاه.")}
              </div>
            )}
            <SW label={t("إظهار الفندق في موقع الحجز العام")} checked={pub.listingEnabled} onChange={v => agreement.accepted && setPub(p => ({ ...p, listingEnabled: v }))} />
            <SW label={t("استقبال حجوزات من الموقع العام")} checked={pub.bookingEnabled} onChange={v => agreement.accepted && setPub(p => ({ ...p, bookingEnabled: v }))} />
            <SW label={t("حجوزات الموقع تحتاج تأكيدًا يدويًا")} checked={pub.needsConfirmation} onChange={v => setPub(p => ({ ...p, needsConfirmation: v }))} hint={t("عند الإطفاء تُؤكَّد حجوزات الموقع تلقائيًا")} />
            <SW label={t("إظهار معلومات التواصل للزوّار")} checked={pub.showContact} onChange={v => setPub(p => ({ ...p, showContact: v }))} />
          </CardSection>

          <CardSection title={t("وصف الفندق والمميزات")} desc={t("تظهر في صفحة الفندق العامة.")}>
            <div style={G2}>
              <FLD label={t("التصنيف (نجوم 1–5)")}>
                <input className="input" type="number" min={1} max={5} value={pub.stars} onChange={e => setPub(p => ({ ...p, stars: e.target.value }))} placeholder="4" />
              </FLD>
              <FLD label={t("نوع المنشأة")}>
                <select className="select" value={pub.hotelType} onChange={e => setPub(p => ({ ...p, hotelType: e.target.value }))}>
                  <option value="hotel">{t("فندق")}</option>
                  <option value="apart_hotel">{t("شقق فندقية")}</option>
                  <option value="resort">{t("منتجع")}</option>
                  <option value="guesthouse">{t("نزل")}</option>
                  <option value="motel">{t("موتيل")}</option>
                </select>
              </FLD>
            </div>
            <FLD label={t("وصف مختصر")}>
              <input className="input" value={pub.descShort} onChange={e => setPub(p => ({ ...p, descShort: e.target.value }))} placeholder={t("سطر تعريفي قصير عن الفندق")} />
            </FLD>
            <FLD label={t("وصف تفصيلي")}>
              <textarea className="input" rows={3} value={pub.descFull} onChange={e => setPub(p => ({ ...p, descFull: e.target.value }))} />
            </FLD>
            <FLD label={t("المرافق والخدمات")} hint={t("افصل بينها بفاصلة: واي فاي، موقف سيارات، مطعم…")}>
              <input className="input" value={pub.amenities} onChange={e => setPub(p => ({ ...p, amenities: e.target.value }))} placeholder={t("واي فاي، موقف سيارات، مطعم، مسبح")} />
            </FLD>
          </CardSection>

          <CardSection title={t("صور معرض الفندق")} desc={t("صور إضافية تظهر في صفحة الفندق العامة.")}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {pub.galleryImages.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic data URL */}
                  <img src={img} alt={`gallery-${i}`} style={{ width: 96, height: 72, objectFit: "cover", borderRadius: "0.4rem", border: "1px solid #e5e7eb" }} />
                  <button onClick={() => setPub(p => ({ ...p, galleryImages: p.galleryImages.filter((_, j) => j !== i) }))}
                    style={{ position: "absolute", top: -6, insetInlineEnd: -6, background: "#dc2626", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            <input id="gallery-input" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleGallery} />
            <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => document.getElementById("gallery-input")?.click()}>{t("إضافة صور")}</button>
          </CardSection>

          <CardSection title={t("السياسات")} desc={t("تظهر للزوّار قبل الحجز.")}>
            <div style={G2}>
              <FLD label={t("سياسة الدخول")}><textarea className="input" rows={2} value={pub.checkInPolicy} onChange={e => setPub(p => ({ ...p, checkInPolicy: e.target.value }))} /></FLD>
              <FLD label={t("سياسة المغادرة")}><textarea className="input" rows={2} value={pub.checkOutPolicy} onChange={e => setPub(p => ({ ...p, checkOutPolicy: e.target.value }))} /></FLD>
            </div>
            <div style={G2}>
              <FLD label={t("سياسة الإلغاء")}><textarea className="input" rows={2} value={pub.cancellation} onChange={e => setPub(p => ({ ...p, cancellation: e.target.value }))} /></FLD>
              <FLD label={t("سياسة الدفع")}><textarea className="input" rows={2} value={pub.paymentPolicy} onChange={e => setPub(p => ({ ...p, paymentPolicy: e.target.value }))} /></FLD>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <SaveBtn label={t("حفظ إعدادات العرض على موقع الحجز")} saving={saving} saved={false} onClick={doSavePublish} />
            </div>
          </CardSection>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 3: الغرف والطوابق
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "rooms" && (
        <CardSection title={t("الغرف والطوابق")} desc={t("إعدادات تستخدمها صفحة الغرف والطوابق عند إنشاء الغرف وتنظيمها.")}>
          <div style={G3}>
            <FLD label={t("عدد الطوابق المفعلة")} hint={maxFloor > 0 ? (lang === "ar" ? `أعلى طابق مستخدم حالياً: ${maxFloor}` : `Highest floor in use: ${maxFloor}`) : undefined}>
              <input className="input" type="number" min="1" value={rooms.floors} onChange={e => setRooms(p => ({ ...p, floors: e.target.value }))} />
            </FLD>
            <FLD label={t("السعة الافتراضية للغرف الجديدة")}>
              <select className="select" value={rooms.defaultCapacity} onChange={e => setRooms(p => ({ ...p, defaultCapacity: e.target.value }))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {lang === "ar" ? (n === 1 ? "شخص" : "أشخاص") : (n === 1 ? "person" : "people")}</option>)}
              </select>
            </FLD>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>{t("أنواع الغرف")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
              {rooms.roomTypes.map((rt, i) => (
                <span key={rt + i} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.7rem", borderRadius: "2rem", background: "#eef2ff", color: "#4f46e5", fontSize: "0.82rem", fontWeight: 600 }}>
                  {rt}
                  <button onClick={() => removeRoomType(i)} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: 0, lineHeight: 1, display:"flex" }}><X size={12} strokeWidth={2.5}/></button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", maxWidth: "400px" }}>
              <input className="input" value={newRoomType} onChange={e => setNewRoomType(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addRoomType()}
                placeholder={t("نوع غرفة جديد...")} style={{ flex: 1 }} />
              <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={addRoomType}>+ {t("إضافة")}</button>
              <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={() => setRooms(prev => ({ ...prev, roomTypes: DEFAULT_ROOMS.roomTypes }))}>{t("استعادة الافتراضية")}</button>
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات الغرف")} saving={saving} saved={false} onClick={doSaveRooms} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB: المطعم والكافتريا (م4)
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "restaurant" && (
        <>
          <CardSection title={t("تفعيل الخدمات")} desc={t("تحكّم بتشغيل المطعم والكافتريا وطريقة إدارة الطلبات.")}>
            <SW label={t("تفعيل المطعم")} checked={food.restaurant_enabled} onChange={v => setFood(p => ({ ...p, restaurant_enabled: v }))} />
            <SW label={t("تفعيل الكافتريا")} checked={food.cafeteria_enabled} onChange={v => setFood(p => ({ ...p, cafeteria_enabled: v }))} />
            <SW label={t("يوجد موظف/قسم مطعم مستقل")} checked={food.dedicated_staff} onChange={v => setFood(p => ({ ...p, dedicated_staff: v }))} hint={t("عند التفعيل: يمرّ الطلب بمراحل (جديد/تجهيز/جاهز/تسليم). عند الإطفاء: الاستقبال ينشئ الطلب مكتملًا مباشرة.")} />
          </CardSection>
          <CardSection title={t("طرق الدفع المسموحة")} desc={t("طرق قبض ثمن طلبات المطعم/الكافتريا.")}>
            <SW label={t("السماح بالدفع النقدي")} checked={food.allow_cash} onChange={v => setFood(p => ({ ...p, allow_cash: v }))} />
            <SW label={t("السماح بالدفع الإلكتروني")} checked={food.allow_electronic} onChange={v => setFood(p => ({ ...p, allow_electronic: v }))} />
            <SW label={t("السماح بالدفع بالكرت")} checked={food.allow_card} onChange={v => setFood(p => ({ ...p, allow_card: v }))} />
            <SW label={t("السماح بالإضافة على حساب الغرفة")} checked={food.allow_room_account} onChange={v => setFood(p => ({ ...p, allow_room_account: v }))} hint={t("يدخل ضمن فوليو الغرفة ويمنع الخروج حتى الدفع")} />
            <SW label={t("طباعة إيصال الطلب")} checked={food.print_receipt} onChange={v => setFood(p => ({ ...p, print_receipt: v }))} />
            <div style={{ marginTop: "1rem" }}>
              <SaveBtn label={t("حفظ إعدادات المطعم والكافتريا")} saving={saving} saved={false} onClick={doSaveFood} />
            </div>
          </CardSection>
          <div className="ds-alert ds-alert-info" style={{ fontSize: "0.85rem" }}>
            {t("إدارة الأصناف والأسعار تتم من صفحة «خدمات المطعم».")}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 4: الطباعة والفواتير
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "printing" && (
        <CardSection title={t("الطباعة والفواتير")} desc={t("إعدادات تتحكم بشكل مستندات الطباعة مثل ملخص الحجز، الفاتورة، وكشف الحساب.")}>
          <div style={{ marginBottom: "0.75rem" }}>
            <SW label={t("إظهار شعار الفندق في الطباعة")} checked={printing.showLogo} onChange={v => setPrinting(p => ({ ...p, showLogo: v }))} />
            <SW label={t("إظهار بيانات التواصل في الطباعة")} checked={printing.showContact} onChange={v => setPrinting(p => ({ ...p, showContact: v }))} />
          </div>
          <div style={G2}>
            <FLD label={t("عنوان ملخص الحجز")}>
              <input className="input" value={printing.resTitle} onChange={e => setPrinting(p => ({ ...p, resTitle: e.target.value }))} />
            </FLD>
            <FLD label={t("عنوان كشف الحساب")}>
              <input className="input" value={printing.accountTitle} onChange={e => setPrinting(p => ({ ...p, accountTitle: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ ...G2, marginTop: "0.5rem" }}>
            <FLD label={t("لغة الأرقام في الطباعة")}>
              <select className="select" value={printing.numLang} onChange={e => setPrinting(p => ({ ...p, numLang: e.target.value }))}>
                <option value="en">{t("أرقام إنجليزية")}</option>
                <option value="ar">{t("أرقام عربية")}</option>
              </select>
            </FLD>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <FLD label={t("ملاحظات وشروط الحجز")}>
              <textarea className="textarea" rows={4} value={printing.terms} onChange={e => setPrinting(p => ({ ...p, terms: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <FLD label={t("تذييل الطباعة")}>
              <textarea className="textarea" rows={2} value={printing.footer} onChange={e => setPrinting(p => ({ ...p, footer: e.target.value }))} placeholder={t("نص يظهر في أسفل كل مطبوع...")} />
            </FLD>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات الطباعة")} saving={saving} saved={false} onClick={doSavePrinting} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 5: الوثائق والماسح
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "documents" && (
        <CardSection title={t("الوثائق والماسح")} desc={t("إعدادات الوثائق المطلوبة داخل الحجوزات وربط الماسح الضوئي.")}>
          <div style={{ marginBottom: "0.75rem" }}>
            <SW label={t("وثيقة صاحب الحجز مطلوبة")} checked={docs.requireGuest} onChange={v => setDocs(p => ({ ...p, requireGuest: v }))} />
            <SW label={t("وثيقة كل مرافق بالغ مطلوبة")} checked={docs.requireCompanion} onChange={v => setDocs(p => ({ ...p, requireCompanion: v }))} />
            <SW label={t("إثبات القرابة مطلوب للعائلة")} checked={docs.requireRelation} onChange={v => setDocs(p => ({ ...p, requireRelation: v }))} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>{t("أنواع وثائق النزلاء")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
              {docs.docTypes.map((dt, i) => (
                <span key={dt + i} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.3rem 0.7rem", borderRadius: "2rem", background: "#f0fdf4", color: "#15803d", fontSize: "0.82rem", fontWeight: 600, border: "1px solid #bbf7d0" }}>
                  {dt}
                  <button onClick={() => removeDocType(i)} style={{ background: "none", border: "none", color: "#15803d", cursor: "pointer", padding: 0, display:"flex" }}><X size={12} strokeWidth={2.5}/></button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", maxWidth: "380px" }}>
              <input className="input" value={newDocType} onChange={e => setNewDocType(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addDocType()}
                placeholder={t("نوع وثيقة جديد...")} style={{ flex: 1 }} />
              <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={addDocType}>+ {t("إضافة")}</button>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", marginTop: "0.5rem" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>{t("إعدادات الماسح الضوئي")}</p>
            <SW label={t("تفعيل أزرار الماسح الضوئي")} checked={docs.scannerEnabled} onChange={v => setDocs(p => ({ ...p, scannerEnabled: v }))} />
            <div style={{ ...G2, marginTop: "0.75rem" }}>
              <FLD label={t("عنوان خدمة الماسح المحلي")}>
                <input className="input" value={docs.scannerUrl} onChange={e => setDocs(p => ({ ...p, scannerUrl: e.target.value }))} placeholder="http://127.0.0.1:18189" />
              </FLD>
            </div>
            <FLD label={t("رسالة عدم توفر الماسح")}>
              <textarea className="textarea" rows={2} value={docs.scannerError} onChange={e => setDocs(p => ({ ...p, scannerError: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات الوثائق")} saving={saving} saved={false} onClick={doSaveDocs} />
          </div>
        </CardSection>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           TAB 6: التنبيهات
         ════════════════════════════════════════════════════════════════════ */}
      {tab === "notifications" && (
        <CardSection title={t("التنبيهات")} desc={t("إعدادات التنبيهات التي تظهر في جرس الإشعارات ولوحة التحكم.")}>
          <SW label={t("إشعارات وصول اليوم")}                   checked={notifs.arrivals}     onChange={v => setNotifs(p => ({ ...p, arrivals: v }))} />
          <SW label={t("إشعارات مغادرة اليوم")}                  checked={notifs.departures}   onChange={v => setNotifs(p => ({ ...p, departures: v }))} />
          <SW label={t("إشعارات المتبقي المالي")}                 checked={notifs.balanceDue}   onChange={v => setNotifs(p => ({ ...p, balanceDue: v }))} />
          <SW label={t("إشعارات غرف التنظيف")}                   checked={notifs.cleaning}     onChange={v => setNotifs(p => ({ ...p, cleaning: v }))} />
          <SW label={t("إشعارات الصيانة")}                       checked={notifs.maintenance}  onChange={v => setNotifs(p => ({ ...p, maintenance: v }))} />
          <SW label={t("إشعارات طلبات على حساب الغرفة")}         checked={notifs.roomAccount}  onChange={v => setNotifs(p => ({ ...p, roomAccount: v }))} />
          <SW label={t("إظهار عداد الإشعارات في التوببار")}      checked={notifs.showBell}     onChange={v => setNotifs(p => ({ ...p, showBell: v }))} hint={t("إذا عطّلت هذا الخيار لن يظهر العداد الأحمر على جرس التوببار")} />
          <div style={{ marginTop: "0.75rem", maxWidth: "320px" }}>
            <FLD label={t("حد تنبيه المتبقي المالي")} hint={t("لا يظهر إشعار المتبقي إلا إذا كان المبلغ أكبر من هذه القيمة")}>
              <input className="input" type="number" min="0" value={notifs.balanceThreshold} onChange={e => setNotifs(p => ({ ...p, balanceThreshold: e.target.value }))} />
            </FLD>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <SaveBtn label={t("حفظ إعدادات التنبيهات")} saving={saving} saved={false} onClick={doSaveNotifs} />
          </div>
        </CardSection>
      )}

      {/* د‑1: أُزيل تبويبا «النسخ الاحتياطي» و«الواجهة» — النسخ الاحتياطي يخصّ إدارة المنصّة/السيرفر،
           وتفضيلات الواجهة (اللغة/الكثافة) تخصّ حساب المستخدم الشخصي واللغة من أيقونة الهيدر. */}
    </div>
  );
}
