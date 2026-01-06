import { rngFromString, pick } from "./rng.js";
import { createTable } from "./leagueTable.js";

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Round-robin (uma volta) com algoritmo do círculo.
// Retorna fixtures por rodada.
function roundRobin(clubIds) {
  const ids = clubIds.slice();
  const n = ids.length;

  const isOdd = n % 2 === 1;
  if (isOdd) ids.push("BYE");

  const size = ids.length;
  const rounds = size - 1;
  const half = size / 2;

  const arr = ids.slice();
  const fixturesByRound = [];

  for (let r = 0; r < rounds; r++) {
    const pairs = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[size - 1 - i];
      if (a !== "BYE" && b !== "BYE") {
        // alterna mando
        const home = (r + i) % 2 === 0 ? a : b;
        const away = (r + i) % 2 === 0 ? b : a;
        pairs.push({ homeId: home, awayId: away });
      }
    }
    fixturesByRound.push(pairs);

    // rotaciona (fixa o primeiro)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return fixturesByRound;
}

function isoDateAddDays(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateSeason({ packId, clubId, clubIdsAll }) {
  // MVP Série A: pega até 20 clubes incluindo o seu
  // (determinístico pelo packId + clubId)
  const rng = rngFromString(`${packId}::SEASON_A::${clubId}`);

  const unique = Array.from(new Set(clubIdsAll));
  let pool = unique.filter(Boolean);

  // garante que o clube do usuário esteja dentro
  if (!pool.includes(clubId)) pool.unshift(clubId);

  // escolhe 20 (ou menos se não tiver)
  pool = shuffle(rng, pool);
  if (!pool.includes(clubId)) pool[0] = clubId;

  const leagueSize = Math.min(20, pool.length);
  let leagueClubs = pool.slice(0, leagueSize);

  // se por algum motivo não incluiu o usuário, força
  if (!leagueClubs.includes(clubId)) {
    leagueClubs[leagueClubs.length - 1] = clubId;
  }

  // ordena pra estabilidade visual
  leagueClubs = leagueClubs.slice().sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

  const rounds = roundRobin(leagueClubs);

  // start date (determinístico): 2026-01-15
  let date = "2026-01-15";
  const fixtures = [];
  let fixtureSeq = 1;

  for (let r = 0; r < rounds.length; r++) {
    const matches = rounds[r].slice();

    // Embaralha ordem dentro da rodada, mas determinístico
    const shuffled = shuffle(rng, matches);

    for (const m of shuffled) {
      fixtures.push({
        id: `A_${String(fixtureSeq).padStart(3, "0")}`,
        round: r + 1,
        date,
        homeId: m.homeId,
        awayId: m.awayId,
        played: false,
        result: null
      });
      fixtureSeq++;
    }

    // próxima rodada +7 dias
    date = isoDateAddDays(date, 7);
  }

  const table = createTable(leagueClubs);

  return {
    competitionId: "BR-A-MVP",
    name: "Campeonato Brasileiro Série A (MVP)",
    seasonYear: "2025/2026",
    clubIds: leagueClubs,
    fixtures,
    table: Array.from(table.entries()), // serializável
    currentIndex: 0,
    lastMatch: null
  };
}

export function tableFromSerialized(entries) {
  return new Map(entries || []);
}