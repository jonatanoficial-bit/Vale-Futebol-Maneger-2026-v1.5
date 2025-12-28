/* main.js — Bootstrap seguro do VFM26 (NUNCA pode quebrar o boot por DOM null) */
(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);

  function renderFatal(message, error) {
    console.error("[FATAL]", message, error || "");
    const app = byId("app");
    if (app) {
      app.innerHTML = `
        <div style="
          min-height: 100vh; display:flex; align-items:center; justify-content:center;
          background:#0b0f14; color:#e8eef7; padding:24px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
        ">
          <div style="max-width:720px; width:100%; border:1px solid rgba(255,255,255,.12);
            border-radius:16px; padding:20px; background:rgba(255,255,255,.06)">
            <div style="font-size:18px; font-weight:800; margin-bottom:10px;">Erro crítico</div>
            <div style="opacity:.9; line-height:1.4;">
              ${message}
            </div>
            <div style="margin-top:14px; opacity:.75; font-size:12px;">
              Dica: verifique se <b>index.html</b> está carregando <b>./engine/*</b>, <b>./ui/ui.js</b> e <b>./main.js</b>.
            </div>
          </div>
        </div>
      `;
    } else {
      alert(message);
    }
  }

  function safeBindDebugButton() {
    const btn = byId("btnDebug");
    if (!btn) {
      // NÃO PODE quebrar o boot por causa disso
      console.warn("[BOOT] btnDebug não encontrado. Prosseguindo sem DEBUG.");
      return;
    }
    btn.onclick = () => {
      try {
        if (window.UI && typeof window.UI.toggleDebug === "function") {
          window.UI.toggleDebug();
        } else {
          alert("DEBUG: UI.toggleDebug() não está disponível.");
        }
      } catch (e) {
        console.error("[DEBUG] Erro ao alternar debug:", e);
        alert("Erro no DEBUG. Veja o console.");
      }
    };
  }

  function boot() {
    // 1) Bind seguro de debug (não pode derrubar o jogo)
    safeBindDebugButton();

    // 2) Verificações mínimas (sem throw)
    if (!window.UI || !window.Game) {
      renderFatal("Game ou UI não carregaram.", null);
      return;
    }
    if (typeof window.Game.boot !== "function") {
      renderFatal("window.Game.boot não existe (GameCore não carregou corretamente).", null);
      return;
    }

    // 3) Boot oficial
    try {
      window.Game.boot({ mountId: "app" });
    } catch (e) {
      renderFatal("Falha ao iniciar o jogo (exceção no boot).", e);
    }
  }

  // Garantia de DOM pronto (mais seguro no mobile)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();