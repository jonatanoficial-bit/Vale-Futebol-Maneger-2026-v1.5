// src/app/diagnostics.js

let enabled = false;

export function enableDiagnostics() {
  if (enabled) return;
  enabled = true;

  // Captura erros JS
  window.addEventListener("error", (event) => {
    tryRenderFatal({
      type: "error",
      message: event?.message || "Erro desconhecido",
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno,
      stack: event?.error?.stack,
    });
  });

  // Captura promise rejeitada
  window.addEventListener("unhandledrejection", (event) => {
    const err = event?.reason;
    tryRenderFatal({
      type: "unhandledrejection",
      message: err?.message || String(err || "Promise rejection"),
      stack: err?.stack,
    });
  });
}

/**
 * Mantido por compatibilidade com versões antigas que importavam isso.
 * Hoje não precisamos persistir nada, mas o export existe para não quebrar build.
 */
export function disableDiagnosticsPersist() {
  // no-op
}

function tryRenderFatal(payload) {
  // Se você já tem um "fatal overlay" próprio, pode ignorar este render.
  // Este aqui é só um fallback robusto.

  console.error("FATAL:", payload);

  const fatal = document.querySelector("#fatal");
  if (fatal) {
    fatal.hidden = false;
    fatal.removeAttribute("aria-hidden");
    fatal.innerHTML = `
      <div class="card">
        <h2>Ocorreu um erro</h2>
        <p>Copie o log abaixo e me envie.</p>
        <pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify({
          ...payload,
          href: location.href,
          ua: navigator.userAgent
        }, null, 2))}</pre>
        <button class="btn btn-primary" id="fatalReload">Recarregar</button>
      </div>
    `;
    fatal.querySelector("#fatalReload")?.addEventListener("click", () => location.reload());
    return;
  }

  // Fallback se não existir #fatal
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; inset:0; z-index:999999;
    background:rgba(0,0,0,.75);
    display:flex; align-items:center; justify-content:center;
    padding:16px;
  `;
  el.innerHTML = `
    <div style="max-width:900px;width:100%;background:#0b0b0b;border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:14px;color:#fff">
      <div style="font-weight:800;margin-bottom:6px">Ocorreu um erro</div>
      <div style="opacity:.85;margin-bottom:10px">Copie o log abaixo e me envie.</div>
      <pre style="white-space:pre-wrap;font-size:12px;opacity:.95">${escapeHtml(JSON.stringify({
        ...payload,
        href: location.href,
        ua: navigator.userAgent
      }, null, 2))}</pre>
      <div style="display:flex;gap:10px;margin-top:10px">
        <button id="fatalCopy" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#111;color:#fff;cursor:pointer">Copiar</button>
        <button id="fatalReload2" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#111;color:#fff;cursor:pointer">Recarregar</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector("#fatalReload2")?.addEventListener("click", () => location.reload());
  el.querySelector("#fatalCopy")?.addEventListener("click", async () => {
    const txt = JSON.stringify({ ...payload, href: location.href, ua: navigator.userAgent }, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      alert("Copiado. Cole pra mim aqui.");
    } catch {
      prompt("Copie o log:", txt);
    }
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
