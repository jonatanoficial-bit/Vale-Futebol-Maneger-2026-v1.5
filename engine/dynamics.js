/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/dynamics.js — Moral / Forma / Fadiga (persistente)
   =======================================================*/

(function () {
  console.log("%c[Dynamics] dynamics.js carregado", "color:#22c55e; font-weight:bold;");

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function ensureGameState() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;

    if (!gs.playerStates || typeof gs.playerStates !== "object") gs.playerStates = {};
    if (!gs.teamRuntime || typeof gs.teamRuntime !== "object") gs.teamRuntime = {};
    if (!gs.seasonYear) gs.seasonYear = 2025;

    return gs;
  }

  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function getTeamById(id) {
    return getTeams().find(t => t.id === id) || null;
  }

  function playerKey(p) {
    return String(p?.id || p?.playerId || "");
  }

  function ensurePlayerState(pid) {
    const gs = ensureGameState();
    if (!pid) return null;
    if (!gs.playerStates[pid]) {
      gs.playerStates[pid] = {
        morale: 55,   // 0-100
        form: 55,     // 0-100
        fatigue: 10,  // 0-100 (quanto maior, mais cansado)
      };
    }
    return gs.playerStates[pid];
  }

  function updateTeamStreak(teamId, resultChar) {
    const gs = ensureGameState();
    if (!gs.teamRuntime[teamId]) {
      gs.teamRuntime[teamId] = { last5: [], streakW: 0, streakD: 0, streakL: 0 };
    }
    const tr = gs.teamRuntime[teamId];

    tr.last5.push(resultChar);
    if (tr.last5.length > 5) tr.last5.shift();

    if (resultChar === "W") { tr.streakW += 1; tr.streakD = 0; tr.streakL = 0; }
    if (resultChar === "D") { tr.streakD += 1; tr.streakW = 0; tr.streakL = 0; }
    if (resultChar === "L") { tr.streakL += 1; tr.streakW = 0; tr.streakD = 0; }

    return tr;
  }

  function computeResult(goalsFor, goalsAgainst) {
    if (goalsFor > goalsAgainst) return "W";
    if (goalsFor < goalsAgainst) return "L";
    return "D";
  }

  function applyPlayerDelta(ps, dMorale, dForm, dFatigue) {
    ps.morale = clamp((ps.morale ?? 55) + dMorale, 0, 100);
    ps.form = clamp((ps.form ?? 55) + dForm, 0, 100);
    ps.fatigue = clamp((ps.fatigue ?? 10) + dFatigue, 0, 100);
  }

  function applyPostMatch(report) {
    const gs = ensureGameState();

    // garante todos players com state
    getPlayers().forEach(p => ensurePlayerState(playerKey(p)));

    const homeId = report.homeId;
    const awayId = report.awayId;

    const rHome = computeResult(report.goalsHome, report.goalsAway);
    const rAway = computeResult(report.goalsAway, report.goalsHome);

    const trHome = updateTeamStreak(homeId, rHome);
    const trAway = updateTeamStreak(awayId, rAway);

    // desempenho pelo xG (proxy)
    const xgHome = Number(report.stats?.xgHome ?? 0);
    const xgAway = Number(report.stats?.xgAway ?? 0);
    const xgDiff = xgHome - xgAway;

    // lista de quem jogou
    const playedHome = Array.isArray(report.played?.home) ? report.played.home : [];
    const playedAway = Array.isArray(report.played?.away) ? report.played.away : [];

    // valores base (FM-like simplificado)
    const resultDelta = (res) => (res === "W" ? 6 : (res === "D" ? 1 : -6));
    const formDelta = (res) => (res === "W" ? 4 : (res === "D" ? 1 : -4));

    // ajuste por xG
    const xgBoostHome = clamp(Math.round(xgDiff * 2), -3, 3);
    const xgBoostAway = clamp(Math.round(-xgDiff * 2), -3, 3);

    // fadiga do jogo
    const fatiguePlayed = 18;
    const fatigueRest = -6; // quem não jogou descansa um pouco

    // ===== aplica nos que jogaram =====
    playedHome.forEach(pid => {
      const ps = ensurePlayerState(String(pid));
      if (!ps) return;
      applyPlayerDelta(ps, resultDelta(rHome) + xgBoostHome, formDelta(rHome) + xgBoostHome, fatiguePlayed);
    });

    playedAway.forEach(pid => {
      const ps = ensurePlayerState(String(pid));
      if (!ps) return;
      applyPlayerDelta(ps, resultDelta(rAway) + xgBoostAway, formDelta(rAway) + xgBoostAway, fatiguePlayed);
    });

    // ===== aplica “descanso” para o resto do elenco dos dois times =====
    const allHome = getPlayers().filter(p => p.teamId === homeId).map(p => playerKey(p));
    const allAway = getPlayers().filter(p => p.teamId === awayId).map(p => playerKey(p));

    allHome.forEach(pid => {
      if (!pid || playedHome.includes(pid)) return;
      const ps = ensurePlayerState(String(pid));
      applyPlayerDelta(ps, (rHome === "W" ? 2 : (rHome === "L" ? -2 : 0)), 0, fatigueRest);
    });

    allAway.forEach(pid => {
      if (!pid || playedAway.includes(pid)) return;
      const ps = ensurePlayerState(String(pid));
      applyPlayerDelta(ps, (rAway === "W" ? 2 : (rAway === "L" ? -2 : 0)), 0, fatigueRest);
    });

    // ===== recuperação global pós-partida (leve) =====
    // reduz fadiga de TODOS um pouco (simula dia seguinte)
    Object.keys(gs.playerStates).forEach(pid => {
      const ps = gs.playerStates[pid];
      ps.fatigue = clamp((ps.fatigue ?? 10) - 6, 0, 100);
    });

    // summary para feed de notícias
    const summary = {
      home: { teamId: homeId, result: rHome, streak: { ...trHome } },
      away: { teamId: awayId, result: rAway, streak: { ...trAway } },
      fatigueAlerts: [],
    };

    // alerta: cansaço alto no time do usuário
    const userTeamId = (gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null));
    if (userTeamId) {
      const elenco = getPlayers().filter(p => p.teamId === userTeamId);
      const tired = elenco
        .map(p => ({ id: playerKey(p), name: p.name || p.nome || "Jogador", fat: gs.playerStates[playerKey(p)]?.fatigue ?? 0 }))
        .filter(x => x.fat >= 78)
        .sort((a, b) => b.fat - a.fat)
        .slice(0, 4);

      if (tired.length) summary.fatigueAlerts = tired;
    }

    return summary;
  }

  function ensure() {
    const gs = ensureGameState();
    // prepara states para todos jogadores
    getPlayers().forEach(p => ensurePlayerState(playerKey(p)));
    return gs;
  }

  function getPlayerState(playerId) {
    const gs = ensureGameState();
    return gs.playerStates[String(playerId)] || null;
  }

  window.Dynamics = {
    ensure,
    applyPostMatch,
    getPlayerState,
  };
})();