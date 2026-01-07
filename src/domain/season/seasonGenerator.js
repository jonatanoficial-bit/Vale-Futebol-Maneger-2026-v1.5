// /src/domain/season/seasonGenerator.js
// Gera uma temporada MVP (realista o bastante) sem depender de dados completos.
// Quando você adicionar mais clubes/competições via Admin/DLC, isso evolui sem quebrar.

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function clubId(club) {
  return club?.id || club?.code || club?.slug || club?.abbrev || club?.short || null;
}

function guessTier(club) {
  const div = club?.division ?? club?.leagueLevel ?? club?.tier ?? club?.serie ?? null;
  const v = String(div ?? "").toUpperCase();
  if (v.includes("A") || v.includes("1")) return 1;
  if (v.includes("B") || v.includes("2")) return 2;
  if (v.includes("C") || v.includes("3")) return 3;
  return 2;
}

function buildRanking(clubs, seedStr) {
  const r = rng(hashString(seedStr));
  const rows = (clubs || [])
    .map(c => ({
      id: clubId(c),
      name: c?.name || c?.fullName || clubId(c) || "Clube",
      tier: guessTier(c),
      // força inicial: tier + ruído
      power: clamp((guessTier(c) === 1 ? 80 : guessTier(c) === 2 ? 72 : 66) + Math.floor((r() - 0.5) * 10), 55, 88)
    }))
    .filter(x => x.id);

  // mais forte primeiro
  rows.sort((a, b) => b.power - a.power);
  return rows;
}

function pickNUnique(ids, n) {
  return [...new Set(ids)].slice(0, Math.max(0, n));
}

function roundRobinFixtures(teamIds, doubleRound = true) {
  // Algoritmo círculo (Berger tables). MVP para calendário.
  const teams = [...teamIds];
  if (teams.length < 2) return [];

  // se ímpar, adiciona bye
  const hasBye = teams.length % 2 === 1;
  if (hasBye) teams.push("__BYE__");

  const n = teams.length;
  const half = n / 2;
  let list = [...teams];
  const rounds = [];

  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < half; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== "__BYE__" && b !== "__BYE__") {
        // alterna mando
        const home = (r % 2 === 0) ? a : b;
        const away = (r % 2 === 0) ? b : a;
        pairs.push({ home, away });
      }
    }
    rounds.push(pairs);

    // rotate (mantém primeiro fixo)
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list = [fixed, ...rest];
  }

  if (!doubleRound) return rounds;

  // returno invertendo mando
  const secondLeg = rounds.map(pairs => pairs.map(m => ({ home: m.away, away: m.home })));
  return rounds.concat(secondLeg);
}

function knockoutBracket(teamIds, seedStr) {
  const r = rng(hashString(seedStr));
  let current = shuffle(teamIds, r);
  // garante potência 2 (MVP): se não bater, corta excedente
  let pow2 = 1;
  while (pow2 * 2 <= current.length) pow2 *= 2;
  current = current.slice(0, pow2);

  // primeira fase: pares
  const rounds = [];
  let roundTeams = current;

  while (roundTeams.length >= 2) {
    const matches = [];
    for (let i = 0; i < roundTeams.length; i += 2) {
      matches.push({ home: roundTeams[i], away: roundTeams[i + 1] });
    }
    rounds.push(matches);

    // placeholder winners
    roundTeams = new Array(matches.length).fill(0).map((_, idx) => `W${rounds.length}-${idx + 1}`);
  }

  return { initialTeams: current, rounds };
}

function makeCompetitionBase({ id, name, type }) {
  return {
    id,
    name,
    type, // "league" | "cup" | "supercup" | "continental" | "intercontinental"
    status: "scheduled", // "scheduled" | "in_progress" | "finished"
    meta: {},
    participants: [],
    calendar: [],
    table: null,
    bracket: null
  };
}

export function generateSeason({ clubs, seasonId = "2025-2026", seed = "base" }) {
  const allClubs = (clubs || []).filter(c => clubId(c));
  const ranking = buildRanking(allClubs, `${seed}-${seasonId}`);

  const idsByPower = ranking.map(r => r.id);
  const A = pickNUnique(idsByPower, 20);
  const B = pickNUnique(idsByPower.slice(20), 20);
  const C = pickNUnique(idsByPower.slice(40), 20);

  const season = {
    id: seasonId,
    createdAt: new Date().toISOString(),
    rules: {
      brazil: {
        serieA: { relegation: 4, libSpots: 6, sulaSpots: 6 }, // 7º-12º = Sula
        serieB: { promotion: 4, relegation: 4 },
        serieC: { promotion: 4, relegation: 4 },
        copaDoBrasil: { winnerToLibertadores: true }
      }
    },
    competitions: [],
    notes: {
      continental: "Libertadores/Sul-Americana incluem placeholders para clubes fora do Brasil. Você poderá completar via Admin/DLC."
    }
  };

  // Brasileirão A
  const braA = makeCompetitionBase({ id: "BRA-A", name: "Brasileirão Série A", type: "league" });
  braA.participants = A;
  braA.meta = { country: "Brasil", level: 1, rounds: 38, points: "3-1-0" };
  braA.calendar = roundRobinFixtures(A, true).map((pairs, idx) => ({
    matchday: idx + 1,
    matches: pairs.map(m => ({ ...m, played: false, score: null }))
  }));
  season.competitions.push(braA);

  // Série B
  const braB = makeCompetitionBase({ id: "BRA-B", name: "Brasileirão Série B", type: "league" });
  braB.participants = B;
  braB.meta = { country: "Brasil", level: 2, rounds: braB.participants.length >= 2 ? (braB.participants.length - 1) * 2 : 0, points: "3-1-0" };
  braB.calendar = roundRobinFixtures(B, true).map((pairs, idx) => ({
    matchday: idx + 1,
    matches: pairs.map(m => ({ ...m, played: false, score: null }))
  }));
  season.competitions.push(braB);

  // Série C
  const braC = makeCompetitionBase({ id: "BRA-C", name: "Brasileirão Série C", type: "league" });
  braC.participants = C.length ? C : idsByPower.slice(40, 60);
  braC.meta = { country: "Brasil", level: 3, rounds: braC.participants.length >= 2 ? (braC.participants.length - 1) * 2 : 0, points: "3-1-0" };
  braC.calendar = roundRobinFixtures(braC.participants, true).map((pairs, idx) => ({
    matchday: idx + 1,
    matches: pairs.map(m => ({ ...m, played: false, score: null }))
  }));
  season.competitions.push(braC);

  // Copa do Brasil (MVP): usa clubes disponíveis (A+B+C) e cria mata-mata
  const cdb = makeCompetitionBase({ id: "CDB", name: "Copa do Brasil", type: "cup" });
  const cdbPool = pickNUnique([...A, ...B, ...braC.participants], 64); // 64 para bracket clean
  cdb.participants = cdbPool;
  cdb.meta = { country: "Brasil", rounds: "64->32->16->8->4->2->1", format: "mata-mata" };
  cdb.bracket = knockoutBracket(cdbPool, `${seed}-${seasonId}-cdb`);
  season.competitions.push(cdb);

  // Supercopa do Brasil (MVP): placeholders se ainda não tem campeão real
  const supercopa = makeCompetitionBase({ id: "SCB", name: "Supercopa do Brasil", type: "supercup" });
  supercopa.meta = { country: "Brasil", format: "final única" };
  // Como a temporada ainda não foi simulada, usamos os 2 melhores do ranking inicial como placeholders.
  const top2 = pickNUnique(idsByPower, 2);
  supercopa.participants = top2;
  supercopa.calendar = [{
    matchday: 1,
    matches: [{ home: top2[0], away: top2[1], played: false, score: null }]
  }];
  season.competitions.push(supercopa);

  // Libertadores (MVP): Brasil + placeholders CONMEBOL
  const lib = makeCompetitionBase({ id: "LIB", name: "Libertadores da América", type: "continental" });
  const brLib = pickNUnique(A, 6); // regra do Brasil (top6) no MVP inicial
  const placeholdersLib = ["ARG-1","ARG-2","URU-1","PAR-1","CHI-1","COL-1","ECU-1","PER-1","BOL-1","VEN-1"];
  lib.participants = pickNUnique([...brLib, ...placeholdersLib], 32);
  lib.meta = { confed: "CONMEBOL", format: "grupos+mata-mata", note: "placeholders fora do Brasil" };
  season.competitions.push(lib);

  // Sul-Americana (MVP): Brasil (7º-12º) + placeholders
  const sula = makeCompetitionBase({ id: "SULA", name: "Copa Sul-Americana", type: "continental" });
  const brSula = pickNUnique(A.slice(6, 12), 6);
  const placeholdersSula = ["ARG-S1","ARG-S2","URU-S1","PAR-S1","CHI-S1","COL-S1","ECU-S1","PER-S1","BOL-S1","VEN-S1"];
  sula.participants = pickNUnique([...brSula, ...placeholdersSula], 32);
  sula.meta = { confed: "CONMEBOL", format: "grupos+mata-mata", note: "placeholders fora do Brasil" };
  season.competitions.push(sula);

  // Intercontinental (MVP): campeão Libertadores vs campeão Europa (placeholder)
  const inter = makeCompetitionBase({ id: "INTER", name: "Intercontinental", type: "intercontinental" });
  inter.meta = { format: "final única", note: "Campeão LIB vs Campeão UCL (placeholder)" };
  inter.participants = ["LIB-CHAMP", "UCL-CHAMP"];
  inter.calendar = [{
    matchday: 1,
    matches: [{ home: "LIB-CHAMP", away: "UCL-CHAMP", played: false, score: null }]
  }];
  season.competitions.push(inter);

  // Estaduais (MVP): gera “Campeonato Estadual (placeholder)” para o clube do usuário quando existir UF futuramente.
  // Por ora: só cria estrutura global vazia (você completa via Admin depois).
  const estaduais = makeCompetitionBase({ id: "EST", name: "Campeonatos Estaduais (MVP)", type: "league" });
  estaduais.meta = { country: "Brasil", note: "Estrutura placeholder para estaduais. Será detalhada via Admin/DLC por UF." };
  estaduais.participants = [];
  estaduais.calendar = [];
  season.competitions.push(estaduais);

  return season;
}
