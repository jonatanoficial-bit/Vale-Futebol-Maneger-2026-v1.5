function titleFromId(id) {
  return id;
}

export function autoCompleteClubs({ clubsFromPack, logoIds, nationIdDefault = "BRA" }) {
  const map = new Map();
  for (const c of (clubsFromPack || [])) {
    if (c?.id) map.set(c.id, c);
  }

  for (const id of (logoIds || [])) {
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: titleFromId(id),
        shortName: id,
        nationId: nationIdDefault,
        logoAssetId: id
      });
    } else {
      const c = map.get(id);
      map.set(id, { ...c, logoAssetId: c.logoAssetId || id });
    }
  }

  return Array.from(map.values());
}