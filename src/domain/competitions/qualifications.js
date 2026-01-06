function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export function computeBrazilQualifications({ serieATable, copaDoBrasilWinnerId }) {
  // serieATable: array de { teamId, pts, gd, gf } OR Map entries já resolvidos
  const ordered = Array.isArray(serieATable) ? serieATable.slice() : [];
  // já deve vir ordenado (mas garantimos)
  ordered.sort((a, b) =>
    (b.pts - a.pts) ||
    (b.gd - a.gd) ||
    (b.gf - a.gf) ||
    String(a.teamId).localeCompare(String(b.teamId), "pt-BR")
  );

  const top = (n) => ordered.slice(0, n).map(x => x.teamId);
  const range = (a, b) => ordered.slice(a - 1, b).map(x => x.teamId);

  const libBase = top(5);
  const hasCup = copaDoBrasilWinnerId && libBase.includes(copaDoBrasilWinnerId);

  const libertadores = hasCup
    ? uniq([...libBase, ordered[5]?.teamId]) // desce pro 6º
    : uniq([...libBase, copaDoBrasilWinnerId]);

  // Sulamericana: 6–12, mas se Liberta pegou o 6º, começa do 7º
  const sulStart = hasCup ? 7 : 6;
  const sul = range(sulStart, 12);

  return {
    libertadores,
    sulamericana: sul
  };
}