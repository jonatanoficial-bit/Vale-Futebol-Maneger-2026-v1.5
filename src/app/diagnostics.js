// /src/app/diagnostics.js
// Sistema de diagnóstico (só roda quando ativado). Seguro para remover no final.

const KEY = "VFM_DIAGNOSTICS";
const KEY_LAST = "VFM_LAST_DIAG";

export function isDiagnosticsEnabled() {
  // Ativa via localStorage OU via URL (?diag=1)
  try {
    const url = new URL(location.href);
    const byUrl = url.searchParams.get("diag") === "1";
    const byLs = localStorage.getItem(KEY) === "1";
    return byUrl || byLs;
  } catch {
    return false;
  }
}

export function enableDiagnosticsPersist() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
}

export function disableDiagnosticsPersist() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/**
 * ✅ Compatibilidade (corrige o erro do seu console):
 * alguns builds/arquivos podem estar importando o nome errado "disabledDiagnosticsPersist".
 * Exportamos um alias para não quebrar.
 */
export const disabledDiagnosticsPersist = disableDiagnosticsPersist;

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function ok(id, info = "") {
  return { id, ok: true, info };
}

function fail(id, info = "") {
  return { id, ok: false, info };
}

async function testDynamicImport(url) {
  try {
    await import(url);
    return true;
  } catch {
    return false;
  }
}

export async function runDiagnostics({ logger, screens, repos, store } = {}) {
  const results = [];
  const report = {
    ts: new Date().toISOString(),
    ua: navigator.userAgent,
    href: location.href,
    results
  };

  // 1) Router básico
  try {
    const hasHash = typeof location.hash === "string";
    results.push(ok("router.hash", `hash=${hasHash ? location.hash : "N/A"}`));
  } catch (e) {
    results.push(fail("router.hash", e?.message || String(e)));
  }

  // 2) LocalStorage
  try {
    const k = "__vfm_ls_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    results.push(ok("storage.localStorage", "ok"));
  } catch (e) {
    results.push(fail("storage.localStorage", e?.message || String(e)));
  }

  // 3) Store básico
  try {
    const state = store?.getState ? store.getState() : null;
    results.push(ok("store.getState", state ? "ok" : "store sem estado (pode ser ok)"));
  } catch (e) {
    results.push(fail("store.getState", e?.message || String(e)));
  }

  // 4) Repos (packs)
  try {
    const packs = repos?.packs?.list?.() ?? repos?.packs?.getAll?.() ?? null;
    const isIterable = packs && typeof packs[Symbol.iterator] === "function";
    results.push(ok("repos.packs.iterable", isIterable ? "iterável" : "NÃO iterável (isso causa 'packs is not iterable')"));
    if (!isIterable) results[results.length - 1].ok = false;
  } catch (e) {
    results.push(fail("repos.packs.iterable", e?.message || String(e)));
  }

  // 5) Imports críticos (pega erros tipo “Failed to fetch dynamically imported module”)
  try {
    const okBootstrap = await testDynamicImport("./src/app/bootstrap.js");
    results.push(okBootstrap ? ok("import.bootstrap", "ok") : fail("import.bootstrap", "falhou importar ./src/app/bootstrap.js"));
  } catch (e) {
    results.push(fail("import.bootstrap", e?.message || String(e)));
  }

  // 6) Imports utilitários que já deram 404 no seu print (escapeHtml.js)
  try {
    const okEscape = await testDynamicImport("./src/ui/util/escapeHtml.js");
    results.push(okEscape ? ok("import.escapeHtml", "ok") : fail("import.escapeHtml", "404 ou path errado em ./src/ui/util/escapeHtml.js"));
  } catch (e) {
    results.push(fail("import.escapeHtml", e?.message || String(e)));
  }

  // 7) Screens registradas
  try {
    const ids = screens?.list?.() ?? [];
    results.push(ok("screens.list", Array.isArray(ids) ? `count=${ids.length}` : "screens.list não disponível"));
  } catch (e) {
    results.push(fail("screens.list", e?.message || String(e)));
  }

  // salvar o relatório (pra você copiar depois)
  try {
    localStorage.setItem(KEY_LAST, JSON.stringify(report, null, 2));
  } catch {}

  // log amigável
  try {
    logger?.info?.("[DIAG]", safeJson(report));
  } catch {}

  return report;
}
