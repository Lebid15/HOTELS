"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  CheckCheck,
  Check,
  ArrowLeft,
  Bell,
  BellOff,
  ClipboardList,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CircleDollarSign,
} from "lucide-react";
import { apiUrl, getAuthHeaders } from "@/lib/api";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Severity = "danger" | "warning" | "info";

interface PlatformNotification {
  id: string;
  type: string;
  severity: Severity;
  title: string;
  description: string;
  count: number;
  link: string;
}

interface NotificationsResponse {
  notifications: PlatformNotification[];
  total: number;
}

/* ── Constants ─────────────────────────────────────────────────────────────── */
const READ_KEY = "fandqi.platform.notifs.read";

const SEVERITY_TABS: { key: "all" | Severity; label: string }[] = [
  { key: "all",     label: "الكل" },
  { key: "danger",  label: "خطيرة" },
  { key: "warning", label: "تنبيه" },
  { key: "info",    label: "معلومة" },
];

const READ_TABS: { key: "all" | "unread" | "read"; label: string }[] = [
  { key: "all",    label: "الكل" },
  { key: "unread", label: "غير مقروءة" },
  { key: "read",   label: "مقروءة" },
];

const TYPE_ICONS: Record<string, typeof Bell> = {
  subscription_request: ClipboardList,
  subscription:         BadgeCheck,
  hotel:                Building2,
  web_booking:          CalendarCheck,
  commission:           CircleDollarSign,
};

function iconForType(type: string): typeof Bell {
  return TYPE_ICONS[type] ?? Bell;
}

/* ── localStorage read-state helpers ───────────────────────────────────────── */
function loadReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(READ_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function persistReadIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
    // best-effort: let the layout bell refresh its unread count
    window.dispatchEvent(new Event("storage"));
  } catch {
    /* ignore */
  }
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function PlatformNotificationsPage() {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [readIds, setReadIds]             = useState<string[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [sevFilter, setSevFilter]         = useState<"all" | Severity>("all");
  const [readFilter, setReadFilter]       = useState<"all" | "unread" | "read">("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/platform/notifications/"), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data: NotificationsResponse = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      setError("تعذّر تحميل تنبيهات المنصة. حاول مرة أخرى.");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setReadIds(loadReadIds());
    fetchNotifications();
  }, [fetchNotifications]);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  function markRead(id: string) {
    if (readSet.has(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    persistReadIds(next);
  }

  function markAllRead() {
    const all = notifications.map(n => n.id);
    const next = Array.from(new Set([...readIds, ...all]));
    setReadIds(next);
    persistReadIds(next);
  }

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (sevFilter !== "all" && n.severity !== sevFilter) return false;
      const isRead = readSet.has(n.id);
      if (readFilter === "unread" && isRead) return false;
      if (readFilter === "read" && !isRead) return false;
      return true;
    });
  }, [notifications, sevFilter, readFilter, readSet]);

  return (
    <div className="ds-page" dir="rtl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>إشعارات المنصة</h1>
          <p>تنبيهات إدارية خاصة بالمنصة فقط</p>
        </div>
        <div className="page-actions">
          <button className="ds-btn ds-btn-neutral ds-btn-sm" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw size={14} strokeWidth={2.5} /> تحديث
          </button>
          <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} strokeWidth={2.5} /> تعليم الكل كمقروء
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="ds-filters">
        <div className="ds-tabs" role="tablist" aria-label="تصفية حسب الأهمية">
          {SEVERITY_TABS.map(tab => (
            <button
              key={tab.key}
              className={`ds-tab-btn${sevFilter === tab.key ? " active" : ""}`}
              onClick={() => setSevFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ds-tabs" role="tablist" aria-label="تصفية حسب حالة القراءة">
          {READ_TABS.map(tab => (
            <button
              key={tab.key}
              className={`ds-tab-btn${readFilter === tab.key ? " active" : ""}`}
              onClick={() => setReadFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading ? (
        <p className="text-muted">جارٍ التحميل...</p>
      ) : error ? (
        <div className="ds-alert ds-alert-danger">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="ds-empty-state">
          <BellOff size={48} strokeWidth={1.5} className="ds-empty-icon" />
          <h3>لا توجد تنبيهات حاليًا</h3>
          <p>كل شيء مستقر في المنصة.</p>
        </div>
      ) : (
        <div className="pf-notif-list">
          {filtered.map(item => {
            const isRead = readSet.has(item.id);
            const Icon = iconForType(item.type);
            return (
              <div
                key={item.id}
                className={`pf-notif-item sev-${item.severity}${isRead ? " is-read" : ""}`}
              >
                <span className="pf-notif-icon">
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </span>

                <div className="pf-notif-body">
                  <div className="pf-notif-title">
                    {item.title}
                    <span className="ds-badge ds-badge-neutral">{item.count}</span>
                  </div>
                  <div className="pf-notif-desc">{item.description}</div>
                </div>

                <div className="pf-notif-actions">
                  <Link href={item.link} className="ds-btn ds-btn-neutral ds-btn-sm">
                    <ArrowLeft size={14} strokeWidth={2.5} /> فتح
                  </Link>
                  {!isRead && (
                    <button
                      className="ds-btn ds-btn-success ds-btn-xs"
                      onClick={() => markRead(item.id)}
                    >
                      <Check size={13} strokeWidth={2.5} /> تعليم كمقروء
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
