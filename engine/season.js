(() => {
  "use strict";

  // ==========================================================
  // Season Engine (Fase 1 - Entrega 1)
  // - Gera calendário anual simples e consistente (data-driven)
  // - Série A: turno e returno (round-robin)
  // - Série B: turno e returno (round-robin)
  // - Blocos reservados: Estaduais e Copa do Brasil
  //
  // Regras anti-quebra:
  // - Se houver times ímpar, adiciona "BYE"
  // - Se não houver times suficientes, gera calendário vazio sem crash
  // - IDs de clubes são estáveis (do pack)
  // ==========================================================

  const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function shuffle(arr, seed) {
    // shuffle determinístico (LCG simples) pra sempre gerar igual com o mesmo seed
    const a = arr.slice();
    let s = Math.abs(hashString(seed || "seed")) || 123456;
    function rnd() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    }
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pad2(n) {
    const x = String(n);
    return x.length === 1 ? "0" + x : x;
  }

  function dateKey(year, monthIndex, day) {
    return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
  }

  function parseTeamId(t) {
    return t?.id || t?.clubId || null;
  }

  function leagueOf(t) {
    const l = (t?.league || t?.division || "").toString().toLowerCase();
    if (l.includes("série a") || l.includes("serie a")) return "A";
    if (l.includes("série b") || l.includes("serie b")) return "B";
    // fallback: se não tiver, joga em A por padrão
    return "A";
  }

  function buildRoundRobinPairs(teamIds) {
    // Algoritmo do círculo (round-robin)
    // Retorna rounds = [ [ [home, away], ... ], ... ]
    const ids = teamIds.slice();

    if (ids.length < 2) return [];

    // Se ímpar, adiciona BYE
    const BYE = "__BYE__";
    if (ids.length % 2 === 1) ids.push(BYE);

    const n = ids.length;
    const half = n / 2;

    let left = ids.slice(0, half);
    let right = ids.slice(half).reverse();

    const rounds = [];

    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < half; i++) {
        const a = left[i];
        const b = right[i];
        if (a !== BYE && b !== BYE) {
          // alterna mando para balancear
          const home = (r % 2 === 0) ? a : b;
          const away = (r % 2 === 0) ? b : a;
          pairs.push([home, away]);
        }
      }
      rounds.push(pairs);

      // rotate (fixa o primeiro)
      const fixed = left[0];
      const moveLeft = left.slice(1);
      const moveRight = right.slice(0);

      const newLeft = [fixed, moveRight[0], ...moveLeft.slice(0, moveLeft.length - 1)];
      const newRight = [...moveRight.slice(1), moveLeft[moveLeft.length - 1]].reverse();

      left = newLeft;
      right = newRight;
    }

    return rounds;
  }

  function buildDoubleRoundRobin(teamIds) {
    const first = buildRoundRobinPairs(teamIds);
    // returno: inverte mando
    const second = first.map(round => round.map(([h, a]) => [a, h]));
    return first.concat(second);
  }

  function addBlockEvents(events, year, monthIndex, days, title, compId) {
    for (let i = 0; i < days.length; i++) {
      events.push({
        id: `${compId}_${year}_${monthIndex+1}_${days[i]}`,
        type: "block",
        comp: compId,
        title,
        date: dateKey(year, monthIndex, days[i]),
        matches: []
      });
    }
  }

  function addLeagueRounds(events, year, monthIndex, roundDays, compId, compName, rounds) {
    for (let r = 0; r < rounds.length; r++) {
      const day = roundDays[r % roundDays.length];
      const matchList = rounds[r].map(([home, away]) => ({ home, away }));
      events.push({
        id: `${compId}_R${r+1}_${year}_${monthIndex+1}_${day}`,
        type: "matchday",
        comp: compId,
        title: `${compName} • Rodada ${r + 1}`,
        date: dateKey(year, monthIndex, day),
        matches: matchList
      });
    }
  }

  function generateSeasonFromTeams(teams, year, seed) {
    const all = Array.isArray(teams) ? teams : [];
    const aTeams = [];
    const bTeams = [];

    for (const t of all) {
      const id = parseTeamId(t);
      if (!id) continue;
      const lg = leagueOf(t);
      if (lg === "B") bTeams.push(id);
      else aTeams.push(id);
    }

    // determinístico por seed (pra não variar a cada refresh)
    const aIds = shuffle(aTeams, seed + "_A");
    const bIds = shuffle(bTeams, seed + "_B");

    const serieA = buildDoubleRoundRobin(aIds);
    const serieB = buildDoubleRoundRobin(bIds);

    // Calendário anual “seguro” (fácil de evoluir depois)
    // - Estaduais: JAN–MAR (blocos)
    // - Série A/B: ABR–NOV (rodadas em dias fixos)
    // - Copa do Brasil: blocos JUN–SET (por enquanto)
    //
    // Observação: aqui estamos criando a espinha dorsal.
    // Depois vamos implementar formatos reais (Paulista, etc.) e CdB fases.
    const events = [];

    // Estaduais (blocos): Janeiro, Fevereiro, Março (dias escolhidos)
    addBlockEvents(events, year, 0, [8, 15, 22, 29], "Estaduais • Rodadas", "ESTADUAIS");
    addBlockEvents(events, year, 1, [5, 12, 19, 26], "Estaduais • Rodadas", "ESTADUAIS");
    addBlockEvents(events, year, 2, [5, 12, 19, 26], "Estaduais • Finais", "ESTADUAIS");

    // Série A/B: Abril a Novembro
    // dias típicos de rodada (simplificado): 6, 13, 20, 27
    const roundDays = [6, 13, 20, 27];

    // Distribui rodadas ao longo dos meses ABR(3) .. NOV(10)
    // Série A: espalha metade das rodadas por 8 meses, o resto continua ciclando
    const monthsLeague = [3,4,5,6,7,8,9,10]; // ABR..NOV
    if (serieA.length > 0) {
      for (let i = 0; i < serieA.length; i++) {
        const monthIndex = monthsLeague[i % monthsLeague.length];
        const day = roundDays[i % roundDays.length];
        events.push({
          id: `SA_R${i+1}_${year}_${monthIndex+1}_${day}`,
          type: "matchday",
          comp: "SERIE_A",
          title: `Série A • Rodada ${i+1}`,
          date: dateKey(year, monthIndex, day),
          matches: serieA[i].map(([home, away]) => ({ home, away }))
        });
      }
    }

    if (serieB.length > 0) {
      for (let i = 0; i < serieB.length; i++) {
        const monthIndex = monthsLeague[i % monthsLeague.length];
        const day = roundDays[(i + 1) % roundDays.length]; // desloca um pouco
        events.push({
          id: `SB_R${i+1}_${year}_${monthIndex+1}_${day}`,
          type: "matchday",
          comp: "SERIE_B",
          title: `Série B • Rodada ${i+1}`,
          date: dateKey(year, monthIndex, day),
          matches: serieB[i].map(([home, away]) => ({ home, away }))
        });
      }
    }

    // Copa do Brasil (blocos): JUN–SET
    addBlockEvents(events, year, 5, [4, 18], "Copa do Brasil • Fase", "CDB");
    addBlockEvents(events, year, 6, [2, 16], "Copa do Brasil • Fase", "CDB");
    addBlockEvents(events, year, 7, [6, 20], "Copa do Brasil • Fase", "CDB");
    addBlockEvents(events, year, 8, [3, 17], "Copa do Brasil • Fase", "CDB");

    // Ordena por data
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Índice por data (facilita render e avanço do tempo)
    const byDate = {};
    for (const ev of events) {
      byDate[ev.date] = byDate[ev.date] || [];
      byDate[ev.date].push(ev);
    }

    return {
      schemaVersion: 1,
      year,
      seed,
      meta: {
        generatedAt: new Date().toISOString(),
        months: MONTHS.slice()
      },
      events: deepClone(events),
      byDate: deepClone(byDate)
    };
  }

  window.SeasonEngine = {
    generateSeasonFromTeams
  };
})();