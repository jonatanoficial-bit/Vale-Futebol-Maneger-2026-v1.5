import { listAvailablePacks, loadPackByPath } from "./dlcLoader.js";
import { createSaveManager } from "./saveManager.js";

export async function createRepositories({ logger }) {
  const saves = createSaveManager(logger);

  const packs = await listAvailablePacks();
  async function loadPack(packId) {
    const meta = packs.find(p => p.id === packId) || packs.find(p => p.recommended);
    if (!meta) throw new Error("Nenhum pack disponível.");
    return loadPackByPath(meta.path, logger);
  }

  // Resolve assets por convenção: assets/logos/<logoAssetId>.png
  function resolveLogoSrc(logoAssetId) {
    return `./assets/logos/${logoAssetId}.png`;
  }

  return {
    packs,
    loadPack,
    resolveLogoSrc,
    saves
  };
}