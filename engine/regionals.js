/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/regionals.js — Estaduais AAA (Tabela + Rodadas)
   -------------------------------------------------------
   Objetivo:
   - Simular um Estadual principal para o time do usuário:
     • 12 rodadas (Jan–Mar)
     • Tabela com pontos, saldo, etc.
     • Simula jogos restantes da rodada quando usuário joga
     • Campeão ao fim (rodada 12)

   Persistência:
   - gameState.regionals = {
       year,
       stateByTeam: { [teamId]: { divisionTag, round, standings, fixtures } }
     }

   API exposta:
   - Regionals.ensure(force?)
   - Regionals.resetSeason(year?)
   - Regionals.getStatus(teamId)
   - Regionals.getStandings(teamId)
   - Regionals.getCurrentRound(teamId)
   - Regionals.getNextFixture(teamId)
   - Regionals.consumeNextFixture(teamId)
   - Regionals.applyUserMatchResult(reportOrArgs)
   - Regionals.applyResult(homeId, awayId, goalsHome, goalsAway, meta?)
   - Regionals.getAnnualEvents(teamId, year?) // opcional para calendário futuro

   Observações:
   - “Estado” do clube é inferido por:
     team.state / team.uf / team.region
     senão fallback: usa um “Grupo” genérico.
   =======================================================*/

(function () {
  console.log("%c[Regionals] regionals.js carregado", "color:#a78bfa; font-weight:bold;");

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

    if (!gs.regionals || typeof gs.regionals !== "object") gs.regionals = {};
    const rg = gs.regionals;
    if (rg.year == null) rg.year = gs.seasonYear;
    if (!rg.stateByTeam || typeof rg.stateByTeam !== "object") rg.stateByTeam = {};
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
    try { if (window.News && typeof News.pushNews === "function") News.pushNews(title, body, "REGIONAL"); } catch (e) {}
  }

  // -----------------------------
  // Inferir “estado/UF” do time
  // -----------------------------
  function inferUF(team) {
    if (!team) return "BR";
    const uf = team.uf || team.state || team.estado || team.region || team.regiao;
    if (!uf) return "BR";
    return String(uf).toUpperCase().slice(0, 3);
  }

  // -----------------------------
  // Standings
  // -----------------------------
  function makeRow(team) {
    return {
      id: team.id,
      name: team.name,
      pld: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0
    };
  }

  function sortStandings(standings) {
    standings.forEach(r => { r.gd = n(r.gf, 0) - n(r.ga, 0); });
    standings.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return String(a.name).localeCompare(String(b.name));
    });
    return standings;
  }

  function applyResultToStandings(standings, homeId, awayId, gh, ga) {
    const h = standings.find(r => String(r.id) === String(homeId));
    const a = standings.find(r => String(r.id) === String(awayId));
    if (!h || !a) return;

    h.pld += 1; a.pld += 1;
    h.gf += gh; h.ga += ga;
    a.gf += ga; a.ga += gh;

    if (gh > ga) { h.w += 1; a.l += 1; h.pts += 3; }
    else if (gh < ga) { a.w += 1; h.l += 1; a.pts += 3; }
    else { h.d += 1; a.d += 1; h.pts += 1; a.pts += 1; }

    sortStandings(standings);
  }

  // -----------------------------
  // Fixtures (12 rodadas)
  // -----------------------------
  function generateFixtures(teamIds, year) {
    const rounds = 12;
    const fixtures = {};
    const pairCount = {};

    const keyPair = (a, b) => {
      const x = String(a), y = String(b);
      return x < y ? `${x}_${y}` : `${y}_${x}`;
    };

    // datas Jan–Mar (sábado alternado)
    function dateForRound(r) {
      const month = (r <= 4) ? 1 : (r <= 8) ? 2 : 3;
      const day = clamp(6 + ((r - 1) * 2) % 22, 1, 28);
      return iso(year, month, day);
    }

    for (let r = 1; r <= rounds; r++) {
      const remaining = teamIds.slice();

      // shuffle leve
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }

      const matches = [];

      while (remaining.length >= 2) {
        const a = remaining.shift();
        let bestIdx = 0;
        let bestScore = 999;

        for (let i = 0; i < remaining.length; i++) {
          const b = remaining[i];
          const k = keyPair(a, b);
          const sc = pairCount[k] || 0;
          if (sc < bestScore) {
            bestScore = sc;
            bestIdx = i;
          }
        }

        const b = remaining.splice(bestIdx, 1)[0];
        const k = keyPair(a, b);
        pairCount[k] = (pairCount[k] || 0) + 1;

        // mando alternado simples
        const homeId = (r % 2 === 1) ? a : b;
        const awayId = (r % 2 === 1) ? b : a;

        matches.push({
          date: dateForRound(r),
          comp: "REGIONAL",
          competitionName: "Estadual",
          roundNumber: r,
          homeId,
          awayId,
          played: false,
          goalsHome: null,
          goalsAway: null
        });
      }

      fixtures[r] = matches;
    }

    return fixtures;
  }

  function simulateScore() {
    const gh = Math.max(0, Math.round((rnd() + rnd()) * 0.85));
    const ga = Math.max(0, Math.round((rnd() + rnd()) * 0.70));
    if (rnd() < 0.06) return { gh: gh + Math.floor(rnd() * 3), ga };
    if (rnd() < 0.05) return { gh, ga: ga + Math.floor(rnd() * 3) };
    return { gh, ga };
  }

  // -----------------------------
  // Estado do time no Estadual
  // -----------------------------
  function ensureRegionalState(teamId, year) {
    const gs = ensureGS();
    const rg = gs.regionals;
    const tid = String(teamId);

    if (!rg.stateByTeam[tid] || rg.stateByTeam[tid].year !== year) {
      const team = getTeamById(teamId);
      const uf = inferUF(team);

      // seleciona participantes: tenta pegar times com mesma UF
      const teams = getTeams();
      let participants = teams.filter(t => inferUF(t) === uf);

      // fallback: se UF não encontrar suficiente, pega alguns da divisão do usuário
      if (participants.length < 8) {
        const div = String(team?.division || team?.serie || "A").toUpperCase();
        const sameDiv = teams.filter(t => String(t.division || t.serie || "A").toUpperCase() === div);
        participants = sameDiv.length ? sameDiv : teams.slice();
      }

      // garante que o usuário está incluído
      if (!participants.find(t => String(t.id) === tid)) participants.unshift(team || { id: tid, name: tid });

      // limita para performance e consistência (12 clubes)
      participants = participants.slice(0, 12);

      const standings = participants.map(makeRow);
      const fixture = generateFixtures(participants.map(t => t.id), year);

      rg.stateByTeam[tid] = {
        year,
        uf,
        round: 1,
        championId: null,
        standings,
        fixtures: fixture
      };
    }

    return rg.stateByTeam[tid];
  }

  function getStatus(teamId) {
    const gs = ensureGS();
    const year = n(gs.regionals.year, gs.seasonYear);
    const tid = String(teamId);
    const st = ensureRegionalState(tid, year);

    if (st.championId) {
      return {
        active: false,
        finished: true,
        championId: st.championId,
        championName: getTeamById(st.championId)?.name || String(st.championId),
        uf: st.uf
      };
    }

    return {
      active: true,
      finished: false,
      round: n(st.round, 1),
      uf: st.uf
    };
  }

  function getNextFixture(teamId) {
    const gs = ensureGS();
    const year = n(gs.regionals.year, gs.seasonYear);
    const tid = String(teamId);

    const st = ensureRegionalState(tid, year);
    if (st.championId) return null;

    const round = clamp(n(st.round, 1), 1, 12);
    const arr = st.fixtures[String(round)] || st.fixtures[round] || [];
    const fx = arr.find(m => String(m.homeId) === tid || String(m.awayId) === tid) || null;
    return fx ? Object.assign({}, fx) : null;
  }

  function consumeNextFixture(teamId) {
    return getNextFixture(teamId);
  }

  function applyResult(homeId, awayId, goalsHome, goalsAway, meta) {
    const gs = ensureGS();
    const year = n(gs.regionals.year, gs.seasonYear);

    const tid = String(meta?.teamId || getUserTeamId() || "");
    if (!tid) return { ok: false, msg: "Sem time para processar." };

    const st = ensureRegionalState(tid, year);
    if (st.championId) return { ok: false, msg: "Estadual já finalizado." };

    const round = clamp(n(st.round, 1), 1, 12);
    const fixturesRound = st.fixtures[String(round)] || st.fixtures[round] || [];

    // marca jogo do usuário
    let found = false;
    for (const m of fixturesRound) {
      const same =
        (String(m.homeId) === String(homeId) && String(m.awayId) === String(awayId)) ||
        (String(m.homeId) === String(awayId) && String(m.awayId) === String(homeId));

      if (!same) continue;

      // respeita mando do fixture
      let gh = n(goalsHome, 0);
      let ga = n(goalsAway, 0);
      if (String(m.homeId) !== String(homeId)) {
        const tmp = gh; gh = ga; ga = tmp;
      }

      m.played = true;
      m.goalsHome = gh;
      m.goalsAway = ga;

      applyResultToStandings(st.standings, m.homeId, m.awayId, gh, ga);
      found = true;
      break;
    }

    // se não achou, aplica mesmo assim (tolerante)
    if (!found) {
      applyResultToStandings(st.standings, homeId, awayId, n(goalsHome, 0), n(goalsAway, 0));
    }

    // simula os demais
    const results = [];
    for (const m of fixturesRound) {
      if (m.played) {
        results.push({ homeId: m.homeId, awayId: m.awayId, golsHome: n(m.goalsHome, 0), golsAway: n(m.goalsAway, 0) });
        continue;
      }
      const s = simulateScore();
      m.played = true;
      m.goalsHome = s.gh;
      m.goalsAway = s.ga;

      applyResultToStandings(st.standings, m.homeId, m.awayId, s.gh, s.ga);
      results.push({ homeId: m.homeId, awayId: m.awayId, golsHome: s.gh, golsAway: s.ga });
    }

    // avança rodada
    st.round = round + 1;

    // terminou?
    if (round >= 12) {
      // campeão = 1º da tabela
      const champ = sortStandings(st.standings)[0];
      st.championId = champ?.id || null;
      const champName = champ?.name || "—";
      news("Campeão Estadual!", `Você concluiu o Estadual (${st.uf}). Campeão: ${champName}.`);
    } else {
      news("Estadual", `Rodada ${round} concluída no Estadual (${st.uf}).`);
    }

    save();
    return { ok: true, roundResults: results, round, finished: !!st.championId, championId: st.championId || null };
  }

  function applyUserMatchResult(reportOrArgs) {
    const tid = String(reportOrArgs?.teamId || getUserTeamId() || "");
    if (!tid) return { ok: false, msg: "Time do usuário não encontrado." };

    const homeId = reportOrArgs?.homeId;
    const awayId = reportOrArgs?.awayId;
    const gh = reportOrArgs?.goalsHome ?? reportOrArgs?.gh;
    const ga = reportOrArgs?.goalsAway ?? reportOrArgs?.ga;

    if (homeId == null || awayId == null) return { ok: false, msg: "Dados de partida insuficientes." };
    return applyResult(homeId, awayId, gh, ga, { teamId: tid });
  }

  function getStandings(teamId) {
    const gs = ensureGS();
    const year = n(gs.regionals.year, gs.seasonYear);
    const tid = String(teamId || getUserTeamId() || "");
    if (!tid) return [];

    const st = ensureRegionalState(tid, year);
    return sortStandings(st.standings).map(r => Object.assign({}, r));
  }

  function getCurrentRound(teamId) {
    const gs = ensureGS();
    const year = n(gs.regionals.year, gs.seasonYear);
    const tid = String(teamId || getUserTeamId() || "");
    if (!tid) return 1;

    const st = ensureRegionalState(tid, year);
    return clamp(n(st.round, 1), 1, 12);
  }

  function getAnnualEvents(teamId, year) {
    const gs = ensureGS();
    const y = n(year, gs.seasonYear);
    const tid = String(teamId || getUserTeamId() || "");
    if (!tid) return [];

    gs.regionals.year = y;
    const st = ensureRegionalState(tid, y);

    const events = [];
    for (let r = 1; r <= 12; r++) {
      const arr = st.fixtures[String(r)] || st.fixtures[r] || [];
      const fx = arr.find(m => String(m.homeId) === tid || String(m.awayId) === tid) || null;
      if (!fx) continue;
      events.push({
        date: fx.date,
        comp: "REGIONAL",
        competitionName: "Estadual",
        homeId: fx.homeId,
        awayId: fx.awayId,
        roundNumber: r,
        uf: st.uf
      });
    }

    events.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return events;
  }

  function resetSeason(year) {
    const gs = ensureGS();
    const y = n(year, gs.seasonYear);
    gs.regionals = { year: y, stateByTeam: {} };
    save();
    return true;
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.Regionals = {
    ensure(force) {
      const gs = ensureGS();
      const tid = getUserTeamId();
      if (!tid) return;

      gs.regionals.year = n(gs.seasonYear, 2026);
      ensureRegionalState(tid, gs.regionals.year);

      if (force) {
        // força regen: reseta só do usuário
        const y = gs.regionals.year;
        gs.regionals.stateByTeam[String(tid)] = null;
        ensureRegionalState(tid, y);
      }
    },

    resetSeason,

    getStatus(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return { active: false, finished: false };
      return getStatus(tid);
    },

    getStandings(teamId) {
      return getStandings(teamId);
    },

    getCurrentRound(teamId) {
      return getCurrentRound(teamId);
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

    getAnnualEvents(teamId, year) {
      return getAnnualEvents(teamId, year);
    }
  };
})();