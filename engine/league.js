// engine/league.js
// =======================================================
// Sistema de Ligas – Série A e B
// - Gera calendário (38 rodadas)
// - Simula resultados
// - Mantém classificação
// - Suporta salvar/carregar do localStorage
// =======================================================

(function () {
  console.log("%c[League] league.js carregado", "color:#22c55e; font-weight:bold;");

  const SAVE_KEY = "VFM2026_SAVE";

  // Garante que gameState exista
  function ensureGameState() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;

    if (!gs.seasonYear) gs.seasonYear = 2026;
    if (!gs.standings) gs.standings = { A: [], B: [] };
    if (!gs.fixtures) gs.fixtures = { A: [], B: [] };
    if (gs.currentRoundA == null) gs.currentRoundA = 1;
    if (gs.currentRoundB == null) gs.currentRoundB = 1;
    if (!gs.currentTeamId && window.Game && Game.teamId) {
      gs.currentTeamId = Game.teamId;
    }
    return gs;
  }

  function saveGameState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(window.gameState));
    } catch (e) {
      console.warn("[League] Falha ao salvar no localStorage:", e);
    }
  }

  function loadGameState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return ensureGameState();
      window.gameState = JSON.parse(raw) || {};
    } catch (e) {
      console.warn("[League] Falha ao carregar save:", e);
    }
    return ensureGameState();
  }

  // ---------------------------------------------------
  // GERAÇÃO DO CALENDÁRIO (ROUND-ROBIN DUPLO)
  // ---------------------------------------------------
  function generateSingleRoundRobin(teamIds, division) {
    const arr = [...teamIds];
    const n = arr.length;
    if (n % 2 === 1) arr.push(null); // não deve acontecer aqui (20 times), mas por segurança.

    const rounds = [];
    const m = arr.length;

    for (let r = 0; r < m - 1; r++) {
      const matches = [];
      for (let i = 0; i < m / 2; i++) {
        const home = arr[i];
        const away = arr[m - 1 - i];
        if (home && away) {
          matches.push({
            division,
            homeId: home,
            awayId: away,
            goalsHome: null,
            goalsAway: null,
            played: false,
          });
        }
      }

      rounds.push(matches);

      // Rotação estilo "ciclo"
      const fixed = arr[0];
      const rest = arr.slice(1);
      rest.unshift(rest.pop());
      arr.splice(1, rest.length, ...rest);
    }
    return rounds;
  }

  function generateFullSeason(teamIds, division) {
    const firstHalf = generateSingleRoundRobin(teamIds, division);
    const secondHalf = firstHalf.map((rodada) =>
      rodada.map((m) => ({
        division,
        homeId: m.awayId,
        awayId: m.homeId,
        goalsHome: null,
        goalsAway: null,
        played: false,
      }))
    );
    return firstHalf.concat(secondHalf); // 38 rodadas
  }

  function ensureFixtures() {
    ensureGameState();
    const gs = window.gameState;

    ["A", "B"].forEach((div) => {
      if (!gs.fixtures[div] || !gs.fixtures[div].length) {
        const ids = (window.Database?.teams || teams).filter((t) => t.division === div).map((t) => t.id);
        gs.fixtures[div] = generateFullSeason(ids, div);
      }
    });

    saveGameState();
  }

  // ---------------------------------------------------
  // CLASSIFICAÇÃO
  // ---------------------------------------------------
  function ensureStandings(division) {
    ensureGameState();
    const gs = window.gameState;

    if (!Array.isArray(gs.standings[division]) || !gs.standings[division].length) {
      const base = (window.Database?.teams || teams)
        .filter((t) => t.division === division)
        .map((t) => ({
          teamId: t.id,
          name: t.name,
          pts: 0,
          j: 0,
          v: 0,
          e: 0,
          d: 0,
          gp: 0,
          gc: 0,
          sg: 0,
        }));
      gs.standings[division] = base;
    }
  }

  function getStandingRow(division, teamId) {
    ensureStandings(division);
    const gs = window.gameState;
    let row = gs.standings[division].find((r) => r.teamId === teamId);
    if (!row) {
      const team = (window.Database?.teams || teams).find((t) => t.id === teamId);
      row = {
        teamId,
        name: team ? team.name : teamId,
        pts: 0,
        j: 0,
        v: 0,
        e: 0,
        d: 0,
        gp: 0,
        gc: 0,
        sg: 0,
      };
      gs.standings[division].push(row);
    }
    return row;
  }

  function applyResultToStandings(division, homeId, awayId, gH, gA) {
    ensureStandings(division);
    const rowH = getStandingRow(division, homeId);
    const rowA = getStandingRow(division, awayId);

    rowH.j += 1;
    rowA.j += 1;
    rowH.gp += gH;
    rowH.gc += gA;
    rowA.gp += gA;
    rowA.gc += gH;
    rowH.sg = rowH.gp - rowH.gc;
    rowA.sg = rowA.gp - rowA.gc;

    if (gH > gA) {
      rowH.v += 1;
      rowA.d += 1;
      rowH.pts += 3;
    } else if (gH < gA) {
      rowA.v += 1;
      rowH.d += 1;
      rowA.pts += 3;
    } else {
      rowH.e += 1;
      rowA.e += 1;
      rowH.pts += 1;
      rowA.pts += 1;
    }
  }

  function recomputeStandingsFromFixtures(division) {
    ensureStandings(division);
    const gs = window.gameState;

    // Zera
    gs.standings[division].forEach((r) => {
      r.pts = r.j = r.v = r.e = r.d = r.gp = r.gc = r.sg = 0;
    });

    const fixturesDiv = gs.fixtures[division] || [];
    fixturesDiv.forEach((rodada) => {
      rodada.forEach((m) => {
        if (m.played && m.goalsHome != null && m.goalsAway != null) {
          applyResultToStandings(division, m.homeId, m.awayId, m.goalsHome, m.goalsAway);
        }
      });
    });
  }

  function sortStandings(division) {
    ensureStandings(division);
    const gs = window.gameState;
    gs.standings[division].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const sgA = a.sg;
      const sgB = b.sg;
      if (sgB !== sgA) return sgB - sgA;
      if (b.gp !== a.gp) return b.gp - a.gp;
      return a.name.localeCompare(b.name);
    });
    gs.standings[division].forEach((r, idx) => (r.position = idx + 1));
  }

  // ---------------------------------------------------
  // FORÇA DOS TIMES E SIMULAÇÃO
  // ---------------------------------------------------
  function getTeamStrength(teamId) {
    const elenco = (window.Database?.carregarElencoDoTime)
      ? Database.carregarElencoDoTime(teamId)
      : (window.Database?.players || players).filter((p) => p.teamId === teamId);

    if (!elenco.length) return 70;
    const ordenado = [...elenco].sort((a, b) => (b.overall || 70) - (a.overall || 70));
    const titulares = ordenado.slice(0, 11);
    const soma = titulares.reduce((acc, p) => acc + (p.overall || 70), 0);
    return soma / titulares.length;
  }

  function randGoals(base) {
    // base ~1.0–3.0
    const r = Math.random();
    let g = 0;
    if (r < 0.20) g = 0;
    else if (r < 0.50) g = 1;
    else if (r < 0.75) g = 2;
    else if (r < 0.93) g = 3;
    else g = 4;

    if (base > 2.3 && Math.random() < 0.35) g += 1;
    if (base < 1.0 && Math.random() < 0.4 && g > 0) g -= 1;
    if (g < 0) g = 0;
    return g;
  }

  function simulateMatch(division, m) {
    const strH = getTeamStrength(m.homeId);
    const strA = getTeamStrength(m.awayId);
    const diff = (strH - strA) / 10; // +- ~1
    const base = 1.6;

    const baseH = Math.max(0.5, base + diff * 0.7);
    const baseA = Math.max(0.5, base - diff * 0.7);

    const gH = randGoals(baseH);
    const gA = randGoals(baseA);

    m.goalsHome = gH;
    m.goalsAway = gA;
    m.played = true;

    applyResultToStandings(division, m.homeId, m.awayId, gH, gA);
  }

  // ---------------------------------------------------
  // UTILITÁRIOS PÚBLICOS
  // ---------------------------------------------------
  function getCurrentTeam() {
    const gs = ensureGameState();
    const id = gs.currentTeamId || (window.Game && Game.teamId);
    if (!id) return null;
    const lista = window.Database?.teams || teams;
    return lista.find((t) => t.id === id) || null;
  }

  function getCurrentRound(division) {
    ensureGameState();
    const gs = window.gameState;
    return division === "B" ? gs.currentRoundB || 1 : gs.currentRoundA || 1;
  }

  function setCurrentRound(division, round) {
    ensureGameState();
    const gs = window.gameState;
    if (division === "B") gs.currentRoundB = round;
    else gs.currentRoundA = round;
  }

  function getCalendarForDivision(division) {
    ensureFixtures();
    const gs = window.gameState;
    const baseDate = new Date(gs.seasonYear, 3, 6); // 6 de abril (só pra ter datas)
    const msPerRound = 4 * 24 * 60 * 60 * 1000; // a cada 4 dias

    return (gs.fixtures[division] || []).map((rodada, idx) => {
      const d = new Date(baseDate.getTime() + idx * msPerRound);
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const ano = d.getFullYear();
      return {
        round: idx + 1,
        date: `${dia}/${mes}/${ano}`,
        matches: rodada,
      };
    });
  }

  function getStandingsForCurrentDivision(division) {
    ensureFixtures();
    recomputeStandingsFromFixtures(division);
    sortStandings(division);
    // devolve uma cópia pra UI
    return (window.gameState.standings[division] || []).map((r) => ({ ...r }));
  }

  function playNextRoundForUserTeam() {
    ensureFixtures();
    const gs = window.gameState;
    const team = getCurrentTeam();
    if (!team) {
      console.warn("[League] Nenhum time selecionado para o usuário.");
      return null;
    }
    const div = team.division || "A";
    const round = getCurrentRound(div);
    const fixturesDiv = gs.fixtures[div] || [];
    if (round > fixturesDiv.length) {
      console.log("[League] Temporada encerrada nessa divisão.");
      return null;
    }

    const rodada = fixturesDiv[round - 1];

    // Simula TODOS os jogos da rodada (incluindo o do usuário)
    rodada.forEach((m) => {
      if (!m.played) simulateMatch(div, m);
    });

    setCurrentRound(div, round + 1);
    saveGameState();
    return rodada;
  }

  function startNewCareer(teamId) {
    console.log("[League] Iniciando nova carreira para", teamId);
    window.gameState = {
      seasonYear: 2026,
      currentTeamId: teamId,
      standings: { A: [], B: [] },
      fixtures: { A: [], B: [] },
      currentRoundA: 1,
      currentRoundB: 1,
    };
    ensureFixtures();
    ensureStandings("A");
    ensureStandings("B");
    saveGameState();
  }

  // Inicializa carregando save (se houver)
  loadGameState();
  ensureFixtures();
  ensureStandings("A");
  ensureStandings("B");

  // Expor API
  window.League = {
    loadGameState,
    saveGameState,
    ensureFixtures,
    getCalendarForDivision,
    getStandingsForCurrentDivision,
    getCurrentRound,
    playNextRoundForUserTeam,
    startNewCareer,
  };
})();
