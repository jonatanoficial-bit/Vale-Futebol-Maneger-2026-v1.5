// src/ui/fatalOverlay.js
// Instala um "overlay" de erro fatal SEM interferir no jogo.
// Ele só aparece se ocorrer erro não tratado.
// Pode ser removido facilmente no final (apagar este arquivo e o import).

export function installFatalOverlay(shell, opts = {}) {
  const {
    showConsole = true,
    allowReload = true,
  } = opts;

  let installed = true;

  function toText(errLike) {
    try {
      if (!errLike) return "Erro desconhecido";
      if (typeof errLike === "string") return errLike;
      if (errLike instanceof Error) return errLike.stack || errLike.message || String(errLike);
      if (typeof errLike === "object") return JSON.stringify(errLike, null, 2);
      return String(errLike);
    } catch {
      return "Erro (falha ao serializar detalhes)";
    }
  }

  function showFatal(title, details) {
    if (!installed) return;
    try {
      if (shell && typeof shell.showFatal === "function") {
        shell.showFatal({
          title: title || "Ocorreu um erro",
          details: details || "",
          showConsole,
          allowReload,
        });
        return;
      }
    } catch {
      // se o shell falhar, cai pro fallback abaixo
    }

    // Fallback (muito simples)
    const pre = document.createElement("pre");
    pre.style.cssText = `
      position:fixed; inset:0; z-index:999999;
      margin:0; padding:16px; overflow:auto;
      background:rgba(0,0,0,.9); color:#fff;
      font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      white-space:pre-wrap;
    `;
    pre.textContent = `${title || "Ocorreu um erro"}\n\n${details || ""}`;
    document.body.appendChild(pre);
  }

  function onError(event) {
    const msg = event?.message || "Erro não tratado";
    const file = event?.filename ? `\nArquivo: ${event.filename}:${event.lineno || 0}:${event.colno || 0}` : "";
    const err = event?.error ? `\n\n${toText(event.error)}` : "";
    showFatal(msg, `${msg}${file}${err}`);
  }

  function onRejection(event) {
    const reason = event?.reason;
    showFatal("Promise rejeitada (unhandledrejection)", toText(reason));
  }

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return function uninstall() {
    installed = false;
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}