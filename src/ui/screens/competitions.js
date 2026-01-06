import { generateSeason, tableFromSerialized } from "../../domain/seasonGenerator.js";
import { applyResult, sortedTableRows } from "../../domain/leagueTable.js";
import { simulateMatch } from "../../domain/matchSim.js";

function fmtDate(iso) {
  if (!iso) return "-";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function screenCompetitions({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const clubId = state.career.clubId;
  const clubs = pack.content.clubs.clubs;

  const clubById = new Map(clubs.map(c => [c.id, c]));
  const clubIdsAll = clubs.map(c => c.id);

  // Season: cria se não existir (ou se faltando)
  let season = state.career?.season;
  if (!season || !Array.isArray(season.fixtures) || !Array.isArray(season.table)) {
    season = generateSeason({ packId: state.app.selectedPackId, clubId, clubIdsAll });
    store.update(s => ({
      ...s,
      career: { ...s.career, season }
    }));
  }

  function getSeason() {
    return store.getState().career.season;
  }

  function saveSeason(nextSeason) {
    store.update(s => ({
      ...s,
      career: { ...s.career, season: nextSeason }
    }));
  }

  function logoSrc(id) {
    const c = clubById.get(id);
    return repos.resolveLogoSrc(c?.logoAssetId || id);
  }

  function clubName(id) {
    return clubById.get(id)?.name || id;
  }

  function nextFixtureForUser(seasonObj) {
    const fixtures = seasonObj.fixtures || [];
    // encontra o próximo jogo do usuário que não foi jogado
    for (let i = seasonObj.currentIndex || 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      if (f.played) continue;
      if (f.homeId === clubId || f.awayId === clubId) {
        return { fixture: f, index: i };
      }
    }
    return null;
  }

  function currentRound(seasonObj) {
    const fixtures = seasonObj.fixtures || [];
    const idx = seasonObj.currentIndex || 0;
    const f = fixtures[idx];
    return f?.round || 1;
  }

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Competições</div>
          <div class="card__subtitle">${getSeason().name} • ${getSeason().seasonYear}</div>
        </div>
        <span class="badge">Liga</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Próximo jogo do seu clube</div>
              <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                Jogar a próxima partida atualiza a tabela e avança a temporada.
              </div>
              <div style="height:12px"></div>
              <div id="nextMatch"></div>
              <div style="height:12px"></div>
              <div class="grid grid--2">
                <button class="btn btn--primary" id="playNext">Jogar próxima</button>
                <button class="btn" id="simRound">Simular rodada</button>
              </div>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Tabela</div>
              <div class="muted" style="font-size:12px;margin-top:6px">Pontos, saldo, gols pró</div>
              <div style="height:12px"></div>
              <div id="table"></div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:900">Calendário</div>
                <div class="muted" style="font-size:12px">Rodada atual: <span id="roundNum">-</span></div>
              </div>
              <span class="badge" id="progressBadge">-</span>
            </div>

            <div style="height:12px"></div>
            <div class="list" id="fixtures"></div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $nextMatch = el.querySelector("#nextMatch");
  const $table = el.querySelector("#table");
  const $fixtures = el.querySelector("#fixtures");
  const $roundNum = el.querySelector("#roundNum");
  const $progressBadge = el.querySelector("#progressBadge");

  function render() {
    const seasonObj = getSeason();

    // badges
    const played = seasonObj.fixtures.filter(f => f.played).length;
    $progressBadge.textContent = `${played}/${seasonObj.fixtures.length}`;
    $roundNum.textContent = String(currentRound(seasonObj));

    // next match
    const nxt = nextFixtureForUser(seasonObj);
    if (!nxt) {
      $nextMatch.innerHTML = `
        <div class="item">
          <div class="item__left">
            <div>
              <div style="font-weight:900">Temporada concluída</div>
              <div class="muted" style="font-size:12px">Nenhuma partida pendente.</div>
            </div>
          </div>
          <span class="badge">Fim</span>
        </div>
      `;
    } else {
      const f = nxt.fixture;
      $nextMatch.innerHTML = `
        <div class="item">
          <div class="item__left" style="gap:10px">
            <img class="logo" src="${logoSrc(f.homeId)}" alt="home" onerror="this.style.opacity=.25" />
            <div>
              <div style="font-weight:900">${clubName(f.homeId)} x ${clubName(f.awayId)}</div>
              <div class="muted" style="font-size:12px">${fmtDate(f.date)} • Rodada ${f.round}</div>
            </div>
          </div>
          <span class="badge">Próximo</span>
        </div>
      `;
    }

    // table
    const tableMap = tableFromSerialized(seasonObj.table);
    const rows = sortedTableRows(tableMap);

    const top = rows.slice(0, 12); // mostra 12 pra ficar bonito no mobile
    const myIndex = rows.findIndex(r => r.clubId === clubId);

    const list = document.createElement("div");
    list.className = "list";
    for (let i = 0; i < top.length; i++) {
      const r = top[i];
      const isMe = r.clubId === clubId;
      const item = document.createElement("div");
      item.className = "item";
      item.style.outline = isMe ? "1px solid rgba(255,255,255,.18)" : "none";
      item.innerHTML = `
        <div class="item__left" style="gap:10px">
          <span class="badge" style="min-width:34px;text-align:center">${i + 1}</span>
          <img class="logo" src="${logoSrc(r.clubId)}" alt="logo" onerror="this.style.opacity=.25" />
          <div>
            <div style="font-weight:900">${clubName(r.clubId)}</div>
            <div class="muted" style="font-size:12px">${r.points} pts • ${r.played}J • SG ${r.gd} • GP ${r.gf}</div>
          </div>
        </div>
        <span class="badge">${isMe ? "Você" : ""}</span>
      `;
      list.appendChild(item);
    }

    if (myIndex >= 12) {
      const r = rows[myIndex];
      const item = document.createElement("div");
      item.className = "item";
      item.style.outline = "1px solid rgba(255,255,255,.18)";
      item.innerHTML = `
        <div class="item__left" style="gap:10px">
          <span class="badge" style="min-width:34px;text-align:center">${myIndex + 1}</span>
          <img class="logo" src="${logoSrc(r.clubId)}" alt="logo" onerror="this.style.opacity=.25" />
          <div>
            <div style="font-weight:900">${clubName(r.clubId)}</div>
            <div class="muted" style="font-size:12px">${r.points} pts • ${r.played}J • SG ${r.gd} • GP ${r.gf}</div>
          </div>
        </div>
        <span class="badge">Você</span>
      `;
      list.appendChild(item);
    }

    $table.innerHTML = "";
    $table.appendChild(list);

    // fixtures (mostra 8 próximos + 6 anteriores)
    const idx = seasonObj.currentIndex || 0;
    const start = Math.max(0, idx - 6);
    const end = Math.min(seasonObj.fixtures.length, idx + 8);
    const slice = seasonObj.fixtures.slice(start, end);

    $fixtures.innerHTML = "";
    for (const f of slice) {
      const item = document.createElement("div");
      item.className = "item";
      const isUser = f.homeId === clubId || f.awayId === clubId;
      const score = f.played ? `${f.result.homeGoals} - ${f.result.awayGoals}` : "vs";
      item.innerHTML = `
        <div class="item__left" style="gap:10px">
          <img class="logo" src="${logoSrc(f.homeId)}" alt="home" onerror="this.style.opacity=.25" />
          <div>
            <div style="font-weight:900">${clubName(f.homeId)} ${score} ${clubName(f.awayId)}</div>
            <div class="muted" style="font-size:12px">${fmtDate(f.date)} • Rodada ${f.round} ${isUser ? "• Seu jogo" : ""}</div>
          </div>
        </div>
        <span class="badge">${f.played ? "Final" : "Agendado"}</span>
      `;
      $fixtures.appendChild(item);
    }
  }

  function playFixture(fIndex) {
    const seasonObj = getSeason();
    const f = seasonObj.fixtures[fIndex];
    if (!f || f.played) return;

    const squadsByClub = pack.indexes.playersByClub;
    const userLineup = store.getState().career.lineup;

    const sim = simulateMatch({
      packId: state.app.selectedPackId,
      fixtureId: f.id,
      homeId: f.homeId,
      awayId: f.awayId,
      squadsByClub,
      userClubId: clubId,
      userLineup,
      playersByIdGlobal: pack.indexes.playersById
    });

    // aplica na tabela
    const tableMap = tableFromSerialized(seasonObj.table);
    applyResult(tableMap, f.homeId, f.awayId, sim.homeGoals, sim.awayGoals);

    // marca fixture como jogado
    const nextFixtures = seasonObj.fixtures.slice();
    nextFixtures[fIndex] = {
      ...f,
      played: true,
      result: {
        homeGoals: sim.homeGoals,
        awayGoals: sim.awayGoals,
        homeRating: sim.homeRating,
        awayRating: sim.awayRating,
        events: sim.events
      }
    };

    // avança currentIndex até o próximo não jogado
    let nextIndex = seasonObj.currentIndex || 0;
    while (nextIndex < nextFixtures.length && nextFixtures[nextIndex].played) nextIndex++;

    const nextSeason = {
      ...seasonObj,
      fixtures: nextFixtures,
      table: Array.from(tableMap.entries()),
      currentIndex: nextIndex,
      lastMatch: sim
    };

    saveSeason(nextSeason);

    // mostra resumo rápido
    alert(`${clubName(f.homeId)} ${sim.homeGoals} x ${sim.awayGoals} ${clubName(f.awayId)}\nOVR: ${sim.homeRating} - ${sim.awayRating}`);

    render();
  }

  function simulateRoundOf(indexStart) {
    // simula todos os jogos da rodada do fixture indexStart
    const seasonObj = getSeason();
    const fixtures = seasonObj.fixtures;
    const f0 = fixtures[indexStart];
    if (!f0) return;
    const round = f0.round;

    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      if (!f || f.played) continue;
      if (f.round !== round) continue;
      playFixture(i);
    }
  }

  el.querySelector("#playNext").addEventListener("click", () => {
    const seasonObj = getSeason();
    const nxt = nextFixtureForUser(seasonObj);
    if (!nxt) { alert("Temporada concluída."); return; }
    playFixture(nxt.index);
  });

  el.querySelector("#simRound").addEventListener("click", () => {
    const seasonObj = getSeason();
    const idx = seasonObj.currentIndex || 0;
    simulateRoundOf(idx);
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  render();
  return { render() {} };
}