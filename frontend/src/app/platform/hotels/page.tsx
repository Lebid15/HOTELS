"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, X, Pencil, FileBarChart, CalendarCheck, PauseCircle, PlayCircle, Archive } from "lucide-react";
import { apiUrl, getAuthJsonHeaders as apiH } from "@/lib/api";

interface Hotel {
  id: number; name: string; country: string; city: string;
  address: string; phone: string; email: string; status: string;
  floors_count: number; manager_name: string; manager_email: string;
  subscription_status: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  active:    "ds-badge-success",
  suspended: "ds-badge-warning",
  archived:  "ds-badge-neutral",
};
const STATUS_LABEL: Record<string, string> = {
  active:    "فعال",
  suspended: "موقوف",
  archived:  "مؤرشف",
};

/* ── empty forms ─────────────────────────────────────────────────────────── */
const EMPTY_HOTEL = {
  name: "", country: "", city: "", address: "",
  phone: "", email: "", status: "active", floors_count: 1,
};

const EMPTY_ADD = {
  ...EMPTY_HOTEL,
  manager_username: "",
  manager_email:    "",
  manager_password: "",
  manager_confirm:  "",
};

type AddForm  = typeof EMPTY_ADD;
type EditForm = Partial<Hotel>;

/* ── HotelsPage ──────────────────────────────────────────────────────────── */
function HotelsPage() {
  const sp = useSearchParams();
  const [hotels,   setHotels]   = useState<Hotel[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [statusF,  setStatusF]  = useState(sp.get("status") ?? "");
  const [subStatusF, setSubStatusF] = useState("");
  const [modal,    setModal]    = useState<"add" | "edit" | "view" | null>(null);
  const [addForm,  setAddForm]  = useState<AddForm>({ ...EMPTY_ADD });
  const [editForm, setEditForm] = useState<EditForm>({});
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = () => {
    setLoading(true);
    fetch(apiUrl("/hotels/"), { headers: apiH() })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setHotels(Array.isArray(data) ? data : []))
      .catch(() => showToast("فشل تحميل الفنادق", "error"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const visible = hotels.filter(h => {
    const ms = !search || h.name.includes(search) || h.manager_name?.includes(search) || h.city?.includes(search);
    const mf = !statusF || h.status === statusF;
    const msub = !subStatusF
      ? true
      : subStatusF === "none"
        ? !h.subscription_status
        : h.subscription_status === subStatusF;
    return ms && mf && msub;
  });

  /* ── open modals ─────────────────────────────────────────────────────── */
  const openAdd = () => {
    setAddForm({ ...EMPTY_ADD });
    setErr(""); setShowPass(false); setShowConf(false);
    setModal("add");
  };
  const openEdit = (h: Hotel) => {
    setEditForm({ ...h });
    setErr(""); setModal("edit");
  };
  const openView = (h: Hotel) => {
    setEditForm({ ...h });
    setModal("view");
  };
  const closeModal = () => setModal(null);

  /* ── save add ────────────────────────────────────────────────────────── */
  const saveAdd = async () => {
    if (!addForm.name.trim())             return setErr("اسم الفندق مطلوب");
    if (!addForm.manager_username.trim()) return setErr("اسم مستخدم المدير مطلوب");
    if (!addForm.manager_password)        return setErr("كلمة مرور المدير مطلوبة");
    if (addForm.manager_password.length < 8)
                                          return setErr("كلمة المرور 8 أحرف على الأقل");
    if (addForm.manager_password !== addForm.manager_confirm)
                                          return setErr("كلمتا المرور غير متطابقتين");
    setSaving(true); setErr("");
    try {
      const res = await fetch(apiUrl("/hotels/create_with_manager/"), {
        method: "POST",
        headers: apiH(),
        body: JSON.stringify({
          name:             addForm.name.trim(),
          country:          addForm.country.trim(),
          city:             addForm.city.trim(),
          address:          addForm.address.trim(),
          phone:            addForm.phone.trim(),
          floors_count:     Number(addForm.floors_count),
          status:           addForm.status,
          manager_username: addForm.manager_username.trim(),
          manager_email:    addForm.manager_email.trim(),
          manager_password: addForm.manager_password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? "حدث خطأ أثناء الحفظ"); return; }
      closeModal();
      load();
      showToast("تم إنشاء الفندق وحساب المدير بنجاح", "success");
    } catch { setErr("خطأ في الاتصال بالخادم"); }
    finally { setSaving(false); }
  };

  /* ── save edit ───────────────────────────────────────────────────────── */
  const saveEdit = async () => {
    if (!editForm.name?.trim()) { setErr("اسم الفندق مطلوب"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(apiUrl(`/hotels/${editForm.id}/`), {
        method: "PUT",
        headers: apiH(),
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      closeModal();
      load();
      showToast("تم تحديث بيانات الفندق", "success");
    } catch { setErr("حدث خطأ أثناء الحفظ"); }
    finally { setSaving(false); }
  };

  /* ── set status ──────────────────────────────────────────────────────── */
  const setStatus = async (h: Hotel, s: string) => {
    await fetch(apiUrl(`/hotels/${h.id}/set_status/`), {
      method: "POST", headers: apiH(), body: JSON.stringify({ status: s }),
    });
    load();
  };

  /* ── hotel info fields (shared between add & edit) ───────────────────── */
  const HOTEL_FIELDS: { k: keyof typeof EMPTY_HOTEL; l: string; req?: boolean; type?: string }[] = [
    { k: "name",        l: "اسم الفندق",          req: true },
    { k: "country",     l: "الدولة" },
    { k: "city",        l: "المدينة" },
    { k: "address",     l: "العنوان" },
    { k: "phone",       l: "رقم الهاتف",           type: "tel" },
    { k: "email",       l: "البريد الإلكتروني",    type: "email" },
    { k: "floors_count",l: "عدد الطوابق",          type: "number" },
  ];

  return (
    <div className="ds-page">
      {/* Toast */}
      {toast && (
        <div className="ds-toast-stack">
          <div className={`ds-toast ds-toast-${toast.type === "success" ? "success" : "error"}`}>
            <span>{toast.msg}</span>
            <button className="ds-toast-close" onClick={() => setToast(null)}><X size={14} strokeWidth={2.5} /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>الفنادق</h1>
          <p>إدارة الفنادق المسجلة على المنصة — إجمالي {hotels.length} فندق</p>
        </div>
        <div className="page-actions">
          <button onClick={openAdd} className="ds-btn ds-btn-primary">+ إضافة فندق</button>
        </div>
      </div>

      {/* Filters */}
      <div className="ds-filters">
        <input
          className="input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث باسم الفندق أو المدير أو المدينة"
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="select" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ width: 150 }}>
          <option value="">كل حالات الفندق</option>
          <option value="active">فعال</option>
          <option value="suspended">موقوف</option>
          <option value="archived">مؤرشف</option>
        </select>
        <select className="select" value={subStatusF} onChange={e => setSubStatusF(e.target.value)} style={{ width: 170 }}>
          <option value="">كل حالات الاشتراك</option>
          <option value="none">بلا اشتراك</option>
          <option value="trial">تجريبي</option>
          <option value="active">اشتراك فعال</option>
          <option value="expired">منتهي</option>
          <option value="suspended">موقوف</option>
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="ds-card-p"><p className="pf-empty-inline">جارٍ التحميل...</p></div>
      ) : visible.length === 0 ? (
        <div className="ds-card-p"><p className="pf-empty-inline">لا توجد فنادق.</p></div>
      ) : (
        <div className="pf-entity-grid">
          {visible.map(h => (
            <div key={h.id} className="pf-entity-card">
              <div className="pf-entity-head">
                <div>
                  <div className="pf-entity-title">{h.name}</div>
                  <div className="pf-entity-sub">{[h.country, h.city].filter(Boolean).join(" / ") || "—"}</div>
                </div>
                <span className={`ds-badge ${STATUS_BADGE[h.status] ?? "ds-badge-neutral"}`}>
                  {STATUS_LABEL[h.status] ?? h.status}
                </span>
              </div>
              <div>
                <div className="pf-kv">
                  <span className="pf-kv-label">المدير</span>
                  <span className="pf-kv-value">{h.manager_name
                    ? h.manager_name
                    : (h.manager_email
                        ? h.manager_email
                        : <span className="ds-badge ds-badge-neutral">لا يوجد مدير</span>)}</span>
                </div>
                <div className="pf-kv">
                  <span className="pf-kv-label">الاشتراك</span>
                  <span className="pf-kv-value">
                    {h.subscription_status
                      ? <span className={`ds-badge ${
                          h.subscription_status === "active"    ? "ds-badge-success" :
                          h.subscription_status === "trial"     ? "ds-badge-info"    :
                          h.subscription_status === "expired"   ? "ds-badge-danger"  :
                          h.subscription_status === "suspended" ? "ds-badge-warning" :
                          "ds-badge-neutral"
                        }`}>
                          {{ active: "فعال", trial: "تجريبي", expired: "منتهي", suspended: "موقوف", not_set: "غير مضبوط" }[h.subscription_status] ?? h.subscription_status}
                        </span>
                      : <span className="text-muted">—</span>}
                  </span>
                </div>
              </div>
              <div className="pf-entity-actions">
                <button onClick={() => openView(h)} className="ds-btn ds-btn-neutral ds-btn-sm"><Eye size={14} /> عرض</button>
                <button onClick={() => openEdit(h)} className="ds-btn ds-btn-primary ds-btn-sm"><Pencil size={14} /> تعديل</button>
                <Link href={`/platform/earnings/${h.id}`} className="ds-btn ds-btn-neutral ds-btn-sm"><FileBarChart size={14} /> التقرير</Link>
                <Link href="/platform/web-bookings" className="ds-btn ds-btn-neutral ds-btn-sm"><CalendarCheck size={14} /> الحجوزات</Link>
                {h.status === "active"    && <button onClick={() => setStatus(h, "suspended")} className="ds-btn ds-btn-warning ds-btn-sm"><PauseCircle size={14} /> إيقاف</button>}
                {h.status === "suspended" && <button onClick={() => setStatus(h, "active")}    className="ds-btn ds-btn-success ds-btn-sm"><PlayCircle size={14} /> تفعيل</button>}
                {h.status !== "archived"  && <button onClick={() => setStatus(h, "archived")}  className="ds-btn ds-btn-neutral ds-btn-sm"><Archive size={14} /> أرشفة</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ADD MODAL ─────────────────────────────────────────────────────── */}
      {modal === "add" && (
        <div className="ds-modal-backdrop" onClick={closeModal}>
          <div className="ds-modal-card wide" onClick={e => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2>إضافة فندق جديد</h2>
              <button className="icon-btn" onClick={closeModal}><X size={14} strokeWidth={2.5} /></button>
            </div>
            <div className="ds-modal-body">

              {/* ── قسم بيانات الفندق ── */}
              <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-primary)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                بيانات الفندق
              </p>
              <div className="modal-grid">
                {HOTEL_FIELDS.map(({ k, l, req, type }) => (
                  <div key={k} className="field">
                    <label className="field-label">{l}{req ? " *" : ""}</label>
                    <input
                      className="input"
                      type={type ?? "text"}
                      value={(addForm[k as keyof AddForm] as string | number) ?? ""}
                      onChange={e => setAddForm(prev => ({ ...prev, [k]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="field">
                  <label className="field-label">الحالة</label>
                  <select
                    className="select"
                    value={addForm.status}
                    onChange={e => setAddForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">فعال</option>
                    <option value="suspended">موقوف</option>
                    <option value="archived">مؤرشف</option>
                  </select>
                </div>
              </div>

              {/* ── قسم حساب مدير الفندق ── */}
              <div style={{ borderTop: "1px solid var(--color-border)", margin: "1.25rem 0 1rem" }} />
              <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-success)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                حساب مدير الفندق
              </p>
              <div className="modal-grid">
                <div className="field">
                  <label className="field-label">اسم المستخدم *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="اسم مستخدم فريد للدخول"
                    value={addForm.manager_username}
                    onChange={e => setAddForm(prev => ({ ...prev, manager_username: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label">البريد الإلكتروني</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="example@email.com"
                    value={addForm.manager_email}
                    onChange={e => setAddForm(prev => ({ ...prev, manager_email: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label">كلمة المرور *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      type={showPass ? "text" : "password"}
                      placeholder="8 أحرف على الأقل"
                      value={addForm.manager_password}
                      onChange={e => setAddForm(prev => ({ ...prev, manager_password: e.target.value }))}
                      style={{ paddingLeft: "2.5rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      style={{ position: "absolute", top: "50%", left: "0.7rem", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 0, display: "flex" }}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">تأكيد كلمة المرور *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      type={showConf ? "text" : "password"}
                      placeholder="أعد كتابة كلمة المرور"
                      value={addForm.manager_confirm}
                      onChange={e => setAddForm(prev => ({ ...prev, manager_confirm: e.target.value }))}
                      style={{ paddingLeft: "2.5rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf(p => !p)}
                      style={{ position: "absolute", top: "50%", left: "0.7rem", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 0, display: "flex" }}
                    >
                      {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {err && (
                <div className="ds-alert ds-alert-danger" style={{ marginTop: "0.75rem" }}>
                  {err}
                </div>
              )}
            </div>
            <div className="ds-modal-foot">
              <button onClick={closeModal} className="ds-btn ds-btn-neutral" disabled={saving}>إلغاء</button>
              <button onClick={saveAdd}    className="ds-btn ds-btn-primary" disabled={saving}>
                {saving ? "جارٍ الإنشاء..." : "إنشاء الفندق والحساب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ────────────────────────────────────────────────────── */}
      {(modal === "edit" || modal === "view") && (
        <div className="ds-modal-backdrop" onClick={closeModal}>
          <div className="ds-modal-card wide" onClick={e => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2>{modal === "edit" ? "تعديل بيانات الفندق" : "تفاصيل الفندق"}</h2>
              <button className="icon-btn" onClick={closeModal}><X size={14} strokeWidth={2.5} /></button>
            </div>
            <div className="ds-modal-body">
              <div className="modal-grid">
                {HOTEL_FIELDS.map(({ k, l, req, type }) => (
                  <div key={k} className="field">
                    <label className="field-label">{l}{req ? " *" : ""}</label>
                    <input
                      className="input"
                      type={type ?? "text"}
                      value={(editForm[k as keyof EditForm] as string | number) ?? ""}
                      onChange={e => setEditForm(prev => ({ ...prev, [k]: e.target.value }))}
                      disabled={modal === "view"}
                    />
                  </div>
                ))}
                <div className="field">
                  <label className="field-label">اسم المدير</label>
                  <input
                    className="input"
                    value={editForm.manager_name ?? ""}
                    onChange={e => setEditForm(prev => ({ ...prev, manager_name: e.target.value }))}
                    disabled={modal === "view"}
                  />
                </div>
                <div className="field">
                  <label className="field-label">بريد المدير</label>
                  <input
                    className="input"
                    type="email"
                    value={editForm.manager_email ?? ""}
                    onChange={e => setEditForm(prev => ({ ...prev, manager_email: e.target.value }))}
                    disabled={modal === "view"}
                  />
                </div>
                {modal !== "view" && (
                  <div className="field">
                    <label className="field-label">الحالة</label>
                    <select
                      className="select"
                      value={editForm.status ?? "active"}
                      onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="active">فعال</option>
                      <option value="suspended">موقوف</option>
                      <option value="archived">مؤرشف</option>
                    </select>
                  </div>
                )}
              </div>
              {err && (
                <div className="ds-alert ds-alert-danger" style={{ marginTop: "0.75rem" }}>
                  {err}
                </div>
              )}
            </div>
            {modal !== "view" && (
              <div className="ds-modal-foot">
                <button onClick={closeModal} className="ds-btn ds-btn-neutral" disabled={saving}>إلغاء</button>
                <button onClick={saveEdit}   className="ds-btn ds-btn-primary" disabled={saving}>
                  {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HotelsPageWrapper() {
  return <Suspense><HotelsPage /></Suspense>;
}
