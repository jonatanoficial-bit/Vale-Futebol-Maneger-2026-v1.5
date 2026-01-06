import { listAvailablePacks, loadPackByPath } from "./dlcLoader.js";
import { createSaveManager } from "./saveManager.js";
import { loadLogoIndex } from "./assetIndex.js";
import { autoCompleteClubs } from "./clubAutoComplete.js";
import { tryLoadFaceIndex } from "./faceIndex.js";
import { computeOverall } from "../domain/playerModel.js";
import { generateAutoRoster } from "../domain/rosterGenerator.js";

export async function createRepositories({ logger }) {
  const saves = createSaveManager(logger);

  const packs = await listAvailablePacks();
  const logoIds = await loadLogoIndex();
  const faceIds = await tryLoadFaceIndex(logger);

  async function loadPack(packId) {
    const meta = packs.find(p => p.id === packId) || packs.find(p => p.recommended);
    if (!meta) throw new Error("Nenhum pack disponível.");

    const loaded = await loadPackByPath(meta.path, logger);

    // Clubs auto-complete a partir dos escudos
    const clubsFromPack = loaded.content?.clubs?.clubs || [];
    const completedClubs = autoCompleteClubs({
      clubsFromPack,
      logoIds,
      nationIdDefault: "BRA"
    });
    loaded.content.clubs.clubs = completedClubs;

    // Players do pack (se não existir, vira vazio)
    const packPlayers = loaded.content?.players?.players || [];
    loaded.content.players = { players: packPlayers };

    // Index base
    const playersById = new Map();
    const playersByClub = new Map();

    function pushPlayer(p) {
      const overall = computeOverall({ positions: p.positions, attributes: p.attributes });
      const enriched = { ...p, overall };
      playersById.set(enriched.id, enriched);

      const clubId = enriched.clubId;
      if (!playersByClub.has(clubId)) playersByClub.set(clubId, []);
      playersByClub.get(clubId).push(enriched);
    }

    // Carrega players do pack
    for (const p of packPlayers) pushPlayer(p);

    // Auto-elenco: todo clube sem players recebe um elenco completo
    for (const c of completedClubs) {
      const has = (playersByClub.get(c.id) || []).length > 0;
      if (!has) {
        const auto = generateAutoRoster({ packId: meta.id, clubId: c.id, nationalityIdDefault: c.nationId || "BRA" });
        for (const p of auto) pushPlayer(p);
        logger?.info?.("AUTO_ROSTER", `Elenco automático gerado: ${c.id} (${auto.length} jogadores)`);
      }
    }

    // Ordena por overall
    for (const arr of playersByClub.values()) {
      arr.sort((a, b) => (b.overall - a.overall) || String(a.name).localeCompare(String(b.name), "pt-BR"));
    }

    loaded.indexes = { playersByClub, playersById };
    return loaded;
  }

  function resolveLogoSrc(logoAssetId) {
    return `./assets/logos/${logoAssetId}.png`;
  }

  function resolveFaceSrc(playerId) {
    if (faceIds.has(playerId)) return `./assets/face/${playerId}.png`;
    return `./assets/face/${playerId}.png`;
  }

  return {
    packs,
    loadPack,
    resolveLogoSrc,
    resolveFaceSrc,
    saves,
    logoIds
  };
}