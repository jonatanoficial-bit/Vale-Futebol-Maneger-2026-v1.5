// /src/data/repositories.js
import { listAvailablePacks, loadPackByPath } from "./dlcLoader.js";
import { createSaveManager } from "./saveManager.js";
import { loadLogoIndex } from "./assetIndex.js";
import { autoCompleteClubs } from "./clubAutoComplete.js";
import { tryLoadFaceIndex } from "./faceIndex.js";
import { computeOverall } from "../domain/playerModel.js";
import { generateAutoRoster } from "../domain/rosterGenerator.js";
import { generateAutoPlayers } from "../domain/autoPlayers.js";

function normalizeClubId(club) {
  return club?.id || club?.code || club?.slug || club?.abbrev || club?.short || null;
}

export async function createRepositories({ logger }) {
  const saves = createSaveManager(logger);

  const packs = await listAvailablePacks();
  const logoIds = await loadLogoIndex(logger);
  const faceIds = await tryLoadFaceIndex(logger);

  async function loadPack(packId) {
    const meta = packs.find(p => p.id === packId) || packs.find(p => p.recommended);
    if (!meta) throw new Error("Nenhum pack disponível.");

    const loaded = await loadPackByPath(meta.path, logger);

    // Clubs
    const clubsFromPack = loaded.content?.clubs?.clubs || loaded.content?.clubs || [];
    loaded.content.clubs = autoCompleteClubs({
      clubsFromPack: Array.isArray(clubsFromPack) ? clubsFromPack : [],
      logoIds
    });

    const clubs = loaded.content.clubs?.clubs || [];
    const clubIds = new Set((clubs || []).map(normalizeClubId).filter(Boolean));

    // Players (normaliza e calcula overall quando necessário)
    const rawPlayers = Array.isArray(loaded.content?.players?.players)
      ? loaded.content.players.players
      : Array.isArray(loaded.content?.players)
        ? loaded.content.players
        : [];

    let players = rawPlayers.map(p => ({
      ...p,
      // normaliza clubId caso venha com outros nomes
      clubId: p?.clubId ?? p?.club ?? p?.team ?? null,
      overall: typeof p?.overall === "number" ? p.overall : computeOverall(p)
    }));

    // Se pack não tem jogadores, geramos automatico para TODOS os clubes
    if (!players.length && clubs.length) {
      logger?.warn?.("AUTO_PLAYERS", "Pack sem players.json — gerando elenco automático (MVP).");
      players = generateAutoPlayers({ clubs, defaultCountry: "Brasil" });
    }

    // Se pack tem alguns jogadores, mas há clubes sem ninguém, completa só os faltantes
    if (players.length && clubs.length) {
      const countByClub = new Map();
      for (const p of players) {
        const cid = p?.clubId;
        if (!cid) continue;
        countByClub.set(cid, (countByClub.get(cid) || 0) + 1);
      }

      const missing = clubs.filter(c => {
        const id = normalizeClubId(c);
        if (!id) return false;
        return (countByClub.get(id) || 0) === 0;
      });

      if (missing.length) {
        logger?.warn?.("AUTO_PLAYERS_MISSING_CLUBS", `Gerando jogadores para ${missing.length} clube(s) sem elenco.`);
        const extra = generateAutoPlayers({ clubs: missing, defaultCountry: "Brasil" });
        players = players.concat(extra);
      }
    }

    // Filtra jogadores com clubId válido quando possível (mas não bloqueia o MVP)
    players = players.filter(p => {
      if (!p?.clubId) return true;
      return clubIds.size ? clubIds.has(p.clubId) : true;
    });

    loaded.content.players = { players };

    // Rosters (MVP)
    loaded.content.rosters = generateAutoRoster({
      clubs,
      players
    });

    // Faces index
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
