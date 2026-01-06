export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") throw new Error("Manifest inválido.");
  const required = ["id", "name", "version", "gameDataVersion", "priority", "content"];
  for (const k of required) if (!(k in manifest)) throw new Error(`Manifest faltando: ${k}`);
  if (typeof manifest.id !== "string" || !manifest.id.trim()) throw new Error("Manifest.id inválido.");
  if (typeof manifest.priority !== "number") throw new Error("Manifest.priority inválido.");
}

export function validatePackData({ manifest, content }) {
  // MVP: nations e clubs (o resto entra depois sem quebrar)
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

  // espaço para validações futuras (players, competitions etc)
  return true;
}