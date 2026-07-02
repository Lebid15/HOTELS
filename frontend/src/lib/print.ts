/**
 * Escapes a value for safe insertion into HTML to prevent XSS.
 * Must be applied to ALL user-supplied data before injecting into document.write or innerHTML.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * عابر (§ثانيًا‑2): طباعة موحّدة — تفتح حوار طباعة المتصفح مباشرةً عبر iframe
 * مخفيّ دون فتح صفحة/تبويب جديد. تُستبدَل بها استدعاءات window.open("_blank").
 */
export function printHtml(html: string): void {
  if (typeof document === "undefined") return;
  // نُزيل أي سكربت طباعة تلقائية داخل الـHTML لتفادي طباعة مزدوجة (نُطلقها نحن)
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "-9999px";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = win?.document;
  if (!win || !doc) { try { document.body.removeChild(frame); } catch { /* gone */ } return; }
  doc.open();
  doc.write(clean);
  doc.close();
  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    setTimeout(() => { try { document.body.removeChild(frame); } catch { /* gone */ } }, 800);
  };
  win.addEventListener?.("afterprint", cleanup);
  setTimeout(() => { try { win.focus(); win.print(); } catch { /* ignore */ } }, 300);
  setTimeout(cleanup, 12000);   // احتياط: تنظيف حتمي
}
