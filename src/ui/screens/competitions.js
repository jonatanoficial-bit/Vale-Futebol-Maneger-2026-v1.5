// /src/ui/screens/competitions.js
import { closeSeasonAndComputeQualifications } from "../../domain/competitions/seasonClosure.js";
import { buildSeasonV5 } from "../../domain/competitions/seasonBuilderV5.js";

function prettyClubName(pack, id) {
  const c = pack.content.clubs.clubs.find(x => x.id === id);
  return c?.name || id || "-";
}

function renderList(pack, ids) {
  const arr = (ids || []).filter(Boolean);
  if (!arr.length) return "-";
  return arr.map(id => prettyClubName(pack, id)).join(", ");
}

export async function screenCompetitions({ shell, repos, store, navigate }) {
  const s0 = store.getState();
  if (!s0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!s0.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(s0.app.selectedPackId);

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Competições</div>
          <div class="card__subtitle">Encerramento • Vagas • Acesso/Rebaixamento</div>
        </div>
        <span class="badge">v1.0.1</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Temporada ativa</div>
              <div style="height:10px"></div>
              <div class="muted" style="font-size:13px;line-height:1.5" id="active">-</div>

              <div style="height:12px"></div>
              <button class="btn btn--primary" id="close">Encerrar Temporada (gerar próxima)</button>

              <div style="height:10px"></div>
              <button class="btn" id="back">Voltar</button>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Resumo do encerramento</div>
              <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                Campeões, vagas e movimentação de divisões (A/B/C).
              </div>
              <div style="height:12px"></div>
              <pre class="muted" style="font-size:12px;white-space:pre-wrap" id="log">-</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const $active = el.querySelector("#active");
  const $log = el.querySelector("#log");

  function getActiveSeason(state) {
    // ordem: a mais nova primeiro
    return state.career.seasonV5 || state.career.seasonV4 || state.career.seasonV3 || null;
  }

  function renderActive() {
    const st = store.getState();
    const season = getActiveSeason(st);
    $active.textContent = season ? `${season.id}` : "Nenhuma temporada ativa.";
  }

  function formatClosure(closure) {
    const champs = closure.champions || {};
    const q = closure.qualifications?.BRA || {};
    const mv = closure.movement;

    const lines = [];
    lines.push(`Campeão Série A: ${prettyClubName(pack, champs.BRA_A)}`);
    lines.push(`Campeão Copa do Brasil: ${prettyClubName(pack, champs.CDB)}`);
    lines.push(`Campeão Libertadores: ${prettyClubName(pack, champs.LIB)}`);
    lines.push("");
    lines.push(`Vagas Libertadores (Brasil): ${renderList(pack, q.libertadores)}`);
    lines.push(`Vagas Sul-Americana (Brasil): ${renderList(pack, q.sulamericana)}`);
    lines.push("");

    if (mv?.ok) {
      lines.push("Acesso/Rebaixamento (4 vagas):");
      lines.push(`Rebaixados Série A: ${renderList(pack, mv.A.relegated)}`);
      lines.push(`Promovidos Série B: ${renderList(pack, mv.B.promoted)}`);
      lines.push(`Rebaixados Série B: ${renderList(pack, mv.B.relegated)}`);
      lines.push(`Promovidos Série C: ${renderList(pack, mv.C.promoted)}`);
    } else {
      lines.push("Acesso/Rebaixamento: não aplicado (BRA_B/BRA_C ausentes ou temporada incompleta).");
    }

    return lines.join("\n");
  }

  el.querySelector("#close").addEventListener("click", () => {
    const state = store.getState();
    const season = getActiveSeason(state);
    if (!season) return alert("Nenhuma temporada ativa para encerrar.");

    const closure = closeSeasonAndComputeQualifications({ season });
    if (!closure) return alert("Erro: não foi possível encerrar (verifique BRA_A e CDB).");

    const nextSeason = buildSeasonV5({ pack, prevClosure: closure });

    const next = structuredClone(state);
    next.career.seasonV5 = nextSeason;

    store.setState(next);

    $log.textContent = formatClosure(closure);

    alert("Temporada encerrada. Nova temporada criada com A/B/C atualizadas!");
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  renderActive();
  return { render: () => renderActive() };
}