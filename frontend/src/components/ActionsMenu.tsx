"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

export interface ActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: "danger" | "success";
  hidden?: boolean;
}

/**
 * Compact table-row actions menu. Uses position:fixed so the popover escapes
 * the `ds-table-wrap` overflow clipping. The only style attribute is the
 * data-driven popover coordinates (same accepted exception as the progress bar).
 */
export default function ActionsMenu({ items, label = "إجراءات" }: { items: ActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc);
    // close on WINDOW scroll/resize only (non-capture) so inner ds-table-wrap
    // horizontal scrolling on mobile does NOT dismiss the menu.
    window.addEventListener("scroll", close);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  const visible = items.filter(i => !i.hidden);

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const vw = window.innerWidth, vh = window.innerHeight, W = 200;
      // RTL natural: align the menu's right edge to the button's right edge (expand left);
      // if that overflows the left edge, align to the button's left edge instead; then clamp.
      let left = r.right - W;
      if (left < 8) left = r.left;
      left = Math.max(8, Math.min(left, vw - W - 8));
      // flip upward if not enough room below
      const estH = Math.min(visible.length * 44 + 14, vh * 0.6);
      let top = r.bottom + 4;
      if (top + estH > vh - 8 && r.top - estH - 4 > 8) top = r.top - estH - 4;
      top = Math.max(8, top);
      setPos({ top, left });
    }
    setOpen(true);
  }

  return (
    <>
      <button ref={btnRef} className="ds-btn ds-btn-neutral ds-btn-sm" onClick={toggle}
        aria-haspopup="menu" aria-expanded={open}>
        <MoreHorizontal size={15} /> {label}
      </button>
      {open && (
        <div ref={popRef} className="pf-actions-pop" role="menu"
          style={{ top: pos.top, left: pos.left }}>
          {visible.map(it => {
            const cls = `pf-actions-item${it.tone === "danger" ? " danger" : it.tone === "success" ? " success" : ""}`;
            const content = <>{it.icon}<span>{it.label}</span></>;
            return it.href ? (
              <Link key={it.key} href={it.href} className={cls} role="menuitem" onClick={() => setOpen(false)}>{content}</Link>
            ) : (
              <button key={it.key} className={cls} role="menuitem" onClick={() => { setOpen(false); it.onClick?.(); }}>{content}</button>
            );
          })}
        </div>
      )}
    </>
  );
}
