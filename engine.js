/* engine.js — Engine consolidado (root)
   Motivo: o index.html carrega "engine.js" na raiz, mas no ZIP o engine estava em /engine.
   Este arquivo junta:
   - engine/gameCore.js
   - engine/index.js
*/

(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const BootCheck = NS.BootCheck;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function rand(seedObj) {
    seedObj.s = (seedObj.s * 1664525 + 1013904223) % 4294967296;
    return seedObj.s / 4294967296;
  }

  const EngineCore = {
    version: '1.2.0',
    clamp,
    rand,

    // Forma base do jogador (simples e estável)
    makePlayer(p) {
      return {
        id: String(p.id),
        name: String(p.name || p.id),
        pos: String(p.pos || 'UNK'),
        age: typeof p.age === 'number' ? p.age : 22,
        ovr: typeof p.ovr === 'number' ? p.ovr : 50,
        pot: typeof p.pot === 'number' ? p.pot : null,
        value: typeof p.value === 'number' ? p.value : null,
        wage: typeof p.wage === 'number' ? p.wage : null,
        form: typeof p.form === 'number' ? p.form : 0,
        fitness: typeof p.fitness === 'number' ? p.fitness : 100,
        morale: typeof p.morale === 'number' ? p.morale : 50,
        traits: Array.isArray(p.traits) ? p.traits.slice(0) : []
      };
    },

    // Calcula “força” do time a partir do XI + forma + fitness + moral
    teamStrength(team) {
      const xi = Array.isArray(team?.xi) ? team.xi : [];
      if (!xi.length) return 50;

      let sum = 0;
      for (const pl of xi) {
        const ovr = typeof pl.ovr === 'number' ? pl.ovr : 50;
        const form = typeof pl.form === 'number' ? pl.form : 0;
        const fit = typeof pl.fitness === 'number' ? pl.fitness : 100;
        const mor = typeof pl.morale === 'number' ? pl.morale : 50;

        const fitFactor = clamp(fit / 100, 0.6, 1.0);
        const morFactor = clamp(0.85 + mor / 400, 0.85, 1.05);
        const formFactor = clamp(1 + form / 50, 0.85, 1.15);

        sum += ovr * fitFactor * morFactor * formFactor;
      }

      return clamp(sum / xi.length, 1, 99);
    },

    // Simulador simples mas consistente (evita bugs e mantém “cara de simulador”)
    simulateMatch({ home, away, seed = 12345, minutes = 90 }) {
      const seedObj = { s: seed >>> 0 };

      const hs = EngineCore.teamStrength(home);
      const as = EngineCore.teamStrength(away);

      // posse e chances baseadas em força
      const total = hs + as;
      const homePoss = total > 0 ? hs / total : 0.5;

      const homeChances = clamp(Math.round(8 + (homePoss - 0.5) * 6 + (hs - as) / 8), 4, 18);
      const awayChances = clamp(Math.round(8 + ((1 - homePoss) - 0.5) * 6 + (as - hs) / 8), 4, 18);

      function finish(chances, atkStr, defStr) {
        let goals = 0;
        let xg = 0;
        for (let i = 0; i < chances; i++) {
          const r = rand(seedObj);
          const quality = clamp(0.06 + (atkStr - defStr) / 500 + (rand(seedObj) - 0.5) * 0.04, 0.03, 0.18);
          xg += quality;
          if (r < quality) goals++;
        }
        return { goals, xg: +xg.toFixed(2) };
      }

      const homeFin = finish(homeChances, hs, as);
      const awayFin = finish(awayChances, as, hs);

      // eventos simples
      const events = [];
      function pushGoal(team, minute) {
        events.push({ type: 'goal', team, minute });
      }

      // distribui gols ao longo do tempo
      function spreadGoals(n, team) {
        for (let i = 0; i < n; i++) {
          const minute = clamp(Math.floor(rand(seedObj) * minutes) + 1, 1, minutes);
          pushGoal(team, minute);
        }
      }
      spreadGoals(homeFin.goals, 'home');
      spreadGoals(awayFin.goals, 'away');
      events.sort((a, b) => a.minute - b.minute);

      return {
        score: { home: homeFin.goals, away: awayFin.goals },
        stats: {
          possessionHome: Math.round(homePoss * 100),
          possessionAway: 100 - Math.round(homePoss * 100),
          shotsHome: homeChances,
          shotsAway: awayChances,
          xgHome: homeFin.xg,
          xgAway: awayFin.xg
        },
        events
      };
    }
  };

  NS.EngineCore = EngineCore;
  BootCheck && BootCheck.step('ENGINE_CORE_READY');
})();

(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const BootCheck = NS.BootCheck;

  const Engine = {
    version: '1.2.0',

    init() {
      BootCheck && BootCheck.step('ENGINE_INIT_START');
      if (!NS.EngineCore) {
        return BootCheck.fatal('ENGINE_E01_CORE_MISSING', 'EngineCore não carregou.');
      }
      BootCheck && BootCheck.step('ENGINE_INIT_OK');
      return true;
    },

    // delega pro core
    simulateMatch(opts) {
      return NS.EngineCore.simulateMatch(opts);
    },

    teamStrength(team) {
      return NS.EngineCore.teamStrength(team);
    },

    makePlayer(p) {
      return NS.EngineCore.makePlayer(p);
    }
  };

  NS.Engine = Engine;
  BootCheck && BootCheck.step('ENGINE_READY');
})();