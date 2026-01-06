import { tableFromSerialized } from "../competitions/leagueTable.js";

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

function topN(ordered, n) {
  return ordered.slice(0, n).map(x => x.teamId);
}
function bottomN(ordered, n) {
  return ordered.slice(Math.max(0, ordered.length - n)).map(x => x.teamId);
}

export function computePromotionRelegation({ season, slots = 4 }) {
  const A = season.competitions.find(c => c.id === "BRA_A");
  const B = season.competitions.find(c => c.id === "BRA_B");
  const C = season.competitions.find(c => c.id === "BRA_C");
  if (!A || !B || !C) {
    return {
      ok: false,
      reason: "Ligas BRA_A/BRA_B/BRA_C não encontradas na temporada."
    };
  }

  const Aord = orderTable(tableFromSerialized(A.table));
  const Bord = orderTable(tableFromSerialized(B.table));
  const Cord = orderTable(tableFromSerialized(C.table));

  const relegA = bottomN(Aord, slots);
  const promB = topN(Bord, slots);

  const relegB = bottomN(Bord, slots);
  const promC = topN(Cord, slots);

  return {
    ok: true,
    A: { champion: Aord[0]?.teamId || null, relegated: relegA, ordered: Aord },
    B: { champion: Bord[0]?.teamId || null, promoted: promB, relegated: relegB, ordered: Bord },
    C: { champion: Cord[0]?.teamId || null, promoted: promC, ordered: Cord }
  };
}

export function applyPromotionRelegation({ currentLists, movement }) {
  // currentLists: { A: [20], B: [20], C: [20] }
  // movement: retorno de computePromotionRelegation
  if (!movement?.ok) return currentLists;

  const A = currentLists.A.slice();
  const B = currentLists.B.slice();
  const C = currentLists.C.slice();

  const relegA = new Set(movement.A.relegated);
  const promB = new Set(movement.B.promoted);

  const relegB = new Set(movement.B.relegated);
  const promC = new Set(movement.C.promoted);

  // A: remove rebaixados, adiciona promovidos da B
  const nextA = A.filter(id => !relegA.has(id));
  for (const id of promB) if (!nextA.includes(id)) nextA.push(id);

  // B: remove promovidos e rebaixados, adiciona rebaixados da A e promovidos da C
  const nextB = B.filter(id => !promB.has(id) && !relegB.has(id));
  for (const id of movement.A.relegated) if (!nextB.includes(id)) nextB.push(id);
  for (const id of movement.C.promoted) if (!nextB.includes(id)) nextB.push(id);

  // C: remove promovidos, adiciona rebaixados da B
  const nextC = C.filter(id => !promC.has(id));
  for (const id of movement.B.relegated) if (!nextC.includes(id)) nextC.push(id);

  return {
    A: nextA,
    B: nextB,
    C: nextC
  };
}