// /src/ui/util/escapeHtml.js
export function escapeHtml(input) {
  const s = String(input ?? "");
  return s.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

export default escapeHtml;
