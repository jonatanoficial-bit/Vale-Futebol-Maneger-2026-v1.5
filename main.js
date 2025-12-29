/* main.js */
(function () {
  // Espera DOM mesmo com defer (segurança extra)
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(() => {
    // Bind do debug (sem quebrar se o botão não existir)
    const btn = document.getElementById("btnDebug");
    if (btn) {
      btn.onclick = () => {
        try {
          console.log("BOOT_STEPS", window.BootCheck ? window.BootCheck.steps : []);
          alert("Debug no console (BOOT_STEPS).");
        } catch (_) {}
      };
    }

    // Bootcheck obrigatório
    if (!window.BootCheck) {
      alert("Erro crítico: BootCheck não carregou. Verifique o index.html (engine/bootcheck.js).");
      return;
    }

    // Roda checks básicos (para falhar cedo e explicando)
    window.BootCheck.runBasicChecks();

    // Boot do jogo (agora com segurança)
    window.BootCheck.ok("BOOT_E04_BOOT_CALL", "Chamando Game.boot()");
    window.Game.boot();
    window.BootCheck.ok("BOOT_E05_BOOT_DONE", "Game.boot() finalizado");
  });
})();