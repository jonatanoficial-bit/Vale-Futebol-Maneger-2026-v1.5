// /src/ui/screens/diagnostics.js
import { runDiagnostics, enableDiagnosticsPersist, disableDiagnosticsPersist } from "../../app/diagnostics.js";

function esc(s) {
  return String(s ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c]));
}

export async function screenDiagnostics({ el, ctx }) {
  const { store, repos, logger, screens, navigate } = ctx;

  el.innerHTML = `
    <div class="screen">
      <div class="card">
        <div class="card__head">
          <div>
            <div class="title">Diagnóstico</div>
            <div class="subtitle">Auto-teste (só para debug). Pode remover depois sem afetar o jogo.</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <button class="btn btn--ghost" id="enable">Ativar</button>
            <button class="btn btn--ghost" id="disable">Desativar</button>
          </div>
        </div>

        <div class="card__body" style="display:grid;gap:12px">
          <div class="row" style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn" id="run">Rodar teste agora</button>
            <button class="btn btn--ghost" id="copy">Copiar relatório</button>
            <button class="btn btn--ghost" id="back">Voltar</button>
          </div>

          <div class="panel" style="padding:12px;border-radius:14px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08)">
            <div style="font-weight:900;margin-bottom:8px">Resultado</div>
            <div id="out" style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;opacity:.95">Clique em "Rodar teste agora".</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const out = el.querySelector("#out");
  const btnRun = el.querySelector("#run");
  const btnCopy = el.querySelector("#copy");
  const btnBack = el.querySelector("#back");
  const btnEnable = el.querySelector("#enable");
  const btnDisable = el.querySelector("#disable");

  let lastReport = null;

  async function doRun() {
    out.textContent = "Rodando diagnóstico...";
    try {
      lastReport = await runDiagnostics({ logger, screens, repos, store });
      const okCount = (lastReport.results || []).filter(r => r.ok).length;
      const total = (lastReport.results || []).length;

      out.innerHTML =
        `Resumo: ${okCount}/${total} OK\n\n` +
        (lastReport.results || []).map(r =>
          `${r.ok ? "✅" : "❌"} ${r.id}\n${r.info ? "   " + esc(r.info) : ""}`
        ).join("\n");
    } catch (e) {
      out.textContent = `Falhou: ${e?.message || String(e)}`;
    }
  }

  btnRun.addEventListener("click", doRun);

  btnCopy.addEventListener("click", async () => {
    try {
      const text = lastReport
        ? JSON.stringify(lastReport, null, 2)
        : (localStorage.getItem("VFM_LAST_DIAG") || "");
      await navigator.clipboard.writeText(text);
      out.textContent = "✅ Copiado para a área de transferência.";
    } catch {
      out.textContent = "Não deu para copiar automaticamente. Abra o Console e copie o VFM_LAST_DIAG do LocalStorage.";
    }
  });

  btnBack.addEventListener("click", () => {
    if (navigate) return navigate("#/hub");
    location.hash = "#/hub";
  });

  btnEnable.addEventListener("click", () => {
    enableDiagnosticsPersist();
    out.textContent = "✅ Diagnóstico ativado (persistente). Recarregue a página e use #/diagnostics.";
  });

  btnDisable.addEventListener("click", () => {
    disableDiagnosticsPersist();
    out.textContent = "✅ Diagnóstico desativado.";
  });
}
