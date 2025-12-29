/* boot.js - bootstrap seguro (sem UI.start inexistente) */
(function () {
  const NS = (window.VFM26 = window.VFM26 || {});

  function fatal(code, message, err) {
    console.error(`[${code}] ${message}`, err || '');
    // tenta mostrar uma tela amigável (sem depender do UI)
    const root = document.getElementById('app') || document.body;
    root.innerHTML = `
      <div class="screen">
        <div class="hdr">
          <h1 class="title">Erro crítico</h1>
          <p class="sub">${message}</p>
          <div class="sp"></div>
          <span class="badge">Código: ${code}</span>
        </div>
        <div class="body">
          <div class="card">
            <div style="font-weight:900; margin-bottom:8px;">Dica rápida:</div>
            <div style="color:var(--muted)">
              Abra o console do navegador e procure por <b>BOOT_STEPS</b> para ver onde falhou.
            </div>
            <div class="bootlog" id="bootlog"></div>
          </div>
          <div class="sp"></div>
          <div class="row">
            <button class="btn btn-gray" onclick="location.reload()">Recarregar</button>
          </div>
        </div>
      </div>
    `;
    try {
      const logEl = document.getElementById('bootlog');
      if (logEl && NS.BootCheck && Array.isArray(NS.BootCheck.steps)) {
        logEl.textContent = "BOOT_STEPS:\n" + NS.BootCheck.steps.map(s => `- ${s}`).join('\n');
      }
    } catch(_) {}
  }

  function step(name) {
    try {
      if (NS.BootCheck && typeof NS.BootCheck.step === 'function') {
        NS.BootCheck.step(name);
      } else {
        // fallback simples
        NS.BootCheck = NS.BootCheck || { steps: [] };
        NS.BootCheck.steps.push(name);
      }
    } catch (e) {
      // não mata o boot por causa do logger
      console.warn("BootCheck falhou:", e);
    }
  }

  function boot() {
    step("DOM pronto");

    // 1) UI existe?
    if (!NS.UI || typeof NS.UI.init !== 'function' || typeof NS.UI.go !== 'function') {
      return fatal("BOOT_E02_UI_NOT_READY", "UI não carregou corretamente (UI.init/UI.go ausentes). Verifique scripts no index.html.");
    }
    step("UI carregada");

    // 2) Game existe? (game.js registra VFM26.Game)
    if (!NS.Game) {
      return fatal("BOOT_E04_GAME_NOT_FOUND", "Game (ponte) não registrada. Verifique se game.js está sendo carregado.");
    }
    step("Game registrado");

    // 3) mount
    const mount = document.getElementById('app');
    if (!mount) {
      return fatal("BOOT_E01_MOUNT_NOT_FOUND", "Elemento #app não encontrado no HTML.");
    }
    step("Mount ok");

    // 4) inicia UI
    try {
      NS.UI.init(mount);
      step("UI.init ok");

      // entra no fluxo inicial (capa)
      NS.UI.go('cover');
      step("UI.go('cover') ok");
    } catch (e) {
      return fatal("BOOT_E99_RUNTIME", "Falha ao inicializar UI.", e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();