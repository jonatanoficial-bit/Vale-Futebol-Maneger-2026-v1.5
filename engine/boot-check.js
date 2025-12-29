/* engine/bootcheck.js */
(function () {
  const BootCheck = {
    steps: [],
    startedAt: new Date().toISOString(),

    step(code, label, details) {
      const entry = {
        code,
        label,
        at: new Date().toISOString(),
        details: details || null
      };
      this.steps.push(entry);
      return entry;
    },

    ok(code, label, details) {
      return this.step(code, label, details);
    },

    fail(code, message, details) {
      const payload = {
        code,
        message,
        steps: this.steps.slice(),
        details: details || null
      };

      // Tenta modal bonitinho (se UI existir), senão alert.
      try {
        if (window.UI && typeof window.UI.showCritical === "function") {
          window.UI.showCritical(payload);
        } else {
          alert(`${payload.code}\n${payload.message}`);
        }
      } catch (_) {
        alert(`${payload.code}\n${payload.message}`);
      }

      // Também joga no console sempre
      console.error("BOOT_FAIL", payload);

      // Lança erro para interromper boot (sem “meio carregado”)
      throw new Error(`${payload.code}: ${payload.message}`);
    },

    assert(condition, code, message, details) {
      if (!condition) this.fail(code, message, details);
    },

    // Checks padrão do seu jogo
    runBasicChecks() {
      // E01: DOM
      this.ok("BOOT_E01_DOM_READY", "DOM pronto");

      // E02: ROOT
      const root = document.getElementById("app");
      this.assert(!!root, "BOOT_E02_ROOT_MISSING", "Elemento #app não existe no index.html.", {
        hint: "Garanta que existe <div id=\"app\"></div> no body."
      });
      this.ok("BOOT_E02_ROOT_OK", "Root #app ok");

      // E03: Engine base
      const missing = [];
      if (!window.StorageVFM) missing.push("StorageVFM");
      if (!window.SaveSlots) missing.push("SaveSlots");
      if (!window.DataPacks && !window.DataPack) missing.push("DataPacks/DataPack");
      if (!window.SeasonEngine) missing.push("SeasonEngine");
      if (!window.Game) missing.push("Game");
      if (window.Game && typeof window.Game.boot !== "function") missing.push("Game.boot");
      if (!window.UI) missing.push("UI");

      this.assert(missing.length === 0, "BOOT_E03_ENGINE_MISSING", "Engine não carregou corretamente.", {
        missing,
        hint:
          "Verifique a ORDEM e os NOMES dos scripts no index.html (storage -> saveSlots -> datapacks -> season -> gameCore -> ui -> bootcheck -> main). " +
          "E confirme se os arquivos existem com o mesmo nome (maiúsculas/minúsculas e hífens contam no Vercel)."
      });

      this.ok("BOOT_E03_ENGINE_OK", "Engine carregada");
      return true;
    }
  };

  window.BootCheck = BootCheck;
})();