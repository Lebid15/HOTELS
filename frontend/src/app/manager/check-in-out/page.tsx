"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { PlaneLanding, Home, PlaneTakeoff, AlertTriangle, ClipboardList, Banknote, Search, Calendar, Users, Key, DoorOpen, CreditCard, Printer, FileText, X, BookOpen, UserX, TrendingUp, Building2, Activity } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";
import { escapeHtml as esc, printHtml } from "@/lib/print";


type TabType = "arrivals"|"in_house"|"departures"|"attention"|"log";
type TL = "arrival_due"|"in_house"|"departure_due"|"upcoming"|"departed"|"cancelled";

interface Res {
  id:number; booking_number:string;
  guest_first_name:string; guest_last_name:string;
  guest_id_number:string; guest_phone:string; guest_email:string;
  room:number|null; room_number:string; room_floor:number; room_price:string|number;
  check_in_date:string; check_out_date:string;
  nights_count:number; persons_count:number;
  total:string|number; paid:string|number; currency:string;
  status:string; notes:string; created_by_name:string|null; updated_at:string;
  companions:unknown[]; companion_docs:unknown[];
  guest_doc_type:string; guest_doc_image:string;
  family_doc_type:string; family_doc_image:string;
}
interface RoomItem { id:number; number:string; floor:number; status:string; }

/* ─── Labels & Styles ─────────────────────────────────────── */
// TL_LABELS moved inside component (uses t())
const TL_STYLE:Record<string,React.CSSProperties> = {
  arrival_due:  {background:"#16a34a",color:"#fff",border:"none"},
  in_house:     {background:"#2563eb",color:"#fff",border:"none"},
  departure_due:{background:"#f59e0b",color:"#fff",border:"none"},
  upcoming:     {background:"#0891b2",color:"#fff",border:"none"},
  departed:     {background:"#64748b",color:"#fff",border:"none"},
  cancelled:    {background:"#7c3aed",color:"#fff",border:"none"},
};
// STATUS_LABELS, ROOM_LABELS, TABS, EMPTY, TL_LABELS moved inside component (use t())

/* ─── Room color system ──────────────────────────────────── */
const HUES=[210,160,280,30,0,180,340,60,120,100,320,240,200,140,80,20,260,300,195,45,315,75,225,135,15,255,355,105];
function roomColors(k:string){
  let h=5381;const s=k||"0";
  for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;
  const hue=HUES[h%HUES.length];
  return {
    gradient:`linear-gradient(135deg,hsl(${hue},80%,95%),hsl(${hue},60%,97%))`,
    strip:`hsl(${hue},65%,55%)`,
    avatar:`linear-gradient(135deg,hsl(${hue},75%,45%),hsl(${hue},60%,35%))`,
    border:`hsl(${hue},50%,85%)`,
  };
}
function initials(n:string){return n.split(" ").map(w=>w[0]??"").join("").toUpperCase().slice(0,2)||"?";}

/* ─── Timeline computation ───────────────────────────────── */
function calcTL(r:Res, today:string):TL {
  if(["cancelled","no_show"].includes(r.status)) return "cancelled";
  if(r.status==="checked_out") return "departed";
  if(r.status==="checked_in") return (r.check_out_date&&r.check_out_date<=today)?"departure_due":"in_house";
  if(["pending","confirmed"].includes(r.status)){
    if(!r.check_in_date) return "upcoming";
    return r.check_in_date<=today?"arrival_due":"upcoming";
  }
  return "cancelled";
}

/* ─── Natural room number sort ───────────────────────────── */
function roomNum(s:string){return parseInt((s||"").replace(/\D/g,"")||"0");}
function sortByRoom<T extends{room_number:string;check_in_date:string;booking_number:string}>(a:T,b:T){
  const d=roomNum(a.room_number)-roomNum(b.room_number);
  if(d!==0)return d;
  if(a.check_in_date!==b.check_in_date)return(a.check_in_date||"").localeCompare(b.check_in_date||"");
  return(a.booking_number||"").localeCompare(b.booking_number||"");
}

/* ─── Print ──────────────────────────────────────────────── */
const PCSS=`@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;color:#111;font-size:13px;padding:24px;background:#fff}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #2563eb;margin-bottom:20px}
.hotel-name{font-size:20px;font-weight:900;color:#1e293b}.hotel-meta{font-size:11px;color:#64748b;margin-top:4px;line-height:1.6}
.logo{width:52px;height:52px;object-fit:contain;border-radius:8px}
.main-title{font-size:24px;font-weight:900;color:#1e293b;margin-bottom:6px}
.bk-chip{display:inline-block;background:#e0e7ff;color:#2563eb;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:8px}
.sumbar{display:grid;grid-template-columns:1fr 1fr 1fr;background:#e2e8f0;border-radius:10px;overflow:hidden;gap:1px;margin-bottom:20px}
.sc{background:#fff;padding:12px 16px}.sc-label{font-size:10px;color:#64748b;margin-bottom:3px}.sc-val{font-size:16px;font-weight:900;color:#1e293b}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.sect{border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:16px}
.sh{display:flex;align-items:center;gap:8px;margin-bottom:12px}.sh h3{font-size:14px;font-weight:800;color:#1e293b}
.ico{width:28px;height:28px;border-radius:50%;background:#e0e7ff;color:#2563eb;font-weight:900;font-size:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.dg{display:grid;grid-template-columns:1fr 1fr;gap:10px}.fr{grid-column:1/-1}
.dl{font-size:10px;color:#94a3b8;margin-bottom:2px}.dv{font-size:12px;font-weight:700;color:#1e293b}
.ar{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
.ar.tot{font-weight:900;font-size:16px;border-top:2px solid #1e293b;border-bottom:none;margin-top:8px}
.ar.paid{color:#15803d}.ar.rem{color:#b91c1c}
.footer{display:flex;justify-content:space-between;margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}
@media print{body{padding:12px}}`;

function printRes(r:Res,hi:{name:string;address:string;city:string;phone:string;email:string;logo:string},uname:string,statusLabels:Record<string,string>){
  const guestName=esc(`${r.guest_first_name} ${r.guest_last_name}`.trim());
  const roomLabel=r.room_number?`غرفة ${esc(r.room_number)} - الطابق ${r.room_floor}`:"—";
  const rem=Number(r.total)-Number(r.paid);
  const meta=[hi.address,hi.city,hi.phone,hi.email].filter(Boolean).map(s=>esc(s)).join(" • ");
  const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>ملخص الحجز - ${r.booking_number}</title>
<style>${PCSS}</style></head><body>
<div class="hdr"><div><h1 class="main-title">ملخص الحجز</h1><span class="bk-chip">${r.booking_number}</span></div>
<div style="text-align:right"><div class="hotel-name">${esc(hi.name)||"الفندق"}</div><div class="hotel-meta">${meta}</div>${hi.logo?`<img src="${hi.logo}" class="logo"/>`:""}
</div></div>
<div class="sumbar">
<div class="sc"><div class="sc-label">الاسم الكامل</div><div class="sc-val">${guestName||"—"}</div></div>
<div class="sc" style="text-align:center"><div class="sc-label">الغرفة</div><div class="sc-val">${roomLabel}</div></div>
<div class="sc" style="text-align:left"><div class="sc-label">المتبقي</div><div class="sc-val">${r.currency} ${rem}</div></div>
</div>
<div class="two">
<section class="sect"><div class="sh"><span class="ico">☷</span><h3>بيانات الحجز</h3></div><div class="dg">
<div><div class="dl">تاريخ الدخول</div><div class="dv">${r.check_in_date||"—"}</div></div>
<div><div class="dl">تاريخ المغادرة</div><div class="dv">${r.check_out_date||"—"}</div></div>
<div><div class="dl">عدد الليالي</div><div class="dv">${r.nights_count}</div></div>
<div><div class="dl">حالة الحجز</div><div class="dv">${statusLabels[r.status]??r.status}</div></div>
<div class="fr"><div class="dl">موظف الحجز</div><div class="dv">${esc(r.created_by_name??uname)}</div></div>
</div></section>
<section class="sect"><div class="sh"><span class="ico">☻</span><h3>بيانات النزيل</h3></div><div class="dg">
<div><div class="dl">الرقم الوطني</div><div class="dv">${esc(r.guest_id_number)||"—"}</div></div>
<div><div class="dl">الهاتف</div><div class="dv">${esc(r.guest_phone)||"—"}</div></div>
<div><div class="dl">عدد الأشخاص</div><div class="dv">${r.persons_count}</div></div>
<div class="fr"><div class="dl">البريد</div><div class="dv">${esc(r.guest_email)||"—"}</div></div>
</div></section></div>
<div class="footer"><span>نسخة الزبون</span><span>تاريخ الطباعة: ${new Date().toLocaleString("en-US")}</span></div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
  printHtml(html);
}

function printStatement(r:Res,hi:{name:string;address:string;city:string;phone:string;email:string;logo:string}){
  const guestName=esc(`${r.guest_first_name} ${r.guest_last_name}`.trim());
  const rem=Number(r.total)-Number(r.paid);
  const meta=[hi.address,hi.city,hi.phone,hi.email].filter(Boolean).map(s=>esc(s)).join(" • ");
  const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف الحساب - ${r.booking_number}</title>
<style>${PCSS}</style></head><body>
<div class="hdr"><div><h1 class="main-title">كشف الحساب</h1><span class="bk-chip">${r.booking_number}</span></div>
<div style="text-align:right"><div class="hotel-name">${esc(hi.name)||"الفندق"}</div><div class="hotel-meta">${meta}</div>${hi.logo?`<img src="${hi.logo}" class="logo"/>`:""}
</div></div>
<section class="sect"><div class="sh"><span class="ico">☻</span><h3>معلومات النزيل</h3></div><div class="dg">
<div><div class="dl">الاسم الكامل</div><div class="dv">${guestName||"—"}</div></div>
<div><div class="dl">الهاتف</div><div class="dv">${esc(r.guest_phone)||"—"}</div></div>
<div><div class="dl">الغرفة</div><div class="dv">${r.room_number?"غرفة "+esc(r.room_number)+" - الطابق "+r.room_floor:"—"}</div></div>
<div><div class="dl">عدد الليالي</div><div class="dv">${r.nights_count}</div></div>
<div><div class="dl">تاريخ الدخول</div><div class="dv">${r.check_in_date||"—"}</div></div>
<div><div class="dl">تاريخ المغادرة</div><div class="dv">${r.check_out_date||"—"}</div></div>
</div></section>
<section class="sect"><div class="sh"><span class="ico">$</span><h3>تفاصيل المبالغ</h3></div>
<div class="ar"><span>سعر الغرفة / الليلة</span><span>${r.currency} ${Number(r.room_price??0).toLocaleString()}</span></div>
<div class="ar"><span>عدد الليالي</span><span>${r.nights_count}</span></div>
<div class="ar tot"><span>الإجمالي</span><span>${r.currency} ${Number(r.total).toLocaleString()}</span></div>
<div class="ar paid"><span>المدفوع</span><span>${r.currency} ${Number(r.paid).toLocaleString()}</span></div>
<div class="ar rem"><span>المتبقي</span><span>${r.currency} ${rem.toLocaleString()}</span></div>
</section>
<div class="footer"><span>كشف الحساب</span><span>تاريخ الطباعة: ${new Date().toLocaleString("en-US")}</span></div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
  printHtml(html);
}

/* ══════════════════════════════════════════════════════════ */
export default function CheckInOutPage() {
  const { t, lang } = useLang();
  const TL_LABELS:Record<string,string> = {
    arrival_due:t("جاهز للدخول"), in_house:t("داخل الفندق"),
    departure_due:t("مغادرة مستحقة"), upcoming:t("قادم لاحقًا"),
    departed:t("غادر"), cancelled:t("ملغي"),
  };
  const STATUS_LABELS:Record<string,string> = {
    pending:t("قيد الانتظار"), confirmed:t("مؤكد"), checked_in:t("داخل الإقامة"),
    checked_out:t("مكتمل"), cancelled:t("ملغي"), no_show:t("لم يحضر"),
  };
  const ROOM_LABELS:Record<string,string> = {
    available:t("متاحة"), occupied:t("مشغولة"), cleaning:t("تنظيف"),
    maintenance:t("صيانة"), out_of_service:t("خارج الخدمة"), archived:t("مؤرشفة"),
  };
  const TABS: { id: TabType; label: string; Icon: LucideIcon }[] = [
    {id:"arrivals",   label:t("وصول اليوم"),    Icon: PlaneLanding},
    {id:"in_house",   label:t("مقيمون حاليًا"), Icon: Home},
    {id:"departures", label:t("مغادرة اليوم"),  Icon: PlaneTakeoff},
    {id:"attention",  label:t("بحاجة متابعة"),  Icon: AlertTriangle},
    {id:"log",        label:t("السجل"),         Icon: ClipboardList},
  ];
  const EMPTY:Record<TabType,{title:string;sub:string}> = {
    arrivals:  {title:t("لا يوجد وصول مستحق"),     sub:t("لا توجد حجوزات جاهزة للدخول حسب تاريخ التشغيل الحالي.")},
    in_house:  {title:t("لا يوجد نزلاء داخل الفندق"), sub:t("عند تسجيل الدخول ستظهر الإقامات الفعالة هنا.")},
    departures:{title:t("لا توجد مغادرات مستحقة"), sub:t("لا يوجد نزلاء يجب تسجيل خروجهم حسب تاريخ التشغيل الحالي.")},
    attention: {title:t("لا توجد حالات بحاجة متابعة"), sub:t("لا توجد مغادرات مستحقة أو مبالغ متبقية ضمن الحالات الحالية.")},
    log:       {title:t("لا يوجد سجل بعد"),        sub:t("سيظهر هنا سجل الدخول والمغادرة بعد تنفيذ العمليات.")},
  };
  const router  = useRouter();
  const hotelId = typeof window!=="undefined"?(localStorage.getItem("hotel_id")??""):"";
  const today   = new Date().toISOString().slice(0,10);

  const [reservations, setReservations] = useState<Res[]>([]);
  const [rooms,        setRooms]        = useState<RoomItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<TabType>("arrivals");
  const [opDate,       setOpDate]       = useState(today);
  const [search,       setSearch]       = useState("");
  const [fRoom,        setFRoom]        = useState("all");
  const [actionRes,    setActionRes]    = useState<number|null>(null);

  /* Payment modal */
  const [payRes,    setPayRes]    = useState<Res|null>(null);
  const [, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [, setPayNote]   = useState("");
  const [payErr,    setPayErr]    = useState("");
  const [paying,    setPaying]    = useState(false);

  /* Toast */
  const [toast, setToast] = useState("");
  function showToast(msg:string){setToast(msg);setTimeout(()=>setToast(""),4000);}

  /* Hotel info */
  const [hi, setHi] = useState({name:"",address:"",city:"",phone:"",email:"",logo:""});
  const [uname, setUname] = useState("Hotel Manager");

  /* ── Fetch ── */
  function fetchAll() {
    if(!hotelId){setLoading(false);return;}
    setLoading(true);
    Promise.all([
      fetch(`${API}/reservations/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()),
      fetch(`${API}/rooms/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()),
    ]).then(([rd,romd])=>{
      setReservations(Array.isArray(rd)?rd:rd.results??[]);
      setRooms(Array.isArray(romd)?romd:romd.results??[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }
  useEffect(()=>{
    const execute = async () => {
      await fetchAll();
      const u=localStorage.getItem("username");if(u)setUname(u);
      if(hotelId){
        fetch(`${API}/hotels/${hotelId}/`,{headers:apiH()}).then(r=>r.json())
          .then(d=>setHi(p=>({...p,name:d.name??"",phone:d.phone??"",email:d.email??"",address:d.address??"",city:d.city??""}))).catch(()=>{});
        try{const hs=JSON.parse(localStorage.getItem(`hs_${hotelId}`)??"{}");if(hs.logo)setHi(p=>({...p,logo:hs.logo}));}catch{}
      }
    };
    execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  /* ── Room map ── */
  const roomMap = new Map(rooms.map(r=>[r.id, r]));

  /* ── Check-in ── */
  async function handleCheckIn(r:Res) {
    setActionRes(r.id);
    try {
      await fetch(`${API}/reservations/${r.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"checked_in"})});
      if(r.room) await fetch(`${API}/rooms/${r.room}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"occupied"})});
      showToast(t("تم تسجيل دخول النزيل وتحديث الغرفة إلى مشغولة."));
      fetchAll();
    } catch{showToast(t("حدث خطأ أثناء تسجيل الدخول."));}
    setActionRes(null);
  }

  /* ── د‑3: دين الحجز = balance_due من الـBackend (غرفة + فوليو + طعام) ──── */
  const balanceOf = (r:Res) => {
    const b = (r as {balance_due?:string|number}).balance_due;
    return b!==undefined && b!==null ? Number(b) : Number(r.total)-Number(r.paid);
  };

  /* ── Checkout (عبر إجراء check_out المُلزَم خادمًا) ── */
  async function doCheckout(r:Res) {
    setActionRes(r.id);
    try {
      const resp=await fetch(`${API}/reservations/${r.id}/check_out/`,{method:"POST",headers:apiHJ(),body:"{}"});
      if(!resp.ok){
        const d=await resp.json().catch(()=>({}));
        if(d.code==="balance_due"){ setActionRes(null); handleCheckOut(r); return; }
        throw new Error();
      }
      printStatement(r,hi);
      showToast(t("تم تسجيل خروج النزيل وتحويل الغرفة إلى التنظيف، ولن تصبح متاحة إلا بعد تأكيد تم التنظيف."));
      fetchAll();
      setTimeout(()=>router.push("/manager/housekeeping"),2500);
    } catch{showToast(t("حدث خطأ أثناء تسجيل الخروج."));}
    setActionRes(null);
  }

  function handleCheckOut(r:Res) {
    if(balanceOf(r)>0){setPayRes(r);setPayAmount(balanceOf(r));setPayMethod("cash");setPayNote(t("دفع وإغلاق الحساب قبل الخروج"));setPayErr("");return;}
    doCheckout(r);
  }

  /* ── د‑3: دفع وإغلاق الحساب ثم الخروج (ذرّي عبر الـBackend) ── */
  async function settleAndCheckout() {
    if(!payRes)return;
    setPaying(true);
    try {
      const resp=await fetch(`${API}/reservations/${payRes.id}/settle_and_checkout/`,{method:"POST",headers:apiHJ(),body:JSON.stringify({method:payMethod})});
      if(!resp.ok)throw new Error();
      const r=payRes;
      setPayRes(null);
      printStatement(r,hi);
      showToast(t("تم دفع الحساب وإغلاقه وتسجيل الخروج."));
      fetchAll();
      setTimeout(()=>router.push("/manager/housekeeping"),2500);
    } catch{setPayErr(t("حدث خطأ أثناء دفع الحساب وإغلاقه."));}
    setPaying(false);
  }

  /* handlePay (الدفع الجزئي القديم) أُزيل — «دفع وإغلاق الحساب» يتم ذرّيًا عبر settleAndCheckout (د‑3). */

  /* ── Cross-page navigation ── */
  function navToGuests(search: string) {
    try { localStorage.setItem(`fandqi.nav.guests.${hotelId}`, JSON.stringify({search, ts: Date.now()})); } catch {}
    router.push("/manager/guests");
  }

  /* ── No-show handler ── */
  async function handleNoShow(r: Res) {
    setActionRes(r.id);
    try {
      await fetch(`${API}/reservations/${r.id}/`, {method:"PATCH", headers:apiHJ(), body:JSON.stringify({status:"no_show"})});
      showToast(lang === "ar" ? `تم تسجيل النزيل ${r.guest_first_name} ${r.guest_last_name} كـ "لم يحضر".` : `Guest ${r.guest_first_name} ${r.guest_last_name} marked as no-show.`);
      fetchAll();
    } catch { showToast(t("حدث خطأ.")); }
    setActionRes(null);
  }

  /* ── Derived data ── */
  const withTL = reservations.map(r=>({...r, tl:calcTL(r,opDate), remaining:balanceOf(r)}));
  const activeItems    = withTL.filter(r=>["arrival_due","in_house","departure_due"].includes(r.tl));
  const arrivalCount   = activeItems.filter(r=>r.tl==="arrival_due").length;
  const inHouseCount   = activeItems.filter(r=>["in_house","departure_due"].includes(r.tl)).length;
  const departureCount = activeItems.filter(r=>r.tl==="departure_due").length;
  const totalRemaining = activeItems.reduce((s,r)=>s+Math.max(0,r.remaining),0);
  const mainCur        = reservations[0]?.currency??"USD";

  /* ── Row-2 KPI stats ── */
  const noShowCount    = withTL.filter(r=>r.check_in_date<today&&["pending","confirmed"].includes(r.status)).length;
  const todayRevenue   = withTL.filter(r=>r.status==="checked_out"&&r.updated_at?.slice(0,10)===today).reduce((s,r)=>s+Number(r.total),0);
  const availableRooms = rooms.filter(r=>r.status==="available").length;
  const occupancyPct   = rooms.length>0?Math.round((inHouseCount/rooms.length)*100):0;

  function getTabItems(tab:TabType) {
    let list:typeof withTL;
    if(tab==="log") {
      list = reservations
        .filter(r=>["checked_in","checked_out"].includes(r.status))
        .map(r=>({...r,tl:calcTL(r,opDate),remaining:balanceOf(r)}));
    } else if(tab==="arrivals")   { list=activeItems.filter(r=>r.tl==="arrival_due"); }
    else if(tab==="in_house")     { list=activeItems.filter(r=>["in_house","departure_due"].includes(r.tl)); }
    else if(tab==="departures")   { list=activeItems.filter(r=>r.tl==="departure_due"); }
    else {/* attention */
      list=activeItems.filter(r=>r.tl==="departure_due"||(["arrival_due","in_house","departure_due"].includes(r.tl)&&r.remaining>0));
    }
    if(fRoom!=="all") list=list.filter(r=>r.room_number===fRoom);
    if(search){
      const q=search.toLowerCase();
      list=list.filter(r=>(
        `${r.guest_first_name} ${r.guest_last_name}`.toLowerCase().includes(q)||
        r.booking_number?.toLowerCase().includes(q)||
        (r.guest_id_number??"").includes(q)||(r.guest_phone??"").includes(q)||
        (r.room_number??"").includes(q)||(STATUS_LABELS[r.status]??"").includes(q)||
        (TL_LABELS[r.tl]??"").includes(q)
      ));
    }
    return [...list].sort(sortByRoom);
  }

  const tabItems = getTabItems(activeTab);
  const uniqueRooms=[...new Set(withTL.filter(r=>r.room_number).map(r=>r.room_number))]
    .sort((a,b)=>roomNum(a)-roomNum(b));

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="ds-page">

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:80,right:24,zIndex:9999,background:"#1e293b",color:"#fff",padding:"0.75rem 1.25rem",borderRadius:12,fontSize:13,fontWeight:700,maxWidth:400,boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{marginBottom:"1.25rem"}}>
        <h1 style={{fontSize:"var(--text-2xl)",fontWeight:900,color:"var(--color-heading)"}}>{t("الدخول والمغادرة")}</h1>
        <p style={{fontSize:13,color:"var(--color-muted)",marginTop:"0.25rem"}}>{t("شاشة تشغيل يومية لمتابعة وصول النزلاء، المقيمين حاليًا، المغادرات، والتنبيهات المالية المرتبطة بالغرف.")}</p>
      </div>

      {/* ── KPI Cards Row 1 — clickable, switch tabs ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"0.6rem"}}>
        {([
          {label:"وصول مستحق",    value:String(arrivalCount),   sub:"حجوزات جاهزة لتسجيل الدخول",         Icon:PlaneLanding as LucideIcon, grad:"linear-gradient(135deg,#22c55e,#16a34a)", tab:"arrivals"  as TabType},
          {label:"داخل الفندق",   value:String(inHouseCount),   sub:"إقامات فعالة الآن",                   Icon:Home as LucideIcon,         grad:"linear-gradient(135deg,#2563eb,#1d4ed8)", tab:"in_house"  as TabType},
          {label:"مغادرة مستحقة",value:String(departureCount), sub:"نزلاء يجب متابعتهم للخروج",           Icon:PlaneTakeoff as LucideIcon, grad:"linear-gradient(135deg,#f97316,#ea580c)", tab:"departures" as TabType},
          {label:"متبقي مالي",    value:`${mainCur} ${totalRemaining.toLocaleString("en-US")}`,sub:"اضغط لعرض الحالات التي بها مبالغ معلقة",Icon:Banknote as LucideIcon,grad:"linear-gradient(135deg,#a855f7,#7c3aed)", tab:"attention"  as TabType},
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;tab:TabType}[]).map(s=>(
          <div key={s.label} className="ds-kpi-card" onClick={()=>setActiveTab(s.tab)} title={t("اضغط للانتقال")}
            style={{
              background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff",
              cursor:"pointer", userSelect:"none", position:"relative",
              boxShadow:activeTab===s.tab?"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)":"0 2px 8px rgba(0,0,0,.12)",
              transform:activeTab===s.tab?"translateY(-3px) scale(1.02)":"none",
              transition:"all .2s ease",
            }}>
            {activeTab===s.tab&&<div style={{position:"absolute",top:7,left:8,background:"rgba(255,255,255,.25)",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800}}>{t("● نشط")}</div>}
            <div className="ds-kpi-icon"><s.Icon size={26} strokeWidth={1.6}/></div>
            <p style={{fontSize:13,fontWeight:700,opacity:.9,marginBottom:4}}>{t(s.label)}</p>
            <p style={{fontSize:s.label.includes("متبقي")?18:30,fontWeight:900,lineHeight:1,marginBottom:4}}>{s.value}</p>
            <p style={{fontSize:11,opacity:.75}}>{t(s.sub)}</p>
          </div>
        ))}
      </div>

      {/* ── KPI Cards Row 2 — operational intel ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {([
          {
            label:"لم يحضر",value:String(noShowCount),
            sub:noShowCount>0?t("حجوزات تجاوزت موعد الوصول دون تسجيل دخول"):t("لا يوجد تأخر في الوصول"),
            Icon:UserX as LucideIcon,
            grad:noShowCount>0?"linear-gradient(135deg,#dc2626,#b91c1c)":"linear-gradient(135deg,#64748b,#475569)",
            tab:"attention" as TabType, clickable:true,
          },
          {
            label:"إيراد اليوم", value:`${mainCur} ${todayRevenue.toLocaleString("en-US")}`,
            sub:t("إجمالي الحجوزات المكتملة اليوم"),
            Icon:TrendingUp as LucideIcon, grad:"linear-gradient(135deg,#0f766e,#0d9488)",
            tab:"log" as TabType, clickable:true,
          },
          {
            label:"غرف متاحة", value:String(availableRooms),
            sub:lang==="ar"?`من إجمالي ${rooms.length} غرفة — جاهزة للتسليم`:`From ${rooms.length} total rooms — ready for handover`,
            Icon:Building2 as LucideIcon, grad:"linear-gradient(135deg,#1e293b,#0f172a)",
            tab:null, clickable:true,
            nav:"/manager/rooms",
          },
          {
            label:"معدل الإشغال", value:`${occupancyPct}%`,
            sub:lang==="ar"?`${inHouseCount} مشغولة من ${rooms.length} غرفة`:`${inHouseCount} occupied out of ${rooms.length} rooms`,
            Icon:Activity as LucideIcon, grad:"linear-gradient(135deg,#0891b2,#0e7490)",
            tab:null, clickable:false,
          },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;tab:TabType|null;clickable:boolean;nav?:string}[]).map(s=>(
          <div key={s.label} className="ds-kpi-card"
            onClick={()=>{if(s.nav){router.push(s.nav);}else if(s.tab){setActiveTab(s.tab);}}}
            title={s.clickable?t("اضغط للانتقال"):""}
            style={{
              background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff",
              cursor:s.clickable?"pointer":"default", userSelect:"none", position:"relative",
              boxShadow:(s.tab&&activeTab===s.tab)?"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)":"0 2px 8px rgba(0,0,0,.12)",
              transform:(s.tab&&activeTab===s.tab)?"translateY(-3px) scale(1.02)":"none",
              transition:"all .2s ease",
            }}>
            <div className="ds-kpi-icon"><s.Icon size={26} strokeWidth={1.6}/></div>
            <p style={{fontSize:13,fontWeight:700,opacity:.9,marginBottom:4}}>{t(s.label)}</p>
            <p style={{fontSize:s.label.includes("إيراد")||s.label.includes("إشغال")?18:30,fontWeight:900,lineHeight:1,marginBottom:4}}>{s.value}</p>
            <p style={{fontSize:11,opacity:.75}}>{t(s.sub)}</p>
            {s.clickable&&s.label!=="معدل الإشغال"&&<p style={{fontSize:10,opacity:.6,marginTop:2,textDecoration:"underline"}}>{t("انقر للانتقال ↗")}</p>}
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.25rem",overflowX:"auto",paddingBottom:2}}>
        {TABS.map(tab=>{
          const isAct = activeTab===tab.id;
          return (
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
              display:"flex",alignItems:"center",gap:7,
              padding:"0.55rem 1.1rem",fontSize:13,fontWeight:700,cursor:"pointer",
              border:isAct?"none":"1px solid #e2e8f0",
              background:isAct?"#4f46e5":"#fff",
              color:isAct?"#fff":"#475569",
              borderRadius:50,whiteSpace:"nowrap",flexShrink:0,
              boxShadow:isAct?"0 2px 8px rgba(79,70,229,0.25)":"none",
              transition:"all 0.15s",
            }}>
              <tab.Icon size={14} strokeWidth={2} color={isAct?"#fff":"#64748b"}/> {t(tab.label)}
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ── */}
      <div className="ds-card-p" style={{marginBottom:"1.25rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"0.6rem"}}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث باسم النزيل، رقم الحجز، الهاتف، الغرفة")}</p>
            <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("اسم النزيل، رقم الحجز، الهاتف، الغرفة...")} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Calendar size={13} strokeWidth={2.2} color="#4f46e5" /> {t("تاريخ التشغيل")}</p>
            <input className="input" type="date" value={opDate} onChange={e=>setOpDate(e.target.value)} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Home size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الغرفة")}</p>
            <select className="select" value={fRoom} onChange={e=>setFRoom(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              {uniqueRooms.map(n=><option key={n} value={n}>{lang === "ar" ? `غرفة ${n}` : `Room ${n}`}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      {loading?(
        <p style={{color:"var(--color-muted)",textAlign:"center",padding:"2rem"}}>{t("جاري التحميل...")}</p>
      ):tabItems.length===0?(
        <div style={{textAlign:"center",padding:"3rem",color:"var(--color-muted)"}}>
          {(() => { const T=TABS.find(t=>t.id===activeTab); if(!T) return null; const I=T.Icon; return <I size={36} strokeWidth={1.2} style={{color:"var(--color-muted)",marginBottom:8}}/>; })()}
          <p style={{fontWeight:800,fontSize:16,marginBottom:4}}>{t(EMPTY[activeTab].title)}</p>
          <p style={{fontSize:13}}>{t(EMPTY[activeTab].sub)}</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem"}}>
          {tabItems.map(r=>{
            const rc=roomColors(r.room_number||String(r.room||"0"));
            const roomItem=r.room?roomMap.get(r.room):null;
            const roomStatus=roomItem?.status??"";
            const rem=r.remaining;
            const isActing=actionRes===r.id;
            const canCheckIn=["pending","confirmed"].includes(r.status);
            const canCheckOut=r.status==="checked_in";
            const hasBalance=rem>0;
            return (
              <div key={r.id} style={{background:rc.gradient,border:`1px solid ${rc.border}`,borderRight:`5px solid ${rc.strip}`,borderRadius:16,padding:"1.2rem 1.1rem",display:"flex",flexDirection:"column",gap:"0.55rem",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>

                {/* Top: avatar + booking chip */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{display:"flex",gap:"0.6rem",alignItems:"flex-start"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:rc.avatar,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,flexShrink:0}}>
                      {initials(`${r.guest_first_name} ${r.guest_last_name}`)}
                    </div>
                    <div>
                      <p style={{fontWeight:900,fontSize:14,color:"#1e293b",lineHeight:1.2}}>{r.guest_first_name} {r.guest_last_name}</p>
                      <p style={{fontSize:12,color:"#1e293b",fontWeight:700}}>{r.guest_id_number||r.guest_phone||"—"}</p>
                    </div>
                  </div>
                  <span style={{background:"#1e293b",color:"#fff",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,flexShrink:0}}>{r.booking_number}</span>
                </div>

                {/* Timeline badge */}
                <div style={{display:"flex",gap:"0.4rem",alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,...(TL_STYLE[r.tl]??TL_STYLE.cancelled)}}>{TL_LABELS[r.tl]??r.tl}</span>
                </div>

                {/* Room strip */}
                <div style={{background:"rgba(255,255,255,0.6)",borderRadius:8,padding:"6px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1e293b",display:"flex",alignItems:"center",gap:5}}>
                    <Home size={13} color="#4f46e5" strokeWidth={1.8}/>
                    {r.room_number?(lang === "ar" ? `غرفة ${r.room_number} - الطابق ${r.room_floor}` : `Room ${r.room_number} - Floor ${r.room_floor}`):t("لم تُحدد غرفة")}
                  </div>
                  {roomStatus&&(
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,0.8)",color:"#1e293b"}}>
                      {ROOM_LABELS[roomStatus]??roomStatus}
                    </span>
                  )}
                </div>

                {/* Data grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
                  <div style={{background:"rgba(255,255,255,0.6)",borderRadius:7,padding:"6px 9px",fontSize:12,gridColumn:"1/-1",display:"flex",alignItems:"center",gap:6,fontWeight:700,color:"#1e293b"}}>
                    <Calendar size={13} color="#4f46e5" strokeWidth={1.8}/>{r.check_in_date||"—"} ← {r.check_out_date||"—"}
                    <span style={{color:"#94a3b8",margin:"0 4px"}}>|</span>
                    <Users size={13} color="#4f46e5" strokeWidth={1.8}/>{r.persons_count} {t("أشخاص")}
                  </div>
                  <div style={{background:"rgba(255,255,255,0.6)",borderRadius:7,padding:"6px 9px",fontSize:12}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2}}>{t("الدخول الفعلي")}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{r.status==="checked_in"||r.status==="checked_out"?r.updated_at?.slice(0,10)??"—":t("لم يتم تسجيل وقت فعلي بعد")}</p>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.6)",borderRadius:7,padding:"6px 9px",fontSize:12}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2}}>{t("الخروج الفعلي")}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{r.status==="checked_out"?r.updated_at?.slice(0,10)??"—":t("لم يتم تسجيل وقت فعلي بعد")}</p>
                  </div>
                  <div style={{background:rem>0?"#fef3c7":"rgba(255,255,255,0.6)",borderRadius:7,padding:"6px 9px",fontSize:12,gridColumn:"1/-1",border:rem>0?"1px solid #fbbf24":"none",display:"flex",alignItems:"center",gap:6,fontWeight:700,color:"#1e293b"}}>
                    <Banknote size={13} color={rem>0?"#b91c1c":"#16a34a"} strokeWidth={1.8}/>
                    <span>{t("المتبقي: ")}</span>
                    <strong style={{color:rem>0?"#b91c1c":"#15803d"}}>{r.currency} {rem.toLocaleString("en-US")}</strong>
                  </div>
                </div>

                {/* Financial warning */}
                {rem>0&&canCheckOut&&(
                  <div style={{background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:8,padding:"5px 10px",fontSize:12,color:"#92400e",fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                    <AlertTriangle size={13} color="#92400e" strokeWidth={2}/> {t("تنبيه متبقي مالي: ")} {r.currency} {rem.toLocaleString("en-US")}
                  </div>
                )}

                {/* Status row */}
                <div style={{display:"flex",alignItems:"center",gap:"0.4rem",fontSize:11}}>
                  <span style={{color:"#1e293b",fontWeight:700}}>{t("الحالة:")}</span>
                  <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:"#f1f5f9",color:"#1e293b"}}>{STATUS_LABELS[r.status]??r.status}</span>
                </div>

                {/* Action buttons — row 1: primary operations */}
                <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",marginTop:"0.2rem"}}>
                  {canCheckIn&&(
                    <button disabled={isActing} onClick={()=>handleCheckIn(r)}
                      style={{flex:1,minWidth:0,background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",opacity:isActing?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {isActing?t("جارٍ..."):<><Key size={13} strokeWidth={2}/> {t("تسجيل دخول")}</>}
                    </button>
                  )}
                  {canCheckIn&&r.check_in_date<today&&(
                    <button disabled={isActing} onClick={()=>handleNoShow(r)}
                      title={t("تسجيل النزيل كـ لم يحضر")}
                      style={{background:"#64748b",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",opacity:isActing?0.6:1,display:"flex",alignItems:"center",gap:4}}>
                      <UserX size={13} strokeWidth={2}/> {t("لم يحضر")}
                    </button>
                  )}
                  {canCheckOut&&!hasBalance&&(
                    <button disabled={isActing} onClick={()=>handleCheckOut(r)}
                      style={{flex:1,minWidth:0,background:"#ea580c",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",opacity:isActing?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {isActing?t("جارٍ..."):<><DoorOpen size={13} strokeWidth={2}/> {t("تسجيل خروج")}</>}
                    </button>
                  )}
                  {canCheckOut&&hasBalance&&(
                    <button onClick={()=>{setPayRes(r);setPayAmount(rem);setPayMethod("cash");setPayNote(t("دفع وإغلاق الحساب قبل الخروج"));setPayErr("");}}
                      style={{flex:1,minWidth:0,background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <CreditCard size={13} strokeWidth={2}/> {t("دفع وإغلاق الحساب")}
                    </button>
                  )}
                </div>
                {/* Action buttons — row 2: documents & links */}
                <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap"}}>
                  <button onClick={()=>printRes(r,hi,uname,STATUS_LABELS)}
                    style={{flex:1,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                    <Printer size={13} strokeWidth={2}/> {t("طباعة")}
                  </button>
                  <button onClick={()=>printStatement(r,hi)}
                    style={{flex:1,background:"#0891b2",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                    <FileText size={13} strokeWidth={2}/> {t("كشف حساب")}
                  </button>
                  {canCheckOut&&(
                    <button onClick={()=>router.push("/manager/folio")}
                      style={{background:"#0f766e",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                      <BookOpen size={13} strokeWidth={2}/> {t("الفوليو")}
                    </button>
                  )}
                  <button onClick={()=>navToGuests(r.guest_id_number||r.guest_phone||`${r.guest_first_name} ${r.guest_last_name}`.trim())}
                    title={t("فتح ملف النزيل")}
                    style={{background:"#1e293b",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    <Users size={13} strokeWidth={2}/> {t("النزيل")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ PAYMENT MODAL ════════════════════════════════════ */}
      {payRes&&(
        <div className="ds-modal-backdrop" onClick={()=>setPayRes(null)}>
          <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
            <div className="ds-modal-head">
              <div>
                <p style={{fontSize:11,color:"var(--color-primary)",fontWeight:700,marginBottom:2}}>{t("تسوية مالية قبل الخروج")}</p>
                <h2>{t("دفع المتبقي وإغلاق الحساب")}</h2>
              </div>
              <button className="icon-btn" onClick={()=>setPayRes(null)} aria-label={t("إغلاق")} style={{background:"none",border:"1px solid #e2e8f0",borderRadius:8,padding:"0.35rem 0.5rem",cursor:"pointer",color:"#64748b",display:"flex",alignItems:"center"}}><X size={16} strokeWidth={2}/></button>
            </div>
            <div className="ds-modal-body">
              <p style={{fontSize:12,color:"var(--color-muted)",marginBottom:"1rem"}}>
                {t("يُدفع كامل المستحق (الغرفة + الفوليو + طلبات المطعم على الغرفة) ويُغلَق الحساب، ثم يُسجَّل الخروج تلقائيًا وتتحوّل الغرفة إلى التنظيف.")}
              </p>
              {/* د‑3: تفصيل الذمّة الكامل */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.75rem"}}>
                {[
                  {l:"رقم الحجز",v:payRes.booking_number},
                  {l:"اسم النزيل",v:`${payRes.guest_first_name} ${payRes.guest_last_name}`.trim()},
                  {l:"رصيد الغرفة",v:`${payRes.currency} ${(Number(payRes.total)-Number(payRes.paid)).toLocaleString("en-US")}`},
                  {l:"الخدمات (فوليو/طعام)",v:`${payRes.currency} ${Number((payRes as {charges_total?:number}).charges_total??0).toLocaleString("en-US")}`},
                ].map(item=>(
                  <div key={item.l} style={{background:"#f8fafc",borderRadius:8,padding:"0.6rem 0.75rem"}}>
                    <p style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>{t(item.l)}</p>
                    <p style={{fontWeight:700,fontSize:13}}>{item.v}</p>
                  </div>
                ))}
              </div>
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"0.6rem 0.85rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:700,color:"#991b1b"}}>{t("المستحق الآن")}</span>
                <span style={{fontSize:16,fontWeight:900,color:"#b91c1c"}}>{payRes.currency} {balanceOf(payRes).toLocaleString("en-US")}</span>
              </div>
              {payErr&&<p style={{color:"var(--color-danger)",fontSize:13,marginBottom:"0.75rem"}}>{payErr}</p>}
              <div className="field" style={{marginBottom:"0.75rem"}}>
                <label className="field-label" style={{display:"flex",alignItems:"center",gap:5}}>
                  <CreditCard size={12} color="#4f46e5" strokeWidth={2}/> {t("طريقة الدفع")}
                </label>
                <select className="select" value={payMethod} onChange={e=>setPayMethod(e.target.value)}>
                  <option value="cash">{t("نقدي")}</option>
                  <option value="electronic">{t("إلكتروني")}</option>
                  <option value="card">{t("بطاقة")}</option>
                </select>
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-danger" onClick={()=>setPayRes(null)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={settleAndCheckout} disabled={paying} style={{display:"flex",alignItems:"center",gap:5}}>
                {paying?t("جارٍ الدفع..."):<><CreditCard size={13}/> {t("دفع وإغلاق الحساب")}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
