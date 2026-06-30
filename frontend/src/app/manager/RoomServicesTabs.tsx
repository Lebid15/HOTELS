"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Wrench, Archive } from "lucide-react";

const TABS = [
  {
    href:  "/manager/housekeeping",
    label: "التنظيف",
    Icon:  Sparkles,
    grad:  "linear-gradient(135deg,#06b6d4,#0891b2)",
    shadow:"0 4px 14px rgba(6,182,212,0.4)",
  },
  {
    href:  "/manager/maintenance",
    label: "الصيانة",
    Icon:  Wrench,
    grad:  "linear-gradient(135deg,#f97316,#ea580c)",
    shadow:"0 4px 14px rgba(249,115,22,0.4)",
  },
  {
    href:  "/manager/lost-found",
    label: "المفقودات والموجودات",
    Icon:  Archive,
    grad:  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
    shadow:"0 4px 14px rgba(139,92,246,0.4)",
  },
];

export default function RoomServicesTabs() {
  const pathname = usePathname();
  return (
    <div className="rs-tabs-wrap" style={{
      display: "flex", gap: "0.5rem",
      background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
      borderRadius: 14, padding: "0.35rem",
      marginBottom: "1.5rem",
      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.07)",
    }}>
      {TABS.map(tab => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="rs-tab-link"
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "0.65rem 1rem", borderRadius: 10, textDecoration: "none",
              fontSize: 13, fontWeight: active ? 800 : 600,
              background: active ? tab.grad : "transparent",
              color: active ? "#fff" : "#64748b",
              boxShadow: active ? tab.shadow : "none",
              transform: active ? "translateY(-1px)" : "translateY(0)",
              transition: "all .18s", minWidth: 0,
            }}
          >
            <tab.Icon size={15} strokeWidth={active ? 2.3 : 1.8} style={{ flexShrink: 0 }} />
            <span className="rs-tab-label" style={{
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
