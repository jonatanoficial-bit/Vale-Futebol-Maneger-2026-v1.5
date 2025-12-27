/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/calendar.js — Calendário AAA (Mesclado)
   -------------------------------------------------------
   Agora o calendário MESCLA automaticamente:
   - Estaduais (Regionals.getAnnualEvents)
   - Copa do Brasil (Cup.getAnnualEvents)
   - Série A/B (LEAGUE) gerado localmente (38 rodadas)

   APIs:
   - Calendar.ensure(force?)
   - Calendar.setSeasonYear(year)
   - Calendar.resetSeason(teamId?)
   - Calendar.getAnnualEvents(teamId)
   - Calendar.getEvents(teamId)              (alias)
   - Calendar.getNextEvent(teamId)
   - Calendar.consumeNextEvent(teamId)
   - Calendar.peekUpcoming(teamId, count?)   (útil para UI)
   - Calendar.rebuild(teamId)                (força rebuild)

   Persistência:
   gameState.calendar = {
     year,
     eventsByTeam: { [teamId]: [events...] },
     pointerByTeam: { [teamId]: index },
     metaByTeam: { [teamId]: { lastBuildAt, sources } }
   }

   Formato de Event:
   {
     date:"YYYY-MM-DD",
     comp:"LEAGUE|CUP|REGIONAL|FRIENDLY",
     competitionName:"...",
     homeId, awayId,
     roundNumber,
     division,
     phaseKey?, phaseName?, uf?
   }
   =======================================================*/

(function () {
  console.log("%c[Calendar] calendar.js (MESCLADO) carregado", "color:#10b981; font-weight:bold;");

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
    const cal = gs.calendar;

    if (!cal.year) cal.year = gs.seasonYear;
    if (!cal.eventsByTeam || typeof cal.eventsByTeam !== "object") cal.eventsByTeam = {};
    if (!cal.pointerByTeam || typeof cal.pointerByTeam !== "object") cal.pointerByTeam = {};
    if (!cal.metaByTeam || typeof cal.metaByTeam !== "object") cal.metaByTeam = {};

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

  function getTeamDivision(teamId) {
    const t = getTeamById(teamId);
    return String(t?.division || t?.serie || "A").toUpperCase();
  }

  function sortEvents(arr) {
    arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return arr;
  }

  function normalizeComp(compRaw) {
    const c = String(compRaw || "").toUpperCase();
    if (c.includes("CUP") || c.includes("COPA")) return "CUP";
    if (c.includes("REG") || c.includes("ESTAD")) return "REGIONAL";
    if (c.includes("FRIEND") || c.includes("AMIST")) return "FRIENDLY";
    return "LEAGUE";
  }

  function normalizeEvent(e, defaults) {
    const date = String(e.date || e.data || "").slice(0, 10);
    const comp = normalizeComp(e.comp || e.type || e.competition || defaults?.comp || "LEAGUE");

    return {
      date,
      comp,
      competitionName:
        e.competitionName ||
        e.nomeCompeticao ||
        e.title ||
        defaults?.competitionName ||
        (comp === "LEAGUE" ? "Campeonato Brasileiro" : comp === "CUP" ? "Copa do Brasil" : comp === "REGIONAL" ? "Estadual" : "Amistoso"),
      homeId: e.homeId || e.home || e.casa || defaults?.homeId || null,
      awayId: e.awayId || e.away || e.fora || defaults?.awayId || null,
      roundNumber: e.roundNumber || e.round || e.rodada || null,
      division: e.division || e.serie || defaults?.division || null,
      phaseKey: e.phaseKey || null,
      phaseName: e.phaseName || null,
      uf: e.uf || null
    };
  }

  function eventKey(ev) {
    // chave para deduplicar
    return [
      ev.date,
      ev.comp,
      String(ev.homeId || ""),
      String(ev.awayId || ""),
      String(ev.roundNumber || ""),
      String(ev.phaseKey || "")
    ].join("|");
  }

  // -----------------------------
  // Gerador LEAGUE (38 rodadas)
  // -----------------------------
  function generateLeagueEvents(teamId, year) {
    const div = getTeamDivision(teamId);
    const teams = getTeams();

    const sameDiv = teams.filter(t => String(t.id) !== String(teamId) && String(t.division || t.serie || "A").toUpperCase() === div);
    const allOpp = sameDiv.length ? sameDiv : teams.filter(t => String(t.id) !== String(teamId));

    const usedCount = {};
    function pickOpponent() {
      const candidates = allOpp.slice().sort((a, b) => (usedCount[a.id] || 0) - (usedCount[b.id] || 0));
      const top = candidates.slice(0, Math.min(8, candidates.length));
      const o = pick(top.length ? top : candidates);
      if (!o) return null;
      usedCount[o.id] = (usedCount[o.id] || 0) + 1;
      return o;
    }

    const events = [];
    for (let r = 1; r <= 38; r++) {
      // abril a dezembro (aprox)
      const month = clamp(4 + Math.floor((r - 1) / 6), 4, 12);
      const day = clamp(2 + ((r - 1) * 2) % 26, 1, 28);
      const opp = pickOpponent();
      if (!opp) break;

      const home = (r % 2 === 0) ? String(teamId) : String(opp.id);
      const away = (r % 2 === 0) ? String(opp.id) : String(teamId);

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

    return sortEvents(events.map(e => normalizeEvent(e, { comp: "LEAGUE", division: div })));
  }

  // -----------------------------
  // Puxa eventos externos (CUP / REGIONAL)
  // -----------------------------
  function getCupEvents(teamId, year) {
    try {
      if (window.Cup && typeof Cup.getAnnualEvents === "function") {
        const arr = Cup.getAnnualEvents(teamId, year);
        if (Array.isArray(arr) && arr.length) {
          return arr.map(e => normalizeEvent(e, { comp: "CUP", competitionName: "Copa do Brasil" }));
        }
      }
    } catch (e) {}
    return [];
  }

  function getRegionalEvents(teamId, year) {
    try {
      if (window.Regionals && typeof Regionals.getAnnualEvents === "function") {
        const arr = Regionals.getAnnualEvents(teamId, year);
        if (Array.isArray(arr) && arr.length) {
          return arr.map(e => normalizeEvent(e, { comp: "REGIONAL", competitionName: "Estadual" }));
        }
      }
    } catch (e) {}
    return [];
  }

  // -----------------------------
  // Merge + Resolve conflitos de data
  // -----------------------------
  function resolveDateConflicts(events) {
    // Se duas partidas caírem no mesmo dia:
    // prioridade: CUP > LEAGUE > REGIONAL > FRIENDLY
    // a de menor prioridade é empurrada +1 dia (até achar slot livre)
    const priority = { CUP: 4, LEAGUE: 3, REGIONAL: 2, FRIENDLY: 1 };

    // map date -> list
    const map = {};
    for (const ev of events) {
      const d = ev.date || "0000-00-00";
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    }

    const usedDates = new Set(Object.keys(map));
    function nextDate(date) {
      // date "YYYY-MM-DD" (limitado)
      const y = n(date.slice(0, 4), 2026);
      const m = n(date.slice(5, 7), 1);
      const d = n(date.slice(8, 10), 1);
      const nd = clamp(d + 1, 1, 28);
      return iso(y, m, nd);
    }

    const output = [];

    const dates = Object.keys(map).sort((a, b) => a.localeCompare(b));
    for (const d of dates) {
      const list = map[d];
      if (!list || list.length <= 1) {
        if (list && list[0]) output.push(list[0]);
        continue;
      }

      // ordena por prioridade desc
      list.sort((a, b) => (priority[b.comp] || 0) - (priority[a.comp] || 0));

      // mantém a primeira no dia original, empurra as demais
      output.push(list[0]);

      for (let i = 1; i < list.length; i++) {
        let ev = list[i];
        let tryDate = d;
        let safe = 0;
        while (safe < 12) {
          tryDate = nextDate(tryDate);
          const slotKey = `${tryDate}`;
          // aceita se ainda não tiver jogo nesse dia para este time
          const occupied = output.some(x => x.date === tryDate);
          if (!occupied) {
            ev.date = tryDate;
            output.push(ev);
            break;
          }
          safe++;
        }
        if (safe >= 12) {
          // se falhar, mantém mesmo dia
          output.push(ev);
        }
      }
    }

    return sortEvents(output);
  }

  function mergeAllEvents(teamId, year) {
    const league = generateLeagueEvents(teamId, year);
    const cup = getCupEvents(teamId, year);
    const reg = getRegionalEvents(teamId, year);

    // Dedup por chave
    const all = [];
    const seen = new Set();
    for (const ev of [...reg, ...cup, ...league]) {
      const key = eventKey(ev);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(ev);
    }

    // Resolve conflitos de data
    const merged = resolveDateConflicts(all);

    // Reordena por data
    return sortEvents(merged);
  }

  // -----------------------------
  // Build / Cache por time
  // -----------------------------
  function rebuildTeamCalendar(teamId, force) {
    const gs = ensureGS();
    const cal = gs.calendar;
    const tid = String(teamId || "");
    if (!tid) return [];

    const year = n(gs.seasonYear, 2026);

    const meta = cal.metaByTeam[tid] || {};
    const stale = !Array.isArray(cal.eventsByTeam[tid]) || cal.eventsByTeam[tid].length === 0 || cal.year !== year;

    if (!force && !stale) {
      return cal.eventsByTeam[tid];
    }

    cal.year = year;

    // garante engines existirem (não obrigatório)
    try { if (window.Cup && typeof Cup.ensure === "function") Cup.ensure(false); } catch (e) {}
    try { if (window.Regionals && typeof Regionals.ensure === "function") Regionals.ensure(false); } catch (e) {}

    const events = mergeAllEvents(tid, year);

    cal.eventsByTeam[tid] = events;
    if (cal.pointerByTeam[tid] == null) cal.pointerByTeam[tid] = 0;

    cal.metaByTeam[tid] = {
      lastBuildAt: new Date().toISOString(),
      sources: {
        league: true,
        cup: !!(window.Cup && typeof Cup.getAnnualEvents === "function"),
        regionals: !!(window.Regionals && typeof Regionals.getAnnualEvents === "function")
      }
    };

    return events;
  }

  function getEventsForTeam(teamId) {
    const gs = ensureGS();
    const tid = String(teamId || "");
    if (!tid) return [];

    const events = rebuildTeamCalendar(tid, false);
    // filtra para participação do time (defensivo)
    return sortEvents((events || []).filter(e => String(e.homeId) === tid || String(e.awayId) === tid));
  }

  function getNextEvent(teamId) {
    const gs = ensureGS();
    const tid = String(teamId || "");
    if (!tid) return null;

    const list = getEventsForTeam(tid);
    if (!list.length) return null;

    const idx = clamp(n(gs.calendar.pointerByTeam[tid], 0), 0, list.length - 1);
    return list[idx] || null;
  }

  function consumeNextEvent(teamId) {
    const gs = ensureGS();
    const tid = String(teamId || "");
    if (!tid) return null;

    const list = getEventsForTeam(tid);
    if (!list.length) return null;

    let idx = clamp(n(gs.calendar.pointerByTeam[tid], 0), 0, list.length);
    const next = list[idx] || null;

    if (idx < list.length) gs.calendar.pointerByTeam[tid] = idx + 1;

    return next;
  }

  function peekUpcoming(teamId, count) {
    const gs = ensureGS();
    const tid = String(teamId || "");
    if (!tid) return [];

    const list = getEventsForTeam(tid);
    if (!list.length) return [];

    const idx = clamp(n(gs.calendar.pointerByTeam[tid], 0), 0, list.length);
    const c = clamp(n(count, 8), 1, 30);
    return list.slice(idx, idx + c);
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.Calendar = {
    ensure(force) {
      const gs = ensureGS();
      const teamId = getUserTeamId();
      if (!teamId) return;
      rebuildTeamCalendar(String(teamId), !!force);
    },

    rebuild(teamId) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return [];
      return rebuildTeamCalendar(tid, true);
    },

    setSeasonYear(year) {
      const gs = ensureGS();
      gs.seasonYear = n(year, 2026);
      gs.calendar.year = gs.seasonYear;

      // reseta caches para rebuild limpo
      gs.calendar.eventsByTeam = {};
      gs.calendar.metaByTeam = {};
      gs.calendar.pointerByTeam = {};

      this.ensure(true);
      return gs.seasonYear;
    },

    resetSeason(teamId) {
      const gs = ensureGS();
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return false;

      gs.calendar.pointerByTeam[tid] = 0;
      rebuildTeamCalendar(tid, true);
      return true;
    },

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
    },

    peekUpcoming(teamId, count) {
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return [];
      return peekUpcoming(tid, count);
    },

    debugMeta(teamId) {
      const gs = ensureGS();
      const tid = String(teamId || getUserTeamId() || "");
      if (!tid) return null;
      return gs.calendar.metaByTeam[tid] || null;
    }
  };
})();