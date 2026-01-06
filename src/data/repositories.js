import { listAvailablePacks, loadPackByPath } from "./dlcLoader.js";
import { createSaveManager } from "./saveManager.js";
import { loadLogoIndex } from "./assetIndex.js";
import { autoCompleteClubs } from "./clubAutoComplete.js";
import { tryLoadFaceIndex } from "./faceIndex.js";
import { computeOverall } from "../domain/playerModel.js";

export async function createRepositories({ logger }) {
  const saves = createSaveManager(logger);

  const packs = await listAvailablePacks();
  const logoIds = await loadLogoIndex();
  const faceIds = await tryLoadFaceIndex(logger);

  async function loadPack(packId) {
    const meta = packs.find(p => p.id === packId) || packs.find(p => p.recommended);
    if (!meta) throw new Error("Nenhum pack disponível.");

    const loaded = await loadPackByPath(meta.path, logger);

    const clubsFromPack = loaded.content?.clubs?.clubs || [];
    const completedClubs = autoCompleteClubs({
      clubsFromPack,
      logoIds,
      nationIdDefault: "BRA"
    });
    loaded.content.clubs.clubs = completedClubs;

    const players = loaded.content?.players?.players || [];
    loaded.content.players = { players };

    const playersByClub = new Map();
    const playersById = new Map();

    for (const p of players) {
      const overall = computeOverall({ positions: p.positions, attributes: p.attributes });
      const enriched = { ...p, overall };

      playersById.set(enriched.id, enriched);

      const clubId = enriched.clubId;
      if (!playersByClub.has(clubId)) playersByClub.set(clubId, []);
      playersByClub.get(clubId).push(enriched);
    }

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