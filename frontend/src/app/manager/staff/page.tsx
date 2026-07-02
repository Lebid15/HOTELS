"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Users, CheckCircle2, PauseCircle, Bell, Wrench, Search, ListFilter, Phone, Mail, Pencil, Key, RefreshCw, X, Clock, Calendar, User, AlertTriangle, FileText } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ } from "@/lib/api";

// يحوّل استجابة خطأ DRF (كائن/مصفوفة/نص) إلى رسالة عربية واحدة مقروءة بدل JSON خام.
// رسائل الباك‑إند أصبحت عربية (LANGUAGE_CODE=ar) فتظهر مباشرة للمستخدم.
function flattenErr(d: unknown): string {
  if (d == null) return "";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(flattenErr).filter(Boolean).join(" ");
  if (typeof d === "object") return Object.values(d as Record<string, unknown>).map(flattenErr).filter(Boolean).join(" — ");
  return String(d);
}

type StaffRole   = "receptionist"|"cashier"|"housekeeping"|"maintenance"|"restaurant"|"room_service"|"supervisor";
type StaffShift  = "morning"|"evening"|"night"|"flexible";
type StaffStatus = "active"|"suspended"|"archived";
type ModalType   = "add"|"edit"|"view"|"password"|"shift"|"permissions"|null;

interface Staff {
  id:number; hotel:number; full_name:string; role:StaffRole;
  phone:string; email:string; shift:StaffShift; status:StaffStatus;
  shift_start?:string|null; shift_end?:string|null;   // م5: نافذة الوردية
  permissions:string[]; notes:string; created_at:string; updated_at:string;
  username?:string|null; has_login?:boolean;   // د‑5: حساب الدخول
}

/* ─── Constants ─────────────────────────────────────────── */
const ALL_PERMS=["reservations","check_in_out","payments","rooms","room_service","housekeeping","maintenance","reports"];
const DEFAULT_PERMS:Record<string,string[]>={
  receptionist:["reservations","check_in_out"],cashier:["payments"],
  housekeeping:["housekeeping"],maintenance:["maintenance"],
  restaurant:["room_service"],room_service:["room_service"],
  supervisor:["reservations","check_in_out","payments","rooms","reports"],
};
const ROLE_COLORS:Record<string,{bg:string;text:string;avatar:string}> = {
  receptionist:{bg:"#dbeafe",text:"#1d4ed8",avatar:"linear-gradient(135deg,#3b82f6,#1d4ed8)"},
  cashier:     {bg:"#dcfce7",text:"#15803d",avatar:"linear-gradient(135deg,#22c55e,#15803d)"},
  housekeeping:{bg:"#f3e8ff",text:"#7c3aed",avatar:"linear-gradient(135deg,#a855f7,#7c3aed)"},
  maintenance: {bg:"#ffedd5",text:"#c2410c",avatar:"linear-gradient(135deg,#f97316,#c2410c)"},
  restaurant:  {bg:"#fee2e2",text:"#b91c1c",avatar:"linear-gradient(135deg,#ef4444,#b91c1c)"},
  room_service:{bg:"#cffafe",text:"#0e7490",avatar:"linear-gradient(135deg,#22d3ee,#0e7490)"},
  supervisor:  {bg:"#e2e8f0",text:"#1e293b",avatar:"linear-gradient(135deg,#64748b,#1e293b)"},
};
const STATUS_STYLE:Record<string,React.CSSProperties>={
  active:   {background:"#16a34a",color:"#fff",border:"none"},
  suspended:{background:"#f59e0b",color:"#fff",border:"none"},
  archived: {background:"#64748b",color:"#fff",border:"none"},
};
const SHIFT_STYLE:Record<string,React.CSSProperties>={
  morning: {background:"#f97316",color:"#fff"},
  evening: {background:"#4f46e5",color:"#fff"},
  night:   {background:"#7c3aed",color:"#fff"},
  flexible:{background:"#16a34a",color:"#fff"},
};
const SHIFT_ICONS:Record<string,string>={morning:"🌅",evening:"🌆",night:"🌙",flexible:"🔄"};

function initials(n:string){return n.split(" ").map(w=>w[0]??"").join("").toUpperCase().slice(0,2)||"?";}
function fmtDate(d:string){try{return new Date(d).toLocaleDateString("ar-SA");}catch{return d||"—";}}
function btnSm(color:string):React.CSSProperties{
  return{padding:"0.3rem 0.5rem",fontSize:10,fontWeight:700,cursor:"pointer",
    border:`1px solid ${color}30`,borderRadius:6,background:`${color}12`,color,whiteSpace:"nowrap"};
}

/* ══════════════════════════════════════════════════════════ */
export default function StaffPage() {
  const { t, lang } = useLang();

  const ROLE_LABELS:Record<string,string>={
    receptionist:t("موظف استقبال"),cashier:t("كاشير"),housekeeping:t("تنظيف"),
    maintenance:t("صيانة"),restaurant:t("مطعم"),room_service:t("خدمة غرف"),supervisor:t("مشرف"),
  };
  const SHIFT_LABELS:Record<string,string>={morning:t("صباحية"),evening:t("مسائية"),night:t("ليلية"),flexible:t("حسب الحاجة")};
  const STATUS_LABELS:Record<string,string>={active:t("فعال"),suspended:t("موقوف"),archived:t("مؤرشف")};
  const PERM_LABELS:Record<string,string>={
    reservations:t("الحجوزات"),check_in_out:t("الدخول والمغادرة"),payments:t("المدفوعات"),
    rooms:t("الغرف"),room_service:t("خدمة الغرف"),housekeeping:t("التنظيف"),maintenance:t("الصيانة"),reports:t("التقارير"),
  };

  const hotelId = typeof window!=="undefined"?(localStorage.getItem("hotel_id")??""):"";

  const [staff,    setStaff]    = useState<Staff[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [fRole,    setFRole]    = useState("all");
  const [fStatus,  setFStatus]  = useState("all");
  const [toast,    setToast]    = useState("");
  const [modal,    setModal]    = useState<ModalType>(null);
  const [selStaff, setSelStaff] = useState<Staff|null>(null);

  /* Add/Edit form */
  const [fName,   setFName]   = useState("");
  const [fRole2,  setFRole2]  = useState<StaffRole>("receptionist");
  const [fPhone,  setFPhone]  = useState("");
  const [fEmail,  setFEmail]  = useState("");
  const [fShift2, setFShift2] = useState<StaffShift>("morning");
  const [fShiftStart, setFShiftStart] = useState("");   // م5
  const [fShiftEnd,   setFShiftEnd]   = useState("");
  const [fNotes,  setFNotes]  = useState("");
  const [fPerms,  setFPerms]  = useState<string[]>([]);
  const [fUsername, setFUsername] = useState("");   // د‑5: حساب دخول الموظف
  const [fPassword, setFPassword] = useState("");
  const [formErr, setFormErr] = useState("");
  const [saving,  setSaving]  = useState(false);

  /* Password modal */
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwUser, setPwUser] = useState("");   // د‑5: اسم مستخدم عند إنشاء حساب لموظف بلا دخول
  const [pwErr, setPwErr] = useState("");

  /* Shift modal */
  const [newShift, setNewShift] = useState<StaffShift>("morning");

  /* Permissions modal */
  const [editPerms, setEditPerms] = useState<string[]>([]);

  function showToast(m:string){setToast(m);setTimeout(()=>setToast(""),4000);}

  /* ── Fetch ── */
  function fetchStaff(){
    if(!hotelId){setLoading(false);return;}
    setLoading(true);
    fetch(`${API}/staff/?hotel=${hotelId}`,{headers:apiH()}).then(r=>r.json())
      .then(d=>{setStaff(Array.isArray(d)?d:d.results??[]);setLoading(false);})
      .catch(()=>setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ const execute = async () => { await fetchStaff(); }; execute(); },[]);

  /* ── Filter ── */
  const filtered = staff.filter(s=>{
    if(fStatus==="archived"){if(s.status!=="archived")return false;}
    else if(fStatus!=="all"){if(s.status!==fStatus)return false;}
    else{if(s.status==="archived")return false;}
    if(fRole!=="all"&&s.role!==fRole)return false;
    if(search){
      const q=search.toLowerCase();
      if(!(`${s.full_name} ${s.phone} ${s.email}`.toLowerCase().includes(q)))return false;
    }
    return true;
  });

  /* ── Stats ── */
  const nonArchived = staff.filter(s=>s.status!=="archived");
  const activeCount = staff.filter(s=>s.status==="active").length;
  const suspCount   = staff.filter(s=>s.status==="suspended").length;
  const recCount    = staff.filter(s=>s.role==="receptionist"&&s.status==="active").length;
  const svcCount    = staff.filter(s=>["housekeeping","maintenance","restaurant","room_service"].includes(s.role)&&s.status==="active").length;

  /* ── Open modals ── */
  function openAdd(){
    setFName("");setFRole2("receptionist");setFPhone("");setFEmail("");
    setFShift2("morning");setFShiftStart("");setFShiftEnd("");setFNotes("");setFPerms(DEFAULT_PERMS.receptionist??[]);
    setFUsername("");setFPassword("");
    setFormErr("");setSelStaff(null);setModal("add");
  }
  function openEdit(s:Staff){
    setFName(s.full_name);setFRole2(s.role);setFPhone(s.phone);setFEmail(s.email);
    setFShift2(s.shift);setFShiftStart(s.shift_start?String(s.shift_start).slice(0,5):"");setFShiftEnd(s.shift_end?String(s.shift_end).slice(0,5):"");setFNotes(s.notes??"");setFPerms(Array.isArray(s.permissions)?s.permissions:[]);
    setFormErr("");setSelStaff(s);setModal("edit");
  }
  function openView(s:Staff){setSelStaff(s);setModal("view");}
  function openPassword(s:Staff){setPw1("");setPw2("");setPwUser("");setPwErr("");setSelStaff(s);setModal("password");}
  function openShift(s:Staff){setNewShift(s.shift);setSelStaff(s);setModal("shift");}
  function openPerms(s:Staff){setEditPerms(Array.isArray(s.permissions)?s.permissions:[]);setSelStaff(s);setModal("permissions");}

  /* ── Save staff ── */
  async function handleSave(){
    if(!fName.trim()){setFormErr(t("الاسم الكامل مطلوب."));return;}
    // البريد اختياري — الدخول يعتمد على اسم المستخدم لا البريد. نتحقّق من الصيغة فقط إن أُدخل.
    if(fEmail.trim()&&!fEmail.includes("@")){setFormErr(t("البريد الإلكتروني غير صالح."));return;}
    const dup=fEmail.trim()?staff.find(s=>s.email.toLowerCase()===fEmail.toLowerCase()&&(modal==="add"||s.id!==selStaff?.id)):undefined;
    if(dup){setFormErr(t("هذا البريد الإلكتروني مستخدم بالفعل من قبل موظف آخر."));return;}
    // د‑5: عند الإضافة، إن أُدخل اسم مستخدم يُنشأ حساب دخول (كلمة مرور ≥ 8)
    if(modal==="add"&&fUsername.trim()&&fPassword.length<8){setFormErr(t("كلمة المرور 8 أحرف على الأقل لإنشاء حساب الدخول."));return;}
    setSaving(true);setFormErr("");
    const payload:Record<string,unknown>={hotel:Number(hotelId),full_name:fName.trim(),role:fRole2,
      phone:fPhone.trim(),email:fEmail.trim(),shift:fShift2,
      shift_start:fShiftStart||null,shift_end:fShiftEnd||null,
      notes:fNotes.trim(),permissions:fPerms};
    if(modal==="add"&&fUsername.trim()){payload.username=fUsername.trim();payload.password=fPassword;}
    try{
      if(modal==="edit"&&selStaff){
        const r=await fetch(`${API}/staff/${selStaff.id}/`,{method:"PUT",headers:apiHJ(),body:JSON.stringify(payload)});
        if(!r.ok){const d=await r.json();setFormErr(flattenErr(d)||t("حدث خطأ أثناء الحفظ."));setSaving(false);return;}
        showToast(t("تم تحديث بيانات الموظف بنجاح."));
      }else{
        const r=await fetch(`${API}/staff/`,{method:"POST",headers:apiHJ(),body:JSON.stringify(payload)});
        if(!r.ok){const d=await r.json();setFormErr(flattenErr(d)||t("حدث خطأ أثناء الحفظ."));setSaving(false);return;}
        showToast(t("تم إضافة الموظف بنجاح."));
      }
      setModal(null);fetchStaff();
    }catch{setFormErr(t("حدث خطأ أثناء الحفظ."));}
    setSaving(false);
  }

  async function toggleStatus(s:Staff){
    const ns=s.status==="active"?"suspended":"active";
    try{
      await fetch(`${API}/staff/${s.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:ns})});
      showToast(ns==="active"?t("تم تفعيل الموظف."):t("تم إيقاف الموظف مؤقتًا."));fetchStaff();
    }catch{showToast(t("حدث خطأ."));}
  }
  async function archiveRestore(s:Staff){
    const ns=s.status==="archived"?"active":"archived";
    try{
      await fetch(`${API}/staff/${s.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({status:ns})});
      showToast(ns==="archived"?t("تم أرشفة الموظف."):t("تم استعادة الموظف من الأرشيف."));fetchStaff();
    }catch{showToast(t("حدث خطأ."));}
  }
  async function handleShiftSave(){
    if(!selStaff)return;
    try{
      await fetch(`${API}/staff/${selStaff.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({shift:newShift})});
      showToast(t("تم تغيير الوردية."));setModal(null);fetchStaff();
    }catch{showToast(t("حدث خطأ."));}
  }
  async function handlePermSave(){
    if(!selStaff)return;
    try{
      await fetch(`${API}/staff/${selStaff.id}/`,{method:"PATCH",headers:apiHJ(),body:JSON.stringify({permissions:editPerms})});
      showToast(t("تم حفظ الصلاحيات."));setModal(null);fetchStaff();
    }catch{showToast(t("حدث خطأ."));}
  }
  async function handlePasswordSave(){
    if(!selStaff)return;
    if(pw1.length<8){setPwErr(t("كلمة المرور 8 أحرف على الأقل."));return;}
    if(pw1!==pw2){setPwErr(t("كلمتا السر غير متطابقتين."));return;}
    const body:Record<string,unknown>={password:pw1};
    if(!selStaff.has_login){ if(!pwUser.trim()){setPwErr(t("اسم المستخدم مطلوب لإنشاء حساب الدخول."));return;} body.username=pwUser.trim(); }
    try{
      const r=await fetch(`${API}/staff/${selStaff.id}/set_password/`,{method:"POST",headers:apiHJ(),body:JSON.stringify(body)});
      if(!r.ok){const d=await r.json().catch(()=>({}));setPwErr(flattenErr(d)||t("حدث خطأ."));return;}
      showToast(t("تم تحديث كلمة المرور."));setModal(null);fetchStaff();
    }catch{setPwErr(t("حدث خطأ."));}
  }
  function togglePerm(p:string){setFPerms(prev=>prev.includes(p)?prev.filter(x=>x!==p):[...prev,p]);}
  function toggleEditPerm(p:string){setEditPerms(prev=>prev.includes(p)?prev.filter(x=>x!==p):[...prev,p]);}

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="ds-page">

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:80,right:24,zIndex:9999,background:"#1e293b",color:"#fff",
          padding:"0.75rem 1.25rem",borderRadius:12,fontSize:13,fontWeight:700,maxWidth:400,
          boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>{t("الموظفون")}</h1>
          <p>{t("إدارة فريق عمل الفندق: الأدوار، الورديات، الصلاحيات، والحالات الوظيفية.")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-primary" onClick={openAdd}>+ {t("إضافة موظف")}</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"0.65rem",marginBottom:"1.5rem"}}>
        {([
          {label:t("إجمالي الموظفين"),value:nonArchived.length,Icon:Users as LucideIcon,       grad:"linear-gradient(135deg,#2563eb,#1d4ed8)",active:fRole==="all"&&fStatus==="all",        onClick:()=>{setFRole("all");setFStatus("all");}},
          {label:t("فعالون"),          value:activeCount,        Icon:CheckCircle2 as LucideIcon,grad:"linear-gradient(135deg,#22c55e,#16a34a)",active:fStatus==="active",                    onClick:()=>setFStatus("active")},
          {label:t("موقوفون"),         value:suspCount,          Icon:PauseCircle as LucideIcon, grad:"linear-gradient(135deg,#f59e0b,#d97706)",active:fStatus==="suspended",                 onClick:()=>setFStatus("suspended")},
          {label:t("الاستقبال"),       value:recCount,           Icon:Bell as LucideIcon,        grad:"linear-gradient(135deg,#3b82f6,#2563eb)",active:fRole==="receptionist",                onClick:()=>setFRole("receptionist")},
          {label:t("فريق الخدمات"),    value:svcCount,           Icon:Wrench as LucideIcon,      grad:"linear-gradient(135deg,#a855f7,#7c3aed)",active:["maintenance","housekeeping","restaurant","room_service"].includes(fRole), onClick:()=>setFRole("maintenance")},
        ] as {label:string;value:number;Icon:LucideIcon;grad:string;active:boolean;onClick:()=>void}[]).map(s=>(
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick}
            style={{background:s.grad,borderRadius:12,padding:"0.9rem 0.8rem",color:"#fff",cursor:"pointer",position:"relative",transition:"transform .15s,box-shadow .15s",...(s.active?{transform:"translateY(-3px) scale(1.02)",boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)"}:{})}}>
            {s.active&&<span style={{position:"absolute",top:"0.4rem",left:"0.5rem",fontSize:"0.55rem",fontWeight:700,background:"rgba(255,255,255,.25)",padding:"0.1rem 0.4rem",borderRadius:"1rem"}}>● {t("نشط")}</span>}
            <div className="ds-kpi-icon"><s.Icon size={26} strokeWidth={1.6} /></div>
            <p style={{fontSize:13,fontWeight:700,opacity:.90,marginBottom:4}}>{s.label}</p>
            <p style={{fontSize:26,fontWeight:900,lineHeight:1}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="ds-card-p" style={{marginBottom:"1.25rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"0.6rem"}}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث باسم الموظف أو الهاتف أو البريد")}</p>
            <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("اسم الموظف، الهاتف، البريد الإلكتروني...")} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Users size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الدور")}</p>
            <select className="select" value={fRole} onChange={e=>setFRole(e.target.value)}>
              <option value="all">{t("جميع الأدوار")}</option>
              {Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><ListFilter size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الحالة")}</p>
            <select className="select" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
              <option value="all">{t("فعال وموقوف")}</option>
              <option value="active">{t("فعال فقط")}</option>
              <option value="suspended">{t("موقوف فقط")}</option>
              <option value="archived">{t("المؤرشفون")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      {loading?(
        <p style={{color:"var(--color-muted)",textAlign:"center",padding:"2rem"}}>{t("جاري تحميل بيانات الموظفين...")}</p>
      ):filtered.length===0?(
        <div style={{textAlign:"center",padding:"3rem",color:"var(--color-muted)"}}>
          <User size={44} strokeWidth={1.2} style={{marginBottom:8,color:"var(--color-muted)"}}/>
          <p style={{fontWeight:800,fontSize:16,marginBottom:4}}>{t("لا يوجد موظفون")}</p>
          <p style={{fontSize:13}}>{t("لا توجد نتائج مطابقة لمعايير البحث والفلتر الحالية.")}</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"}}>
          {filtered.map(s=>{
            const rc=ROLE_COLORS[s.role]??ROLE_COLORS.receptionist;
            const permsCount=Array.isArray(s.permissions)?s.permissions.length:0;
            return (
              <div key={s.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderTop:`3px solid ${rc.text}`,
                borderRadius:12,padding:"0.9rem",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
                display:"flex",flexDirection:"column",gap:"0.5rem"}}>

                {/* Avatar + name + badges */}
                <div style={{display:"flex",gap:"0.65rem",alignItems:"flex-start"}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:rc.avatar,color:"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:15,flexShrink:0}}>
                    {initials(s.full_name)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:900,fontSize:14,color:"var(--color-heading)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.full_name}</p>
                    <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",marginTop:3}}>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:rc.bg,color:rc.text}}>{ROLE_LABELS[s.role]??s.role}</span>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,...STATUS_STYLE[s.status]}}>{STATUS_LABELS[s.status]??s.status}</span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
                  <div style={{background:"#f8fafc",borderRadius:6,padding:"4px 8px",fontSize:11}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><Phone size={12} strokeWidth={2}/> {t("الهاتف")}</p>
                    <p style={{fontWeight:700,color:"#1e293b"}}>{s.phone||"—"}</p>
                  </div>
                  <div style={{background:"#f8fafc",borderRadius:6,padding:"4px 8px",fontSize:11,overflow:"hidden"}}>
                    <p style={{color:"#1e293b",fontSize:11,fontWeight:700,marginBottom:2,display:"flex",alignItems:"center",gap:4}}><Mail size={12} strokeWidth={2}/> {t("البريد")}</p>
                    <p style={{fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.email||"—"}</p>
                  </div>
                </div>

                {/* Shift + perms */}
                <div style={{display:"flex",gap:"0.4rem",alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,...(SHIFT_STYLE[s.shift]??{})}}>
                    {SHIFT_LABELS[s.shift]??s.shift}
                  </span>
                  <span style={{background:"#f1f5f9",color:"#475569",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>
                    {lang === "ar" ? `${permsCount} صلاحية` : `${permsCount} permissions`}
                  </span>
                </div>

                {/* Actions */}
                <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",borderTop:"1px solid #f1f5f9",paddingTop:"0.5rem"}}>
                  <button onClick={()=>openView(s)} style={btnSm("#4f46e5")}>{t("عرض")}</button>
                  <button onClick={()=>openEdit(s)} style={btnSm("#1e293b")}>{t("تعديل")}</button>
                  {s.status!=="archived"&&(
                    <button onClick={()=>toggleStatus(s)} style={btnSm(s.status==="active"?"#d97706":"#16a34a")}>
                      {s.status==="active"?t("إيقاف"):t("تفعيل")}
                    </button>
                  )}
                  <button onClick={()=>openShift(s)} style={btnSm("#4f46e5")}>{t("الوردية")}</button>
                  <button onClick={()=>openPerms(s)} style={btnSm("#7c3aed")}>{t("الصلاحيات")}</button>
                  <button onClick={()=>openPassword(s)} style={btnSm("#64748b")}>{t("السر")}</button>
                  <button onClick={()=>archiveRestore(s)} style={btnSm(s.status==="archived"?"#16a34a":"#dc2626")}>
                    {s.status==="archived"?t("استعادة"):t("أرشفة")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ ADD / EDIT MODAL ════════════════════════════════ */}
      {(modal==="add"||modal==="edit")&&(
        <div className="ds-modal-backdrop" onClick={()=>setModal(null)}>
          <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
            <div className="ds-modal-head">
              <div>
                <p style={{fontSize:11,color:"var(--color-primary)",fontWeight:700,marginBottom:2}}>
                  {modal==="add"?t("إضافة موظف جديد"):t("تعديل بيانات الموظف")}
                </p>
                <h2>{modal==="add"?t("موظف جديد"):selStaff?.full_name}</h2>
              </div>
              <button className="icon-btn" onClick={()=>setModal(null)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              {formErr&&<p style={{color:"var(--color-danger)",fontSize:13,marginBottom:"0.75rem",
                background:"#fef2f2",padding:"0.5rem 0.75rem",borderRadius:8}}>{formErr}</p>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
                <div className="field" style={{gridColumn:"1/-1"}}>
                  <label className="field-label">{t("الاسم الكامل")} *</label>
                  <input className="input" value={fName} onChange={e=>setFName(e.target.value)} placeholder={t("مثال: محمد عبدالله السعيد")} />
                </div>
                {modal==="add"&&(
                  <div style={{gridColumn:"1/-1",background:"var(--color-surface-2,#f8fafc)",border:"1px solid var(--color-border)",borderRadius:12,padding:"0.75rem 0.85rem"}}>
                    <p style={{fontWeight:800,fontSize:13,marginBottom:2,display:"flex",alignItems:"center",gap:6,color:"var(--color-heading)"}}>
                      <Key size={14} strokeWidth={2.2} color="var(--color-primary)"/> {t("بيانات الدخول إلى النظام")} <span className="text-muted" style={{fontWeight:600,fontSize:11}}>({t("اختياري")})</span>
                    </p>
                    <p className="text-muted" style={{fontSize:11,marginBottom:10,lineHeight:1.6}}>
                      {t("يُسجّل الموظف دخوله باسم المستخدم وكلمة المرور — لا يُستخدم البريد للدخول. اترك الحقلين فارغين إن كان الموظف لا يحتاج حسابًا في النظام، أو املأهما لإنشاء حساب دخول حقيقي تُسجَّل باسمه كل عملية.")}
                    </p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
                      <div className="field">
                        <label className="field-label">{t("اسم المستخدم للدخول")}</label>
                        <input className="input" value={fUsername} onChange={e=>setFUsername(e.target.value)} placeholder={t("مثال: ahmad.reception")} autoComplete="off" />
                      </div>
                      <div className="field">
                        <label className="field-label">{t("كلمة المرور")}</label>
                        <input className="input" type="password" value={fPassword} onChange={e=>setFPassword(e.target.value)} placeholder={t("8 أحرف على الأقل")} autoComplete="new-password" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="field">
                  <label className="field-label">{t("الدور الوظيفي")} *</label>
                  <select className="select" value={fRole2} onChange={e=>{
                    const r=e.target.value as StaffRole;setFRole2(r);
                    if(modal==="add")setFPerms(DEFAULT_PERMS[r]??[]);
                  }}>
                    {Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t("الوردية")} *</label>
                  <select className="select" value={fShift2} onChange={e=>setFShift2(e.target.value as StaffShift)}>
                    {Object.entries(SHIFT_LABELS).map(([v,l])=><option key={v} value={v}>{SHIFT_ICONS[v]} {l}</option>)}
                  </select>
                </div>
                {/* م5: نافذة الوردية (تُستخدم لمنع الدخول خارجها عند تفعيل الفندق للميزة) */}
                <div className="field">
                  <label className="field-label">{t("بداية الوردية")}</label>
                  <input className="input" type="time" value={fShiftStart} onChange={e=>setFShiftStart(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">{t("نهاية الوردية")}</label>
                  <input className="input" type="time" value={fShiftEnd} onChange={e=>setFShiftEnd(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">{t("رقم الهاتف")}</label>
                  <input className="input" value={fPhone} onChange={e=>setFPhone(e.target.value)} placeholder="+966 5X XXX XXXX" />
                </div>
                <div className="field">
                  <label className="field-label">{t("البريد الإلكتروني")} <span className="text-muted" style={{fontWeight:600,fontSize:11}}>({t("اختياري")})</span></label>
                  <input className="input" type="email" value={fEmail} onChange={e=>setFEmail(e.target.value)} placeholder="example@email.com" />
                </div>
                <div className="field" style={{gridColumn:"1/-1"}}>
                  <label className="field-label">{t("ملاحظات")}</label>
                  <textarea className="input" rows={2} value={fNotes} onChange={e=>setFNotes(e.target.value)} style={{resize:"vertical"}} />
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"var(--color-muted)",marginBottom:"0.5rem",display:"flex",alignItems:"center",gap:4}}><Key size={11} strokeWidth={2}/> {t("الصلاحيات")} ({lang === "ar" ? `${fPerms.length} محددة` : `${fPerms.length} selected`})</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
                    {ALL_PERMS.map(p=>(
                      <label key={p} style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:12,
                        background:fPerms.includes(p)?"#dbeafe":"#f8fafc",
                        border:`1px solid ${fPerms.includes(p)?"#93c5fd":"#e2e8f0"}`,
                        borderRadius:6,padding:"0.35rem 0.5rem",cursor:"pointer",
                        color:fPerms.includes(p)?"#1d4ed8":"#475569",fontWeight:600}}>
                        <input type="checkbox" checked={fPerms.includes(p)} onChange={()=>togglePerm(p)} />
                        {PERM_LABELS[p]??p}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={()=>setModal(null)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={handleSave} disabled={saving}>
                {saving?t("جارٍ الحفظ..."):modal==="add"?t("إضافة الموظف"):t("حفظ التعديلات")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ VIEW DETAILS MODAL ══════════════════════════════ */}
      {modal==="view"&&selStaff&&(()=>{
        const s=selStaff;const rc=ROLE_COLORS[s.role]??ROLE_COLORS.receptionist;
        return(
          <div className="ds-modal-backdrop" onClick={()=>setModal(null)}>
            <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
              <div className="ds-modal-head">
                <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:rc.avatar,color:"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:17,flexShrink:0}}>
                    {initials(s.full_name)}
                  </div>
                  <div>
                    <h2 style={{marginBottom:3}}>{s.full_name}</h2>
                    <div style={{display:"flex",gap:"0.3rem"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:rc.bg,color:rc.text}}>{ROLE_LABELS[s.role]??s.role}</span>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,...STATUS_STYLE[s.status]}}>{STATUS_LABELS[s.status]??s.status}</span>
                    </div>
                  </div>
                </div>
                <button className="icon-btn" onClick={()=>setModal(null)}><X size={16} strokeWidth={2.5}/></button>
              </div>
              <div className="ds-modal-body">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"1rem"}}>
                  {([
                    {l:t("الهاتف"),v:s.phone||"—",Icon:Phone as LucideIcon},{l:t("البريد الإلكتروني"),v:s.email||"—",Icon:Mail as LucideIcon},
                    {l:t("الوردية"),v:SHIFT_LABELS[s.shift]??s.shift,Icon:Clock as LucideIcon},
                    {l:t("تاريخ الإضافة"),v:fmtDate(s.created_at),Icon:Calendar as LucideIcon},
                    {l:t("آخر تحديث"),v:fmtDate(s.updated_at),Icon:RefreshCw as LucideIcon},
                  ] as {l:string;v:string;Icon:LucideIcon}[]).map(item=>(
                    <div key={item.l} style={{background:"#f8fafc",borderRadius:8,padding:"0.6rem 0.75rem"}}>
                      <p style={{fontSize:10,color:"#94a3b8",marginBottom:2,display:"flex",alignItems:"center",gap:3}}><item.Icon size={10} strokeWidth={2}/> {item.l}</p>
                      <p style={{fontWeight:700,fontSize:12,wordBreak:"break-all"}}>{item.v}</p>
                    </div>
                  ))}
                </div>
                {s.notes&&(
                  <div style={{background:"#f8fafc",borderRadius:8,padding:"0.6rem 0.75rem",marginBottom:"1rem"}}>
                    <p style={{fontSize:10,color:"#94a3b8",marginBottom:3,display:"flex",alignItems:"center",gap:3}}><FileText size={10} strokeWidth={2}/> {t("ملاحظات")}</p>
                    <p style={{fontSize:12}}>{s.notes}</p>
                  </div>
                )}
                <div>
                  <p style={{fontSize:11,fontWeight:700,color:"var(--color-muted)",marginBottom:"0.4rem",display:"flex",alignItems:"center",gap:4}}>
                    <Key size={11} strokeWidth={2}/> {t("الصلاحيات الممنوحة")} ({(Array.isArray(s.permissions)?s.permissions:[]).length})
                  </p>
                  {Array.isArray(s.permissions)&&s.permissions.length>0?(
                    <div style={{display:"flex",flexWrap:"wrap",gap:"0.3rem"}}>
                      {s.permissions.map(p=>(
                        <span key={p} style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#dbeafe",color:"#1d4ed8"}}>{PERM_LABELS[p]??p}</span>
                      ))}
                    </div>
                  ):(
                    <p style={{fontSize:12,color:"var(--color-muted)"}}>{t("لم تُمنح أي صلاحيات لهذا الموظف.")}</p>
                  )}
                </div>
              </div>
              <div className="ds-modal-foot">
                <button className="ds-btn ds-btn-neutral" onClick={()=>setModal(null)}>{t("إغلاق")}</button>
                <button className="ds-btn ds-btn-primary" onClick={()=>openEdit(s)}><Pencil size={13}/> {t("تعديل")}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════ CHANGE PASSWORD MODAL ═══════════════════════════ */}
      {modal==="password"&&selStaff&&(
        <div className="ds-modal-backdrop" onClick={()=>setModal(null)}>
          <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
            <div className="ds-modal-head">
              <div>
                <p style={{fontSize:11,color:"var(--color-primary)",fontWeight:700,marginBottom:2}}>{t("تغيير كلمة السر")}</p>
                <h2>{selStaff.full_name}</h2>
              </div>
              <button className="icon-btn" onClick={()=>setModal(null)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              {!selStaff.has_login && (
                <div className="ds-alert ds-alert-info" style={{marginBottom:"1rem",fontSize:12}}>
                  {t("هذا الموظف بلا حساب دخول — أدخل اسم مستخدم وكلمة مرور لإنشائه الآن.")}
                </div>
              )}
              {pwErr&&<p style={{color:"var(--color-danger)",fontSize:13,marginBottom:"0.75rem"}}>{pwErr}</p>}
              {!selStaff.has_login && (
                <div className="field" style={{marginBottom:"0.65rem"}}>
                  <label className="field-label">{t("اسم المستخدم")}</label>
                  <input className="input" value={pwUser} onChange={e=>setPwUser(e.target.value)} autoComplete="off" />
                </div>
              )}
              <div className="field" style={{marginBottom:"0.65rem"}}>
                <label className="field-label">{t("كلمة السر الجديدة")}</label>
                <input className="input" type="password" value={pw1} onChange={e=>setPw1(e.target.value)} placeholder={t("8 أحرف على الأقل")} autoComplete="new-password" />
              </div>
              <div className="field">
                <label className="field-label">{t("تأكيد كلمة السر")}</label>
                <input className="input" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder={t("أعد كتابة كلمة السر")} />
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={()=>setModal(null)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={handlePasswordSave}>{t("تغيير كلمة السر")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ CHANGE SHIFT MODAL ══════════════════════════════ */}
      {modal==="shift"&&selStaff&&(
        <div className="ds-modal-backdrop" onClick={()=>setModal(null)}>
          <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
            <div className="ds-modal-head">
              <div>
                <p style={{fontSize:11,color:"var(--color-primary)",fontWeight:700,marginBottom:2}}>{t("تغيير الوردية")}</p>
                <h2>{selStaff.full_name}</h2>
              </div>
              <button className="icon-btn" onClick={()=>setModal(null)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              <p style={{fontSize:12,color:"var(--color-muted)",marginBottom:"1rem"}}>
                {t("الوردية الحالية")}: <strong>{SHIFT_LABELS[selStaff.shift]??selStaff.shift}</strong>
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
                {(["morning","evening","night","flexible"] as StaffShift[]).map(sh=>(
                  <button key={sh} onClick={()=>setNewShift(sh)} style={{
                    padding:"0.75rem",borderRadius:10,
                    border:`2px solid ${newShift===sh?"var(--color-primary)":"#e2e8f0"}`,
                    background:newShift===sh?"#eff6ff":"#fff",cursor:"pointer",fontWeight:700,fontSize:13,
                    ...(SHIFT_STYLE[sh]??{}),
                  }}>
                    {SHIFT_LABELS[sh]}
                  </button>
                ))}
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={()=>setModal(null)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={handleShiftSave}>{t("حفظ التغيير")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ PERMISSIONS MODAL ═══════════════════════════════ */}
      {modal==="permissions"&&selStaff&&(
        <div className="ds-modal-backdrop" onClick={()=>setModal(null)}>
          <div className="ds-modal-card" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
            <div className="ds-modal-head">
              <div>
                <p style={{fontSize:11,color:"var(--color-primary)",fontWeight:700,marginBottom:2}}>{t("إدارة الصلاحيات")}</p>
                <h2>{selStaff.full_name}</h2>
              </div>
              <button className="icon-btn" onClick={()=>setModal(null)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              <p style={{fontSize:12,color:"var(--color-muted)",marginBottom:"0.75rem"}}>
                {t("اختر الصلاحيات التي تريد منحها لهذا الموظف. عند الحفظ، تُستبدل الصلاحيات الحالية بهذه القائمة.")}
              </p>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                <button style={{fontSize:11,color:"var(--color-primary)",background:"none",border:"none",cursor:"pointer",fontWeight:700}}
                  onClick={()=>setEditPerms([...ALL_PERMS])}>{t("تحديد الكل")}</button>
                <button style={{fontSize:11,color:"var(--color-muted)",background:"none",border:"none",cursor:"pointer",fontWeight:700}}
                  onClick={()=>setEditPerms([])}>{t("إلغاء التحديد")}</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                {ALL_PERMS.map(p=>(
                  <label key={p} style={{display:"flex",alignItems:"center",gap:"0.6rem",fontSize:12,
                    background:editPerms.includes(p)?"#dbeafe":"#f8fafc",
                    border:`1px solid ${editPerms.includes(p)?"#93c5fd":"#e2e8f0"}`,
                    borderRadius:8,padding:"0.5rem 0.65rem",cursor:"pointer",fontWeight:700,
                    color:editPerms.includes(p)?"#1d4ed8":"#475569"}}>
                    <input type="checkbox" checked={editPerms.includes(p)} onChange={()=>toggleEditPerm(p)} />
                    {PERM_LABELS[p]??p}
                  </label>
                ))}
              </div>
              <p style={{fontSize:11,color:"var(--color-muted)",marginTop:"0.75rem"}}>{lang === "ar" ? `${editPerms.length} صلاحية محددة` : `${editPerms.length} permissions selected`}</p>
              {editPerms.length===0&&(
                <p style={{fontSize:12,color:"#b91c1c",marginTop:"0.3rem",display:"flex",alignItems:"center",gap:4}}><AlertTriangle size={12}/> {t("لن يتمكن الموظف من الوصول لأي قسم.")}</p>
              )}
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={()=>setModal(null)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={handlePermSave}>{t("حفظ الصلاحيات")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
