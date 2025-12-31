/* engine/league.js — Séries A e B (placeholder) */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  const League = {
    // Fase futura: regras completas, tabela, rodadas, mandos
    createTable(clubs) {
      return (clubs || []).map(c => ({
        clubId: c.id,
        name: c.name,
        p: 0, j: 0, v: 0, e: 0, d: 0,
        gp: 0, gc: 0, sg: 0
      }));
    }
  };
  NS.Engine = NS.Engine || {};
  NS.Engine.League = League;
})();