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
