"use client";

import { useState, useEffect, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Receipt, Plus, Pencil, Trash2, Search, TrendingDown,
  Calendar, Tag, User, FileText, Banknote, Filter, X,
} from "lucide-react";
import { useLang } from "../LangContext";
import { apiUrl, getAuthHeaders, getAuthJsonHeaders } from "@/lib/api";

const SETTINGS_KEY = (h: string) => `fandqi.settings.${h}`;

// ─── Types ────────────────────────────────────────────────────────────────────
type TCategory =
  | "salaries" | "utilities" | "maintenance" | "supplies" | "food"
  | "marketing" | "insurance" | "rent" | "equipment" | "other";

interface Expense {
  id: string;
  category: TCategory;
  amount: number;
  currency: string;
  description: string;
  date: string;
  paidTo?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CAT_COLORS: Record<TCategory, { bg: string; color: string; strip: string }> = {
  salaries:    { bg: "#eff6ff", color: "#1d4ed8", strip: "#2563eb" },
  utilities:   { bg: "#fef3c7", color: "#92400e", strip: "#f59e0b" },
  maintenance: { bg: "#fff7ed", color: "#9a3412", strip: "#f97316" },
  supplies:    { bg: "#f0fdf4", color: "#15803d", strip: "#16a34a" },
  food:        { bg: "#fdf4ff", color: "#7e22ce", strip: "#a855f7" },
  marketing:   { bg: "#fef2f2", color: "#991b1b", strip: "#ef4444" },
  insurance:   { bg: "#f0f9ff", color: "#075985", strip: "#0ea5e9" },
  rent:        { bg: "#fafaf9", color: "#44403c", strip: "#78716c" },
  equipment:   { bg: "#ecfdf5", color: "#065f46", strip: "#059669" },
  other:       { bg: "#f8fafc", color: "#475569", strip: "#94a3b8" },
};


function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-SA", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

function blankForm() {
  return {
    category: "other" as TCategory,
    amount: "",
    description: "",
    date: todayISO(),
    paidTo: "",
    notes: "",
  };
}

function mapExpense(x: Record<string, unknown>): Expense {
  const cat = String(x.category ?? "other");
  return {
    id: String(x.id ?? ""),
    category: (CAT_COLORS[cat as TCategory] ? cat : "other") as TCategory,
    amount: Number(x.amount ?? 0),
    currency: String(x.currency ?? "USD"),
    description: String(x.description ?? ""),
    date: String(x.spent_on ?? "").slice(0, 10),
    paidTo: x.paid_to ? String(x.paid_to) : undefined,
    notes: x.notes ? String(x.notes) : undefined,
    createdAt: String(x.created_at ?? ""),
    createdBy: String(x.created_by_name ?? ""),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { t, lang } = useLang();

  const CAT_LABELS: Record<TCategory, string> = {
    salaries:    t("رواتب وأجور"),
    utilities:   t("كهرباء وماء واتصالات"),
    maintenance: t("صيانة ومستلزمات"),
    supplies:    t("مواد ومستلزمات"),
    food:        t("مشتريات المطعم"),
    marketing:   t("تسويق وإعلان"),
    insurance:   t("تأمين"),
    rent:        t("إيجار"),
    equipment:   t("معدات وأجهزة"),
    other:       t("أخرى"),
  };

  const MONTHS = [
    t("يناير"), t("فبراير"), t("مارس"), t("أبريل"), t("مايو"), t("يونيو"),
    t("يوليو"), t("أغسطس"), t("سبتمبر"), t("أكتوبر"), t("نوفمبر"), t("ديسمبر"),
  ];

  const hotelId  = typeof window !== "undefined" ? (localStorage.getItem("hotel_id") ?? "") : "";

  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [currency,   setCurrency]   = useState("USD");
  const [toast,      setToast]      = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState(blankForm());
  const [formErr,    setFormErr]    = useState("");
  const [search,     setSearch]     = useState("");
  const [fCategory,  setFCategory]  = useState<TCategory | "all">("all");
  const [fMonth,     setFMonth]     = useState<string>("all");
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");   // م6: سبب الإبطال

  // ── Load (من الـBackend — لا localStorage) ───────────────────────────────
  const loadExpenses = async () => {
    if (!hotelId) return;
    try {
      const r = await fetch(apiUrl(`/expenses/?hotel=${hotelId}`), { headers: getAuthHeaders() });
      const data = await r.json();
      const list: Record<string, unknown>[] = Array.isArray(data) ? data : data.results ?? [];
      // م6: تُستثنى المصاريف الملغاة من القائمة/الإجماليات التشغيلية (محفوظة في الـBackend + سجلّ التدقيق)
      setExpenses(list.filter(x => !x.voided).map(mapExpense));
    } catch { setExpenses([]); }
  };

  useEffect(() => {
    if (!hotelId) return;
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY(hotelId)) ?? "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل/ضبط حالة مقصود عند الإقلاع
      if (s.ops?.currency) setCurrency(s.ops.currency);
    } catch {}
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  // ── Stats ───────────────────────────────────────────────────────────────
  const thisMonth = todayISO().slice(0, 7);
  const monthExpenses = expenses.filter(e => e.date.slice(0, 7) === thisMonth);
  const totalThisMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalAll       = expenses.reduce((s, e) => s + e.amount, 0);

  const topCat = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] as TCategory | undefined;
  }, [expenses]);

  const avgMonthly = useMemo(() => {
    const months = new Set(expenses.map(e => e.date.slice(0, 7)));
    return months.size ? totalAll / months.size : 0;
  }, [expenses, totalAll]);

  // ── Available months for filter ─────────────────────────────────────────
  const availMonths = useMemo(() => {
    return [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort().reverse();
  }, [expenses]);

  // ── Filtered list ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...expenses]
      .filter(e => {
        if (fCategory !== "all" && e.category !== fCategory) return false;
        if (fMonth    !== "all" && !e.date.startsWith(fMonth)) return false;
        if (q) {
          const hay = [e.description, e.paidTo, e.notes, CAT_LABELS[e.category]].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- CAT_LABELS derives from t(); adding it to deps would invalidate every render since it's recreated each render
  }, [expenses, fCategory, fMonth, search]);

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);

  // ── CRUD ────────────────────────────────────────────────────────────────
  function openAdd() {
    setForm(blankForm());
    setEditId(null);
    setFormErr("");
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setForm({
      category: e.category,
      amount: String(e.amount),
      description: e.description,
      date: e.date,
      paidTo: e.paidTo ?? "",
      notes: e.notes ?? "",
    });
    setEditId(e.id);
    setFormErr("");
    setShowForm(true);
  }

  async function saveExpense() {
    if (!form.description.trim()) { setFormErr(t("وصف المصروف مطلوب.")); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setFormErr(t("المبلغ يجب أن يكون أكبر من صفر.")); return; }
    if (!form.date) { setFormErr(t("التاريخ مطلوب.")); return; }
    const body = {
      category: form.category, amount: amt, currency,
      description: form.description.trim(), spent_on: form.date,
      paid_to: form.paidTo.trim(), notes: form.notes.trim(),
    };
    try {
      const r = await fetch(editId ? apiUrl(`/expenses/${editId}/`) : apiUrl("/expenses/"), {
        method: editId ? "PATCH" : "POST",
        headers: getAuthJsonHeaders(),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      showToast(editId ? t("تم تحديث المصروف.") : t("تم إضافة المصروف بنجاح."));
      setShowForm(false);
      await loadExpenses();
    } catch { setFormErr(t("تعذّر الحفظ، حاول مرة أخرى.")); }
  }

  // م6: لا حذف مالي — إبطال (void) موثَّق بسبب إلزامي
  async function voidExpense(id: string) {
    if (!voidReason.trim()) { showToast(t("سبب الإبطال مطلوب.")); return; }
    try {
      const r = await fetch(apiUrl(`/expenses/${id}/void/`), {
        method: "POST", headers: getAuthJsonHeaders(),
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      if (!r.ok) throw new Error();
      setDeleteId(null); setVoidReason("");
      showToast(t("تم إبطال المصروف."));
      await loadExpenses();
    } catch { showToast(t("تعذّر الإبطال.")); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="ds-page">

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff", padding: "0.7rem 1.5rem",
          borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px #0003", zIndex: 9999,
        }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "var(--color-heading)" }}>{t("المصاريف")}</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: "0.25rem" }}>
            {t("تتبع مصاريف الفندق التشغيلية من رواتب وصيانة ومستلزمات وغيرها.")}
          </p>
        </div>
        <button className="ds-btn ds-btn-primary" onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={15} /> {t("إضافة مصروف")}
        </button>
      </div>

      {/* ── Stat cards ── */}
      {(()=>{
        const curMonth = new Date().toISOString().slice(0,7);
        return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {([
          { label:"مصاريف هذا الشهر", value:`${totalThisMonth.toLocaleString("en-US",{minimumFractionDigits:0})} ${currency}`, sub:MONTHS[new Date().getMonth()],         Icon:TrendingDown as LucideIcon, grad:"linear-gradient(135deg,#dc2626,#b91c1c)", active:fMonth===curMonth,                         clickable:true,  onClick:()=>setFMonth(curMonth) },
          { label:"إجمالي المصاريف",  value:`${totalAll.toLocaleString("en-US",{minimumFractionDigits:0})} ${currency}`,          sub:"منذ البداية",                          Icon:Banknote     as LucideIcon, grad:"linear-gradient(135deg,#4f46e5,#6366f1)", active:fMonth==="all"&&fCategory==="all",            clickable:true,  onClick:()=>{setFMonth("all");setFCategory("all");} },
          { label:"متوسط الشهر",      value:`${Math.round(avgMonthly).toLocaleString("en-US")} ${currency}`,                      sub:"متوسط المصاريف الشهرية",              Icon:Calendar     as LucideIcon, grad:"linear-gradient(135deg,#0891b2,#0e7490)", active:false,                                       clickable:false, onClick:()=>{} },
          { label:"أعلى فئة مصاريف", value:topCat?CAT_LABELS[topCat]:"—",                                                         sub:"الفئة الأكثر إنفاقاً",                Icon:Tag          as LucideIcon, grad:"linear-gradient(135deg,#d97706,#b45309)", active:!!topCat&&fCategory===topCat,                clickable:!!topCat, onClick:()=>{if(topCat)setFCategory(topCat);} },
        ] as {label:string;value:string;sub:string;Icon:LucideIcon;grad:string;active:boolean;clickable:boolean;onClick:()=>void}[]).map(s => (
          <div key={s.label} className="ds-kpi-card" onClick={s.onClick}
            style={{ background:s.grad, borderRadius:14, padding:"1.1rem 1rem", color:"#fff", cursor:s.clickable?"pointer":"default", position:"relative", transition:"transform .15s,box-shadow .15s", ...(s.active?{transform:"translateY(-3px) scale(1.02)",boxShadow:"0 0 0 3px rgba(255,255,255,.8),0 8px 24px rgba(0,0,0,.2)"}:{}) }}>
            {s.active&&<span style={{position:"absolute",top:"0.4rem",left:"0.5rem",fontSize:"0.55rem",fontWeight:700,background:"rgba(255,255,255,.25)",padding:"0.1rem 0.4rem",borderRadius:"1rem"}}>{t("● نشط")}</span>}
            <div className="ds-kpi-icon"><s.Icon size={26} strokeWidth={1.6} /></div>
            <p style={{ fontSize:13, fontWeight:700, opacity:.90, marginBottom:4 }}>{t(s.label)}</p>
            <p style={{ fontSize:18, fontWeight:900, lineHeight:1.2, marginBottom:3 }}>{s.value}</p>
            <p style={{ fontSize:11, opacity:.78 }}>{t(s.sub)}</p>
          </div>
        ))}
      </div>
        );
      })()}

      {/* ── Filters ── */}
      <div className="ds-card-p" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.6rem" }}>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Search size={13} strokeWidth={2.2} color="#4f46e5" /> {t("بحث بالوصف أو الجهة المدفوعة")}</p>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("وصف المصروف، جهة الدفع، ملاحظات...")} />
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Tag size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الفئة")}</p>
            <select className="select" value={fCategory} onChange={e => setFCategory(e.target.value as TCategory | "all")}>
              <option value="all">{t("كل الفئات")}</option>
              {(Object.entries(CAT_LABELS) as [TCategory, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="ds-filter-group">
            <p className="ds-filter-label"><Filter size={13} strokeWidth={2.2} color="#4f46e5" /> {t("الشهر")}</p>
            <select className="select" value={fMonth} onChange={e => setFMonth(e.target.value)}>
              <option value="all">{t("كل الأشهر")}</option>
              {availMonths.map(m => {
                const [yr, mo] = m.split("-");
                return <option key={m} value={m}>{t(MONTHS[parseInt(mo) - 1])} {yr}</option>;
              })}
            </select>
          </div>
        </div>
      </div>

      {/* ── Cards grid ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-muted)" }}>
          <Receipt size={48} strokeWidth={1.1} style={{ color: "#d1d5db", marginBottom: 12 }} />
          <p style={{ fontWeight: 800, fontSize: 17, color: "var(--color-heading)", marginBottom: 6 }}>
            {expenses.length === 0 ? t("لا توجد مصاريف مسجلة بعد") : t("لا توجد نتائج مطابقة")}
          </p>
          <p style={{ fontSize: 13 }}>
            {expenses.length === 0
              ? t("ابدأ بتسجيل أول مصروف للفندق.")
              : t("غيّر الفلاتر أو كلمة البحث لعرض مصاريف أخرى.")}
          </p>
        </div>
      ) : (
        <>
          {/* filtered total bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-muted)" }}>
              {lang === "ar" ? `${filtered.length} مصروف مطابق` : `${filtered.length} matching expense(s)`}
            </span>
            <span style={{ fontWeight: 900, fontSize: 15, color: "#dc2626" }}>
              {t("إجمالي")}: {filteredTotal.toLocaleString("en-US")} {currency}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "0.85rem" }}>
            {filtered.map(e => {
              const cc = CAT_COLORS[e.category];
              return (
                <div key={e.id} style={{
                  background: cc.bg, border: `1px solid ${cc.strip}30`,
                  borderRight: `4px solid ${cc.strip}`, borderRadius: 12,
                  padding: "0.95rem", display: "flex", flexDirection: "column", gap: "0.45rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  {/* Top */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: 14, color: "#1e293b", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.description}
                      </p>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 20,
                        fontSize: 11, fontWeight: 700, background: cc.strip + "18", color: cc.color,
                      }}>
                        {CAT_LABELS[e.category]}
                      </span>
                    </div>
                    <div style={{ textAlign: "left", flexShrink: 0 }}>
                      <p style={{ fontWeight: 900, fontSize: 17, color: "#dc2626" }}>
                        {e.amount.toLocaleString("en-US")}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{e.currency || currency}</p>
                    </div>
                  </div>

                  {/* Meta grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem" }}>
                    <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "4px 8px", fontSize: 11 }}>
                      <p style={{ color: "#1e293b", fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={11} strokeWidth={2} /> {t("التاريخ")}
                      </p>
                      <p style={{ fontWeight: 700, color: "#1e293b" }}>{fmtDate(e.date)}</p>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "4px 8px", fontSize: 11 }}>
                      <p style={{ color: "#1e293b", fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <User size={11} strokeWidth={2} /> {t("الجهة المدفوعة")}
                      </p>
                      <p style={{ fontWeight: 700, color: "#1e293b" }}>{e.paidTo || "—"}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {e.notes && (
                    <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "5px 8px", fontSize: 11, display: "flex", alignItems: "flex-start", gap: 5 }}>
                      <FileText size={12} strokeWidth={2} color={cc.strip} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ color: "#1e293b", fontWeight: 700 }}>{e.notes}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", gap: "0.35rem", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "0.5rem", marginTop: "0.1rem" }}>
                    <button onClick={() => openEdit(e)}
                      style={{ flex: 1, background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, padding: "0.4rem 0.5rem", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Pencil size={12} strokeWidth={2} /> {t("تعديل")}
                    </button>
                    <button onClick={() => setDeleteId(e.id)}
                      style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "0.4rem 0.65rem", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════ ADD / EDIT MODAL ════════════════════════════════════════════════ */}
      {showForm && (
        <div className="ds-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="ds-modal-head">
              <div>
                <p style={{ fontSize: 11, color: "var(--color-primary)", fontWeight: 700, marginBottom: 2 }}>
                  {editId ? t("تعديل مصروف") : t("مصروف جديد")}
                </p>
                <h2>{editId ? t("تعديل بيانات المصروف") : t("إضافة مصروف")}</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowForm(false)}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              {formErr && (
                <p style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: "0.75rem", background: "#fef2f2", padding: "0.5rem 0.75rem", borderRadius: 8 }}>
                  {formErr}
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                <div className="field" style={{ gridColumn: "1/-1" }}>
                  <label className="field-label">{t("وصف المصروف *")}</label>
                  <input className="input" value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder={t("مثال: فاتورة كهرباء شهر يونيو")} />
                </div>
                <div className="field">
                  <label className="field-label">{t("الفئة *")}</label>
                  <select className="select" value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value as TCategory }))}>
                    {(Object.entries(CAT_LABELS) as [TCategory, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t("المبلغ")} ({currency}) *</label>
                  <input className="input" type="number" min="0.01" step="0.01"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div className="field">
                  <label className="field-label">{t("التاريخ *")}</label>
                  <input className="input" type="date" value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">{t("الجهة المدفوعة")}</label>
                  <input className="input" value={form.paidTo}
                    onChange={e => setForm(p => ({ ...p, paidTo: e.target.value }))}
                    placeholder={t("مثال: شركة الكهرباء")} />
                </div>
                <div className="field" style={{ gridColumn: "1/-1" }}>
                  <label className="field-label">{t("ملاحظات")}</label>
                  <textarea className="input" rows={2} value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder={t("أي تفاصيل إضافية...")}
                    style={{ resize: "vertical" }} />
                </div>
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => setShowForm(false)}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-primary" onClick={saveExpense}>
                {editId ? t("حفظ التعديلات") : t("إضافة المصروف")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ VOID (إبطال) MODAL — م6: لا حذف مالي ═══════════════════════════ */}
      {deleteId && (
        <div className="ds-modal-backdrop" onClick={() => { setDeleteId(null); setVoidReason(""); }}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="ds-modal-head">
              <h2>{t("إبطال المصروف")}</h2>
              <button className="icon-btn" onClick={() => { setDeleteId(null); setVoidReason(""); }}><X size={16} strokeWidth={2.5}/></button>
            </div>
            <div className="ds-modal-body">
              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "0.75rem", fontSize: 13, color: "#92400e", fontWeight: 700, marginBottom: "0.85rem" }}>
                {t("لا يُحذف السجلّ المالي نهائيًا — يُعلَّم «ملغى» مع سبب، ويبقى للتدقيق.")}
              </div>
              <div className="field">
                <label className="field-label">{t("سبب الإبطال")} *</label>
                <input className="input" value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder={t("مثال: مصروف مكرّر / مبلغ خاطئ")} autoFocus />
              </div>
            </div>
            <div className="ds-modal-foot">
              <button className="ds-btn ds-btn-neutral" onClick={() => { setDeleteId(null); setVoidReason(""); }}>{t("إلغاء")}</button>
              <button className="ds-btn ds-btn-danger" onClick={() => voidExpense(deleteId)}>{t("تأكيد الإبطال")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
