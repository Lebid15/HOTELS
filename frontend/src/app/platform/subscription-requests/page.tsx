"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { BASE_URL as API, getAuthHeaders } from "@/lib/api";

interface SubscriptionRequest {
  id: number;
  hotel: number;
  hotel_name: string;
  package: number | null;
  package_name: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string;
  rejection_reason: string;
  requested_by_name: string | null;
  requested_by_email: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending:  "معلق",
  approved: "موافق",
  rejected: "مرفوض",
};
const STATUS_BADGES: Record<string, string> = {
  pending:  "ds-badge ds-badge-warning",
  approved: "ds-badge ds-badge-success",
  rejected: "ds-badge ds-badge-danger",
};

const TABS = [
  { key: "all",      label: "الكل" },
  { key: "pending",  label: "معلق" },
  { key: "approved", label: "موافق" },
  { key: "rejected", label: "مرفوض" },
];

/* ── ApproveModal ──────────────────────────────────────────────────────────── */
function ApproveModal({
  req, onClose, onDone,
}: { req: SubscriptionRequest; onClose: () => void; onDone: (msg: string) => void }) {
  const [months,  setMonths]  = useState(1);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  async function handle() {
    if (months < 1 || months > 60) return setErr("عدد الأشهر يجب أن يكون بين 1 و 60");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/subscription-requests/${req.id}/approve/`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "فشلت الموافقة");
      }
      onDone(`تمت الموافقة على طلب "${req.hotel_name}" لمدة ${months} ${months === 1 ? "شهر" : "أشهر"}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className="ds-modal-card narrow" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h2>الموافقة على الطلب</h2>
          <button className="icon-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div className="ds-modal-body">
          <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
            الفندق: <strong style={{ color: "var(--color-heading)" }}>{req.hotel_name}</strong>
            {req.package_name && <> — الباقة: <strong>{req.package_name}</strong></>}
          </p>
          <div className="field">
            <label className="field-label">مدة الاشتراك بالأشهر (1 – 60)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={60}
              value={months}
              onChange={e => setMonths(Number(e.target.value))}
              autoFocus
            />
          </div>
          {err && <div className="ds-alert ds-alert-danger" style={{ marginTop: "0.75rem" }}>{err}</div>}
        </div>
        <div className="ds-modal-foot">
          <button className="ds-btn ds-btn-neutral" onClick={onClose} disabled={loading}>إلغاء</button>
          <button className="ds-btn ds-btn-success" onClick={handle} disabled={loading || months < 1}>
            <CheckCircle size={14} strokeWidth={2.5} />
            {loading ? "جارٍ الموافقة..." : "موافقة"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── RejectModal ───────────────────────────────────────────────────────────── */
function RejectModal({
  req, onClose, onDone,
}: { req: SubscriptionRequest; onClose: () => void; onDone: (msg: string) => void }) {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  async function handle() {
    if (!reason.trim()) return setErr("يرجى إدخال سبب الرفض");
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/subscription-requests/${req.id}/reject/`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "فشل الرفض");
      }
      onDone(`تم رفض طلب "${req.hotel_name}"`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className="ds-modal-card narrow" onClick={e => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h2>رفض الطلب</h2>
          <button className="icon-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div className="ds-modal-body">
          <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
            الفندق: <strong style={{ color: "var(--color-heading)" }}>{req.hotel_name}</strong>
            {req.package_name && <> — الباقة: <strong>{req.package_name}</strong></>}
          </p>
          <div className="field">
            <label className="field-label">سبب الرفض *</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="أدخل سبب رفض الطلب..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              autoFocus
            />
          </div>
          {err && <div className="ds-alert ds-alert-danger" style={{ marginTop: "0.75rem" }}>{err}</div>}
        </div>
        <div className="ds-modal-foot">
          <button className="ds-btn ds-btn-neutral" onClick={onClose} disabled={loading}>إلغاء</button>
          <button className="ds-btn ds-btn-danger" onClick={handle} disabled={loading}>
            <XCircle size={14} strokeWidth={2.5} />
            {loading ? "جارٍ الرفض..." : "تأكيد الرفض"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── SubscriptionRequestsPage ─────────────────────────────────────────────── */
export default function SubscriptionRequestsPage() {
  const [requests,      setRequests]      = useState<SubscriptionRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("all");
  const [search,        setSearch]        = useState("");
  const [approveTarget, setApproveTarget] = useState<SubscriptionRequest | null>(null);
  const [rejectTarget,  setRejectTarget]  = useState<SubscriptionRequest | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/subscription-requests/`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : data.results ?? []);
      } else {
        showToast("فشل تحميل طلبات الاشتراك", "error");
      }
    } catch {
      showToast("فشل تحميل طلبات الاشتراك", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRequests(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDone(msg: string) {
    setApproveTarget(null);
    setRejectTarget(null);
    showToast(msg);
    fetchRequests();
  }

  const pendingCount  = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const rejectedCount = requests.filter(r => r.status === "rejected").length;

  const byTab   = activeTab === "all" ? requests : requests.filter(r => r.status === activeTab);
  const filtered = byTab.filter(r => {
    const q = search.trim().toLowerCase();
    return !q ||
      r.hotel_name.toLowerCase().includes(q) ||
      (r.package_name ?? "").toLowerCase().includes(q) ||
      (r.requested_by_name ?? "").toLowerCase().includes(q);
  });

  function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <div className="ds-page" dir="rtl">
      {toast && (
        <div className="ds-toast-stack">
          <div className={`ds-toast ds-toast-${toast.type === "success" ? "success" : "error"}`}>
            <span>{toast.message}</span>
            <button className="ds-toast-close" onClick={() => setToast(null)}><X size={14} strokeWidth={2.5} /></button>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>طلبات الاشتراك</h1>
          <p>مراجعة طلبات اشتراك الفنادق في الباقات والموافقة عليها أو رفضها</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={fetchRequests}>
            تحديث
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="pf-grid-3">
        <div className="ds-summary-card">
          <p className="ds-summary-label">الطلبات المعلقة</p>
          <p className="ds-summary-value text-warning">{pendingCount}</p>
          <p className="ds-summary-note">بانتظار المراجعة</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">الموافق عليها</p>
          <p className="ds-summary-value text-success">{approvedCount}</p>
          <p className="ds-summary-note">تمت الموافقة عليها</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">المرفوضة</p>
          <p className="ds-summary-value text-danger">{rejectedCount}</p>
          <p className="ds-summary-note">تم رفضها</p>
        </div>
      </div>

      <div className="ds-card-p">
        {/* Tabs */}
        <div className="ds-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`ds-tab-btn${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key !== "all" && (
                <span style={{ marginRight: "0.4rem" }} className={
                  tab.key === "pending"  ? "ds-badge ds-badge-warning" :
                  tab.key === "approved" ? "ds-badge ds-badge-success" :
                  "ds-badge ds-badge-danger"
                }>
                  {tab.key === "pending" ? pendingCount : tab.key === "approved" ? approvedCount : rejectedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="ds-filters">
          <input
            className="input"
            placeholder="بحث باسم الفندق أو الباقة أو المدير..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>

        {/* Table */}
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>الفندق</th>
                <th>الباقة المطلوبة</th>
                <th>مقدم الطلب</th>
                <th>ملاحظات الطلب</th>
                <th>تاريخ الطلب</th>
                <th>الحالة</th>
                <th>الإجراءات / الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    <span className="text-muted">جارٍ التحميل...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    <span className="text-muted">
                      {search ? "لا توجد نتائج مطابقة." : "لا توجد طلبات."}
                    </span>
                  </td>
                </tr>
              ) : filtered.map(req => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 700 }}>{req.hotel_name}</td>
                  <td className="text-muted">{req.package_name ?? "—"}</td>
                  <td>
                    <div>{req.requested_by_name || "—"}</div>
                    {req.requested_by_email && (
                      <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                        {req.requested_by_email}
                      </div>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: "0.82rem", maxWidth: 200 }}>
                    {req.notes || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td className="text-muted">{formatDate(req.created_at)}</td>
                  <td>
                    <span className={STATUS_BADGES[req.status] ?? "ds-badge ds-badge-neutral"}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </td>
                  <td>
                    {req.status === "pending" && (
                      <div className="table-actions">
                        <button
                          className="ds-btn ds-btn-success ds-btn-sm"
                          onClick={() => setApproveTarget(req)}
                        >
                          <CheckCircle size={13} strokeWidth={2.5} /> موافقة
                        </button>
                        <button
                          className="ds-btn ds-btn-danger ds-btn-sm"
                          onClick={() => setRejectTarget(req)}
                        >
                          <XCircle size={13} strokeWidth={2.5} /> رفض
                        </button>
                      </div>
                    )}
                    {req.status === "approved" && (
                      <span className="text-muted" style={{ fontSize: "0.8rem" }}>تمت الموافقة</span>
                    )}
                    {req.status === "rejected" && (
                      <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                        {req.rejection_reason || "تم الرفض"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {approveTarget && (
        <ApproveModal
          req={approveTarget}
          onClose={() => setApproveTarget(null)}
          onDone={handleDone}
        />
      )}
      {rejectTarget && (
        <RejectModal
          req={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
