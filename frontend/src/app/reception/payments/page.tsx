"use client";

import { useEffect, useState } from "react";
import { apiUrl, getAuthHeaders, getAuthJsonHeaders } from "@/lib/api";
import { useLang } from "@/lib/i18n/LangContext";

type PaymentMethod = "نقدي" | "بطاقة" | "تحويل";
type PaymentStatus = "مستلمة" | "معلقة" | "مسترجعة";

interface Payment {
  id: string;
  receiptNumber: string;
  guestName: string;
  roomNumber: string;
  amount: number;
  method: PaymentMethod;
  dateTime: string;
  status: PaymentStatus;
}

const METHOD_MAP: Record<string, PaymentMethod> = {
  cash: "نقدي",
  electronic: "بطاقة",
  card: "بطاقة",
  transfer: "تحويل",
  room_account: "تحويل",
};

const STATUS_MAP: Record<string, PaymentStatus> = {
  paid: "مستلمة",
  received: "مستلمة",
  pending: "معلقة",
  refunded: "مسترجعة",
};

type TabKey = "today" | "week" | "all";

const statusBadge: Record<PaymentStatus, string> = {
  مستلمة: "ds-badge ds-badge-success",
  معلقة: "ds-badge ds-badge-warning",
  مسترجعة: "ds-badge ds-badge-danger",
};

const methodBadge: Record<PaymentMethod, string> = {
  نقدي: "ds-badge ds-badge-info",
  بطاقة: "ds-badge ds-badge-accent",
  تحويل: "ds-badge ds-badge-luxury",
};

function todayStr() { return new Date().toISOString().split("T")[0]; }

function isTodayPayment(dateTime: string): boolean {
  return dateTime.startsWith(todayStr());
}

function isThisWeekPayment(dateTime: string): boolean {
  const date = new Date(dateTime.split(" ")[0]);
  const today = new Date();
  const diff = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < 7;
}

function mapPayment(p: Record<string, unknown>): Payment {
  const method = METHOD_MAP[String(p.method ?? p.payment_method ?? "")] ?? "نقدي";
  const status = STATUS_MAP[String(p.status ?? "received")] ?? "مستلمة";
  const dateRaw = String(p.created_at ?? p.date ?? "");
  const dateTime = dateRaw.includes("T") ? dateRaw.replace("T", " ").slice(0, 16) : dateRaw;
  const guestName = p.guest_name
    ? String(p.guest_name)
    : `${p.guest_first_name ?? ""} ${p.guest_last_name ?? ""}`.trim() || "—";
  return {
    id: String(p.id ?? ""),
    receiptNumber: String(p.receipt_no ?? p.receipt_number ?? p.booking_number ?? p.id ?? ""),
    guestName,
    roomNumber: String(p.room_number ?? p.room ?? "—"),
    amount: Number(p.amount ?? 0),
    method,
    dateTime,
    status,
  };
}

export default function PaymentsPage() {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    const hotelId = localStorage.getItem("hotel_id");

    const load = async () => {
      if (!hotelId) return;
      try {
        const s = JSON.parse(localStorage.getItem(`fandqi.settings.${hotelId}`) ?? "{}");
        if (s?.ops?.currency) setCurrency(s.ops.currency);
      } catch { /* ignore */ }

      try {
        const r = await fetch(apiUrl(`/payments/?hotel=${hotelId}`), { headers: getAuthHeaders() });
        const data = await r.json();
        const list: Record<string, unknown>[] = Array.isArray(data) ? data : data.results ?? [];
        setPayments(list.map(mapPayment));
      } catch {
        setPayments([]);
      }
    };

    load().finally(() => setLoading(false));
  }, []);

  const [newPayment, setNewPayment] = useState({
    guestName: "",
    roomNumber: "",
    amount: "",
    method: "نقدي" as PaymentMethod,
    notes: "",
  });
  const [formSuccess, setFormSuccess] = useState(false);

  const filteredPayments = payments.filter((p) => {
    if (activeTab === "today" && !isTodayPayment(p.dateTime)) return false;
    if (activeTab === "week" && !isThisWeekPayment(p.dateTime)) return false;
    if (
      searchQuery &&
      !p.guestName.includes(searchQuery) &&
      !p.receiptNumber.includes(searchQuery) &&
      !p.roomNumber.includes(searchQuery)
    )
      return false;
    if (methodFilter !== "all" && p.method !== methodFilter) return false;
    return true;
  });

  const todayPayments = payments.filter((p) => isTodayPayment(p.dateTime));
  const totalToday = todayPayments.reduce((sum, p) => sum + (p.status !== "مسترجعة" ? p.amount : 0), 0);
  const pendingCount = todayPayments.filter((p) => p.status === "معلقة").length;
  const receivedCount = todayPayments.filter((p) => p.status === "مستلمة").length;
  const refundedCount = todayPayments.filter((p) => p.status === "مسترجعة").length;

  function handlePrint(receiptNumber: string) {
    alert(`${t("طباعة الإيصال")}: ${receiptNumber}`);
  }

  const [formError, setFormError] = useState("");

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const hotelId = localStorage.getItem("hotel_id");
    const methodBackend = ({ "نقدي": "cash", "بطاقة": "card", "تحويل": "transfer" } as Record<string, string>)[newPayment.method] ?? "cash";
    const note = [newPayment.guestName, newPayment.roomNumber && `غرفة ${newPayment.roomNumber}`, newPayment.notes]
      .filter(Boolean).join(" — ");
    try {
      const r = await fetch(apiUrl("/payments/"), {
        method: "POST",
        headers: getAuthJsonHeaders(),
        body: JSON.stringify({ amount: Number(newPayment.amount), method: methodBackend, currency, note }),
      });
      if (!r.ok) throw new Error();
      setFormSuccess(true);
      setNewPayment({ guestName: "", roomNumber: "", amount: "", method: "نقدي", notes: "" });
      setTimeout(() => setFormSuccess(false), 3000);
      // إعادة تحميل القائمة من المصدر (لا localStorage)
      const lr = await fetch(apiUrl(`/payments/?hotel=${hotelId}`), { headers: getAuthHeaders() });
      const data = await lr.json();
      const list: Record<string, unknown>[] = Array.isArray(data) ? data : data.results ?? [];
      setPayments(list.map(mapPayment));
    } catch {
      setFormError(t("تعذّر تسجيل الدفعة، حاول مرة أخرى."));
    }
  }

  return (
    <div className="ds-page">
      <div className="page-header">
        <div>
          <h1>{t("المدفوعات")}</h1>
          <p>{t("إدارة مدفوعات الضيوف وتسجيل الإيصالات")}</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral ds-btn-sm">{t("تصدير التقرير")}</button>
        </div>
      </div>

      <div className="ds-summary-grid">
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("إجمالي اليوم")}</p>
          <p className="ds-summary-value text-success">{totalToday.toLocaleString("en-US")} {currency}</p>
          <p className="ds-summary-note">{todayPayments.length} {t("معاملة اليوم")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("معلقة")}</p>
          <p className="ds-summary-value text-warning">{pendingCount}</p>
          <p className="ds-summary-note">{t("تحتاج إلى مراجعة")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("مستلمة")}</p>
          <p className="ds-summary-value text-success">{receivedCount}</p>
          <p className="ds-summary-note">{t("مدفوعات مكتملة")}</p>
        </div>
        <div className="ds-summary-card">
          <p className="ds-summary-label">{t("مسترجعة")}</p>
          <p className="ds-summary-value text-danger">{refundedCount}</p>
          <p className="ds-summary-note">{t("تم الاسترجاع")}</p>
        </div>
      </div>

      <div className="ds-card">
        <div className="ds-tabs">
          <button
            className={`ds-tab-btn${activeTab === "today" ? " active" : ""}`}
            onClick={() => setActiveTab("today")}
          >
            {t("اليوم")}
          </button>
          <button
            className={`ds-tab-btn${activeTab === "week" ? " active" : ""}`}
            onClick={() => setActiveTab("week")}
          >
            {t("هذا الأسبوع")}
          </button>
          <button
            className={`ds-tab-btn${activeTab === "all" ? " active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            {t("الكل")}
          </button>
        </div>

        <div className="ds-filters">
          <input
            className="input"
            type="text"
            placeholder={t("بحث باسم الضيف، رقم الإيصال، أو الغرفة...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">{t("كل الطرق")}</option>
            <option value="نقدي">{t("نقدي")}</option>
            <option value="بطاقة">{t("بطاقة")}</option>
            <option value="تحويل">{t("تحويل")}</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <p className="text-muted">{t("جارٍ تحميل المدفوعات...")}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <p className="text-muted">{t("لا توجد مدفوعات")}</p>
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>{t("رقم الإيصال")}</th>
                  <th>{t("الضيف")}</th>
                  <th>{t("الغرفة")}</th>
                  <th>{t("المبلغ")}</th>
                  <th>{t("طريقة الدفع")}</th>
                  <th>{t("التاريخ والوقت")}</th>
                  <th>{t("الحالة")}</th>
                  <th>{t("الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <span className="text-primary">{payment.receiptNumber}</span>
                    </td>
                    <td>{payment.guestName}</td>
                    <td>{payment.roomNumber}</td>
                    <td>
                      <strong>{payment.amount.toLocaleString("en-US")} {currency}</strong>
                    </td>
                    <td>
                      <span className={methodBadge[payment.method]}>{t(payment.method)}</span>
                    </td>
                    <td className="text-muted">{payment.dateTime}</td>
                    <td>
                      <span className={statusBadge[payment.status]}>{t(payment.status)}</span>
                    </td>
                    <td>
                      <button
                        className="ds-btn ds-btn-neutral ds-btn-sm"
                        onClick={() => handlePrint(payment.receiptNumber)}
                      >
                        {t("طباعة الإيصال")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ds-card-p">
        <h2 style={{ marginBottom: "1.25rem" }}>{t("استلام دفعة جديدة")}</h2>

        {formSuccess && (
          <div className="ds-alert ds-alert-success" style={{ marginBottom: "1rem" }}>
            {t("تم تسجيل الدفعة بنجاح")}
          </div>
        )}
        {formError && (
          <div className="ds-alert ds-alert-danger" style={{ marginBottom: "1rem" }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmitPayment}>
          <div className="modal-grid">
            <div className="field">
              <label className="field-label">{t("اسم الضيف")}</label>
              <input
                className="input"
                type="text"
                placeholder={t("أدخل اسم الضيف")}
                value={newPayment.guestName}
                onChange={(e) => setNewPayment({ ...newPayment, guestName: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">{t("رقم الغرفة")}</label>
              <input
                className="input"
                type="text"
                placeholder={`${t("مثال")}: 101`}
                value={newPayment.roomNumber}
                onChange={(e) => setNewPayment({ ...newPayment, roomNumber: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">{t("المبلغ")} ({currency})</label>
              <input
                className="input"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">{t("طريقة الدفع")}</label>
              <select
                className="select"
                value={newPayment.method}
                onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value as PaymentMethod })}
              >
                <option value="نقدي">{t("نقدي")}</option>
                <option value="بطاقة">{t("بطاقة")}</option>
                <option value="تحويل">{t("تحويل")}</option>
              </select>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">{t("ملاحظات (اختياري)")}</label>
              <textarea
                className="textarea"
                placeholder={t("أضف أي ملاحظات إضافية...")}
                rows={3}
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <button type="submit" className="ds-btn ds-btn-success">
              {t("تسجيل الدفعة")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
