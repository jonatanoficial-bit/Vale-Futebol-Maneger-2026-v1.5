/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/league.js — Série A/B (Tabela + Rodadas) AAA
   -------------------------------------------------------
   IMPORTANTE:
   - Este engine atualiza APENAS jogos de LIGA (LEAGUE).
   - Se o Match chamar processarRodadaComJogoDoUsuario()
     durante COPA/ESTADUAL, este arquivo detecta o contexto
     e NÃO mexe na tabela.

   Compatibilidade (usos no projeto):
   - League.startNewCareer()
   - League.saveGameState()
   - League.getCurrentRound()
   - League.getCurrentTeam()
   - League.getStandingsForCurrentDivision()
   - League.prepararProximoJogo()
   - League.playNextRoundForUserTeam()
   - League.processarRodadaComJogoDoUsuario(homeId, awayId, golsHome, golsAway)

   Estruturas em gameState.league:
   {
     standings: { A:[...], B:[...] },
     round: { A:1, B:1 },
     fixtures: { A:{1:[matches...] ...}, B:{...} }
   }

   Match format:
   { homeId, awayId, played:false, goalsHome:0, goalsAway:0, date:null, roundNumber, division }
   =======================================================*/

(function () {
  console.log("%c[League] league.js (AAA) carregado", "color:#22c55e; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.league || typeof gs.league !== "object") gs.league = {};
    const lg = gs.league;
    if (!lg.standings || typeof lg.standings !== "object") lg.standings = { A: [], B: [] };
    if (!lg.round || typeof lg.round !== "object") lg.round = { A: 1, B: 1 };
    if (!lg.fixtures || typeof lg.fixtures !== "object") lg.fixtures = { A: {}, B: {} };
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

  function getDivision(teamId) {
    const t = getTeamById(teamId);
    return String(t?.division || t?.serie || "A").toUpperCase();
  }

  function ensureStandingsForDiv(div) {
    const gs = ensureGS();
    const lg = gs.league;

    const teams = getTeams().filter(t => String(t.division || t.serie || "A").toUpperCase() === div);
    if (!teams.length) return;

    if (!Array.isArray(lg.standings[div]) || lg.standings[div].length !== teams.length) {
      lg.standings[div] = teams.map(t => ({
        id: t.id,
        name: t.name,
        pld: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0
      }));
    }
  }

  function sortStandings(div) {
    const gs = ensureGS();
    const st = gs.league.standings[div] || [];
    st.forEach(r => { r.gd = n(r.gf, 0) - n(r.ga, 0); });

    st.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return String(a.name).localeCompare(String(b.name));
    });
    return st;
  }

  // -----------------------------
  // Fixtures (rodadas)
  // - Gerador simples e leve (não é round-robin perfeito, mas estável)
  // - Cada rodada tenta formar pares sem repetir demais
  // -----------------------------
  function ensureFixtures(div) {
    const gs = ensureGS();
    const lg = gs.league;

    ensureStandingsForDiv(div);

    const st = lg.standings[div] || [];
    const teamIds = st.map(r => r.id);

    if (!lg.fixtures[div]) lg.fixtures[div] = {};
    if (!lg.round[div]) lg.round[div] = 1;

    // gera até 38 rodadas (Série A/B)
    const roundsTarget = 38;
    const existing = lg.fixtures[div];

    // contagem de confrontos para evitar repetição excessiva
    const pairCount = {};
    function pairKey(a, b) {
      const x = String(a), y = String(b);
      return x < y ? `${x}_${y}` : `${y}_${x}`;
    }

    // se já tem fixtures, alimentar pairCount
    Object.keys(existing).forEach(rk => {
      const arr = existing[rk];
      if (Array.isArray(arr)) {
        arr.forEach(m => {
          const k = pairKey(m.homeId, m.awayId);
          pairCount[k] = (pairCount[k] || 0) + 1;
        });
      }
    });

    for (let r = 1; r <= roundsTarget; r++) {
      if (Array.isArray(existing[r]) && existing[r].length) continue;

      const remaining = teamIds.slice();
      // embaralha levemente
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }

      const matches = [];

      while (remaining.length >= 2) {
        const home = remaining.shift();
        // escolhe oponente com menor repetição
        let bestIdx = 0;
        let bestScore = 999;

        for (let i = 0; i < remaining.length; i++) {
          const away = remaining[i];
          const k = pairKey(home, away);
          const score = pairCount[k] || 0;
          if (score < bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        }

        const away = remaining.splice(bestIdx, 1)[0];
        const k = pairKey(home, away);
        pairCount[k] = (pairCount[k] || 0) + 1;

        matches.push({
          homeId: home,
          awayId: away,
          played: false,
          goalsHome: 0,
          goalsAway: 0,
          date: null,
          roundNumber: r,
          division: div
        });
      }

      existing[r] = matches;
    }
  }

  // -----------------------------
  // Resultado simulado (IA)
  // -----------------------------
  function simulateScore() {
    // placar simples e estável
    const baseHome = 0.85;
    const baseAway = 0.65;

    const gh = Math.max(0, Math.round((rnd() + rnd()) * baseHome));
    const ga = Math.max(0, Math.round((rnd() + rnd()) * baseAway));

    // chance pequena de goleada
    if (rnd() < 0.06) return { gh: gh + Math.floor(rnd() * 3), ga };
    if (rnd() < 0.05) return { gh, ga: ga + Math.floor(rnd() * 3) };
    return { gh, ga };
  }

  // -----------------------------
  // Aplicar resultado na tabela
  // -----------------------------
  function applyResultToStandings(div, homeId, awayId, gh, ga) {
    const gs = ensureGS();
    ensureStandingsForDiv(div);

    const st = gs.league.standings[div] || [];
    const h = st.find(r => String(r.id) === String(homeId));
    const a = st.find(r => String(r.id) === String(awayId));
    if (!h || !a) return;

    h.pld += 1; a.pld += 1;
    h.gf += gh; h.ga += ga;
    a.gf += ga; a.ga += gh;

    if (gh > ga) { h.w += 1; a.l += 1; h.pts += 3; }
    else if (gh < ga) { a.w += 1; h.l += 1; a.pts += 3; }
    else { h.d += 1; a.d += 1; h.pts += 1; a.pts += 1; }

    sortStandings(div);
  }

  // -----------------------------
  // Filtro de contexto: só LEAGUE atualiza
  // -----------------------------
  function isLeagueContext() {
    const ctx = window.currentMatchContext || {};
    const comp = String(ctx.competition || ctx.comp || ctx.type || "").toUpperCase();
    if (!comp) return true; // se não tiver contexto, assume liga (compat)
    return comp === "LEAGUE";
  }

  // -----------------------------
  // Preparar próximo jogo (fallback quando Calendar não existir)
  // -----------------------------
  function prepararProximoJogo() {
    const teamId = getUserTeamId();
    if (!teamId) return null;

    const div = getDivision(teamId);
    ensureFixtures(div);

    const gs = ensureGS();
    const lg = gs.league;
    const round = n(lg.round[div], 1);
    const fixturesRound = lg.fixtures[div][round] || [];

    const m = fixturesRound.find(x => String(x.homeId) === String(teamId) || String(x.awayId) === String(teamId)) || null;
    if (!m) return null;

    return {
      homeId: m.homeId,
      awayId: m.awayId,
      roundNumber: m.roundNumber,
      division: div,
      competitionName: `Campeonato Brasileiro Série ${div}`,
      date: m.date || null
    };
  }

  // -----------------------------
  // Processar rodada quando o usuário joga (chamado pelo Match)
  // - se não for LEAGUE, retorna null e NÃO muda nada
  // -----------------------------
  function processarRodadaComJogoDoUsuario(homeId, awayId, golsHome, golsAway) {
    ensureGS();

    if (!isLeagueContext()) {
      // Jogo era Copa/Estadual: não mexer na tabela
      return null;
    }

    const div = getDivision(homeId);
    ensureFixtures(div);

    const gs = ensureGS();
    const lg = gs.league;
    const round = n(lg.round[div], 1);
    const fixturesRound = lg.fixtures[div][round] || [];

    // marca jogo do usuário
    let found = false;
    for (const m of fixturesRound) {
      const same = (String(m.homeId) === String(homeId) && String(m.awayId) === String(awayId)) ||
                   (String(m.homeId) === String(awayId) && String(m.awayId) === String(homeId));
      if (same) {
        // respeitar mando
        if (String(m.homeId) === String(homeId)) {
          m.goalsHome = n(golsHome, 0);
          m.goalsAway = n(golsAway, 0);
          applyResultToStandings(div, homeId, awayId, n(golsHome, 0), n(golsAway, 0));
        } else {
          // usuário passou invertido
          m.goalsHome = n(golsAway, 0);
          m.goalsAway = n(golsHome, 0);
          applyResultToStandings(div, m.homeId, m.awayId, m.goalsHome, m.goalsAway);
        }
        m.played = true;
        found = true;
        break;
      }
    }

    // se não encontrou (caso calendário gerou match fora das fixtures),
    // ainda assim aplicar o resultado na tabela
    if (!found) {
      applyResultToStandings(div, homeId, awayId, n(golsHome, 0), n(golsAway, 0));
    }

    // simula outros jogos da rodada
    const roundResults = [];
    for (const m of fixturesRound) {
      if (m.played) {
        roundResults.push({ homeId: m.homeId, awayId: m.awayId, golsHome: n(m.goalsHome, 0), golsAway: n(m.goalsAway, 0) });
        continue;
      }
      const s = simulateScore();
      m.goalsHome = s.gh;
      m.goalsAway = s.ga;
      m.played = true;

      applyResultToStandings(div, m.homeId, m.awayId, s.gh, s.ga);
      roundResults.push({ homeId: m.homeId, awayId: m.awayId, golsHome: s.gh, golsAway: s.ga });
    }

    // avança rodada
    lg.round[div] = round + 1;

    // salva
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}

    return roundResults;
  }

  // -----------------------------
  // Jogar próxima rodada automaticamente (simulação)
  // -----------------------------
  function playNextRoundForUserTeam() {
    const teamId = getUserTeamId();
    if (!teamId) return null;

    const div = getDivision(teamId);
    ensureFixtures(div);

    const gs = ensureGS();
    const lg = gs.league;
    const round = n(lg.round[div], 1);
    const fixturesRound = lg.fixtures[div][round] || [];
    if (!fixturesRound.length) return null;

    // simula todos
    const results = [];
    for (const m of fixturesRound) {
      if (m.played) continue;
      const s = simulateScore();
      m.goalsHome = s.gh;
      m.goalsAway = s.ga;
      m.played = true;
      applyResultToStandings(div, m.homeId, m.awayId, s.gh, s.ga);
      results.push({ homeId: m.homeId, awayId: m.awayId, golsHome: s.gh, golsAway: s.ga });
    }

    lg.round[div] = round + 1;
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
    return results;
  }

  // -----------------------------
  // Standings atuais
  // -----------------------------
  function getStandingsForCurrentDivision() {
    const teamId = getUserTeamId();
    if (!teamId) return [];
    const div = getDivision(teamId);
    ensureStandingsForDiv(div);
    ensureFixtures(div);
    return sortStandings(div).map(x => Object.assign({}, x));
  }

  function getCurrentRound() {
    const teamId = getUserTeamId();
    if (!teamId) return 1;
    const gs = ensureGS();
    const div = getDivision(teamId);
    ensureFixtures(div);
    return n(gs.league.round[div], 1);
  }

  function getCurrentTeam() {
    const teamId = getUserTeamId();
    if (!teamId) return null;
    return getTeamById(teamId);
  }

  // -----------------------------
  // Carreira
  // -----------------------------
  function startNewCareer(teamId) {
    const gs = ensureGS();
    if (teamId) {
      gs.selectedTeamId = teamId;
      gs.currentTeamId = teamId;
      if (window.Game) Game.teamId = teamId;
    }

    // reset liga
    gs.league = { standings: { A: [], B: [] }, round: { A: 1, B: 1 }, fixtures: { A: {}, B: {} } };

    // cria standings e fixtures para A e B (se existirem)
    ensureStandingsForDiv("A");
    ensureStandingsForDiv("B");
    ensureFixtures("A");
    ensureFixtures("B");

    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
    return true;
  }

  function saveGameState() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); return true; } catch (e) {}
    return false;
  }

  // ----------------------------------------------------
  // API pública
  // ----------------------------------------------------
  window.League = {
    // compat / util
    ensureFixtures,

    // interface usada no projeto
    getCurrentRound,
    getCurrentTeam,
    getStandingsForCurrentDivision,
    playNextRoundForUserTeam,
    startNewCareer,
    saveGameState,

    // integração Match
    prepararProximoJogo,
    processarRodadaComJogoDoUsuario
  };
})();