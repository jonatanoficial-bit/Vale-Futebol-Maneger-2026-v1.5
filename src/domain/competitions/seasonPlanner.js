import { CompetitionType } from "./competitionTypes.js";
import { rngFromString, shuffle } from "./rng.js";
import { buildLeagueFixtures, buildKnockoutFixtures } from "./fixtures.js";
import { createTable } from "./leagueTable.js";
import { isoDateAddDays } from "./dateUtils.js";

function uniq(arr) {
  return Array.from(new Set(arr));
}

function takeWithForce(rng, pool, size, mustInclude) {
  const p = uniq(pool).filter(Boolean);
  let chosen = shuffle(rng, p).slice(0, Math.min(size, p.length));
  if (mustInclude && !chosen.includes(mustInclude)) {
    if (chosen.length === 0) chosen = [mustInclude];
    else chosen[0] = mustInclude;
  }
  return uniq(chosen);
}

function tierHeuristic(clubId) {
  // heurística simples para “aproximar” forças/tier sem dataset completo
  const A = new Set(["FLA","PAL","COR","SAO","SAN","SPT","GRE","INT","CAM","CRU","VAS","BOT","FLU","CAP"]);
  const B = new Set(["BAH","FOR","CEA","CFC","GOI","RBB","AMG","AME","VIT","ACG","CAP","CRB","CRU","AVA"]);
  if (A.has(clubId)) return "A";
  if (B.has(clubId)) return "B";
  return "C";
}

function splitBrazilTiers(rng, clubIdsAll, userClubId) {
  const ids = uniq(clubIdsAll);
  const A = [];
  const B = [];
  const C = [];

  for (const id of ids) {
    const t = tierHeuristic(id);
    if (t === "A") A.push(id);
    else if (t === "B") B.push(id);
    else C.push(id);
  }

  // garante mínimos e força usuário no tier mais alto possível
  let userTier = tierHeuristic(userClubId);
  if (userTier === "C" && C.includes(userClubId) && A.length < 20) userTier = "A";

  function ensureSize(arr, target, fromPools) {
    let out = arr.slice();
    while (out.length < target) {
      const src = fromPools.find(p => p.length > 0);
      if (!src) break;
      out.push(src.pop());
    }
    return uniq(out);
  }

  // embaralha para distribuir
  const As = shuffle(rng, A);
  const Bs = shuffle(rng, B);
  const Cs = shuffle(rng, C);

  // monta tamanhos
  let serieA = As.slice(0, 20);
  let serieB = Bs.slice(0, 20);
  let serieC = Cs.slice(0, 20);

  // se faltar, completa com sobras
  const extra = As.slice(20).concat(Bs.slice(20)).concat(Cs.slice(20));
  const extraSh = shuffle(rng, extra);

  function fillTo20(list) {
    const out = list.slice();
    while (out.length < 20 && extraSh.length) out.push(extraSh.pop());
    return uniq(out);
  }

  serieA = fillTo20(serieA);
  serieB = fillTo20(serieB);
  serieC = fillTo20(serieC);

  // força usuário em alguma série (preferência pelo seu tier)
  if (!serieA.includes(userClubId) && !serieB.includes(userClubId) && !serieC.includes(userClubId)) {
    serieA[0] = userClubId;
  }

  if (userTier === "A" && !serieA.includes(userClubId)) {
    serieA[0] = userClubId;
  } else if (userTier === "B" && !serieB.includes(userClubId)) {
    serieB[0] = userClubId;
  } else if (userTier === "C" && !serieC.includes(userClubId)) {
    serieC[0] = userClubId;
  }

  // remove duplicados cruzados (garante exclusividade)
  function removeFrom(keep, other) {
    return other.filter(id => !keep.includes(id));
  }
  serieB = removeFrom(serieA, serieB);
  serieC = removeFrom(serieA.concat(serieB), serieC);

  // se alguma ficou com menos de 16, completa com sobras (sem duplicar)
  const used = new Set(serieA.concat(serieB).concat(serieC));
  const rest = ids.filter(id => !used.has(id));
  const restSh = shuffle(rng, rest);

  function topUp(list, min) {
    const out = list.slice();
    while (out.length < min && restSh.length) out.push(restSh.pop());
    return uniq(out);
  }

  serieA = topUp(serieA, 18);
  serieB = topUp(serieB, 18);
  serieC = topUp(serieC, 18);

  // padroniza para 20 se possível
  serieA = topUp(serieA, 20);
  serieB = topUp(serieB, 20);
  serieC = topUp(serieC, 20);

  return { serieA, serieB, serieC };
}

function buildCompetitionShell({ id, name, type }) {
  return {
    id,
    name,
    type,
    clubIds: [],
    fixtures: [],
    table: null,
    bracket: null,
    meta: {}
  };
}

function mkBracketState(fixtures) {
  // guarda resultados por matchId, e placeholders são resolvidos no engine
  return {
    fixtures
  };
}

export function generateSeasonAll({ packId, userClubId, clubIdsAll }) {
  const rng = rngFromString(`${packId}::SEASON_ALL::${userClubId}`);

  // Datas base (calendário realista)
  // Estadual: Jan-Mar (7/7)
  // Supercopa: início Fev
  // Série: Abril a Dezembro (7/7)
  // Copa do Brasil: Abril a Novembro (14/14, meio de semana)
  // Libertadores/Sula: Abril a Novembro (14/14)
  // Intercontinental: Dezembro (final)
  const baseYearStart = "2026-01-10";

  const { serieA, serieB, serieC } = splitBrazilTiers(rng, clubIdsAll, userClubId);

  // Estadual (regional MVP): pega 12 clubes do “entorno” (determinístico, inclui usuário)
  const estadualPool = serieA.concat(serieB).concat(serieC);
  const estadualClubs = takeWithForce(rng, estadualPool, 12, userClubId);

  // Copa do Brasil: 64 clubes (se tiver), senão tudo que houver
  const cdbClubs = takeWithForce(rng, clubIdsAll, Math.min(64, uniq(clubIdsAll).length), userClubId);

  // Libertadores: 32 (inclui user se estiver na Série A, ou seed)
  const libertadoresBase = uniq(serieA.concat(serieB)).slice(0, 40);
  const libertadoresClubs = takeWithForce(rng, libertadoresBase, Math.min(32, libertadoresBase.length), serieA.includes(userClubId) ? userClubId : null);

  // Sula: 32 (resto)
  const sulaPool = uniq(clubIdsAll).filter(id => !libertadoresClubs.includes(id));
  const sulaClubs = takeWithForce(rng, sulaPool, Math.min(32, sulaPool.length), (!libertadoresClubs.includes(userClubId) ? userClubId : null));

  // Europa “placeholder” (até você adicionar pack europeu real)
  const europeChampionId = "EUR_CHAMP";

  // Competitions
  const comps = [];

  // Estadual
  const estadual = buildCompetitionShell({ id: "BR-EST-MVP", name: "Campeonato Estadual (MVP)", type: CompetitionType.LEAGUE });
  estadual.clubIds = estadualClubs;
  estadual.fixtures = buildLeagueFixtures({
    rng,
    competitionId: estadual.id,
    clubIds: estadual.clubIds,
    startDateIso: baseYearStart,
    roundEveryDays: 7,
    doubleRound: false
  });
  estadual.table = Array.from(createTable(estadual.clubIds).entries());
  estadual.meta = { kind: "STATE", seasonYear: "2025/2026" };
  comps.push(estadual);

  // Supercopa (campeão liga x campeão copa) — por enquanto: top2 “seed” (inclui user se tiver)
  const supercopa = buildCompetitionShell({ id: "BR-SUPERCOPA", name: "Supercopa do Brasil (MVP)", type: CompetitionType.SUPERCUP });
  const superTeams = takeWithForce(rng, serieA, Math.min(2, serieA.length), userClubId);
  supercopa.clubIds = superTeams;
  supercopa.fixtures = [{
    id: `${supercopa.id}_M_0001`,
    competitionId: supercopa.id,
    stage: "FINAL",
    round: 1,
    date: isoDateAddDays(baseYearStart, 28), // início fev
    homeId: superTeams[0] || userClubId,
    awayId: superTeams[1] || userClubId,
    played: false,
    result: null
  }];
  supercopa.bracket = mkBracketState(supercopa.fixtures);
  supercopa.meta = { kind: "SUPERCUP", seasonYear: "2025/2026" };
  comps.push(supercopa);

  // Série A
  const serieAComp = buildCompetitionShell({ id: "BR-A", name: "Campeonato Brasileiro Série A (MVP)", type: CompetitionType.LEAGUE });
  serieAComp.clubIds = serieA;
  serieAComp.fixtures = buildLeagueFixtures({
    rng,
    competitionId: serieAComp.id,
    clubIds: serieAComp.clubIds,
    startDateIso: "2026-04-05",
    roundEveryDays: 7,
    doubleRound: true
  });
  serieAComp.table = Array.from(createTable(serieAComp.clubIds).entries());
  serieAComp.meta = { kind: "LEAGUE", tier: "A", seasonYear: "2025/2026" };
  comps.push(serieAComp);

  // Série B
  const serieBComp = buildCompetitionShell({ id: "BR-B", name: "Campeonato Brasileiro Série B (MVP)", type: CompetitionType.LEAGUE });
  serieBComp.clubIds = serieB;
  serieBComp.fixtures = buildLeagueFixtures({
    rng,
    competitionId: serieBComp.id,
    clubIds: serieBComp.clubIds,
    startDateIso: "2026-04-06",
    roundEveryDays: 7,
    doubleRound: true
  });
  serieBComp.table = Array.from(createTable(serieBComp.clubIds).entries());
  serieBComp.meta = { kind: "LEAGUE", tier: "B", seasonYear: "2025/2026" };
  comps.push(serieBComp);

  // Série C
  const serieCComp = buildCompetitionShell({ id: "BR-C", name: "Campeonato Brasileiro Série C (MVP)", type: CompetitionType.LEAGUE });
  serieCComp.clubIds = serieC;
  serieCComp.fixtures = buildLeagueFixtures({
    rng,
    competitionId: serieCComp.id,
    clubIds: serieCComp.clubIds,
    startDateIso: "2026-04-07",
    roundEveryDays: 7,
    doubleRound: true
  });
  serieCComp.table = Array.from(createTable(serieCComp.clubIds).entries());
  serieCComp.meta = { kind: "LEAGUE", tier: "C", seasonYear: "2025/2026" };
  comps.push(serieCComp);

  // Copa do Brasil (64, mata-mata, ida e volta até semi, final jogo único) — MVP simplificado: 1 jogo por fase
  const cdb = buildCompetitionShell({ id: "BR-CDB", name: "Copa do Brasil (MVP)", type: CompetitionType.CUP });
  cdb.clubIds = cdbClubs;
  cdb.fixtures = buildKnockoutFixtures({
    rng,
    competitionId: cdb.id,
    clubIds: cdb.clubIds,
    startDateIso: "2026-04-16",
    roundEveryDays: 21,
    legs: 1,
    labelPrefix: "K"
  });
  cdb.bracket = mkBracketState(cdb.fixtures);
  cdb.meta = { kind: "CUP", seasonYear: "2025/2026" };
  comps.push(cdb);

  // Libertadores (MVP): fase de liga (1 turno) + “mata-mata” (placeholders). Para MVP: apenas liga 1 turno.
  const lib = buildCompetitionShell({ id: "CONMEBOL-LIB", name: "Copa Libertadores da América (MVP)", type: CompetitionType.INTERNATIONAL });
  lib.clubIds = libertadoresClubs;
  lib.fixtures = buildLeagueFixtures({
    rng,
    competitionId: lib.id,
    clubIds: lib.clubIds,
    startDateIso: "2026-04-09",
    roundEveryDays: 14,
    doubleRound: false
  });
  lib.table = Array.from(createTable(lib.clubIds).entries());
  lib.meta = { kind: "LIB", seasonYear: "2025/2026" };
  comps.push(lib);

  // Sul-Americana (MVP): liga 1 turno
  const sula = buildCompetitionShell({ id: "CONMEBOL-SULA", name: "Copa Sul-Americana (MVP)", type: CompetitionType.INTERNATIONAL });
  sula.clubIds = sulaClubs;
  sula.fixtures = buildLeagueFixtures({
    rng,
    competitionId: sula.id,
    clubIds: sula.clubIds,
    startDateIso: "2026-04-10",
    roundEveryDays: 14,
    doubleRound: false
  });
  sula.table = Array.from(createTable(sula.clubIds).entries());
  sula.meta = { kind: "SULA", seasonYear: "2025/2026" };
  comps.push(sula);

  // Intercontinental (Libertadores campeão x Europa campeão) — agendado para Dezembro, só acontece se lib terminar
  const inter = buildCompetitionShell({ id: "WORLD-INTER", name: "Intercontinental (MVP)", type: CompetitionType.INTERNATIONAL });
  inter.clubIds = [ "LIB_CHAMP", europeChampionId ];
  inter.fixtures = [{
    id: `${inter.id}_M_0001`,
    competitionId: inter.id,
    stage: "FINAL",
    round: 1,
    date: "2026-12-12",
    homeId: "LIB_CHAMP",
    awayId: europeChampionId,
    played: false,
    result: null
  }];
  inter.bracket = mkBracketState(inter.fixtures);
  inter.meta = { kind: "INTERCONTINENTAL", seasonYear: "2025/2026" };
  comps.push(inter);

  // Calendário unificado
  const allFixtures = comps.flatMap(c => c.fixtures);
  allFixtures.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));

  return {
    seasonYear: "2025/2026",
    competitions: comps,
    calendar: allFixtures,
    calendarIndex: 0,
    lastMatch: null
  };
}