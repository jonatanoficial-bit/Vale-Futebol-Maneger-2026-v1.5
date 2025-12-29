(() => {
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.bootStep?.("main.js start");

  try {
    NS.bootAssert?.(NS.UI, "UI não registrada", "window.VFM26.UI não existe.", "BOOT_E04_UI_NOT_FOUND");
    NS.bootAssert?.(NS.Engine, "Engine não registrada", "window.VFM26.Engine não existe.", "BOOT_E03_ENGINE_NOT_REGISTERED");

    // Start UI
    NS.UI.start();
    NS.bootStep?.("App iniciado com sucesso");
  } catch (e) {
    NS.fatal?.("Erro crítico no boot", e?.message || String(e), "BOOT_FATAL");
  }
})();