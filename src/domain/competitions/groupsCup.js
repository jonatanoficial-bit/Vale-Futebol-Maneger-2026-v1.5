import { tableFromSerialized, applyResult, makeEmptyTableForTeams } from "./leagueTable.js";

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function roundRobinFixtures(teamIds, groupId, compId) {
  // turnos únicos (3 rodadas com 4 times)
  const teams = teamIds.slice();
  const fixtures = [];

  // algoritmo simples p/ 4 times
  const [a, b, c, d] = teams;
  fixtures.push({ homeId: a, awayId: b, round: 1 });
  fixtures.push({ homeId: c, awayId: d, round: 1 });

  fixtures.push({ homeId: a, awayId: c, round: 2 });
  fixtures.push({ homeId: d, awayId: b, round: 2 });

  fixtures.push({ homeId: a, awayId: d, round: 3 });
  fixtures.push({ homeId: b, awayId: c, round: 3 });

  return fixtures.map((f, i) => ({
    id: `${compId}::G${groupId}::R${f.round}::${i + 1}::${f.homeId}_vs_${f.awayId}`,
    competitionId: compId,
    stage: "GROUP",
    groupId,
    round: f.round,
    homeId: f.homeId,
    awayId: f.awayId,
    date: null,
    played: false,
    result: null
  }));
}

export function buildGroupsCup({
  compId,
  name,
  seed,
  teamIds,
  groupsCount = 8,
  groupSize = 4
}) {
  const rng = rngFromString(seed);
  const shuffled = shuffle(rng, teamIds);

  const groups = [];
  let idx = 0;
  for (let g = 0; g < groupsCount; g++) {
    const ids = shuffled.slice(idx, idx + groupSize);
    idx += groupSize;

    groups.push({
      id: g + 1,
      teams: ids,
      table: Array.from(makeEmptyTableForTeams(ids).entries()),
      fixtures: roundRobinFixtures(ids, g + 1, compId)
    });
  }

  return {
    id: compId,
    name,
    type: "GROUPS_CUP",
    groups,
    knockout: {
      generated: false,
      fixtures: []
    },
    fixtures: groups.flatMap(g => g.fixtures)
  };
}

export function applyGroupsCupResult(comp, fixture, homeGoals, awayGoals) {
  // acha o grupo
  const g = comp.groups.find(x => x.id === fixture.groupId);
  if (!g) return comp;

  const table = tableFromSerialized(g.table);
  applyResult(table, fixture.homeId, fixture.awayId, homeGoals, awayGoals);

  const nextGroups = comp.groups.map(x => {
    if (x.id !== g.id) return x;
    return { ...x, table: Array.from(table.entries()) };
  });

  return { ...comp, groups: nextGroups };
}

function orderTable(tableMap) {
  const arr = Array.from(tableMap.entries()).map(([teamId, r]) => ({
    teamId,
    pts: r.pts,
    gd: r.gd,
    gf: r.gf
  }));
  arr.sort((a, b) =>
    (b.pts - a.pts) ||
    (b.gd - a.gd) ||
    (b.gf - a.gf) ||
    String(a.teamId).localeCompare(String(b.teamId), "pt-BR")
  );
  return arr;
}

function makeKnockoutFixture(compId, stage, i, homeId, awayId) {
  return {
    id: `${compId}::KO::${stage}::${i}::${homeId}_vs_${awayId}`,
    competitionId: compId,
    stage,
    groupId: null,
    round: null,
    homeId,
    awayId,
    date: null,
    played: false,
    result: null
  };
}

export function generateKnockoutIfReady(comp) {
  if (comp.knockout.generated) return comp;

  // todos jogos da fase de grupos jogados?
  const groupFixtures = comp.fixtures.filter(f => f.stage === "GROUP");
  if (groupFixtures.some(f => !f.played)) return comp;

  // pega 1º e 2º de cada grupo
  const qualifiers = [];
  for (const g of comp.groups) {
    const map = tableFromSerialized(g.table);
    const ordered = orderTable(map);
    qualifiers.push(ordered[0]?.teamId);
    qualifiers.push(ordered[1]?.teamId);
  }

  const q = qualifiers.filter(Boolean);
  if (q.length < 16) return comp; // segurança

  // chaveamento simples: 1A vs 2B, 1B vs 2A...
  const fixtures = [];
  for (let i = 0; i < q.length; i += 4) {
    const a1 = q[i];
    const a2 = q[i + 1];
    const b1 = q[i + 2];
    const b2 = q[i + 3];
    if (!a1 || !a2 || !b1 || !b2) continue;

    fixtures.push(makeKnockoutFixture(comp.id, "R16", fixtures.length + 1, a1, b2));
    fixtures.push(makeKnockoutFixture(comp.id, "R16", fixtures.length + 1, b1, a2));
  }

  return {
    ...comp,
    knockout: { generated: true, fixtures },
    fixtures: [...comp.fixtures, ...fixtures]
  };
}