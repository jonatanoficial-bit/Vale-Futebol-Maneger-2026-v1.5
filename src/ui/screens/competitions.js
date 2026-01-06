import { fmtDateBR } from "../../domain/competitions/dateUtils.js";
import { generateSeasonAll } from "../../domain/competitions/seasonPlanner.js";
import { getNextUserFixture, getCompetitionViewState, playFixtureAtCalendarIndex } from "../../domain/competitions/engine.js";
import { sortedTableRows } from "../../domain/competitions/leagueTable.js";
import { ensureEconomy } from "../../domain/economy/economy.js";

export async function screenCompetitions({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const userClubId = state.career.clubId;

  // garante economia
  store.setState(ensureEconomy(store.getState(), pack));

  const clubs = pack.content.clubs.clubs;
  const clubById = new Map(clubs.map(c => [c.id, c]));
  const clubIdsAll = clubs.map(c => c.id);

  function logoSrc(id) {
    const c = clubById.get(id);
    return repos.resolveLogoSrc(c?.logoAssetId || id);
  }

  function clubName(id) {
    if (id === "EUR_CHAMP") return "Campeão da Europa (MVP)";
    const c = clubById.get(id);
    return c?.name || id;
  }

  function ensureSeasonV2() {
    const s = store.getState();
    if (!s.career.seasonV2 || !Array.isArray(s.career.seasonV2.calendar)) {
      const seasonV2 = generateSeasonAll({
        packId: s.app.selectedPackId,
        userClubId,
        clubIdsAll
      });
      store.update(st => ({ ...st, career: { ...st.career, seasonV2 } }));
    }
  }

  ensureSeasonV2();

  function getSeason() {
    return store.getState().career.seasonV2;
  }

  function saveSeason(seasonV2) {
    store.update(s => ({ ...s, career: { ...s.career, seasonV2 } }));
  }

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Competições</div>
          <div class="card__subtitle">Regionais, Brasileirão, Copas e Internacionais • ${getSeason().seasonYear}</div>
        </div>
        <span class="badge">Pro</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Próximo jogo do seu clube</div>
              <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                Ao jogar, você recebe receita de jogo e entra patrocínio mensal quando virar o mês no calendário.
              </div>
              <div style="height:12px"></div>
              <div id="nextMatch"></div>
              <div style="height:12px"></div>
              <div class="grid grid--2">
                <button class="btn btn--primary" id="playNext">Jogar próximo</button>
                <button class="btn" id="simDay">Simular próximo jogo do calendário</button>
              </div>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Selecionar competição</div>
              <div style="height:8px"></div>
              <select class="select" id="competitionSelect"></select>
              <div style="height:12px"></div>
              <div id="compHeader"></div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:900" id="viewTitle">Visão da competição</div>
                <div class="muted" style="font-size:12px" id="viewSubtitle">Tabela / Jogos</div>
              </div>
              <span class="badge" id="progressBadge">-</span>
            </div>

            <div style="height:12px"></div>
            <div id="view"></div>

            <div style="height:12px"></div>
            <div class="card" style="border-radius:18px">
              <div class="card__body">
                <div style="font-weight:900">Calendário (próximos jogos)</div>
                <div class="muted" style="font-size:12px;margin-top:6px">Lista unificada por data</div>
                <div style="height:12px"></div>
                <div class="list" id="calendar"></div>
              </div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $competitionSelect = el.querySelector("#competitionSelect");
  const $nextMatch = el.querySelector("#nextMatch");
  const $compHeader = el.querySelector("#compHeader");
  const $view = el.querySelector("#view");
  const $viewTitle = el.querySelector("#viewTitle");
  const $viewSubtitle = el.querySelector("#viewSubtitle");
  const $progressBadge = el.querySelector("#progressBadge");
  const $calendar = el.querySelector("#calendar");

  function renderCompetitionSelect() {
    const season = getSeason();
    $competitionSelect.innerHTML = "";
    for (const c of season.competitions) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      $competitionSelect.appendChild(opt);
    }
    const pick = season.competitions.find(c => c.id === "BR-A" && c.clubIds.includes(userClubId))
      || season.competitions.find(c => c.id === "BR-B" && c.clubIds.includes(userClubId))
      || season.competitions.find(c => c.id === "BR-C" && c.clubIds.includes(userClubId))
      || season.competitions.find(c => c.id === "BR-EST-MVP")
      || season.competitions[0];
    if (pick) $competitionSelect.value = pick.id;
  }

  function renderNextMatch() {
    const season = getSeason();
    const nxt = getNextUserFixture(season, userClubId);

    if (!nxt) {
      $nextMatch.innerHTML = `
        <div class="item">
          <div class="item__left">
            <div>
              <div style="font-weight:900">Sem jogos pendentes</div>
              <div class="muted" style="font-size:12px">Calendário pode estar concluído.</div>
            </div>
          </div>
          <span class="badge">OK</span>
        </div>
      `;
      return;
    }

    const f = nxt.fixture;
    const comp = season.competitions.find(c => c.id === f.competitionId);
    $nextMatch.innerHTML = `
      <div class="item">
        <div class="item__left" style="gap:10px">
          <img class="logo" src="${logoSrc(f.homeId)}" alt="home" onerror="this.style.opacity=.25" />
          <div>
            <div style="font-weight:900">${clubName(f.homeId)} x ${clubName(f.awayId)}</div>
            <div class="muted" style="font-size:12px">${comp?.name || f.competitionId} • ${fmtDateBR(f.date)}</div>
          </div>
        </div>
        <span class="badge">Próximo</span>
      </div>
    `;
  }

  function renderCompetitionHeader(compId) {
    const season = getSeason();
    const comp = season.competitions.find(c => c.id === compId);
    if (!comp) { $compHeader.innerHTML = ""; return; }

    const total = comp.fixtures.length;
    const played = comp.fixtures.filter(x => x.played).length;
    const badge = `${played}/${total}`;

    $compHeader.innerHTML = `
      <div class="item" style="margin-top:12px">
        <div class="item__left">
          <div>
            <div style="font-weight:900">${comp.name}</div>
            <div class="muted" style="font-size:12px">${comp.type} • ${badge}</div>
          </div>
        </div>
        <span class="badge">${badge}</span>
      </div>
    `;
  }

  function renderCompetitionView(compId) {
    const season = getSeason();
    const comp = season.competitions.find(c => c.id === compId);
    if (!comp) return;

    const played = comp.fixtures.filter(x => x.played).length;
    $progressBadge.textContent = `${played}/${comp.fixtures.length}`;

    const view = getCompetitionViewState(season, compId);
    if (!view) return;

    $viewTitle.textContent = comp.name;
    $viewSubtitle.textContent = view.kind === "LEAGUE" ? "Tabela (liga) + Jogos" : "Jogos (mata-mata / final)";

    const wrap = document.createElement("div");
    wrap.className = "grid";
    wrap.style.gap = "12px";

    if (view.kind === "LEAGUE") {
      const rows = sortedTableRows(view.tableMap);
      const top = rows.slice(0, 14);

      const tableList = document.createElement("div");
      tableList.className = "list";
      for (let i = 0; i < top.length; i++) {
        const r = top[i];
        const isMe = r.clubId === userClubId;
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
        tableList.appendChild(item);
      }
      wrap.appendChild(tableList);
    }

    const fixtures = comp.fixtures.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const firstUnplayed = fixtures.findIndex(f => !f.played);
    const pivot = firstUnplayed >= 0 ? firstUnplayed : fixtures.length;
    const start = Math.max(0, pivot - 6);
    const end = Math.min(fixtures.length, pivot + 8);
    const slice = fixtures.slice(start, end);

    const fxList = document.createElement("div");
    fxList.className = "list";

    for (const f of slice) {
      const score = f.played ? `${f.result.homeGoals} - ${f.result.awayGoals}` : "vs";
      const item = document.createElement("div");
      item.className = "item";
      const isUser = f.homeId === userClubId || f.awayId === userClubId;
      item.innerHTML = `
        <div class="item__left" style="gap:10px">
          <img class="logo" src="${logoSrc(f.homeId)}" alt="home" onerror="this.style.opacity=.25" />
          <div>
            <div style="font-weight:900">${clubName(f.homeId)} ${score} ${clubName(f.awayId)}</div>
            <div class="muted" style="font-size:12px">${fmtDateBR(f.date)} • ${f.stage || ""} ${f.round ? "• Fase " + f.round : ""} ${isUser ? "• Seu jogo" : ""}</div>
          </div>
        </div>
        <span class="badge">${f.played ? "Final" : "Agendado"}</span>
      `;
      fxList.appendChild(item);
    }

    wrap.appendChild(fxList);

    $view.innerHTML = "";
    $view.appendChild(wrap);
  }

  function renderCalendar() {
    const season = getSeason();
    const idx = season.calendarIndex || 0;
    const slice = season.calendar.slice(idx, Math.min(season.calendar.length, idx + 16));

    $calendar.innerHTML = "";
    for (const f of slice) {
      const comp = season.competitions.find(c => c.id === f.competitionId);
      const score = f.played ? `${f.result.homeGoals} - ${f.result.awayGoals}` : "vs";
      const isUser = f.homeId === userClubId || f.awayId === userClubId;

      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item__left" style="gap:10px">
          <img class="logo" src="${logoSrc(f.homeId)}" alt="home" onerror="this.style.opacity=.25" />
          <div>
            <div style="font-weight:900">${clubName(f.homeId)} ${score} ${clubName(f.awayId)}</div>
            <div class="muted" style="font-size:12px">${comp?.name || f.competitionId} • ${fmtDateBR(f.date)} ${isUser ? "• Seu jogo" : ""}</div>
          </div>
        </div>
        <span class="badge">${f.played ? "Final" : "Agendado"}</span>
      `;
      $calendar.appendChild(item);
    }
  }

  function playNextUser() {
    const season = getSeason();
    const nxt = getNextUserFixture(season, userClubId);
    if (!nxt) { alert("Sem jogos pendentes."); return; }

    const userLineup = store.getState().career.lineup;

    const { season: nextSeason, sim } = playFixtureAtCalendarIndex({
      season,
      calendarIndex: nxt.index,
      packId: store.getState().app.selectedPackId,
      userClubId,
      userLineup,
      squadsByClub: pack.indexes.playersByClub,
      playersByIdGlobal: pack.indexes.playersById,
      state: store.getState(),
      onStateUpdated: (st) => store.setState(st)
    });

    if (!sim) {
      alert("Jogo não pôde ser iniciado.");
      return;
    }

    saveSeason(nextSeason);
    alert(`${clubName(sim.homeId)} ${sim.homeGoals} x ${sim.awayGoals} ${clubName(sim.awayId)}\nOVR: ${sim.homeRating} - ${sim.awayRating}`);

    renderAll();
  }

  function simNextCalendarGame() {
    const season = getSeason();
    let i = season.calendarIndex || 0;
    while (i < season.calendar.length && season.calendar[i].played) i++;
    if (i >= season.calendar.length) { alert("Calendário concluído."); return; }

    const userLineup = store.getState().career.lineup;

    const { season: nextSeason, sim } = playFixtureAtCalendarIndex({
      season,
      calendarIndex: i,
      packId: store.getState().app.selectedPackId,
      userClubId,
      userLineup,
      squadsByClub: pack.indexes.playersByClub,
      playersByIdGlobal: pack.indexes.playersById,
      state: store.getState(),
      onStateUpdated: (st) => store.setState(st)
    });

    if (!sim) {
      alert("Jogo não pôde ser iniciado.");
      return;
    }

    saveSeason(nextSeason);
    renderAll();
  }

  function renderAll() {
    const compId = $competitionSelect.value;
    renderNextMatch();
    renderCompetitionHeader(compId);
    renderCompetitionView(compId);
    renderCalendar();
  }

  el.querySelector("#playNext").addEventListener("click", playNextUser);
  el.querySelector("#simDay").addEventListener("click", simNextCalendarGame);
  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));
  $competitionSelect.addEventListener("change", () => renderAll());

  renderCompetitionSelect();
  shell.mount(el);
  renderAll();

  return { render() {} };
}