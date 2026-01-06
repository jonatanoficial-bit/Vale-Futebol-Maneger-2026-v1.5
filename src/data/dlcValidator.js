export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") throw new Error("Manifest inválido.");
  const required = ["id", "name", "version", "gameDataVersion", "priority", "content"];
  for (const k of required) if (!(k in manifest)) throw new Error(`Manifest faltando: ${k}`);
  if (typeof manifest.id !== "string" || !manifest.id.trim()) throw new Error("Manifest.id inválido.");
  if (typeof manifest.priority !== "number") throw new Error("Manifest.priority inválido.");
}

export function validatePackData({ manifest, content }) {
  if (!content.nations?.nations || !Array.isArray(content.nations.nations)) {
    throw new Error("Pack inválido: nations.json ausente ou malformado.");
  }
  if (!content.clubs?.clubs || !Array.isArray(content.clubs.clubs)) {
    throw new Error("Pack inválido: clubs.json ausente ou malformado.");
  }

  const nationIds = new Set(content.nations.nations.map(n => n.id));
  const clubIds = new Set();
  for (const c of content.clubs.clubs) {
    if (!c.id || typeof c.id !== "string") throw new Error("Club.id inválido.");
    if (clubIds.has(c.id)) throw new Error(`Club.id duplicado: ${c.id}`);
    clubIds.add(c.id);
    if (!nationIds.has(c.nationId)) throw new Error(`Club ${c.id} nationId inexistente: ${c.nationId}`);
    if (!c.logoAssetId || typeof c.logoAssetId !== "string") throw new Error(`Club ${c.id} logoAssetId inválido.`);
  }

  if (content.players?.players) {
    if (!Array.isArray(content.players.players)) throw new Error("players.json malformado.");
    const playerIds = new Set();
    for (const p of content.players.players) {
      if (!p.id || typeof p.id !== "string") throw new Error("Player.id inválido.");
      if (playerIds.has(p.id)) throw new Error(`Player.id duplicado: ${p.id}`);
      playerIds.add(p.id);

      if (!p.name || typeof p.name !== "string") throw new Error(`Player ${p.id} name inválido.`);
      if (!nationIds.has(p.nationalityId)) throw new Error(`Player ${p.id} nationalityId inexistente: ${p.nationalityId}`);
      if (!p.clubId || typeof p.clubId !== "string") throw new Error(`Player ${p.id} clubId inválido.`);
      if (!Array.isArray(p.positions) || p.positions.length === 0) throw new Error(`Player ${p.id} positions inválido.`);
      if (!p.attributes || typeof p.attributes !== "object") throw new Error(`Player ${p.id} attributes inválido.`);
    }
  }

  return true;
}