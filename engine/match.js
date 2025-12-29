/* engine/match.js — Simulação de partidas (placeholder inicial) */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  const Match = {
    simulate(clubA, clubB) {
      // Placeholder: usa rating (se existir) com leve aleatoriedade
      const ra = typeof clubA?.rating === 'number' ? clubA.rating : 60;
      const rb = typeof clubB?.rating === 'number' ? clubB.rating : 60;
      const bias = ra - rb;

      function goals(base) {
        const r = Math.random();
        const v = base + (r * 1.8) + (bias / 45);
        return Math.max(0, Math.round(v));
      }

      const ga = goals(0.9);
      const gb = goals(0.9 - (bias / 60));

      return {
        schema: 'vfm26.match.v0',
        clubA: { id: clubA.id, name: clubA.name, goals: ga },
        clubB: { id: clubB.id, name: clubB.name, goals: gb },
        playedAt: new Date().toISOString()
      };
    }
  };
  NS.Engine = NS.Engine || {};
  NS.Engine.Match = Match;
})();