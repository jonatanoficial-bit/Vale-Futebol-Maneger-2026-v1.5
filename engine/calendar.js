/* engine/calendar.js — Calendário BR (Fase 4) */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});

  function makeDays(year) {
    const days = 365;
    const list = [];
    for (let i = 0; i < days; i++) list.push({ dayIndex: i, events: [] });
    return { year, days: list };
  }

  // Helper simples: coloca eventos em dias específicos
  function addEvent(cal, dayIndex, ev) {
    if (!cal?.days?.[dayIndex]) return;
    cal.days[dayIndex].events.push(ev);
  }

  // Gera rodadas semanais (a cada 7 dias) a partir de um dia inicial
  function generateRounds(startDay, rounds, competitionId) {
    const arr = [];
    for (let r = 0; r < rounds; r++) {
      arr.push({ dayIndex: startDay + (r * 7), round: r + 1, competitionId });
    }
    return arr;
  }

  const Calendar = {
    buildBR(seasonYear) {
      const cal = makeDays(seasonYear);

      // Modelo inicial (ajustável depois):
      // Estaduais: rodadas 1..12 entre dia 10 e 10+77
      const stateRounds = generateRounds(10, 12, 'state');

      // Copa do Brasil: rodadas (fases) em intervalos maiores
      const cupDays = [70, 98, 126, 154, 182, 210, 238]; // datas simbólicas
      const cupRounds = cupDays.map((d, i) => ({ dayIndex: d, round: i + 1, competitionId: 'cupBR' }));

      // Série A/B: 38 rodadas semanais a partir do dia 95
      const leagueARounds = generateRounds(95, 38, 'leagueA');
      const leagueBRounds = generateRounds(95, 38, 'leagueB');

      const all = [...stateRounds, ...cupRounds, ...leagueARounds, ...leagueBRounds]
        .sort((a, b) => a.dayIndex - b.dayIndex);

      for (const r of all) {
        addEvent(cal, r.dayIndex, {
          type: 'matchday',
          competitionId: r.competitionId,
          round: r.round
        });
      }

      return cal;
    }
  };

  NS.Engine = NS.Engine || {};
  NS.Engine.Calendar = Calendar;
})();