// src/ui/util/escapeHtml.js
export function escapeHtml(input = "") {
  const s = String(input);
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default escapeHtml;
