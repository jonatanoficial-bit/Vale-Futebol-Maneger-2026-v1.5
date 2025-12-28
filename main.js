(() => {
  "use strict";

  function safeAlert(msg) {
    try { alert(msg); } catch (_) {}
  }

  function boot() {
    // Garantia: não iniciar se os módulos base não carregaram
    if (!window.VFM || !VFM.UI || !VFM.Game) {
      console.error("[BOOT] VFM/Game/UI não carregaram.", { VFM: window.VFM });
      safeAlert("Erro crítico: Game ou UI não carregaram.");
      return;
    }

    // DEBUG FAB (opcional) — não pode quebrar se não existir
    const btnDebug = document.getElementById("btnDebug");
    if (btnDebug) {
      btnDebug.onclick = () => {
        try {
          if (VFM.Debug && typeof VFM.Debug.open === "function") {
            VFM.Debug.open();
          } else {
            console.log("[DEBUG]", VFM);
            safeAlert("Debug: veja o console para detalhes.");
          }
        } catch (e) {
          console.error("[DEBUG] erro:", e);
          safeAlert("Debug falhou. Veja o console.");
        }
      };
    }

    // Iniciar loop/UI principal
    try {
      VFM.Game.start();
    } catch (e) {
      console.error("[BOOT] falha ao iniciar VFM.Game.start():", e);
      safeAlert("Erro ao iniciar o jogo. Veja o console.");
    }
  }

  // Executa quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();