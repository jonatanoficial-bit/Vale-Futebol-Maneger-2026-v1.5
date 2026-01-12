// /src/ui/fatalOverlay.js
// Overlay de erro fatal (fallback). Não depende de framework.
// Objetivo: nunca deixar o app "morrer" por falta de UI de erro.
// Se o appShell já criou #fatal/#fatalPre, usa eles. Senão, cria um overlay próprio.

function safeStringify(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

function ensureFallbackOverlay() {
  let overlay = document.getElementById("fatalOverlayFallback");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "fatalOverlayFallback";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "999999";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0,0,0,0.55)";
  overlay.style.backdropFilter = "blur(6px)";

  const card = document.createElement("div");
  card.style.width = "min(720px, 92vw)";
  card.style.maxHeight = "80vh";
  card.style.overflow = "auto";
  card.style.borderRadius = "18px";
  card.style.padding = "18px";
  card.style.boxShadow = "0 10px 35px rgba(0,0,0,0.45)";
  card.style.background = "rgba(18,18,20,0.92)";
  card.style.border = "1px solid rgba(255,255,255,0.12)";
  card.style.color = "#fff";
  card.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

  const title = document.createElement("div");
  title.textContent = "Ocorreu um erro";
  title.style.fontSize = "20px";
  title.style.fontWeight = "800";
  title.style.marginBottom = "6px";

  const desc = document.createElement("div");
  desc.textContent = "Copie o log abaixo e me envie.";
  desc.style.opacity = "0.9";
  desc.style.marginBottom = "10px";

  const pre = document.createElement("pre");
  pre.id = "fatalOverlayFallbackPre";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordBreak = "break-word";
  pre.style.fontSize = "12px";
  pre.style.lineHeight = "1.35";
  pre.style.padding = "12px";
  pre.style.borderRadius = "12px";
  pre.style.background = "rgba(0,0,0,0.35)";
  pre.style.border = "1px solid rgba(255,255,255,0.12)";
  pre.style.margin = "0 0 12px 0";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.flexWrap = "wrap";
  actions.style.justifyContent = "flex-end";

  const btnCopy = document.createElement("button");
  btnCopy.textContent = "Copiar log";
  btnCopy.style.padding = "10px 14px";
  btnCopy.style.borderRadius = "12px";
  btnCopy.style.border = "1px solid rgba(255,255,255,0.16)";
  btnCopy.style.background = "rgba(255,255,255,0.08)";
  btnCopy.style.color = "#fff";
  btnCopy.style.cursor = "pointer";

  const btnReload = document.createElement("button");
  btnReload.textContent = "Recarregar";
  btnReload.style.padding = "10px 14px";
  btnReload.style.borderRadius = "12px";
  btnReload.style.border = "1px solid rgba(255,255,255,0.16)";
  btnReload.style.background = "linear-gradient(90deg, rgba(255,59,59,0.9), rgba(255,190,90,0.9))";
  btnReload.style.color = "#121214";
  btnReload.style.fontWeight = "800";
  btnReload.style.cursor = "pointer";

  btnReload.addEventListener("click", () => window.location.reload());
  btnCopy.addEventListener("click", async () => {
    const text = pre.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      btnCopy.textContent = "Copiado!";
      setTimeout(() => (btnCopy.textContent = "Copiar log"), 1200);
    } catch {
      // fallback: seleciona texto
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btnCopy.textContent = "Selecionei o log";
      setTimeout(() => (btnCopy.textContent = "Copiar log"), 1200);
    }
  });

  actions.appendChild(btnCopy);
  actions.appendChild(btnReload);

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(pre);
  card.appendChild(actions);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  return overlay;
}

function showViaAppShell(err) {
  const fatal = document.getElementById("fatal");
  const fatalPre = document.getElementById("fatalPre");

  if (!fatal || !fatalPre) return false;

  const payload = {
    message: err?.message || String(err),
    stack: err?.stack || null,
    href: window.location.href,
    time: new Date().toISOString()
  };

  fatalPre.textContent = safeStringify(payload);
  fatal.setAttribute("aria-hidden", "false");
  fatal.classList.add("fatal--show");
  return true;
}

function showViaFallback(err) {
  const overlay = ensureFallbackOverlay();
  const pre = document.getElementById("fatalOverlayFallbackPre");

  const payload = {
    message: err?.message || String(err),
    stack: err?.stack || null,
    href: window.location.href,
    time: new Date().toISOString()
  };

  if (pre) pre.textContent = safeStringify(payload);

  overlay.style.display = "flex";
  overlay.setAttribute("aria-hidden", "false");
}

export function showFatal(err) {
  // Sempre loga no console também:
  try {
    console.error("[FATAL]", err);
  } catch {}

  // 1) tenta usar o overlay do appShell
  const ok = showViaAppShell(err);
  if (ok) return;

  // 2) fallback próprio (caso appShell não tenha montado ainda)
  showViaFallback(err);
}