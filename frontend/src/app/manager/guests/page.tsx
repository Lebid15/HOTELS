"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useLang } from "../LangContext";
import {
  Users, Star, ShieldOff, Search, Eye, Pencil, RefreshCw,
  Crown, Ban, Phone, Mail, Hash, Calendar, Moon, Banknote,
  FileText, UserPlus, CheckCircle2, Clock, Home, Globe,
  X, TrendingUp, Activity,
} from "lucide-react";

import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type GuestFlag = "normal" | "vip" | "blacklist";

interface GuestProfile {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email: string;
  nationality: string;
  dob: string;
  flag: GuestFlag;
  notes: string;
  totalStays: number;
  totalNights: number;
  totalSpent: number;
  currency: string;
  lastStay: string;
  firstStay: string;
  reservationIds: number[];
  createdAt: string;
  updatedAt: string;
}

interface RawRes {
  id: number;
  booking_number: string;
  guest_id_number: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_phone: string;
  guest_email: string;
  guest_dob: string;
  nationality?: string;
  check_in_date: string;
  check_out_date: string;
  nights_count: number;
  total: string | number;
  paid: string | number;
  currency: string;
  status: string;
  room_number?: string;
}

/* ─── Constants (FLAG_LABEL and STATUS_LABEL moved inside component for i18n) ── */

const FLAG_COLOR: Record<GuestFlag, { bg: string; color: string; border: string; strip: string; badgeBg: string }> = {
  normal: {
    bg: "#f8fafc",
    color: "#64748b",
    border: "#e2e8f0",
    strip: "#e2e8f0",
    badgeBg: "#f1f5f9",
  },
  vip: {
    bg: "#fffbeb",
    color: "#92400e",
    border: "#fde68a",
    strip: "#f59e0b",
    badgeBg: "#fef9c3",
  },
  blacklist: {
    bg: "#fef2f2",
    color: "#991b1b",
    border: "#fecaca",
    strip: "#dc2626",
    badgeBg: "#fef2f2",
  },
};


const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#2563eb",
  checked_in: "#16a34a",
  checked_out: "#dc2626",
  cancelled: "#64748b",
  no_show: "#7c3aed",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

/* ─── Build profiles from reservations ──────────────────────────────────── */
function buildProfiles(resList: RawRes[], existing: GuestProfile[]): GuestProfile[] {
  const map = new Map<string, GuestProfile>();

  // Seed with existing profiles (preserve flags and notes)
  for (const p of existing) {
    map.set(p.idNumber || p.id, p);
  }

  for (const r of resList) {
    if (!r.guest_first_name && !r.guest_last_name) continue;
    const key = r.guest_id_number || `phone_${r.guest_phone}` || `res_${r.id}`;
    const prev = map.get(key);
    const spent = Number(r.paid || 0);
    const nights = Number(r.nights_count || 0);

    if (prev) {
      const alreadyHas = prev.reservationIds.includes(r.id);
      const ids = alreadyHas ? prev.reservationIds : [...prev.reservationIds, r.id];
      map.set(key, {
        ...prev,
        firstName: prev.firstName || r.guest_first_name || "",
        lastName: prev.lastName || r.guest_last_name || "",
        idNumber: prev.idNumber || r.guest_id_number || "",
        dob: prev.dob || r.guest_dob || "",
        totalStays: ids.length,
        totalNights: prev.totalNights + (alreadyHas ? 0 : nights),
        totalSpent: prev.totalSpent + (alreadyHas ? 0 : spent),
        lastStay:
          (r.check_in_date || "") > prev.lastStay
            ? r.check_in_date || ""
            : prev.lastStay,
        currency: r.currency || prev.currency,
        reservationIds: ids,
        phone: prev.phone || r.guest_phone || "",
        email: prev.email || r.guest_email || "",
        nationality: prev.nationality || r.nationality || "",
        updatedAt: new Date().toISOString(),
      });
    } else {
      map.set(key, {
        id: key,
        idNumber: r.guest_id_number || "",
        firstName: r.guest_first_name || "",
        lastName: r.guest_last_name || "",
        phone: r.guest_phone || "",
        email: r.guest_email || "",
        nationality: r.nationality || "",
        dob: r.guest_dob || "",
        flag: "normal",
        notes: "",
        totalStays: 1,
        totalNights: nights,
        totalSpent: spent,
        currency: r.currency || "USD",
        lastStay: r.check_in_date || "",
        firstStay: r.check_in_date || "",
        reservationIds: [r.id],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    (b.lastStay || "").localeCompare(a.lastStay || "")
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function GuestsPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const FLAG_LABEL: Record<GuestFlag, string> = {
    normal: t("عادي"),
    vip: "VIP",
    blacklist: t("محظور"),
  };
  const STATUS_LABEL: Record<string, string> = {
    pending: t("قيد الانتظار"),
    confirmed: t("مؤكد"),
    checked_in: t("مقيم"),
    checked_out: t("مغادر"),
    cancelled: t("ملغي"),
    no_show: t("لم يحضر"),
  };

  const hotelId =
    typeof window !== "undefined" ? (localStorage.getItem("hotel_id") ?? "") : "";

  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [rawRes, setRawRes] = useState<RawRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search,    setSearch]    = useState("");
  const [fFlag,     setFFlag]     = useState<GuestFlag | "all">("all");
  const [fReturning,setFReturning]= useState(false);
  const [fActive,   setFActive]   = useState(false);
  const [toast,     setToast]     = useState("");

  // View modal
  const [viewGuest, setViewGuest] = useState<GuestProfile | null>(null);
  const [viewNotes, setViewNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Edit flag modal
  const [editGuest, setEditGuest] = useState<GuestProfile | null>(null);
  const [editFlag, setEditFlag] = useState<GuestFlag>("normal");
  const [editNotes, setEditNotes] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function saveGuests(next: GuestProfile[]) {
    setGuests(next);  // الحالة فقط؛ الأعلام/الملاحظات تُحفَظ في الـBackend عبر upsert
  }

  async function upsertGuestProfile(guestKey: string, flag: GuestFlag, notes: string) {
    if (!guestKey) return;
    try {
      await fetch(`${API}/guest-profiles/`, {
        method: "POST", headers: apiHJ(),
        body: JSON.stringify({ guest_key: guestKey, flag, notes }),
      });
    } catch { /* تجاهل */ }
  }

  /* ── Initial load ── */
  useEffect(() => {
    const load = async () => {
      if (!hotelId) { setLoading(false); return; }

      /* ── Cross-page nav state (from check-in/out, rooms, etc.) ── */
      try {
        const navRaw = localStorage.getItem(`fandqi.nav.guests.${hotelId}`);
        if (navRaw) {
          const nav = JSON.parse(navRaw);
          if (nav.ts && Date.now() - nav.ts < 30000 && nav.search) setSearch(nav.search);
          localStorage.removeItem(`fandqi.nav.guests.${hotelId}`);
        }
      } catch {}

      try {
        const [profs, resD] = await Promise.all([
          fetch(`${API}/guest-profiles/?hotel=${hotelId}`, { headers: apiH() }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API}/reservations/?hotel=${hotelId}`, { headers: apiH() }).then(r => r.ok ? r.json() : []).catch(() => []),
        ]);
        const profList: Record<string, unknown>[] = Array.isArray(profs) ? profs : (profs.results ?? []);
        const existing: GuestProfile[] = profList.map(p => ({
          id: String(p.guest_key), firstName: "", lastName: "", idNumber: String(p.guest_key),
          phone: "", email: "", nationality: "", dob: "",
          flag: String(p.flag ?? "normal") as GuestFlag, notes: String(p.notes ?? ""),
          totalStays: 0, totalNights: 0, totalSpent: 0, currency: "USD",
          lastStay: "", firstStay: "", reservationIds: [],
          createdAt: "", updatedAt: String(p.updated_at ?? ""),
        }));
        const list: RawRes[] = Array.isArray(resD) ? resD : (resD.results ?? []);
        setRawRes(list);
        setGuests(buildProfiles(list, existing));
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [hotelId]);

  /* ── Sync from API ── */
  async function syncFromReservations() {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/reservations/?hotel=${hotelId}`, {
        headers: apiH(),
      });
      const data = await res.json();
      const list: RawRes[] = Array.isArray(data) ? data : (data.results ?? []);
      setRawRes(list);
      const merged = buildProfiles(list, guests);
      saveGuests(merged);
      showToast(lang==="ar"?`تمت المزامنة — ${merged.length} نزيل.`:`Synced — ${merged.length} guests.`);
    } catch {
      showToast(t("فشلت المزامنة. تحقق من الاتصال."));
    } finally {
      setSyncing(false);
    }
  }

  /* ── Quick VIP/Blacklist toggle ── */
  function quickToggleFlag(g: GuestProfile, target: GuestFlag) {
    const newFlag = g.flag === target ? "normal" : target;
    const next = guests.map((x) =>
      x.id === g.id
        ? { ...x, flag: newFlag, updatedAt: new Date().toISOString() }
        : x
    );
    saveGuests(next);
    upsertGuestProfile(g.id, newFlag, g.notes);
    // Update viewGuest if open
    if (viewGuest?.id === g.id) {
      setViewGuest((prev) => (prev ? { ...prev, flag: newFlag } : prev));
    }
    showToast(
      newFlag === "normal"
        ? t("تم إزالة التصنيف الخاص.") : newFlag === "vip"
        ? t("تم تعيين النزيل كـ VIP.") : t("تم تعيين النزيل كمحظور.")
    );
  }

  /* ── Save flag from edit modal ── */
  function saveFlag() {
    if (!editGuest) return;
    const next = guests.map((g) =>
      g.id === editGuest.id
        ? { ...g, flag: editFlag, notes: editNotes, updatedAt: new Date().toISOString() }
        : g
    );
    saveGuests(next);
    upsertGuestProfile(editGuest.id, editFlag, editNotes);
    setEditGuest(null);
    showToast(t("تم تحديث حالة النزيل."));
  }

  /* ── Save notes from view modal ── */
  function saveViewNotes() {
    if (!viewGuest) return;
    setSavingNotes(true);
    const next = guests.map((g) =>
      g.id === viewGuest.id
        ? { ...g, notes: viewNotes, updatedAt: new Date().toISOString() }
        : g
    );
    saveGuests(next);
    upsertGuestProfile(viewGuest.id, viewGuest.flag, viewNotes);
    setViewGuest((prev) => (prev ? { ...prev, notes: viewNotes } : prev));
    setTimeout(() => setSavingNotes(false), 600);
    showToast(t("تم حفظ الملاحظات."));
  }

  /* ── Open view modal ── */
  function openView(g: GuestProfile) {
    setViewGuest(g);
    setViewNotes(g.notes);
  }

  /* ── Open edit modal ── */
  function openEdit(g: GuestProfile) {
    setEditGuest(g);
    setEditFlag(g.flag);
    setEditNotes(g.notes);
  }

  /* ── Cross-page navigation ── */
  function navToReservations(filter: {search?: string; day?: string}) {
    try { localStorage.setItem(`fandqi.nav.reservations.${hotelId}`, JSON.stringify({...filter, ts: Date.now()})); } catch {}
    router.push("/manager/reservations");
  }

  /* ── KPIs ── */
  const totalGuests    = guests.length;
  const returning      = guests.filter((g) => g.totalStays > 1).length;
  const vipCount       = guests.filter((g) => g.flag === "vip").length;
  const blacklistCount = guests.filter((g) => g.flag === "blacklist").length;
  const checkedInResIds= new Set(rawRes.filter(r => r.status === "checked_in").map(r => r.id));
  const currentlyIn    = guests.filter(g => g.reservationIds.some(id => checkedInResIds.has(id))).length;
  const totalSpentAll  = guests.reduce((s, g) => s + g.totalSpent, 0);
  const avgSpend       = totalGuests > 0 ? Math.round(totalSpentAll / totalGuests) : 0;
  const spendCurrency  = guests[0]?.currency ?? "USD";

  /* ── Filter ── */
  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      guests.filter((g) => {
        if (fFlag !== "all" && g.flag !== fFlag) return false;
        if (fActive && !g.reservationIds.some(id => checkedInResIds.has(id))) return false;
        if (fReturning && g.totalStays <= 1) return false;
        if (q) {
          return [g.firstName, g.lastName, g.idNumber, g.phone, g.email, g.nationality]
            .join(" ").toLowerCase().includes(q);
        }
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guests, fFlag, fActive, fReturning, q]
  );

  /* ── Guest reservations for view modal ── */
  function guestReservations(g: GuestProfile) {
    return rawRes.filter((r) => g.reservationIds.includes(r.id));
  }

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="ds-page" dir={lang==="ar"?"rtl":"ltr"}>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e293b",
            color: "#fff",
            padding: "0.7rem 1.5rem",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13,
            zIndex: 9999,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-2xl, 1.5rem)",
              fontWeight: 900,
              color: "var(--color-heading, #1e293b)",
              marginBottom: "0.25rem",
            }}
          >
            {t("سجل النزلاء")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-muted, #64748b)" }}>
            {t("قاعدة بيانات شاملة لجميع النزلاء مع تاريخ إقاماتهم وتصنيفاتهم.")}
          </p>
        </div>
        <button
          onClick={syncFromReservations}
          disabled={syncing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: syncing ? "#94a3b8" : "#0f766e",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0.55rem 1.1rem",
            fontWeight: 700,
            fontSize: 13,
            cursor: syncing ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <RefreshCw
            size={14}
            strokeWidth={2}
            style={{
              animation: syncing ? "spin 1s linear infinite" : "none",
            }}
          />
          {syncing ? t("جاري المزامنة...") : t("مزامنة من الحجوزات")}
        </button>
      </div>

      {/* ── KPI cards row 1 ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem",marginBottom:"0.6rem"}}>
        {([
          {
            label:t("إجمالي النزلاء"), value:String(totalGuests),
            sub:t("جميع النزلاء المسجلين"),
            Icon:Users as LucideIcon, grad:"linear-gradient(135deg,#4f46e5,#6366f1)",
            active:fFlag==="all"&&!fActive&&!fReturning,
            onClick:()=>{setFFlag("all");setFActive(false);setFReturning(false);},
          },
          {
            label:t("مقيمون الآن"), value:String(currentlyIn),
            sub:t("نزلاء لديهم إقامة نشطة الآن"),
            Icon:Activity as LucideIcon, grad:currentlyIn>0?"linear-gradient(135deg,#16a34a,#15803d)":"linear-gradient(135deg,#64748b,#475569)",
            active:fActive,
            onClick:()=>{setFFlag("all");setFActive(true);setFReturning(false);},
          },
          {
            label:t("نزلاء متكررون"), value:String(returning),
            sub:lang==="ar"?`${totalGuests?Math.round((returning/totalGuests)*100):0}% من الإجمالي — أكثر من إقامة`:`${totalGuests?Math.round((returning/totalGuests)*100):0}% of total — more than one stay`,
            Icon:RefreshCw as LucideIcon, grad:"linear-gradient(135deg,#2563eb,#1d4ed8)",
            active:fReturning,
            onClick:()=>{setFFlag("all");setFActive(false);setFReturning(true);},
          },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;onClick:()=>void}[]).map(s=>(
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick} title={lang==="ar"?"اضغط للتصفية":"Click to filter"}
            style={{
              background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff",
              cursor:"pointer", userSelect:"none", position:"relative",
              boxShadow:s.active?"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)":"0 2px 8px rgba(0,0,0,.12)",
              transform:s.active?"translateY(-3px) scale(1.02)":"none",
              transition:"all .2s ease",
            }}>
            {s.active&&<div style={{position:"absolute",top:7,left:8,background:"rgba(255,255,255,.25)",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800}}>● {t("نشط")}</div>}
            <div style={{marginBottom:6,opacity:.85}}><s.Icon size={26} strokeWidth={1.6}/></div>
            <p style={{fontSize:13,fontWeight:700,opacity:.9,marginBottom:4}}>{s.label}</p>
            <p style={{fontSize:26,fontWeight:900,lineHeight:1,marginBottom:3}}>{s.value}</p>
            <p style={{fontSize:11,opacity:.75}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── KPI cards row 2 ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {([
          {
            label:t("نزلاء VIP"), value:String(vipCount),
            sub:t("أولوية خاصة وامتيازات"),
            Icon:Crown as LucideIcon, grad:"linear-gradient(135deg,#d97706,#b45309)",
            active:fFlag==="vip"&&!fActive&&!fReturning,
            onClick:()=>{setFFlag("vip");setFActive(false);setFReturning(false);},
          },
          {
            label:t("محظورون"), value:String(blacklistCount),
            sub:blacklistCount>0?t("ممنوعون من الحجز — تنبيه عند المحاولة"):t("لا يوجد نزلاء محظورون"),
            Icon:Ban as LucideIcon,
            grad:blacklistCount>0?"linear-gradient(135deg,#dc2626,#b91c1c)":"linear-gradient(135deg,#64748b,#475569)",
            active:fFlag==="blacklist"&&!fActive&&!fReturning,
            onClick:()=>{setFFlag("blacklist");setFActive(false);setFReturning(false);},
          },
          {
            label:t("متوسط الإنفاق"), value:`${avgSpend.toLocaleString("en-US")} ${spendCurrency}`,
            sub:lang==="ar"?`إجمالي الإنفاق / ${totalGuests} نزيل`:`Total spend / ${totalGuests} guests`,
            Icon:TrendingUp as LucideIcon, grad:"linear-gradient(135deg,#1e293b,#0f172a)",
            active:false, onClick:()=>{},
          },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;onClick:()=>void}[]).map(s=>(
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick}
            title={s.label!==t("متوسط الإنفاق")?lang==="ar"?"اضغط للتصفية":"Click to filter":""}
            style={{
              background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff",
              cursor:s.label!==t("متوسط الإنفاق")?"pointer":"default", userSelect:"none", position:"relative",
              boxShadow:s.active?"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)":"0 2px 8px rgba(0,0,0,.12)",
              transform:s.active?"translateY(-3px) scale(1.02)":"none",
              transition:"all .2s ease",
            }}>
            {s.active&&<div style={{position:"absolute",top:7,left:8,background:"rgba(255,255,255,.25)",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800}}>● {t("نشط")}</div>}
            <div style={{marginBottom:6,opacity:.85}}><s.Icon size={26} strokeWidth={1.6}/></div>
            <p style={{fontSize:13,fontWeight:700,opacity:.9,marginBottom:4}}>{s.label}</p>
            <p style={{fontSize:(s.label.includes("إنفاق")||s.label.includes("Spend"))?18:26,fontWeight:900,lineHeight:1,marginBottom:3}}>{s.value}</p>
            <p style={{fontSize:11,opacity:.75}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="ds-card-p" style={{ marginBottom: "1.25rem" }}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr auto",gap:"0.6rem",alignItems:"end"}}>
          <div className="ds-filter-group">
            <p className="ds-filter-label">
              <Search size={13} strokeWidth={2.2} color="#4f46e5" />
              &nbsp;{t("بحث بالاسم أو الهوية أو الهاتف")}
            </p>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("اسم النزيل، رقم الهوية، الهاتف، الجنسية...")}
            />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label">
              <Star size={13} strokeWidth={2.2} color="#4f46e5" />
              &nbsp;{t("التصنيف")}
            </p>
            <select
              className="select"
              value={fActive?"active":fReturning?"returning":fFlag}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "active")    { setFActive(true);  setFReturning(false); setFFlag("all"); }
                else if (v === "returning") { setFActive(false); setFReturning(true);  setFFlag("all"); }
                else { setFActive(false); setFReturning(false); setFFlag(v as GuestFlag | "all"); }
              }}
            >
              <option value="all">{t("الكل")} ({totalGuests})</option>
              <option value="active">{t("مقيمون الآن")} ({currentlyIn})</option>
              <option value="returning">{t("متكررون")} ({returning})</option>
              <option value="normal">{t("عادي")} ({totalGuests - vipCount - blacklistCount})</option>
              <option value="vip">VIP ({vipCount})</option>
              <option value="blacklist">{t("محظور")} ({blacklistCount})</option>
            </select>
          </div>
          {(fFlag!=="all"||fActive||fReturning||search)&&(
            <button
              onClick={()=>{setFFlag("all");setFActive(false);setFReturning(false);setSearch("");}}
              style={{background:"#eef2ff",color:"#4f46e5",border:"none",borderRadius:8,padding:"0.5rem 0.75rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
              <X size={12}/> {t("إلغاء الفلتر")}
            </button>
          )}
        </div>
      </div>

      {/* ── Guest cards ── */}
      {loading ? (
        <p
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "var(--color-muted, #64748b)",
          }}
        >
          {t("جاري تحميل البيانات...")}
        </p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "var(--color-muted, #64748b)",
          }}
        >
          <Users
            size={48}
            strokeWidth={1.1}
            style={{ color: "#d1d5db", marginBottom: 12 }}
          />
          <p
            style={{
              fontWeight: 800,
              fontSize: 17,
              color: "var(--color-heading, #1e293b)",
              marginBottom: 6,
            }}
          >
            {guests.length === 0
              ? t("لا يوجد نزلاء في قاعدة البيانات بعد")
              : t("لا توجد نتائج مطابقة")}
          </p>
          <p style={{ fontSize: 13 }}>
            {guests.length === 0
              ? t('اضغط "مزامنة من الحجوزات" لاستيراد بيانات النزلاء تلقائياً.')
              : t("غيّر الفلاتر أو كلمة البحث.")}
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--color-muted, #64748b)",
              }}
            >
              {lang==="ar"?`${filtered.length} نزيل مطابق`:`${filtered.length} matching guests`}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "0.85rem",
            }}
          >
            {filtered.map((g) => {
              const fc = FLAG_COLOR[g.flag];
              const isReturning = g.totalStays > 1;
              const isCheckedIn = g.reservationIds.some(id => checkedInResIds.has(id));

              return (
                <div
                  key={g.id}
                  style={{
                    background: fc.bg,
                    border: `1px solid ${fc.border}`,
                    borderRight: `4px solid ${fc.strip}`,
                    borderRadius: 12,
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    boxShadow: isCheckedIn ? "0 2px 12px rgba(22,163,74,.18)" : "0 1px 4px rgba(0,0,0,0.06)",
                    outline: isCheckedIn ? "2px solid rgba(22,163,74,.3)" : "none",
                  }}
                >
                  {/* Top row: name + flag badge */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 3,
                          flexWrap: "wrap",
                        }}
                      >
                        <p
                          style={{
                            fontWeight: 900,
                            fontSize: 15,
                            color: "#1e293b",
                          }}
                        >
                          {g.firstName} {g.lastName}
                        </p>
                        {g.flag === "vip" && (
                          <Crown size={13} color="#d97706" strokeWidth={2} />
                        )}
                        {g.flag === "blacklist" && (
                          <Ban size={13} color="#dc2626" strokeWidth={2} />
                        )}
                        {isReturning && g.flag === "normal" && (
                          <span style={{background:"#eff6ff",color:"#2563eb",fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:20}}>
                            {t("متكرر")}
                          </span>
                        )}
                        {isCheckedIn && (
                          <span style={{background:"#16a34a",color:"#fff",fontSize:10,fontWeight:800,padding:"1px 8px",borderRadius:20,display:"flex",alignItems:"center",gap:3}}>
                            <Activity size={9} strokeWidth={2.5}/> {t("مقيم الآن")}
                          </span>
                        )}
                      </div>
                      {g.idNumber && (
                        <p
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Hash size={11} strokeWidth={2} />
                          {g.idNumber}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 800,
                        background: fc.badgeBg,
                        color: fc.color,
                        flexShrink: 0,
                        marginRight: 6,
                      }}
                    >
                      {FLAG_LABEL[g.flag]}
                    </span>
                  </div>

                  {/* Contact info */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.35rem",
                    }}
                  >
                    {g.phone && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.7)",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 11,
                        }}
                      >
                        <p
                          style={{
                            color: "#94a3b8",
                            marginBottom: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Phone size={10} strokeWidth={2} />
                          {t("الهاتف")}
                        </p>
                        <p style={{ fontWeight: 700, color: "#1e293b" }}>{g.phone}</p>
                      </div>
                    )}
                    {g.nationality && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.7)",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 11,
                        }}
                      >
                        <p
                          style={{
                            color: "#94a3b8",
                            marginBottom: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Globe size={10} strokeWidth={2} />
                          {t("الجنسية")}
                        </p>
                        <p style={{ fontWeight: 700, color: "#1e293b" }}>
                          {g.nationality}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "0.35rem",
                    }}
                  >
                    {[
                      {
                        label: t("إقامات"),
                        value: String(g.totalStays),
                        Icon: CheckCircle2,
                      },
                      {
                        label: t("ليالي"),
                        value: String(g.totalNights),
                        Icon: Moon,
                      },
                      {
                        label: t("إجمالي"),
                        value: g.totalSpent.toLocaleString("en-US"),
                        Icon: Banknote,
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: "rgba(255,255,255,0.7)",
                          borderRadius: 6,
                          padding: "5px 8px",
                          textAlign: "center",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            marginBottom: 2,
                          }}
                        >
                          {s.label}
                        </p>
                        <p
                          style={{
                            fontWeight: 900,
                            fontSize: 14,
                            color: "#1e293b",
                          }}
                        >
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {g.lastStay && (
                    <div
                      style={{
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Clock size={11} strokeWidth={2} color="#94a3b8" />
                      <span style={{ color: "#64748b", fontWeight: 700 }}>
                        {t("آخر إقامة")}: {fmtDate(g.lastStay)}
                      </span>
                    </div>
                  )}

                  {/* Action buttons — row 1: main actions */}
                  <div style={{display:"flex",gap:"0.35rem",borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:"0.5rem"}}>
                    <button onClick={() => openView(g)} style={{flex:1,background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <Eye size={12} strokeWidth={2}/> {t("ملف النزيل")}
                    </button>
                    <button
                      onClick={() => navToReservations({search: g.idNumber || g.phone || `${g.firstName} ${g.lastName}`.trim()})}
                      style={{flex:1,background:"#0f766e",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}
                      title={lang==="ar"?"عرض حجوزات هذا النزيل":"View this guest's reservations"}>
                      <Calendar size={12} strokeWidth={2}/> {t("الحجوزات")}
                    </button>
                  </div>
                  {/* Action buttons — row 2: management */}
                  <div style={{display:"flex",gap:"0.35rem"}}>
                    <button onClick={() => openEdit(g)} title={lang==="ar"?"تعديل التصنيف":"Edit classification"}
                      style={{flex:1,background:"#1e293b",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <Pencil size={12} strokeWidth={2}/> {t("تعديل")}
                    </button>
                    <button onClick={() => quickToggleFlag(g, "vip")} title={g.flag==="vip"?t("إزالة VIP"):t("تعيين VIP")}
                      style={{flex:1,background:g.flag==="vip"?"#d97706":"#fef3c7",color:g.flag==="vip"?"#fff":"#92400e",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <Crown size={12} strokeWidth={2}/> {g.flag==="vip"?t("إلغاء VIP"):"VIP"}
                    </button>
                    <button onClick={() => quickToggleFlag(g, "blacklist")} title={g.flag==="blacklist"?"إزالة الحظر":"حظر النزيل"}
                      style={{background:g.flag==="blacklist"?"#dc2626":"#fef2f2",color:g.flag==="blacklist"?"#fff":"#991b1b",border:"none",borderRadius:8,padding:"0.4rem 0.6rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                      <Ban size={12} strokeWidth={2}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════ VIEW MODAL ══════════════════════════════════════════════════════ */}
      {viewGuest && (
        <div
          className="ds-modal-backdrop"
          onClick={() => setViewGuest(null)}
        >
          <div
            className="ds-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 760, width: "95vw" }}
          >
            {/* Head */}
            <div className="ds-modal-head">
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <h2 style={{ fontWeight: 900, fontSize: 18, color: "#1e293b" }}>
                    {viewGuest.firstName} {viewGuest.lastName}
                  </h2>
                  {viewGuest.flag === "vip" && (
                    <Crown size={18} color="#d97706" strokeWidth={2} />
                  )}
                  {viewGuest.flag === "blacklist" && (
                    <Ban size={18} color="#dc2626" strokeWidth={2} />
                  )}
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      background: FLAG_COLOR[viewGuest.flag].badgeBg,
                      color: FLAG_COLOR[viewGuest.flag].color,
                    }}
                  >
                    {FLAG_LABEL[viewGuest.flag]}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  {viewGuest.totalStays} {t("إقامة")} · {viewGuest.totalNights} {t("ليلة")} ·{" "}
                  {viewGuest.totalSpent.toLocaleString("en-US")} {viewGuest.currency}
                </p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setViewGuest(null)}
                style={{background:"none",border:"1px solid #e2e8f0",borderRadius:8,padding:"0.35rem 0.5rem",cursor:"pointer",color:"#64748b",display:"flex",alignItems:"center"}}
              >
                <X size={16} strokeWidth={2}/>
              </button>
            </div>

            {/* Body */}
            <div
              className="ds-modal-body"
              style={{ maxHeight: "65vh", overflowY: "auto", padding: "1.25rem" }}
            >
              {/* Currently checked-in banner */}
              {viewGuest.reservationIds.some(id => checkedInResIds.has(id)) && (
                <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"0.65rem 1rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:10}}>
                  <Activity size={16} color="#16a34a" strokeWidth={2.5}/>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:800,fontSize:13,color:"#15803d"}}>{t("هذا النزيل مقيم في الفندق الآن")}</p>
                    <p style={{fontSize:11,color:"#4ade80",marginTop:1}}>{t("توجد إقامة نشطة مرتبطة بهذا الملف")}</p>
                  </div>
                  <button onClick={()=>{setViewGuest(null);navToReservations({search:viewGuest.idNumber||viewGuest.phone});}}
                    style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                    <Calendar size={12}/> {t("عرض الحجز")}
                  </button>
                </div>
              )}

              {/* Info grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.6rem",
                  marginBottom: "1.25rem",
                }}
              >
                {(
                  [
                    {
                      l: t("رقم الهوية"),
                      v: viewGuest.idNumber || "—",
                      Icon: Hash,
                    },
                    { l: t("الهاتف"), v: viewGuest.phone || "—", Icon: Phone },
                    { l: t("البريد الإلكتروني"), v: viewGuest.email || "—", Icon: Mail },
                    {
                      l: t("الجنسية"),
                      v: viewGuest.nationality || "—",
                      Icon: Globe,
                    },
                    {
                      l: t("تاريخ الميلاد"),
                      v: fmtDate(viewGuest.dob),
                      Icon: Calendar,
                    },
                    {
                      l: t("أول إقامة"),
                      v: fmtDate(viewGuest.firstStay),
                      Icon: Home,
                    },
                    {
                      l: t("آخر إقامة"),
                      v: fmtDate(viewGuest.lastStay),
                      Icon: Clock,
                    },
                    {
                      l: t("إجمالي الإنفاق"),
                      v: `${viewGuest.totalSpent.toLocaleString("en-US")} ${viewGuest.currency}`,
                      Icon: Banknote,
                    },
                    {
                      l: t("إجمالي الليالي"),
                      v: String(viewGuest.totalNights),
                      Icon: Moon,
                    },
                  ] as { l: string; v: string; Icon: LucideIcon }[]
                ).map((item) => (
                  <div
                    key={item.l}
                    style={{
                      background: "#f8fafc",
                      borderRadius: 8,
                      padding: "0.65rem 0.85rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <item.Icon size={11} strokeWidth={2} />
                      {item.l}
                    </p>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#1e293b",
                        wordBreak: "break-all",
                      }}
                    >
                      {item.v}
                    </p>
                  </div>
                ))}
              </div>

              {/* Notes (editable) */}
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 10,
                  padding: "0.85rem",
                  marginBottom: "1.25rem",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#92400e",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <FileText size={13} strokeWidth={2} color="#d97706" />
                  {t("ملاحظات النزيل")}
                </p>
                <textarea
                  value={viewNotes}
                  onChange={(e) => setViewNotes(e.target.value)}
                  rows={3}
                  placeholder={t("أضف ملاحظات خاصة بهذا النزيل هنا...")}
                  style={{
                    width: "100%",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    padding: "0.5rem 0.75rem",
                    fontSize: 13,
                    color: "#78350f",
                    background: "#fff",
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    marginTop: 6,
                  }}
                >
                  <button
                    onClick={saveViewNotes}
                    disabled={savingNotes}
                    style={{
                      background: savingNotes ? "#94a3b8" : "#d97706",
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      padding: "0.35rem 0.9rem",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: savingNotes ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={12} strokeWidth={2} />
                    {savingNotes ? t("جاري الحفظ...") : t("حفظ الملاحظات")}
                  </button>
                </div>
              </div>

              {/* Reservation history */}
              <div style={{ marginBottom: "0.5rem" }}>
                <p
                  style={{
                    fontWeight: 800,
                    fontSize: 13,
                    color: "var(--color-heading, #1e293b)",
                    marginBottom: "0.6rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Calendar size={14} strokeWidth={2} color="#4f46e5" />
                  {t("سجل الإقامات")} ({guestReservations(viewGuest).length})
                </p>

                {guestReservations(viewGuest).length === 0 ? (
                  <p
                    style={{
                      color: "var(--color-muted, #64748b)",
                      fontSize: 13,
                      padding: "1rem",
                      background: "#f8fafc",
                      borderRadius: 8,
                      textAlign: "center",
                    }}
                  >
                    {t("لا توجد حجوزات مرتبطة بهذا النزيل في النظام.")}
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {guestReservations(viewGuest).map((r) => {
                      const remaining = Number(r.total) - Number(r.paid);
                      const sc = STATUS_COLOR[r.status] ?? "#64748b";
                      return (
                        <div
                          key={r.id}
                          style={{
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRight: `3px solid ${sc}`,
                            borderRadius: 8,
                            padding: "0.65rem 0.85rem",
                            display: "grid",
                            gridTemplateColumns: "1.2fr 1fr 1fr 1fr auto",
                            gap: "0.5rem",
                            alignItems: "center",
                            fontSize: 12,
                          }}
                        >
                          <div>
                            <p style={{ fontWeight: 800, color: "#1e293b" }}>
                              {r.booking_number}
                            </p>
                            <p style={{ color: "#64748b" }}>
                              {lang==="ar"?`غرفة ${r.room_number || "—"}`:`Room ${r.room_number || "—"}`}
                            </p>
                          </div>
                          <div>
                            <p style={{ color: "#94a3b8", fontSize: 10 }}>{t("دخول")}</p>
                            <p style={{ fontWeight: 700, color: "#1e293b" }}>
                              {fmtDate(r.check_in_date)}
                            </p>
                          </div>
                          <div>
                            <p style={{ color: "#94a3b8", fontSize: 10 }}>{t("مغادرة")}</p>
                            <p style={{ fontWeight: 700, color: "#1e293b" }}>
                              {fmtDate(r.check_out_date)}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontWeight: 800, color: "#1e293b" }}>
                              {Number(r.total).toLocaleString("en-US")} {r.currency}
                            </p>
                            {remaining > 0 && (
                              <p
                                style={{
                                  color: "#dc2626",
                                  fontWeight: 700,
                                  fontSize: 10,
                                }}
                              >
                                {t("متبقي")}: {remaining.toLocaleString("en-US")}
                              </p>
                            )}
                          </div>
                          <span
                            style={{
                              background: sc,
                              color: "#fff",
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="ds-modal-foot"
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-start",
                padding: "1rem 1.25rem",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                onClick={() => setViewGuest(null)}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.5rem 1.2rem",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t("إغلاق")}
              </button>
              <button
                onClick={() => { navToReservations({search: viewGuest.idNumber || viewGuest.phone || `${viewGuest.firstName} ${viewGuest.lastName}`.trim()}); setViewGuest(null); }}
                style={{background:"#0f766e",color:"#fff",border:"none",borderRadius:8,padding:"0.5rem 1.2rem",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}
              >
                <Calendar size={13} strokeWidth={2}/> {t("حجوزاته")}
              </button>
              <button
                onClick={() => {
                  openEdit(viewGuest);
                  setViewGuest(null);
                }}
                style={{
                  background: "#1e293b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.5rem 1.2rem",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Pencil size={13} strokeWidth={2} />
                {t("تعديل التصنيف")}
              </button>
              <button
                onClick={() => quickToggleFlag(viewGuest, "vip")}
                style={{
                  background:
                    viewGuest.flag === "vip" ? "#f59e0b" : "#fef3c7",
                  color: viewGuest.flag === "vip" ? "#fff" : "#92400e",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.5rem 1.2rem",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Crown size={13} strokeWidth={2} />
                {viewGuest.flag === "vip" ? t("إزالة VIP") : t("تعيين VIP")}
              </button>
              <button
                onClick={() => quickToggleFlag(viewGuest, "blacklist")}
                style={{
                  background:
                    viewGuest.flag === "blacklist" ? "#dc2626" : "#fef2f2",
                  color: viewGuest.flag === "blacklist" ? "#fff" : "#991b1b",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.5rem 1.2rem",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Ban size={13} strokeWidth={2} />
                {viewGuest.flag === "blacklist" ? t("إزالة الحظر") : t("حظر النزيل")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ EDIT FLAG MODAL ═════════════════════════════════════════════════ */}
      {editGuest && (
        <div
          className="ds-modal-backdrop"
          onClick={() => setEditGuest(null)}
        >
          <div
            className="ds-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, width: "95vw" }}
          >
            {/* Head */}
            <div className="ds-modal-head">
              <div>
                <h2 style={{ fontWeight: 900, fontSize: 16, color: "#1e293b" }}>
                  {t("تعديل تصنيف النزيل")}
                </h2>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {editGuest.firstName} {editGuest.lastName}
                </p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setEditGuest(null)}
                style={{background:"none",border:"1px solid #e2e8f0",borderRadius:8,padding:"0.35rem 0.5rem",cursor:"pointer",color:"#64748b",display:"flex",alignItems:"center"}}
              >
                <X size={16} strokeWidth={2}/>
              </button>
            </div>

            {/* Body */}
            <div
              className="ds-modal-body"
              style={{ padding: "1.25rem" }}
            >
              {/* Flag radio options */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                {(["normal", "vip", "blacklist"] as GuestFlag[]).map((f) => (
                  <label
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0.65rem 0.9rem",
                      border: `2px solid ${
                        editFlag === f ? FLAG_COLOR[f].strip : "#e2e8f0"
                      }`,
                      borderRadius: 10,
                      cursor: "pointer",
                      fontWeight: 700,
                      background: editFlag === f ? FLAG_COLOR[f].bg : "#fff",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="radio"
                      value={f}
                      checked={editFlag === f}
                      onChange={() => setEditFlag(f)}
                      style={{
                        accentColor: FLAG_COLOR[f].strip,
                        width: 16,
                        height: 16,
                      }}
                    />
                    {f === "vip" && (
                      <Crown size={15} color="#d97706" strokeWidth={2} />
                    )}
                    {f === "blacklist" && (
                      <Ban size={15} color="#dc2626" strokeWidth={2} />
                    )}
                    {f === "normal" && (
                      <UserPlus size={15} color="#64748b" strokeWidth={2} />
                    )}
                    <span style={{ color: FLAG_COLOR[f].color, fontSize: 14 }}>
                      {FLAG_LABEL[f]}
                    </span>
                    {f === "vip" && (
                      <span
                        style={{
                          marginRight: "auto",
                          fontSize: 11,
                          color: "#92400e",
                          opacity: 0.7,
                        }}
                      >
                        {t("أولوية وامتيازات خاصة")}
                      </span>
                    )}
                    {f === "blacklist" && (
                      <span
                        style={{
                          marginRight: "auto",
                          fontSize: 11,
                          color: "#991b1b",
                          opacity: 0.7,
                        }}
                      >
                        {t("ممنوع من الحجز")}
                      </span>
                    )}
                    {f === "normal" && (
                      <span
                        style={{
                          marginRight: "auto",
                          fontSize: 11,
                          color: "#64748b",
                          opacity: 0.7,
                        }}
                      >
                        {t("نزيل عادي")}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* Notes */}
              <div className="field">
                <label
                  className="field-label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: 6,
                  }}
                >
                  <FileText size={12} strokeWidth={2} color="#4f46e5" />
                  {t("ملاحظات خاصة")}
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t("سبب التصنيف، تفاصيل إضافية، تعليمات للموظفين...")}
                  style={{
                    resize: "vertical",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Blacklist warning */}
              {editFlag === "blacklist" && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "0.6rem 0.85rem",
                    marginTop: "0.75rem",
                    fontSize: 12,
                    color: "#991b1b",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ShieldOff size={14} strokeWidth={2} color="#dc2626" />
                  {t("تحذير: سيظهر تنبيه عند محاولة حجز هذا النزيل.")}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="ds-modal-foot"
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-start",
                padding: "1rem 1.25rem",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                onClick={() => setEditGuest(null)}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.5rem 1.2rem",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t("إلغاء")}
              </button>
              <button
                onClick={saveFlag}
                style={{
                  background: "#4f46e5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.5rem 1.4rem",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <CheckCircle2 size={13} strokeWidth={2} />
                {t("حفظ التصنيف")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
