"use client";

import { useEffect, useState } from "react";
import { Copy, Archive, Trash2 } from "lucide-react";
import { BASE_URL as API, getAuthJsonHeaders as authHeaders } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

interface Package {
  id: number;
  name: string;
  description: string;
  price_monthly: number | string | null;
  price_yearly:  number | string | null;
  max_rooms: number;
  max_staff: number;
  max_users: number;
  features: string;
  status: string;
  notes: string;
  subscription_count: number;
  created_at: string;
}

const emptyForm = {
  name:          "",
  description:   "",
  price_monthly: "" as string | number,
  price_yearly:  "" as string | number,
  max_rooms:     50,
  max_staff:     10,
  max_users:     10,
  features:      "",
  status:        "active",
  notes:         "",
};

type PackageForm = typeof emptyForm;

/* ── PackageCard ─────────────────────────────────────────────────────────── */
interface PackageCardProps {
  pkg: Package;
  toggling:    boolean;
  deleting:    boolean;
  onEdit:      () => void;
  onToggle:    () => void;
  onDuplicate: () => void;
  onArchive:   () => void;
  onDelete:    () => void;
}

function PackageCard({ pkg, toggling, deleting, onEdit, onToggle, onDuplicate, onArchive, onDelete }: PackageCardProps) {
  const { t } = useLang();
  const isActive   = pkg.status === "active";
  const isArchived = pkg.status === "archived";

  return (
    <div className="ds-card-p" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--color-heading)" }}>
            {pkg.name}
          </h3>
          {pkg.description && (
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.5 }}>
              {pkg.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span className={`ds-badge ${isActive ? "ds-badge-success" : isArchived ? "ds-badge-neutral" : "ds-badge-warning"}`}
            style={{ marginRight: 8 }}>
            {isActive ? t("نشطة") : isArchived ? t("مؤرشفة") : t("موقوفة")}
          </span>
          {pkg.subscription_count > 0 && (
            <span className="ds-badge ds-badge-info" style={{ marginRight: 8, fontSize: "0.72rem" }}>
              {pkg.subscription_count} {t("مشترك")}
            </span>
          )}
        </div>
      </div>

      {/* Prices */}
      <div style={{ display: "flex", gap: 10 }}>
        {pkg.price_monthly !== null && pkg.price_monthly !== undefined && pkg.price_monthly !== "" && (
          <div style={{ flex: 1, padding: "10px 14px", background: "var(--color-primary-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-primary-soft)" }}>
            <p className="ds-summary-label" style={{ marginBottom: 2 }}>{t("شهري")}</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "var(--color-primary)" }}>
              {Number(pkg.price_monthly).toLocaleString("en-US")}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-muted)", marginRight: 3 }}>{t("ر.س")}</span>
            </p>
          </div>
        )}
        {pkg.price_yearly !== null && pkg.price_yearly !== undefined && pkg.price_yearly !== "" && (
          <div style={{ flex: 1, padding: "10px 14px", background: "var(--color-success-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-success-soft)" }}>
            <p className="ds-summary-label" style={{ marginBottom: 2 }}>{t("سنوي")}</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "var(--color-success)" }}>
              {Number(pkg.price_yearly).toLocaleString("en-US")}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-muted)", marginRight: 3 }}>{t("ر.س")}</span>
            </p>
          </div>
        )}
      </div>

      {/* Limits */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="ds-badge ds-badge-neutral">{pkg.max_rooms} {t("غرفة")}</span>
        <span className="ds-badge ds-badge-neutral">{pkg.max_staff} {t("موظف")}</span>
        <span className="ds-badge ds-badge-neutral">{pkg.max_users} {t("مستخدم")}</span>
      </div>

      {/* Features */}
      {pkg.features && (
        <div>
          <p className="text-muted" style={{ fontSize: 12, margin: "0 0 4px" }}>{t("المميزات")}</p>
          <ul style={{ margin: 0, padding: "0 1.2rem", fontSize: 13, color: "var(--color-text)", lineHeight: 1.8 }}>
            {pkg.features.split("\n").filter(Boolean).map((f, i) => <li key={i}>{f.trim()}</li>)}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4, flexWrap: "wrap" }}>
        <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={onEdit} disabled={isArchived}>{t("تعديل")}</button>
        {!isArchived && (
          <button
            className={`ds-btn ds-btn-sm ${isActive ? "ds-btn-warning" : "ds-btn-success"}`}
            onClick={onToggle}
            disabled={toggling}
          >
            {toggling ? "..." : isActive ? t("إيقاف") : t("تفعيل")}
          </button>
        )}
        <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={onDuplicate} title={t("نسخ الباقة")}>
          <Copy size={13} strokeWidth={2.5} /> {t("نسخ")}
        </button>
        {!isArchived && (
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={onArchive} title={t("أرشفة الباقة")}>
            <Archive size={13} strokeWidth={2.5} /> {t("أرشفة")}
          </button>
        )}
        <button
          className="ds-btn ds-btn-danger ds-btn-sm"
          onClick={onDelete}
          disabled={deleting || pkg.subscription_count > 0}
          title={pkg.subscription_count > 0 ? t("لا يمكن حذف باقة لها مشتركون") : t("حذف الباقة")}
        >
          <Trash2 size={13} strokeWidth={2.5} /> {t("حذف")}
        </button>
      </div>
    </div>
  );
}

/* ── PackageModal ────────────────────────────────────────────────────────── */
interface PackageModalProps {
  form:     PackageForm;
  isEdit:   boolean;
  saving:   boolean;
  error:    string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSave:   () => void;
  onClose:  () => void;
}

function PackageModal({ form, isEdit, saving, error, onChange, onSave, onClose }: PackageModalProps) {
  const { t } = useLang();
  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className="ds-modal-card wide" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h2>{isEdit ? t("تعديل الباقة") : t("إضافة باقة جديدة")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("إغلاق")}>✕</button>
        </div>

        <div className="ds-modal-body">
          {error && <div className="ds-alert ds-alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Section: basic info */}
          <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-primary)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {t("معلومات الباقة")}
          </p>
          <div className="modal-grid">
            <div className="field">
              <label className="field-label">{t("اسم الباقة *")}</label>
              <input className="input" name="name" value={form.name} onChange={onChange}
                placeholder={t("مثال: الباقة الاحترافية")} autoFocus />
            </div>
            <div className="field">
              <label className="field-label">{t("الحالة")}</label>
              <select className="select" name="status" value={form.status} onChange={onChange}>
                <option value="active">{t("نشطة")}</option>
                <option value="suspended">{t("موقوفة")}</option>
              </select>
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">{t("وصف الباقة")}</label>
            <textarea className="textarea" name="description" value={form.description} onChange={onChange}
              rows={2} placeholder={t("وصف مختصر للباقة...")} />
          </div>

          {/* Section: pricing */}
          <div style={{ borderTop: "1px solid var(--color-border)", margin: "1.25rem 0 1rem" }} />
          <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-success)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {t("الأسعار (ر.س)")}
          </p>
          <div className="modal-grid">
            <div className="field">
              <label className="field-label">{t("السعر الشهري")}</label>
              <input className="input" type="number" name="price_monthly" value={form.price_monthly}
                onChange={onChange} placeholder="0.00" min={0} step="0.01" />
            </div>
            <div className="field">
              <label className="field-label">{t("السعر السنوي")}</label>
              <input className="input" type="number" name="price_yearly" value={form.price_yearly}
                onChange={onChange} placeholder="0.00" min={0} step="0.01" />
            </div>
          </div>

          {/* Section: limits */}
          <div style={{ borderTop: "1px solid var(--color-border)", margin: "1.25rem 0 1rem" }} />
          <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-warning)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {t("الحدود القصوى")}
          </p>
          <div className="modal-grid">
            <div className="field">
              <label className="field-label">{t("أقصى عدد غرف")}</label>
              <input className="input" type="number" name="max_rooms" value={form.max_rooms}
                onChange={onChange} min={0} />
            </div>
            <div className="field">
              <label className="field-label">{t("أقصى عدد موظفين")}</label>
              <input className="input" type="number" name="max_staff" value={form.max_staff}
                onChange={onChange} min={0} />
            </div>
            <div className="field">
              <label className="field-label">{t("أقصى عدد مستخدمين")}</label>
              <input className="input" type="number" name="max_users" value={form.max_users}
                onChange={onChange} min={0} />
            </div>
          </div>

          {/* Section: features + notes */}
          <div style={{ borderTop: "1px solid var(--color-border)", margin: "1.25rem 0 1rem" }} />
          <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {t("مميزات وملاحظات")}
          </p>
          <div className="field">
            <label className="field-label">{t("المميزات")}</label>
            <textarea className="textarea" name="features" value={form.features} onChange={onChange}
              rows={4} placeholder={t("اكتب مميزة واحدة في كل سطر...")} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">{t("ملاحظات داخلية")}</label>
            <textarea className="textarea" name="notes" value={form.notes} onChange={onChange}
              rows={2} placeholder={t("ملاحظات للاستخدام الداخلي فقط...")} />
          </div>
        </div>

        <div className="ds-modal-foot">
          <button className="ds-btn ds-btn-neutral" onClick={onClose} disabled={saving}>{t("إلغاء")}</button>
          <button className="ds-btn ds-btn-primary" onClick={onSave} disabled={saving}>
            {saving ? t("جارٍ الحفظ...") : isEdit ? t("حفظ التعديلات") : t("إضافة الباقة")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── PackagesPage ────────────────────────────────────────────────────────── */
export default function PackagesPage() {
  const { t } = useLang();
  const [packages,    setPackages]    = useState<Package[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "archived">("all");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<Package | null>(null);
  const [form,        setForm]        = useState<PackageForm>({ ...emptyForm });
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState("");
  const [togglingId,  setTogglingId]  = useState<number | null>(null);
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function fetchPackages() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/packages/`, { headers: authHeaders() });
      if (!res.ok) throw new Error(t("فشل تحميل الباقات"));
      const data = await res.json();
      setPackages(Array.isArray(data) ? data : data.results ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("خطأ غير متوقع"));
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- تحميل لمرّة واحدة — الدالة غير مُذكّرة عمدًا / تحميل/ضبط حالة مقصود عند الإقلاع
  useEffect(() => { fetchPackages(); }, []);

  function formFromPackage(pkg: Package): PackageForm {
    return {
      name:          pkg.name,
      description:   pkg.description ?? "",
      price_monthly: pkg.price_monthly ?? "",
      price_yearly:  pkg.price_yearly  ?? "",
      max_rooms:     pkg.max_rooms,
      max_staff:     pkg.max_staff,
      max_users:     pkg.max_users,
      features:      pkg.features ?? "",
      status:        pkg.status,
      notes:         pkg.notes   ?? "",
    };
  }

  function openAdd() {
    setEditTarget(null);
    setForm({ ...emptyForm });
    setFormError(""); setShowModal(true);
  }

  function openEdit(pkg: Package) {
    setEditTarget(pkg);
    setForm(formFromPackage(pkg));
    setFormError(""); setShowModal(true);
  }

  function openDuplicate(pkg: Package) {
    setEditTarget(null);
    setForm({ ...formFromPackage(pkg), name: `${pkg.name} (${t("نسخة")})`, status: "active" });
    setFormError(""); setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditTarget(null); setFormError(""); }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError(t("اسم الباقة مطلوب")); return; }
    setSaving(true); setFormError("");
    try {
      const body = JSON.stringify({
        ...form,
        price_monthly: form.price_monthly === "" ? null : Number(form.price_monthly),
        price_yearly:  form.price_yearly  === "" ? null : Number(form.price_yearly),
        max_rooms:     Number(form.max_rooms),
        max_staff:     Number(form.max_staff),
        max_users:     Number(form.max_users),
      });
      const url = editTarget ? `${API}/packages/${editTarget.id}/` : `${API}/packages/`;
      const res = await fetch(url, { method: editTarget ? "PUT" : "POST", headers: authHeaders(), body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? JSON.stringify(err) ?? t("فشل الحفظ"));
      }
      closeModal();
      fetchPackages();
      showToast(editTarget ? t("تم تحديث الباقة بنجاح") : t("تم إضافة الباقة بنجاح"));
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : t("خطأ غير متوقع"));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(pkg: Package) {
    const newStatus = pkg.status === "active" ? "suspended" : "active";
    setTogglingId(pkg.id);
    try {
      const res = await fetch(`${API}/packages/${pkg.id}/set_status/`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      fetchPackages();
    } catch {
      showToast(t("فشل تغيير حالة الباقة"), "error");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleArchive(pkg: Package) {
    if (!confirm(`${t("هل تريد أرشفة الباقة")} "${pkg.name}"؟`)) return;
    try {
      const res = await fetch(`${API}/packages/${pkg.id}/set_status/`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error();
      fetchPackages();
      showToast(`${t("تم أرشفة الباقة")} "${pkg.name}"`);
    } catch {
      showToast(t("فشل أرشفة الباقة"), "error");
    }
  }

  async function handleDelete(pkg: Package) {
    if (!confirm(`${t("هل أنت متأكد من حذف الباقة")} "${pkg.name}"؟ ${t("هذا الإجراء لا يمكن التراجع عنه.")}`)) return;
    setDeletingId(pkg.id);
    try {
      const res = await fetch(`${API}/packages/${pkg.id}/`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      fetchPackages();
      showToast(`${t("تم حذف الباقة")} "${pkg.name}"`);
    } catch {
      showToast(t("فشل حذف الباقة"), "error");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount   = packages.filter(p => p.status === "active").length;
  const suspendedCount = packages.filter(p => p.status === "suspended").length;
  const totalSubscribers = packages.reduce((s, p) => s + (p.subscription_count ?? 0), 0);

  return (
    <div className="ds-page">
      {/* Toast */}
      {toast && (
        <div className="ds-toast-stack">
          <div className={`ds-toast ds-toast-${toast.type === "success" ? "success" : "error"}`}>
            <span>{toast.msg}</span>
            <button className="ds-toast-close" onClick={() => setToast(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{t("الباقات")}</h1>
          <p>{t("إدارة باقات الاشتراك المتاحة للفنادق")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-primary" onClick={openAdd}>+ {t("إضافة باقة")}</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="pf-grid-3">
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("إجمالي الباقات")}</p>
          <p className="ds-summary-value">{packages.length}</p>
          <p className="ds-summary-note">{t("جميع الباقات المسجلة")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("الباقات النشطة")}</p>
          <p className="ds-summary-value text-success">{activeCount}</p>
          <p className="ds-summary-note">{t("متاحة للاشتراك")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("الباقات الموقوفة")}</p>
          <p className="ds-summary-value text-warning">{suspendedCount}</p>
          <p className="ds-summary-note">{t("غير متاحة حالياً")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("إجمالي المشتركين")}</p>
          <p className="ds-summary-value text-primary">{totalSubscribers}</p>
          <p className="ds-summary-note">{t("فندق نشط أو تجريبي")}</p>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="ds-card-p" style={{ textAlign: "center" }}>
          <p className="text-muted">{t("جارٍ تحميل الباقات...")}</p>
        </div>
      )}

      {error && (
        <div className="ds-alert ds-alert-danger">
          {error}
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={fetchPackages} style={{ marginRight: "0.75rem" }}>
            {t("إعادة المحاولة")}
          </button>
        </div>
      )}

      {!loading && !error && packages.length === 0 && (
        <div className="ds-card-p" style={{ textAlign: "center" }}>
          <p className="text-muted">{t("لا توجد باقات بعد. أضف أول باقة الآن.")}</p>
        </div>
      )}

      {/* Filter tabs */}
      {!loading && !error && (
        <div className="ds-tabs" style={{ marginBottom: 4 }}>
          {([["all","الكل"], ["active","نشطة"], ["suspended","موقوفة"], ["archived","مؤرشفة"]] as const).map(([k, l]) => (
            <button
              key={k}
              className={`ds-tab-btn${statusFilter === k ? " active" : ""}`}
              onClick={() => setStatusFilter(k)}
            >
              {t(l)}
              <span style={{ marginRight: "0.4rem" }} className={
                k === "active" ? "ds-badge ds-badge-success" :
                k === "suspended" ? "ds-badge ds-badge-warning" :
                k === "archived" ? "ds-badge ds-badge-neutral" : "ds-badge ds-badge-neutral"
              }>
                {k === "all" ? packages.length : packages.filter(p => p.status === k).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && packages.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20, marginTop: 8 }}>
          {packages.filter(p => statusFilter === "all" || p.status === statusFilter).map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              toggling={togglingId === pkg.id}
              deleting={deletingId === pkg.id}
              onEdit={()      => openEdit(pkg)}
              onToggle={()    => handleToggleStatus(pkg)}
              onDuplicate={() => openDuplicate(pkg)}
              onArchive={()   => handleArchive(pkg)}
              onDelete={()    => handleDelete(pkg)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <PackageModal
          form={form}
          isEdit={!!editTarget}
          saving={saving}
          error={formError}
          onChange={handleFormChange}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
