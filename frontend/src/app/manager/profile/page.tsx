"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, KeyRound, RefreshCw, User, Camera, Mail, Clock } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ, authFetch } from "@/lib/api";

interface Me { username:string; email:string; first_name?:string; last_name?:string; role:string; two_factor_enabled?:boolean; phone?:string; avatar?:string; last_login?:string|null; }
interface PendingCode { username:string; code:string; created_at:string; }

export default function ManagerProfilePage() {
  const { t, lang } = useLang();
  const [me, setMe] = useState<Me|null>(null);
  const [toast, setToast] = useState("");
  // change password
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfPass] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  // 2FA
  const [tfa, setTfa] = useState(false);
  const [pending, setPending] = useState<PendingCode[]>([]);
  // م(عابر): بيانات البروفايل الشخصية
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [profSaving, setProfSaving] = useState(false);

  const showToast = (m:string) => { setToast(m); setTimeout(()=>setToast(""), 3000); };

  useEffect(() => {
    let alive = true;
    authFetch("/current-user/").then(r=>r.ok?r.json():null).then((d:Me)=>{
      if(alive && d){
        setMe(d); setTfa(!!d.two_factor_enabled); setPhone(d.phone??""); setAvatar(d.avatar??"");
        setFullName([d.first_name, d.last_name].filter(Boolean).join(" ").trim());
      }
    }).catch(()=>{});
    return () => { alive = false; };
  }, []);

  const loadPending = useCallback(() => {
    fetch(`${API}/auth/2fa/pending/`, { headers: apiH() }).then(r=>r.ok?r.json():[]).then((d:PendingCode[])=>setPending(Array.isArray(d)?d:[])).catch(()=>{});
  }, []);
  useEffect(() => { loadPending(); }, [loadPending]);

  async function changePassword() {
    setPwErr("");
    if(newPass.length<8){ setPwErr(t("كلمة المرور 8 أحرف على الأقل.")); return; }
    if(newPass!==confPass){ setPwErr(t("كلمتا المرور غير متطابقتين")); return; }
    setPwSaving(true);
    try {
      const r = await fetch(`${API}/change-password/`, { method:"POST", headers:apiHJ(),
        body: JSON.stringify({ old_password: oldPass, new_password: newPass }) });
      const d = await r.json().catch(()=>({}));
      if(!r.ok){ setPwErr(d.error || t("فشل تغيير كلمة المرور")); return; }
      setOldPass(""); setNewPass(""); setConfPass("");
      showToast(t("تم تغيير كلمة المرور"));
    } catch { setPwErr(t("خطأ في الاتصال")); }
    finally { setPwSaving(false); }
  }

  async function toggle2FA(next:boolean) {
    try {
      const r = await fetch(`${API}/auth/2fa/toggle/`, { method:"POST", headers:apiHJ(), body: JSON.stringify({ enabled: next }) });
      if(!r.ok) throw new Error();
      setTfa(next);
      showToast(next ? t("تم تفعيل التحقق بخطوتين") : t("تم تعطيل التحقق بخطوتين"));
    } catch { showToast(t("خطأ في الاتصال")); }
  }

  async function saveProfile() {
    setProfSaving(true);
    // الاسم الكامل → أول كلمة = الاسم الأول، والباقي = اسم العائلة (تخزين الباك‑إند منفصل)
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first_name = parts.shift() ?? "";
    const last_name  = parts.join(" ");
    try {
      const r = await fetch(`${API}/current-user/`, { method: "PATCH", headers: apiHJ(),
        body: JSON.stringify({ first_name, last_name, phone, avatar }) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setMe(m => m ? { ...m, first_name: d.first_name, last_name: d.last_name, phone: d.phone, avatar: d.avatar } : m);
      // تحديث فوريّ للصورة والاسم في الشريط العلوي (بلا إعادة تحميل)
      window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: { name: fullName.trim(), avatar } }));
      showToast(t("تم حفظ الملف الشخصي."));
    } catch { showToast(t("خطأ في الاتصال")); }
    finally { setProfSaving(false); }
  }

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { showToast(t("حجم الصورة كبير جدًا (الحد 2 ميجابايت).")); return; }
    const reader = new FileReader();
    reader.onload = ev => setAvatar(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function logoutAllDevices() {
    if (!confirm(t("سيتم إنهاء جلساتك على كل الأجهزة. متابعة؟"))) return;
    try {
      const r = await fetch(`${API}/logout-all/`, { method:"POST", headers:apiHJ() });
      if(!r.ok) throw new Error();
      showToast(t("تم تسجيل الخروج من كل الأجهزة."));
    } catch { showToast(t("خطأ في الاتصال")); }
  }

  return (
    <div>
      {toast && <div style={{position:"fixed",top:80,insetInlineEnd:24,zIndex:9999,background:"#1e293b",color:"#fff",padding:"0.7rem 1.1rem",borderRadius:10,fontWeight:700,fontSize:13}}>{toast}</div>}

      <div className="page-header">
        <div>
          <div style={{display:"flex",alignItems:"center",gap:"0.65rem",marginBottom:"0.3rem"}}>
            <div style={{width:36,height:36,borderRadius:10,background:"var(--btn-luxury-bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <User size={18} color="#fff" strokeWidth={2}/>
            </div>
            <h1>{t("الملف الشخصي")}</h1>
          </div>
          <p>{me ? `${me.username} · ${t("مدير الفندق")}` : t("جارٍ التحميل...")}</p>
        </div>
      </div>

      {/* بطاقة الهوية الشخصية: الصورة + الاسم + الدور + آخر دخول */}
      <div className="ds-card-p" style={{marginBottom:"1rem",display:"flex",gap:"1.25rem",alignItems:"center",flexWrap:"wrap"}}>
        {avatar
          /* eslint-disable-next-line @next/next/no-img-element -- صورة شخصية data-url */
          ? <img src={avatar} alt="avatar" style={{width:88,height:88,borderRadius:"50%",objectFit:"cover",border:"3px solid #fff",boxShadow:"0 2px 12px rgba(0,0,0,.12)",flexShrink:0}}/>
          : <div style={{width:88,height:88,borderRadius:"50%",background:"var(--btn-luxury-bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:34,fontWeight:900,flexShrink:0}}>{(fullName||me?.username||"م").charAt(0).toUpperCase()}</div>}
        <div style={{flex:1,minWidth:200}}>
          <h2 style={{margin:0,fontSize:20,color:"var(--color-heading)"}}>{fullName || me?.username || "—"}</h2>
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
            <span className="ds-badge ds-badge-info">{t("مدير الفندق")}</span>
            {me?.username && <span className="text-muted" style={{fontSize:13,fontWeight:700}}>@{me.username}</span>}
          </div>
          <div className="text-muted" style={{fontSize:12,marginTop:10,display:"flex",gap:18,flexWrap:"wrap"}}>
            {me?.email && <span style={{display:"flex",alignItems:"center",gap:5}}><Mail size={13}/> {me.email}</span>}
            <span style={{display:"flex",alignItems:"center",gap:5}}><Clock size={13}/> {t("آخر تسجيل دخول")}: {me?.last_login ? new Date(me.last_login).toLocaleString(lang==="ar"?"ar":"en-US") : t("—")}</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <input id="avatar-input" type="file" accept="image/*" style={{display:"none"}} onChange={onAvatar}/>
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={()=>document.getElementById("avatar-input")?.click()}><Camera size={14}/> {t("تغيير الصورة")}</button>
          {avatar && <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={()=>setAvatar("")}>{t("إزالة الصورة")}</button>}
        </div>
      </div>

      {/* المعلومات الشخصية القابلة للتعديل */}
      <div className="ds-card-p" style={{marginBottom:"1rem"}}>
        <h3 style={{display:"flex",alignItems:"center",gap:6,marginTop:0}}><User size={16}/> {t("المعلومات الشخصية")}</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
          <div className="field" style={{margin:0}}>
            <label className="field-label">{t("الاسم الكامل")}</label>
            <input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder={t("مثال: أحمد المنصور")}/>
          </div>
          <div className="field" style={{margin:0}}>
            <label className="field-label">{t("رقم الهاتف")}</label>
            <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+9665XXXXXXXX"/>
          </div>
        </div>
        <p className="text-muted" style={{fontSize:12,marginTop:"0.7rem"}}>
          {t("الاسم والصورة يظهران في الشريط العلوي وبجانب عملياتك في سجلّ التدقيق.")}
        </p>
        <div style={{marginTop:"0.75rem"}}>
          <button className="ds-btn ds-btn-primary ds-btn-sm" disabled={profSaving} onClick={saveProfile}>{profSaving?t("جارٍ الحفظ..."):t("حفظ التغييرات")}</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",alignItems:"start"}}>
        {/* Change password */}
        <div className="ds-card-p">
          <h3 style={{display:"flex",alignItems:"center",gap:6,marginTop:0}}><KeyRound size={16}/> {t("تغيير كلمة المرور")}</h3>
          {pwErr && <p style={{color:"var(--color-danger)",fontSize:13}}>{pwErr}</p>}
          <div className="field" style={{marginBottom:"0.6rem"}}>
            <label className="field-label">{t("كلمة المرور الحالية")}</label>
            <input className="input" type="password" value={oldPass} onChange={e=>setOldPass(e.target.value)} autoComplete="current-password"/>
          </div>
          <div className="field" style={{marginBottom:"0.6rem"}}>
            <label className="field-label">{t("كلمة المرور الجديدة")}</label>
            <input className="input" type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder={t("8 أحرف على الأقل")} autoComplete="new-password"/>
          </div>
          <div className="field" style={{marginBottom:"0.8rem"}}>
            <label className="field-label">{t("تأكيد كلمة المرور")}</label>
            <input className="input" type="password" value={confPass} onChange={e=>setConfPass(e.target.value)} autoComplete="new-password"/>
          </div>
          <button className="ds-btn ds-btn-primary" onClick={changePassword} disabled={pwSaving}>
            {pwSaving ? t("جارٍ الحفظ...") : t("حفظ كلمة المرور")}
          </button>
        </div>

        {/* 2FA */}
        <div className="ds-card-p">
          <h3 style={{display:"flex",alignItems:"center",gap:6,marginTop:0}}><ShieldCheck size={16}/> {t("التحقق بخطوتين")}</h3>
          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:"0.8rem"}}>
            <input type="checkbox" checked={tfa} onChange={e=>toggle2FA(e.target.checked)} style={{width:16,height:16,accentColor:"var(--color-primary)"}}/>
            <span style={{fontWeight:700,fontSize:14}}>{t("تفعيل التحقق بخطوتين عند الدخول")}</span>
          </label>
          <p className="text-muted" style={{fontSize:12,marginBottom:"1rem"}}>
            {t("عند التفعيل يُطلب كود إضافي عند الدخول، ويظهر الكود هنا لتُبلغه للموظف (قناة داخل النظام).")}
          </p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
            <h4 style={{margin:0,fontSize:13}}>{t("أكواد التحقق النشطة")}</h4>
            <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={loadPending}><RefreshCw size={13}/> {t("تحديث")}</button>
          </div>
          {pending.length===0 ? (
            <p className="text-muted" style={{fontSize:12}}>{t("لا توجد أكواد نشطة حاليًا.")}</p>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {pending.map((p,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:8,padding:"0.5rem 0.75rem"}}>
                  <span style={{fontWeight:700,fontSize:13}}>{p.username}</span>
                  <span style={{fontWeight:900,fontSize:16,letterSpacing:"0.2em",color:"var(--color-primary)"}}>{p.code}</span>
                </div>
              ))}
            </div>
          )}
          {/* م6: الخروج من كل الأجهزة */}
          <div style={{borderTop:"1px solid var(--color-border)",marginTop:"1rem",paddingTop:"1rem"}}>
            <h4 style={{margin:"0 0 0.5rem",fontSize:13}}>{t("الجلسات")}</h4>
            <button className="ds-btn ds-btn-danger ds-btn-sm" onClick={logoutAllDevices}>{t("تسجيل الخروج من كل الأجهزة")}</button>
            <p className="text-muted" style={{fontSize:12,marginTop:"0.5rem"}}>{t("يُنهي كل جلساتك على جميع الأجهزة ويتطلب تسجيل دخول جديدًا.")}</p>
          </div>
        </div>
      </div>
      <p className="text-muted" style={{fontSize:11,marginTop:"1rem"}}>{lang==="ar"?"":""}</p>
    </div>
  );
}
