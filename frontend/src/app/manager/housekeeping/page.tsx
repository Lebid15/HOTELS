"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoomServicesTabs from "../RoomServicesTabs";
import type { LucideIcon } from "lucide-react";
import { Sparkles, CheckCircle2, Home, AlertTriangle, Search, Building2, Users, Clock, ClipboardList, User, Wrench, BedDouble, UserCheck, X } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";

interface RoomItem {
  id:number; hotel:number; number:string; floor:number; type:string;
  capacity:number; status:string; notes:string; updated_at:string;
}
interface Res {
  id:number; room:number|null; status:string;
  guest_first_name:string; guest_last_name:string;
  booking_number:string; check_in_date:string; check_out_date:string; updated_at:string;
}

/* ─── Status config ──────────────────────────────────────── */
const STATUS_PRIORITY:Record<string,number> = {
  cleaning:0, maintenance:1, out_of_service:2, occupied:3, available:4, archived:9,
};
// STATUS_LABELS moved inside component (uses t())
const STATUS_BADGE:Record<string,React.CSSProperties> = {
  cleaning:     {background:"#f97316",color:"#fff",border:"none"},
  available:    {background:"#16a34a",color:"#fff",border:"none"},
  occupied:     {background:"#2563eb",color:"#fff",border:"none"},
  maintenance:  {background:"#dc2626",color:"#fff",border:"none"},
  out_of_service:{background:"#64748b",color:"#fff",border:"none"},
  archived:     {background:"#94a3b8",color:"#fff",border:"none"},
};
const STATUS_CARD_BG:Record<string,string> = {
  cleaning:     "linear-gradient(135deg,#fffbeb 0%,#fef9c3 100%)",
  available:    "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  occupied:     "linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)",
  maintenance:  "linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)",
  out_of_service:"linear-gradient(135deg,#fff1f2 0%,#fee2e2 100%)",
  archived:     "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)",
};
const STATUS_STRIP:Record<string,string> = {
  cleaning:"#f59e0b", available:"#22c55e", occupied:"#2563eb",
  maintenance:"#ea580c", out_of_service:"#dc2626", archived:"#94a3b8",
};
const STATUS_BORDER:Record<string,string> = {
  cleaning:"#fde68a", available:"#bbf7d0", occupied:"#bfdbfe",
  maintenance:"#fed7aa", out_of_service:"#fecaca", archived:"#e2e8f0",
};

/* ─── Sort helpers ───────────────────────────────────────── */
function roomNum(s:string){return parseInt((s||"").replace(/\D/g,"")||"0");}
function sortRooms(list:RoomItem[]):RoomItem[]{
  return [...list].sort((a,b)=>{
    const pa=STATUS_PRIORITY[a.status]??9, pb=STATUS_PRIORITY[b.status]??9;
    if(pa!==pb) return pa-pb;
    if(a.floor!==b.floor) return a.floor-b.floor;
    return roomNum(a.number)-roomNum(b.number);
  });
}
function fmtDate(d:string){
  try{return new Date(d).toLocaleString("ar-u-nu-latn",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return d||"—";}
}

/* ══════════════════════════════════════════════════════════ */
export default function HousekeepingPage() {
  const { t, lang } = useLang();
  const STATUS_LABELS:Record<string,string> = {
    cleaning:t("قيد التنظيف"), available:t("متاحة"), occupied:t("مشغولة"),
    maintenance:t("صيانة"), out_of_service:t("خارج الخدمة"), archived:t("مؤرشفة"),
  };
  const router  = useRouter();
  const hotelId = typeof window!=="undefined"?(localStorage.getItem("hotel_id")??""):"";

  const [rooms,   setRooms]   = useState<RoomItem[]>([]);
  const [resData, setResData] = useState<Res[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [fStatus, setFStatus] = useState("cleaning");
  const [fFloor,  setFFloor]  = useState("all");
  const [toast,   setToast]   = useState("");
  const [actRoom, setActRoom] = useState<number|null>(null);
  const todayStr = new Date().toISOString().slice(0,10);

  function navToGuests(search: string) {
    try { localStorage.setItem(`fandqi.nav.guests.${hotelId}`, JSON.stringify({search, ts: Date.now()})); } catch {}
    router.push("/manager/guests");
  }

  function showToast(m:string){setToast(m);setTimeout(()=>setToast(""),4500);}

  /* ── Fetch ── */
  function fetchAll(){
    if(!hotelId){setLoading(false);return;}
    setLoading(true);
    Promise.all([
      fetch(`${API}/rooms/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()),
      fetch(`${API}/reservations/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()),
    ]).then(([rd,resd])=>{
      setRooms(Array.isArray(rd)?rd:rd.results??[]);
      setResData(Array.isArray(resd)?resd:resd.results??[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }
  useEffect(()=>{
    const execute = async () => { await fetchAll(); };
    execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  /* ── Last reservation per room ── */
  const lastResByRoom = new Map<number,Res>();
  [...resData]
    .filter(r=>r.room!==null&&["checked_out","checked_in"].includes(r.status))
    .sort((a,b)=>(b.updated_at||"").localeCompare(a.updated_at||""))
    .forEach(r=>{
      if(r.room!==null&&!lastResByRoom.has(r.room)) lastResByRoom.set(r.room,r);
    });

  /* ── Derived lists ── */
  const nonArchived = rooms.filter(r=>r.status!=="archived");
  const floors = [...new Set(nonArchived.map(r=>r.floor))].sort((a,b)=>a-b);

  const filtered = sortRooms(nonArchived.filter(r=>{
    if(fStatus!=="all"&&r.status!==fStatus) return false;
    if(fFloor!=="all"&&String(r.floor)!==fFloor) return false;
    if(search){
      const q=search.toLowerCase();
      const lr=lastResByRoom.get(r.id);
      const guest=lr?`${lr.guest_first_name} ${lr.guest_last_name}`.toLowerCase():"";
      const bk=lr?.booking_number?.toLowerCase()??"";
      if(!( r.number.toLowerCase().includes(q)||String(r.floor).includes(q)||
            (r.type||"").toLowerCase().includes(q)||(STATUS_LABELS[r.status]??"").includes(q)||
            (r.notes||"").toLowerCase().includes(q)||guest.includes(q)||bk.includes(q) ))
        return false;
    }
    return true;
  }));

  /* ── Stats ── */
  const cleaningCount     = nonArchived.filter(r=>r.status==="cleaning").length;
  const availableCount    = nonArchived.filter(r=>r.status==="available").length;
  const occupiedCount     = nonArchived.filter(r=>r.status==="occupied").length;
  const maintenanceCount  = nonArchived.filter(r=>r.status==="maintenance").length;
  const outOfServiceCount = nonArchived.filter(r=>r.status==="out_of_service").length;
  const attentionCount    = maintenanceCount + outOfServiceCount;
  const cleanedToday      = nonArchived.filter(r=>r.status==="available"&&r.updated_at?.slice(0,10)===todayStr).length;
  const arrivalRoomIds    = new Set(resData.filter(r=>r.check_in_date===todayStr&&["pending","confirmed"].includes(r.status)).map(r=>r.room).filter((x):x is number=>x!==null));
  const arrivalCount      = nonArchived.filter(r=>arrivalRoomIds.has(r.id)).length;

  /* ── Actions ── */
  async function handleCleaningDone(room:RoomItem){
    if(room.status!=="cleaning"){showToast(t("لا يمكن تأكيد التنظيف إلا لغرفة حالتها تنظيف."));return;}
    setActRoom(room.id);
    try{
      const res=await fetch(`${API}/rooms/${room.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"available"})});
      if(res.ok){showToast(t("تم تأكيد تنظيف الغرفة وأصبحت متاحة للحجز."));fetchAll();}
      else showToast(t("حدث خطأ أثناء تحديث الغرفة."));
    }catch{showToast(t("حدث خطأ أثناء تحديث الغرفة."));}
    setActRoom(null);
  }

  async function handleSendMaintenance(room:RoomItem){
    if(room.status==="maintenance") return;
    setActRoom(room.id);
    try{
      await fetch(`${API}/rooms/${room.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"maintenance"})});
      const lr=lastResByRoom.get(room.id);
      const desc=lang==="ar"?`تم إرسال غرفة ${room.number} إلى الصيانة من قِبل فريق التنظيف.${lr?` آخر نزيل: ${lr.guest_first_name} ${lr.guest_last_name} (${lr.booking_number}).`:""}`:`Room ${room.number} sent to maintenance by the housekeeping team.${lr?` Last guest: ${lr.guest_first_name} ${lr.guest_last_name} (${lr.booking_number}).`:""}`;
      try{
        await fetch(`${API}/maintenance/`,{method:"POST",headers:apiHJ(),body:JSON.stringify({
          hotel:Number(hotelId),room:room.id,source:"housekeeping",
          issue_type:"cleaning_damage",priority:"medium",description:desc,status:"pending",
        })});
      }catch{/* endpoint may not exist yet */}
      showToast(t("تم تحويل الغرفة إلى الصيانة."));
      fetchAll();
    }catch{showToast(t("حدث خطأ أثناء تحديث الغرفة."));}
    setActRoom(null);
  }

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="ds-page">
      <RoomServicesTabs />

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:80,right:24,zIndex:9999,background:"#1e293b",color:"#fff",
          padding:"0.75rem 1.25rem",borderRadius:12,fontSize:13,fontWeight:700,maxWidth:420,
          boxShadow:"0 4px 20px rgba(0,0,0,0.2)",lineHeight:1.5}}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.65rem",marginBottom:"0.3rem"}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#22c55e,#16a34a)",
            display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>
            <Sparkles size={20} strokeWidth={1.8} />
          </div>
          <h1 style={{fontSize:"var(--text-2xl)",fontWeight:900,color:"var(--color-heading)"}}>{t("التنظيف")}</h1>
        </div>
        <p style={{fontSize:13,color:"var(--color-muted)",paddingRight:"0.25rem"}}>
          {t("بعد تسجيل المغادرة تتحول الغرفة تلقائيًا إلى تنظيف. عند إنهاء الترتيب والتنظيف اضغط")} <strong>{t("تم التنظيف")}</strong> {t("لتعود الغرفة متاحة للحجز.")}
        </p>
      </div>

      {/* ── KPI Row 1: Status filters ──────────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"0.75rem"}}>
        {([
          {label:t("قيد التنظيف"),  value:cleaningCount,  sub:t("تحتاج تجهيزاً"),          Icon:Sparkles      as LucideIcon, grad:"linear-gradient(135deg,#f59e0b,#d97706)", active:fStatus==="cleaning",                              onClick:()=>setFStatus("cleaning")},
          {label:t("متاحة"),         value:availableCount, sub:t("جاهزة للحجز"),            Icon:CheckCircle2  as LucideIcon, grad:"linear-gradient(135deg,#22c55e,#16a34a)", active:fStatus==="available",                             onClick:()=>setFStatus("available")},
          {label:t("مشغولة"),        value:occupiedCount,  sub:t("إقامة حالية"),            Icon:Home          as LucideIcon, grad:"linear-gradient(135deg,#2563eb,#1d4ed8)", active:fStatus==="occupied",                              onClick:()=>setFStatus("occupied")},
          {label:t("تحتاج متابعة"),  value:attentionCount, sub:t("صيانة أو خارج الخدمة"),  Icon:AlertTriangle as LucideIcon, grad:"linear-gradient(135deg,#ef4444,#dc2626)", active:["maintenance","out_of_service"].includes(fStatus), onClick:()=>setFStatus("maintenance")},
        ] as {label:string;value:number;sub:string;Icon:LucideIcon;grad:string;active:boolean;onClick:()=>void}[]).map(s=>(
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick} style={{background:s.grad,borderRadius:14,padding:"1rem 0.85rem",color:"#fff",cursor:"pointer",position:"relative",transition:"transform .15s,box-shadow .15s",...(s.active?{transform:"translateY(-3px) scale(1.02)",boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)"}:{})}}>
            {s.active&&<span style={{position:"absolute",top:"0.4rem",left:"0.5rem",fontSize:"0.55rem",fontWeight:700,background:"rgba(255,255,255,.25)",padding:"0.1rem 0.4rem",borderRadius:"1rem"}}>● {t("نشط")}</span>}
            <div className="ds-kpi-icon"><s.Icon size={26} strokeWidth={1.6} /></div>
            <p style={{fontSize:13,fontWeight:700,opacity:.90,marginBottom:4}}>{s.label}</p>
            <p style={{fontSize:30,fontWeight:900,lineHeight:1,marginBottom:3}}>{s.value}</p>
            <p style={{fontSize:10,opacity:.75}}>{s.sub}</p>
          </div>
        ))}
      </div>
      {/* ── KPI Row 2: Insights ─────────────────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {([
          {label:t("وصول اليوم"),   value:arrivalCount,      sub:t("غرف وصولها اليوم تحتاج جاهزية"),  Icon:Users         as LucideIcon, grad:"linear-gradient(135deg,#7c3aed,#8b5cf6)", active:false,                      clickable:true,  onClick:()=>setFStatus("cleaning")},
          {label:t("تم اليوم"),     value:cleanedToday,      sub:t("غرف أُنهي تنظيفها اليوم"),         Icon:Sparkles      as LucideIcon, grad:"linear-gradient(135deg,#0d9488,#14b8a6)", active:false,                      clickable:false, onClick:()=>{}},
          {label:t("صيانة"),        value:maintenanceCount,  sub:t("غرف محوّلة للصيانة"),              Icon:Wrench        as LucideIcon, grad:"linear-gradient(135deg,#c2410c,#ea580c)", active:fStatus==="maintenance",    clickable:true,  onClick:()=>setFStatus("maintenance")},
          {label:t("خارج الخدمة"),  value:outOfServiceCount, sub:t("غرف غير متاحة مؤقتاً"),           Icon:AlertTriangle as LucideIcon, grad:"linear-gradient(135deg,#475569,#64748b)", active:fStatus==="out_of_service", clickable:true,  onClick:()=>setFStatus("out_of_service")},
        ] as {label:string;value:number;sub:string;Icon:LucideIcon;grad:string;active:boolean;clickable:boolean;onClick:()=>void}[]).map(s=>(
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick} style={{background:s.grad,borderRadius:14,padding:"1rem 0.85rem",color:"#fff",cursor:s.clickable?"pointer":"default",position:"relative",transition:"transform .15s,box-shadow .15s",...(s.active?{transform:"translateY(-3px) scale(1.02)",boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)"}:{})}}>
            {s.active&&<span style={{position:"absolute",top:"0.4rem",left:"0.5rem",fontSize:"0.55rem",fontWeight:700,background:"rgba(255,255,255,.25)",padding:"0.1rem 0.4rem",borderRadius:"1rem"}}>● {t("نشط")}</span>}
            <div className="ds-kpi-icon"><s.Icon size={26} strokeWidth={1.6} /></div>
            <p style={{fontSize:13,fontWeight:700,opacity:.90,marginBottom:4}}>{s.label}</p>
            <p style={{fontSize:30,fontWeight:900,lineHeight:1,marginBottom:3}}>{s.value}</p>
            <p style={{fontSize:10,opacity:.75}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="ds-card-p" style={{marginBottom:"1.25rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"0.6rem"}}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث بالغرفة أو النزيل أو الحجز")}</p>
            <input className="input" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={t("رقم الغرفة، الطابق، نوع الغرفة، اسم النزيل، رقم الحجز...")} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Home size={13} strokeWidth={2.2} color="#4f46e5" /> {t("حالة الغرفة")}</p>
            <select className="select" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              <option value="cleaning">{t("قيد التنظيف")}</option>
              <option value="available">{t("متاحة")}</option>
              <option value="occupied">{t("مشغولة")}</option>
              <option value="maintenance">{t("صيانة")}</option>
              <option value="out_of_service">{t("خارج الخدمة")}</option>
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Building2 size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الطابق")}</p>
            <select className="select" value={fFloor} onChange={e=>setFFloor(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              {floors.map(f=><option key={f} value={String(f)}>{t("الطابق")} {f}</option>)}
            </select>
          </div>
        </div>
        {(fStatus!=="cleaning"||fFloor!=="all"||search!=="")&&(
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:"0.5rem"}}>
            <button onClick={()=>{setFStatus("cleaning");setFFloor("all");setSearch("");}} className="ds-btn ds-btn-neutral ds-btn-sm" style={{display:"flex",alignItems:"center",gap:"0.3rem"}}>
              <X size={14} strokeWidth={2.5}/> {t("إلغاء الفلتر")}
            </button>
          </div>
        )}
      </div>

      {/* ── Room cards ── */}
      {loading?(
        <p style={{color:"var(--color-muted)",textAlign:"center",padding:"2rem"}}>{t("جاري تحميل بيانات الغرف...")}</p>
      ):filtered.length===0?(
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"3rem",
          textAlign:"center",color:"var(--color-muted)",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <Sparkles size={44} strokeWidth={1.2} style={{color:"#d1d5db",marginBottom:10}} />
          <p style={{fontWeight:800,fontSize:17,color:"var(--color-heading)",marginBottom:6}}>{t("لا توجد غرف مطابقة")}</p>
          <p style={{fontSize:13}}>{t("غيّر الفلاتر أو انتظر تسجيل مغادرة جديدة لتظهر غرف التنظيف هنا.")}</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:"0.85rem"}}>
          {filtered.map(room=>{
            const lr=lastResByRoom.get(room.id);
            const strip=STATUS_STRIP[room.status]??"#94a3b8";
            const border=STATUS_BORDER[room.status]??"#e2e8f0";
            const cardBg=STATUS_CARD_BG[room.status]??"#fff";
            const badge=STATUS_BADGE[room.status]??{background:"#f1f5f9",color:"#475569"};
            const isCleaning=room.status==="cleaning";
            const isMaint=room.status==="maintenance";
            const isAct=actRoom===room.id;
            return (
              <div key={room.id} style={{background:cardBg,border:`1px solid ${border}`,
                borderRight:`4px solid ${strip}`,borderRadius:12,padding:"0.9rem",
                display:"flex",flexDirection:"column",gap:"0.5rem",
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>

                {/* ── Card top: room chip + type + status ── */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"}}>
                    <div style={{width:34,height:34,borderRadius:8,background:`${strip}22`,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <BedDouble size={18} color={strip} strokeWidth={1.8}/>
                    </div>
                    <div>
                      <span style={{background:"#1e293b",color:"#fff",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,display:"inline-block",marginBottom:2}}>
                        {t("غرفة")} {room.number}
                      </span>
                      <p style={{fontSize:12,color:"#1e293b",fontWeight:700,marginTop:1}}>{room.type||t("نوع غير محدد")}</p>
                    </div>
                  </div>
                  <span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,flexShrink:0,...badge}}>
                    {STATUS_LABELS[room.status]??room.status}
                  </span>
                </div>

                {/* ── Flow band ── */}
                <div style={{background:"rgba(255,255,255,0.6)",borderRadius:8,padding:"6px 10px",
                  display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:10,fontWeight:700}}>
                  <span style={{color:"#475569"}}>{t("بعد المغادرة")}</span>
                  <span style={{color:strip,background:`${strip}18`,borderRadius:20,padding:"2px 8px"}}>
                    ← {STATUS_LABELS[room.status]??room.status} ←
                  </span>
                  <span style={{color:"#15803d"}}>{t("تعود متاحة بعد التنظيف")}</span>
                </div>

                {/* ── Data grid ── */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"5px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><Building2 size={12} strokeWidth={2}/> {t("الطابق")}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{t("الطابق")} {room.floor}</p>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"5px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><Users size={12} strokeWidth={2}/> {t("السعة")}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{lang === "ar" ? `${room.capacity} أشخاص` : `${room.capacity} persons`}</p>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"5px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><Clock size={12} strokeWidth={2}/> {t("بدء التنظيف")}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{room.updated_at?fmtDate(room.updated_at):"—"}</p>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"5px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><ClipboardList size={12} strokeWidth={2}/> {t("آخر حجز")}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{lr?.booking_number||t("لا يوجد")}</p>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"5px 8px",fontSize:11,gridColumn:"1/-1"}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><User size={12} strokeWidth={2}/> {t("آخر نزيل")}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{lr?`${lr.guest_first_name} ${lr.guest_last_name}`.trim()||"—":t("لا يوجد")}</p>
                  </div>
                </div>

                {/* ── Cleaning warning ── */}
                {isCleaning&&(
                  <div style={{background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:8,
                    padding:"5px 10px",fontSize:11,color:"#92400e",fontWeight:700}}>
                    {t("الغرفة غير متاحة للحجز حتى يتم تأكيد انتهاء التنظيف.")}
                  </div>
                )}

                {/* ── Actions ── */}
                <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap",borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:"0.5rem",marginTop:"0.1rem"}}>
                  {isCleaning&&(
                    <button disabled={isAct} onClick={()=>handleCleaningDone(room)}
                      style={{flex:1,minWidth:0,background:"#16a34a",
                        color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",
                        fontSize:12,fontWeight:700,cursor:"pointer",opacity:isAct?0.6:1}}>
                      {isAct?t("جارٍ..."):t("تم التنظيف")}
                    </button>
                  )}
                  {!isMaint&&(
                    <button disabled={isAct} onClick={()=>handleSendMaintenance(room)}
                      style={{flex:1,minWidth:0,background:"#ea580c",
                        color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.5rem",
                        fontSize:12,fontWeight:700,cursor:"pointer",opacity:isAct?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.25rem"}}>
                      <Wrench size={13} strokeWidth={2}/>{isAct?t("جارٍ..."):t("إرسال للصيانة")}
                    </button>
                  )}
                  {isMaint&&(
                    <button onClick={()=>{ router.push("/manager/maintenance"); }}
                      style={{background:"#64748b",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.6rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.25rem"}}>
                      <Wrench size={13} strokeWidth={2}/> {t("الصيانة")}
                    </button>
                  )}
                  <button onClick={()=>router.push("/manager/rooms")}
                    style={{background:"#4f46e5",color:"#fff",border:"none",
                      borderRadius:8,padding:"0.4rem 0.6rem",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {t("الغرف")}
                  </button>
                  {lr&&(
                    <button onClick={()=>navToGuests(`${lr.guest_first_name} ${lr.guest_last_name}`.trim())}
                      style={{background:"#0369a1",color:"#fff",border:"none",borderRadius:8,padding:"0.4rem 0.6rem",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.25rem"}}>
                      <UserCheck size={13} strokeWidth={2}/> {t("النزيل")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
