/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/season-calendar.js — Calendário anual AAA (Brasil)
   -------------------------------------------------------
   Objetivo:
   - Montar um "macro calendário" do ano (Jan–Dez) com blocos
     de competições: Estaduais, Série A/B e Copa do Brasil.
   - Determinar estadual principal do clube do usuário (por UF/estado),
     com fallback automático.
   - Integrar de forma segura com Calendar existente:
     • SeasonCalendar.getNextMatches() tenta usar Calendar.getJogosDoUsuario / getAllGames / etc.
   - Suportar avanço de semana:
     • chama Training.applyWeek()
     • tenta Calendar.advanceDays(7) / Calendar.avancarDias(7) / Calendar.simularSemana()

   Persistência:
   gameState.seasonCalendar = {
     year,
     currentDateISO,
     userStateKey,
     macroEvents: [...],
     lastBuildISO
   }

   API:
   - SeasonCalendar.ensure()
   - SeasonCalendar.rebuild(force)
   - SeasonCalendar.getMacroEvents()
   - SeasonCalendar.getNextMatches(limit)
   - SeasonCalendar.advanceWeek()

   =======================================================*/

(function () {
  console.log("%c[SeasonCalendar] season-calendar.js carregado", "color:#60a5fa; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function nowISO() { return new Date().toISOString(); }
  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;

    if (!gs.seasonCalendar || typeof gs.seasonCalendar !== "object") gs.seasonCalendar = {};
    const sc = gs.seasonCalendar;

    sc.year = n(sc.year, gs.seasonYear);
    if (!sc.currentDateISO) sc.currentDateISO = new Date(sc.year, 0, 10).toISOString(); // 10 Jan
    if (!Array.isArray(sc.macroEvents)) sc.macroEvents = [];
    if (!sc.lastBuildISO) sc.lastBuildISO = null;
    if (!sc.userStateKey) sc.userStateKey = null;

    return gs;
  }

  function save() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
    try { if (typeof salvarJogo === "function") salvarJogo(); } catch (e) {}
    try { localStorage.setItem("vfm-save", JSON.stringify(window.gameState)); } catch (e) {}
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }

  function teamDivision(team) {
    const div = String(team?.division || team?.serie || "A").toUpperCase();
    return div === "B" ? "B" : "A";
  }

  function teamStateKey(team) {
    // tenta campos comuns
    const raw =
      team?.uf ||
      team?.UF ||
      team?.estado ||
      team?.state ||
      team?.stateKey ||
      team?.region ||
      team?.sigla ||
      null;

    if (raw) return String(raw).trim().toUpperCase();

    // fallback por cidade/estado no nome (fraco, mas ajuda)
    const nm = String(team?.name || "").toUpperCase();
    if (nm.includes("SP") || nm.includes("SÃO PAULO") || nm.includes("SAO PAULO")) return "SP";
    if (nm.includes("RJ") || nm.includes("RIO")) return "RJ";
    if (nm.includes("MG") || nm.includes("MINAS")) return "MG";
    if (nm.includes("RS") || nm.includes("GRÊMIO") || nm.includes("GREMIO") || nm.includes("INTERNACIONAL")) return "RS";
    if (nm.includes("BA") || nm.includes("BAHIA") || nm.includes("VITÓRIA") || nm.includes("VITORIA")) return "BA";
    if (nm.includes("PR")) return "PR";
    if (nm.includes("SC")) return "SC";
    if (nm.includes("PE") || nm.includes("PERNAMBUCO")) return "PE";
    if (nm.includes("CE") || nm.includes("CEARÁ") || nm.includes("CEARA")) return "CE";
    if (nm.includes("GO") || nm.includes("GOIÁS") || nm.includes("GOIAS")) return "GO";
    if (nm.includes("PA")) return "PA";
    if (nm.includes("AM")) return "AM";
    return null;
  }

  // -----------------------------
  // Competitions: macros do Brasil
  // -----------------------------
  const STATE_CHAMPS = {
    "SP": { name: "Paulista", short: "Paulistão", months: [0, 1, 2, 3], priority: 1 },     // Jan-Apr
    "RJ": { name: "Carioca", short: "Cariocão", months: [0, 1, 2, 3], priority: 1 },
    "MG": { name: "Mineiro", short: "Mineiro", months: [0, 1, 2, 3], priority: 1 },
    "RS": { name: "Gaúcho", short: "Gauchão", months: [0, 1, 2, 3], priority: 1 },
    "BA": { name: "Baiano", short: "Baianão", months: [0, 1, 2, 3], priority: 1 },

    "PR": { name: "Paranaense", short: "Paranaense", months: [0, 1, 2, 3], priority: 2 },
    "SC": { name: "Catarinense", short: "Catarinense", months: [0, 1, 2, 3], priority: 2 },
    "PE": { name: "Pernambucano", short: "Pernambucano", months: [0, 1, 2, 3], priority: 2 },
    "CE": { name: "Cearense", short: "Cearense", months: [0, 1, 2, 3], priority: 2 },
    "GO": { name: "Goiano", short: "Goianão", months: [0, 1, 2, 3], priority: 2 },
    "PA": { name: "Paraense", short: "Parazão", months: [0, 1, 2, 3], priority: 3 },
    "AM": { name: "Amazonense", short: "Amazonense", months: [0, 1, 2, 3], priority: 3 }
  };

  function macroCalendarTemplate(year, userUF, userDiv) {
    // Datas aproximadas (macro) — visual AAA
    // - Estaduais: Jan–Abr
    // - Copa do Brasil: Fev–Nov
    // - Série A/B: Abr–Dez
    // Os "weeks" são blocos para UI
    const state = STATE_CHAMPS[userUF] || STATE_CHAMPS["SP"];

    const events = [];

    // Pré-temporada
    events.push({
      id: "PRESEASON",
      type: "PRE",
      name: "Pré-temporada",
      short: "Pré-temporada",
      startISO: new Date(year, 0, 2).toISOString(),
      endISO: new Date(year, 0, 18).toISOString(),
      importance: 0.6,
      colorKey: "BLUE"
    });

    // Estadual principal
    events.push({
      id: "STATE_MAIN",
      type: "STATE",
      name: `Campeonato ${state.name}`,
      short: state.short,
      startISO: new Date(year, 0, 20).toISOString(),
      endISO: new Date(year, 3, 10).toISOString(),
      importance: 0.9,
      colorKey: "AMBER",
      meta: { uf: userUF || "SP" }
    });

    // Copa do Brasil
    events.push({
      id: "CDB",
      type: "CUP",
      name: "Copa do Brasil",
      short: "Copa do Brasil",
      startISO: new Date(year, 1, 12).toISOString(),  // Fev
      endISO: new Date(year, 10, 20).toISOString(),   // Nov
      importance: 1.0,
      colorKey: "PINK",
      meta: { rounds: 8 }
    });

    // Série A/B
    const serieName = userDiv === "B" ? "Série B" : "Série A";
    events.push({
      id: "LEAGUE",
      type: "LEAGUE",
      name: `Campeonato Brasileiro — ${serieName}`,
      short: serieName,
      startISO: new Date(year, 3, 13).toISOString(),  // Abr
      endISO: new Date(year, 11, 8).toISOString(),    // Dez
      importance: 1.0,
      colorKey: "GREEN",
      meta: { division: userDiv || "A", rounds: userDiv === "B" ? 38 : 38 }
    });

    // Janelas (macro)
    events.push({
      id: "WINDOW_1",
      type: "WINDOW",
      name: "Janela de Transferências (Verão)",
      short: "Janela Verão",
      startISO: new Date(year, 0, 1).toISOString(),
      endISO: new Date(year, 3, 10).toISOString(),
      importance: 0.7,
      colorKey: "SLATE"
    });

    events.push({
      id: "WINDOW_2",
      type: "WINDOW",
      name: "Janela de Transferências (Meio do Ano)",
      short: "Janela Meio do Ano",
      startISO: new Date(year, 6, 1).toISOString(),
      endISO: new Date(year, 7, 25).toISOString(),
      importance: 0.7,
      colorKey: "SLATE"
    });

    return events;
  }

  // -----------------------------
  // Next matches integration
  // -----------------------------
  function parseISO(x) {
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }

  function normalizeMatch(m) {
    // aceita vários formatos
    const homeId = m.homeId ?? m.casaId ?? m.home ?? m.timeCasa ?? m.homeTeamId;
    const awayId = m.awayId ?? m.foraId ?? m.away ?? m.timeFora ?? m.awayTeamId;
    const dateISO =
      m.dateISO ?? m.iso ?? m.dataISO ?? m.date ?? m.data ??
      m.kickoffISO ?? m.startISO ??
      null;

    const comp = m.comp || m.competition || m.tournament || m.campeonato || m.nomeCampeonato || "Competição";
    const round = m.round ?? m.rodada ?? m.stage ?? m.fase ?? "";

    return {
      homeId,
      awayId,
      dateISO,
      comp,
      round
    };
  }

  function getNextMatches(limit = 8) {
    const teamId = getUserTeamId();
    if (!teamId) return [];

    // tenta APIs conhecidas
    let matches = [];

    try {
      if (window.Calendar) {
        if (typeof Calendar.getJogosDoUsuario === "function") {
          matches = Calendar.getJogosDoUsuario() || [];
        } else if (typeof Calendar.getAllGames === "function") {
          const all = Calendar.getAllGames() || [];
          matches = all.filter(g => String(g.homeId) === String(teamId) || String(g.awayId) === String(teamId));
        } else if (typeof Calendar.getSchedule === "function") {
          const all = Calendar.getSchedule() || [];
          matches = all.filter(g => String(g.homeId) === String(teamId) || String(g.awayId) === String(teamId));
        }
      }
    } catch (e) {}

    // se não tiver nada, tenta usar próximo jogo
    if ((!matches || matches.length === 0) && window.Calendar && typeof Calendar.getProximoJogoDoUsuario === "function") {
      try {
        const nxt = Calendar.getProximoJogoDoUsuario();
        if (nxt) matches = [nxt];
      } catch (e) {}
    }

    // normaliza e ordena
    const norm = (matches || []).map(normalizeMatch).filter(x => x.homeId != null && x.awayId != null);

    // se não tem datas, deixa na ordem atual
    const withDate = norm.filter(x => parseISO(x.dateISO));
    const noDate = norm.filter(x => !parseISO(x.dateISO));

    withDate.sort((a, b) => parseISO(a.dateISO) - parseISO(b.dateISO));

    const merged = withDate.concat(noDate);
    return merged.slice(0, clamp(n(limit, 8), 1, 30));
  }

  // -----------------------------
  // Advance week
  // -----------------------------
  function advanceWeek() {
    const gs = ensureGS();
    const sc = gs.seasonCalendar;
    const teamId = getUserTeamId();

    // 1) Training
    try {
      if (window.Training && typeof Training.applyWeek === "function") {
        Training.applyWeek(teamId);
      }
    } catch (e) {}

    // 2) Calendar (se existir)
    let advancedByCalendar = false;
    try {
      if (window.Calendar) {
        if (typeof Calendar.simularSemana === "function") {
          Calendar.simularSemana();
          advancedByCalendar = true;
        } else if (typeof Calendar.advanceDays === "function") {
          Calendar.advanceDays(7);
          advancedByCalendar = true;
        } else if (typeof Calendar.avancarDias === "function") {
          Calendar.avancarDias(7);
          advancedByCalendar = true;
        }
      }
    } catch (e) {}

    // 3) fallback date
    try {
      const d = new Date(sc.currentDateISO);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 7);
        sc.currentDateISO = d.toISOString();
      }
    } catch (e) {}

    save();
    return { ok: true, advancedByCalendar, newDateISO: sc.currentDateISO };
  }

  // -----------------------------
  // Build macro events
  // -----------------------------
  function rebuild(force = false) {
    const gs = ensureGS();
    const sc = gs.seasonCalendar;

    if (!force && sc.lastBuildISO && sc.macroEvents && sc.macroEvents.length) return;

    const teamId = getUserTeamId();
    const team = teamId ? getTeamById(teamId) : null;
    const uf = team ? teamStateKey(team) : null;
    const div = team ? teamDivision(team) : "A";

    sc.userStateKey = uf || "SP";
    sc.macroEvents = macroCalendarTemplate(sc.year, sc.userStateKey, div);
    sc.lastBuildISO = nowISO();

    save();
  }

  function ensure() {
    ensureGS();
    rebuild(false);

    // Hook suave: expor helper dentro do Calendar, sem quebrar nada
    try {
      if (window.Calendar && !Calendar.__seasonCalendarHooked) {
        Calendar.__seasonCalendarHooked = true;
        Calendar.getSeasonMacroEvents = function () {
          SeasonCalendar.ensure();
          return SeasonCalendar.getMacroEvents();
        };
        Calendar.advanceWeek = function () {
          return SeasonCalendar.advanceWeek();
        };
      }
    } catch (e) {}
  }

  function getMacroEvents() {
    const gs = ensureGS();
    rebuild(false);
    return deepClone(gs.seasonCalendar.macroEvents || []);
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.SeasonCalendar = {
    ensure,
    rebuild,
    getMacroEvents,
    getNextMatches,
    advanceWeek
  };

  // auto ensure
  setTimeout(() => {
    try { SeasonCalendar.ensure(); } catch (e) {}
  }, 120);
})();