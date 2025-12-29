// /engine/datapacks.js
// Catálogo + carregamento de DataPacks.
// Extensível: no futuro basta adicionar novos JSON em /packs e registrar aqui.

const PACKS = [
  {
    id: "brasil",
    name: "Brasil (Série A, Série B, Copa do Brasil, Estaduais)",
    file: "./packs/brasil_pack.json",
    region: "SA",
    default: true
  }
];

// Validação mínima para não quebrar jogo
function validatePack(pack) {
  if (!pack || typeof pack !== "object") throw new Error("Pack inválido: não é objeto.");
  if (!pack.id || typeof pack.id !== "string") throw new Error("Pack inválido: id ausente.");
  if (!pack.name || typeof pack.name !== "string") throw new Error("Pack inválido: name ausente.");
  if (!pack.version || typeof pack.version !== "string") throw new Error("Pack inválido: version ausente.");

  if (!pack.content || typeof pack.content !== "object") {
    throw new Error("Pack inválido: content ausente.");
  }
  // content.leagues pode ser vazio por enquanto, mas precisa existir
  if (!Array.isArray(pack.content.leagues)) throw new Error("Pack inválido: content.leagues deve ser array.");

  return true;
}

export function getAvailablePacks() {
  // Retorna lista para UI (sem carregar JSON ainda)
  return PACKS.map(p => ({
    id: p.id,
    name: p.name,
    region: p.region,
    default: !!p.default
  }));
}

export async function loadPackById(packId) {
  const entry = PACKS.find(p => p.id === packId);
  if (!entry) {
    throw new Error(`Pack não encontrado: ${packId}`);
  }

  let res;
  try {
    res = await fetch(entry.file, { cache: "no-store" });
  } catch (e) {
    throw new Error("Falha de rede ao buscar DataPack.");
  }

  if (!res.ok) {
    throw new Error(`Falha ao carregar DataPack (${res.status}).`);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("DataPack com JSON inválido.");
  }

  validatePack(json);

  // Injeta metadados do catálogo (útil para futuro)
  json._catalog = { file: entry.file, region: entry.region };

  return json;
}