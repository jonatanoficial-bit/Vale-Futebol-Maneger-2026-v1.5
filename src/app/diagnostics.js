// src/app/diagnostics.js
// Diagnósticos opcionais (somente quando habilitado via ?diag=1 ou localStorage vfmdiag=1)
// IMPORTANTE: imports dinâmicos precisam resolver relativo ao document.baseURI, não ao arquivo atual.

async function tryFetchText(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const ok = res.ok;
    const text = ok ? await res.text() : "";
    return { ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: String(e?.message || e) };
  }
}

async function tryDynamicImport(specifier) {
  try {
    // Resolve SEMPRE pelo documento (index.html), não pelo arquivo atual (diagnostics.js)
    const url = new URL(specifier, document.baseURI).href;
    await import(url);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, url: new URL(specifier, document.baseURI).href, error: String(e?.message || e) };
  }
}

function nowIso() {
  try {
    return new Date().toISOString();
  } catch {
    return "";
  }
}

export function isDiagnosticsEnabled() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("diag") === "1") return true;
  try {
    return localStorage.getItem("vfmdiag") === "1";
  } catch {
    return false;
  }
}

export async function runDiagnostics() {
  // Não deixa quebrar o app: se algo der errado, apenas retorna um relatório.
  const report = {
    at: nowIso(),
    href: window.location.href,
    ua: navigator.userAgent,
    checks: [],
  };

  const moduleChecks = [
    { name: "bootstrap", path: "./src/app/bootstrap.js", type: "import" },
    { name: "router", path: "./src/app/router.js", type: "import" },
    { name: "screenManager", path: "./src/app/screenManager.js", type: "import" },

    { name: "escapeHtml", path: "./src/ui/util/escapeHtml.js", type: "import" },
    { name: "dataPackSelect", path: "./src/ui/screens/dataPackSelect.js", type: "import" },
    { name: "saveSlots", path: "./src/ui/screens/saveSlots.js", type: "import" },
    { name: "clubSelect", path: "./src/ui/screens/clubSelect.js", type: "import" },
    { name: "hub", path: "./src/ui/screens/hub.js", type: "import" },

    // Se existirem no seu projeto:
    { name: "squad", path: "./src/ui/screens/squad.js", type: "import" },
    { name: "player", path: "./src/ui/screens/player.js", type: "import" },
    { name: "tactics", path: "./src/ui/screens/tactics.js", type: "import" },
    { name: "training", path: "./src/ui/screens/training.js", type: "import" },
    { name: "competitions", path: "./src/ui/screens/competitions.js", type: "import" },
    { name: "finance", path: "./src/ui/screens/finance.js", type: "import" },
  ];

  for (const chk of moduleChecks) {
    if (chk.type === "import") {
      const r = await tryDynamicImport(chk.path);
      report.checks.push({
        name: chk.name,
        kind: "module_import",
        ok: r.ok,
        path: chk.path,
        url: r.url,
        error: r.ok ? "" : r.error,
      });
    }
  }

  // Checklist de arquivos críticos (fetch simples)
  const fileChecks = [
    { name: "index", path: "./index.html" },
    { name: "styles", path: "./src/ui/styles.css" },
  ];

  for (const f of fileChecks) {
    const url = new URL(f.path, document.baseURI).href;
    const r = await tryFetchText(url);
    report.checks.push({
      name: f.name,
      kind: "fetch",
      ok: r.ok,
      status: r.status,
      url,
      error: r.ok ? "" : r.text,
    });
  }

  // Exibe no console de forma clara (sem interferir no jogo)
  try {
    const failed = report.checks.filter((c) => !c.ok);
    if (failed.length) {
      console.groupCollapsed(`VFM Diagnostics: ${failed.length} falha(s)`);
      console.table(failed);
      console.groupEnd();
    } else {
      console.info("VFM Diagnostics: tudo OK ✅");
    }
  } catch {}

  return report;
}
