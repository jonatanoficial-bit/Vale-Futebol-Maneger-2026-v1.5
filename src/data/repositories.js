import { listAvailablePacks, loadPackByPath } from "./dlcLoader.js";
import { createSaveManager } from "./saveManager.js";
import { loadLogoIndex } from "./assetIndex.js";
import { autoCompleteClubs } from "./clubAutoComplete.js";

export async function createRepositories({ logger }) {
  const saves = createSaveManager(logger);

  const packs = await listAvailablePacks();
  const logoIds = await loadLogoIndex();

  async function loadPack(packId) {
    const meta = packs.find(p => p.id === packId) || packs.find(p => p.recommended);
    if (!meta) throw new Error("Nenhum pack disponível.");

    const loaded = await loadPackByPath(meta.path, logger);

    // auto-complete clubes com base nos escudos existentes
    const clubsFromPack = loaded.content?.clubs?.clubs || [];
    const completedClubs = autoCompleteClubs({
      clubsFromPack,
      logoIds,
      nationIdDefault: "BRA"
    });

    // substitui no pack em runtime (sem alterar arquivos)
    loaded.content.clubs.clubs = completedClubs;

    return loaded;
  }

  function resolveLogoSrc(logoAssetId) {
    return `./assets/logos/${logoAssetId}.png`;
  }

  return {
    packs,
    loadPack,
    resolveLogoSrc,
    saves,
    logoIds
  };
}