// /src/data/repositories.js
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
  const logoIds = await loadLogoIndex(logger);
  const faceIds = await tryLoadFaceIndex(logger);

  async function loadPack(packId) {
    const meta = packs.find(p => p.id === packId) || packs.find(p => p.recommended);
    if (!meta) throw new Error("Nenhum pack disponível.");

    const loaded = await loadPackByPath(meta.path, logger);

    // Clubs auto-complete a partir dos escudos
    const clubsFromPack = loaded.content?.clubs?.clubs || [];
    loaded.content.clubs = autoCompleteClubs({
      clubsFromPack,
      logoIds
    });

    // Jogadores: compute overall + fallback roster (se pack vier incompleto)
    const players = Array.isArray(loaded.content?.players?.players) ? loaded.content.players.players : [];
    const normalizedPlayers = players.map(p => ({
      ...p,
      overall: typeof p.overall === "number" ? p.overall : computeOverall(p)
    }));
    loaded.content.players = { players: normalizedPlayers };

    // Roster automático (MVP) para não ficar 0 jogadores por clube
    // Se no futuro você tiver rosters completos no pack, isso pode ser desligado por flag.
    loaded.content.rosters = generateAutoRoster({
      clubs: loaded.content.clubs.clubs,
      players: loaded.content.players.players
    });

    loaded.content.faces = { ids: Array.from(faceIds) };

    return loaded;
  }

  return {
    saves,
    packs: {
      list: async () => packs
    },
    loadPack
  };
}