"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ClipboardList, Clock, CheckCircle2, Home, Banknote, Search, Calendar, User, Radio, Moon, Users, UserCheck, Eye, Printer, Pencil, Check, XCircle, FileText, Phone, Mail, CreditCard, Hash, Upload, Globe, BookOpen, X, AlertTriangle } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";
import { escapeHtml as esc } from "@/lib/print";

/* ─── Types ──────────────────────────────────────────────── */
type ResStatus  = "pending"|"confirmed"|"checked_in"|"checked_out"|"cancelled"|"no_show";
type ResSource  = "direct"|"phone"|"whatsapp"|"online"|"other"|"website"|"ota";
type TPayMethod = "cash"|"electronic"|"room_account";

interface RoomOpt { id:number; number:string; floor:number; type:string; price:string|number; currency:string; status:string; }
interface Companion { id_number:string; first_name:string; last_name:string; father_name:string; mother_name:string; dob:string; relation:string; }
interface CompDoc   { doc_type:string; doc_image:string; doc_name:string; }
interface Res {
  id:number; booking_number:string;
  guest_id_number:string; guest_first_name:string; guest_last_name:string;
  guest_father_name:string; guest_mother_name:string; guest_dob:string;
  guest_phone:string; guest_email:string;
  room:number|null; room_number:string; room_floor:number; room_price:string|number;
  check_in_date:string; check_out_date:string; nights_count:number; persons_count:number;
  has_companions:boolean; companion_type:string;
  companion_adults_count:number; companion_children_count:number; companion_children_relation:string;
  companions:Companion[]; companion_docs:CompDoc[];
  guest_doc_type:string; guest_doc_image:string;
  family_doc_type:string; family_doc_image:string;
  total:string|number; paid:string|number; currency:string;
  status:ResStatus; source:ResSource; notes:string;
  updated_at:string; created_at:string; created_by_name:string|null;
}

const STATUS_STYLE:Record<string,React.CSSProperties> = {
  pending:    {background:"#f59e0b",color:"#fff",border:"none"},
  confirmed:  {background:"#2563eb",color:"#fff",border:"none"},
  checked_in: {background:"#16a34a",color:"#fff",border:"none"},
  checked_out:{background:"#dc2626",color:"#fff",border:"none"},
  cancelled:  {background:"#64748b",color:"#fff",border:"none"},
  no_show:    {background:"#7c3aed",color:"#fff",border:"none"},
};


const defGuest = () => ({
  id_number:"", first_name:"", last_name:"", father_name:"", mother_name:"",
  dob:"", phone:"", email:"", no_email:false, nationality:"",
});
const defComp = () => ({
  has_companions:false, type:"مرافقون", adults_count:1, children_count:0,
  children_relation:"ابن", list:[] as Companion[],
});
const defDocs = () => ({
  guest_doc_type:"هوية شخصية", guest_doc_image:"", guest_doc_name:"",
  family_doc_type:"دفتر عائلة", family_doc_image:"", family_doc_name:"",
  companion_docs:[] as CompDoc[],
});
const emptyComp = ():Companion => ({
  id_number:"", first_name:"", last_name:"", father_name:"", mother_name:"", dob:"", relation:"زوج/زوجة",
});

function defBooking(prefix="BK", lastN=0, currency="USD") {
  const today = new Date().toISOString().slice(0,10);
  return {
    booking_number:`${prefix}-${String(lastN+1).padStart(4,"0")}`,
    room_id:"", room_price:0, persons_count:1,
    check_in:today, nights:1, check_out:today,
    total:0, paid:0, currency,
    payment_method:"cash" as TPayMethod,
    status:"pending" as ResStatus, source:"direct" as ResSource, notes:"",
  };
}

/* ─── Icon label helper ─────────────────────────────────── */
function FL({ Icon, label }: { Icon: React.ElementType; label: string }) {
  return (
    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
      <Icon size={12} strokeWidth={2} color="#4f46e5" /> {label}
    </span>
  );
}

function addDays(date:string, n:number) {
  const d = new Date(date); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
}
function toB64(f:File):Promise<string> {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target?.result as string);r.onerror=rej;r.readAsDataURL(f);});
}
function viewImg(b64:string) {
  if(!b64)return;
  const w=window.open();
  if(w){w.document.write(`<img src="${esc(b64)}" style="max-width:100%;max-height:100vh;display:block;margin:auto">`);}
}
function badgeStyle(s:string):React.CSSProperties {
  return {padding:"3px 11px",borderRadius:20,fontSize:12,fontWeight:700,...(STATUS_STYLE[s]??STATUS_STYLE.cancelled)};
}
function datesOverlap(s1:string,e1:string,s2:string,e2:string):boolean {
  return !!s1&&!!e1&&!!s2&&!!e2&&s1<e2&&s2<e1;
}

/* ─── Print CSS shared ─────────────────────────────────── */
const PCSS = `@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;color:#111;font-size:13px;padding:24px;background:#fff}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #2563eb;margin-bottom:20px}
.hotel-name{font-size:22px;font-weight:900;color:#1e293b}.hotel-meta{font-size:11px;color:#64748b;margin-top:4px;line-height:1.6}
.logo{width:56px;height:56px;object-fit:contain;border-radius:8px}
.main-title{font-size:26px;font-weight:900;color:#1e293b;margin-bottom:6px}
.bk-chip{display:inline-block;background:#e0e7ff;color:#2563eb;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:8px}
.sub{font-size:12px;color:#64748b;line-height:1.5}
.sumbar{display:grid;grid-template-columns:1fr 1fr 1fr;background:#e2e8f0;border-radius:10px;overflow:hidden;gap:1px;margin-bottom:20px}
.sc{background:#fff;padding:12px 16px}.sc-label{font-size:10px;color:#64748b;margin-bottom:3px}.sc-val{font-size:16px;font-weight:900;color:#1e293b}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.sect{border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:16px}
.sh{display:flex;align-items:center;gap:8px;margin-bottom:12px}.sh h3{font-size:14px;font-weight:800;color:#1e293b}
.ico{width:28px;height:28px;border-radius:50%;background:#e0e7ff;color:#2563eb;font-weight:900;font-size:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.dg{display:grid;grid-template-columns:1fr 1fr;gap:10px}.fr{grid-column:1/-1}
.dl{font-size:10px;color:#94a3b8;margin-bottom:2px}.dv{font-size:12px;font-weight:700;color:#1e293b}
.dc{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block}
.ct{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
.ct th{background:#f8fafc;padding:8px 10px;text-align:right;font-weight:700;border-bottom:1px solid #e2e8f0}
.ct td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
.nb{border:1px dashed #e2e8f0;border-radius:8px;padding:12px;font-size:12px;color:#475569;line-height:1.8}
.footer{display:flex;justify-content:space-between;margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}
@media print{body{padding:12px}}`;

/* Static Arabic labels used only in the print template (always Arabic output) */
const STATUS_LABELS_PRINT:Record<string,string> = {
  pending:"قيد الانتظار", confirmed:"مكتمل", checked_in:"مقيم",
  checked_out:"مغادر", cancelled:"ملغي", no_show:"لم يحضر",
};
const SOURCE_LABELS_PRINT:Record<string,string> = {
  direct:"مباشر", phone:"هاتف", whatsapp:"واتساب", online:"حجز إلكتروني",
  other:"أخرى", website:"موقع إلكتروني", ota:"منصة حجز",
};

function printResObj(
  r:Res,
  hi:{name:string;address:string;city:string;phone:string;email:string;logo:string},
  uname:string
) {
  const guestName = `${esc(r.guest_first_name)} ${esc(r.guest_last_name)}`.trim();
  const roomLabel = r.room_number ? `غرفة ${r.room_number} - الطابق ${r.room_floor}` : "—";
  const remaining = Number(r.total) - Number(r.paid);
  const metaLine  = [hi.address,hi.city,hi.phone,hi.email].filter(Boolean).map(v=>esc(v)).join(" • ");
  const allDocs   = [r.guest_doc_type?`✓ ${r.guest_doc_type}`:"", r.family_doc_image&&r.family_doc_type?`✓ ${r.family_doc_type}`:""].filter(Boolean);
  const companions = r.companions??[];
  const compDocs   = r.companion_docs??[];
  const compRows   = companions.length>0 ? `
    <section class="sect"><div class="sh"><span class="ico">♟</span><h3>المرافقون</h3></div>
    <table class="ct"><thead><tr><th>#</th><th>الاسم الكامل</th><th>الرقم الوطني</th><th>صلة القرابة</th><th>نوع الوثيقة</th></tr></thead>
    <tbody>${companions.map((c,i)=>`<tr><td>${i+1}</td><td>${esc(c.first_name)} ${esc(c.last_name)}</td><td>${esc(c.id_number)||"—"}</td><td>${esc(c.relation)}</td><td>${esc(compDocs[i]?.doc_type)??"—"}</td></tr>`).join("")}</tbody></table>
    ${(r.companion_children_count??0)>0?`<p style="font-size:11px;color:#64748b;margin-top:8px">أطفال: ${r.companion_children_count} - صلة القرابة: ${r.companion_children_relation}</p>`:""}</section>` : "";
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>ملخص الحجز - ${r.booking_number}</title>
<style>${PCSS}</style></head><body>
<div class="hdr">
  <div><h1 class="main-title">ملخص الحجز</h1><span class="bk-chip">${esc(r.booking_number)}</span>
  <p class="sub">يوضح هذا النموذج تفاصيل الحجز والوثائق المقدمة والشروط الإدارية المعتمدة.</p></div>
  <div style="text-align:right"><div class="hotel-name">${esc(hi.name)||"الفندق"}</div>
  <div class="hotel-meta">${metaLine}</div>${hi.logo?`<img src="${esc(hi.logo)}" class="logo" />`:""}
  </div>
</div>
<div class="sumbar">
  <div class="sc"><div class="sc-label">الاسم الكامل</div><div class="sc-val">${guestName||"—"}</div></div>
  <div class="sc" style="text-align:center"><div class="sc-label">الغرفة</div><div class="sc-val">${roomLabel}</div></div>
  <div class="sc" style="text-align:left"><div class="sc-label">المتبقي</div><div class="sc-val">${r.currency} ${remaining}</div></div>
</div>
<div class="two">
  <section class="sect"><div class="sh"><span class="ico">☷</span><h3>بيانات الحجز</h3></div>
  <div class="dg">
    <div><div class="dl">تاريخ الدخول</div><div class="dv">${r.check_in_date||"—"}</div></div>
    <div><div class="dl">تاريخ المغادرة</div><div class="dv">${r.check_out_date||"—"}</div></div>
    <div><div class="dl">عدد الليالي</div><div class="dv">${r.nights_count}</div></div>
    <div><div class="dl">حالة الحجز</div><div class="dv">${STATUS_LABELS_PRINT[r.status]??r.status}</div></div>
    <div class="fr"><div class="dl">موظف الحجز</div><div class="dv">${esc(r.created_by_name??uname)} - إدارة الفندق</div></div>
  </div></section>
  <section class="sect"><div class="sh"><span class="ico">☻</span><h3>بيانات النزيل</h3></div>
  <div class="dg">
    <div><div class="dl">الرقم الوطني</div><div class="dv">${r.guest_id_number||"—"}</div></div>
    <div><div class="dl">هاتف الضيف</div><div class="dv">${esc(r.guest_phone)||"—"}</div></div>
    <div><div class="dl">عدد الأشخاص</div><div class="dv">${r.persons_count}</div></div>
    <div><div class="dl">مصدر الحجز</div><div class="dv">${SOURCE_LABELS_PRINT[r.source]??r.source}</div></div>
    <div class="fr"><div class="dl">بريد الضيف</div><div class="dv">${esc(r.guest_email)||"—"}</div></div>
  </div></section>
</div>
<section class="sect"><div class="sh"><span class="ico">▣</span><h3>الوثائق المقدمة</h3></div>
<p style="font-size:11px;color:#64748b;margin-bottom:8px">يتم تسجيل نوع الوثيقة فقط دون عرض أو طباعة صور الوثائق للزبون.</p>
<div style="display:flex;gap:8px;flex-wrap:wrap">${allDocs.length?allDocs.map(d=>`<span class="dc">${d}</span>`).join(""):`<span style="font-size:12px;color:#94a3b8">لم تُحدد وثائق</span>`}</div>
</section>
${compRows}
<section class="sect"><div class="sh"><span class="ico">≡</span><h3>ملاحظات وشروط الحجز</h3></div>
<div class="nb">يرجى إبراز هذه الورقة عند الوصول. يتم اعتماد بيانات الحجز حسب سياسة الفندق، وتخضع أوقات الدخول والمغادرة والتعديلات لشروط الإدارة. يقر الضيف بصحة المعلومات المقدمة ويوافق على الالتزام بسياسات الفندق.${r.notes?`<br><br>${esc(r.notes)}`:""}</div>
</section>
<div class="footer"><span>نسخة الزبون</span><span>تاريخ الطباعة: ${new Date().toLocaleString("en-US")}</span></div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
  const w = window.open("","_blank","width=900,height=700");
  if(w){w.document.write(html);w.document.close();}
}

function printAccountStatement(
  r:Res,
  hi:{name:string;address:string;city:string;phone:string;email:string;logo:string}
) {
  const guestName = `${esc(r.guest_first_name)} ${esc(r.guest_last_name)}`.trim();
  const remaining = Number(r.total) - Number(r.paid);
  const metaLine  = [hi.address,hi.city,hi.phone,hi.email].filter(Boolean).map(v=>esc(v)).join(" • ");
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف الحساب - ${r.booking_number}</title>
<style>${PCSS}
.ar{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
.ar.tot{font-weight:900;font-size:16px;border-top:2px solid #1e293b;border-bottom:none;margin-top:8px}
.ar.paid{color:#15803d}.ar.rem{color:${remaining>0?"#b91c1c":"#15803d"}}
</style></head><body>
<div class="hdr">
  <div><h1 class="main-title">كشف الحساب</h1><span class="bk-chip">${esc(r.booking_number)}</span></div>
  <div style="text-align:right"><div class="hotel-name">${esc(hi.name)||"الفندق"}</div>
  <div class="hotel-meta">${metaLine}</div>${hi.logo?`<img src="${esc(hi.logo)}" class="logo" />`:""}
  </div>
</div>
<section class="sect"><div class="sh"><span class="ico">☻</span><h3>معلومات النزيل</h3></div>
<div class="dg">
  <div><div class="dl">الاسم الكامل</div><div class="dv">${guestName||"—"}</div></div>
  <div><div class="dl">الهاتف</div><div class="dv">${esc(r.guest_phone)||"—"}</div></div>
  <div><div class="dl">الغرفة</div><div class="dv">${r.room_number?"غرفة "+r.room_number+" - الطابق "+r.room_floor:"—"}</div></div>
  <div><div class="dl">عدد الليالي</div><div class="dv">${r.nights_count}</div></div>
  <div><div class="dl">تاريخ الدخول</div><div class="dv">${r.check_in_date||"—"}</div></div>
  <div><div class="dl">تاريخ المغادرة</div><div class="dv">${r.check_out_date||"—"}</div></div>
</div></section>
<section class="sect"><div class="sh"><span class="ico">$</span><h3>تفاصيل المبالغ</h3></div>
<div class="ar"><span>سعر الغرفة / الليلة</span><span>${r.currency} ${Number(r.room_price??0).toLocaleString()}</span></div>
<div class="ar"><span>عدد الليالي</span><span>${r.nights_count}</span></div>
<div class="ar tot"><span>الإجمالي</span><span>${r.currency} ${Number(r.total).toLocaleString()}</span></div>
<div class="ar paid"><span>المدفوع</span><span>${r.currency} ${Number(r.paid).toLocaleString()}</span></div>
<div class="ar rem"><span>المتبقي</span><span>${r.currency} ${remaining.toLocaleString()}</span></div>
</section>
<div class="footer"><span>كشف الحساب</span><span>تاريخ الطباعة: ${new Date().toLocaleString("en-US")}</span></div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
  const w = window.open("","_blank","width=700,height=600");
  if(w){w.document.write(html);w.document.close();}
}

/* ══════════════════════════════════════════════════════════ */
export default function ReservationsPage() {
  const { t, lang } = useLang();
  const router = useRouter();

  const RELATION_OPTS = [t("زوج/زوجة"),t("ابن"),t("ابنة"),t("أب"),t("أم"),t("أخ"),t("أخت"),t("جد"),t("جدة"),t("عم"),t("عمة"),t("خال"),t("خالة"),t("أخرى")];
  const DOC_TYPES     = [t("هوية شخصية"),t("جواز سفر"),t("إقامة"),t("تأشيرة"),t("بطاقة أخرى")];
  const FAMILY_DOCS   = [t("دفتر عائلة"),t("إثبات قرابة"),t("عقد زواج"),t("شهادة ميلاد")];

  const STATUS_LABELS:Record<string,string> = {
    pending:t("قيد الانتظار"), confirmed:t("مكتمل"), checked_in:t("مقيم"),
    checked_out:t("مغادر"), cancelled:t("ملغي"), no_show:t("لم يحضر"),
  };
  const SOURCE_LABELS:Record<string,string> = {
    direct:t("مباشر"), phone:t("هاتف"), whatsapp:t("واتساب"), online:t("حجز إلكتروني"),
    other:t("أخرى"), website:t("موقع إلكتروني"), ota:t("منصة حجز"),
  };

  const hotelId = typeof window!=="undefined"?(localStorage.getItem("hotel_id")??""):"";

  const [reservations, setReservations] = useState<Res[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [fStatus,   setFStatus]   = useState("all");
  const [fRoom,     setFRoom]     = useState("all");
  const [fStaff,    setFStaff]    = useState("all");
  const [fDay,      setFDay]      = useState<"all"|"arrivals"|"departures">("all");
  const [fBalance,  setFBalance]  = useState(false);

  /* wizard modal */
  const [open,    setOpen]    = useState(false);
  const [step,    setStep]    = useState(1);
  const [editRes, setEditRes] = useState<Res|null>(null);
  const [success, setSuccess] = useState<null|{booking_number:string;guest:string;room:string;total:number;currency:string}>(null);
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState("");

  /* view modal */
  const [viewRes, setViewRes] = useState<Res|null>(null);
  const [viewTab, setViewTab] = useState(0);

  /* form state */
  const [guest,     setGuest]     = useState(defGuest());
  const [guestAutoFilled, setGuestAutoFilled] = useState(false);
  const [comp,      setComp]      = useState(defComp());
  const [docs,      setDocs]      = useState(defDocs());
  const [booking,   setBooking]   = useState(defBooking());
  const [rooms,     setRooms]     = useState<RoomOpt[]>([]);
  const [uname,     setUname]     = useState("Hotel Manager");
  const [hotelInfo, setHotelInfo] = useState({name:"",address:"",city:"",phone:"",email:"",logo:""});
  const [folioData, setFolioData] = useState<{id:string;reservationId:number|string;type:string;description:string;amount:number;currency:string;date:string;settled:boolean}[]>([]);

  const guestDocRef  = useRef<HTMLInputElement>(null);
  const familyDocRef = useRef<HTMLInputElement>(null);
  const compDocRefs  = useRef<(HTMLInputElement|null)[]>([]);

  /* ── Fetch ─────────────────────────────────────────────── */
  function fetchRes() {
    if(!hotelId){setLoading(false);return;}
    setLoading(true);
    fetch(`${API}/reservations/?hotel=${hotelId}`,{headers:apiH()})
      .then(r=>r.json()).then(d=>{setReservations(Array.isArray(d)?d:d.results??[]);setLoading(false);})
      .catch(()=>setLoading(false));
  }
  function fetchRooms() {
    if(!hotelId)return;
    fetch(`${API}/rooms/?hotel=${hotelId}`,{headers:apiH()})
      .then(r=>r.json()).then(d=>setRooms(Array.isArray(d)?d:d.results??[])).catch(()=>{});
  }
  useEffect(()=>{
    const execute = async () => {
      await fetchRes(); await fetchRooms();
      const u=localStorage.getItem("username"); if(u)setUname(u);
      if(hotelId){
        fetch(`${API}/hotels/${hotelId}/`,{headers:apiH()})
          .then(r=>r.json())
          .then(d=>setHotelInfo(p=>({...p,name:d.name??"",phone:d.phone??"",email:d.email??"",address:d.address??"",city:d.city??""}))).catch(()=>{});
        try{const hs=JSON.parse(localStorage.getItem(`hs_${hotelId}`)??"{}");if(hs.logo)setHotelInfo(p=>({...p,logo:hs.logo}));}catch{}
        try{const fr=localStorage.getItem(`fandqi.folio.${hotelId}`);if(fr)setFolioData(JSON.parse(fr));}catch{}
        /* ── Cross-page nav state (from rooms page deep links) ── */
        try{
          const navRaw=localStorage.getItem(`fandqi.nav.reservations.${hotelId}`);
          if(navRaw){
            const nav=JSON.parse(navRaw);
            if(nav.ts && Date.now()-nav.ts<30000){
              if(nav.search) setSearch(nav.search);
              if(nav.day && ["arrivals","departures"].includes(nav.day)) setFDay(nav.day as "arrivals"|"departures");
            }
            localStorage.removeItem(`fandqi.nav.reservations.${hotelId}`);
          }
        }catch{}
      }
    };
    execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  /* ── Sync companions ─────────────────────────────────────*/
  useEffect(()=>{
    const sync = async () => {
      if(!comp.has_companions)return;
      const n=comp.adults_count;
      const list=[...comp.list]; while(list.length<n)list.push(emptyComp()); while(list.length>n)list.pop();
      setComp(p=>({...p,list}));
      const cd=[...docs.companion_docs]; while(cd.length<n)cd.push({doc_type:"هوية شخصية",doc_image:"",doc_name:""}); while(cd.length>n)cd.pop();
      setDocs(p=>({...p,companion_docs:cd}));
    };
    sync();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- comp.list/docs.companion_docs excluded to avoid infinite loop
  },[comp.adults_count,comp.has_companions]);

  /* ── Room price auto-calc ─────────────────────────────── */
  useEffect(()=>{
    const calc = async () => {
      const room=rooms.find(r=>String(r.id)===booking.room_id);
      const price=room?Number(room.price):0;
      const currency=room?.currency??booking.currency;
      const nights=Number(booking.nights)||1;
      setBooking(p=>({...p,room_price:price,currency,total:price*nights,check_out:addDays(p.check_in,nights)}));
    };
    calc();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- booking.currency excluded to avoid re-triggering on currency update
  },[booking.room_id,booking.nights,booking.check_in,rooms]);

  /* ── Room conflict check ─────────────────────────────── */
  function roomHasConflict(roomId:string, checkIn:string, checkOut:string, excludeId?:number):boolean {
    if(!roomId||!checkIn||!checkOut) return false;
    return reservations.some(r=>{
      if(r.id===excludeId) return false;
      if(r.room!==Number(roomId)) return false;
      if(["cancelled","no_show","checked_out"].includes(r.status)) return false;
      return datesOverlap(checkIn,checkOut,r.check_in_date,r.check_out_date);
    });
  }

  /* ── Open modal (add) ───────────────────────────────── */
  function openModal() {
    try{
      // Try canonical settings key first, fall back to legacy hs_ key
      const fsRaw = localStorage.getItem(`fandqi.settings.${hotelId}`);
      const hsRaw = localStorage.getItem(`hs_${hotelId}`);
      const fs = fsRaw ? JSON.parse(fsRaw) : null;
      const hs = hsRaw ? JSON.parse(hsRaw) : null;

      const prefix   = fs?.ops?.resPrefix         || hs?.inv?.reservation_prefix || "BK";
      const lastFs   = fs?.ops?.lastRes  ? Number(fs.ops.lastRes)          : 0;
      const lastHs   = hs?.inv?.last_reservation ? Number(hs.inv.last_reservation) : 0;
      const last     = Math.max(lastFs, lastHs, reservations.length);
      const currency = fs?.ops?.currency || hs?.op?.currency || "USD";

      setBooking(defBooking(prefix, last, currency));
    }catch{setBooking(defBooking("BK", reservations.length, "USD"));}
    setGuest(defGuest()); setComp(defComp()); setDocs(defDocs());
    setEditRes(null); setStep(1); setSuccess(null); setFormErr(""); setGuestAutoFilled(false); setOpen(true);
  }

  /* ── Open modal (edit) ──────────────────────────────── */
  function openEdit(r:Res) {
    setGuest({
      id_number:r.guest_id_number??"", first_name:r.guest_first_name??"",
      last_name:r.guest_last_name??"", father_name:r.guest_father_name??"",
      mother_name:r.guest_mother_name??"", dob:r.guest_dob??"",
      phone:r.guest_phone??"", email:r.guest_email??"", no_email:!r.guest_email,
      nationality:(r as Res & {nationality?:string}).nationality??"",
    });
    const compList:Companion[] = Array.isArray(r.companions)?r.companions:[];
    setComp({
      has_companions:r.has_companions??false, type:r.companion_type??"مرافقون",
      adults_count:r.companion_adults_count??0, children_count:r.companion_children_count??0,
      children_relation:r.companion_children_relation??"ابن", list:compList,
    });
    const compDocs:CompDoc[] = Array.isArray(r.companion_docs)?r.companion_docs:[];
    setDocs({
      guest_doc_type:r.guest_doc_type??"هوية شخصية", guest_doc_image:r.guest_doc_image??"",
      guest_doc_name:r.guest_doc_image?"وثيقة محفوظة":"",
      family_doc_type:r.family_doc_type??"دفتر عائلة", family_doc_image:r.family_doc_image??"",
      family_doc_name:r.family_doc_image?"وثيقة محفوظة":"",
      companion_docs:compDocs,
    });
    setBooking({
      booking_number:r.booking_number??"", room_id:r.room?String(r.room):"",
      room_price:Number(r.room_price??0), persons_count:r.persons_count??1,
      check_in:r.check_in_date??"", nights:r.nights_count??1, check_out:r.check_out_date??"",
      total:Number(r.total??0), paid:Number(r.paid??0), currency:r.currency??"SAR",
      payment_method:((r as Res & {payment_method?:TPayMethod}).payment_method??"cash") as TPayMethod,
      status:r.status??"pending", source:r.source??"direct", notes:r.notes??"",
    });
    setEditRes(r); setStep(1); setSuccess(null); setFormErr(""); setGuestAutoFilled(false); setOpen(true);
  }

  function closeModal() { setOpen(false); setSuccess(null); }

  /* ── Guest DB auto-fill ─────────────────────────────── */
  function lookupFromGuestDB(by: "id" | "phone", value: string) {
    if (!value.trim() || !hotelId) return;
    try {
      const raw = localStorage.getItem(`fandqi.guestdb.${hotelId}`);
      if (!raw) return;
      const profiles: Array<{
        idNumber: string; phone: string; firstName: string; lastName: string;
        email?: string; nationality?: string; dob?: string;
      }> = JSON.parse(raw);
      const match = profiles.find(p =>
        by === "id" ? p.idNumber === value.trim() : p.phone === value.trim()
      );
      if (!match) return;
      setGuest(prev => ({
        ...prev,
        id_number:   match.idNumber   || prev.id_number,
        first_name:  match.firstName  || prev.first_name,
        last_name:   match.lastName   || prev.last_name,
        phone:       match.phone      || prev.phone,
        email:       match.email      || prev.email,
        nationality: match.nationality|| prev.nationality,
        dob:         match.dob        || prev.dob,
        no_email:    !match.email,
      }));
      setGuestAutoFilled(true);
      setTimeout(() => setGuestAutoFilled(false), 4000);
    } catch {}
  }

  /* ── File handlers ─────────────────────────────────── */
  async function onGuestDoc(e:React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0]; if(!f)return;
    const b=await toB64(f); setDocs(p=>({...p,guest_doc_image:b,guest_doc_name:f.name}));
  }
  async function onFamilyDoc(e:React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0]; if(!f)return;
    const b=await toB64(f); setDocs(p=>({...p,family_doc_image:b,family_doc_name:f.name}));
  }
  async function onCompDoc(i:number, e:React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0]; if(!f)return;
    const b=await toB64(f);
    setDocs(p=>{const cd=[...p.companion_docs];cd[i]={...cd[i],doc_image:b,doc_name:f.name};return{...p,companion_docs:cd};});
  }

  /* ── Submit (add + edit) ───────────────────────────── */
  async function handleSave() {
    setSaving(true); setFormErr("");
    if(booking.room_id&&booking.check_in&&booking.check_out) {
      if(roomHasConflict(booking.room_id,booking.check_in,booking.check_out,editRes?.id)) {
        setFormErr(t("الغرفة محجوزة في هذه الفترة. يرجى اختيار غرفة أخرى أو تغيير التواريخ."));
        setSaving(false); return;
      }
    }
    const room = rooms.find(r=>String(r.id)===booking.room_id);
    const body = {
      hotel:Number(hotelId), room:booking.room_id?Number(booking.room_id):null,
      booking_number:booking.booking_number,
      guest_id_number:guest.id_number, guest_first_name:guest.first_name, guest_last_name:guest.last_name,
      guest_father_name:guest.father_name, guest_mother_name:guest.mother_name, guest_dob:guest.dob||null,
      guest_phone:guest.phone, guest_email:guest.no_email?"":guest.email,
      nationality:guest.nationality||null,
      has_companions:comp.has_companions, companion_type:comp.type,
      companion_adults_count:comp.adults_count, companion_children_count:comp.children_count,
      companion_children_relation:comp.children_relation, companions:comp.list,
      guest_doc_type:docs.guest_doc_type, guest_doc_image:docs.guest_doc_image,
      family_doc_type:docs.family_doc_type, family_doc_image:docs.family_doc_image,
      companion_docs:docs.companion_docs,
      check_in_date:booking.check_in||null, check_out_date:booking.check_out||null,
      nights_count:Number(booking.nights), persons_count:Number(booking.persons_count),
      room_price:booking.room_price, total:booking.total,
      paid:Number(booking.paid), currency:booking.currency,
      payment_method:booking.payment_method,
      status:booking.status, source:booking.source, notes:booking.notes,
    };
    try{
      const url    = editRes ? `${API}/reservations/${editRes.id}/` : `${API}/reservations/`;
      const method = editRes ? "PUT" : "POST";
      const res    = await fetch(url,{method,headers:apiHJ(),body:JSON.stringify(body)});
      if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(Object.values(d).flat().join(" | ")||"فشل الحفظ");}
      const saved  = await res.json();
      if(!editRes){
        try{const hs=JSON.parse(localStorage.getItem(`hs_${hotelId}`)??"{}");hs.inv={...(hs.inv??{}),last_reservation:String(reservations.length+1)};localStorage.setItem(`hs_${hotelId}`,JSON.stringify(hs));}catch{}
      }
      setSuccess({
        booking_number:saved.booking_number??booking.booking_number,
        guest:`${guest.first_name} ${guest.last_name}`.trim(),
        room:room?`غرفة ${room.number} - الطابق ${room.floor}`:(saved.room_number?`غرفة ${saved.room_number}`:"—"),
        total:Number(booking.total), currency:booking.currency,
      });
      // Sync to localStorage so the payments page can read reservations
      try {
        const lsKey = `fandqi.reservations.${hotelId}`;
        const existing: object[] = JSON.parse(localStorage.getItem(lsKey)??"[]");
        const norm = {
          id: saved.id??editRes?.id??Date.now(),
          guestName:`${guest.first_name} ${guest.last_name}`.trim(),
          roomNumber:room?.number??saved.room_number??"",
          checkIn:booking.check_in, checkOut:booking.check_out,
          totalAmount:Number(booking.total), paidAmount:Number(booking.paid),
          paymentMethod:booking.payment_method,
          status:booking.status, currency:booking.currency,
          createdAt:new Date().toISOString(),
        };
        if(editRes){
          const upd = (existing as {id:unknown}[]).map(e=>String(e.id)===String(editRes.id)?{...e,...norm}:e);
          localStorage.setItem(lsKey,JSON.stringify(upd));
        } else {
          localStorage.setItem(lsKey,JSON.stringify([norm,...existing]));
        }
      } catch {}
      // Sync to guest DB (fandqi.guestdb) for cross-page integration
      try {
        interface GDB {id:string;idNumber:string;phone:string;firstName:string;lastName:string;email:string;nationality:string;dob:string;flag:string;notes:string;totalStays:number;totalNights:number;totalSpent:number;currency:string;lastStay:string;firstStay:string;reservationIds:number[];createdAt:string;updatedAt:string;}
        const dbKey = `fandqi.guestdb.${hotelId}`;
        const dbList:GDB[] = JSON.parse(localStorage.getItem(dbKey)??"[]");
        const rid = Number(saved.id??editRes?.id??0);
        const nights = Number(booking.nights)||1;
        const idx = dbList.findIndex(g=>(guest.id_number&&g.idNumber===guest.id_number)||(guest.phone&&g.phone===guest.phone));
        if(idx>=0){
          const old=dbList[idx];
          dbList[idx]={
            ...old,
            firstName:guest.first_name||old.firstName, lastName:guest.last_name||old.lastName,
            phone:guest.phone||old.phone, email:guest.no_email?"":guest.email||old.email,
            nationality:guest.nationality||old.nationality, dob:guest.dob||old.dob,
            totalStays:  editRes?old.totalStays  :old.totalStays+1,
            totalNights: editRes?old.totalNights :old.totalNights+nights,
            totalSpent:  editRes?old.totalSpent  :old.totalSpent+Number(booking.total),
            lastStay:booking.check_in,
            reservationIds:[...new Set([...(old.reservationIds??[]),rid])],
            updatedAt:new Date().toISOString(),
          };
        } else if(!editRes&&(guest.id_number||guest.phone)){
          dbList.unshift({
            id:`g-${Date.now()}`, idNumber:guest.id_number, phone:guest.phone,
            firstName:guest.first_name, lastName:guest.last_name,
            email:guest.no_email?"":guest.email, nationality:guest.nationality, dob:guest.dob,
            flag:"normal", notes:"", totalStays:1, totalNights:nights,
            totalSpent:Number(booking.total), currency:booking.currency,
            lastStay:booking.check_in, firstStay:booking.check_in, reservationIds:[rid],
            createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
          });
        }
        localStorage.setItem(dbKey,JSON.stringify(dbList));
      } catch {}
      fetchRes();
    }catch(e:unknown){setFormErr(e instanceof Error?e.message:t("حدث خطأ"));}
    finally{setSaving(false);}
  }

  /* ── Quick actions ──────────────────────────────────── */
  async function quickConfirm(r:Res) {
    await fetch(`${API}/reservations/${r.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"confirmed"})})
      .then(res=>{ if(res.ok) fetchRes(); }).catch(()=>{});
  }
  async function quickCancel(r:Res) {
    await fetch(`${API}/reservations/${r.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"cancelled"})})
      .then(res=>{ if(res.ok) fetchRes(); }).catch(()=>{});
  }
  async function quickCheckIn(r:Res) {
    await fetch(`${API}/reservations/${r.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"checked_in"})})
      .then(res=>{ if(res.ok) fetchRes(); }).catch(()=>{});
  }
  async function quickCheckOut(r:Res) {
    await fetch(`${API}/reservations/${r.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"checked_out"})})
      .then(res=>{ if(res.ok) fetchRes(); }).catch(()=>{});
  }

  /* ── Stats ─────────────────────────────────────────── */
  const cnt:Record<string,number>={};
  for(const r of reservations) cnt[r.status]=(cnt[r.status]??0)+1;
  const totalValue      = reservations.reduce((s,r)=>s+Number(r.total),0);
  const mainCur         = reservations[0]?.currency??"SAR";
  const todayStr        = new Date().toISOString().slice(0,10);
  const arrivalsToday   = reservations.filter(r=>r.check_in_date===todayStr&&!["cancelled","no_show","checked_out"].includes(r.status)).length;
  const departuresToday = reservations.filter(r=>r.check_out_date===todayStr&&["checked_in","checked_out"].includes(r.status)).length;
  const totalRemaining  = reservations.filter(r=>!["cancelled","no_show"].includes(r.status)).reduce((s,r)=>s+Math.max(0,Number(r.total)-Number(r.paid)),0);

  /* ── Filter ────────────────────────────────────────── */
  const uniqueRooms = [...new Set(reservations.filter(r=>r.room_number).map(r=>r.room_number))];
  const uniqueStaff = [...new Set(reservations.filter(r=>r.created_by_name).map(r=>r.created_by_name as string))];
  const filtered    = reservations.filter(r=>{
    if(fStatus!=="all"&&r.status!==fStatus)   return false;
    if(fRoom!=="all"&&r.room_number!==fRoom)  return false;
    if(fStaff!=="all"&&r.created_by_name!==fStaff) return false;
    if(fDay==="arrivals"&&r.check_in_date!==todayStr) return false;
    if(fDay==="departures"&&r.check_out_date!==todayStr) return false;
    if(fBalance&&Math.max(0,Number(r.total)-Number(r.paid))===0) return false;
    if(search){
      const q=search.toLowerCase();
      return (`${r.guest_first_name} ${r.guest_last_name}`).toLowerCase().includes(q)
        ||r.booking_number?.toLowerCase().includes(q)||(r.guest_phone??"").includes(q);
    }
    return true;
  });

  const STEPS    = [{n:1,label:t("بيانات النزيل")},{n:2,label:t("المرافقون")},{n:3,label:t("الوثائق")},{n:4,label:t("بيانات الحجز")}];
  const VIEW_TABS= [t("نظرة عامة"),t("بيانات النزيل"),t("بيانات الحجز"),t("المبالغ"),t("الوثائق والمرافقون"),t("الملاحظات"),t("رسوم الغرفة (فوليو)")];
  const initials = uname.split(" ").map((w:string)=>w[0]).join("").toUpperCase().slice(0,2)||"HM";

  /* ── Room options for select (non-archived / non-out_of_service) ── */
  const activeRooms = rooms.filter(r=>!["archived","out_of_service"].includes(r.status));

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="ds-page">

      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
        <h1 style={{fontSize:"var(--text-2xl)",fontWeight:900,color:"var(--color-heading)"}}>{t("الحجوزات")}</h1>
        <button className="ds-btn ds-btn-primary" onClick={openModal} style={{display:"flex",alignItems:"center",gap:6}}>
          <BookOpen size={15} strokeWidth={2}/> {t("إضافة حجز")}
        </button>
      </div>

      {/* ── No-rooms warning ── */}
      {rooms.length===0&&!loading&&(
        <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:12,padding:"0.85rem 1rem",marginBottom:"1rem",display:"flex",gap:"0.75rem",alignItems:"center"}}>
          <AlertTriangle size={22} style={{color:"#b45309",flexShrink:0}} />
          <div>
            <p style={{fontWeight:800,color:"#854d0e"}}>{t("لا توجد غرف مضافة في الفندق")}</p>
            <p style={{fontSize:12,color:"#92400e"}}>{t("يرجى إضافة غرف من قسم \"الغرف والطوابق\" قبل إنشاء حجوزات.")}</p>
          </div>
        </div>
      )}

      {/* ── KPI Cards — اضغط على أي كرت لتصفية القائمة ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"0.5rem"}}>
        {([
          {
            label:t("إجمالي الحجوزات"), value:String(reservations.length),
            sub:lang==="ar"?`${cnt.checked_out??0} مغادر • ${cnt.cancelled??0} ملغي`:`${cnt.checked_out??0} checked out • ${cnt.cancelled??0} cancelled`,
            Icon:ClipboardList as LucideIcon, grad:"linear-gradient(135deg,#6366f1,#4f46e5)",
            active:fStatus==="all"&&fDay==="all"&&!fBalance,
            onClick:()=>{setFStatus("all");setFDay("all");setFBalance(false);},
          },
          {
            label:t("مقيمون الآن"), value:String(cnt.checked_in??0),
            sub:t("غرف مشغولة حالياً"),
            Icon:Home as LucideIcon, grad:"linear-gradient(135deg,#16a34a,#15803d)",
            active:fStatus==="checked_in",
            onClick:()=>{setFStatus("checked_in");setFDay("all");setFBalance(false);},
          },
          {
            label:t("مؤكدة"), value:String(cnt.confirmed??0),
            sub:t("حجوزات مثبتة بانتظار الوصول"),
            Icon:CheckCircle2 as LucideIcon, grad:"linear-gradient(135deg,#2563eb,#1d4ed8)",
            active:fStatus==="confirmed",
            onClick:()=>{setFStatus("confirmed");setFDay("all");setFBalance(false);},
          },
          {
            label:t("قيد الانتظار"), value:String(cnt.pending??0),
            sub:t("تحتاج تأكيداً أو متابعة"),
            Icon:Clock as LucideIcon, grad:"linear-gradient(135deg,#f97316,#ea580c)",
            active:fStatus==="pending",
            onClick:()=>{setFStatus("pending");setFDay("all");setFBalance(false);},
          },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;onClick:()=>void}[]).map(s=>(
          <div
            key={s.label}
            className="ds-kpi-card"
            onClick={s.onClick}
            title={t("اضغط للتصفية")}
            style={{
              background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff",
              cursor:"pointer", userSelect:"none", position:"relative",
              boxShadow:s.active?"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)":"0 2px 8px rgba(0,0,0,.12)",
              transform:s.active?"translateY(-3px) scale(1.02)":"none",
              transition:"all .2s ease",
            }}
          >
            {s.active&&<div style={{position:"absolute",top:7,left:8,background:"rgba(255,255,255,.25)",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800}}>● {t("نشط")}</div>}
            <div className="ds-kpi-icon"><s.Icon size={24} strokeWidth={1.6} /></div>
            <p style={{fontSize:12,fontWeight:700,opacity:.9,marginBottom:3}}>{s.label}</p>
            <p style={{fontSize:28,fontWeight:900,lineHeight:1,marginBottom:3}}>{s.value}</p>
            <p style={{fontSize:11,opacity:.75}}>{s.sub}</p>
          </div>
        ))}
      </div>
      {/* Row 2 — date/financial KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {([
          {
            label:t("وصول اليوم"), value:String(arrivalsToday),
            sub:lang==="ar"?`${new Date().toLocaleDateString("ar-SA",{weekday:"long"})} — مغادرة: ${departuresToday}`:`${new Date().toLocaleDateString("en-US",{weekday:"long"})} — departures: ${departuresToday}`,
            Icon:Calendar as LucideIcon, grad:"linear-gradient(135deg,#0891b2,#0e7490)",
            active:fDay==="arrivals", clickable:true,
            onClick:()=>{setFStatus("all");setFDay("arrivals");setFBalance(false);},
          },
          {
            label:t("مغادرة اليوم"), value:String(departuresToday),
            sub:t("مقيمون موعد خروجهم اليوم"),
            Icon:Moon as LucideIcon, grad:"linear-gradient(135deg,#7c3aed,#6d28d9)",
            active:fDay==="departures", clickable:true,
            onClick:()=>{setFStatus("all");setFDay("departures");setFBalance(false);},
          },
          {
            label:t("قيمة الحجوزات"), value:`${mainCur} ${totalValue.toLocaleString("en-US")}`,
            sub:t("إجمالي قيمة كل الحجوزات"),
            Icon:Banknote as LucideIcon, grad:"linear-gradient(135deg,#a855f7,#7c3aed)",
            active:false, clickable:false,
            onClick:()=>{},
          },
          {
            label:t("مبالغ معلقة"), value:`${mainCur} ${totalRemaining.toLocaleString("en-US")}`,
            sub:t("أرصدة غير مسددة — اضغط للعرض"),
            Icon:Radio as LucideIcon, grad:"linear-gradient(135deg,#dc2626,#b91c1c)",
            active:fBalance, clickable:true,
            onClick:()=>{setFStatus("all");setFDay("all");setFBalance(true);},
          },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;clickable:boolean;onClick:()=>void}[]).map(s=>(
          <div
            key={s.label}
            className="ds-kpi-card"
            onClick={s.onClick}
            title={s.clickable?t("اضغط للتصفية"):""}
            style={{
              background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff",
              cursor:s.clickable?"pointer":"default", userSelect:"none", position:"relative",
              boxShadow:s.active?"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)":"0 2px 8px rgba(0,0,0,.12)",
              transform:s.active?"translateY(-3px) scale(1.02)":"none",
              transition:"all .2s ease",
            }}
          >
            {s.active&&<div style={{position:"absolute",top:7,left:8,background:"rgba(255,255,255,.25)",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800}}>● {t("نشط")}</div>}
            <div className="ds-kpi-icon"><s.Icon size={24} strokeWidth={1.6} /></div>
            <p style={{fontSize:12,fontWeight:700,opacity:.9,marginBottom:3}}>{s.label}</p>
            <p style={{fontSize:!s.clickable?15:28,fontWeight:900,lineHeight:1,marginBottom:3,wordBreak:"break-word"}}>{s.value}</p>
            <p style={{fontSize:11,opacity:.75}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="ds-card-p" style={{marginBottom:"1.25rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"0.6rem"}}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث باسم الضيف أو رقم الحجز أو الهاتف")}</p>
            <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("اكتب للبحث...")} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Calendar size={13} strokeWidth={2.2} color="#4f46e5" /> {t("حالة الحجز")}</p>
            <select className="select" value={fStatus} onChange={e=>{setFStatus(e.target.value);setFDay("all");setFBalance(false);}}>
              <option value="all">{t("الكل")}</option>
              {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Home size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الغرفة")}</p>
            <select className="select" value={fRoom} onChange={e=>setFRoom(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              {uniqueRooms.map(n=><option key={n} value={n}>{lang==="ar"?`غرفة ${n}`:`Room ${n}`}</option>)}
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><User size={13} strokeWidth={2.2} color="#4f46e5" /> {t("موظف الحجز")}</p>
            <select className="select" value={fStaff} onChange={e=>setFStaff(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              {uniqueStaff.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      {loading?(
        <p style={{color:"var(--color-muted)",textAlign:"center",padding:"2rem"}}>{t("جاري التحميل...")}</p>
      ):filtered.length===0?(
        <div style={{textAlign:"center",padding:"3rem",color:"var(--color-muted)"}}>
          <ClipboardList size={44} strokeWidth={1.2} style={{marginBottom:8,color:"var(--color-muted)"}}/>
          <p style={{fontWeight:700}}>{t("لا توجد حجوزات مطابقة")}</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"}}>
          {filtered.map(r=>{
            const remaining = Number(r.total)-Number(r.paid);
            const roomLabel = r.room_number?(lang==="ar"?`غرفة ${r.room_number} - الطابق ${r.room_floor}`:`Room ${r.room_number} - Floor ${r.room_floor}`):"—";
            const empLabel  = r.created_by_name??uname;
            return (
              <div key={r.id} style={{background:"#fff",border:"1px solid var(--color-border)",borderRadius:14,padding:"1.1rem 1.2rem",display:"flex",flexDirection:"column",gap:"0.55rem",boxShadow:"0 2px 8px rgba(0,0,0,0.07)",transition:"transform 200ms ease,box-shadow 200ms ease"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLDivElement).style.boxShadow="0 6px 20px rgba(0,0,0,0.11)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform="";(e.currentTarget as HTMLDivElement).style.boxShadow="0 2px 8px rgba(0,0,0,0.07)";}}>
                {/* Top */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <span style={{...badgeStyle(r.status),fontSize:13,padding:"4px 14px",borderRadius:20}}>{STATUS_LABELS[r.status]??r.status}</span>
                  <span style={{background:"#1e293b",color:"#fff",borderRadius:20,padding:"4px 13px",fontSize:12,fontWeight:700}}>{t("رقم الحجز")}: {r.booking_number}</span>
                </div>
                {/* Guest */}
                <div style={{borderBottom:"1px solid #f1f5f9",paddingBottom:"0.5rem"}}>
                  <p style={{fontWeight:900,fontSize:17,color:"var(--color-heading)",marginBottom:2}}>{r.guest_first_name} {r.guest_last_name}</p>
                  <p style={{fontSize:13,color:"#1e293b",fontWeight:700}}>{r.guest_phone||"—"}</p>
                </div>
                {/* Info chips */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                  <div style={{background:"#f8fafc",borderRadius:7,padding:"6px 10px",fontSize:13,fontWeight:700,color:"#1e293b",display:"flex",alignItems:"center",gap:6}}>
                    <Radio size={13} color="#4f46e5" strokeWidth={1.8}/>{SOURCE_LABELS[r.source]??r.source}
                  </div>
                  <div style={{background:"#f8fafc",borderRadius:7,padding:"6px 10px",fontSize:13,fontWeight:700,color:"#1e293b",display:"flex",alignItems:"center",gap:6}}>
                    <Home size={13} color="#4f46e5" strokeWidth={1.8}/>{roomLabel}
                  </div>
                  <div style={{background:"#f8fafc",borderRadius:7,padding:"6px 10px",fontSize:13,fontWeight:700,color:"#1e293b",gridColumn:"1/-1",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <Calendar size={13} color="#4f46e5" strokeWidth={1.8}/>{r.check_in_date} ← {r.check_out_date}
                    <span style={{color:"#cbd5e1"}}>|</span>
                    <User size={13} color="#4f46e5" strokeWidth={1.8}/>{empLabel}
                  </div>
                </div>
                <div style={{background:"#f8fafc",borderRadius:7,padding:"6px 10px",fontSize:13,fontWeight:700,color:"#1e293b",display:"flex",alignItems:"center",gap:6}}>
                  <Moon size={13} color="#4f46e5" strokeWidth={1.8}/>{r.nights_count} {t("ليالي")}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                  <div style={{background:"#f8fafc",borderRadius:7,padding:"6px 10px",fontSize:13,fontWeight:700,color:"#1e293b",display:"flex",alignItems:"center",gap:6}}><Users size={13} color="#4f46e5" strokeWidth={1.8}/>{t("عدد الأشخاص")} {r.persons_count}</div>
                  <div style={{background:"#f8fafc",borderRadius:7,padding:"6px 10px",fontSize:13,fontWeight:700,color:"#1e293b",display:"flex",alignItems:"center",gap:6}}><UserCheck size={13} color="#4f46e5" strokeWidth={1.8}/>{t("المرافقون")} {r.companion_adults_count??0}</div>
                </div>
                {/* Amounts */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                  <div style={{background:"#f0f9ff",borderRadius:7,padding:"8px 10px"}}>
                    <p style={{color:"#475569",marginBottom:3,fontSize:11,fontWeight:700}}>{t("المبلغ")}</p>
                    <p style={{fontWeight:900,fontSize:15,color:"#1e293b"}}>{r.currency} {Number(r.total).toLocaleString("en-US")}</p>
                    <p style={{color:"#475569",fontSize:12,fontWeight:700}}>{t("مدفوع")}: {Number(r.paid).toLocaleString("en-US")}</p>
                  </div>
                  <div style={{background:remaining>0?"#fff7ed":"#f0fdf4",borderRadius:7,padding:"8px 10px"}}>
                    <p style={{color:"#475569",marginBottom:3,fontSize:11,fontWeight:700}}>{t("المتبقي")}</p>
                    <p style={{fontWeight:900,fontSize:15,color:remaining>0?"#b91c1c":"#15803d"}}>{r.currency} {remaining.toLocaleString("en-US")}</p>
                    <p style={{color:"#475569",fontSize:12,fontWeight:700}}>{t("آخر تحديث")}: {r.updated_at?.slice(0,10)??""}</p>
                  </div>
                </div>
                {/* Notes */}
                <div style={{background:"#f8fafc",border:"1px dashed #e2e8f0",borderRadius:8,padding:"7px 12px",fontSize:13,fontWeight:700,color:"#1e293b",minHeight:36,display:"flex",alignItems:"flex-start",gap:7}}>
                  <FileText size={13} color="#4f46e5" strokeWidth={1.8} style={{flexShrink:0,marginTop:1}}/>
                  {r.notes||t("لا توجد ملاحظات على هذا الحجز")}
                </div>
                {/* Confirm / Cancel for pending */}
                {r.status==="pending"&&(
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    <button onClick={()=>quickConfirm(r)} className="ds-btn ds-btn-sm" style={{flex:1,background:"#16a34a",color:"#fff",border:"none",fontSize:13,padding:"0.4rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                      <Check size={14} strokeWidth={2.5}/> {t("تأكيد")}
                    </button>
                    <button onClick={()=>quickCancel(r)} className="ds-btn ds-btn-sm" style={{flex:1,background:"#dc2626",color:"#fff",border:"none",fontSize:13,padding:"0.4rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                      <XCircle size={14} strokeWidth={2}/> {t("إلغاء")}
                    </button>
                  </div>
                )}
                {/* Check-in button for confirmed */}
                {r.status==="confirmed"&&(
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    <button onClick={()=>quickCheckIn(r)} style={{flex:1,background:"#16a34a",color:"#fff",border:"none",fontSize:13,padding:"0.4rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer",fontWeight:700}}>
                      <UserCheck size={14} strokeWidth={2.5}/> {t("تسجيل دخول")}
                    </button>
                    <button onClick={()=>quickCancel(r)} style={{flex:1,background:"#dc2626",color:"#fff",border:"none",fontSize:13,padding:"0.4rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer",fontWeight:700}}>
                      <XCircle size={14} strokeWidth={2}/> {t("إلغاء")}
                    </button>
                  </div>
                )}
                {/* Check-out + Folio for checked_in */}
                {r.status==="checked_in"&&(
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    <button onClick={()=>quickCheckOut(r)} style={{flex:1,background:"#f59e0b",color:"#fff",border:"none",fontSize:13,padding:"0.4rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer",fontWeight:700}}>
                      <Check size={14} strokeWidth={2.5}/> {t("تسجيل خروج")}
                    </button>
                    <button onClick={()=>router.push("/manager/folio")} style={{flex:1,background:"#4f46e5",color:"#fff",border:"none",fontSize:13,padding:"0.4rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer",fontWeight:700}}>
                      <BookOpen size={14} strokeWidth={2}/> {t("فوليو الغرفة")}
                    </button>
                  </div>
                )}
                {/* Action buttons */}
                <div style={{display:"flex",gap:"0.4rem",marginTop:"0.15rem"}}>
                  <button onClick={()=>{setViewRes(r);setViewTab(0);}} className="ds-btn ds-btn-sm" style={{flex:1,background:"#4f46e5",color:"#fff",border:"none",fontSize:13,padding:"0.45rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    <Eye size={14} strokeWidth={2}/> {t("عرض")}
                  </button>
                  <button onClick={()=>printResObj(r,hotelInfo,uname)} className="ds-btn ds-btn-sm" style={{flex:1,background:"#2563eb",color:"#fff",border:"none",fontSize:13,padding:"0.45rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    <Printer size={14} strokeWidth={2}/> {t("طباعة")}
                  </button>
                  <button onClick={()=>openEdit(r)} className="ds-btn ds-btn-sm" style={{flex:1,background:"#1e293b",color:"#fff",border:"none",fontSize:13,padding:"0.45rem 0.5rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    <Pencil size={14} strokeWidth={2}/> {t("تعديل")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════ VIEW MODAL ═══════════════════════════════ */}
      {viewRes&&(
        <div className="ds-modal-backdrop" onClick={()=>setViewRes(null)}>
          <div className="ds-modal-card wide" onClick={e=>e.stopPropagation()} style={{maxWidth:860}}>
            <div className="ds-modal-head">
              <h2>{t("تفاصيل الحجز")} — {viewRes.booking_number}</h2>
              <button className="icon-btn" onClick={()=>setViewRes(null)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            {/* Tabs */}
            <div style={{display:"flex",gap:"0.25rem",padding:"0 1.5rem",borderBottom:"1px solid var(--color-border)",overflowX:"auto"}}>
              {VIEW_TABS.map((t,i)=>(
                <button key={i} onClick={()=>setViewTab(i)} style={{
                  padding:"0.6rem 0.85rem",fontSize:13,fontWeight:700,cursor:"pointer",border:"none",
                  background:"transparent",whiteSpace:"nowrap",flexShrink:0,
                  color:viewTab===i?"var(--color-primary)":"var(--color-muted)",
                  borderBottom:viewTab===i?"2px solid var(--color-primary)":"2px solid transparent",
                }}>{t}</button>
              ))}
            </div>
            <div className="ds-modal-body" style={{maxHeight:"60vh",overflowY:"auto"}}>

              {/* Tab 0 — نظرة عامة */}
              {viewTab===0&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.65rem"}}>
                  {[
                    {l:t("رقم الحجز"),v:viewRes.booking_number},
                    {l:t("حالة الحجز"),v:<span style={badgeStyle(viewRes.status)}>{STATUS_LABELS[viewRes.status]??viewRes.status}</span>},
                    {l:t("مصدر الحجز"),v:SOURCE_LABELS[viewRes.source]??viewRes.source},
                    {l:t("الغرفة"),v:viewRes.room_number?(lang==="ar"?`غرفة ${viewRes.room_number} - الطابق ${viewRes.room_floor}`:`Room ${viewRes.room_number} - Floor ${viewRes.room_floor}`):"—"},
                    {l:t("تاريخ الدخول"),v:viewRes.check_in_date||"—"},
                    {l:t("تاريخ المغادرة"),v:viewRes.check_out_date||"—"},
                    {l:t("عدد الليالي"),v:String(viewRes.nights_count)},
                    {l:t("عدد الأشخاص"),v:String(viewRes.persons_count)},
                    {l:t("موظف الحجز"),v:viewRes.created_by_name??uname},
                  ].map(item=>(
                    <div key={item.l} style={{background:"#f8fafc",borderRadius:8,padding:"0.65rem 0.85rem"}}>
                      <p style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>{item.l}</p>
                      <p style={{fontWeight:700,fontSize:13}}>{item.v}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 1 — بيانات النزيل */}
              {viewTab===1&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.65rem"}}>
                  {[
                    {l:t("الاسم الكامل"),v:`${viewRes.guest_first_name} ${viewRes.guest_last_name}`.trim()},
                    {l:t("الرقم الوطني"),v:viewRes.guest_id_number||"—"},
                    {l:t("الهاتف"),v:viewRes.guest_phone||"—"},
                    {l:t("البريد الإلكتروني"),v:viewRes.guest_email||"—"},
                    {l:t("اسم الأب"),v:viewRes.guest_father_name||"—"},
                    {l:t("اسم الأم"),v:viewRes.guest_mother_name||"—"},
                    {l:t("تاريخ الميلاد"),v:viewRes.guest_dob||"—"},
                  ].map(item=>(
                    <div key={item.l} style={{background:"#f8fafc",borderRadius:8,padding:"0.65rem 0.85rem"}}>
                      <p style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>{item.l}</p>
                      <p style={{fontWeight:700,fontSize:13}}>{item.v}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2 — بيانات الحجز */}
              {viewTab===2&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.65rem"}}>
                  {[
                    {l:t("رقم الحجز"),v:viewRes.booking_number},
                    {l:t("الغرفة"),v:viewRes.room_number?(lang==="ar"?`غرفة ${viewRes.room_number} - الطابق ${viewRes.room_floor}`:`Room ${viewRes.room_number} - Floor ${viewRes.room_floor}`):"—"},
                    {l:t("تاريخ الدخول"),v:viewRes.check_in_date||"—"},
                    {l:t("تاريخ المغادرة"),v:viewRes.check_out_date||"—"},
                    {l:t("عدد الليالي"),v:String(viewRes.nights_count)},
                    {l:t("عدد الأشخاص"),v:String(viewRes.persons_count)},
                    {l:t("حالة الحجز"),v:STATUS_LABELS[viewRes.status]??viewRes.status},
                    {l:t("مصدر الحجز"),v:SOURCE_LABELS[viewRes.source]??viewRes.source},
                    {l:t("موظف الحجز"),v:viewRes.created_by_name??uname},
                    {l:t("تاريخ الإنشاء"),v:viewRes.created_at?.slice(0,10)??"—"},
                    {l:t("آخر تحديث"),v:viewRes.updated_at?.slice(0,10)??"—"},
                  ].map(item=>(
                    <div key={item.l} style={{background:"#f8fafc",borderRadius:8,padding:"0.65rem 0.85rem"}}>
                      <p style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>{item.l}</p>
                      <p style={{fontWeight:700,fontSize:13}}>{item.v}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3 — المبالغ */}
              {viewTab===3&&(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.65rem",marginBottom:"1rem"}}>
                    {[
                      {l:t("سعر الغرفة/الليلة"),v:`${viewRes.currency} ${Number(viewRes.room_price??0).toLocaleString("en-US")}`},
                      {l:t("عدد الليالي"),v:String(viewRes.nights_count)},
                      {l:t("الإجمالي"),v:`${viewRes.currency} ${Number(viewRes.total).toLocaleString("en-US")}`},
                      {l:t("المدفوع"),v:`${viewRes.currency} ${Number(viewRes.paid).toLocaleString("en-US")}`},
                      {l:t("المتبقي"),v:`${viewRes.currency} ${(Number(viewRes.total)-Number(viewRes.paid)).toLocaleString("en-US")}`,highlight:(Number(viewRes.total)-Number(viewRes.paid))>0},
                      {l:t("العملة"),v:viewRes.currency},
                    ].map(item=>(
                      <div key={item.l} style={{background:"#f8fafc",borderRadius:8,padding:"0.65rem 0.85rem"}}>
                        <p style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>{item.l}</p>
                        <p style={{fontWeight:700,fontSize:13,color:"highlight" in item&&item.highlight?"#b91c1c":"inherit"}}>{item.v}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>printAccountStatement(viewRes,hotelInfo)} className="ds-btn ds-btn-teal ds-btn-sm">{t("طباعة كشف الحساب")}</button>
                </div>
              )}

              {/* Tab 4 — الوثائق والمرافقون */}
              {viewTab===4&&(
                <div>
                  <p style={{fontWeight:800,marginBottom:"0.5rem"}}>{t("وثائق صاحب الحجز")}</p>
                  <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1rem"}}>
                    {viewRes.guest_doc_type&&<span style={{background:"#f0fdf4",color:"#15803d",border:"1px solid #bbf7d0",padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700}}>✓ {viewRes.guest_doc_type}</span>}
                    {viewRes.guest_doc_image&&<button onClick={()=>viewImg(viewRes.guest_doc_image)} className="ds-btn ds-btn-view ds-btn-sm">{t("عرض وثيقة النزيل")}</button>}
                    {viewRes.family_doc_type&&viewRes.family_doc_image&&<span style={{background:"#f0fdf4",color:"#15803d",border:"1px solid #bbf7d0",padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700}}>✓ {viewRes.family_doc_type}</span>}
                    {viewRes.family_doc_image&&<button onClick={()=>viewImg(viewRes.family_doc_image)} className="ds-btn ds-btn-view ds-btn-sm">{t("عرض إثبات القرابة")}</button>}
                    {!viewRes.guest_doc_type&&!viewRes.guest_doc_image&&<span style={{color:"var(--color-muted)",fontSize:13}}>{t("لا توجد وثائق مرفوعة.")}</span>}
                  </div>
                  {viewRes.has_companions?(
                    <div>
                      <p style={{fontWeight:800,marginBottom:"0.5rem"}}>{t("المرافقون")}</p>
                      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.65rem"}}>
                        <span style={{background:"#f8fafc",border:"1px solid var(--color-border)",borderRadius:20,padding:"3px 10px",fontSize:12}}>{t("نوع")}: {viewRes.companion_type}</span>
                        <span style={{background:"#f8fafc",border:"1px solid var(--color-border)",borderRadius:20,padding:"3px 10px",fontSize:12}}>{t("بالغون")}: {viewRes.companion_adults_count}</span>
                        {(viewRes.companion_children_count??0)>0&&<span style={{background:"#f8fafc",border:"1px solid var(--color-border)",borderRadius:20,padding:"3px 10px",fontSize:12}}>{t("أطفال")}: {viewRes.companion_children_count}</span>}
                      </div>
                      {(viewRes.companions??[]).length>0&&(
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead><tr style={{background:"#f8fafc"}}>
                            {["#",t("الاسم الكامل"),t("الرقم الوطني"),t("صلة القرابة")].map(h=>(
                              <th key={h} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,borderBottom:"1px solid var(--color-border)"}}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {(viewRes.companions??[]).map((c,i)=>(
                              <tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}>
                                <td style={{padding:"8px 10px"}}>{i+1}</td>
                                <td style={{padding:"8px 10px"}}>{c.first_name} {c.last_name}</td>
                                <td style={{padding:"8px 10px"}}>{c.id_number||"—"}</td>
                                <td style={{padding:"8px 10px"}}>{c.relation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ):(
                    <p style={{color:"var(--color-muted)",fontSize:13}}>{t("لا يوجد مرافقون لهذا الحجز.")}</p>
                  )}
                </div>
              )}

              {/* Tab 5 — الملاحظات */}
              {viewTab===5&&(
                <div style={{background:"#f8fafc",border:"1px dashed var(--color-border)",borderRadius:10,padding:"1rem",fontSize:13,color:"var(--color-muted)",lineHeight:1.8,minHeight:80}}>
                  {viewRes.notes||t("لا توجد ملاحظات على هذا الحجز.")}
                </div>
              )}

              {/* Tab 6 — رسوم الغرفة (فوليو) */}
              {viewTab===6&&(()=>{
                const charges = folioData.filter(c=>String(c.reservationId)===String(viewRes.id));
                const total   = charges.reduce((s,c)=>s+c.amount,0);
                const settled = charges.filter(c=>c.settled).reduce((s,c)=>s+c.amount,0);
                if(charges.length===0) return (
                  <div style={{textAlign:"center",padding:"2.5rem",color:"var(--color-muted)"}}>
                    <BookOpen size={36} style={{color:"#d1d5db",marginBottom:10}} />
                    <p style={{fontWeight:700}}>{t("لا توجد رسوم فوليو لهذا الحجز")}</p>
                    <p style={{fontSize:12,marginTop:4}}>{t("يمكنك إضافة رسوم من صفحة")} <a href="/manager/folio" style={{color:"#4f46e5",fontWeight:700}}>{t("فوليو الغرفة")}</a></p>
                  </div>
                );
                return (
                  <div>
                    <div style={{display:"flex",gap:"1rem",marginBottom:"0.85rem",flexWrap:"wrap"}}>
                      {[
                        {l:t("إجمالي الرسوم"),v:`${viewRes.currency} ${total.toLocaleString("en-US")}`,c:"#1e293b"},
                        {l:t("مسدد"),v:`${viewRes.currency} ${settled.toLocaleString("en-US")}`,c:"#16a34a"},
                        {l:t("غير مسدد"),v:`${viewRes.currency} ${(total-settled).toLocaleString("en-US")}`,c:total-settled>0?"#dc2626":"#16a34a"},
                      ].map(x=>(
                        <div key={x.l} style={{background:"#f8fafc",border:"1px solid var(--color-border)",borderRadius:8,padding:"0.5rem 0.85rem"}}>
                          <p style={{fontSize:11,color:"#94a3b8",marginBottom:2}}>{x.l}</p>
                          <p style={{fontWeight:900,fontSize:14,color:x.c}}>{x.v}</p>
                        </div>
                      ))}
                      <button onClick={()=>router.push("/manager/folio")} style={{marginRight:"auto",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:"0.45rem 1rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                        <BookOpen size={13}/> {t("فتح صفحة الفوليو")}
                      </button>
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr style={{background:"#f8fafc"}}>
                        {[t("النوع"),t("الوصف"),t("التاريخ"),t("المبلغ"),t("الحالة")].map(h=>(
                          <th key={h} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,borderBottom:"1px solid var(--color-border)"}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {charges.map(c=>(
                          <tr key={c.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                            <td style={{padding:"8px 10px",fontWeight:700}}>{c.type}</td>
                            <td style={{padding:"8px 10px",color:"var(--color-muted)"}}>{c.description||"—"}</td>
                            <td style={{padding:"8px 10px",color:"var(--color-muted)"}}>{c.date}</td>
                            <td style={{padding:"8px 10px",fontWeight:700}}>{c.currency||viewRes.currency} {c.amount.toLocaleString("en-US")}</td>
                            <td style={{padding:"8px 10px"}}>
                              <span style={{background:c.settled?"#dcfce7":"#fef3c7",color:c.settled?"#15803d":"#92400e",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700}}>
                                {c.settled?t("مسدد"):t("معلق")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={()=>setViewRes(null)}>{t("إغلاق")}</button>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <button onClick={()=>printResObj(viewRes,hotelInfo,uname)} className="ds-btn ds-btn-print">{t("طباعة")}</button>
                <button onClick={()=>{const r=viewRes;setViewRes(null);openEdit(r);}} className="ds-btn ds-btn-edit">{t("تعديل")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ ADD / EDIT MODAL ═════════════════════════ */}
      {open&&(
        <div className="ds-modal-backdrop" onClick={closeModal}>
          <div className="ds-modal-card wide" onClick={e=>e.stopPropagation()} style={{maxWidth:840}}>

            {/* ── Success screen ── */}
            {success?(
              <div style={{padding:"2rem",textAlign:"center"}}>
                <div style={{width:64,height:64,borderRadius:"50%",background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem",color:"#059669"}}><CheckCircle2 size={34} strokeWidth={1.8}/></div>
                <h2 style={{fontSize:"var(--text-xl)",fontWeight:900,color:"var(--color-heading)",marginBottom:"0.5rem"}}>
                  {editRes?t("تم تحديث الحجز بنجاح"):t("تم الحجز بنجاح")}
                </h2>
                <p style={{color:"var(--color-muted)",marginBottom:"1.5rem"}}>{t("تم تسجيل الحجز ويمكنك الآن طباعة معلومات الحجز للزبون.")}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"1.5rem",textAlign:"right"}}>
                  {[{label:t("رقم الحجز"),val:success.booking_number},{label:t("الاسم الكامل"),val:success.guest},{label:t("الغرفة"),val:success.room},{label:t("الإجمالي"),val:`${success.currency} ${success.total}`}].map(item=>(
                    <div key={item.label} style={{padding:"0.75rem 1rem",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)"}}>
                      <p style={{fontSize:"0.72rem",color:"var(--color-muted)",marginBottom:"0.25rem"}}>{item.label}</p>
                      <p style={{fontWeight:700,color:"var(--color-heading)"}}>{item.val||"—"}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:"0.5rem",justifyContent:"center",flexWrap:"wrap"}}>
                  <button className="ds-btn ds-btn-neutral" onClick={closeModal} style={{display:"flex",alignItems:"center",gap:5}}><Check size={14} strokeWidth={2.5}/> {t("إغلاق")}</button>
                  <button className="ds-btn ds-btn-print" onClick={()=>{
                    const room=rooms.find(r=>String(r.id)===booking.room_id);
                    const fakeR:Res={
                      id:editRes?.id??0, booking_number:success.booking_number,
                      guest_id_number:guest.id_number, guest_first_name:guest.first_name,
                      guest_last_name:guest.last_name, guest_father_name:guest.father_name,
                      guest_mother_name:guest.mother_name, guest_dob:guest.dob,
                      guest_phone:guest.phone, guest_email:guest.no_email?"":guest.email,
                      room:room?.id??null, room_number:room?.number??"", room_floor:room?.floor??0,
                      room_price:booking.room_price,
                      check_in_date:booking.check_in, check_out_date:booking.check_out,
                      nights_count:Number(booking.nights), persons_count:Number(booking.persons_count),
                      has_companions:comp.has_companions, companion_type:comp.type,
                      companion_adults_count:comp.adults_count, companion_children_count:comp.children_count,
                      companion_children_relation:comp.children_relation, companions:comp.list,
                      companion_docs:docs.companion_docs,
                      guest_doc_type:docs.guest_doc_type, guest_doc_image:docs.guest_doc_image,
                      family_doc_type:docs.family_doc_type, family_doc_image:docs.family_doc_image,
                      total:booking.total, paid:Number(booking.paid), currency:booking.currency,
                      status:booking.status, source:booking.source, notes:booking.notes,
                      updated_at:"", created_at:"", created_by_name:uname,
                    };
                    printResObj(fakeR,hotelInfo,uname);
                  }} style={{display:"flex",alignItems:"center",gap:5}}>
                    <Printer size={14} strokeWidth={2} /> {t("طباعة ملخص الحجز للزبون")}
                  </button>
                </div>
              </div>
            ):(
              <>
                {/* Header */}
                <div className="ds-modal-head">
                  <h2>{editRes?`${t("تعديل الحجز")} — ${editRes.booking_number}`:t("إضافة حجز")}</h2>
                  <button className="icon-btn" onClick={closeModal} aria-label="إغلاق"><X size={16} strokeWidth={2.5}/></button>
                </div>

                {/* Step tabs */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.5rem",padding:"0.75rem 1.5rem 0"}}>
                  {STEPS.map(s=>(
                    <button key={s.n} onClick={()=>setStep(s.n)} style={{
                      padding:"0.5rem 0.25rem",borderRadius:"var(--radius-md)",cursor:"pointer",fontWeight:700,
                      fontSize:"var(--text-sm)",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4rem",
                      border:step===s.n?"none":"1px solid var(--color-border)",
                      background:step===s.n?"linear-gradient(135deg,#2563eb,#1d4ed8)":"#fff",
                      color:step===s.n?"#fff":"var(--color-text)",
                    }}>
                      <span style={{width:22,height:22,borderRadius:"50%",fontSize:11,fontWeight:900,display:"inline-flex",alignItems:"center",justifyContent:"center",
                        background:step===s.n?"rgba(255,255,255,0.25)":"var(--color-primary-soft)",color:step===s.n?"#fff":"var(--color-primary)"}}>
                        {s.n}
                      </span>
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="ds-modal-body" style={{maxHeight:"62vh",overflowY:"auto"}}>
                  {formErr&&<p style={{color:"var(--color-danger)",marginBottom:"0.75rem",fontSize:"var(--text-sm)"}}>{formErr}</p>}

                  {/* ══ STEP 1 ══ */}
                  {step===1&&(
                    <div>
                      <p style={{fontWeight:800,marginBottom:"0.85rem",color:"var(--color-heading)"}}>{t("بيانات النزيل")}</p>
                      <hr style={{border:"none",borderTop:"1px solid var(--color-border)",marginBottom:"1rem"}} />
                      {guestAutoFilled&&(
                        <div style={{marginBottom:"0.85rem",padding:"0.55rem 0.9rem",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,display:"flex",alignItems:"center",gap:7,fontSize:13,fontWeight:700,color:"#15803d"}}>
                          <CheckCircle2 size={14} strokeWidth={2.5} /> {t("تم استيراد بيانات النزيل من قاعدة النزلاء تلقائياً — تحقق من الحقول وعدّل إن لزم")}
                        </div>
                      )}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                        <div className="field">
                          <label className="field-label"><FL Icon={Hash} label={t("الرقم الوطني")} /></label>
                          <input className="input" value={guest.id_number} onChange={e=>setGuest(p=>({...p,id_number:e.target.value}))} onBlur={e=>lookupFromGuestDB("id",e.target.value)} placeholder={t("أدخل الرقم لاستيراد بيانات النزيل")} />
                        </div>
                        <div className="field">
                          <label className="field-label"><FL Icon={User} label={t("الاسم الأول")} /></label>
                          <input className="input" value={guest.first_name} onChange={e=>setGuest(p=>({...p,first_name:e.target.value}))} />
                        </div>
                        <div className="field">
                          <label className="field-label"><FL Icon={User} label={t("الكنية")} /></label>
                          <input className="input" value={guest.last_name} onChange={e=>setGuest(p=>({...p,last_name:e.target.value}))} />
                        </div>
                        <div className="field">
                          <label className="field-label"><FL Icon={User} label={t("اسم الأب")} /></label>
                          <input className="input" value={guest.father_name} onChange={e=>setGuest(p=>({...p,father_name:e.target.value}))} />
                        </div>
                        <div className="field">
                          <label className="field-label"><FL Icon={User} label={t("اسم الأم")} /></label>
                          <input className="input" value={guest.mother_name} onChange={e=>setGuest(p=>({...p,mother_name:e.target.value}))} />
                        </div>
                        <div className="field">
                          <label className="field-label"><FL Icon={Globe} label={t("الجنسية")} /></label>
                          <input className="input" value={guest.nationality} onChange={e=>setGuest(p=>({...p,nationality:e.target.value}))} placeholder={t("مثال: سعودي، يمني...")} />
                        </div>
                        <div className="field">
                          <label className="field-label"><FL Icon={Calendar} label={t("تاريخ الميلاد")} /></label>
                          <input className="input" type="date" value={guest.dob} onChange={e=>setGuest(p=>({...p,dob:e.target.value}))} />
                        </div>
                        <div className="field">
                          <label className="field-label"><FL Icon={Phone} label={t("هاتف النزيل")} /></label>
                          <input className="input" value={guest.phone} onChange={e=>setGuest(p=>({...p,phone:e.target.value}))} onBlur={e=>lookupFromGuestDB("phone",e.target.value)} />
                        </div>
                        <div className="field" style={{gridColumn:"span 3"}}>
                          <label className="field-label"><FL Icon={Mail} label={t("البريد الإلكتروني")} /></label>
                          <input className="input" type="email" value={guest.email} disabled={guest.no_email} onChange={e=>setGuest(p=>({...p,email:e.target.value}))} placeholder={guest.no_email?t("لا يوجد بريد إلكتروني"):""} />
                        </div>
                        <div className="field" style={{display:"flex",alignItems:"flex-end",paddingBottom:"0.35rem"}}>
                          <label style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"var(--text-sm)",cursor:"pointer",fontWeight:700,color:"var(--color-muted)"}}>
                            <input type="checkbox" checked={guest.no_email} onChange={e=>setGuest(p=>({...p,no_email:e.target.checked}))} style={{accentColor:"var(--color-primary)",width:15,height:15}} />
                            {t("لا يوجد إيميل")}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══ STEP 2 ══ */}
                  {step===2&&(
                    <div>
                      <p style={{fontWeight:800,marginBottom:"0.85rem",color:"var(--color-heading)"}}>{t("المرافقون")}</p>
                      <hr style={{border:"none",borderTop:"1px solid var(--color-border)",marginBottom:"1rem"}} />
                      <div style={{padding:"0.85rem",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)"}}>
                        <label style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"var(--text-sm)",cursor:"pointer",fontWeight:700,marginBottom:comp.has_companions?"1rem":0}}>
                          <input type="checkbox" checked={comp.has_companions} onChange={e=>setComp(p=>({...p,has_companions:e.target.checked}))} style={{accentColor:"var(--color-primary)",width:15,height:15}} />
                          <Users size={14} strokeWidth={2} color="#4f46e5" /> {t("يوجد مرافقون")}
                        </label>
                        {comp.has_companions&&(<>
                          <div style={{display:"grid",gridTemplateColumns:comp.type==="عائلتي"?"1fr 1fr 1fr 1fr":"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                            <div className="field"><label className="field-label"><FL Icon={Users} label={t("نوع المرافقين")} /></label>
                              <select className="select" value={comp.type} onChange={e=>setComp(p=>({...p,type:e.target.value}))}>
                                <option value="مرافقون">{t("مرافقون")}</option><option value="عائلتي">{t("عائلتي")}</option>
                              </select>
                            </div>
                            <div className="field"><label className="field-label"><FL Icon={Users} label={t("عدد البالغين المرافقين")} /></label>
                              <select className="select" value={comp.adults_count} onChange={e=>setComp(p=>({...p,adults_count:Number(e.target.value)}))}>
                                {[0,1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            <div className="field"><label className="field-label"><FL Icon={Users} label={t("عدد الأطفال")} /></label>
                              <select className="select" value={comp.children_count} onChange={e=>setComp(p=>({...p,children_count:Number(e.target.value)}))}>
                                {[0,1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            {comp.type==="عائلتي"&&(
                              <div className="field"><label className="field-label"><FL Icon={Users} label={t("صلة قرابة الأطفال")} /></label>
                                <select className="select" value={comp.children_relation} onChange={e=>setComp(p=>({...p,children_relation:e.target.value}))}>
                                  {["ابن","ابنة","أخ","أخت"].map(r=><option key={r} value={r}>{r}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                          {comp.list.map((c,i)=>(
                            <div key={i} style={{border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)",padding:"0.85rem",marginBottom:"0.75rem"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                                <button type="button" onClick={()=>setComp(p=>({...p,adults_count:p.adults_count-1}))}
                                  style={{width:28,height:28,borderRadius:"50%",border:"1px solid #fecaca",background:"#fef2f2",cursor:"pointer",fontWeight:900,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#dc2626"}}>
                                  −
                                </button>
                                <p style={{fontWeight:800,fontSize:"var(--text-sm)",color:"var(--color-heading)"}}>
                                  <Users size={13} strokeWidth={2} color="#4f46e5" style={{marginLeft:5,verticalAlign:"middle"}} />
                                  {lang==="ar"?`مرافق بالغ ${i+1}`:`Adult Companion ${i+1}`}
                                </p>
                              </div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0.65rem",marginBottom:"0.65rem"}}>
                                {(["id_number","first_name","last_name","father_name"] as (keyof Companion)[]).map(k=>{
                                  const labels:Record<string,string>={id_number:t("الرقم الوطني"),first_name:t("الاسم"),last_name:t("الكنية"),father_name:t("اسم الأب")};
                                  const icons:Record<string,React.ElementType>={id_number:Hash,first_name:User,last_name:User,father_name:User};
                                  return <div key={k} className="field"><label className="field-label"><FL Icon={icons[k]} label={labels[k]} /></label><input className="input" value={c[k]} onChange={e=>{const l=[...comp.list];l[i]={...l[i],[k]:e.target.value};setComp(p=>({...p,list:l}));}} /></div>;
                                })}
                              </div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0.65rem"}}>
                                <div className="field"><label className="field-label"><FL Icon={User} label={t("اسم الأم")} /></label><input className="input" value={c.mother_name} onChange={e=>{const l=[...comp.list];l[i]={...l[i],mother_name:e.target.value};setComp(p=>({...p,list:l}));}} /></div>
                                <div className="field"><label className="field-label"><FL Icon={Calendar} label={t("المواليد")} /></label><input className="input" type="date" value={c.dob} onChange={e=>{const l=[...comp.list];l[i]={...l[i],dob:e.target.value};setComp(p=>({...p,list:l}));}} /></div>
                                <div className="field" style={{gridColumn:"span 2"}}>
                                  <label className="field-label"><FL Icon={Users} label={t("صلة القرابة")} /></label>
                                  <select className="select" value={c.relation} onChange={e=>{const l=[...comp.list];l[i]={...l[i],relation:e.target.value};setComp(p=>({...p,list:l}));}}>
                                    {RELATION_OPTS.map(r=><option key={r} value={r}>{r}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>)}
                      </div>
                    </div>
                  )}

                  {/* ══ STEP 3 ══ */}
                  {step===3&&(
                    <div>
                      <p style={{fontWeight:800,marginBottom:"0.85rem",color:"var(--color-heading)"}}>{t("الوثائق")}</p>
                      <hr style={{border:"none",borderTop:"1px solid var(--color-border)",marginBottom:"1rem"}} />
                      <input ref={guestDocRef} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={onGuestDoc} />
                      <div style={{padding:"0.85rem",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)",marginBottom:"0.85rem"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.65rem"}}>
                          <span style={{background:docs.guest_doc_name?"#1e293b":"#f3f4f6",color:docs.guest_doc_name?"#fff":"var(--color-muted)",fontSize:"0.7rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:20}}>
                            {docs.guest_doc_name||t("لم يتم اختيار ملف")}
                          </span>
                          <p style={{fontWeight:800,fontSize:"var(--text-sm)"}}>{t("وثيقة صاحب الحجز")}</p>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.65rem"}}>
                          <div className="field"><label className="field-label"><FL Icon={FileText} label={t("نوع الوثيقة")} /></label>
                            <select className="select" value={docs.guest_doc_type} onChange={e=>setDocs(p=>({...p,guest_doc_type:e.target.value}))}>
                              {DOC_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div className="field"><label className="field-label"><FL Icon={Upload} label={t("رفع صورة الوثيقة")} /></label>
                            <button type="button" className="ds-btn ds-btn-neutral ds-btn-sm" style={{width:"100%",justifyContent:"center",display:"flex",alignItems:"center",gap:5}} onClick={()=>guestDocRef.current?.click()}>
                              <Upload size={13} strokeWidth={2} /> {docs.guest_doc_name||t("اختيار ملف")}
                            </button>
                          </div>
                        </div>
                        {docs.guest_doc_image&&(
                          <div style={{display:"flex",gap:"0.5rem"}}>
                            <button type="button" className="ds-btn ds-btn-view ds-btn-sm" onClick={()=>viewImg(docs.guest_doc_image)}>
                              <Eye size={13} strokeWidth={2} /> {t("عرض الوثيقة")}
                            </button>
                          </div>
                        )}
                      </div>
                      {comp.has_companions&&comp.list.length>0&&(
                        <div style={{padding:"0.85rem",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)",marginBottom:"0.85rem"}}>
                          <p style={{fontWeight:800,fontSize:"var(--text-sm)",marginBottom:"0.75rem"}}>{t("وثائق المرافقين البالغين")}</p>
                          {comp.list.map((c,i)=>{
                            const cd=docs.companion_docs[i];
                            return (
                              <div key={i} style={{border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)",padding:"0.75rem",marginBottom:"0.65rem"}}>
                                <input ref={el=>{compDocRefs.current[i]=el;}} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>onCompDoc(i,e)} />
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.65rem"}}>
                                  <span style={{background:cd?.doc_name?"#1e293b":"#f3f4f6",color:cd?.doc_name?"#fff":"var(--color-muted)",fontSize:"0.7rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:20}}>
                                    {cd?.doc_name||t("لم يتم اختيار ملف")}
                                  </span>
                                  <div style={{textAlign:"right"}}>
                                    <strong style={{fontSize:"var(--text-sm)"}}>{c.first_name} {c.last_name}</strong>
                                    <p style={{fontSize:"0.72rem",color:"var(--color-muted)"}}>{c.relation}</p>
                                  </div>
                                </div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.65rem"}}>
                                  <div className="field"><label className="field-label"><FL Icon={FileText} label={t("نوع وثيقة المرافق")} /></label>
                                    <select className="select" value={cd?.doc_type??"هوية شخصية"} onChange={e=>{const a=[...docs.companion_docs];a[i]={...a[i],doc_type:e.target.value};setDocs(p=>({...p,companion_docs:a}));}}>
                                      {DOC_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
                                    </select>
                                  </div>
                                  <div className="field"><label className="field-label"><FL Icon={Upload} label={t("رفع وثيقة المرافق")} /></label>
                                    <button type="button" className="ds-btn ds-btn-neutral ds-btn-sm" style={{width:"100%",justifyContent:"center",display:"flex",alignItems:"center",gap:5}} onClick={()=>compDocRefs.current[i]?.click()}>
                                      <Upload size={13} strokeWidth={2} /> {cd?.doc_name||t("اختيار ملف")}
                                    </button>
                                  </div>
                                </div>
                                {cd?.doc_image&&(
                                  <button type="button" className="ds-btn ds-btn-view ds-btn-sm" onClick={()=>viewImg(cd?.doc_image??"")}>
                                    <Eye size={13} strokeWidth={2} /> {t("عرض الوثيقة")}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <input ref={familyDocRef} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={onFamilyDoc} />
                      <div style={{padding:"0.85rem",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                          <span style={{background:"#f3f4f6",color:"var(--color-muted)",fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:20}}>{t("اختياري")}</span>
                          <p style={{fontWeight:800,fontSize:"var(--text-sm)"}}>{t("دفتر عائلة أو إثبات قرابة")}</p>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.65rem"}}>
                          <div className="field"><label className="field-label"><FL Icon={FileText} label={t("نوع إثبات القرابة")} /></label>
                            <select className="select" value={docs.family_doc_type} onChange={e=>setDocs(p=>({...p,family_doc_type:e.target.value}))}>
                              {FAMILY_DOCS.map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div className="field"><label className="field-label"><FL Icon={Upload} label={t("رفع دفتر العائلة")} /></label>
                            <button type="button" className="ds-btn ds-btn-neutral ds-btn-sm" style={{width:"100%",justifyContent:"center",display:"flex",alignItems:"center",gap:5}} onClick={()=>familyDocRef.current?.click()}>
                              <Upload size={13} strokeWidth={2} /> {docs.family_doc_name||t("اختيار ملف")}
                            </button>
                          </div>
                        </div>
                        {docs.family_doc_image&&(
                          <div style={{display:"flex",gap:"0.5rem"}}>
                            <button type="button" className="ds-btn ds-btn-view ds-btn-sm" onClick={()=>viewImg(docs.family_doc_image)}>
                              <Eye size={13} strokeWidth={2} /> {t("عرض المستند")}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ══ STEP 4 ══ */}
                  {step===4&&(
                    <div>
                      <p style={{fontWeight:800,marginBottom:"0.85rem",color:"var(--color-heading)"}}>{t("بيانات الحجز")}</p>
                      <hr style={{border:"none",borderTop:"1px solid var(--color-border)",marginBottom:"1rem"}} />
                      <div style={{padding:"0.75rem 1rem",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{width:38,height:38,borderRadius:"var(--radius-md)",background:"#e0e7ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#4f46e5"}}>{initials}</div>
                        <div style={{textAlign:"right"}}>
                          <p style={{fontSize:"0.72rem",color:"var(--color-muted)"}}>{t("موظف الحجز")}</p>
                          <p style={{fontWeight:800,fontSize:"var(--text-sm)"}}>{uname}</p>
                          <p style={{fontSize:"0.72rem",color:"var(--color-muted)"}}>{t("مدير الفندق - إدارة الفندق")}</p>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                        <div className="field"><label className="field-label"><FL Icon={Hash} label={t("رقم الحجز")} /></label>
                          <input className="input" value={booking.booking_number} onChange={e=>setBooking(p=>({...p,booking_number:e.target.value}))} />
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={Home} label={t("الغرفة")} /></label>
                          <select className="select" value={booking.room_id} onChange={e=>setBooking(p=>({...p,room_id:e.target.value}))}>
                            <option value="">{lang==="ar"?"— اختر غرفة —":"— Select a room —"}</option>
                            {activeRooms.map(r=>(
                              <option key={r.id} value={r.id}>{lang==="ar"?`غرفة ${r.number} - الطابق ${r.floor}`:`Room ${r.number} - Floor ${r.floor}`} - {r.currency} {Number(r.price).toLocaleString("en-US")}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={Users} label={t("عدد الأشخاص")} /></label>
                          <input className="input" type="number" min="1" value={booking.persons_count} onChange={e=>setBooking(p=>({...p,persons_count:Number(e.target.value)}))} />
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={Calendar} label={t("تاريخ الدخول")} /></label>
                          <input className="input" type="date" value={booking.check_in} onChange={e=>setBooking(p=>({...p,check_in:e.target.value}))} />
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                        <div className="field"><label className="field-label"><FL Icon={Moon} label={t("عدد الليالي")} /></label>
                          <input className="input" type="number" min="1" value={booking.nights} onChange={e=>setBooking(p=>({...p,nights:Number(e.target.value)}))} />
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={Calendar} label={t("تاريخ المغادرة")} /></label>
                          <input className="input" type="date" value={booking.check_out} readOnly style={{background:"var(--color-surface)"}} />
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={Banknote} label={t("سعر الغرفة / الليلة")} /></label>
                          <input className="input" value={booking.room_price} readOnly style={{background:"var(--color-surface)"}} />
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={Banknote} label={t("الإجمالي (محسوب تلقائياً)")} /></label>
                          <input className="input" value={booking.total} readOnly style={{background:"var(--color-surface)",fontWeight:800,color:"#1e293b"}} />
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                        <div className="field"><label className="field-label"><FL Icon={CreditCard} label={t("المبلغ المدفوع")} /></label>
                          <input className="input" type="number" min="0" value={booking.paid} onChange={e=>setBooking(p=>({...p,paid:Number(e.target.value)}))} />
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={CreditCard} label={t("طريقة الدفع")} /></label>
                          <select className="select" value={booking.payment_method} onChange={e=>setBooking(p=>({...p,payment_method:e.target.value as TPayMethod}))}>
                            <option value="cash">{t("نقدي")}</option>
                            <option value="electronic">{t("إلكتروني")}</option>
                            <option value="room_account">{t("على حساب الغرفة")}</option>
                          </select>
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={BookOpen} label={t("حالة الحجز")} /></label>
                          <select className="select" value={booking.status} onChange={e=>setBooking(p=>({...p,status:e.target.value as ResStatus}))}>
                            <option value="pending">{t("قيد الانتظار")}</option>
                            <option value="confirmed">{t("مؤكد")}</option>
                            <option value="checked_in">{t("مقيم الآن")}</option>
                            <option value="checked_out">{t("مغادر")}</option>
                            <option value="cancelled">{t("ملغي")}</option>
                            <option value="no_show">{t("لم يحضر")}</option>
                          </select>
                        </div>
                        <div className="field"><label className="field-label"><FL Icon={Radio} label={t("مصدر الحجز")} /></label>
                          <select className="select" value={booking.source} onChange={e=>setBooking(p=>({...p,source:e.target.value as ResSource}))}>
                            <option value="direct">{t("مباشر")}</option>
                            <option value="phone">{t("هاتف")}</option>
                            <option value="whatsapp">{t("واتساب")}</option>
                            <option value="online">{t("حجز إلكتروني")}</option>
                            <option value="website">{t("موقع إلكتروني")}</option>
                            <option value="ota">{t("منصة حجز (OTA)")}</option>
                            <option value="other">{t("أخرى")}</option>
                          </select>
                        </div>
                      </div>
                      <div style={{padding:"0.55rem 0.85rem",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"var(--radius-md)",marginBottom:"0.75rem",display:"flex",alignItems:"center",gap:7}}>
                        <Banknote size={14} strokeWidth={2} color="#2563eb" />
                        <p style={{fontSize:"0.75rem",color:"#1d4ed8",fontWeight:600}}>
                          {t("السعر مأخوذ من سعر الغرفة تلقائياً — إجمالي = سعر الغرفة × عدد الليالي")}
                        </p>
                      </div>
                      <div className="field">
                        <label className="field-label"><FL Icon={FileText} label={t("ملاحظات")} /></label>
                        <textarea className="input" rows={2} value={booking.notes} onChange={e=>setBooking(p=>({...p,notes:e.target.value}))} style={{resize:"vertical"}} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="ds-modal-foot">
                  <button type="button" className="ds-btn ds-btn-neutral" onClick={closeModal} style={{display:"flex",alignItems:"center",gap:5}}><XCircle size={14} strokeWidth={2}/> {t("إلغاء")}</button>
                  <div style={{display:"flex",gap:"0.5rem"}}>
                    {step>1&&(
                      <button type="button" style={{background:"#374151",color:"#fff",padding:"0.5rem 1rem",borderRadius:"var(--radius-md)",border:"none",cursor:"pointer",fontWeight:700,fontSize:"var(--text-sm)"}} onClick={()=>setStep(p=>p-1)}>
                        {lang==="ar"?"← السابق":"← Previous"}
                      </button>
                    )}
                    {step<4?(
                      <button type="button" className="ds-btn ds-btn-primary" onClick={()=>setStep(p=>p+1)}>{lang==="ar"?"التالي →":"Next →"}</button>
                    ):(
                      <button type="button" className="ds-btn ds-btn-primary" onClick={handleSave} disabled={saving}
                        style={{display:"flex",alignItems:"center",gap:5}}>
                        <Check size={14} strokeWidth={2.5}/> {saving?t("جارٍ الحفظ..."):editRes?t("تحديث الحجز"):t("حفظ الحجز")}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
