// src/app/diagnosticsRunner.js
import { getState } from "./stateStore.js";
import { getPackRegistrySafe } from "./packRegistry.js";

/**
 * Runner de testes "read-only" para descobrir exatamente onde está quebrando.
 * Só deve ser chamado quando ?diag=1 estiver na URL.
 *
 * NÃO altera save, NÃO altera estado, NÃO navega automaticamente.
 */
export async function runDiagnosticsRunner() {
  const startedAt = Date.now();
  const results = [];

  const push = (name, ok, details = "") => {
    results.push({
      name,
      ok: !!ok,
      details: String(details || ""),
      ms: Date.now() - startedAt,
    });
  };

  // Helpers
  const safe = async (name, fn) => {
    const t0 = performance.now();
    try {
      const out = await fn();
      push(name, true, `ok (${Math.round(performance.now() - t0)}ms)`);
      return out;
    } catch (e) {
      push(
        name,
        false,
        `${e?.message || e}\n\nSTACK:\n${e?.stack || "(sem stack)"}`
      );
      return null;
    }
  };

  // --- TESTE 1: estado base
  await safe("StateStore: getState()", async () => {
    const st = getState();
    if (!st || typeof st !== "object") throw new Error("state inválido");
    return st;
  });

  // --- TESTE 2: pack registry e packs iterável (corrige o 'packs is not iterable')
  await safe("PackRegistry: listar packs", async () => {
    const packs = await getPackRegistrySafe();
    if (!Array.isArray(packs)) {
      throw new Error(
        `packs não é Array. Tipo=${typeof packs} Valor=${JSON.stringify(packs)}`
      );
    }
    return packs;
  });

  // --- TESTE 3: sanity check da carreira/slot/club
  await safe("State: career/slot/club sanity", async () => {
    const st = getState();
    const slot = st?.meta?.slotId ?? st?.slotId ?? null;
    // Não força existir, só reporta:
    const career = st?.career ?? null;
    const clubId = st?.career?.clubId ?? st?.clubId ?? null;

    return { slot, hasCareer: !!career, clubId };
  });

  // --- TESTE 4: modules críticos existem (import dinâmico)
  // Isso pega erros tipo: "Requested module ... does not provide export named X"
  await safe("Import: ui/util/escapeHtml.js", async () => {
    const m = await import("../ui/util/escapeHtml.js");
    if (typeof m.escapeHtml !== "function") {
      throw new Error("export escapeHtml não encontrado");
    }
    return true;
  });

  await safe("Import: leagueTable.js (exports)", async () => {
    const m = await import("./leagueTable.js");
    // Se você usa makeEmptyTableForTeams em algum lugar, este teste acusa na hora:
    if (m.makeEmptyTableForTeams && typeof m.makeEmptyTableForTeams !== "function") {
      throw new Error("makeEmptyTableForTeams existe mas não é function");
    }
    return Object.keys(m);
  });

  // --- TESTE 5: screens carregam (sem renderizar)
  await safe("Import: screens (hub/squad/player/tactics/training/competitions)", async () => {
    const mods = await Promise.all([
      import("../ui/screens/hub.js"),
      import("../ui/screens/squad.js"),
      import("../ui/screens/player.js"),
      import("../ui/screens/tactics.js"),
      import("../ui/screens/training.js"),
      import("../ui/screens/competitions.js"),
      import("../ui/screens/dataPackSelect.js"),
      import("../ui/screens/saveSlots.js"),
      import("../ui/screens/clubSelect.js"),
    ]);

    // Apenas verifica se exporta a função esperada
    const checks = [
      ["hub", mods[0].screenHub],
      ["squad", mods[1].screenSquad],
      ["player", mods[2].screenPlayer],
      ["tactics", mods[3].screenTactics],
      ["training", mods[4].screenTraining],
      ["competitions", mods[5].screenCompetitions],
      ["dataPackSelect", mods[6].screenDataPackSelect],
      ["saveSlots", mods[7].screenSaveSlots],
      ["clubSelect", mods[8].screenClubSelect],
    ];

    const missing = checks.filter(([, fn]) => typeof fn !== "function").map(([n]) => n);
    if (missing.length) throw new Error(`screens sem export function: ${missing.join(", ")}`);

    return true;
  });

  // --- OUTPUT: painel na tela + console
  renderDiagnosticsPanel(results);
  console.groupCollapsed("%cDIAGNOSTICS RESULTS", "color:#f59e0b;font-weight:bold;");
  console.table(
    results.map((r) => ({
      ok: r.ok,
      test: r.name,
      ms: r.ms,
      details: r.details.slice(0, 120),
    }))
  );
  console.log("Detalhes completos:", results);
  console.groupEnd();

  // Se houver falhas, joga no topo para você enxergar rápido
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("DIAGNOSTICS FAILURES:", failed);
  }

  return { results, failedCount: failed.length };
}

function renderDiagnosticsPanel(results) {
  // Não quebra nada se o app nem chegou a montar UI.
  const panel = document.createElement("div");
  panel.id = "diag-panel";
  panel.style.cssText = `
    position:fixed; z-index:999999;
    left:12px; right:12px; bottom:12px;
    max-height:42vh; overflow:auto;
    background:rgba(10,10,10,.92);
    border:1px solid rgba(255,255,255,.15);
    border-radius:14px;
    padding:12px;
    color:#fff;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    box-shadow: 0 18px 40px rgba(0,0,0,.45);
  `;

  const title = document.createElement("div");
  title.style.cssText = "display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:8px;";
  title.innerHTML = `
    <div style="font-weight:800">DIAGNÓSTICO (diag=1)</div>
    <div style="display:flex;gap:8px">
      <button id="diag-copy" style="padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#111;color:#fff;cursor:pointer">Copiar</button>
      <button id="diag-close" style="padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#111;color:#fff;cursor:pointer">Fechar</button>
    </div>
  `;
  panel.appendChild(title);

  const list = document.createElement("div");
  list.style.cssText = "display:flex;flex-direction:column;gap:8px;";

  for (const r of results) {
    const item = document.createElement("div");
    item.style.cssText = `
      padding:10px;border-radius:12px;
      border:1px solid rgba(255,255,255,.12);
      background:${r.ok ? "rgba(16,185,129,.10)" : "rgba(239,68,68,.10)"};
    `;
    item.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="font-weight:700">${r.ok ? "✅" : "❌"} ${escapeMini(r.name)}</div>
        <div style="opacity:.75;font-size:12px">${r.ms}ms</div>
      </div>
      ${r.ok ? "" : `<pre style="margin:8px 0 0; white-space:pre-wrap; font-size:12px; opacity:.95">${escapeMini(r.details)}</pre>`}
    `;
    list.appendChild(item);
  }

  panel.appendChild(list);
  document.body.appendChild(panel);

  panel.querySelector("#diag-close").addEventListener("click", () => panel.remove());
  panel.querySelector("#diag-copy").addEventListener("click", async () => {
    const payload = {
      href: location.href,
      ua: navigator.userAgent,
      results,
    };
    const txt = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      alert("Diagnóstico copiado. Cole pra mim aqui.");
    } catch {
      prompt("Copie o diagnóstico:", txt);
    }
  });
}

function escapeMini(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
