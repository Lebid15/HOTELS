"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import RoomServicesTabs from "../RoomServicesTabs";
import { Zap, Droplets, Wind, Wifi, Armchair, Tv, DoorOpen, Sparkles, Wrench, AlertCircle, AlertTriangle, Loader2, CheckCircle2, Search, ListFilter, Home, Calendar, User, MapPin, RefreshCw, FileText, Building2, X, ClipboardList } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";

type TStatus   = "open"|"in_progress"|"waiting_parts"|"resolved"|"cancelled";
type TPriority = "low"|"medium"|"high"|"urgent";
type TType     = "electric"|"plumbing"|"ac"|"internet"|"furniture"|"appliance"|"door"|"cleaning_damage"|"other";
type TSource   = "manual"|"housekeeping"|"room_status";
type ModalMode = "add"|"edit"|null;

interface Ticket {
  id:number; hotel:number; ticket_no:string;
  room:number|null; room_number:string|null; room_floor:number|null; room_status:string|null;
  issue_type:TType; priority:TPriority; status:TStatus;
  description:string; assigned_to:number|null; assigned_to_name:string|null;
  source:TSource; created_by:string; started_at:string|null;
  resolved_at:string|null; resolved_by:string;
  created_at:string; updated_at:string;
}
interface RoomItem  { id:number; number:string; floor:number; status:string; }
interface StaffItem { id:number; full_name:string; role:string; }

/* ─── Labels ────────────────────────────────────────────── */
// Label constants moved inside component (use t())
const TYPE_ICON_CMPS:Record<string,LucideIcon> = {
  electric:Zap, plumbing:Droplets, ac:Wind, internet:Wifi,
  furniture:Armchair, appliance:Tv, door:DoorOpen, cleaning_damage:Sparkles, other:Wrench,
};

const STATUS_BADGE:Record<string,React.CSSProperties> = {
  open:          {background:"#dc2626",color:"#fff",border:"none"},
  in_progress:   {background:"#2563eb",color:"#fff",border:"none"},
  waiting_parts: {background:"#f59e0b",color:"#fff",border:"none"},
  resolved:      {background:"#16a34a",color:"#fff",border:"none"},
  cancelled:     {background:"#64748b",color:"#fff",border:"none"},
};
const PRIORITY_BADGE:Record<string,React.CSSProperties> = {
  low:    {background:"#16a34a",color:"#fff",border:"none"},
  medium: {background:"#f59e0b",color:"#fff",border:"none"},
  high:   {background:"#f97316",color:"#fff",border:"none"},
  urgent: {background:"#dc2626",color:"#fff",border:"none"},
};
const STATUS_CARD_BG:Record<string,string> = {
  open:          "linear-gradient(135deg,#fff1f2,#fee2e2)",
  in_progress:   "linear-gradient(135deg,#eff6ff,#dbeafe)",
  waiting_parts: "linear-gradient(135deg,#fffbeb,#fef9c3)",
  resolved:      "linear-gradient(135deg,#f0fdf4,#dcfce7)",
  cancelled:     "linear-gradient(135deg,#f8fafc,#f1f5f9)",
};
const STATUS_STRIP:Record<string,string> = {
  open:"#ef4444", in_progress:"#2563eb", waiting_parts:"#f59e0b",
  resolved:"#22c55e", cancelled:"#94a3b8",
};
const STATUS_PRIORITY_ORDER:Record<string,number> = {
  open:0, in_progress:1, waiting_parts:2, resolved:3, cancelled:4,
};
const PRIORITY_ORDER:Record<string,number> = {urgent:0,high:1,medium:2,low:3};

const ACTIVE_STATUSES:TStatus[] = ["open","in_progress","waiting_parts"];

function isActive(s:string){return ACTIVE_STATUSES.includes(s as TStatus);}
function fmtDate(d:string|null){
  if(!d) return "—";
  try{return new Date(d).toLocaleString("ar-u-nu-latn",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return d;}
}
function btnSm(color:string):React.CSSProperties{
  return{padding:"0.3rem 0.6rem",fontSize:10,fontWeight:700,cursor:"pointer",
    border:`1px solid ${color}30`,borderRadius:6,background:`${color}12`,color,whiteSpace:"nowrap"};
}

/* ══════════════════════════════════════════════════════════ */
export default function MaintenancePage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const STATUS_LABELS:Record<string,string> = {
    open:t("مفتوح"), in_progress:t("قيد المعالجة"), waiting_parts:t("بانتظار قطع"),
    resolved:t("تم الإنجاز"), cancelled:t("ملغي"),
  };
  const PRIORITY_LABELS:Record<string,string> = {
    low:t("منخفضة"), medium:t("متوسطة"), high:t("مرتفعة"), urgent:t("عاجلة"),
  };
  const TYPE_LABELS:Record<string,string> = {
    electric:t("كهرباء"), plumbing:t("سباكة"), ac:t("تكييف"), internet:t("إنترنت"),
    furniture:t("أثاث"), appliance:t("جهاز/معدات"), door:t("أبواب وأقفال"),
    cleaning_damage:t("ملاحظة تنظيف/تلف"), other:t("أخرى"),
  };
  const SOURCE_LABELS:Record<string,string> = {
    manual:t("يدوي"), housekeeping:t("من التنظيف"), room_status:t("من حالة الغرفة"),
  };
  const ROOM_STATUS_LABELS:Record<string,string> = {
    available:t("متاحة"), occupied:t("مشغولة"), cleaning:t("تنظيف"),
    maintenance:t("صيانة"), out_of_service:t("خارج الخدمة"),
  };
  const hotelId = typeof window!=="undefined"?(localStorage.getItem("hotel_id")??""):"";

  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [rooms,    setRooms]    = useState<RoomItem[]>([]);
  const [staffList,setStaffList]= useState<StaffItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [uname,    setUname]    = useState("Hotel Manager");
  const [toast,    setToast]    = useState("");
  const [actId,    setActId]    = useState<number|null>(null);
  // Prevents auto-ticket creation from running more than once per mount
  const autoCreatedRef = useRef(false);

  /* Filters */
  const [search,   setSearch]   = useState("");
  const [fStatus,  setFStatus]  = useState("all");
  const [fPriority,setFPriority]= useState("all");
  const [fRoom,    setFRoom]    = useState("all");

  /* Modal */
  const [modal,    setModal]    = useState<ModalMode>(null);
  const [selTicket,setSelTicket]= useState<Ticket|null>(null);
  const [fType,    setFType]    = useState<TType>("other");
  const [fPri2,    setFPri2]    = useState<TPriority>("medium");
  const [fRoom2,   setFRoom2]   = useState<string>(""); // "" = public area
  const [fAssign,  setFAssign]  = useState<string>("");  // "" = unassigned
  const [fDesc,    setFDesc]    = useState("");
  const [formErr,  setFormErr]  = useState("");
  const [saving,   setSaving]   = useState(false);

  function showToast(m:string){setToast(m);setTimeout(()=>setToast(""),4500);}

  /* ── Fetch ── */
  function fetchAll(){
    if(!hotelId){setLoading(false);return;}
    setLoading(true);
    Promise.all([
      fetch(`${API}/maintenance/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()),
      fetch(`${API}/rooms/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()),
      fetch(`${API}/staff/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()),
    ]).then(([td,rd,sd])=>{
      const tks:Ticket[] = Array.isArray(td)?td:td.results??[];
      const rms:RoomItem[] = Array.isArray(rd)?rd:rd.results??[];
      const sts:StaffItem[] = Array.isArray(sd)?sd:sd.results??[];
      setRooms(rms.filter(r=>r.status!=="archived"));
      setStaffList(sts.filter(s=>["maintenance","supervisor","housekeeping"].includes(s.role)));
      /* Auto-create tickets for rooms with status=maintenance that have no active ticket.
         Guard: only runs once per component mount to prevent duplicates on refresh/save. */
      const roomsInMaintenance = rms.filter(r=>r.status==="maintenance");
      const roomsWithActiveTicket = new Set(
        tks.filter(tk=>isActive(tk.status)&&tk.room!==null).map(tk=>tk.room!)
      );
      const promises:Promise<unknown>[] = [];
      if (!autoCreatedRef.current) {
        roomsInMaintenance.forEach(room=>{
          if(!roomsWithActiveTicket.has(room.id)){
            promises.push(
              fetch(`${API}/maintenance/`,{method:"POST",headers:apiHJ(),body:JSON.stringify({
                hotel:Number(hotelId), room:room.id, issue_type:"other", priority:"medium",
                status:"open", source:"room_status", created_by:localStorage.getItem("username")||"System",
                description:lang==="ar"?`بلاغ صيانة تلقائي من دورة التنظيف أو حالة الغرفة - غرفة ${room.number}.`:`Auto maintenance ticket from cleaning cycle or room status - Room ${room.number}.`,
              })}).then(r=>r.json())
            );
          }
        });
        if (promises.length > 0) autoCreatedRef.current = true;
      }
      if(promises.length>0){
        Promise.all(promises).then(()=>{
          fetch(`${API}/maintenance/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json())
            .then(d=>{setTickets(Array.isArray(d)?d:d.results??[]);setLoading(false);});
        });
      } else {
        setTickets(tks); setLoading(false);
      }
    }).catch(()=>setLoading(false));
  }
  useEffect(()=>{
    const execute = async () => {
      await fetchAll();
      const u=localStorage.getItem("username");if(u)setUname(u);
    };
    execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  /* ── Derived ── */
  const roomMap = new Map(rooms.map(r=>[r.id,r]));
  const openCount        = tickets.filter(t=>t.status==="open").length;
  const inProgCount      = tickets.filter(t=>t.status==="in_progress").length;
  const highCount        = tickets.filter(t=>["high","urgent"].includes(t.priority)&&isActive(t.status)).length;
  const resolvedCount    = tickets.filter(t=>t.status==="resolved").length;
  const waitingCount     = tickets.filter(t=>t.status==="waiting_parts").length;
  const cancelledCount   = tickets.filter(t=>t.status==="cancelled").length;
  const unassignedCount  = tickets.filter(t=>isActive(t.status)&&!t.assigned_to).length;
  const totalCount       = tickets.length;

  const uniqueRooms = [...new Map(tickets.filter(t=>t.room).map(t=>[t.room!, {id:t.room!,number:t.room_number!,floor:t.room_floor!}])).values()]
    .sort((a,b)=>parseInt(a.number.replace(/\D/g,"")||"0")-parseInt(b.number.replace(/\D/g,"")||"0"));

  const filtered = [...tickets]
    .filter(ticket=>{
      if(fStatus!=="all"&&ticket.status!==fStatus) return false;
      if(fPriority!=="all"&&ticket.priority!==fPriority) return false;
      if(fRoom!=="all"&&String(ticket.room)!==fRoom) return false;
      if(search){
        const q=search.toLowerCase();
        if(!([ticket.ticket_no,ticket.description,ticket.room_number??"",String(ticket.room_floor??""),
              TYPE_LABELS[ticket.issue_type]??"",PRIORITY_LABELS[ticket.priority]??"",
              STATUS_LABELS[ticket.status]??"",ticket.assigned_to_name??"",ticket.created_by,
              SOURCE_LABELS[ticket.source]??""].join(" ").toLowerCase().includes(q))) return false;
      }
      return true;
    })
    .sort((a,b)=>{
      const sd=STATUS_PRIORITY_ORDER[a.status]-(STATUS_PRIORITY_ORDER[b.status]??9);
      if(sd!==0) return sd;
      const pd=PRIORITY_ORDER[a.priority]-PRIORITY_ORDER[b.priority];
      if(pd!==0) return pd;
      return (b.updated_at||"").localeCompare(a.updated_at||"");
    });

  /* ── Open modals ── */
  function openAdd(){
    setFType("other");setFPri2("medium");setFRoom2("");setFAssign("");setFDesc("");
    setFormErr("");setSelTicket(null);setModal("add");
  }
  function openEdit(tk:Ticket){
    setFType(tk.issue_type);setFPri2(tk.priority);
    setFRoom2(tk.room?String(tk.room):"");setFAssign(tk.assigned_to?String(tk.assigned_to):"");
    setFDesc(tk.description);setFormErr("");setSelTicket(tk);setModal("edit");
  }

  /* ── Save ── */
  async function handleSave(){
    setSaving(true);setFormErr("");
    const payload:Record<string,unknown>={
      hotel:Number(hotelId), issue_type:fType, priority:fPri2,
      room:fRoom2?Number(fRoom2):null,
      assigned_to:fAssign?Number(fAssign):null,
      description:fDesc.trim(),
    };
    try{
      if(modal==="edit"&&selTicket){
        payload.updated_at = new Date().toISOString();
        const r=await fetch(`${API}/maintenance/${selTicket.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify(payload)});
        if(!r.ok){const d=await r.json();setFormErr(JSON.stringify(d));setSaving(false);return;}
        showToast(t("تم تحديث بلاغ الصيانة."));
      } else {
        payload.status="open"; payload.source="manual";
        payload.created_by=uname;
        const r=await fetch(`${API}/maintenance/`,{method:"POST",headers:apiHJ(),body:JSON.stringify(payload)});
        if(!r.ok){const d=await r.json();setFormErr(JSON.stringify(d));setSaving(false);return;}
        await r.json();
        /* If active ticket added for unoccupied room → set room to maintenance */
        if(fRoom2){
          const rm=roomMap.get(Number(fRoom2));
          if(rm&&!["occupied"].includes(rm.status)){
            await fetch(`${API}/rooms/${fRoom2}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"maintenance"})}).catch(()=>{});
          }
        }
        showToast(t("تم حفظ بلاغ الصيانة."));
      }
      setModal(null);fetchAll();
    }catch{setFormErr(t("حدث خطأ أثناء الحفظ."));}
    setSaving(false);
  }

  /* ── Quick actions ── */
  async function quickAction(tk:Ticket, newStatus:TStatus, extra?:Record<string,unknown>){
    setActId(tk.id);
    try{
      const payload:Record<string,unknown>={status:newStatus,...extra};
      if(newStatus==="in_progress"&&!tk.started_at) payload.started_at=new Date().toISOString();
      if(newStatus==="resolved"){
        payload.resolved_at=new Date().toISOString();
        payload.resolved_by=uname;
        /* If room is maintenance → set to cleaning */
        if(tk.room){
          const rm=roomMap.get(tk.room);
          if(rm&&rm.status==="maintenance"){
            await fetch(`${API}/rooms/${tk.room}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"cleaning"})}).catch(()=>{});
          }
        }
      }
      await fetch(`${API}/maintenance/${tk.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify(payload)});
      const msgs:Record<TStatus,string>={
        in_progress:t("تم بدء معالجة بلاغ الصيانة."),
        waiting_parts:t("تم تحويل البلاغ إلى انتظار قطع."),
        resolved:t("تم إنهاء الصيانة وتحويل الغرفة إلى التنظيف إذا كانت مرتبطة بغرفة."),
        cancelled:t("تم إلغاء بلاغ الصيانة."),
        open:t("تم إعادة فتح البلاغ."),
      };
      showToast(msgs[newStatus]??t("تم تحديث البلاغ."));
      fetchAll();
    }catch{showToast(t("حدث خطأ."));}
    setActId(null);
  }

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="ds-page">
      <RoomServicesTabs />

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:80,right:24,zIndex:9999,background:"#1e293b",color:"#fff",
          padding:"0.75rem 1.25rem",borderRadius:12,fontSize:13,fontWeight:700,maxWidth:460,
          boxShadow:"0 4px 20px rgba(0,0,0,0.2)",lineHeight:1.5}}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:"0.65rem",marginBottom:"0.3rem"}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#f97316,#ea580c)",
              display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>
              <Wrench size={20} strokeWidth={1.8}/>
            </div>
            <h1 style={{fontSize:"var(--text-2xl)",fontWeight:900,color:"var(--color-heading)"}}>{t("الصيانة")}</h1>
          </div>
          <p style={{fontSize:13,color:"var(--color-muted)",paddingRight:"0.25rem"}}>
            {t("إدارة بلاغات الصيانة وربطها بالغرف. عند إنهاء الصيانة تعود الغرفة إلى التنظيف أولًا ثم تصبح متاحة بعد تأكيد")} <strong>{t("تم التنظيف")}</strong>.
          </p>
        </div>
        <button className="ds-btn ds-btn-primary" onClick={openAdd}>+ {t("إضافة بلاغ صيانة")}</button>
      </div>

      {/* ── KPI Row 1 ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"0.75rem"}}>
        {([
          {label:t("مفتوحة"),       value:openCount,     sub:t("بانتظار البدء أو التعيين"),  Icon:AlertCircle   as LucideIcon, grad:"linear-gradient(135deg,#ef4444,#dc2626)", active:fStatus==="open",        onClick:()=>setFStatus("open")},
          {label:t("قيد المعالجة"), value:inProgCount,   sub:t("فريق الصيانة يعمل عليها"),  Icon:Loader2       as LucideIcon, grad:"linear-gradient(135deg,#2563eb,#1d4ed8)", active:fStatus==="in_progress", onClick:()=>setFStatus("in_progress")},
          {label:t("أولوية عالية"), value:highCount,     sub:t("عاجلة أو مرتفعة ولم تُغلق"),Icon:AlertTriangle as LucideIcon, grad:"linear-gradient(135deg,#f59e0b,#d97706)", active:fPriority==="urgent",    onClick:()=>setFPriority("urgent")},
          {label:t("تم إنجازها"),   value:resolvedCount, sub:t("بلاغات صيانة مغلقة"),       Icon:CheckCircle2  as LucideIcon, grad:"linear-gradient(135deg,#22c55e,#16a34a)", active:fStatus==="resolved",    onClick:()=>setFStatus("resolved")},
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
      {/* ── KPI Row 2 ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {([
          {label:t("بانتظار قطع"),   value:waitingCount,    sub:t("متوقفة لحين توفر قطع الغيار"), Icon:Wrench        as LucideIcon, grad:"linear-gradient(135deg,#d97706,#f59e0b)", active:fStatus==="waiting_parts",  clickable:true,  onClick:()=>setFStatus("waiting_parts")},
          {label:t("غير معيّنة"),    value:unassignedCount, sub:t("بلاغات نشطة بدون موظف"),      Icon:User          as LucideIcon, grad:"linear-gradient(135deg,#7c3aed,#8b5cf6)", active:false,                     clickable:false, onClick:()=>{}},
          {label:t("إجمالي البلاغات"),value:totalCount,     sub:t("كل الحالات"),                  Icon:ClipboardList as LucideIcon, grad:"linear-gradient(135deg,#0369a1,#0891b2)", active:fStatus==="all",            clickable:true,  onClick:()=>setFStatus("all")},
          {label:t("ملغية"),         value:cancelledCount,  sub:t("بلاغات تم إلغاؤها"),           Icon:X             as LucideIcon, grad:"linear-gradient(135deg,#475569,#64748b)", active:fStatus==="cancelled",      clickable:true,  onClick:()=>setFStatus("cancelled")},
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
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"0.6rem"}}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث بالبلاغ أو الغرفة أو الوصف")}</p>
            <input className="input" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={t("رقم البلاغ، نوع المشكلة، الغرفة، المسؤول، الوصف...")} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><ListFilter size={13} strokeWidth={2.2} color="#4f46e5" /> {t("حالة البلاغ")}</p>
            <select className="select" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              <option value="open">{t("مفتوح")}</option>
              <option value="in_progress">{t("قيد المعالجة")}</option>
              <option value="waiting_parts">{t("بانتظار قطع")}</option>
              <option value="resolved">{t("تم الإنجاز")}</option>
              <option value="cancelled">{t("ملغي")}</option>
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Zap size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الأولوية")}</p>
            <select className="select" value={fPriority} onChange={e=>setFPriority(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              <option value="urgent">{t("عاجلة")}</option>
              <option value="high">{t("مرتفعة")}</option>
              <option value="medium">{t("متوسطة")}</option>
              <option value="low">{t("منخفضة")}</option>
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Home size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الغرفة")}</p>
            <select className="select" value={fRoom} onChange={e=>setFRoom(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              <option value="null">{t("مرفق عام")}</option>
              {uniqueRooms.map(r=><option key={r.id} value={String(r.id)}>{t("غرفة")} {r.number} - {t("الطابق")} {r.floor}</option>)}
            </select>
          </div>
        </div>
        {(fStatus!=="all"||fPriority!=="all"||fRoom!=="all"||search!=="")&&(
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:"0.5rem"}}>
            <button onClick={()=>{setFStatus("all");setFPriority("all");setFRoom("all");setSearch("");}} className="ds-btn ds-btn-neutral ds-btn-sm" style={{display:"flex",alignItems:"center",gap:"0.3rem"}}>
              <X size={14} strokeWidth={2.5}/> {t("إلغاء الفلتر")}
            </button>
          </div>
        )}
      </div>

      {/* ── Cards ── */}
      {loading?(
        <p style={{color:"var(--color-muted)",textAlign:"center",padding:"2rem"}}>{t("جاري تحميل بلاغات الصيانة...")}</p>
      ):filtered.length===0?(
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"3rem",
          textAlign:"center",color:"var(--color-muted)",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <Wrench size={44} strokeWidth={1.2} style={{color:"#d1d5db",marginBottom:10}}/>
          <p style={{fontWeight:800,fontSize:17,color:"var(--color-heading)",marginBottom:6}}>{t("لا توجد بلاغات صيانة مطابقة")}</p>
          <p style={{fontSize:13}}>{t("أضف بلاغًا جديدًا أو غيّر الفلاتر لعرض بلاغات أخرى.")}</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(295px,1fr))",gap:"0.85rem"}}>
          {filtered.map(tk=>{
            const strip=STATUS_STRIP[tk.status]??"#94a3b8";
            const bg=STATUS_CARD_BG[tk.status]??"#fff";
            const active=isActive(tk.status);
            const isAct=actId===tk.id;
            const TypeIcon=TYPE_ICON_CMPS[tk.issue_type]??Wrench;
            return(
              <div key={tk.id} style={{background:bg,border:`1px solid ${strip}30`,
                borderRight:`4px solid ${strip}`,borderRadius:12,padding:"0.9rem",
                display:"flex",flexDirection:"column",gap:"0.45rem",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>

                {/* Top */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.4rem"}}>
                  <div style={{display:"flex",gap:"0.5rem",alignItems:"flex-start"}}>
                    <div style={{width:36,height:36,borderRadius:8,background:`${strip}20`,
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                      <TypeIcon size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                      <span style={{background:"#1e293b",color:"#fff",borderRadius:20,padding:"3px 9px",
                        fontSize:10,fontWeight:700,display:"inline-block",marginBottom:3}}>{tk.ticket_no||`MT-${tk.id}`}</span>
                      <p style={{fontWeight:800,fontSize:13,color:"var(--color-heading)"}}>{TYPE_LABELS[tk.issue_type]??tk.issue_type}</p>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.2rem",alignItems:"flex-end",flexShrink:0}}>
                    <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,...(STATUS_BADGE[tk.status]??{})}}>
                      {STATUS_LABELS[tk.status]??tk.status}
                    </span>
                    <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,...(PRIORITY_BADGE[tk.priority]??{})}}>
                      {PRIORITY_LABELS[tk.priority]??tk.priority}
                    </span>
                  </div>
                </div>

                {/* Room / location band */}
                <div style={{background:"rgba(255,255,255,0.6)",borderRadius:8,padding:"5px 10px",
                  display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                  <span style={{fontWeight:700,color:"#1e293b",display:"flex",alignItems:"center",gap:5}}>
                    {tk.room?<><Home size={13} color="#4f46e5" strokeWidth={1.8}/>{lang==="ar"?`غرفة ${tk.room_number} - الطابق ${tk.room_floor}`:`Room ${tk.room_number} - Floor ${tk.room_floor}`}</>:<><Building2 size={13} color="#4f46e5" strokeWidth={1.8}/>{lang==="ar"?"مرفق عام":"Public Area"}</>}
                  </span>
                  {tk.room_status&&(
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,0.8)",color:"#1e293b"}}>
                      {ROOM_STATUS_LABELS[tk.room_status]??tk.room_status}
                    </span>
                  )}
                </div>

                {/* Meta grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"4px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><Calendar size={12} strokeWidth={2}/> {lang==="ar"?"تاريخ البلاغ":"Report Date"}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{fmtDate(tk.created_at)}</p>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"4px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><User size={12} strokeWidth={2}/> {lang==="ar"?"المسؤول":"Assignee"}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{tk.assigned_to_name||(lang==="ar"?"غير معيّن":"Unassigned")}</p>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"4px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><MapPin size={12} strokeWidth={2}/> {lang==="ar"?"المصدر":"Source"}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{SOURCE_LABELS[tk.source]??tk.source}</p>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"4px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><RefreshCw size={12} strokeWidth={2}/> {lang==="ar"?"آخر تحديث":"Last Update"}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{fmtDate(tk.updated_at)}</p>
                  </div>
                </div>

                {/* Description */}
                {tk.description&&(
                  <div style={{background:"rgba(255,255,255,0.55)",borderRadius:6,padding:"5px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><FileText size={12} strokeWidth={2}/> {lang==="ar"?"وصف المشكلة":"Issue Description"}</p>
                    <p style={{lineHeight:1.5,color:"#1e293b",fontWeight:700}}>{tk.description}</p>
                  </div>
                )}

                {/* Alert banners */}
                {active&&(
                  <div style={{background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:8,
                    padding:"5px 10px",fontSize:10,color:"#92400e",fontWeight:700,display:"flex",alignItems:"center",gap:"0.4rem"}}>
                    <AlertTriangle size={13} strokeWidth={2} style={{flexShrink:0}}/> {lang==="ar"?"الغرفة المرتبطة لا تعود متاحة قبل إنهاء الصيانة ثم التنظيف.":"Linked room is unavailable until maintenance and cleaning are complete."}
                  </div>
                )}
                {tk.status==="resolved"&&(
                  <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,
                    padding:"5px 10px",fontSize:10,color:"#15803d",fontWeight:700,display:"flex",alignItems:"center",gap:"0.4rem"}}>
                    <CheckCircle2 size={13} strokeWidth={2} style={{flexShrink:0}}/> {lang==="ar"?"تم إنجاز البلاغ. إذا كان مرتبطًا بغرفة فقد تم تحويلها للتنظيف.":"Ticket resolved. If linked to a room, it has been moved to cleaning."}
                  </div>
                )}

                {/* Actions */}
                <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",borderTop:"1px solid rgba(0,0,0,0.05)",paddingTop:"0.5rem"}}>
                  {tk.status==="open"&&(
                    <button disabled={isAct} onClick={()=>quickAction(tk,"in_progress")} style={btnSm("#7c3aed")}>
                      {isAct?"...":lang==="ar"?"بدء المعالجة":"Start"}
                    </button>
                  )}
                  {active&&(
                    <>
                      <button disabled={isAct} onClick={()=>quickAction(tk,"resolved")} style={btnSm("#16a34a")}>
                        {isAct?"...":lang==="ar"?"إنهاء الصيانة":"Resolve"}
                      </button>
                      <button disabled={isAct} onClick={()=>quickAction(tk,"waiting_parts")} style={btnSm("#d97706")}>
                        {isAct?"...":lang==="ar"?"بانتظار قطع":"Waiting Parts"}
                      </button>
                    </>
                  )}
                  <button onClick={()=>openEdit(tk)} style={btnSm("#1e293b")}>{lang==="ar"?"تعديل":"Edit"}</button>
                  {active&&(
                    <button disabled={isAct} onClick={()=>quickAction(tk,"cancelled")} style={btnSm("#dc2626")}>
                      {isAct?"...":lang==="ar"?"إلغاء البلاغ":"Cancel"}
                    </button>
                  )}
                  {tk.room&&(
                    <button onClick={()=>{ router.push("/manager/rooms"); }} style={btnSm("#4f46e5")}>
                      {lang==="ar"?"الغرفة":"Room"}
                    </button>
                  )}
                  {tk.status==="resolved"&&tk.room&&(
                    <button onClick={()=>{ router.push("/manager/housekeeping"); }} style={btnSm("#f59e0b")}>
                      {lang==="ar"?"التنظيف":"Cleaning"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ ADD / EDIT MODAL ════════════════════════════════ */}
      {modal&&(
        <div className="ds-modal-backdrop" onClick={()=>setModal(null)}>
          <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
            <div className="ds-modal-head">
              <div>
                <p style={{fontSize:11,color:"var(--color-primary)",fontWeight:700,marginBottom:2}}>
                  {modal==="add"?t("بلاغ جديد"):selTicket?.ticket_no||t("تعديل")}
                </p>
                <h2>{modal==="add"?t("إضافة بلاغ صيانة"):t("تعديل بلاغ الصيانة")}</h2>
              </div>
              <button className="icon-btn" onClick={()=>setModal(null)} aria-label="إغلاق"><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              {formErr&&<p style={{color:"var(--color-danger)",fontSize:13,marginBottom:"0.75rem",
                background:"#fef2f2",padding:"0.5rem 0.75rem",borderRadius:8}}>{formErr}</p>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
                <div className="field" style={{gridColumn:"1/-1"}}>
                  <label className="field-label">{t("الغرفة / الموقع")}</label>
                  <select className="select" value={fRoom2} onChange={e=>setFRoom2(e.target.value)}>
                    <option value="">{t("مرفق عام")}</option>
                    {rooms.map(r=><option key={r.id} value={String(r.id)}>{t("غرفة")} {r.number} - {t("الطابق")} {r.floor}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t("نوع المشكلة")}</label>
                  <select className="select" value={fType} onChange={e=>setFType(e.target.value as TType)}>
                    {Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t("الأولوية")}</label>
                  <select className="select" value={fPri2} onChange={e=>setFPri2(e.target.value as TPriority)}>
                    <option value="low">{t("منخفضة")}</option>
                    <option value="medium">{t("متوسطة")}</option>
                    <option value="high">{t("مرتفعة")}</option>
                    <option value="urgent">{t("عاجلة")}</option>
                  </select>
                </div>
                <div className="field" style={{gridColumn:"1/-1"}}>
                  <label className="field-label">{t("تعيين إلى")}</label>
                  <select className="select" value={fAssign} onChange={e=>setFAssign(e.target.value)}>
                    <option value="">{t("غير معيّن")}</option>
                    {staffList.map(s=><option key={s.id} value={String(s.id)}>{s.full_name} ({s.role==="maintenance"?t("صيانة"):s.role==="supervisor"?t("مشرف"):t("تنظيف")})</option>)}
                  </select>
                </div>
                <div className="field" style={{gridColumn:"1/-1"}}>
                  <label className="field-label">{t("وصف المشكلة")}</label>
                  <textarea className="input" rows={3} value={fDesc}
                    onChange={e=>setFDesc(e.target.value)}
                    placeholder={t("اكتب وصفًا مختصرًا وواضحًا للمشكلة أو الإجراء المطلوب.")} style={{resize:"vertical"}} />
                </div>
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={()=>setModal(null)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={handleSave} disabled={saving}>
                {saving?t("جارٍ الحفظ..."):t("حفظ البلاغ")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
