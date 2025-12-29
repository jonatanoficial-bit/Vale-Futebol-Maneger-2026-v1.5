(() => {
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.bootStep?.("Carregando Engine...");

  const STORAGE_KEY = "VFM26_SAVES_V1";

  function safeJsonParse(s, fallback) {
    try {
      return JSON.parse(s);
    } catch (_) {
      return fallback;
    }
  }

  function absUrl(path) {
    // Resolve bem em GitHub Pages e Vercel
    return new URL(path, document.baseURI).toString();
  }

  const Engine = {
    version: "1.2.0",
    state: {
      catalog: null,
      packId: null,
      packData: null,
      slotId: null,
      career: null
    },

    async loadCatalog() {
      NS.bootStep?.("Engine.loadCatalog()");
      const url = absUrl("packs/catalog.json");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Falha ao carregar catalog.json (${res.status})`);
      const data = await res.json();
      if (!data || !Array.isArray(data.packs)) throw new Error("catalog.json inválido");
      this.state.catalog = data;
      return data;
    },

    async loadPack(packId) {
      NS.bootStep?.("Engine.loadPack()", { packId });
      if (!this.state.catalog) await this.loadCatalog();
      const pack = this.state.catalog.packs.find((p) => p.id === packId);
      if (!pack) throw new Error("Pack não encontrado no catálogo: " + packId);

      const url = absUrl(pack.file);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Falha ao carregar pack (${res.status})`);
      const data = await res.json();

      this.state.packId = packId;
      this.state.packData = data;
      return data;
    },

    getSaves() {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = safeJsonParse(raw, { slots: {} });
      if (!data || typeof data !== "object") return { slots: {} };
      if (!data.slots || typeof data.slots !== "object") data.slots = {};
      return data;
    },

    setSaves(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    getSlot(slotId) {
      const saves = this.getSaves();
      return saves.slots[String(slotId)] || null;
    },

    createNewSlot(slotId, packId) {
      const saves = this.getSaves();
      saves.slots[String(slotId)] = {
        id: String(slotId),
        packId: String(packId),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        career: null
      };
      this.setSaves(saves);
      return saves.slots[String(slotId)];
    },

    deleteSlot(slotId) {
      const saves = this.getSaves();
      delete saves.slots[String(slotId)];
      this.setSaves(saves);
    },

    saveCareer(slotId, careerObj) {
      const saves = this.getSaves();
      if (!saves.slots[String(slotId)]) {
        saves.slots[String(slotId)] = {
          id: String(slotId),
          packId: this.state.packId || "unknown",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          career: null
        };
      }
      saves.slots[String(slotId)].career = careerObj;
      saves.slots[String(slotId)].updatedAt = Date.now();
      this.setSaves(saves);
    },

    getClubsFromPack() {
      const pack = this.state.packData;
      if (!pack) return [];
      const clubs = Array.isArray(pack.clubs) ? pack.clubs : [];
      return clubs
        .filter((c) => c && c.id && c.name)
        .map((c) => ({
          id: String(c.id),
          name: String(c.name),
          shortName: c.shortName ? String(c.shortName) : String(c.name),
          league: c.league ? String(c.league) : "unknown",
          state: c.state ? String(c.state) : "",
          rating: typeof c.rating === "number" ? c.rating : null,
          budget: typeof c.budget === "number" ? c.budget : null,
          // SE não vier no pack, usa fallback padrão do seu ZIP:
          crest: c.crest ? String(c.crest) : `assets/logos/${String(c.id)}.png`
        }));
    }
  };

  NS.Engine = Engine;
  NS.bootStep?.("Engine registrada", { version: Engine.version });
})();