// engine/calendar.js
// Calendário da temporada (eventos por clube, sem simulação de jogo aqui)
// Regras: determinístico, seguro e com APIs estáveis para UI/Engine.

(function(){
  const VERSION = 1;

  // Storage principal (por carreira). Por enquanto usamos 1 calendário global simples em memória,
  // mas a estrutura permite evoluir para múltiplas carreiras/slots com persistência.
  // IMPORTANTE: Nada aqui pode "quebrar" saves antigos — sempre usar defaults.
  let built = false;

  // Calendário global (eventos agregados) e por time
  let calendarAll = [];
  let calendarByTeam = {};     // { [teamId]: Event[] }
  let pointerByTeam = {};      // { [teamId]: number } -> usado por consumeNextEvent()

  // Formato de evento:
  // { date: "YYYY-MM-DD", comp: "LEAGUE"|"CUP"|"REGIONAL"|"FRIENDLY"|"BLOCK",
  //   round: number|null, homeId: number|null, awayId: number|null,
  //   meta?: {...} }

  // ---------- Helpers ----------
  function sortByDate(a,b){
    const ta = Date.parse(a.date);
    const tb = Date.parse(b.date);
    if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
    if (!Number.isFinite(ta)) return 1;
    if (!Number.isFinite(tb)) return -1;
    return ta - tb;
  }

  function addDaysISO(dateISO, days){
    const t = Date.parse(dateISO);
    const d = new Date(t);
    d.setUTCDate(d.getUTCDate() + days);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth()+1).padStart(2,'0');
    const da = String(d.getUTCDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  }

  function ensureTeamBucket(teamId){
    if (!calendarByTeam[teamId]) calendarByTeam[teamId] = [];
    if (typeof pointerByTeam[teamId] !== "number") pointerByTeam[teamId] = 0;
  }

  function pushTeamEvent(teamId, ev){
    ensureTeamBucket(teamId);
    calendarByTeam[teamId].push(ev);
  }

  // ---------- Generators ----------
  // Gera blocos fixos (estaduais/copa) como "BLOCK" para a timeline geral.
  // (NÃO são jogos do clube; são “blocos” de calendário.)
  function generateBlocksForYear(year){
    const blocks = [];

    // Estaduais (ex.: Jan → Mar) - exemplo simples
    // Rodadas semanais em jan/fev e finais em março.
    const start = `${year}-01-08`;
    for (let i = 0; i < 8; i++){
      blocks.push({
        date: addDaysISO(start, i*7),
        comp: "REGIONAL",
        round: i+1,
        homeId: null,
        awayId: null,
        meta: { label: "Estaduais", stage: "Rodadas" }
      });
    }
    blocks.push({
      date: `${year}-03-05`,
      comp: "REGIONAL",
      round: 1,
      homeId: null,
      awayId: null,
      meta: { label: "Estaduais", stage: "Finais" }
    });
    blocks.push({
      date: `${year}-03-12`,
      comp: "REGIONAL",
      round: 2,
      homeId: null,
      awayId: null,
      meta: { label: "Estaduais", stage: "Finais" }
    });

    // Copa do Brasil (exemplo: datas espaçadas)
    const cdbDates = [`${year}-04-10`, `${year}-05-15`, `${year}-06-19`, `${year}-07-24`, `${year}-08-28`];
    cdbDates.forEach((d, idx) => {
      blocks.push({
        date: d,
        comp: "CUP",
        round: idx+1,
        homeId: null,
        awayId: null,
        meta: { label: "Copa do Brasil", stage: "Fase" }
      });
    });

    return blocks.sort(sortByDate);
  }

  // Gera um calendário simples de liga para o time do usuário:
  // - 1 jogo por semana
  // - alterna mando de campo
  // - escolhe adversários do mesmo campeonato (Série A/B) via Database
  function generateLeagueEventsForUserTeam(career){
    const events = [];
    const teamId = career?.clubId;
    if (!teamId) return events;

    const year = Number(String(career?.date || "2026-01-01").slice(0,4)) || 2026;

    const club = window.Database?.getClubById?.(teamId);
    if (!club) return events;

    // Detecta competição (A/B) pelo campo esperado.
    // Se não existir, assume Série A como default seguro.
    const league = club?.league || club?.division || "A";
    const sameLeagueClubs = (window.Database?.getClubsByLeague?.(league) || [])
      .filter(c => c && c.id && c.id !== teamId);

    // fallback seguro: se não houver lista, não gera jogos
    if (!sameLeagueClubs.length) return events;

    // calendário começa em abril (após estaduais), exemplo simples
    let d = `${year}-04-07`;
    const rounds = Math.min(38, sameLeagueClubs.length * 2); // algo plausível

    let home = true;
    for (let r=1; r<=rounds; r++){
      const opp = sameLeagueClubs[(r-1) % sameLeagueClubs.length];
      const ev = {
        date: d,
        comp: "LEAGUE",
        round: r,
        homeId: home ? teamId : opp.id,
        awayId: home ? opp.id : teamId,
        meta: { league: league }
      };
      events.push(ev);
      d = addDaysISO(d, 7);
      home = !home;
    }

    return events.sort(sortByDate);
  }

  // Amistosos esporádicos
  function generateFriendliesForUserTeam(career){
    const events = [];
    const teamId = career?.clubId;
    if (!teamId) return events;

    const year = Number(String(career?.date || "2026-01-01").slice(0,4)) || 2026;
    const all = window.Database?.getAllClubs?.() || [];
    const others = all.filter(c => c && c.id && c.id !== teamId);
    if (!others.length) return events;

    const dates = [`${year}-01-27`, `${year}-02-24`, `${year}-03-27`];
    dates.forEach((dateISO, idx) => {
      const opp = others[(idx*7) % others.length];
      events.push({
        date: dateISO,
        comp: "FRIENDLY",
        round: idx+1,
        homeId: teamId,
        awayId: opp.id,
        meta: { label: "Amigável" }
      });
    });

    return events.sort(sortByDate);
  }

  // ---------- Build ----------
  function buildAllIfNeeded(){
    if (built) return;

    // Observação: aqui não usamos slot/save ainda.
    // Essa build é segura e determinística: depende apenas do career e do Database.
    // Se no futuro houver multi-slot, a chave será slotId e guardaremos estados separados.
    calendarAll = [];
    calendarByTeam = {};
    pointerByTeam = {};
    built = true;

    // Se CareerState existir, usamos a carreira ativa para gerar o calendário do usuário.
    const career = window.CareerState?.getActiveCareer?.() || null;

    // Blocos do ano
    const year = Number(String(career?.date || "2026-01-01").slice(0,4)) || 2026;
    const blocks = generateBlocksForYear(year);
    calendarAll.push(...blocks);

    // Eventos do usuário (liga + amistosos)
    const userLeagueEvents = generateLeagueEventsForUserTeam(career);
    const userFriendlies = generateFriendliesForUserTeam(career);

    const userEvents = [...userLeagueEvents, ...userFriendlies].sort(sortByDate);

    // Indexa por time (para o usuário e seus adversários envolvidos nos jogos)
    userEvents.forEach(ev => {
      if (ev.homeId) pushTeamEvent(ev.homeId, ev);
      if (ev.awayId) pushTeamEvent(ev.awayId, ev);
      calendarAll.push(ev);
    });

    // Ordena tudo
    calendarAll.sort(sortByDate);

    // Ordena por time
    Object.keys(calendarByTeam).forEach(k => {
      calendarByTeam[k].sort(sortByDate);
      // pointer começa no primeiro evento >= data da carreira, se existir
      const teamId = Number(k);
      const from = career?.date ? Date.parse(career.date) : NaN;
      if (Number.isFinite(from)){
        let p = 0;
        const list = calendarByTeam[teamId];
        for (let i=0;i<list.length;i++){
          const ts = Date.parse(list[i].date);
          if (Number.isFinite(ts) && ts >= from){
            p = i;
            break;
          }
        }
        pointerByTeam[teamId] = p;
      } else {
        pointerByTeam[teamId] = 0;
      }
    });
  }

  function rebuildTeamCalendar(teamId){
    // Hoje o build é global; esta função mantém compatibilidade com chamadas antigas.
    buildAllIfNeeded();
    ensureTeamBucket(teamId);
    calendarByTeam[teamId].sort(sortByDate);
  }

  // ---------- Queries ----------
  function getAllEvents(){
    buildAllIfNeeded();
    return calendarAll.slice();
  }

  function getTeamEvents(teamId){
    buildAllIfNeeded();
    ensureTeamBucket(teamId);
    return calendarByTeam[teamId].slice();
  }

  function getOpponentId(ev, teamId){
    if (!ev || !teamId) return null;
    if (ev.homeId === teamId) return ev.awayId;
    if (ev.awayId === teamId) return ev.homeId;
    return null;
  }

  function consumeNextEvent(teamId){
    buildAllIfNeeded();
    ensureTeamBucket(teamId);

    const list = calendarByTeam[teamId] || [];
    const p = pointerByTeam[teamId] || 0;

    if (p >= list.length) return null;

    const ev = list[p];
    pointerByTeam[teamId] = p + 1;
    return ev;
  }

  function peekUpcoming(teamId, count=10){
    buildAllIfNeeded();
    ensureTeamBucket(teamId);

    const list = calendarByTeam[teamId] || [];
    const p = pointerByTeam[teamId] || 0;

    return list.slice(p, p + count);
  }

  // Retorna o próximo jogo do usuário a partir de uma data (SEM efeitos colaterais).
  // Usado pelo Lobby/Agenda para mostrar "Próximo jogo" sem consumir o evento.
  function getProximoJogoDoUsuario(careerDateISO, teamId) {
    buildAllIfNeeded();
    const list = calendarByTeam[teamId] || [];
    if (!careerDateISO) {
      // Se não houver data de carreira, retorna o primeiro evento do time.
      return list[0] || null;
    }
    const fromTs = Date.parse(careerDateISO);
    if (!Number.isFinite(fromTs)) return list[0] || null;
    for (let i = 0; i < list.length; i++) {
      const ev = list[i];
      const ts = Date.parse(ev.date);
      if (!Number.isFinite(ts)) continue;
      // Próximo evento após (ou no mesmo dia, se ainda não foi consumido).
      if (ts >= fromTs) return ev;
    }
    return null;
  }

  // Lista eventos futuros do time, a partir de uma data (SEM consumir).
  function peekUpcomingFromDate(teamId, fromDateISO, limit = 12) {
    buildAllIfNeeded();
    const list = calendarByTeam[teamId] || [];
    const out = [];
    const fromTs = Date.parse(fromDateISO || '');
    for (let i = 0; i < list.length && out.length < limit; i++) {
      const ev = list[i];
      const ts = Date.parse(ev.date);
      if (Number.isFinite(fromTs) && Number.isFinite(ts) && ts < fromTs) continue;
      out.push(ev);
    }
    return out;
  }

  // ---------- Public API ----------
  window.Calendar = {
    VERSION,

    buildAllIfNeeded(){
      buildAllIfNeeded();
    },

    rebuildTeamCalendar(teamId){
      rebuildTeamCalendar(teamId);
    },

    getAllEvents(){
      return getAllEvents();
    },

    getTeamEvents(teamId){
      return getTeamEvents(teamId);
    },

    getOpponentId(ev, teamId){
      return getOpponentId(ev, teamId);
    },

    consumeNextEvent(teamId){
      return consumeNextEvent(teamId);
    },

    peekUpcoming(teamId, count=10){
      return peekUpcoming(teamId, count);
    },

    // Próximo jogo do usuário (sem consumir evento).
    getProximoJogoDoUsuario(careerDateISO, teamId){
      return getProximoJogoDoUsuario(careerDateISO, teamId);
    },

    // Eventos futuros a partir de uma data (sem consumir).
    peekUpcomingFromDate(teamId, fromDateISO, limit=12){
      return peekUpcomingFromDate(teamId, fromDateISO, limit);
    },

    debugMeta(teamId){
      buildAllIfNeeded();
      ensureTeamBucket(teamId);
      return {
        built,
        totalAll: calendarAll.length,
        totalTeam: (calendarByTeam[teamId]||[]).length,
        pointer: pointerByTeam[teamId] || 0
      };
    }
  };

})();