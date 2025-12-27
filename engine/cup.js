/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/cup.js — Copa do Brasil AAA (Mata-mata)
   -------------------------------------------------------
   Objetivo:
   - Simular Copa do Brasil de forma estável (modelo):
     • 8 fases (F1..F8)
     • Jogo único por fase (simplificado, mas consistente)
     • Avança se vencer (empate -> pênaltis)
     • Eliminação e campeão
   - Persistência em gameState.cup

   API exposta:
   - Cup.ensure(force?)
   - Cup.resetSeason(year?)
   - Cup.getState()
   - Cup.getStatus(teamId)
   - Cup.getNextFixture(teamId)
   - Cup.consumeNextFixture(teamId)  // avança ponteiro e retorna jogo
   - Cup.applyUserMatchResult(reportOrArgs)
   - Cup.applyResult(homeId, awayId, goalsHome, goalsAway, meta?)
   - Cup.getBracket() // visão simples das fases do usuário
   - Cup.getAnnualEvents(teamId, year?) // opcional para Calendário futuramente

   Observações:
   - Este engine é “à prova de falhas”: funciona mesmo sem outros módulos.
   - Integra com News/Save se existirem.
   =======================================================*/

(function () {
  console.log("%c[Cup] cup.js carregado", "color:#fbbf24; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function iso(y, m, d) {
    const pad2 = (x) => String(x).padStart(2, "0");
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;

    if (!gs.cup || typeof gs.cup !== "object") gs.cup = {};
    const cup = gs.cup;

    if (cup.year == null) cup.year = gs.seasonYear;
    if (!cup.pointerByTeam || typeof cup.pointerByTeam !== "object") cup.pointerByTeam = {};
    if (!cup.userPath || typeof cup.userPath !== "object") cup.userPath = {}; // { [teamId]: { phase, eliminated, champion, fixturesByPhase } }
    if (!cup.global || typeof cup.global !== "object") cup.global = { championByYear: {} };

    return gs;
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function save() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
  }

  function news(title, body) {
    try { if (window.News && typeof News.pushNews === "function") News.pushNews(title, body, "CUP"); } catch (e) {}
  }

  // -----------------------------
  // Config Copa
  // -----------------------------
  const PHASES = [
    { key: "F1", name: "1ª Fase", slot: { m: 2, d: 20 } },
    { key: "F2", name: "2ª Fase", slot: { m: 3, d: 20 } },
    { key: "F3", name: "3ª Fase", slot: { m: 5, d: 18 } },
    { key: "F4", name: "Oitavas", slot: { m: 5, d: 28 } },
    { key: "F5", name: "Quartas", slot: { m: 7, d: 17 } },
    { key: "F6", name: "Semifinal", slot: { m: 7, d: 27 } },
    { key: "F7", name: "Final (Ida)", slot: { m: 9, d: 10 } },
    { key: "F8", name: "Final (Volta)", slot: { m: 9, d: 24 } }
  ];

  function normalizeTeamName(id) {
    return getTeamById(id)?.name || String(id);
  }

  function ensureUserPath(teamId, year) {
    const gs = ensureGS();
    const cup = gs.cup;
    const tid = String(teamId);
    if (!cup.userPath[tid] || cup.userPath[tid].year !== year) {
      cup.userPath[tid] = {
        year,
        phaseIndex: 0,
        eliminated: false,
        champion: false,
        fixturesByPhase: {}, // F1..F8 => fixture object
        resultsByPhase: {}   // F1..F8 => {gh,ga, winnerId}
      };
      cup.pointerByTeam[tid] = 0;
    }
    return cup.userPath[tid];
  }

  function chooseOpponent(teamId, usedOpponents) {
    const teams = getTeams();
    const tid = String(teamId);
    const used = usedOpponents || new Set();

    // candidatos: todos menos o usuário
    let pool = teams.filter(t => String(t.id) !== tid);
    // tenta não repetir
    const unUsed = pool.filter(t => !used.has(String(t.id)));
    if (unUsed.length) pool = unUsed;

    // peso leve por divisão (se existir): misturar A/B e alguns menores
    // sem dados de divisão? tudo bem.
    const top = pool.slice(0, Math.min(12, pool.length));
    const opp = pick(top.length ? top : pool);
    return opp ? String(opp.id) : "TBD";
  }

  function createFixtureForPhase(teamId, phaseIndex, usedOpponents) {
    const gs = ensureGS();
    const year = n(gs.cup.year, gs.seasonYear);
    const phase = PHASES[phaseIndex];

    const oppId = chooseOpponent(teamId, usedOpponents);

    // alterna mando por fase (simples)
    const homeId = (phaseIndex % 2 === 0) ? String(teamId) : oppId;
    const awayId = (phaseIndex % 2 === 0) ? oppId : String(teamId);

    return {
      date: iso(year, phase.slot.m, phase.slot.d),
      comp: "CUP",
      competitionName: "Copa do Brasil",
      phaseKey: phase.key,
      phaseName: phase.name,
      roundNumber: phaseIndex + 1,
      homeId,
      awayId,
      played: false,
      goalsHome: null,
      goalsAway: null,
      decidedBy: null // "PENALTIES" | null
    };
  }

  function ensureFixtures(teamId) {
    const gs = ensureGS();
    const year = n(gs.cup.year, gs.seasonYear);
    const path = ensureUserPath(teamId, year);

    // set para evitar repetição de adversário
    const usedOpp = new Set();
    Object.values(path.fixturesByPhase).forEach(fx => {
      if (!fx) return;
      const opp = (String(fx.homeId) === String(teamId)) ? fx.awayId : fx.homeId;
      if (opp) usedOpp.add(String(opp));
    });

    for (let i = 0; i < PHASES.length; i++) {
      const pk = PHASES[i].key;
      if (!path.fixturesByPhase[pk]) {
        path.fixturesByPhase[pk] = createFixtureForPhase(teamId, i, usedOpp);
        // marca adversário como usado
        const fx = path.fixturesByPhase[pk];
        const opp = (String(fx.homeId) === String(teamId)) ? fx.awayId : fx.homeId;
        if (opp) usedOpp.add(String(opp));
      }
    }
  }

  function getStatus(teamId) {
    const gs = ensureGS();
    const year = n(gs.cup.year, gs.seasonYear);
    const path = ensureUserPath(teamId, year);
    ensureFixtures(teamId);

    if (path.champion) return { active: false, eliminated: false, champion: true, phase: "CAMPEÃO" };
    if (path.eliminated) return { active: false, eliminated: true, champion: false, phase: "ELIMINADO" };

    const phase = PHASES[clamp(path.phaseIndex, 0, PHASES.length - 1)];
    return { active: true, eliminated: false, champion: false, phase: phase.name, phaseKey: phase.key, phaseIndex: path.phaseIndex };
  }

  function getNextFixture(teamId) {
    const gs = ensureGS();
    const year = n(gs.cup.year, gs.seasonYear);
    const path = ensureUserPath(teamId, year);

    ensureFixtures(teamId);

    if (path.eliminated || path.champion) return null;

    const phase = PHASES[clamp(path.phaseIndex, 0, PHASES.length - 1)];
    const fx = path.fixturesByPhase[phase.key];
    return fx ? Object.assign({}, fx) : null;
  }

  function consumeNextFixture(teamId) {
    const fx = getNextFixture(teamId);
    return fx ? fx : null;
  }

  function decideWinner(homeId, awayId, gh, ga) {
    if (gh > ga) return { winnerId: String(homeId), decidedBy: null };
    if (ga > gh) return { winnerId: String(awayId), decidedBy: null };
    // empate -> pênaltis
    const winnerId = rnd() < 0.50 ? String(homeId) : String(awayId);
    return { winnerId, decidedBy: "PENALTIES" };
  }

  function applyResult(homeId, awayId, goalsHome, goalsAway, meta) {
    const gs = ensureGS();
    const year = n(gs.cup.year, gs.seasonYear);

    const tid = String(meta?.teamId || getUserTeamId() || "");
    if (!tid) return { ok: false, msg: "Sem time para processar." };

    const path = ensureUserPath(tid, year);
    ensureFixtures(tid);

    // se já eliminado/campeão, ignora
    if (path.eliminated || path.champion) return { ok: false, msg: "Copa já encerrada para o time." };

    const phase = PHASES[clamp(path.phaseIndex, 0, PHASES.length - 1)];
    const fx = path.fixturesByPhase[phase.key];
    if (!fx) return { ok: false, msg: "Partida da fase não encontrada." };

    // Confere se bate com o fixture (tolerante)
    const matchOk =
      (String(fx.homeId) === String(homeId) && String(fx.awayId) === String(awayId)) ||
      (String(fx.homeId) === String(awayId) && String(fx.awayId) === String(homeId));

    // se invertido, ajusta
    let gh = n(goalsHome, 0);
    let ga = n(goalsAway, 0);
    let fxHomeId = String(homeId);
    let fxAwayId = String(awayId);

    if (!matchOk) {
      // usa o fixture mesmo e assume placar informado é do homeId/awayId do report (não muda)
      fxHomeId = String(fx.homeId);
      fxAwayId = String(fx.awayId);

      // se o report vier invertido e o usuário for o outro mando, tentamos corrigir
      // mas sem dados confiáveis, mantém como veio.
    } else {
      // se report invertido (home/away trocados), inverte gols
      if (String(fx.homeId) !== String(homeId)) {
        const tmp = gh; gh = ga; ga = tmp;
        fxHomeId = String(fx.homeId);
        fxAwayId = String(fx.awayId);
      } else {
        fxHomeId = String(fx.homeId);
        fxAwayId = String(fx.awayId);
      }
    }

    // aplica no fixture
    fx.played = true;
    fx.goalsHome = gh;
    fx.goalsAway = ga;

    const dec = decideWinner(fxHomeId, fxAwayId, gh, ga);
    fx.decidedBy = dec.decidedBy;

    path.resultsByPhase[phase.key] = { gh, ga, winnerId: dec.winnerId, decidedBy: dec.decidedBy };
    path.fixturesByPhase[phase.key] = fx;

    const userWon = (String(dec.winnerId) === String(tid));

    const oppId = (String(fx.homeId) === String(tid)) ? fx.awayId : fx.homeId;
    const oppName = normalizeTeamName(oppId);

    if (!userWon) {
      path.eliminated = true;
      news("Copa do Brasil", `Você foi eliminado na ${phase.name} contra ${oppName}.`, "CUP");
      save();
      return { ok: true, msg: "Eliminado", eliminated: true, phase: phase.key, fixture: Object.assign({}, fx) };
    }

    // avançou
    path.phaseIndex += 1;

    if (path.phaseIndex >= PHASES.length) {
      path.champion = true;
      gs.cup.global.championByYear[String(year)] = tid;
      news("CAMPEÃO!", `Você conquistou a Copa do Brasil!`, "CUP");
      save();
      return { ok: true, msg: "Campeão", champion: true, fixture: Object.assign({}, fx) };
    }

    const nextPhase = PHASES[path.phaseIndex];
    news("Copa do Brasil", `Classificado! Você avançou para ${nextPhase.name}.`, "CUP");
    save();
    return { ok: true, msg: "Classificado", advanced: true, nextPhase: nextPhase.key, fixture: Object.assign({}, fx) };
  }

  function applyUserMatchResult(reportOrArgs) {
    // aceita:
    // - report do Match (com homeId/awayId/goalsHome/goalsAway e currentMatchContext)
    // - ou args diretos: {homeId, awayId, goalsHome, goalsAway}
    const tid = String(reportOrArgs?.teamId || getUserTeamId() || "");
    if (!tid) return { ok: false, msg: "Time do usuário não encontrado." };

    const homeId = reportOrArgs?.homeId;
    const awayId = reportOrArgs?.awayId;
    const gh = reportOrArgs?.goalsHome ?? reportOrArgs?.gh;
    const ga = reportOrArgs?.goalsAway ?? reportOrArgs?.ga;

    if (homeId == null || awayId == null) return { ok: false, msg: "Dados de partida insuficientes." };

    return applyResult(homeId, awayId, gh, ga, { teamId: tid });
  }

  function getBracket(teamId) {
    const gs = ensureGS();
    const year = n(gs.cup.year, gs.seasonYear);
    const tid = String(teamId || getUserTeamId() || "");
    if (!tid) return null;

    const path = ensureUserPath(tid, year);
    ensureFixtures(tid);

    const phases = PHASES.map((p, idx) => {
      const fx = path.fixturesByPhase[p.key];
      const res = path.resultsByPhase[p.key] || null;
      return {
        key: p.key,
        name: p.name,
        index: idx,
        fixture: fx ? Object.assign({}, fx) : null,
        result: res ? Object.assign({}, res) : null,
        status:
          (idx < path.phaseIndex && res) ? "PLAYED" :
          (idx === path.phaseIndex && !path.eliminated && !path.champion) ? "NEXT" :
          (idx > path.phaseIndex) ? "LOCKED" :
          "—"
      };
    });

    return {
      year,
      teamId: tid,
      eliminated: !!path.eliminated,
      champion: !!path.champion,
      currentPhaseIndex: path.phaseIndex,
      phases
    };
  }

  function getAnnualEvents(teamId, year) {
    const gs = ensureGS();
    const y = n(year, gs.seasonYear);
    const tid = String(teamId || getUserTeamId() || "");
    if (!tid) return [];

    // garante fixtures do ano atual
    gs.cup.year = y;
    const path = ensureUserPath(tid, y);
    ensureFixtures(tid);

    const events = [];
    for (let i = 0; i < PHASES.length; i++) {
      const pk = PHASES[i].key;
      const fx = path.fixturesByPhase[pk];
      if (!fx) continue;

      events.push({
        date: fx.date,
        comp: "CUP",
        competitionName: "Copa do Brasil",
        homeId: fx.homeId,
        awayId: fx.awayId,
        roundNumber: i + 1,
        phaseKey: pk,
        phaseName: fx.phaseName
      });
    }
    events.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return events;
  }

  function resetSeason(year) {
    const gs = ensureGS();
    const y = n(year, gs.seasonYear);
    gs.cup = {
      year: y,
      pointerByTeam: {},
      userPath: {},
      global: gs.cup?.global || { championByYear: {} }
    };
    save();
    return true;
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.Cup = {
    ensure(force) {
      const gs = ensureGS();
      if (force) {
        // regenera paths do usuário
        const tid = getUserTeamId();
        if (tid) {
          gs.cup.year = n(gs.seasonYear, 2026);
          ensureUserPath(tid, gs.cup.year);
          ensureFixtures(tid);
        }
      } else {
        const tid = getUserTeamId();
        if (tid) {
          gs.cup.year = n(gs.seasonYear, 2026);
          ensureUserPath(tid, gs.cup.year);
          ensureFixtures(tid);
        }
      }
    },

    resetSeason,

    getState() {
      ensureGS();
      return JSON.parse(JSON.stringify(window.gameState.cup || {}));
    },

    getStatus(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return { active: false, eliminated: false, champion: false, phase: "—" };
      return getStatus(tid);
    },

    getNextFixture(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return null;
      return getNextFixture(tid);
    },

    consumeNextFixture(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return null;
      return consumeNextFixture(tid);
    },

    applyUserMatchResult(reportOrArgs) {
      return applyUserMatchResult(reportOrArgs);
    },

    applyResult(homeId, awayId, goalsHome, goalsAway, meta) {
      return applyResult(homeId, awayId, goalsHome, goalsAway, meta);
    },

    getBracket(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return null;
      return getBracket(tid);
    },

    getAnnualEvents(teamId, year) {
      return getAnnualEvents(teamId, year);
    },

    getAskingInfo() {
      return { phases: PHASES.map(p => ({ key: p.key, name: p.name })) };
    }
  };
})();