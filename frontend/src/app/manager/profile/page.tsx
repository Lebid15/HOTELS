"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, KeyRound, RefreshCw, User } from "lucide-react";
import { useLang } from "../LangContext";
import { BASE_URL as API, getAuthHeaders as apiH, getAuthJsonHeaders as apiHJ, authFetch } from "@/lib/api";

interface Me { username:string; email:string; role:string; two_factor_enabled?:boolean; }
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

  const showToast = (m:string) => { setToast(m); setTimeout(()=>setToast(""), 3000); };

  useEffect(() => {
    let alive = true;
    authFetch("/current-user/").then(r=>r.ok?r.json():null).then((d:Me)=>{
      if(alive && d){ setMe(d); setTfa(!!d.two_factor_enabled); }
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
        </div>
      </div>
      <p className="text-muted" style={{fontSize:11,marginTop:"1rem"}}>{lang==="ar"?"":""}</p>
    </div>
  );
}
