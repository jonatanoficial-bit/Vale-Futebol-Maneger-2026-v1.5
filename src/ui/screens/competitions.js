import { closeSeasonAndComputeQualifications } from "../../domain/competitions/seasonClosure.js";
import { buildSeasonV4 } from "../../domain/competitions/seasonBuilderV4.js";

export async function screenCompetitions({ shell, repos, store, navigate }) {
  const pack = await repos.loadPack(store.getState().app.selectedPackId);

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Competições</div>
          <div class="card__subtitle">Gestão de Temporada</div>
        </div>
        <span class="badge">v0.9.1</span>
      </div>

      <div class="card__body">
        <button class="btn btn--primary" id="close">Encerrar Temporada</button>
        <div style="height:10px"></div>
        <button class="btn" id="back">Voltar</button>
        <div style="height:12px"></div>
        <pre class="muted" style="font-size:12px" id="log"></pre>
      </div>
    </div>
  `;

  const $log = el.querySelector("#log");

  el.querySelector("#close").addEventListener("click", () => {
    const state = store.getState();
    const season = state.career.seasonV3 || state.career.seasonV4;
    if (!season) return alert("Nenhuma temporada ativa.");

    const closure = closeSeasonAndComputeQualifications({ season });
    if (!closure) return alert("Erro ao encerrar temporada.");

    const nextSeason = buildSeasonV4({ pack, prevClosure: closure });

    const next = structuredClone(state);
    next.career.seasonV4 = nextSeason;

    store.setState(next);

    $log.textContent = JSON.stringify(
      {
        champions: closure.champions,
        qualifications: closure.qualifications,
        nextSeason: nextSeason.id
      },
      null,
      2
    );

    alert("Temporada encerrada e nova temporada criada!");
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  return { render() {} };
}