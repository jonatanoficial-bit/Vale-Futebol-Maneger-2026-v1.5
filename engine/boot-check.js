(function () {
  const REPORT_KEY = "VFM26_LAST_BOOT_REPORT";

  function nowISO() {
    try { return new Date().toISOString(); } catch { return String(Date.now()); }
  }

  function safeStringify(obj) {
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
  }

  function writeReport(report) {
    try { localStorage.setItem(REPORT_KEY, safeStringify(report)); } catch {}
  }

  function readReport() {
    try {
      const raw = localStorage.getItem(REPORT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function makeFail(code, message, details) {
    return {
      ok: false,
      code,
      message,
      details: details || null,
      at: nowISO(),
    };
  }

  function makeOk(stage, details) {
    return {
      ok: true,
      stage,
      details: details || null,
      at: nowISO(),
    };
  }

  function runChecks({ getRoot, getState, listPacks }) {
    const startedAt = nowISO();
    const steps = [];

    // E01: DOM
    steps.push(makeOk("BOOT_E01_DOM_READY"));

    // E02: root
    const root = getRoot();
    if (!root) {
      const fail = makeFail(
        "BOOT_E02_ROOT_MISSING",
        "Elemento #app não encontrado (UI root).",
        { hint: "Verifique index.html e se existe <div id='app'></div>." }
      );
      const report = { startedAt, endedAt: nowISO(), steps, fail };
      writeReport(report);
      return report;
    }
    steps.push(makeOk("BOOT_E02_ROOT_OK"));

    // E03: engine globals
    const required = ["Utils", "State", "DataPack", "SaveSlots"];
    const missing = required.filter((k) => !window[k]);
    if (missing.length) {
      const fail = makeFail(
        "BOOT_E03_ENGINE_MISSING",
        "Engine não carregou corretamente.",
        {
          missing,
          hint: "Verifique a ORDEM dos scripts no index.html (utils -> state -> datapack -> save-slots -> main).",
        }
      );
      const report = { startedAt, endedAt: nowISO(), steps, fail };
      writeReport(report);
      return report;
    }
    steps.push(makeOk("BOOT_E03_ENGINE_OK", { required }));

    // E04: state válido
    let state = null;
    try {
      state = getState();
      if (!state || typeof state !== "object") throw new Error("state inválido");
    } catch (e) {
      const fail = makeFail(
        "BOOT_E04_STATE_INVALID",
        "State inválido ou corrompido.",
        { error: String(e), hint: "Limpe o localStorage ou revise engine/state.js." }
      );
      const report = { startedAt, endedAt: nowISO(), steps, fail };
      writeReport(report);
      return report;
    }
    steps.push(makeOk("BOOT_E04_STATE_OK"));

    // E05: packs
    let packs = [];
    try {
      packs = listPacks();
      if (!Array.isArray(packs) || packs.length === 0) {
        throw new Error("packs vazio");
      }
    } catch (e) {
      const fail = makeFail(
        "BOOT_E05_PACKS_EMPTY",
        "Lista de Pacotes de Dados vazia ou inválida.",
        { error: String(e), hint: "Revise engine/datapack.js (DataPack.listPacks)." }
      );
      const report = { startedAt, endedAt: nowISO(), steps, fail };
      writeReport(report);
      return report;
    }
    steps.push(makeOk("BOOT_E05_PACKS_OK", { count: packs.length }));

    // E06: render básico (apenas valida que conseguimos escrever no root)
    try {
      const probe = document.createElement("div");
      probe.setAttribute("data-boot-probe", "1");
      root.appendChild(probe);
      root.removeChild(probe);
    } catch (e) {
      const fail = makeFail(
        "BOOT_E06_RENDER_FAIL",
        "Não foi possível manipular o DOM do root (#app).",
        { error: String(e) }
      );
      const report = { startedAt, endedAt: nowISO(), steps, fail };
      writeReport(report);
      return report;
    }
    steps.push(makeOk("BOOT_E06_RENDER_OK"));

    const report = { startedAt, endedAt: nowISO(), steps, fail: null };
    writeReport(report);
    return report;
  }

  window.BootCheck = {
    REPORT_KEY,
    runChecks,
    readReport,
  };
})();