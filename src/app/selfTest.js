// src/app/selfTest.js
import { setDiagnosticsPersistEnabled } from "./diagnostics.js";
import { createLogger } from "./logger.js";
import { createRouter } from "./router.js";
import { createShell } from "./shell.js";
import { createScreenManager } from "./screenManager.js";
import { createStore } from "./stateStore.js";

import { screenSplash } from "../ui/screens/splash.js";

export async function maybeRunSelfTest({ store, repos }) {
  const usp = new URLSearchParams(window.location.search);
  if (usp.get("selftest") !== "1") return;

  const logger = createLogger({ debug: true });

  // Overlay
  const root = document.createElement("div");
  root.id = "selftest-overlay";
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.right = "0";
  root.style.bottom = "0";
  root.style.background = "rgba(0,0,0,0.72)";
  root.style.zIndex = "999999";
  root.style.color = "#fff";
  root.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  root.style.padding = "16px";
  root.style.overflow = "auto";

  const title = document.createElement("div");
  title.textContent = "VFM SelfTest (modo seguro) — rodando…";
  title.style.fontSize = "18px";
  title.style.fontWeight = "700";
  title.style.marginBottom = "10px";

  const note = document.createElement("div");
  note.textContent =
    "Este teste NÃO altera seu save. Ele só roda com ?selftest=1 e pode ser removido com risco 0.";
  note.style.opacity = "0.85";
  note.style.marginBottom = "16px";

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "8px";

  const footer = document.createElement("div");
  footer.style.marginTop = "16px";
  footer.style.display = "flex";
  footer.style.gap = "10px";
  footer.style.flexWrap = "wrap";

  const btnClose = document.createElement("button");
  btnClose.textContent = "Fechar";
  btnClose.style.padding = "10px 14px";
  btnClose.style.borderRadius = "10px";
  btnClose.style.border = "0";
  btnClose.style.cursor = "pointer";
  btnClose.onclick = () => root.remove();

  const btnCopy = document.createElement("button");
  btnCopy.textContent = "Copiar relatório";
  btnCopy.style.padding = "10px 14px";
  btnCopy.style.borderRadius = "10px";
  btnCopy.style.border = "0";
  btnCopy.style.cursor = "pointer";

  footer.appendChild(btnCopy);
  footer.appendChild(btnClose);

  root.appendChild(title);
  root.appendChild(note);
  root.appendChild(list);
  root.appendChild(footer);
  document.body.appendChild(root);

  const results = [];
  const startedAt = Date.now();

  function addRow({ name, ok, detail }) {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "16px 1fr";
    row.style.gap = "10px";
    row.style.alignItems = "start";
    row.style.padding = "10px";
    row.style.borderRadius = "12px";
    row.style.background = ok ? "rgba(0,160,90,0.22)" : "rgba(220,60,60,0.22)";
    row.style.border = ok ? "1px solid rgba(0,160,90,0.35)" : "1px solid rgba(220,60,60,0.35)";

    const icon = document.createElement("div");
    icon.textContent = ok ? "✓" : "✗";
    icon.style.fontWeight = "800";

    const body = document.createElement("div");
    const h = document.createElement("div");
    h.textContent = name;
    h.style.fontWeight = "700";

    const d = document.createElement("div");
    d.textContent = detail || "";
    d.style.opacity = "0.9";
    d.style.whiteSpace = "pre-wrap";

    body.appendChild(h);
    if (detail) body.appendChild(d);

    row.appendChild(icon);
    row.appendChild(body);
    list.appendChild(row);
  }

  async function runTest(name, fn) {
    const item = { name, ok: false, detail: "" };
    try {
      const r = await fn();
      item.ok = true;
      item.detail = typeof r === "string" ? r : "";
    } catch (e) {
      item.ok = false;
      item.detail = e?.stack || e?.message || String(e);
    }
    results.push(item);
    addRow(item);
  }

  // Snapshot de estado + flags (pra garantir “risco 0”)
  const stateBefore = structuredClone(store.getState());
  const diagPersistBefore = stateBefore?.meta?.diagnosticsPersistEnabled;

  // Ambiente de teste “isolado”
  const shell = createShell({ root: document.createElement("div") });
  const router = createRouter({ onRoute: () => {} });
  const screenManager = createScreenManager({ shell, store, router, logger });
  screenManager.setScreens({ splash: screenSplash });

  const tests = [
    {
      name: "Sanidade: app carregou (selfTest ativo)",
      run: async () => "OK",
    },
    {
      name: "Storage: localStorage disponível",
      run: async () => {
        const k = "__vfm_selftest__";
        localStorage.setItem(k, "1");
        const v = localStorage.getItem(k);
        localStorage.removeItem(k);
        if (v !== "1") throw new Error("localStorage retornou valor inesperado");
        return "OK";
      },
    },
    {
      name: "Diagnostics: toggle persist (sem salvar)",
      run: async () => {
        setDiagnosticsPersistEnabled(store, true);
        setDiagnosticsPersistEnabled(store, false);
        return "OK";
      },
    },
    {
      name: "UI: tela splash renderiza",
      run: async () => {
        await screenManager.show("splash", { navigate: (p) => (window.location.hash = "#/" + p) });
        return "OK";
      },
    },
    {
      name: "Data: pack recomendado carrega (base-2025-26)",
      run: async () => {
        if (!repos?.requirePack) throw new Error("repos não foi fornecido ao selfTest");
        const pack = await repos.requirePack("base-2025-26");
        if (!pack) throw new Error("pack retornou vazio");
        if (!Array.isArray(pack.clubs) || pack.clubs.length === 0) {
          throw new Error("pack não possui clubs[]");
        }
        return `OK (clubs: ${pack.clubs.length})`;
      },
    },
    {
      name: "Engine: gerar temporada (dry-run)",
      run: async () => {
        if (!repos?.requirePack) throw new Error("repos não foi fornecido ao selfTest");
        const pack = await repos.requirePack("base-2025-26");

        const { generateSeason } = await import("../domain/season/seasonGenerator.js");
        const season = generateSeason({
          clubs: pack.clubs,
          seasonId: "2025-2026",
          seed: "selftest",
        });

        if (!season || typeof season !== "object") throw new Error("season inválida");
        if (!Array.isArray(season.competitions) || season.competitions.length === 0) {
          throw new Error("season não gerou competitions[]");
        }

        return `OK (competitions: ${season.competitions.length})`;
      },
    },
  ];

  for (const t of tests) {
    await runTest(t.name, t.run);
  }

  // Restore total (garantia “risco 0”)
  store.setState(stateBefore);
  // Se alguém mexeu no persist flag, volta pro anterior
  const stAfter = store.getState();
  if (stAfter?.meta && stAfter.meta.diagnosticsPersistEnabled !== diagPersistBefore) {
    stAfter.meta.diagnosticsPersistEnabled = diagPersistBefore;
    store.setState(stAfter);
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  const ms = Date.now() - startedAt;

  title.textContent = `VFM SelfTest — concluído | OK: ${okCount} | Falhas: ${failCount} | ${ms}ms`;

  const report = {
    when: new Date().toISOString(),
    durationMs: ms,
    okCount,
    failCount,
    results,
  };

  btnCopy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      btnCopy.textContent = "Copiado!";
      setTimeout(() => (btnCopy.textContent = "Copiar relatório"), 1200);
    } catch (e) {
      alert("Não foi possível copiar. Veja o console.");
      console.log(report);
    }
  };

  // Expor também no window pra debug rápido
  window.__VFM_SELFTEST_REPORT__ = report;
}