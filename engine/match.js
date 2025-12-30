(function () {
  'use strict';

  window.VFM26 = window.VFM26 || {};
  window.VFM26.Engine = window.VFM26.Engine || {};

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /**
   * Simulação rápida (fase 4):
   * - Usa rating + vantagem de casa + sorte
   * - Gera placar plausível (0-4)
   */
  function simulate(params) {
    const home = String(params.home || '');
    const away = String(params.away || '');
    const homeRating = Number.isFinite(params.homeRating) ? params.homeRating : 70;
    const awayRating = Number.isFinite(params.awayRating) ? params.awayRating : 70;
    const rng = typeof params.rng === 'function' ? params.rng : Math.random;

    const homeAdv = 3; // vantagem de casa simples
    const diff = (homeRating + homeAdv) - awayRating; // positivo favorece mandante

    // força ofensiva/defensiva
    const baseHome = 1.2 + diff / 40; // ~0.2..2.2
    const baseAway = 1.1 - diff / 45; // ~0.2..2.2

    function goals(base) {
      // mistura: poisson-ish simples
      const x = base + (rng() - 0.5) * 0.9;
      const y = base + (rng() - 0.5) * 0.9;
      const z = (x + y) / 2;
      // mapeia para 0-4
      const g = Math.round(clamp(z, 0, 4));
      // pequena chance de “jogo doido”
      if (rng() < 0.05) return clamp(g + (rng() < 0.5 ? -1 : 1), 0, 5);
      return g;
    }

    const homeGoals = goals(baseHome);
    const awayGoals = goals(baseAway);

    const draw = homeGoals === awayGoals;
    const winner = draw ? null : (homeGoals > awayGoals ? home : away);

    return {
      home,
      away,
      homeGoals,
      awayGoals,
      draw,
      winner
    };
  }

  window.VFM26.Engine.Match = {
    simulate
  };
})();