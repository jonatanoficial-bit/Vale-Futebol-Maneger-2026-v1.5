import { CompetitionType } from "./competitionTypes.js";
import { buildGroupsCup } from "./groupsCup.js";

function rngFromString(seed) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return function () {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeLeague({ id, name, teamIds }) {
  const table = teamIds.map(t => [t, { pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }]);
  const fixtures = [];
  // turno único MVP: todos contra todos (pode virar ida/volta depois)
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const home = teamIds[i];
      const away = teamIds[j];
      fixtures.push({
        id: `${id}::L::${home}_vs_${away}`,
        competitionId: id,
        stage: "LEAGUE",
        groupId: null,
        homeId: home,
        awayId: away,
        date: null,
        played: false,
        result: null
      });
    }
  }
  return { id, name, type: CompetitionType.LEAGUE, teamIds, table, fixtures };
}

function makeCup({ id, name, teamIds, seed }) {
  const rng = rngFromString(seed);
  const shuffled = shuffle(rng, teamIds);
  const fixtures = [];

  // mata-mata simples MVP: primeira rodada já (n/ garante potência completa com byes, mas não quebra)
  for (let i = 0; i < shuffled.length; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    if (!a || !b) continue;
    fixtures.push({
      id: `${id}::CUP::R1::${a}_vs_${b}`,
      competitionId: id,
      stage: "CUP",
      groupId: null,
      homeId: a,
      awayId: b,
      date: null,
      played: false,
      result: null
    });
  }
  return { id, name, type: CompetitionType.CUP, fixtures, bracket: { fixtures } };
}

function pickByConfed({ clubs, confed }) {
  return clubs
    .filter(c => (c.confed || "").toUpperCase() === confed.toUpperCase())
    .map(c => c.id);
}

function pickTag({ clubs, tag }) {
  return clubs
    .filter(c => Array.isArray(c.tags) && c.tags.includes(tag))
    .map(c => c.id);
}

export function buildSeasonV3({ pack, state }) {
  const packId = state.app.selectedPackId;
  const seed = `${packId}::SEASON_V3::${new Date().getFullYear()}`;
  const rng = rngFromString(seed);

  const clubs = pack.content.clubs.clubs;

  // Brasil: você já tem IDs Série A/B/C no seu pack Brasil (recomendado)
  // MVP: detecta “br” pelo country === "Brasil"
  const br = clubs.filter(c => (c.country || "").toLowerCase() === "brasil").map(c => c.id);

  // MVP bem simples: se você ainda não separou Série A/B/C em listas no pack,
  // o jogo não quebra: só cria Série A com os primeiros 20 BR.
  const br20 = br.slice(0, 20);
  const brB = br.slice(20, 40);
  const brC = br.slice(40, 60);

  const serieA = makeLeague({ id: "BRA_A", name: "Brasileirão Série A", teamIds: br20 });
  const serieB = makeLeague({ id: "BRA_B", name: "Brasileirão Série B", teamIds: brB.length ? brB : br20 });
  const serieC = makeLeague({ id: "BRA_C", name: "Brasileirão Série C", teamIds: brC.length ? brC : br20 });

  const copaBR = makeCup({ id: "CDB", name: "Copa do Brasil", teamIds: br20, seed: `${seed}::CDB` });

  // Supercopa: campeões só existem no “fim”; aqui é placeholder na season (será preenchida quando houver winners)
  const superCopa = {
    id: "SCB",
    name: "Supercopa do Brasil",
    type: CompetitionType.CUP,
    fixtures: [],
    bracket: { fixtures: [] }
  };

  // CONMEBOL: pega todos do pack marcado confed
  const conmebol = pickByConfed({ clubs, confed: "CONMEBOL" });

  // Libertadores: 32 times (8 grupos)
  // MVP: se não tiver 32 no pack, completa com brasileiros
  const libTeams = shuffle(rng, [...conmebol, ...br20]).slice(0, 32);
  const libertadores = buildGroupsCup({
    compId: "LIB",
    name: "Libertadores da América",
    seed: `${seed}::LIB`,
    teamIds: libTeams,
    groupsCount: 8,
    groupSize: 4
  });

  // Sul-Americana: 32 times (8 grupos)
  const sulaTeams = shuffle(rng, [...conmebol, ...br20]).slice(0, 32);
  const sulamericana = buildGroupsCup({
    compId: "SULA",
    name: "Copa Sul-Americana",
    seed: `${seed}::SULA`,
    teamIds: sulaTeams,
    groupsCount: 8,
    groupSize: 4
  });

  // Intercontinental: depende do campeão Europa (tag)
  const uefaChampion = pickTag({ clubs, tag: "UEFA_CHAMPION_2026" })[0] || null;
  const intercontinental = {
    id: "INTER",
    name: "Intercontinental",
    type: CompetitionType.CUP,
    fixtures: uefaChampion ? [{
      id: `INTER::FINAL::TBD_vs_${uefaChampion}`,
      competitionId: "INTER",
      stage: "FINAL",
      groupId: null,
      homeId: "TBD_LIB_CHAMP",
      awayId: uefaChampion,
      date: null,
      played: false,
      result: null
    }] : [],
    bracket: { fixtures: [] }
  };

  // calendário = concat de todas fixtures (ordem refinada depois)
  const competitions = [serieA, serieB, serieC, copaBR, superCopa, libertadores, sulamericana, intercontinental];
  const calendar = competitions.flatMap(c => c.fixtures || []);

  return {
    id: `SEASON_V3_${new Date().getFullYear()}`,
    competitions,
    calendar,
    calendarIndex: 0,
    lastMatch: null,
    meta: {
      winners: {
        BRA_A: null,
        CDB: null,
        LIB: null,
        UEFA_CL: uefaChampion
      }
    }
  };
}