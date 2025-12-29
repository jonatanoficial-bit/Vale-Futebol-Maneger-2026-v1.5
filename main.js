(function () {
  const statusEl = document.getElementById("bootStatus");

  function updateStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  updateStatus("Executando verificações de boot...");

  try {
    // BootCheck
    import("./engine/boot-check.js")
      .then(module => {
        updateStatus("BootCheck carregado...");
        return module.runBootCheck();
      })
      .then(() => {
        updateStatus("Registrando Engine...");
        return import("./engine/index.js");
      })
      .then(engine => {
        updateStatus("Inicializando jogo...");
        return import("./game.js").then(game => game.start(engine.Engine));
      })
      .catch(err => {
        showError("BOOT_E02", err);
      });

  } catch (err) {
    showError("BOOT_E01", err);
  }

  function showError(code, err) {
    console.error(code, err);
    document.getElementById("app").innerHTML = `
      <div class="boot-screen">
        <div class="boot-title">Erro de Inicialização</div>
        <div class="boot-error">${code}</div>
        <div class="boot-status">${err.message || "Erro desconhecido"}</div>
      </div>
    `;
  }
})();
