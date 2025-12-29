// engine/bootcheck.js
(() => {
  "use strict";

  const STEPS = [];
  const FAIL = (code, message, details) => {
    const payload = {
      code,
      message,
      steps: STEPS,
      details: details || null
    };

    console.error("BOOT FAIL:", payload);

    alert(
      "Erro crítico\n\n" +
      message +
      "\n\nCódigo: " + code +
      "\n\nDebug no console (BOOT_STEPS)."
    );

    throw new Error(code + " :: " + message);
  };

  const OK = (code) => {
    STEPS.push({
      step: code,
      at: new Date().toISOString()
    });
  };

  // Expor para debug
  window.BOOT_STEPS = STEPS;

  // ===== ETAPAS =====

  // E01 — DOM
  if (document.readyState === "loading") {
    FAIL("BOOT_E01_DOM_NOT_READY", "DOM não está pronto.");
  }
  OK("BOOT_E01_DOM_READY");

  // E02 — Root
  const root = document.getElementById("app");
  if (!root) {
    FAIL("BOOT_E02_ROOT_MISSING", "Elemento #app não encontrado.");
  }
  OK("BOOT_E02_ROOT_OK");

  // E03 — Engine Core
  if (!window.Game || typeof window.Game !== "object") {
    FAIL("BOOT_E03_ENGINE_MISSING", "Engine não carregou corretamente.", {
      missing: ["Game"],
      hint: "Verifique se engine/gameCore.js está carregado antes do main.js"
    });
  }
  OK("BOOT_E03_ENGINE_OK");

  // E04 — DataPack
  if (!window.DataPack) {
    FAIL("BOOT_E04_DATAPACK_MISSING", "DataPack não carregou.", {
      missing: ["DataPack"],
      hint: "Verifique engine/datapack.js e a ordem no index.html"
    });
  }
  OK("BOOT_E04_DATAPACK_OK");

  // E05 — SaveSlots
  if (!window.SaveSlots) {
    FAIL("BOOT_E05_SAVESLOTS_MISSING", "SaveSlots não carregou.", {
      missing: ["SaveSlots"],
      hint: "Verifique engine/saveSlots.js"
    });
  }
  OK("BOOT_E05_SAVESLOTS_OK");

  // E06 — UI
  if (!window.UI || typeof window.UI.init !== "function") {
    FAIL("BOOT_E06_UI_MISSING", "UI não carregou corretamente.", {
      missing: ["UI.init"],
      hint: "Verifique ui/ui.js"
    });
  }
  OK("BOOT_E06_UI_OK");

  // ===== FINAL =====
  console.log("BOOT OK:", STEPS);
})();