/* engine.js - VFM26 Engine v1.2.x
   Responsável por:
   - Namespace global
   - Estado central (pack, slots, carreira)
   - Persistência em localStorage
   - Helpers de fetch com cache-bust
*/
(function () {
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.VERSION = NS.VERSION || "v1.2.0";

  // ---------- Utils ----------
  function nowISO() {
    return new Date().toISOString();
  }

  function safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }

  function cacheBust(url) {
    const u = String(url);
    const sep = u.includes("?") ? "&" : "?";
    return `${u}${sep}v=${encodeURIComponent(String(Date.now()))}`;
  }

  async function fetchJson(url) {
    const res = await fetch(cacheBust(url), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`FETCH_FAILED ${res.status} ${res.statusText} :: ${url}`);
    }
    return await res.json();
  }

  // ---------- Storage ----------
  const STORAGE_PREFIX = "VFM26_";
  const KEY_ACTIVE_PACK = `${STORAGE_PREFIX}ACTIVE_PACK_ID`;
  const KEY_SLOT_PREFIX = `${STORAGE_PREFIX}SLOT_`; // SLOT_1, SLOT_2
  const KEY_LAST_BOOT = `${STORAGE_PREFIX}LAST_BOOT`;

  function slotKey(slotId) {
    const s = String(slotId).trim();
    return `${KEY_SLOT_PREFIX}${s}`;
  }

  // ---------- Engine ----------
  class Engine {
    constructor() {
      this.state = {
        // catálogo / pack
        packCatalog: null,
        packData: null,
        activePackId: null,

        // slots (2 slots como no fluxo)
        slots: {
          "1": null,
          "2": null,
        },

        // carreira (rascunho / definitivo)
        career: null,
        careerDraft: null,

        // meta
        bootAt: null,
      };
    }

    // Inicialização do motor (carrega catálogo, pack ativo e slots)
    async init() {
      this.state.bootAt = nowISO();
      localStorage.setItem(KEY_LAST_BOOT, this.state.bootAt);

      // 1) catálogo
      this.state.packCatalog = await this.loadPackCatalog();

      // 2) pack ativo (se existir)
      const storedPackId = localStorage.getItem(KEY_ACTIVE_PACK);
      if (storedPackId) {
        await this.setActivePack(storedPackId);
      } else {
        // default: primeiro do catálogo se houver
        const first = Array.isArray(this.state.packCatalog?.packs)
          ? this.state.packCatalog.packs[0]
          : null;
        if (first?.id) {
          await this.setActivePack(first.id);
        }
      }

      // 3) slots
      this.state.slots["1"] = this.loadSlot("1");
      this.state.slots["2"] = this.loadSlot("2");

      return true;
    }

    // ---------- Packs ----------
    async loadPackCatalog() {
      // catalog.json fica em /packs/catalog.json (como está no seu ZIP)
      const catalog = await fetchJson("packs/catalog.json");
      return catalog;
    }

    async loadPackById(packId) {
      const catalog = this.state.packCatalog || (await this.loadPackCatalog());
      const packs = Array.isArray(catalog?.packs) ? catalog.packs : [];
      const found = packs.find((p) => String(p.id) === String(packId));
      if (!found?.file) throw new Error(`PACK_NOT_FOUND :: ${packId}`);
      const data = await fetchJson(found.file);
      return data;
    }

    async setActivePack(packId) {
      const id = String(packId);
      const data = await this.loadPackById(id);

      this.state.activePackId = id;
      this.state.packData = data;

      localStorage.setItem(KEY_ACTIVE_PACK, id);

      // ao trocar pack, não apagamos slots, mas registramos qual pack está sendo usado
      return true;
    }

    // ---------- Slots ----------
    loadSlot(slotId) {
      const raw = localStorage.getItem(slotKey(slotId));
      const data = safeJsonParse(raw, null);
      if (!data) return null;

      // compat mínimo
      return {
        slotId: String(slotId),
        packId: data.packId || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
        career: data.career || null,
      };
    }

    saveSlot(slotId, payload) {
      const slot = {
        slotId: String(slotId),
        packId: payload?.packId || this.state.activePackId || null,
        createdAt: payload?.createdAt || nowISO(),
        updatedAt: nowISO(),
        career: payload?.career || null,
      };

      localStorage.setItem(slotKey(slotId), JSON.stringify(slot));
      this.state.slots[String(slotId)] = slot;
      return slot;
    }

    deleteSlot(slotId) {
      localStorage.removeItem(slotKey(slotId));
      this.state.slots[String(slotId)] = null;
      return true;
    }

    // ---------- Career ----------
    setCareerDraft(draft) {
      this.state.careerDraft = draft || null;
      return this.state.careerDraft;
    }

    confirmCareerOnSlot(slotId, career) {
      this.state.career = career || null;

      const current = this.loadSlot(slotId);
      const createdAt = current?.createdAt || nowISO();

      const saved = this.saveSlot(slotId, {
        packId: this.state.activePackId,
        createdAt,
        career: this.state.career,
      });

      return saved;
    }
  }

  // Expor
  NS.Engine = Engine;
})();