"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Home, LayoutGrid, CheckCircle2, PauseCircle, AlertTriangle, Search, ListFilter,
  Building2, Eye, Pencil, Archive, RotateCcw, Users, Banknote, Calendar, FileText,
  Plus, Save, Wrench, Sparkles, BookOpen, RefreshCw, X,
} from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";

const CURRENCIES = ["SAR","USD","AED","EUR","TRY","SYP","KWD","BHD","OMR","QAR","EGP"];

// STATUS_LABELS moved inside RoomsPage to use t()

function statusStyle(s:string): React.CSSProperties {
  const m: Record<string,React.CSSProperties> = {
    available:     {background:"#16a34a",color:"#fff",border:"none"},
    booked:        {background:"#f59e0b",color:"#fff",border:"none"},
    occupied:      {background:"#2563eb",color:"#fff",border:"none"},
    cleaning:      {background:"#f97316",color:"#fff",border:"none"},
    maintenance:   {background:"#dc2626",color:"#fff",border:"none"},
    out_of_service:{background:"#64748b",color:"#fff",border:"none"},
    archived:      {background:"#94a3b8",color:"#fff",border:"none"},
  };
  return {padding:"2px 11px",borderRadius:20,fontSize:12,fontWeight:700,...(m[s]??m.archived)};
}

/* ─── Types ───────────────────────────────────────── */
interface Room {
  id:number; hotel:number; number:string; type:string; floor:number;
  status:string; capacity:number; price:string|number; currency:string;
  notes:string; created_at?:string; updated_at?:string;
}
interface Reservation {
  id:number; room:number|null; status:string;
  guest_first_name?:string; guest_last_name?:string;
  booking_number?:string; check_in_date?:string; check_out_date?:string;
}

function computeDisplayStatus(room:Room, reservations:Reservation[]): string {
  if (["cleaning","maintenance","out_of_service","archived"].includes(room.status)) return room.status;
  const linked = reservations.filter(r => r.room === room.id);
  if (room.status === "occupied" || linked.some(r => r.status === "checked_in")) return "occupied";
  if (linked.some(r => ["pending","confirmed"].includes(r.status))) return "booked";
  return "available";
}

function currentReservation(roomId:number, reservations:Reservation[]): Reservation|null {
  return reservations.find(r => r.room === roomId && ["checked_in","confirmed","pending"].includes(r.status)) ?? null;
}

const EMPTY_FORM = { number:"", floor:"1", type:"", capacity:"2", price:"", currency:"USD", status:"available", notes:"" };

/* btn helper */
function QBtn({color,Icon,label,onClick}:{color:string;Icon:React.ElementType;label:string;onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{flex:1,background:color,color:"#fff",border:"none",fontSize:12,padding:"0.4rem 0.4rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",fontWeight:700}}>
      <Icon size={12} strokeWidth={2.5}/>{label}
    </button>
  );
}

/* ══════════════════════════════════════════════════ */
export default function RoomsPage() {
  const { t, lang } = useLang();
  const router = useRouter();

  const DEFAULT_TYPES = [t("مفردة"),t("مزدوجة"),t("ثلاثية"),t("سويت"),t("عائلية"),t("جناح"),t("غرفة مميزة")];

  const STATUS_LABELS: Record<string,string> = {
    available:     t("متاحة"),
    booked:        t("محجوزة"),
    occupied:      t("مشغولة"),
    cleaning:      t("تنظيف"),
    maintenance:   t("صيانة"),
    out_of_service:t("خارج الخدمة"),
    archived:      t("مؤرشفة"),
  };

  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [fStatus,      setFStatus]      = useState("all");
  const [fType,        setFType]        = useState("all");
  const [fFloor,       setFFloor]       = useState("all");
  const [fAttention,   setFAttention]   = useState(false);
  const [floorsCount,  setFloorsCount]  = useState(1);
  const [roomTypes,    setRoomTypes]    = useState<string[]>(DEFAULT_TYPES);
  const [defCurrency,  setDefCurrency]  = useState("USD");

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editRoom,     setEditRoom]     = useState<Room|null>(null);
  const [viewRoom,     setViewRoom]     = useState<Room|null>(null);
  const [form,         setForm]         = useState({...EMPTY_FORM});
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState("");
  const [floorsModal,  setFloorsModal]  = useState(false);
  const [floorsInput,  setFloorsInput]  = useState("1");
  const [floorsSaving, setFloorsSaving] = useState(false);
  const [floorsMsg,    setFloorsMsg]    = useState("");
  const [floorsError,  setFloorsError]  = useState("");
  const [quickLoading, setQuickLoading] = useState<number|null>(null);

  const hotelId = typeof window!=="undefined"?(localStorage.getItem("hotel_id")??""):"";

  /* ── Load hotel meta ── */
  function loadMeta() {
    if (!hotelId) return;
    try {
      const fsRaw = localStorage.getItem(`fandqi.settings.${hotelId}`);
      const hsRaw = localStorage.getItem(`hs_${hotelId}`);
      const fs = fsRaw ? JSON.parse(fsRaw) : null;
      const hs = hsRaw ? JSON.parse(hsRaw) : null;
      const cur   = fs?.ops?.currency    || hs?.op?.currency;
      const types = fs?.rooms?.roomTypes || hs?.op?.room_types;
      const floors= fs?.rooms?.floors    || hs?.op?.floors;
      if (cur)           setDefCurrency(cur);
      if (types?.length) setRoomTypes(types);
      if (floors)        setFloorsCount(Number(floors)||1);
    } catch {}
    fetch(`${API}/hotels/${hotelId}/`,{headers:apiH()})
      .then(r=>r.json())
      .then(d=>{ if(d.floors_count){setFloorsCount(d.floors_count);setFloorsInput(String(d.floors_count));} })
      .catch(()=>{});
  }

  function fetchAll() {
    if (!hotelId){setLoading(false);return;}
    setLoading(true); setError("");
    Promise.all([
      fetch(`${API}/rooms/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()),
      fetch(`${API}/reservations/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json()).catch(()=>[]),
    ]).then(([rd,rv])=>{
      setRooms(Array.isArray(rd)?rd:rd.results??[]);
      setReservations(Array.isArray(rv)?rv:rv.results??[]);
      setLoading(false);
    }).catch(e=>{setError(e.message||t("فشل تحميل البيانات"));setLoading(false);});
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ const execute = async () => { await loadMeta(); await fetchAll(); }; execute(); },[]);

  /* ── Computed ── */
  const todayStr = new Date().toISOString().slice(0,10);

  const roomsWithStatus = useMemo(
    () => rooms.map(r=>({...r, displayStatus:computeDisplayStatus(r,reservations)})),
    [rooms, reservations]
  );

  const kpi = useMemo(()=>{
    const activeRooms   = roomsWithStatus.filter(r=>r.displayStatus!=="archived");
    const availRooms    = activeRooms.filter(r=>r.displayStatus==="available");
    return {
      activeRooms,
      needAttention:    activeRooms.filter(r=>["cleaning","maintenance","out_of_service"].includes(r.displayStatus)).length,
      occupiedCount:    activeRooms.filter(r=>r.displayStatus==="occupied").length,
      availableCount:   availRooms.length,
      bookedCount:      activeRooms.filter(r=>r.displayStatus==="booked").length,
      arrivalsToday:    reservations.filter(r=>r.check_in_date===todayStr&&["confirmed","pending"].includes(r.status)).length,
      departuresToday:  reservations.filter(r=>r.check_out_date===todayStr&&r.status==="checked_in").length,
    };
  }, [roomsWithStatus, reservations, todayStr]);

  const { activeRooms, needAttention, occupiedCount, availableCount, bookedCount,
          arrivalsToday, departuresToday } = kpi;

  const usedFloors   = useMemo(()=>[...new Set(rooms.map(r=>r.floor))].sort((a,b)=>a-b), [rooms]);
  const maxUsedFloor = usedFloors.length ? Math.max(...usedFloors) : 0;
  const allFloors    = useMemo(()=>Array.from({length:floorsCount},(_,i)=>i+1), [floorsCount]);
  const extraTypes   = useMemo(()=>[...new Set(rooms.map(r=>r.type).filter(t=>t&&!roomTypes.includes(t)))], [rooms, roomTypes]);
  const allTypes     = useMemo(()=>[...roomTypes, ...extraTypes], [roomTypes, extraTypes]);

  /* ── Filter ── */
  const filtered = useMemo(()=>roomsWithStatus.filter(r=>{
    if (fAttention && !["cleaning","maintenance","out_of_service"].includes(r.displayStatus)) return false;
    if (!fAttention && fStatus!=="all" && r.displayStatus!==fStatus) return false;
    if (fType !=="all" && r.type!==fType)           return false;
    if (fFloor!=="all" && String(r.floor)!==fFloor) return false;
    if (search){
      const q=search.toLowerCase();
      return r.number.toLowerCase().includes(q)||String(r.floor).includes(q)||r.type.toLowerCase().includes(q)||(r.notes??"").toLowerCase().includes(q);
    }
    return true;
  }), [roomsWithStatus, fAttention, fStatus, fType, fFloor, search]);

  const { floorGroups, sortedFloors } = useMemo(()=>{
    const groups: Record<number,typeof filtered> = {};
    for(const r of filtered){ if(!groups[r.floor]) groups[r.floor]=[]; groups[r.floor].push(r); }
    return { floorGroups: groups, sortedFloors: Object.keys(groups).map(Number).sort((a,b)=>a-b) };
  }, [filtered]);

  function floorStat(f:number){
    const fr = roomsWithStatus.filter(r=>r.floor===f&&r.displayStatus!=="archived");
    return {
      total:    fr.length,
      available:fr.filter(r=>r.displayStatus==="available").length,
      booked:   fr.filter(r=>r.displayStatus==="booked").length,
      occupied: fr.filter(r=>r.displayStatus==="occupied").length,
      attention:fr.filter(r=>["cleaning","maintenance","out_of_service"].includes(r.displayStatus)).length,
    };
  }

  /* ── Modals ── */
  function openAdd(){
    setEditRoom(null);
    setForm({...EMPTY_FORM,floor:"1",type:allTypes[0]??"مفردة",currency:defCurrency});
    setFormError(""); setModalOpen(true);
  }
  function openEdit(room:Room){
    setEditRoom(room);
    const safeStatus = ["available","occupied","cleaning","maintenance","out_of_service"].includes(room.status)?room.status:"available";
    setForm({number:room.number,floor:String(room.floor),type:room.type,capacity:String(room.capacity),
      price:String(room.price),currency:room.currency,status:safeStatus,notes:room.notes??""});
    setFormError(""); setModalOpen(true);
  }
  function closeModal(){setModalOpen(false);setEditRoom(null);setForm({...EMPTY_FORM});setFormError("");}
  function fld(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>){
    setForm(p=>({...p,[e.target.name]:e.target.value}));
  }

  async function archiveRoom(room:Room){
    if(!confirm(lang==="ar"?`هل تريد أرشفة الغرفة ${room.number}؟ يمكن استعادتها لاحقًا.`:`Archive room ${room.number}? It can be restored later.`)) return;
    await fetch(`${API}/rooms/${room.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"archived"})});
    fetchAll();
  }
  async function restoreRoom(room:Room){
    await fetch(`${API}/rooms/${room.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:"available"})});
    fetchAll();
  }

  /* ── Quick status change ── */
  /* ── Cross-page navigation with state ── */
  const navToReservations = useCallback((filter:{search?:string;day?:string})=>{
    try{localStorage.setItem(`fandqi.nav.reservations.${hotelId}`,JSON.stringify({...filter,ts:Date.now()}));}catch{}
    router.push("/manager/reservations");
  },[hotelId,router]);

  async function quickStatus(roomId:number, newStatus:string){
    setQuickLoading(roomId);
    try{
      await fetch(`${API}/rooms/${roomId}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:newStatus})});
      fetchAll();
    }finally{setQuickLoading(null);}
  }

  /* ── Save room ── */
  async function handleSubmit(e:React.FormEvent){
    e.preventDefault();
    if(!form.number.trim()){setFormError(t("رقم الغرفة مطلوب"));return;}
    setSaving(true); setFormError("");
    const payload={
      hotel:Number(hotelId), number:form.number.trim(),
      floor:Number(form.floor)||1, type:form.type,
      capacity:Number(form.capacity)||1,
      price:form.price!==""?Number(form.price):0,
      currency:form.currency, status:form.status, notes:form.notes,
    };
    try{
      const res = editRoom
        ? await fetch(`${API}/rooms/${editRoom.id}/`,{method:"PUT",headers:apiHJ(),body:JSON.stringify(payload)})
        : await fetch(`${API}/rooms/`,{method:"POST",headers:apiHJ(),body:JSON.stringify(payload)});
      if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(Object.values(d).flat().join(" | ")||t("حدث خطأ"));}
      closeModal(); fetchAll();
    }catch(err:unknown){setFormError(err instanceof Error?err.message:t("حدث خطأ"));}
    finally{setSaving(false);}
  }

  /* ── Save floors ── */
  async function saveFloors(){
    if(!hotelId) return;
    const val = Math.max(Number(floorsInput)||1, maxUsedFloor);
    setFloorsInput(String(val)); setFloorsSaving(true); setFloorsError(""); setFloorsMsg("");
    try{
      const res=await fetch(`${API}/hotels/${hotelId}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({floors_count:val})});
      if(!res.ok) throw new Error(t("فشل الحفظ"));
      const d=await res.json();
      const fc=d.floors_count??val;
      setFloorsCount(fc);
      try{const hs=JSON.parse(localStorage.getItem(`hs_${hotelId}`)??"{}");hs.op={...(hs.op??{}),floors:String(fc)};localStorage.setItem(`hs_${hotelId}`,JSON.stringify(hs));}catch{}
      setFloorsMsg(t("تم تحديث عدد الطوابق بنجاح."));
      setTimeout(()=>{setFloorsModal(false);setFloorsMsg("");},1200);
    }catch(e:unknown){setFloorsError(e instanceof Error?e.message:t("فشل الحفظ"));}
    finally{setFloorsSaving(false);}
  }

  /* reset all filters helper */
  function resetFilters(status:string){setFStatus(status);setFAttention(false);}

  /* ══════════════════════════════════════════════ */
  return (
    <div className="ds-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>{t("الغرف والطوابق")}</h1>
          <p>{t("إدارة مركزية للطوابق والغرف مع حالات التشغيل والأسعار والسعة.")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-success ds-btn-sm"
            onClick={()=>{setFloorsInput(String(floorsCount));setFloorsError("");setFloorsMsg("");setFloorsModal(true);}}>
            <Pencil size={13} strokeWidth={2.5}/> {t("تعديل الطوابق")}
          </button>
          <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={openAdd}>
            <Plus size={14} strokeWidth={2.5}/> {t("إضافة غرفة")}
          </button>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={()=>{fetchAll();}}>
            <RefreshCw size={13} strokeWidth={2}/> {t("تحديث")}
          </button>
        </div>
      </div>

      {/* ── KPI Cards Row 1 — Status filters ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"0.5rem"}}>
        {([
          {
            label:t("إجمالي الغرف"), value:String(activeRooms.length),
            sub:lang==="ar"?`${rooms.filter(r=>r.status==="archived").length} مؤرشفة`:`${rooms.filter(r=>r.status==="archived").length} archived`,
            Icon:Home as LucideIcon, grad:"linear-gradient(135deg,#14b8a6,#0d9488)",
            active:fStatus==="all"&&!fAttention,
            onClick:()=>{resetFilters("all");},
          },
          {
            label:t("متاحة للحجز"), value:String(availableCount),
            sub:t("جاهزة للاستقبال الآن"),
            Icon:CheckCircle2 as LucideIcon, grad:"linear-gradient(135deg,#16a34a,#15803d)",
            active:fStatus==="available"&&!fAttention,
            onClick:()=>{resetFilters("available");},
          },
          {
            label:t("مشغولة الآن"), value:String(occupiedCount),
            sub:t("فيها نزلاء حالياً"),
            Icon:PauseCircle as LucideIcon, grad:"linear-gradient(135deg,#2563eb,#1d4ed8)",
            active:fStatus==="occupied"&&!fAttention,
            onClick:()=>{resetFilters("occupied");},
          },
          {
            label:t("محجوزة"), value:String(bookedCount),
            sub:t("مؤكدة أو بانتظار وصول"),
            Icon:Calendar as LucideIcon, grad:"linear-gradient(135deg,#f59e0b,#d97706)",
            active:fStatus==="booked"&&!fAttention,
            onClick:()=>{resetFilters("booked");},
          },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;onClick:()=>void}[]).map(s=>(
          <div
            key={s.label} className="ds-kpi-card" onClick={s.onClick} title={t("اضغط للتصفية")}
            role="button" tabIndex={0} onKeyDown={e=>(e.key==="Enter"||e.key===" ")&&s.onClick()}
            aria-pressed={s.active}
            style={{
              background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff",
              cursor:"pointer", userSelect:"none", position:"relative",
              boxShadow:s.active?"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)":"0 2px 8px rgba(0,0,0,.12)",
              transform:s.active?"translateY(-3px) scale(1.02)":"none",
              transition:"all .2s ease",
            }}
          >
            {s.active&&<div style={{position:"absolute",top:7,left:8,background:"rgba(255,255,255,.25)",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800}}>● {t("نشط")}</div>}
            <div className="ds-kpi-icon"><s.Icon size={24} strokeWidth={1.6}/></div>
            <p style={{fontSize:12,fontWeight:700,opacity:.9,marginBottom:3}}>{s.label}</p>
            <p style={{fontSize:28,fontWeight:900,lineHeight:1,marginBottom:3}}>{s.value}</p>
            <p style={{fontSize:11,opacity:.75}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── KPI Cards Row 2 ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {([
          {
            label:t("تحتاج متابعة"), value:String(needAttention),
            sub:t("تنظيف أو صيانة أو إيقاف"),
            Icon:AlertTriangle as LucideIcon,
            grad:needAttention>0?"linear-gradient(135deg,#dc2626,#b91c1c)":"linear-gradient(135deg,#16a34a,#15803d)",
            active:fAttention,
            onClick:()=>{setFStatus("all");setFAttention(true);},
          },
          {
            label:t("وصول اليوم"), value:String(arrivalsToday),
            sub:t("حجوزات تصل اليوم — غرف تحتاج تجهيز"),
            Icon:Calendar as LucideIcon, grad:"linear-gradient(135deg,#a855f7,#7c3aed)",
            active:false, filterable:true,
            onClick:()=>navToReservations({day:"arrivals"}),
          },
          {
            label:t("مغادرة اليوم"), value:String(departuresToday),
            sub:t("نزلاء يغادرون — غرف ستُتاح قريباً"),
            Icon:RotateCcw as LucideIcon, grad:"linear-gradient(135deg,#0891b2,#0e7490)",
            active:false, filterable:true,
            onClick:()=>navToReservations({day:"departures"}),
          },
          // م3: أُزيل مؤشر «إيراد محتمل» من صفحة الغرف التشغيلية (مكانه التقارير/المالية)
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;filterable?:boolean;onClick:()=>void}[]).map(s=>{
          const clickable = s.active || s.filterable !== false;
          return (
          <div
            key={s.label} className="ds-kpi-card"
            onClick={s.onClick}
            title={clickable?t("اضغط للانتقال / التصفية"):""}
            style={{
              background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff",
              cursor:clickable?"pointer":"default",
              userSelect:"none", position:"relative",
              boxShadow:s.active?"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)":"0 2px 8px rgba(0,0,0,.12)",
              transform:s.active?"translateY(-3px) scale(1.02)":"none",
              transition:"all .2s ease",
            }}
          >
            {s.active&&<div style={{position:"absolute",top:7,left:8,background:"rgba(255,255,255,.25)",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800}}>● {t("نشط")}</div>}
            <div className="ds-kpi-icon"><s.Icon size={24} strokeWidth={1.6}/></div>
            <p style={{fontSize:12,fontWeight:700,opacity:.9,marginBottom:3}}>{s.label}</p>
            <p style={{fontSize:s.label.includes("إشغال")||s.label.includes("Occupancy")?22:28,fontWeight:900,lineHeight:1,marginBottom:3}}>{s.value}</p>
            <p style={{fontSize:11,opacity:.75}}>{s.sub}</p>
            {s.filterable&&<p style={{fontSize:10,opacity:.6,marginTop:3,textDecoration:"underline"}}>{t("انقر للانتقال إلى الحجوزات")} ↗</p>}
          </div>
          );
        })}
      </div>

      {/* ── Floor overview ── */}
      <div className="ds-card-p" style={{marginBottom:"1.25rem"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
          <h2 style={{fontSize:"var(--text-base)",fontWeight:800,color:"var(--color-heading)",display:"flex",alignItems:"center",gap:"0.4rem"}}>
            <LayoutGrid size={15} strokeWidth={2}/> {t("نظرة عامة على الطوابق")}
          </h2>
          {(fFloor!=="all"||fAttention||fStatus!=="all")&&(
            <button onClick={()=>{setFFloor("all");setFStatus("all");setFAttention(false);}} style={{fontSize:12,color:"#4f46e5",background:"#eef2ff",border:"none",borderRadius:20,padding:"3px 12px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              <X size={11}/> {t("إلغاء الفلتر")}
            </button>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"1rem"}}>
          {allFloors.map(f=>{
            const fs = floorStat(f);
            const pct = fs.total>0 ? Math.round((fs.available/fs.total)*100) : 0;
            const isSelected = fFloor===String(f);
            const hasRooms = fs.total>0;
            return (
              <div key={f}
                onClick={()=>setFFloor(isSelected?"all":String(f))}
                style={{
                  border: isSelected?"2px solid #4f46e5":"1px solid var(--color-border)",
                  borderRadius:14, padding:"1.2rem 1.3rem",
                  background: isSelected?"linear-gradient(135deg,#eef2ff,#f5f3ff)":"#fff",
                  cursor:"pointer", transition:"transform 180ms ease,box-shadow 180ms ease",
                  boxShadow: isSelected?"0 6px 20px rgba(79,70,229,.20)":"0 2px 8px rgba(0,0,0,.06)",
                  opacity: hasRooms?1:.5, position:"relative", overflow:"hidden",
                }}
                onMouseEnter={e=>{if(!isSelected){(e.currentTarget as HTMLDivElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLDivElement).style.boxShadow="0 6px 18px rgba(0,0,0,.12)";}}}
                onMouseLeave={e=>{if(!isSelected){(e.currentTarget as HTMLDivElement).style.transform="";(e.currentTarget as HTMLDivElement).style.boxShadow="0 2px 8px rgba(0,0,0,.06)";}}}>
                <div style={{position:"absolute",top:0,right:0,left:0,height:4,background:isSelected?"linear-gradient(90deg,#4f46e5,#7c3aed)":"linear-gradient(90deg,#2563eb,#4f46e5)",borderRadius:"14px 14px 0 0"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.8rem",marginTop:"0.3rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:34,height:34,borderRadius:9,background:isSelected?"#4f46e5":"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Building2 size={17} color="#fff" strokeWidth={2}/>
                    </div>
                    <p style={{fontSize:16,fontWeight:900,color:isSelected?"#4f46e5":"var(--color-heading)"}}>{lang==="ar"?`الطابق ${f}`:`Floor ${f}`}</p>
                  </div>
                  <span style={{background:isSelected?"#4f46e5":"#1e293b",color:"#fff",borderRadius:20,padding:"3px 11px",fontSize:12,fontWeight:700}}>{fs.total}</span>
                </div>
                <div style={{marginBottom:"0.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:5}}>
                    <span>{t("نسبة الإتاحة")}</span>
                    <span style={{fontWeight:700,color:"#16a34a"}}>{pct}%</span>
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:6,height:8,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:6,width:`${pct}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",transition:"width 500ms ease"}}/>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:"0.75rem"}}>
                  {[
                    {lbl:t("متاحة"),  val:fs.available, dot:"#16a34a"},
                    {lbl:t("مشغولة"), val:fs.occupied,  dot:"#2563eb"},
                    {lbl:t("محجوزة"), val:fs.booked,    dot:"#f59e0b"},
                    {lbl:t("صيانة"),  val:fs.attention,  dot:"#dc2626"},
                  ].map(({lbl,val,dot})=>(
                    <div key={lbl} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{display:"flex",alignItems:"center",gap:7,fontSize:13,color:"#475569"}}>
                        <span style={{width:9,height:9,borderRadius:"50%",background:dot,display:"inline-block",flexShrink:0,opacity:val>0?1:.35}}/>
                        {lbl}
                      </span>
                      <span style={{fontWeight:800,fontSize:14,color:val>0?dot:"#cbd5e1"}}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="ds-card-p" style={{marginBottom:"1.25rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"0.6rem"}}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5"/> {t("بحث برقم الغرفة أو النوع أو الملاحظة")}</p>
            <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("اكتب للبحث...")} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><ListFilter size={13} strokeWidth={2.2} color="#4f46e5"/> {t("الحالة")}</p>
            <select className="select" value={fAttention?"attention":fStatus} onChange={e=>{if(e.target.value==="attention"){setFAttention(true);setFStatus("all");}else{setFAttention(false);setFStatus(e.target.value);}}}>
              <option value="all">{t("الكل")}</option>
              {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              <option value="attention">{t("تحتاج متابعة")}</option>
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Home size={13} strokeWidth={2.2} color="#4f46e5"/> {t("نوع الغرفة")}</p>
            <select className="select" value={fType} onChange={e=>setFType(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              {allTypes.map(tp=><option key={tp} value={tp}>{tp}</option>)}
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Building2 size={13} strokeWidth={2.2} color="#4f46e5"/> {t("الطابق")}</p>
            <select className="select" value={fFloor} onChange={e=>setFFloor(e.target.value)}>
              <option value="all">{t("الكل")}</option>
              {[...new Set([...allFloors,...usedFloors])].sort((a,b)=>a-b).map(f=>(
                <option key={f} value={String(f)}>{lang==="ar"?`الطابق ${f}`:`Floor ${f}`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p style={{color:"var(--color-danger)",marginBottom:"1rem"}}>{error}</p>}

      {/* ── Rooms by floor ── */}
      {loading ? (
        <p style={{color:"var(--color-muted)",textAlign:"center",padding:"2rem"}}>{t("جاري التحميل...")}</p>
      ) : rooms.filter(r=>r.status!=="archived").length===0&&fStatus==="all" ? (
        <div style={{textAlign:"center",padding:"4rem 2rem",color:"var(--color-muted)"}}>
          <Building2 size={48} strokeWidth={1.2} style={{color:"var(--color-muted)",marginBottom:12}}/>
          <p style={{fontWeight:900,fontSize:18,color:"var(--color-heading)",marginBottom:8}}>{t("لا توجد غرف بعد")}</p>
          <p style={{fontSize:14}}>{t("ابدأ بإضافة أول غرفة لهذا الفندق.")}</p>
        </div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"3rem",color:"var(--color-muted)"}}>
          <Search size={40} strokeWidth={1.2} style={{color:"var(--color-muted)",marginBottom:8}}/>
          <p style={{fontWeight:700}}>{t("لا توجد غرف مطابقة للفلتر الحالي")}</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"2rem"}}>
          {sortedFloors.map(floor=>{
            const fr = floorGroups[floor];
            const fs = floorStat(floor);
            return (
              <div key={floor}>
                {/* ── Floor strip ── */}
                <div style={{background:"linear-gradient(135deg,#1e293b 0%,#334155 100%)",borderRadius:14,padding:"0.9rem 1.3rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:"0.9rem",boxShadow:"0 3px 12px rgba(0,0,0,0.15)"}}>
                  <div style={{background:"#2563eb",borderRadius:10,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Building2 size={20} color="#fff" strokeWidth={2}/>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:3}}>{lang==="ar"?`الطابق ${floor}`:`Floor ${floor}`}</p>
                    <div style={{display:"flex",gap:14,fontSize:12,flexWrap:"wrap"}}>
                      <span style={{color:"rgba(255,255,255,.65)"}}>{fr.length} {lang==="ar"?(fr.length===1?"غرفة":"غرف"):(fr.length===1?"room":"rooms")}</span>
                      {fs.available>0&&<span style={{color:"#86efac",fontWeight:700}}>{fs.available} {t("متاحة")}</span>}
                      {fs.booked>0&&<span style={{color:"#fde68a",fontWeight:700}}>{fs.booked} {t("محجوزة")}</span>}
                      {fs.occupied>0&&<span style={{color:"#93c5fd",fontWeight:700}}>{fs.occupied} {t("مشغولة")}</span>}
                      {fs.attention>0&&<span style={{color:"#fca5a5",fontWeight:700}}>{fs.attention} {t("تحتاج متابعة")}</span>}
                    </div>
                  </div>
                  <span style={{background:"rgba(255,255,255,.15)",borderRadius:20,padding:"4px 16px",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>
                    {fr.length} {lang==="ar"?(fr.length===1?"غرفة":"غرف"):(fr.length===1?"room":"rooms")}
                  </span>
                </div>

                {/* Room cards */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.1rem"}}>
                  {fr.map(room=>{
                    const ds = room.displayStatus;
                    const isArchived = ds==="archived";
                    const curRes = currentReservation(room.id, reservations);
                    const guestName = curRes ? `${curRes.guest_first_name??""} ${curRes.guest_last_name??""}`.trim() : "";
                    const isLoading = quickLoading===room.id;
                    const accentMap: Record<string,string> = {
                      available:"#16a34a", booked:"#f59e0b", occupied:"#2563eb",
                      cleaning:"#f97316", maintenance:"#dc2626", out_of_service:"#64748b", archived:"#94a3b8",
                    };
                    const accent = accentMap[ds]??"#94a3b8";
                    return (
                      <div key={room.id} style={{
                        background:"#fff", borderRadius:16, padding:"1.2rem 1.3rem",
                        display:"flex", flexDirection:"column", gap:"0.65rem",
                        boxShadow:"0 2px 10px rgba(0,0,0,0.07)",
                        border:"1px solid var(--color-border)",
                        borderRight:`5px solid ${accent}`,
                        opacity:isArchived?.75:1,
                        transition:"transform 200ms ease,box-shadow 200ms ease",
                      }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLDivElement).style.boxShadow="0 8px 24px rgba(0,0,0,0.12)";}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform="";(e.currentTarget as HTMLDivElement).style.boxShadow="0 2px 10px rgba(0,0,0,0.07)";}}>

                        {/* Top row */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{...statusStyle(ds),fontSize:12,padding:"4px 12px",borderRadius:20}}>
                            {isLoading?"...":STATUS_LABELS[ds]??ds}
                          </span>
                          <span style={{background:"#1e293b",color:"#fff",borderRadius:20,padding:"4px 13px",fontSize:13,fontWeight:700}}>
                            {lang==="ar"?`غرفة ${room.number}`:`Room ${room.number}`}
                          </span>
                        </div>

                        {/* Type */}
                        <p style={{fontSize:18,fontWeight:900,color:"var(--color-heading)",borderBottom:"1px solid #f1f5f9",paddingBottom:"0.5rem"}}>{room.type}</p>

                        {/* Current guest (if occupied/booked) */}
                        {guestName&&(
                          <div style={{background:ds==="occupied"?"#eff6ff":"#fffbeb",borderRadius:8,padding:"7px 11px",fontSize:13,fontWeight:700,color:ds==="occupied"?"#1d4ed8":"#92400e",display:"flex",alignItems:"center",gap:6,border:`1px solid ${ds==="occupied"?"#bfdbfe":"#fde68a"}`}}>
                            <Users size={13} strokeWidth={2}/>
                            {ds==="occupied"?t("مقيم: "):t("قادم: ")}{guestName}
                            {curRes?.booking_number&&<span style={{fontSize:11,opacity:.7,marginRight:"auto"}}>#{curRes.booking_number}</span>}
                          </div>
                        )}

                        {/* Info grid */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.45rem"}}>
                          <div style={{background:"#f8fafc",borderRadius:8,padding:"7px 10px",fontSize:13,display:"flex",alignItems:"center",gap:6,fontWeight:700,color:"#1e293b"}}>
                            <Building2 size={14} color="#4f46e5" strokeWidth={1.8}/>{lang==="ar"?`الطابق ${room.floor}`:`Floor ${room.floor}`}
                          </div>
                          <div style={{background:"#f8fafc",borderRadius:8,padding:"7px 10px",fontSize:13,display:"flex",alignItems:"center",gap:6,fontWeight:700,color:"#1e293b"}}>
                            <Users size={14} color="#4f46e5" strokeWidth={1.8}/>{t("السعة")}: {room.capacity}
                          </div>
                          <div style={{background:"#f0f9ff",borderRadius:8,padding:"7px 10px",fontSize:13,gridColumn:"1/-1",display:"flex",alignItems:"center",gap:6,fontWeight:700,color:"#1e40af"}}>
                            <Banknote size={14} color="#2563eb" strokeWidth={1.8}/>{Number(room.price).toLocaleString("en-US")} {room.currency} / {t("الليلة")}
                          </div>
                        </div>

                        {/* Notes */}
                        <div style={{background:"#f8fafc",border:"1px dashed #e2e8f0",borderRadius:9,padding:"8px 11px",fontSize:12,color:"#475569",display:"flex",alignItems:"flex-start",gap:6,minHeight:38}}>
                          <FileText size={13} color="#94a3b8" strokeWidth={1.8} style={{flexShrink:0,marginTop:1}}/>
                          {room.notes?.trim()||t("لا توجد ملاحظات")}
                        </div>

                        {/* ── Status-specific quick actions ── */}
                        {ds==="available"&&!isArchived&&(
                          <div style={{display:"flex",gap:"0.4rem"}}>
                            <QBtn color="#f97316" Icon={Sparkles} label={t("تنظيف")} onClick={()=>quickStatus(room.id,"cleaning")}/>
                            <QBtn color="#dc2626" Icon={Wrench}   label={t("صيانة")} onClick={()=>quickStatus(room.id,"maintenance")}/>
                          </div>
                        )}
                        {ds==="cleaning"&&(
                          <div style={{display:"flex",gap:"0.4rem"}}>
                            <QBtn color="#16a34a" Icon={CheckCircle2} label={t("تم التنظيف — متاحة")} onClick={()=>quickStatus(room.id,"available")}/>
                          </div>
                        )}
                        {ds==="maintenance"&&(
                          <div style={{display:"flex",gap:"0.4rem"}}>
                            <QBtn color="#16a34a" Icon={CheckCircle2} label={t("اكتملت الصيانة — متاحة")} onClick={()=>quickStatus(room.id,"available")}/>
                          </div>
                        )}
                        {ds==="out_of_service"&&(
                          <div style={{display:"flex",gap:"0.4rem"}}>
                            <QBtn color="#16a34a" Icon={CheckCircle2} label={t("إعادة التشغيل")} onClick={()=>quickStatus(room.id,"available")}/>
                          </div>
                        )}
                        {ds==="occupied"&&(
                          <div style={{display:"flex",gap:"0.4rem"}}>
                            <button onClick={()=>navToReservations({search:room.number})} style={{flex:1,background:"#4f46e5",color:"#fff",border:"none",fontSize:12,padding:"0.4rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",fontWeight:700}}>
                              <FileText size={12}/> {t("حجز الغرفة")}
                            </button>
                            <button onClick={()=>router.push("/manager/folio")} style={{flex:1,background:"#0891b2",color:"#fff",border:"none",fontSize:12,padding:"0.4rem",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",fontWeight:700}}>
                              <BookOpen size={12}/> {t("الفوليو")}
                            </button>
                          </div>
                        )}

                        {/* ── Standard actions ── */}
                        <div style={{display:"flex",gap:"0.4rem",marginTop:"0.1rem"}}>
                          <button style={{flex:1,background:"#4f46e5",color:"#fff",border:"none",fontSize:12,padding:"0.5rem",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontWeight:700,cursor:"pointer"}} onClick={()=>setViewRoom(room)}>
                            <Eye size={13} strokeWidth={2}/> {t("عرض")}
                          </button>
                          <button style={{flex:1,background:"#1e293b",color:"#fff",border:"none",fontSize:12,padding:"0.5rem",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontWeight:700,cursor:"pointer"}} onClick={()=>openEdit(room)}>
                            <Pencil size={13} strokeWidth={2}/> {t("تعديل")}
                          </button>
                          {isArchived ? (
                            <button style={{flex:1,background:"#16a34a",color:"#fff",border:"none",fontSize:12,padding:"0.5rem",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontWeight:700,cursor:"pointer"}} onClick={()=>restoreRoom(room)}>
                              <RotateCcw size={13} strokeWidth={2}/> {t("استعادة")}
                            </button>
                          ):(
                            <button style={{flex:1,background:"#64748b",color:"#fff",border:"none",fontSize:12,padding:"0.5rem",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontWeight:700,cursor:"pointer"}} onClick={()=>archiveRoom(room)}>
                              <Archive size={13} strokeWidth={2}/> {t("أرشفة")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ View Room Modal ════ */}
      {viewRoom && (()=>{
        const ds  = computeDisplayStatus(viewRoom, reservations);
        const cur = currentReservation(viewRoom.id, reservations);
        const gn  = cur ? `${cur.guest_first_name??""} ${cur.guest_last_name??""}`.trim() : "";
        return (
          <div className="ds-modal-backdrop" onClick={()=>setViewRoom(null)}>
            <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:580}}>
              <div className="ds-modal-head">
                <div>
                  <h2 style={{marginBottom:3}}>{lang==="ar"?`غرفة ${viewRoom.number}`:`Room ${viewRoom.number}`} — {viewRoom.type}</h2>
                  <span style={{...statusStyle(ds),fontSize:12}}>{STATUS_LABELS[ds]??ds}</span>
                </div>
                <button className="icon-btn" onClick={()=>setViewRoom(null)} aria-label={t("إغلاق")}><X size={18}/></button>
              </div>
              <div className="ds-modal-body">

                {/* Current guest banner */}
                {gn&&(
                  <div style={{background:ds==="occupied"?"#eff6ff":"#fffbeb",border:`1px solid ${ds==="occupied"?"#bfdbfe":"#fde68a"}`,borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:10}}>
                    <Users size={16} color={ds==="occupied"?"#2563eb":"#d97706"}/>
                    <div>
                      <p style={{fontWeight:800,fontSize:14,color:ds==="occupied"?"#1d4ed8":"#92400e"}}>{ds==="occupied"?t("مقيم حالياً: "):t("حجز قادم: ")}{gn}</p>
                      {cur?.booking_number&&<p style={{fontSize:12,color:"#64748b",marginTop:2}}>{t("رقم الحجز")}: {cur.booking_number} | {t("دخول")}: {cur.check_in_date??"-"} | {t("خروج")}: {cur.check_out_date??"-"}</p>}
                    </div>
                    {ds==="occupied"&&(
                      <div style={{display:"flex",gap:6,marginRight:"auto"}}>
                        <button onClick={()=>{setViewRoom(null);navToReservations({search:viewRoom.number});}} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                          <FileText size={12}/> {t("حجز الغرفة")}
                        </button>
                        <button onClick={()=>{setViewRoom(null);router.push("/manager/folio");}} style={{background:"#0891b2",color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                          <BookOpen size={12}/> {t("فوليو الغرفة")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Info grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem",marginBottom:"0.75rem"}}>
                  {[
                    [t("رقم الغرفة"),   viewRoom.number],
                    [t("الطابق"),       lang==="ar"?`الطابق ${viewRoom.floor}`:`Floor ${viewRoom.floor}`],
                    [t("نوع الغرفة"),   viewRoom.type],
                    [t("السعة"),        lang==="ar"?`${viewRoom.capacity} أشخاص`:`${viewRoom.capacity} persons`],
                    [t("حالة الغرفة"),  STATUS_LABELS[ds]??ds],
                    [t("السعر/الليلة"), `${Number(viewRoom.price).toLocaleString("en-US")} ${viewRoom.currency}`],
                    [t("تاريخ الإنشاء"),viewRoom.created_at?viewRoom.created_at.slice(0,10):"—"],
                    [t("آخر تحديث"),    viewRoom.updated_at?viewRoom.updated_at.slice(0,10):"—"],
                  ].map(([lbl,val])=>(
                    <div key={String(lbl)} style={{padding:"0.6rem 0.75rem",background:"var(--color-surface)",borderRadius:8,border:"1px solid var(--color-border)"}}>
                      <p style={{fontSize:10,color:"var(--color-muted)",marginBottom:3}}>{lbl}</p>
                      <p style={{fontSize:13,fontWeight:700,color:"var(--color-heading)"}}>{val}</p>
                    </div>
                  ))}
                  <div style={{gridColumn:"1/-1",padding:"0.6rem 0.75rem",background:"var(--color-surface)",borderRadius:8,border:"1px solid var(--color-border)"}}>
                    <p style={{fontSize:10,color:"var(--color-muted)",marginBottom:3}}>{t("الملاحظات")}</p>
                    <p style={{fontSize:13,fontWeight:700,color:"var(--color-heading)"}}>{viewRoom.notes?.trim()||t("لا توجد ملاحظات")}</p>
                  </div>
                </div>

                {/* Quick status change in modal */}
                {!["archived","occupied","booked"].includes(ds)&&(
                  <div style={{borderTop:"1px solid var(--color-border)",paddingTop:"0.75rem"}}>
                    <p style={{fontSize:12,color:"var(--color-muted)",marginBottom:"0.5rem",fontWeight:700}}>{t("تغيير الحالة السريع")}:</p>
                    <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                      {ds!=="available"&&<button onClick={()=>{quickStatus(viewRoom.id,"available");setViewRoom(null);}} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><CheckCircle2 size={12}/> {t("متاحة")}</button>}
                      {ds!=="cleaning"&&<button onClick={()=>{quickStatus(viewRoom.id,"cleaning");setViewRoom(null);}} style={{background:"#f97316",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Sparkles size={12}/> {t("تنظيف")}</button>}
                      {ds!=="maintenance"&&<button onClick={()=>{quickStatus(viewRoom.id,"maintenance");setViewRoom(null);}} style={{background:"#dc2626",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Wrench size={12}/> {t("صيانة")}</button>}
                      {ds!=="out_of_service"&&<button onClick={()=>{quickStatus(viewRoom.id,"out_of_service");setViewRoom(null);}} style={{background:"#64748b",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><PauseCircle size={12}/> {t("خارج الخدمة")}</button>}
                    </div>
                  </div>
                )}
              </div>
              <div className="ds-modal-foot">
                <button className="ds-btn ds-btn-neutral" onClick={()=>setViewRoom(null)}>{t("إغلاق")}</button>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <button className="ds-btn ds-btn-edit" style={{display:"flex",alignItems:"center",gap:5}} onClick={()=>{setViewRoom(null);openEdit(viewRoom);}}>
                    <Pencil size={13}/> {t("تعديل")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════ Edit Floors Modal ════ */}
      {floorsModal && (
        <div className="ds-modal-backdrop" onClick={()=>setFloorsModal(false)}>
          <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="ds-modal-head">
              <h2>{t("تعديل عدد الطوابق")}</h2>
              <button className="icon-btn" onClick={()=>setFloorsModal(false)} aria-label={t("إغلاق")}><X size={18}/></button>
            </div>
            <div className="ds-modal-body">
              <p style={{fontSize:"var(--text-sm)",fontWeight:800,color:"var(--color-heading)",marginBottom:"0.75rem"}}>{t("إعدادات الطوابق")}</p>
              <div className="field" style={{marginBottom:"0.75rem"}}>
                <label className="field-label" style={{display:"flex",alignItems:"center",gap:5}}>
                  <Building2 size={13} color="#4f46e5" strokeWidth={2}/> {t("عدد الطوابق المفعلة")}
                </label>
                <input className="input" type="number" min={maxUsedFloor>0?maxUsedFloor:1} max="100" value={floorsInput} onChange={e=>setFloorsInput(e.target.value)} />
                <p style={{fontSize:"0.72rem",color:"var(--color-muted)",marginTop:4}}>{t("لا يمكن تقليل العدد عن أعلى طابق مستخدم حاليًا.")}</p>
              </div>
              {usedFloors.length>0 && (
                <div style={{marginBottom:"0.75rem"}}>
                  <label className="field-label">{t("الطوابق المستخدمة حاليًا")}</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.35rem",marginTop:"0.35rem"}}>
                    {usedFloors.map(f=>(
                      <span key={f} style={{background:"#e0e7ff",color:"#3730a3",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{lang==="ar"?`الطابق ${f}`:`Floor ${f}`}</span>
                    ))}
                  </div>
                </div>
              )}
              {floorsError && <p style={{color:"var(--color-danger)",fontSize:"var(--text-sm)"}}>{floorsError}</p>}
              {floorsMsg   && <p style={{color:"#15803d",fontSize:"var(--text-sm)",fontWeight:700}}>{floorsMsg}</p>}
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={()=>setFloorsModal(false)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={saveFloors} disabled={floorsSaving} style={{display:"flex",alignItems:"center",gap:5}}>
                {floorsSaving?t("جارٍ الحفظ..."):<><Save size={13}/> {t("حفظ الطوابق")}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Add / Edit Room Modal ════ */}
      {modalOpen && (
        <div className="ds-modal-backdrop" onClick={closeModal}>
          <div className="ds-modal-card wide" onClick={e=>e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2 style={{display:"flex",alignItems:"center",gap:8}}>
                <Home size={16} color="#4f46e5"/>
                {editRoom?t("تعديل غرفة"):t("إضافة غرفة جديدة")}
              </h2>
              <button className="icon-btn" onClick={closeModal} aria-label={t("إغلاق")}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="ds-modal-body">
                {formError && (
                  <p style={{color:"var(--color-danger)",marginBottom:"0.75rem",fontSize:"var(--text-sm)",background:"#fef2f2",padding:"0.5rem 0.75rem",borderRadius:8}}>{formError}</p>
                )}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                  <div className="field">
                    <label className="field-label" style={{display:"flex",alignItems:"center",gap:4}}>
                      <Home size={12} color="#4f46e5"/> {t("رقم الغرفة")} <span style={{color:"var(--color-danger)"}}>*</span>
                    </label>
                    <input className="input" name="number" value={form.number} onChange={fld} placeholder={lang==="ar"?"مثال: 101":"e.g. 101"} />
                  </div>
                  <div className="field">
                    <label className="field-label" style={{display:"flex",alignItems:"center",gap:4}}>
                      <Building2 size={12} color="#4f46e5"/> {t("الطابق")}
                    </label>
                    <select className="select" name="floor" value={form.floor} onChange={fld}>
                      {allFloors.map(n=><option key={n} value={n}>{lang==="ar"?`الطابق ${n}`:`Floor ${n}`}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" style={{display:"flex",alignItems:"center",gap:4}}>
                      <LayoutGrid size={12} color="#4f46e5"/> {t("نوع الغرفة")}
                    </label>
                    <select className="select" name="type" value={form.type} onChange={fld}>
                      {allTypes.map(tp=><option key={tp} value={tp}>{tp}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                  <div className="field">
                    <label className="field-label" style={{display:"flex",alignItems:"center",gap:4}}>
                      <Users size={12} color="#4f46e5"/> {t("السعة")}
                    </label>
                    <select className="select" name="capacity" value={form.capacity} onChange={fld}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n} {lang==="ar"?(n===1?"شخص":"أشخاص"):(n===1?"person":"persons")}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" style={{display:"flex",alignItems:"center",gap:4}}>
                      <ListFilter size={12} color="#4f46e5"/> {t("حالة الغرفة")}
                    </label>
                    <select className="select" name="status" value={form.status} onChange={fld}>
                      <option value="available">{t("متاحة")}</option>
                      <option value="occupied">{t("مشغولة")}</option>
                      <option value="cleaning">{t("تنظيف")}</option>
                      <option value="maintenance">{t("صيانة")}</option>
                      <option value="out_of_service">{t("خارج الخدمة")}</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" style={{display:"flex",alignItems:"center",gap:4}}>
                      <Banknote size={12} color="#4f46e5"/> {t("السعر / الليلة")}
                    </label>
                    <input className="input" name="price" type="number" step="0.01" min="0" value={form.price} onChange={fld} placeholder="0.00" />
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                  <div className="field">
                    <label className="field-label" style={{display:"flex",alignItems:"center",gap:4}}>
                      <Banknote size={12} color="#4f46e5"/> {t("العملة")}
                    </label>
                    <select className="select" name="currency" value={form.currency} onChange={fld}>
                      {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" style={{display:"flex",alignItems:"center",gap:4}}>
                      <FileText size={12} color="#4f46e5"/> {t("ملاحظات")}
                    </label>
                    <textarea className="textarea" name="notes" value={form.notes} onChange={fld} rows={1} placeholder={lang==="ar"?"ملاحظات داخلية عن الغرفة...":"Internal notes about the room..."} />
                  </div>
                </div>

                <div style={{padding:"0.5rem 0.85rem",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,fontSize:12,color:"#1d4ed8",fontWeight:600,display:"flex",alignItems:"center",gap:7}}>
                  <Banknote size={13} color="#2563eb"/>
                  {t("السعر يُستخدم تلقائياً في حساب تكلفة الحجوزات — لا يمكن تعديله من موظف الاستقبال.")}
                </div>
              </div>
              <div className="ds-modal-foot">
                <button type="button" className="ds-btn ds-btn-neutral" onClick={closeModal} disabled={saving} style={{display:"flex",alignItems:"center",gap:5}}>
                  <X size={13}/> {t("إلغاء")}
                </button>
                <button type="submit" className="ds-btn ds-btn-primary" disabled={saving} style={{display:"flex",alignItems:"center",gap:5}}>
                  {saving?t("جارٍ الحفظ..."):<><Save size={13}/> {editRoom?t("تحديث الغرفة"):t("إضافة الغرفة")}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
