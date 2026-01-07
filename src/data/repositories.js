// src/data/repositories.js
// Repositórios de dados (packs/DLC) + helpers de assets.

/**
 * Busca JSON com fallback.
 * - Se der erro (404/offline/CORS), retorna o fallback.
 * - Nunca lança erro.
 */
async function safeFetchJson(url, fallback) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch (_err) {
    return fallback;
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.packs)) return value.packs;
  if (value && Array.isArray(value.dataPacks)) return value.dataPacks;
  return [];
}

const FALLBACK_PACKS_INDEX = [
  {
    id: "base-2025-26",
    title: "Base 2025/2026 (Brasil MVP)",
    description: "Recomendado",
  },
];

// Pack base mínimo para não quebrar telas quando não existir pack.json.
const FALLBACK_PACK = {
  id: "base-2025-26",
  title: "Base 2025/2026 (Brasil MVP)",
  country: "BR",
  season: "2025/2026",
  clubs: [
    { id: "FLA", name: "Flamengo" },
    { id: "PAL", name: "Palmeiras" },
    { id: "COR", name: "Corinthians" },
    { id: "SAO", name: "São Paulo" },
    { id: "ACG", name: "Atlético-GO" },
    { id: "AME", name: "América-MG" },
    { id: "CAM", name: "Atlético-MG" },
    { id: "CAP", name: "Athletico-PR" },
    { id: "BAH", name: "Bahia" },
    { id: "BOT", name: "Botafogo" },
    { id: "CEA", name: "Ceará" },
    { id: "CRB", name: "CRB" },
    { id: "FER", name: "Ferroviária" },
    { id: "GRE", name: "Grêmio" },
    { id: "INT", name: "Internacional" },
    { id: "MIR", name: "Mirassol" },
    { id: "SPT", name: "Sport" },
    { id: "VIT", name: "Vitória" },
    { id: "AMZ", name: "Amazonas" },
    { id: "BFS", name: "Botafogo-SP" },
    { id: "CRI", name: "Criciúma" },
    { id: "CUI", name: "Cuiabá" },
    { id: "FOR", name: "Fortaleza" },
    { id: "JUV", name: "Juventude" },
  ],
};

export function createRepositories({ logger } = {}) {
  const log = logger ?? console;

  // Cache simples (evita múltiplos fetches).
  let packsCache = null;

  async function listPacks() {
    if (packsCache) return packsCache;
    const raw = await safeFetchJson("./packs/index.json", FALLBACK_PACKS_INDEX);
    const packs = normalizeArray(raw);
    // garante shape básico
    packsCache = packs.map((p) => ({
      id: p.id,
      title: p.title ?? p.name ?? p.id,
      description: p.description ?? "",
    }));
    return packsCache;
  }

  async function loadPack(packId) {
    const id = packId || FALLBACK_PACK.id;
    const raw = await safeFetchJson(`./packs/${id}/pack.json`, FALLBACK_PACK);
    // tolera variações: {pack:{...}}
    const pack = raw?.pack ?? raw;
    if (!pack || !Array.isArray(pack.clubs)) {
      log.warn?.("Pack inválido, usando fallback", { id, pack });
      return { ...FALLBACK_PACK, id };
    }
    return { ...pack, id: pack.id ?? id };
  }

  async function loadPlayers(packId) {
    const id = packId || FALLBACK_PACK.id;
    const raw = await safeFetchJson(`./packs/${id}/players.json`, []);
    const players = normalizeArray(raw);
    return players;
  }

  function logoSrc(clubId) {
    // sem barra inicial para funcionar em GitHub Pages em subpath
    return `assets/logos/${clubId}.png`;
  }

  function faceSrc(playerId) {
    return `assets/faces/${playerId}.png`;
  }

  return {
    // compat: algumas telas antigas tentavam ler repos.dataPacks direto
    // (sincrono). Aqui colocamos um fallback. A tela deve preferir listPacks().
    dataPacks: FALLBACK_PACKS_INDEX,

    listPacks,
    loadPack,
    loadPlayers,
    logoSrc,
    faceSrc,
  };
}
