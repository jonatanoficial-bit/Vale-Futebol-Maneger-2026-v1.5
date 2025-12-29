/* engine/calendar.js — Calendário anual (placeholder) */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});

  const Calendar = {
    // Fase futura: calendário real BR com estaduais, A/B, Copa do Brasil
    buildSkeleton(seasonYear) {
      const days = 365;
      const list = [];
      for (let i = 0; i < days; i++) list.push({ dayIndex: i, events: [] });
      return { year: seasonYear, days: list };
    }
  };

  NS.Engine = NS.Engine || {};
  NS.Engine.Calendar = Calendar;
})();