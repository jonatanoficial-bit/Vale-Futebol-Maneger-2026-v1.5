// /src/domain/competitions/leagueTable.js

function emptyRow(clubId) {
  return {
    clubId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0
  };
}

export function createTable(clubIds) {
  const map = new Map();
  for (const id of clubIds) map.set(id, emptyRow(id));
  return map;
}

/**
 * Compat: alguns módulos (ex: groupsCup.js) esperam essa função.
 * Ela retorna um Map<teamId, row> com a tabela zerada.
 */
export function makeEmptyTableForTeams(teamIds) {
  return createTable(teamIds);
}

export function applyResult(tableMap, homeId, awayId, homeGoals, awayGoals) {
  const h = tableMap.get(homeId) || emptyRow(homeId);
  const a = tableMap.get(awayId) || emptyRow(awayId);

  h.played += 1;
  a.played += 1;

  h.gf += homeGoals;
  h.ga += awayGoals;
  a.gf += awayGoals;
  a.ga += homeGoals;

  if (homeGoals > awayGoals) {
    h.wins += 1;
    h.points += 3;
    a.losses += 1;
  } else if (homeGoals < awayGoals) {
    a.wins += 1;
    a.points += 3;
    h.losses += 1;
  } else {
    h.draws += 1;
    h.points += 1;
    a.draws += 1;
    a.points += 1;
  }

  h.gd = h.gf - h.ga;
  a.gd = a.gf - a.ga;

  tableMap.set(homeId, h);
  tableMap.set(awayId, a);
}

export function sortedTableRows(tableMap) {
  const rows = Array.from(tableMap.values());
  rows.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return String(x.clubId).localeCompare(String(y.clubId), "pt-BR");
  });
  return rows;
}

export function tableFromSerialized(entries) {
  return new Map(entries || []);
}