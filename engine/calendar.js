(function () {
  'use strict';

  // Namespace
  window.VFM26 = window.VFM26 || {};
  window.VFM26.Engine = window.VFM26.Engine || {};

  /**
   * Util: embaralha array (Fisher-Yates)
   */
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Util: cria RNG determinístico simples (mulberry32)
   */
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Gera tabela de confrontos round-robin (Berger tables) para N pares.
   * - Se N for ímpar, adiciona "BYE".
   * Retorna rounds: Array< Array<[homeId, awayId]> >
   */
  function roundRobin(ids) {
    const teams = ids.slice();
    const n = teams.length;
    const hasBye = n % 2 === 1;
    if (hasBye) teams.push('__BYE__');

    const size = teams.length;
    const half = size / 2;
    const rounds = [];

    // algoritmo do círculo
    const list = teams.slice();
    for (let r = 0; r < size - 1; r++) {
      const pairs = [];
      for (let i = 0; i < half; i++) {
        const a = list[i];
        const b = list[size - 1 - i];
        if (a !== '__BYE__' && b !== '__BYE__') {
          // alterna mandos para reduzir repetição
          const home = (r + i) % 2 === 0 ? a : b;
          const away = (r + i) % 2 === 0 ? b : a;
          pairs.push([home, away]);
        }
      }
      rounds.push(pairs);

      // rotate (mantém o primeiro fixo)
      const fixed = list[0];
      const rest = list.slice(1);
      rest.unshift(rest.pop());
      list.splice(0, list.length, fixed, ...rest);
    }

    return rounds;
  }

  /**
   * Constrói uma temporada simples:
   * - Série A: clubes pack.clubs com league === 'A'
   * - Ida e volta (double round robin)
   * - Cada rodada acontece a cada 7 dias
   *
   * world.calendar = {
   *   startISO: '2026-01-01',
   *   dayIndex: 0,
   *   fixtures: [{ dateISO, comp, round, home, away }]
   * }
   */
  function buildSeason(pack, opts) {
    const clubs = Array.isArray(pack?.clubs) ? pack.clubs : [];
    const serieA = clubs.filter(c => String(c.league || '').toUpperCase() === 'A');
    const ids = serieA.map(c => String(c.id)).filter(Boolean);

    const startISO = (opts && opts.startISO) ? String(opts.startISO) : '2026-01-01';

    // seed estável: soma char codes do pack.id + startISO
    const seedStr = String(pack?.id || 'pack') + '|' + startISO;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    const rng = mulberry32(seed);

    // randomiza levemente a ordem inicial (deixa a liga diferente a cada pack)
    const shuffled = shuffle(ids, rng);

    const rounds1 = roundRobin(shuffled);
    const fixtures = [];

    // Rodada 1 em startISO + 6 dias (pra dar “semana 1”)
    const startDate = new Date(startISO + 'T00:00:00');

    function addDays(base, d) {
      const dt = new Date(base.getTime());
      dt.setDate(dt.getDate() + d);
      return dt;
    }

    function toISODate(dt) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Ida
    rounds1.forEach((pairs, idx) => {
      const round = idx + 1;
      const date = toISODate(addDays(startDate, round * 7)); // a cada 7 dias
      pairs.forEach(([home, away]) => {
        fixtures.push({ dateISO: date, comp: 'Série A', round, home, away });
      });
    });

    // Volta (inverte mando) começa 7 dias após a última rodada da ida
    const baseSecondLeg = rounds1.length * 7;
    rounds1.forEach((pairs, idx) => {
      const round = rounds1.length + idx + 1;
      const date = toISODate(addDays(startDate, baseSecondLeg + round * 7));
      pairs.forEach(([home, away]) => {
        fixtures.push({ dateISO: date, comp: 'Série A', round, home: away, away: home });
      });
    });

    return {
      startISO,
      dayIndex: 0,
      fixtures
    };
  }

  window.VFM26.Engine.Calendar = {
    buildSeason
  };
})();