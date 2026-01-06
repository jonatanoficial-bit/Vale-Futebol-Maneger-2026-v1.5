import { buildSeasonV3 } from "../../domain/competitions/seasonBuilderV3.js";
import { getNextUserFixture, playFixtureAtCalendarIndex, getCompetitionViewState } from "../../domain/competitions/engine.js";
import { CompetitionType } from "../../domain/competitions/competitionTypes.js";
import { tableFromSerialized } from "../../domain/competitions/leagueTable.js";

function orderTable(map) {
  const arr = Array.from(map.entries()).map(([teamId, r]) => ({
    teamId,
    pts: r.pts, gd: r.gd, gf: r.gf, p: r.p
  }));
  arr.sort((a, b) =>
    (b.pts - a.pts) ||
    (b.gd - a.gd) ||
    (b.gf - a.gf) ||
    String(a.teamId).localeCompare(String(b.teamId), "pt-BR")
  );
  return arr;
}

function renderTableRows(rows, resolveName) {
  return rows.slice(0, 12).map((r, i) => `
    <div class="item">
      <div class="item__left">
        <div style="font-weight:900">${i + 1}. ${resolveName(r.teamId)}</div>
        <div class="muted" style="font-size:12px">P ${r.p} • Pts ${r.pts} • SG ${r.gd} • GP ${r.gf}</div>
      </div>
      <span class="badge">${r.pts}</span>
    </div>
  `).join("");
}

export async function screenCompetitions({ shell, repos, store, navigate }) {
  const s0 = store.getState();
  if (!s0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!s0.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(s0.app.selectedPackId);

  function resolveClubName(id) {
    const c = pack.content.clubs.clubs.find(x => x.id === id);
    return c?.name || id;
  }

  function ensureSeason() {
    const s = store.getState();
    if (!s.career.seasonV3) {
      const season = buildSeasonV3({ pack, state: s });
      const next = structuredClone(s);
      next.career.seasonV3 = season;
      store.setState(next);
    }
  }

  ensureSeason();

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Competições</div>
          <div class="card__subtitle">Temporada v3 • Brasil + CONMEBOL</div>
        </div>
        <span class="badge">v0.9</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Próximo jogo</div>
              <div style="height:10px"></div>
              <div id="nextBox" class="muted" style="font-size:13px;line-height:1.35">-</div>

              <div style="height:12px"></div>
              <button class="btn btn--primary" id="playNext">Jogar próximo</button>

              <div style="height:10px"></div>
              <button class="btn" id="rebuild">Recriar Temporada v3 (MVP)</button>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Escolher competição</div>
              <div style="height:10px"></div>
              <select class="select" id="compSelect"></select>
              <div style="height:12px"></div>
              <div id="view"></div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $nextBox = el.querySelector("#nextBox");
  const $playNext = el.querySelector("#playNext");
  const $rebuild = el.querySelector("#rebuild");
  const $compSelect = el.querySelector("#compSelect");
  const $view = el.querySelector("#view");

  function render() {
    const st = store.getState();
    const season = st.career.seasonV3;

    const next = getNextUserFixture(season, st.career.clubId);
    if (!next) {
      $nextBox.innerHTML = `<div style="font-weight:900">Sem partidas futuras</div><div class="muted">Calendário acabou (MVP).</div>`;
      $playNext.disabled = true;
    } else {
      const f = season.calendar[next.index];
      $playNext.disabled = false;
      $nextBox.innerHTML = `
        <div style="font-weight:900">${resolveClubName(f.homeId)} vs ${resolveClubName(f.awayId)}</div>
        <div class="muted">Comp: ${f.competitionId} • Stage: ${f.stage || "-"}${f.groupId ? ` • Grupo ${f.groupId}` : ""}</div>
      `;
    }

    // select comps
    const comps = season.competitions;
    const cur = $compSelect.value || comps[0]?.id;
    $compSelect.innerHTML = comps.map(c => `<option value="${c.id}" ${c.id === cur ? "selected" : ""}>${c.name}</option>`).join("");

    renderCompetitionView($compSelect.value || comps[0]?.id);
  }

  function renderCompetitionView(compId) {
    const st = store.getState();
    const season = st.career.seasonV3;
    const view = getCompetitionViewState(season, compId);
    if (!view) { $view.innerHTML = `<div class="muted">Sem dados.</div>`; return; }

    if (view.kind === "LEAGUE") {
      const rows = orderTable(view.tableMap);
      $view.innerHTML = `
        <div class="muted" style="font-size:12px;margin-bottom:10px">Classificação (Top 12)</div>
        <div class="list">${renderTableRows(rows, resolveClubName)}</div>
      `;
      return;
    }

    if (view.kind === "GROUPS_CUP") {
      // mostra grupos (Apenas 2 primeiros grupos no MVP da UI, sem quebrar)
      const g1 = view.groups[0];
      const g2 = view.groups[1];

      const rows1 = orderTable(g1.tableMap);
      const rows2 = orderTable(g2.tableMap);

      const koCount = (view.knockout?.fixtures || []).length;

      $view.innerHTML = `
        <div class="muted" style="font-size:12px;margin-bottom:10px">Fase de Grupos (preview)</div>

        <div class="card" style="border-radius:18px;margin-bottom:10px">
          <div class="card__body">
            <div style="font-weight:900">Grupo 1</div>
            <div style="height:8px"></div>
            <div class="list">${renderTableRows(rows1, resolveClubName)}</div>
          </div>
        </div>

        <div class="card" style="border-radius:18px;margin-bottom:10px">
          <div class="card__body">
            <div style="font-weight:900">Grupo 2</div>
            <div style="height:8px"></div>
            <div class="list">${renderTableRows(rows2, resolveClubName)}</div>
          </div>
        </div>

        <div class="muted" style="font-size:12px">
          Mata-mata: ${koCount ? `${koCount} jogo(s) gerado(s)` : "ainda não gerado (termina grupos primeiro)"}
        </div>
      `;
      return;
    }

    $view.innerHTML = `<div class="muted">Visualização de mata-mata (MVP) entra no próximo patch.</div>`;
  }

  $compSelect.addEventListener("change", () => renderCompetitionView($compSelect.value));

  $playNext.addEventListener("click", async () => {
    const st = store.getState();
    const season = st.career.seasonV3;

    const next = getNextUserFixture(season, st.career.clubId);
    if (!next) return;

    // squadsByClub e playersByIdGlobal vêm do repos (já usado antes no projeto)
    const squadsByClub = await repos.getSquadsByClub(pack, st);
    const playersByIdGlobal = await repos.getPlayersById(pack, st);

    const { season: nextSeason } = playFixtureAtCalendarIndex({
      season,
      calendarIndex: next.index,
      packId: st.app.selectedPackId,
      userClubId: st.career.clubId,
      userLineup: st.career.lineup,
      squadsByClub,
      playersByIdGlobal,
      state: st,
      onStateUpdated: (newState) => store.setState(newState)
    });

    const nextState = structuredClone(store.getState());
    nextState.career.seasonV3 = nextSeason;
    store.setState(nextState);

    render();
    alert("Partida simulada.");
  });

  $rebuild.addEventListener("click", () => {
    const st = store.getState();
    const next = structuredClone(st);
    next.career.seasonV3 = buildSeasonV3({ pack, state: st });
    store.setState(next);
    render();
    alert("Temporada v3 recriada.");
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  render();
  return { render: () => render() };
}