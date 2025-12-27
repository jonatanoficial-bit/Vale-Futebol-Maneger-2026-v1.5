/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/regionals.js – Campeonato Estadual (fase inicial)

   - Implementa Estaduais principais (SP, RJ, MG, RS, BA)
   - Formato v1: pontos corridos (turno único) por estado
   - Integração: usa gameState.phase === "ESTADUAIS"
   - Sem mexer em database.js (mapeamento aqui)
   =======================================================*/

(function () {
  console.log("%c[REGIONAIS] regionals.js carregado", "color:#06b6d4; font-weight:bold;");

  // -----------------------------
  // UTIL
  // -----------------------------
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getTeamById(teamId) {
    const list = (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
    return list.find(t => t.id === teamId) || null;
  }

  function ensureGameState() {
    if (!window.gameState) window.gameState = {};
    if (!gameState.regionals) gameState.regionals = {};
    if (typeof gameState.regionalsWeek !== "number") gameState.regionalsWeek = 1;
    if (!gameState.phase) gameState.phase = "ESTADUAIS";
  }

  function getOrCreateStandingsTable(teamIds) {
    const table = {};
    teamIds.forEach(id => {
      table[id] = {
        teamId: id,
        P: 0,
        J: 0,
        V: 0,
        E: 0,
        D: 0,
        GP: 0,
        GC: 0,
        SG: 0
      };
    });
    return table;
  }

  function sortStandingsArray(arr) {
    // P, V, SG, GP
    arr.sort((a, b) => {
      if (b.P !== a.P) return b.P - a.P;
      if (b.V !== a.V) return b.V - a.V;
      if (b.SG !== a.SG) return b.SG - a.SG;
      if (b.GP !== a.GP) return b.GP - a.GP;
      return 0;
    });
    return arr;
  }

  // -----------------------------
  // CONFIG: ESTADUAIS PRINCIPAIS
  // (sem mexer na base: mapeamento aqui)
  // -----------------------------
  const REGIONAL_CONFIG = [
    {
      id: "SP",
      name: "Campeonato Paulista",
      teams: ["PAL", "COR", "SAO", "SAN", "RBB", "MIR", "FER", "NOV"]
    },
    {
      id: "RJ",
      name: "Campeonato Carioca",
      teams: ["FLA", "FLU", "VAS", "BOT"]
    },
    {
      id: "MG",
      name: "Campeonato Mineiro",
      teams: ["AMG", "CRU", "AME", "ATC"]
    },
    {
      id: "RS",
      name: "Campeonato Gaúcho",
      teams: ["GRE", "INT", "JUV"]
    },
    {
      id: "BA",
      name: "Campeonato Baiano",
      teams: ["BAH", "VIT"]
    }
  ];

  // -----------------------------
  // GERAÇÃO DE FIXTURES
  // Round-robin (turno único)
  // -----------------------------
  function generateRoundRobin(teamIds) {
    const ids = teamIds.slice().filter(Boolean);
    const BYE = "BYE";

    // se ímpar, adiciona BYE
    if (ids.length % 2 === 1) ids.push(BYE);

    const n = ids.length;
    const rounds = n - 1;
    const half = n / 2;

    const arr = ids.slice();

    const fixtures = [];
    for (let r = 0; r < rounds; r++) {
      const matches = [];
      for (let i = 0; i < half; i++) {
        const home = arr[i];
        const away = arr[n - 1 - i];
        if (home !== BYE && away !== BYE) {
          matches.push({
            homeId: home,
            awayId: away,
            golsHome: null,
            golsAway: null,
            played: false
          });
        }
      }

      // alterna mando levemente
      if (r % 2 === 1) {
        matches.forEach(m => {
          const tmp = m.homeId;
          m.homeId = m.awayId;
          m.awayId = tmp;
        });
      }

      fixtures.push({
        round: r + 1,
        matches
      });

      // rotação (circle method)
      const fixed = arr[0];
      const rest = arr.slice(1);
      rest.unshift(rest.pop());
      arr.splice(0, arr.length, fixed, ...rest);
    }

    return fixtures;
  }

  // -----------------------------
  // INIT / RESET REGIONAIS
  // -----------------------------
  function initRegionalsForSeason(seasonYear) {
    ensureGameState();

    const season = seasonYear || gameState.seasonYear || new Date().getFullYear();

    const comps = [];
    for (const cfg of REGIONAL_CONFIG) {
      // filtra só times que existem na Database
      const validTeams = cfg.teams.filter(tid => !!getTeamById(tid));
      if (validTeams.length < 2) continue;

      const fixtures = generateRoundRobin(validTeams);
      comps.push({
        id: cfg.id,
        name: cfg.name,
        seasonYear: season,
        teamIds: validTeams,
        fixtures,
        standings: getOrCreateStandingsTable(validTeams),
        finished: false,
        championId: null
      });
    }

    // descobre quantas "semanas" (rodadas) máximas
    const maxWeeks = comps.reduce((acc, c) => Math.max(acc, c.fixtures.length), 0);

    gameState.regionals = {
      seasonYear: season,
      week: 1,
      totalWeeks: maxWeeks,
      competitions: comps
    };

    // fase do jogo começa em estaduais
    gameState.phase = "ESTADUAIS";

    console.log("[REGIONAIS] Estaduais iniciados:", comps.map(c => c.id).join(", "), "Semanas:", maxWeeks);
  }

  // -----------------------------
  // TABELA / RESULTADOS
  // -----------------------------
  function applyResultToStandings(competition, homeId, awayId, golsHome, golsAway) {
    const st = competition.standings;
    if (!st[homeId] || !st[awayId]) return;

    const H = st[homeId];
    const A = st[awayId];

    H.J += 1; A.J += 1;
    H.GP += golsHome; H.GC += golsAway;
    A.GP += golsAway; A.GC += golsHome;
    H.SG = H.GP - H.GC;
    A.SG = A.GP - A.GC;

    if (golsHome > golsAway) {
      H.V += 1; A.D += 1;
      H.P += 3;
    } else if (golsHome < golsAway) {
      A.V += 1; H.D += 1;
      A.P += 3;
    } else {
      H.E += 1; A.E += 1;
      H.P += 1; A.P += 1;
    }
  }

  function isAllMatchesPlayedInWeek(competition, week) {
    const round = competition.fixtures.find(r => r.round === week);
    if (!round) return true; // se não existe, considera "ok"
    return round.matches.every(m => m.played);
  }

  function finalizeCompetitionIfDone(competition) {
    const allDone = competition.fixtures.every(r => r.matches.every(m => m.played));
    if (!allDone) return;

    // define campeão por tabela
    const tableArr = Object.values(competition.standings);
    sortStandingsArray(tableArr);
    competition.finished = true;
    competition.championId = tableArr[0]?.teamId || null;
  }

  function finalizeRegionalsIfDone() {
    if (!gameState.regionals || !Array.isArray(gameState.regionals.competitions)) return;

    // marca campeões
    gameState.regionals.competitions.forEach(finalizeCompetitionIfDone);

    // termina fase quando passa da última semana OU todos os campeonatos concluídos
    const week = gameState.regionals.week || 1;
    const total = gameState.regionals.totalWeeks || 1;

    const allFinished = gameState.regionals.competitions.every(c => c.finished);
    if (week > total || allFinished) {
      gameState.phase = "NACIONAL";
      console.log("%c[REGIONAIS] Fase de Estaduais concluída. Indo para NACIONAL.", "color:#22c55e; font-weight:bold;");
    }
  }

  // -----------------------------
  // SIMULAÇÃO (usa força simples)
  // - sem quebrar match.js atual
  // -----------------------------
  function estimateTeamStrength(teamId) {
    // tenta usar jogadores (se existir) – caso não exista, usa fallback
    const players = (window.Database && Array.isArray(Database.players)) ? Database.players : [];
    const squad = players.filter(p => p.teamId === teamId);
    if (!squad.length) return 65;

    let sum = 0;
    let n = 0;
    for (const p of squad) {
      const ovr = Number(p.ovr || p.overall || 0);
      if (ovr > 0) { sum += ovr; n++; }
    }
    return n ? (sum / n) : 65;
  }

  function simulateScore(homeId, awayId) {
    // modelo bem simples (vamos evoluir depois no Match v2)
    const sh = estimateTeamStrength(homeId) + 3; // vantagem casa
    const sa = estimateTeamStrength(awayId);

    const diff = sh - sa;
    const baseHome = 1.0 + Math.max(-0.3, Math.min(0.6, diff / 40));
    const baseAway = 0.9 + Math.max(-0.3, Math.min(0.5, -diff / 45));

    // converte bases em gols 0-4 com ruído
    const rand = () => Math.random();

    let gh = Math.floor(baseHome + rand() * 2);
    let ga = Math.floor(baseAway + rand() * 2);

    // limita
    gh = Math.max(0, Math.min(5, gh));
    ga = Math.max(0, Math.min(5, ga));

    return { golsHome: gh, golsAway: ga };
  }

  // -----------------------------
  // ACHAR PRÓXIMO JOGO DO USUÁRIO
  // -----------------------------
  function findUserCompetition(teamId) {
    ensureGameState();
    const comps = gameState.regionals?.competitions || [];
    return comps.find(c => c.teamIds.includes(teamId)) || null;
  }

  function getMatchForUserInCurrentWeek(teamId) {
    ensureGameState();
    const comp = findUserCompetition(teamId);
    if (!comp) return null;

    const week = gameState.regionals.week || 1;
    const round = comp.fixtures.find(r => r.round === week);
    if (!round) return null;

    const m = round.matches.find(mm => !mm.played && (mm.homeId === teamId || mm.awayId === teamId));
    if (!m) return null;

    return {
      competitionId: comp.id,
      competitionName: comp.name,
      week,
      match: m
    };
  }

  // -----------------------------
  // PROCESSAR RESULTADO DO USUÁRIO
  // - Marca resultado do jogo do usuário
  // - Simula o resto da "semana" dos estaduais
  // -----------------------------
  function processUserRegionalResult(homeId, awayId, golsHome, golsAway) {
    ensureGameState();

    const week = gameState.regionals.week || 1;
    const comps = gameState.regionals.competitions || [];

    // 1) acha o jogo do usuário na semana atual (em qualquer competição)
    let userComp = null;
    let userRound = null;
    let userMatch = null;

    for (const c of comps) {
      const r = c.fixtures.find(rr => rr.round === week);
      if (!r) continue;
      const mm = r.matches.find(m => !m.played && m.homeId === homeId && m.awayId === awayId);
      if (mm) {
        userComp = c;
        userRound = r;
        userMatch = mm;
        break;
      }
    }

    if (!userMatch) {
      console.warn("[REGIONAIS] Não achei o jogo do usuário na semana atual.");
      return null;
    }

    // marca o jogo do usuário
    userMatch.golsHome = golsHome;
    userMatch.golsAway = golsAway;
    userMatch.played = true;
    applyResultToStandings(userComp, homeId, awayId, golsHome, golsAway);

    // 2) simula o restante da semana para TODOS estaduais
    for (const c of comps) {
      const r = c.fixtures.find(rr => rr.round === week);
      if (!r) continue;

      for (const m of r.matches) {
        if (!m.played) {
          const sc = simulateScore(m.homeId, m.awayId);
          m.golsHome = sc.golsHome;
          m.golsAway = sc.golsAway;
          m.played = true;
          applyResultToStandings(c, m.homeId, m.awayId, m.golsHome, m.golsAway);
        }
      }
    }

    // 3) finaliza competições se concluídas
    comps.forEach(finalizeCompetitionIfDone);

    // 4) avança semana
    gameState.regionals.week = week + 1;

    // 5) encerra fase se acabou
    finalizeRegionalsIfDone();

    // devolve a "rodada" do estadual do usuário pra UI exibir
    // (mesmo formato básico: lista de jogos)
    return deepClone(userRound.matches);
  }

  // -----------------------------
  // STANDINGS EXPORT (para UI futura)
  // -----------------------------
  function getCompetitionStandings(competitionId) {
    ensureGameState();
    const comps = gameState.regionals?.competitions || [];
    const comp = comps.find(c => c.id === competitionId) || null;
    if (!comp) return [];
    const arr = Object.values(comp.standings).map(row => ({ ...row }));
    return sortStandingsArray(arr);
  }

  function getAllRegionalsSummary() {
    ensureGameState();
    const comps = gameState.regionals?.competitions || [];
    return comps.map(c => ({
      id: c.id,
      name: c.name,
      finished: !!c.finished,
      championId: c.championId
    }));
  }

  // -----------------------------
  // API GLOBAL
  // -----------------------------
  window.Regionals = {
    initRegionalsForSeason,
    getMatchForUserInCurrentWeek,
    processUserRegionalResult,
    getCompetitionStandings,
    getAllRegionalsSummary
  };
})();