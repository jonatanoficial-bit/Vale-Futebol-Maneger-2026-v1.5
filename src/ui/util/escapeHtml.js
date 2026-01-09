// src/ui/util/escapeHtml.js
/**
 * Escapa HTML para evitar quebrar o layout e prevenir injeção em strings exibidas no DOM.
 * Use sempre que for inserir texto vindo de JSON, storage, etc, via innerHTML.
 */
export function escapeHtml(input) {
  const s = String(input ?? "");

  // Escape mínimo e seguro para HTML
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// opcional: algumas partes do projeto podem usar default
export default escapeHtml;