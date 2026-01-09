// src/domain/leagueTable.js

/**
 * Cria uma tabela “vazia” para uma lista de times.
 * Útil quando você tem a lista de participantes e ainda não simulou jogos.
 */
export function makeEmptyTableForTeams(teamIds = []) {
  const unique = Array.from(new Set(teamIds.filter(Boolean)));

  return unique.map((teamId) => ({
    teamId,
    P: 0,  // pontos
    J: 0,  // jogos
    V: 0,  // vitórias
    E: 0,  // empates
    D: 0,  // derrotas
    GP: 0, // gols pró
    GC: 0, // gols contra
    SG: 0  // saldo
  }));
}

/**
 * Ordena a tabela seguindo critérios comuns:
 * 1) Pontos, 2) Vitórias, 3) Saldo, 4) Gols Pró, 5) Menos Gols Contra, 6) teamId
 */
export function sortTable(rows = []) {
  return [...rows].sort((a, b) => {
    const ap = Number(a?.P ?? 0);
    const bp = Number(b?.P ?? 0);
    if (bp !== ap) return bp - ap;

    const av = Number(a?.V ?? 0);
    const bv = Number(b?.V ?? 0);
    if (bv !== av) return bv - av;

    const asg = Number(a?.SG ?? 0);
    const bsg = Number(b?.SG ?? 0);
    if (bsg !== asg) return bsg - asg;

    const agp = Number(a?.GP ?? 0);
    const bgp = Number(b?.GP ?? 0);
    if (bgp !== agp) return bgp - agp;

    const agc = Number(a?.GC ?? 0);
    const bgc = Number(b?.GC ?? 0);
    if (agc !== bgc) return agc - bgc;

    return String(a?.teamId ?? "").localeCompare(String(b?.teamId ?? ""));
  });
}

/**
 * Atualiza estatísticas da tabela com base em um placar.
 * sideA/sideB devem ser objetos que tenham teamId.
 */
export function applyMatchResult(tableRows = [], sideA, sideB, goalsA = 0, goalsB = 0) {
  const rows = tableRows.map((r) => ({ ...r }));

  const aId = sideA?.teamId;
  const bId = sideB?.teamId;
  if (!aId || !bId) return rows;

  const a = rows.find((r) => r.teamId === aId);
  const b = rows.find((r) => r.teamId === bId);
  if (!a || !b) return rows;

  const ga = Number(goalsA ?? 0);
  const gb = Number(goalsB ?? 0);

  a.J += 1;
  b.J += 1;

  a.GP += ga;
  a.GC += gb;
  b.GP += gb;
  b.GC += ga;

  a.SG = a.GP - a.GC;
  b.SG = b.GP - b.GC;

  if (ga > gb) {
    a.V += 1;
    b.D += 1;
    a.P += 3;
  } else if (ga < gb) {
    b.V += 1;
    a.D += 1;
    b.P += 3;
  } else {
    a.E += 1;
    b.E += 1;
    a.P += 1;
    b.P += 1;
  }

  return rows;
}

/**
 * Serializa tabela (para salvar no storage)
 */
export function serializeTable(rows = []) {
  return rows.map((r) => ({
    teamId: r.teamId,
    P: Number(r.P ?? 0),
    J: Number(r.J ?? 0),
    V: Number(r.V ?? 0),
    E: Number(r.E ?? 0),
    D: Number(r.D ?? 0),
    GP: Number(r.GP ?? 0),
    GC: Number(r.GC ?? 0),
    SG: Number(r.SG ?? 0)
  }));
}

/**
 * Reconstrói tabela a partir de dados serializados.
 * Se vier vazio/undefined, retorna [].
 */
export function tableFromSerialized(serialized) {
  if (!Array.isArray(serialized)) return [];
  return serialized.map((r) => ({
    teamId: r.teamId,
    P: Number(r.P ?? 0),
    J: Number(r.J ?? 0),
    V: Number(r.V ?? 0),
    E: Number(r.E ?? 0),
    D: Number(r.D ?? 0),
    GP: Number(r.GP ?? 0),
    GC: Number(r.GC ?? 0),
    SG: Number(r.SG ?? 0)
  }));
}