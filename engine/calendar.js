/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/calendar.js — Calendário AAA (Estaduais + Série + Copa)
   -------------------------------------------------------
   Objetivo:
   - Gerar calendário anual estável e “realista”:
     • Estaduais: Jan–Mar (12 rodadas modelo)
     • Copa do Brasil: Fev–Set (8 datas modelo)
     • Série A/B: Abr–Dez (38 rodadas modelo)
   - Criar eventos com o formato que a UI entende:
     { date:"YYYY-MM-DD", comp:"LEAGUE|CUP|REGIONAL|FRIENDLY",
       competitionName:"...", homeId, awayId, roundNumber, division }
   - Expor APIs para UI e fluxo:
     • Calendar.ensure()
     • Calendar.getAnnualEvents(teamId)
     • Calendar.getEvents(teamId)           (alias)
     • Calendar.getNextEvent(teamId)
     • Calendar.consumeNextEvent(teamId)   (avança para o próximo jogo)
     • Calendar.resetSeason(teamId)
     • Calendar.setSeasonYear(year)

   Notas:
   - Sem depender de League/Cup/Regionals (mas integra se existirem).
   - Guardado em gameState.calendar:
     { year, events, pointerByTeam: { [teamId]: index } }
   =======================================================*/

(function () {
  console.log("%c[Calendar] calendar.js carregado", "color:#10b981; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  function pad2(x) { return String(x).padStart(2, "0"); }
  function iso(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;

    if (!gs.calendar || typeof gs.calendar !== "object") gs.calendar = {};
    if (!gs.calendar.pointerByTeam || typeof gs.calendar.pointerByTeam !== "object") gs.calendar.pointerByTeam = {};
    if (!Array.isArray(gs.calendar.events)) gs.calendar.events = [];
    if (!gs.calendar.year) gs.calendar.year = gs.seasonYear;

    return gs;
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }

  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getTeamDivision(teamId) {
    const t = getTeamById(teamId);
    return String(t?.division || t?.serie || "A").toUpperCase();
  }

  function sortEvents(arr) {
    arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return arr;
  }

  function normalizeEvent(e) {
    const date = String(e.date || e.data || "").slice(0, 10);
    const compRaw = String(e.comp || e.type || e.competition || "LEAGUE").toUpperCase();
    let comp = "LEAGUE";
    if (compRaw.includes("CUP") || compRaw.includes("COPA")) comp = "CUP";
    else if (compRaw.includes("REG") || compRaw.includes("ESTAD")) comp = "REGIONAL";
    else if (compRaw.includes("FRIEND") || compRaw.includes("AMIST")) comp = "FRIENDLY";

    return {
      date,
      comp,
      competitionName: e.competitionName || e.nomeCompeticao || (comp === "LEAGUE" ? "Campeonato Brasileiro" : comp === "CUP" ? "Copa do Brasil" : comp === "REGIONAL" ? "Estadual" : "Amistoso"),
      homeId: e.homeId || e.home || e.casa || null,
      awayId: e.awayId || e.away || e.fora || null,
      roundNumber: e.roundNumber || e.round || e.rodada || null,
      division: e.division || e.serie || null
    };
  }

  // -----------------------------
  // Gerador de calendário
  // -----------------------------
  function generateForTeam(teamId, year) {
    const div = getTeamDivision(teamId);
    const teams = getTeams();

    // oponentes por divisão (liga)
    const sameDiv = teams.filter(t => String(t.id) !== String(teamId) && String(t.division || t.serie || "A").toUpperCase() === div);
    const allOpp = sameDiv.length ? sameDiv : teams.filter(t => String(t.id) !== String(teamId));

    // helpers para rodadas: escolhe oponente variando (sem repetir demais)
    const usedCount = {};
    function pickOpponent() {
      const candidates = allOpp.slice().sort((a, b) => (usedCount[a.id] || 0) - (usedCount[b.id] || 0));
      const top = candidates.slice(0, Math.min(8, candidates.length));
      const o = pick(top);
      usedCount[o.id] = (usedCount[o.id] || 0) + 1;
      return o;
    }

    const events = [];

    // -------------------------
    // Estaduais (Jan–Mar) — 12 rodadas
    // Datas: sábados alternados
    // -------------------------
    for (let r = 1; r <= 12; r++) {
      const month = (r <= 4) ? 1 : (r <= 8) ? 2 : 3;
      const day = clamp(6 + ((r - 1) * 2) % 22, 1, 28); // 6,8,10...
      const opp = pickOpponent();
      const home = (r % 2 === 1) ? teamId : opp.id;
      const away = (r % 2 === 1) ? opp.id : teamId;

      events.push({
        date: iso(year, month, day),
        comp: "REGIONAL",
        competitionName: "Estadual",
        homeId: home,
        awayId: away,
        roundNumber: r,
        division: div
      });
    }

    // -------------------------
    // Copa do Brasil (Fev–Set) — 8 datas (fases)
    // Modelo: 2ª quinzena do mês
    // -------------------------
    const cupSlots = [
      { m: 2, d: 20 }, { m: 3, d: 20 },
      { m: 5, d: 18 }, { m: 5, d: 28 },
      { m: 7, d: 17 }, { m: 7, d: 27 },
      { m: 9, d: 10 }, { m: 9, d: 24 }
    ];

    for (let i = 0; i < cupSlots.length; i++) {
      const opp = pickOpponent();
      const home = (i % 2 === 0) ? teamId : opp.id;
      const away = (i % 2 === 0) ? opp.id : teamId;

      events.push({
        date: iso(year, cupSlots[i].m, cupSlots[i].d),
        comp: "CUP",
        competitionName: "Copa do Brasil",
        homeId: home,
        awayId: away,
        roundNumber: i + 1,
        division: div
      });
    }

    // -------------------------
    // Série A/B (Abr–Dez) — 38 rodadas
    // Datas: domingos (dia ajustado)
    // -------------------------
    for (let r = 1; r <= 38; r++) {
      // 6 rodadas por mês aprox de abril (4) a novembro (11), final em dezembro
      const month = clamp(4 + Math.floor((r - 1) / 6), 4, 12);
      const day = clamp(2 + ((r - 1) * 2) % 26, 1, 28);
      const opp = pickOpponent();

      // alterna mando com padrão estável
      const home = (r % 2 === 0) ? teamId : opp.id;
      const away = (r % 2 === 0) ? opp.id : teamId;

      events.push({
        date: iso(year, month, day),
        comp: "LEAGUE",
        competitionName: `Campeonato Brasileiro Série ${div}`,
        homeId: home,
        awayId: away,
        roundNumber: r,
        division: div
      });
    }

    return sortEvents(events);
  }

  function rebuildCalendarIfNeeded(force) {
    const gs = ensureGS();
    const teamId = getUserTeamId();
    if (!teamId) return;

    const year = n(gs.seasonYear, 2026);

    const needs = force || !Array.isArray(gs.calendar.events) || !gs.calendar.events.length || gs.calendar.year !== year;

    if (needs) {
      gs.calendar.year = year;

      // gera calendário apenas do time do usuário (leve e rápido)
      const events = generateForTeam(teamId, year);
      gs.calendar.events = events;

      // pointer
      if (gs.calendar.pointerByTeam[String(teamId)] == null) gs.calendar.pointerByTeam[String(teamId)] = 0;
    }
  }

  function getEventsForTeam(teamId) {
    const gs = ensureGS();
    rebuildCalendarIfNeeded(false);

    const tid = String(teamId);
    const all = Array.isArray(gs.calendar.events) ? gs.calendar.events : [];

    // filtra jogos onde o time participa
    const filtered = all.filter(e => String(e.homeId) === tid || String(e.awayId) === tid);
    return sortEvents(filtered.map(normalizeEvent));
  }

  function getNextEvent(teamId) {
    const gs = ensureGS();
    rebuildCalendarIfNeeded(false);

    const tid = String(teamId);
    const list = getEventsForTeam(tid);

    const idx = n(gs.calendar.pointerByTeam[tid], 0);
    if (!list.length) return null;

    return list[clamp(idx, 0, list.length - 1)] || null;
  }

  function consumeNextEvent(teamId) {
    const gs = ensureGS();
    const tid = String(teamId);
    const list = getEventsForTeam(tid);

    if (!list.length) return null;

    let idx = n(gs.calendar.pointerByTeam[tid], 0);
    idx = clamp(idx, 0, list.length);

    const next = list[idx] || null;

    // avança ponteiro
    if (idx < list.length) gs.calendar.pointerByTeam[tid] = idx + 1;

    return next;
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.Calendar = {
    ensure(force) {
      ensureGS();
      rebuildCalendarIfNeeded(!!force);
    },

    setSeasonYear(year) {
      const gs = ensureGS();
      gs.seasonYear = n(year, 2026);
      this.ensure(true);
      return gs.seasonYear;
    },

    resetSeason(teamId) {
      const gs = ensureGS();
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return false;
      gs.calendar.pointerByTeam[tid] = 0;
      this.ensure(true);
      return true;
    },

    // UI usa isso
    getAnnualEvents(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return [];
      return getEventsForTeam(tid);
    },

    getEvents(teamId) {
      return this.getAnnualEvents(teamId);
    },

    getNextEvent(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return null;
      return getNextEvent(tid);
    },

    consumeNextEvent(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return null;
      return consumeNextEvent(tid);
    }
  };
})();