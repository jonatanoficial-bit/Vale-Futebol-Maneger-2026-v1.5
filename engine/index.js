// /engine/index.js
// Registro da Engine (carrega antes da UI)

import { getAvailablePacks, loadPackById } from "./datapacks.js";

const SAVE_PREFIX = "VFM26_SAVE_SLOT_";
const META_PREFIX = "VFM26_META_";

function safeJSONParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function saveMeta(slot, meta) {
  localStorage.setItem(META_PREFIX + String(slot), JSON.stringify(meta));
}

function loadMeta(slot) {
  const raw = localStorage.getItem(META_PREFIX + String(slot));
  return raw ? safeJSONParse(raw) : null;
}

function saveSlotData(slot, data) {
  localStorage.setItem(SAVE_PREFIX + String(slot), JSON.stringify(data));
}

function loadSlotData(slot) {
  const raw = localStorage.getItem(SAVE_PREFIX + String(slot));
  return raw ? safeJSONParse(raw) : null;
}

function clearSlot(slot) {
  localStorage.removeItem(SAVE_PREFIX + String(slot));
  localStorage.removeItem(META_PREFIX + String(slot));
}

export const Engine = {
  version: "1.2.0",
  isReady: true,

  state: {
    datapack: null,  // objeto do pack carregado
    saveSlot: null,  // 1 ou 2
    career: null     // (fase 3)
  },

  log(message, data) {
    if (data !== undefined) console.log("[ENGINE]", message, data);
    else console.log("[ENGINE]", message);
  },

  // -------------------------
  // DATAPACKS (Fase 2)
  // -------------------------
  datapacks: {
    list() {
      return getAvailablePacks();
    },

    async loadById(packId) {
      const pack = await loadPackById(packId);
      Engine.state.datapack = pack;
      Engine.log("DataPack carregado", { id: pack.id, name: pack.name, version: pack.version });
      return pack;
    }
  },

  // -------------------------
  // SAVES (Fase 2)
  // -------------------------
  saves: {
    getSlotSummary(slot) {
      const meta = loadMeta(slot);
      const data = loadSlotData(slot);

      if (!meta && !data) {
        return { slot, exists: false };
      }

      // Se meta existe mas data não, ainda tratamos como "existe"
      // (permite recuperar/limpar)
      const summary = {
        slot,
        exists: true,
        meta: meta || null,
        data: data || null,
        isCorrupted: false
      };

      // Se data existe e não é objeto, corrompido
      if (data && (typeof data !== "object" || Array.isArray(data))) {
        summary.isCorrupted = true;
      }

      return summary;
    },

    startNewInSlot(slot, packId) {
      // Cria um save mínimo (carreira vem na fase 3)
      const meta = {
        createdAt: nowISO(),
        updatedAt: nowISO(),
        packId: packId,
        title: "Começar novo jogo"
      };

      const data = {
        schema: 1,
        packId: packId,
        createdAt: meta.createdAt,
        // fase 3 preencherá:
        career: null,
        world: null
      };

      saveMeta(slot, meta);
      saveSlotData(slot, data);
      Engine.log("Novo save criado", { slot, packId });

      return { meta, data };
    },

    selectSlot(slot) {
      Engine.state.saveSlot = slot;
      Engine.log("Slot selecionado", { slot });
      return true;
    },

    touchSlot(slot, patchMeta) {
      const meta = loadMeta(slot) || {};
      const next = {
        ...meta,
        ...patchMeta,
        updatedAt: nowISO()
      };
      saveMeta(slot, next);
      return next;
    },

    clearSlot(slot) {
      clearSlot(slot);
      Engine.log("Slot apagado", { slot });
      return true;
    }
  }
};