// /src/app/diagnostics.js

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function nowIso() {
  try { return new Date().toISOString(); } catch { return ""; }
}

export function isDiagnosticsEnabled() {
  try {
    const ls = localStorage.getItem("VFM_DIAG") === "1";
    const qs = new URLSearchParams(location.search);
    const byQuery = qs.get("diag") === "1";

    // também aceita no hash: #/hub?diag=1
    const hash = String(location.hash || "");
    const byHash = hash.includes("?diag=1") || hash.includes("&diag=1");

    return ls || byQuery || byHash;
  } catch {
    return false;
  }
}

export function enableDiagnosticsPersist() {
  try { localStorage.setItem("VFM_DIAG", "1"); } catch {}
}

export function disableDiagnosticsPersist() {
  try { localStorage.removeItem("VFM_DIAG"); } catch {}
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${url}`);
  return await res.json();
}

async function headOrGetOk(url) {
  // HEAD pode falhar em alguns hosts; fallback GET
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (r.ok) return true;
  } catch {}
  try {
    const r2 = await fetch(url, { method: "GET", cache: "no-store" });
    return r2.ok;
  } catch {
    return false;
  }
}

function cssLooksLoaded() {
  // Heurística: existe pelo menos 1 stylesheet com regras acessíveis
  try {
    const sheets = Array.from(document.styleSheets || []);
    if (!sheets.length) return false;

    // Se pelo menos 1 tiver cssRules acessível, já é um sinal bom
    for (const sh of sheets) {
      try {
        if (sh && sh.cssRules && sh.cssRules.length >= 1) return true;
      } catch {
        // cross-origin pode bloquear cssRules, então não reprova por isso
      }
    }
    // Se não deu para ler rules, mas existem sheets, consideramos “provável ok”
    return true;
  } catch {
    return false;
  }
}

async function tryDynamicImport(path) {
  // path deve ser relativo ao index.html (raiz do projeto)
  // exemplo: ./src/ui/screens/hub.js
  const mod = await import(path);
  return !!mod;
}

export async function runDiagnostics({ logger, screens, repos, store } = {}) {
  const startedAt = nowIso();
  const results = [];

  function push(id, ok, info = "") {
    results.push({ id, ok: !!ok, info: String(info || "") });
  }

  // 1) CSS
  push("css_loaded", cssLooksLoaded(), "Verifica se stylesheets parecem carregados");

  // 2) Módulos essenciais (import dinâmico)
  const moduleChecks = [
    "./src/app/bootstrap.js",
    "./src/app/router.js",
    "./src/app/screenManager.js",
    "./src/ui/appShell.js",
    "./src/ui/screens/splash.js",
    "./src/ui/screens/dataPackSelect.js",
    "./src/ui/screens/saveSlots.js",
    "./src/ui/screens/hub.js",
    "./src/ui/screens/squad.js",
    "./src/ui/screens/tactics.js",
    "./src/ui/screens/training.js",
    "./src/ui/screens/competitions.js",
    "./src/ui/screens/finance.js",
    "./src/ui/util/escapeHtml.js"
  ];

  for (const p of moduleChecks) {
    try {
      await tryDynamicImport(p);
      push(`module:${p}`, true, "OK");
    } catch (e) {
      push(`module:${p}`, false, e?.message || String(e));
    }
  }

  // 3) Packs (fonte dos “packs is not iterable”)
  try {
    const idx = await fetchJson("./packs/index.json");
    const ok = Array.isArray(idx);
    push("packs_index_is_array", ok, ok ? `packs: ${idx.length}` : `tipo: ${typeof idx}`);

    // validar 1º pack
    if (ok && idx.length > 0) {
      const first = idx[0];
      const id = first?.id || first?.packId || null;
      push("packs_first_has_id", !!id, safeJsonStringify(first).slice(0, 400));

      // tenta abrir manifest do pack (se existir no seu formato)
      // (não falha o diagnóstico se não existir — só reporta)
      if (id) {
        const manifestCandidates = [
          `./packs/${id}/manifest.json`,
          `./packs/${id}/pack.json`
        ];
        let loadedAny = false;
        for (const m of manifestCandidates) {
          try {
            await fetchJson(m);
            push(`pack_manifest:${m}`, true, "OK");
            loadedAny = true;
            break;
          } catch (e) {
            push(`pack_manifest:${m}`, false, e?.message || String(e));
          }
        }
        if (!loadedAny) {
          push("pack_manifest_any", false, "Nenhum manifest candidato abriu (pode ser normal se seu pack usa outro formato)");
        }
      }
    }
  } catch (e) {
    push("packs_index_fetch", false, e?.message || String(e));
  }

  // 4) Assets (logos básicos)
  // tenta validar que pelo menos o assets/logos existe e 1 arquivo conhecido abre
  try {
    const okLogoFolder = await headOrGetOk("./assets/logos/");
    push("assets_logos_folder", okLogoFolder, okLogoFolder ? "OK" : "Não confirmou (host pode não listar pasta)");
  } catch (e) {
    push("assets_logos_folder", false, e?.message || String(e));
  }

  // 5) Estado básico / store
  try {
    const st = store?.getState?.();
    push("store_exists", !!st, st ? "OK" : "store.getState() falhou");
    if (st) {
      push("state_app_exists", !!st.app, safeJsonStringify(st.app).slice(0, 400));
      push("state_career_exists", !!st.career, safeJsonStringify(st.career).slice(0, 400));
    }
  } catch (e) {
    push("store_read", false, e?.message || String(e));
  }

  // 6) Screens registradas
  try {
    // screenManager “screens” é um wrapper; aqui só validamos que existe
    push("screens_manager_exists", !!screens, screens ? "OK" : "screens não existe");
  } catch (e) {
    push("screens_manager_exists", false, e?.message || String(e));
  }

  const finishedAt = nowIso();
  const report = {
    startedAt,
    finishedAt,
    href: location.href,
    ua: navigator.userAgent,
    results
  };

  try {
    // salva para você copiar mesmo em celular
    localStorage.setItem("VFM_LAST_DIAG", safeJsonStringify(report));
  } catch {}

  try {
    logger?.log?.("diagnostics", report);
  } catch {}

  return report;
}
